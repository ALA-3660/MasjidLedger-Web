import React, { useState } from 'react';
import {
  Users2,
  CalendarCheck,
  Plus,
  ShieldCheck,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  Printer,
  Clock,
  MapPin,
  Phone,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Power,
  Filter,
  Hourglass,
  Timer,
  Calendar,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { CommitteeTerm, CommitteeMember, CommitteeMeeting } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';

interface CommitteeViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  language: Language;
  onAddTerm: (data: any) => Promise<void>;
  onAddMember: (data: any) => Promise<void>;
  onUpdateMember?: (id: string, data: any) => Promise<void>;
  onDeleteMember?: (id: string) => Promise<void>;
  onAddMeeting: (data: any) => Promise<void>;
}

interface TenureCalculation {
  status: 'UPCOMING' | 'ACTIVE' | 'EXPIRED';
  elapsedText: string;
  remainingText: string;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  progressPercent: number;
  yearsElapsed: number;
  monthsElapsed: number;
  daysElapsed: number;
  yearsRemaining: number;
  monthsRemaining: number;
  daysRemaining: number;
  isNearEnd: boolean;
}

export const toBanglaNumber = (val: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bnDigits[+d]);
};

export const calculateTenure = (
  startDateStr: string,
  endDateStr: string,
  language: Language = 'bn'
): TenureCalculation => {
  const isBn = language === 'bn';
  const toNum = (n: number | string) => (isBn ? toBanglaNumber(n) : String(n));

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const now = new Date();

  // Reset time portions for accurate day differences
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));

  if (now < start) {
    const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / MS_PER_DAY);
    return {
      status: 'UPCOMING',
      elapsedText: isBn ? 'এখনও শুরু হয়নি' : 'Not started yet',
      remainingText: isBn ? `শুরু হতে ${toNum(daysUntilStart)} দিন বাকি` : `${daysUntilStart} days to start`,
      totalDays,
      elapsedDays: 0,
      remainingDays: totalDays,
      progressPercent: 0,
      yearsElapsed: 0,
      monthsElapsed: 0,
      daysElapsed: 0,
      yearsRemaining: 0,
      monthsRemaining: 0,
      daysRemaining: 0,
      isNearEnd: false,
    };
  }

  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((now.getTime() - start.getTime()) / MS_PER_DAY)));
  const remainingDays = Math.max(0, Math.round((end.getTime() - now.getTime()) / MS_PER_DAY));
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  // Calculate detailed year/month/day breakdown for elapsed:
  let yElapsed = now.getFullYear() - start.getFullYear();
  let mElapsed = now.getMonth() - start.getMonth();
  let dElapsed = now.getDate() - start.getDate();

  if (dElapsed < 0) {
    mElapsed -= 1;
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    dElapsed += prevMonthDays;
  }
  if (mElapsed < 0) {
    yElapsed -= 1;
    mElapsed += 12;
  }

  const elapsedParts: string[] = [];
  if (yElapsed > 0) elapsedParts.push(isBn ? `${toNum(yElapsed)} বছর` : `${yElapsed} yr${yElapsed > 1 ? 's' : ''}`);
  if (mElapsed > 0) elapsedParts.push(isBn ? `${toNum(mElapsed)} মাস` : `${mElapsed} mo${mElapsed > 1 ? 's' : ''}`);
  if (dElapsed > 0 || elapsedParts.length === 0) {
    elapsedParts.push(isBn ? `${toNum(dElapsed)} দিন` : `${dElapsed} day${dElapsed > 1 ? 's' : ''}`);
  }
  const elapsedText = elapsedParts.join(' ') + (isBn ? ' অতিবাহিত' : ' elapsed');

  if (now > end) {
    return {
      status: 'EXPIRED',
      elapsedText,
      remainingText: isBn ? 'মেয়াদ সমাপ্ত হয়েছে' : 'Term expired',
      totalDays,
      elapsedDays,
      remainingDays: 0,
      progressPercent: 100,
      yearsElapsed: yElapsed,
      monthsElapsed: mElapsed,
      daysElapsed: dElapsed,
      yearsRemaining: 0,
      monthsRemaining: 0,
      daysRemaining: 0,
      isNearEnd: false,
    };
  }

  // Calculate detailed year/month/day breakdown for remaining:
  let yRem = end.getFullYear() - now.getFullYear();
  let mRem = end.getMonth() - now.getMonth();
  let dRem = end.getDate() - now.getDate();

  if (dRem < 0) {
    mRem -= 1;
    const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    dRem += prevMonthDays;
  }
  if (mRem < 0) {
    yRem -= 1;
    mRem += 12;
  }

  const remParts: string[] = [];
  if (yRem > 0) remParts.push(isBn ? `${toNum(yRem)} বছর` : `${yRem} yr${yRem > 1 ? 's' : ''}`);
  if (mRem > 0) remParts.push(isBn ? `${toNum(mRem)} মাস` : `${mRem} mo${mRem > 1 ? 's' : ''}`);
  if (dRem > 0 || remParts.length === 0) {
    remParts.push(isBn ? `${toNum(dRem)} দিন` : `${dRem} day${dRem > 1 ? 's' : ''}`);
  }
  const remainingText = remParts.join(' ') + (isBn ? ' বাকি' : ' remaining');
  const isNearEnd = remainingDays <= 45;

  return {
    status: 'ACTIVE',
    elapsedText,
    remainingText,
    totalDays,
    elapsedDays,
    remainingDays,
    progressPercent,
    yearsElapsed: yElapsed,
    monthsElapsed: mElapsed,
    daysElapsed: dElapsed,
    yearsRemaining: yRem,
    monthsRemaining: mRem,
    daysRemaining: dRem,
    isNearEnd,
  };
};

export const CommitteeView: React.FC<CommitteeViewProps> = ({
  terms,
  members,
  meetings,
  language,
  onAddTerm,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddMeeting,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'members' | 'terms' | 'meetings'>('members');

  // Search & Filter for members
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);

  // Term modal
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [termTitle, setTermTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [termDesc, setTermDesc] = useState('');
  const [termError, setTermError] = useState('');

  // Add Member modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberNid, setMemberNid] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberAddress, setMemberAddress] = useState('');
  const [memberPosition, setMemberPosition] = useState<CommitteeMember['position']>('MEMBER');
  const [memberPositionCustom, setMemberPositionCustom] = useState('');
  const [memberStatus, setMemberStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [memberNotes, setMemberNotes] = useState('');
  const [memberError, setMemberError] = useState('');

  // Edit Member Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editTermId, setEditTermId] = useState('');
  const [editName, setEditName] = useState('');
  const [editNid, setEditNid] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPosition, setEditPosition] = useState<CommitteeMember['position']>('MEMBER');
  const [editPositionCustom, setEditPositionCustom] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'DECEASED'>('ACTIVE');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Member Confirm Modal
  const [deletingMember, setDeletingMember] = useState<CommitteeMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Meeting modal
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('রাত ৮:৩০ (বাদ এশা)');
  const [meetingLocation, setMeetingLocation] = useState('মসজিদ অফিস কক্ষ');
  const [chairman, setChairman] = useState('সভাপতি মহোদয়');
  const [secretary, setSecretary] = useState('সাধারণ সম্পাদক');
  const [agendaText, setAgendaText] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [presentMembers, setPresentMembers] = useState('');

  const activeTerm = terms.find((t) => t.status === 'ACTIVE') || terms[0];

  const activeTermTenure = activeTerm
    ? calculateTenure(activeTerm.startDate, activeTerm.endDate, language)
    : null;

  const POSITION_MAP_BN: Record<string, string> = {
    PRESIDENT: 'সভাপতি (President)',
    VICE_PRESIDENT: 'সহ-সভাপতি (Vice President)',
    SECRETARY: 'সাধারণ সম্পাদক (General Secretary)',
    JOINT_SECRETARY: 'যুগ্ম সম্পাদক (Joint Secretary)',
    TREASURER: 'কোষাধ্যক্ষ (Treasurer)',
    ORGANIZING_SECRETARY: 'সাংগঠনিক সম্পাদক',
    MEMBER: 'কার্যনির্বাহী সদস্য (Member)',
    IMAM: 'সম্মানিত ইমাম (সদস্য)',
    ADVISOR: 'উপদেষ্টা (Advisor)',
    OTHER: 'অন্যান্য পদবি',
  };

  const handleTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermError('');
    try {
      await onAddTerm({
        title: termTitle,
        startDate,
        endDate,
        description: termDesc,
      });
      setIsTermModalOpen(false);
      setTermTitle('');
      setStartDate('');
      setEndDate('');
      setTermDesc('');
    } catch (err: any) {
      setTermError(err.message || 'Error creating term');
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    try {
      const termToUse = selectedTermId || activeTerm?.id || terms[0]?.id;
      if (!termToUse) {
        setMemberError('অনুগ্রহ করে একটি কমিটির মেয়াদকাল নির্বাচন করুন।');
        return;
      }
      if (!memberName.trim()) {
        setMemberError('সদস্যের পুরো নাম আবশ্যক।');
        return;
      }
      if (!memberPhone.trim()) {
        setMemberError('মোবাইল নম্বর আবশ্যক।');
        return;
      }

      const posBn = memberPositionCustom?.trim() || POSITION_MAP_BN[memberPosition] || 'কার্যনির্বাহী সদস্য';

      await onAddMember({
        termId: termToUse,
        name: memberName.trim(),
        nid: memberNid.trim(),
        phone: memberPhone.trim(),
        address: memberAddress.trim(),
        position: memberPosition,
        positionCustomBn: posBn,
        designation: memberPosition,
        designationBn: posBn,
        status: memberStatus,
        notes: memberNotes.trim() || undefined,
      });
      setIsMemberModalOpen(false);
      setMemberName('');
      setMemberNid('');
      setMemberPhone('');
      setMemberAddress('');
      setMemberPosition('MEMBER');
      setMemberPositionCustom('');
      setMemberStatus('ACTIVE');
      setMemberNotes('');
    } catch (err: any) {
      setMemberError(err.message || 'সদস্য অন্তর্ভুক্তি করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleOpenEditMember = (mem: CommitteeMember) => {
    setEditingMemberId(mem.id);
    setEditTermId(mem.termId || activeTerm?.id || '');
    setEditName(mem.name || '');
    setEditNid(mem.nid || '');
    setEditPhone(mem.phone || '');
    setEditAddress(mem.address || '');
    setEditPosition(mem.position || 'MEMBER');
    setEditPositionCustom(mem.positionCustomBn || '');
    setEditStatus(mem.status || 'ACTIVE');
    setEditNotes(mem.notes || '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemberId || !onUpdateMember) return;

    if (!editName.trim()) {
      setEditError('সদস্যের পুরো নাম আবশ্যক।');
      return;
    }
    if (!editPhone.trim()) {
      setEditError('মোবাইল নম্বর আবশ্যক।');
      return;
    }

    setEditError('');
    setIsSavingEdit(true);
    try {
      const posBn = editPositionCustom?.trim() || POSITION_MAP_BN[editPosition] || 'কার্যনির্বাহী সদস্য';
      await onUpdateMember(editingMemberId, {
        termId: editTermId,
        name: editName.trim(),
        nid: editNid.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        position: editPosition,
        positionCustomBn: posBn,
        designation: editPosition,
        designationBn: posBn,
        status: editStatus,
        notes: editNotes.trim() || undefined,
      });
      setIsEditModalOpen(false);
      setEditingMemberId(null);
    } catch (err: any) {
      setEditError(err.message || 'সদস্য তথ্য আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async (mem: CommitteeMember) => {
    if (!onUpdateMember) return;
    const nextStatus = mem.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusTogglingId(mem.id);
    try {
      await onUpdateMember(mem.id, { status: nextStatus });
    } catch (err: any) {
      alert(err.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setStatusTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMember || !onDeleteMember) return;
    setIsDeleting(true);
    try {
      await onDeleteMember(deletingMember.id);
      setDeletingMember(null);
    } catch (err: any) {
      alert(err.message || 'সদস্য অপসারণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddMeeting({
        date: meetingDate,
        time: meetingTime,
        location: meetingLocation,
        chairman,
        secretary,
        agenda: agendaText.split('\n').filter(Boolean),
        decisions: decisionText.split('\n').filter(Boolean),
        resolutions: resolutionText.split('\n').filter(Boolean),
        membersPresent: presentMembers.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setIsMeetingModalOpen(false);
      setAgendaText('');
      setDecisionText('');
      setResolutionText('');
      setPresentMembers('');
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((mem) => {
    if (memberStatusFilter === 'ACTIVE' && mem.status !== 'ACTIVE') return false;
    if (memberStatusFilter === 'INACTIVE' && mem.status === 'ACTIVE') return false;

    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase().trim();
      const matchName = mem.name.toLowerCase().includes(q);
      const matchPhone = mem.phone.toLowerCase().includes(q);
      const matchNid = mem.nid.toLowerCase().includes(q);
      const matchPos = (mem.positionCustomBn || mem.position || '').toLowerCase().includes(q);
      const matchAddr = (mem.address || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchNid || matchPos || matchAddr;
    }
    return true;
  });

  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const inactiveCount = members.filter((m) => m.status !== 'ACTIVE').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-btn-committee-members"
            onClick={() => setActiveTab('members')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>সদস্য তালিকা</span>
            <span className="ml-1 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {members.length}
            </span>
          </button>

          <button
            id="tab-btn-committee-terms"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>কমিটির মেয়াদকাল</span>
            <span className="ml-1 bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {terms.length}
            </span>
          </button>

          <button
            id="tab-btn-committee-meetings"
            onClick={() => setActiveTab('meetings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'meetings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>মিটিং ও রেজোলিউশন</span>
            <span className="ml-1 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {meetings.length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'members' && (
            <button
              id="btn-open-add-member"
              onClick={() => {
                setSelectedTermId(activeTerm?.id || terms[0]?.id || '');
                setMemberError('');
                setIsMemberModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন সদস্য অন্তর্ভুক্তি</span>
            </button>
          )}
          {activeTab === 'terms' && (
            <button
              id="btn-open-add-term"
              onClick={() => setIsTermModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কমিটি মেয়াদ নির্ধারণ</span>
            </button>
          )}
          {activeTab === 'meetings' && (
            <button
              id="btn-open-add-meeting"
              onClick={() => setIsMeetingModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন মিটিং কার্যবিবরণী</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Active Term Info Banner with Tenure Statistics */}
          <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    বর্তমান সক্রিয় পরিষদ
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {activeTerm?.title || 'পরিচালনা কমিটি'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    কার্যকাল: {activeTerm?.startDate ? formatDate(activeTerm.startDate, language) : ''} হতে{' '}
                    {activeTerm?.endDate ? formatDate(activeTerm.endDate, language) : ''}
                  </span>
                </div>
              </div>

              {/* Counts Badge */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                  সক্রিয়: {activeCount} জন
                </span>
                {inactiveCount > 0 && (
                  <span className="font-semibold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-lg">
                    নিষ্ক্রিয়: {inactiveCount} জন
                  </span>
                )}
                <span className="font-semibold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                  মোট সদস্য: {members.length} জন
                </span>
              </div>
            </div>

            {/* Tenure Tracker Ribbon */}
            {activeTermTenure && (
              <div className="pt-2 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-blue-100 flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">অতিবাহিত সময় (Elapsed)</span>
                    <span className="font-bold text-blue-900 text-xs">
                      {activeTermTenure.elapsedText}
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-amber-100 flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Hourglass className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">অবশিষ্ট মেয়াদ (Remaining)</span>
                    <span className="font-bold text-amber-900 text-xs">
                      {activeTermTenure.remainingText}
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                    <span>মেয়াদের অগ্রগতি</span>
                    <span className="text-blue-700 font-bold">
                      {toBanglaNumber(activeTermTenure.progressPercent)}% সম্পন্ন
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${activeTermTenure.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search and Status Filters Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="input-search-committee-member"
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="সদস্যের নাম, পদবি, মোবাইল বা NID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 w-full md:w-auto justify-end">
              <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> স্ট্যাটাস ফিল্টার:
              </span>
              <button
                onClick={() => setMemberStatusFilter('ALL')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  memberStatusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সকল ({members.length})
              </button>
              <button
                onClick={() => setMemberStatusFilter('ACTIVE')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  memberStatusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                সক্রিয় ({activeCount})
              </button>
              <button
                onClick={() => setMemberStatusFilter('INACTIVE')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  memberStatusFilter === 'INACTIVE'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                নিষ্ক্রিয় ({inactiveCount})
              </button>
            </div>
          </div>

          {/* Members Grid */}
          {filteredMembers.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
              <Users2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">কোনো সদস্য পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">
                {memberSearch ? 'অনুসন্ধানের সাথে মিল পাওয়া যায়নি।' : 'নতুন সদস্য অন্তর্ভুক্ত করতে উপরের বাটনে ক্লিক করুন।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((mem) => {
                const isActive = mem.status === 'ACTIVE';
                const isToggling = statusTogglingId === mem.id;

                return (
                  <div
                    key={mem.id}
                    className={`bg-white p-5 rounded-xl border shadow-sm space-y-3 transition-all flex flex-col justify-between ${
                      isActive
                        ? 'border-slate-200 hover:border-blue-300'
                        : 'border-slate-200 bg-slate-50/50 opacity-90'
                    }`}
                  >
                    <div>
                      {/* Card Header: Avatar, Name, Position & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-11 h-11 rounded-full font-bold text-sm flex items-center justify-center border-2 shrink-0 ${
                              isActive
                                ? 'bg-blue-100 text-blue-900 border-blue-200'
                                : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            {mem.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h3 className="font-bold text-slate-900 text-sm leading-snug">{mem.name}</h3>
                            </div>
                            <span className="inline-block bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-md mt-0.5 border border-blue-100">
                              {mem.positionCustomBn || mem.position}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isActive ? (
                            <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>সক্রিয়</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span>নিষ্ক্রিয়</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Member Details */}
                      <div className="text-xs text-slate-600 space-y-1.5 pt-3 mt-3 border-t border-slate-100">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-slate-800 font-semibold">{mem.phone}</span>
                        </div>
                        {mem.nid && (
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-slate-700">
                              NID: ••••••••{mem.nid.length > 4 ? mem.nid.slice(-4) : mem.nid}
                            </span>
                          </div>
                        )}
                        {mem.address && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate text-slate-700">{mem.address}</span>
                          </div>
                        )}
                        {mem.notes && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1">
                            {mem.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Status Toggle, Edit, Delete */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* Quick Status Toggle Button */}
                      <button
                        id={`btn-toggle-status-${mem.id}`}
                        onClick={() => handleToggleStatus(mem)}
                        disabled={isToggling}
                        title={isActive ? 'সদস্যকে নিষ্ক্রিয় করতে ক্লিক করুন' : 'সদস্যকে সক্রিয় করতে ক্লিক করুন'}
                        className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Power className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{isToggling ? 'প্রসেসিং...' : isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        {/* Edit Button */}
                        <button
                          id={`btn-edit-member-${mem.id}`}
                          onClick={() => handleOpenEditMember(mem)}
                          title="সদস্য তথ্য এডিট করুন"
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>এডিট</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          id={`btn-delete-member-${mem.id}`}
                          onClick={() => setDeletingMember(mem)}
                          title="সদস্য অপসারণ করুন"
                          className="p-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. COMMITTEE TERMS & TENURE ANALYSIS */}
      {activeTab === 'terms' && (
        <div className="space-y-5">
          {/* Rules Banner */}
          <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>কমিটি মেয়াদ ও প্রশাসনিক বিধিমালিকা:</span>
            </div>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-700">
              <li>একটি মসজিদে একই সময়ে কেবলমাত্র একটিই <strong>সক্রিয় (ACTIVE)</strong> কমিটি কার্যকর থাকবে।</li>
              <li>মেয়াদ সমাপ্ত হওয়ার পূর্বে অবশিষ্ট সময় এবং অতিবাহিত কার্যকাল স্বয়ংক্রিয়ভাবে গণনা করা হয়।</li>
              <li>ওয়াকফ বিধি মোতাবেক বর্তমান কমিটির মেয়াদ শেষ হওয়ার পূর্বের ৩০ দিনের মধ্যে পরবর্তী নির্বাচন বা নতুন কমিটি গঠনের প্রস্তুতি নেওয়া বিধেয়।</li>
            </ul>
          </div>

          {/* Terms Grid with Side-by-Side Tenure Visualizer */}
          <div className="grid grid-cols-1 gap-5">
            {terms.map((tItem) => {
              const tenure = calculateTenure(tItem.startDate, tItem.endDate, language);
              const isActive = tItem.status === 'ACTIVE';

              return (
                <div
                  key={tItem.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                    isActive
                      ? 'border-blue-300 ring-2 ring-blue-500/10'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Term Top Header */}
                  <div
                    className={`p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isActive ? 'bg-blue-50/60 border-blue-100' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : tenure.status === 'UPCOMING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isActive ? '🟢 ACTIVE (সক্রিয়)' : tItem.status}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base">{tItem.title}</h3>
                      </div>
                      {tItem.description && (
                        <p className="text-xs text-slate-600">{tItem.description}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 shadow-2xs">
                        মোট সদস্য: <strong className="text-blue-700 font-mono text-sm">{toBanglaNumber(tItem.membersCount || members.length)}</strong> জন
                      </div>
                    </div>
                  </div>

                  {/* Body: Left side = Dates & Details, Right side = Elapsed & Remaining Statistics */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column: Dates & Period Details (5 cols) */}
                    <div className="lg:col-span-5 space-y-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-5">
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>মেয়াদকাল ও সময়সীমা:</span>
                        </h4>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">শুরুর তারিখ:</span>
                            <span className="font-bold text-slate-800">
                              {formatDate(tItem.startDate, language)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="text-slate-500">সমাপ্তির তারিখ:</span>
                            <span className="font-bold text-slate-800">
                              {formatDate(tItem.endDate, language)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="text-slate-500">মোট নির্ধারিত মেয়াদ:</span>
                            <span className="font-mono font-semibold text-slate-700">
                              {toBanglaNumber(tenure.totalDays)} দিন (~{toBanglaNumber(Math.round(tenure.totalDays / 365))} বছর)
                            </span>
                          </div>
                        </div>
                      </div>

                      {tenure.isNearEnd && isActive && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">মেয়াদ সমাপ্তির সময় সন্নিকটে:</span>
                            <span>মেয়াদ শেষ হতে আর মাত্র {toBanglaNumber(tenure.remainingDays)} দিন বাকি রয়েছে।</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Detailed Elapsed & Remaining Tenure Widget (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-blue-600" />
                        <span>কার্যকাল অতিবাহিত ও অবশিষ্ট হিসাব:</span>
                      </h4>

                      {/* 2 Big Stat Cards Side-by-Side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* 1. Elapsed Card */}
                        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              অতিবাহিত সময়
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-blue-200/80 text-blue-800 px-2 py-0.5 rounded">
                              {toBanglaNumber(tenure.elapsedDays)} দিন
                            </span>
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-blue-950 leading-tight">
                            {tenure.elapsedText}
                          </div>
                          <div className="text-[11px] text-blue-700 font-medium">
                            মোট মেয়াদের {toBanglaNumber(tenure.progressPercent)}% অতিবাহিত হয়েছে
                          </div>
                        </div>

                        {/* 2. Remaining Card */}
                        <div
                          className={`p-4 rounded-xl space-y-1.5 border ${
                            tenure.status === 'EXPIRED'
                              ? 'bg-slate-100 border-slate-300 text-slate-800'
                              : tenure.isNearEnd
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-emerald-50/70 border-emerald-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-bold uppercase flex items-center gap-1 ${
                                tenure.isNearEnd ? 'text-amber-900' : 'text-emerald-900'
                              }`}
                            >
                              <Hourglass className="w-3.5 h-3.5" />
                              অবশিষ্ট মেয়াদ
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                tenure.isNearEnd
                                  ? 'bg-amber-200 text-amber-900'
                                  : 'bg-emerald-200/80 text-emerald-900'
                              }`}
                            >
                              {toBanglaNumber(tenure.remainingDays)} দিন বাকি
                            </span>
                          </div>
                          <div
                            className={`text-base sm:text-lg font-extrabold leading-tight ${
                              tenure.isNearEnd ? 'text-amber-950' : 'text-emerald-950'
                            }`}
                          >
                            {tenure.remainingText}
                          </div>
                          <div
                            className={`text-[11px] font-medium ${
                              tenure.isNearEnd ? 'text-amber-800' : 'text-emerald-700'
                            }`}
                          >
                            {tenure.status === 'EXPIRED'
                              ? 'কমিটির কার্যকাল সমাপ্ত'
                              : `মেয়াদ পূর্ণ হতে আর ${toBanglaNumber(100 - tenure.progressPercent)}% বাকি`}
                          </div>
                        </div>
                      </div>

                      {/* Overall Visual Progress Bar */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-600 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                            মেয়াদের সার্বিক অগ্রগতি:
                          </span>
                          <span className="text-blue-700 font-bold">
                            {toBanglaNumber(tenure.progressPercent)}% সম্পন্ন
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-700 ${
                              tenure.isNearEnd
                                ? 'bg-gradient-to-r from-blue-600 via-amber-500 to-amber-600'
                                : 'bg-gradient-to-r from-blue-500 to-blue-700'
                            }`}
                            style={{ width: `${tenure.progressPercent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>শুরু: {formatDate(tItem.startDate, language)}</span>
                          <span>আজকের দিন</span>
                          <span>সমাপ্তি: {formatDate(tItem.endDate, language)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. COMMITTEE MEETINGS & MINUTES */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {meetings.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
              <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">কোনো মিটিং কার্যবিবরণী সংরক্ষিত নেই</p>
              <p className="text-xs text-slate-400">নতুন সভার রেজোলিউশন অন্তর্ভুক্ত করতে উপরের বাটনে ক্লিক করুন।</p>
            </div>
          ) : (
            meetings.map((meet) => (
              <div
                key={meet.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {meet.meetingNumber}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                        {meet.resolutionNumber}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mt-1.5">
                      পরিচালনা কমিটির সভা — {formatDate(meet.date, language)} ({meet.time})
                    </h3>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span>সভাপতি: <strong className="text-slate-900">{meet.chairman}</strong></span> | <span>সম্পাদক: <strong className="text-slate-900">{meet.secretary}</strong></span>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  {/* Agenda */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
                      আলোচ্যসূচি (Agenda):
                    </h4>
                    <ul className="space-y-1 text-slate-700 pl-2">
                      {meet.agenda.map((ag, idx) => (
                        <li key={idx}>• {ag}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Decisions & Resolutions */}
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 space-y-2">
                    <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[11px]">
                      গৃহীত সিদ্ধান্ত ও রেজোলিউশন (Decisions & Resolutions):
                    </h4>
                    <ul className="space-y-1 text-blue-900 pl-2">
                      {meet.decisions.map((dec, idx) => (
                        <li key={idx}>✓ {dec}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Present Members */}
                  <div className="text-slate-500 text-[11px] pt-1">
                    উপস্থিত সদস্যবৃন্দ: {meet.membersPresent.join(', ')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE TERM MODAL */}
      {isTermModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">নতুন কমিটির মেয়াদ নির্ধারণ</h3>
            {termError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{termError}</span>
              </div>
            )}
            <form onSubmit={handleTermSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কমিটির শিরোনাম *</label>
                <input
                  id="input-term-title"
                  type="text"
                  placeholder="e.g. পরিচালনা পরিষদ (২০২৬ - ২০২৮)"
                  value={termTitle}
                  onChange={(e) => setTermTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">শুরুর তারিখ *</label>
                  <input
                    id="input-term-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সমাপ্তির তারিখ *</label>
                  <input
                    id="input-term-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ ও ওয়াকফ রেফারেন্স</label>
                <textarea
                  id="input-term-desc"
                  rows={2}
                  value={termDesc}
                  onChange={(e) => setTermDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTermModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-term"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MEMBER MODAL */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">কমিটিতে নতুন সদস্য অন্তর্ভুক্তি</h3>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {memberError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{memberError}</span>
              </div>
            )}
            <form onSubmit={handleMemberSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কমিটি মেয়াদ *</label>
                <select
                  id="select-member-term"
                  value={selectedTermId || activeTerm?.id || terms[0]?.id || ''}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {terms.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.title} ({tm.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের পুরো নাম *</label>
                <input
                  id="input-member-name"
                  type="text"
                  placeholder="e.g. আলা উদ্দীন"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জাতীয় পরিচয়পত্র (NID)</label>
                  <input
                    id="input-member-nid"
                    type="text"
                    placeholder="19XXXXXXXXX"
                    value={memberNid}
                    onChange={(e) => setMemberNid(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                  <input
                    id="input-member-phone"
                    type="tel"
                    placeholder="018XXXXXXXX"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পদবি নির্বাচন *</label>
                <select
                  id="select-member-position"
                  value={memberPosition}
                  onChange={(e) => setMemberPosition(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="PRESIDENT">সভাপতি (President)</option>
                  <option value="VICE_PRESIDENT">সহ-সভাপতি (Vice President)</option>
                  <option value="SECRETARY">সাধারণ সম্পাদক (General Secretary)</option>
                  <option value="JOINT_SECRETARY">যুগ্ম সম্পাদক (Joint Secretary)</option>
                  <option value="TREASURER">কোষাধ্যক্ষ (Treasurer)</option>
                  <option value="ORGANIZING_SECRETARY">সাংগঠনিক সম্পাদক</option>
                  <option value="MEMBER">কার্যনির্বাহী সদস্য (Member)</option>
                  <option value="IMAM">সম্মানিত ইমাম (সদস্য)</option>
                  <option value="ADVISOR">উপদেষ্টা (Advisor)</option>
                  <option value="OTHER">অন্যান্য পদবি</option>
                </select>
              </div>

              {memberPosition === 'OTHER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কাস্টম পদবি লিখুন *</label>
                  <input
                    id="input-member-custom-position"
                    type="text"
                    placeholder="e.g. প্রচার সম্পাদক"
                    value={memberPositionCustom}
                    onChange={(e) => setMemberPositionCustom(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের প্রাথমিক স্ট্যাটাস *</label>
                <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                  <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-emerald-800">
                    <input
                      type="radio"
                      name="memberStatus"
                      value="ACTIVE"
                      checked={memberStatus === 'ACTIVE'}
                      onChange={() => setMemberStatus('ACTIVE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>🟢 সক্রিয় (Active)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="memberStatus"
                      value="INACTIVE"
                      checked={memberStatus === 'INACTIVE'}
                      onChange={() => setMemberStatus('INACTIVE')}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span>⚪ নিষ্ক্রিয় (Inactive)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  id="input-member-address"
                  type="text"
                  placeholder="e.g. খুরুশকুল, কক্সবাজার"
                  value={memberAddress}
                  onChange={(e) => setMemberAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেশা / অতিরিক্ত নোট</label>
                <input
                  id="input-member-notes"
                  type="text"
                  placeholder="e.g. পেশা: শিক্ষকতা / সমাজসেবক"
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-member"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">সদস্যের তথ্য সম্পাদনা (Edit)</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কমিটি মেয়াদ *</label>
                <select
                  id="select-edit-member-term"
                  value={editTermId}
                  onChange={(e) => setEditTermId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {terms.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.title} ({tm.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের পুরো নাম *</label>
                <input
                  id="input-edit-member-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জাতীয় পরিচয়পত্র (NID)</label>
                  <input
                    id="input-edit-member-nid"
                    type="text"
                    value={editNid}
                    onChange={(e) => setEditNid(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                  <input
                    id="input-edit-member-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পদবি নির্বাচন *</label>
                <select
                  id="select-edit-member-position"
                  value={editPosition}
                  onChange={(e) => {
                    const pos = e.target.value as any;
                    setEditPosition(pos);
                    if (pos !== 'OTHER') {
                      setEditPositionCustom(POSITION_MAP_BN[pos] || '');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="PRESIDENT">সভাপতি (President)</option>
                  <option value="VICE_PRESIDENT">সহ-সভাপতি (Vice President)</option>
                  <option value="SECRETARY">সাধারণ সম্পাদক (General Secretary)</option>
                  <option value="JOINT_SECRETARY">যুগ্ম সম্পাদক (Joint Secretary)</option>
                  <option value="TREASURER">কোষাধ্যক্ষ (Treasurer)</option>
                  <option value="ORGANIZING_SECRETARY">সাংগঠনিক সম্পাদক</option>
                  <option value="MEMBER">কার্যনির্বাহী সদস্য (Member)</option>
                  <option value="IMAM">সম্মানিত ইমাম (সদস্য)</option>
                  <option value="ADVISOR">উপদেষ্টা (Advisor)</option>
                  <option value="OTHER">অন্যান্য পদবি</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বাংলা পদবি (প্রদর্শনের জন্য)</label>
                <input
                  id="input-edit-member-custom-position"
                  type="text"
                  placeholder="e.g. কার্যনির্বাহী সদস্য (Member)"
                  value={editPositionCustom}
                  onChange={(e) => setEditPositionCustom(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের স্ট্যাটাস / অবস্থা *</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                  <label
                    className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer font-semibold transition-all ${
                      editStatus === 'ACTIVE'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editStatus"
                      value="ACTIVE"
                      checked={editStatus === 'ACTIVE'}
                      onChange={() => setEditStatus('ACTIVE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>🟢 সক্রিয় (Active)</span>
                  </label>

                  <label
                    className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer font-semibold transition-all ${
                      editStatus === 'INACTIVE'
                        ? 'bg-slate-200 border-slate-400 text-slate-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editStatus"
                      value="INACTIVE"
                      checked={editStatus === 'INACTIVE'}
                      onChange={() => setEditStatus('INACTIVE')}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span>⚪ নিষ্ক্রিয় (Inactive)</span>
                  </label>

                  <label
                    className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer font-semibold transition-all ${
                      editStatus === 'RESIGNED'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editStatus"
                      value="RESIGNED"
                      checked={editStatus === 'RESIGNED'}
                      onChange={() => setEditStatus('RESIGNED')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>🟡 অব্যাহতি প্রাপ্ত</span>
                  </label>

                  <label
                    className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer font-semibold transition-all ${
                      editStatus === 'DECEASED'
                        ? 'bg-slate-800 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editStatus"
                      value="DECEASED"
                      checked={editStatus === 'DECEASED'}
                      onChange={() => setEditStatus('DECEASED')}
                      className="text-slate-900 focus:ring-slate-900"
                    />
                    <span>⚫ মরহুম</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  id="input-edit-member-address"
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. খুরুশকুল, কক্সবাজার"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেশা / মন্তব্য / নোট</label>
                <input
                  id="input-edit-member-notes"
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. পেশা: ব্যবসা"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-edit-member"
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingEdit ? 'আপডেট হচ্ছে...' : 'তথ্য আপডেট করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">সদস্য অপসারণ নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-500">কমিটি থেকে এই সদস্যকে মুছে ফেলা হবে।</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{deletingMember.name}</p>
              <p className="text-slate-600">{deletingMember.positionCustomBn || deletingMember.position}</p>
              <p className="text-slate-500 font-mono">{deletingMember.phone}</p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                বাতিল
              </button>
              <button
                id="btn-confirm-delete-member"
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
              >
                {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, অপসারণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MEETING MODAL */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">নতুন মিটিং কার্যবিবরণী ও রেজোলিউশন</h3>
            <form onSubmit={handleMeetingSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মিটিং তারিখ</label>
                  <input
                    id="input-meeting-date"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সময়</label>
                  <input
                    id="input-meeting-time"
                    type="text"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আলোচ্যসূচি (প্রতি লাইনে একটি)</label>
                <textarea
                  id="input-meeting-agenda"
                  rows={2}
                  placeholder="১. মসজিদের ফ্যান মেরামত..."
                  value={agendaText}
                  onChange={(e) => setAgendaText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গৃহীত সিদ্ধান্তসমূহ (প্রতি লাইনে একটি)</label>
                <textarea
                  id="input-meeting-decisions"
                  rows={3}
                  placeholder="১. সর্বসম্মতভাবে ৩টি সিলিং ফ্যান ক্রয় অনুমোদন..."
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">উপস্থিত সদস্যদের নাম (কমা দিয়ে)</label>
                <input
                  id="input-meeting-members"
                  type="text"
                  placeholder="আলহাজ্ব মকবুল হোসেন, রফিকুল ইসলাম..."
                  value={presentMembers}
                  onChange={(e) => setPresentMembers(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-meeting"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  রেজোলিউশন সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

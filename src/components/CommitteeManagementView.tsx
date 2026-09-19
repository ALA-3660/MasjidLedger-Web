import React, { useState, useEffect } from 'react';
import {
  Users2,
  Building,
  Shield,
  Clock,
  CalendarCheck,
  ClipboardList,
  Award,
  History,
  Repeat,
  Layers,
  FileBarChart,
  LayoutDashboard,
  Plus,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  ShieldCheck,
  UserCheck,
  UserX,
  TrendingUp,
  Sparkles,
  Calendar,
  Hourglass,
  Check,
  X,
} from 'lucide-react';
import {
  CommitteeTerm,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeMeetingNotice,
  MeetingResolution,
  SubCommittee,
  Mosque,
  User,
  FinancialAccount,
} from '../types';
import { Language, translations, formatDate } from '../lib/i18n';
import { QrScanResult } from '../types/qrBarcodeTypes';
import { CommitteeSecondarySidebar, CommitteeSubSection } from './CommitteeSecondarySidebar';
import { CurrentCommitteeView } from './CurrentCommitteeView';
import { AdvisoryCouncilView } from './AdvisoryCouncilView';
import { CommitteeActionPlanView } from './CommitteeActionPlanView';
import { CommitteePerformanceView } from './CommitteePerformanceView';
import { CommitteeFinancialHistoryView } from './CommitteeFinancialHistoryView';
import { CommitteeHandoverView } from './CommitteeHandoverView';
import { SubCommitteesView } from './SubCommitteesView';
import { CommitteeReportsView } from './CommitteeReportsView';
import { OfficialDocumentManagementView } from './documents/OfficialDocumentManagementView';
import { MemberFormModal } from './MemberFormModal';
import { MemberProfileModal } from './MemberProfileModal';
import { MeetingDocumentPrint } from './MeetingDocumentPrint';
import { MeetingMinutesModal } from './MeetingMinutesModal';
import { MeetingNoticeModal, MeetingNoticePrintModal } from './MeetingNoticeModal';
import { MeetingResolutionModal } from './MeetingResolutionModal';
import { MeetingResolutionPrint } from './MeetingResolutionPrint';
import { MeetingResolutionsListView } from './MeetingResolutionsListView';
import { calculateTenure, toBanglaNumber } from './CommitteeView';
import { printElement } from '../lib/printUtils';

export interface CommitteeManagementViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  notices?: CommitteeMeetingNotice[];
  resolutions?: MeetingResolution[];
  subCommittees?: SubCommittee[];
  accounts?: FinancialAccount[];
  language: Language;
  mosque?: Mosque | null;
  currentUser?: User | null;
  initialSection?: CommitteeSubSection | 'advisors' | 'meetings' | string;
  scannedActionIntent?: QrScanResult | null;
  onClearScannedAction?: () => void;
  onRefreshMosqueSettings?: () => Promise<void>;
  onAddTerm: (data: any) => Promise<void>;
  onUpdateTerm?: (id: string, data: any) => Promise<void>;
  onDeleteTerm?: (id: string) => Promise<void>;
  onAddMember: (data: any) => Promise<void>;
  onUpdateMember?: (id: string, data: any) => Promise<void>;
  onDeleteMember?: (id: string) => Promise<void>;
  onAddMeeting: (data: any) => Promise<void>;
  onUpdateMeeting?: (id: string, data: any) => Promise<void>;
  onDeleteMeeting?: (id: string) => Promise<void>;
  onLogMeetingAudit?: (id: string, action: string, details: string) => Promise<void>;
  onAddNotice?: (data: any) => Promise<void>;
  onDeleteNotice?: (id: string) => Promise<void>;
  onAddResolution?: (data: any) => Promise<void>;
  onUpdateResolution?: (id: string, data: any) => Promise<void>;
  onUpdateResolutionProgress?: (id: string, data: any) => Promise<void>;
  onDeleteResolution?: (id: string, force?: boolean) => Promise<void>;
  onDuplicateResolution?: (id: string) => Promise<void>;
  onAddSubCommittee?: (data: any) => Promise<void>;
  onUpdateSubCommittee?: (id: string, data: any) => Promise<void>;
  onArchiveSubCommittee?: (id: string) => Promise<void>;
}

export const CommitteeManagementView: React.FC<CommitteeManagementViewProps> = ({
  terms,
  members,
  meetings,
  notices = [],
  resolutions = [],
  subCommittees = [],
  accounts = [],
  language,
  mosque,
  currentUser,
  initialSection = 'dashboard',
  scannedActionIntent,
  onClearScannedAction,
  onRefreshMosqueSettings,
  onAddTerm,
  onUpdateTerm,
  onDeleteTerm,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  onLogMeetingAudit,
  onAddNotice,
  onDeleteNotice,
  onAddResolution,
  onUpdateResolution,
  onUpdateResolutionProgress,
  onDeleteResolution,
  onDuplicateResolution,
  onAddSubCommittee,
  onUpdateSubCommittee,
  onArchiveSubCommittee,
}) => {
  const isBn = language === 'bn';

  // Normalize initialSection
  const getValidSection = (sec: string): CommitteeSubSection => {
    if (sec === 'advisors') return 'advisors';
    if (sec === 'meetings') return 'meetings';
    if (sec === 'members') return 'members';
    if (sec === 'terms') return 'terms';
    if (sec === 'action-plans' || sec === 'actionPlans') return 'action-plans';
    if (sec === 'performance') return 'performance';
    if (sec === 'financial-history' || sec === 'financialHistory') return 'financial-history';
    if (sec === 'handover') return 'handover';
    if (sec === 'sub-committees' || sec === 'subCommittees') return 'sub-committees';
    if (sec === 'reports') return 'reports';
    if (sec === 'documents' || sec === 'official-documents' || sec === 'officialDocuments') return 'documents';
    if (sec === 'current-committee' || sec === 'currentCommittee') return 'current-committee';
    return 'dashboard';
  };

  const [activeSection, setActiveSection] = useState<CommitteeSubSection>(getValidSection(initialSection));

  // Sync when initialSection prop changes from external tabs
  useEffect(() => {
    if (initialSection) {
      setActiveSection(getValidSection(initialSection));
    }
  }, [initialSection]);

  // Active Term & Tenure
  const activeTerm = terms.find((t) => t.status === 'ACTIVE') || terms[0];
  const tenure = activeTerm
    ? calculateTenure(activeTerm.startDate, activeTerm.endDate, language)
    : null;

  // Handle Scan QR Intent
  useEffect(() => {
    if (!scannedActionIntent) return;
    const action = scannedActionIntent.actionKey;
    if (action === 'ACT-MTG-NEW' || (action as string) === 'ACT_MTG_NEW') {
      setActiveSection('meetings');
      setMeetingSubTab('notices');
      handleOpenNoticeModal();
      onClearScannedAction?.();
    } else if (action === 'ACT-MTG-RESOL' || (action as string) === 'ACT_MTG_RESOL') {
      setActiveSection('meetings');
      setMeetingSubTab('resolutions');
      handleOpenCreateResolution();
      onClearScannedAction?.();
    } else if (action === 'ACT-CAP-NEW' || (action as string) === 'ACT_CAP_NEW') {
      setActiveSection('action-plans');
      onClearScannedAction?.();
    } else if (action === 'ACT-SUB-NEW' || (action as string) === 'ACT_SUB_NEW') {
      setActiveSection('sub-committees');
      onClearScannedAction?.();
    }
  }, [scannedActionIntent]);

  // ==========================================
  // MEMBER MANAGEMENT STATE & MODALS
  // ==========================================
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<CommitteeMember | null>(null);
  const [selectedProfileMember, setSelectedProfileMember] = useState<CommitteeMember | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [isMemberPrintModalOpen, setIsMemberPrintModalOpen] = useState(false);

  // Sync profile member if members list changes
  useEffect(() => {
    if (selectedProfileMember) {
      const updated = members.find((m) => m.id === selectedProfileMember.id);
      if (updated) setSelectedProfileMember(updated);
    }
  }, [members]);

  const handleOpenAddMember = () => {
    setMemberToEdit(null);
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (mem: CommitteeMember) => {
    setMemberToEdit(mem);
    setIsMemberModalOpen(true);
  };

  const handleOpenMemberProfile = (mem: CommitteeMember) => {
    setSelectedProfileMember(mem);
    setIsProfileModalOpen(true);
  };

  const handleSaveMember = async (memberData: any) => {
    if (memberToEdit?.id && onUpdateMember) {
      await onUpdateMember(memberToEdit.id, memberData);
    } else {
      await onAddMember(memberData);
    }
  };

  const handleToggleMemberStatus = async (mem: CommitteeMember) => {
    if (!onUpdateMember) return;
    setStatusTogglingId(mem.id);
    try {
      const nextStatus = mem.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await onUpdateMember(mem.id, { status: nextStatus });
    } catch (err: any) {
      alert(err.message || 'স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে।');
    } finally {
      setStatusTogglingId(null);
    }
  };

  const filteredMembers = members.filter((mem) => {
    if (memberStatusFilter === 'ACTIVE' && mem.status !== 'ACTIVE') return false;
    if (memberStatusFilter === 'INACTIVE' && mem.status === 'ACTIVE') return false;
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase().trim();
      const matchName = mem.name.toLowerCase().includes(q);
      const matchPhone = mem.phone.toLowerCase().includes(q);
      const matchNid = (mem.nid || '').toLowerCase().includes(q);
      const matchPos = (mem.positionCustomBn || mem.position || '').toLowerCase().includes(q);
      const matchAddr = (mem.address || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchNid || matchPos || matchAddr;
    }
    return true;
  });

  // ==========================================
  // TERM MANAGEMENT STATE & MODALS
  // ==========================================
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [termTitle, setTermTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [termDesc, setTermDesc] = useState('');
  const [termError, setTermError] = useState('');

  const [isEditTermModalOpen, setIsEditTermModalOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editTermTitle, setEditTermTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editTermDesc, setEditTermDesc] = useState('');
  const [editTermStatus, setEditTermStatus] = useState<'ACTIVE' | 'EXPIRED' | 'UPCOMING'>('ACTIVE');
  const [editTermError, setEditTermError] = useState('');
  const [deletingTermItem, setDeletingTermItem] = useState<CommitteeTerm | null>(null);
  const [isDeletingTerm, setIsDeletingTerm] = useState(false);

  const handleOpenAddTerm = () => {
    setTermTitle('');
    setStartDate('');
    setEndDate('');
    setTermDesc('');
    setTermError('');
    setIsTermModalOpen(true);
  };

  const handleAddTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termTitle || !startDate || !endDate) {
      setTermError(isBn ? 'শিরোনাম, শুরুর তারিখ এবং শেষের তারিখ আবশ্যক।' : 'Title and dates are required.');
      return;
    }
    setTermError('');
    try {
      await onAddTerm({
        title: termTitle,
        startDate,
        endDate,
        description: termDesc,
        status: 'ACTIVE',
      });
      setIsTermModalOpen(false);
    } catch (err: any) {
      setTermError(err.message || 'মেয়াদ যোগ করতে সমস্যা হয়েছে।');
    }
  };

  const handleOpenEditTerm = (tm: CommitteeTerm) => {
    setEditingTermId(tm.id);
    setEditTermTitle(tm.title);
    setEditStartDate(tm.startDate);
    setEditEndDate(tm.endDate);
    setEditTermDesc(tm.description || '');
    setEditTermStatus(tm.status);
    setEditTermError('');
    setIsEditTermModalOpen(true);
  };

  const handleEditTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateTerm || !editingTermId) return;
    setEditTermError('');
    try {
      await onUpdateTerm(editingTermId, {
        title: editTermTitle,
        startDate: editStartDate,
        endDate: editEndDate,
        description: editTermDesc,
        status: editTermStatus,
      });
      setIsEditTermModalOpen(false);
      setEditingTermId(null);
    } catch (err: any) {
      setEditTermError(err.message || 'মেয়াদ আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleConfirmDeleteTerm = async () => {
    if (!onDeleteTerm || !deletingTermItem) return;
    setIsDeletingTerm(true);
    try {
      await onDeleteTerm(deletingTermItem.id);
      setDeletingTermItem(null);
    } catch (err: any) {
      alert(err.message || 'কমিটি মেয়াদ মুছে ফেলতে ব্যর্থ হয়েছে।');
    } finally {
      setIsDeletingTerm(false);
    }
  };

  // ==========================================
  // MEETINGS & RESOLUTIONS STATE & MODALS
  // ==========================================
  const [meetingSubTab, setMeetingSubTab] = useState<'minutes' | 'notices' | 'resolutions'>('minutes');
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);
  const [editingMeetingForModal, setEditingMeetingForModal] = useState<CommitteeMeeting | null>(null);
  const [isRevisionModeForModal, setIsRevisionModeForModal] = useState(false);
  const [activeMeetingForPrint, setActiveMeetingForPrint] = useState<CommitteeMeeting | null>(null);
  const [isMeetingPrintOpen, setIsMeetingPrintOpen] = useState(false);
  const [deletingMeetingItem, setDeletingMeetingItem] = useState<CommitteeMeeting | null>(null);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);

  // Meeting Notice Modal State
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [activeNoticeForPrint, setActiveNoticeForPrint] = useState<CommitteeMeetingNotice | null>(null);
  const [isNoticePrintModalOpen, setIsNoticePrintModalOpen] = useState(false);
  const [deletingNoticeItem, setDeletingNoticeItem] = useState<CommitteeMeetingNotice | null>(null);
  const [isDeletingNotice, setIsDeletingNotice] = useState(false);
  const [noticeMemoNo, setNoticeMemoNo] = useState('');
  const [noticeSerial, setNoticeSerial] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [noticeDay, setNoticeDay] = useState('');
  const [noticeTime, setNoticeTime] = useState('');
  const [noticeVenue, setNoticeVenue] = useState('মসজিদ কমপ্লেক্স');
  const [noticeAgendas, setNoticeAgendas] = useState('১. \n২. ');
  const [noticeRemarks, setNoticeRemarks] = useState('সকলকে যথাসময়ে উপস্থিত থাকার জন্য অনুরোধ করা হলো।');

  // Meeting Resolutions Modals State
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [editingResolutionForModal, setEditingResolutionForModal] = useState<MeetingResolution | null>(null);
  const [selectedResMeetingId, setSelectedResMeetingId] = useState<string | undefined>(undefined);
  const [selectedResDecisionId, setSelectedResDecisionId] = useState<string | undefined>(undefined);
  const [isResolutionRevisionMode, setIsResolutionRevisionMode] = useState(false);
  const [activeResolutionForPrint, setActiveResolutionForPrint] = useState<MeetingResolution | null>(null);
  const [isResolutionPrintOpen, setIsResolutionPrintOpen] = useState(false);
  const [activeResolutionsForBookPrint, setActiveResolutionsForBookPrint] = useState<MeetingResolution[] | null>(null);
  const [resolutionBookTitle, setResolutionBookTitle] = useState<string>('রেজোলিউশন বই');
  const [isResolutionBookPrintOpen, setIsResolutionBookPrintOpen] = useState(false);
  const [deletingResolutionItem, setDeletingResolutionItem] = useState<MeetingResolution | null>(null);
  const [isDeletingResolution, setIsDeletingResolution] = useState(false);

  // Meeting filters
  const [meetingSearchText, setMeetingSearchText] = useState('');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState('ALL');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('ALL');
  const [meetingDateFrom, setMeetingDateFrom] = useState('');
  const [meetingDateTo, setMeetingDateTo] = useState('');

  const handleOpenNewMinutes = () => {
    setEditingMeetingForModal(null);
    setIsRevisionModeForModal(false);
    setIsMinutesModalOpen(true);
  };

  const handleOpenEditMinutes = (meet: CommitteeMeeting) => {
    setEditingMeetingForModal(meet);
    setIsRevisionModeForModal(false);
    setIsMinutesModalOpen(true);
  };

  const handleOpenRevisionMinutes = (meet: CommitteeMeeting) => {
    setEditingMeetingForModal(meet);
    setIsRevisionModeForModal(true);
    setIsMinutesModalOpen(true);
  };

  const handleSaveMeetingMinutes = async (meetingData: any) => {
    if (editingMeetingForModal?.id && onUpdateMeeting) {
      await onUpdateMeeting(editingMeetingForModal.id, meetingData);
    } else {
      await onAddMeeting(meetingData);
    }
  };

  const handleOpenNoticeModal = () => {
    const serial = meetings.length + 1;
    const dateObj = new Date();
    const yy = dateObj.getFullYear().toString().slice(-2);
    const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const dd = dateObj.getDate().toString().padStart(2, '0');
    let initials = 'MJMWS';
    if (mosque?.name) {
      const parts = mosque.name.split(' ');
      if (parts.length > 1) {
        initials = parts.map((p) => p[0]).join('').toUpperCase();
      }
    }
    const memo = `${initials}-${dd}/${mm}/${yy}/${serial.toString().padStart(4, '0')}`;
    setNoticeSerial(serial.toString());
    setNoticeMemoNo(memo);
    setNoticeDate(dateObj.toISOString().split('T')[0]);
    setNoticeDay(new Intl.DateTimeFormat('bn-BD', { weekday: 'long' }).format(dateObj));
    setIsNoticeModalOpen(true);
  };

  const handleSaveNotice = async (noticeData: any) => {
    if (onAddNotice) {
      await onAddNotice(noticeData);
    }
  };

  const handleConvertNoticeToMinutes = (notice: CommitteeMeetingNotice) => {
    setIsRevisionModeForModal(false);
    setEditingMeetingForModal({
      id: '',
      meetingNoticeId: notice.id,
      documentNumber: '',
      meetingNumber: notice.serialNumber || '১',
      memoNumber: notice.memoNo,
      noticeDate: notice.noticeDate,
      date: notice.meetingDate,
      dayName: notice.dayName,
      time: notice.time,
      location: notice.venue,
      meetingType: notice.meetingType,
      meetingTypeBn: notice.meetingTypeBn,
      agenda: notice.agendas || [],
      decisions: [],
      resolutions: [],
      chairman: '',
      secretary: '',
      membersPresent: [],
      attendees: [],
      status: 'DRAFT',
    });
    setIsMinutesModalOpen(true);
  };

  const handleOpenCreateResolution = (meetingId?: string, decisionId?: string) => {
    setEditingResolutionForModal(null);
    setSelectedResMeetingId(meetingId);
    setSelectedResDecisionId(decisionId);
    setIsResolutionRevisionMode(false);
    setIsResolutionModalOpen(true);
  };

  const handleOpenEditResolution = (resolution: MeetingResolution) => {
    setEditingResolutionForModal(resolution);
    setSelectedResMeetingId(resolution.meetingId);
    setSelectedResDecisionId(resolution.decisionId);
    setIsResolutionRevisionMode(false);
    setIsResolutionModalOpen(true);
  };

  const handleOpenRevisionResolution = (resolution: MeetingResolution) => {
    setEditingResolutionForModal(resolution);
    setSelectedResMeetingId(resolution.meetingId);
    setSelectedResDecisionId(resolution.decisionId);
    setIsResolutionRevisionMode(true);
    setIsResolutionModalOpen(true);
  };

  const handleSaveResolution = async (resolutionData: any) => {
    if (editingResolutionForModal?.id && onUpdateResolution) {
      await onUpdateResolution(editingResolutionForModal.id, resolutionData);
    } else if (onAddResolution) {
      await onAddResolution(resolutionData);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (meetingStatusFilter !== 'ALL' && (m.status || 'FINAL') !== meetingStatusFilter) return false;
    if (meetingTypeFilter !== 'ALL' && m.meetingType !== meetingTypeFilter) return false;
    if (meetingDateFrom && m.date < meetingDateFrom) return false;
    if (meetingDateTo && m.date > meetingDateTo) return false;
    if (meetingSearchText.trim()) {
      const q = meetingSearchText.toLowerCase().trim();
      const docNo = (m.documentNumber || '').toLowerCase();
      const memo = (m.memoNumber || '').toLowerCase();
      const loc = (m.location || '').toLowerCase();
      const ch = (m.chairman || '').toLowerCase();
      const sec = (m.secretary || '').toLowerCase();
      return docNo.includes(q) || memo.includes(q) || loc.includes(q) || ch.includes(q) || sec.includes(q);
    }
    return true;
  });

  const filteredNotices = (notices || []).filter((n) => {
    if (meetingSearchText.trim()) {
      const q = meetingSearchText.toLowerCase().trim();
      const memo = (n.memoNo || '').toLowerCase();
      const venue = (n.venue || '').toLowerCase();
      return memo.includes(q) || venue.includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto">
      {/* Left Secondary Sidebar */}
      <CommitteeSecondarySidebar
        activeSection={activeSection}
        onSelectSection={(sec) => setActiveSection(sec)}
        activeTerm={activeTerm}
        totalMembersCount={members.length}
        activeMembersCount={members.filter((m) => m.status === 'ACTIVE').length}
        advisorsCount={members.filter((m) => m.position === 'ADVISOR').length}
        meetingsCount={meetings.length}
        actionPlansCount={resolutions.length}
        subCommitteesCount={subCommittees.filter((sc) => !sc.isArchived).length}
        termsCount={terms.length}
        language={language}
      />

      {/* Main Section Content Pane */}
      <main className="flex-1 min-w-0">
        {/* SECTION 1: 📊 সারসংক্ষেপ ও ওভারভিউ (Dashboard) */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Welcome Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <Users2 className="w-6 h-6 text-blue-600" />
                  <span>{isBn ? 'কমিটি ব্যবস্থাপনা ওভারভিউ' : 'Committee Management Overview'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isBn
                    ? 'কার্যনির্বাহী পরিষদ, উপদেষ্টা পরিষদ, মিটিং কার্যবিবরণী ও কর্মপরিকল্পনা কেন্দ্রীয় ড্যাশবোর্ড'
                    : 'Executive council, advisory body, resolutions and performance control center'}
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleOpenAddMember}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'নতুন সদস্য অন্তর্ভুক্তি' : 'Add Member'}</span>
                </button>
                <button
                  onClick={handleOpenNewMinutes}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>{isBn ? 'নতুন মিটিং রেজোলিউশন' : 'New Meeting'}</span>
                </button>
              </div>
            </div>

            {/* Active Term Status Banner */}
            {activeTerm && tenure && (
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{isBn ? 'চলমান কমিটি মেয়াদকাল' : 'Active Committee Term'}</span>
                    </div>
                    <h3 className="text-lg font-bold">{activeTerm.title}</h3>
                    <p className="text-xs text-slate-300">
                      {formatDate(activeTerm.startDate, language)} হতে {formatDate(activeTerm.endDate, language)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10 text-center">
                      <div className="text-lg font-bold font-mono text-white">
                        {isBn ? toBanglaNumber(tenure.progressPercent) : tenure.progressPercent}%
                      </div>
                      <div className="text-[10px] text-blue-200">{isBn ? 'মেয়াদ অতিক্রান্ত' : 'Elapsed'}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10 text-center">
                      <div className="text-lg font-bold font-mono text-emerald-300">
                        {isBn ? toBanglaNumber(members.filter((m) => m.status === 'ACTIVE').length) : members.filter((m) => m.status === 'ACTIVE').length}
                      </div>
                      <div className="text-[10px] text-blue-200">{isBn ? 'সক্রিয় সদস্য' : 'Active Members'}</div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>{tenure.elapsedText}</span>
                    <span className={tenure.isNearEnd ? 'text-amber-300 font-bold' : 'text-emerald-300 font-bold'}>
                      {tenure.remainingText}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        tenure.isNearEnd ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${tenure.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setActiveSection('members')}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <Users2 className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {isBn ? 'সক্রিয়' : 'Active'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {isBn ? toBanglaNumber(members.length) : members.length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{isBn ? 'মোট সদস্য' : 'Total Members'}</div>
              </div>

              <div
                onClick={() => setActiveSection('meetings')}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <CalendarCheck className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                    {isBn ? 'অনুষ্ঠিত' : 'Done'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {isBn ? toBanglaNumber(meetings.length) : meetings.length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{isBn ? 'মোট মিটিং' : 'Total Meetings'}</div>
              </div>

              <div
                onClick={() => setActiveSection('action-plans')}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <ClipboardList className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    {isBn ? 'সিদ্ধান্ত' : 'Resol'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {isBn ? toBanglaNumber(resolutions.length) : resolutions.length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{isBn ? 'গৃহীত রেজোলিউশন' : 'Resolutions'}</div>
              </div>

              <div
                onClick={() => setActiveSection('sub-committees')}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-cyan-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                    <Layers className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">
                    {isBn ? 'উইং' : 'Wings'}
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {isBn ? toBanglaNumber(subCommittees.filter((sc) => !sc.isArchived).length) : subCommittees.filter((sc) => !sc.isArchived).length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{isBn ? 'উপ-কমিটি সংখ্যা' : 'Sub-Committees'}</div>
              </div>
            </div>

            {/* Quick Access Section Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveSection('current-committee')}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{isBn ? 'বর্তমান কমিটি ও অর্গানোগ্রাম' : 'Current Committee'}</h4>
                    <p className="text-[11px] text-slate-500">{isBn ? 'সভাপতি, সাধারণ সম্পাদক ও নেতৃত্ব কাঠামো' : 'Executive hierarchy & leadership'}</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setActiveSection('advisors')}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{isBn ? 'উপদেষ্টা পরিষদ ও পরামর্শ' : 'Advisory Council'}</h4>
                    <p className="text-[11px] text-slate-500">{isBn ? 'স্বতন্ত্র উপদেষ্টা তালিকা ও পরামর্শ রেজিস্টার' : 'Independent advisors & consultation log'}</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setActiveSection('handover')}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{isBn ? 'দায়িত্ব হস্তান্তর প্রটোকল' : 'Handover Protocol'}</h4>
                    <p className="text-[11px] text-slate-500">{isBn ? 'সম্পদ, দলিল ও নগদ তহবিল সমর্পণ সনদ' : 'Fund, document & asset handover cert'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Meetings & Resolutions Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Recent Meetings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <CalendarCheck className="w-4 h-4 text-purple-600" />
                    <span>{isBn ? 'সর্বশেষ অনুষ্ঠিত মিটিং' : 'Recent Meetings'}</span>
                  </h4>
                  <button
                    onClick={() => setActiveSection('meetings')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {isBn ? 'সকল মিটিং' : 'View all'}
                  </button>
                </div>
                {meetings.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">{isBn ? 'কোন মিটিং রেকর্ড নেই।' : 'No meeting records.'}</p>
                ) : (
                  <div className="space-y-2.5">
                    {meetings.slice(0, 3).map((m, idx) => (
                      <div key={m.id || idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">
                            মিটিং #{m.meetingNumber || idx + 1} • {m.memoNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {formatDate(m.date, language)} • {m.location || 'মসজিদ কমপ্লেক্স'}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {m.status || 'FINAL'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Resolutions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>{isBn ? 'গুরুত্বপূর্ণ রেজোলিউশন' : 'Key Resolutions'}</span>
                  </h4>
                  <button
                    onClick={() => setActiveSection('action-plans')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {isBn ? 'সকল রেজোলিউশন' : 'View all'}
                  </button>
                </div>
                {resolutions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">{isBn ? 'কোন রেজোলিউশন রেকর্ড নেই।' : 'No resolution records.'}</p>
                ) : (
                  <div className="space-y-2.5">
                    {resolutions.slice(0, 3).map((r) => (
                      <div key={r.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-slate-800 truncate">{r.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{r.resolutionNumber}</div>
                        </div>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          {isBn ? toBanglaNumber(r.progressPercentage || 0) : r.progressPercentage || 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: 👥 সদস্য তালিকা (Member List) */}
        {activeSection === 'members' && (
          <div className="space-y-5">
            {/* Header & Controls */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <Users2 className="w-5 h-5 text-blue-600" />
                    <span>{isBn ? 'কমিটি সদস্য রেজিস্টার ও ডিরেক্টরি' : 'Committee Member Register'}</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                      {isBn ? toBanglaNumber(filteredMembers.length) : filteredMembers.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isBn ? 'সকল সক্রিয় ও সাবেক সদস্যের পূর্ণাঙ্গ পরিচিতি, পদবী ও যোগাযোগ তথ্য' : 'Manage member details, status and contacts'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => setIsMemberPrintModalOpen(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>{isBn ? 'সদস্য তালিকা প্রিন্ট' : 'Print List'}</span>
                  </button>
                  <button
                    onClick={handleOpenAddMember}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isBn ? 'নতুন সদস্য যুক্ত করুন' : 'Add Member'}</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder={isBn ? 'নাম, পদবী, মোবাইল বা এনআইডি দিয়ে খুঁজুন...' : 'Search by name, position or phone...'}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center space-x-1 text-xs">
                  {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setMemberStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                        memberStatusFilter === st
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'ALL' ? (isBn ? 'সকল' : 'All') : st === 'ACTIVE' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Member Cards Grid */}
            {filteredMembers.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">{isBn ? 'কোন সদস্য পাওয়া যায়নি' : 'No members found'}</h4>
                <p className="text-xs text-slate-500 mt-1">{isBn ? 'অনুগ্রহ করে নতুন সদস্য যুক্ত করুন।' : 'Please add a new member.'}</p>
                <button
                  onClick={handleOpenAddMember}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'সদস্য অন্তর্ভুক্তি' : 'Add Member'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((mem) => {
                  const isAct = mem.status === 'ACTIVE';
                  return (
                    <div
                      key={mem.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shrink-0 overflow-hidden shadow-2xs">
                              {mem.photoUrl ? (
                                <img src={mem.photoUrl} alt={mem.name} className="w-full h-full object-cover" />
                              ) : (
                                mem.name.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-600">
                                {mem.name}
                              </h4>
                              <div className="text-xs text-blue-700 font-bold mt-0.5">
                                {mem.positionCustomBn || mem.position}
                              </div>
                              {mem.occupation && (
                                <div className="text-[11px] text-slate-500 truncate">{mem.occupation}</div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleMemberStatus(mem)}
                            disabled={statusTogglingId === mem.id}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                              isAct
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isAct ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                          </button>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{mem.phone}</span>
                          </div>
                          {mem.nid && (
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-400">NID:</span>
                              <span className="font-mono">{mem.nid}</span>
                            </div>
                          )}
                          {mem.bloodGroup && (
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-400">রক্ত:</span>
                              <span className="font-bold text-rose-600">{mem.bloodGroup}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => handleOpenMemberProfile(mem)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isBn ? 'প্রোফাইল' : 'Profile'}</span>
                        </button>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditMember(mem)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={isBn ? 'সম্পাদনা' : 'Edit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteMember && (
                            <button
                              onClick={() => {
                                if (confirm(isBn ? 'আপনি কি নিশ্চিত যে এই সদস্যকে মুছে ফেলতে চান?' : 'Delete member?')) {
                                  onDeleteMember(mem.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: 🏛️ বর্তমান কমিটি (Current Committee) */}
        {activeSection === 'current-committee' && (
          <CurrentCommitteeView
            terms={terms}
            members={members}
            mosque={mosque}
            language={language}
            onViewMemberProfile={handleOpenMemberProfile}
            onOpenAddMemberModal={handleOpenAddMember}
            onNavigateToSection={(sec) => setActiveSection(sec)}
          />
        )}

        {/* SECTION 4: 🛡️ উপদেষ্টা পরিষদ (Advisory Council) */}
        {activeSection === 'advisors' && (
          <AdvisoryCouncilView
            mosque={mosque}
            onRefresh={onRefreshMosqueSettings}
          />
        )}

        {/* SECTION 5: ⏳ কমিটির মেয়াদকাল ও ইতিহাস (Terms & History) */}
        {activeSection === 'terms' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>{isBn ? 'কমিটির মেয়াদকাল ও অতীত ইতিহাস' : 'Committee Terms & Archive'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBn ? 'কমিটি মেয়াদের সময়কাল নির্ধারণ, মেয়াদ পর্যবেক্ষণ এবং সাবেক কমিটির আর্কাইভ' : 'Define and track committee terms'}
                </p>
              </div>

              <button
                onClick={handleOpenAddTerm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isBn ? 'নতুন মেয়াদ নির্ধারণ' : 'Add New Term'}</span>
              </button>
            </div>

            {/* Terms List */}
            <div className="space-y-4">
              {terms.map((tm) => {
                const isAct = tm.status === 'ACTIVE';
                const tmTenure = calculateTenure(tm.startDate, tm.endDate, language);
                return (
                  <div
                    key={tm.id}
                    className={`bg-white p-5 rounded-2xl border transition-all ${
                      isAct ? 'border-blue-300 ring-2 ring-blue-500/10 shadow-sm' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-base">{tm.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isAct ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isAct ? (isBn ? 'সক্রিয় পরিষদ' : 'Active') : (isBn ? 'মেয়াদ সমাপ্ত' : 'Expired')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(tm.startDate, language)} হতে {formatDate(tm.endDate, language)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditTerm(tm)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                        </button>
                        {onDeleteTerm && (
                          <button
                            onClick={() => setDeletingTermItem(tm)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar if active */}
                    {isAct && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                          <span>{tmTenure.elapsedText}</span>
                          <span className={tmTenure.isNearEnd ? 'text-amber-600 font-bold' : 'text-slate-700 font-bold'}>
                            {tmTenure.remainingText}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              tmTenure.isNearEnd ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${tmTenure.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 6: 📅 মিটিং ও কার্যবিবরণী (Meetings & Resolutions) */}
        {activeSection === 'meetings' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <CalendarCheck className="w-5 h-5 text-purple-600" />
                    <span>{isBn ? 'মিটিং কার্যবিবরণী, নোটিশ ও রেজোলিউশন' : 'Meetings & Resolutions'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isBn ? 'সভা আহ্বান নোটিশ, রেজোলিউশন বই এবং সিদ্ধান্ত বাস্তবায়ন ট্র্যাকিং' : 'Record meeting minutes and official resolutions'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleOpenNoticeModal}
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isBn ? 'নতুন মিটিং নোটিশ' : 'New Notice'}</span>
                  </button>
                  <button
                    onClick={handleOpenNewMinutes}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isBn ? 'নতুন কার্যবিবরণী' : 'New Minutes'}</span>
                  </button>
                </div>
              </div>

              {/* Sub tabs: Minutes | Notices | Resolutions */}
              <div className="flex items-center space-x-2 mt-4 text-xs font-bold">
                <button
                  onClick={() => setMeetingSubTab('minutes')}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    meetingSubTab === 'minutes' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isBn ? `কার্যবিবরণী (${toBanglaNumber(filteredMeetings.length)})` : `Minutes (${filteredMeetings.length})`}
                </button>
                <button
                  onClick={() => setMeetingSubTab('notices')}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    meetingSubTab === 'notices' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isBn ? `নোটিশ (${toBanglaNumber(filteredNotices.length)})` : `Notices (${filteredNotices.length})`}
                </button>
                <button
                  onClick={() => setMeetingSubTab('resolutions')}
                  className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    meetingSubTab === 'resolutions' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isBn ? `রেজোলিউশন বই (${toBanglaNumber(resolutions.length)})` : `Resolutions (${resolutions.length})`}
                </button>
              </div>
            </div>

            {/* Sub-tab 1: Minutes */}
            {meetingSubTab === 'minutes' && (
              <div className="space-y-4">
                {filteredMeetings.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800 text-sm">{isBn ? 'কোন মিটিং রেকর্ড পাওয়া যায়নি' : 'No meeting records'}</h4>
                    <p className="text-xs text-slate-500 mt-1">{isBn ? 'নতুন কার্যবিবরণী যোগ করুন।' : 'Add new meeting minutes.'}</p>
                    <button
                      onClick={handleOpenNewMinutes}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isBn ? 'কার্যবিবরণী লিখুন' : 'Write Minutes'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMeetings.map((meet, idx) => (
                      <div
                        key={meet.id}
                        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-sm">
                                মিটিং #{meet.meetingNumber || idx + 1}
                              </span>
                              <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                                {meet.memoNumber}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                {meet.status || 'FINAL'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                              <span>তারিখ: {formatDate(meet.date, language)} ({meet.time})</span>
                              <span>স্থান: {meet.location || 'মসজিদ কমপ্লেক্স'}</span>
                              {meet.chairman && <span>সভাপতি: {meet.chairman}</span>}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => {
                                setActiveMeetingForPrint(meet);
                                setIsMeetingPrintOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditMinutes(meet)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Agendas preview */}
                        {meet.agenda && meet.agenda.length > 0 && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                            <span className="font-bold text-slate-900 text-[11px] block">আলোচ্যসূচি:</span>
                            <ul className="list-disc pl-4 space-y-0.5">
                              {meet.agenda.slice(0, 3).map((ag, i) => (
                                <li key={i}>{ag}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Notices */}
            {meetingSubTab === 'notices' && (
              <div className="space-y-4">
                {filteredNotices.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800 text-sm">{isBn ? 'কোন নোটিশ রেকর্ড নেই' : 'No notices'}</h4>
                    <button
                      onClick={handleOpenNoticeModal}
                      className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isBn ? 'নোটিশ তৈরি করুন' : 'Create Notice'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotices.map((n) => (
                      <div key={n.id} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-sm">স্মারক: {n.memoNo}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              {n.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            মিটিং তারিখ: {formatDate(n.meetingDate, language)} ({n.time}) • স্থান: {n.venue}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => {
                              setActiveNoticeForPrint(n);
                              setIsNoticePrintModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{isBn ? 'নোটিশ প্রিন্ট' : 'Print'}</span>
                          </button>
                          <button
                            onClick={() => handleConvertNoticeToMinutes(n)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <span>{isBn ? 'কার্যবিবরণীতে রূপান্তর' : 'Convert to Minutes'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Resolutions */}
            {meetingSubTab === 'resolutions' && (
              <MeetingResolutionsListView
                resolutions={resolutions}
                meetings={meetings}
                language={language}
                onOpenCreateResolution={handleOpenCreateResolution}
                onOpenEditResolution={handleOpenEditResolution}
                onOpenRevisionResolution={handleOpenRevisionResolution}
                onOpenPrintResolution={(res) => {
                  setActiveResolutionForPrint(res);
                  setIsResolutionPrintOpen(true);
                }}
                onOpenBookPrint={(resList, title) => {
                  setActiveResolutionsForBookPrint(resList);
                  setResolutionBookTitle(title);
                  setIsResolutionBookPrintOpen(true);
                }}
                onUpdateResolutionStatus={async (id, st) => {
                  if (onUpdateResolution) await onUpdateResolution(id, { status: st });
                }}
                onUpdateResolutionProgress={async (id, prg) => {
                  if (onUpdateResolutionProgress) await onUpdateResolutionProgress(id, prg);
                }}
                onDeleteResolutionDirect={async (id, force) => {
                  if (onDeleteResolution) await onDeleteResolution(id, force);
                }}
                onDuplicateResolution={async (id) => {
                  if (onDuplicateResolution) await onDuplicateResolution(id);
                }}
              />
            )}
          </div>
        )}

        {/* SECTION 7: 📋 কর্মপরিকল্পনা ও অগ্রগতি (Action Plan & Progress) */}
        {activeSection === 'action-plans' && (
          <CommitteeActionPlanView
            terms={terms}
            members={members}
            meetings={meetings}
            resolutions={resolutions}
            mosque={mosque}
            language={language}
            currentUserRole={currentUser?.role}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.name}
            onRefreshMosqueSettings={onRefreshMosqueSettings}
          />
        )}

        {/* SECTION 8: 🎯 সদস্য মূল্যায়ন ও পারফরম্যান্স (Performance & Scorecard) */}
        {activeSection === 'performance' && (
          <CommitteePerformanceView
            terms={terms}
            members={members}
            meetings={meetings}
            mosque={mosque}
            language={language}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.name}
            currentUserRole={currentUser?.role}
            onRefreshMosqueSettings={onRefreshMosqueSettings}
          />
        )}

        {/* SECTION 9: 💰 কমিটি ভিত্তিক আর্থিক হিসাব (Financial History & Audit) */}
        {activeSection === 'financial-history' && (
          <CommitteeFinancialHistoryView
            terms={terms}
            language={language}
            mosque={mosque}
            currentUser={currentUser}
            onRefreshTerms={onRefreshMosqueSettings}
          />
        )}

        {/* SECTION 10: 🔄 দফাওয়ারি দায়িত্ব হস্তান্তর (Handover Protocol) */}
        {activeSection === 'handover' && (
          <CommitteeHandoverView
            terms={terms}
            members={members}
            mosque={mosque}
            accounts={accounts}
            language={language}
            currentUser={currentUser}
          />
        )}

        {/* SECTION 11: 📑 সাব-কমিটি ও উইং (Sub-Committees & Wings) */}
        {activeSection === 'sub-committees' && (
          <SubCommitteesView
            subCommittees={subCommittees}
            terms={terms}
            members={members}
            meetings={meetings}
            resolutions={resolutions}
            language={language}
            mosque={mosque}
            currentUser={currentUser}
            onAddSubCommittee={onAddSubCommittee}
            onUpdateSubCommittee={onUpdateSubCommittee}
            onArchiveSubCommittee={onArchiveSubCommittee}
            onAdd={onAddSubCommittee}
            onUpdate={onUpdateSubCommittee}
            onArchive={onArchiveSubCommittee}
          />
        )}

        {/* SECTION 12: 📑 কমিটি রিপোর্ট ও এক্সপোর্ট (Reports & Export) */}
        {activeSection === 'reports' && (
          <CommitteeReportsView
            terms={terms}
            members={members}
            meetings={meetings}
            resolutions={resolutions}
            subCommittees={subCommittees}
            mosque={mosque}
            language={language}
          />
        )}

        {/* SECTION 13: 📑 দাপ্তরিক নথি ও যোগাযোগ (Official Documents & Communications) */}
        {activeSection === 'documents' && (
          <OfficialDocumentManagementView
            mosque={mosque}
            committeeTerms={terms}
            committeeMeetings={meetings}
            resolutions={resolutions}
            members={members}
          />
        )}
      </main>

      {/* ==================================================== */}
      {/* ALL MODALS (MEMBER, TERM, NOTICE, MINUTES, RESOLUTION) */}
      {/* ==================================================== */}
      {isMemberModalOpen && (
        <MemberFormModal
          isOpen={isMemberModalOpen}
          onClose={() => setIsMemberModalOpen(false)}
          onSave={handleSaveMember}
          member={memberToEdit}
          terms={terms}
          language={language}
        />
      )}

      {isProfileModalOpen && selectedProfileMember && (
        <MemberProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          member={selectedProfileMember}
          terms={terms}
          language={language}
          onEdit={(mem) => {
            setIsProfileModalOpen(false);
            handleOpenEditMember(mem);
          }}
          onDelete={
            onDeleteMember
              ? (id) => {
                  setIsProfileModalOpen(false);
                  onDeleteMember(id);
                }
              : undefined
          }
        />
      )}

      {/* Add Term Modal */}
      {isTermModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">{isBn ? 'নতুন কমিটির মেয়াদ যুক্ত করুন' : 'Add Committee Term'}</h3>
            {termError && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {termError}
              </div>
            )}
            <form onSubmit={handleAddTermSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isBn ? 'মেয়াদের নাম/শিরোনাম' : 'Term Title'}</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ২০২৬-২০২৮ কার্যনির্বাহী পরিষদ"
                  value={termTitle}
                  onChange={(e) => setTermTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isBn ? 'শুরুর তারিখ' : 'Start Date'}</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isBn ? 'শেষের তারিখ' : 'End Date'}</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isBn ? 'বিবরণ (ঐচ্ছিক)' : 'Description'}</label>
                <textarea
                  rows={3}
                  value={termDesc}
                  onChange={(e) => setTermDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTermModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  {isBn ? 'সংরক্ষণ করুন' : 'Save Term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Term Modal */}
      {isEditTermModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">{isBn ? 'কমিটির মেয়াদ সম্পাদনা' : 'Edit Committee Term'}</h3>
            {editTermError && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {editTermError}
              </div>
            )}
            <form onSubmit={handleEditTermSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isBn ? 'মেয়াদের নাম/শিরোনাম' : 'Term Title'}</label>
                <input
                  type="text"
                  required
                  value={editTermTitle}
                  onChange={(e) => setEditTermTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isBn ? 'শুরুর তারিখ' : 'Start Date'}</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isBn ? 'শেষের তারিখ' : 'End Date'}</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isBn ? 'স্ট্যাটাস' : 'Status'}</label>
                <select
                  value={editTermStatus}
                  onChange={(e) => setEditTermStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="ACTIVE">{isBn ? 'সক্রিয় (Active)' : 'Active'}</option>
                  <option value="EXPIRED">{isBn ? 'মেয়াদ সমাপ্ত (Expired)' : 'Expired'}</option>
                  <option value="UPCOMING">{isBn ? 'আসন্ন (Upcoming)' : 'Upcoming'}</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">{isBn ? 'বিবরণ' : 'Description'}</label>
                <textarea
                  rows={3}
                  value={editTermDesc}
                  onChange={(e) => setEditTermDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTermModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  {isBn ? 'আপডেট করুন' : 'Update Term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Term Confirm Modal */}
      {deletingTermItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h4 className="font-bold text-slate-900 text-base">{isBn ? 'মেয়াদ মুছে ফেলতে চান?' : 'Delete Term?'}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {deletingTermItem.title} {isBn ? 'মুছে ফেলতে চান? সংশ্লিষ্ট সদস্য ও মিটিং রেকর্ড ক্ষতিগ্রস্ত হতে পারে।' : ''}
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setDeletingTermItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDeleteTerm}
                disabled={isDeletingTerm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                {isDeletingTerm ? (isBn ? 'মুছছে...' : 'Deleting...') : (isBn ? 'হ্যাঁ, মুছুন' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minutes Modal */}
      {isMinutesModalOpen && (
        <MeetingMinutesModal
          isOpen={isMinutesModalOpen}
          onClose={() => setIsMinutesModalOpen(false)}
          onSave={handleSaveMeetingMinutes}
          meeting={editingMeetingForModal}
          members={members}
          terms={terms}
          mosque={mosque}
          language={language}
          isRevisionMode={isRevisionModeForModal}
          onLogAudit={onLogMeetingAudit}
        />
      )}

      {/* Notice Modal */}
      {isNoticeModalOpen && (
        <MeetingNoticeModal
          isOpen={isNoticeModalOpen}
          onClose={() => setIsNoticeModalOpen(false)}
          onSave={handleSaveNotice}
          mosque={mosque}
          language={language}
          initialMemoNo={noticeMemoNo}
          initialSerial={noticeSerial}
          initialDate={noticeDate}
          initialDay={noticeDay}
          initialTime={noticeTime}
          initialVenue={noticeVenue}
          initialAgendas={noticeAgendas}
          initialRemarks={noticeRemarks}
        />
      )}

      {/* Notice Print Modal */}
      {isNoticePrintModalOpen && activeNoticeForPrint && (
        <MeetingNoticePrintModal
          isOpen={isNoticePrintModalOpen}
          onClose={() => setIsNoticePrintModalOpen(false)}
          notice={activeNoticeForPrint}
          mosque={mosque}
          language={language}
        />
      )}

      {/* Meeting Minutes Print Document Modal */}
      {isMeetingPrintOpen && activeMeetingForPrint && (
        <MeetingDocumentPrint
          isOpen={isMeetingPrintOpen}
          onClose={() => setIsMeetingPrintOpen(false)}
          meeting={activeMeetingForPrint}
          mosque={mosque}
          language={language}
        />
      )}

      {/* Resolution Modal */}
      {isResolutionModalOpen && (
        <MeetingResolutionModal
          isOpen={isResolutionModalOpen}
          onClose={() => setIsResolutionModalOpen(false)}
          onSave={handleSaveResolution}
          resolution={editingResolutionForModal}
          meetingId={selectedResMeetingId}
          decisionId={selectedResDecisionId}
          meetings={meetings}
          members={members}
          terms={terms}
          mosque={mosque}
          language={language}
          isRevisionMode={isResolutionRevisionMode}
        />
      )}

      {/* Resolution Print Modal */}
      {isResolutionPrintOpen && activeResolutionForPrint && (
        <MeetingResolutionPrint
          isOpen={isResolutionPrintOpen}
          onClose={() => setIsResolutionPrintOpen(false)}
          resolution={activeResolutionForPrint}
          mosque={mosque}
          language={language}
        />
      )}
    </div>
  );
};

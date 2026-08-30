import React, { useState, useEffect } from 'react';
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
  History,
  FileCheck2,
  Eye,
  Send,
  Award,
  Sparkles,
  Layers,
  Stamp,
  ClipboardList,
} from 'lucide-react';
import {
  CommitteeTerm,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeMeetingNotice,
  MeetingResolution,
  MeetingStatus,
  Mosque,
  SubCommittee,
} from '../types';
import { Language, translations, formatDate } from '../lib/i18n';
import { QrScanResult } from '../types/qrBarcodeTypes';
import { MeetingDocumentPrint } from './MeetingDocumentPrint';
import { MeetingMinutesModal } from './MeetingMinutesModal';
import { MeetingNoticeModal, MeetingNoticePrintModal } from './MeetingNoticeModal';
import { MeetingResolutionModal } from './MeetingResolutionModal';
import { MeetingResolutionPrint } from './MeetingResolutionPrint';
import { MeetingResolutionsListView } from './MeetingResolutionsListView';
import { CommitteePerformanceView } from './CommitteePerformanceView';
import { CommitteeActionPlanView } from './CommitteeActionPlanView';
import { CommitteeFinancialHistoryView } from './CommitteeFinancialHistoryView';
import { SubCommitteesView } from './SubCommitteesView';

interface CommitteeViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  notices?: CommitteeMeetingNotice[];
  resolutions?: MeetingResolution[];
  language: Language;
  mosque?: Mosque | null;
  currentUser?: any;
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
  subCommittees?: SubCommittee[];
  onAddSubCommittee?: (data: any) => Promise<void>;
  onUpdateSubCommittee?: (id: string, data: any) => Promise<void>;
  onArchiveSubCommittee?: (id: string) => Promise<void>;
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
  notices = [],
  resolutions = [],
  language,
  mosque,
  currentUser,
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
  subCommittees = [],
  onAddSubCommittee,
  onUpdateSubCommittee,
  onArchiveSubCommittee,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'members' | 'terms' | 'meetings' | 'action-plans' | 'performance' | 'financial-history' | 'sub-committees'>('members');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  // Handle Scan -> Direct Entry for Committee actions
  useEffect(() => {
    if (!scannedActionIntent) return;

    const action = scannedActionIntent.actionKey;
    if (action === 'ACT-MTG-NEW' || (action as string) === 'ACT_MTG_NEW') {
      setActiveTab('meetings');
      setMeetingSubTab('notices');
      setIsNewNoticeModalOpen(true);
      onClearScannedAction?.();
    } else if (action === 'ACT-MTG-RESOL' || (action as string) === 'ACT_MTG_RESOL') {
      setActiveTab('meetings');
      setMeetingSubTab('resolutions');
      setEditingResolutionForModal(null);
      setIsResolutionRevisionMode(false);
      setIsResolutionModalOpen(true);
      onClearScannedAction?.();
    } else if (action === 'ACT-CAP-NEW' || (action as string) === 'ACT_CAP_NEW') {
      setActiveTab('action-plans');
      // Pass through or let action plan handle it
      onClearScannedAction?.();
    } else if (action === 'ACT-SUB-NEW' || (action as string) === 'ACT_SUB_NEW') {
      setActiveTab('sub-committees');
      onClearScannedAction?.();
    }
  }, [scannedActionIntent]);

  // Edit Term Modal
  const [isEditTermModalOpen, setIsEditTermModalOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editTermTitle, setEditTermTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editTermDesc, setEditTermDesc] = useState('');
  const [editTermStatus, setEditTermStatus] = useState<'ACTIVE' | 'EXPIRED' | 'UPCOMING'>('ACTIVE');
  const [editTermError, setEditTermError] = useState('');

  // Delete Term Confirm Modal
  const [deletingTermItem, setDeletingTermItem] = useState<CommitteeTerm | null>(null);
  const [isDeletingTerm, setIsDeletingTerm] = useState(false);

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

  // Meeting Notice Modal
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isNoticePrintOpen, setIsNoticePrintOpen] = useState(false);
  
  const [noticeMemoNo, setNoticeMemoNo] = useState('');
  const [noticeSerial, setNoticeSerial] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [noticeDay, setNoticeDay] = useState('');
  const [noticeTime, setNoticeTime] = useState('');
  const [noticeVenue, setNoticeVenue] = useState('মসজিদ কমপ্লেক্স');
  const [noticeAgendas, setNoticeAgendas] = useState('১. \n২. ');
  const [noticeRemarks, setNoticeRemarks] = useState('সকলকে যথাসময়ে উপস্থিত থাকার জন্য অনুরোধ করা হলো।');

  const handleOpenNoticeModal = () => {
    // Generate auto fields
    const serial = meetings.length + 1;
    const dateObj = new Date();
    const yy = dateObj.getFullYear().toString().slice(-2);
    const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const dd = dateObj.getDate().toString().padStart(2, '0');
    
    // Auto initials
    let initials = 'MJMWS';
    if (mosque?.name) {
      const parts = mosque.name.split(' ');
      if (parts.length > 1) {
        initials = parts.map(p => p[0]).join('').toUpperCase();
      }
    }
    
    const memo = `${initials}-${dd}/${mm}/${yy}/${serial.toString().padStart(4, '0')}`;
    
    setNoticeSerial(serial.toString());
    setNoticeMemoNo(memo);
    setNoticeDate(dateObj.toISOString().split('T')[0]);
    setNoticeDay(new Intl.DateTimeFormat('bn-BD', { weekday: 'long' }).format(dateObj));
    setIsNoticeModalOpen(true);
  };

  const handleNoticeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    setNoticeDate(d);
    if (d) {
      setNoticeDay(new Intl.DateTimeFormat('bn-BD', { weekday: 'long' }).format(new Date(d)));
    } else {
      setNoticeDay('');
    }
  };

  const handleNoticeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsNoticeModalOpen(false);
    setIsNoticePrintOpen(true);
  };

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

  // Enhanced Meeting & Minutes State
  const [meetingSubTab, setMeetingSubTab] = useState<'notices' | 'minutes' | 'resolutions'>('notices');
  const [meetingSearchText, setMeetingSearchText] = useState('');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('ALL');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState('ALL');
  const [meetingDateFrom, setMeetingDateFrom] = useState('');
  const [meetingDateTo, setMeetingDateTo] = useState('');

  // Meeting Minutes Modals
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);
  const [editingMeetingForModal, setEditingMeetingForModal] = useState<CommitteeMeeting | null>(null);
  const [isRevisionModeForModal, setIsRevisionModeForModal] = useState(false);
  const [activeMeetingForPrint, setActiveMeetingForPrint] = useState<CommitteeMeeting | null>(null);
  const [isMeetingPrintOpen, setIsMeetingPrintOpen] = useState(false);
  const [deletingMeetingItem, setDeletingMeetingItem] = useState<CommitteeMeeting | null>(null);
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);
  const [auditMeetingItem, setAuditMeetingItem] = useState<CommitteeMeeting | null>(null);

  // Meeting Notices Modals
  const [isNewNoticeModalOpen, setIsNewNoticeModalOpen] = useState(false);
  const [activeNoticeForPrint, setActiveNoticeForPrint] = useState<CommitteeMeetingNotice | null>(null);
  const [isNoticePrintModalOpen, setIsNoticePrintModalOpen] = useState(false);
  const [deletingNoticeItem, setDeletingNoticeItem] = useState<CommitteeMeetingNotice | null>(null);
  const [isDeletingNotice, setIsDeletingNotice] = useState(false);

  // Meeting Resolutions Modals
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

  // Meeting Handlers
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

  const handleOpenMeetingPrint = (meet: CommitteeMeeting) => {
    setActiveMeetingForPrint(meet);
    setIsMeetingPrintOpen(true);
  };

  const handleConfirmDeleteMeeting = async () => {
    if (!deletingMeetingItem || !onDeleteMeeting) return;
    setIsDeletingMeeting(true);
    try {
      await onDeleteMeeting(deletingMeetingItem.id);
      setDeletingMeetingItem(null);
    } catch (err: any) {
      alert(err.message || 'মিটিং কার্যবিবরণী মুছে ফেলতে সমস্যা হয়েছে।');
    } finally {
      setIsDeletingMeeting(false);
    }
  };

  // Resolution Handlers
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

  const handleOpenResolutionPrint = (resolution: MeetingResolution) => {
    setActiveResolutionForPrint(resolution);
    setIsResolutionPrintOpen(true);
  };

  const handleOpenBookPrint = (resList: MeetingResolution[], title: string) => {
    setActiveResolutionsForBookPrint(resList);
    setResolutionBookTitle(title);
    setIsResolutionBookPrintOpen(true);
  };

  const handleUpdateResolutionStatus = async (id: string, newStatus: any) => {
    if (onUpdateResolution) {
      await onUpdateResolution(id, { status: newStatus });
    }
  };

  const handleUpdateResolutionProgress = async (id: string, progress: any) => {
    if (onUpdateResolutionProgress) {
      await onUpdateResolutionProgress(id, progress);
    } else if (onUpdateResolution) {
      await onUpdateResolution(id, progress);
    }
  };

  const handleDeleteResolutionDirect = async (id: string, force?: boolean) => {
    if (onDeleteResolution) {
      await onDeleteResolution(id, force);
    }
  };

  const handleSaveResolution = async (resolutionData: any) => {
    if (editingResolutionForModal?.id && onUpdateResolution) {
      await onUpdateResolution(editingResolutionForModal.id, resolutionData);
    } else if (onAddResolution) {
      await onAddResolution(resolutionData);
    }
  };

  const handleConfirmDeleteResolution = async () => {
    if (!deletingResolutionItem || !onDeleteResolution) return;
    setIsDeletingResolution(true);
    try {
      await onDeleteResolution(deletingResolutionItem.id);
      setDeletingResolutionItem(null);
    } catch (err: any) {
      alert(err.message || 'রেজোলিউশন মুছে ফেলতে সমস্যা হয়েছে।');
    } finally {
      setIsDeletingResolution(false);
    }
  };

  const handleDuplicateResolution = async (id: string) => {
    if (onDuplicateResolution) {
      await onDuplicateResolution(id);
    }
  };

  const handleSaveNotice = async (noticeData: any) => {
    if (onAddNotice) {
      await onAddNotice(noticeData);
    }
  };

  const handleOpenNoticePrint = (notice: CommitteeMeetingNotice) => {
    setActiveNoticeForPrint(notice);
    setIsNoticePrintModalOpen(true);
  };

  const handleConfirmDeleteNotice = async () => {
    if (!deletingNoticeItem || !onDeleteNotice) return;
    setIsDeletingNotice(true);
    try {
      await onDeleteNotice(deletingNoticeItem.id);
      setDeletingNoticeItem(null);
    } catch (err: any) {
      alert(err.message || 'নোটিশ মুছে ফেলতে সমস্যা হয়েছে।');
    } finally {
      setIsDeletingNotice(false);
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

  // Filtered meetings list
  const filteredMeetings = meetings.filter((m) => {
    if (meetingStatusFilter !== 'ALL' && (m.status || 'FINAL') !== meetingStatusFilter) {
      return false;
    }
    if (meetingTypeFilter !== 'ALL' && m.meetingType !== meetingTypeFilter) {
      return false;
    }
    if (meetingDateFrom && m.date < meetingDateFrom) {
      return false;
    }
    if (meetingDateTo && m.date > meetingDateTo) {
      return false;
    }
    if (meetingSearchText.trim()) {
      const q = meetingSearchText.toLowerCase().trim();
      const docNo = (m.documentNumber || '').toLowerCase();
      const memo = (m.memoNumber || '').toLowerCase();
      const mNum = (m.meetingNumber || '').toLowerCase();
      const loc = (m.location || '').toLowerCase();
      const ch = (m.chairman || '').toLowerCase();
      const cond = (m.conductor || '').toLowerCase();
      const sec = (m.secretary || '').toLowerCase();
      const dua = (m.duaLeader || '').toLowerCase();
      const agendasStr = (m.agenda || []).join(' ').toLowerCase();
      const decsStr = (m.decisions || []).join(' ').toLowerCase();
      return (
        docNo.includes(q) ||
        memo.includes(q) ||
        mNum.includes(q) ||
        loc.includes(q) ||
        ch.includes(q) ||
        cond.includes(q) ||
        sec.includes(q) ||
        dua.includes(q) ||
        agendasStr.includes(q) ||
        decsStr.includes(q)
      );
    }
    return true;
  });

  // Filtered notices list
  const filteredNotices = (notices || []).filter((n) => {
    if (meetingSearchText.trim()) {
      const q = meetingSearchText.toLowerCase().trim();
      const memo = (n.memoNo || '').toLowerCase();
      const sn = (n.serialNumber || '').toLowerCase();
      const venue = (n.venue || '').toLowerCase();
      const agendasStr = (n.agendas || []).join(' ').toLowerCase();
      return memo.includes(q) || sn.includes(q) || venue.includes(q) || agendasStr.includes(q);
    }
    return true;
  });

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

  const isAnyCommitteePrintActive = Boolean(
    isNoticePrintModalOpen || isMeetingPrintOpen || isPrintModalOpen
  );

  return (
    <>
      <div className={`space-y-5 max-w-7xl mx-auto pb-10 ${isAnyCommitteePrintActive ? 'print:hidden' : ''}`}>
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

          <button
            id="tab-btn-committee-action-plans"
            onClick={() => setActiveTab('action-plans')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'action-plans'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-emerald-300" />
            <span>কর্মপরিকল্পনা ও অগ্রগতি</span>
            <span className="ml-1 bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              মূলী
            </span>
          </button>

          <button
            id="tab-btn-committee-performance"
            onClick={() => setActiveTab('performance')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>সদস্য মূল্যায়ন ও কার্যক্রম</span>
            <span className="ml-1 bg-amber-500 text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              নতুন
            </span>
          </button>

          <button
            id="tab-btn-committee-financial-history"
            onClick={() => setActiveTab('financial-history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'financial-history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-200" />
            <span>কমিটি ভিত্তিক হিসাব</span>
            <span className="ml-1 bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              হিসাব
            </span>
          </button>

          <button
            id="tab-btn-sub-committees"
            onClick={() => setActiveTab('sub-committees')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sub-committees'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-200" />
            <span>সাব-কমিটি ব্যবস্থাপনা</span>
            <span className="ml-1 bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {subCommittees.filter(sc => !sc.isArchived).length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'members' && (
            <div className="flex items-center space-x-2">
              <button
                id="btn-print-committee-members"
                onClick={() => setIsPrintModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span>কমিটির সদস্য প্রিন্ট</span>
              </button>
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
            </div>
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
            <div className="flex items-center space-x-2">
              <button
                id="btn-open-add-meeting-notice"
                onClick={() => setIsNewNoticeModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>মিটিং আহবান +</span>
              </button>
              <button
                id="btn-open-add-meeting"
                onClick={handleOpenNewMinutes}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন মিটিং কার্যবিবরণী</span>
              </button>
            </div>
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

                    <div className="flex items-center space-x-2 text-xs">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-700 shadow-2xs">
                        মোট সদস্য: <strong className="text-blue-700 font-mono text-sm">{toBanglaNumber(tItem.membersCount || members.filter(m => m.termId === tItem.id).length)}</strong> জন
                      </div>

                      {/* Edit Term Button */}
                      <button
                        id={`btn-edit-term-${tItem.id}`}
                        onClick={() => handleOpenEditTerm(tItem)}
                        title="মেয়াদকাল এডিট করুন"
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>এডিট</span>
                      </button>

                      {/* Delete Term Button */}
                      <button
                        id={`btn-delete-term-${tItem.id}`}
                        onClick={() => setDeletingTermItem(tItem)}
                        title="মেয়াদকাল ডিলিট করুন"
                        className="p-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        <div className="space-y-6">
          {/* Subtabs for Notices vs Minutes vs Resolutions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMeetingSubTab('notices')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  meetingSubTab === 'notices'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>১. মিটিং আহবান (নোটিশ)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    meetingSubTab === 'notices' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {toBanglaNumber((notices || []).length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMeetingSubTab('minutes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  meetingSubTab === 'minutes'
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-400'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>২. মিটিং কার্যবিবরণী (Minutes)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    meetingSubTab === 'minutes' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {toBanglaNumber(meetings.length)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMeetingSubTab('resolutions')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  meetingSubTab === 'resolutions'
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Stamp className="w-4 h-4" />
                <span>৩. মিটিং রেজোলিউশন (সিদ্ধান্ত রেজিস্টার)</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    meetingSubTab === 'resolutions' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {toBanglaNumber((resolutions || []).length)}
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {meetingSubTab === 'notices' && (
                <button
                  type="button"
                  onClick={() => setIsNewNoticeModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন নোটিশ তৈরি</span>
                </button>
              )}
              {meetingSubTab === 'minutes' && (
                <button
                  type="button"
                  onClick={handleOpenNewMinutes}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন কার্যবিবরণী এন্ট্রি</span>
                </button>
              )}
              {meetingSubTab === 'resolutions' && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateResolution()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন রেজোলিউশন তৈরি</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Bar (for Notices & Minutes) */}
          {meetingSubTab !== 'resolutions' && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ডকুমেন্ট নং, স্মারক, আলোচ্যসূচি, সিদ্ধান্ত বা সভাপতি খুঁজুন..."
                    value={meetingSearchText}
                    onChange={(e) => setMeetingSearchText(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition-all"
                  />
                </div>

                {/* Status Filter */}
                {meetingSubTab === 'minutes' && (
                  <div>
                    <select
                      value={meetingStatusFilter}
                      onChange={(e) => setMeetingStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition-all cursor-pointer"
                    >
                      <option value="ALL">সকল স্ট্যাটাস (All Status)</option>
                      <option value="FINAL">চূড়ান্ত অনুমোদিত (Final)</option>
                      <option value="DRAFT">খসড়া / ড্রাফট (Draft)</option>
                      <option value="REVISED">সংশোধিত / রিভিশন (Revised)</option>
                    </select>
                  </div>
                )}

                {/* Type Filter */}
                <div>
                  <select
                    value={meetingTypeFilter}
                    onChange={(e) => setMeetingTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 outline-none transition-all cursor-pointer"
                  >
                    <option value="ALL">সকল ধরণের সভা</option>
                    <option value="GENERAL">সাধারণ সভা</option>
                    <option value="MONTHLY">মাসিক নিয়মিত সভা</option>
                    <option value="EMERGENCY">জরুরি সভা</option>
                    <option value="SPECIAL">বিশেষ সভা</option>
                    <option value="ANNUAL">বার্ষিক সাধারণ সভা (AGM)</option>
                    <option value="OTHER">অন্যান্য</option>
                  </select>
                </div>

                {/* Reset filter button */}
                {(meetingSearchText || meetingStatusFilter !== 'ALL' || meetingTypeFilter !== 'ALL') && (
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMeetingSearchText('');
                        setMeetingStatusFilter('ALL');
                        setMeetingTypeFilter('ALL');
                        setMeetingDateFrom('');
                        setMeetingDateTo('');
                      }}
                      className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer w-full text-center"
                    >
                      ফিল্টার রিসেট
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 1: MINUTES */}
          {meetingSubTab === 'minutes' && (
            <div className="space-y-4">
              {filteredMeetings.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <FileCheck2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">কোনো মিটিং কার্যবিবরণী পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400">
                      নতুন সভার রেজোলিউশন ও অফিসিয়াল কার্যবিবরণী অন্তর্ভুক্ত করতে &quot;নতুন মিটিং কার্যবিবরণী&quot; বাটনে ক্লিক করুন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewMinutes}
                    className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন কার্যবিবরণী তৈরি</span>
                  </button>
                </div>
              ) : (
                filteredMeetings.map((meet) => {
                  const isDraft = meet.status === 'DRAFT';
                  const isRevised = (meet.revisionNumber && meet.revisionNumber > 0) || meet.status === 'REVISED';
                  const isFinal = !isDraft && !isRevised;

                  return (
                    <div
                      key={meet.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                      {/* Card Top Banner / Action Header */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-slate-50 to-indigo-50/40 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Document ID */}
                            {meet.documentNumber && (
                              <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                {meet.documentNumber}
                              </span>
                            )}
                            {/* Memo Number */}
                            {meet.memoNumber && (
                              <span className="text-xs font-semibold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-lg">
                                স্মারক: {meet.memoNumber}
                              </span>
                            )}
                            {/* Meeting Serial Number */}
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                              সভা নং #{toBanglaNumber(meet.meetingNumber || '১')}
                            </span>
                            {/* Status badge */}
                            {isFinal && (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>চূড়ান্ত অনুমোদিত</span>
                              </span>
                            )}
                            {isDraft && (
                              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>খসড়া (Draft)</span>
                              </span>
                            )}
                            {isRevised && (
                              <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                                <History className="w-3.5 h-3.5" />
                                <span>সংশোধিত v{toBanglaNumber(meet.revisionNumber || 1)}</span>
                              </span>
                            )}
                            {/* Meeting Type Badge */}
                            {meet.meetingTypeBn && (
                              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                {meet.meetingTypeBn}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-slate-900 text-base font-siliguri">
                            কার্যবিবরণী ও রেজোলিউশন — {formatDate(meet.date, language)} ({meet.dayName || ''})
                          </h3>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Print Letterhead Document */}
                          <button
                            type="button"
                            onClick={() => handleOpenMeetingPrint(meet)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                            title="অফিসিয়াল লেটারহেডে প্রিন্ট ও প্রিভিউ"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>লেটারহেড প্রিন্ট</span>
                          </button>

                          {/* Edit / Update */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditMinutes(meet)}
                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                            title="সম্পাদন করুন"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>এডিট</span>
                          </button>

                          {/* Create Revision (for finalized meetings) */}
                          <button
                            type="button"
                            onClick={() => handleOpenRevisionMinutes(meet)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
                            title="নতুন সংশোধিত সংস্করণ তৈরি করুন"
                          >
                            <History className="w-3.5 h-3.5 text-purple-600" />
                            <span>সংশোধন</span>
                          </button>

                          {/* Audit Log */}
                          <button
                            type="button"
                            onClick={() => setAuditMeetingItem(meet)}
                            className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                            title="অডিট লগ ও হিস্টোরি দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeletingMeetingItem(meet)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Revision notice if revised */}
                      {meet.revisionReason && (
                        <div className="bg-purple-50 px-5 py-2 border-b border-purple-100 text-xs text-purple-900 flex items-center space-x-2">
                          <History className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>
                            <strong>সংশোধনের কারণ:</strong> {meet.revisionReason}{' '}
                            {meet.originalDocumentNumber && (
                              <span className="text-purple-700">
                                (মূল নথি নং: <code>{meet.originalDocumentNumber}</code>)
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Card Content Details */}
                      <div className="p-5 space-y-4 text-xs">
                        {/* Quick Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-500 text-[11px] block">তারিখ ও বার:</span>
                            <span className="font-semibold text-slate-800">
                              {formatDate(meet.date, language)} {meet.dayName ? `(${meet.dayName})` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">সময়:</span>
                            <span className="font-semibold text-slate-800">
                              {meet.time} {meet.endTime ? ` - ${meet.endTime}` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">স্থান / ভেন্যু:</span>
                            <span className="font-semibold text-slate-800">{meet.location || 'মসজিদ অফিস কক্ষ'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">উপস্থিতি:</span>
                            <span className="font-semibold text-slate-800">
                              {toBanglaNumber(
                                meet.attendees?.filter((a) => a.isPresent).length || meet.membersPresent?.length || 0
                              )}{' '}
                              জন উপস্থিত
                            </span>
                          </div>
                        </div>

                        {/* Leadership Team Pills */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                          {meet.chairman && (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                                সভার সভাপতি:
                              </span>
                              <span className="font-bold text-slate-900">{meet.chairman}</span>
                              {meet.chairmanDesignation && (
                                <span className="text-[10px] text-slate-600 block">
                                  ({meet.chairmanDesignation})
                                </span>
                              )}
                            </div>
                          )}
                          {meet.conductor && (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                                পরিচালনাকারী:
                              </span>
                              <span className="font-bold text-slate-900">{meet.conductor}</span>
                            </div>
                          )}
                          {meet.secretary && (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                                কার্যবিবরণী সম্পাদক:
                              </span>
                              <span className="font-bold text-slate-900">{meet.secretary}</span>
                            </div>
                          )}
                          {meet.duaLeader && (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <span className="text-[10px] text-slate-500 block uppercase font-bold">
                                বিশেষ মোনাজাত:
                              </span>
                              <span className="font-bold text-slate-900">{meet.duaLeader}</span>
                            </div>
                          )}
                        </div>

                        {/* Agenda List */}
                        {meet.agenda && meet.agenda.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1">
                              <span>আলোচ্যসূচি (Agendas):</span>
                              <span className="text-slate-500 font-normal">
                                ({toBanglaNumber(meet.agenda.length)} টি)
                              </span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                              {meet.agenda.map((ag, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 flex items-start space-x-2"
                                >
                                  <span className="font-bold text-slate-900 font-mono text-[11px]">
                                    {toBanglaNumber(idx + 1)}.
                                  </span>
                                  <span>{ag}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Decisions & Resolutions */}
                        {((meet.decisionItems && meet.decisionItems.length > 0) ||
                          (meet.resolutions && meet.resolutions.length > 0) ||
                          (meet.decisions && meet.decisions.length > 0)) && (
                          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>গৃহীত সিদ্ধান্তসমূহ (Meeting Decisions):</span>
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleOpenCreateResolution(meet.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                                title="এই মিটিংয়ের সিদ্ধান্ত থেকে নতুন রেজোলিউশন তৈরি করুন"
                              >
                                <Stamp className="w-3 h-3" />
                                <span>+ রেজোলিউশন তৈরি</span>
                              </button>
                            </div>

                            <div className="space-y-2 pl-1">
                              {meet.decisionItems && meet.decisionItems.length > 0 ? (
                                meet.decisionItems.map((dec, idx) => {
                                  const linkedRes = resolutions.find(
                                    (r) => r.decisionId === dec.id || (r.meetingId === meet.id && r.title === dec.title)
                                  );
                                  return (
                                    <div
                                      key={dec.id || idx}
                                      className="p-3 bg-white rounded-lg border border-emerald-100 shadow-2xs space-y-1.5"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start space-x-2 text-emerald-950 font-medium text-xs">
                                          <span className="font-bold text-emerald-800 font-mono text-[11px]">
                                            {toBanglaNumber(idx + 1)}.
                                          </span>
                                          <div>
                                            <span className="font-bold">{dec.title}</span>
                                            {dec.details && (
                                              <p className="text-[11px] text-slate-600 font-normal pt-0.5 leading-relaxed">
                                                {dec.details}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center space-x-1.5 shrink-0">
                                          {linkedRes ? (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenResolutionPrint(linkedRes)}
                                              className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-bold flex items-center space-x-1 border border-emerald-300 transition-colors cursor-pointer"
                                              title="রেজোলিউশন নথি প্রিন্ট করুন"
                                            >
                                              <Stamp className="w-3 h-3 text-emerald-700" />
                                              <span>রেজোলিউশন #{toBanglaNumber(linkedRes.resolutionNumber || '১')}</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenCreateResolution(meet.id, dec.id)}
                                              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded text-[10px] font-semibold border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
                                              title="এই সিদ্ধান্তের জন্য আলাদা রেজোলিউশন তৈরি করুন"
                                            >
                                              + রেজোলিউশন
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                                        {dec.proposerName && <span>প্রস্তাবক: <strong>{dec.proposerName}</strong></span>}
                                        {dec.supporterName && <span>সমর্থক: <strong>{dec.supporterName}</strong></span>}
                                        {dec.financialAmount && dec.financialAmount > 0 && (
                                          <span className="text-emerald-700 font-bold font-mono">
                                            বরাদ্দ: ৳{toBanglaNumber(dec.financialAmount)}
                                          </span>
                                        )}
                                        {dec.status && (
                                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px]">
                                            {dec.status === 'APPROVED'
                                              ? 'অনুমোদিত'
                                              : dec.status === 'PENDING'
                                              ? 'বিবেচনাধীন'
                                              : 'বাতিল'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                (meet.resolutions && meet.resolutions.length > 0
                                  ? meet.resolutions
                                  : meet.decisions
                                ).map((dec, idx) => (
                                  <div key={idx} className="flex items-start justify-between gap-2 text-emerald-950 font-medium bg-white p-2.5 rounded-lg border border-emerald-100">
                                    <div className="flex items-start space-x-2">
                                      <span className="font-bold text-emerald-800 font-mono text-[11px]">
                                        {toBanglaNumber(idx + 1)}.
                                      </span>
                                      <span className="leading-relaxed text-xs">{dec}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateResolution(meet.id)}
                                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded text-[10px] font-semibold border border-slate-200 shrink-0 cursor-pointer"
                                    >
                                      + রেজোলিউশন
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Responsible Members / Action Items */}
                        {meet.actionItems && meet.actionItems.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                              বাস্তবায়নে দায়িত্বপ্রাপ্ত সদস্যবৃন্দ (Assigned Responsibility):
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {meet.actionItems.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-[11px] space-y-1"
                                >
                                  <div className="font-bold text-blue-950 flex items-center space-x-1">
                                    <span>👤 {item.assigneeName}</span>
                                    {item.assigneeDesignation && (
                                      <span className="text-blue-700 font-normal">
                                        ({item.assigneeDesignation})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-blue-900 font-medium">{item.task}</div>
                                  {item.deadline && (
                                    <div className="text-[10px] text-blue-700">
                                      সময়সীমা: {formatDate(item.deadline, language)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attendees List preview */}
                        {meet.attendees && meet.attendees.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-bold text-slate-600">উপস্থিত সদস্যবৃন্দ:</span>
                            {meet.attendees
                              .filter((a) => a.isPresent)
                              .map((a, idx) => (
                                <span
                                  key={idx}
                                  className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-medium"
                                >
                                  {a.name} {a.designation ? `(${a.designation})` : ''}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SUBTAB 2: MEETING NOTICES */}
          {meetingSubTab === 'notices' && (
            <div className="space-y-4">
              {filteredNotices.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                    <Send className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">কোনো মিটিং আহবান নোটিশ জারি করা হয়নি</p>
                    <p className="text-xs text-slate-400">
                      সভার তারিখ, সময় ও আলোচ্যসূচি উল্লেখ করে নতুন নোটিশ প্রস্তুত করতে নিচের বাটনে ক্লিক করুন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewNoticeModalOpen(true)}
                    className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন মিটিং আহবান</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNotices.map((notice) => (
                    <div
                      key={notice.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              {notice.memoNo}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm pt-1">
                              মিটিং আহবান — সভা নং #{toBanglaNumber(notice.serialNumber || '১')}
                            </h4>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            জারি: {formatDate(notice.noticeDate, language)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                          <div>
                            <span className="text-slate-500 text-[10px] block">সভার তারিখ:</span>
                            <span className="font-bold text-slate-800">
                              {formatDate(notice.meetingDate, language)} ({notice.dayName})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">সময়:</span>
                            <span className="font-bold text-slate-800">{notice.time}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500 text-[10px] block">স্থান:</span>
                            <span className="font-bold text-slate-800">{notice.venue}</span>
                          </div>
                        </div>

                        {notice.agendas && notice.agendas.length > 0 && (
                          <div className="space-y-1 text-xs">
                            <span className="font-bold text-slate-700 block text-[11px]">আলোচ্যসূচি:</span>
                            <ul className="space-y-1 text-slate-600 pl-2">
                              {notice.agendas.map((ag, idx) => (
                                <li key={idx} className="flex items-start space-x-1.5">
                                  <span className="font-bold text-slate-800">{toBanglaNumber(idx + 1)}.</span>
                                  <span>{ag}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {notice.remarks && (
                          <div className="p-2 bg-amber-50 rounded-lg text-amber-900 text-[11px] italic">
                            বি.দ্র: {notice.remarks}
                          </div>
                        )}
                      </div>

                      {/* Notice Card Footer Actions */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenNoticePrint(notice)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>নোটিশ প্রিন্ট</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConvertNoticeToMinutes(notice)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                            title="এই নোটিশ থেকে কার্যবিবরণী তৈরি করুন"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>কার্যবিবরণী তৈরি</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeletingNoticeItem(notice)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: MEETING RESOLUTIONS (DECISION REGISTER) */}
          {meetingSubTab === 'resolutions' && (
            <MeetingResolutionsListView
              resolutions={resolutions || []}
              meetings={meetings}
              members={members}
              mosque={mosque}
              canManage={currentUser?.role !== 'VIEWER'}
              onOpenCreateModal={handleOpenCreateResolution}
              onOpenEditModal={handleOpenEditResolution}
              onOpenPrintModal={handleOpenResolutionPrint}
              onOpenBookPrintModal={handleOpenBookPrint}
              onDuplicate={handleDuplicateResolution}
              onDelete={handleDeleteResolutionDirect}
              onUpdateStatus={handleUpdateResolutionStatus}
              onUpdateProgress={handleUpdateResolutionProgress}
            />
          )}
        </div>
      )}

      {/* 4. ACTION PLANS & IMPLEMENTATION TRACKER */}
      {activeTab === 'action-plans' && (
        <CommitteeActionPlanView
          terms={terms}
          members={members}
          meetings={meetings}
          resolutions={resolutions || []}
          mosque={mosque}
          language={language}
          currentUser={currentUser}
          onNavigateToResolutionTab={() => setActiveTab('meetings')}
          onOpenCreateResolution={(meetingId, decId) => {
            setActiveTab('meetings');
            if (handleOpenCreateResolution) {
              handleOpenCreateResolution(meetingId, decId);
            }
          }}
        />
      )}

      {/* 5. PERFORMANCE & ACTIVITIES EVALUATION */}
      {activeTab === 'performance' && (
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

      {/* 6. COMMITTEE FINANCIAL HISTORY & HANDOVER */}
      {activeTab === 'financial-history' && (
        <CommitteeFinancialHistoryView
          terms={terms}
          language={language}
          mosque={mosque}
          currentUser={currentUser}
          onRefreshTerms={onRefreshMosqueSettings}
        />
      )}

      {/* 7. SUB-COMMITTEES MANAGEMENT */}
      {activeTab === 'sub-committees' && (
        <SubCommitteesView
          subCommittees={subCommittees}
          terms={terms}
          members={members}
          meetings={meetings}
          resolutions={resolutions || []}
          mosque={mosque}
          language={language}
          currentUser={currentUser}
          onAdd={onAddSubCommittee}
          onUpdate={onUpdateSubCommittee}
          onArchive={onArchiveSubCommittee}
          onAddSubCommittee={onAddSubCommittee}
          onUpdateSubCommittee={onUpdateSubCommittee}
          onArchiveSubCommittee={onArchiveSubCommittee}
        />
      )}
      </div>

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

      {/* EDIT TERM MODAL */}
      {isEditTermModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">কমিটির মেয়াদ এডিট করুন</h3>
              <button
                onClick={() => setIsEditTermModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {editTermError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editTermError}</span>
              </div>
            )}
            <form onSubmit={handleEditTermSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কমিটির শিরোনাম *</label>
                <input
                  id="input-edit-term-title"
                  type="text"
                  value={editTermTitle}
                  onChange={(e) => setEditTermTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">শুরুর তারিখ *</label>
                  <input
                    id="input-edit-term-start"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সমাপ্তির তারিখ *</label>
                  <input
                    id="input-edit-term-end"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
                <select
                  id="select-edit-term-status"
                  value={editTermStatus}
                  onChange={(e) => setEditTermStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="EXPIRED">মেয়াদোত্তীর্ণ (Expired)</option>
                  <option value="UPCOMING">আসন্ন (Upcoming)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ ও ওয়াকফ রেফারেন্স</label>
                <textarea
                  id="input-edit-term-desc"
                  rows={2}
                  value={editTermDesc}
                  onChange={(e) => setEditTermDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTermModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-update-term"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE TERM CONFIRMATION MODAL */}
      {deletingTermItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900">কমিটি মেয়াদ মুছে ফেলতে চান?</h3>
              <p className="text-xs text-slate-600">
                "{deletingTermItem.title}" স্থায়ীভাবে মুছে ফেলা হবে। নিশ্চিত করতে নিচের বাটনে ক্লিক করুন।
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTermItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTerm}
                disabled={isDeletingTerm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingTerm ? 'মুছে ফেলা হচ্ছে...' : 'নিশ্চিত ডিলিট'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMITTEE MEMBER PRINT MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto report-modal-print-wrapper">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto report-modal-print-card">
            {/* Modal Control Bar - hidden on print */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden print-controls-bar">
              <span className="text-xs font-bold font-siliguri flex items-center space-x-1.5">
                <Printer className="w-4 h-4 text-blue-400" />
                <span>কমিটি সদস্য তালিকা প্রিন্ট প্রিভিউ</span>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট বা PDF সংরক্ষণ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-6 sm:p-8 space-y-6 font-baloo print:p-6 print:text-black">
              {/* Mosque Header */}
              <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold font-siliguri text-slate-900">
                  {mosque?.name || 'মসজিদ পরিচালনা পরিষদ'}
                </h1>
                {mosque?.address && (
                  <p className="text-xs text-slate-700 font-medium">{mosque.address}</p>
                )}
                {mosque?.phone && (
                  <p className="text-xs text-slate-600">মোবাইল: {mosque.phone}</p>
                )}
                <div className="pt-2">
                  <span className="inline-block px-4 py-1 bg-slate-900 text-white text-xs font-bold font-siliguri rounded-md tracking-wider">
                    পরিচালনা পরিষদের আনুষ্ঠানিক সদস্য তালিকা
                  </span>
                </div>
              </div>

              {/* Term & Report Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 gap-2 print:bg-slate-50 print:border-slate-300">
                <div>
                  <span className="font-bold text-slate-900">কমিটির মেয়াদকাল:</span>{' '}
                  <span className="font-semibold text-blue-800">{activeTerm?.title || 'সাধারণ কমিটি'}</span>
                  {activeTerm?.startDate && activeTerm?.endDate && (
                    <span className="text-slate-600 ml-2">
                      ({formatDate(activeTerm.startDate, language)} হতে {formatDate(activeTerm.endDate, language)})
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-900">মোট সদস্য:</span>{' '}
                  <span className="font-mono font-bold text-blue-800">{members.length} জন</span>
                </div>
              </div>

              {/* Members Table */}
              <div className="border border-slate-900 overflow-hidden">
                <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
                    <tr>
                      <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '6%' }}>ক্রমিক</th>
                      <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '22%' }}>সদস্যের নাম</th>
                      <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '18%' }}>পদবি</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '15%' }}>মোবাইল</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '15%' }}>NID নম্বর</th>
                      <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '16%' }}>পেশা ও ঠিকানা</th>
                      <th className="py-2 px-2 text-center" style={{ width: '8%' }}>অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {members.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                        <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{m.fullNameBn}</td>
                        <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-blue-900">{m.designationBn}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-800 font-mono">{m.phone}</td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-700 font-mono">{m.nid || '-'}</td>
                        <td className="py-2 px-2 text-left border-r border-slate-200 text-slate-700">
                          <div>{m.profession}</div>
                          {m.address && <div className="text-[10px] text-slate-500 truncate">{m.address}</div>}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-800 font-medium">
                          {m.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs font-siliguri text-slate-800 print:pt-20">
                <div className="space-y-2">
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold">সভাপতি</div>
                  <div className="text-slate-500 text-[11px]">{mosque?.name || 'মসজিদ কমিটি'}</div>
                </div>
                <div className="space-y-2">
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold">সাধারণ সম্পাদক</div>
                  <div className="text-slate-500 text-[11px]">{mosque?.name || 'মসজিদ কমিটি'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 4. MEETING MINUTES ENTRY & REVISION MODAL */}
      {isMinutesModalOpen && (
        <MeetingMinutesModal
          isOpen={isMinutesModalOpen}
          onClose={() => {
            setIsMinutesModalOpen(false);
            setEditingMeetingForModal(null);
            setIsRevisionModeForModal(false);
          }}
          onSave={handleSaveMeetingMinutes}
          initialMeeting={editingMeetingForModal}
          isRevisionMode={isRevisionModeForModal}
          members={members}
          notices={notices || []}
          mosque={mosque}
          language={language}
          onOpenCreateResolution={handleOpenCreateResolution}
        />
      )}

      {/* 5. MEETING DOCUMENT PRINT & PREVIEW (A4 Letterhead) */}
      {isMeetingPrintOpen && activeMeetingForPrint && (
        <MeetingDocumentPrint
          isOpen={isMeetingPrintOpen}
          meeting={activeMeetingForPrint}
          mosque={mosque}
          members={members}
          language={language}
          onClose={() => {
            setIsMeetingPrintOpen(false);
            setActiveMeetingForPrint(null);
          }}
        />
      )}

      {/* 6. MEETING NOTICE CREATION MODAL */}
      {isNewNoticeModalOpen && (
        <MeetingNoticeModal
          isOpen={isNewNoticeModalOpen}
          onClose={() => setIsNewNoticeModalOpen(false)}
          onSave={handleSaveNotice}
          onSaveNotice={handleSaveNotice}
          mosque={mosque}
          members={members}
          existingNoticesCount={(notices || []).length}
          language={language}
        />
      )}

      {/* 7. MEETING NOTICE PRINT PREVIEW MODAL */}
      {isNoticePrintModalOpen && activeNoticeForPrint && (
        <MeetingNoticePrintModal
          isOpen={isNoticePrintModalOpen}
          onClose={() => {
            setIsNoticePrintModalOpen(false);
            setActiveNoticeForPrint(null);
          }}
          notice={activeNoticeForPrint}
          mosque={mosque}
          members={members}
          language={language}
        />
      )}

      {/* 8. MEETING RESOLUTION ENTRY / EDIT / REVISION MODAL */}
      {isResolutionModalOpen && (
        <MeetingResolutionModal
          isOpen={isResolutionModalOpen}
          onClose={() => {
            setIsResolutionModalOpen(false);
            setEditingResolutionForModal(null);
            setSelectedResMeetingId(undefined);
            setSelectedResDecisionId(undefined);
            setIsResolutionRevisionMode(false);
          }}
          onSave={handleSaveResolution}
          initialResolution={editingResolutionForModal}
          initialMeetingId={selectedResMeetingId}
          initialDecisionId={selectedResDecisionId}
          isRevisionMode={isResolutionRevisionMode}
          meetings={meetings}
          members={members}
          mosque={mosque}
          language={language}
        />
      )}

      {/* 9. MEETING RESOLUTION PRINT PREVIEW MODAL */}
      {isResolutionPrintOpen && activeResolutionForPrint && (
        <MeetingResolutionPrint
          isOpen={isResolutionPrintOpen}
          onClose={() => {
            setIsResolutionPrintOpen(false);
            setActiveResolutionForPrint(null);
          }}
          resolution={activeResolutionForPrint}
          meeting={meetings.find((m) => m.id === activeResolutionForPrint.meetingId)}
          members={members}
          mosque={mosque}
          language={language}
        />
      )}

      {/* 9.1 RESOLUTION BOOK (BATCH PRINT) MODAL */}
      {isResolutionBookPrintOpen && activeResolutionsForBookPrint && (
        <MeetingResolutionPrint
          isOpen={isResolutionBookPrintOpen}
          onClose={() => {
            setIsResolutionBookPrintOpen(false);
            setActiveResolutionsForBookPrint(null);
          }}
          resolutionsList={activeResolutionsForBookPrint}
          bookTitle={resolutionBookTitle}
          members={members}
          mosque={mosque}
          language={language}
        />
      )}

      {/* 10. DELETE RESOLUTION CONFIRMATION MODAL */}
      {deletingResolutionItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">রেজোলিউশন মুছে ফেলবেন?</h3>
                <p className="text-xs text-slate-500 font-mono">নথি নং: {deletingResolutionItem.resolutionNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              আপনি কি নিশ্চিত যে <strong>{deletingResolutionItem.title}</strong> রেজোলিউশনটি স্থায়ীভাবে মুছে ফেলতে চান?
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingResolution}
                onClick={() => setDeletingResolutionItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isDeletingResolution}
                onClick={handleConfirmDeleteResolution}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isDeletingResolution ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DELETE MEETING CONFIRMATION MODAL */}
      {deletingMeetingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">মিটিং কার্যবিবরণী মুছে ফেলবেন?</h3>
                <p className="text-xs text-slate-500">এই পদক্ষেপটি পরিবর্তনযোগ্য নয়</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              আপনি কি নিশ্চিত যে সভা নং #{toBanglaNumber(deletingMeetingItem.meetingNumber || '১')}-এর কার্যবিবরণী ও রেজোলিউশন রেকর্ড স্থায়ীভাবে মুছে ফেলতে চান?
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingMeeting}
                onClick={() => setDeletingMeetingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isDeletingMeeting}
                onClick={handleConfirmDeleteMeeting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isDeletingMeeting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. DELETE NOTICE CONFIRMATION MODAL */}
      {deletingNoticeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">মিটিং নোটিশ মুছে ফেলবেন?</h3>
                <p className="text-xs text-slate-500">স্মারক নং: {deletingNoticeItem.memoNo}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              আপনি কি নিশ্চিত যে স্মারক নং <strong>{deletingNoticeItem.memoNo}</strong>-এর নোটিশটি মুছে ফেলতে চান?
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingNotice}
                onClick={() => setDeletingNoticeItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={isDeletingNotice}
                onClick={handleConfirmDeleteNotice}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isDeletingNotice ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MEETING AUDIT LOG & REVISION TIMELINE MODAL */}
      {auditMeetingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">কার্যবিবরণী অডিট লগ ও ইতিহাস</h3>
                  <p className="text-[11px] text-slate-500">
                    নথি নং: {auditMeetingItem.documentNumber || `মিটিং #${auditMeetingItem.meetingNumber}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditMeetingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="font-bold text-slate-800">নথির প্রাথমিক তৈরি</div>
                <div className="text-slate-600 text-[11px]">
                  তারিখ: {formatDate(auditMeetingItem.date, language)} | স্ট্যাটাস: {auditMeetingItem.status || 'FINAL'}
                </div>
                {auditMeetingItem.memoNumber && (
                  <div className="text-slate-500 text-[10px]">স্মারক নং: {auditMeetingItem.memoNumber}</div>
                )}
              </div>

              {auditMeetingItem.revisionNumber && auditMeetingItem.revisionNumber > 0 && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs space-y-1">
                  <div className="font-bold text-purple-900 flex items-center space-x-1">
                    <History className="w-3.5 h-3.5" />
                    <span>সংশোধিত সংস্করণ (Revision v{auditMeetingItem.revisionNumber})</span>
                  </div>
                  <div className="text-purple-800 text-[11px]">
                    <strong>কারণ:</strong> {auditMeetingItem.revisionReason || 'কারণ উল্লেখ করা হয়নি'}
                  </div>
                  {auditMeetingItem.originalDocumentNumber && (
                    <div className="text-purple-700 text-[10px]">
                      পূর্ববর্তী মূল নথি নং: <code>{auditMeetingItem.originalDocumentNumber}</code>
                    </div>
                  )}
                </div>
              )}

              {auditMeetingItem.auditLogs && auditMeetingItem.auditLogs.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <div className="font-bold text-xs text-slate-700">লগ ইভেন্টস:</div>
                  {auditMeetingItem.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{log.action}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-600">{log.details}</div>
                      <div className="text-[10px] text-slate-400">ব্যবহারকারী: {log.userName}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  অন্য কোনো সিস্টেম অডিট লগ নেই
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAuditMeetingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  FileText,
  Shield,
  Printer,
  Download,
  Image as ImageIcon,
  Edit2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Award,
  Star,
  Clock,
  CheckCircle2,
  Building2,
  CalendarCheck,
  History,
  Activity,
  Heart,
  CreditCard,
  Layers,
  AlertCircle
} from 'lucide-react';
import {
  CommitteeMember,
  CommitteeTerm,
  CommitteeMeeting,
  Mosque,
  CommitteeMemberActivity,
  CommitteeMemberTask,
  CommitteeManualEvaluation
} from '../types';
import { printElement } from '../lib/printUtils';
import { calculateAgeFromBirthDate, MEMBER_STATUS_LIST, POSITION_MAP_BN } from './MemberFormModal';
import { toBanglaNumber } from './CommitteeView';
import { DocumentSection } from './DocumentSection';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: CommitteeMember | null;
  terms: CommitteeTerm[];
  allMembers: CommitteeMember[];
  meetings?: CommitteeMeeting[];
  mosque?: Mosque | null;
  onEdit: (member: CommitteeMember) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  isOpen,
  onClose,
  member,
  terms,
  allMembers,
  meetings = [],
  mosque,
  onEdit,
}) => {
  const [isNidVisible, setIsNidVisible] = useState(false);
  const [isCopiedPhone, setIsCopiedPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACTIVITIES' | 'HISTORY' | 'DOCUMENTS'>('OVERVIEW');

  // Member-specific data loaded from backend
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [memberActivities, setMemberActivities] = useState<CommitteeMemberActivity[]>([]);
  const [memberTasks, setMemberTasks] = useState<CommitteeMemberTask[]>([]);
  const [memberEvaluations, setMemberEvaluations] = useState<CommitteeManualEvaluation[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Hidden print element ref
  const printContentRef = useRef<HTMLDivElement>(null);

  // Find the term of the current member
  const currentTerm = useMemo(() => {
    if (!member) return null;
    return terms.find((t) => t.id === member.termId) || null;
  }, [member, terms]);

  // Find historical committee terms where this member served
  const memberHistory = useMemo(() => {
    if (!member) return [];
    // Match by exact member id, or phone number, or exact name
    const matchingMembers = allMembers.filter(
      (m) =>
        m.id === member.id ||
        (m.phone && m.phone === member.phone) ||
        (m.nid && member.nid && m.nid === member.nid)
    );

    const historyItems = matchingMembers.map((m) => {
      const term = terms.find((t) => t.id === m.termId);
      return {
        memberRecord: m,
        term,
        isCurrent: m.id === member.id || m.termId === member.termId,
      };
    });

    // Sort by term start year or date if possible
    return historyItems;
  }, [member, allMembers, terms]);

  // Calculate meeting attendance for this member
  const attendanceStats = useMemo(() => {
    if (!member || !meetings.length) return { total: 0, attended: 0, percentage: 0 };

    // Find meetings in the member's term
    const termMeetings = meetings.filter((m) => !member.termId || m.termId === member.termId);
    let attended = 0;
    termMeetings.forEach((m) => {
      const isPresent = m.attendees?.some(
        (att) =>
          (att.memberId === member.id || (att.phone && att.phone === member.phone) || att.name === member.name) &&
          att.status === 'ATTENDED'
      );
      if (isPresent) attended++;
    });

    const total = termMeetings.length;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { total, attended, percentage };
  }, [member, meetings]);

  // Load real member activities, tasks, and evaluations
  useEffect(() => {
    if (!isOpen || !member) return;

    let isMounted = true;
    const loadMemberData = async () => {
      setLoadingExtras(true);
      try {
        const [actRes, taskRes, evalRes] = await Promise.all([
          fetch(`/api/v1/committee/activities?memberId=${member.id}`),
          fetch(`/api/v1/committee/tasks?memberId=${member.id}`),
          fetch(`/api/v1/committee/evaluations?memberId=${member.id}`),
        ]);

        if (isMounted) {
          if (actRes.ok) {
            const data = await actRes.json();
            if (data.success && Array.isArray(data.data)) {
              setMemberActivities(data.data);
            }
          }
          if (taskRes.ok) {
            const data = await taskRes.json();
            if (data.success && Array.isArray(data.data)) {
              setMemberTasks(data.data);
            }
          }
          if (evalRes.ok) {
            const data = await evalRes.json();
            if (data.success && Array.isArray(data.data)) {
              setMemberEvaluations(data.data);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load member profile details:', e);
      } finally {
        if (isMounted) setLoadingExtras(false);
      }
    };

    loadMemberData();
    setIsNidVisible(false);
    setActiveTab('OVERVIEW');

    return () => {
      isMounted = false;
    };
  }, [isOpen, member]);

  // Age calculation
  const calculatedAge = useMemo(() => {
    return calculateAgeFromBirthDate(member?.dateOfBirth);
  }, [member?.dateOfBirth]);

  // Mask NID helper
  const maskedNid = useMemo(() => {
    if (!member?.nid) return null;
    const clean = member.nid.trim();
    if (isNidVisible) return clean;
    if (clean.length <= 4) return '••••' + clean;
    const visiblePart = clean.slice(-4);
    const hiddenCount = Math.min(clean.length - 4, 10);
    return '•'.repeat(hiddenCount) + visiblePart;
  }, [member?.nid, isNidVisible]);

  // Status info
  const statusInfo = useMemo(() => {
    if (!member?.status) return MEMBER_STATUS_LIST[0];
    return MEMBER_STATUS_LIST.find((s) => s.value === member.status) || MEMBER_STATUS_LIST[0];
  }, [member?.status]);

  // Copy phone handler
  const handleCopyPhone = () => {
    if (!member?.phone) return;
    navigator.clipboard.writeText(member.phone);
    setIsCopiedPhone(true);
    setTimeout(() => setIsCopiedPhone(false), 2000);
  };

  // Dedicated A4 Print
  const handlePrintProfile = () => {
    if (!member) return;
    printElement('member-profile-printable-document', {
      title: `সদস্য_প্রোফাইল_${member.name.replace(/\s+/g, '_')}`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '10mm 12mm',
    });
  };

  // Dedicated PDF Download (Trigger isolated A4 Print-to-PDF)
  const handleDownloadPdf = () => {
    if (!member) return;
    printElement('member-profile-printable-document', {
      title: `সদস্য_প্রোফাইল_${member.name.replace(/\s+/g, '_')}`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '10mm 12mm',
    });
  };

  // Export as Image (PNG Card)
  const handleExportCardImage = async () => {
    if (!member) return;
    setIsGeneratingImage(true);

    try {
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1050;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Card Container
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.roundRect(30, 30, width - 60, height - 60, 24);
      ctx.fill();
      ctx.stroke();

      // Top decorative banner
      const grad = ctx.createLinearGradient(30, 30, width - 30, 180);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(30, 30, width - 60, 160, [24, 24, 0, 0]);
      ctx.fill();

      // Mosque & Card Titles
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mosque?.name || 'মামুন জামে মসজিদ ওয়াক্ফ এস্টেট', width / 2, 85);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '16px sans-serif';
      ctx.fillText('সদস্য পরিচিতি ও প্রোফাইল কার্ড / MEMBER PROFILE CARD', width / 2, 120);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px sans-serif';
      ctx.fillText(currentTerm?.title || 'কার্যনির্বাহী পরিচালনা পরিষদ', width / 2, 145);

      // Photo or Avatar
      const avatarY = 190;
      const avatarRadius = 60;

      // Draw Avatar Circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (member.photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = member.photoUrl!;
          });
          ctx.drawImage(img, width / 2 - avatarRadius, avatarY, avatarRadius * 2, avatarRadius * 2);
        } catch {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(width / 2 - avatarRadius, avatarY, avatarRadius * 2, avatarRadius * 2);
          ctx.fillStyle = '#475569';
          ctx.font = 'bold 44px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(member.name.slice(0, 1), width / 2, avatarY + 75);
        }
      } else {
        ctx.fillStyle = '#eff6ff';
        ctx.fillRect(width / 2 - avatarRadius, avatarY, avatarRadius * 2, avatarRadius * 2);
        ctx.fillStyle = '#1d4ed8';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(member.name.slice(0, 1), width / 2, avatarY + 75);
      }
      ctx.restore();

      // Avatar border
      ctx.beginPath();
      ctx.arc(width / 2, avatarY + avatarRadius, avatarRadius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Member Name & Designation
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(member.name, width / 2, avatarY + avatarRadius * 2 + 45);

      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 20px sans-serif';
      const posText = member.positionCustomBn || POSITION_MAP_BN[member.position] || 'কার্যনির্বাহী সদস্য';
      ctx.fillText(posText, width / 2, avatarY + avatarRadius * 2 + 75);

      // Status Pill
      ctx.fillStyle = member.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 70, avatarY + avatarRadius * 2 + 92, 140, 30, 15);
      ctx.fill();
      ctx.fillStyle = member.status === 'ACTIVE' ? '#15803d' : '#475569';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(statusInfo.labelBn, width / 2, avatarY + avatarRadius * 2 + 112);

      // Details Table / Box
      const boxY = 480;
      const boxX = 60;
      const boxW = width - 120;

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, 440, 16);
      ctx.fill();
      ctx.stroke();

      // Information Lines
      const infoList = [
        { label: 'পিতার নাম:', val: member.fatherName || 'প্রযোজ্য নয়' },
        { label: 'মোবাইল নম্বর:', val: member.phone || 'তথ্য নেই' },
        { label: 'বিকল্প নম্বর:', val: member.altPhone || 'প্রযোজ্য নয়' },
        { label: 'রক্তের গ্রুপ:', val: member.bloodGroup || 'অজানা' },
        { label: 'জন্ম তারিখ ও বয়স:', val: member.dateOfBirth ? `${member.dateOfBirth} (${calculatedAge ? calculatedAge.textBn : ''})` : 'তথ্য নেই' },
        { label: 'পেশা:', val: member.occupation || 'প্রযোজ্য নয়' },
        { label: 'শিক্ষাগত যোগ্যতা:', val: member.education || 'প্রযোজ্য নয়' },
        { label: 'বর্তমান ঠিকানা:', val: member.address || 'তথ্য নেই' },
        { label: 'যোগদানের তারিখ:', val: member.joinDate || 'তথ্য নেই' },
      ];

      ctx.textAlign = 'left';
      let curY = boxY + 38;
      infoList.forEach((item, idx) => {
        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(item.label, boxX + 24, curY);

        // Value
        ctx.fillStyle = '#0f172a';
        ctx.font = '15px sans-serif';
        // Handle long address
        let displayVal = item.val;
        if (displayVal.length > 40) {
          displayVal = displayVal.substring(0, 38) + '...';
        }
        ctx.fillText(displayVal, boxX + 180, curY);

        // Divider
        if (idx < infoList.length - 1) {
          ctx.strokeStyle = '#f1f5f9';
          ctx.beginPath();
          ctx.moveTo(boxX + 20, curY + 12);
          ctx.lineTo(boxX + boxW - 20, curY + 12);
          ctx.stroke();
        }
        curY += 44;
      });

      // Bottom Footer Bar
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(
        `সদস্য আইডি: ${member.id} • MasjidLedger ডিজিটাল সদস্য রেজিস্ট্রি • যাচাইকৃত কপি`,
        width / 2,
        height - 55
      );

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `সদস্য_পরিচিতি_${member.name.replace(/\s+/g, '_')}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export card image:', err);
      alert('কার্ড ইমেজ ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-baloo">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Sticky Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold truncate">{member.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.color}`}>
                  {statusInfo.labelBn}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                {member.positionCustomBn || POSITION_MAP_BN[member.position]} •{' '}
                {currentTerm?.title || 'কমিটি পরিচালনা পরিষদ'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              id="btn-profile-edit-member"
              type="button"
              onClick={() => onEdit(member)}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              title="তথ্য সম্পাদনা করুন"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">সম্পাদনা</span>
            </button>

            <button
              id="btn-profile-download-pdf"
              type="button"
              onClick={handleDownloadPdf}
              className="px-2.5 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              title="A4 সাইজ PDF ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF ডাউনলোড</span>
            </button>

            <button
              id="btn-profile-print-a4"
              type="button"
              onClick={handlePrintProfile}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="A4 সাইজে প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">A4 প্রিন্ট</span>
            </button>

            <button
              id="btn-profile-download-image"
              type="button"
              onClick={handleExportCardImage}
              disabled={isGeneratingImage}
              className="px-2.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="পরিচয় কার্ড ইমেজ হিসেবে ডাউনলোড"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isGeneratingImage ? 'প্রস্তুত হচ্ছে...' : 'কার্ড ইমেজ'}
              </span>
            </button>

            <button
              id="btn-close-member-profile-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Hero Profile Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar / Photo */}
            <div className="relative shrink-0">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-3 border-white shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex flex-col items-center justify-center font-bold text-3xl sm:text-4xl shadow-md border-3 border-white">
                  {member.name.slice(0, 1)}
                </div>
              )}
              {member.bloodGroup && (
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm border-2 border-white flex items-center space-x-1">
                  <Heart className="w-3 h-3 fill-white" />
                  <span>{member.bloodGroup}</span>
                </div>
              )}
            </div>

            {/* Info Column */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{member.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>
                  {statusInfo.labelBn}
                </span>
              </div>

              <p className="text-sm sm:text-base font-bold text-blue-700">
                {member.positionCustomBn || POSITION_MAP_BN[member.position]}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-1.5 gap-x-4 text-xs text-slate-600">
                <span className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentTerm?.title || 'কমিটি মেয়াদকাল'}</span>
                </span>

                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>যোগদান: {toBanglaNumber(member.joinDate || '---')}</span>
                </span>

                {calculatedAge && (
                  <span className="px-2 py-0.5 bg-blue-100/70 text-blue-800 rounded font-semibold text-[11px]">
                    বয়স: {calculatedAge.textBn}
                  </span>
                )}
              </div>

              {/* Quick Contacts */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <a href={`tel:${member.phone}`} className="hover:underline font-mono">
                    {member.phone}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title="মোবাইল নম্বর কপি করুন"
                  >
                    {isCopiedPhone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {member.email && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <a href={`mailto:${member.email}`} className="hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Metrics Badge */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs min-w-[160px] text-center shrink-0 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                মিটিং উপস্থিতি হার
              </div>
              <div className="text-2xl font-black text-blue-600">
                {toBanglaNumber(attendanceStats.percentage)}%
              </div>
              <div className="text-[11px] text-slate-500">
                {toBanglaNumber(attendanceStats.attended)} / {toBanglaNumber(attendanceStats.total)} টি সভায় উপস্থিত
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 space-x-4 text-xs sm:text-sm font-bold">
            <button
              id="tab-profile-overview"
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-2.5 flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>১. মূল পরিচিতি ও তথ্য</span>
            </button>

            <button
              id="tab-profile-activities"
              type="button"
              onClick={() => setActiveTab('ACTIVITIES')}
              className={`pb-2.5 flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'ACTIVITIES'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>২. কার্যক্রম ও মূল্যায়ন</span>
              {memberActivities.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                  {toBanglaNumber(memberActivities.length)}
                </span>
              )}
            </button>

            <button
              id="tab-profile-history"
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`pb-2.5 flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>৩. কমিটি দায়িত্বের ইতিহাস</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px]">
                {toBanglaNumber(memberHistory.length)}
              </span>
            </button>

            <button
              id="tab-profile-documents"
              type="button"
              onClick={() => setActiveTab('DOCUMENTS')}
              className={`pb-2.5 flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeTab === 'DOCUMENTS'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>৪. সংযুক্ত ফাইল ও ডকুমেন্টস</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. ব্যক্তিগত ও পরিচিতি তথ্য */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <User className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">ব্যক্তিগত ও পারিবারিক তথ্য</h3>
                  </div>

                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">পুরো নাম</span>
                      <span className="font-bold text-slate-800">{member.name}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">পিতার নাম</span>
                      <span className="font-semibold text-slate-800">
                        {member.fatherName || 'প্রযোজ্য নয় / তথ্য নেই'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">মাতার নাম</span>
                      <span className="font-semibold text-slate-800">
                        {member.motherName || 'প্রযোজ্য নয় / তথ্য নেই'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">জন্ম তারিখ ও বয়স</span>
                      <span className="font-semibold text-slate-800">
                        {member.dateOfBirth ? (
                          <>
                            {toBanglaNumber(member.dateOfBirth)}{' '}
                            {calculatedAge && `(${calculatedAge.textBn})`}
                          </>
                        ) : (
                          'তথ্য নেই'
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">রক্তের গ্রুপ</span>
                      <span className="font-bold text-slate-800">
                        {member.bloodGroup ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold">
                            {member.bloodGroup}
                          </span>
                        ) : (
                          'অজানা'
                        )}
                      </span>
                    </div>

                    {/* NID with Mask Toggle */}
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>জাতীয় পরিচয়পত্র (NID)</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-slate-800">
                          {maskedNid || 'তথ্য নেই'}
                        </span>
                        {member.nid && (
                          <button
                            type="button"
                            onClick={() => setIsNidVisible(!isNidVisible)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title={isNidVisible ? 'NID লুকান' : 'NID দেখুন'}
                          >
                            {isNidVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. যোগাযোগ ও পেশাগত তথ্য */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">যোগাযোগ ও পেশাগত তথ্য</h3>
                  </div>

                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">প্রধান মোবাইল নম্বর</span>
                      <span className="font-mono font-bold text-slate-900">{member.phone}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">বিকল্প মোবাইল নম্বর</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {member.altPhone || 'প্রযোজ্য নয়'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">ই-মেইল</span>
                      <span className="font-semibold text-slate-800">
                        {member.email || 'প্রযোজ্য নয়'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">পেশা</span>
                      <span className="font-semibold text-slate-800">
                        {member.occupation || 'প্রযোজ্য নয়'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">শিক্ষাগত যোগ্যতা</span>
                      <span className="font-semibold text-slate-800">
                        {member.education || 'প্রযোজ্য নয়'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">বর্তমান ও স্থায়ী ঠিকানা</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                        {member.address || 'তথ্য নেই'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. বর্তমান কমিটি দায়িত্ব ও ভূমিকা */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">বর্তমান কমিটির দায়িত্ব ও স্ট্যাটাস</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-xs mb-1">কমিটির মেয়াদকাল</span>
                    <span className="font-bold text-slate-900 block">
                      {currentTerm?.title || 'কমিটি মেয়াদ'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {currentTerm?.startYear} - {currentTerm?.endYear}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-xs mb-1">নির্ধারিত পদবি</span>
                    <span className="font-bold text-blue-700 block">
                      {member.positionCustomBn || POSITION_MAP_BN[member.position]}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      স্ট্যান্ডার্ড কোড: {member.position}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-xs mb-1">কার্যনির্বাহী স্ট্যাটাস</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mt-0.5 ${statusInfo.color}`}>
                      {statusInfo.labelBn}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      অন্তর্ভুক্তি: {toBanglaNumber(member.joinDate || '---')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. মন্তব্য ও বিশেষ নোট */}
              {member.notes && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 text-xs sm:text-sm">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold mb-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>বিশেষ মন্তব্য / নোট:</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed pl-6">{member.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVITIES & EVALUATION */}
          {activeTab === 'ACTIVITIES' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {loadingExtras ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  কার্যক্রম ও মূল্যায়ন তথ্য লোড হচ্ছে...
                </div>
              ) : (
                <>
                  {/* Performance Summary Banner */}
                  {memberEvaluations.length > 0 ? (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            সর্বশেষ মূল্যায়নে অর্জিত স্কোর
                          </h4>
                          <p className="text-xs text-slate-600">
                            মূল্যায়নকারী: {memberEvaluations[0].evaluatorName} (
                            {toBanglaNumber(memberEvaluations[0].evaluatorRole)})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <span className="text-[11px] text-slate-500 block font-semibold">
                            মোট স্কোর
                          </span>
                          <span className="text-xl font-black text-blue-700">
                            {toBanglaNumber(memberEvaluations[0].finalScore)}/১০০
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[11px] text-slate-500 block font-semibold">
                            স্টার রেটিং
                          </span>
                          <span className="text-xl font-black text-amber-500 flex items-center justify-center">
                            ★ {toBanglaNumber(memberEvaluations[0].finalStars)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>এই সদস্যের জন্য কোনো সরাসরি মূল্যায়ন স্কোর এখনও সংরক্ষিত হয়নি।</span>
                    </div>
                  )}

                  {/* Member Activities List */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          সম্পাদিত উন্নয়নমূলক ও সামাজিক কার্যক্রম
                        </h3>
                      </div>
                      <span className="text-xs text-slate-500">
                        মোট: {toBanglaNumber(memberActivities.length)} টি
                      </span>
                    </div>

                    {memberActivities.length > 0 ? (
                      <div className="space-y-2.5">
                        {memberActivities.map((act) => (
                          <div
                            key={act.id}
                            className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {act.title}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                                  {act.activityTypeBn}
                                </span>
                              </div>
                              {act.description && (
                                <p className="text-xs text-slate-600">{act.description}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 text-xs text-slate-500 font-semibold">
                              {toBanglaNumber(act.date)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400 text-xs sm:text-sm">
                        কোনো কার্যক্রমের রেকর্ড লিপিবদ্ধ পাওয়া যায়নি।
                      </div>
                    )}
                  </div>

                  {/* Assigned Tasks */}
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-900">অর্পিত দায়িত্ব ও টাস্কসমূহ</h3>
                      </div>
                      <span className="text-xs text-slate-500">
                        মোট: {toBanglaNumber(memberTasks.length)} টি
                      </span>
                    </div>

                    {memberTasks.length > 0 ? (
                      <div className="space-y-2.5">
                        {memberTasks.map((tsk) => (
                          <div
                            key={tsk.id}
                            className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                                {tsk.title}
                              </span>
                              {tsk.description && (
                                <p className="text-xs text-slate-600">{tsk.description}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  tsk.status === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {tsk.status === 'COMPLETED' ? 'সম্পন্ন' : 'চলমান'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400 text-xs sm:text-sm">
                        কোনো টাস্ক বা দায়িত্বের রেকর্ড পাওয়া যায়নি।
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: COMMITTEE HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                  <History className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    মসজিদ কমিটিতে সদস্যের দায়িত্বের ইতিহাস
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  এই সদস্য পূর্ববর্তী এবং বর্তমান যেসকল মেয়াদে দায়িত্ব পালন করেছেন বা করছেন তার তালিকা
                </p>

                <div className="space-y-3 pt-2">
                  {memberHistory.map((item, idx) => (
                    <div
                      key={item.memberRecord.id + idx}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isCurrent
                          ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {item.term?.title || 'কমিটি মেয়াদ'}
                          </span>
                          {item.isCurrent && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
                              বর্তমান মেয়াদ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600">
                          পদবি:{' '}
                          <span className="font-bold text-slate-800">
                            {item.memberRecord.positionCustomBn ||
                              POSITION_MAP_BN[item.memberRecord.position]}
                          </span>{' '}
                          • স্ট্যাটাস:{' '}
                          <span className="font-semibold">{item.memberRecord.status}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 text-right shrink-0">
                        <div>
                          মেয়াদকাল: {item.term?.startYear || '---'} - {item.term?.endYear || '---'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          যোগদান: {toBanglaNumber(item.memberRecord.joinDate || '---')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <DocumentSection
                entityType="MEMBER"
                entityId={member.id}
                entityTitle={`${member.name} (${member.positionCustomBn || POSITION_MAP_BN[member.position] || 'কমিটি সদস্য'})`}
              />
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>আইডি: {member.id}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HIDDEN PRINTABLE A4 DOCUMENT (RENDERED ISOLATED FOR PRINT) */}
      {/* ========================================================= */}
      <div className="hidden">
        <div
          id="member-profile-printable-document"
          ref={printContentRef}
          className="p-8 bg-white text-slate-900 max-w-[210mm] mx-auto font-sans text-xs leading-relaxed"
          style={{ width: '210mm', minHeight: '297mm' }}
        >
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center relative">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wide">
              {mosque?.name || 'মামুন জামে মসজিদ ওয়াক্ফ এস্টেট'}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {mosque?.address || 'ঠিকানা: মসজিদ এলাকা, বাংলাদেশ'} • ফোন: {mosque?.contactPhone || '০১৭০০০০০০০০'}
            </p>
            <div className="mt-3 inline-block px-5 py-1 bg-slate-900 text-white text-xs font-bold rounded-full tracking-wide">
              সদস্যের পূর্ণাঙ্গ প্রোফাইল
            </div>
            <div className="absolute right-0 top-0 text-right text-[10px] text-slate-500">
              প্রিন্ট তারিখ: {new Date().toLocaleDateString('bn-BD')}
            </div>
          </div>

          {/* Member Main Header Box with Photo */}
          <div className="flex items-start justify-between border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50">
            <div className="space-y-1.5 flex-1 pr-4">
              <h2 className="text-xl font-bold text-slate-900">{member.name}</h2>
              <p className="text-sm font-bold text-blue-800">
                পদবি: {member.positionCustomBn || POSITION_MAP_BN[member.position]}
              </p>
              <p className="text-xs text-slate-700">
                কমিটি: {currentTerm?.title || 'কার্যনির্বাহী পরিচালনা পরিষদ'} (
                {currentTerm?.startYear} - {currentTerm?.endYear})
              </p>
              <p className="text-xs text-slate-700">
                সদস্য স্ট্যাটাস:{' '}
                <span className="font-bold">
                  {statusInfo.labelBn.replace(/[🟢⚪🟡⚫]/g, '').trim()}
                </span>{' '}
                • যোগদানের তারিখ: {toBanglaNumber(member.joinDate || '---')}
              </p>
            </div>

            {/* Passport Photo Box */}
            <div className="w-24 h-28 border border-slate-400 rounded bg-white flex flex-col items-center justify-center shrink-0 overflow-hidden">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-2 text-slate-400 text-[10px]">
                  পাসপোর্ট সাইজ ছবি
                </div>
              )}
            </div>
          </div>

          {/* Section 1: ব্যক্তিগত তথ্য */}
          <div className="mb-5">
            <div className="bg-slate-200 px-3 py-1 font-bold text-slate-900 text-xs mb-2 rounded-xs">
              ১. ব্যক্তিগত ও পারিবারিক পরিচিতি
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">পিতার নাম</td>
                  <td className="border border-slate-300 p-2 w-1/4">{member.fatherName || 'প্রযোজ্য নয়'}</td>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">মাতার নাম</td>
                  <td className="border border-slate-300 p-2 w-1/4">{member.motherName || 'প্রযোজ্য নয়'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">জন্ম তারিখ ও বয়স</td>
                  <td className="border border-slate-300 p-2">
                    {member.dateOfBirth
                      ? `${toBanglaNumber(member.dateOfBirth)} ${calculatedAge ? `(${calculatedAge.textBn})` : ''}`
                      : 'তথ্য নেই'}
                  </td>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">রক্তের গ্রুপ</td>
                  <td className="border border-slate-300 p-2 font-bold text-red-700">
                    {member.bloodGroup || 'অজানা'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">জাতীয় পরিচয়পত্র (NID)</td>
                  <td className="border border-slate-300 p-2 font-mono" colSpan={3}>
                    {member.nid || 'তথ্য নেই'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: যোগাযোগ ও পেশাগত তথ্য */}
          <div className="mb-5">
            <div className="bg-slate-200 px-3 py-1 font-bold text-slate-900 text-xs mb-2 rounded-xs">
              ২. যোগাযোগ ও পেশাগত তথ্য
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">প্রধান মোবাইল নম্বর</td>
                  <td className="border border-slate-300 p-2 font-mono font-bold w-1/4">{member.phone}</td>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/4">বিকল্প নম্বর</td>
                  <td className="border border-slate-300 p-2 font-mono w-1/4">{member.altPhone || 'প্রযোজ্য নয়'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">পেশা</td>
                  <td className="border border-slate-300 p-2">{member.occupation || 'প্রযোজ্য নয়'}</td>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">শিক্ষাগত যোগ্যতা</td>
                  <td className="border border-slate-300 p-2">{member.education || 'প্রযোজ্য নয়'}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">ই-মেইল</td>
                  <td className="border border-slate-300 p-2" colSpan={3}>
                    {member.email || 'প্রযোজ্য নয়'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">বর্তমান ও স্থায়ী ঠিকানা</td>
                  <td className="border border-slate-300 p-2" colSpan={3}>
                    {member.address || 'তথ্য নেই'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: কমিটি দায়িত্ব ও ইতিহাস */}
          <div className="mb-5">
            <div className="bg-slate-200 px-3 py-1 font-bold text-slate-900 text-xs mb-2 rounded-xs">
              ৩. কমিটি মেয়াদ ও দায়িত্বের বিবরণ
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 p-2 text-left">কমিটি মেয়াদকাল</th>
                  <th className="border border-slate-300 p-2 text-left">দায়িত্বপ্রাপ্ত পদবি</th>
                  <th className="border border-slate-300 p-2 text-center">মেয়াদ</th>
                  <th className="border border-slate-300 p-2 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {memberHistory.map((h, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 p-2 font-semibold">
                      {h.term?.title || 'পরিচালনা পরিষদ'}
                    </td>
                    <td className="border border-slate-300 p-2">
                      {h.memberRecord.positionCustomBn || POSITION_MAP_BN[h.memberRecord.position]}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      {h.term?.startYear} - {h.term?.endYear}
                    </td>
                    <td className="border border-slate-300 p-2 text-center">
                      {h.isCurrent ? 'বর্তমান সক্রিয়' : 'সাবেক'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: কার্যক্রম, দায়িত্ব ও উপস্থিতি বিবরণী */}
          <div className="mb-5">
            <div className="bg-slate-200 px-3 py-1 font-bold text-slate-900 text-xs mb-2 rounded-xs">
              ৪. সদস্যের কার্যক্রম, অর্পিত দায়িত্ব ও উপস্থিতি
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs mb-2">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/3">মিটিং উপস্থিতি</td>
                  <td className="border border-slate-300 p-2" colSpan={2}>
                    {toBanglaNumber(attendanceStats.attended)} টি সভায় উপস্থিত (মোট {toBanglaNumber(attendanceStats.total)} টি সভার মধ্যে) — উপস্থিতির হার: <strong>{toBanglaNumber(attendanceStats.percentage)}%</strong>
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">সম্পাদিত কার্যক্রম</td>
                  <td className="border border-slate-300 p-2" colSpan={2}>
                    {memberActivities.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5">
                        {memberActivities.slice(0, 3).map((act, i) => (
                          <li key={i}>
                            <strong>{act.title}</strong> ({act.activityTypeBn}) - {toBanglaNumber(act.date)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      'কোনো সংরক্ষিত কার্যক্রমের রেকর্ড পাওয়া যায়নি'
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50">অর্পিত দায়িত্ব ও টাস্ক</td>
                  <td className="border border-slate-300 p-2" colSpan={2}>
                    {memberTasks.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5">
                        {memberTasks.slice(0, 3).map((tsk, i) => (
                          <li key={i}>
                            {tsk.title} — [{tsk.status === 'COMPLETED' ? 'সম্পন্ন' : 'চলমান'}]
                          </li>
                        ))}
                      </ul>
                    ) : (
                      'কোনো নির্ধারিত টাস্কের রেকর্ড পাওয়া যায়নি'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 5: সদস্যের মূল্যায়ন রেকর্ড */}
          <div className="mb-5">
            <div className="bg-slate-200 px-3 py-1 font-bold text-slate-900 text-xs mb-2 rounded-xs">
              ৫. সদস্য মূল্যায়ন রেকর্ড
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-2 font-bold bg-slate-50 w-1/3">সর্বশেষ মূল্যায়ন স্কোর</td>
                  <td className="border border-slate-300 p-2">
                    {memberEvaluations.length > 0 ? (
                      <>
                        অর্জিত স্কোর: <strong>{toBanglaNumber(memberEvaluations[0].finalScore)}/১০০</strong> (রেটিং: ★ {toBanglaNumber(memberEvaluations[0].finalStars)})
                      </>
                    ) : (
                      'সদস্যের কোনো মূল্যায়ন তথ্য এখনও সংরক্ষিত হয়নি'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 6: মন্তব্য / বিশেষ নোট */}
          <div className="mb-6">
            <div className="bg-slate-200 px-3 py-1 font-bold text-slate-900 text-xs mb-2 rounded-xs">
              ৬. মন্তব্য / বিশেষ নোট
            </div>
            <div className="border border-slate-300 p-3 rounded text-xs bg-slate-50/40">
              <p className="text-slate-800">
                {member.notes || 'কোনো বিশেষ মন্তব্য বা বিবরণ নেই।'}
              </p>
            </div>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-12 mt-12 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="space-y-1">
              <div className="border-t border-slate-900 w-36 mx-auto pt-1 font-bold">
                সদস্যের স্বাক্ষর
              </div>
              <p className="text-[10px] text-slate-500">তারিখ: ____________</p>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-900 w-36 mx-auto pt-1 font-bold">
                সাধারণ সম্পাদকের স্বাক্ষর
              </div>
              <p className="text-[10px] text-slate-500">তারিখ: ____________</p>
            </div>

            <div className="space-y-1">
              <div className="border-t border-slate-900 w-36 mx-auto pt-1 font-bold">
                সভাপতি / মোতাওয়াল্লী
              </div>
              <p className="text-[10px] text-slate-500">সিলমোহর ও তারিখ</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2">
            MasjidLedger ডিজিটাল মসজিদ ব্যবস্থাপনা সিস্টেম কর্তৃক স্বয়ংক্রিয় প্রস্তুতকৃত বিবরণী
          </div>
        </div>
      </div>
    </div>
  );
};

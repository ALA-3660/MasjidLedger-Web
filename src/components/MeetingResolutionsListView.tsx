import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Printer,
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Clock,
  UserCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  History,
  LayoutGrid,
  ListFilter,
  BookOpen,
  Sliders,
  Check,
  X,
  FileText,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import {
  MeetingResolution,
  CommitteeMeeting,
  CommitteeMember,
  ResolutionStatus,
  ResolutionImplementationStatus,
  Mosque
} from '../types';

interface MeetingResolutionsListViewProps {
  resolutions: MeetingResolution[];
  meetings: CommitteeMeeting[];
  members: CommitteeMember[];
  mosque?: Mosque | null;
  canManage: boolean;
  onOpenCreateModal: (meetingId?: string, decisionId?: string) => void;
  onOpenEditModal: (res: MeetingResolution) => void;
  onOpenPrintModal: (res: MeetingResolution) => void;
  onOpenBookPrintModal: (resolutions: MeetingResolution[], title: string) => void;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string, force?: boolean) => Promise<void>;
  onUpdateStatus: (id: string, newStatus: ResolutionStatus) => Promise<void>;
  onUpdateProgress?: (id: string, progress: { implementationStatus: ResolutionImplementationStatus; progressPercentage: number; completionDate?: string; remarks?: string }) => Promise<void>;
}

export const MeetingResolutionsListView: React.FC<MeetingResolutionsListViewProps> = ({
  resolutions,
  meetings,
  members,
  mosque,
  canManage,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenPrintModal,
  onOpenBookPrintModal,
  onDuplicate,
  onDelete,
  onUpdateStatus,
  onUpdateProgress
}) => {
  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [meetingFilter, setMeetingFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Quick Implementation Update Modal State
  const [activeProgressRes, setActiveProgressRes] = useState<MeetingResolution | null>(null);
  const [progressStatus, setProgressStatus] = useState<ResolutionImplementationStatus>('PENDING');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressCompletionDate, setProgressCompletionDate] = useState<string>('');
  const [progressRemarks, setProgressRemarks] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);

  // Stats calculation
  const stats = useMemo(() => {
    const total = resolutions.length;
    const approved = resolutions.filter(r => r.status === 'APPROVED').length;
    const implemented = resolutions.filter(r => r.status === 'IMPLEMENTED' || r.implementationStatus === 'COMPLETED').length;
    const draft = resolutions.filter(r => r.status === 'DRAFT').length;
    const combined = resolutions.filter(r => r.resolutionType === 'COMBINED' || (r.items && r.items.length > 0)).length;
    return { total, approved, implemented, draft, combined };
  }, [resolutions]);

  // Filtered resolutions
  const filteredResolutions = useMemo(() => {
    return resolutions.filter(r => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          r.resolutionNumber.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.resolutionText.toLowerCase().includes(q) ||
          (r.assignedMemberName && r.assignedMemberName.toLowerCase().includes(q)) ||
          (r.meetingDocumentNumber && r.meetingDocumentNumber.toLowerCase().includes(q)) ||
          (r.items && r.items.some(it => it.subject.toLowerCase().includes(q) || it.resolutionText.toLowerCase().includes(q)));
        if (!matchesQuery) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'ALL') {
        const isComb = r.resolutionType === 'COMBINED' || (r.items && r.items.length > 0);
        if (typeFilter === 'COMBINED' && !isComb) return false;
        if (typeFilter === 'INDIVIDUAL' && isComb) return false;
      }

      // Meeting filter
      if (meetingFilter !== 'ALL' && r.meetingId !== meetingFilter) {
        return false;
      }

      // Member filter
      if (memberFilter !== 'ALL' && r.assignedMemberId !== memberFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [resolutions, searchQuery, statusFilter, typeFilter, meetingFilter, memberFilter, priorityFilter]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'APPROVED':
        return { label: 'অনুমোদিত ও কার্যকর', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'IMPLEMENTED':
        return { label: 'সম্পূর্ণ বাস্তবায়িত', bg: 'bg-blue-50 text-blue-800 border-blue-300' };
      case 'REJECTED':
        return { label: 'প্রত্যাখ্যাত', bg: 'bg-rose-50 text-rose-800 border-rose-300' };
      case 'CANCELLED':
        return { label: 'বাতিলকৃত', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'DRAFT':
      default:
        return { label: 'খসড়া প্রস্তাব', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
    }
  };

  const getImplementationStatusBadge = (st?: string) => {
    switch (st) {
      case 'COMPLETED':
        return { label: 'সম্পন্ন', bg: 'bg-emerald-100 text-emerald-800' };
      case 'IN_PROGRESS':
        return { label: 'চলমান', bg: 'bg-blue-100 text-blue-800' };
      case 'DELAYED':
        return { label: 'বিলম্বিত', bg: 'bg-amber-100 text-amber-800' };
      case 'CANCELLED':
        return { label: 'বাতিল', bg: 'bg-slate-100 text-slate-700' };
      case 'PENDING':
      default:
        return { label: 'অপেক্ষমান', bg: 'bg-slate-100 text-slate-700' };
    }
  };

  const openProgressModal = (res: MeetingResolution) => {
    setActiveProgressRes(res);
    setProgressStatus(res.implementationStatus || 'PENDING');
    setProgressPercent(res.progressPercentage || 0);
    setProgressCompletionDate(res.completionDate || '');
    setProgressRemarks(res.remarks || '');
  };

  const handleSaveProgress = async () => {
    if (!activeProgressRes || !onUpdateProgress) return;
    try {
      setIsUpdatingProgress(true);
      await onUpdateProgress(activeProgressRes.id, {
        implementationStatus: progressStatus,
        progressPercentage: progressPercent,
        completionDate: progressCompletionDate || undefined,
        remarks: progressRemarks || undefined
      });
      setActiveProgressRes(null);
    } catch (e: any) {
      console.error('Error saving progress:', e);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleDeleteResolution = async (res: MeetingResolution) => {
    if (res.status === 'APPROVED' || res.status === 'IMPLEMENTED') {
      const confirmForce = window.confirm(
        `সতর্কবার্তা: রেজোলিউশন "${res.resolutionNumber}" ইতিমধ্যে ${res.status === 'APPROVED' ? 'অনুমোদিত' : 'বাস্তবায়িত'}।\n\nঅডিট ট্রেইল অনুযায়ী এটি সরাসরি না মুছে বাতিল (Cancel) বা রিভিশন (Revise) করা সুপারিশকৃত।\n\nআপনি কি নিশ্চিতভাবে জোরপূর্বক এটি মুছে ফেলতে চান?`
      );
      if (confirmForce) {
        await onDelete(res.id, true);
      }
    } else {
      if (window.confirm(`আপনি কি নিশ্চিতভাবে খসড়া রেজোলিউশন "${res.resolutionNumber}" মুছে ফেলতে চান?`)) {
        await onDelete(res.id);
      }
    }
  };

  return (
    <div className="space-y-6 font-siliguri">
      
      {/* 1. Top Action & Stat Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-600/10 text-emerald-800 rounded-xl border border-emerald-200">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>মিটিং রেজোলিউশন রেজিস্টার (Meeting Resolutions)</span>
            </h2>
            <p className="text-xs text-slate-500 font-baloo mt-0.5">
              মিটিং কার্যবিবরণীর গৃহীত সিদ্ধান্তসমূহের আনুষ্ঠানিক রেজোলিউশন, অনুমোদন ও বাস্তবায়ন তদারকি
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Resolution Book Action */}
          <button
            id="btn-open-resolution-book"
            onClick={() => {
              const bookTitle = meetingFilter !== 'ALL'
                ? `মিটিং রেজোলিউশন সংকলন (${meetings.find(m => m.id === meetingFilter)?.meetingNumber || 'সভা'})`
                : 'মসজিদ পরিচালনা কমিটি রেজোলিউশন বই (Resolution Book)';
              onOpenBookPrintModal(filteredResolutions, bookTitle);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>রেজোলিউশন বই ({filteredResolutions.length})</span>
          </button>

          {canManage && (
            <button
              id="btn-create-new-resolution"
              onClick={() => onOpenCreateModal()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন রেজোলিউশন প্রণয়ন</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-baloo">
            <span>মোট রেজোলিউশন</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{stats.total}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-baloo">
            <span>অনুমোদিত ও কার্যকর</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-900 mt-1 font-mono">{stats.approved}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs bg-gradient-to-br from-blue-50/50 to-white">
          <div className="flex items-center justify-between text-blue-700 text-xs font-baloo">
            <span>বাস্তবায়িত সিদ্ধান্ত</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1 font-mono">{stats.implemented}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-xs bg-gradient-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between text-amber-700 text-xs font-baloo">
            <span>খসড়া প্রস্তাবনা</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-1 font-mono">{stats.draft}</p>
        </div>
      </div>

      {/* 3. Search and Multi-Criteria Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        
        {/* Status Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
            {[
              { id: 'ALL', label: 'সকল রেজোলিউশন' },
              { id: 'APPROVED', label: 'অনুমোদিত' },
              { id: 'IMPLEMENTED', label: 'বাস্তবায়িত' },
              { id: 'DRAFT', label: 'খসড়া' },
              { id: 'CANCELLED', label: 'বাতিল' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('CARDS')}
              title="কার্ড ভিউ"
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'CARDS' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="তালিকা ভিউ"
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-baloo">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="রেজোলিউশন নং, বিষয়, সিদ্ধান্ত বা দায়িত্বপ্রাপ্ত..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-siliguri"
            />
          </div>

          {/* Meeting Filter */}
          <div>
            <select
              value={meetingFilter}
              onChange={(e) => setMeetingFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">সকল মিটিং কার্যবিবরণী</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  {m.meetingNumber || 'মিটিং'} ({m.date}) - {m.memoNumber || m.documentNumber || m.id}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">সকল ধরন (একক ও সম্মিলিত)</option>
              <option value="INDIVIDUAL">স্বতন্ত্র রেজোলিউশন (Individual)</option>
              <option value="COMBINED">সম্মিলিত রেজোলিউশন (Combined)</option>
            </select>
          </div>

          {/* Assigned Member Filter */}
          <div>
            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">সকল দায়িত্বপ্রাপ্ত সদস্য</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.positionCustomBn || m.position || 'সদস্য'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Resolutions List / Content */}
      {filteredResolutions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-700">কোনো রেজোলিউশন পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 font-baloo max-w-md mx-auto">
            নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো রেজোলিউশন রেকর্ড খুঁজে পাওয়া যায়নি।
          </p>
          {canManage && (
            <button
              onClick={() => onOpenCreateModal()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন রেজোলিউশন প্রণয়ন করুন</span>
            </button>
          )}
        </div>
      ) : viewMode === 'CARDS' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResolutions.map((res) => {
            const statusB = getStatusBadge(res.status);
            const impBadge = getImplementationStatusBadge(res.implementationStatus);
            const isCombined = res.resolutionType === 'COMBINED' || (res.items && res.items.length > 0);

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative group"
              >
                {/* Card Top Row */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-slate-900 text-emerald-300 font-mono text-xs font-bold rounded-lg border border-slate-800">
                        {res.resolutionNumber}
                      </span>
                      <span className={`px-2 py-0.5 border rounded-md text-[11px] font-bold ${statusB.bg}`}>
                        {statusB.label}
                      </span>
                      {isCombined ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[10px] font-bold flex items-center space-x-1 font-baloo">
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>সম্মিলিত ({res.items?.length || 0}টি সিদ্ধান্ত)</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium font-baloo">
                          একক রেজোলিউশন
                        </span>
                      )}
                      {res.isRevised && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold flex items-center space-x-0.5 font-baloo">
                          <History className="w-2.5 h-2.5" />
                          <span>v{res.revisionNumber || 2}</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500 font-baloo flex items-center space-x-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{res.date}</span>
                    </span>
                  </div>

                  {/* Subject Title */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 hover:text-emerald-800 transition-colors">
                    {res.subject}
                  </h3>

                  {/* Resolution Snippet */}
                  <p className="text-xs text-slate-600 font-tiro line-clamp-3 mt-2 pl-2.5 border-l-2 border-emerald-600/50 bg-slate-50/70 py-1.5 rounded-r-md">
                    {res.resolutionText}
                  </p>
                </div>

                {/* Card Meta & Implementation Progress */}
                <div className="pt-3 border-t border-slate-100 text-xs font-baloo space-y-2.5">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="flex items-center space-x-1 truncate max-w-[200px]">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>সভা: {res.meetingMemoNumber ? `স্মারক: ${res.meetingMemoNumber}` : (res.meetingDocumentNumber || res.meetingNumber || 'সাধারণ সভা')}</span>
                    </span>
                    {res.deadline && (
                      <span className="text-emerald-800 font-semibold shrink-0">
                        মেয়াদ: {res.deadline}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar & Assigned Member */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-slate-700 text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <strong className="truncate max-w-[150px]">{res.assignedMemberName || 'নির্বাহী কমিটি'}</strong>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impBadge.bg}`}>
                          {impBadge.label}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {res.progressPercentage || 0}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          (res.progressPercentage || 0) >= 100
                            ? 'bg-emerald-600'
                            : (res.progressPercentage || 0) > 40
                            ? 'bg-blue-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${res.progressPercentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onOpenPrintModal(res)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>প্রিন্ট পত্র</span>
                    </button>

                    {canManage && onUpdateProgress && (
                      <button
                        onClick={() => openProgressModal(res)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                        title="বাস্তবায়ন অগ্রগতি আপডেট"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>অগ্রগতি</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {canManage && (
                      <>
                        <button
                          onClick={() => onDuplicate(res.id)}
                          title="অনুলিপি (Duplicate)"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenEditModal(res)}
                          title="সম্পাদনা / রিভিশন"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteResolution(res)}
                          title="মুছে ফেলুন"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-siliguri">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">রেজোলিউশন নং</th>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">বিষয় ও ধরন</th>
                  <th className="py-3 px-4">সংশ্লিষ্ট সভা</th>
                  <th className="py-3 px-4">দায়িত্বপ্রাপ্ত</th>
                  <th className="py-3 px-4 text-center">অগ্রগতি</th>
                  <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResolutions.map((res) => {
                  const statusB = getStatusBadge(res.status);
                  const isCombined = res.resolutionType === 'COMBINED' || (res.items && res.items.length > 0);

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {res.resolutionNumber}
                      </td>
                      <td className="py-3 px-4 font-baloo text-slate-600 whitespace-nowrap">
                        {res.date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs">
                        <div className="line-clamp-1">{res.subject}</div>
                        {isCombined && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-baloo">
                            সম্মিলিত রেজোলিউশন ({res.items?.length || 0}টি ধারা)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-baloo text-slate-600 whitespace-nowrap">
                        {res.meetingMemoNumber ? `স্মারক: ${res.meetingMemoNumber}` : (res.meetingDocumentNumber || res.meetingNumber || '-')}
                      </td>
                      <td className="py-3 px-4 font-baloo text-slate-700 whitespace-nowrap">
                        {res.assignedMemberName || 'নির্বাহী কমিটি'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                        {res.progressPercentage || 0}%
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 border rounded-md text-[11px] font-bold ${statusB.bg}`}>
                          {statusB.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onOpenPrintModal(res)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="প্রিন্ট প্রিভিউ"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openProgressModal(res)}
                                className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="বাস্তবায়ন অগ্রগতি"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenEditModal(res)}
                                className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="সম্পাদনা"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteResolution(res)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Implementation Progress Modal */}
      {activeProgressRes && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 font-siliguri">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    বাস্তবায়ন অগ্রগতি আপডেট
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {activeProgressRes.resolutionNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveProgressRes(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-baloo text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                  বাস্তবায়ন স্ট্যাটাস
                </label>
                <select
                  value={progressStatus}
                  onChange={(e) => setProgressStatus(e.target.value as ResolutionImplementationStatus)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="PENDING">অপেক্ষমান (Pending)</option>
                  <option value="IN_PROGRESS">চলমান (In Progress)</option>
                  <option value="COMPLETED">সম্পন্ন (Completed)</option>
                  <option value="DELAYED">বিলম্বিত (Delayed)</option>
                  <option value="CANCELLED">বাতিল (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri flex justify-between">
                  <span>অগ্রগতি শতকরা (%): {progressPercent}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                  বাস্তবায়ন সম্পন্ন হওয়ার তারিখ (যদি সম্পন্ন হয়ে থাকে)
                </label>
                <input
                  type="date"
                  value={progressCompletionDate}
                  onChange={(e) => setProgressCompletionDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                  অগ্রগতি সম্পর্কিত মন্তব্য বা নোট
                </label>
                <textarea
                  rows={2}
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  placeholder="বাস্তবায়নের বর্তমান অবস্থা..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveProgressRes(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isUpdatingProgress}
                onClick={handleSaveProgress}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isUpdatingProgress ? 'সংরক্ষণ হচ্ছে...' : 'অগ্রগতি সংরক্ষণ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

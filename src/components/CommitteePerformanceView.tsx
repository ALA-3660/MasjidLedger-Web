import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Star,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  Send,
  AlertCircle,
  TrendingUp,
  User,
  Sliders,
  FileText,
  Eye,
  Check,
  X,
  Sparkles,
  Layers,
  BarChart3,
  HelpCircle,
  Briefcase,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import {
  CommitteeTerm,
  CommitteeMember,
  CommitteeMeeting,
  Mosque,
  CommitteeMemberActivity,
  CommitteeMemberTask,
  CommitteeManualEvaluation,
  MemberEvaluationScoreResult,
  CommitteeActivityType,
  EvaluationQualityRating,
  CommitteeTaskStatus
} from '../types';
import { Language, translations, formatDate } from '../lib/i18n';
import { toBanglaNumber } from './CommitteeView';
import { PerformanceReportPrint } from './PerformanceReportPrint';

interface CommitteePerformanceViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  mosque?: Mosque | null;
  language: Language;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  onRefreshMosqueSettings?: () => Promise<void>;
}

const ACTIVITY_TYPE_LABELS: Record<CommitteeActivityType, string> = {
  MOSQUE_DEVELOPMENT: 'মসজিদ উন্নয়ন কাজ',
  DONATION_COLLECTION: 'দান সংগ্রহ ও ফান্ডরাইজিং',
  ACCOUNTS_AUDIT_SUPPORT: 'হিসাব/অডিট সহযোগিতা',
  SOCIAL_ACTIVITY: 'সামাজিক কার্যক্রম',
  CEMETERY_MANAGEMENT: 'কবরস্থান ব্যবস্থাপনা',
  WAQF_MANAGEMENT: 'ওয়াকফ সম্পত্তি ব্যবস্থাপনা',
  ADMINISTRATIVE_WORK: 'কমিটির প্রশাসনিক কাজ',
  MEETING_ORGANIZATION: 'সভা আয়োজন ও ব্যবস্থাপনা',
  EMERGENCY_DUTY: 'জরুরি দায়িত্ব পালন',
  AGENDA_DISCUSSION: 'এজেন্ডা ভিত্তিক গঠনমূলক আলোচনা',
  PROPOSAL_SUBMITTED: 'উন্নয়ন প্রস্তাব উপস্থাপন',
  DECISION_CONTRIBUTION: 'সিদ্ধান্ত বাস্তবায়নে বিশেষ ভূমিকা',
  MEETING_PRESENTATION: 'মিটিং উপস্থাপনা ও পরিচালনা',
  OTHER: 'অন্যান্য কার্যক্রম',
};

const QUALITY_RATING_LABELS: Record<EvaluationQualityRating, { label: string; color: string; score: number }> = {
  EXCELLENT: { label: 'চমৎকার ও অনুকরণীয় (Excellent - ৯৫%)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', score: 95 },
  GOOD: { label: 'প্রশংসনীয় ও ভালো (Good - ৮৫%)', color: 'bg-blue-100 text-blue-800 border-blue-300', score: 85 },
  SATISFACTORY: { label: 'সন্তোষজনক (Satisfactory - ৭৫%)', color: 'bg-amber-100 text-amber-800 border-amber-300', score: 75 },
  NEEDS_IMPROVEMENT: { label: 'উন্নতি কাম্য (Needs Improvement - ৬০%)', color: 'bg-slate-100 text-slate-700 border-slate-300', score: 60 },
};

const TASK_STATUS_LABELS: Record<CommitteeTaskStatus, { label: string; color: string }> = {
  PENDING: { label: 'অপেক্ষমান (Pending)', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  IN_PROGRESS: { label: 'চলমান (In Progress)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  COMPLETED: { label: 'সম্পন্ন (Completed)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  OVERDUE: { label: 'মেয়াদোত্তীর্ণ (Overdue)', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  CANCELLED: { label: 'বাতিল (Cancelled)', color: 'bg-slate-200 text-slate-500 border-slate-300' },
};

export const CommitteePerformanceView: React.FC<CommitteePerformanceViewProps> = ({
  terms,
  members,
  meetings,
  mosque,
  language,
  currentUserId,
  currentUserName,
  currentUserRole,
  onRefreshMosqueSettings,
}) => {
  // Main Sub-tabs
  const [subTab, setSubTab] = useState<'matrix' | 'activities' | 'tasks' | 'settings'>('matrix');

  // Term selection
  const activeTermDefault = terms.find((t) => t.status === 'ACTIVE') || terms[0];
  const [selectedTermId, setSelectedTermId] = useState<string>(activeTermDefault?.id || '');

  // Date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Performance data state from API
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluationSummary, setEvaluationSummary] = useState<any>(null);
  const [activitiesList, setActivitiesList] = useState<CommitteeMemberActivity[]>([]);
  const [tasksList, setTasksList] = useState<CommitteeMemberTask[]>([]);
  const [manualEvaluationsList, setManualEvaluationsList] = useState<CommitteeManualEvaluation[]>([]);

  // Search & Filters for Matrix
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<'ALL' | '5' | '4' | '3' | 'BELOW_3'>('ALL');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');

  // View state: 'table' vs 'grid'
  const [displayMode, setDisplayMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CommitteeMemberActivity | null>(null);
  const [preselectedMemberForActivity, setPreselectedMemberForActivity] = useState<string>('');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CommitteeMemberTask | null>(null);
  const [preselectedMemberForTask, setPreselectedMemberForTask] = useState<string>('');

  const [isManualEvalModalOpen, setIsManualEvalModalOpen] = useState(false);
  const [evaluatingMemberScore, setEvaluatingMemberScore] = useState<MemberEvaluationScoreResult | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeProfileMember, setActiveProfileMember] = useState<MemberEvaluationScoreResult | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSingleMember, setPrintSingleMember] = useState<MemberEvaluationScoreResult | null>(null);
  const [printReportType, setPrintReportType] = useState<'ALL_MEMBERS' | 'SINGLE_MEMBER'>('ALL_MEMBERS');

  // Weights Customization State
  const [weightsForm, setWeightsForm] = useState({
    attendance: mosque?.committeeEvaluationSettings?.weights?.attendance ?? 30,
    responsibility: mosque?.committeeEvaluationSettings?.weights?.responsibility ?? 30,
    participation: mosque?.committeeEvaluationSettings?.weights?.participation ?? 15,
    activity: mosque?.committeeEvaluationSettings?.weights?.activity ?? 15,
    quality: mosque?.committeeEvaluationSettings?.weights?.quality ?? 10,
  });
  const [thresholdsForm, setThresholdsForm] = useState({
    fiveStar: mosque?.committeeEvaluationSettings?.starThresholds?.fiveStar ?? 90,
    fourStar: mosque?.committeeEvaluationSettings?.starThresholds?.fourStar ?? 80,
    threeStar: mosque?.committeeEvaluationSettings?.starThresholds?.threeStar ?? 70,
    twoStar: mosque?.committeeEvaluationSettings?.starThresholds?.twoStar ?? 60,
    oneStar: mosque?.committeeEvaluationSettings?.starThresholds?.oneStar ?? 0,
  });
  const [excludeExcusedLeave, setExcludeExcusedLeave] = useState<boolean>(
    mosque?.committeeEvaluationSettings?.excludeExcusedLeaveFromAttendance ?? false
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState('');
  const [settingsSaveErr, setSettingsSaveErr] = useState('');

  // Fetch summary and records
  const loadPerformanceData = async () => {
    if (!selectedTermId) return;
    setLoading(true);
    try {
      let url = `/api/v1/committee/evaluation-summary?termId=${selectedTermId}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEvaluationSummary(data.data);
      }

      // Load activities
      let actUrl = `/api/v1/committee/activities?termId=${selectedTermId}`;
      if (fromDate) actUrl += `&fromDate=${fromDate}`;
      if (toDate) actUrl += `&toDate=${toDate}`;
      const actRes = await fetch(actUrl);
      const actData = await actRes.json();
      if (actData.success) {
        setActivitiesList(actData.data);
      }

      // Load tasks
      const taskRes = await fetch(`/api/v1/committee/tasks?termId=${selectedTermId}`);
      const taskData = await taskRes.json();
      if (taskData.success) {
        setTasksList(taskData.data);
      }

      // Load manual evals
      const evalRes = await fetch(`/api/v1/committee/evaluations?termId=${selectedTermId}`);
      const evalData = await evalRes.json();
      if (evalData.success) {
        setManualEvaluationsList(evalData.data);
      }
    } catch (e) {
      console.error('Failed to load committee evaluation data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTermId) {
      loadPerformanceData();
    }
  }, [selectedTermId, fromDate, toDate]);

  useEffect(() => {
    if (mosque?.committeeEvaluationSettings) {
      if (mosque.committeeEvaluationSettings.weights) {
        setWeightsForm(mosque.committeeEvaluationSettings.weights);
      }
      if (mosque.committeeEvaluationSettings.starThresholds) {
        setThresholdsForm(mosque.committeeEvaluationSettings.starThresholds);
      }
      if (mosque.committeeEvaluationSettings.excludeExcusedLeaveFromAttendance !== undefined) {
        setExcludeExcusedLeave(mosque.committeeEvaluationSettings.excludeExcusedLeaveFromAttendance);
      }
    }
  }, [mosque]);

  // Filtered members list for matrix
  const memberScoresList: MemberEvaluationScoreResult[] = evaluationSummary?.members || [];

  const filteredMembers = useMemo(() => {
    return memberScoresList.filter((m) => {
      // Star filter
      if (starFilter === '5' && m.starRating !== 5) return false;
      if (starFilter === '4' && m.starRating !== 4) return false;
      if (starFilter === '3' && m.starRating !== 3) return false;
      if (starFilter === 'BELOW_3' && m.starRating >= 3) return false;

      // Position filter
      if (positionFilter !== 'ALL' && m.position !== positionFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.memberName.toLowerCase().includes(q) ||
          (m.positionCustomBn || m.position || '').toLowerCase().includes(q) ||
          m.phone.includes(q)
        );
      }
      return true;
    });
  }, [memberScoresList, starFilter, positionFilter, searchQuery]);

  // Distinct Positions for filter
  const distinctPositions = useMemo(() => {
    const set = new Set<string>();
    memberScoresList.forEach((m) => {
      if (m.position) set.add(m.position);
    });
    return Array.from(set);
  }, [memberScoresList]);

  // Selected Term object
  const currentTerm = terms.find((t) => t.id === selectedTermId) || activeTermDefault;

  // Weight sum check
  const weightSum =
    Number(weightsForm.attendance || 0) +
    Number(weightsForm.responsibility || 0) +
    Number(weightsForm.participation || 0) +
    Number(weightsForm.activity || 0) +
    Number(weightsForm.quality || 0);

  // Save Settings handler
  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mosque?.id) return;
    setSettingsSaveErr('');
    setSettingsSaveMsg('');

    if (weightSum !== 100) {
      setSettingsSaveErr(`সকল ওয়েটেজের যোগফল ১০০% হতে হবে। বর্তমান যোগফল: ${weightSum}%`);
      return;
    }

    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/v1/mosques/${mosque.id}/committee-evaluation-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: weightsForm,
          starThresholds: thresholdsForm,
          excludeExcusedLeaveFromAttendance: excludeExcusedLeave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSaveMsg('মূল্যায়ন পলিসি সেটিংস সফলভাবে সংরক্ষিত হয়েছে।');
        if (onRefreshMosqueSettings) await onRefreshMosqueSettings();
        await loadPerformanceData();
      } else {
        setSettingsSaveErr(data.error?.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setSettingsSaveErr(err.message || 'নেটওয়ার্ক ত্রুটি ঘটেছে।');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper for star icons
  const renderStars = (stars: number, size = 'w-4 h-4') => {
    return (
      <div className="flex items-center space-x-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${size} ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-navigation bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>সদস্য মূল্যায়ন ও কার্যক্রম</span>
                <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Performance & Activities
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                কমিটি সদস্যদের সভায় উপস্থিতি, অর্পিত দায়িত্ব পালন, কার্যক্রমে অবদান ও গুণগত মান পরিমাপ
              </p>
            </div>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            id="subtab-matrix"
            onClick={() => setSubTab('matrix')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'matrix'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>পারফরম্যান্স ম্যাট্রিক্স</span>
          </button>

          <button
            id="subtab-activities"
            onClick={() => setSubTab('activities')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'activities'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>কার্যক্রম ও অবদান</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
              {activitiesList.length}
            </span>
          </button>

          <button
            id="subtab-tasks"
            onClick={() => setSubTab('tasks')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>অর্পিত দায়িত্ব</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
              {tasksList.length}
            </span>
          </button>

          <button
            id="subtab-settings"
            onClick={() => setSubTab('settings')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>মূল্যায়ন পলিসি ও ওয়েটেজ</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar (Term & Date Range) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Term Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700">কমিটির মেয়াদ:</span>
            <select
              id="select-evaluation-term"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} {t.status === 'ACTIVE' ? '(বর্তমান মেয়াদ)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">শুরুর তারিখ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 bg-slate-50"
            />
            <span className="text-slate-500">শেষ তারিখ:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 bg-slate-50"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold ml-1 cursor-pointer"
              >
                রিসেট
              </button>
            )}
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-print-performance-summary"
            onClick={() => {
              setPrintSingleMember(null);
              setPrintReportType('ALL_MEMBERS');
              setIsPrintModalOpen(true);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>সামগ্রিক মূল্যায়ন প্রিন্ট</span>
          </button>

          <button
            id="btn-add-activity-quick"
            onClick={() => {
              setEditingActivity(null);
              setPreselectedMemberForActivity('');
              setIsActivityModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>নতুন কার্যক্রম এন্ট্রি</span>
          </button>

          <button
            id="btn-add-task-quick"
            onClick={() => {
              setEditingTask(null);
              setPreselectedMemberForTask('');
              setIsTaskModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>দায়িত্ব অর্পণ</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PERFORMANCE MATRIX & SUMMARY */}
      {subTab === 'matrix' && (
        <div className="space-y-6">
          {/* Executive Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Average Score */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500">কমিটির সার্বিক গড় স্কোর</div>
                <div className="text-2xl font-black text-blue-700 mt-1">
                  {toBanglaNumber(evaluationSummary?.committeeStats?.averageScore || 0)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  মোট {toBanglaNumber(evaluationSummary?.committeeStats?.totalMembers || 0)} জন সদস্যের মূল্যায়ন
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Award className="w-6 h-6" />
              </div>
            </div>

            {/* Card 2: Average Attendance */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500">গড় মিটিং উপস্থিতি হার</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {toBanglaNumber(evaluationSummary?.committeeStats?.averageAttendance || 0)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {toBanglaNumber(meetings.length)} টি সভার উপস্থিতি ভিত্তিক
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Task Completion */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500">দায়িত্ব সম্পাদন হার</div>
                <div className="text-2xl font-black text-purple-700 mt-1">
                  {toBanglaNumber(evaluationSummary?.committeeStats?.averageTaskCompletion || 0)}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  অর্পিত রেজোলিউশন ও কাজের বাস্তবায়ন
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: 5 & 4 Star Ratings */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500">অনুকরণীয় ও সক্রিয় সদস্য</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {toBanglaNumber(
                    (evaluationSummary?.committeeStats?.fiveStarCount || 0) +
                      (evaluationSummary?.committeeStats?.fourStarCount || 0)
                  )}{' '}
                  <span className="text-xs font-semibold text-slate-600">জন</span>
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1 font-semibold">
                  <span>★ ৫-স্টার: {toBanglaNumber(evaluationSummary?.committeeStats?.fiveStarCount || 0)}</span>
                  <span>| ৪-স্টার: {toBanglaNumber(evaluationSummary?.committeeStats?.fourStarCount || 0)}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Member Search & Filters Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="সদস্যের নাম, পদবী বা মোবাইল দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Position Filter */}
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="border border-slate-300 rounded-lg text-xs px-3 py-2 bg-slate-50 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ALL">সকল পদবী</option>
                {distinctPositions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>

              {/* Star Rating Pills */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setStarFilter('ALL')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    starFilter === 'ALL' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600'
                  }`}
                >
                  সকল
                </button>
                <button
                  onClick={() => setStarFilter('5')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    starFilter === '5' ? 'bg-white shadow-xs text-amber-600' : 'text-slate-600'
                  }`}
                >
                  ৫★
                </button>
                <button
                  onClick={() => setStarFilter('4')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    starFilter === '4' ? 'bg-white shadow-xs text-amber-600' : 'text-slate-600'
                  }`}
                >
                  ৪★
                </button>
                <button
                  onClick={() => setStarFilter('3')}
                  className={`px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                    starFilter === '3' ? 'bg-white shadow-xs text-amber-600' : 'text-slate-600'
                  }`}
                >
                  ৩★
                </button>
              </div>

              {/* Display mode toggle */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setDisplayMode('table')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    displayMode === 'table' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500'
                  }`}
                  title="টেবিল ভিউ"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDisplayMode('grid')}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    displayMode === 'grid' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500'
                  }`}
                  title="কার্ড গ্রিড ভিউ"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Members Matrix Content */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-blue-600 rounded-full mb-2" />
              <div className="text-xs font-semibold">পারফরম্যান্স ডেটা বিশ্লেষণ ও হিসাব করা হচ্ছে...</div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">কোনো সদস্যের মূল্যায়ন রেকর্ড পাওয়া যায়নি</div>
              <div className="text-xs text-slate-500 mt-1">নির্বাচিত ফিল্টার অথবা কমিটির মেয়াদ পরিবর্তন করে চেষ্টা করুন।</div>
            </div>
          ) : displayMode === 'table' ? (
            /* Table View */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-3.5 text-center w-10">#</th>
                      <th className="p-3.5">কমিটি সদস্য ও পদবী</th>
                      <th className="p-3.5 text-center">উপস্থিতি হার (৩০%)</th>
                      <th className="p-3.5 text-center">অর্পিত দায়িত্ব (৩০%)</th>
                      <th className="p-3.5 text-center">কার্যক্রম (১৫%)</th>
                      <th className="p-3.5 text-center">গুণগত মান (১০%)</th>
                      <th className="p-3.5 text-center font-black">চূড়ান্ত স্কোর</th>
                      <th className="p-3.5 text-center">স্টার রেটিং</th>
                      <th className="p-3.5 text-center">স্তর ও স্ট্যাটাস</th>
                      <th className="p-3.5 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredMembers.map((mem, idx) => (
                      <tr key={mem.memberId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 text-center font-bold text-slate-500">
                          {toBanglaNumber(idx + 1)}
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                              {mem.memberName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => {
                                setActiveProfileMember(mem);
                                setIsProfileModalOpen(true);
                              }}>
                                {mem.memberName}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500">
                                {mem.positionCustomBn || mem.position}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                মোবাইল: {toBanglaNumber(mem.phone)}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="font-black text-slate-800">
                            {toBanglaNumber(mem.attendancePercentage)}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            উপস্থিত: {toBanglaNumber(mem.presentMeetings)} / {toBanglaNumber(mem.totalMeetings)}
                          </div>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${mem.attendancePercentage}%` }}
                            />
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="font-black text-slate-800">
                            {toBanglaNumber(mem.taskCompletionPercentage)}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            সম্পন্ন: {toBanglaNumber(mem.completedTasks)} / {toBanglaNumber(mem.totalAssignedTasks)}
                          </div>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${mem.taskCompletionPercentage}%` }}
                            />
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="font-bold text-slate-800">
                            {toBanglaNumber(mem.activityScore)}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            কার্যক্রম: {toBanglaNumber(mem.otherActivitiesCount)} টি
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="font-bold text-slate-800">
                            {toBanglaNumber(mem.qualityAverageScore)}%
                          </div>
                          <div className="text-[10px] text-slate-500">
                            মূল্যায়িত: {toBanglaNumber(mem.qualityEvaluatedCount)} টি
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="text-sm font-black text-blue-700">
                            {toBanglaNumber(mem.finalScore)}%
                          </div>
                          {mem.isManuallyOverridden && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-0.5">
                              সমন্বিত
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center whitespace-nowrap">
                          {renderStars(mem.starRating)}
                          <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                            {toBanglaNumber(mem.starRating)} স্টার
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              mem.starRating === 5
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : mem.starRating === 4
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : mem.starRating === 3
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {mem.performanceLevelBn}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setActiveProfileMember(mem);
                                setIsProfileModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="বিস্তারিত প্রোফাইল ও ইতিহাস"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setEvaluatingMemberScore(mem);
                                setIsManualEvalModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="মূল্যায়ন ও মন্তব্য এন্ট্রি"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setPrintSingleMember(mem);
                                setPrintReportType('SINGLE_MEMBER');
                                setIsPrintModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="ব্যক্তিগত মূল্যায়ন পত্র প্রিন্ট"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((mem) => (
                <div
                  key={mem.memberId}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm border-2 border-blue-200">
                          {mem.memberName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{mem.memberName}</h4>
                          <div className="text-xs font-semibold text-blue-700">{mem.positionCustomBn || mem.position}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-blue-700">{toBanglaNumber(mem.finalScore)}%</div>
                        {renderStars(mem.starRating, 'w-3 h-3')}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 bg-slate-50 rounded-lg text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px]">মিটিং উপস্থিতি:</span>
                        <div className="font-bold text-slate-800">
                          {toBanglaNumber(mem.attendancePercentage)}% ({toBanglaNumber(mem.presentMeetings)}/{toBanglaNumber(mem.totalMeetings)})
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px]">দায়িত্ব সম্পাদন:</span>
                        <div className="font-bold text-slate-800">
                          {toBanglaNumber(mem.taskCompletionPercentage)}% ({toBanglaNumber(mem.completedTasks)}/{toBanglaNumber(mem.totalAssignedTasks)})
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px]">কার্যক্রম সংখ্যা:</span>
                        <div className="font-bold text-slate-800">{toBanglaNumber(mem.otherActivitiesCount)} টি</div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px]">কাজের মান:</span>
                        <div className="font-bold text-slate-800">{toBanglaNumber(mem.qualityAverageScore)}%</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border block text-center ${
                          mem.starRating === 5
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : mem.starRating === 4
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : mem.starRating === 3
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {mem.performanceLevelBn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                    <button
                      onClick={() => {
                        setActiveProfileMember(mem);
                        setIsProfileModalOpen(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>প্রোফাইল</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEvaluatingMemberScore(mem);
                          setIsManualEvalModalOpen(true);
                        }}
                        className="text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 cursor-pointer"
                      >
                        মূল্যায়ন
                      </button>

                      <button
                        onClick={() => {
                          setPrintSingleMember(mem);
                          setPrintReportType('SINGLE_MEMBER');
                          setIsPrintModalOpen(true);
                        }}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 cursor-pointer"
                      >
                        প্রিন্ট
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: ACTIVITIES & PARTICIPATION LOG */}
      {subTab === 'activities' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">সদস্যদের কার্যক্রম ও সভায় অবদান রেজিস্টার</h3>
                <div className="text-[11px] text-slate-500">মসজিদ উন্নয়ন, তহবিল সংগ্রহ, অডিট ও সাংগঠনিক কার্যক্রমের বিস্তারিত লগ</div>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingActivity(null);
                setPreselectedMemberForActivity('');
                setIsActivityModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন কার্যক্রম এন্ট্রি</span>
            </button>
          </div>

          {activitiesList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">কোনো কার্যক্রমের রেকর্ড এন্ট্রি করা হয়নি</div>
              <div className="text-xs text-slate-500 mt-1">সদস্যদের বিশেষ অবদান ও উন্নয়নমূলক কাজের বিবরণ সংরক্ষণ করতে উপরের বাটনে ক্লিক করুন।</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activitiesList.map((act) => (
                <div key={act.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {act.activityTypeBn || ACTIVITY_TYPE_LABELS[act.activityType] || act.activityType}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(act.date, 'bn')}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1.5">{act.title}</h4>
                      <div className="text-xs font-semibold text-slate-600">
                        সদস্য: <span className="text-slate-900">{act.memberName}</span> ({act.memberDesignation || 'সদস্য'})
                      </div>
                    </div>

                    <div className="text-right">
                      {act.qualityRating && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${
                            QUALITY_RATING_LABELS[act.qualityRating]?.color || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {act.qualityRating === 'EXCELLENT' ? 'চমৎকার' : act.qualityRating === 'GOOD' ? 'ভালো' : 'সন্তোষজনক'}
                        </span>
                      )}
                    </div>
                  </div>

                  {act.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {act.description}
                    </p>
                  )}

                  {act.evaluatorNote && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      <span className="font-bold">পর্যবেক্ষণ: </span>
                      {act.evaluatorNote}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 text-slate-400">
                    <div className="text-[10px]">
                      {act.relatedMeetingTitle ? `মিটিং রেফারেন্স: ${act.relatedMeetingTitle}` : ''}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingActivity(act);
                          setIsActivityModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        এডিট
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('আপনি কি এই কার্যক্রমটি মুছে ফেলতে চান?')) {
                            await fetch(`/api/v1/committee/activities/${act.id}`, { method: 'DELETE' });
                            loadPerformanceData();
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        মুছুন
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: ASSIGNED TASKS & RESPONSIBILITY TRACKING */}
      {subTab === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">অর্পিত দায়িত্ব ও বাস্তবায়ন ট্র্যাকিং</h3>
                <div className="text-[11px] text-slate-500">মিটিং রেজোলিউশন ও কমিটির বিভিন্ন সাব-কমিটির দায়িত্ব বাস্তবায়ন মনিটরিং</div>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingTask(null);
                setPreselectedMemberForTask('');
                setIsTaskModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন দায়িত্ব অর্পণ</span>
            </button>
          </div>

          {tasksList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">কোনো অর্পিত দায়িত্বের রেকর্ড নেই</div>
              <div className="text-xs text-slate-500 mt-1">সদস্যদের দায়িত্ব অর্পণ করতে উপরের বাটনে ক্লিক করুন।</div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="p-3.5 text-center w-10">#</th>
                      <th className="p-3.5">দায়িত্বপ্রাপ্ত সদস্য</th>
                      <th className="p-3.5">কাজের বিবরণ ও শিরোনাম</th>
                      <th className="p-3.5 text-center">অর্পণের তারিখ</th>
                      <th className="p-3.5 text-center">শেষ সময় (Deadline)</th>
                      <th className="p-3.5 text-center">বর্তমান স্ট্যাটাস</th>
                      <th className="p-3.5 text-center">কাজের মান</th>
                      <th className="p-3.5 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tasksList.map((task, idx) => (
                      <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 text-center font-bold text-slate-400">
                          {toBanglaNumber(idx + 1)}
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{task.memberName}</div>
                          <div className="text-[11px] text-slate-500">{task.memberDesignation || 'সদস্য'}</div>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <div className="font-bold text-slate-900">{task.taskTitle}</div>
                          {task.description && (
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">{task.description}</div>
                          )}
                          {task.meetingNumber && (
                            <div className="text-[10px] text-blue-600 mt-0.5">মিটিং #{task.meetingNumber}</div>
                          )}
                        </td>

                        <td className="p-3.5 text-center text-slate-600">
                          {formatDate(task.assignedDate, 'bn')}
                        </td>

                        <td className="p-3.5 text-center font-semibold">
                          {task.dueDate ? (
                            <span className={task.status === 'OVERDUE' ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {formatDate(task.dueDate, 'bn')}
                            </span>
                          ) : (
                            <span className="text-slate-400">অনির্দিষ্ট</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <select
                            value={task.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value as CommitteeTaskStatus;
                              await fetch(`/api/v1/committee/tasks/${task.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus }),
                              });
                              loadPerformanceData();
                            }}
                            className={`text-[11px] font-bold px-2 py-1 rounded-md border focus:outline-hidden cursor-pointer ${
                              TASK_STATUS_LABELS[task.status]?.color || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <option value="PENDING">অপেক্ষমান</option>
                            <option value="IN_PROGRESS">চলমান</option>
                            <option value="COMPLETED">সম্পন্ন</option>
                            <option value="OVERDUE">মেয়াদোত্তীর্ণ</option>
                            <option value="CANCELLED">বাতিল</option>
                          </select>
                        </td>

                        <td className="p-3.5 text-center">
                          {task.qualityRating ? (
                            <span className="font-bold text-slate-800">
                              {toBanglaNumber(task.qualityScore || 85)}%
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {task.status !== 'COMPLETED' && (
                              <button
                                onClick={async () => {
                                  const res = await fetch(`/api/v1/committee/tasks/${task.id}/remind`, {
                                    method: 'POST',
                                  });
                                  const d = await res.json();
                                  if (d.success) alert(d.message);
                                }}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="স্মারক / তাগাদা নোটিফিকেশন পাঠান"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setIsTaskModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="এডিট"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm('আপনি কি এই দায়িত্ব রেকর্ডটি মুছে ফেলতে চান?')) {
                                  await fetch(`/api/v1/committee/tasks/${task.id}`, { method: 'DELETE' });
                                  loadPerformanceData();
                                }
                              }}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: EVALUATION POLICY & WEIGHTS SETTINGS */}
      {subTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">মূল্যায়ন পলিসি ও স্কোরিং ওয়েটেজ কনফিগারেশন</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  মসজিদ কমিটির নিয়মানুযায়ী বিভিন্ন সূচকের শতকরা ওয়েটেজ (Weight) এবং স্টার রেটিং থ্রেশহোল্ড নির্ধারণ করুন
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveWeights} className="space-y-6">
              {/* Weights sliders/inputs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800">
                    ১. পারফরম্যান্স সূচক ওয়েটেজ বণ্টন (মোট যোগফল অবশ্যই ১০০% হতে হবে)
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      weightSum === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    বর্তমান যোগফল: {toBanglaNumber(weightSum)}% / ১০০%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মিটিংয়ে উপস্থিতি ওয়েটেজ (Attendance Weight) %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsForm.attendance}
                      onChange={(e) => setWeightsForm({ ...weightsForm, attendance: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500">কার্যবিবরণী ও রেজোলিউশনের উপস্থিতি খাতা হতে স্বয়ংক্রিয়</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      অর্পিত দায়িত্ব ও রেজোলিউশন ওয়েটেজ %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsForm.responsibility}
                      onChange={(e) => setWeightsForm({ ...weightsForm, responsibility: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500">অর্পিত কাজের সম্পন্ন করার শতকরা হার</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      সভায় সক্রিয় অংশগ্রহণ ও ভূমিকা ওয়েটেজ %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsForm.participation}
                      onChange={(e) => setWeightsForm({ ...weightsForm, participation: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500">আলোচনা, সভাপতি/সঞ্চালক/দোয়া পরিচালনা ও প্রস্তাবনা</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      উন্নয়ন ও সাংগঠনিক কার্যক্রম ওয়েটেজ %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsForm.activity}
                      onChange={(e) => setWeightsForm({ ...weightsForm, activity: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500">মসজিদ নির্মাণ, ওয়াকফ, অডিট ও অনুদান সংগ্রহ কাজ</span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      কাজের গুণগত মান ও যথার্থতা ওয়েটেজ (Quality) %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsForm.quality}
                      onChange={(e) => setWeightsForm({ ...weightsForm, quality: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-500">মূল্যায়নকৃত কাজের গুণগত মান ও রিভিউ স্কোর</span>
                  </div>
                </div>
              </div>

              {/* Attendance Leave Rule */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeExcusedLeave}
                    onChange={(e) => setExcludeExcusedLeave(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      অনুমোদিত ছুটি ও ওজর উপস্থিতির হার গণনায় বাদ রাখুন (Exclude Excused Leave)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      টিক দিলে অসুস্থতা বা অনুমোদিত ছুটিকে মোট মিটিং সংখ্যা থেকে বাদ দিয়ে হিসাব করা হবে, অন্যথায় ৫০% পয়েন্ট দেয়া হবে।
                    </p>
                  </div>
                </label>
              </div>

              {/* Star Rating Thresholds */}
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  ২. স্টার রেটিং কাট-অফ স্কোর (Star Rating Cutoffs)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-amber-600 font-bold block mb-1">★★★★★ (৫-স্টার)</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">ন্যূনতম:</span>
                      <input
                        type="number"
                        value={thresholdsForm.fiveStar}
                        onChange={(e) => setThresholdsForm({ ...thresholdsForm, fiveStar: Number(e.target.value) })}
                        className="w-16 border rounded px-2 py-1 bg-white font-bold"
                      />
                      <span>%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-amber-600 font-bold block mb-1">★★★★☆ (৪-স্টার)</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">ন্যূনতম:</span>
                      <input
                        type="number"
                        value={thresholdsForm.fourStar}
                        onChange={(e) => setThresholdsForm({ ...thresholdsForm, fourStar: Number(e.target.value) })}
                        className="w-16 border rounded px-2 py-1 bg-white font-bold"
                      />
                      <span>%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-amber-600 font-bold block mb-1">★★★☆☆ (৩-স্টার)</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">ন্যূনতম:</span>
                      <input
                        type="number"
                        value={thresholdsForm.threeStar}
                        onChange={(e) => setThresholdsForm({ ...thresholdsForm, threeStar: Number(e.target.value) })}
                        className="w-16 border rounded px-2 py-1 bg-white font-bold"
                      />
                      <span>%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-amber-600 font-bold block mb-1">★★☆☆☆ (২-স্টার)</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-slate-500">ন্যূনতম:</span>
                      <input
                        type="number"
                        value={thresholdsForm.twoStar}
                        onChange={(e) => setThresholdsForm({ ...thresholdsForm, twoStar: Number(e.target.value) })}
                        className="w-16 border rounded px-2 py-1 bg-white font-bold"
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </div>

              {settingsSaveErr && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{settingsSaveErr}</span>
                </div>
              )}

              {settingsSaveMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{settingsSaveMsg}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings || weightSum !== 100}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'পলিসি সেটিংস সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT ACTIVITY MODAL */}
      {isActivityModalOpen && (
        <ActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          activity={editingActivity}
          termId={selectedTermId}
          members={members}
          preselectedMemberId={preselectedMemberForActivity}
          meetings={meetings}
          onSaved={() => {
            setIsActivityModalOpen(false);
            loadPerformanceData();
          }}
        />
      )}

      {/* MODAL 2: ADD / EDIT TASK MODAL */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          task={editingTask}
          termId={selectedTermId}
          members={members}
          preselectedMemberId={preselectedMemberForTask}
          meetings={meetings}
          onSaved={() => {
            setIsTaskModalOpen(false);
            loadPerformanceData();
          }}
        />
      )}

      {/* MODAL 3: MANUAL EVALUATION & OVERRIDE MODAL */}
      {isManualEvalModalOpen && evaluatingMemberScore && (
        <ManualEvaluationModal
          isOpen={isManualEvalModalOpen}
          onClose={() => setIsManualEvalModalOpen(false)}
          memberScore={evaluatingMemberScore}
          termId={selectedTermId}
          onSaved={() => {
            setIsManualEvalModalOpen(false);
            loadPerformanceData();
          }}
        />
      )}

      {/* MODAL 4: MEMBER PERFORMANCE PROFILE MODAL */}
      {isProfileModalOpen && activeProfileMember && (
        <MemberProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          memberScore={activeProfileMember}
          activities={activitiesList.filter(
            (a) => a.memberId === activeProfileMember.memberId || a.memberName === activeProfileMember.memberName
          )}
          tasks={tasksList.filter(
            (t) => t.memberId === activeProfileMember.memberId || t.memberName === activeProfileMember.memberName
          )}
          onPrint={() => {
            setPrintSingleMember(activeProfileMember);
            setPrintReportType('SINGLE_MEMBER');
            setIsPrintModalOpen(true);
          }}
          onEvaluate={() => {
            setIsProfileModalOpen(false);
            setEvaluatingMemberScore(activeProfileMember);
            setIsManualEvalModalOpen(true);
          }}
        />
      )}

      {/* MODAL 5: PRINTABLE OFFICIAL A4 REPORT */}
      {isPrintModalOpen && (
        <PerformanceReportPrint
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          mosque={mosque}
          term={currentTerm}
          memberScores={memberScoresList}
          singleMember={printSingleMember}
          fromDate={fromDate}
          toDate={toDate}
          reportType={printReportType}
        />
      )}
    </div>
  );
};

// ==========================================
// SUB-MODAL 1: ActivityModal
// ==========================================
interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: CommitteeMemberActivity | null;
  termId: string;
  members: CommitteeMember[];
  preselectedMemberId?: string;
  meetings: CommitteeMeeting[];
  onSaved: () => void;
}

const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
  termId,
  members,
  preselectedMemberId,
  meetings,
  onSaved,
}) => {
  const [memberId, setMemberId] = useState(activity?.memberId || preselectedMemberId || members[0]?.id || '');
  const [title, setTitle] = useState(activity?.title || '');
  const [activityType, setActivityType] = useState<CommitteeActivityType>(activity?.activityType || 'MOSQUE_DEVELOPMENT');
  const [category, setCategory] = useState<'COMMITTEE_ACTIVITY' | 'MEETING_PARTICIPATION'>(
    activity?.category === 'MEETING_PARTICIPATION' ? 'MEETING_PARTICIPATION' : 'COMMITTEE_ACTIVITY'
  );
  const [date, setDate] = useState(activity?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(activity?.description || '');
  const [relatedMeetingId, setRelatedMeetingId] = useState(activity?.relatedMeetingId || '');
  const [qualityRating, setQualityRating] = useState<EvaluationQualityRating>(activity?.qualityRating || 'EXCELLENT');
  const [evaluatorNote, setEvaluatorNote] = useState(activity?.evaluatorNote || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('কার্যক্রমের শিরোনাম আবশ্যক।');
      return;
    }
    setError('');
    setLoading(true);

    const mem = members.find((m) => m.id === memberId);
    const relatedMeet = meetings.find((m) => m.id === relatedMeetingId);

    const payload = {
      termId,
      memberId,
      memberName: mem?.name || '',
      memberDesignation: mem?.positionCustomBn || mem?.position || 'সদস্য',
      activityType,
      activityTypeBn: ACTIVITY_TYPE_LABELS[activityType] || 'অন্যান্য কার্যক্রম',
      category,
      title: title.trim(),
      description: description.trim(),
      date,
      relatedMeetingId: relatedMeetingId || undefined,
      relatedMeetingTitle: relatedMeet ? `${relatedMeet.meetingTypeBn || 'মিটিং'} (${relatedMeet.meetingNumber})` : undefined,
      qualityRating,
      evaluatorNote: evaluatorNote.trim() || undefined,
    };

    try {
      const url = activity ? `/api/v1/committee/activities/${activity.id}` : '/api/v1/committee/activities';
      const method = activity ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error?.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'ত্রুটি ঘটেছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              {activity ? 'কার্যক্রম তথ্য সম্পাদনা' : 'নতুন কার্যক্রম ও অবদান এন্ট্রি'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কমিটি সদস্য *</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.positionCustomBn || m.position})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="COMMITTEE_ACTIVITY">উন্নয়ন ও সাংগঠনিক কার্যক্রম</option>
                <option value="MEETING_PARTICIPATION">সভায় অংশগ্রহণ ও আলোচনা</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">কার্যক্রমের ধরন *</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as CommitteeActivityType)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কার্যক্রমের শিরোনাম *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="উদাঃ ২য় তলার রঙের কাজের তদারকি ও ঠিকাদার সমন্বয়"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">সংশ্লিষ্ট মিটিং (ঐচ্ছিক)</label>
              <select
                value={relatedMeetingId}
                onChange={(e) => setRelatedMeetingId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">কোনো নির্দিষ্ট মিটিং নয়</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meetingNumber} নং সভা ({formatDate(m.date, 'bn')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">বিস্তারিত বিবরণ</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="কার্যক্রমের ফলাফল ও ভূমিকা..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">কাজের গুণগত মান রেটিং</label>
              <select
                value={qualityRating}
                onChange={(e) => setQualityRating(e.target.value as EvaluationQualityRating)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXCELLENT">চমৎকার ও অনুকরণীয় (৯৫%)</option>
                <option value="GOOD">প্রশংসনীয় ও ভালো (৮৫%)</option>
                <option value="SATISFACTORY">সন্তোষজনক (৭৫%)</option>
                <option value="NEEDS_IMPROVEMENT">উন্নতি কাম্য (৬০%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মূল্যায়নকারীর মন্তব্য</label>
              <input
                type="text"
                value={evaluatorNote}
                onChange={(e) => setEvaluatorNote(e.target.value)}
                placeholder="উদাঃ অত্যন্ত দায়িত্বশীল ভূমিকা পালন করেছেন"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold">{error}</div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer"
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 2: TaskModal
// ==========================================
interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CommitteeMemberTask | null;
  termId: string;
  members: CommitteeMember[];
  preselectedMemberId?: string;
  meetings: CommitteeMeeting[];
  onSaved: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  termId,
  members,
  preselectedMemberId,
  meetings,
  onSaved,
}) => {
  const [memberId, setMemberId] = useState(task?.memberId || preselectedMemberId || members[0]?.id || '');
  const [taskTitle, setTaskTitle] = useState(task?.taskTitle || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignedDate, setAssignedDate] = useState(task?.assignedDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [status, setStatus] = useState<CommitteeTaskStatus>(task?.status || 'PENDING');
  const [meetingId, setMeetingId] = useState(task?.meetingId || '');
  const [qualityRating, setQualityRating] = useState<EvaluationQualityRating>(task?.qualityRating || 'EXCELLENT');
  const [evaluatorNote, setEvaluatorNote] = useState(task?.evaluatorNote || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError('দায়িত্বের নাম আবশ্যক।');
      return;
    }
    setError('');
    setLoading(true);

    const mem = members.find((m) => m.id === memberId);
    const relatedMeet = meetings.find((m) => m.id === meetingId);

    const payload = {
      termId,
      memberId,
      memberName: mem?.name || '',
      memberDesignation: mem?.positionCustomBn || mem?.position || 'সদস্য',
      taskTitle: taskTitle.trim(),
      description: description.trim(),
      assignedDate,
      dueDate: dueDate || undefined,
      status,
      meetingId: meetingId || undefined,
      meetingNumber: relatedMeet?.meetingNumber || undefined,
      qualityRating,
      evaluatorNote: evaluatorNote.trim() || undefined,
    };

    try {
      const url = task ? `/api/v1/committee/tasks/${task.id}` : '/api/v1/committee/tasks';
      const method = task ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error?.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'ত্রুটি ঘটেছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              {task ? 'অর্পিত দায়িত্ব তথ্য হালনাগাদ' : 'নতুন দায়িত্ব অর্পণ'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">দায়িত্বপ্রাপ্ত সদস্য *</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.positionCustomBn || m.position})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">অর্পিত দায়িত্বের শিরোনাম *</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="উদাঃ মসজিদের অডিট রিপোর্ট ও আয়-ব্যয় ভাউচার প্রস্তুতকরণ"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">অর্পণের তারিখ *</label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">শেষ সময় (Deadline)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">স্ট্যাটাস</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CommitteeTaskStatus)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PENDING">অপেক্ষমান (Pending)</option>
                <option value="IN_PROGRESS">চলমান (In Progress)</option>
                <option value="COMPLETED">সম্পন্ন (Completed)</option>
                <option value="OVERDUE">মেয়াদোত্তীর্ণ (Overdue)</option>
                <option value="CANCELLED">বাতিল (Cancelled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">সংশ্লিষ্ট মিটিং</label>
              <select
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">কোনো মিটিং রেফারেন্স নেই</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meetingNumber} নং সভা ({formatDate(m.date, 'bn')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কাজের বিস্তারিত বর্ণনা</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="দায়িত্ব বাস্তবায়নের নির্দেশনা..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold">{error}</div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer"
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 3: ManualEvaluationModal
// ==========================================
interface ManualEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberScore: MemberEvaluationScoreResult;
  termId: string;
  onSaved: () => void;
}

const ManualEvaluationModal: React.FC<ManualEvaluationModalProps> = ({
  isOpen,
  onClose,
  memberScore,
  termId,
  onSaved,
}) => {
  const existingEval = memberScore.manualEvaluation;
  const [overallAssessment, setOverallAssessment] = useState(existingEval?.overallAssessment || '');
  const [strengths, setStrengths] = useState(existingEval?.strengths || '');
  const [weaknesses, setWeaknesses] = useState(existingEval?.weaknesses || '');
  const [improvementRequired, setImprovementRequired] = useState(existingEval?.improvementRequired || '');
  const [recommendation, setRecommendation] = useState<any>(existingEval?.recommendation || 'EXCELLENT');
  const [evaluatorComment, setEvaluatorComment] = useState(existingEval?.evaluatorComment || '');
  const [enableOverride, setEnableOverride] = useState(Boolean(existingEval?.manualOverrideScore !== undefined));
  const [manualOverrideScore, setManualOverrideScore] = useState<string>(
    existingEval?.manualOverrideScore !== undefined ? String(existingEval.manualOverrideScore) : ''
  );
  const [overrideReason, setOverrideReason] = useState(existingEval?.overrideReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enableOverride && (!manualOverrideScore || isNaN(Number(manualOverrideScore)))) {
      setError('স্কোর সমন্বয়ের জন্য একটি বৈধ শতকরা সংখ্যা দিন।');
      return;
    }
    if (enableOverride && !overrideReason.trim()) {
      setError('স্কোর ম্যানুয়াল সমন্বয়ের কারণ উল্লেখ করা বাধ্যতামূলক।');
      return;
    }
    setError('');
    setLoading(true);

    const payload = {
      id: existingEval?.id,
      termId,
      memberId: memberScore.memberId,
      memberName: memberScore.memberName,
      memberDesignation: memberScore.positionCustomBn || memberScore.position,
      evaluationPeriodType: 'MONTHLY',
      fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      overallAssessment: overallAssessment.trim(),
      strengths: strengths.trim(),
      weaknesses: weaknesses.trim(),
      improvementRequired: improvementRequired.trim(),
      recommendation,
      evaluatorComment: evaluatorComment.trim(),
      manualOverrideScore: enableOverride ? Number(manualOverrideScore) : undefined,
      overrideReason: enableOverride ? overrideReason.trim() : undefined,
    };

    try {
      const res = await fetch('/api/v1/committee/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error?.message || 'মূল্যায়ন সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setError(err.message || 'ত্রুটি ঘটেছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">সদস্য মূল্যায়ন ও পর্যবেক্ষণ ফর্ম</h3>
              <div className="text-[11px] text-slate-500">
                {memberScore.memberName} ({memberScore.positionCustomBn || memberScore.position})
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Current calculated score info card */}
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-blue-700 font-bold block">সিস্টেম গণনাকৃত অটো স্কোর (Auto Calculated):</span>
              <span className="text-slate-600">
                উপস্থিতি {toBanglaNumber(memberScore.attendancePercentage)}% | কাজ {toBanglaNumber(memberScore.taskCompletionPercentage)}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-blue-800">{toBanglaNumber(memberScore.rawScore)}%</span>
              <span className="text-[10px] text-blue-600 block">({toBanglaNumber(memberScore.starRating)} স্টার)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">সার্বিক মূল্যায়ন ও মূল্যায়নকারী মন্তব্য</label>
            <textarea
              value={overallAssessment}
              onChange={(e) => setOverallAssessment(e.target.value)}
              rows={2}
              placeholder="সদস্যের সার্বিক দায়িত্বশীলতা, সময়ানুবর্তিতা ও সহযোগিতা সম্পর্কিত পর্যবেক্ষণ..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-1">সবল দিক (Strengths)</label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={2}
                placeholder="উদাঃ চমৎকার যোগাযোগ ও দ্রুত সিদ্ধান্ত বাস্তবায়ন..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">উন্নতির ক্ষেত্র (Improvement Areas)</label>
              <textarea
                value={improvementRequired}
                onChange={(e) => setImprovementRequired(e.target.value)}
                rows={2}
                placeholder="উদাঃ মিটিংয়ে নিয়মিত ও সময়মতো উপস্থিতি বাড়ানো..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">সুপারিশ ও মর্যাদা স্তর (Recommendation)</label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="EXCELLENT">অনুকরণীয় ও চমৎকার (Excellent Role Model)</option>
              <option value="GOOD">প্রশংসনীয় ও সক্রিয় (Good Active Contributor)</option>
              <option value="SATISFACTORY">সন্তোষজনক ও নিয়মিত (Satisfactory Regular)</option>
              <option value="NEEDS_IMPROVEMENT">অধিক অংশগ্রহণ ও উন্নয়ন কাম্য (Needs Improvement)</option>
              <option value="REVIEW_REQUIRED">পর্যালোচনা প্রয়োজন (Review Required)</option>
            </select>
          </div>

          {/* Manual Score Override Toggle */}
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableOverride}
                onChange={(e) => setEnableOverride(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span className="text-xs font-bold text-amber-900">
                ম্যানুয়াল স্কোর সমন্বয় ও ওভাররাইড সক্রিয় করুন (Manual Override)
              </span>
            </label>

            {enableOverride && (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    চূড়ান্ত সমন্বিত স্কোর (Override Score %) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={manualOverrideScore}
                    onChange={(e) => setManualOverrideScore(e.target.value)}
                    placeholder="উদাঃ ৯৫"
                    className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500"
                    required={enableOverride}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    স্কোর সমন্বয়ের যৌক্তিক কারণ (Audit Reason) *
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="উদাঃ মসজিদ নির্মাণে সার্বক্ষণিক তদারকি ও বিশেষ আর্থিক অনুদান সংগ্রহের জন্য অতিরিক্ত ক্রেডিট"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-amber-500"
                    required={enableOverride}
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold">{error}</div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold cursor-pointer"
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'মূল্যায়ন নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 4: MemberProfileModal
// ==========================================
interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberScore: MemberEvaluationScoreResult;
  activities: CommitteeMemberActivity[];
  tasks: CommitteeMemberTask[];
  onPrint: () => void;
  onEvaluate: () => void;
}

const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  isOpen,
  onClose,
  memberScore,
  activities,
  tasks,
  onPrint,
  onEvaluate,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-base">
              {memberScore.memberName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">{memberScore.memberName}</h3>
              <div className="text-xs text-blue-200">{memberScore.positionCustomBn || memberScore.position}</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onPrint}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>
            <button
              onClick={onEvaluate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>মূল্যায়ন করুন</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Top Score Banner */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold">সার্বিক পারফরম্যান্স স্কোর</div>
              <div className="text-3xl font-black text-blue-700 mt-0.5">
                {toBanglaNumber(memberScore.finalScore)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                মোবাইল: {toBanglaNumber(memberScore.phone)} {memberScore.address ? `| ঠিকানা: ${memberScore.address}` : ''}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end space-x-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i <= memberScore.starRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                ))}
              </div>
              <div className="text-xs font-bold text-slate-700 mt-1">
                {toBanglaNumber(memberScore.starRating)} স্টার রেটিং
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 mt-1 inline-block">
                {memberScore.performanceLevelBn}
              </span>
            </div>
          </div>

          {/* Metric Breakdown Progress */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">মূল্যায়ন খাত ও অর্জিত স্কোর অনুপাত:</h4>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>মিটিংয়ে উপস্থিতি (ওয়েটেজ: {toBanglaNumber(memberScore.attendanceWeight)}%)</span>
                  <span>
                    {toBanglaNumber(memberScore.attendancePercentage)}% (উপস্থিত {toBanglaNumber(memberScore.presentMeetings)} / মোট {toBanglaNumber(memberScore.totalMeetings)})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${memberScore.attendancePercentage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>অর্পিত দায়িত্ব ও বাস্তবায়ন (ওয়েটেজ: {toBanglaNumber(memberScore.taskWeight)}%)</span>
                  <span>
                    {toBanglaNumber(memberScore.taskCompletionPercentage)}% (সম্পন্ন {toBanglaNumber(memberScore.completedTasks)} / মোট {toBanglaNumber(memberScore.totalAssignedTasks)})
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${memberScore.taskCompletionPercentage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>উন্নয়ন ও সাংগঠনিক কার্যক্রম (ওয়েটেজ: {toBanglaNumber(memberScore.activityWeight)}%)</span>
                  <span>{toBanglaNumber(memberScore.activityScore)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${memberScore.activityScore}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>কাজের গুণগত মান ও যথার্থতা (ওয়েটেজ: {toBanglaNumber(memberScore.qualityWeight)}%)</span>
                  <span>{toBanglaNumber(memberScore.qualityAverageScore)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${memberScore.qualityAverageScore}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Activities Timeline */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-2">সাম্প্রতিক কার্যক্রমের তালিকা ({toBanglaNumber(activities.length)} টি):</h4>
            {activities.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-center">কোনো কার্যক্রমের লগ নেই</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activities.map((a) => (
                  <div key={a.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-800">{a.title}</span>
                      <div className="text-[10px] text-slate-500">{a.activityTypeBn} | {formatDate(a.date, 'bn')}</div>
                    </div>
                    {a.qualityRating && (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {a.qualityRating}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tasks List */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-2">অর্পিত দায়িত্বের তালিকা ({toBanglaNumber(tasks.length)} টি):</h4>
            {tasks.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-center">কোনো অর্পিত দায়িত্বের রেকর্ড নেই</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tasks.map((t) => (
                  <div key={t.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-800">{t.taskTitle}</span>
                      <div className="text-[10px] text-slate-500">শেষ সময়: {t.dueDate ? formatDate(t.dueDate, 'bn') : 'অনির্দিষ্ট'}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TASK_STATUS_LABELS[t.status]?.color || ''}`}>
                      {TASK_STATUS_LABELS[t.status]?.label || t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Qualitative Evaluation Comments if available */}
          {memberScore.manualEvaluation && (
            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-1.5">
              <div className="font-bold text-slate-800">কর্তৃপক্ষের সার্বিক মূল্যায়ন মন্তব্য:</div>
              <p className="text-slate-700">{memberScore.manualEvaluation.overallAssessment}</p>
              {memberScore.manualEvaluation.strengths && (
                <div className="text-emerald-800">
                  <span className="font-semibold">সবল দিক: </span>
                  {memberScore.manualEvaluation.strengths}
                </div>
              )}
              {memberScore.manualEvaluation.improvementRequired && (
                <div className="text-amber-800">
                  <span className="font-semibold">উন্নতির ক্ষেত্র: </span>
                  {memberScore.manualEvaluation.improvementRequired}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

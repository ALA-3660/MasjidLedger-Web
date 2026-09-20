import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  UserCheck,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Users2,
  Building,
  UserCog,
  Check,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Layers,
  Inbox,
  User,
  ListOrdered,
  Grid,
  RefreshCw,
} from 'lucide-react';
import {
  CollectionWorker,
  DonationCollection,
  AreaMaster,
  PersonMaster,
  DonationPlan,
  Donation,
  Mosque,
  User as AuthUser,
  Staff,
  CommitteeMember,
} from '../../types';
import { Language, toBanglaNumber } from '../../lib/i18n';
import { api } from '../../lib/api';
import { CollectionWorkerFormModal } from './CollectionWorkerFormModal';
import { CollectionWorkerDetailModal } from './CollectionWorkerDetailModal';
import { CollectionWorkerStatusModal } from './CollectionWorkerStatusModal';

const formatCurrency = (amount: number = 0, isBn: boolean = true) => {
  const formatted = Math.round(amount).toLocaleString('en-IN');
  return isBn ? `৳${toBanglaNumber(formatted)}` : `৳${formatted}`;
};

interface CollectionWorkerManagementSectionProps {
  workers: CollectionWorker[];
  collections: DonationCollection[];
  plans: DonationPlan[];
  persons: PersonMaster[];
  areas: AreaMaster[];
  donations: Donation[];
  currentMosque: Mosque | null;
  currentUser: AuthUser | null;
  language?: Language;
  onRefresh: () => void;
  onCollectDonation: (collection: DonationCollection) => void;
  loading?: boolean;
}

type MainTab = 'WORKERS' | 'TASKS' | 'AREAS';
type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'THIS_MONTH';
type StatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'COLLECTED' | 'NOT_COLLECTED';

export const CollectionWorkerManagementSection: React.FC<CollectionWorkerManagementSectionProps> = ({
  workers,
  collections,
  plans,
  persons,
  areas,
  donations,
  currentMosque,
  currentUser,
  language = 'bn',
  onRefresh,
  onCollectDonation,
  loading = false,
}) => {
  const isBn = language === 'bn';

  // Tabs & Views
  const [activeTab, setActiveTab] = useState<MainTab>('WORKERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState<string>('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  // Staff and Committee for identity linking in worker modal
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [committeeList, setCommitteeList] = useState<CommitteeMember[]>([]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<CollectionWorker | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWorkerForDetail, setSelectedWorkerForDetail] = useState<CollectionWorker | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [workerForStatusToggle, setWorkerForStatusToggle] = useState<CollectionWorker | null>(null);

  // Load auxiliary staff and committee members for identity selection
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [staffRes, commRes] = await Promise.all([
          api.getStaff().catch(() => []),
          api.getCommitteeMembers().catch(() => []),
        ]);
        setStaffList(staffRes || []);
        setCommitteeList(commRes || []);
      } catch (e) {
        // Non-blocking fallback
      }
    };
    loadAuxData();
  }, []);

  // Determine if current user matches any collection worker
  const currentWorkerMatch = useMemo(() => {
    if (!currentUser) return null;
    return workers.find((w) => {
      if (w.name.toLowerCase() === (currentUser.name || '').toLowerCase()) return true;
      if (currentUser.phone && w.mobile && currentUser.phone === w.mobile) return true;
      return false;
    });
  }, [currentUser, workers]);

  // Overall Operational Summary Metrics (Derived directly from collections & donations)
  const totalPlannedTk = useMemo(() => {
    return collections.reduce((sum, c) => sum + (c.plannedAmount || 0), 0);
  }, [collections]);

  const totalCollectedTk = useMemo(() => {
    return collections.reduce((sum, c) => sum + (c.collectedAmount || 0), 0);
  }, [collections]);

  const totalRemainingTk = Math.max(0, totalPlannedTk - totalCollectedTk);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const todayTasksCount = useMemo(() => {
    return collections.filter(
      (c) => c.scheduledDate === todayStr && c.status !== 'COLLECTED' && c.status !== 'CANCELLED'
    ).length;
  }, [collections, todayStr]);

  const pendingTasksCount = useMemo(() => {
    return collections.filter((c) => c.status === 'PENDING' || c.status === 'SCHEDULED').length;
  }, [collections]);

  const partialTasksCount = useMemo(() => {
    return collections.filter((c) => c.status === 'PARTIALLY_COLLECTED').length;
  }, [collections]);

  const collectedTasksCount = useMemo(() => {
    return collections.filter((c) => c.status === 'COLLECTED').length;
  }, [collections]);

  const notCollectedTasksCount = useMemo(() => {
    return collections.filter((c) => c.status === 'NOT_COLLECTED').length;
  }, [collections]);

  // My Tasks Count
  const myAssignedCollectionsCount = useMemo(() => {
    if (!currentWorkerMatch) return 0;
    return collections.filter(
      (c) => c.collectionWorkerId === currentWorkerMatch.id && c.status !== 'COLLECTED' && c.status !== 'CANCELLED'
    ).length;
  }, [collections, currentWorkerMatch]);

  // Filtered Workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // Area filter
      if (selectedAreaFilter !== 'ALL') {
        if (!w.areaIds || !w.areaIds.includes(selectedAreaFilter)) return false;
      }
      // Status filter
      if (statusFilter === 'COLLECTED' && w.status !== 'ACTIVE') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = w.name.toLowerCase().includes(q);
        const mobileMatch = w.mobile ? w.mobile.includes(q) : false;
        const idMatch = w.id.toLowerCase().includes(q);
        return nameMatch || mobileMatch || idMatch;
      }
      return true;
    });
  }, [workers, selectedAreaFilter, statusFilter, searchQuery]);

  // Filtered Tasks/Collections list
  const filteredTasks = useMemo(() => {
    return collections.filter((c) => {
      // "আমার দায়িত্ব" filter
      if (myTasksOnly) {
        if (!currentWorkerMatch || c.collectionWorkerId !== currentWorkerMatch.id) return false;
      } else if (selectedWorkerFilter !== 'ALL') {
        if (selectedWorkerFilter === 'UNASSIGNED') {
          if (c.collectionWorkerId) return false;
        } else if (c.collectionWorkerId !== selectedWorkerFilter) {
          return false;
        }
      }

      // Area filter
      if (selectedAreaFilter !== 'ALL' && c.areaId !== selectedAreaFilter) {
        return false;
      }

      // Date filter
      if (dateFilter === 'TODAY' && c.scheduledDate !== todayStr) return false;
      if (dateFilter === 'TOMORROW' && c.scheduledDate !== tomorrowStr) return false;

      // Status filter
      if (statusFilter === 'PENDING') {
        if (c.status !== 'PENDING' && c.status !== 'SCHEDULED') return false;
      } else if (statusFilter === 'PARTIAL') {
        if (c.status !== 'PARTIALLY_COLLECTED') return false;
      } else if (statusFilter === 'COLLECTED') {
        if (c.status !== 'COLLECTED') return false;
      } else if (statusFilter === 'NOT_COLLECTED') {
        if (c.status !== 'NOT_COLLECTED') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const personName = (c.personNameBn || '').toLowerCase();
        const code = (c.collectionCode || '').toLowerCase();
        const workerName = (c.collectionWorkerNameBn || '').toLowerCase();
        const areaName = (c.areaNameBn || '').toLowerCase();
        const period = (c.periodName || c.collectionPeriod || '').toLowerCase();
        return (
          personName.includes(q) ||
          code.includes(q) ||
          workerName.includes(q) ||
          areaName.includes(q) ||
          period.includes(q)
        );
      }

      return true;
    });
  }, [
    collections,
    myTasksOnly,
    currentWorkerMatch,
    selectedWorkerFilter,
    selectedAreaFilter,
    dateFilter,
    statusFilter,
    searchQuery,
    todayStr,
    tomorrowStr,
  ]);

  // Helper to get worker statistics
  const getWorkerStats = (workerId: string) => {
    const workerCols = collections.filter((c) => c.collectionWorkerId === workerId);
    const assigned = workerCols.length;
    const pending = workerCols.filter((c) => c.status === 'PENDING' || c.status === 'SCHEDULED').length;
    const partial = workerCols.filter((c) => c.status === 'PARTIALLY_COLLECTED').length;
    const collected = workerCols.filter((c) => c.status === 'COLLECTED').length;
    const notCollected = workerCols.filter((c) => c.status === 'NOT_COLLECTED').length;
    const plannedTk = workerCols.reduce((sum, c) => sum + (c.plannedAmount || 0), 0);
    const collectedTk = workerCols.reduce((sum, c) => sum + (c.collectedAmount || 0), 0);
    const remainingTk = Math.max(0, plannedTk - collectedTk);
    return { assigned, pending, partial, collected, notCollected, plannedTk, collectedTk, remainingTk };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-siliguri">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {isBn ? 'সংগৃহীত' : 'Collected'}
          </span>
        );
      case 'PARTIALLY_COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-siliguri">
            <Clock className="w-3 h-3 mr-1" />
            {isBn ? 'আংশিক সংগৃহীত' : 'Partial'}
          </span>
        );
      case 'PENDING':
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-siliguri">
            <Clock className="w-3 h-3 mr-1" />
            {isBn ? 'অপেক্ষমাণ' : 'Pending'}
          </span>
        );
      case 'NOT_COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-siliguri">
            <AlertCircle className="w-3 h-3 mr-1" />
            {isBn ? 'সংগ্রহ হয়নি' : 'Not Collected'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-siliguri">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Operational Summary Dashboard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Today's Tasks */}
        <div className="p-3.5 bg-linear-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 font-siliguri">
              {isBn ? 'আজকের কাজ' : "Today's Tasks"}
            </span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-950 font-baloo mt-1">
            {isBn ? toBanglaNumber(todayTasksCount) : todayTasksCount}
          </div>
          <div className="text-[10px] text-emerald-700 font-tiro mt-0.5">
            {isBn ? 'আজকের নির্ধারিত তারিখ' : 'Scheduled today'}
          </div>
        </div>

        {/* Pending */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900 font-siliguri">
              {isBn ? 'অপেক্ষমাণ' : 'Pending'}
            </span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-950 font-baloo mt-1">
            {isBn ? toBanglaNumber(pendingTasksCount) : pendingTasksCount}
          </div>
          <div className="text-[10px] text-blue-700 font-tiro mt-0.5">
            {isBn ? 'সংগ্রহের অপেক্ষায়' : 'Awaiting collection'}
          </div>
        </div>

        {/* Partial */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 font-siliguri">
              {isBn ? 'আংশিক সংগৃহীত' : 'Partial'}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-950 font-baloo mt-1">
            {isBn ? toBanglaNumber(partialTasksCount) : partialTasksCount}
          </div>
          <div className="text-[10px] text-amber-700 font-tiro mt-0.5">
            {isBn ? 'অংশবিশেষ জমা' : 'Partially paid'}
          </div>
        </div>

        {/* Collected */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 font-siliguri">
              {isBn ? 'সংগৃহীত' : 'Collected'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-950 font-baloo mt-1">
            {isBn ? toBanglaNumber(collectedTasksCount) : collectedTasksCount}
          </div>
          <div className="text-[10px] text-emerald-700 font-tiro mt-0.5">
            {isBn ? 'সম্পূর্ণ সংগৃহীত' : 'Completed tasks'}
          </div>
        </div>

        {/* Planned Tk */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="text-xs font-semibold text-slate-600 font-siliguri">
            {isBn ? 'মোট নির্ধারিত' : 'Total Planned'}
          </div>
          <div className="text-base font-bold text-slate-900 font-baloo mt-1">
            {formatCurrency(totalPlannedTk, isBn)}
          </div>
          <div className="text-[10px] text-slate-500 font-tiro mt-0.5">
            {isBn ? 'পরিকল্পিত সংগ্রহ' : 'Operational plan'}
          </div>
        </div>

        {/* Collected Tk */}
        <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl">
          <div className="text-xs font-semibold text-teal-900 font-siliguri">
            {isBn ? 'মোট সংগৃহীত' : 'Total Collected'}
          </div>
          <div className="text-base font-bold text-teal-950 font-baloo mt-1">
            {formatCurrency(totalCollectedTk, isBn)}
          </div>
          <div className="text-[10px] text-teal-700 font-tiro mt-0.5">
            {isBn ? 'বাস্তব আদায়কৃত' : 'B5 receipts'}
          </div>
        </div>

        {/* Remaining Tk */}
        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl">
          <div className="text-xs font-semibold text-rose-900 font-siliguri">
            {isBn ? 'অবশিষ্ট সংগৃহীতব্য' : 'Remaining'}
          </div>
          <div className="text-base font-bold text-rose-950 font-baloo mt-1">
            {formatCurrency(totalRemainingTk, isBn)}
          </div>
          <div className="text-[10px] text-rose-700 font-tiro mt-0.5">
            {isBn ? 'মাঠ পর্যায়ে বাকি' : 'To be collected'}
          </div>
        </div>
      </div>

      {/* 2. My Responsibility Banner (If logged-in user is a worker) */}
      {currentWorkerMatch && (
        <div className="p-4 bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white border border-white/30 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold font-siliguri text-sm sm:text-base">
                  {isBn ? `আসসালামু আলাইকুম, ${currentWorkerMatch.name}` : `Welcome, ${currentWorkerMatch.name}`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-siliguri">
                  {isBn ? 'সংগ্রহকারী হিসেবে লগইন' : 'Assigned Worker'}
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-tiro mt-0.5">
                {isBn
                  ? `আপনার নামে বর্তমানে ${toBanglaNumber(myAssignedCollectionsCount)} টি অনুদান সংগ্রহ অপেক্ষমাণ রয়েছে।`
                  : `You have ${myAssignedCollectionsCount} pending collection tasks assigned.`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('TASKS');
                setMyTasksOnly(true);
                setSelectedWorkerFilter('ALL');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-siliguri font-bold transition-all shadow-2xs cursor-pointer ${
                myTasksOnly
                  ? 'bg-white text-emerald-900 ring-2 ring-emerald-300'
                  : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
              }`}
            >
              {isBn ? '📌 আমার দায়িত্বপ্রাপ্ত সংগ্রহসমূহ' : 'My Assigned Collections'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Navigation Sub-tabs & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('WORKERS');
                setMyTasksOnly(false);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-siliguri font-bold transition-all cursor-pointer ${
                activeTab === 'WORKERS'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users2 className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'সংগ্রহকারী তালিকা' : 'Workers Directory'}</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-baloo">
                {isBn ? toBanglaNumber(workers.length) : workers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TASKS')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-siliguri font-bold transition-all cursor-pointer ${
                activeTab === 'TASKS'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'নির্ধারিত সংগ্রহ ও অগ্রগতি' : 'Assigned Collections'}</span>
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-baloo">
                {isBn ? toBanglaNumber(collections.length) : collections.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('AREAS');
                setMyTasksOnly(false);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-siliguri font-bold transition-all cursor-pointer ${
                activeTab === 'AREAS'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'এলাকাভিত্তিক দায়িত্ব' : 'Area Distribution'}</span>
            </button>
          </div>

          {/* New Worker Button */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setWorkerToEdit(null);
                setIsFormModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-siliguri font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন সংগ্রহকারী নিয়োগ' : 'Assign New Worker'}</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'WORKERS'
                  ? isBn
                    ? 'সংগ্রহকারীর নাম, ফোন বা আইডি দিয়ে খুঁজুন...'
                    : 'Search workers...'
                  : isBn
                  ? 'দাতা, কোড, এলাকা বা সংগ্রহকারী খুঁজুন...'
                  : 'Search tasks...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-700 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Area Filter */}
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">{isBn ? 'সব এলাকা' : 'All Areas'}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nameBn || a.name}
                </option>
              ))}
            </select>

            {/* Worker Filter (in Tasks tab) */}
            {activeTab === 'TASKS' && (
              <>
                <select
                  value={myTasksOnly ? 'MY_TASKS' : selectedWorkerFilter}
                  onChange={(e) => {
                    if (e.target.value === 'MY_TASKS') {
                      setMyTasksOnly(true);
                      setSelectedWorkerFilter('ALL');
                    } else {
                      setMyTasksOnly(false);
                      setSelectedWorkerFilter(e.target.value);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  <option value="ALL">{isBn ? 'সব সংগ্রহকারী' : 'All Workers'}</option>
                  {currentWorkerMatch && (
                    <option value="MY_TASKS">{isBn ? '📌 আমার দায়িত্ব (My Assigned)' : 'My Assigned'}</option>
                  )}
                  <option value="UNASSIGNED">{isBn ? '⚠️ দায়িত্ব বণ্টনহীন' : 'Unassigned'}</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="ALL">{isBn ? 'সব তারিখ' : 'All Dates'}</option>
                  <option value="TODAY">{isBn ? 'আজকের কাজ' : 'Today'}</option>
                  <option value="TOMORROW">{isBn ? 'আগামীকালের কাজ' : 'Tomorrow'}</option>
                </select>
              </>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">{isBn ? 'সব স্ট্যাটাস' : 'All Status'}</option>
              <option value="PENDING">{isBn ? 'অপেক্ষমাণ' : 'Pending'}</option>
              <option value="PARTIAL">{isBn ? 'আংশিক সংগৃহীত' : 'Partial'}</option>
              <option value="COLLECTED">{isBn ? 'সংগৃহীত' : 'Collected'}</option>
              <option value="NOT_COLLECTED">{isBn ? 'সংগ্রহ হয়নি' : 'Not Collected'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: WORKERS DIRECTORY */}
      {activeTab === 'WORKERS' && (
        <div className="space-y-4">
          {filteredWorkers.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 font-siliguri">
                {isBn ? 'কোনো সংগ্রহকারী পাওয়া যায়নি' : 'No collection workers found'}
              </h3>
              <p className="text-xs text-slate-500 font-tiro max-w-sm mx-auto">
                {isBn
                  ? 'নতুন সংগ্রহকারী নিয়োগ করতে উপরের বোতামে ক্লিক করুন এবং বিদ্যমান মুসল্লি বা স্টাফকে দায়িত্ব দিন।'
                  : 'Click Assign New Worker above to assign existing musalli or staff.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map((worker) => {
                const stats = getWorkerStats(worker.id);
                const assignedAreaNames = (worker.areaIds || [])
                  .map((id) => areas.find((a) => a.id === id)?.nameBn || areas.find((a) => a.id === id)?.name)
                  .filter(Boolean);

                return (
                  <div
                    key={worker.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Top Row: Avatar & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold font-baloo text-base shrink-0">
                          {worker.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h3 className="text-sm font-bold text-slate-900 font-siliguri leading-snug">
                              {worker.name}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {worker.personId && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md font-siliguri">
                                {isBn ? '👤 মুসল্লি' : 'Musalli'}
                              </span>
                            )}
                            {worker.staffId && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded-md font-siliguri">
                                {isBn ? '👔 স্টাফ' : 'Staff'}
                              </span>
                            )}
                            {worker.committeeMemberId && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-teal-50 text-teal-700 rounded-md font-siliguri">
                                {isBn ? '🏛️ কমিটি' : 'Committee'}
                              </span>
                            )}
                            {worker.mobile && (
                              <span className="text-xs text-slate-500 font-baloo">
                                {worker.mobile}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-siliguri font-bold shrink-0 ${
                          worker.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {worker.status === 'ACTIVE' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                      </span>
                    </div>

                    {/* Assigned Areas Badges */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 font-siliguri flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>{isBn ? 'দায়িত্বপ্রাপ্ত এলাকা:' : 'Assigned Areas:'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignedAreaNames.length === 0 ? (
                          <span className="text-[11px] text-slate-400 font-tiro">
                            {isBn ? 'সার্বজনীন / অনির্ধারিত' : 'Unassigned'}
                          </span>
                        ) : (
                          assignedAreaNames.slice(0, 3).map((aName, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-md font-siliguri"
                            >
                              {aName}
                            </span>
                          ))
                        )}
                        {assignedAreaNames.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-baloo">
                            +{assignedAreaNames.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 font-tiro">{isBn ? 'মোট' : 'Total'}</div>
                        <div className="text-xs font-bold text-slate-800 font-baloo">
                          {isBn ? toBanglaNumber(stats.assigned) : stats.assigned}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-blue-600 font-tiro">{isBn ? 'অপেক্ষমাণ' : 'Pending'}</div>
                        <div className="text-xs font-bold text-blue-800 font-baloo">
                          {isBn ? toBanglaNumber(stats.pending) : stats.pending}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-amber-600 font-tiro">{isBn ? 'আংশিক' : 'Partial'}</div>
                        <div className="text-xs font-bold text-amber-800 font-baloo">
                          {isBn ? toBanglaNumber(stats.partial) : stats.partial}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-600 font-tiro">{isBn ? 'সংগৃহীত' : 'Done'}</div>
                        <div className="text-xs font-bold text-emerald-800 font-baloo">
                          {isBn ? toBanglaNumber(stats.collected) : stats.collected}
                        </div>
                      </div>
                    </div>

                    {/* Financial stats */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-tiro">
                      <span className="text-slate-500">
                        {isBn ? 'আদায়: ' : 'Collected: '}
                        <span className="font-bold text-emerald-700 font-baloo">
                          {formatCurrency(stats.collectedTk, isBn)}
                        </span>
                      </span>
                      <span className="text-slate-500">
                        {isBn ? 'অবশিষ্ট: ' : 'Remaining: '}
                        <span className="font-bold text-rose-700 font-baloo">
                          {formatCurrency(stats.remainingTk, isBn)}
                        </span>
                      </span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWorkerForDetail(worker);
                          setIsDetailModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-siliguri font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isBn ? 'বিস্তারিত' : 'Detail'}</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('TASKS');
                            setSelectedWorkerFilter(worker.id);
                            setMyTasksOnly(false);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-siliguri font-semibold rounded-lg transition-colors cursor-pointer"
                          title={isBn ? 'এই কর্মীর সংগ্রহ তালিকা দেখুন' : 'View Tasks'}
                        >
                          {isBn ? 'সংগ্রহ তালিকা' : 'Tasks'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWorkerToEdit(worker);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title={isBn ? 'সম্পাদনা' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWorkerForStatusToggle(worker);
                            setIsStatusModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            worker.status === 'ACTIVE'
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-rose-500 hover:bg-rose-50'
                          }`}
                          title={isBn ? 'অবস্থা পরিবর্তন' : 'Toggle Status'}
                        >
                          {worker.status === 'ACTIVE' ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
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

      {/* TAB 2: ASSIGNED TASKS & PROGRESS */}
      {activeTab === 'TASKS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-tiro">
            <span>
              {isBn
                ? `প্রদর্শিত হচ্ছে: ${toBanglaNumber(filteredTasks.length)} টি সংগ্রহ কার্যক্রম`
                : `Showing ${filteredTasks.length} collection tasks`}
            </span>
            {myTasksOnly && (
              <span className="text-emerald-700 font-bold font-siliguri bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {isBn ? '📌 আপনার নির্ধারিত তালিকা ফিল্টার করা আছে' : 'Filtered to your assignments'}
              </span>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 font-siliguri">
                  {isBn ? 'এই ফিল্টারে কোনো সংগ্রহ কার্যক্রম পাওয়া যায়নি' : 'No collection tasks found'}
                </h3>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const isFullyCollected = task.status === 'COLLECTED';
                  const assignedWorker = workers.find((w) => w.id === task.collectionWorkerId);

                  return (
                    <div
                      key={task.id}
                      className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Task Identity & Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 font-siliguri">
                            {task.personNameBn || 'দাতা'}
                          </span>
                          {task.personCode && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md font-baloo">
                              {task.personCode}
                            </span>
                          )}
                          {getStatusBadge(task.status)}
                          {task.collectionCode && (
                            <span className="text-[10px] text-slate-400 font-baloo">
                              #{task.collectionCode}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-tiro">
                          <span className="text-emerald-800 font-medium">
                            {isBn ? 'পিরিয়ড: ' : 'Period: '}
                            <span className="font-baloo">{task.periodName || task.collectionPeriod}</span>
                          </span>

                          {task.areaNameBn && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="font-siliguri">{task.areaNameBn}</span>
                            </span>
                          )}

                          <span className="flex items-center space-x-1">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span className="font-siliguri font-semibold text-slate-700">
                              {task.collectionWorkerNameBn ||
                                (assignedWorker ? assignedWorker.name : isBn ? 'দায়িত্বহীন' : 'Unassigned')}
                            </span>
                          </span>

                          {task.scheduledDate && (
                            <span className="flex items-center space-x-1 text-slate-500">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="font-baloo">{task.scheduledDate}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Planned vs Collected & Action Trigger */}
                      <div className="flex items-center justify-between md:justify-end space-x-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 font-tiro">
                            {isBn ? 'পরিকল্পিত: ' : 'Planned: '}
                            <span className="font-bold text-slate-900 font-baloo">
                              {formatCurrency(task.plannedAmount, isBn)}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-emerald-700 font-baloo">
                            {isBn ? 'সংগৃহীত: ' : 'Collected: '}
                            {formatCurrency(task.collectedAmount || 0, isBn)}
                          </div>
                        </div>

                        {/* Canonical [সংগ্রহ করুন] Button linking to Unified Income Entry / B5 */}
                        {!isFullyCollected && task.status !== 'CANCELLED' ? (
                          <button
                            type="button"
                            onClick={() => onCollectDonation(task)}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-siliguri font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{isBn ? 'সংগ্রহ করুন' : 'Collect'}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-siliguri">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isBn ? 'সম্পন্ন' : 'Completed'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AREA-WISE DISTRIBUTION */}
      {activeTab === 'AREAS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => {
            const areaWorkers = workers.filter((w) => w.areaIds && w.areaIds.includes(area.id));
            const areaCollections = collections.filter((c) => c.areaId === area.id);
            const areaPlanned = areaCollections.reduce((sum, c) => sum + (c.plannedAmount || 0), 0);
            const areaCollected = areaCollections.reduce((sum, c) => sum + (c.collectedAmount || 0), 0);
            const progressPercent = areaPlanned > 0 ? Math.round((areaCollected / areaPlanned) * 100) : 0;

            return (
              <div
                key={area.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 font-siliguri">
                        {area.nameBn || area.name}
                      </h3>
                    </div>
                    {area.code && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-baloo">
                        {area.code}
                      </span>
                    )}
                  </div>

                  {/* Assigned Workers in this area */}
                  <div className="mt-3 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500 font-siliguri">
                      {isBn ? 'নিযুক্ত কর্মীগণ:' : 'Assigned Workers:'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {areaWorkers.length === 0 ? (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-tiro">
                          {isBn ? 'কোনো কর্মী নিযুক্ত নেই' : 'No worker assigned'}
                        </span>
                      ) : (
                        areaWorkers.map((w) => (
                          <span
                            key={w.id}
                            className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-siliguri font-semibold"
                          >
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>{w.name}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-tiro">
                    <span className="text-slate-500">{isBn ? 'সংগ্রহ অগ্রগতি:' : 'Progress:'}</span>
                    <span className="font-bold text-emerald-800 font-baloo">
                      {isBn ? `${toBanglaNumber(progressPercent)}%` : `${progressPercent}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-baloo pt-1 text-slate-600">
                    <span>{formatCurrency(areaCollected, isBn)}</span>
                    <span className="text-slate-400">/ {formatCurrency(areaPlanned, isBn)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CollectionWorkerFormModal
        isOpen={isFormModalOpen}
        workerToEdit={workerToEdit}
        areas={areas}
        persons={persons}
        staff={staffList}
        committeeMembers={committeeList}
        existingWorkers={workers}
        language={language}
        onClose={() => {
          setIsFormModalOpen(false);
          setWorkerToEdit(null);
        }}
        onSuccess={onRefresh}
      />

      <CollectionWorkerDetailModal
        isOpen={isDetailModalOpen}
        worker={selectedWorkerForDetail}
        collections={collections}
        plans={plans}
        persons={persons}
        areas={areas}
        donations={donations}
        language={language}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedWorkerForDetail(null);
        }}
        onEdit={(w) => {
          setIsDetailModalOpen(false);
          setWorkerToEdit(w);
          setIsFormModalOpen(true);
        }}
        onToggleStatus={(w) => {
          setIsDetailModalOpen(false);
          setWorkerForStatusToggle(w);
          setIsStatusModalOpen(true);
        }}
        onCollectDonation={onCollectDonation}
      />

      <CollectionWorkerStatusModal
        isOpen={isStatusModalOpen}
        worker={workerForStatusToggle}
        language={language}
        onClose={() => {
          setIsStatusModalOpen(false);
          setWorkerForStatusToggle(null);
        }}
        onSuccess={onRefresh}
      />
    </div>
  );
};

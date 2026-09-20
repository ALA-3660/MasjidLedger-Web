import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Home,
  MapPin,
  HeartHandshake,
  Briefcase,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  XCircle,
  ChevronDown,
  Eye,
  Edit,
  ArrowUpDown,
  RefreshCw,
  Info,
  ShieldCheck,
  Sparkles,
  Layers,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DonationCollection,
  DonationPlan,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  CollectionStatus,
  Donation,
  User as AuthUser,
  Mosque,
} from '../../types';
import { Language, toBanglaNumber, formatDate } from '../../lib/i18n';
import { api } from '../../lib/api';
import { DonationCollectionFormModal } from './DonationCollectionFormModal';
import { DonationCollectionDetailModal } from './DonationCollectionDetailModal';
import { DonationCollectionStatusModal } from './DonationCollectionStatusModal';

interface DonationCollectionManagementSectionProps {
  collections: DonationCollection[];
  plans: DonationPlan[];
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  collectionWorkers: CollectionWorker[];
  donations?: Donation[];
  currentMosque?: Mosque | null;
  currentUser?: AuthUser | null;
  language?: Language;
  onRefresh: () => Promise<void>;
  onCollectDonation?: (personId?: string, planId?: string, collection?: DonationCollection) => void;
  loading?: boolean;
}

type QuickFilterType =
  | 'ALL'
  | 'TODAY'
  | 'TOMORROW'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'PENDING'
  | 'PARTIALLY'
  | 'NOT_COLLECTED'
  | 'COLLECTED';

export const DonationCollectionManagementSection: React.FC<DonationCollectionManagementSectionProps> = ({
  collections,
  plans,
  persons,
  families,
  areas,
  collectionWorkers,
  donations = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onRefresh,
  onCollectDonation,
  loading = false,
}) => {
  const isBn = language === 'bn';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [familyFilter, setFamilyFilter] = useState<string>('ALL');
  const [personFilter, setPersonFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [workerFilter, setWorkerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');

  // Sorting
  const [sortBy, setSortBy] = useState<'DATE' | 'PERSON' | 'AREA' | 'FAMILY' | 'AMOUNT' | 'PERIOD' | 'CREATED'>('CREATED');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [collectionToEdit, setCollectionToEdit] = useState<DonationCollection | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedForDetail, setSelectedForDetail] = useState<DonationCollection | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [selectedForStatus, setSelectedForStatus] = useState<DonationCollection | null>(null);

  // Helper date calculations for quick filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Distinct Periods for dropdown
  const distinctPeriods = useMemo(() => {
    const set = new Set<string>();
    collections.forEach((c) => {
      if (c.collectionPeriod) set.add(c.collectionPeriod);
    });
    return Array.from(set);
  }, [collections]);

  // Operational Summary Metrics (Strictly non-financial)
  const metrics = useMemo(() => {
    let todayScheduled = 0;
    let pendingCount = 0;
    let partiallyCollectedCount = 0;
    let collectedCount = 0;
    let notCollectedCount = 0;

    collections.forEach((c) => {
      if (c.scheduledDate === todayStr && c.status !== 'CANCELLED') {
        todayScheduled++;
      }
      if (c.status === 'PENDING') pendingCount++;
      if (c.status === 'PARTIALLY_COLLECTED') partiallyCollectedCount++;
      if (c.status === 'COLLECTED') collectedCount++;
      if (c.status === 'NOT_COLLECTED') notCollectedCount++;
    });

    return {
      total: collections.length,
      todayScheduled,
      pendingCount,
      partiallyCollectedCount,
      collectedCount,
      notCollectedCount,
    };
  }, [collections, todayStr]);

  // Filtered Families by selected area
  const selectableFamilies = useMemo(() => {
    if (areaFilter === 'ALL') return families;
    return families.filter((f) => f.areaId === areaFilter);
  }, [families, areaFilter]);

  // Filtered & Sorted Data
  const filteredCollections = useMemo(() => {
    return collections
      .filter((c) => {
        // Quick Filters
        if (quickFilter === 'TODAY' && c.scheduledDate !== todayStr) return false;
        if (quickFilter === 'TOMORROW' && c.scheduledDate !== tomorrowStr) return false;
        if (quickFilter === 'PENDING' && c.status !== 'PENDING') return false;
        if (quickFilter === 'PARTIALLY' && c.status !== 'PARTIALLY_COLLECTED') return false;
        if (quickFilter === 'NOT_COLLECTED' && c.status !== 'NOT_COLLECTED') return false;
        if (quickFilter === 'COLLECTED' && c.status !== 'COLLECTED') return false;
        if (quickFilter === 'THIS_MONTH') {
          const now = new Date();
          const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          if (!c.collectionPeriod.includes(curMonthStr) && !c.collectionPeriod.includes(String(now.getFullYear()))) {
            // Also match if scheduledDate is in current month
            if (!c.scheduledDate?.startsWith(curMonthStr)) return false;
          }
        }
        if (quickFilter === 'THIS_WEEK') {
          if (!c.scheduledDate) return false;
          const target = new Date(c.scheduledDate);
          const now = new Date();
          const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
          const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6));
          if (target < firstDay || target > lastDay) return false;
        }

        // Advanced Filters
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        if (areaFilter !== 'ALL' && c.areaId !== areaFilter) return false;
        if (familyFilter !== 'ALL' && c.familyId !== familyFilter) return false;
        if (personFilter !== 'ALL' && c.personId !== personFilter) return false;
        if (planFilter !== 'ALL' && c.donationPlanId !== planFilter) return false;
        if (workerFilter !== 'ALL' && c.collectionWorkerId !== workerFilter) return false;
        if (periodFilter !== 'ALL' && c.collectionPeriod !== periodFilter) return false;

        // Search Query (ID, Person, Family, Area, Plan, Worker, Mobile)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const person = persons.find((p) => p.id === c.personId);
          const family = families.find((f) => f.id === c.familyId || f.id === person?.familyId);
          const area = areas.find((a) => a.id === c.areaId || a.id === person?.areaId);
          const worker = collectionWorkers.find((w) => w.id === c.collectionWorkerId);

          const matchesId = c.id.toLowerCase().includes(q);
          const matchesPlanId = c.donationPlanId.toLowerCase().includes(q);
          const matchesPeriod = c.collectionPeriod.toLowerCase().includes(q);
          const matchesPerson =
            (c.personNameBn && c.personNameBn.toLowerCase().includes(q)) ||
            (person?.fullName && person.fullName.toLowerCase().includes(q)) ||
            (person?.personCode && person.personCode.toLowerCase().includes(q)) ||
            (person?.mobile && person.mobile.includes(q));
          const matchesFamily =
            (c.familyNameBn && c.familyNameBn.toLowerCase().includes(q)) ||
            (family?.name && family.name.toLowerCase().includes(q));
          const matchesArea =
            (c.areaNameBn && c.areaNameBn.toLowerCase().includes(q)) ||
            (area?.name && area.name.toLowerCase().includes(q));
          const matchesWorker =
            (c.collectionWorkerNameBn && c.collectionWorkerNameBn.toLowerCase().includes(q)) ||
            (worker?.name && worker.name.toLowerCase().includes(q));

          if (
            !matchesId &&
            !matchesPlanId &&
            !matchesPeriod &&
            !matchesPerson &&
            !matchesFamily &&
            !matchesArea &&
            !matchesWorker
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortBy === 'DATE') {
          valA = a.scheduledDate || '';
          valB = b.scheduledDate || '';
        } else if (sortBy === 'PERSON') {
          valA = a.personNameBn || a.personId;
          valB = b.personNameBn || b.personId;
        } else if (sortBy === 'AREA') {
          valA = a.areaNameBn || a.areaId || '';
          valB = b.areaNameBn || b.areaId || '';
        } else if (sortBy === 'FAMILY') {
          valA = a.familyNameBn || a.familyId || '';
          valB = b.familyNameBn || b.familyId || '';
        } else if (sortBy === 'AMOUNT') {
          valA = a.plannedAmount;
          valB = b.plannedAmount;
        } else if (sortBy === 'PERIOD') {
          valA = a.collectionPeriod;
          valB = b.collectionPeriod;
        } else {
          // CREATED
          valA = a.createdAt || '';
          valB = b.createdAt || '';
        }

        if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
        if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
        return 0;
      });
  }, [
    collections,
    quickFilter,
    todayStr,
    tomorrowStr,
    statusFilter,
    areaFilter,
    familyFilter,
    personFilter,
    planFilter,
    workerFilter,
    periodFilter,
    searchQuery,
    persons,
    families,
    areas,
    collectionWorkers,
    sortBy,
    sortOrder,
  ]);

  // Handlers
  const handleSaveCollection = async (data: Partial<DonationCollection>) => {
    if (collectionToEdit) {
      await api.updateDonationCollection(collectionToEdit.id, data);
    } else {
      await api.createDonationCollection(data);
    }
    await onRefresh();
  };

  const handleUpdateStatus = async (id: string, newStatus: CollectionStatus, note?: string) => {
    await api.updateDonationCollectionStatus(id, newStatus, note);
    await onRefresh();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setQuickFilter('ALL');
    setAreaFilter('ALL');
    setFamilyFilter('ALL');
    setPersonFilter('ALL');
    setPlanFilter('ALL');
    setWorkerFilter('ALL');
    setStatusFilter('ALL');
    setPeriodFilter('ALL');
  };

  const getStatusBadge = (status: CollectionStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return {
          label: isBn ? 'নির্ধারিত' : 'Scheduled',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'PENDING':
        return {
          label: isBn ? 'অপেক্ষমাণ' : 'Pending',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'PARTIALLY_COLLECTED':
        return {
          label: isBn ? 'আংশিক সংগৃহীত' : 'Partially Collected',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'COLLECTED':
        return {
          label: isBn ? 'সংগৃহীত' : 'Collected',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'NOT_COLLECTED':
        return {
          label: isBn ? 'সংগ্রহ হয়নি' : 'Not Collected',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'PAUSED':
        return {
          label: isBn ? 'স্থগিত' : 'Paused',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
        };
      case 'CANCELLED':
        return {
          label: isBn ? 'বাতিল' : 'Cancelled',
          bg: 'bg-slate-200 text-slate-600 border-slate-300',
          dot: 'bg-slate-400',
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900 font-siliguri">
                {isBn ? 'অনুদান সংগ্রহ' : 'Donation Collections'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-baloo">
                B6-B
              </span>
            </div>
            <p className="text-xs text-slate-500 font-tiro mt-0.5">
              {isBn
                ? 'পরিকল্পিত অনুদান সংগ্রহের কার্যক্রম, সময়সূচি ও অগ্রগতি পরিচালনা করুন।'
                : 'Manage planned donation collection schedules, activities, and operational execution.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onRefresh()}
            disabled={loading}
            title={isBn ? 'রিফ্রেশ করুন' : 'Refresh'}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setCollectionToEdit(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold font-siliguri rounded-xl shadow-xs transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? '+ নতুন সংগ্রহ কার্যক্রম' : '+ New Collection'}</span>
          </button>
        </div>
      </div>

      {/* 2. Operational Summary Cards (Strictly Non-Financial) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-siliguri font-semibold">
            <span>{isBn ? 'মোট সংগ্রহ' : 'Total'}</span>
            <Inbox className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-800 font-baloo">
            {toBanglaNumber(metrics.total)} <span className="text-xs font-normal text-slate-400 font-siliguri">টি</span>
          </div>
        </div>

        {/* Today's Scheduled */}
        <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-blue-700 text-[11px] font-siliguri font-semibold">
            <span>{isBn ? 'আজকের নির্ধারিত' : 'Today'}</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-blue-900 font-baloo">
            {toBanglaNumber(metrics.todayScheduled)} <span className="text-xs font-normal text-blue-600 font-siliguri">টি</span>
          </div>
        </div>

        {/* Pending */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-[11px] font-siliguri font-semibold">
            <span>{isBn ? 'অপেক্ষমাণ' : 'Pending'}</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-900 font-baloo">
            {toBanglaNumber(metrics.pendingCount)} <span className="text-xs font-normal text-amber-600 font-siliguri">টি</span>
          </div>
        </div>

        {/* Partially Collected */}
        <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-purple-700 text-[11px] font-siliguri font-semibold">
            <span>{isBn ? 'আংশিক সংগৃহীত' : 'Partially'}</span>
            <Coins className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-purple-900 font-baloo">
            {toBanglaNumber(metrics.partiallyCollectedCount)} <span className="text-xs font-normal text-purple-600 font-siliguri">টি</span>
          </div>
        </div>

        {/* Collected */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-[11px] font-siliguri font-semibold">
            <span>{isBn ? 'সংগৃহীত' : 'Collected'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-emerald-900 font-baloo">
            {toBanglaNumber(metrics.collectedCount)} <span className="text-xs font-normal text-emerald-600 font-siliguri">টি</span>
          </div>
        </div>

        {/* Not Collected */}
        <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-700 text-[11px] font-siliguri font-semibold">
            <span>{isBn ? 'সংগ্রহ হয়নি' : 'Not Collected'}</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-900 font-baloo">
            {toBanglaNumber(metrics.notCollectedCount)} <span className="text-xs font-normal text-rose-600 font-siliguri">টি</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Filters Bar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', labelBn: 'সব দেখুন', labelEn: 'All' },
          { id: 'TODAY', labelBn: 'আজকের সংগ্রহ', labelEn: 'Today' },
          { id: 'TOMORROW', labelBn: 'আগামীকাল', labelEn: 'Tomorrow' },
          { id: 'THIS_WEEK', labelBn: 'এই সপ্তাহ', labelEn: 'This Week' },
          { id: 'THIS_MONTH', labelBn: 'এই মাস', labelEn: 'This Month' },
          { id: 'PENDING', labelBn: 'অপেক্ষমাণ', labelEn: 'Pending' },
          { id: 'PARTIALLY', labelBn: 'আংশিক', labelEn: 'Partial' },
          { id: 'NOT_COLLECTED', labelBn: 'সংগ্রহ হয়নি', labelEn: 'Not Collected' },
          { id: 'COLLECTED', labelBn: 'সংগৃহীত', labelEn: 'Collected' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setQuickFilter(item.id as QuickFilterType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-siliguri font-semibold whitespace-nowrap transition-colors ${
              quickFilter === item.id
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {isBn ? item.labelBn : item.labelEn}
          </button>
        ))}
      </div>

      {/* 4. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isBn
                  ? 'আইডি, ব্যক্তি, মোবাইল, পরিবার, এলাকা বা প্ল্যান দিয়ে খুঁজুন...'
                  : 'Search by ID, Person, Mobile, Family, Area, Plan...'
              }
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-siliguri text-slate-700 font-semibold focus:outline-hidden"
              >
                <option value="CREATED">{isBn ? 'তৈরির তারিখ' : 'Created Date'}</option>
                <option value="DATE">{isBn ? 'নির্ধারিত তারিখ' : 'Scheduled Date'}</option>
                <option value="PERSON">{isBn ? 'ব্যক্তি' : 'Person'}</option>
                <option value="AREA">{isBn ? 'এলাকা' : 'Area'}</option>
                <option value="FAMILY">{isBn ? 'পরিবার' : 'Family'}</option>
                <option value="AMOUNT">{isBn ? 'পরিকল্পিত পরিমাণ' : 'Planned Amount'}</option>
                <option value="PERIOD">{isBn ? 'সংগ্রহের সময়কাল' : 'Collection Period'}</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-1 font-baloo"
              >
                {sortOrder === 'ASC' ? '↑' : '↓'}
              </button>
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 rounded-xl border text-xs font-siliguri font-semibold inline-flex items-center space-x-1.5 transition-colors ${
                showAdvancedFilters || areaFilter !== 'ALL' || statusFilter !== 'ALL' || workerFilter !== 'ALL'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isBn ? 'ফিল্টার' : 'Filters'}</span>
              {(areaFilter !== 'ALL' || statusFilter !== 'ALL' || workerFilter !== 'ALL' || periodFilter !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 font-siliguri block">
                {isBn ? 'অবস্থা' : 'Status'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700"
              >
                <option value="ALL">{isBn ? 'সব অবস্থা' : 'All Status'}</option>
                <option value="SCHEDULED">{isBn ? 'নির্ধারিত' : 'Scheduled'}</option>
                <option value="PENDING">{isBn ? 'অপেক্ষমাণ' : 'Pending'}</option>
                <option value="PARTIALLY_COLLECTED">{isBn ? 'আংশিক সংগৃহীত' : 'Partially Collected'}</option>
                <option value="COLLECTED">{isBn ? 'সংগৃহীত' : 'Collected'}</option>
                <option value="NOT_COLLECTED">{isBn ? 'সংগ্রহ হয়নি' : 'Not Collected'}</option>
                <option value="PAUSED">{isBn ? 'স্থগিত' : 'Paused'}</option>
                <option value="CANCELLED">{isBn ? 'বাতিল' : 'Cancelled'}</option>
              </select>
            </div>

            {/* Area Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 font-siliguri block">
                {isBn ? 'এলাকা' : 'Area'}
              </label>
              <select
                value={areaFilter}
                onChange={(e) => {
                  setAreaFilter(e.target.value);
                  setFamilyFilter('ALL');
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700"
              >
                <option value="ALL">{isBn ? 'সব এলাকা' : 'All Areas'}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Family Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 font-siliguri block">
                {isBn ? 'পরিবার' : 'Family'}
              </label>
              <select
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700"
              >
                <option value="ALL">{isBn ? 'সব পরিবার' : 'All Families'}</option>
                {selectableFamilies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Worker Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 font-siliguri block">
                {isBn ? 'সংগ্রহকারী' : 'Worker'}
              </label>
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700"
              >
                <option value="ALL">{isBn ? 'সব সংগ্রহকারী' : 'All Workers'}</option>
                {collectionWorkers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 font-siliguri block">
                {isBn ? 'সংগ্রহের সময়কাল' : 'Period'}
              </label>
              <div className="flex items-center space-x-1">
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-baloo text-slate-700"
                >
                  <option value="ALL">{isBn ? 'সব মেয়াদ' : 'All Periods'}</option>
                  {distinctPeriods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {(areaFilter !== 'ALL' ||
                  familyFilter !== 'ALL' ||
                  statusFilter !== 'ALL' ||
                  workerFilter !== 'ALL' ||
                  periodFilter !== 'ALL') && (
                  <button
                    onClick={handleResetFilters}
                    title={isBn ? 'ফিল্টার মুছুন' : 'Reset filters'}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Collection List / Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-tiro">{isBn ? 'তথ্য লোড হচ্ছে...' : 'Loading collections...'}</p>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100">
            <Inbox className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 font-siliguri">
              {isBn ? 'এখনও কোনো অনুদান সংগ্রহ কার্যক্রম তৈরি হয়নি।' : 'No collection activities found.'}
            </h3>
            <p className="text-xs text-slate-500 font-tiro max-w-sm mx-auto">
              {searchQuery || quickFilter !== 'ALL' || statusFilter !== 'ALL'
                ? isBn
                  ? 'আপনার ফিল্টারের সাথে কোনো রেকর্ড মেলেনি। ফিল্টার রিসেট করে আবার চেষ্টা করুন।'
                  : 'No records matched your active filters.'
                : isBn
                ? 'সক্রিয় দান পরিকল্পনা থেকে নতুন সংগ্রহ কার্যক্রম নির্ধারণ শুরু করুন।'
                : 'Start scheduling collection activities from active donation plans.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                setCollectionToEdit(null);
                setIsFormOpen(true);
              }}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold font-siliguri rounded-xl shadow-xs transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? '+ নতুন সংগ্রহ কার্যক্রম' : '+ New Collection'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Professional Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 font-siliguri uppercase tracking-wider">
                    <th className="py-3.5 px-4">আইডি / কোড</th>
                    <th className="py-3.5 px-4">ব্যক্তি ও পরিচিতি</th>
                    <th className="py-3.5 px-3">পরিবার / এলাকা</th>
                    <th className="py-3.5 px-3">পরিকল্পনা</th>
                    <th className="py-3.5 px-3">সময়কাল ও তারিখ</th>
                    <th className="py-3.5 px-3 text-right">পরিকল্পিত পরিমাণ</th>
                    <th className="py-3.5 px-3 text-right">সংগৃহীত পরিমাণ</th>
                    <th className="py-3.5 px-3">সংগ্রহের অবস্থা</th>
                    <th className="py-3.5 px-3">সংগ্রহকারী</th>
                    <th className="py-3.5 px-4 text-center">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-tiro">
                  {filteredCollections.map((c) => {
                    const person = persons.find((p) => p.id === c.personId);
                    const family = families.find((f) => f.id === c.familyId || f.id === person?.familyId);
                    const area = areas.find((a) => a.id === c.areaId || a.id === person?.areaId);
                    const worker = collectionWorkers.find((w) => w.id === c.collectionWorkerId);
                    const plan = plans.find((p) => p.id === c.donationPlanId);
                    const statusObj = getStatusBadge(c.status);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* ID */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-baloo">
                            {c.id}
                          </span>
                        </td>

                        {/* Person */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 font-siliguri">
                            {c.personNameBn || person?.fullName || c.personId}
                          </div>
                          <div className="text-[11px] text-slate-400 font-baloo flex items-center space-x-1.5">
                            <span>{c.personCode || person?.personCode || c.personId}</span>
                            {person?.mobile && <span>• {toBanglaNumber(person.mobile)}</span>}
                          </div>
                        </td>

                        {/* Family / Area */}
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-slate-700 font-siliguri text-[11px]">
                            {c.familyNameBn || family?.name || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-siliguri">
                            {c.areaNameBn || area?.name || '-'}
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="py-3.5 px-3">
                          <span className="font-baloo font-semibold text-slate-700 text-[11px] block">
                            {c.donationPlanId}
                          </span>
                          <span className="text-[10px] text-slate-400 font-siliguri">
                            {plan?.planType === 'MONTHLY' ? 'মাসিক' : plan?.planType === 'YEARLY' ? 'বাৎসরিক' : 'এককালীন'}
                          </span>
                        </td>

                        {/* Period & Scheduled Date */}
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-800 font-baloo text-xs">
                            {c.collectionPeriod}
                          </div>
                          <div className="text-[11px] text-slate-400 font-baloo">
                            {c.scheduledDate ? formatDate(c.scheduledDate) : '-'}
                          </div>
                        </td>

                        {/* Planned Amount */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="font-bold text-slate-800 font-baloo text-xs">
                            ৳{toBanglaNumber(c.plannedAmount)}
                          </span>
                        </td>

                        {/* Collected Amount */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="font-bold text-emerald-700 font-baloo text-xs">
                            ৳{toBanglaNumber(c.collectedAmount || 0)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-siliguri border ${statusObj.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                            <span>{statusObj.label}</span>
                          </span>
                        </td>

                        {/* Worker */}
                        <td className="py-3.5 px-3 text-[11px] font-siliguri text-slate-600">
                          {c.collectionWorkerNameBn || worker?.name || (
                            <span className="text-slate-400 italic">নির্ধারিত নেই</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {c.status !== 'CANCELLED' && onCollectDonation && (
                              <button
                                onClick={() => onCollectDonation(c.personId, c.donationPlanId, c)}
                                title={isBn ? 'বাস্তব অনুদান সংগ্রহ করুন (B5)' : 'Collect Donation (B5)'}
                                className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/80 rounded-lg transition-colors bg-emerald-50 border border-emerald-200"
                              >
                                <Coins className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedForDetail(c);
                                setIsDetailOpen(true);
                              }}
                              title={isBn ? 'বিস্তারিত দেখুন' : 'View Details'}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedForStatus(c);
                                setIsStatusModalOpen(true);
                              }}
                              title={isBn ? 'অবস্থা পরিবর্তন' : 'Change Status'}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCollectionToEdit(c);
                                setIsFormOpen(true);
                              }}
                              title={isBn ? 'সম্পাদনা করুন' : 'Edit'}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Responsive Cards */}
          <div className="lg:hidden space-y-3">
            {filteredCollections.map((c) => {
              const person = persons.find((p) => p.id === c.personId);
              const family = families.find((f) => f.id === c.familyId || f.id === person?.familyId);
              const area = areas.find((a) => a.id === c.areaId || a.id === person?.areaId);
              const worker = collectionWorkers.find((w) => w.id === c.collectionWorkerId);
              const statusObj = getStatusBadge(c.status);

              return (
                <div
                  key={c.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono font-bold text-emerald-800 text-xs bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-baloo">
                      {c.id}
                    </span>
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-siliguri border ${statusObj.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                      <span>{statusObj.label}</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 font-siliguri text-sm">
                      {c.personNameBn || person?.fullName || c.personId}
                    </div>
                    <div className="text-xs text-slate-500 font-tiro flex flex-wrap gap-x-3 gap-y-1">
                      {family?.name && <span>পরিবার: {family.name}</span>}
                      {area?.name && <span>এলাকা: {area.name}</span>}
                      {c.collectionPeriod && <span className="font-baloo">মেয়াদ: {c.collectionPeriod}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs font-baloo">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-tiro">পরিকল্পিত পরিমাণ</span>
                      <span className="font-bold text-slate-800">৳{toBanglaNumber(c.plannedAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-tiro">সংগৃহীত পরিমাণ</span>
                      <span className="font-bold text-emerald-700">৳{toBanglaNumber(c.collectedAmount || 0)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="text-slate-500 font-siliguri text-[11px]">
                      সংগ্রহকারী: {c.collectionWorkerNameBn || worker?.name || 'নির্ধারিত নেই'}
                    </div>

                    <div className="flex items-center space-x-1">
                      {c.status !== 'CANCELLED' && onCollectDonation && (
                        <button
                          onClick={() => onCollectDonation(c.personId, c.donationPlanId, c)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 rounded-lg border border-emerald-300 font-siliguri flex items-center space-x-1"
                        >
                          <Coins className="w-3 h-3 text-emerald-700" />
                          <span>সংগ্রহ</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedForDetail(c);
                          setIsDetailOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 font-siliguri"
                      >
                        দেখুন
                      </button>
                      <button
                        onClick={() => {
                          setSelectedForStatus(c);
                          setIsStatusModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-200 font-siliguri"
                      >
                        অবস্থা
                      </button>
                      <button
                        onClick={() => {
                          setCollectionToEdit(c);
                          setIsFormOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 rounded-lg border border-slate-200 font-siliguri"
                      >
                        সম্পাদনা
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* List Footer Counter */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-baloo px-2 pt-1">
            <span>
              {isBn
                ? `প্রদর্শিত হচ্ছে: ${toBanglaNumber(filteredCollections.length)} টি রেকর্ড (সর্বমোট ${toBanglaNumber(
                    collections.length
                  )} টির মধ্যে)`
                : `Showing ${filteredCollections.length} of ${collections.length} records`}
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      <DonationCollectionFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCollectionToEdit(null);
        }}
        onSave={handleSaveCollection}
        collectionToEdit={collectionToEdit}
        plans={plans}
        persons={persons}
        families={families}
        areas={areas}
        collectionWorkers={collectionWorkers}
        language={language}
      />

      <DonationCollectionDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedForDetail(null);
        }}
        collection={selectedForDetail}
        plans={plans}
        persons={persons}
        families={families}
        areas={areas}
        collectionWorkers={collectionWorkers}
        donations={donations}
        onCollectDonation={(col) => onCollectDonation?.(col.personId, col.donationPlanId, col)}
        onOpenEdit={(col) => {
          setCollectionToEdit(col);
          setIsFormOpen(true);
        }}
        onOpenStatusChange={(col) => {
          setSelectedForStatus(col);
          setIsStatusModalOpen(true);
        }}
        language={language}
      />

      <DonationCollectionStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedForStatus(null);
        }}
        collection={selectedForStatus}
        onUpdateStatus={handleUpdateStatus}
        language={language}
      />
    </div>
  );
};

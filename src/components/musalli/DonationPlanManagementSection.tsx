import React, { useState, useMemo } from 'react';
import {
  HeartHandshake,
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Calendar,
  DollarSign,
  User,
  Briefcase,
  MapPin,
  Home,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ShieldCheck,
  Sparkles,
  Info,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import {
  DonationPlan,
  DonationPlanType,
  DonationPlanStatus,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  User as AuthUser,
  Mosque,
  Donation,
} from '../../types';
import { Language, toBanglaNumber, formatDate } from '../../lib/i18n';
import { api } from '../../lib/api';
import { DonationPlanFormModal } from './DonationPlanFormModal';
import { DonationPlanDetailModal } from './DonationPlanDetailModal';
import { DonationPlanStatusConfirmModal } from './DonationPlanStatusConfirmModal';
import { DonationPlanPrintModal } from './DonationPlanPrintModal';

interface DonationPlanManagementSectionProps {
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
  onReceiveDonation?: (personId: string, planId: string) => void;
  loading?: boolean;
}

export const DonationPlanManagementSection: React.FC<DonationPlanManagementSectionProps> = ({
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
  onReceiveDonation,
  loading = false,
}) => {
  const isBn = language === 'bn';

  // State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [collectionFilter, setCollectionFilter] = useState<string>('ALL');
  const [workerFilter, setWorkerFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'CODE' | 'PERSON' | 'AMOUNT' | 'DATE' | 'STATUS'>('DATE');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [planToEdit, setPlanToEdit] = useState<DonationPlan | null>(null);
  const [preselectedPersonId, setPreselectedPersonId] = useState<string>('');

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<DonationPlan | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusModalPlan, setStatusModalPlan] = useState<DonationPlan | null>(null);
  const [targetStatus, setTargetStatus] = useState<DonationPlanStatus>('ACTIVE');

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Permissions
  const canCreate =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('CREATE_DONATION_PLAN');
  const canEdit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('EDIT_DONATION_PLAN');
  const canDelete =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('DELETE_DONATION_PLAN');

  // Helpers
  const getPerson = (pid: string) => persons.find((p) => p.id === pid);
  const getFamily = (fid?: string) => families.find((f) => f.id === fid);
  const getArea = (aid?: string) => areas.find((a) => a.id === aid);
  const getWorker = (wid?: string) => collectionWorkers.find((w) => w.id === wid);

  // Filtering & Sorting
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const person = getPerson(p.personId);
      const fam = person?.familyId ? getFamily(person.familyId) : null;
      const ar = person?.areaId ? getArea(person.areaId) : fam?.areaId ? getArea(fam.areaId) : null;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (p.planCode || '').toLowerCase().includes(q);
        const nameMatch = (person?.fullName || '').toLowerCase().includes(q);
        const phoneMatch = (person?.mobile || '').includes(q);
        const pCodeMatch = (person?.personCode || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        const noteMatch = (p.notes || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !phoneMatch && !pCodeMatch && !descMatch && !noteMatch) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'ALL' && p.planType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // Area filter
      if (areaFilter !== 'ALL') {
        const personAreaId = person?.areaId || fam?.areaId;
        if (personAreaId !== areaFilter) {
          return false;
        }
      }

      // Collection required filter
      if (collectionFilter === 'REQUIRED' && !p.collectionRequired) return false;
      if (collectionFilter === 'DIRECT' && p.collectionRequired) return false;

      // Worker filter
      if (workerFilter !== 'ALL' && p.collectionWorkerId !== workerFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'CODE') {
        comparison = (a.planCode || '').localeCompare(b.planCode || '');
      } else if (sortBy === 'PERSON') {
        const nameA = getPerson(a.personId)?.fullName || '';
        const nameB = getPerson(b.personId)?.fullName || '';
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'AMOUNT') {
        const amtA = a.amount ?? a.plannedAmount ?? 0;
        const amtB = b.amount ?? b.plannedAmount ?? 0;
        comparison = amtA - amtB;
      } else if (sortBy === 'DATE') {
        comparison = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
      } else if (sortBy === 'STATUS') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'ASC' ? comparison : -comparison;
    });
  }, [
    plans,
    persons,
    families,
    areas,
    searchQuery,
    typeFilter,
    statusFilter,
    areaFilter,
    collectionFilter,
    workerFilter,
    sortBy,
    sortOrder,
  ]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let activeCount = 0;
    let pausedCount = 0;
    let completedCount = 0;
    let monthlyTotal = 0;
    let yearlyTotal = 0;
    let collectionRequiredCount = 0;

    plans.forEach((p) => {
      const amt = p.amount ?? p.plannedAmount ?? 0;
      if (p.status === 'ACTIVE') {
        activeCount++;
        if (p.planType === 'MONTHLY') monthlyTotal += amt;
        if (p.planType === 'YEARLY') yearlyTotal += amt;
        if (p.collectionRequired) collectionRequiredCount++;
      } else if (p.status === 'PAUSED') {
        pausedCount++;
      } else if (p.status === 'COMPLETED') {
        completedCount++;
      }
    });

    return {
      activeCount,
      pausedCount,
      completedCount,
      monthlyTotal,
      yearlyTotal,
      collectionRequiredCount,
      totalCount: plans.length,
    };
  }, [plans]);

  // Handlers
  const handleSavePlan = async (data: Partial<DonationPlan>) => {
    if (planToEdit) {
      await api.updateDonationPlan(planToEdit.id, data);
    } else {
      await api.createDonationPlan(data);
    }
    await onRefresh();
  };

  const handleStatusChange = async (planId: string, newStatus: DonationPlanStatus) => {
    await api.updateDonationPlanStatus(planId, newStatus);
    await onRefresh();
  };

  const handleDelete = async (plan: DonationPlan) => {
    if (!window.confirm(isBn ? 'আপনি কি নিশ্চিত যে এই দান পরিকল্পনাটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this donation plan?')) {
      return;
    }
    try {
      await api.deleteDonationPlan(plan.id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || (isBn ? 'মুছতে ব্যর্থ হয়েছে' : 'Failed to delete'));
    }
  };

  const handleOpenEdit = (plan: DonationPlan) => {
    setPlanToEdit(plan);
    setPreselectedPersonId(plan.personId);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (plan: DonationPlan) => {
    setSelectedPlanForDetail(plan);
    setIsDetailOpen(true);
  };

  const handleOpenStatusModal = (plan: DonationPlan, target: DonationPlanStatus) => {
    setStatusModalPlan(plan);
    setTargetStatus(target);
    setIsStatusModalOpen(true);
  };

  const exportCSV = () => {
    const headers = ['Plan Code', 'Musalli Name', 'Phone', 'Area', 'Family', 'Plan Type', 'Planned Amount', 'Start Date', 'End Date', 'Collection Required', 'Worker', 'Status'];
    const rows = filteredPlans.map((p) => {
      const person = getPerson(p.personId);
      const fam = person?.familyId ? getFamily(person.familyId) : null;
      const ar = person?.areaId ? getArea(person.areaId) : fam?.areaId ? getArea(fam.areaId) : null;
      const worker = p.collectionWorkerId ? getWorker(p.collectionWorkerId) : null;
      const amt = p.amount ?? p.plannedAmount ?? 0;
      return [
        `"${p.planCode || ''}"`,
        `"${person?.fullName || ''}"`,
        `"${person?.mobile || ''}"`,
        `"${ar?.name || ''}"`,
        `"${fam?.name || ''}"`,
        `"${p.planType}"`,
        amt,
        `"${p.startDate || ''}"`,
        `"${p.endDate || ''}"`,
        `"${p.collectionRequired ? 'YES' : 'NO'}"`,
        `"${worker?.name || ''}"`,
        `"${p.status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `donation_plans_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Analytical Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Plans */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <div className="text-[11px] font-medium text-emerald-800 font-tiro">
            {isBn ? 'সক্রিয় পরিকল্পনা' : 'Active Plans'}
          </div>
          <div className="text-xl font-bold text-emerald-950 font-baloo mt-0.5">
            {isBn ? toBanglaNumber(metrics.activeCount) : metrics.activeCount}
            <span className="text-xs font-normal text-emerald-700 font-tiro ml-1">টি</span>
          </div>
        </div>

        {/* Monthly Pledged Total */}
        <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl">
          <div className="text-[11px] font-medium text-teal-800 font-tiro">
            {isBn ? 'মাসিক প্রতিশ্রুতি (মোট)' : 'Monthly Pledged'}
          </div>
          <div className="text-xl font-bold text-teal-950 font-baloo mt-0.5 truncate">
            ৳{isBn ? toBanglaNumber(metrics.monthlyTotal) : metrics.monthlyTotal}
          </div>
        </div>

        {/* Yearly Pledged Total */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
          <div className="text-[11px] font-medium text-indigo-800 font-tiro">
            {isBn ? 'বাৎসরিক প্রতিশ্রুতি' : 'Yearly Pledged'}
          </div>
          <div className="text-xl font-bold text-indigo-950 font-baloo mt-0.5 truncate">
            ৳{isBn ? toBanglaNumber(metrics.yearlyTotal) : metrics.yearlyTotal}
          </div>
        </div>

        {/* Collection Required */}
        <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl">
          <div className="text-[11px] font-medium text-sky-800 font-tiro">
            {isBn ? 'প্রতিনিধি সংগ্রহ' : 'Needs Collector'}
          </div>
          <div className="text-xl font-bold text-sky-950 font-baloo mt-0.5">
            {isBn ? toBanglaNumber(metrics.collectionRequiredCount) : metrics.collectionRequiredCount}
            <span className="text-xs font-normal text-sky-700 font-tiro ml-1">টি</span>
          </div>
        </div>

        {/* Paused */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
          <div className="text-[11px] font-medium text-amber-800 font-tiro">
            {isBn ? 'স্থগিত পরিকল্পনা' : 'Paused Plans'}
          </div>
          <div className="text-xl font-bold text-amber-950 font-baloo mt-0.5">
            {isBn ? toBanglaNumber(metrics.pausedCount) : metrics.pausedCount}
            <span className="text-xs font-normal text-amber-700 font-tiro ml-1">টি</span>
          </div>
        </div>

        {/* Completed */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
          <div className="text-[11px] font-medium text-blue-800 font-tiro">
            {isBn ? 'সম্পন্ন পরিকল্পনা' : 'Completed Plans'}
          </div>
          <div className="text-xl font-bold text-blue-950 font-baloo mt-0.5">
            {isBn ? toBanglaNumber(metrics.completedCount) : metrics.completedCount}
            <span className="text-xs font-normal text-blue-700 font-tiro ml-1">টি</span>
          </div>
        </div>
      </div>

      {/* Financial Rule Adherence Strip */}
      <div className="px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs text-slate-600 font-tiro">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong className="font-siliguri text-slate-800">
              {isBn ? 'নীতিমালা অনুস্মারক: ' : 'Rule Notice: '}
            </strong>
            {isBn
              ? 'দান পরিকল্পনা একটি অঙ্গীকার বা প্রতিশ্রুতি। কোনো নির্ধারিত তারিখে দান জমা না হলে স্বয়ংক্রিয় দেনা বা বকেয়া তৈরি হবে না।'
              : 'Donation plan is a pledge/plan. Missed targets do not generate accounts receivable or liabilities.'}
          </span>
        </div>
        <div className="hidden sm:block text-[11px] text-slate-400 font-baloo">
          v2.6 Foundation
        </div>
      </div>

      {/* Controls Bar: Search, Filters & Action Buttons */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isBn ? 'পরিকল্পনা কোড, মুসল্লির নাম, মোবাইল বা মন্তব্য...' : 'Search by code, musalli name, phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold font-siliguri transition-colors cursor-pointer"
              title={isBn ? 'রেজিস্টার প্রিন্ট' : 'Print Register'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? 'প্রিন্ট' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold font-siliguri transition-colors cursor-pointer"
              title={isBn ? 'CSV ডাউনলোড' : 'Download CSV'}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? 'এক্সপোর্ট' : 'Export'}</span>
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setPlanToEdit(null);
                  setPreselectedPersonId('');
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold font-siliguri shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isBn ? 'নতুন দান পরিকল্পনা' : 'New Plan'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {/* Plan Type */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">{isBn ? 'সব ধরনের পরিকল্পনা' : 'All Types'}</option>
              <option value="MONTHLY">{isBn ? '📅 মাসিক' : 'Monthly'}</option>
              <option value="YEARLY">{isBn ? '🗓️ বাৎসরিক' : 'Yearly'}</option>
              <option value="IRREGULAR">{isBn ? '✨ অনিয়মিত' : 'Irregular'}</option>
              <option value="NO_PLAN">{isBn ? '❌ কোনো পরিকল্পনা নেই' : 'No Fixed Plan'}</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">{isBn ? 'সব স্ট্যাটাস' : 'All Status'}</option>
              <option value="ACTIVE">{isBn ? '🟢 সক্রিয়' : 'Active'}</option>
              <option value="PAUSED">{isBn ? '⏸️ স্থগিত' : 'Paused'}</option>
              <option value="COMPLETED">{isBn ? '✅ সম্পন্ন' : 'Completed'}</option>
              <option value="CANCELLED">{isBn ? '❌ বাতিল' : 'Cancelled'}</option>
            </select>
          </div>

          {/* Area */}
          <div>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">{isBn ? 'সকল এলাকা' : 'All Areas'}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Collection Required */}
          <div>
            <select
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">{isBn ? 'কালেকশন: সকল' : 'Collection: All'}</option>
              <option value="REQUIRED">{isBn ? '🚚 প্রতিনিধি প্রয়োজন' : 'Needs Collector'}</option>
              <option value="DIRECT">{isBn ? '🤲 সরাসরি প্রদান' : 'Direct Donor'}</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="col-span-2 sm:col-span-1 flex items-center space-x-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="DATE">{isBn ? 'তারিখ অনুসারে' : 'Date'}</option>
              <option value="AMOUNT">{isBn ? 'পরিমাণ অনুসারে' : 'Amount'}</option>
              <option value="PERSON">{isBn ? 'নাম অনুসারে' : 'Person'}</option>
              <option value="CODE">{isBn ? 'কোড অনুসারে' : 'Code'}</option>
              <option value="STATUS">{isBn ? 'স্ট্যাটাস' : 'Status'}</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
              title={sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Plans Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-siliguri font-bold">
                <th className="py-3 px-3.5 w-10 text-center">#</th>
                <th className="py-3 px-3.5">{isBn ? 'পরিকল্পনা কোড' : 'Plan Code'}</th>
                <th className="py-3 px-3.5">{isBn ? 'ব্যক্তি / মুসল্লি' : 'Musalli / Person'}</th>
                <th className="py-3 px-3.5">{isBn ? 'মহল্লা ও পরিবার' : 'Area & Family'}</th>
                <th className="py-3 px-3.5">{isBn ? 'পরিকল্পনার ধরন' : 'Type'}</th>
                <th className="py-3 px-3.5 text-right">{isBn ? 'পরিকল্পিত পরিমাণ' : 'Amount'}</th>
                <th className="py-3 px-3.5">{isBn ? 'কালেকশন ব্যবস্থা' : 'Collection Setup'}</th>
                <th className="py-3 px-3.5 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3 px-3.5 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-tiro">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>{isBn ? 'তথ্য লোড হচ্ছে...' : 'Loading donation plans...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-tiro">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                        <HeartHandshake className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 font-siliguri">
                        {isBn ? 'কোনো দান পরিকল্পনা পাওয়া যায়নি' : 'No Donation Plans Found'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? isBn
                            ? 'ফিল্টার পরিবর্তনের মাধ্যমে পুনরায় অনুসন্ধান করুন।'
                            : 'Try adjusting your filters.'
                          : isBn
                          ? 'মুসল্লিদের নিয়মিত দান পরিকল্পনা যুক্ত করে মাসিক ও বাৎসরিক প্রতিশ্রুতির হিসাব সুবিন্যস্ত করুন।'
                          : 'Create regular donation pledges to track monthly & periodic commitments.'}
                      </p>
                      {canCreate && !searchQuery && typeFilter === 'ALL' && statusFilter === 'ALL' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlanToEdit(null);
                            setPreselectedPersonId('');
                            setIsFormOpen(true);
                          }}
                          className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isBn ? 'প্রথম পরিকল্পনা যুক্ত করুন' : 'Add First Plan'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan, idx) => {
                  const person = getPerson(plan.personId);
                  const fam = person?.familyId ? getFamily(person.familyId) : null;
                  const ar = person?.areaId ? getArea(person.areaId) : fam?.areaId ? getArea(fam.areaId) : null;
                  const worker = plan.collectionWorkerId ? getWorker(plan.collectionWorkerId) : null;
                  const pAmt = plan.amount ?? plan.plannedAmount ?? 0;

                  return (
                    <tr
                      key={plan.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(plan)}
                    >
                      {/* Index */}
                      <td className="py-3 px-3.5 text-center font-baloo text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Plan Code */}
                      <td className="py-3 px-3.5 font-baloo font-bold text-slate-900">
                        <span className="bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-900 text-slate-700 text-[11px] px-2 py-0.5 rounded-md transition-colors">
                          {plan.planCode || `PLAN-#${plan.id.slice(0, 5)}`}
                        </span>
                      </td>

                      {/* Musalli Profile */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 font-baloo">
                            {person ? person.fullName.charAt(0) : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 font-siliguri group-hover:text-emerald-800 transition-colors">
                              {person?.fullName || (isBn ? 'অজ্ঞাত ব্যক্তি' : 'Unknown Person')}
                            </div>
                            <div className="text-[11px] text-slate-500 font-baloo">
                              {person?.mobile ? person.mobile : person?.personCode || ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Area & Family */}
                      <td className="py-3 px-3.5 font-tiro text-xs text-slate-600">
                        <div>{fam ? fam.name : '—'}</div>
                        <div className="text-[11px] text-slate-400">{ar ? ar.name : ''}</div>
                      </td>

                      {/* Plan Type */}
                      <td className="py-3 px-3.5 font-siliguri">
                        {plan.planType === 'MONTHLY' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-xs">
                            <span>📅</span>
                            <span>{isBn ? 'মাসিক' : 'Monthly'}</span>
                          </span>
                        ) : plan.planType === 'YEARLY' ? (
                          <span className="inline-flex items-center space-x-1 text-indigo-700 font-bold text-xs">
                            <span>🗓️</span>
                            <span>{isBn ? 'বাৎসরিক' : 'Yearly'}</span>
                          </span>
                        ) : plan.planType === 'IRREGULAR' ? (
                          <span className="inline-flex items-center space-x-1 text-amber-700 font-bold text-xs">
                            <span>✨</span>
                            <span>{isBn ? 'অনিয়মিত' : 'Irregular'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-tiro">{isBn ? 'নির্দিষ্ট নেই' : 'No plan'}</span>
                        )}
                      </td>

                      {/* Planned Amount */}
                      <td className="py-3 px-3.5 text-right font-baloo font-bold text-slate-900 text-sm">
                        ৳{isBn ? toBanglaNumber(pAmt) : pAmt}
                      </td>

                      {/* Collection Setup */}
                      <td className="py-3 px-3.5 text-xs font-tiro">
                        {plan.collectionRequired ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span>🚚</span>
                              <span>{worker ? worker.name : isBn ? 'প্রতিনিধি প্রয়োজন' : 'Needs Collector'}</span>
                            </span>
                            {plan.collectionDay && (
                              <div className="text-[10px] text-slate-500 pl-1">{plan.collectionDay}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{isBn ? 'সরাসরি প্রদান' : 'Direct'}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-siliguri border ${
                            plan.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : plan.status === 'PAUSED'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : plan.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {plan.status === 'ACTIVE'
                            ? isBn
                              ? '🟢 সক্রিয়'
                              : 'Active'
                            : plan.status === 'PAUSED'
                            ? isBn
                              ? '⏸️ স্থগিত'
                              : 'Paused'
                            : plan.status === 'COMPLETED'
                            ? isBn
                              ? '✅ সম্পন্ন'
                              : 'Completed'
                            : isBn
                            ? '❌ বাতিল'
                            : 'Cancelled'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-3.5 text-right space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(plan)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={isBn ? 'বিবরণ দেখুন' : 'View Details'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(plan)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={isBn ? 'সংশোধন করুন' : 'Edit Plan'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenStatusModal(
                                plan,
                                plan.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                              )
                            }
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={plan.status === 'ACTIVE' ? (isBn ? 'স্থগিত করুন' : 'Pause') : (isBn ? 'সক্রিয় করুন' : 'Activate')}
                          >
                            {plan.status === 'ACTIVE' ? (
                              <PauseCircle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(plan)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isFormOpen && (
        <DonationPlanFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSavePlan}
          planToEdit={planToEdit}
          preselectedPersonId={preselectedPersonId}
          persons={persons}
          families={families}
          areas={areas}
          collectionWorkers={collectionWorkers}
          currentUser={currentUser}
          language={language}
        />
      )}

      {isDetailOpen && selectedPlanForDetail && (
        <DonationPlanDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          plan={selectedPlanForDetail}
          person={getPerson(selectedPlanForDetail.personId)}
          family={
            getPerson(selectedPlanForDetail.personId)?.familyId
              ? getFamily(getPerson(selectedPlanForDetail.personId)!.familyId!)
              : null
          }
          area={
            getPerson(selectedPlanForDetail.personId)?.areaId
              ? getArea(getPerson(selectedPlanForDetail.personId)!.areaId!)
              : null
          }
          worker={
            selectedPlanForDetail.collectionWorkerId
              ? getWorker(selectedPlanForDetail.collectionWorkerId)
              : null
          }
          donations={donations}
          currentUser={currentUser}
          onEdit={(p) => {
            setIsDetailOpen(false);
            handleOpenEdit(p);
          }}
          onOpenStatusModal={(p, target) => {
            setIsDetailOpen(false);
            handleOpenStatusModal(p, target);
          }}
          onReceiveDonation={onReceiveDonation}
          language={language}
        />
      )}

      {isStatusModalOpen && statusModalPlan && (
        <DonationPlanStatusConfirmModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          onConfirm={handleStatusChange}
          plan={statusModalPlan}
          person={getPerson(statusModalPlan.personId)}
          targetStatus={targetStatus}
          language={language}
        />
      )}

      {isPrintModalOpen && (
        <DonationPlanPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          plans={filteredPlans}
          persons={persons}
          families={families}
          areas={areas}
          workers={collectionWorkers}
          currentMosque={currentMosque}
          language={language}
        />
      )}
    </div>
  );
};

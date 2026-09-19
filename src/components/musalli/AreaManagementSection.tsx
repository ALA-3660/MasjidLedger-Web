import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Home,
  Users,
  Briefcase,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronRight,
  Layers,
  Power,
} from 'lucide-react';
import {
  AreaMaster,
  FamilyMaster,
  PersonMaster,
  CollectionWorker,
  User,
  Mosque,
} from '../../types';
import { Language, formatDate, toBanglaNumber } from '../../lib/i18n';
import { api } from '../../lib/api';
import { AreaFormModal } from './AreaFormModal';
import { AreaDetailModal } from './AreaDetailModal';
import { AreaStatusConfirmModal } from './AreaStatusConfirmModal';

export interface AreaManagementSectionProps {
  areas: AreaMaster[];
  families?: FamilyMaster[];
  persons?: PersonMaster[];
  collectionWorkers?: CollectionWorker[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

export const AreaManagementSection: React.FC<AreaManagementSectionProps> = ({
  areas,
  families = [],
  persons = [],
  collectionWorkers = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onRefresh,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'newest' | 'updated'>('name');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaMaster | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAreaForDetail, setSelectedAreaForDetail] = useState<AreaMaster | null>(null);

  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [areaForStatusChange, setAreaForStatusChange] = useState<AreaMaster | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // More menu popover
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Toast / Banner feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const isBn = language === 'bn';

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Permissions Check
  const canCreate = !currentUser ||
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MOSQUE_ADMIN' ||
    currentUser.permissions?.includes('CREATE_MUSALLI') ||
    currentUser.permissions?.includes('MANAGE_SETTINGS');

  const canEdit = !currentUser ||
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MOSQUE_ADMIN' ||
    currentUser.permissions?.includes('EDIT_MUSALLI') ||
    currentUser.permissions?.includes('MANAGE_SETTINGS');

  // Helper maps for derived relationship counts
  const familyCountByArea = useMemo(() => {
    const map: Record<string, number> = {};
    for (const fam of families) {
      if (fam.areaId) {
        map[fam.areaId] = (map[fam.areaId] || 0) + 1;
      }
    }
    return map;
  }, [families]);

  const personCountByArea = useMemo(() => {
    const map: Record<string, number> = {};
    for (const per of persons) {
      if (per.areaId) {
        map[per.areaId] = (map[per.areaId] || 0) + 1;
      }
    }
    return map;
  }, [persons]);

  const workerMap = useMemo(() => {
    const map: Record<string, CollectionWorker> = {};
    for (const w of collectionWorkers) {
      map[w.id] = w;
    }
    return map;
  }, [collectionWorkers]);

  // Filter and Sort areas
  const filteredAreas = useMemo(() => {
    let result = [...areas];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const nameMatch = (a.name || '').toLowerCase().includes(q);
        const codeMatch = (a.areaCode || '').toLowerCase().includes(q);
        const descMatch = (a.description || a.boundaryDescription || '').toLowerCase().includes(q);
        const noteMatch = (a.notes || '').toLowerCase().includes(q);
        return nameMatch || codeMatch || descMatch || noteMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'bn');
      }
      if (sortBy === 'code') {
        return (a.areaCode || '').localeCompare(b.areaCode || '');
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'updated') {
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
      return 0;
    });

    return result;
  }, [areas, statusFilter, searchQuery, sortBy]);

  // Derived overall counts
  const totalAreasCount = areas.length;
  const activeAreasCount = areas.filter((a) => a.status === 'ACTIVE').length;
  const inactiveAreasCount = areas.filter((a) => a.status === 'INACTIVE').length;
  const totalFamiliesCount = families.length;
  const totalPersonsCount = persons.length;

  // Handlers
  const handleOpenCreate = () => {
    setEditingArea(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (area: AreaMaster) => {
    setEditingArea(area);
    setIsFormOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenDetail = (area: AreaMaster) => {
    setSelectedAreaForDetail(area);
    setIsDetailOpen(true);
    setOpenActionMenuId(null);
  };

  const handlePromptStatusChange = (area: AreaMaster, newStatus: 'ACTIVE' | 'INACTIVE') => {
    setAreaForStatusChange(area);
    setTargetStatus(newStatus);
    setIsStatusConfirmOpen(true);
    setOpenActionMenuId(null);
  };

  const handleSaveArea = async (formData: Partial<AreaMaster>) => {
    if (editingArea) {
      await api.updateArea(editingArea.id, formData);
      showToast(isBn ? 'এলাকার তথ্য সফলভাবে আপডেট হয়েছে।' : 'Area updated successfully.');
    } else {
      await api.createArea(formData);
      showToast(isBn ? 'নতুন এলাকা সফলভাবে তৈরি হয়েছে।' : 'New area created successfully.');
    }
    await onRefresh();
  };

  const handleConfirmStatusChange = async () => {
    if (!areaForStatusChange) return;
    try {
      setIsChangingStatus(true);
      await api.updateAreaStatus(areaForStatusChange.id, targetStatus);
      showToast(
        isBn
          ? `এলাকাটি সফলভাবে ${targetStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`
          : `Area status set to ${targetStatus}.`
      );
      setIsStatusConfirmOpen(false);
      setAreaForStatusChange(null);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || (isBn ? 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।' : 'Failed to update status.'), 'error');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleCopyCode = (code?: string) => {
    if (code) {
      navigator.clipboard.writeText(code);
      showToast(isBn ? `কোড "${code}" কপি করা হয়েছে` : `Code "${code}" copied.`);
      setOpenActionMenuId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-tiro animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 font-siliguri">
              {isBn ? 'এলাকা / মহল্লা' : 'Areas & Mahallas'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-tiro mt-0.5 ml-10">
            {isBn
              ? 'মুসল্লি, পরিবার ও সংগ্রহ কার্যক্রমের জন্য এলাকার মাস্টার তালিকা'
              : 'Master directory of geographic areas, streets and territories'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            title={isBn ? 'রিফ্রেশ' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer font-siliguri"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? '＋ নতুন এলাকা' : '＋ New Area'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Compact Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* 1. Total Areas */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-tiro">
            <span>{isBn ? 'মোট এলাকা' : 'Total Areas'}</span>
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-baloo mt-1">
            {isBn ? toBanglaNumber(totalAreasCount) : totalAreasCount}
          </div>
        </div>

        {/* 2. Active Areas */}
        <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
          <div className="flex items-center justify-between text-emerald-700 text-[11px] font-tiro">
            <span>{isBn ? 'সক্রিয় এলাকা' : 'Active Areas'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-950 font-baloo mt-1">
            {isBn ? toBanglaNumber(activeAreasCount) : activeAreasCount}
          </div>
        </div>

        {/* 3. Inactive Areas */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-tiro">
            <span>{isBn ? 'নিষ্ক্রিয় এলাকা' : 'Inactive'}</span>
            <Power className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-700 font-baloo mt-1">
            {isBn ? toBanglaNumber(inactiveAreasCount) : inactiveAreasCount}
          </div>
        </div>

        {/* 4. Total Families (Derived, no fake data) */}
        <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between text-blue-700 text-[11px] font-tiro">
            <span>{isBn ? 'মোট পরিবার' : 'Total Families'}</span>
            <Home className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-blue-950 font-baloo mt-1">
            {totalFamiliesCount > 0 ? (isBn ? toBanglaNumber(totalFamiliesCount) : totalFamiliesCount) : (isBn ? '০ টি' : '0')}
          </div>
        </div>

        {/* 5. Total Persons (Derived, no fake data) */}
        <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-indigo-700 text-[11px] font-tiro">
            <span>{isBn ? 'মোট ব্যক্তি' : 'Total Persons'}</span>
            <Users className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg font-bold text-indigo-950 font-baloo mt-1">
            {totalPersonsCount > 0 ? (isBn ? toBanglaNumber(totalPersonsCount) : totalPersonsCount) : (isBn ? '০ জন' : '0')}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isBn ? 'এলাকার নাম বা কোড দিয়ে খুঁজুন...' : 'Search by area name or code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-tiro text-slate-900 focus:outline-hidden focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Status Filter Pills */}
          <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-siliguri">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBn ? 'সব' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBn ? 'সক্রিয়' : 'Active'}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-siliguri text-slate-700 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="name">{isBn ? 'নাম অনুযায়ী' : 'By Name'}</option>
              <option value="code">{isBn ? 'কোড অনুযায়ী' : 'By Code'}</option>
              <option value="newest">{isBn ? 'সর্বশেষ তৈরি' : 'Newest'}</option>
              <option value="updated">{isBn ? 'সর্বশেষ পরিবর্তন' : 'Recently Updated'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table or Card List */}
      {filteredAreas.length === 0 ? (
        /* Empty State */
        <div className="p-12 border border-dashed border-slate-300 rounded-2xl bg-slate-50/50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 font-siliguri">
              {searchQuery || statusFilter !== 'ALL'
                ? (isBn ? 'কোনো এলাকা পাওয়া যায়নি' : 'No matching areas found')
                : (isBn ? 'এখনো কোনো এলাকা যোগ করা হয়নি' : 'No areas added yet')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-tiro leading-relaxed">
              {searchQuery || statusFilter !== 'ALL'
                ? (isBn ? 'অনুগ্রহ করে অনুসন্ধানের শব্দ পরিবর্তন করুন।' : 'Try changing search keywords or filters.')
                : (isBn ? 'মুসল্লি ও পরিবারের তথ্য সংগঠিত করতে প্রথমে একটি এলাকা যোগ করুন।' : 'Add an area first to start organizing families and musalli.')}
            </p>
          </div>
          {canCreate && !searchQuery && statusFilter === 'ALL' && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer font-siliguri mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? '＋ নতুন এলাকা যোগ করুন' : '＋ Add Area'}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Professional Table */}
          <div className="hidden md:block overflow-hidden bg-white border border-slate-200 rounded-xl shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-tiro">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-siliguri font-semibold">
                    <th className="px-4 py-3 whitespace-nowrap">{isBn ? 'এলাকা কোড' : 'Code'}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{isBn ? 'এলাকার নাম' : 'Area Name'}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{isBn ? 'সংগ্রহকারী' : 'Worker'}</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">{isBn ? 'পরিবার' : 'Families'}</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">{isBn ? 'ব্যক্তি' : 'Persons'}</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="px-4 py-3 whitespace-nowrap">{isBn ? 'সর্বশেষ আপডেট' : 'Last Updated'}</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">{isBn ? 'কার্যক্রম' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAreas.map((area) => {
                    const famCount = familyCountByArea[area.id] || 0;
                    const perCount = personCountByArea[area.id] || 0;
                    const assignedWorkerId = area.assignedCollectionWorkerId || (area.collectionWorkerIds && area.collectionWorkerIds[0]);
                    const worker = assignedWorkerId ? workerMap[assignedWorkerId] : null;
                    const isActive = area.status === 'ACTIVE';

                    return (
                      <tr key={area.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* 1. Area Code */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-baloo font-bold rounded-md text-[11px] border border-slate-200/60">
                            {area.areaCode || '—'}
                          </span>
                        </td>

                        {/* 2. Area Name & Description Preview */}
                        <td className="px-4 py-3 min-w-[180px]">
                          <div className="font-bold text-slate-900 font-siliguri text-xs">
                            {area.name}
                          </div>
                          {(area.description || area.boundaryDescription) && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs font-tiro mt-0.5">
                              {area.description || area.boundaryDescription}
                            </div>
                          )}
                        </td>

                        {/* 3. Assigned Collection Worker */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {worker ? (
                            <div className="flex items-center space-x-1.5 text-slate-700">
                              <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="font-medium font-siliguri">{worker.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-tiro">{isBn ? '—' : '—'}</span>
                          )}
                        </td>

                        {/* 4. Family Count (Derived) */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="font-baloo font-semibold text-slate-700">
                            {famCount > 0 ? (isBn ? toBanglaNumber(famCount) : famCount) : '০'}
                          </span>
                        </td>

                        {/* 5. Person Count (Derived) */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className="font-baloo font-semibold text-slate-700">
                            {perCount > 0 ? (isBn ? toBanglaNumber(perCount) : perCount) : '০'}
                          </span>
                        </td>

                        {/* 6. Status Badge */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-siliguri ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                          </span>
                        </td>

                        {/* 7. Last Updated */}
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-baloo text-[11px]">
                          {formatDate(area.updatedAt || area.createdAt, 'bn')}
                        </td>

                        {/* 8. Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="inline-flex items-center space-x-1">
                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(area)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                              title={isBn ? 'বিস্তারিত দেখুন' : 'View Details'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(area)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                                title={isBn ? 'সম্পাদনা' : 'Edit'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* More Options Popover */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionMenuId(openActionMenuId === area.id ? null : area.id)
                                }
                                className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                                title={isBn ? 'আরও অপশন' : 'More Options'}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {openActionMenuId === area.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setOpenActionMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-left text-xs font-siliguri animate-in fade-in zoom-in-95 duration-100">
                                    {area.areaCode && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyCode(area.areaCode)}
                                        className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{isBn ? 'কোড কপি করুন' : 'Copy Code'}</span>
                                      </button>
                                    )}

                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePromptStatusChange(
                                            area,
                                            isActive ? 'INACTIVE' : 'ACTIVE'
                                          )
                                        }
                                        className={`w-full px-3 py-2 text-left flex items-center space-x-2 cursor-pointer ${
                                          isActive
                                            ? 'text-amber-700 hover:bg-amber-50'
                                            : 'text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                        <span>
                                          {isActive
                                            ? (isBn ? 'নিষ্ক্রিয় করুন' : 'Deactivate')
                                            : (isBn ? 'সক্রিয় করুন' : 'Activate')}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card / List View */}
          <div className="md:hidden space-y-3">
            {filteredAreas.map((area) => {
              const famCount = familyCountByArea[area.id] || 0;
              const perCount = personCountByArea[area.id] || 0;
              const assignedWorkerId = area.assignedCollectionWorkerId || (area.collectionWorkerIds && area.collectionWorkerIds[0]);
              const worker = assignedWorkerId ? workerMap[assignedWorkerId] : null;
              const isActive = area.status === 'ACTIVE';

              return (
                <div
                  key={area.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-baloo font-bold rounded text-[10px] border border-slate-200">
                          {area.areaCode || '—'}
                        </span>
                        <h4 className="font-bold text-slate-900 font-siliguri text-sm">
                          {area.name}
                        </h4>
                      </div>
                      {(area.description || area.boundaryDescription) && (
                        <p className="text-xs text-slate-500 font-tiro mt-1 line-clamp-2">
                          {area.description || area.boundaryDescription}
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-siliguri shrink-0 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                    </span>
                  </div>

                  {/* Mobile Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-tiro">{isBn ? 'পরিবার' : 'Families'}</div>
                      <div className="text-xs font-bold text-slate-800 font-baloo mt-0.5">
                        {famCount > 0 ? (isBn ? toBanglaNumber(famCount) : famCount) : '০'}
                      </div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-tiro">{isBn ? 'ব্যক্তি' : 'Persons'}</div>
                      <div className="text-xs font-bold text-slate-800 font-baloo mt-0.5">
                        {perCount > 0 ? (isBn ? toBanglaNumber(perCount) : perCount) : '০'}
                      </div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-tiro">{isBn ? 'সংগ্রহকারী' : 'Worker'}</div>
                      <div className="text-xs font-bold text-slate-800 font-siliguri mt-0.5 truncate">
                        {worker ? worker.name : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-baloo">
                      {isBn ? 'আপডেট: ' : 'Updated: '}
                      {formatDate(area.updatedAt || area.createdAt, 'bn')}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(area)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold font-siliguri flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isBn ? 'দেখুন' : 'View'}</span>
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(area)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold font-siliguri flex items-center space-x-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals Integration */}
      <AreaFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveArea}
        initialData={editingArea}
        existingAreas={areas}
        collectionWorkers={collectionWorkers}
        language={language}
      />

      <AreaDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        area={selectedAreaForDetail}
        onEdit={(a) => handleOpenEdit(a)}
        familyCount={selectedAreaForDetail ? familyCountByArea[selectedAreaForDetail.id] || 0 : 0}
        personCount={selectedAreaForDetail ? personCountByArea[selectedAreaForDetail.id] || 0 : 0}
        collectionWorker={
          selectedAreaForDetail
            ? workerMap[selectedAreaForDetail.assignedCollectionWorkerId || ''] ||
              workerMap[(selectedAreaForDetail.collectionWorkerIds && selectedAreaForDetail.collectionWorkerIds[0]) || ''] ||
              null
            : null
        }
        language={language}
      />

      <AreaStatusConfirmModal
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        area={areaForStatusChange}
        targetStatus={targetStatus}
        isProcessing={isChangingStatus}
        language={language}
      />
    </div>
  );
};

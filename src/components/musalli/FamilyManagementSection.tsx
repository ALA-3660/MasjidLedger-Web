import React, { useState, useMemo } from 'react';
import {
  Home,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Edit2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Users,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building,
  Power,
  Phone,
  UserCheck,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import {
  FamilyMaster,
  AreaMaster,
  PersonMaster,
  User,
  Mosque,
} from '../../types';
import { Language, formatDate, toBanglaNumber } from '../../lib/i18n';
import { api } from '../../lib/api';
import { FamilyFormModal } from './FamilyFormModal';
import { FamilyDetailModal } from './FamilyDetailModal';
import { FamilyStatusConfirmModal } from './FamilyStatusConfirmModal';

export interface FamilyManagementSectionProps {
  families: FamilyMaster[];
  areas: AreaMaster[];
  persons?: PersonMaster[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

export const FamilyManagementSection: React.FC<FamilyManagementSectionProps> = ({
  families,
  areas,
  persons = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onRefresh,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'newest' | 'updated' | 'members'>('name');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyMaster | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFamilyForDetail, setSelectedFamilyForDetail] = useState<FamilyMaster | null>(null);

  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [familyForStatusChange, setFamilyForStatusChange] = useState<FamilyMaster | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Popover menu
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Helper Area Lookup Map
  const areaMap = useMemo(() => {
    const map: Record<string, AreaMaster> = {};
    for (const a of areas) {
      map[a.id] = a;
    }
    return map;
  }, [areas]);

  // Helper Person Lookup & Linked Persons by Family
  const personsByFamily = useMemo(() => {
    const map: Record<string, PersonMaster[]> = {};
    for (const p of persons) {
      if (p.familyId) {
        if (!map[p.familyId]) map[p.familyId] = [];
        map[p.familyId].push(p);
      }
    }
    return map;
  }, [persons]);

  const personMap = useMemo(() => {
    const map: Record<string, PersonMaster> = {};
    for (const p of persons) {
      map[p.id] = p;
    }
    return map;
  }, [persons]);

  // Copy code handler
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(isBn ? 'কোড ক্লিপবোর্ডে কপি হয়েছে' : 'Code copied to clipboard', 'info');
  };

  // Filter and Sort Families
  const filteredFamilies = useMemo(() => {
    let result = [...families];

    // Area filter
    if (selectedAreaFilter !== 'ALL') {
      result = result.filter((f) => f.areaId === selectedAreaFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((f) => {
        const areaName = (areaMap[f.areaId]?.name || '').toLowerCase();
        const headPersonName = (f.familyHeadPersonId && personMap[f.familyHeadPersonId]?.fullName || '').toLowerCase();
        return (
          (f.name || '').toLowerCase().includes(q) ||
          (f.familyCode || '').toLowerCase().includes(q) ||
          (f.id || '').toLowerCase().includes(q) ||
          (f.mobile || '').includes(q) ||
          (f.address || '').toLowerCase().includes(q) ||
          (f.houseRoadBlock || '').toLowerCase().includes(q) ||
          (f.description || '').toLowerCase().includes(q) ||
          (f.notes || '').toLowerCase().includes(q) ||
          areaName.includes(q) ||
          headPersonName.includes(q)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'bn');
      }
      if (sortBy === 'code') {
        return (a.familyCode || a.id).localeCompare(b.familyCode || b.id);
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'updated') {
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
      if (sortBy === 'members') {
        const countA = a.memberCount || (personsByFamily[a.id]?.length || 0);
        const countB = b.memberCount || (personsByFamily[b.id]?.length || 0);
        return countB - countA;
      }
      return 0;
    });

    return result;
  }, [families, selectedAreaFilter, statusFilter, searchQuery, sortBy, areaMap, personMap, personsByFamily]);

  // KPI Metrics
  const totalFamiliesCount = families.length;
  const activeFamiliesCount = families.filter((f) => f.status === 'ACTIVE').length;
  const inactiveFamiliesCount = families.filter((f) => f.status === 'INACTIVE').length;
  const totalMembersSum = families.reduce((sum, f) => sum + (f.memberCount || personsByFamily[f.id]?.length || 0), 0);
  const coveredAreasCount = new Set(families.map((f) => f.areaId).filter(Boolean)).size;

  // Handlers for Modals
  const handleOpenCreate = () => {
    setEditingFamily(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (family: FamilyMaster) => {
    setEditingFamily(family);
    setIsFormOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenDetail = (family: FamilyMaster) => {
    setSelectedFamilyForDetail(family);
    setIsDetailOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenStatusConfirm = (family: FamilyMaster, newStatus: 'ACTIVE' | 'INACTIVE') => {
    setFamilyForStatusChange(family);
    setTargetStatus(newStatus);
    setIsStatusConfirmOpen(true);
    setOpenActionMenuId(null);
  };

  const handleSaveFamily = async (payload: Partial<FamilyMaster>) => {
    if (editingFamily) {
      await api.updateFamily(editingFamily.id, payload);
      showToast(isBn ? 'পরিবারের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।' : 'Family updated successfully.', 'success');
    } else {
      await api.createFamily(payload);
      showToast(isBn ? 'নতুন পরিবার সফলভাবে যুক্ত করা হয়েছে।' : 'New family created successfully.', 'success');
    }
    await onRefresh();
  };

  const handleConfirmStatusChange = async () => {
    if (!familyForStatusChange) return;
    try {
      setIsChangingStatus(true);
      await api.updateFamilyStatus(familyForStatusChange.id, targetStatus);
      showToast(
        isBn
          ? `পরিবার সফলভাবে ${targetStatus === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`
          : `Family successfully marked as ${targetStatus.toLowerCase()}.`,
        'success'
      );
      setIsStatusConfirmOpen(false);
      await onRefresh();
    } catch (err: any) {
      showToast(err?.message || (isBn ? 'স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে।' : 'Failed to update status.'), 'error');
    } finally {
      setIsChangingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-tiro transition-all shadow-xs animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toastMessage.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : toastMessage.type === 'info' ? (
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Overview Summary Cards (5-Column) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Families */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold font-siliguri">{isBn ? 'মোট পরিবার / বাড়ি' : 'Total Families'}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Home className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 font-baloo">
            {isBn ? toBanglaNumber(totalFamiliesCount) : totalFamiliesCount}
          </div>
          <div className="text-[11px] text-slate-400 font-tiro">
            {isBn ? 'নিবন্ধিত খানা ও বাড়ি' : 'Registered households'}
          </div>
        </div>

        {/* Active Families */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold font-siliguri">{isBn ? 'সক্রিয় পরিবার' : 'Active Families'}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-700 font-baloo">
            {isBn ? toBanglaNumber(activeFamiliesCount) : activeFamiliesCount}
          </div>
          <div className="text-[11px] text-emerald-600 font-tiro">
            {isBn ? 'নিয়মিত যোগাযোগে রয়েছে' : 'Active in registry'}
          </div>
        </div>

        {/* Inactive Families */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold font-siliguri">{isBn ? 'নিষ্ক্রিয় পরিবার' : 'Inactive Families'}</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Power className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-700 font-baloo">
            {isBn ? toBanglaNumber(inactiveFamiliesCount) : inactiveFamiliesCount}
          </div>
          <div className="text-[11px] text-slate-400 font-tiro">
            {isBn ? 'সংরক্ষিত ইতিহাস' : 'Preserved records'}
          </div>
        </div>

        {/* Total Members */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold font-siliguri">{isBn ? 'মোট সদস্য সংখ্যা' : 'Total Members'}</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-indigo-700 font-baloo">
            {isBn ? toBanglaNumber(totalMembersSum) : totalMembersSum}
          </div>
          <div className="text-[11px] text-indigo-600 font-tiro">
            {isBn ? 'পারিবারিক সদস্য মোট' : 'Linked individuals'}
          </div>
        </div>

        {/* Covered Areas */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold font-siliguri">{isBn ? 'আওতাভুক্ত এলাকা' : 'Covered Areas'}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 font-baloo">
            {isBn ? toBanglaNumber(coveredAreasCount) : coveredAreasCount}
          </div>
          <div className="text-[11px] text-slate-400 font-tiro">
            {isBn ? `মোট এলাকা: ${toBanglaNumber(areas.length)}` : `Out of ${areas.length} areas`}
          </div>
        </div>
      </div>

      {/* Main Filter & Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? 'পরিবারের নাম, কোড, এলাকা, মোবাইল বা রোড দিয়ে খুঁজুন...' : 'Search by family name, code, area, mobile or road...'}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Action Buttons & Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Area Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                className="bg-transparent text-xs font-siliguri text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">{isBn ? 'সব এলাকা / মহল্লা' : 'All Areas'}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-siliguri text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">{isBn ? 'সব স্ট্যাটাস' : 'All Status'}</option>
                <option value="ACTIVE">{isBn ? 'সক্রিয় পরিবার' : 'Active'}</option>
                <option value="INACTIVE">{isBn ? 'নিষ্ক্রিয় পরিবার' : 'Inactive'}</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-siliguri text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="name">{isBn ? 'নাম অনুযায়ী (A-Z)' : 'By Name'}</option>
                <option value="code">{isBn ? 'পারিবারিক কোড' : 'By Code'}</option>
                <option value="members">{isBn ? 'সদস্য সংখ্যা (বেশি → কম)' : 'By Member Count'}</option>
                <option value="newest">{isBn ? 'নতুন তৈরি' : 'Newest'}</option>
                <option value="updated">{isBn ? 'সর্বশেষ হালনাগাদ' : 'Recently Updated'}</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title={isBn ? 'রিফ্রেশ করুন' : 'Refresh'}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Add Family CTA */}
            {canCreate && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold font-siliguri shadow-md shadow-blue-700/20 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isBn ? '＋ নতুন পরিবার যোগ করুন' : '＋ Add Family'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || selectedAreaFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-tiro pt-1 border-t border-slate-100">
            <span>{isBn ? 'ফিল্টার সক্রিয়:' : 'Active Filters:'}</span>
            {searchQuery && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-baloo">
                "{searchQuery}"
              </span>
            )}
            {selectedAreaFilter !== 'ALL' && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-siliguri">
                📍 {areaMap[selectedAreaFilter]?.name || 'এলাকা'}
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md font-siliguri">
                {statusFilter === 'ACTIVE' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedAreaFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-blue-700 hover:underline font-siliguri font-semibold ml-auto cursor-pointer"
            >
              {isBn ? 'ফিল্টার মুছুন' : 'Clear Filters'}
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 font-siliguri tracking-wider">
                <th className="py-3 px-4">{isBn ? 'কোড ও আইডি' : 'Code & ID'}</th>
                <th className="py-3 px-4">{isBn ? 'পরিবার / বাড়ির নাম' : 'Family / House'}</th>
                <th className="py-3 px-4">{isBn ? 'এলাকা / মহল্লা' : 'Area / Mahalla'}</th>
                <th className="py-3 px-4">{isBn ? 'পরিবার প্রধান' : 'Family Head'}</th>
                <th className="py-3 px-4 text-center">{isBn ? 'সদস্য' : 'Members'}</th>
                <th className="py-3 px-4">{isBn ? 'মোবাইল ও ঠিকানা' : 'Contact & Address'}</th>
                <th className="py-3 px-4 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-tiro text-slate-700">
              {filteredFamilies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Home className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700 font-siliguri">
                        {isBn ? 'কোনো পরিবার পাওয়া যায়নি' : 'No Families Found'}
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {searchQuery || selectedAreaFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? (isBn ? 'আপনার অনুসন্ধানের সাথে মিল রেখে কোনো পরিবার পাওয়া যায়নি।' : 'No families match the current search or filter criteria.')
                          : (isBn ? 'এলাকা নির্বাচন করে প্রথম পরিবার / বাড়ির তথ্য যুক্ত করুন।' : 'Start by creating your first family under an area.')}
                      </p>
                    </div>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold font-siliguri transition-all cursor-pointer inline-flex items-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isBn ? '＋ নতুন পরিবার যোগ করুন' : '＋ Add Family'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredFamilies.map((family) => {
                  const area = areaMap[family.areaId];
                  const headPerson = family.familyHeadPersonId ? personMap[family.familyHeadPersonId] : null;
                  const memberCount = family.memberCount || personsByFamily[family.id]?.length || 0;
                  const isActive = family.status === 'ACTIVE';
                  const isMenuOpen = openActionMenuId === family.id;

                  return (
                    <tr
                      key={family.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Code & ID */}
                      <td className="py-3.5 px-4 font-baloo whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {family.familyCode || family.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(family.familyCode || family.id, family.id)}
                            title={isBn ? 'কোড কপি করুন' : 'Copy code'}
                            className="p-1 text-slate-400 hover:text-blue-700 rounded transition-colors cursor-pointer"
                          >
                            {copiedId === family.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Family / House Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 font-siliguri hover:text-blue-700 cursor-pointer flex items-center space-x-1.5"
                          onClick={() => handleOpenDetail(family)}
                        >
                          <Home className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{family.name}</span>
                        </div>
                        {family.houseRoadBlock && (
                          <div className="text-[11px] text-slate-500 font-tiro line-clamp-1 mt-0.5">
                            🛣️ {family.houseRoadBlock}
                          </div>
                        )}
                      </td>

                      {/* Area */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-siliguri">
                        {area ? (
                          <div className="inline-flex items-center space-x-1 text-slate-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px] font-medium">
                            <MapPin className="w-3 h-3 text-emerald-700" />
                            <span>{area.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">{isBn ? 'অনির্ধারিত' : 'Unassigned'}</span>
                        )}
                      </td>

                      {/* Family Head */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-siliguri">
                        {headPerson ? (
                          <div className="text-xs text-slate-800 flex items-center space-x-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold">{headPerson.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{isBn ? 'অনির্ধারিত' : 'Not set'}</span>
                        )}
                      </td>

                      {/* Member Count */}
                      <td className="py-3.5 px-4 text-center font-baloo whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md font-bold text-xs border border-blue-100">
                          {isBn ? `${toBanglaNumber(memberCount)} জন` : `${memberCount}`}
                        </span>
                      </td>

                      {/* Contact & Address */}
                      <td className="py-3.5 px-4">
                        {family.mobile ? (
                          <a
                            href={`tel:${family.mobile}`}
                            className="text-blue-700 hover:underline font-baloo font-semibold text-xs flex items-center space-x-1"
                          >
                            <Phone className="w-3 h-3 text-blue-600" />
                            <span>{family.mobile}</span>
                          </a>
                        ) : family.address ? (
                          <span className="text-slate-600 text-xs font-tiro line-clamp-1">{family.address}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{isBn ? 'নেই' : 'None'}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-siliguri">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isActive ? (isBn ? '● সক্রিয়' : '● Active') : (isBn ? '○ নিষ্ক্রিয়' : '○ Inactive')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(family)}
                              title={isBn ? 'বিস্তারিত দেখুন' : 'View details'}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(family)}
                                title={isBn ? 'সম্পাদনা করুন' : 'Edit'}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {canEdit && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenActionMenuId(isMenuOpen ? null : family.id)}
                                  className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {isMenuOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => setOpenActionMenuId(null)}
                                    />
                                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 z-30 py-1.5 text-xs font-siliguri divide-y divide-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDetail(family)}
                                        className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{isBn ? 'বিস্তারিত খতিয়ান' : 'View Profile'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(family)}
                                        className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{isBn ? 'সম্পাদনা করুন' : 'Edit Family'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenStatusConfirm(family, isActive ? 'INACTIVE' : 'ACTIVE')}
                                        className={`w-full px-3 py-2 text-left flex items-center space-x-2 cursor-pointer ${
                                          isActive
                                            ? 'text-amber-700 hover:bg-amber-50'
                                            : 'text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                        <span>
                                          {isActive
                                            ? (isBn ? 'নিষ্ক্রিয় করুন' : 'Mark Inactive')
                                            : (isBn ? 'সক্রিয় করুন' : 'Mark Active')}
                                        </span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Responsive Cards View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredFamilies.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Home className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-700 font-siliguri">
              {isBn ? 'কোনো পরিবার পাওয়া যায়নি' : 'No Families Found'}
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold font-siliguri"
              >
                {isBn ? '＋ নতুন পরিবার যোগ করুন' : '＋ Add Family'}
              </button>
            )}
          </div>
        ) : (
          filteredFamilies.map((family) => {
            const area = areaMap[family.areaId];
            const headPerson = family.familyHeadPersonId ? personMap[family.familyHeadPersonId] : null;
            const memberCount = family.memberCount || personsByFamily[family.id]?.length || 0;
            const isActive = family.status === 'ACTIVE';

            return (
              <div
                key={family.id}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3"
              >
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold font-baloo px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                        {family.familyCode || family.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-siliguri ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                      </span>
                    </div>
                    <h4
                      onClick={() => handleOpenDetail(family)}
                      className="text-sm font-bold text-slate-900 font-siliguri cursor-pointer hover:text-blue-700 pt-1"
                    >
                      {family.name}
                    </h4>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-baloo text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {isBn ? `${toBanglaNumber(memberCount)} জন` : `${memberCount} Persons`}
                    </span>
                  </div>
                </div>

                {/* Location & Contact Meta */}
                <div className="grid grid-cols-2 gap-2 text-xs font-tiro text-slate-600 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-siliguri">{isBn ? 'এলাকা:' : 'Area:'}</span>
                    <span className="font-semibold text-slate-800 font-siliguri flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{area ? area.name : (isBn ? 'অনির্দিষ্ট' : 'N/A')}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-siliguri">{isBn ? 'মোবাইল:' : 'Mobile:'}</span>
                    {family.mobile ? (
                      <a href={`tel:${family.mobile}`} className="font-baloo font-semibold text-blue-700">
                        {family.mobile}
                      </a>
                    ) : (
                      <span className="text-slate-400 font-tiro">{isBn ? 'নেই' : 'N/A'}</span>
                    )}
                  </div>
                </div>

                {family.houseRoadBlock && (
                  <div className="text-xs text-slate-500 font-tiro">
                    <span className="text-slate-400 font-siliguri">{isBn ? 'হোল্ডিং/রোড: ' : 'Road: '}</span>
                    {family.houseRoadBlock}
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenDetail(family)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg font-siliguri flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isBn ? 'বিস্তারিত' : 'Details'}</span>
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(family)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg font-siliguri flex items-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenStatusConfirm(family, isActive ? 'INACTIVE' : 'ACTIVE')}
                      className={`px-3 py-1.5 border text-xs font-semibold rounded-lg font-siliguri flex items-center space-x-1 ${
                        isActive
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? (isBn ? 'নিষ্ক্রিয়' : 'Deactivate') : (isBn ? 'সক্রিয়' : 'Activate')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <FamilyFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveFamily}
        initialData={editingFamily}
        existingFamilies={families}
        areas={areas}
        persons={persons}
        language={language}
      />

      <FamilyDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        family={selectedFamilyForDetail}
        area={selectedFamilyForDetail ? areaMap[selectedFamilyForDetail.areaId] : null}
        onEdit={(fam) => {
          setIsDetailOpen(false);
          handleOpenEdit(fam);
        }}
        linkedPersons={selectedFamilyForDetail ? personsByFamily[selectedFamilyForDetail.id] || [] : []}
        language={language}
      />

      <FamilyStatusConfirmModal
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        family={familyForStatusChange}
        targetStatus={targetStatus}
        isSubmitting={isChangingStatus}
        language={language}
      />
    </div>
  );
};

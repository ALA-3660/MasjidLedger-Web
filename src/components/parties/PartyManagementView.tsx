import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronRight,
  Edit3,
  Eye,
  GitMerge,
  Hammer,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Mosque, User } from '../../types';
import { Language } from '../../lib/i18n';
import { api } from '../../lib/api';
import {
  PARTY_PROFILE_TYPE_LABELS,
  formatPartyAddressLine,
  getAllRoleDefinitions,
  getPartyRoleLabelBn,
  hasClientPartyPermission,
} from '../../lib/partyCatalog';
import {
  PartyCustomRoleDef,
  PartyProfileType,
  PartyRecord,
  PartyRegistryStats,
  PartyStatus,
} from '../../types/partyTypes';
import { toBanglaNumber } from '../CommitteeView';
import { PartyFormView } from './PartyFormView';
import { PartyProfileView } from './PartyProfileView';
import { PartyDuplicateMergeView } from './PartyDuplicateMergeView';
import { PartyReportView } from './PartyReportView';

export type PartyRegistrySubView =
  | 'all'
  | 'buyers'
  | 'sellers_suppliers'
  | 'artisans_labourers'
  | 'contractors_providers'
  | 'organizations'
  | 'create'
  | 'duplicates'
  | 'reports'
  | 'profile'
  | 'edit';

export interface PartyManagementViewProps {
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  initialSubView?: PartyRegistrySubView;
}

const SUBVIEW_TO_CATEGORY: Record<
  string,
  'ALL' | 'BUYER' | 'SELLER_SUPPLIER' | 'ARTISAN_LABOUR' | 'CONTRACTOR_PROVIDER' | 'ORGANIZATION'
> = {
  all: 'ALL',
  buyers: 'BUYER',
  sellers_suppliers: 'SELLER_SUPPLIER',
  artisans_labourers: 'ARTISAN_LABOUR',
  contractors_providers: 'CONTRACTOR_PROVIDER',
  organizations: 'ORGANIZATION',
};

const SUBVIEW_TITLES: Record<string, string> = {
  all: 'সকল ব্যক্তি ও প্রতিষ্ঠান',
  buyers: 'ক্রেতা তালিকা',
  sellers_suppliers: 'বিক্রেতা ও সরবরাহকারী',
  artisans_labourers: 'কারিগর ও শ্রমিক',
  contractors_providers: 'ঠিকাদার ও সেবাদাতা',
  organizations: 'প্রতিষ্ঠান ও ব্যবসায়িক সংস্থা',
};

export const PartyManagementView: React.FC<PartyManagementViewProps> = ({
  currentMosque,
  currentUser,
  initialSubView = 'all',
}) => {
  const [subView, setSubView] = useState<PartyRegistrySubView>(initialSubView);
  const [lastListSubView, setLastListSubView] =
    useState<PartyRegistrySubView>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [parties, setParties] = useState<PartyRecord[]>([]);
  const [stats, setStats] = useState<PartyRegistryStats | null>(null);
  const [customRoles, setCustomRoles] = useState<PartyCustomRoleDef[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<PartyProfileType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<PartyStatus | 'ALL'>('ALL');

  // Selected Party for Profile / Edit
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [editingParty, setEditingParty] = useState<PartyRecord | null>(null);

  const canCreate = hasClientPartyPermission(currentUser, 'party.create');
  const canEdit = hasClientPartyPermission(currentUser, 'party.edit');
  const canDelete = hasClientPartyPermission(currentUser, 'party.delete');
  const canMerge = hasClientPartyPermission(currentUser, 'party.merge');
  const canManageRoles = hasClientPartyPermission(
    currentUser,
    'party.manage_roles'
  );
  const canViewAudit = hasClientPartyPermission(
    currentUser,
    'party.view_audit'
  );
  const canUseOcr = hasClientPartyPermission(currentUser, 'party.ocr');

  const allRoles = useMemo(
    () => getAllRoleDefinitions(customRoles),
    [customRoles]
  );

  const loadDirectory = async (targetView: PartyRegistrySubView = subView) => {
    const categoryGroup = SUBVIEW_TO_CATEGORY[targetView] || 'ALL';
    try {
      setLoading(true);
      setErrorMsg('');
      const [statsRes, rolesRes, listRes] = await Promise.all([
        api.getPartyStats(),
        api.getPartyRoles(),
        api.getParties({
          search: searchQuery.trim() || undefined,
          categoryGroup,
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
          partyType:
            targetView === 'organizations'
              ? 'ORGANIZATION'
              : typeFilter !== 'ALL'
              ? typeFilter
              : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
      ]);
      setStats(statsRes);
      setCustomRoles(rolesRes.custom || []);
      setParties(listRes);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'ব্যক্তি ও প্রতিষ্ঠানের তথ্য লোড করতে ব্যর্থ হয়েছে।'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (SUBVIEW_TO_CATEGORY[subView]) {
      loadDirectory(subView);
    }
  }, [subView, roleFilter, typeFilter, statusFilter, currentMosque?.id]);

  // Debounced search refresh
  useEffect(() => {
    if (!SUBVIEW_TO_CATEGORY[subView]) return;
    const timer = setTimeout(() => {
      loadDirectory(subView);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectNav = (next: PartyRegistrySubView) => {
    if (SUBVIEW_TO_CATEGORY[next]) {
      setLastListSubView(next);
      setRoleFilter('ALL');
      setTypeFilter('ALL');
    }
    setSubView(next);
    setIsMobileMenuOpen(false);
  };

  const openProfile = (id: string) => {
    setSelectedPartyId(id);
    setSubView('profile');
  };

  const openEdit = (party: PartyRecord) => {
    setEditingParty(party);
    setSubView('edit');
  };

  const navItems: Array<{
    id: PartyRegistrySubView;
    label: string;
    subLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    alertCount?: number;
    hidden?: boolean;
  }> = [
    {
      id: 'all',
      label: 'সকল ব্যক্তি ও প্রতিষ্ঠান',
      subLabel: 'একীভূত কেন্দ্রীয় তালিকা',
      icon: Users,
      count: stats?.totalAll,
    },
    {
      id: 'buyers',
      label: 'ক্রেতা',
      subLabel: 'ক্রয়কারী ব্যক্তি/সংস্থা',
      icon: ShoppingBag,
      count: stats?.buyersCount,
    },
    {
      id: 'sellers_suppliers',
      label: 'বিক্রেতা ও সরবরাহকারী',
      subLabel: 'ভেন্ডর, দোকান ও সাপ্লায়ার',
      icon: Package,
      count: stats?.sellersSuppliersCount,
    },
    {
      id: 'artisans_labourers',
      label: 'কারিগর ও শ্রমিক',
      subLabel: 'ইলেকট্রিশিয়ান, মিস্ত্রী ও শ্রমিক',
      icon: Hammer,
      count: stats?.artisansLabourersCount,
    },
    {
      id: 'contractors_providers',
      label: 'ঠিকাদার ও সেবাদাতা',
      subLabel: 'ঠিকাদার, সেবাদাতা ও পরামর্শক',
      icon: Truck,
      count: stats?.contractorsProvidersCount,
    },
    {
      id: 'organizations',
      label: 'প্রতিষ্ঠান ও ব্যবসায়িক সংস্থা',
      subLabel: 'কোম্পানি, দোকান ও সংস্থা',
      icon: Building2,
      count: stats?.organizationsCount,
    },
    {
      id: 'create',
      label: 'নতুন ব্যক্তি/প্রতিষ্ঠান যোগ করুন',
      subLabel: 'নতুন প্রোফাইল নিবন্ধন',
      icon: UserPlus,
      hidden: !canCreate,
    },
    {
      id: 'duplicates',
      label: 'ডুপ্লিকেট তথ্য শনাক্তকরণ',
      subLabel: 'তুলনা ও নিরাপদ Merge',
      icon: GitMerge,
      alertCount: stats?.duplicatePairsCount,
    },
    {
      id: 'reports',
      label: 'রিপোর্ট ও এক্সপোর্ট',
      subLabel: 'Print / PDF / Excel ও ইতিহাস',
      icon: BarChart3,
    },
  ];

  const isListView = Boolean(SUBVIEW_TO_CATEGORY[subView]);

  return (
    <div className="space-y-4 font-siliguri">
      {/* Top Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="মেনু খুলুন"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              ব্যক্তি, প্রতিষ্ঠান ও সেবাদাতা ব্যবস্থাপনা
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentMosque?.name
                ? `${currentMosque.name} · `
                : ''}
              কেন্দ্রীয় প্রোফাইল রেজিস্ট্রি (ক্রেতা, বিক্রেতা, সরবরাহকারী, কারিগর, শ্রমিক ও ঠিকাদার)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subView !== 'reports' && (
            <button
              type="button"
              onClick={() => handleSelectNav('reports')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              রিপোর্ট ও এক্সপোর্ট
            </button>
          )}
          {canCreate && subView !== 'create' && (
            <button
              type="button"
              onClick={() => handleSelectNav('create')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              নতুন ব্যক্তি / প্রতিষ্ঠান
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Secondary Sidebar + Content Area */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Secondary Sidebar */}
        <aside
          className={`w-full lg:w-68 shrink-0 bg-white border border-slate-200 rounded-xl p-2.5 space-y-1 ${
            isMobileMenuOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          {navItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                subView === item.id ||
                ((subView === 'profile' || subView === 'edit') &&
                  lastListSubView === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.subLabel}
                      </div>
                    </div>
                  </div>
                  {typeof item.count === 'number' && (
                    <span className="text-xs font-bold font-baloo tabular-nums text-slate-600 shrink-0">
                      {toBanglaNumber(item.count)}
                    </span>
                  )}
                  {typeof item.alertCount === 'number' &&
                    item.alertCount > 0 && (
                      <span className="text-xs font-bold font-baloo tabular-nums text-amber-800 shrink-0">
                        {toBanglaNumber(item.alertCount)}!
                      </span>
                    )}
                </button>
              );
            })}
        </aside>

        {/* Right Primary Workspace */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Subview: Create */}
          {subView === 'create' && (
            <PartyFormView
              mode="create"
              customRoles={customRoles}
              canManageRoles={canManageRoles}
              canUseOcr={canUseOcr}
              onCancel={() => handleSelectNav(lastListSubView)}
              onCustomRoleCreated={(r) => setCustomRoles((prev) => [...prev, r])}
              onOpenExistingProfile={openProfile}
              onSaved={(saved) => {
                setSelectedPartyId(saved.id);
                setSubView('profile');
                loadDirectory(lastListSubView);
              }}
            />
          )}

          {/* Subview: Edit */}
          {subView === 'edit' && editingParty && (
            <PartyFormView
              mode="edit"
              initialParty={editingParty}
              customRoles={customRoles}
              canManageRoles={canManageRoles}
              canUseOcr={canUseOcr}
              onCancel={() => {
                setSelectedPartyId(editingParty.id);
                setSubView('profile');
              }}
              onCustomRoleCreated={(r) => setCustomRoles((prev) => [...prev, r])}
              onOpenExistingProfile={openProfile}
              onSaved={(saved) => {
                setEditingParty(null);
                setSelectedPartyId(saved.id);
                setSubView('profile');
                loadDirectory(lastListSubView);
              }}
            />
          )}

          {/* Subview: Profile */}
          {subView === 'profile' && selectedPartyId && (
            <PartyProfileView
              currentMosque={currentMosque}
              partyIdOrRecordId={selectedPartyId}
              customRoles={customRoles}
              canEdit={canEdit}
              canDelete={canDelete}
              canViewAudit={canViewAudit}
              onBack={() => handleSelectNav(lastListSubView)}
              onEdit={openEdit}
              onOpenParty={openProfile}
              onStatusChanged={() => loadDirectory(lastListSubView)}
              onDeleted={() => {
                setSelectedPartyId(null);
                handleSelectNav(lastListSubView);
                loadDirectory(lastListSubView);
              }}
            />
          )}

          {/* Subview: Duplicates & Merge */}
          {subView === 'duplicates' && (
            <PartyDuplicateMergeView
              customRoles={customRoles}
              canMerge={canMerge}
              onOpenPartyProfile={openProfile}
              onMergedSuccess={() => loadDirectory('all')}
            />
          )}

          {/* Subview: Reports & Export */}
          {subView === 'reports' && (
            <PartyReportView
              currentMosque={currentMosque}
              customRoles={customRoles}
              onOpenParty={openProfile}
            />
          )}

          {/* Subviews: Unified Central Directory List + Category Filters */}
          {isListView && (
            <>
              {/* Compact Summary Strip (Clean 1px bordered cards, tabular numbers) */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      মোট প্রোফাইল
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-baloo tabular-nums mt-0.5">
                      {toBanglaNumber(stats.totalAll)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      সক্রিয় {toBanglaNumber(stats.totalActive)} · নিষ্ক্রিয়{' '}
                      {toBanglaNumber(stats.totalInactive)}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      ব্যক্তি বনাম প্রতিষ্ঠান
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-baloo tabular-nums mt-0.5">
                      {toBanglaNumber(stats.individualsCount)} /{' '}
                      {toBanglaNumber(stats.organizationsCount)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      একক ব্যক্তি ও সংস্থা
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      কারিগর ও সরবরাহকারী
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-baloo tabular-nums mt-0.5">
                      {toBanglaNumber(stats.artisansLabourersCount)} ·{' '}
                      {toBanglaNumber(stats.sellersSuppliersCount)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      কারিগর/শ্রমিক ও বিক্রেতা
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectNav('duplicates')}
                    className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl px-4 py-3 text-left transition-colors"
                  >
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                      <span>সম্ভাব্য ডুপ্লিকেট</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div
                      className={`text-xl font-bold font-baloo tabular-nums mt-0.5 ${
                        stats.duplicatePairsCount > 0
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {toBanglaNumber(stats.duplicatePairsCount)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Merge ইতিহাস: {toBanglaNumber(stats.mergedRecordsCount)}টি
                    </div>
                  </button>
                </div>
              )}

              {/* Search & Filter Toolbar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {SUBVIEW_TITLES[subView]}
                  </h2>
                  <button
                    type="button"
                    onClick={() => loadDirectory(subView)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                    />
                    রিফ্রেশ
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                  <div className="lg:col-span-5 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="নাম, মোবাইল, NID, কোড বা দক্ষতা দিয়ে খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="ALL">সকল ভূমিকা (Roles)</option>
                      {allRoles.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.labelBn}
                        </option>
                      ))}
                    </select>
                  </div>

                  {subView !== 'organizations' && (
                    <div className="lg:col-span-2">
                      <select
                        value={typeFilter}
                        onChange={(e) =>
                          setTypeFilter(
                            e.target.value as PartyProfileType | 'ALL'
                          )
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="ALL">সকল ধরন</option>
                        <option value="INDIVIDUAL">ব্যক্তি</option>
                        <option value="ORGANIZATION">প্রতিষ্ঠান</option>
                      </select>
                    </div>
                  )}

                  <div
                    className={
                      subView === 'organizations'
                        ? 'lg:col-span-4'
                        : 'lg:col-span-2'
                    }
                  >
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as PartyStatus | 'ALL')
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="ALL">সকল অবস্থা</option>
                      <option value="ACTIVE">সক্রিয়</option>
                      <option value="INACTIVE">নিষ্ক্রিয়</option>
                    </select>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Directory Table / Empty / Loading */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-14 bg-slate-100 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : parties.length === 0 ? (
                  <div className="p-10 text-center space-y-2.5">
                    <Users className="w-9 h-9 text-slate-300 mx-auto" />
                    <div className="text-sm font-bold text-slate-800">
                      এই তালিকায় এখনও কোনো ব্যক্তি বা প্রতিষ্ঠান নেই
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      ফিল্টার পরিবর্তন করে দেখুন অথবা নতুন ব্যক্তি, প্রতিষ্ঠান বা সেবাদাতার প্রোফাইল যোগ করুন।
                    </p>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => handleSelectNav('create')}
                        className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        নতুন যোগ করুন
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            পরিচিতি ও কোড
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            ভূমিকাসমূহ (Roles)
                          </th>
                          <th className="px-4 py-3 font-semibold">যোগাযোগ</th>
                          <th className="px-4 py-3 font-semibold">
                            ঠিকানা / অবস্থান
                          </th>
                          <th className="px-4 py-3 font-semibold">অবস্থা</th>
                          <th className="px-4 py-3 font-semibold text-right">
                            কার্যক্রম
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parties.map((p) => {
                          const addr = formatPartyAddressLine(p);
                          return (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => openProfile(p.id)}
                                  className="flex items-center gap-3 text-left group"
                                >
                                  <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                    {p.photoOrLogoUrl ? (
                                      <img
                                        src={p.photoOrLogoUrl}
                                        alt={p.name}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : p.partyType === 'ORGANIZATION' ? (
                                      <Building2 className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <UserIcon className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                                      {p.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      <span className="font-baloo font-semibold text-slate-600">
                                        {p.partyCode}
                                      </span>
                                      {' · '}
                                      {p.partyType === 'ORGANIZATION'
                                        ? 'প্রতিষ্ঠান'
                                        : 'ব্যক্তি'}
                                    </div>
                                  </div>
                                </button>
                              </td>
                              <td className="px-4 py-3 text-slate-800 max-w-xs">
                                <div className="font-semibold text-emerald-900">
                                  {(p.roles || [])
                                    .map((r) =>
                                      getPartyRoleLabelBn(r, customRoles)
                                    )
                                    .join(' · ')}
                                </div>
                                {p.occupationOrSkill && (
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {p.occupationOrSkill}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900 font-baloo tabular-nums">
                                  {p.phone}
                                </div>
                                {p.alternatePhone && (
                                  <div className="text-[11px] text-slate-500 font-baloo tabular-nums">
                                    {p.alternatePhone}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-700 max-w-xs">
                                <div className="truncate">
                                  {addr || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-xs font-semibold ${
                                    p.status === 'ACTIVE'
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {p.status === 'ACTIVE'
                                    ? '● সক্রিয়'
                                    : '○ নিষ্ক্রিয়'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openProfile(p.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    প্রোফাইল
                                  </button>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => openEdit(p)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-800 font-semibold"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      সম্পাদনা
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

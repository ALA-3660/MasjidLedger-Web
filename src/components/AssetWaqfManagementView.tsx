import React, { useState, useMemo } from 'react';
import {
  Package,
  Building,
  Users2,
  FileText,
  FileSpreadsheet,
  Layers,
  Compass,
  LayoutDashboard,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Archive,
  Printer,
  Calendar,
  Phone,
  CreditCard,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Grid,
  List,
  ChevronRight,
  TrendingUp,
  Tag,
  Wrench,
  Receipt,
  FolderOpen,
  DollarSign,
  AlertTriangle,
  Landmark,
  Scale,
  RefreshCw,
  FileCheck,
  UserCheck
} from 'lucide-react';
import {
  MosqueAsset,
  MosqueProperty,
  PropertyTenant,
  PropertyRentCollection,
  PropertyKhajnaRecord,
  PropertyDocument,
  PropertyInspectionRecord,
  PropertyLegalCase,
  Mosque,
  User,
  FinancialAccount,
  AccountHead
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import {
  AssetWaqfSecondarySidebar,
  AssetWaqfSubSection
} from './AssetWaqfSecondarySidebar';
import { toBanglaNumber } from './CommitteeView';

// Sub-modals
import { AssetFormModal, ASSET_CATEGORIES, ASSET_CONDITIONS } from './AssetFormModal';
import { AssetDetailsModal } from './AssetDetailsModal';
import { AssetServiceModal } from './AssetServiceModal';
import { AssetRegisterModal } from './AssetRegisterModal';
import { PropertyFormModal, PROPERTY_CATEGORIES, POSSESSION_STATUSES, PROPERTY_STATUSES } from './PropertyFormModal';
import { PropertyTenantModal } from './PropertyTenantModal';
import { PropertyDocumentModal } from './PropertyDocumentModal';
import { PropertyInspectionModal } from './PropertyInspectionModal';
import { PropertyLegalCaseModal } from './PropertyLegalCaseModal';
import { PropertyDetailsDrawer } from './PropertyDetailsDrawer';
import { PropertyCertificatePrint } from './PropertyCertificatePrint';
import { PropertyReportsModal } from './PropertyReportsModal';
import { PropertyKhajnaModal } from './PropertyKhajnaModal';
import { PropertyRentCollectionModal } from './PropertyRentCollectionModal';
import { PropertyRentReceiptModal } from './PropertyRentReceiptModal';
import { ConfirmDialog } from './common/ConfirmDialog';
import { LegalManagementView } from './legal/LegalManagementView';

export interface AssetWaqfManagementViewProps {
  assets: MosqueAsset[];
  properties: MosqueProperty[];
  accounts?: FinancialAccount[];
  accountHeads?: AccountHead[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  initialSection?: AssetWaqfSubSection;
  onNavigateTab?: (tab: string) => void;

  // Asset Mutation Callbacks
  onAddAsset?: (data: any) => Promise<void>;
  onUpdateAsset?: (id: string, data: any) => Promise<void>;
  onDeleteAsset?: (id: string, force?: boolean) => Promise<void>;
  onArchiveAsset?: (id: string, isArchived: boolean, reason?: string) => Promise<void>;
  onAddAssetService?: (id: string, data: any) => Promise<void>;

  // Property Mutation Callbacks
  onAddProperty?: (data: any) => Promise<void>;
  onUpdateProperty?: (id: string, data: any) => Promise<void>;
  onDeleteProperty?: (id: string, force?: boolean) => Promise<void>;
  onArchiveProperty?: (id: string, isArchived: boolean) => Promise<void>;
  onAddPropertyTenant?: (propertyId: string, data: any) => Promise<void>;
  onTerminatePropertyTenant?: (propertyId: string, tenantId: string) => Promise<void>;
  onAddPropertyInspection?: (propertyId: string, data: any) => Promise<void>;
  onAddPropertyLegalCase?: (propertyId: string, data: any) => Promise<void>;
  onAddPropertyDocument?: (propertyId: string, data: any) => Promise<void>;
  onDeletePropertyDocument?: (propertyId: string, documentId: string) => Promise<void>;
}

export const AssetWaqfManagementView: React.FC<AssetWaqfManagementViewProps> = ({
  assets = [],
  properties = [],
  accounts = [],
  accountHeads = [],
  currentMosque,
  currentUser,
  language = 'bn',
  initialSection = 'assets',
  onNavigateTab,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onArchiveAsset,
  onAddAssetService,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onArchiveProperty,
  onAddPropertyTenant,
  onTerminatePropertyTenant,
  onAddPropertyInspection,
  onAddPropertyLegalCase,
  onAddPropertyDocument,
  onDeletePropertyDocument
}) => {
  const [activeSection, setActiveSection] = useState<AssetWaqfSubSection>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter states
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>('ALL');
  const [assetConditionFilter, setAssetConditionFilter] = useState<string>('ALL');
  const [propertyCategoryFilter, setPropertyCategoryFilter] = useState<string>('ALL');
  const [propertyPossessionFilter, setPropertyPossessionFilter] = useState<string>('ALL');
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<MosqueAsset | null>(null);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<MosqueAsset | null>(null);
  const [selectedAssetForService, setSelectedAssetForService] = useState<MosqueAsset | null>(null);
  const [isAssetRegisterOpen, setIsAssetRegisterOpen] = useState(false);

  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
  const [selectedPropertyForEdit, setSelectedPropertyForEdit] = useState<MosqueProperty | null>(null);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<MosqueProperty | null>(null);
  const [selectedPropertyForCertificate, setSelectedPropertyForCertificate] = useState<MosqueProperty | null>(null);
  const [isPropertyReportsOpen, setIsPropertyReportsOpen] = useState(false);

  // Sub-record modals
  const [tenantModalProperty, setTenantModalProperty] = useState<MosqueProperty | null>(null);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<PropertyTenant | null>(null);
  const [rentModalData, setRentModalData] = useState<{ property: MosqueProperty; tenant: PropertyTenant } | null>(null);
  const [activeRentReceipt, setActiveRentReceipt] = useState<{ collection: PropertyRentCollection; property: MosqueProperty } | null>(null);
  const [docModalProperty, setDocModalProperty] = useState<MosqueProperty | null>(null);
  const [inspectionModalProperty, setInspectionModalProperty] = useState<MosqueProperty | null>(null);
  const [caseModalProperty, setCaseModalProperty] = useState<MosqueProperty | null>(null);
  const [khajnaModalProperty, setKhajnaModalProperty] = useState<MosqueProperty | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  const isBn = language === 'bn';
  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN' || currentUser?.role === 'ACCOUNTANT';

  // Extract all tenants and leases across all properties
  const allTenantsList = useMemo(() => {
    const list: { tenant: PropertyTenant; property: MosqueProperty }[] = [];
    properties.forEach((p) => {
      if (p.tenants && Array.isArray(p.tenants)) {
        p.tenants.forEach((t) => {
          list.push({ tenant: t, property: p });
        });
      }
    });
    return list;
  }, [properties]);

  // Extract all land records across all properties
  const allLandRecordsCount = useMemo(() => {
    return properties.filter((p) => p.mouza || p.bsPlotNo || p.plotNo || p.csKhatianNo || p.bsKhatianNo).length;
  }, [properties]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (a.isDeleted) return false;
      const matchSearch =
        !searchQuery ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = assetCategoryFilter === 'ALL' || a.category === assetCategoryFilter;
      const matchCond = assetConditionFilter === 'ALL' || a.condition === assetConditionFilter;
      return matchSearch && matchCat && matchCond;
    });
  }, [assets, searchQuery, assetCategoryFilter, assetConditionFilter]);

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (p.isArchived) return false;
      const matchSearch =
        !searchQuery ||
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.nameBn && p.nameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.propertyCode && p.propertyCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.mouza && p.mouza.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = propertyCategoryFilter === 'ALL' || p.category === propertyCategoryFilter;
      const matchPoss = propertyPossessionFilter === 'ALL' || p.possessionStatus === propertyPossessionFilter;
      return matchSearch && matchCat && matchPoss;
    });
  }, [properties, searchQuery, propertyCategoryFilter, propertyPossessionFilter]);

  // Filtered Tenants
  const filteredTenants = useMemo(() => {
    return allTenantsList.filter(({ tenant, property }) => {
      const matchSearch =
        !searchQuery ||
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.mobile.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tenant.unitOrShopNo && tenant.unitOrShopNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (property.name && property.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = tenantStatusFilter === 'ALL' || tenant.status === tenantStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [allTenantsList, searchQuery, tenantStatusFilter]);

  // Asset Metrics
  const assetMetrics = useMemo(() => {
    const active = assets.filter((a) => !a.isArchived && !a.isDeleted);
    const totalPurchaseVal = active.reduce((sum, a) => sum + (a.purchaseValue || 0), 0);
    const totalCurrentVal = active.reduce((sum, a) => sum + (a.currentValue || 0), 0);
    const inRepair = active.filter((a) => a.condition === 'IN_REPAIR' || a.condition === 'DAMAGED').length;
    return {
      totalCount: active.length,
      totalPurchaseVal,
      totalCurrentVal,
      inRepair
    };
  }, [assets]);

  // Property Metrics
  const propertyMetrics = useMemo(() => {
    const active = properties.filter((p) => !p.isArchived);
    const totalEstValue = active.reduce((sum, p) => sum + (p.estimatedValue || 0), 0);
    const totalMonthlyIncome = active.reduce((sum, p) => sum + (p.monthlyIncome || p.monthlyRent || 0), 0);
    const rentedOrLeasedCount = active.filter((p) => p.possessionStatus === 'RENTED' || p.possessionStatus === 'LEASED').length;
    return {
      totalCount: active.length,
      totalEstValue,
      totalMonthlyIncome,
      rentedOrLeasedCount
    };
  }, [properties]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-siliguri">
      {/* 1. Page Header */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-700 to-orange-700 flex items-center justify-center text-white shadow-md shadow-amber-600/20 shrink-0 text-xl font-bold">
              🏢
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-siliguri">
                  সম্পদ ও ওয়াকফ ব্যবস্থাপনা
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-baloo">
                  সমন্বিত স্থাবর ও অস্থাবর মডিউল
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-tiro">
                {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ ওয়াকফ এস্টেট'} • সকল সম্পদ, ওয়াকফ জমি, মার্কেট, দোকান, ভাড়াটিয়া ও আইনি রেকর্ড
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPropertyReportsOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>রিপোর্ট ও এক্সপোর্ট</span>
            </button>

            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssetForEdit(null);
                    setIsAssetFormOpen(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>+ নতুন সরঞ্জাম</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPropertyForEdit(null);
                    setIsPropertyFormOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ নতুন ওয়াকফ সম্পত্তি</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout with Secondary Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Secondary Sidebar */}
        <AssetWaqfSecondarySidebar
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            setSearchQuery('');
          }}
          totalAssetsCount={assetMetrics.totalCount}
          totalPropertiesCount={propertyMetrics.totalCount}
          totalTenantsCount={allTenantsList.length}
          totalLeasesCount={allTenantsList.filter(t => t.tenant.agreementNo).length}
          totalLandRecordsCount={allLandRecordsCount}
          language={language}
          onOpenNewAsset={() => {
            setSelectedAssetForEdit(null);
            setIsAssetFormOpen(true);
          }}
          onOpenNewProperty={() => {
            setSelectedPropertyForEdit(null);
            setIsPropertyFormOpen(true);
          }}
          onOpenNewTenant={() => {
            setSelectedTenantForEdit(null);
            setTenantModalProperty(properties[0] || null);
          }}
          canEdit={canEdit}
        />

        {/* Right Dynamic Content Area */}
        <main className="flex-1 w-full space-y-6">
          
          {/* ========================================================================= */}
          {/* SECTION 1: 📦 মসজিদের সম্পদ ও সরঞ্জাম (ASSETS) */}
          {/* ========================================================================= */}
          {activeSection === 'assets' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Asset Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">মোট সরঞ্জাম সংখ্যা</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-baloo">
                    {toBanglaNumber(assetMetrics.totalCount)} <span className="text-xs font-normal text-slate-500">টি</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">সক্রিয় ও রেজিস্ট্রিকৃত</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">মোট ক্রয়মূল্য</div>
                  <div className="text-lg sm:text-xl font-bold text-slate-900 font-baloo">
                    {formatCurrency(assetMetrics.totalPurchaseVal)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">মূলধন বিনিয়োগ</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">বর্তমান আনুমানিক মূল্য</div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-800 font-baloo">
                    {formatCurrency(assetMetrics.totalCurrentVal)}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">অবচয় পরবর্তী মূল্য</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">মেরামত / সার্ভিস প্রয়োজন</div>
                  <div className="text-xl sm:text-2xl font-black text-amber-700 font-baloo">
                    {toBanglaNumber(assetMetrics.inRepair)} <span className="text-xs font-normal text-slate-500">টি</span>
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1">রক্ষণাবেক্ষণ তালিকায়</div>
                </div>
              </div>

              {/* Filter & Toolbar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="সরঞ্জামের নাম, কোড বা অবস্থান খুঁজুন..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <select
                    value={assetCategoryFilter}
                    onChange={(e) => setAssetCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">সকল ক্যাটাগরি</option>
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.labelBn}</option>
                    ))}
                  </select>

                  <select
                    value={assetConditionFilter}
                    onChange={(e) => setAssetConditionFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">সকল অবস্থা</option>
                    {ASSET_CONDITIONS.map((c) => (
                      <option key={c.key} value={c.key}>{c.labelBn}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAssetRegisterOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>রেজিস্টার প্রিন্ট</span>
                  </button>

                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs ${viewMode === 'grid' ? 'bg-white shadow-2xs text-emerald-800' : 'text-slate-500'}`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs ${viewMode === 'table' ? 'bg-white shadow-2xs text-emerald-800' : 'text-slate-500'}`}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Assets Grid / Table Display */}
              {filteredAssets.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="font-bold text-slate-700 text-sm">কোনো সম্পদ বা সরঞ্জাম পাওয়া যায়নি</div>
                  <p className="text-xs text-slate-400 font-tiro max-w-sm mx-auto">
                    মসজিদের বৈদ্যুতিক, সাউন্ড, আসবাবপত্র ও অন্যান্য সরঞ্জাম যোগ করতে উপরের "+ নতুন সরঞ্জাম" বাটনে ক্লিক করুন।
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssets.map((asset) => {
                    const catObj = ASSET_CATEGORIES.find((c) => c.key === asset.category);
                    const condObj = ASSET_CONDITIONS.find((c) => c.key === asset.condition);
                    return (
                      <div
                        key={asset.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold font-baloo px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                {asset.assetCode}
                              </span>
                              <h3 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                                {asset.name}
                              </h3>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${condObj?.color || 'bg-slate-100 text-slate-700'}`}>
                              {condObj?.labelBn || asset.condition}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1 font-tiro">
                            <div className="flex items-center text-[11px] text-slate-500">
                              <Tag className="w-3 h-3 mr-1 text-slate-400" />
                              <span>{catObj?.labelBn || asset.category}</span>
                              {asset.brand && <span className="ml-1">• {asset.brand}</span>}
                            </div>
                            <div className="flex items-center text-[11px] text-slate-500">
                              <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                              <span>{asset.location || 'নির্দিষ্ট অবস্থান নেই'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-slate-400">বর্তমান মূল্য</div>
                            <div className="font-bold text-xs text-slate-900 font-baloo">
                              {formatCurrency(asset.currentValue || asset.purchaseValue || 0)}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setSelectedAssetForDetails(asset)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                              title="বিস্তারিত দেখুন"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedAssetForService(asset)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded-lg"
                              title="সার্ভিস / মেরামত রেকর্ড"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAssetForEdit(asset);
                                  setIsAssetFormOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Assets Table View */
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="px-4 py-3">কোড</th>
                        <th className="px-4 py-3">সরঞ্জামের নাম</th>
                        <th className="px-4 py-3">ক্যাটাগরি</th>
                        <th className="px-4 py-3">অবস্থান</th>
                        <th className="px-4 py-3">অবস্থা</th>
                        <th className="px-4 py-3 text-right">মূল্য (৳)</th>
                        <th className="px-4 py-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredAssets.map((asset) => {
                        const catObj = ASSET_CATEGORIES.find((c) => c.key === asset.category);
                        const condObj = ASSET_CONDITIONS.find((c) => c.key === asset.condition);
                        return (
                          <tr key={asset.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-baloo font-bold text-slate-900">{asset.assetCode}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{asset.name}</td>
                            <td className="px-4 py-3 text-slate-600">{catObj?.labelBn || asset.category}</td>
                            <td className="px-4 py-3 text-slate-600">{asset.location || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${condObj?.color || 'bg-slate-100'}`}>
                                {condObj?.labelBn || asset.condition}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-baloo font-bold text-slate-900">
                              {formatCurrency(asset.currentValue || asset.purchaseValue || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAssetForDetails(asset)}
                                  className="p-1 text-slate-500 hover:text-emerald-700"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedAssetForService(asset)}
                                  className="p-1 text-slate-500 hover:text-amber-700"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                </button>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAssetForEdit(asset);
                                      setIsAssetFormOpen(true);
                                    }}
                                    className="p-1 text-slate-500 hover:text-blue-700"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
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
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: 🏞️ ওয়াকফ সম্পত্তি ও জমিজমা (PROPERTIES) */}
          {/* ========================================================================= */}
          {activeSection === 'properties' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Property Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">মোট সম্পত্তি সংখ্যা</div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-baloo">
                    {toBanglaNumber(propertyMetrics.totalCount)} <span className="text-xs font-normal text-slate-500">টি</span>
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-1">ওয়াকফ রেজিস্ট্রিভুক্ত</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">আনুমানিক বাজারমূল্য</div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-800 font-baloo">
                    {formatCurrency(propertyMetrics.totalEstValue)}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">ওয়াকফ এস্টেটের মূল্যায়ন</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">মাসিক সম্ভাব্য আয়</div>
                  <div className="text-lg sm:text-xl font-bold text-blue-800 font-baloo">
                    {formatCurrency(propertyMetrics.totalMonthlyIncome)}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-1">দোকান ও ইজারা ভাড়া</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">ভাড়াকৃত / ইজারাকৃত</div>
                  <div className="text-xl sm:text-2xl font-black text-indigo-800 font-baloo">
                    {toBanglaNumber(propertyMetrics.rentedOrLeasedCount)} <span className="text-xs font-normal text-slate-500">টি</span>
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-1">সক্রিয় রাজস্ব অর্জনকারী</div>
                </div>
              </div>

              {/* Toolbar & Filter */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="সম্পত্তির নাম, কোড, মৌজা বা দাগ খুঁজুন..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <select
                    value={propertyCategoryFilter}
                    onChange={(e) => setPropertyCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">সকল ক্যাটাগরি</option>
                    {PROPERTY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.labelBn}</option>
                    ))}
                  </select>

                  <select
                    value={propertyPossessionFilter}
                    onChange={(e) => setPropertyPossessionFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">সকল দখল অবস্থা</option>
                    {POSSESSION_STATUSES.map((p) => (
                      <option key={p.id} value={p.id}>{p.labelBn}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPropertyReportsOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>ওয়াকফ বিবরণী</span>
                  </button>
                </div>
              </div>

              {/* Property Cards */}
              {filteredProperties.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <Building className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="font-bold text-slate-700 text-sm">কোনো ওয়াকফ সম্পত্তি পাওয়া যায়নি</div>
                  <p className="text-xs text-slate-400 font-tiro max-w-sm mx-auto">
                    মসজিদের জমি, মার্কেট বা দোকান অন্তর্ভুক্ত করতে উপরে "+ নতুন ওয়াকফ সম্পত্তি" বাটনে ক্লিক করুন।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProperties.map((prop) => {
                    const catObj = PROPERTY_CATEGORIES.find((c) => c.id === prop.category);
                    const possObj = POSSESSION_STATUSES.find((p) => p.id === prop.possessionStatus);
                    const tenantCount = prop.tenants?.length || 0;

                    return (
                      <div
                        key={prop.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold font-baloo px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                {prop.propertyCode}
                              </span>
                              <h3 className="font-bold text-slate-900 text-base mt-1.5 leading-snug">
                                {prop.name || prop.nameBn || prop.description}
                              </h3>
                              <p className="text-xs text-slate-500 font-tiro mt-0.5">
                                {prop.location} {prop.mouza ? `• মৌজা: ${prop.mouza}` : ''}
                              </p>
                            </div>

                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${possObj?.color || 'bg-slate-100 text-slate-700'}`}>
                              {possObj?.labelBn || 'নিয়ন্ত্রণে'}
                            </span>
                          </div>

                          {/* Property Details Badges */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div className="p-2 bg-slate-50 rounded-xl">
                              <span className="text-[10px] text-slate-400 block">জমির পরিমাণ:</span>
                              <span className="font-bold text-slate-800 font-baloo">
                                {prop.area || `${prop.areaAmount || 0} শতাংশ`}
                              </span>
                            </div>

                            <div className="p-2 bg-slate-50 rounded-xl">
                              <span className="text-[10px] text-slate-400 block">বাজারমূল্য:</span>
                              <span className="font-bold text-emerald-800 font-baloo">
                                {prop.estimatedValue ? formatCurrency(prop.estimatedValue) : 'অনির্ধারিত'}
                              </span>
                            </div>

                            {prop.bsPlotNo && (
                              <div className="p-2 bg-slate-50 rounded-xl">
                                <span className="text-[10px] text-slate-400 block">বি.এস দাগ:</span>
                                <span className="font-bold text-slate-800 font-baloo">{prop.bsPlotNo}</span>
                              </div>
                            )}

                            <div className="p-2 bg-slate-50 rounded-xl">
                              <span className="text-[10px] text-slate-400 block">ভাড়াটিয়া / ইজারা:</span>
                              <span className="font-bold text-indigo-800 font-baloo">
                                {toBanglaNumber(tenantCount)} জন
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPropertyForDetails(prop)}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>বিস্তারিত</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedPropertyForCertificate(prop)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>প্রত্যয়নপত্র</span>
                            </button>
                          </div>

                          {canEdit && (
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setTenantModalProperty(prop);
                                  setSelectedTenantForEdit(null);
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                                title="ভাড়াটিয়া যোগ করুন"
                              >
                                <Plus className="w-3 h-3" />
                                <span>ভাড়াটিয়া</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPropertyForEdit(prop);
                                  setIsPropertyFormOpen(true);
                                }}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: 👨‍💼 ভাড়াটিয়া / ইজারাদার (TENANTS) */}
          {/* ========================================================================= */}
          {activeSection === 'tenants' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ভাড়াটিয়ার নাম, দোকান নং, মোবাইল বা সম্পত্তি খুঁজুন..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <select
                    value={tenantStatusFilter}
                    onChange={(e) => setTenantStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="ALL">সকল স্টেটাস</option>
                    <option value="ACTIVE">সক্রিয় ভাড়াটিয়া</option>
                    <option value="EXPIRING_SOON">মেয়াদ শেষের পথে</option>
                    <option value="EXPIRED">মেয়াদোত্তীর্ণ</option>
                    <option value="TERMINATED">সাবেক / বাতিল</option>
                  </select>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenantForEdit(null);
                      setTenantModalProperty(properties[0] || null);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ নতুন ভাড়াটিয়া / ইজারাদার</span>
                  </button>
                )}
              </div>

              {filteredTenants.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <Users2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="font-bold text-slate-700 text-sm">কোনো ভাড়াটিয়া বা ইজারাদার পাওয়া যায়নি</div>
                  <p className="text-xs text-slate-400 font-tiro max-w-sm mx-auto">
                    সম্পত্তির দোকান বা ইউনিটে ভাড়াটিয়া যোগ করতে নতুন ভাড়াটিয়া বাটনে ক্লিক করুন।
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTenantForEdit(null);
                        setTenantModalProperty(properties[0] || null);
                      }}
                      className="mt-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>নতুন ভাড়াটিয়া এন্ট্রি ফরম খুলুন</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="px-4 py-3">ভাড়াটিয়ার নাম ও কোড</th>
                        <th className="px-4 py-3">সম্পত্তি ও ইউনিট</th>
                        <th className="px-4 py-3">মোবাইল</th>
                        <th className="px-4 py-3 text-right">মাসিক ভাড়া</th>
                        <th className="px-4 py-3 text-right">জামানত</th>
                        <th className="px-4 py-3">চুক্তির মেয়াদ</th>
                        <th className="px-4 py-3">অবস্থা</th>
                        <th className="px-4 py-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredTenants.map(({ tenant, property }) => (
                        <tr key={tenant.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{tenant.name}</div>
                            <div className="text-[10px] text-slate-400 font-baloo">{tenant.tenantCode}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{property.name || property.propertyCode}</div>
                            <div className="text-[11px] text-indigo-700 font-semibold">{tenant.unitOrShopNo || 'ইউনিট অনির্ধারিত'}</div>
                          </td>
                          <td className="px-4 py-3 font-baloo">{tenant.mobile}</td>
                          <td className="px-4 py-3 text-right font-baloo font-bold text-emerald-800">
                            {formatCurrency(tenant.monthlyRent)}
                          </td>
                          <td className="px-4 py-3 text-right font-baloo text-slate-600">
                            {formatCurrency(tenant.securityDeposit || 0)}
                          </td>
                          <td className="px-4 py-3 text-[11px] font-baloo">
                            {tenant.startDate} থেকে {tenant.endDate}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tenant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {tenant.status === 'ACTIVE' ? 'সক্রিয়' : 'মেয়াদোত্তীর্ণ'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                type="button"
                                onClick={() => setRentModalData({ property, tenant })}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px]"
                                title="ভাড়া আদায়"
                              >
                                ভাড়া আদায়
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTenantModalProperty(property);
                                    setSelectedTenantForEdit(tenant);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-700"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: 📜 চুক্তি ও ইজারা ব্যবস্থাপনা (LEASES) */}
          {/* ========================================================================= */}
          {activeSection === 'leases' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-950 font-siliguri">ওয়াকফ সম্পত্তি ইজারা ও ভাড়াচুক্তি রেজিস্টার</h3>
                  <p className="text-xs text-amber-800 font-tiro mt-0.5">
                    আইনি চুক্তিনামা, মেয়াদ, মাসিক ভাড়া ও জামানতের কেন্দ্রীয় তদারকি
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-200/60 text-amber-900 rounded-xl text-xs font-bold font-baloo">
                  মোট চুক্তি: {toBanglaNumber(allTenantsList.length)} টি
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="px-4 py-3">চুক্তি নং</th>
                      <th className="px-4 py-3">সম্পত্তি ও কক্ষ/দোকান</th>
                      <th className="px-4 py-3">ভাড়াটিয়া / ইজারাদার</th>
                      <th className="px-4 py-3 text-right">নির্ধারিত ভাড়া</th>
                      <th className="px-4 py-3 text-right">জামানত স্থিতি</th>
                      <th className="px-4 py-3">চুক্তির মেয়াদ</th>
                      <th className="px-4 py-3">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {allTenantsList.map(({ tenant, property }) => (
                      <tr key={tenant.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-indigo-900 font-baloo">{tenant.agreementNo || `AGR-${tenant.tenantCode}`}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {property.name || property.propertyCode} ({tenant.unitOrShopNo || 'সাধারণ'})
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{tenant.name}</td>
                        <td className="px-4 py-3 text-right font-baloo font-bold text-emerald-800">{formatCurrency(tenant.monthlyRent)}</td>
                        <td className="px-4 py-3 text-right font-baloo text-slate-600">{formatCurrency(tenant.securityDeposit || 0)}</td>
                        <td className="px-4 py-3 font-baloo text-[11px]">{tenant.startDate} হতে {tenant.endDate}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {tenant.status === 'ACTIVE' ? 'কার্যকর' : 'মেয়াদোত্তীর্ণ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: 📑 ভূমি ও ওয়াকফ রেকর্ড (LAND RECORDS) */}
          {/* ========================================================================= */}
          {activeSection === 'land_records' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>ওয়াকফ সম্পত্তির দাগ, খতিয়ান ও ভূমি শিডিউল</span>
                  <span className="text-[11px] text-slate-500 font-tiro">খাজনা ও নামজারি রেকর্ডসহ</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {properties.map((prop) => (
                    <div key={prop.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold font-baloo px-2 py-0.5 rounded bg-amber-100 text-amber-900 mr-2">
                            {prop.propertyCode}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {prop.name || prop.description}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-baloo">
                          জমির পরিমাণ: <strong>{prop.area || '—'}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-tiro bg-slate-50 p-3 rounded-xl">
                        <div><strong>মৌজা:</strong> {prop.mouza || '—'}</div>
                        <div><strong>জে.এল নং:</strong> {prop.jlNumber || '—'}</div>
                        <div><strong>বি.এস দাগ:</strong> {prop.bsPlotNo || prop.plotNo || '—'}</div>
                        <div><strong>নামজারি খতিয়ান:</strong> {prop.mutationKhatianNo || prop.bsKhatianNo || '—'}</div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-slate-500 font-tiro">
                          সাব-রেজিস্ট্রি: {prop.subRegistryOffice || 'কক্সবাজার সদর'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setKhajnaModalProperty(prop)}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold flex items-center space-x-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>ভূমি উন্নয়ন কর / খাজনা দাখিলা</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: 📄 ওয়াকফ দলিল ও সম্পত্তির নথি (DOCUMENTS) */}
          {/* ========================================================================= */}
          {activeSection === 'documents' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-purple-950 font-siliguri">ওয়াকফ দলিল ও কেন্দ্রীয় নথিপত্র সংযোগ</h3>
                  <p className="text-xs text-purple-800 font-tiro mt-0.5">
                    সকল সম্পত্তির দলিল, নামজারি ও খতিয়ান সরাসরি কেন্দ্রীয় ডকুমেন্ট সেন্টারের সাথে সংযুক্ত
                  </p>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('documents')}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    সেন্ট্রাল ফাইল সেন্টার খুলুন
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map((prop) => (
                  <div key={prop.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-baloo px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {prop.propertyCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{prop.name || prop.description}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocModalProperty(prop)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>নথি যুক্ত</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600 font-tiro">
                      <div><strong>ওয়াকফ দলিল নং:</strong> {prop.waqfDeedNo || 'অনির্ধারিত'}</div>
                      <div><strong>দলিলের তারিখ:</strong> {prop.waqfDeedDate || '—'}</div>
                      <div><strong>ওয়াকিফের নাম:</strong> {prop.waqifName || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 7: 🧭 চতুঃসীমানা ও অবস্থান (BOUNDARIES) */}
          {/* ========================================================================= */}
          {activeSection === 'boundaries' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map((prop) => (
                  <div key={prop.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold font-baloo px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {prop.propertyCode}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{prop.name || prop.description}</h4>
                        <p className="text-xs text-slate-500 font-tiro">{prop.location} ({prop.mouza || ''})</p>
                      </div>
                      <Compass className="w-5 h-5 text-indigo-600 shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs font-tiro">
                      <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 block">উত্তর:</span>
                        <span className="text-slate-800">{prop.boundaryNorth || 'অনির্ধারিত'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 block">দক্ষিণ:</span>
                        <span className="text-slate-800">{prop.boundarySouth || 'অনির্ধারিত'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 block">পূর্ব:</span>
                        <span className="text-slate-800">{prop.boundaryEast || 'অনির্ধারিত'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 block">পশ্চিম:</span>
                        <span className="text-slate-800">{prop.boundaryWest || 'অনির্ধারিত'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. ⚖️ মামলা ও আইনি বিষয় / জমি ও সম্পত্তি বিরোধ Management */}
          {[
            'legal_cases',
            'legal_land_disputes',
            'legal_courts',
            'legal_parties',
            'legal_lawyers',
            'legal_hearings',
            'legal_orders',
            'legal_documents',
            'legal_reports',
            'legal_register'
          ].includes(activeSection) && (
            <LegalManagementView
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              properties={properties}
              currentMosque={currentMosque}
              currentUser={currentUser}
              language={language}
            />
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* ALL MODAL DIALOGS */}
      {/* ========================================================================= */}

      {/* 1. Asset Form Modal */}
      {isAssetFormOpen && (
        <AssetFormModal
          isOpen={isAssetFormOpen}
          onClose={() => {
            setIsAssetFormOpen(false);
            setSelectedAssetForEdit(null);
          }}
          asset={selectedAssetForEdit}
          onSubmit={async (data) => {
            if (selectedAssetForEdit && onUpdateAsset) {
              await onUpdateAsset(selectedAssetForEdit.id, data);
            } else if (onAddAsset) {
              await onAddAsset(data);
            }
          }}
          accounts={accounts}
          accountHeads={accountHeads}
          language={language}
        />
      )}

      {/* 2. Asset Details Modal */}
      {selectedAssetForDetails && (
        <AssetDetailsModal
          isOpen={!!selectedAssetForDetails}
          onClose={() => setSelectedAssetForDetails(null)}
          asset={selectedAssetForDetails}
          language={language}
          onOpenEdit={(asset) => {
            setSelectedAssetForDetails(null);
            setSelectedAssetForEdit(asset);
            setIsAssetFormOpen(true);
          }}
          onOpenService={(asset) => {
            setSelectedAssetForDetails(null);
            setSelectedAssetForService(asset);
          }}
        />
      )}

      {/* 3. Asset Service Modal */}
      {selectedAssetForService && (
        <AssetServiceModal
          isOpen={!!selectedAssetForService}
          onClose={() => setSelectedAssetForService(null)}
          asset={selectedAssetForService}
          language={language}
          onSubmit={async (data) => {
            if (onAddAssetService && selectedAssetForService) {
              await onAddAssetService(selectedAssetForService.id, data);
            }
          }}
        />
      )}

      {/* 4. Asset Register Print Modal */}
      {isAssetRegisterOpen && (
        <AssetRegisterModal
          isOpen={isAssetRegisterOpen}
          onClose={() => setIsAssetRegisterOpen(false)}
          assets={assets}
          mosqueName={currentMosque?.nameBn || currentMosque?.name}
          language={language}
        />
      )}

      {/* 5. Property Form Modal (4 Steps + Review Stage) */}
      {isPropertyFormOpen && (
        <PropertyFormModal
          isOpen={isPropertyFormOpen}
          onClose={() => {
            setIsPropertyFormOpen(false);
            setSelectedPropertyForEdit(null);
          }}
          property={selectedPropertyForEdit}
          onSubmit={async (data) => {
            if (selectedPropertyForEdit && onUpdateProperty) {
              await onUpdateProperty(selectedPropertyForEdit.id, data);
            } else if (onAddProperty) {
              await onAddProperty(data);
            }
          }}
          language={language}
        />
      )}

      {/* 6. Property Details Drawer */}
      {selectedPropertyForDetails && (
        <PropertyDetailsDrawer
          isOpen={!!selectedPropertyForDetails}
          onClose={() => setSelectedPropertyForDetails(null)}
          property={selectedPropertyForDetails}
          onOpenTenantModal={(prop) => {
            setTenantModalProperty(prop);
            setSelectedTenantForEdit(null);
          }}
          onOpenDocumentModal={(prop) => setDocModalProperty(prop)}
          onOpenInspectionModal={(prop) => setInspectionModalProperty(prop)}
          onOpenLegalCaseModal={(prop) => setCaseModalProperty(prop)}
          onOpenKhajnaModal={(prop) => setKhajnaModalProperty(prop)}
          language={language}
        />
      )}

      {/* 7. Property Certificate Print */}
      {selectedPropertyForCertificate && (
        <PropertyCertificatePrint
          isOpen={!!selectedPropertyForCertificate}
          onClose={() => setSelectedPropertyForCertificate(null)}
          property={selectedPropertyForCertificate}
          mosque={currentMosque}
          language={language}
        />
      )}

      {/* 8. Property Reports Modal */}
      {isPropertyReportsOpen && (
        <PropertyReportsModal
          isOpen={isPropertyReportsOpen}
          onClose={() => setIsPropertyReportsOpen(false)}
          properties={properties}
          mosqueName={currentMosque?.nameBn || currentMosque?.name}
          language={language}
        />
      )}

      {/* 9. Property Tenant Modal */}
      {(tenantModalProperty || selectedTenantForEdit) && (
        <PropertyTenantModal
          isOpen={Boolean(tenantModalProperty || selectedTenantForEdit)}
          onClose={() => {
            setTenantModalProperty(null);
            setSelectedTenantForEdit(null);
          }}
          property={tenantModalProperty}
          properties={properties}
          tenant={selectedTenantForEdit}
          onSubmit={async (tenantData, chosenPropertyId) => {
            const targetPropId = chosenPropertyId || tenantModalProperty?.id || properties[0]?.id;
            if (onAddPropertyTenant && targetPropId) {
              await onAddPropertyTenant(targetPropId, tenantData);
            }
          }}
          language={language}
        />
      )}

      {/* 10. Rent Collection Modal */}
      {rentModalData && (
        <PropertyRentCollectionModal
          isOpen={!!rentModalData}
          onClose={() => setRentModalData(null)}
          property={rentModalData.property}
          tenant={rentModalData.tenant}
          accounts={accounts}
          currentUser={currentUser}
          onSubmit={async (col) => {
            setActiveRentReceipt({ collection: col, property: rentModalData.property });
            setRentModalData(null);
          }}
        />
      )}

      {/* 11. Rent Receipt Modal */}
      {activeRentReceipt && (
        <PropertyRentReceiptModal
          isOpen={!!activeRentReceipt}
          onClose={() => setActiveRentReceipt(null)}
          collection={activeRentReceipt.collection}
          property={activeRentReceipt.property}
          mosque={currentMosque}
        />
      )}

      {/* 12. Property Document Modal */}
      {docModalProperty && (
        <PropertyDocumentModal
          isOpen={!!docModalProperty}
          onClose={() => setDocModalProperty(null)}
          property={docModalProperty}
          onSubmit={async (doc) => {
            if (onAddPropertyDocument && docModalProperty) {
              await onAddPropertyDocument(docModalProperty.id, doc);
            }
          }}
          language={language}
        />
      )}

      {/* 13. Property Inspection Modal */}
      {inspectionModalProperty && (
        <PropertyInspectionModal
          isOpen={!!inspectionModalProperty}
          onClose={() => setInspectionModalProperty(null)}
          property={inspectionModalProperty}
          onSubmit={async (insp) => {
            if (onAddPropertyInspection && inspectionModalProperty) {
              await onAddPropertyInspection(inspectionModalProperty.id, insp);
            }
          }}
          language={language}
        />
      )}

      {/* 14. Property Legal Case Modal */}
      {caseModalProperty && (
        <PropertyLegalCaseModal
          isOpen={!!caseModalProperty}
          onClose={() => setCaseModalProperty(null)}
          property={caseModalProperty}
          onSubmit={async (legalCase) => {
            if (onAddPropertyLegalCase && caseModalProperty) {
              await onAddPropertyLegalCase(caseModalProperty.id, legalCase);
            }
          }}
          language={language}
        />
      )}

      {/* 15. Property Khajna Modal */}
      {khajnaModalProperty && (
        <PropertyKhajnaModal
          isOpen={!!khajnaModalProperty}
          onClose={() => setKhajnaModalProperty(null)}
          property={khajnaModalProperty}
          onSubmit={async () => {
            setKhajnaModalProperty(null);
          }}
        />
      )}

      {/* 16. Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          isDanger={confirmDialog.isDanger}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

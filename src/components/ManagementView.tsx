import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Package,
  Building,
  Crosshair,
  Bell,
  Plus,
  DollarSign,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Filter,
  Eye,
  Edit2,
  Printer,
  FileSpreadsheet,
  UserPlus,
  ShieldCheck,
  Briefcase,
  History,
  Gift,
  Receipt,
  Wrench,
  Archive,
  Trash2,
  Tag,
  MapPin,
  Clock,
  Sparkles,
  Link as LinkIcon,
  Layers,
  LayoutGrid,
  List,
  Landmark,
  TrendingUp,
  Scale,
  AlertTriangle,
  Grid
} from 'lucide-react';
import {
  Staff,
  StaffPayment,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  FinancialAccount,
  AccountHead,
  CommitteeTerm,
  ExpenseEntry,
  MosqueProfile,
  Mosque
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { StaffFormModal } from './StaffFormModal';
import { StaffPaymentModal } from './StaffPaymentModal';
import { StaffProfileDrawer } from './StaffProfileDrawer';
import { StaffSalarySlipModal } from './StaffSalarySlipModal';
import { StaffMasterRegisterModal } from './StaffMasterRegisterModal';
import { StaffPaymentRegisterModal } from './StaffPaymentRegisterModal';
import { StaffAnnualStatementModal } from './StaffAnnualStatementModal';
import { BankTransferLetterModal } from './BankTransferLetterModal';
import { StaffFestivalAllowanceModal } from './StaffFestivalAllowanceModal';
import { StaffReportsModal, StaffReportType } from './StaffReportsModal';
import { AssetFormModal, ASSET_CATEGORIES, ASSET_CONDITIONS } from './AssetFormModal';
import { AssetDetailsModal } from './AssetDetailsModal';
import { AssetServiceModal } from './AssetServiceModal';
import { AssetRegisterModal } from './AssetRegisterModal';
import { PropertyFormModal, PROPERTY_CATEGORIES, POSSESSION_STATUSES, PROPERTY_STATUSES } from './PropertyFormModal';
import { PropertyTenantModal } from './PropertyTenantModal';
import { PropertyInspectionModal } from './PropertyInspectionModal';
import { PropertyLegalCaseModal } from './PropertyLegalCaseModal';
import { PropertyDetailsDrawer } from './PropertyDetailsDrawer';
import { PropertyCertificatePrint } from './PropertyCertificatePrint';
import { PropertyReportsModal } from './PropertyReportsModal';
import {
  CemeteryFormModal,
  DEFAULT_BLOCKS,
  GRAVE_TYPES,
  PLOT_STATUSES,
} from './CemeteryFormModal';
import { CemeteryDetailsDrawer } from './CemeteryDetailsDrawer';
import { CemeteryPrintModal } from './CemeteryPrintModal';
import { CemeteryReportsModal } from './CemeteryReportsModal';
import { QrScanResult } from '../types/qrBarcodeTypes';

interface ManagementViewProps {
  initialTab?: 'staff' | 'assets' | 'property' | 'cemetery' | 'notices';
  staff: Staff[];
  staffPayments: StaffPayment[];
  assets: MosqueAsset[];
  properties: MosqueProperty[];
  cemetery: CemeteryRecord[];
  notices: MosqueNotice[];
  accounts: FinancialAccount[];
  accountHeads?: AccountHead[];
  committeeTerms?: CommitteeTerm[];
  expenseEntries?: ExpenseEntry[];
  currentMosque?: Mosque | MosqueProfile | null;
  language: Language;
  scannedActionIntent?: QrScanResult | null;
  onClearScannedAction?: () => void;
  onAddStaff?: (data: any) => Promise<void>;
  onUpdateStaff?: (id: string, data: any) => Promise<void>;
  onDeleteStaff?: (id: string) => Promise<void>;
  onPayStaff: (data: any) => Promise<void>;
  onReviseStaffSalary?: (id: string, data: any) => Promise<void>;
  onDisburseFestivalAllowance?: (data: any) => Promise<void>;
  onUpdateStaffPayment?: (id: string, data: any) => Promise<void>;
  onCancelStaffPayment?: (id: string, reason?: string) => Promise<void>;
  onAddAsset?: (data: any) => Promise<void>;
  onUpdateAsset?: (id: string, data: any) => Promise<void>;
  onDeleteAsset?: (id: string, force?: boolean) => Promise<void>;
  onArchiveAsset?: (id: string, isArchived: boolean, reason?: string) => Promise<void>;
  onAddAssetService?: (id: string, data: any) => Promise<void>;
  onClearDemoAssets?: () => Promise<{ count: number; message: string }>;
  onAddProperty?: (data: any) => Promise<void>;
  onUpdateProperty?: (id: string, data: any) => Promise<void>;
  onDeleteProperty?: (id: string, force?: boolean) => Promise<void>;
  onArchiveProperty?: (id: string, isArchived: boolean) => Promise<void>;
  onAddPropertyTenant?: (propertyId: string, data: any) => Promise<void>;
  onTerminatePropertyTenant?: (propertyId: string, tenantId: string) => Promise<void>;
  onAddPropertyInspection?: (propertyId: string, data: any) => Promise<void>;
  onAddPropertyLegalCase?: (propertyId: string, data: any) => Promise<void>;
  onAddCemeteryRecord: (data: any) => Promise<void>;
  onUpdateCemeteryRecord?: (id: string, data: any) => Promise<void>;
  onArchiveCemeteryRecord?: (id: string, isArchived: boolean, reason?: string) => Promise<void>;
  onDeleteCemeteryRecord?: (id: string) => Promise<void>;
  onAddNotice: (data: any) => Promise<void>;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  initialTab = 'staff',
  staff = [],
  staffPayments = [],
  assets = [],
  properties = [],
  cemetery = [],
  notices = [],
  accounts = [],
  accountHeads = [],
  committeeTerms = [],
  expenseEntries = [],
  currentMosque,
  language,
  scannedActionIntent,
  onClearScannedAction,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onPayStaff,
  onReviseStaffSalary,
  onDisburseFestivalAllowance,
  onUpdateStaffPayment,
  onCancelStaffPayment,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onArchiveAsset,
  onAddAssetService,
  onClearDemoAssets,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onArchiveProperty,
  onAddPropertyTenant,
  onTerminatePropertyTenant,
  onAddPropertyInspection,
  onAddPropertyLegalCase,
  onAddCemeteryRecord,
  onUpdateCemeteryRecord,
  onArchiveCemeteryRecord,
  onDeleteCemeteryRecord,
  onAddNotice,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'staff' | 'assets' | 'property' | 'cemetery' | 'notices'>(initialTab);

  // Staff Filters & Search
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<string>('ALL');

  // Staff Modals State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<Staff | null>(null);

  // Pay Salary Modal State
  const [isPaySalaryOpen, setIsPaySalaryOpen] = useState(false);
  const [prefilledStaffId, setPrefilledStaffId] = useState<string | undefined>(undefined);

  // Print Modals State
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipStaff, setSlipStaff] = useState<Staff | null>(null);
  const [slipPayment, setSlipPayment] = useState<StaffPayment | null>(null);

  const [isMasterRegisterOpen, setIsMasterRegisterOpen] = useState(false);
  const [isPaymentRegisterOpen, setIsPaymentRegisterOpen] = useState(false);
  const [isAnnualStatementOpen, setIsAnnualStatementOpen] = useState(false);
  const [annualStatementStaffId, setAnnualStatementStaffId] = useState<string | undefined>(undefined);
  const [isBankTransferLetterOpen, setIsBankTransferLetterOpen] = useState(false);
  const [selectedBankTransferMonth, setSelectedBankTransferMonth] = useState<string | undefined>(undefined);
  const [isFestivalAllowanceOpen, setIsFestivalAllowanceOpen] = useState(false);
  const [isStaffReportsOpen, setIsStaffReportsOpen] = useState(false);
  const [staffReportsInitialTab, setStaffReportsInitialTab] = useState<StaffReportType>('REGISTER');

  // ==========================================
  // Asset Module State
  // ==========================================
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MosqueAsset | null>(null);
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<MosqueAsset | null>(null);
  const [selectedAssetForService, setSelectedAssetForService] = useState<MosqueAsset | null>(null);
  const [isAssetRegisterOpen, setIsAssetRegisterOpen] = useState(false);

  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>('ALL');
  const [assetConditionFilter, setAssetConditionFilter] = useState<string>('ALL');
  const [assetLocationFilter, setAssetLocationFilter] = useState<string>('ALL');
  const [showArchivedAssets, setShowArchivedAssets] = useState(false);
  const [assetViewMode, setAssetViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // ==========================================
  // Waqf Property Module State
  // ==========================================
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<MosqueProperty | null>(null);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<MosqueProperty | null>(null);
  const [selectedPropertyForPrint, setSelectedPropertyForPrint] = useState<MosqueProperty | null>(null);
  const [selectedPropertyForTenant, setSelectedPropertyForTenant] = useState<MosqueProperty | null>(null);
  const [selectedPropertyForInspection, setSelectedPropertyForInspection] = useState<MosqueProperty | null>(null);
  const [selectedPropertyForLegalCase, setSelectedPropertyForLegalCase] = useState<MosqueProperty | null>(null);
  const [isPropertyReportsOpen, setIsPropertyReportsOpen] = useState(false);

  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertyCategoryFilter, setPropertyCategoryFilter] = useState<string>('ALL');
  const [propertyPossessionFilter, setPropertyPossessionFilter] = useState<string>('ALL');
  const [showArchivedProperties, setShowArchivedProperties] = useState(false);
  const [propertyViewMode, setPropertyViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Cemetery Management State
  const [isAddCemeteryOpen, setIsAddCemeteryOpen] = useState(false);
  const [editingCemeteryRecord, setEditingCemeteryRecord] = useState<CemeteryRecord | null>(null);
  const [selectedCemeteryForDetails, setSelectedCemeteryForDetails] = useState<CemeteryRecord | null>(null);
  const [selectedCemeteryForPrint, setSelectedCemeteryForPrint] = useState<CemeteryRecord | null>(null);
  const [cemeteryPrintInitialFormat, setCemeteryPrintInitialFormat] = useState<'A4' | 'POS'>('A4');
  const [isCemeteryReportsOpen, setIsCemeteryReportsOpen] = useState(false);

  const [cemeterySearchQuery, setCemeterySearchQuery] = useState('');
  const [cemeteryBlockFilter, setCemeteryBlockFilter] = useState<string>('ALL');
  const [cemeteryStatusFilter, setCemeteryStatusFilter] = useState<string>('ALL');
  const [cemeteryGraveTypeFilter, setCemeteryGraveTypeFilter] = useState<string>('ALL');
  const [showArchivedCemetery, setShowArchivedCemetery] = useState(false);
  const [cemeteryViewMode, setCemeteryViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Notice Modal State
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeDesc, setNoticeDesc] = useState('');
  const [noticePriority, setNoticePriority] = useState<MosqueNotice['priority']>('NORMAL');
  const [isPublicNotice, setIsPublicNotice] = useState(true);

  // Handle Scan -> Direct Entry for Management sub-modules
  useEffect(() => {
    if (!scannedActionIntent) return;

    const action = scannedActionIntent.actionKey;
    if (action === 'ACT-STF-SALARY' || (action as string) === 'ACT_STF_SALARY') {
      setActiveTab('staff');
      setPrefilledStaffId(undefined);
      setIsPaySalaryOpen(true);
      onClearScannedAction?.();
    } else if (action === 'ACT-STF-FESTIVAL' || (action as string) === 'ACT_STF_FESTIVAL') {
      setActiveTab('staff');
      setIsFestivalAllowanceOpen(true);
      onClearScannedAction?.();
    } else if (action === 'ACT-WPF-NEW' || (action as string) === 'ACT_WPF_NEW') {
      setActiveTab('property');
      setEditingProperty(null);
      setIsAddPropertyOpen(true);
      onClearScannedAction?.();
    } else if (action === 'ACT-WPF-RENT' || (action as string) === 'ACT_WPF_RENT') {
      setActiveTab('property');
      const firstWithTenant = (properties || []).find((p) => p.tenants && p.tenants.length > 0) || properties?.[0];
      if (firstWithTenant) {
        setSelectedPropertyForTenant(firstWithTenant);
      } else {
        setIsAddPropertyOpen(true);
      }
      onClearScannedAction?.();
    } else if (action === 'ACT-AST-NEW' || (action as string) === 'ACT_AST-NEW') {
      setActiveTab('assets');
      setEditingAsset(null);
      setIsAddAssetOpen(true);
      onClearScannedAction?.();
    } else if (action === 'ACT-AST-SERVICE' || action === 'ACT-AST-REPAIR') {
      setActiveTab('assets');
      const targetAsset = (assets || []).find((a) => !a.isArchived && !a.isDeleted) || assets?.[0];
      if (targetAsset) {
        setSelectedAssetForService(targetAsset);
      } else {
        setIsAddAssetOpen(true);
      }
      onClearScannedAction?.();
    } else if (action === 'ACT-CEM-BURIAL' || (action as string) === 'ACT_CEM_BURIAL') {
      setActiveTab('cemetery');
      setEditingCemeteryRecord(null);
      setIsAddCemeteryOpen(true);
      onClearScannedAction?.();
    }
  }, [scannedActionIntent, properties, assets]);

  // ==========================================
  // Safe Array Fallbacks
  // ==========================================
  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeStaffPayments = Array.isArray(staffPayments) ? staffPayments : [];
  const safeAssets = Array.isArray(assets) ? assets : (assets && Array.isArray((assets as any).assets) ? (assets as any).assets : []);
  const safeProperties = Array.isArray(properties) ? properties : [];
  const safeCemetery = Array.isArray(cemetery) ? cemetery : [];
  const safeNotices = Array.isArray(notices) ? notices : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  // ==========================================
  // Asset Computations & Filters
  // ==========================================
  const activeAssets = safeAssets.filter((a) => !a.isArchived && !a.isDeleted);
  const archivedAssets = safeAssets.filter((a) => a.isArchived && !a.isDeleted);
  const demoAssets = safeAssets.filter((a) => a.isDemo && !a.isDeleted);

  const totalAssetPurchaseValue = activeAssets.reduce((sum, a) => sum + (Number(a.purchaseValue) || 0), 0);
  const totalAssetCurrentValue = activeAssets.reduce(
    (sum, a) => sum + (Number(a.currentValue ?? a.purchaseValue) || 0),
    0
  );
  const goodAssetsCount = activeAssets.filter((a) => a.condition === 'GOOD').length;
  const needsRepairCount = activeAssets.filter(
    (a) => a.condition === 'NEEDS_REPAIR' || a.condition === 'FAIR' || a.condition === 'POOR'
  ).length;
  const outOfOrderCount = activeAssets.filter(
    (a) => a.condition === 'OUT_OF_ORDER' || a.condition === 'DAMAGED'
  ).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingServiceAssets = activeAssets.filter(
    (a) => a.nextServiceDate && a.nextServiceDate >= todayStr
  );

  // Unique locations from assets
  const assetLocations = Array.from(new Set(safeAssets.map((a) => a.location).filter(Boolean)));

  // Filtered Assets
  const filteredAssets = safeAssets.filter((ast) => {
    if (!showArchivedAssets && ast.isArchived) return false;
    if (showArchivedAssets && !ast.isArchived) return false;
    if (ast.isDeleted) return false;

    if (assetCategoryFilter !== 'ALL' && ast.category !== assetCategoryFilter) return false;
    if (assetConditionFilter !== 'ALL' && ast.condition !== assetConditionFilter) return false;
    if (assetLocationFilter !== 'ALL' && ast.location !== assetLocationFilter) return false;

    if (assetSearchQuery.trim()) {
      const q = assetSearchQuery.trim().toLowerCase();
      const matchName = ast.name?.toLowerCase().includes(q);
      const matchCode = ast.assetCode?.toLowerCase().includes(q);
      const matchBrand = ast.brand?.toLowerCase().includes(q);
      const matchModel = ast.model?.toLowerCase().includes(q);
      const matchSerial = ast.serialNumber?.toLowerCase().includes(q);
      const matchLocation = ast.location?.toLowerCase().includes(q);
      const matchPerson = ast.responsiblePerson?.toLowerCase().includes(q);
      const matchSupplier = ast.supplier?.toLowerCase().includes(q);

      if (
        !matchName &&
        !matchCode &&
        !matchBrand &&
        !matchModel &&
        !matchSerial &&
        !matchLocation &&
        !matchPerson &&
        !matchSupplier
      ) {
        return false;
      }
    }

    return true;
  });

  // Handlers for Asset Actions
  const handleSaveAsset = async (assetData: any) => {
    if (editingAsset) {
      if (onUpdateAsset) {
        await onUpdateAsset(editingAsset.id, assetData);
      }
    } else {
      if (onAddAsset) {
        await onAddAsset(assetData);
      }
    }
    setEditingAsset(null);
  };

  const handleArchiveAsset = async (ast: MosqueAsset) => {
    if (onArchiveAsset) {
      await onArchiveAsset(ast.id, !ast.isArchived);
    }
  };

  const handleDeleteAsset = async (ast: MosqueAsset) => {
    const confirmMsg = ast.expenseVoucherNumber || (ast.serviceHistory && ast.serviceHistory.length > 0)
      ? `"${ast.name}" সম্পদটির সাথে আর্থিক ভাউচার ও ইতিহাস সংযুক্ত রয়েছে। এটি স্থায়ীভাবে না মুছে নিরাপদে আর্কাইভ তালিকায় সরানো হবে। আপনি কি নিশ্চিত?`
      : `আপনি কি নিশ্চিত যে "${ast.name} (${ast.assetCode})" সম্পদটি তালিকা থেকে মুছে ফেলতে চান?`;

    if (window.confirm(confirmMsg)) {
      if (onDeleteAsset) {
        await onDeleteAsset(ast.id);
      }
      if (selectedAssetForDetails?.id === ast.id) {
        setSelectedAssetForDetails(null);
      }
    }
  };

  const handleClearDemoAssets = async () => {
    if (
      window.confirm(
        'আপনি কি নিশ্চিত যে সকল ডেমো সম্পদ রেকর্ড পরিচ্ছন্ন করতে চান? আপনার নিজস্ব এন্ট্রিগুলো অক্ষুণ্ণ থাকবে।'
      )
    ) {
      if (onClearDemoAssets) {
        const res = await onClearDemoAssets();
        alert(res.message || 'ডেমো সম্পদ সফলভাবে পরিচ্ছন্ন করা হয়েছে।');
      }
    }
  };

  const handleSaveAssetService = async (assetId: string, serviceData: any) => {
    if (onAddAssetService) {
      await onAddAssetService(assetId, serviceData);
    }
  };

  // ==========================================
  // Waqf Property Computations & Filters
  // ==========================================
  const activeProperties = safeProperties.filter((p) => !p.isArchived);
  const archivedProperties = safeProperties.filter((p) => p.isArchived);
  const totalPropertiesCount = activeProperties.length;
  const totalEstimatedPropertyValue = activeProperties.reduce(
    (sum, p) => sum + (Number(p.estimatedValue) || 0),
    0
  );
  const totalPropertyAreaDecimal = activeProperties.reduce(
    (sum, p) => sum + (Number(p.areaAmount) || 0),
    0
  );

  const allTenants = activeProperties.flatMap((p) => p.tenants || []);
  const activeTenantsCount = allTenants.filter(
    (t) => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON'
  ).length;

  const totalMonthlyRentIncome = activeProperties.reduce((sum, p) => {
    const rentFromTenants = (p.tenants || [])
      .filter((t) => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON')
      .reduce((s, t) => s + (Number(t.monthlyRent) || 0), 0);
    return sum + (rentFromTenants || Number(p.monthlyIncome) || Number(p.monthlyRent) || 0);
  }, 0);

  const allLegalCases = activeProperties.flatMap((p) => p.legalCases || []);
  const activeLegalCasesCount = allLegalCases.filter(
    (c) => c.status === 'RUNNING' || c.status === 'STAY_ORDER'
  ).length;

  const expiringAgreementsList = allTenants.filter((t) => {
    if (t.status === 'EXPIRING_SOON') return true;
    if (!t.endDate) return false;
    const diff = (new Date(t.endDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 45;
  });

  const upcomingHearingsList = allLegalCases.filter((c) => {
    if (!c.nextHearingDate) return false;
    const diff = (new Date(c.nextHearingDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diff >= -1 && diff <= 30;
  });

  // Filtered Properties
  const filteredProperties = safeProperties.filter((prop) => {
    if (!showArchivedProperties && prop.isArchived) return false;
    if (showArchivedProperties && !prop.isArchived) return false;

    if (propertyCategoryFilter !== 'ALL' && prop.category !== propertyCategoryFilter) return false;
    if (propertyPossessionFilter !== 'ALL' && prop.possessionStatus !== propertyPossessionFilter) return false;

    if (propertySearchQuery.trim()) {
      const q = propertySearchQuery.trim().toLowerCase();
      const matchName = (prop.name || prop.description || '').toLowerCase().includes(q);
      const matchCode = (prop.propertyCode || '').toLowerCase().includes(q);
      const matchLoc = (prop.location || prop.fullAddress || '').toLowerCase().includes(q);
      const matchMouza = (prop.mouza || '').toLowerCase().includes(q);
      const matchWaqif = (prop.waqifName || '').toLowerCase().includes(q);
      const matchPlot = (prop.bsPlotNo || prop.rsPlotNo || prop.csPlotNo || prop.plotNo || '').toLowerCase().includes(q);
      const matchKhatian = (prop.bsKhatianNo || prop.rsKhatianNo || prop.csKhatianNo || prop.khatianNo || '').toLowerCase().includes(q);

      if (!matchName && !matchCode && !matchLoc && !matchMouza && !matchWaqif && !matchPlot && !matchKhatian) {
        return false;
      }
    }

    return true;
  });

  // Handlers for Property Actions
  const handleSaveProperty = async (data: Partial<MosqueProperty>) => {
    if (editingProperty) {
      if (onUpdateProperty) {
        await onUpdateProperty(editingProperty.id, data);
      }
    } else {
      if (onAddProperty) {
        await onAddProperty(data);
      }
    }
  };

  const handleArchivePropertyToggle = async (prop: MosqueProperty) => {
    if (onArchiveProperty) {
      await onArchiveProperty(prop.id, !prop.isArchived);
      if (selectedPropertyForDetails && selectedPropertyForDetails.id === prop.id) {
        setSelectedPropertyForDetails({ ...selectedPropertyForDetails, isArchived: !prop.isArchived });
      }
    }
  };

  const handleSavePropertyTenant = async (tenantData: any) => {
    if (!selectedPropertyForTenant) return;
    if (onAddPropertyTenant) {
      await onAddPropertyTenant(selectedPropertyForTenant.id, tenantData);
    }
  };

  const handleTerminatePropertyTenantAction = async (prop: MosqueProperty, tenantId: string) => {
    if (onTerminatePropertyTenant) {
      await onTerminatePropertyTenant(prop.id, tenantId);
    }
  };

  const handleSavePropertyInspection = async (inspData: any) => {
    if (!selectedPropertyForInspection) return;
    if (onAddPropertyInspection) {
      await onAddPropertyInspection(selectedPropertyForInspection.id, inspData);
    }
  };

  const handleSavePropertyLegalCase = async (caseData: any) => {
    if (!selectedPropertyForLegalCase) return;
    if (onAddPropertyLegalCase) {
      await onAddPropertyLegalCase(selectedPropertyForLegalCase.id, caseData);
    }
  };

  // Staff Statistics Computation
  const totalStaffCount = staff.length;
  const activeStaffCount = staff.filter((s) => s.status === 'ACTIVE').length;
  const inactiveStaffCount = staff.filter((s) => s.status === 'INACTIVE' || s.status === 'TERMINATED').length;
  const imamCount = staff.filter((s) => s.designation === 'IMAM' || s.designation === 'KHATIB').length;
  const muezzinCount = staff.filter((s) => s.designation === 'MUEZZIN').length;
  const cleanerCount = staff.filter((s) => s.designation === 'CLEANER' || s.designation === 'SECURITY').length;
  const teacherCount = staff.filter((s) => s.designation === 'TEACHER').length;

  const totalMonthlyPayrollLiability = staff
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

  const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const thisMonthPaid = staffPayments
    .filter((p) => p.month === currentYearMonth && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + (p.netPaid || 0), 0);

  // Filtered Staff List
  const filteredStaff = staff.filter((stf) => {
    if (staffStatusFilter === 'ACTIVE' && stf.status !== 'ACTIVE') return false;
    if (staffStatusFilter === 'INACTIVE' && stf.status === 'ACTIVE') return false;

    if (staffCategoryFilter !== 'ALL') {
      if (staffCategoryFilter === 'IMAM_KHATIB' && stf.designation !== 'IMAM' && stf.designation !== 'KHATIB') return false;
      if (staffCategoryFilter === 'MUEZZIN' && stf.designation !== 'MUEZZIN') return false;
      if (staffCategoryFilter === 'TEACHER' && stf.designation !== 'TEACHER') return false;
      if (staffCategoryFilter === 'CLEANER' && stf.designation !== 'CLEANER' && stf.designation !== 'SECURITY') return false;
    }

    if (staffSearchQuery.trim()) {
      const q = staffSearchQuery.toLowerCase();
      const matchName = stf.name?.toLowerCase().includes(q);
      const matchPhone = stf.phone?.includes(q);
      const matchDesig = stf.designationBn?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchDesig) return false;
    }

    return true;
  });

  // Handlers for Staff Actions
  const handleOpenPayForStaff = (staffId?: string) => {
    setPrefilledStaffId(staffId);
    setIsPaySalaryOpen(true);
  };

  const handleOpenSlip = (payment: StaffPayment, stf?: Staff) => {
    const targetStaff = stf || staff.find((s) => s.id === payment.staffId) || null;
    setSlipStaff(targetStaff);
    setSlipPayment(payment);
    setSlipModalOpen(true);
  };

  const handleToggleStatus = async (stf: Staff) => {
    const newStatus = stf.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (onUpdateStaff) {
      await onUpdateStaff(stf.id, { status: newStatus });
    }
  };

  // ==========================================
  // Cemetery Computations & Filtering
  // ==========================================
  const activeCemetery = safeCemetery.filter((c) => !c.isArchived);
  const archivedCemetery = safeCemetery.filter((c) => c.isArchived);
  const totalBurialsCount = activeCemetery.length;

  const currentYearStr = String(new Date().getFullYear());
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const thisYearBurialsCount = activeCemetery.filter((c) => c.burialDate?.startsWith(currentYearStr)).length;
  const thisMonthBurialsCount = activeCemetery.filter((c) => c.burialDate?.startsWith(currentMonthStr)).length;
  const todayBurialsCount = activeCemetery.filter((c) => c.burialDate === todayStr).length;

  // Block counts breakdown
  const blockCounts: Record<string, number> = {};
  activeCemetery.forEach((c) => {
    const b = c.blockName || c.graveLocation?.split(',')[0]?.trim() || 'অন্যান্য';
    blockCounts[b] = (blockCounts[b] || 0) + 1;
  });

  const filteredCemetery = safeCemetery.filter((cem) => {
    if (!showArchivedCemetery && cem.isArchived) return false;
    if (showArchivedCemetery && !cem.isArchived) return false;

    if (cemeteryBlockFilter !== 'ALL') {
      const matchBlock = (cem.blockName === cemeteryBlockFilter) || (cem.graveLocation?.includes(cemeteryBlockFilter));
      if (!matchBlock) return false;
    }

    if (cemeteryStatusFilter !== 'ALL' && (cem.status || 'OCCUPIED') !== cemeteryStatusFilter) {
      return false;
    }

    if (cemeteryGraveTypeFilter !== 'ALL' && (cem.graveType || 'PERMANENT') !== cemeteryGraveTypeFilter) {
      return false;
    }

    if (cemeterySearchQuery.trim()) {
      const q = cemeterySearchQuery.toLowerCase();
      const matchName = cem.deceasedName?.toLowerCase().includes(q);
      const matchFather = cem.fatherOrSpouseName?.toLowerCase().includes(q);
      const matchPlot = cem.plotNumber?.toLowerCase().includes(q);
      const matchPhone = cem.contactPersonPhone?.includes(q);
      const matchContact = cem.contactPersonName?.toLowerCase().includes(q);
      const matchRecordNo = cem.recordNumber?.toLowerCase().includes(q);
      const matchNid = cem.nidNumber?.toLowerCase().includes(q);
      if (!matchName && !matchFather && !matchPlot && !matchPhone && !matchContact && !matchRecordNo && !matchNid) {
        return false;
      }
    }

    return true;
  });

  // Handlers for Cemetery Actions
  const handleSaveCemeteryRecord = async (data: Partial<CemeteryRecord>) => {
    if (editingCemeteryRecord) {
      if (onUpdateCemeteryRecord) {
        await onUpdateCemeteryRecord(editingCemeteryRecord.id, data);
      }
    } else {
      if (onAddCemeteryRecord) {
        await onAddCemeteryRecord(data);
      }
    }
  };

  const handleArchiveCemeteryToggle = async (rec: CemeteryRecord) => {
    if (onArchiveCemeteryRecord) {
      const isArchiving = !rec.isArchived;
      const reason = isArchiving
        ? prompt('আর্কাইভ করার কারণ উল্লেখ করুন (ঐচ্ছিক):') || 'কবরস্থান রেজিস্ট্রি থেকে সংরক্ষণার্থে আর্কাইভ করা হয়েছে'
        : undefined;
      await onArchiveCemeteryRecord(rec.id, isArchiving, reason);
      if (selectedCemeteryForDetails && selectedCemeteryForDetails.id === rec.id) {
        setSelectedCemeteryForDetails({ ...selectedCemeteryForDetails, isArchived: isArchiving, archiveReason: reason });
      }
    }
  };

  const handleDeleteCemeteryAction = async (rec: CemeteryRecord) => {
    const hasAuditOrFinance = rec.donationVoucherNo || (rec.maintenanceLogs && rec.maintenanceLogs.length > 0);
    if (hasAuditOrFinance) {
      alert('সতর্কতা: এই দাফন রেকর্ডের সাথে আর্থিক অনুদান বা সার্ভিসিং হিস্ট্রি যুক্ত রয়েছে। অডিট নিরাপত্তার স্বার্থে এটি সরাসরি মোছা যাবে না। আপনি চাইলে "আর্কাইভ" করতে পারেন।');
      return;
    }

    if (window.confirm(`আপনি কি নিশ্চিত যে "${rec.deceasedName} (প্লট: ${rec.plotNumber})" রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?`)) {
      if (onDeleteCemeteryRecord) {
        await onDeleteCemeteryRecord(rec.id);
      }
      if (selectedCemeteryForDetails?.id === rec.id) {
        setSelectedCemeteryForDetails(null);
      }
    }
  };

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeDesc) return;
    try {
      await onAddNotice({
        title: noticeTitle,
        description: noticeDesc,
        priority: noticePriority,
        isPublic: isPublicNotice,
      });
      setIsNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Navigation Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-btn-staff"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'staff' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>ইমাম ও স্টাফ ({totalStaffCount})</span>
          </button>
          <button
            id="tab-btn-assets"
            onClick={() => setActiveTab('assets')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'assets' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>সম্পদ ও সরঞ্জাম ({assets.length})</span>
          </button>
          <button
            id="tab-btn-property"
            onClick={() => setActiveTab('property')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'property' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>ওয়াকফ সম্পত্তি ({properties.length})</span>
          </button>
          <button
            id="tab-btn-cemetery"
            onClick={() => setActiveTab('cemetery')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cemetery' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>কবরস্থান রেজিস্টার ({cemetery.length})</span>
          </button>
          <button
            id="tab-btn-notices"
            onClick={() => setActiveTab('notices')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'notices' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>নোটিশ বোর্ড ({notices.length})</span>
          </button>
        </div>

        {/* Action Buttons for Active Tab */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'staff' && (
            <>
              {/* Staff Master Register Print */}
              <button
                id="btn-open-master-register"
                onClick={() => setIsMasterRegisterOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                title="সকল ইমাম ও স্টাফদের A4 মাস্টার রেজিস্টার প্রিন্ট করুন"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span>মাস্টার রেজিস্টার</span>
              </button>

              {/* Staff Reports & Registers Hub */}
              <button
                id="btn-open-staff-reports"
                onClick={() => {
                  setStaffReportsInitialTab('REGISTER');
                  setIsStaffReportsOpen(true);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                title="ইমাম ও স্টাফ সম্পর্কিত সকল অফিশিয়াল রিপোর্ট, রেজিস্টার ও স্বাক্ষর শিট"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>রিপোর্ট ও রেজিস্টার</span>
              </button>

              {/* Bulk Festival Allowance Disbursement */}
              <button
                id="btn-open-festival-allowance"
                onClick={() => setIsFestivalAllowanceOpen(true)}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                title="ঈদুল ফিতর বা ঈদুল আজহার বিশেষ উৎসব বোনাস একসাথে প্রদান করুন"
              >
                <Gift className="w-4 h-4 text-amber-700" />
                <span>উৎসব ভাতা প্রদান</span>
              </button>

              {/* Staff Bank Transfer Letter Generator & Print */}
              <button
                id="btn-open-bank-transfer-letter"
                onClick={() => {
                  setSelectedBankTransferMonth(undefined);
                  setIsBankTransferLetterOpen(true);
                }}
                className="bg-white hover:bg-slate-50 border border-indigo-300 text-indigo-950 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                title="ইমাম ও কর্মচারীদের বেতন/ভাতা ব্যাংক ট্রান্সফার অফিশিয়াল চিঠি তৈরি ও প্রিন্ট করুন"
              >
                <Building className="w-4 h-4 text-indigo-600" />
                <span>ব্যাংক ট্রান্সফার লেটার</span>
              </button>

              <button
                id="btn-open-add-staff"
                onClick={() => setIsAddStaffOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>নতুন স্টাফ যুক্ত করুন</span>
              </button>
            </>
          )}

          {activeTab === 'assets' && (
            <>
              {/* Asset Register Print */}
              <button
                id="btn-open-asset-register"
                onClick={() => setIsAssetRegisterOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                title="মসজিদের পূর্ণাঙ্গ সম্পদ রেজিস্ট্রি ও নিরীক্ষা বই প্রিন্ট করুন"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span>রেজিস্ট্রি বই প্রিন্ট</span>
              </button>

              {/* Clear Demo Assets */}
              {demoAssets.length > 0 && (
                <button
                  id="btn-clear-demo-assets"
                  onClick={handleClearDemoAssets}
                  className="bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  title="ডেমো সম্পদ রেকর্ড পরিচ্ছন্ন করুন"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>ডেমো ডাটা মুছুন ({demoAssets.length})</span>
                </button>
              )}

              {/* Add New Asset */}
              <button
                id="btn-open-add-asset"
                onClick={() => {
                  setEditingAsset(null);
                  setIsAddAssetOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন সম্পদ যোগ করুন</span>
              </button>
            </>
          )}

          {activeTab === 'property' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPropertyReportsOpen(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>প্রিন্ট ও রিপোর্ট সেন্টার</span>
              </button>
              <button
                id="btn-open-add-property"
                onClick={() => {
                  setEditingProperty(null);
                  setIsAddPropertyOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন ওয়াকফ সম্পত্তি এন্ট্রি</span>
              </button>
            </div>
          )}

          {activeTab === 'cemetery' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCemeteryReportsOpen(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>রিপোর্ট ও রেজিস্ট্রি</span>
              </button>
              <button
                onClick={() => {
                  setEditingCemeteryRecord(null);
                  setIsAddCemeteryOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন দাফন রেকর্ড</span>
              </button>
            </div>
          )}

          {activeTab === 'notices' && (
            <button
              onClick={() => setIsNoticeModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন নোটিশ লিখুন</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. STAFF SECTION                           */}
      {/* ========================================== */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Top KPI Cards for Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Staff & Active */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">মোট জনবল ও কর্মরত</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900 font-siliguri">{totalStaffCount}</span>
                <span className="text-xs text-slate-500">জন</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] pt-1 border-t border-slate-100 font-medium">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  সক্রিয়: {activeStaffCount}
                </span>
                <span className="text-slate-500">নিষ্ক্রিয়: {inactiveStaffCount}</span>
              </div>
            </div>

            {/* 2. Designation Breakdown */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">পদবী বণ্টন</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <Briefcase className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md text-xs font-bold">
                  ইমাম/খতিব: {imamCount}
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold">
                  মুয়াজ্জিন: {muezzinCount}
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-xs font-bold">
                  খাদেম: {cleanerCount}
                </span>
                {teacherCount > 0 && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded-md text-xs font-bold">
                    শিক্ষক: {teacherCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                মসজিদ ও মক্তব পরিচালনায় সার্বক্ষণিক টিম
              </p>
            </div>

            {/* 3. Monthly Payroll Liability */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">মাসিক মোট বেতন বাজেট</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900 font-siliguri">
                  ৳{totalMonthlyPayrollLiability.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                চলতি মাসের প্রদেয় নিয়মিত সম্মানী
              </p>
            </div>

            {/* 4. Current Month Paid */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">চলতি মাসে পরিশোধিত</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-700 font-siliguri">
                  ৳{thisMonthPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium pt-1 border-t border-slate-100">
                অ্যাকাউন্টিং লেজারে স্বয়ংক্রিয়ভাবে সিঙ্কড
              </p>
            </div>
          </div>

          {/* Search, Category Filter & Status Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="নাম, মোবাইল নম্বর বা পদবী দিয়ে ইমাম ও স্টাফ খুঁজুন..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={staffCategoryFilter}
                onChange={(e) => setStaffCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">সকল পদবী</option>
                <option value="IMAM_KHATIB">ইমাম ও খতিব</option>
                <option value="MUEZZIN">মুয়াজ্জিন</option>
                <option value="CLEANER">খাদেম / পরিচ্ছন্নতাকর্মী</option>
                <option value="TEACHER">মক্তব / হিফজ শিক্ষক</option>
              </select>

              {/* Status Switcher */}
              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ACTIVE">কেবলমাত্র সক্রিয় ({activeStaffCount})</option>
                <option value="INACTIVE">নিষ্ক্রিয় / সাবেক ({inactiveStaffCount})</option>
                <option value="ALL">সকল স্টাফ ({totalStaffCount})</option>
              </select>
            </div>
          </div>

          {/* Staff Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((stf) => {
              const staffPays = staffPayments.filter((p) => p.staffId === stf.id && p.status !== 'CANCELLED');
              const totalPaidToThisStaff = staffPays.reduce((sum, p) => sum + p.netPaid, 0);
              const lastPayment = staffPays[0];

              return (
                <div
                  key={stf.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-4">
                    {/* Card Top: Code & Status */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {stf.staffCode}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            stf.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {stf.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </div>
                    </div>

                    {/* Staff Name & Designation */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                        {stf.name}
                      </h3>
                      <p className="text-xs font-semibold text-blue-800 mt-0.5">{stf.designationBn}</p>
                    </div>

                    {/* Key Attributes */}
                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">মোবাইল:</span>
                        <span className="font-bold text-slate-900 font-mono flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{stf.phone}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">মাসিক মূল বেতন:</span>
                        <span className="font-black text-slate-900 font-siliguri">
                          ৳{stf.monthlySalary.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {stf.bankAccountNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">ব্যাংক একাউন্ট:</span>
                          <span className="font-mono text-[11px] font-bold text-slate-700">
                            {stf.bankName} - {stf.bankAccountNumber}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500">যোগদানের তারিখ:</span>
                        <span className="font-semibold text-slate-700">{stf.joiningDate || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Action Buttons */}
                  <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedStaffForHistory(stf)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>প্রোফাইল</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingStaff(stf);
                          setIsAddStaffOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="তথ্য এডিট করুন"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenPayForStaff(stf.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>বেতন দিন</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment History List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">সাম্প্রতিক বেতন ও হাদিয়া পেমেন্ট ইতিহাস</h2>
                <p className="text-xs text-slate-500">
                  ইমাম ও স্টাফদের ব্যাংক/ক্যাশ পরিশোধ এবং ভাউচার রেজিস্ট্রি
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="btn-open-bank-letter-from-history"
                  onClick={() => setIsBankTransferLetterOpen(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  title="এই মাসের ব্যাংক ট্রান্সফার অফিশিয়াল দরখাস্ত তৈরি ও প্রিন্ট করুন"
                >
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ব্যাংক ট্রান্সফার লেটার প্রিন্ট</span>
                </button>
              </div>
            </div>

            {staffPayments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                কোনো বেতন পেমেন্ট রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">রসিদ নং</th>
                      <th className="py-3 px-4">তারিখ ও মাস</th>
                      <th className="py-3 px-4">স্টাফের নাম</th>
                      <th className="py-3 px-4">পদবী</th>
                      <th className="py-3 px-4">মূল বেতন</th>
                      <th className="py-3 px-4">বোনাস/হাদিয়া</th>
                      <th className="py-3 px-4">কর্তন</th>
                      <th className="py-3 px-4">মোট পরিশোধ</th>
                      <th className="py-3 px-4">পরিশোধের মাধ্যম</th>
                      <th className="py-3 px-4 text-center">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {staffPayments.slice(0, 15).map((pay) => {
                      const stf = staff.find((s) => s.id === pay.staffId);
                      return (
                        <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{pay.receiptNumber}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{pay.month}</span>
                            <span className="text-[10px] text-slate-400 block">{pay.paymentDate}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{pay.staffName}</td>
                          <td className="py-3 px-4 text-blue-800 font-semibold">{stf?.designationBn || 'স্টাফ'}</td>
                          <td className="py-3 px-4 font-siliguri">৳{pay.baseSalary.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-emerald-700 font-siliguri">
                            +{pay.bonusOrHonorarium.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-rose-700 font-siliguri">
                            -{pay.deduction.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 font-siliguri">
                            ৳{pay.netPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px]">
                              {pay.paymentMethod === 'BANK' ? 'ব্যাংক ট্রান্সফার' : 'নগদ ক্যাশ'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleOpenSlip(pay, stf)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] inline-flex items-center space-x-1 transition-colors"
                            >
                              <Printer className="w-3 h-3" />
                              <span>রসিদ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. ASSETS & EQUIPMENT SECTION (ENHANCED)   */}
      {/* ========================================== */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Top KPI Cards for Assets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Assets Count & Active */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">মোট সক্রিয় সম্পদ</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900 font-siliguri">{activeAssets.length}</span>
                <span className="text-xs text-slate-500">টি আইটেম</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] pt-1 border-t border-slate-100 font-medium">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  সচল: {goodAssetsCount}
                </span>
                {archivedAssets.length > 0 && (
                  <span className="text-slate-500">আর্কাইভকৃত: {archivedAssets.length}</span>
                )}
              </div>
            </div>

            {/* 2. Total Purchase Value vs Valuation */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">মোট ক্রয়মূল্য</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900 font-siliguri">
                  ৳{totalAssetPurchaseValue.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-blue-700 font-medium pt-1 border-t border-slate-100">
                বর্তমান নেট ভ্যালু: ৳{totalAssetCurrentValue.toLocaleString('en-IN')}
              </p>
            </div>

            {/* 3. Operational Condition */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">কার্যক্ষমতা ও স্বাস্থ্য</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md text-xs font-bold">
                  ভালো: {goodAssetsCount}
                </span>
                {needsRepairCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-xs font-bold">
                    মেরামত: {needsRepairCount}
                  </span>
                )}
                {outOfOrderCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md text-xs font-bold">
                    অচল: {outOfOrderCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                সার্বক্ষণিক নামাজ ও ওজুর সচলতা নিশ্চিত
              </p>
            </div>

            {/* 4. Upcoming Maintenance & Service */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">আসন্ন সার্ভিসিং শিডিউল</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Wrench className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-700 font-siliguri">
                  {upcomingServiceAssets.length}
                </span>
                <span className="text-xs text-slate-500">টি সরঞ্জামে সার্ভিসিং আবশ্যক</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                জেনারেটর, এসি ও সাউন্ড সিস্টেম অডিট
              </p>
            </div>
          </div>

          {/* Search, Filter & View Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="সম্পদের নাম, আইডি কোড, ব্র্যান্ড, মডেল, সিরিয়াল বা অবস্থান খুঁজুন..."
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={assetCategoryFilter}
                onChange={(e) => setAssetCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">সকল ক্যাটাগরি ({assets.length})</option>
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.icon} {cat.labelBn}
                  </option>
                ))}
              </select>

              {/* Condition Filter */}
              <select
                value={assetConditionFilter}
                onChange={(e) => setAssetConditionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">সকল অবস্থা</option>
                {ASSET_CONDITIONS.map((cond) => (
                  <option key={cond.key} value={cond.key}>
                    {cond.labelBn}
                  </option>
                ))}
              </select>

              {/* Location Filter */}
              {assetLocations.length > 0 && (
                <select
                  value={assetLocationFilter}
                  onChange={(e) => setAssetLocationFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">সকল অবস্থান</option>
                  {assetLocations.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              )}

              {/* Archive Toggle */}
              <label className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showArchivedAssets}
                  onChange={(e) => setShowArchivedAssets(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>আর্কাইভকৃত ({archivedAssets.length})</span>
              </label>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setAssetViewMode('GRID')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    assetViewMode === 'GRID' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="গ্রিড ভিউ"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAssetViewMode('TABLE')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    assetViewMode === 'TABLE' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="টেবিল ভিউ"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Asset List: Grid Mode */}
          {assetViewMode === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((ast) => {
                const catObj = ASSET_CATEGORIES.find((c) => c.key === ast.category);
                const condObj = ASSET_CONDITIONS.find((c) => c.key === ast.condition);

                return (
                  <div
                    key={ast.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {ast.assetCode}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                            <span>{catObj?.icon || '📦'}</span>
                            <span>{catObj?.labelBn || ast.category}</span>
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            condObj?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {condObj?.labelBn || ast.condition}
                        </span>
                      </div>

                      {/* Name, Brand & Spec */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                          {ast.name}
                        </h3>
                        {(ast.brand || ast.model) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {ast.brand} {ast.model ? `• ${ast.model}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Specs & Attributes Box */}
                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">অবস্থান:</span>
                          <span className="font-bold text-slate-900 flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span>{ast.location || 'মূল ভবন'}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">ক্রয়মূল্য ও তারিখ:</span>
                          <span className="font-bold text-slate-900 font-siliguri">
                            ৳{(ast.purchaseValue || 0).toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-500 font-sans">
                              ({ast.purchaseDate || 'N/A'})
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">বর্তমান মূল্য:</span>
                          <span className="font-bold text-blue-700 font-siliguri">
                            ৳{(ast.currentValue ?? ast.purchaseValue ?? 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {ast.responsiblePerson && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-500">দায়িত্বপ্রাপ্ত:</span>
                            <span className="font-semibold text-slate-800">{ast.responsiblePerson}</span>
                          </div>
                        )}

                        {ast.expenseVoucherNumber && (
                          <div className="flex items-center justify-between text-[10px] text-blue-700 pt-1">
                            <span className="flex items-center space-x-1">
                              <LinkIcon className="w-2.5 h-2.5" />
                              <span>ব্যয় ভাউচার:</span>
                            </span>
                            <span className="font-mono font-bold">{ast.expenseVoucherNumber}</span>
                          </div>
                        )}

                        {ast.nextServiceDate && (
                          <div className="flex items-center justify-between text-[10px] text-amber-700 pt-1">
                            <span>পরবর্তী সার্ভিস:</span>
                            <span className="font-bold">{ast.nextServiceDate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom Actions */}
                    <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedAssetForDetails(ast)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>বিস্তারিত</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setSelectedAssetForService(ast)}
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="সার্ভিসিং ও মেরামত রেকর্ড যোগ করুন"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingAsset(ast);
                            setIsAddAssetOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="সম্পাদনা করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteAsset(ast)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="মুছুন / আর্কাইভ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View Mode */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">আইডি কোড</th>
                      <th className="py-3 px-4">সম্পদের নাম ও স্পেসিফিকেশন</th>
                      <th className="py-3 px-4">ক্যাটাগরি</th>
                      <th className="py-3 px-4">ক্রয়ের তারিখ</th>
                      <th className="py-3 px-4">ক্রয়মূল্য</th>
                      <th className="py-3 px-4">বর্তমান মূল্য</th>
                      <th className="py-3 px-4">অবস্থান</th>
                      <th className="py-3 px-4">অবস্থা</th>
                      <th className="py-3 px-4">দায়িত্বপ্রাপ্ত</th>
                      <th className="py-3 px-4 text-center">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredAssets.map((ast) => {
                      const catObj = ASSET_CATEGORIES.find((c) => c.key === ast.category);
                      const condObj = ASSET_CONDITIONS.find((c) => c.key === ast.condition);
                      return (
                        <tr key={ast.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{ast.assetCode}</td>
                          <td className="py-3 px-4">
                            <strong className="text-slate-900 block">{ast.name}</strong>
                            {ast.brand && <span className="text-[10px] text-slate-500">{ast.brand}</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{catObj?.labelBn || ast.category}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{ast.purchaseDate || 'N/A'}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 font-siliguri">
                            ৳{(ast.purchaseValue || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-bold text-blue-700 font-siliguri">
                            ৳{(ast.currentValue ?? ast.purchaseValue ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{ast.location || 'মূল ভবন'}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                condObj?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {condObj?.labelBn || ast.condition}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{ast.responsiblePerson || 'মসজিদ কর্তৃপক্ষ'}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => setSelectedAssetForDetails(ast)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px]"
                              >
                                বিস্তারিত
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAsset(ast);
                                  setIsAddAssetOpen(true);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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
          )}

          {/* Empty State */}
          {filteredAssets.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">কোনো সম্পদ পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                আপনার দেওয়া সার্চ বা ফিল্টারের সাথে মিলে এমন কোনো সম্পদ নেই। নতুন সম্পদ যোগ করতে উপরের বাটনে ক্লিক করুন।
              </p>
              <button
                onClick={() => {
                  setEditingAsset(null);
                  setIsAddAssetOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                নতুন সম্পদ যোগ করুন
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 3. WAQF PROPERTY SECTION                   */}
      {/* ========================================== */}
      {activeTab === 'property' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">ওয়াকফ সম্পত্তি</span>
                <Building className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-slate-900 font-siliguri">
                {totalPropertiesCount} টি
              </div>
              <div className="text-[10px] text-slate-400 font-medium">নিবন্ধিত রেকর্ড</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">মোট জমির পরিমাণ</span>
                <Landmark className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700 font-siliguri">
                {totalPropertyAreaDecimal > 0 ? `${totalPropertyAreaDecimal.toLocaleString('en-IN')} শতক` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">ওয়াকফ এস্টেট</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">আনুমানিক মূল্য</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-black text-slate-900 font-siliguri truncate">
                ৳{totalEstimatedPropertyValue.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">বর্তমান বাজারমূল্য</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">মাসিক ভাড়া আয়</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-lg font-black text-indigo-700 font-siliguri truncate">
                ৳{totalMonthlyRentIncome.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">ইজারা ও দোকান ভাড়া</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">সক্রিয় ভাড়াটিয়া</span>
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl font-black text-slate-900 font-siliguri">
                {activeTenantsCount} জন
              </div>
              <div className="text-[10px] text-slate-400 font-medium">চলমান চুক্তি</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">মামলা ও বিরোধ</span>
                <Scale className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-black text-rose-700 font-siliguri">
                {activeLegalCasesCount} টি
              </div>
              <div className="text-[10px] text-slate-400 font-medium">চলমান কেস</div>
            </div>
          </div>

          {/* Expiry & Due Date Alerts Banner */}
          {(expiringAgreementsList.length > 0 || upcomingHearingsList.length > 0) && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>জরুরি সতর্কতা ও সময়সীমা বিজ্ঞপ্তি</span>
                </div>
                <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  {expiringAgreementsList.length + upcomingHearingsList.length} টি নোটিফিকেশন
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {expiringAgreementsList.map((tnt) => {
                  const prop = safeProperties.find((p) => (p.tenants || []).some((t) => t.id === tnt.id));
                  return (
                    <div
                      key={tnt.id}
                      className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {tnt.tenantName} ({tnt.shopOrUnitNo || 'ইউনিট'})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          সম্পত্তি: {prop?.name || prop?.description || 'ওয়াকফ সম্পত্তি'} | মেয়াদের শেষ:{' '}
                          <span className="font-bold text-rose-600 font-mono">{tnt.endDate}</span>
                        </div>
                      </div>
                      {prop && (
                        <button
                          onClick={() => {
                            setSelectedPropertyForDetails(prop);
                          }}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] rounded-lg transition-colors"
                        >
                          চুক্তি দেখুন
                        </button>
                      )}
                    </div>
                  );
                })}

                {upcomingHearingsList.map((cs) => {
                  const prop = safeProperties.find((p) => (p.legalCases || []).some((c) => c.id === cs.id));
                  return (
                    <div
                      key={cs.id}
                      className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          মামলা নং {cs.caseNumber} ({cs.courtName || 'আদালত'})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          সম্পত্তি: {prop?.name || prop?.description || 'ওয়াকফ সম্পত্তি'} | শুনানির তারিখ:{' '}
                          <span className="font-bold text-rose-600 font-mono">{cs.nextHearingDate}</span>
                        </div>
                      </div>
                      {prop && (
                        <button
                          onClick={() => {
                            setSelectedPropertyForDetails(prop);
                          }}
                          className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px] rounded-lg transition-colors"
                        >
                          কেস ফাইল
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter, Search & Layout Control Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="সম্পত্তির নাম, কোড, মৌজা, খতিয়ান, দাগ বা ওয়াকিফের নাম খুঁজুন..."
                  value={propertySearchQuery}
                  onChange={(e) => setPropertySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
                />
                {propertySearchQuery && (
                  <button
                    onClick={() => setPropertySearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters & View Mode */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filter */}
                <select
                  value={propertyCategoryFilter}
                  onChange={(e) => setPropertyCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">সকল ক্যাটাগরি</option>
                  {PROPERTY_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.labelBn}
                    </option>
                  ))}
                </select>

                {/* Possession Filter */}
                <select
                  value={propertyPossessionFilter}
                  onChange={(e) => setPropertyPossessionFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">সকল দখল অবস্থা</option>
                  {POSSESSION_STATUSES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.labelBn}
                    </option>
                  ))}
                </select>

                {/* Toggle Archive */}
                <button
                  onClick={() => setShowArchivedProperties(!showArchivedProperties)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    showArchivedProperties
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {showArchivedProperties ? 'আর্কাইভকৃত তালিকা' : 'সক্রিয় তালিকা'}
                </button>

                {/* View Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setPropertyViewMode('GRID')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      propertyViewMode === 'GRID' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                    }`}
                    title="গ্রিড কার্ড ভিউ"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPropertyViewMode('TABLE')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      propertyViewMode === 'TABLE' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'
                    }`}
                    title="মাস্টার টেবিল রেজিস্টার"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Properties Grid View */}
          {propertyViewMode === 'GRID' && filteredProperties.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProperties.map((prop) => {
                const catObj = PROPERTY_CATEGORIES.find((c) => c.id === prop.category);
                const possObj = POSSESSION_STATUSES.find((p) => p.id === prop.possessionStatus);
                const statObj = PROPERTY_STATUSES.find((s) => s.id === prop.status);

                const activeTenants = (prop.tenants || []).filter(
                  (t) => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON'
                );
                const runningCases = (prop.legalCases || []).filter(
                  (c) => c.status === 'RUNNING' || c.status === 'STAY_ORDER'
                );

                const propertyRentSum = activeTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);
                const displayMonthlyRent = propertyRentSum || prop.monthlyIncome || prop.monthlyRent || 0;

                return (
                  <div
                    key={prop.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            {prop.propertyCode}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {catObj?.labelBn || prop.category || 'ওয়াকফ সম্পত্তি'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              possObj?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {possObj?.labelBn || prop.possessionStatus || 'দখলে'}
                          </span>
                          {prop.isArchived && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              আর্কাইভড
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Waqif Info */}
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {prop.name || prop.description || 'ওয়াকফ জমি ও সম্পত্তি'}
                        </h3>
                        <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {prop.waqifName && (
                            <span>
                              ওয়াকিফ:{' '}
                              <strong className="text-slate-800">{prop.waqifName}</strong>
                            </span>
                          )}
                          {prop.waqfEnrollmentNo && (
                            <span>
                              ওয়াকফ ইসি নং:{' '}
                              <strong className="text-blue-700 font-mono">{prop.waqfEnrollmentNo}</strong>
                            </span>
                          )}
                          {prop.location && (
                            <span>
                              অবস্থান:{' '}
                              <strong className="text-slate-700">{prop.location}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Land Survey & Plot Identification Strip */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">মৌজা ও জেএল</span>
                          <strong className="text-slate-800 font-medium">
                            {prop.mouza || '—'} {prop.jlNumber ? `(JL-${prop.jlNumber})` : ''}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">খতিয়ান নং</span>
                          <strong className="text-slate-800 font-medium">
                            {prop.bsKhatianNo ? `BS: ${prop.bsKhatianNo}` : prop.khatianNo || '—'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">দাগ নং</span>
                          <strong className="text-slate-800 font-medium">
                            {prop.bsPlotNo ? `BS: ${prop.bsPlotNo}` : prop.plotNo || '—'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">জমির পরিমাণ</span>
                          <strong className="text-emerald-700 font-bold">
                            {prop.area || (prop.areaAmount ? `${prop.areaAmount} ${prop.areaUnit || 'শতক'}` : '—')}
                          </strong>
                        </div>
                      </div>

                      {/* Valuation & Financial Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-blue-700 block">মাসিক ভাড়া আয়</span>
                            <strong className="text-sm text-blue-900 font-siliguri">
                              ৳{displayMonthlyRent.toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <DollarSign className="w-4 h-4 text-blue-500 opacity-60" />
                        </div>

                        <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-amber-800 block">আনুমানিক মূল্য</span>
                            <strong className="text-sm text-amber-950 font-siliguri">
                              ৳{(prop.estimatedValue || 0).toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <Landmark className="w-4 h-4 text-amber-600 opacity-60" />
                        </div>
                      </div>

                      {/* Sub-Collection Stats Indicators */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                        <div
                          className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 ${
                            activeTenants.length > 0
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          <span>ভাড়াটিয়া: {activeTenants.length} জন</span>
                        </div>

                        <div
                          className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 ${
                            (prop.inspections || []).length > 0
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>পরিদর্শন: {(prop.inspections || []).length} টি</span>
                        </div>

                        {runningCases.length > 0 && (
                          <div className="px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 bg-rose-50 text-rose-800 border border-rose-200 animate-pulse">
                            <Scale className="w-3 h-3 text-rose-600" />
                            <span>মামলা: {runningCases.length} টি সক্রিয়</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setSelectedPropertyForDetails(prop)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>বিস্তারিত ও দখল লগ</span>
                        </button>
                        <button
                          onClick={() => setSelectedPropertyForPrint(prop)}
                          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                          title="ওয়াকফ প্রত্যয়নপত্র প্রিন্ট করুন"
                        >
                          <Printer className="w-4 h-4 text-slate-700" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedPropertyForTenant(prop);
                          }}
                          className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                          title="নতুন ভাড়াটিয়া ও দোকান বরাদ্দ"
                        >
                          <Users className="w-3 h-3" />
                          <span>+ভাড়াটিয়া</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPropertyForInspection(prop);
                          }}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                          title="দখল ও পরিদর্শন লগ এন্ট্রি"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>+পরিদর্শন</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingProperty(prop);
                            setIsAddPropertyOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="সম্পত্তি সম্পাদনা করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Properties Table View (Full Register) */}
          {propertyViewMode === 'TABLE' && filteredProperties.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">কোড</th>
                      <th className="py-3 px-4">সম্পত্তির বিবরণ ও ওয়াকিফ</th>
                      <th className="py-3 px-4">শ্রেণি</th>
                      <th className="py-3 px-4">মৌজা ও দাগ/খতিয়ান</th>
                      <th className="py-3 px-4">জমির পরিমাণ</th>
                      <th className="py-3 px-4">দখল অবস্থা</th>
                      <th className="py-3 px-4">মাসিক ভাড়া</th>
                      <th className="py-3 px-4">আনুমানিক মূল্য</th>
                      <th className="py-3 px-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredProperties.map((prop) => {
                      const catObj = PROPERTY_CATEGORIES.find((c) => c.id === prop.category);
                      const possObj = POSSESSION_STATUSES.find((p) => p.id === prop.possessionStatus);
                      const activeTenants = (prop.tenants || []).filter((t) => t.status === 'ACTIVE');
                      const propertyRentSum = activeTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);
                      const displayMonthlyRent = propertyRentSum || prop.monthlyIncome || prop.monthlyRent || 0;

                      return (
                        <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{prop.propertyCode}</td>
                          <td className="py-3 px-4">
                            <strong className="text-slate-900 block">{prop.name || prop.description}</strong>
                            <div className="text-[10px] text-slate-500">
                              {prop.waqifName ? `ওয়াকিফ: ${prop.waqifName}` : ''}{' '}
                              {prop.location ? `| ${prop.location}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{catObj?.labelBn || prop.category}</td>
                          <td className="py-3 px-4">
                            <span className="text-slate-800 block">
                              {prop.mouza || '—'} {prop.jlNumber ? `(JL-${prop.jlNumber})` : ''}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              দাগ: {prop.bsPlotNo || prop.plotNo || '—'} | খতিয়ান: {prop.bsKhatianNo || prop.khatianNo || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-700 font-siliguri">
                            {prop.area || (prop.areaAmount ? `${prop.areaAmount} ${prop.areaUnit || 'শতক'}` : '—')}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                possObj?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {possObj?.labelBn || prop.possessionStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-blue-800 font-siliguri">
                            ৳{displayMonthlyRent.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 font-siliguri">
                            ৳{(prop.estimatedValue || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setSelectedPropertyForDetails(prop)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px]"
                              >
                                বিস্তারিত
                              </button>
                              <button
                                onClick={() => setSelectedPropertyForPrint(prop)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                title="প্রত্যয়ন প্রিন্ট"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProperty(prop);
                                  setIsAddPropertyOpen(true);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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
          )}

          {/* Empty State */}
          {filteredProperties.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <Building className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">কোনো ওয়াকফ সম্পত্তি পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                আপনার দেওয়া সার্চ বা ফিল্টারের সাথে মিলে এমন কোনো সম্পত্তি নেই। নতুন সম্পত্তি যোগ করতে নিচের বাটনে ক্লিক করুন।
              </p>
              <button
                onClick={() => {
                  setEditingProperty(null);
                  setIsAddPropertyOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                নতুন ওয়াকফ সম্পত্তি যোগ করুন
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 4. CEMETERY SECTION                        */}
      {/* ========================================== */}
      {activeTab === 'cemetery' && (
        <div className="space-y-6">
          {/* Header & Main Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">কবরস্থান রেজিস্টার ও প্লট ব্যবস্থাপনা</h2>
                  <p className="text-xs text-slate-500">
                    ওয়াকফ কবরস্থানে দাফনকৃত মরহুমগণের পূর্ণাঙ্গ বিবরণ, প্লট ট্র্যাকিং ও প্রত্যয়নপত্র
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowArchivedCemetery(!showArchivedCemetery)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                  showArchivedCemetery
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>{showArchivedCemetery ? 'সক্রিয় রেকর্ডসমূহ দেখুন' : `আর্কাইভ (${archivedCemetery.length})`}</span>
              </button>

              <button
                onClick={() => setIsCemeteryReportsOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>রিপোর্ট ও রেজিস্ট্রি প্রিন্ট</span>
              </button>

              <button
                onClick={() => {
                  setEditingCemeteryRecord(null);
                  setIsAddCemeteryOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন দাফন রেকর্ড</span>
              </button>
            </div>
          </div>

          {/* Cemetery Dashboard Summary Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>মোট দাফনকৃত</span>
                <span className="p-1 bg-emerald-50 text-emerald-700 rounded-lg">⚰️</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 font-siliguri">
                {totalBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">জন</span>
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">নিবন্ধিত স্থায়ী ও অস্থায়ী দাফন</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>চলতি বছর ({currentYearStr})</span>
                <span className="p-1 bg-blue-50 text-blue-700 rounded-lg">📅</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 font-siliguri">
                {thisYearBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">জন</span>
              </p>
              <p className="text-[11px] text-slate-500">চলতি বছরের মোট জানাজা ও দাফন</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>চলতি মাস</span>
                <span className="p-1 bg-indigo-50 text-indigo-700 rounded-lg">🌙</span>
              </div>
              <p className="text-2xl font-bold text-indigo-700 font-siliguri">
                {thisMonthBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">জন</span>
              </p>
              <p className="text-[11px] text-slate-500">চলতি মাসের দাফন সংখ্যা</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                <span>আজ দাফন</span>
                <span className="p-1 bg-amber-50 text-amber-700 rounded-lg">⏰</span>
              </div>
              <p className="text-2xl font-bold text-amber-700 font-siliguri">
                {todayBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">জন</span>
              </p>
              <p className="text-[11px] text-amber-600 font-medium">আজকের তারিখভুক্ত দাফন</p>
            </div>
          </div>

          {/* Block Breakdown Pills */}
          {Object.keys(blockCounts).length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-600 font-bold">
                <Grid className="w-4 h-4 text-emerald-600" />
                <span>ব্লকভিত্তিক দাফন বণ্টন:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(blockCounts).map(([blk, count]) => (
                  <button
                    key={blk}
                    onClick={() => setCemeteryBlockFilter(cemeteryBlockFilter === blk ? 'ALL' : blk)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      cemeteryBlockFilter === blk
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {blk}: <span className="font-mono">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter, Search & View Mode Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="নাম, পিতা/স্বামী, প্লট নং, মোবাইল..."
                value={cemeterySearchQuery}
                onChange={(e) => setCemeterySearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all text-xs"
              />
              {cemeterySearchQuery && (
                <button
                  onClick={() => setCemeterySearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Block Filter */}
              <select
                value={cemeteryBlockFilter}
                onChange={(e) => setCemeteryBlockFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="ALL">সকল ব্লক</option>
                {DEFAULT_BLOCKS.map((blk) => (
                  <option key={blk} value={blk}>
                    {blk}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={cemeteryStatusFilter}
                onChange={(e) => setCemeteryStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="ALL">সকল অবস্থা</option>
                {PLOT_STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.labelBn}
                  </option>
                ))}
              </select>

              {/* Grave Type Filter */}
              <select
                value={cemeteryGraveTypeFilter}
                onChange={(e) => setCemeteryGraveTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:bg-white focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="ALL">সকল কবরের ধরন</option>
                {GRAVE_TYPES.map((gt) => (
                  <option key={gt.id} value={gt.id}>
                    {gt.labelBn}
                  </option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setCemeteryViewMode('GRID')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    cemeteryViewMode === 'GRID'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="কার্ড গ্রিড ভিউ"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCemeteryViewMode('TABLE')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    cemeteryViewMode === 'TABLE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="রেজিস্টার টেবিল ভিউ"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Records Display */}
          {cemeteryViewMode === 'GRID' ? (
            /* Grid View Mode */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCemetery.map((cem) => {
                const graveTypeObj = GRAVE_TYPES.find((g) => g.id === cem.graveType);
                const statusObj = PLOT_STATUSES.find((s) => s.id === cem.status);

                return (
                  <div
                    key={cem.id}
                    className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      cem.isArchived ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="p-5 space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono font-bold rounded-lg text-xs">
                            প্লট: {cem.plotNumber}
                          </span>
                          {cem.recordNumber && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded-md">
                              #{cem.recordNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          {graveTypeObj && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${graveTypeObj.color}`}>
                              {graveTypeObj.labelBn}
                            </span>
                          )}
                          {statusObj && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusObj.color}`}>
                              {statusObj.labelBn}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Deceased Main Info */}
                      <div>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">{cem.deceasedName}</h3>
                          {cem.gender && (
                            <span className="text-[11px] font-semibold text-slate-500">
                              {cem.gender === 'FEMALE' ? 'মহিলা' : 'পুরুষ'}
                              {cem.age ? ` (${cem.age} বছর)` : ''}
                            </span>
                          )}
                        </div>
                        {cem.fatherOrSpouseName && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            পিতা/স্বামী: <span className="font-semibold text-slate-800">{cem.fatherOrSpouseName}</span>
                          </p>
                        )}
                        {cem.motherName && (
                          <p className="text-[11px] text-slate-500">
                            মাতা: <span>{cem.motherName}</span>
                          </p>
                        )}
                      </div>

                      {/* Timeline & Location Specs */}
                      <div className="p-3 bg-slate-50/80 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                        {cem.dateOfDeath && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">মৃত্যুর তারিখ:</span>
                            <span className="font-semibold text-slate-800">{cem.dateOfDeath}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">দাফনের তারিখ ও সময়:</span>
                          <span className="font-bold text-slate-900">
                            {cem.burialDate} {cem.burialTime ? `| ${cem.burialTime}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">অবস্থান / ব্লক:</span>
                          <span className="font-semibold text-emerald-800">
                            {cem.blockName || 'ব্লক-এ'} {cem.rowNumber ? `| সারি: ${cem.rowNumber}` : ''}{' '}
                            {cem.graveLocation ? `(${cem.graveLocation})` : ''}
                          </span>
                        </div>
                        {cem.donationAmount !== undefined && cem.donationAmount > 0 && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500">দাফন ফি / অনুদান:</span>
                            <span className="font-bold text-emerald-700 font-siliguri">
                              ৳{cem.donationAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Heir / Contact Person */}
                      <div className="text-xs space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">ওয়ারিশ / অভিভাবক:</span>
                          <span className="font-semibold text-slate-800">
                            {cem.contactPersonName || '—'}{' '}
                            {cem.contactRelationship ? `(${cem.contactRelationship})` : ''}
                          </span>
                        </div>
                        {cem.contactPersonPhone && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">মোবাইল:</span>
                            <a
                              href={`tel:${cem.contactPersonPhone}`}
                              className="font-mono font-bold text-blue-600 hover:underline"
                            >
                              {cem.contactPersonPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                      <button
                        onClick={() => setSelectedCemeteryForDetails(cem)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>বিস্তারিত</span>
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedCemeteryForPrint(cem);
                            setCemeteryPrintInitialFormat('POS');
                          }}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                          title="POS রসিদ প্রিন্ট করুন"
                        >
                          <Receipt className="w-3 h-3 text-amber-700" />
                          <span>POS</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCemeteryForPrint(cem);
                            setCemeteryPrintInitialFormat('A4');
                          }}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                          title="A4 প্রত্যয়নপত্র প্রিন্ট করুন"
                        >
                          <Printer className="w-3 h-3 text-blue-700" />
                          <span>A4</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingCemeteryRecord(cem);
                            setIsAddCemeteryOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="রেকর্ড সম্পাদনা করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleArchiveCemeteryToggle(cem)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title={cem.isArchived ? 'আর্কাইভ থেকে আন-আর্কাইভ করুন' : 'আর্কাইভ করুন'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View Mode */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">প্লট / রেকর্ড</th>
                      <th className="py-3 px-4">মরহুমের নাম ও পরিচয়</th>
                      <th className="py-3 px-4">পিতা/স্বামীর নাম</th>
                      <th className="py-3 px-4">মৃত্যু ও দাফন তারিখ</th>
                      <th className="py-3 px-4">ব্লক ও কবরের অবস্থান</th>
                      <th className="py-3 px-4">ধরন ও অবস্থা</th>
                      <th className="py-3 px-4">ওয়ারিশ ও মোবাইল</th>
                      <th className="py-3 px-4">দাফন ফি</th>
                      <th className="py-3 px-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredCemetery.map((cem) => {
                      const graveTypeObj = GRAVE_TYPES.find((g) => g.id === cem.graveType);
                      const statusObj = PLOT_STATUSES.find((s) => s.id === cem.status);

                      return (
                        <tr key={cem.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-emerald-700 block">{cem.plotNumber}</span>
                            {cem.recordNumber && <span className="text-[10px] text-slate-400">#{cem.recordNumber}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <strong className="text-slate-900 block">{cem.deceasedName}</strong>
                            <div className="text-[10px] text-slate-500">
                              {cem.gender === 'FEMALE' ? 'মহিলা' : 'পুরুষ'}
                              {cem.age ? ` | বয়স: ${cem.age} বছর` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{cem.fatherOrSpouseName || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="text-slate-900 block font-semibold">{cem.burialDate}</span>
                            {cem.dateOfDeath && <span className="text-[10px] text-slate-500">মৃত্যু: {cem.dateOfDeath}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-emerald-800 block font-semibold">
                              {cem.blockName || 'ব্লক-এ'} {cem.rowNumber ? `| সারি: ${cem.rowNumber}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-500">{cem.graveLocation}</span>
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            {graveTypeObj && (
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${graveTypeObj.color}`}>
                                {graveTypeObj.labelBn}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-800 block">{cem.contactPersonName || '—'}</span>
                            {cem.contactPersonPhone && (
                              <a
                                href={`tel:${cem.contactPersonPhone}`}
                                className="text-[11px] font-mono text-blue-600 hover:underline"
                              >
                                {cem.contactPersonPhone}
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-700 font-siliguri">
                            ৳{(cem.donationAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setSelectedCemeteryForDetails(cem)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px]"
                              >
                                বিস্তারিত
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCemeteryForPrint(cem);
                                  setCemeteryPrintInitialFormat('POS');
                                }}
                                className="p-1 text-amber-700 hover:bg-amber-50 rounded"
                                title="POS রসিদ"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCemeteryForPrint(cem);
                                  setCemeteryPrintInitialFormat('A4');
                                }}
                                className="p-1 text-blue-700 hover:bg-blue-50 rounded"
                                title="A4 প্রত্যয়নপত্র"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCemeteryRecord(cem);
                                  setIsAddCemeteryOpen(true);
                                }}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                title="সম্পাদনা"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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
          )}

          {/* Empty State */}
          {filteredCemetery.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <Landmark className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">কোনো দাফন রেকর্ড পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                আপনার দেওয়া সার্চ বা ফিল্টারের সাথে মিলে এমন কোনো কবরস্থান রেকর্ড পাওয়া যায়নি। নতুন রেকর্ড অন্তর্ভুক্ত করতে নিচের বাটনে ক্লিক করুন।
              </p>
              <button
                onClick={() => {
                  setEditingCemeteryRecord(null);
                  setIsAddCemeteryOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                নতুন দাফন রেকর্ড অন্তর্ভুক্ত করুন
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 5. NOTICE BOARD SECTION                    */}
      {/* ========================================== */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    notice.priority === 'URGENT'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {notice.priority === 'URGENT' ? 'জরুরি নোটিশ' : 'সাধারণ বিজ্ঞপ্তি'}
                </span>
                <span className="text-xs text-slate-400">
                  {notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString('bn-BD') : ''}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{notice.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notice.description}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>প্রচারকারী: {notice.publishedBy}</span>
                <span>{notice.isPublic ? 'মুসুল্লিদের জন্য উন্মুক্ত' : 'অভ্যন্তরীণ নোটিশ'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* ALL MODALS                                 */}
      {/* ========================================== */}

      {/* 1. Add/Edit Staff Modal */}
      {isAddStaffOpen && (
        <StaffFormModal
          isOpen={isAddStaffOpen}
          onClose={() => {
            setIsAddStaffOpen(false);
            setEditingStaff(null);
          }}
          staff={editingStaff}
          staffList={staff}
          onSubmit={async (staffData) => {
            if (editingStaff) {
              if (onUpdateStaff) await onUpdateStaff(editingStaff.id, staffData);
            } else {
              if (onAddStaff) await onAddStaff(staffData);
            }
          }}
          language={language}
        />
      )}

      {/* 2. Staff Profile & History Drawer */}
      {selectedStaffForHistory && (
        <StaffProfileDrawer
          isOpen={Boolean(selectedStaffForHistory)}
          onClose={() => setSelectedStaffForHistory(null)}
          staff={selectedStaffForHistory}
          payments={staffPayments.filter((p) => p.staffId === selectedStaffForHistory.id)}
          accounts={accounts}
          language={language}
          onOpenPayModal={(sid) => {
            setSelectedStaffForHistory(null);
            handleOpenPayForStaff(sid);
          }}
          onEditStaff={(target) => {
            setSelectedStaffForHistory(null);
            setEditingStaff(target);
            setIsAddStaffOpen(true);
          }}
          onReviseSalary={async (staffId, data) => {
            if (onReviseStaffSalary) {
              await onReviseStaffSalary(staffId, data);
            }
          }}
          onUpdatePayment={onUpdateStaffPayment}
          onCancelPayment={onCancelStaffPayment}
          onPrintSlip={(payment, s) => handleOpenSlip(payment, s)}
          onPrintAnnualStatement={(s) => {
            setAnnualStatementStaffId(s.id);
            setIsAnnualStatementOpen(true);
          }}
        />
      )}

      {/* 2.1 Staff Festival Allowance Modal */}
      {isFestivalAllowanceOpen && (
        <StaffFestivalAllowanceModal
          isOpen={isFestivalAllowanceOpen}
          onClose={() => setIsFestivalAllowanceOpen(false)}
          staffList={staff}
          accounts={accounts}
          onDisburse={onDisburseFestivalAllowance || (async () => {})}
          language={language}
        />
      )}

      {/* 2.2 Comprehensive Staff Reports & Registers Modal */}
      {isStaffReportsOpen && (
        <StaffReportsModal
          isOpen={isStaffReportsOpen}
          onClose={() => setIsStaffReportsOpen(false)}
          staffList={staff}
          staffPayments={staffPayments}
          accounts={accounts as any}
          currentMosque={currentMosque as any}
          initialReportType={staffReportsInitialTab}
          language={language}
        />
      )}

      {/* 3. Pay Salary Modal */}
      {isPaySalaryOpen && (
        <StaffPaymentModal
          isOpen={isPaySalaryOpen}
          onClose={() => {
            setIsPaySalaryOpen(false);
            setPrefilledStaffId(undefined);
          }}
          staffList={staff}
          staffPayments={staffPayments}
          accounts={accounts}
          initialStaffId={prefilledStaffId}
          onPayStaff={onPayStaff}
          language={language}
        />
      )}

      {/* 4. Salary Slip Modal */}
      {slipModalOpen && slipStaff && slipPayment && (
        <StaffSalarySlipModal
          isOpen={slipModalOpen}
          onClose={() => {
            setSlipModalOpen(false);
            setSlipStaff(null);
            setSlipPayment(null);
          }}
          staff={slipStaff}
          payment={slipPayment}
          currentMosque={currentMosque as any}
          language={language}
        />
      )}

      {/* 5. Master Register Modal */}
      {isMasterRegisterOpen && (
        <StaffMasterRegisterModal
          isOpen={isMasterRegisterOpen}
          onClose={() => setIsMasterRegisterOpen(false)}
          staffList={staff}
          currentMosque={currentMosque as any}
          language={language}
        />
      )}

      {/* 6. Payment Register Modal */}
      {isPaymentRegisterOpen && (
        <StaffPaymentRegisterModal
          isOpen={isPaymentRegisterOpen}
          onClose={() => setIsPaymentRegisterOpen(false)}
          payments={staffPayments}
          staffList={staff}
          currentMosque={currentMosque as any}
          language={language}
        />
      )}

      {/* 7. Annual Statement Modal */}
      {isAnnualStatementOpen && (
        <StaffAnnualStatementModal
          isOpen={isAnnualStatementOpen}
          onClose={() => {
            setIsAnnualStatementOpen(false);
            setAnnualStatementStaffId(undefined);
          }}
          staffList={staff}
          payments={staffPayments}
          currentMosque={currentMosque as any}
          preselectedStaffId={annualStatementStaffId}
          language={language}
        />
      )}

      {/* 7.1 Bank Transfer Request Letter Modal */}
      {isBankTransferLetterOpen && (
        <BankTransferLetterModal
          isOpen={isBankTransferLetterOpen}
          onClose={() => {
            setIsBankTransferLetterOpen(false);
            setSelectedBankTransferMonth(undefined);
          }}
          staffList={staff}
          staffPayments={staffPayments}
          accounts={accounts}
          currentMosque={currentMosque as any}
          committeeTerms={committeeTerms}
          language={language}
          initialSelectedMonth={selectedBankTransferMonth}
        />
      )}

      {/* 8. Asset Form Modal (Add / Edit) */}
      {isAddAssetOpen && (
        <AssetFormModal
          isOpen={isAddAssetOpen}
          onClose={() => {
            setIsAddAssetOpen(false);
            setEditingAsset(null);
          }}
          onSave={handleSaveAsset}
          editingAsset={editingAsset}
          committeeTerms={committeeTerms}
          expenseEntries={expenseEntries}
          accounts={accounts}
          accountHeads={accountHeads}
          language={language}
        />
      )}

      {/* 9. Asset Details Modal (View, specs, history timeline) */}
      {selectedAssetForDetails && (
        <AssetDetailsModal
          isOpen={Boolean(selectedAssetForDetails)}
          onClose={() => setSelectedAssetForDetails(null)}
          asset={selectedAssetForDetails}
          currentMosque={currentMosque as any}
          onEdit={(ast) => {
            setSelectedAssetForDetails(null);
            setEditingAsset(ast);
            setIsAddAssetOpen(true);
          }}
          onArchive={handleArchiveAsset}
          onDelete={handleDeleteAsset}
          onAddServiceRecord={handleSaveAssetService}
          accounts={accounts}
          accountHeads={accountHeads}
          language={language}
        />
      )}

      {/* 10. Asset Service Modal (Log maintenance) */}
      {selectedAssetForService && (
        <AssetServiceModal
          isOpen={Boolean(selectedAssetForService)}
          onClose={() => setSelectedAssetForService(null)}
          asset={selectedAssetForService}
          onSaveService={handleSaveAssetService}
          accounts={accounts}
          accountHeads={accountHeads}
          language={language}
        />
      )}

      {/* 11. Asset Register Print Modal */}
      {isAssetRegisterOpen && (
        <AssetRegisterModal
          isOpen={isAssetRegisterOpen}
          onClose={() => setIsAssetRegisterOpen(false)}
          assets={filteredAssets}
          currentMosque={currentMosque as any}
          language={language}
        />
      )}

      {/* 12. Cemetery Management Modals & Drawers */}
      {/* Cemetery Form Modal (Add / Edit) */}
      <CemeteryFormModal
        isOpen={isAddCemeteryOpen}
        onClose={() => {
          setIsAddCemeteryOpen(false);
          setEditingCemeteryRecord(null);
        }}
        editRecord={editingCemeteryRecord}
        onSave={handleSaveCemeteryRecord}
        existingRecords={cemetery}
        language={language}
      />

      {/* Cemetery Details Drawer */}
      <CemeteryDetailsDrawer
        record={selectedCemeteryForDetails}
        isOpen={Boolean(selectedCemeteryForDetails)}
        onClose={() => setSelectedCemeteryForDetails(null)}
        onEdit={(rec) => {
          setSelectedCemeteryForDetails(null);
          setEditingCemeteryRecord(rec);
          setIsAddCemeteryOpen(true);
        }}
        onArchiveToggle={handleArchiveCemeteryToggle}
        onDelete={handleDeleteCemeteryAction}
        onPrintA4={(rec) => {
          setSelectedCemeteryForPrint(rec);
          setCemeteryPrintInitialFormat('A4');
        }}
        onPrintPos={(rec) => {
          setSelectedCemeteryForPrint(rec);
          setCemeteryPrintInitialFormat('POS');
        }}
        mosque={currentMosque}
        language={language}
      />

      {/* Cemetery Print Certificate & POS Modal */}
      {selectedCemeteryForPrint && (
        <CemeteryPrintModal
          record={selectedCemeteryForPrint}
          mosque={currentMosque}
          isOpen={Boolean(selectedCemeteryForPrint)}
          onClose={() => setSelectedCemeteryForPrint(null)}
          initialFormat={cemeteryPrintInitialFormat}
          language={language}
        />
      )}

      {/* Cemetery Reports & Master Register Modal */}
      {isCemeteryReportsOpen && (
        <CemeteryReportsModal
          isOpen={isCemeteryReportsOpen}
          onClose={() => setIsCemeteryReportsOpen(false)}
          records={safeCemetery}
          mosque={currentMosque}
          language={language}
        />
      )}

      {/* 13. Add Notice Modal */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">নতুন নোটিশ প্রচার করুন</h3>
              <button
                onClick={() => setIsNoticeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleNoticeSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">নোটিশের শিরোনাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: আগামী শুক্রবারের বিশেষ খুতবা ও দোয়া মাহফিল"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">গুরুত্বপূর্ণতা / Priority</label>
                <select
                  value={noticePriority}
                  onChange={(e) => setNoticePriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="NORMAL">সাধারণ নোটিশ</option>
                  <option value="URGENT">জরুরি বিজ্ঞপ্তি</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">বিস্তারিত বিবরণ *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="নোটিশের পূর্ণাঙ্গ বিবরণ লিখুন..."
                  value={noticeDesc}
                  onChange={(e) => setNoticeDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <label className="flex items-center space-x-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicNotice}
                  onChange={(e) => setIsPublicNotice(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>সাধারণ মুসুল্লিদের অ্যাপ ভিউতে দৃশ্যমান হবে</span>
              </label>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  নোটিশ প্রকাশ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 14. WAQF PROPERTY MODALS & DRAWERS         */}
      {/* ========================================== */}
      {/* Property Form Modal (Add / Edit) */}
      <PropertyFormModal
        isOpen={isAddPropertyOpen}
        onClose={() => {
          setIsAddPropertyOpen(false);
          setEditingProperty(null);
        }}
        property={editingProperty}
        onSubmit={handleSaveProperty}
        language={language}
      />

      {/* Property Details Drawer */}
      <PropertyDetailsDrawer
        property={selectedPropertyForDetails}
        isOpen={!!selectedPropertyForDetails}
        onClose={() => setSelectedPropertyForDetails(null)}
        onEdit={(prop) => {
          setSelectedPropertyForDetails(null);
          setEditingProperty(prop);
          setIsAddPropertyOpen(true);
        }}
        onArchiveToggle={handleArchivePropertyToggle}
        onPrint={(prop) => {
          setSelectedPropertyForPrint(prop);
        }}
        onAddTenant={(prop) => {
          setSelectedPropertyForTenant(prop);
        }}
        onTerminateTenant={handleTerminatePropertyTenantAction}
        onAddInspection={(prop) => {
          setSelectedPropertyForInspection(prop);
        }}
        onAddLegalCase={(prop) => {
          setSelectedPropertyForLegalCase(prop);
        }}
        language={language}
      />

      {/* Property Certificate Print View */}
      <PropertyCertificatePrint
        property={selectedPropertyForPrint}
        mosque={(currentMosque as any) || null}
        isOpen={!!selectedPropertyForPrint}
        onClose={() => setSelectedPropertyForPrint(null)}
        language={language}
      />

      {/* Property Tenant Modal */}
      {selectedPropertyForTenant && (
        <PropertyTenantModal
          isOpen={!!selectedPropertyForTenant}
          onClose={() => setSelectedPropertyForTenant(null)}
          property={selectedPropertyForTenant}
          onSubmit={handleSavePropertyTenant}
          language={language}
        />
      )}

      {/* Property Inspection Modal */}
      {selectedPropertyForInspection && (
        <PropertyInspectionModal
          isOpen={!!selectedPropertyForInspection}
          onClose={() => setSelectedPropertyForInspection(null)}
          property={selectedPropertyForInspection}
          onSubmit={handleSavePropertyInspection}
          language={language}
        />
      )}

      {/* Property Legal Case Modal */}
      {selectedPropertyForLegalCase && (
        <PropertyLegalCaseModal
          isOpen={!!selectedPropertyForLegalCase}
          onClose={() => setSelectedPropertyForLegalCase(null)}
          property={selectedPropertyForLegalCase}
          onSubmit={handleSavePropertyLegalCase}
          language={language}
        />
      )}

      {/* Property Reports & Print Center Modal */}
      {isPropertyReportsOpen && (
        <PropertyReportsModal
          isOpen={isPropertyReportsOpen}
          onClose={() => setIsPropertyReportsOpen(false)}
          properties={safeProperties}
          mosque={currentMosque}
          language={language}
        />
      )}
    </div>
  );
};

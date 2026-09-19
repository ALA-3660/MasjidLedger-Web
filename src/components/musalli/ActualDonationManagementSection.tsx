import React, { useState, useMemo } from 'react';
import {
  Coins,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Calendar,
  UserCheck,
  UserX,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Eye,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Building,
  DollarSign,
  TrendingUp,
  MapPin,
  Home,
  Phone,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Donation,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  DonationPlan,
  CollectionWorker,
  FinancialAccount,
  Mosque,
  User as AuthUser,
} from '../../types';
import { Language, toBanglaNumber, formatCurrency, formatDate } from '../../lib/i18n';
import { ActualDonationFormModal } from './ActualDonationFormModal';
import { ActualDonationDetailModal } from './ActualDonationDetailModal';

interface ActualDonationManagementSectionProps {
  donations: Donation[];
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  plans: DonationPlan[];
  collectionWorkers?: CollectionWorker[];
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  currentUser?: AuthUser | null;
  language?: Language;
  onRefresh?: () => void;
  onSaveDonation: (payload: any, submitMode: 'SAVE_AND_PRINT' | 'SAVE_ONLY') => Promise<Donation | void>;
  onPrintReceipt: (donation: Donation, format?: 'A4' | 'POS_80' | 'POS_58') => void;
  onCancelDonation?: (id: string, reason: string) => Promise<void>;
  loading?: boolean;
}

export const ActualDonationManagementSection: React.FC<ActualDonationManagementSectionProps> = ({
  donations,
  persons,
  families,
  areas,
  plans,
  collectionWorkers = [],
  accounts,
  currentMosque,
  currentUser,
  language = 'bn',
  onRefresh,
  onSaveDonation,
  onPrintReceipt,
  onCancelDonation,
  loading = false,
}) => {
  const isBn = language === 'bn';

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDonationForDetail, setSelectedDonationForDetail] = useState<Donation | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterType, setDateFilterType] = useState<
    'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'
  >('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedPlanLinkFilter, setSelectedPlanLinkFilter] = useState<'ALL' | 'PLAN_LINKED' | 'AD_HOC' | 'ANONYMOUS'>('ALL');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'amount' | 'donorName' | 'receiptNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Permissions
  const canCreate =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('CREATE_INCOME');

  // Calculate Date Ranges
  const dateRanges = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // This week (Monday start)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const thisWeekStartStr = monday.toISOString().split('T')[0];

    // This month
    const thisMonthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Last month
    const lastMonthStartStr = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEndStr = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

    // This year
    const thisYearStartStr = `${new Date().getFullYear()}-01-01`;

    return {
      today: todayStr,
      yesterday: yesterdayStr,
      thisWeekStart: thisWeekStartStr,
      thisMonthStart: thisMonthStartStr,
      lastMonthStart: lastMonthStartStr,
      lastMonthEnd: lastMonthEndStr,
      thisYearStart: thisYearStartStr,
    };
  }, []);

  // Filtered Donations
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const person = d.personId ? persons.find((p) => p.id === d.personId) : null;
        const plan = d.donationPlanId ? plans.find((p) => p.id === d.donationPlanId) : null;
        const matchSearch =
          d.receiptNumber.toLowerCase().includes(q) ||
          d.donorName.toLowerCase().includes(q) ||
          (d.donorPhone && d.donorPhone.includes(q)) ||
          (person && (person.personCode.toLowerCase().includes(q) || person.name.toLowerCase().includes(q))) ||
          (plan && plan.planCode.toLowerCase().includes(q)) ||
          (d.reference && d.reference.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q));

        if (!matchSearch) return false;
      }

      // Status
      if (selectedStatus !== 'ALL' && d.status !== selectedStatus) return false;

      // Plan link filter
      if (selectedPlanLinkFilter === 'PLAN_LINKED' && !d.donationPlanId) return false;
      if (selectedPlanLinkFilter === 'AD_HOC' && (d.donationPlanId || d.isAnonymous || !d.personId)) return false;
      if (selectedPlanLinkFilter === 'ANONYMOUS' && !d.isAnonymous && d.personId) return false;

      // Payment method
      if (selectedMethod && d.paymentMethod !== selectedMethod) return false;

      // Area filter
      if (selectedAreaId) {
        const person = d.personId ? persons.find((p) => p.id === d.personId) : null;
        const fam = d.familyId ? families.find((f) => f.id === d.familyId) : person?.familyId ? families.find((f) => f.id === person.familyId) : null;
        const dAreaId = d.areaId || person?.areaId || fam?.areaId;
        if (dAreaId !== selectedAreaId) return false;
      }

      // Family filter
      if (selectedFamilyId) {
        const person = d.personId ? persons.find((p) => p.id === d.personId) : null;
        const dFamId = d.familyId || person?.familyId;
        if (dFamId !== selectedFamilyId) return false;
      }

      // Date Range Filter
      const donDate = d.date ? d.date.split('T')[0] : '';
      if (dateFilterType === 'TODAY') {
        if (donDate !== dateRanges.today) return false;
      } else if (dateFilterType === 'YESTERDAY') {
        if (donDate !== dateRanges.yesterday) return false;
      } else if (dateFilterType === 'THIS_WEEK') {
        if (donDate < dateRanges.thisWeekStart || donDate > dateRanges.today) return false;
      } else if (dateFilterType === 'THIS_MONTH') {
        if (donDate < dateRanges.thisMonthStart || donDate > dateRanges.today) return false;
      } else if (dateFilterType === 'LAST_MONTH') {
        if (donDate < dateRanges.lastMonthStart || donDate > dateRanges.lastMonthEnd) return false;
      } else if (dateFilterType === 'THIS_YEAR') {
        if (donDate < dateRanges.thisYearStart || donDate > dateRanges.today) return false;
      } else if (dateFilterType === 'CUSTOM') {
        if (customStartDate && donDate < customStartDate) return false;
        if (customEndDate && donDate > customEndDate) return false;
      }

      return true;
    });
  }, [
    donations,
    searchQuery,
    selectedStatus,
    selectedPlanLinkFilter,
    selectedMethod,
    selectedAreaId,
    selectedFamilyId,
    dateFilterType,
    customStartDate,
    customEndDate,
    dateRanges,
    persons,
    families,
    plans,
  ]);

  // Sorted list
  const sortedDonations = useMemo(() => {
    return [...filteredDonations].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        valA = Number(a.amount || 0);
        valB = Number(b.amount || 0);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDonations, sortField, sortOrder]);

  // Financial KPI Calculations (Only COMPLETED donations)
  const kpis = useMemo(() => {
    const validDonations = donations.filter((d) => d.status === 'COMPLETED');
    const today = dateRanges.today;
    const thisMonthStart = dateRanges.thisMonthStart;
    const thisYearStart = dateRanges.thisYearStart;

    let totalAll = 0;
    let totalToday = 0;
    let totalThisMonth = 0;
    let totalThisYear = 0;
    let totalPlanLinked = 0;
    let totalAdHoc = 0;
    let totalAnonymous = 0;

    validDonations.forEach((d) => {
      const amt = Number(d.amount || 0);
      const dDate = d.date ? d.date.split('T')[0] : '';
      totalAll += amt;

      if (dDate === today) totalToday += amt;
      if (dDate >= thisMonthStart && dDate <= today) totalThisMonth += amt;
      if (dDate >= thisYearStart && dDate <= today) totalThisYear += amt;

      if (d.donationPlanId) {
        totalPlanLinked += amt;
      } else if (d.personId) {
        totalAdHoc += amt;
      } else {
        totalAnonymous += amt;
      }
    });

    return {
      totalAll,
      totalToday,
      totalThisMonth,
      totalThisYear,
      totalPlanLinked,
      totalAdHoc,
      totalAnonymous,
      count: validDonations.length,
    };
  }, [donations, dateRanges]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = sortedDonations.map((d, index) => {
      const person = d.personId ? persons.find((p) => p.id === d.personId) : null;
      const fam = d.familyId ? families.find((f) => f.id === d.familyId) : person?.familyId ? families.find((f) => f.id === person.familyId) : null;
      const ar = d.areaId ? areas.find((a) => a.id === d.areaId) : person?.areaId ? areas.find((a) => a.id === person.areaId) : fam?.areaId ? areas.find((a) => a.id === fam.areaId) : null;
      const plan = d.donationPlanId ? plans.find((p) => p.id === d.donationPlanId) : null;
      const worker = d.collectionWorkerId ? collectionWorkers.find((w) => w.id === d.collectionWorkerId || w.userId === d.collectionWorkerId) : null;

      return {
        'ক্রমিক নং': index + 1,
        'রসিদ নম্বর': d.receiptNumber,
        'তারিখ': formatDate(d.date, 'en'),
        'দাতার নাম': d.donorName,
        'ব্যক্তি কোড (Person ID)': person?.personCode || 'N/A',
        'মোবাইল নম্বর': d.donorPhone || person?.mobile || 'N/A',
        'পরিবার': fam?.name || 'N/A',
        'এলাকা': ar?.name || 'N/A',
        'দান পরিকল্পনা (Plan)': plan ? `${plan.planCode} (${plan.planType})` : 'প্ল্যান ছাড়া (Ad-hoc)',
        'অনুদানের খাত': d.category,
        'পরিশোধের মাধ্যম': d.paymentMethod,
        'অ্যাকাউন্ট': d.accountName,
        'সংগ্রহকারী কর্মী': worker?.name || d.receivedByName || 'অফিস',
        'রেফারেন্স / TrxID': d.reference || '',
        'বিবরণ / উদ্দেশ্য': d.description || '',
        'অনুদানের পরিমাণ (টাকা)': d.amount,
        'অবস্থা (Status)': d.status === 'COMPLETED' ? 'সম্পন্ন (Completed)' : 'বাতিল (Cancelled)',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Actual_Donations');
    XLSX.writeFile(workbook, `Masjid_Actual_Donations_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSort = (field: 'date' | 'amount' | 'donorName' | 'receiptNumber') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 font-siliguri flex items-center space-x-2">
            <Coins className="w-5 h-5 text-emerald-700" />
            <span>{isBn ? 'বাস্তব অনুদান গ্রহণ ও রসিদ রেজিস্টার (Phase B5)' : 'Actual Donation & Receipt Register'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-tiro mt-0.5">
            {isBn
              ? 'নিবন্ধিত মুসল্লি ও সাধারণ দাতাদের বাস্তব আর্থিক অনুদান গ্রহণ, প্ল্যান সমন্বয় ও কেন্দ্রীয় লেজারে পোস্টিং'
              : 'Record actual monetary collections, pledge settlement and central double-entry financial posting'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title={isBn ? 'রিফ্রেশ করুন' : 'Refresh'}
              className="p-2.5 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors flex items-center space-x-1.5 font-siliguri shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isBn ? 'এক্সেল ডাউনলোড' : 'Excel Export'}</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 font-siliguri"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? '+ অনুদান গ্রহণ করুন' : '+ Receive Donation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-siliguri">
            <span>{isBn ? 'আজকের অনুদান' : "Today's Collection"}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-900 font-baloo mt-2">
            {isBn ? `৳ ${toBanglaNumber(formatCurrency(kpis.totalToday))}` : `৳${kpis.totalToday.toLocaleString()}`}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-baloo">
            {isBn ? 'আজকের তারিখে সংগৃহীত' : 'Collected today'}
          </div>
        </div>

        {/* This Month */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-siliguri">
            <span>{isBn ? 'চলতি মাসের অনুদান' : 'This Month'}</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-teal-900 font-baloo mt-2">
            {isBn ? `৳ ${toBanglaNumber(formatCurrency(kpis.totalThisMonth))}` : `৳${kpis.totalThisMonth.toLocaleString()}`}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-baloo">
            {isBn ? '১ তারিখ থেকে আজ পর্যন্ত' : '1st of month to date'}
          </div>
        </div>

        {/* This Year */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-siliguri">
            <span>{isBn ? 'চলতি বছরের অনুদান' : 'This Year'}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-900 font-baloo mt-2">
            {isBn ? `৳ ${toBanglaNumber(formatCurrency(kpis.totalThisYear))}` : `৳${kpis.totalThisYear.toLocaleString()}`}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-baloo">
            {isBn ? `২০২৬ অর্থবছর` : 'Fiscal Year 2026'}
          </div>
        </div>

        {/* Plan vs Ad-hoc */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold font-siliguri">
            <span>{isBn ? 'প্ল্যান বনাম অ্যাড-হক অনুদান' : 'Planned vs Ad-hoc'}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <HeartHandshake className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-800 font-baloo mt-2 flex items-center justify-between">
            <span className="text-rose-700 font-bold">
              {isBn ? `প্ল্যান: ৳ ${toBanglaNumber(formatCurrency(kpis.totalPlanLinked))}` : `Plan: ৳${kpis.totalPlanLinked.toLocaleString()}`}
            </span>
            <span className="text-teal-700 font-bold">
              {isBn ? `অ্যাড-হক: ৳ ${toBanglaNumber(formatCurrency(kpis.totalAdHoc))}` : `Ad-hoc: ৳${kpis.totalAdHoc.toLocaleString()}`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-baloo flex items-center justify-between">
            <span>{isBn ? `বেনামী দান: ৳ ${toBanglaNumber(formatCurrency(kpis.totalAnonymous))}` : `Anon: ৳${kpis.totalAnonymous.toLocaleString()}`}</span>
            <span>{isBn ? `মোট রসিদ: ${toBanglaNumber(kpis.count)} টি` : `Receipts: ${kpis.count}`}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isBn ? 'রসিদ নং, দাতা, P-00001, PLAN কোড...' : 'Search receipt, donor, plan...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-siliguri"
            />
          </div>

          {/* Date Filter Preset */}
          <div>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-siliguri font-semibold"
            >
              <option value="THIS_MONTH">{isBn ? 'চলতি মাস (This Month)' : 'This Month'}</option>
              <option value="TODAY">{isBn ? 'আজ (Today)' : 'Today'}</option>
              <option value="YESTERDAY">{isBn ? 'গতকাল (Yesterday)' : 'Yesterday'}</option>
              <option value="THIS_WEEK">{isBn ? 'চলতি সপ্তাহ (This Week)' : 'This Week'}</option>
              <option value="LAST_MONTH">{isBn ? 'গত মাস (Last Month)' : 'Last Month'}</option>
              <option value="THIS_YEAR">{isBn ? 'চলতি বছর (This Year)' : 'This Year'}</option>
              <option value="ALL">{isBn ? 'সর্বকালীন (All Time)' : 'All Time'}</option>
              <option value="CUSTOM">{isBn ? 'কাস্টম তারিখ রেঞ্জ' : 'Custom Date Range'}</option>
            </select>
          </div>

          {/* Plan Link Filter */}
          <div>
            <select
              value={selectedPlanLinkFilter}
              onChange={(e) => setSelectedPlanLinkFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-siliguri font-semibold"
            >
              <option value="ALL">{isBn ? 'সকল অনুদান ধরন' : 'All Donation Types'}</option>
              <option value="PLAN_LINKED">{isBn ? 'দান পরিকল্পনা সংযুক্ত (Plan Linked)' : 'Plan Linked'}</option>
              <option value="AD_HOC">{isBn ? 'নিবন্ধিত কিন্তু প্ল্যান ছাড়া (Ad-hoc)' : 'Ad-hoc (Registered)'}</option>
              <option value="ANONYMOUS">{isBn ? 'সাধারণ / বেনামী দান (Anonymous)' : 'Anonymous'}</option>
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-siliguri font-semibold"
            >
              <option value="">{isBn ? 'সকল এলাকা / মহল্লা' : 'All Areas'}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.areaCode || 'Area'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {dateFilterType === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs font-siliguri">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">{isBn ? 'শুরু:' : 'From:'}</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">{isBn ? 'শেষ:' : 'To:'}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-2">
            <span>{isBn ? `মোট প্রাপ্ত অনুদান: ${toBanglaNumber(sortedDonations.length)} টি` : `Total Records: ${sortedDonations.length}`}</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-800 font-baloo font-bold">
              {isBn
                ? `ফিল্টার্ড মোট টাকা: ৳ ${toBanglaNumber(formatCurrency(sortedDonations.filter((d) => d.status === 'COMPLETED').reduce((acc, c) => acc + (c.amount || 0), 0)))}`
                : `Filtered Sum: ৳${sortedDonations.filter((d) => d.status === 'COMPLETED').reduce((acc, c) => acc + (c.amount || 0), 0).toLocaleString()}`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-700 border-b border-slate-200 font-siliguri font-bold select-none">
                <th
                  onClick={() => handleSort('receiptNumber')}
                  className="p-3.5 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>{isBn ? 'রসিদ নং' : 'Receipt No'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="p-3.5 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>{isBn ? 'তারিখ' : 'Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('donorName')}
                  className="p-3.5 cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>{isBn ? 'দাতা / মুসল্লি' : 'Donor / Musalli'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">{isBn ? 'পরিকল্পনা (Plan)' : 'Plan Link'}</th>
                <th className="p-3.5">{isBn ? 'হিসাব ও মাধ্যম' : 'Account & Method'}</th>
                <th
                  onClick={() => handleSort('amount')}
                  className="p-3.5 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>{isBn ? 'পরিমাণ (টাকা)' : 'Amount'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">{isBn ? 'অবস্থা' : 'Status'}</th>
                <th className="p-3.5 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-siliguri">
              {sortedDonations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-tiro text-xs">
                    {isBn ? 'কোনো অনুদান রেকর্ড পাওয়া যায়নি।' : 'No donation records found matching criteria.'}
                  </td>
                </tr>
              ) : (
                sortedDonations.map((donation) => {
                  const person = donation.personId ? persons.find((p) => p.id === donation.personId) : null;
                  const plan = donation.donationPlanId ? plans.find((p) => p.id === donation.donationPlanId) : null;
                  const isCancelled = donation.status === 'CANCELLED';

                  return (
                    <tr
                      key={donation.id}
                      className={`hover:bg-slate-50 transition-colors ${isCancelled ? 'bg-red-50/30' : ''}`}
                    >
                      {/* Receipt No */}
                      <td className="p-3.5 font-baloo font-bold text-slate-900">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {donation.receiptNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-slate-600 font-baloo">
                        {formatDate(donation.date, language)}
                      </td>

                      {/* Donor */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{donation.donorName}</span>
                          {person?.personCode && (
                            <span className="font-baloo text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              {person.personCode}
                            </span>
                          )}
                        </div>
                        {donation.donorPhone && (
                          <div className="text-[10px] text-slate-400 font-baloo mt-0.5">
                            {donation.donorPhone}
                          </div>
                        )}
                      </td>

                      {/* Plan Link */}
                      <td className="p-3.5">
                        {donation.donationPlanId || plan ? (
                          <div className="inline-flex items-center space-x-1 bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold font-baloo">
                            <HeartHandshake className="w-3 h-3 text-rose-600" />
                            <span>{donation.planCode || plan?.planCode || 'PLAN'}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-siliguri">
                            {donation.isAnonymous ? (isBn ? 'সাধারণ দান' : 'General') : (isBn ? 'অ্যাড-হক দান' : 'Ad-hoc')}
                          </span>
                        )}
                      </td>

                      {/* Account & Method */}
                      <td className="p-3.5 text-slate-600">
                        <div className="font-semibold text-slate-800 text-[11px] truncate max-w-[140px]">
                          {donation.accountName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {donation.paymentMethod === 'CASH'
                            ? isBn ? 'নগদ' : 'Cash'
                            : isBn ? 'ব্যাংক / ট্রান্সফার' : 'Bank'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 text-right font-baloo font-bold text-slate-900 text-sm">
                        <span className={isCancelled ? 'line-through text-slate-400' : 'text-emerald-900'}>
                          {isBn ? `৳ ${toBanglaNumber(formatCurrency(donation.amount))}` : `৳${donation.amount.toLocaleString()}`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCancelled
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isCancelled ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          <span>{isCancelled ? (isBn ? 'বাতিল' : 'Cancelled') : isBn ? 'সম্পন্ন' : 'Completed'}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDonationForDetail(donation)}
                            title={isBn ? 'বিবরণ দেখুন' : 'View Details'}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onPrintReceipt(donation, 'POS_80')}
                            title={isBn ? 'মানি রিসিট প্রিন্ট' : 'Print Receipt'}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
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

      {/* Form Modal */}
      {isCreateModalOpen && (
        <ActualDonationFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={onSaveDonation}
          persons={persons}
          families={families}
          areas={areas}
          plans={plans}
          collectionWorkers={collectionWorkers}
          accounts={accounts}
          currentUser={currentUser}
          language={language}
        />
      )}

      {/* Detail Modal */}
      {selectedDonationForDetail && (
        <ActualDonationDetailModal
          isOpen={Boolean(selectedDonationForDetail)}
          onClose={() => setSelectedDonationForDetail(null)}
          donation={selectedDonationForDetail}
          persons={persons}
          families={families}
          areas={areas}
          plans={plans}
          collectionWorkers={collectionWorkers}
          currentMosque={currentMosque}
          currentUser={currentUser}
          onPrintReceipt={onPrintReceipt}
          onCancelDonation={onCancelDonation}
          language={language}
        />
      )}
    </div>
  );
};

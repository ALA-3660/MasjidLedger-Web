import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { Mosque } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/i18n';
import { getAllRoleDefinitions } from '../../lib/partyCatalog';
import { printElement } from '../../lib/printUtils';
import { exportToXlsx } from '../../lib/reportingEngine';
import {
  PartyCustomRoleDef,
  PartyProfileType,
  PartyReportBundle,
  PartyReportDirectoryRow,
  PartyReportHistoryRow,
  PartyStatus,
} from '../../types/partyTypes';
import { toBanglaNumber } from '../CommitteeView';

export interface PartyReportViewProps {
  currentMosque?: Mosque | null;
  customRoles: PartyCustomRoleDef[];
  onOpenParty: (partyId: string) => void;
}

const CATEGORY_OPTIONS: Array<{ value: string; labelBn: string }> = [
  { value: 'ALL', labelBn: 'সকল বিভাগ' },
  { value: 'BUYER', labelBn: 'ক্রেতা' },
  { value: 'SELLER_SUPPLIER', labelBn: 'বিক্রেতা ও সরবরাহকারী' },
  { value: 'ARTISAN_LABOUR', labelBn: 'কারিগর ও শ্রমিক' },
  { value: 'CONTRACTOR_PROVIDER', labelBn: 'ঠিকাদার ও সেবাদাতা' },
  { value: 'ORGANIZATION', labelBn: 'প্রতিষ্ঠান ও সংস্থা' },
];

export const PartyReportView: React.FC<PartyReportViewProps> = ({
  currentMosque,
  customRoles,
  onOpenParty,
}) => {
  const [mode, setMode] = useState<'DIRECTORY' | 'HISTORY'>('DIRECTORY');
  const [categoryGroup, setCategoryGroup] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [partyTypeFilter, setPartyTypeFilter] = useState<PartyProfileType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<PartyStatus | 'ALL'>('ALL');
  const [sourceType, setSourceType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'AGREEMENT'>('ALL');
  const [search, setSearch] = useState('');
  const [occupation, setOccupation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState<PartyReportBundle | null>(null);

  const allRoles = useMemo(() => getAllRoleDefinitions(customRoles), [customRoles]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.getPartyReports({
        mode,
        categoryGroup,
        role: roleFilter,
        partyType: partyTypeFilter,
        status: statusFilter,
        occupation: occupation.trim() || undefined,
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sourceType,
      });
      setReport(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'রিপোর্ট তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReport();
    }, 220);
    return () => clearTimeout(timer);
  }, [
    mode,
    categoryGroup,
    roleFilter,
    partyTypeFilter,
    statusFilter,
    sourceType,
    search,
    occupation,
    startDate,
    endDate,
    currentMosque?.id,
  ]);

  const resetFilters = () => {
    setCategoryGroup('ALL');
    setRoleFilter('ALL');
    setPartyTypeFilter('ALL');
    setStatusFilter('ALL');
    setSourceType('ALL');
    setSearch('');
    setOccupation('');
    setStartDate('');
    setEndDate('');
  };

  const activePeriodLabel = useMemo(() => {
    if (startDate && endDate) return `${formatDate(startDate, 'bn')} হতে ${formatDate(endDate, 'bn')}`;
    if (startDate) return `${formatDate(startDate, 'bn')} থেকে অদ্যাবধি`;
    if (endDate) return `${formatDate(endDate, 'bn')} পর্যন্ত`;
    return 'সকল সময়';
  }, [startDate, endDate]);

  const activeFilterSummaryText = useMemo(() => {
    const parts: string[] = [];
    const catLabel = CATEGORY_OPTIONS.find((c) => c.value === categoryGroup)?.labelBn;
    if (categoryGroup !== 'ALL' && catLabel) parts.push(`বিভাগ: ${catLabel}`);
    if (roleFilter !== 'ALL') {
      const rLabel = allRoles.find((r) => r.code === roleFilter)?.labelBn || roleFilter;
      parts.push(`ভূমিকা: ${rLabel}`);
    }
    if (partyTypeFilter !== 'ALL') {
      parts.push(`ধরন: ${partyTypeFilter === 'ORGANIZATION' ? 'প্রতিষ্ঠান' : 'ব্যক্তি'}`);
    }
    if (statusFilter !== 'ALL') {
      parts.push(`অবস্থা: ${statusFilter === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}`);
    }
    if (sourceType !== 'ALL') {
      const sLabel =
        sourceType === 'INCOME' ? 'আয় ভাউচার' : sourceType === 'EXPENSE' ? 'ব্যয় ভাউচার' : 'চুক্তিপত্র';
      parts.push(`উৎস: ${sLabel}`);
    }
    if (occupation.trim()) parts.push(`পেশা/দক্ষতা: ${occupation.trim()}`);
    if (search.trim()) parts.push(`সার্চ: "${search.trim()}"`);
    parts.push(`সময়সীমা: ${activePeriodLabel}`);
    return parts.join(' · ');
  }, [
    categoryGroup,
    roleFilter,
    partyTypeFilter,
    statusFilter,
    sourceType,
    occupation,
    search,
    activePeriodLabel,
    allRoles,
  ]);

  const handlePrintPdf = async () => {
    await printElement('party-printable-report', {
      title:
        mode === 'DIRECTORY'
          ? 'ব্যক্তি, প্রতিষ্ঠান ও সেবাদাতা তালিকা রিপোর্ট'
          : 'ব্যক্তি ও প্রতিষ্ঠান কার্যক্রমের ইতিহাস রিপোর্ট',
      pageSize: 'A4',
      pageOrientation: 'landscape',
      margin: '9mm 10mm',
    });
  };

  const handleExportExcel = () => {
    if (!report) return;
    const mosqueName = currentMosque?.name || report.mosqueName || 'মসজিদ হিসাব';
    const summaryRows = [
      { label: 'মোট মিল পাওয়া প্রোফাইল', value: report.summary.totalPartiesMatched },
      { label: 'সক্রিয় প্রোফাইল', value: report.summary.activeCount },
      { label: 'নিষ্ক্রিয় প্রোফাইল', value: report.summary.inactiveCount },
      { label: 'মোট আয় (আয় ভাউচার ভিত্তিক)', value: report.summary.totalIncomeAmount },
      { label: 'মোট ক্রয় ও সরবরাহ (ব্যয় ভাউচার)', value: report.summary.totalPurchaseSupplyAmount },
      { label: 'মোট কাজ ও পারিশ্রমিক (ব্যয় ভাউচার)', value: report.summary.totalWorkWageAmount },
      { label: 'মোট ব্যয় (ব্যয় ভাউচার ভিত্তিক)', value: report.summary.totalExpenseAmount },
      { label: 'মোট সংযুক্ত ভাউচার', value: report.summary.totalVoucherCount },
      { label: 'মোট সংযুক্ত চুক্তিপত্র', value: report.summary.totalAgreementCount },
      { label: 'ফিল্টার সারসংক্ষেপ', value: activeFilterSummaryText },
    ];

    if (mode === 'DIRECTORY') {
      exportToXlsx<PartyReportDirectoryRow>({
        filename: `party-directory-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'পার্টি তালিকা ও সারসংক্ষেপ',
        mosqueName,
        reportTitle: 'ব্যক্তি, প্রতিষ্ঠান ও সেবাদাতা তালিকা ও লেনদেন সারসংক্ষেপ (Read-Only)',
        periodLabel: activePeriodLabel,
        summaryRows,
        columns: [
          { header: 'কোড', accessor: (r) => r.party.partyCode },
          { header: 'নাম / প্রতিষ্ঠান', accessor: (r) => r.party.name },
          {
            header: 'ধরন',
            accessor: (r) => (r.party.partyType === 'ORGANIZATION' ? 'প্রতিষ্ঠান' : 'ব্যক্তি'),
          },
          { header: 'ভূমিকাসমূহ', accessor: (r) => r.rolesLabelBn || '—' },
          { header: 'মোবাইল', accessor: (r) => r.party.phone },
          { header: 'পেশা / দক্ষতা', accessor: (r) => r.party.occupationOrSkill || '—' },
          { header: 'ঠিকানা', accessor: (r) => r.addressLine },
          { header: 'অবস্থা', accessor: (r) => (r.party.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়') },
          { header: 'আয় ভাউচার (টি)', accessor: (r) => r.incomeVoucherCount },
          { header: 'মোট আয় (৳)', accessor: (r) => r.totalIncomeAmount },
          { header: 'ক্রয় ও সরবরাহ (৳)', accessor: (r) => r.purchaseSupplyAmount },
          { header: 'কাজ ও পারিশ্রমিক (৳)', accessor: (r) => r.workWageAmount },
          { header: 'মোট ব্যয় (৳)', accessor: (r) => r.totalExpenseAmount },
          { header: 'চুক্তিপত্র (টি)', accessor: (r) => r.agreementCount },
          { header: 'সর্বশেষ কার্যক্রম', accessor: (r) => r.lastActivityDate || '—' },
        ],
        data: report.directoryRows,
        grandTotalRow: [
          'মোট প্রোফাইল: ' + report.summary.totalPartiesMatched,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          report.directoryRows.reduce((s, r) => s + r.incomeVoucherCount, 0),
          report.summary.totalIncomeAmount,
          report.summary.totalPurchaseSupplyAmount,
          report.summary.totalWorkWageAmount,
          report.summary.totalExpenseAmount,
          report.summary.totalAgreementCount,
          '',
        ],
      });
    } else {
      exportToXlsx<PartyReportHistoryRow>({
        filename: `party-activity-history-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'পার্টি কার্যক্রমের ইতিহাস',
        mosqueName,
        reportTitle: 'ব্যক্তি ও প্রতিষ্ঠান কার্যক্রমের ইতিহাস রিপোর্ট (Read-Only)',
        periodLabel: activePeriodLabel,
        summaryRows,
        columns: [
          { header: 'তারিখ', accessor: (r) => r.date || '—' },
          { header: 'রেফারেন্স নং', accessor: (r) => r.referenceNumber },
          { header: 'উৎস মডিউল', accessor: (r) => r.sourceLabelBn },
          { header: 'শ্রেণি', accessor: (r) => r.categoryLabelBn },
          { header: 'পার্টি কোড', accessor: (r) => r.partyCode },
          { header: 'ব্যক্তি / প্রতিষ্ঠান', accessor: (r) => r.partyName },
          { header: 'মোবাইল', accessor: (r) => r.partyPhone },
          { header: 'শিরোনাম / খাত', accessor: (r) => r.titleOrHeadBn },
          { header: 'সংরক্ষিত নাম', accessor: (r) => r.snapshotName },
          { header: 'পরিমাণ (৳)', accessor: (r) => (typeof r.amount === 'number' ? r.amount : '') },
          { header: 'অবস্থা', accessor: (r) => r.statusLabelBn },
        ],
        data: report.historyRows,
      });
    }
  };

  return (
    <div className="space-y-4 font-siliguri">
      {/* Screen Filter & Export Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                রিপোর্ট, তালিকা ও কার্যক্রমের ইতিহাস এক্সপোর্ট
              </h2>
              <p className="text-xs text-slate-500">
                বিভাগ, ভূমিকা, পেশা, অবস্থা ও তারিখ অনুযায়ী ফিল্টার করে প্রিন্ট, PDF বা Excel (.xlsx) তৈরি করুন
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              রিফ্রেশ
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || !report}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={loading || !report}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              প্রিন্ট / PDF সংরক্ষণ
            </button>
          </div>
        </div>

        {/* Report Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setMode('DIRECTORY')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'DIRECTORY'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              তালিকা ও সারসংক্ষেপ রিপোর্ট
            </button>
            <button
              type="button"
              onClick={() => setMode('HISTORY')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                mode === 'HISTORY'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              নির্দিষ্ট সময়ের কার্যক্রমের ইতিহাস
            </button>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ফিল্টার রিসেট করুন
          </button>
        </div>

        {/* Multi-Criteria Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">বিভাগ (Category)</label>
            <select
              value={categoryGroup}
              onChange={(e) => setCategoryGroup(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelBn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">ভূমিকা (Role)</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">সকল ভূমিকা</option>
              {allRoles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.labelBn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">প্রোফাইলের ধরন</label>
            <select
              value={partyTypeFilter}
              onChange={(e) => setPartyTypeFilter(e.target.value as PartyProfileType | 'ALL')}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">সকল ধরন (ব্যক্তি ও প্রতিষ্ঠান)</option>
              <option value="INDIVIDUAL">একক ব্যক্তি</option>
              <option value="ORGANIZATION">প্রতিষ্ঠান / সংস্থা</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">অবস্থা (Status)</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PartyStatus | 'ALL')}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">সকল অবস্থা</option>
              <option value="ACTIVE">সক্রিয় (Active)</option>
              <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">নাম / মোবাইল / কোড</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="খুঁজুন..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">পেশা / মূল দক্ষতা</label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="যেমন: রাজমিস্ত্রী, হার্ডওয়্যার..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">শুরু তারিখ ও শেষ তারিখ</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">কার্যক্রমের উৎস</label>
            <select
              value={sourceType}
              onChange={(e) =>
                setSourceType(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE' | 'AGREEMENT')
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">সকল উৎস (আয়, ব্যয় ও চুক্তিপত্র)</option>
              <option value="INCOME">শুধু আয় ভাউচার</option>
              <option value="EXPENSE">শুধু ব্যয় ভাউচার</option>
              <option value="AGREEMENT">শুধু চুক্তিপত্র</option>
            </select>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-800 flex items-center gap-2 no-print">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Printable Report Canvas */}
      <div
        id="party-printable-report"
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        {/* Mosque Formal Print Header */}
        <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-lg font-bold text-slate-950 font-mosque-name">
              {currentMosque?.name || report?.mosqueName || 'মসজিদ ব্যবস্থাপনা ও হিসাব'}
            </div>
            {currentMosque?.address && (
              <div className="text-xs text-slate-600 font-tiro">{currentMosque.address}</div>
            )}
            <div className="text-sm font-bold text-emerald-900 mt-1">
              {mode === 'DIRECTORY'
                ? 'ব্যক্তি, প্রতিষ্ঠান ও সেবাদাতা তালিকা এবং লেনদেন সারসংক্ষেপ'
                : 'ব্যক্তি, প্রতিষ্ঠান ও সেবাদাতার কার্যক্রমের ইতিহাস রিপোর্ট'}
            </div>
          </div>
          <div className="text-[11px] text-slate-600 sm:text-right space-y-0.5">
            <div>
              <Filter className="w-3 h-3 inline mr-1" />
              {activeFilterSummaryText}
            </div>
            <div className="font-baloo">
              প্রস্তুতের সময়: {new Date(report?.generatedAt || Date.now()).toLocaleString('bn-BD')}
            </div>
          </div>
        </div>

        {/* Read-Only Source Attribution Note */}
        <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-tiro">
          এই রিপোর্টে প্রদর্শিত সকল অর্থের হিসাব সংরক্ষিত <strong>আয় ভাউচার</strong>,{' '}
          <strong>ব্যয় ভাউচার</strong> ও <strong>চুক্তিপত্র</strong> থেকে শুধুমাত্র পাঠযোগ্য (Read-Only) হিসেবে সংকলিত। এখানে কোনো নতুন আর্থিক লেনদেন বা লেজার এন্ট্রি তৈরি করা হয় না।
        </div>

        {/* Summary KPI Strip */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div className="border border-slate-200 rounded-lg px-3 py-2.5">
              <div className="text-[11px] text-slate-500">মিল পাওয়া প্রোফাইল</div>
              <div className="text-lg font-bold text-slate-900 font-baloo tabular-nums">
                {toBanglaNumber(report.summary.totalPartiesMatched)}
              </div>
              <div className="text-[10px] text-slate-500">
                সক্রিয় {toBanglaNumber(report.summary.activeCount)} · নিষ্ক্রিয়{' '}
                {toBanglaNumber(report.summary.inactiveCount)}
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg px-3 py-2.5">
              <div className="text-[11px] text-slate-500">মোট আয় (আয় ভাউচার)</div>
              <div className="text-lg font-bold text-emerald-800 font-baloo tabular-nums">
                ৳ {toBanglaNumber(report.summary.totalIncomeAmount.toLocaleString('en-IN'))}
              </div>
              <div className="text-[10px] text-slate-500">অনুমোদিত আয় ভাউচার</div>
            </div>
            <div className="border border-slate-200 rounded-lg px-3 py-2.5">
              <div className="text-[11px] text-slate-500">ক্রয় ও সরবরাহ (ব্যয়)</div>
              <div className="text-lg font-bold text-slate-900 font-baloo tabular-nums">
                ৳ {toBanglaNumber(report.summary.totalPurchaseSupplyAmount.toLocaleString('en-IN'))}
              </div>
              <div className="text-[10px] text-slate-500">মালামাল ও সাপ্লাই ভাউচার</div>
            </div>
            <div className="border border-slate-200 rounded-lg px-3 py-2.5">
              <div className="text-[11px] text-slate-500">কাজ ও পারিশ্রমিক (ব্যয়)</div>
              <div className="text-lg font-bold text-slate-900 font-baloo tabular-nums">
                ৳ {toBanglaNumber(report.summary.totalWorkWageAmount.toLocaleString('en-IN'))}
              </div>
              <div className="text-[10px] text-slate-500">কারিগর, মেরামত ও সেবা</div>
            </div>
            <div className="border border-slate-200 rounded-lg px-3 py-2.5">
              <div className="text-[11px] text-slate-500">ভাউচার ও চুক্তিপত্র</div>
              <div className="text-lg font-bold text-slate-900 font-baloo tabular-nums">
                {toBanglaNumber(report.summary.totalVoucherCount)} /{' '}
                {toBanglaNumber(report.summary.totalAgreementCount)}
              </div>
              <div className="text-[10px] text-slate-500">মোট ভাউচার ও চুক্তি সংখ্যা</div>
            </div>
          </div>
        )}

        {/* Table Body */}
        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !report ? null : mode === 'DIRECTORY' ? (
          report.directoryRows.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              নির্বাচিত ফিল্টার অনুযায়ী কোনো ব্যক্তি বা প্রতিষ্ঠানের রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-700">
                    <th className="px-3 py-2.5 font-bold">ক্রঃ</th>
                    <th className="px-3 py-2.5 font-bold">পরিচিতি ও কোড</th>
                    <th className="px-3 py-2.5 font-bold">ভূমিকা ও পেশা</th>
                    <th className="px-3 py-2.5 font-bold">মোবাইল ও ঠিকানা</th>
                    <th className="px-3 py-2.5 font-bold text-right">মোট আয় (৳)</th>
                    <th className="px-3 py-2.5 font-bold text-right">ক্রয়/সরবরাহ (৳)</th>
                    <th className="px-3 py-2.5 font-bold text-right">কাজ/পারিশ্রমিক (৳)</th>
                    <th className="px-3 py-2.5 font-bold text-right">চুক্তিপত্র</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.directoryRows.map((row, idx) => (
                    <tr key={row.party.id} className="hover:bg-slate-50/70 align-top">
                      <td className="px-3 py-2.5 font-baloo tabular-nums text-slate-500">
                        {toBanglaNumber(idx + 1)}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenParty(row.party.id)}
                          className="allow-print text-left font-bold text-slate-900 hover:text-emerald-800"
                        >
                          {row.party.name}
                        </button>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-baloo">{row.party.partyCode}</span> ·{' '}
                          {row.party.partyType === 'ORGANIZATION' ? 'প্রতিষ্ঠান' : 'ব্যক্তি'} ·{' '}
                          {row.party.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-emerald-900">{row.rolesLabelBn || '—'}</div>
                        {row.party.occupationOrSkill && (
                          <div className="text-[11px] text-slate-500">{row.party.occupationOrSkill}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-baloo tabular-nums font-semibold text-slate-900">
                          {row.party.phone}
                        </div>
                        <div className="text-[11px] text-slate-500 max-w-[210px] truncate">
                          {row.addressLine}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-baloo tabular-nums font-semibold text-emerald-800">
                        {toBanglaNumber(row.totalIncomeAmount.toLocaleString('en-IN'))}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {toBanglaNumber(row.incomeVoucherCount)}টি ভাউচার
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-baloo tabular-nums font-semibold text-slate-900">
                        {toBanglaNumber(row.purchaseSupplyAmount.toLocaleString('en-IN'))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-baloo tabular-nums font-semibold text-slate-900">
                        {toBanglaNumber(row.workWageAmount.toLocaleString('en-IN'))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-baloo tabular-nums text-slate-800">
                        {toBanglaNumber(row.agreementCount)}টি
                        {row.lastActivityDate && (
                          <div className="text-[10px] text-slate-400">
                            {formatDate(row.lastActivityDate, 'bn')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : report.historyRows.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            নির্বাচিত সময়সীমা ও ফিল্টারে কোনো ভাউচার বা চুক্তিপত্র কার্যক্রম পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-700">
                  <th className="px-3 py-2.5 font-bold">তারিখ</th>
                  <th className="px-3 py-2.5 font-bold">রেফারেন্স ও উৎস</th>
                  <th className="px-3 py-2.5 font-bold">ব্যক্তি / প্রতিষ্ঠান</th>
                  <th className="px-3 py-2.5 font-bold">বিবরণ ও সংরক্ষিত নাম</th>
                  <th className="px-3 py-2.5 font-bold text-right">পরিমাণ (৳)</th>
                  <th className="px-3 py-2.5 font-bold text-right">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.historyRows.map((hr) => (
                  <tr key={hr.id} className="hover:bg-slate-50/70 align-top">
                    <td className="px-3 py-2.5 font-baloo tabular-nums whitespace-nowrap text-slate-700">
                      {hr.date ? formatDate(hr.date, 'bn') : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-baloo font-bold text-emerald-800">{hr.referenceNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {hr.sourceLabelBn} · {hr.categoryLabelBn}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenParty(hr.partyId)}
                        className="allow-print text-left font-bold text-slate-900 hover:text-emerald-800"
                      >
                        {hr.partyName}
                      </button>
                      <div className="text-[11px] text-slate-500 font-baloo tabular-nums">
                        {hr.partyCode} · {hr.partyPhone}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">{hr.titleOrHeadBn}</div>
                      <div className="text-[11px] text-slate-500">
                        দলিল/ভাউচারের নাম: {hr.snapshotName}
                        {hr.descriptionBn ? ` · ${hr.descriptionBn}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-baloo tabular-nums font-bold text-slate-900">
                      {typeof hr.amount === 'number'
                        ? `৳ ${toBanglaNumber(hr.amount.toLocaleString('en-IN'))}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-medium text-slate-700">
                      {hr.statusLabelBn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formal Mosque Print Signature Footer */}
        <div className="pt-8 mt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
          <div>
            <div className="border-t border-slate-400 pt-1.5 mx-4 font-semibold">প্রস্তুতকারী</div>
            <div className="text-[10px] text-slate-500">দপ্তর / ডাটা এন্ট্রি অপারেটর</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1.5 mx-4 font-semibold">
              হিসাবরক্ষক / কোষাধ্যক্ষ
            </div>
            <div className="text-[10px] text-slate-500">হিসাব যাচাই ও প্রতিবেদন</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1.5 mx-4 font-semibold">
              সভাপতি / সাধারণ সম্পাদক
            </div>
            <div className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</div>
          </div>
        </div>
      </div>
    </div>
  );
};

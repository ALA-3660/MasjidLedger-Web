import React, { useState } from 'react';
import {
  Crosshair,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Printer,
  FileSpreadsheet,
  Archive,
  Receipt,
  LayoutGrid,
  List,
  Landmark,
  Grid,
  Phone,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { CemeteryRecord, Mosque, MosqueProfile } from '../types';
import { Language } from '../lib/i18n';
import {
  CemeteryFormModal,
  DEFAULT_BLOCKS,
  GRAVE_TYPES,
  PLOT_STATUSES,
} from './CemeteryFormModal';
import { CemeteryDetailsDrawer } from './CemeteryDetailsDrawer';
import { CemeteryPrintModal } from './CemeteryPrintModal';
import { CemeteryReportsModal } from './CemeteryReportsModal';

interface CemeteryManagementViewProps {
  cemetery: CemeteryRecord[];
  currentMosque?: Mosque | MosqueProfile | null;
  language?: Language;
  onAddCemeteryRecord: (data: any) => Promise<void>;
  onUpdateCemeteryRecord?: (id: string, data: any) => Promise<void>;
  onArchiveCemeteryRecord?: (id: string, isArchived: boolean, reason?: string) => Promise<void>;
  onDeleteCemeteryRecord?: (id: string) => Promise<void>;
}

export const CemeteryManagementView: React.FC<CemeteryManagementViewProps> = ({
  cemetery = [],
  currentMosque,
  language = 'bn',
  onAddCemeteryRecord,
  onUpdateCemeteryRecord,
  onArchiveCemeteryRecord,
  onDeleteCemeteryRecord,
}) => {
  // Modal states
  const [isAddCemeteryOpen, setIsAddCemeteryOpen] = useState(false);
  const [editingCemeteryRecord, setEditingCemeteryRecord] = useState<CemeteryRecord | null>(null);
  const [selectedCemeteryForDetails, setSelectedCemeteryForDetails] = useState<CemeteryRecord | null>(null);
  const [selectedCemeteryForPrint, setSelectedCemeteryForPrint] = useState<CemeteryRecord | null>(null);
  const [cemeteryPrintInitialFormat, setCemeteryPrintInitialFormat] = useState<'A4' | 'POS'>('A4');
  const [isCemeteryReportsOpen, setIsCemeteryReportsOpen] = useState(false);

  // Search & Filter states
  const [cemeterySearchQuery, setCemeterySearchQuery] = useState('');
  const [cemeteryBlockFilter, setCemeteryBlockFilter] = useState<string>('ALL');
  const [cemeteryStatusFilter, setCemeteryStatusFilter] = useState<string>('ALL');
  const [cemeteryGraveTypeFilter, setCemeteryGraveTypeFilter] = useState<string>('ALL');
  const [showArchivedCemetery, setShowArchivedCemetery] = useState(false);
  const [cemeteryViewMode, setCemeteryViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  const safeCemetery = Array.isArray(cemetery) ? cemetery : [];

  // ==========================================
  // Cemetery Computations & Filtering
  // ==========================================
  const activeCemetery = safeCemetery.filter((c) => !c.isArchived);
  const archivedCemetery = safeCemetery.filter((c) => c.isArchived);
  const totalBurialsCount = activeCemetery.length;

  const currentYearStr = String(new Date().getFullYear());
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().split('T')[0];
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
      const matchBlock =
        cem.blockName === cemeteryBlockFilter || cem.graveLocation?.includes(cemeteryBlockFilter);
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
        ? prompt('আর্কাইভ করার কারণ উল্লেখ করুন (ঐচ্ছিক):') ||
          'কবরস্থান রেজিস্ট্রি থেকে সংরক্ষণার্থে আর্কাইভ করা হয়েছে'
        : undefined;
      await onArchiveCemeteryRecord(rec.id, isArchiving, reason);
      if (selectedCemeteryForDetails && selectedCemeteryForDetails.id === rec.id) {
        setSelectedCemeteryForDetails({
          ...selectedCemeteryForDetails,
          isArchived: isArchiving,
          archiveReason: reason,
        });
      }
    }
  };

  const handleDeleteCemeteryAction = async (rec: CemeteryRecord) => {
    const hasAuditOrFinance =
      rec.donationVoucherNo || (rec.maintenanceLogs && rec.maintenanceLogs.length > 0);
    if (hasAuditOrFinance) {
      alert(
        'সতর্কতা: এই দাফন রেকর্ডের সাথে আর্থিক অনুদান বা সার্ভিসিং হিস্ট্রি যুক্ত রয়েছে। অডিট নিরাপত্তার স্বার্থে এটি সরাসরি মোছা যাবে না। আপনি চাইলে "আর্কাইভ" করতে পারেন।'
      );
      return;
    }

    if (
      window.confirm(
        `আপনি কি নিশ্চিত যে "${rec.deceasedName} (প্লট: ${rec.plotNumber})" রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?`
      )
    ) {
      if (onDeleteCemeteryRecord) {
        await onDeleteCemeteryRecord(rec.id);
      }
      if (selectedCemeteryForDetails?.id === rec.id) {
        setSelectedCemeteryForDetails(null);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-siliguri">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl shadow-inner">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                কবরস্থান রেজিস্টার ও প্লট ব্যবস্থাপনা
              </h1>
              <p className="text-xs text-slate-500 font-tiro mt-0.5">
                {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ ওয়াকফ এস্টেট'} • ওয়াকফ কবরস্থানে দাফনকৃত মরহুমগণের পূর্ণাঙ্গ বিবরণ, প্লট ট্র্যাকিং ও প্রত্যয়নপত্র
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchivedCemetery(!showArchivedCemetery)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 cursor-pointer ${
              showArchivedCemetery
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>
              {showArchivedCemetery
                ? 'সক্রিয় রেকর্ডসমূহ দেখুন'
                : `আর্কাইভ (${archivedCemetery.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsCemeteryReportsOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>রিপোর্ট ও রেজিস্ট্রি প্রিন্ট</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCemeteryRecord(null);
              setIsAddCemeteryOpen(true);
            }}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন দাফন রেকর্ড</span>
          </button>
        </div>
      </div>

      {/* Cemetery Dashboard Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>মোট দাফনকৃত</span>
            <span className="p-1 bg-emerald-50 text-emerald-700 rounded-lg">⚰️</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-baloo">
            {totalBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500 font-siliguri">জন</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">নিবন্ধিত স্থায়ী ও অস্থায়ী দাফন</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>চলতি বছর ({currentYearStr})</span>
            <span className="p-1 bg-blue-50 text-blue-700 rounded-lg">📅</span>
          </div>
          <p className="text-2xl font-bold text-blue-700 font-baloo">
            {thisYearBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500 font-siliguri">জন</span>
          </p>
          <p className="text-[11px] text-slate-500">চলতি বছরের মোট জানাজা ও দাফন</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>চলতি মাস</span>
            <span className="p-1 bg-indigo-50 text-indigo-700 rounded-lg">🌙</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700 font-baloo">
            {thisMonthBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500 font-siliguri">জন</span>
          </p>
          <p className="text-[11px] text-slate-500">চলতি মাসের দাফন সংখ্যা</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>আজ দাফন</span>
            <span className="p-1 bg-amber-50 text-amber-700 rounded-lg">⏰</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 font-baloo">
            {todayBurialsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500 font-siliguri">জন</span>
          </p>
          <p className="text-[11px] text-amber-600 font-medium">আজকের তারিখভুক্ত দাফন</p>
        </div>
      </div>

      {/* Block Breakdown Pills */}
      {Object.keys(blockCounts).length > 0 && (
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-600 font-bold">
            <Grid className="w-4 h-4 text-emerald-600" />
            <span>ব্লকভিত্তিক দাফন বণ্টন:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(blockCounts).map(([blk, count]) => (
              <button
                key={blk}
                type="button"
                onClick={() => setCemeteryBlockFilter(cemeteryBlockFilter === blk ? 'ALL' : blk)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  cemeteryBlockFilter === blk
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {blk}: <span className="font-baloo">{count}</span>
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
              type="button"
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
              type="button"
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
              type="button"
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
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${graveTypeObj.color}`}
                        >
                          {graveTypeObj.labelBn}
                        </span>
                      )}
                      {statusObj && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusObj.color}`}
                        >
                          {statusObj.labelBn}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Deceased Main Info */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {cem.deceasedName}
                      </h3>
                      {cem.gender && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          {cem.gender === 'FEMALE' ? 'মহিলা' : 'পুরুষ'}
                          {cem.age ? ` (${cem.age} বছর)` : ''}
                        </span>
                      )}
                    </div>
                    {cem.fatherOrSpouseName && (
                      <p className="text-xs text-slate-600 mt-0.5 font-tiro">
                        পিতা/স্বামী: <span className="font-semibold text-slate-800 font-siliguri">{cem.fatherOrSpouseName}</span>
                      </p>
                    )}
                    {cem.motherName && (
                      <p className="text-[11px] text-slate-500 font-tiro">
                        মাতা: <span className="font-siliguri">{cem.motherName}</span>
                      </p>
                    )}
                  </div>

                  {/* Timeline & Location Specs */}
                  <div className="p-3 bg-slate-50/80 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                    {cem.dateOfDeath && (
                      <div className="flex items-center justify-between font-tiro">
                        <span className="text-slate-500">মৃত্যুর তারিখ:</span>
                        <span className="font-semibold text-slate-800 font-baloo">{cem.dateOfDeath}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between font-tiro">
                      <span className="text-slate-500">দাফনের তারিখ ও সময়:</span>
                      <span className="font-bold text-slate-900 font-baloo">
                        {cem.burialDate} {cem.burialTime ? `| ${cem.burialTime}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-tiro">
                      <span className="text-slate-500">অবস্থান / ব্লক:</span>
                      <span className="font-semibold text-emerald-800 font-siliguri">
                        {cem.blockName || 'ব্লক-এ'} {cem.rowNumber ? `| সারি: ${cem.rowNumber}` : ''}{' '}
                        {cem.graveLocation ? `(${cem.graveLocation})` : ''}
                      </span>
                    </div>
                    {cem.donationAmount !== undefined && cem.donationAmount > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-tiro">
                        <span className="text-slate-500">দাফন ফি / অনুদান:</span>
                        <span className="font-bold text-emerald-700 font-baloo">
                          ৳{cem.donationAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Heir / Contact Person */}
                  <div className="text-xs space-y-1 pt-1 font-tiro">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">ওয়ারিশ / অভিভাবক:</span>
                      <span className="font-semibold text-slate-800 font-siliguri">
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
                    type="button"
                    onClick={() => setSelectedCemeteryForDetails(cem)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>বিস্তারিত</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
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
                      type="button"
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
                      type="button"
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
                      type="button"
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

                  return (
                    <tr key={cem.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-emerald-700 block">{cem.plotNumber}</span>
                        {cem.recordNumber && (
                          <span className="text-[10px] text-slate-400">#{cem.recordNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 block">{cem.deceasedName}</strong>
                        <div className="text-[10px] text-slate-500 font-tiro">
                          {cem.gender === 'FEMALE' ? 'মহিলা' : 'পুরুষ'}
                          {cem.age ? ` | বয়স: ${cem.age} বছর` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-tiro">{cem.fatherOrSpouseName || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="text-slate-900 block font-semibold font-baloo">{cem.burialDate}</span>
                        {cem.dateOfDeath && (
                          <span className="text-[10px] text-slate-500 font-baloo">মৃত্যু: {cem.dateOfDeath}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-800 block font-semibold">
                          {cem.blockName || 'ব্লক-এ'} {cem.rowNumber ? `| সারি: ${cem.rowNumber}` : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 font-tiro">{cem.graveLocation}</span>
                      </td>
                      <td className="py-3 px-4 space-y-1">
                        {graveTypeObj && (
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${graveTypeObj.color}`}
                          >
                            {graveTypeObj.labelBn}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 block font-tiro">{cem.contactPersonName || '—'}</span>
                        {cem.contactPersonPhone && (
                          <a
                            href={`tel:${cem.contactPersonPhone}`}
                            className="text-[11px] font-mono text-blue-600 hover:underline"
                          >
                            {cem.contactPersonPhone}
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700 font-baloo">
                        ৳{(cem.donationAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCemeteryForDetails(cem)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] cursor-pointer"
                          >
                            বিস্তারিত
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCemeteryForPrint(cem);
                              setCemeteryPrintInitialFormat('POS');
                            }}
                            className="p-1 text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                            title="POS রসিদ"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCemeteryForPrint(cem);
                              setCemeteryPrintInitialFormat('A4');
                            }}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title="A4 প্রত্যয়নপত্র"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCemeteryRecord(cem);
                              setIsAddCemeteryOpen(true);
                            }}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
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
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3 font-siliguri">
          <Landmark className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">কোনো দাফন রেকর্ড পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 font-tiro max-w-sm mx-auto">
            আপনার দেওয়া সার্চ বা ফিল্টারের সাথে মিলে এমন কোনো কবরস্থান রেকর্ড পাওয়া যায়নি। নতুন রেকর্ড অন্তর্ভুক্ত করতে নিচের বাটনে ক্লিক করুন।
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingCemeteryRecord(null);
              setIsAddCemeteryOpen(true);
            }}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
          >
            নতুন দাফন রেকর্ড অন্তর্ভুক্ত করুন
          </button>
        </div>
      )}

      {/* Cemetery Management Modals & Drawers */}
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
    </div>
  );
};

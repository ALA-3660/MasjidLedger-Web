import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  Calendar,
  Filter,
  Download,
  Search,
  Crosshair,
  Building,
  CheckCircle2,
  Layers,
  ChevronDown
} from 'lucide-react';
import { CemeteryRecord, Mosque, MosqueProfile } from '../types';
import { Language, formatDate, formatCurrency } from '../lib/i18n';
import { DEFAULT_BLOCKS, GRAVE_TYPES, PLOT_STATUSES } from './CemeteryFormModal';

export type CemeteryReportType =
  | 'TODAY'
  | 'DAY_WISE'
  | 'MONTH_WISE'
  | 'YEAR_WISE'
  | 'DATE_RANGE'
  | 'BLOCK_WISE'
  | 'MASTER_REGISTER';

interface CemeteryReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: CemeteryRecord[];
  mosque?: Mosque | MosqueProfile | null;
  language?: Language;
}

export const CemeteryReportsModal: React.FC<CemeteryReportsModalProps> = ({
  isOpen,
  onClose,
  records = [],
  mosque,
  language = 'bn',
}) => {
  const [reportType, setReportType] = useState<CemeteryReportType>('MASTER_REGISTER');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [startDate, setStartDate] = useState<string>(
    `${new Date().getFullYear()}-01-01`
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [includeLetterhead, setIncludeLetterhead] = useState(true);

  if (!isOpen) return null;

  // Filter records based on selected report criteria
  const filteredRecords = useMemo(() => {
    let list = [...records];

    // Exclude archived by default unless status is ALL or ARCHIVED
    if (selectedStatus === 'ARCHIVED') {
      list = list.filter((r) => r.isArchived || r.plotStatus === 'ARCHIVED');
    } else if (selectedStatus !== 'ALL') {
      list = list.filter((r) => r.plotStatus === selectedStatus && !r.isArchived);
    }

    // Block Filter
    if (selectedBlock !== 'ALL') {
      list = list.filter((r) => (r.block || 'Block-A') === selectedBlock);
    }

    // Report Type Filter
    const todayStr = new Date().toISOString().split('T')[0];

    switch (reportType) {
      case 'TODAY':
        list = list.filter((r) => r.burialDate === todayStr);
        break;
      case 'DAY_WISE':
        if (selectedDate) {
          list = list.filter((r) => r.burialDate === selectedDate);
        }
        break;
      case 'MONTH_WISE':
        if (selectedMonth) {
          list = list.filter((r) => r.burialDate?.startsWith(selectedMonth));
        }
        break;
      case 'YEAR_WISE':
        if (selectedYear) {
          list = list.filter((r) => r.burialDate?.startsWith(selectedYear));
        }
        break;
      case 'DATE_RANGE':
        if (startDate) {
          list = list.filter((r) => (r.burialDate || '') >= startDate);
        }
        if (endDate) {
          list = list.filter((r) => (r.burialDate || '') <= endDate);
        }
        break;
      case 'BLOCK_WISE':
        // Block is already filtered above, but prioritize block grouping
        break;
      case 'MASTER_REGISTER':
      default:
        // All active/archived based on status
        break;
    }

    // Text search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.deceasedName?.toLowerCase().includes(q) ||
          r.plotNumber?.toLowerCase().includes(q) ||
          r.recordNumber?.toLowerCase().includes(q) ||
          r.contactPersonName?.toLowerCase().includes(q) ||
          r.contactPersonPhone?.includes(q) ||
          r.fatherOrSpouseName?.toLowerCase().includes(q) ||
          r.block?.toLowerCase().includes(q)
      );
    }

    // Sort by burial date descending, then record number
    return list.sort((a, b) => (b.burialDate || '').localeCompare(a.burialDate || ''));
  }, [records, reportType, selectedDate, selectedMonth, selectedYear, startDate, endDate, selectedBlock, selectedStatus, searchQuery]);

  // Statistics for this filtered report
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const male = filteredRecords.filter((r) => r.gender === 'MALE').length;
    const female = filteredRecords.filter((r) => r.gender === 'FEMALE').length;
    const permanent = filteredRecords.filter((r) => r.graveType === 'PERMANENT').length;
    const totalFees = filteredRecords.reduce((acc, r) => acc + (r.burialFee || 0) + (r.maintenanceFee || 0), 0);

    return { total, male, female, permanent, totalFees };
  }, [filteredRecords]);

  const getReportTitle = () => {
    switch (reportType) {
      case 'TODAY':
        return `আজকের দাফন রেজিস্ট্রি ও বিবরণী (${formatDate(new Date().toISOString().split('T')[0])})`;
      case 'DAY_WISE':
        return `নির্দিষ্ট দিনের দাফন রেজিস্ট্রি (${formatDate(selectedDate)})`;
      case 'MONTH_WISE':
        return `মাসিক দাফন রেজিস্টার বিবরণী (${selectedMonth})`;
      case 'YEAR_WISE':
        return `বার্ষিক দাফন রেজিস্টার ও পরিসংখ্যান (${selectedYear} সাল)`;
      case 'DATE_RANGE':
        return `দাফন রেজিস্ট্রি রিপোর্ট (${formatDate(startDate)} হতে ${formatDate(endDate)})`;
      case 'BLOCK_WISE':
        return `ব্লকভিত্তিক দাফন ও প্লট রিপোর্ট (${selectedBlock === 'ALL' ? 'সকল ব্লক' : selectedBlock})`;
      case 'MASTER_REGISTER':
      default:
        return 'ওয়াকফ কবরস্থান মাস্টার রেজিস্টার (Master Burial Register)';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = [
      'Record Number',
      'Plot Number',
      'Block',
      'Row',
      'Deceased Name',
      'Father/Spouse',
      'Gender',
      'Age',
      'Burial Date',
      'Burial Time',
      'Grave Type',
      'Status',
      'Heir Name',
      'Heir Phone',
      'Heir Address',
      'Notes',
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.recordNumber || ''}"`,
      `"${r.plotNumber || ''}"`,
      `"${r.block || ''}"`,
      `"${r.row || ''}"`,
      `"${r.deceasedName || ''}"`,
      `"${r.fatherOrSpouseName || ''}"`,
      `"${r.gender || ''}"`,
      `"${r.ageAtDeath || ''}"`,
      `"${r.burialDate || ''}"`,
      `"${r.burialTime || ''}"`,
      `"${r.graveType || ''}"`,
      `"${r.plotStatus || ''}"`,
      `"${r.contactPersonName || ''}"`,
      `"${r.contactPersonPhone || ''}"`,
      `"${(r.heirAddress || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cemetery_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Controls Header (HIDDEN in Print) */}
        <div className="no-print px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-xl border border-blue-400/40">
              <FileText className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                কবরস্থান রিপোর্ট ও রেজিস্ট্রি প্রিন্ট হাব (Cemetery Reports Center)
              </h3>
              <p className="text-xs text-slate-300">
                দৈনিক, মাসিক, বার্ষিক, ব্লকভিত্তিক ও মাস্টার রেজিস্টার প্রিন্ট এবং ডাউনলোড
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar (HIDDEN in Print) */}
        <div className="no-print bg-slate-100 p-4 border-b border-slate-200 space-y-3 text-xs shrink-0">
          {/* Top Controls Row: Report Type Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
            {[
              { id: 'MASTER_REGISTER', label: 'মাস্টার রেজিস্টার' },
              { id: 'TODAY', label: 'আজকের দাফন' },
              { id: 'DAY_WISE', label: 'নির্দিষ্ট দিন' },
              { id: 'MONTH_WISE', label: 'মাসিক রেজিস্টার' },
              { id: 'YEAR_WISE', label: 'বার্ষিক রেজিস্টার' },
              { id: 'DATE_RANGE', label: 'তারিখ পরিসীমা' },
              { id: 'BLOCK_WISE', label: 'ব্লকভিত্তিক রিপোর্ট' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReportType(t.id as any)}
                className={`px-2.5 py-2 rounded-xl font-bold transition-all text-center truncate ${
                  reportType === t.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Dynamic Date and Context Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {reportType === 'DAY_WISE' && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
                <span className="font-bold text-slate-700">তারিখ:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="font-bold text-slate-900 focus:outline-none"
                />
              </div>
            )}

            {reportType === 'MONTH_WISE' && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
                <span className="font-bold text-slate-700">মাস:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="font-bold text-slate-900 focus:outline-none"
                />
              </div>
            )}

            {reportType === 'YEAR_WISE' && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
                <span className="font-bold text-slate-700">বছর:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="font-bold text-slate-900 focus:outline-none bg-transparent"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={String(y)}>
                      {y} সাল
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'DATE_RANGE' && (
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
                <span className="font-bold text-slate-700">হতে:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="font-bold text-slate-900 focus:outline-none"
                />
                <span className="font-bold text-slate-700">পর্যন্ত:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="font-bold text-slate-900 focus:outline-none"
                />
              </div>
            )}

            {/* Block Filter */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
              <span className="font-bold text-slate-700">ব্লক:</span>
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="font-bold text-slate-900 focus:outline-none bg-transparent"
              >
                <option value="ALL">সকল ব্লক (All Blocks)</option>
                {DEFAULT_BLOCKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
              <span className="font-bold text-slate-700">স্ট্যাটাস:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="font-bold text-slate-900 focus:outline-none bg-transparent"
              >
                <option value="ALL">সকল স্ট্যাটাস</option>
                {PLOT_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.labelBn}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="মরহুমের নাম, প্লট বা ফোন নম্বর দিয়ে খুঁজুন..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Bottom Controls Row: Orientation, Letterhead, Export, Print */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    orientation === 'portrait' ? 'bg-slate-900 text-white' : 'text-slate-700'
                  }`}
                >
                  Portrait (লম্বালম্বি)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    orientation === 'landscape' ? 'bg-slate-900 text-white' : 'text-slate-700'
                  }`}
                >
                  Landscape (আড়াআড়ি)
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLetterhead}
                  onChange={(e) => setIncludeLetterhead(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 border-slate-300"
                />
                <span className="font-bold text-slate-800">অফিসিয়াল লেটারহেড সহ প্রিন্ট</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV ডাউনলোড</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>রিপোর্ট প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Document Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
          <div
            id="cemetery-print-document"
            className={`w-full bg-white p-6 sm:p-10 shadow-xl border border-slate-300 rounded-sm text-slate-900 flex flex-col justify-between ${
              orientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'
            }`}
            style={{ fontFamily: "'Noto Serif Bengali', 'SolaimanLipi', serif" }}
          >
            <div>
              {/* Islamic Bismillah */}
              <div className="text-center pb-2">
                <span className="text-base text-slate-800 font-serif font-bold tracking-wider">
                  بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
                </span>
              </div>

              {/* Letterhead */}
              {includeLetterhead ? (
                <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-wide">
                    {mosque?.name || 'বায়তুল আমান কেন্দ্রীয় জামে মসজিদ ও কমপ্লেক্স'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {mosque?.address || 'মিরপুর-২, ঢাকা-১২১৬'}
                    {mosque?.phone ? ` | ফোন: ${mosque.phone}` : ''}
                  </p>
                  <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full text-xs font-bold text-slate-800">
                    {getReportTitle()}
                  </div>
                </div>
              ) : (
                <div className="h-12 border-b border-dashed border-slate-300 mb-4 flex items-center justify-between text-xs text-slate-400">
                  <span>[প্রি-প্রিন্টেড প্যাডের জন্য ফাঁকা স্থান]</span>
                  <span className="font-bold text-slate-800">{getReportTitle()}</span>
                </div>
              )}

              {/* KPI Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">মোট রেকর্ড:</span>
                  <span className="font-bold text-slate-900 text-sm">{stats.total} টি</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">পুরুষ:</span>
                  <span className="font-bold text-blue-800 text-sm">{stats.male} জন</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">মহিলা:</span>
                  <span className="font-bold text-purple-800 text-sm">{stats.female} জন</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">স্থায়ী কবর:</span>
                  <span className="font-bold text-emerald-800 text-sm">{stats.permanent} টি</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">প্রিন্ট তারিখ:</span>
                  <span className="font-mono text-slate-800 text-xs">{new Date().toLocaleDateString('bn-BD')}</span>
                </div>
              </div>

              {/* Data Table */}
              {filteredRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl my-4">
                  নির্বাচিত মানদণ্ড অনুযায়ী কোনো দাফন রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-400 font-bold">
                        <th className="p-2 border-r border-slate-300 text-center w-10">ক্রমিক</th>
                        <th className="p-2 border-r border-slate-300 text-left">রেকর্ড / প্লট নং</th>
                        <th className="p-2 border-r border-slate-300 text-left">মরহুমের পূর্ণ নাম</th>
                        <th className="p-2 border-r border-slate-300 text-left">পিতা / স্বামী</th>
                        <th className="p-2 border-r border-slate-300 text-center">বয়স ও লিঙ্গ</th>
                        <th className="p-2 border-r border-slate-300 text-center">দাফনের তারিখ ও সময়</th>
                        <th className="p-2 border-r border-slate-300 text-left">ব্লক ও অবস্থান</th>
                        <th className="p-2 border-r border-slate-300 text-left">ওয়ারিশ ও মোবাইল</th>
                        <th className="p-2 text-center">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((rec, index) => {
                        const statusObj = PLOT_STATUSES.find((s) => s.id === rec.plotStatus);
                        return (
                          <tr key={rec.id || index} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-600">
                              {index + 1}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <div className="font-mono font-bold text-blue-900">{rec.plotNumber}</div>
                              {rec.recordNumber && (
                                <div className="font-mono text-[10px] text-slate-500">{rec.recordNumber}</div>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                              {rec.deceasedName}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-700">
                              {rec.fatherOrSpouseName || rec.fatherName || '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center">
                              <div>{rec.gender === 'FEMALE' ? 'মহিলা' : 'পুরুষ'}</div>
                              <div className="text-[10px] text-slate-500">{rec.ageAtDeath || '-'}</div>
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center">
                              <div className="font-bold">{formatDate(rec.burialDate)}</div>
                              <div className="text-[10px] text-slate-500">{rec.burialTime || 'বাদ আসর'}</div>
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <div className="font-bold text-slate-800">{rec.block || 'Block-A'}</div>
                              <div className="text-[10px] text-slate-500">{rec.row ? `${rec.row}, ` : ''}{rec.graveLocation}</div>
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <div className="font-bold text-slate-900">{rec.contactPersonName || '-'}</div>
                              <div className="font-mono text-[10px] text-blue-700">{rec.contactPersonPhone || '-'}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300">
                                {statusObj?.labelBn || rec.plotStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Official Signatures */}
            <div className="pt-12 mt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="border-t border-slate-800 w-36 mx-auto pt-1 font-bold text-slate-900">
                  প্রস্তুতকারী (সহকারী)
                </div>
                <span className="text-[10px] text-slate-500">স্বাক্ষর ও তারিখ</span>
              </div>
              <div>
                <div className="border-t border-slate-800 w-36 mx-auto pt-1 font-bold text-slate-900">
                  কবরস্থান তত্ত্বাবধায়ক
                </div>
                <span className="text-[10px] text-slate-500">স্বাক্ষর ও সিল</span>
              </div>
              <div>
                <div className="border-t border-slate-800 w-36 mx-auto pt-1 font-bold text-slate-900">
                  সাধারণ সম্পাদক / সভাপতি
                </div>
                <span className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

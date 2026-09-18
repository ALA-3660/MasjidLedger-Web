import React from 'react';
import { Calendar, Filter, RotateCcw, Printer, FileText, Download, Clock } from 'lucide-react';
import { DateFilterState, ReportDateFilterMode, QuickDateFilter } from '../lib/reportingEngine';

interface ReportFilterBarProps {
  filterState: DateFilterState;
  onFilterChange: (newState: DateFilterState) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  headFilter?: string;
  onHeadFilterChange?: (headId: string) => void;
  accountFilter?: string;
  onAccountFilterChange?: (accId: string) => void;
  headsList?: { id: string; nameBn: string }[];
  accountsList?: { id: string; nameBn: string }[];
  onPrint?: () => void;
  onPdf?: () => void;
  onExcel?: () => void;
  totalRecordsCount?: number;
  totalAmountSum?: number;
  labelPrefix?: string;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filterState,
  onFilterChange,
  statusFilter,
  onStatusFilterChange,
  headFilter,
  onHeadFilterChange,
  accountFilter,
  onAccountFilterChange,
  headsList = [],
  accountsList = [],
  onPrint,
  onPdf,
  onExcel,
  totalRecordsCount,
  totalAmountSum,
  labelPrefix = 'মোট',
}) => {
  const setMode = (mode: ReportDateFilterMode) => {
    onFilterChange({ ...filterState, mode });
  };

  const setQuick = (quickFilter: QuickDateFilter) => {
    onFilterChange({ ...filterState, mode: 'QUICK', quickFilter });
  };

  const handleReset = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.slice(0, 7);
    const yearStr = todayStr.slice(0, 4);

    onFilterChange({
      mode: 'DATE_RANGE',
      quickFilter: 'THIS_MONTH',
      startDate: `${monthStr}-01`,
      endDate: todayStr,
      startMonth: monthStr,
      endMonth: monthStr,
      startYear: yearStr,
      endYear: yearStr,
    });
    if (onStatusFilterChange) onStatusFilterChange('ALL');
    if (onHeadFilterChange) onHeadFilterChange('ALL');
    if (onAccountFilterChange) onAccountFilterChange('ALL');
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      {/* Top Filter Mode Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
          <button
            type="button"
            onClick={() => setMode('DATE_RANGE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterState.mode === 'DATE_RANGE' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            তারিখ থেকে তারিখ (Date)
          </button>
          <button
            type="button"
            onClick={() => setMode('MONTH_RANGE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterState.mode === 'MONTH_RANGE' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            মাস থেকে মাস (Month)
          </button>
          <button
            type="button"
            onClick={() => setMode('YEAR_RANGE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterState.mode === 'YEAR_RANGE' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            বছর থেকে বছর (Year)
          </button>
          <button
            type="button"
            onClick={() => setMode('QUICK')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterState.mode === 'QUICK' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            কুইক ফিল্টার (Quick)
          </button>
        </div>

        {/* Quick Action Export & Print buttons */}
        <div className="flex items-center space-x-2">
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
              title="A4 প্রিন্ট প্রিভিউ"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>🖨️ প্রিন্ট (Print)</span>
            </button>
          )}

          {onPdf && (
            <button
              type="button"
              onClick={onPdf}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
              title="PDF ডাউনলোড / ভিউ"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 PDF</span>
            </button>
          )}

          {onExcel && (
            <button
              type="button"
              onClick={onExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
              title="Excel (.xlsx) এক্সপোর্ট"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📊 Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            title="ফিল্টার রিসেট করুন"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Inputs Strip */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Mode Inputs */}
        {filterState.mode === 'DATE_RANGE' && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">তারিখ হতে:</span>
            <input
              type="date"
              value={filterState.startDate}
              onChange={(e) => onFilterChange({ ...filterState, startDate: e.target.value })}
              className="bg-transparent text-slate-900 font-bold outline-hidden cursor-pointer"
            />
            <span className="text-slate-400">—</span>
            <span className="text-slate-500 font-medium">পর্যন্ত:</span>
            <input
              type="date"
              value={filterState.endDate}
              onChange={(e) => onFilterChange({ ...filterState, endDate: e.target.value })}
              className="bg-transparent text-slate-900 font-bold outline-hidden cursor-pointer"
            />
          </div>
        )}

        {/* Month Range Mode Inputs */}
        {filterState.mode === 'MONTH_RANGE' && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">শুরু মাস:</span>
            <input
              type="month"
              value={filterState.startMonth}
              onChange={(e) => onFilterChange({ ...filterState, startMonth: e.target.value })}
              className="bg-transparent text-slate-900 font-bold outline-hidden cursor-pointer"
            />
            <span className="text-slate-400">—</span>
            <span className="text-slate-500 font-medium">শেষ মাস:</span>
            <input
              type="month"
              value={filterState.endMonth}
              onChange={(e) => onFilterChange({ ...filterState, endMonth: e.target.value })}
              className="bg-transparent text-slate-900 font-bold outline-hidden cursor-pointer"
            />
          </div>
        )}

        {/* Year Range Mode Inputs */}
        {filterState.mode === 'YEAR_RANGE' && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">শুরু বছর:</span>
            <select
              value={filterState.startYear}
              onChange={(e) => onFilterChange({ ...filterState, startYear: e.target.value })}
              className="bg-transparent text-slate-900 font-bold outline-hidden cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <span className="text-slate-400">—</span>
            <span className="text-slate-500 font-medium">শেষ বছর:</span>
            <select
              value={filterState.endYear}
              onChange={(e) => onFilterChange({ ...filterState, endYear: e.target.value })}
              className="bg-transparent text-slate-900 font-bold outline-hidden cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Filter Buttons */}
        {filterState.mode === 'QUICK' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'TODAY' as QuickDateFilter, label: 'আজ' },
              { id: 'YESTERDAY' as QuickDateFilter, label: 'গতকাল' },
              { id: 'THIS_WEEK' as QuickDateFilter, label: 'চলতি সপ্তাহ' },
              { id: 'LAST_WEEK' as QuickDateFilter, label: 'গত সপ্তাহ' },
              { id: 'THIS_MONTH' as QuickDateFilter, label: 'চলতি মাস' },
              { id: 'LAST_MONTH' as QuickDateFilter, label: 'গত মাস' },
              { id: 'THIS_YEAR' as QuickDateFilter, label: 'চলতি বছর' },
              { id: 'ALL' as QuickDateFilter, label: 'সকল সময়' },
            ].map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuick(q.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterState.quickFilter === q.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {/* Optional Account Head Filter */}
        {onHeadFilterChange && headsList.length > 0 && (
          <select
            value={headFilter || 'ALL'}
            onChange={(e) => onHeadFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="ALL">সকল খাত (All Heads)</option>
            {headsList.map((h) => (
              <option key={h.id} value={h.id}>{h.nameBn}</option>
            ))}
          </select>
        )}

        {/* Optional Account Filter */}
        {onAccountFilterChange && accountsList.length > 0 && (
          <select
            value={accountFilter || 'ALL'}
            onChange={(e) => onAccountFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="ALL">সকল হিসাব (All Accounts)</option>
            {accountsList.map((a) => (
              <option key={a.id} value={a.id}>{a.nameBn}</option>
            ))}
          </select>
        )}

        {/* Optional Status Filter */}
        {onStatusFilterChange && (
          <select
            value={statusFilter || 'ALL'}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="ALL">সকল অবস্থা (All Status)</option>
            <option value="APPROVED">অনুমোদিত (APPROVED)</option>
            <option value="CANCELLED">বাতিলকৃত (CANCELLED)</option>
          </select>
        )}

        {/* Live Filter Indicator Badge */}
        {typeof totalRecordsCount === 'number' && (
          <div className="ml-auto text-xs font-mono font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center space-x-2">
            <span>রেকর্ড: <strong>{totalRecordsCount}</strong> টি</span>
            {typeof totalAmountSum === 'number' && (
              <>
                <span className="text-slate-300">|</span>
                <span>{labelPrefix}: <strong className="text-slate-900 font-mono">৳ {totalAmountSum.toLocaleString('en-IN')}</strong></span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

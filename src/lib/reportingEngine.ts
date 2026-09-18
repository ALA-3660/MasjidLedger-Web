import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from './i18n';
import { Mosque } from '../types';

export type ReportDateFilterMode = 'DATE_RANGE' | 'MONTH_RANGE' | 'YEAR_RANGE' | 'QUICK';

export type QuickDateFilter =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'LAST_YEAR';

export interface DateFilterState {
  mode: ReportDateFilterMode;
  quickFilter: QuickDateFilter;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startMonth: string; // YYYY-MM
  endMonth: string;   // YYYY-MM
  startYear: string;  // YYYY
  endYear: string;    // YYYY
}

export const getDefaultDateFilterState = (): DateFilterState => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const currentYearStr = todayStr.slice(0, 4);

  // Default to first day of current month to today
  const firstDayOfMonth = `${currentMonthStr}-01`;

  return {
    mode: 'DATE_RANGE',
    quickFilter: 'THIS_MONTH',
    startDate: firstDayOfMonth,
    endDate: todayStr,
    startMonth: currentMonthStr,
    endMonth: currentMonthStr,
    startYear: currentYearStr,
    endYear: currentYearStr,
  };
};

/**
 * Resolves the effective [startDate, endDate] (inclusive, YYYY-MM-DD) based on filter state.
 */
export const resolveEffectiveDates = (state: DateFilterState): { startDate: string; endDate: string; labelBn: string } => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (state.mode === 'QUICK') {
    switch (state.quickFilter) {
      case 'TODAY': {
        return { startDate: todayStr, endDate: todayStr, labelBn: `আজ (${formatDate(todayStr)})` };
      }
      case 'YESTERDAY': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        return { startDate: yStr, endDate: yStr, labelBn: `গতকাল (${formatDate(yStr)})` };
      }
      case 'THIS_WEEK': {
        const day = now.getDay();
        // Saturday is index 6 in JS or let's say week starts Saturday in BD (Saturday to Friday)
        const diffToSat = (day + 1) % 7;
        const sat = new Date(now);
        sat.setDate(sat.getDate() - diffToSat);
        const satStr = sat.toISOString().split('T')[0];
        return { startDate: satStr, endDate: todayStr, labelBn: 'চলতি সপ্তাহ' };
      }
      case 'LAST_WEEK': {
        const day = now.getDay();
        const diffToSat = (day + 1) % 7;
        const lastSat = new Date(now);
        lastSat.setDate(lastSat.getDate() - diffToSat - 7);
        const lastFri = new Date(lastSat);
        lastFri.setDate(lastFri.getDate() + 6);
        return {
          startDate: lastSat.toISOString().split('T')[0],
          endDate: lastFri.toISOString().split('T')[0],
          labelBn: 'গত সপ্তাহ',
        };
      }
      case 'THIS_MONTH': {
        const start = `${todayStr.slice(0, 7)}-01`;
        return { startDate: start, endDate: todayStr, labelBn: 'চলতি মাস' };
      }
      case 'LAST_MONTH': {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = prevMonthDate.getFullYear();
        const m = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(y, prevMonthDate.getMonth() + 1, 0).getDate();
        const start = `${y}-${m}-01`;
        const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
        return { startDate: start, endDate: end, labelBn: 'গত মাস' };
      }
      case 'THIS_YEAR': {
        const start = `${now.getFullYear()}-01-01`;
        return { startDate: start, endDate: todayStr, labelBn: 'চলতি বছর' };
      }
      case 'LAST_YEAR': {
        const prevYear = now.getFullYear() - 1;
        return { startDate: `${prevYear}-01-01`, endDate: `${prevYear}-12-31`, labelBn: 'গত বছর' };
      }
      case 'ALL':
      default:
        return { startDate: '1970-01-01', endDate: '2099-12-31', labelBn: 'সকল সময়' };
    }
  }

  if (state.mode === 'MONTH_RANGE') {
    const sMonth = state.startMonth || todayStr.slice(0, 7);
    const eMonth = state.endMonth || sMonth;
    const [ey, em] = eMonth.split('-').map(Number);
    const lastDay = new Date(ey, em, 0).getDate();
    const start = `${sMonth}-01`;
    const end = `${eMonth}-${String(lastDay).padStart(2, '0')}`;
    return {
      startDate: start,
      endDate: end,
      labelBn: `${formatDate(start)} হতে ${formatDate(end)} পর্যন্ত (মাসভিত্তিক)`,
    };
  }

  if (state.mode === 'YEAR_RANGE') {
    const sYear = state.startYear || String(now.getFullYear());
    const eYear = state.endYear || sYear;
    const start = `${sYear}-01-01`;
    const end = `${eYear}-12-31`;
    return {
      startDate: start,
      endDate: end,
      labelBn: `${sYear} হতে ${eYear} পর্যন্ত (বছরভিত্তিক)`,
    };
  }

  // Default DATE_RANGE
  const sDate = state.startDate || '1970-01-01';
  const eDate = state.endDate || todayStr;
  return {
    startDate: sDate,
    endDate: eDate,
    labelBn: `${formatDate(sDate)} হতে ${formatDate(eDate)} পর্যন্ত`,
  };
};

/**
 * Filter an array of items with a `date` property (YYYY-MM-DD) by date range.
 */
export const filterByDateRange = <T extends { date?: string }>(
  items: T[],
  startDate: string,
  endDate: string
): T[] => {
  return items.filter((item) => {
    if (!item.date) return false;
    const d = item.date.slice(0, 10);
    return d >= startDate && d <= endDate;
  });
};

/**
 * Export records to genuine Excel workbook (.xlsx)
 */
export interface ExcelColumnDef<T> {
  header: string;
  accessor: (item: T, index: number) => string | number;
}

export const exportToXlsx = <T>(options: {
  filename: string;
  sheetName: string;
  mosqueName: string;
  reportTitle: string;
  periodLabel: string;
  columns: ExcelColumnDef<T>[];
  data: T[];
  summaryRows?: { label: string; value: string | number }[];
}) => {
  const { filename, sheetName, mosqueName, reportTitle, periodLabel, columns, data, summaryRows } = options;

  const aoa: any[][] = [];

  // Header rows
  aoa.push([mosqueName]);
  aoa.push(['MasjidLedger Pro — ' + reportTitle]);
  aoa.push(['সময়সীমা: ' + periodLabel]);
  aoa.push(['রিপোর্ট তৈরির তারিখ: ' + new Date().toLocaleString('bn-BD')]);
  aoa.push([]); // blank row

  // Table Column Headers
  aoa.push(['ক্রঃ নং', ...columns.map((c) => c.header)]);

  // Data rows
  data.forEach((item, idx) => {
    const row = [idx + 1, ...columns.map((c) => c.accessor(item, idx))];
    aoa.push(row);
  });

  // Summary rows if any
  if (summaryRows && summaryRows.length > 0) {
    aoa.push([]); // blank
    aoa.push(['--- সারাংশ / মোট বিবরণ ---']);
    summaryRows.forEach((s) => {
      aoa.push([s.label, s.value]);
    });
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  const colWidths = [{ wch: 8 }, ...columns.map((c) => ({ wch: Math.max(c.header.length * 2, 16) }))];
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Trigger download
  const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, fullFilename);
};

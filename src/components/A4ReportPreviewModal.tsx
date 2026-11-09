import React, { useState } from 'react';
import { Printer, Download, X, Building, FileSpreadsheet, FileText } from 'lucide-react';
import { Mosque } from '../types';
import { formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';
import { OfficialReportSignatures } from './common/OfficialReportSignatures';
import { PrintSettingsBar } from './common/PrintSettingsBar';

export interface ReportColumn<T> {
  header: string;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
  accessor?: (item: T, index: number) => React.ReactNode;
}

interface A4ReportPreviewModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportSubtitle?: string;
  periodLabel: string;
  currentMosque?: Mosque | null;
  columns: ReportColumn<T>[];
  data: T[];
  summaryMetrics?: { label: string; value: string | number; color?: string }[];
  summaryRows?: { label: string; value: string | number; color?: string }[];
  totalRow?: React.ReactNode;
  onExcel?: () => void;
}

export function A4ReportPreviewModal<T>({
  isOpen,
  onClose,
  reportTitle,
  reportSubtitle,
  periodLabel,
  currentMosque,
  columns,
  data,
  summaryMetrics = [],
  summaryRows = [],
  totalRow,
  onExcel,
}: A4ReportPreviewModalProps<T>) {
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  if (!isOpen) return null;

  const effectiveMetrics = summaryMetrics.length > 0 ? summaryMetrics : summaryRows;

  const printableElementId = 'a4-universal-report-printable';

  const handlePrint = () => {
    printElement(printableElementId, {
      title: reportTitle.replace(/\s+/g, '_'),
      pageSize: 'A4',
      pageOrientation: orientation,
      margin: '8mm 10mm',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 report-modal-print-wrapper print:static print:inset-auto print:p-0 print:m-0 print:w-full print:h-auto print:bg-white print:overflow-visible print:block print:z-auto font-sans">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] report-modal-print-card print:static print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0">
        {/* Top Controls Toolbar using PrintSettingsBar */}
        <div className="p-3 bg-slate-900 text-white print:hidden print-controls-bar border-b border-slate-800">
          <PrintSettingsBar
            includeLetterhead={includeLetterhead}
            onToggleLetterhead={setIncludeLetterhead}
            orientation={orientation}
            onChangeOrientation={setOrientation}
            onPrint={handlePrint}
            onExcel={onExcel}
            onClose={onClose}
            title={reportTitle}
            subtitle={reportSubtitle}
          />
        </div>

        {/* Document Body (Printable Area) */}
        <div
          id={printableElementId}
          className="printable-content p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-5 font-sans report-modal-print-body print:p-0 print:m-0 print:overflow-visible print:h-auto print:max-h-none print:block print:shadow-none"
        >
          {/* Dynamic Letterhead vs Minimal Header */}
          {includeLetterhead ? (
            <div className="break-inside-avoid">
              <MosqueOfficialLetterhead
                mosque={currentMosque}
                documentTitle={reportTitle}
                subTitle={reportSubtitle}
                periodLabel={periodLabel}
                dateStr={formatDate(new Date().toISOString())}
              />
            </div>
          ) : (
            <div className="border border-slate-300 bg-slate-50 p-3.5 rounded-lg break-inside-avoid">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 font-siliguri">
                    {reportTitle}
                  </h1>
                  {reportSubtitle && (
                    <p className="text-xs text-slate-600 font-medium mt-0.5">{reportSubtitle}</p>
                  )}
                </div>
                <div className="text-right text-xs font-mono">
                  <div className="text-slate-600">তারিখ: {formatDate(new Date().toISOString())}</div>
                  <div className="text-slate-500 text-[11px]">মোট রেকর্ড: {data.length} টি</div>
                </div>
              </div>
              <div className="pt-2 text-xs font-semibold text-slate-800">
                সময়সীমা: <span className="font-bold text-slate-950">{periodLabel}</span>
              </div>
            </div>
          )}

          {/* Summary Metric Strip */}
          {effectiveMetrics.length > 0 && (
            <div className={`grid grid-cols-${Math.min(effectiveMetrics.length, 4)} gap-2 text-center text-xs`}>
              {effectiveMetrics.map((m, idx) => (
                <div key={idx} className="border border-slate-300 p-2 bg-slate-50">
                  <div className="text-[10px] text-slate-600 font-semibold">{m.label}</div>
                  <div className={`font-bold font-mono text-slate-900 mt-0.5 ${m.color || ''}`}>
                    {typeof m.value === 'number' ? `৳ ${m.value.toLocaleString('en-IN')}` : m.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Records Table */}
          <div className="border border-slate-300 overflow-hidden">
            <table className="w-full text-xs text-left border-collapse print-report-table">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 text-center w-10 border-r border-slate-200 whitespace-nowrap">ক্রঃ</th>
                  {columns.map((col, idx) => {
                    const isAmount =
                      col.header.includes('(৳)') ||
                      col.header.includes('পরিমাণ') ||
                      col.header.includes('টাকা') ||
                      col.header.includes('মোট ব্যয়') ||
                      col.header.includes('মোট পরিশোধ') ||
                      col.header.includes('মোট আয়') ||
                      col.header.includes('জমা') ||
                      col.header.includes('খরচ') ||
                      col.header.includes('স্থিতি') ||
                      col.header.includes('জের') ||
                      Boolean(col.className?.includes('text-right'));

                    const isDesc = col.header.includes('বিবরণ') || col.header.includes('Description');

                    return (
                      <th
                        key={idx}
                        className={`px-3 py-2 border-r border-slate-200 last:border-r-0 ${col.className || ''} ${
                          isAmount
                            ? 'text-right font-bold whitespace-nowrap min-w-[105px] w-28 print-amount-cell'
                            : isDesc
                            ? 'max-w-[155px] w-40 print-desc-cell'
                            : ''
                        }`}
                        style={
                          isAmount
                            ? { whiteSpace: 'nowrap', minWidth: '105px', width: '110px', textAlign: 'right' }
                            : isDesc
                            ? { maxWidth: '155px' }
                            : undefined
                        }
                      >
                        {col.header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-500">
                      নির্বাচিত সময়সীমায় কোনো তথ্য পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="px-3 py-2 text-center text-slate-500 font-mono border-r border-slate-200 whitespace-nowrap">
                        {idx + 1}
                      </td>
                      {columns.map((col, colIdx) => {
                        const isAmount =
                          col.header.includes('(৳)') ||
                          col.header.includes('পরিমাণ') ||
                          col.header.includes('টাকা') ||
                          col.header.includes('মোট ব্যয়') ||
                          col.header.includes('মোট পরিশোধ') ||
                          col.header.includes('মোট আয়') ||
                          col.header.includes('জমা') ||
                          col.header.includes('খরচ') ||
                          col.header.includes('স্থিতি') ||
                          col.header.includes('জের') ||
                          Boolean(col.className?.includes('text-right'));

                        const isDesc = col.header.includes('বিবরণ') || col.header.includes('Description');

                        let cellValue = col.render ? col.render(item, idx) : col.accessor ? col.accessor(item, idx) : (item as any)[col.header];

                        // Remove redundant ৳ symbol when (৳) is already present in column header
                        if (isAmount && typeof cellValue === 'string' && cellValue.includes('৳')) {
                          cellValue = cellValue.replace(/^[+-]?\s*৳\s*/, (m) => m.includes('-') ? '- ' : m.includes('+') ? '+ ' : '').replace(/৳\s*/g, '');
                        }

                        return (
                          <td
                            key={colIdx}
                            className={`px-3 py-2 border-r border-slate-200 last:border-r-0 ${col.className || ''} ${
                              isAmount
                                ? 'text-right font-mono font-bold whitespace-nowrap min-w-[105px] w-28 print-amount-cell'
                                : isDesc
                                ? 'text-slate-700 max-w-[155px] text-[11px] leading-snug break-words print-desc-cell'
                                : ''
                            }`}
                            style={
                              isAmount
                                ? { whiteSpace: 'nowrap', minWidth: '105px', width: '110px', textAlign: 'right' }
                                : isDesc
                                ? { maxWidth: '155px' }
                                : undefined
                            }
                          >
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              {totalRow && (
                <tbody className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 break-inside-avoid">
                  {totalRow}
                </tbody>
              )}
            </table>
          </div>

          {/* Official Signatures Section with President & General Secretary / Mutawalli signatures */}
          <OfficialReportSignatures
            currentMosque={currentMosque}
            preparerTitle="হিসাবরক্ষক / প্রস্তুতকারী"
            secretaryTitle="সাধারণ সম্পাদক / মোতাওয়াল্লী"
            presidentTitle="সভাপতি"
            showAuditFooter={true}
            auditFooterText="মসজিদ লেজার • অফিসিয়াল আর্থিক প্রতিবেদন ও অডিট খতিয়ান"
          />
        </div>
      </div>
    </div>
  );
}

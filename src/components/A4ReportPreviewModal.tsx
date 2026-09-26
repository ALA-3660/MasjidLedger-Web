import React, { useState } from 'react';
import { Printer, Download, X, Building, FileSpreadsheet, FileText } from 'lucide-react';
import { Mosque } from '../types';
import { formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';
import { PrintSettingsBar } from './common/PrintSettingsBar';

export interface ReportColumn<T> {
  header: string;
  className?: string;
  render: (item: T, index: number) => React.ReactNode;
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
  totalRow,
  onExcel,
}: A4ReportPreviewModalProps<T>) {
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  if (!isOpen) return null;

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
          {summaryMetrics.length > 0 && (
            <div className={`grid grid-cols-${Math.min(summaryMetrics.length, 4)} gap-2 text-center text-xs`}>
              {summaryMetrics.map((m, idx) => (
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
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 text-center w-10 border-r border-slate-200">ক্রঃ</th>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`px-3 py-2 border-r border-slate-200 last:border-r-0 ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
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
                      <td className="px-3 py-2 text-center text-slate-500 font-mono border-r border-slate-200">
                        {idx + 1}
                      </td>
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className={`px-3 py-2 border-r border-slate-200 last:border-r-0 ${col.className || ''}`}
                        >
                          {col.render(item, idx)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {totalRow && (
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  {totalRow}
                </tfoot>
              )}
            </table>
          </div>

          {/* Official Signatures Section */}
          <div className="pt-10 pb-3 mt-6 border-t border-slate-200 text-xs break-inside-avoid">
            <div className="grid grid-cols-3 gap-8 text-center mb-6">
              <div>
                <div className="border-t border-dashed border-slate-400 pt-1.5 font-bold text-slate-800 font-secondary">
                  প্রস্তুতকারীর স্বাক্ষর
                </div>
                <div className="text-[10px] text-slate-500 font-secondary mt-0.5">হিসাব সহকারী / প্রস্তুতকারক</div>
                <div className="text-[9px] text-slate-400 mt-0.5">তারিখ: .............................</div>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 pt-1.5 font-bold text-slate-800 font-secondary">
                  হিসাব নিরীক্ষক / ক্যাশিয়ার
                </div>
                <div className="text-[10px] text-slate-500 font-secondary mt-0.5">অর্থ সম্পাদক / অডিটর</div>
                <div className="text-[9px] text-slate-400 mt-0.5">তারিখ: .............................</div>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 pt-1.5 font-bold text-slate-800 font-secondary">
                  সভাপতি / সাধারণ সম্পাদক
                </div>
                <div className="text-[10px] text-slate-500 font-secondary mt-0.5">মসজিদ পরিচালনা কমিটি</div>
                <div className="text-[9px] text-slate-400 mt-0.5">তারিখ: .............................</div>
              </div>
            </div>

            {/* Footer Document Audit Note */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-secondary">
              <span>MasjidLedger Pro v2.6 • অফিসিয়াল ব্যয় ও আর্থিক প্রতিবেদন</span>
              <span>প্রস্তুতের সময়: {new Date().toLocaleString('bn-BD')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

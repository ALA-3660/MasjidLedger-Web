import React from 'react';
import { Mosque } from '../../types';
import { MosqueOfficialLetterhead } from './MosqueOfficialLetterhead';
import { getGlobalMosque } from '../../lib/mosqueStore';

export interface SignatureSlot {
  title: string;
  name?: string;
  designation?: string;
  date?: string;
}

export interface PrintableDocumentProps {
  id?: string;
  mosque?: Mosque | null;
  includeLetterhead?: boolean;
  documentTitle?: string;
  subTitle?: string;
  periodLabel?: string;
  refNumber?: string;
  dateStr?: string;
  metaDetails?: Array<{ label: string; value: React.ReactNode }>;
  summaryContent?: React.ReactNode;
  signatures?: SignatureSlot[] | boolean;
  footerNote?: string;
  pageNumber?: string;
  orientation?: 'portrait' | 'landscape';
  className?: string;
  children: React.ReactNode;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  id,
  mosque: propMosque,
  includeLetterhead = true,
  documentTitle,
  subTitle,
  periodLabel,
  refNumber,
  dateStr,
  metaDetails,
  summaryContent,
  signatures = false,
  footerNote,
  pageNumber,
  orientation = 'portrait',
  className = '',
  children,
}) => {
  const mosque = propMosque || getGlobalMosque();
  const todayFormatted = new Date().toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Default signatures when signatures is true
  const defaultSignatures: SignatureSlot[] = [
    { title: 'প্রস্তুতকারীর স্বাক্ষর', designation: 'হিসাবরক্ষক / সহকারী' },
    { title: 'যাচাইকারীর স্বাক্ষর', designation: 'সাধারণ সম্পাদক' },
    { title: 'অনুমোদনকারীর স্বাক্ষর', designation: 'সভাপতি / মুতাওয়াল্লি' },
  ];

  const activeSignatures =
    signatures === true
      ? defaultSignatures
      : Array.isArray(signatures) && signatures.length > 0
      ? signatures
      : null;

  return (
    <div
      id={id}
      className={`printable-document-root w-full bg-white text-slate-900 font-sans p-6 sm:p-8 print:p-0 print:m-0 print:border-none print:shadow-none ${className}`}
      style={{
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* 1. DYNAMIC OFFICIAL LETTERHEAD (CONDITIONAL) */}
      {includeLetterhead ? (
        <MosqueOfficialLetterhead
          mosque={mosque}
          documentTitle={documentTitle}
          subTitle={subTitle}
          refNumber={refNumber}
          dateStr={dateStr || todayFormatted}
          periodLabel={periodLabel}
        />
      ) : (
        /* LETTERHEAD-FREE MINIMAL TITLE HEADER */
        (documentTitle || periodLabel || refNumber) && (
          <div className="text-center pb-3 mb-4 border-b border-slate-300">
            {documentTitle && (
              <h1 className="text-xl sm:text-2xl font-black font-siliguri text-slate-950">
                {documentTitle}
              </h1>
            )}
            {subTitle && <p className="text-xs text-slate-600 mt-0.5">{subTitle}</p>}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 mt-1 font-medium">
              {periodLabel && <span>সময়সীমা: {periodLabel}</span>}
              {refNumber && <span>স্মারক নং: {refNumber}</span>}
              <span>তারিখ: {dateStr || todayFormatted}</span>
            </div>
          </div>
        )
      )}

      {/* 2. OPTIONAL METADATA BAR (IF PROVIDED) */}
      {metaDetails && metaDetails.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-4 font-baloo">
          {metaDetails.map((meta, idx) => (
            <div key={idx} className="space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                {meta.label}
              </span>
              <span className="font-bold text-slate-900 block">{meta.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3. MAIN DOCUMENT CONTENT */}
      <div className="document-main-content w-full my-2">{children}</div>

      {/* 4. TOTALS / SUMMARY SECTION (IF PROVIDED) */}
      {summaryContent && (
        <div className="document-summary-section mt-4 mb-4 break-inside-avoid">
          {summaryContent}
        </div>
      )}

      {/* 5. SIGNATURE & APPROVAL SECTION */}
      {activeSignatures && (
        <div className="document-signatures-section mt-12 pt-6 break-inside-avoid">
          <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-800">
            {activeSignatures.map((sig, idx) => (
              <div key={idx} className="space-y-1">
                <div className="border-t border-slate-700 w-36 mx-auto pt-1 font-bold font-siliguri">
                  {sig.title}
                </div>
                {sig.name && <p className="text-[11px] text-slate-900 font-bold">{sig.name}</p>}
                {sig.designation && (
                  <p className="text-[10px] text-slate-600">{sig.designation}</p>
                )}
                {sig.date && <p className="text-[9px] text-slate-500">তারিখ: {sig.date}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. OFFICIAL FOOTER / AUDIT TRAIL / PAGE NUMBER */}
      <div className="document-footer-section mt-8 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2 break-inside-avoid select-none">
        <div>
          {includeLetterhead && mosque?.nameBn ? (
            <span className="font-bold text-slate-700">{mosque.nameBn}</span>
          ) : (
            <span>অফিসিয়াল প্রতিবেদন</span>
          )}
          {footerNote ? ` • ${footerNote}` : ' • মসজিদলেজার প্রো ডিজিটাল ব্যবস্থাপনা'}
        </div>
        <div className="flex items-center gap-3">
          <span>প্রিন্ট সময়: {new Date().toLocaleTimeString('bn-BD')}</span>
          {pageNumber ? (
            <span className="font-bold text-slate-700">{pageNumber}</span>
          ) : (
            <span>পৃষ্ঠা ১ / ১</span>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  CheckCircle,
  Building2,
  Award,
  History,
  ShieldCheck,
  Layers,
  BookOpen,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { MeetingResolution, Mosque } from '../types';

interface MeetingResolutionPrintProps {
  resolution?: MeetingResolution | null;
  resolutionsList?: MeetingResolution[]; // For Resolution Book / Batch Print
  title?: string;
  mosque?: Mosque | null;
  onClose: () => void;
  onAuditLog?: (action: string, details?: string) => void;
}

export const MeetingResolutionPrint: React.FC<MeetingResolutionPrintProps> = ({
  resolution,
  resolutionsList,
  title,
  mosque,
  onClose,
  onAuditLog,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // If a batch resolution list is provided, use that for the Resolution Book
  const isBookMode = !!resolutionsList && resolutionsList.length > 0;
  const itemsToPrint: MeetingResolution[] = isBookMode
    ? resolutionsList!
    : resolution
    ? [resolution]
    : [];

  const handlePrint = () => {
    if (onAuditLog) {
      if (isBookMode) {
        onAuditLog('PRINT', `রেজোলিউশন বই প্রিন্ট: ${itemsToPrint.length}টি রেজোলিউশন`);
      } else if (resolution) {
        onAuditLog('PRINT', `রেজোলিউশন প্রিন্ট: ${resolution.resolutionNumber}`);
      }
    }
    window.print();
  };

  const getStatusBadgeBn = (st: string) => {
    switch (st) {
      case 'APPROVED':
        return { label: 'অনুমোদিত ও কার্যকর (Approved)', color: 'border-emerald-600 text-emerald-800 bg-emerald-50' };
      case 'IMPLEMENTED':
        return { label: 'সম্পূর্ণ বাস্তবায়িত (Implemented)', color: 'border-blue-600 text-blue-800 bg-blue-50' };
      case 'REJECTED':
        return { label: 'প্রত্যাখ্যাত (Rejected)', color: 'border-red-600 text-red-800 bg-red-50' };
      case 'CANCELLED':
        return { label: 'বাতিলকৃত (Cancelled)', color: 'border-slate-500 text-slate-700 bg-slate-100' };
      case 'DRAFT':
      default:
        return { label: 'খসড়া প্রস্তাব (Draft)', color: 'border-amber-600 text-amber-800 bg-amber-50' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Container */}
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
              {isBookMode ? <BookOpen className="w-5 h-5" /> : <FileCheck2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold font-siliguri">
                {isBookMode ? (title || 'রেজোলিউশন বই (Resolution Book)') : 'মিটিং রেজোলিউশন পত্র (প্রিন্ট প্রিভিউ)'}
              </h2>
              <p className="text-xs text-slate-400 font-baloo">
                {isBookMode ? `মোট ${itemsToPrint.length}টি রেজোলিউশন সংকলন` : `রেজোলিউশন নং: ${resolution?.resolutionNumber} • ${resolution?.date}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-print-resolution-action"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-siliguri shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন (A4)</span>
            </button>
            <button
              id="btn-close-resolution-print"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document A4 Canvas */}
        <div
          ref={printRef}
          className="p-6 sm:p-12 print:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible font-tiro bg-white text-slate-900"
        >
          {itemsToPrint.map((res, resIdx) => {
            const statusBadge = getStatusBadgeBn(res.status);
            const isCombined = res.resolutionType === 'COMBINED' || (res.items && res.items.length > 0);

            return (
              <div
                key={res.id || resIdx}
                className={`${resIdx > 0 ? 'page-break-before pt-8 border-t-2 border-dashed border-slate-300 mt-12 print:mt-0 print:border-none print:pt-0' : ''}`}
                style={{ pageBreakBefore: resIdx > 0 ? 'always' : 'auto' }}
              >
                {/* Header Letterhead */}
                <div className="border-b-2 border-emerald-800 pb-5 mb-6 text-center relative">
                  {/* Islamic Bismillah */}
                  <p className="text-base sm:text-lg font-amiri font-bold text-emerald-900 mb-2 tracking-wide">
                    بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
                  </p>
                  
                  <div className="flex flex-col items-center">
                    {mosque?.logoUrl && (
                      <img
                        src={mosque.logoUrl}
                        alt={mosque.name}
                        className="w-16 h-16 object-contain mb-2"
                      />
                    )}
                    <h1 className="text-2xl sm:text-3xl font-bold font-siliguri text-slate-900 tracking-tight">
                      {mosque?.name || 'বাইতুল আমান জামে মসজিদ কমপ্লেক্স'}
                    </h1>
                    {mosque?.address && (
                      <p className="text-xs sm:text-sm text-slate-600 font-baloo mt-1">
                        {mosque.address} {mosque.phone ? `• মোবাইল: ${mosque.phone}` : ''} {mosque.email ? `• ইমেইল: ${mosque.email}` : ''}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-emerald-800 font-siliguri mt-0.5">
                      কমিটি ও প্রশাসন বিভাগ • রেজোলিউশন ও সিদ্ধান্ত নথি
                    </p>
                  </div>

                  {/* Top Document Title Banner */}
                  <div className="mt-5 inline-block">
                    <div className="px-6 py-1.5 bg-emerald-800 text-white rounded-full text-sm sm:text-base font-bold font-siliguri shadow-xs">
                      {isCombined ? 'সম্মিলিত মিটিং রেজোলিউশনপত্র' : 'কার্যনির্বাহী মিটিং রেজোলিউশন'}
                    </div>
                  </div>
                </div>

                {/* Reference Meta Grid */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs sm:text-sm font-baloo grid grid-cols-2 sm:grid-cols-4 gap-4 print:bg-slate-50 print:border-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[11px]">রেজোলিউশন স্মারক নং:</span>
                    <strong className="text-emerald-900 font-mono font-bold">{res.resolutionNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">গ্রহণের তারিখ:</span>
                    <strong className="text-slate-900">{res.date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">মিটিং রেফারেন্স:</span>
                    <strong className="text-slate-900">
                      {res.meetingMemoNumber ? `স্মারক: ${res.meetingMemoNumber}` : (res.meetingDocumentNumber || res.meetingNumber || 'সভা')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">অনুমোদন স্ট্যাটাস:</span>
                    <span className={`inline-block px-2 py-0.5 border rounded-md text-[11px] font-bold ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {res.meetingDate && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">সভার তারিখ ও বার:</span>
                      <span className="text-slate-800 font-semibold">{res.meetingDate} {res.meetingDayName ? `(${res.meetingDayName})` : ''}</span>
                    </div>
                  )}
                  {res.meetingVenue && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">সভার স্থান:</span>
                      <span className="text-slate-800 font-semibold">{res.meetingVenue}</span>
                    </div>
                  )}
                  {res.meetingChairman && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">সভাপতিত্বকারী:</span>
                      <span className="text-slate-800 font-semibold">{res.meetingChairman}</span>
                    </div>
                  )}
                  {res.meetingSecretary && (
                    <div>
                      <span className="text-slate-500 block text-[11px]">সভা পরিচালনাকারী:</span>
                      <span className="text-slate-800 font-semibold">{res.meetingSecretary}</span>
                    </div>
                  )}
                </div>

                {/* Subject Box */}
                <div className="mb-6 p-4 bg-emerald-50/60 border-l-4 border-emerald-700 rounded-r-xl">
                  <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider font-siliguri mb-1">
                    রেজোলিউশনের বিষয় (Subject):
                  </h2>
                  <p className="text-sm sm:text-base font-bold font-siliguri text-slate-900 leading-snug">
                    {res.subject}
                  </p>
                </div>

                {/* Body Content Sections */}
                <div className="space-y-6 text-xs sm:text-sm leading-relaxed">
                  
                  {/* 1. Background / Preamble */}
                  {res.background && (
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 font-siliguri flex items-center space-x-1.5 text-xs uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                        <span>১. প্রস্তাবের পটভূমি ও প্রেক্ষাপট:</span>
                      </h3>
                      <p className="text-slate-800 pl-3.5 border-l-2 border-slate-200 text-justify">
                        {res.background}
                      </p>
                    </div>
                  )}

                  {/* 2. Consideration & Discussion */}
                  {res.consideration && (
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-slate-900 font-siliguri flex items-center space-x-1.5 text-xs uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                        <span>২. পর্যালোচনা ও সভার বিস্তারিত আলোচনা:</span>
                      </h3>
                      <p className="text-slate-800 pl-3.5 border-l-2 border-slate-200 text-justify">
                        {res.consideration}
                      </p>
                    </div>
                  )}

                  {/* If COMBINED: Render Decision Items List/Table */}
                  {isCombined && res.items && res.items.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-900 font-siliguri flex items-center space-x-1.5 text-xs uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                        <span>৩. সর্বসম্মতিক্রমে গৃহীত সিদ্ধান্ত ও রেজোলিউশনসমূহ ({res.items.length}টি ধারা):</span>
                      </h3>

                      <div className="space-y-3">
                        {res.items.map((item, itIdx) => (
                          <div key={itIdx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <span className="font-bold text-emerald-950 font-siliguri text-xs sm:text-sm flex items-center space-x-2">
                                <span className="px-2 py-0.5 bg-emerald-800 text-white rounded font-mono text-[11px]">
                                  {item.decisionNumber || `ধারা-${itIdx + 1}`}
                                </span>
                                <span>{item.subject}</span>
                              </span>
                              {item.financialAmount && (
                                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  বরাদ্দ: ৳{item.financialAmount.toLocaleString('en-BD')}
                                </span>
                              )}
                            </div>

                            <p className="text-slate-900 font-tiro text-xs sm:text-sm leading-relaxed text-justify">
                              {item.resolutionText || item.details}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-baloo text-slate-600 pt-2 border-t border-slate-100">
                              {item.assignedMemberName && (
                                <span>বাস্তবায়নে: <strong className="text-slate-900">{item.assignedMemberName}</strong></span>
                              )}
                              {item.deadline && (
                                <span>সময়সীমা: <strong className="text-emerald-900">{item.deadline}</strong></span>
                              )}
                              {item.priority && (
                                <span>অগ্রাধিকার: <strong className="text-slate-900">{item.priority === 'URGENT' ? 'জরুরি' : 'সাধারণ'}</strong></span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Standard Single Resolution Core */
                    <>
                      {/* Proposal */}
                      {(res.proposal || res.proposerName) && (
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-slate-900 font-siliguri flex items-center space-x-1.5 text-xs uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                            <span>৩. প্রস্তাবনা ও সমর্থন:</span>
                          </h3>
                          <p className="text-slate-800 pl-3.5 border-l-2 border-slate-200">
                            {res.proposal || 'কার্যনির্বাহী সভার এজেন্ডা অনুযায়ী প্রস্তাব পেশ করা হয়।'}
                            {res.proposerName && <span className="block mt-1 font-baloo text-xs text-slate-600">প্রস্তাবক: <strong>{res.proposerName}</strong> {res.supporterName ? `• সমর্থক: <strong>${res.supporterName}</strong>` : ''}</span>}
                          </p>
                        </div>
                      )}

                      {/* 4. Formal Resolution Text */}
                      <div className="p-5 bg-white border-2 border-emerald-800 rounded-xl shadow-xs space-y-2">
                        <h3 className="font-bold text-emerald-950 font-siliguri text-sm uppercase tracking-wide flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-700" />
                          <span>৪. সর্বসম্মতিক্রমে গৃহীত আনুষ্ঠানিক রেজোলিউশন ও সিদ্ধান্ত:</span>
                        </h3>
                        <div className="text-slate-900 font-tiro text-sm sm:text-base leading-relaxed pl-2 text-justify whitespace-pre-line font-medium">
                          {res.resolutionText}
                        </div>
                      </div>

                      {/* 5. Implementation & Assigned Member */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-baloo">
                        <div>
                          <span className="text-slate-500 block text-[11px]">বাস্তবায়ন ও তদারকির দায়িত্বপ্রাপ্ত:</span>
                          <strong className="text-slate-900 text-sm">
                            {res.assignedMemberName || 'নির্বাহী কমিটি'}
                          </strong>
                          {res.assignedMemberDesignation && (
                            <p className="text-slate-600 text-xs">({res.assignedMemberDesignation})</p>
                          )}
                          {res.assignedMemberPhone && (
                            <p className="text-slate-500 text-[11px]">মোবাইল: {res.assignedMemberPhone}</p>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">বাস্তবায়নের চূড়ান্ত সময়সীমা (Deadline):</span>
                          <strong className="text-emerald-900 text-sm">
                            {res.deadline ? `${res.deadline}` : 'অবিলম্বে কার্যকর'}
                          </strong>
                          {res.financialAmount && (
                            <p className="text-emerald-800 font-mono font-bold mt-1">বরাদ্দকৃত অর্থ: ৳{res.financialAmount.toLocaleString('en-BD')}</p>
                          )}
                          {res.remarks && (
                            <p className="text-slate-600 text-xs mt-1">মন্তব্য: {res.remarks}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Revision Notice if Revised */}
                  {res.isRevised && res.revisionHistory && res.revisionHistory.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-baloo space-y-1">
                      <strong className="text-amber-900 font-siliguri flex items-center space-x-1.5">
                        <History className="w-3.5 h-3.5" />
                        <span>সংশোধিত রেজোলিউশন (সংস্করণ #{res.revisionNumber || res.revisionHistory.length}):</span>
                      </strong>
                      <p className="text-amber-800">
                        সংশোধনের তারিখ: {res.revisionHistory[res.revisionHistory.length - 1].revisionDate.split('T')[0]} • সংশোধনের কারণ: {res.revisionHistory[res.revisionHistory.length - 1].reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Official Signatures Section */}
                <div className="mt-14 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs font-siliguri print:mt-16">
                  <div className="flex flex-col items-center">
                    <div className="h-16 flex items-end justify-center mb-1">
                      {res.secretarySignatureUrl ? (
                        <img
                          src={res.secretarySignatureUrl}
                          alt="সাধারণ সম্পাদক স্বাক্ষর"
                          className="max-h-14 object-contain"
                        />
                      ) : (
                        <div className="w-32 border-b border-dashed border-slate-400"></div>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">
                      {res.meetingSecretary || 'সাধারণ সম্পাদক / মোতাওয়াল্লী'}
                    </p>
                    <p className="text-slate-500 font-baloo text-[11px]">
                      {mosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="h-16 flex items-end justify-center mb-1">
                      {res.presidentSignatureUrl ? (
                        <img
                          src={res.presidentSignatureUrl}
                          alt="সভাপতি স্বাক্ষর"
                          className="max-h-14 object-contain"
                        />
                      ) : (
                        <div className="w-32 border-b border-dashed border-slate-400"></div>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">
                      {res.meetingChairman || 'সভাপতি'}
                    </p>
                    <p className="text-slate-500 font-baloo text-[11px]">
                      {mosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                    </p>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-10 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 font-baloo">
                  <span>নথি আইডি: {res.id} • জেনারেট সময়: {new Date().toLocaleString('bn-BD')}</span>
                  <span>MasjidLedger • অটোমেটেড ইসলামিক গভর্ন্যান্স সিস্টেম</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

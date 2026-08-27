import React, { useEffect } from 'react';
import { Printer, X, Download, ShieldCheck, FileText, CheckCircle2, History, AlertCircle, Building2 } from 'lucide-react';
import { CommitteeMeeting, CommitteeMember, Mosque } from '../types';
import { formatDate, Language } from '../lib/i18n';

interface MeetingDocumentPrintProps {
  isOpen?: boolean;
  onClose: () => void;
  meeting: CommitteeMeeting | null;
  mosque?: Mosque | null;
  members?: CommitteeMember[];
  language?: Language;
  onAuditLog?: (meetingId: string, action: string, details: string) => void;
}

export const MeetingDocumentPrint: React.FC<MeetingDocumentPrintProps> = ({
  isOpen = true,
  onClose,
  meeting,
  mosque,
  members = [],
  language = 'bn',
  onAuditLog,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-document-active');
    }
    return () => {
      document.body.classList.remove('print-document-active');
    };
  }, [isOpen]);

  if (!isOpen || !meeting) return null;

  const handlePrint = () => {
    if (onAuditLog && meeting.id) {
      onAuditLog(meeting.id, 'PRINT', `মিটিং কার্যবিবরণী প্রিন্ট: ${meeting.documentNumber || meeting.meetingNumber}`);
    }
    window.print();
  };

  const handleDownloadPdf = () => {
    if (onAuditLog && meeting.id) {
      onAuditLog(meeting.id, 'PDF_DOWNLOAD', `মিটিং কার্যবিবরণী PDF ডাউনলোড: ${meeting.documentNumber || meeting.meetingNumber}`);
    }
    window.print();
  };

  // Convert English numbers to Bengali numbers
  const toBanglaNum = (n: number | string | undefined | null): string => {
    if (n === undefined || n === null) return '';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(n).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  // Determine present attendees list
  const rawAttendees = meeting.attendees || [];
  const presentAttendees = rawAttendees.length > 0
    ? rawAttendees.filter(a => a.attendanceStatus === 'PRESENT' || (a as any).isPresent !== false)
    : (members || []).filter(m => m.status === 'ACTIVE').map(m => ({
        memberId: m.id,
        name: m.name,
        designation: m.positionCustomBn || m.position,
        phone: m.phone,
        attendanceStatus: 'PRESENT' as const,
        isPresent: true,
        signatureUrl: undefined,
      }));

  const allDecisions = (meeting.decisions && meeting.decisions.length > 0)
    ? meeting.decisions
    : (meeting.resolutions && meeting.resolutions.length > 0)
    ? meeting.resolutions
    : [];

  const isDraft = meeting.status === 'DRAFT';
  const isRevised = meeting.status === 'REVISED' || (meeting.revisionHistory && meeting.revisionHistory.length > 0);
  const latestRevision = meeting.revisionHistory && meeting.revisionHistory.length > 0
    ? meeting.revisionHistory[meeting.revisionHistory.length - 1]
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto report-modal-print-wrapper">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto report-modal-print-card">
        {/* Top Control Bar - Hidden during print */}
        <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 print:hidden print-controls-bar">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold font-siliguri flex items-center space-x-2">
                <span>মিটিং কার্যবিবরণী ও রেজোলিউশন ডকুমেন্ট</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isDraft ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  isRevised ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isDraft ? 'ড্রাফট (খসড়া)' : isRevised ? 'সংশোধিত সংস্করণ' : 'চূড়ান্ত (Final)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-baloo">
                ডকুমেন্ট নং: {meeting.documentNumber || meeting.meetingNumber} • স্মারক: {meeting.memoNumber || 'প্রযোজ্য নয়'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-print-minutes-action"
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold font-siliguri flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>

            <button
              id="btn-download-minutes-pdf"
              type="button"
              onClick={handleDownloadPdf}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold font-siliguri flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>PDF ডাউনলোড</span>
            </button>

            <button
              id="btn-close-minutes-preview"
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official A4 Document Container */}
        <div className="p-6 sm:p-10 max-h-[85vh] overflow-y-auto print:overflow-visible print:max-h-none print:p-0 bg-slate-50/50 print:bg-white report-modal-print-body font-print-body text-slate-900">
          <div className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-6 min-h-[297mm] flex flex-col justify-between relative">
            
            {/* Draft Watermark */}
            {isDraft && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] select-none z-0">
                <span className="text-8xl font-black text-slate-900 rotate-[-30deg] tracking-widest uppercase font-siliguri">
                  DRAFT / খসড়া
                </span>
              </div>
            )}

            <div>
              {/* 1. Bismillah Header */}
              <div className="text-center mb-3">
                <p className="font-arabic-bismillah text-lg text-slate-800 leading-none">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              </div>

              {/* 2. Official Mosque Letterhead */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-5">
                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1 shadow-xs">
                  {mosque?.logoUrl ? (
                    <img
                      src={mosque.logoUrl}
                      alt={mosque.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-blue-900 text-white rounded-lg p-1 text-center">
                      <Building2 className="w-6 h-6 mb-0.5 opacity-80" />
                      <span className="text-[9px] font-bold leading-tight font-siliguri">মসজিদ</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center px-4">
                  <h1 className="text-2xl sm:text-3xl font-extrabold font-mosque-name text-slate-950 tracking-tight leading-tight">
                    {mosque?.name || 'মসজিদ কমপ্লেক্স'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-700 font-letterhead mt-1">
                    {mosque?.address || 'মসজিদ রোড, ঢাকা, বাংলাদেশ'}
                  </p>
                  <p className="text-xs text-slate-600 font-letterhead mt-0.5">
                    {mosque?.phone && <span>মোবাইল: {mosque.phone}</span>}
                    {mosque?.email && <span> • ইমেইল: {mosque.email}</span>}
                    {mosque?.registrationNumber && <span> • রেজিঃ নং: {mosque.registrationNumber}</span>}
                  </p>
                </div>

                <div className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-slate-50/80 p-1 text-center">
                  <span className="text-[10px] font-bold text-slate-500 font-baloo uppercase">ডকুমেন্ট নং</span>
                  <span className="text-xs font-extrabold text-blue-950 font-siliguri tracking-tight mt-0.5">
                    {meeting.documentNumber || toBanglaNum(meeting.meetingNumber) || '০১'}
                  </span>
                  {isRevised && (
                    <span className="mt-1 px-1.5 py-0.2 bg-purple-100 text-purple-900 text-[9px] font-bold rounded font-siliguri">
                      রিভিশন #{toBanglaNum(meeting.revisionHistory?.length || 1)}
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Document Title Box */}
              <div className="text-center mb-5">
                <div className="inline-block bg-slate-900 text-white px-6 py-1.5 rounded-md shadow-xs">
                  <h2 className="text-base sm:text-lg font-bold font-siliguri tracking-wide">
                    মিটিং কার্যবিবরণী ও গৃহীত সিদ্ধান্ত
                  </h2>
                </div>
                {isRevised && latestRevision && (
                  <p className="text-xs text-purple-800 font-baloo mt-1 font-semibold">
                    [সংশোধিত কার্যবিবরণী - কারণ: {latestRevision.reason} • তারিখ: {formatDate(latestRevision.revisionDate, language || 'bn')}]
                  </p>
                )}
              </div>

              {/* 4. Structured Meta Information Table */}
              <div className="mb-5 bg-slate-50 border border-slate-300 rounded-lg overflow-hidden text-xs font-baloo">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-300">
                  <div className="p-2.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">স্মারক নং</span>
                    <span className="font-bold text-slate-900">{meeting.memoNumber || '—'}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">মিটিং ক্রমিক নং</span>
                    <span className="font-bold text-slate-900">সভা #{toBanglaNum(meeting.meetingNumber)}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">তারিখ ও বার</span>
                    <span className="font-bold text-slate-900">
                      {formatDate(meeting.date, language || 'bn')} ({meeting.dayName || 'নির্ধারিত দিন'})
                    </span>
                  </div>
                  <div className="p-2.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">সময় ও সমাপ্তি</span>
                    <span className="font-bold text-slate-900">
                      {meeting.time} {meeting.closingTime ? `হতে ${meeting.closingTime}` : ''}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-t divide-slate-300 bg-white">
                  <div className="p-2.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">স্থান / ভেন্যু</span>
                    <span className="font-bold text-slate-900">{meeting.location || 'মসজিদ কার্যালয়'}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">মিটিংয়ের ধরণ</span>
                    <span className="font-bold text-blue-900">
                      {meeting.meetingTypeBn || meeting.meetingType || 'সাধারণ সভা'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Section 1: Leadership & Conducting */}
              <div className="mb-5 border border-slate-300 rounded-lg p-3 bg-white">
                <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>১. সভা পরিচালনা ও সভাপতিত্ব</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-baloo">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold">মিটিং পরিচালনাকারী:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {meeting.conductor || meeting.secretary || 'সাধারণ সম্পাদক / কার্যনির্বাহী সদস্য'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold">সভাপতিত্বকারী:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {meeting.chairman || 'সভাপতি, পরিচালনা কমিটি'} {meeting.chairmanDesignation ? `(${meeting.chairmanDesignation})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Section 2: Meeting Agendas (আলোচ্যসূচি) */}
              <div className="mb-5 border border-slate-300 rounded-lg p-3 bg-white">
                <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                  ২. সভার আলোচ্যসূচি (এজেন্ডা)
                </h3>
                {meeting.agenda && meeting.agenda.length > 0 ? (
                  <ol className="space-y-1.5 text-xs font-baloo text-slate-800 list-none pl-0">
                    {meeting.agenda.map((item, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="font-bold text-blue-900 w-5 flex-shrink-0">
                          {toBanglaNum(idx + 1)}.
                        </span>
                        <span className="flex-1 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-slate-500 italic">কোনো এজেন্ডা উল্লেখ করা হয়নি।</p>
                )}
              </div>

              {/* 7. Section 3: Decisions & Resolutions (গৃহীত সিদ্ধান্তসমূহ) */}
              <div className="mb-5 border-2 border-slate-800 rounded-lg p-3.5 bg-slate-50/40">
                <h3 className="text-xs font-extrabold font-siliguri text-slate-950 uppercase tracking-wider mb-2.5 border-b border-slate-300 pb-1 flex items-center justify-between">
                  <span>৩. বিস্তারিত কার্যবিবরণী ও গৃহীত সিদ্ধান্ত / রেজোলিউশন</span>
                  <span className="text-[10px] font-bold text-blue-800 font-baloo">
                    সর্বসম্মত সিদ্ধান্তসমূহ
                  </span>
                </h3>
                {allDecisions && allDecisions.length > 0 ? (
                  <div className="space-y-3 text-xs font-baloo text-slate-900">
                    {allDecisions.map((dec, idx) => (
                      <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-md shadow-2xs">
                        <div className="font-bold text-blue-950 font-siliguri mb-1 flex items-center space-x-1.5">
                          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 rounded text-[11px]">
                            সিদ্ধান্ত-{toBanglaNum(idx + 1)}
                          </span>
                        </div>
                        <p className="leading-relaxed pl-1 text-slate-800 whitespace-pre-line font-medium">
                          {dec}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">কোনো সিদ্ধান্ত লিপিবদ্ধ করা হয়নি।</p>
                )}
              </div>

              {/* 8. Section 4: Miscellaneous (বিবিধ) - rendered only if text exists */}
              {meeting.miscellaneous && meeting.miscellaneous.trim() !== '' && (
                <div className="mb-5 border border-slate-300 rounded-lg p-3 bg-white">
                  <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                    ৪. বিবিধ আলোচনা
                  </h3>
                  <p className="text-xs font-baloo text-slate-800 leading-relaxed whitespace-pre-line">
                    {meeting.miscellaneous}
                  </p>
                </div>
              )}

              {/* 9. Section 5: Responsible Members (দায়িত্বপ্রাপ্ত সদস্য) */}
              {meeting.responsibleMembers && meeting.responsibleMembers.length > 0 && (
                <div className="mb-5 border border-slate-300 rounded-lg p-3 bg-white">
                  <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    ৫. দায়িত্বপ্রাপ্ত সদস্য ও অর্পিত দায়িত্ব
                  </h3>
                  <table className="w-full border-collapse border border-slate-300 text-xs font-baloo">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 p-1.5 text-center w-12 font-bold">ক্রমিক</th>
                        <th className="border border-slate-300 p-1.5 text-left font-bold">সদস্যের নাম</th>
                        <th className="border border-slate-300 p-1.5 text-left font-bold">পদবি</th>
                        <th className="border border-slate-300 p-1.5 text-left font-bold">অর্পিত দায়িত্বের বিবরণ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meeting.responsibleMembers.map((resp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-1.5 text-center font-bold">{toBanglaNum(idx + 1)}</td>
                          <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{resp.name}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-700">{resp.designation || 'সদস্য'}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-800 leading-snug">{resp.roleDescription}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 10. Section 6: Dua & Prayer */}
              {meeting.duaLeader && (
                <div className="mb-5 border border-slate-300 rounded-lg p-3 bg-white text-xs font-baloo">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 font-siliguri">৬. মোনাজাত ও সমাপ্তি:</span>
                    <span className="text-slate-800">
                      পরিশেষে <span className="font-bold text-slate-950">{meeting.duaLeader}</span> কর্তৃক দেশ, জাতি ও মসজিদ কমপ্লেক্সের সার্বিক কল্যাণ কামনা করে বিশেষ মোনাজাতের মাধ্যমে সভার সমাপ্তি ঘোষণা করা হয়।
                    </span>
                  </div>
                </div>
              )}

              {/* 11. Section 7: Present Members Attendance & Physical Signature List */}
              <div className="mb-8 border border-slate-300 rounded-lg p-3 bg-white break-inside-avoid">
                <h3 className="text-xs font-bold font-siliguri text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>৭. সভায় উপস্থিত সদস্যদের উপস্থিতি ও স্বাক্ষর তালিকা</span>
                  <span className="text-[10px] font-bold text-slate-600 font-baloo">
                    মোট উপস্থিত: {toBanglaNum(presentAttendees.length)} জন
                  </span>
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-xs font-baloo">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                      <th className="border border-slate-300 p-1.5 w-10">ক্রমিক</th>
                      <th className="border border-slate-300 p-1.5 text-left">সদস্যের নাম</th>
                      <th className="border border-slate-300 p-1.5 text-left w-36">পদবি</th>
                      <th className="border border-slate-300 p-1.5 text-center w-32">মোবাইল নম্বর</th>
                      <th className="border border-slate-300 p-1.5 text-center w-36">স্বাক্ষর</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentAttendees.map((att, idx) => (
                      <tr key={idx} className="h-10 hover:bg-slate-50">
                        <td className="border border-slate-300 p-1 text-center font-bold">{toBanglaNum(idx + 1)}</td>
                        <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{att.name}</td>
                        <td className="border border-slate-300 p-1.5 text-slate-700">{att.designation || 'সদস্য'}</td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-700 font-mono text-[11px]">{att.phone || '—'}</td>
                        <td className="border border-slate-300 p-1 text-center">
                          {att.signatureUrl ? (
                            <img src={att.signatureUrl} alt="স্বাক্ষর" referrerPolicy="no-referrer" className="h-7 mx-auto object-contain" />
                          ) : (
                            <div className="h-7 w-full border-b border-dashed border-slate-300" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 12. Section 8: Official Authority Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-200 break-inside-avoid">
              <div className="flex items-end justify-between px-6">
                {/* Left: President */}
                <div className="text-center w-56">
                  {meeting.presidentSignatureUrl || mosque?.presidentSignatureUrl ? (
                    <div className="h-14 flex items-end justify-center mb-1">
                      <img
                        src={meeting.presidentSignatureUrl || mosque?.presidentSignatureUrl}
                        alt="সভাপতি স্বাক্ষর"
                        referrerPolicy="no-referrer"
                        className="max-h-12 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-14" />
                  )}
                  <div className="border-t-2 border-slate-800 pt-1">
                    <p className="text-xs font-bold font-siliguri text-slate-950">
                      {meeting.chairman || 'সভাপতি'}
                    </p>
                    <p className="text-[10px] text-slate-600 font-baloo">
                      সভাপতি / সভাপতিমণ্ডলী
                    </p>
                    <p className="text-[9px] text-slate-500 font-baloo">
                      {mosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                    </p>
                  </div>
                </div>

                {/* Right: Secretary */}
                <div className="text-center w-56">
                  {meeting.secretarySignatureUrl || mosque?.secretarySignatureUrl ? (
                    <div className="h-14 flex items-end justify-center mb-1">
                      <img
                        src={meeting.secretarySignatureUrl || mosque?.secretarySignatureUrl}
                        alt="সেক্রেটারী স্বাক্ষর"
                        referrerPolicy="no-referrer"
                        className="max-h-12 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-14" />
                  )}
                  <div className="border-t-2 border-slate-800 pt-1">
                    <p className="text-[10px] text-slate-500 font-baloo font-semibold">অনুরোধক্রমে,</p>
                    <p className="text-xs font-bold font-siliguri text-slate-950">
                      {meeting.secretary || 'সাধারণ সম্পাদক'}
                    </p>
                    <p className="text-[10px] text-slate-600 font-baloo">
                      সেক্রেটারী / মোতাওয়াল্লী
                    </p>
                    <p className="text-[9px] text-slate-500 font-baloo">
                      {mosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Official Footer */}
              <div className="mt-8 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-500 font-baloo flex items-center justify-between">
                <span>স্মারক নং: {meeting.memoNumber || '—'}</span>
                <span>MasjidLedger • অফিসিয়াল মিটিং কার্যবিবরণী ও রেজোলিউশন ডকুমেন্ট</span>
                <span>ডকুমেন্ট আইডি: {meeting.documentNumber || toBanglaNum(meeting.meetingNumber)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

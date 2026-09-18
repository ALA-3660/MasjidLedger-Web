import React from 'react';
import {
  Printer,
  X,
  FileText,
  Download,
  Share2,
  Calendar,
  User,
  ShieldCheck,
  Building,
  CheckCircle2,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { OfficialDocument } from '../../types/officialDocumentTypes';
import { Mosque } from '../../types';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';

interface OfficialDocumentPrintViewProps {
  document: OfficialDocument;
  mosque?: Mosque | null;
  onClose: () => void;
  onPrint?: () => void;
}

export const OfficialDocumentPrintView: React.FC<OfficialDocumentPrintViewProps> = ({
  document: doc,
  mosque,
  onClose,
  onPrint,
}) => {
  const handleNativePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    window.print();
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'NOTICE': return 'বিজ্ঞপ্তি / নোটিশ';
      case 'APPLICATION': return 'দরখাস্ত / আবেদন';
      case 'ANNOUNCEMENT': return 'অফিসিয়াল ঘোষণা';
      case 'OUTGOING_LETTER': return 'প্রেরিত পত্র (স্মারক)';
      case 'INCOMING_LETTER': return 'প্রাপ্ত পত্র (ইনকামিং)';
      case 'OFFICE_ORDER': return 'অফিস আদেশ';
      case 'CERTIFICATE': return 'প্রত্যয়নপত্র / প্রশংসাপত্র';
      case 'RECOMMENDATION': return 'সুপারিশপত্র';
      case 'MEMO_REGISTER': return 'স্মারক রেজিস্টার ভিউ';
      default: return 'দাপ্তরিক নথি';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static print:z-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Screen-only Toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold truncate max-w-md">{doc.title}</div>
              <div className="text-[11px] text-slate-400">
                {getDocTypeLabel(doc.docType)} • {doc.documentNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleNativePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF ডাউনলোড</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas (A4 standard) */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0 flex justify-center">
          <div className="w-full max-w-[210mm] bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-8 print:m-0 min-h-[297mm] flex flex-col justify-between text-slate-900 font-sans">
            
            {/* Top: Letterhead or standard header */}
            <div>
              {doc.includeLetterhead !== false ? (
                <MosqueOfficialLetterhead
                  mosque={mosque}
                  documentTitle={doc.docType === 'CERTIFICATE' ? 'প্রত্যয়নপত্র' : undefined}
                  refNumber={doc.memoNumber || doc.documentNumber}
                  dateStr={doc.documentDate}
                />
              ) : (
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <div className="text-center">
                    <h1 className="text-xl font-bold text-slate-900">{mosque?.nameBn || mosque?.name || 'বায়তুল আমান জামে মসজিদ'}</h1>
                    <p className="text-xs text-slate-600">{mosque?.address || 'ঢাকা, বাংলাদেশ'}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-700 mt-4 pt-2 border-t border-slate-200">
                    <div><strong>স্মারক / নথি নং:</strong> {doc.documentNumber || doc.memoNumber}</div>
                    <div><strong>তারিখ:</strong> {doc.documentDate}</div>
                  </div>
                </div>
              )}

              {/* Memo & Date Strip (If letterhead was present, explicit memo & date row) */}
              {doc.includeLetterhead !== false && (
                <div className="flex justify-between items-center text-xs text-slate-800 font-medium pb-4 mb-4 border-b border-slate-300">
                  <div>
                    <span className="text-slate-500">স্মারক নং: </span>
                    <strong className="text-slate-900">{doc.memoNumber || doc.documentNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">তারিখ: </span>
                    <strong className="text-slate-900">{doc.documentDate} খ্রিষ্টাব্দ</strong>
                  </div>
                </div>
              )}

              {/* Recipient Block (For Letters / Applications / Office orders) */}
              {(doc.recipientName || doc.recipientOrg || doc.recipientAddress) && (
                <div className="mb-5 text-xs text-slate-800 space-y-0.5">
                  <div className="text-slate-500 font-semibold">বরাবর,</div>
                  {doc.recipientName && <div className="font-bold text-sm text-slate-900">{doc.recipientName}</div>}
                  {doc.recipientDesignation && <div>{doc.recipientDesignation}</div>}
                  {doc.recipientOrg && <div>{doc.recipientOrg}</div>}
                  {doc.recipientAddress && <div className="text-slate-600">{doc.recipientAddress}</div>}
                </div>
              )}

              {/* Document Subject (Bold underline) */}
              <div className="mb-6">
                <div className="text-sm sm:text-base font-bold text-slate-950 pb-1.5 border-b-2 border-slate-800 inline-block">
                  বিষয়: {doc.title}
                </div>
                {doc.referenceNumber && (
                  <div className="text-xs text-slate-600 mt-1">
                    সূত্র: {doc.referenceNumber}
                  </div>
                )}
              </div>

              {/* Document Body (Rendered HTML) */}
              <div
                className="text-xs sm:text-sm text-slate-900 leading-relaxed space-y-3 prose max-w-none mb-10"
                dangerouslySetInnerHTML={{ __html: doc.body }}
              />

              {/* Action / Resolution Notes (If any) */}
              {doc.actionTaken && (
                <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                  <div className="font-bold text-slate-900 mb-1">গৃহীত পদক্ষেপ ও সিদ্ধান্ত:</div>
                  <p>{doc.actionTaken}</p>
                </div>
              )}

              {/* Attachments list (if any) */}
              {doc.attachments && doc.attachments.length > 0 && (
                <div className="my-6 pt-3 border-t border-slate-200 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>সংযুক্তি (Attachments):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    {doc.attachments.map((att, idx) => (
                      <li key={att.id || idx}>
                        {att.name} {att.size ? `(${Math.round(att.size / 1024)} KB)` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom: Official Signatories */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs">
                {doc.signatories && doc.signatories.length > 0 ? (
                  doc.signatories.map((sig, idx) => (
                    <div key={sig.id || idx} className="flex flex-col items-center justify-end">
                      <div className="h-12 flex items-end justify-center mb-1">
                        {sig.signed ? (
                          <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-300">
                            স্বাক্ষরিত ({sig.signedAt || doc.documentDate})
                          </div>
                        ) : (
                          <div className="w-28 border-b border-dashed border-slate-400 mb-1" />
                        )}
                      </div>
                      <div className="font-bold text-slate-900">{sig.name}</div>
                      <div className="text-slate-600 text-[11px]">{sig.designation || sig.title}</div>
                      <div className="text-slate-500 text-[10px]">{mosque?.nameBn || mosque?.name || 'মসজিদ পরিচালনা পরিষদ'}</div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex flex-col items-center justify-end">
                      <div className="w-28 border-b border-dashed border-slate-400 mb-1" />
                      <div className="font-bold text-slate-900">সাধারণ সম্পাদক</div>
                      <div className="text-slate-500 text-[10px]">{mosque?.nameBn || 'পরিচালনা পরিষদ'}</div>
                    </div>
                    <div className="flex flex-col items-center justify-end">
                      <div className="w-28 border-b border-dashed border-slate-400 mb-1" />
                      <div className="font-bold text-slate-900">সভাপতি</div>
                      <div className="text-slate-500 text-[10px]">{mosque?.nameBn || 'পরিচালনা পরিষদ'}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Watermark / Footer Security Note */}
              <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <div>নথি কোড: {doc.id} • সিস্টেম জেনারেটেড ডিজিটাল কপি</div>
                <div>{mosque?.nameBn || 'MasjidLedger Pro'} — দাপ্তরিক নথি শাখা</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

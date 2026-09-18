import React, { useState } from 'react';
import {
  GitCommit,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Printer,
  History,
  ShieldCheck,
  User,
} from 'lucide-react';
import { OfficialDocument, OfficialDocumentStatus } from '../../types/officialDocumentTypes';

interface OfficialDocumentTrackingViewProps {
  documents: OfficialDocument[];
  onSelectDocForPreview: (doc: OfficialDocument) => void;
  onSelectDocForEdit: (doc: OfficialDocument) => void;
  onUpdateStatus: (docId: string, status: OfficialDocumentStatus, notes?: string) => Promise<void>;
}

export const OfficialDocumentTrackingView: React.FC<OfficialDocumentTrackingViewProps> = ({
  documents,
  onSelectDocForPreview,
  onSelectDocForEdit,
  onUpdateStatus,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<OfficialDocument | null>(documents[0] || null);
  const [activeStageFilter, setActiveStageFilter] = useState<string>('ALL');

  const STAGES: { id: OfficialDocumentStatus; label: string; color: string; desc: string }[] = [
    { id: 'DRAFT', label: 'খসড়া', color: 'bg-slate-100 text-slate-700 border-slate-300', desc: 'নথির প্রাথমিক খসড়া তৈরি' },
    { id: 'UNDER_REVIEW', label: 'পর্যালোচনাধীন', color: 'bg-amber-50 text-amber-800 border-amber-300', desc: 'দায়িত্বপ্রাপ্ত সদস্য কর্তৃক যাচাই' },
    { id: 'PENDING_APPROVAL', label: 'অনুমোদন বাকি', color: 'bg-orange-50 text-orange-800 border-orange-300', desc: 'সভাপতি/সেক্রেটারির স্বাক্ষর বাকি' },
    { id: 'APPROVED', label: 'অনুমোদিত', color: 'bg-emerald-50 text-emerald-800 border-emerald-300', desc: 'স্বাক্ষরিত ও চূড়ান্ত' },
    { id: 'SENT', label: 'প্রেরিত', color: 'bg-purple-50 text-purple-800 border-purple-300', desc: 'প্রাপকের ঠিকানায় প্রেরণ করা হয়েছে' },
    { id: 'REPLY_AWAITED', label: 'উত্তর অপেক্ষমাণ', color: 'bg-rose-50 text-rose-800 border-rose-300', desc: 'প্রাপকের চিঠির জবাবের অপেক্ষা' },
    { id: 'RESOLVED', label: 'নিষ্পত্তি', color: 'bg-teal-50 text-teal-800 border-teal-300', desc: 'কার্যক্রম সফলভাবে সমাপ্ত' },
  ];

  const filteredDocs = activeStageFilter === 'ALL'
    ? documents
    : documents.filter(d => d.status === activeStageFilter);

  return (
    <div className="space-y-4">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-blue-600" />
            <span>নথি ট্র্যাকিং, কার্যপ্রবাহ ও অডিট ট্রেইল (Workflow & Audit Tracking)</span>
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            দাপ্তরিক চিঠিপত্র ও আবেদনের বর্তমান পর্যায়, অনুমোদন অবস্থা, উত্তর গ্রহণের তারিখ ও পরিবর্তন ইতিহাস
          </p>
        </div>
      </div>

      {/* Stage Flow Pipeline */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          কার্যপ্রবাহ পাইপলাইন (Workflow Stages)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STAGES.map((st) => {
            const count = documents.filter(d => d.status === st.id).length;
            const isSelected = activeStageFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setActiveStageFilter(isSelected ? 'ALL' : st.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-blue-600 shadow-sm ' + st.color
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{st.label}</span>
                  <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded-full bg-white/80 border border-slate-200">
                    {count}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{st.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Document List & Audit Trail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Documents List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">
              নথিসমূহ ({filteredDocs.length})
            </span>
            {activeStageFilter !== 'ALL' && (
              <button
                onClick={() => setActiveStageFilter('ALL')}
                className="text-[11px] text-blue-600 font-semibold cursor-pointer"
              >
                ফিল্টার মুছুন
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-bold text-slate-700">{doc.documentNumber || doc.memoNumber || '—'}</span>
                    <span className="font-medium text-slate-500">{doc.documentDate}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-1 mb-1.5">{doc.title}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 font-medium truncate max-w-[150px]">
                      {doc.recipientName || doc.senderName || doc.docType}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700">{doc.status}</span>
                  </div>
                </div>
              );
            })}

            {filteredDocs.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                কোনো নথি পাওয়া যায়নি।
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Document Timeline & Audit Logs (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-5">
          {selectedDoc ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-[11px] font-mono text-blue-600 font-bold">
                    {selectedDoc.documentNumber || selectedDoc.memoNumber} • {selectedDoc.docType}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedDoc.title}</h3>
                  <div className="text-xs text-slate-500 mt-1">
                    তৈরি করেছেন: <strong>{selectedDoc.createdByName || 'অ্যাডমিন'}</strong> ({selectedDoc.documentDate})
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSelectDocForPreview(selectedDoc)}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="প্রিন্ট প্রিভিউ"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট</span>
                  </button>
                  <button
                    onClick={() => onSelectDocForEdit(selectedDoc)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    সম্পাদনা
                  </button>
                </div>
              </div>

              {/* Status and Action notes */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">বর্তমান পর্যায় (Current Stage):</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedDoc.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">অগ্রাধিকার (Priority):</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedDoc.priority}</span>
                </div>
                {selectedDoc.replyRequired && (
                  <div className="col-span-2 pt-2 border-t border-slate-200 text-rose-700 flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>পত্রের উত্তর প্রয়োজন (উত্তর প্রাপ্তির ডেডলাইন: {selectedDoc.replyDeadline || 'নির্ধারিত হয়নি'})</span>
                  </div>
                )}
              </div>

              {/* Audit Trail Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>অডিট ট্রেইল ও পরিবর্তনের ইতিহাস (Audit Trail Logs)</span>
                </h4>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedDoc.auditTrail && selectedDoc.auditTrail.length > 0 ? (
                    selectedDoc.auditTrail.map((log, idx) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800">{log.performedByName || 'অ্যাডমিন'}</span>
                            <span className="text-slate-500 font-mono">
                              {new Date(log.timestamp).toLocaleString('bn-BD')}
                            </span>
                          </div>
                          <div className="text-slate-700">{log.notes || log.action}</div>
                          {log.newStatus && (
                            <div className="text-[10px] text-blue-700 font-bold">
                              স্ট্যাটাস: {log.previousStatus ? `${log.previousStatus} ➔ ` : ''}{log.newStatus}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">কোনো পরিবর্তন ইতিহাস রেকর্ড নেই।</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-400 italic text-xs">
              বাম পাশের তালিকা হতে যেকোনো একটি নথি নির্বাচন করুন।
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

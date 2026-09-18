import React, { useState } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Building,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OfficialDocument, OfficialDocumentType, OfficialDocumentStatus } from '../../types/officialDocumentTypes';
import { Mosque } from '../../types';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';

interface OfficialDocumentReportsViewProps {
  documents: OfficialDocument[];
  mosque?: Mosque | null;
  onSelectDocForPreview: (doc: OfficialDocument) => void;
}

export const OfficialDocumentReportsView: React.FC<OfficialDocumentReportsViewProps> = ({
  documents,
  mosque,
  onSelectDocForPreview,
}) => {
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Compute date range based on preset
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const getDateRange = () => {
    if (datePreset === 'TODAY') {
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === 'THIS_WEEK') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(d.setDate(diff)).toISOString().split('T')[0];
      return { start, end: todayStr };
    }
    if (datePreset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (datePreset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (datePreset === 'THIS_YEAR') {
      const start = `${now.getFullYear()}-01-01`;
      const end = `${now.getFullYear()}-12-31`;
      return { start, end };
    }
    if (datePreset === 'CUSTOM') {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: '', end: '' };
  };

  const { start, end } = getDateRange();

  // Filter docs
  const filteredDocs = documents.filter((doc) => {
    if (docTypeFilter !== 'ALL' && doc.docType !== docTypeFilter) return false;
    if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false;
    if (start && doc.documentDate < start) return false;
    if (end && doc.documentDate > end) return false;
    return true;
  });

  const handleExportExcel = () => {
    const data = filteredDocs.map((doc, idx) => ({
      'ক্রমিক': idx + 1,
      'নথির ধরন': doc.docType,
      'স্মারক / নথি নম্বর': doc.documentNumber || doc.memoNumber || '—',
      'তারিখ': doc.documentDate,
      'শিরোনাম / বিষয়': doc.title,
      'প্রাপক / প্রেরক': doc.recipientName || doc.senderName || '—',
      'বর্তমান পর্যায়': doc.status,
      'অগ্রাধিকার': doc.priority,
      'সারসংক্ষেপ': doc.summary || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Official_Doc_Report');
    XLSX.writeFile(wb, `masjidledger_official_documents_report_${datePreset.toLowerCase()}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>দাপ্তরিক নথি ও পত্রালাপ রিপোর্ট হাব (Document Reports Hub)</span>
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            নির্দিষ্ট সময়কাল অনুযায়ী সমস্ত নোটিশ, প্রেরিত-প্রাপ্ত পত্র, সনদ ও আদেশের পূর্ণাঙ্গ বিবরণী ও প্রিন্ট রিপোর্ট
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>এক্সেল রিপোর্ট (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>রিপোর্ট প্রিন্ট করুন</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1">সময়কাল নির্বাচন:</span>
          {[
            { id: 'THIS_MONTH', label: 'চলতি মাস' },
            { id: 'LAST_MONTH', label: 'গত মাস' },
            { id: 'THIS_WEEK', label: 'চলতি সপ্তাহ' },
            { id: 'TODAY', label: 'আজকের দিন' },
            { id: 'THIS_YEAR', label: 'চলতি বছর' },
            { id: 'ALL', label: 'সর্বকালের রিপোর্ট' },
            { id: 'CUSTOM', label: 'নির্দিষ্ট তারিখ' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setDatePreset(pill.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === pill.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if CUSTOM */}
        {datePreset === 'CUSTOM' && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">হতে তারিখ</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">পর্যন্ত তারিখ</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs"
              />
            </div>
          </div>
        )}

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">নথির ধরন</label>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="ALL">সকল নথির শ্রেণি</option>
              <option value="NOTICE">নোটিশ ও বিজ্ঞপ্তি</option>
              <option value="APPLICATION">দরখাস্ত ও আবেদন</option>
              <option value="ANNOUNCEMENT">ঘোষণা</option>
              <option value="OUTGOING_LETTER">প্রেরিত পত্র (স্মারক)</option>
              <option value="INCOMING_LETTER">প্রাপ্ত পত্র (ইনকামিং)</option>
              <option value="OFFICE_ORDER">অফিস আদেশ</option>
              <option value="CERTIFICATE">প্রত্যয়নপত্র ও সনদ</option>
              <option value="RECOMMENDATION">সুপারিশপত্র</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">স্ট্যাটাস</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
            >
              <option value="ALL">সকল পর্যায়</option>
              <option value="APPROVED">অনুমোদিত</option>
              <option value="SENT">প্রেরিত</option>
              <option value="DRAFT">খসড়া</option>
              <option value="REPLY_AWAITED">উত্তর অপেক্ষমাণ</option>
              <option value="RESOLVED">নিষ্পত্তি</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printable Report View (Visible on screen and optimized for paper print) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6 print:p-0 print:border-none print:shadow-none">
        
        {/* Top Mosque Letterhead */}
        <MosqueOfficialLetterhead
          mosque={mosque}
          documentTitle="দাপ্তরিক নথি ও যোগাযোগ বিবরণী রিপোর্ট"
          periodLabel={datePreset === 'THIS_MONTH' ? 'চলতি মাস' : `${start || 'শুরু'} হতে ${end || 'বর্তমান'}`}
          dateStr={todayStr}
        />

        {/* Report Stats Summary Strip */}
        <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="text-center">
            <span className="text-slate-500 block text-[10px]">মোট নথি</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{filteredDocs.length}</span>
          </div>
          <div className="text-center">
            <span className="text-emerald-700 block text-[10px]">অনুমোদিত</span>
            <span className="font-bold text-emerald-800 font-mono text-sm">
              {filteredDocs.filter(d => d.status === 'APPROVED').length}
            </span>
          </div>
          <div className="text-center">
            <span className="text-purple-700 block text-[10px]">প্রেরিত পত্র</span>
            <span className="font-bold text-purple-800 font-mono text-sm">
              {filteredDocs.filter(d => d.status === 'SENT' || d.docType === 'OUTGOING_LETTER').length}
            </span>
          </div>
          <div className="text-center">
            <span className="text-amber-700 block text-[10px]">উত্তর অপেক্ষমাণ</span>
            <span className="font-bold text-amber-800 font-mono text-sm">
              {filteredDocs.filter(d => d.status === 'REPLY_AWAITED' || d.replyRequired).length}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-800 uppercase">
                <th className="py-2.5 px-3 border-r border-slate-300">ক্রমিক</th>
                <th className="py-2.5 px-3 border-r border-slate-300">স্মারক / নথি নং</th>
                <th className="py-2.5 px-3 border-r border-slate-300">ধরন</th>
                <th className="py-2.5 px-3 border-r border-slate-300">তারিখ</th>
                <th className="py-2.5 px-3 border-r border-slate-300">বিষয় ও শিরোনাম</th>
                <th className="py-2.5 px-3 border-r border-slate-300">প্রাপক / প্রেরক</th>
                <th className="py-2.5 px-3 text-right">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDocs.map((doc, idx) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 border-r border-slate-300 font-mono text-center">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-300 font-mono font-bold text-slate-800">
                    {doc.documentNumber || doc.memoNumber || '—'}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300">{doc.docType}</td>
                  <td className="py-2 px-3 border-r border-slate-300 whitespace-nowrap">{doc.documentDate}</td>
                  <td className="py-2 px-3 border-r border-slate-300 font-medium">{doc.title}</td>
                  <td className="py-2 px-3 border-r border-slate-300">{doc.recipientName || doc.senderName || '—'}</td>
                  <td className="py-2 px-3 text-right font-bold">{doc.status}</td>
                </tr>
              ))}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    নির্বাচিত সময়কালের মধ্যে কোনো নথি নেই।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Signatures for Official Report */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="w-32 border-b border-slate-400 mb-1" />
            <div className="font-bold text-slate-900">প্রশাসনিক কর্মকর্তা / সাধারণ সম্পাদক</div>
            <div className="text-[11px] text-slate-500">{mosque?.nameBn || 'পরিচালনা পরিষদ'}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-32 border-b border-slate-400 mb-1" />
            <div className="font-bold text-slate-900">সভাপতি</div>
            <div className="text-[11px] text-slate-500">{mosque?.nameBn || 'পরিচালনা পরিষদ'}</div>
          </div>
        </div>

      </div>
    </div>
  );
};

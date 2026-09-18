import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Printer,
  Edit,
  Trash2,
  CheckCircle2,
  Send,
  Clock,
  AlertCircle,
  FileCheck,
  Calendar,
  Layers,
  ChevronDown,
  Paperclip,
  Share2,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { OfficialDocument, OfficialDocumentType, OfficialDocumentStatus } from '../../types/officialDocumentTypes';

interface OfficialDocumentListViewProps {
  title: string;
  subtitle: string;
  docTypeFilter?: OfficialDocumentType | 'ALL';
  documents: OfficialDocument[];
  onOpenCreateModal: (docType?: OfficialDocumentType) => void;
  onSelectDocForPreview: (doc: OfficialDocument) => void;
  onSelectDocForEdit: (doc: OfficialDocument) => void;
  onDeleteDocument: (docId: string) => Promise<void>;
  onUpdateStatus: (docId: string, status: OfficialDocumentStatus, notes?: string) => Promise<void>;
}

export const OfficialDocumentListView: React.FC<OfficialDocumentListViewProps> = ({
  title,
  subtitle,
  docTypeFilter = 'ALL',
  documents,
  onOpenCreateModal,
  onSelectDocForPreview,
  onSelectDocForEdit,
  onDeleteDocument,
  onUpdateStatus,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusChangeDoc, setStatusChangeDoc] = useState<OfficialDocument | null>(null);
  const [newStatus, setNewStatus] = useState<OfficialDocumentStatus>('APPROVED');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Filter Documents
  const filteredDocs = documents.filter((doc) => {
    if (docTypeFilter !== 'ALL' && doc.docType !== docTypeFilter) return false;
    if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && doc.priority !== priorityFilter) return false;
    if (startDate && doc.documentDate < startDate) return false;
    if (endDate && doc.documentDate > endDate) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        doc.title?.toLowerCase().includes(q) ||
        doc.documentNumber?.toLowerCase().includes(q) ||
        doc.memoNumber?.toLowerCase().includes(q) ||
        doc.recipientName?.toLowerCase().includes(q) ||
        doc.senderName?.toLowerCase().includes(q) ||
        doc.certificateFor?.toLowerCase().includes(q) ||
        doc.recommendationFor?.toLowerCase().includes(q) ||
        doc.summary?.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const handleExportExcel = () => {
    const dataToExport = filteredDocs.map((doc, idx) => ({
      'ক্রমিক': idx + 1,
      'নথির ধরন': doc.docType,
      'নথি / স্মারক নম্বর': doc.documentNumber || doc.memoNumber || '—',
      'বিষয় ও শিরোনাম': doc.title,
      'তারিখ': doc.documentDate,
      'প্রাপক': doc.recipientName || doc.recipientOrg || '—',
      'প্রেরক': doc.senderName || 'পরিচালনা পরিষদ',
      'স্ট্যাটাস': doc.status,
      'অগ্রাধিকার': doc.priority,
      'সারসংক্ষেপ': doc.summary || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Official_Documents');
    XLSX.writeFile(wb, `masjidledger_${docTypeFilter.toLowerCase()}_documents.xlsx`);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusChangeDoc) return;
    setUpdatingStatus(true);
    try {
      await onUpdateStatus(statusChangeDoc.id, newStatus, statusNotes);
      setStatusChangeDoc(null);
      setStatusNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getDocTypeBadge = (type: OfficialDocumentType) => {
    switch (type) {
      case 'NOTICE':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">নোটিশ</span>;
      case 'APPLICATION':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">আবেদন</span>;
      case 'ANNOUNCEMENT':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">ঘোষণা</span>;
      case 'OUTGOING_LETTER':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md">প্রেরিত পত্র</span>;
      case 'INCOMING_LETTER':
        return <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold px-2 py-0.5 rounded-md">প্রাপ্ত পত্র</span>;
      case 'OFFICE_ORDER':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">অফিস আদেশ</span>;
      case 'CERTIFICATE':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md">সনদ / প্রত্যয়ন</span>;
      case 'RECOMMENDATION':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md">সুপারিশ</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">নথি</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> অনুমোদিত</span>;
      case 'SENT':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200"><Send className="w-3 h-3" /> প্রেরিত</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"><Clock className="w-3 h-3" /> চলমান</span>;
      case 'REPLY_AWAITED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"><AlertCircle className="w-3 h-3" /> উত্তর অপেক্ষমাণ</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200"><FileCheck className="w-3 h-3" /> নিষ্পত্তি</span>;
      case 'DRAFT':
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"><Clock className="w-3 h-3" /> খসড়া</span>;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 font-normal">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>এক্সেল এক্সপোর্ট (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenCreateModal(docTypeFilter === 'ALL' ? 'NOTICE' : docTypeFilter)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="বিষয়, স্মারক নম্বর, নাম বা সারসংক্ষেপ দিয়ে খুঁজুন..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none font-medium"
            >
              <option value="ALL">সকল স্ট্যাটাস</option>
              <option value="DRAFT">খসড়া (Draft)</option>
              <option value="APPROVED">অনুমোদিত (Approved)</option>
              <option value="SENT">প্রেরিত (Sent)</option>
              <option value="REPLY_AWAITED">উত্তর অপেক্ষমাণ</option>
              <option value="IN_PROGRESS">চলমান কার্যক্রম</option>
              <option value="RESOLVED">নিষ্পন্ন (Resolved)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              placeholder="হতে তারিখ"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              placeholder="পর্যন্ত তারিখ"
            />
          </div>

        </div>

        {/* Status Quick Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1">দ্রুত ফিল্টার:</span>
          {[
            { id: 'ALL', label: 'সকল' },
            { id: 'APPROVED', label: 'অনুমোদিত' },
            { id: 'DRAFT', label: 'খসড়া' },
            { id: 'SENT', label: 'প্রেরিত' },
            { id: 'REPLY_AWAITED', label: 'উত্তর অপেক্ষমাণ' },
            { id: 'RESOLVED', label: 'নিষ্পত্তি' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400 font-medium">
            পাওয়া গেছে: <strong className="text-slate-700">{filteredDocs.length}</strong> টি নথি
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="py-3 px-3.5">ধরন</th>
                <th className="py-3 px-3.5">স্মারক / নথি নং</th>
                <th className="py-3 px-3.5">বিষয় ও শিরোনাম</th>
                <th className="py-3 px-3.5">প্রাপক / সুবিধাভোগী</th>
                <th className="py-3 px-3.5">তারিখ</th>
                <th className="py-3 px-3.5">স্ট্যাটাস</th>
                <th className="py-3 px-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    {getDocTypeBadge(doc.docType)}
                  </td>
                  <td className="py-3.5 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                    {doc.documentNumber || doc.memoNumber || '—'}
                  </td>
                  <td className="py-3.5 px-3.5 font-medium text-slate-900 max-w-sm">
                    <div className="font-semibold line-clamp-1">{doc.title}</div>
                    {doc.summary && (
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{doc.summary}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 text-slate-700 whitespace-nowrap max-w-xs truncate">
                    {doc.recipientName || doc.recipientOrg || doc.certificateFor || doc.recommendationFor || '—'}
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-600 font-medium">
                    {doc.documentDate}
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusChangeDoc(doc);
                        setNewStatus(doc.status);
                      }}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      title="স্ট্যাটাস পরিবর্তন করুন"
                    >
                      {getStatusBadge(doc.status)}
                    </button>
                  </td>
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap space-x-1">
                    <button
                      type="button"
                      onClick={() => onSelectDocForPreview(doc)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="প্রিন্ট ও প্রিভিউ"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectDocForEdit(doc)}
                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`আপনি কি নিশ্চিত যে '${doc.title}' মুছে ফেলতে চান?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    কোনো নথি পাওয়া যায়নি। নতুন নথি যোগ করতে উপরের বাটনে চাপ দিন।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Status Change Modal */}
      {statusChangeDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              নথির স্ট্যাটাস পরিবর্তন করুন (Change Status)
            </h3>
            <p className="text-xs text-slate-600">
              নথি: <strong>{statusChangeDoc.title}</strong> ({statusChangeDoc.documentNumber})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">নতুন স্ট্যাটাস</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="DRAFT">খসড়া (Draft)</option>
                <option value="UNDER_REVIEW">পর্যালোচনাধীন (Under Review)</option>
                <option value="PENDING_APPROVAL">অনুমোদন অপেক্ষমাণ (Pending Approval)</option>
                <option value="APPROVED">অনুমোদিত (Approved)</option>
                <option value="SENT">প্রেরিত (Sent)</option>
                <option value="REPLY_AWAITED">উত্তর অপেক্ষমাণ (Reply Awaited)</option>
                <option value="IN_PROGRESS">চলমান কার্যক্রম (In Progress)</option>
                <option value="RESOLVED">নিষ্পন্ন / কার্যকর (Resolved)</option>
                <option value="ARCHIVED">আর্কাইভড (Archived)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মন্তব্য বা সিদ্ধান্তের বিবরণ (ঐচ্ছিক)</label>
              <textarea
                rows={3}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="যেমন: পরিচালনা পরিষদ সভায় সর্বসম্মতভাবে অনুমোদিত..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusChangeDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={handleConfirmStatusChange}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {updatingStatus ? 'হালনাগাদ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

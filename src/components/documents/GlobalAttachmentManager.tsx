import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Paperclip,
  Upload,
  Link,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  HardDrive,
  Globe,
  FileSpreadsheet,
  Download,
  Eye,
} from 'lucide-react';
import { CentralDocument } from '../../types';
import { api } from '../../lib/api';

interface GlobalAttachmentManagerProps {
  onOpenDocument?: (doc: CentralDocument) => void;
}

export const GlobalAttachmentManager: React.FC<GlobalAttachmentManagerProps> = ({
  onOpenDocument,
}) => {
  const [documents, setDocuments] = useState<CentralDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [entityType, setEntityType] = useState('MOSQUE');
  const [documentType, setDocumentType] = useState('GENERAL_DOC');
  const [googleDriveLink, setGoogleDriveLink] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments({
        entityType: entityTypeFilter !== 'ALL' ? entityTypeFilter : undefined,
        documentType: docTypeFilter !== 'ALL' ? docTypeFilter : undefined,
        search: search.trim() || undefined,
      });
      setDocuments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [entityTypeFilter, docTypeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await api.createDocument({
        name: title.trim(),
        entityType: entityType as any,
        entityId: 'central-repo',
        entityTitle: 'কেন্দ্রীয় নথি ভাণ্ডার',
        documentType: documentType as any,
        googleDriveUrl: googleDriveLink.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        originalFileName: fileName.trim() || undefined,
        description: description.trim() || undefined,
        visibility: 'PUBLIC',
      });
      setShowAddModal(false);
      setTitle('');
      setGoogleDriveLink('');
      setFileUrl('');
      setFileName('');
      setDescription('');
      setTags('');
      loadDocuments();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি '${name}' মুছে ফেলতে চান?`)) return;
    try {
      await api.deleteDocument(id);
      loadDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-600" />
            <span>গ্লোবাল ডকুমেন্ট ও ফাইল রিপোজিটরি (Global Documents & Attachments)</span>
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            মসজিদ, কমিটি, রেজুলেশন, ওয়াকফ, খতিয়ান, ভাউচার ও সকল শাখার কেন্দ্রীয় নথি ও গুগল ড্রাইভ লিংক ভাণ্ডার
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ফাইল বা লিংক যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ফাইলের নাম, বিবরণ বা ট্যাগ দিয়ে খুঁজুন..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="ALL">সকল বিভাগ (All Entities)</option>
              <option value="MOSQUE">মসজিদ সাধারণ (Mosque General)</option>
              <option value="COMMITTEE">পরিচালনা পরিষদ (Committee)</option>
              <option value="MEETING">মিটিং ও কার্যবিবরণী (Meeting)</option>
              <option value="RESOLUTION">রেজুলেশন (Resolution)</option>
              <option value="WAQF_PROPERTY">ওয়াকফ ও জমিজমা (Waqf Property)</option>
              <option value="STAFF">কর্মী ও বেতন (Staff & Payroll)</option>
              <option value="FINANCE">আর্থিক ভাউচার ও ব্যাংক (Finance)</option>
              <option value="CEMETERY">কবরস্থান (Cemetery)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              খুঁজুন
            </button>
          </div>
        </form>
      </div>

      {/* Document Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="py-3 px-3.5">নথির শিরোনাম</th>
                <th className="py-3 px-3.5">বিভাগ / খাত</th>
                <th className="py-3 px-3.5">সংযুক্তি ধরন</th>
                <th className="py-3 px-3.5">তারিখ</th>
                <th className="py-3 px-3.5">সংযুক্তি লিংক / অ্যাকশন</th>
                <th className="py-3 px-3.5 text-right">ডিলিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3.5 font-semibold text-slate-900">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{doc.title}</span>
                    </div>
                    {doc.description && (
                      <div className="text-[10px] text-slate-500 line-clamp-1 ml-6">{doc.description}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 text-slate-700 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      {doc.entityType}
                    </span>
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    {doc.googleDriveLink ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        <HardDrive className="w-3 h-3" /> গুগল ড্রাইভ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Paperclip className="w-3 h-3" /> ফাইল
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-600">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('bn-BD') : '—'}
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    {doc.googleDriveLink ? (
                      <a
                        href={doc.googleDriveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <span>ড্রাইভ ফাইল খুলুন</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline"
                      >
                        <span>ডাউনলোড</span>
                        <Download className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">কোনো লিংক নেই</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    কোনো ডকুমেন্ট পাওয়া যায়নি। নতুন ফাইল বা লিংক যুক্ত করুন।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              নতুন ফাইল বা গুগল ড্রাইভ লিংক সংরক্ষণ করুন
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">নথির শিরোনাম *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: ওয়াকফ দলিল ও খারিজ খতিয়ান কপি"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">বিভাগ / মডিউল</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                  >
                    <option value="MOSQUE">মসজিদ সাধারণ</option>
                    <option value="COMMITTEE">পরিচালনা পরিষদ</option>
                    <option value="MEETING">মিটিং</option>
                    <option value="RESOLUTION">রেজুলেশন</option>
                    <option value="WAQF_PROPERTY">ওয়াকফ সম্পত্তি</option>
                    <option value="STAFF">কর্মী ও বেতন</option>
                    <option value="FINANCE">আর্থিক ভাউচার</option>
                    <option value="CEMETERY">কবরস্থান</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">নথির শ্রেণি</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                  >
                    <option value="DEED_RECORD">দলিল / খতিয়ান</option>
                    <option value="GENERAL_DOC">সাধারণ নথি</option>
                    <option value="FINANCIAL_REPORT">আর্থিক রিপোর্ট</option>
                    <option value="BANK_STATEMENT">ব্যাংক স্টেটমেন্ট</option>
                    <option value="RESOLUTION_COPY">রেজুলেশন কপি</option>
                    <option value="CONTRACT_AGREEMENT">চুক্তিপত্র</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">গুগল ড্রাইভ লিংক (Google Drive URL)</label>
                <input
                  type="url"
                  value={googleDriveLink}
                  onChange={(e) => setGoogleDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">সংক্ষিপ্ত বিবরণ ও ট্যাগ</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ফাইলের প্রয়োজনীয় নোট..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

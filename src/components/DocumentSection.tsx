import React, { useState, useEffect } from 'react';
import {
  Paperclip,
  Upload,
  Plus,
  FileText,
  ExternalLink,
  Eye,
  Download,
  Trash2,
  Lock,
  Globe,
  Shield,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  FileCheck,
  FileImage,
  RefreshCw,
  Edit2,
  HardDrive
} from 'lucide-react';
import {
  CentralDocument,
  DocumentEntityType,
  DocumentCategoryType,
  DocumentVisibility,
  DOCUMENT_ENTITY_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  User
} from '../types';
import { api } from '../lib/api';

interface DocumentSectionProps {
  entityType: DocumentEntityType;
  entityId: string;
  entityTitle: string;
  currentUser?: User | null;
  readOnly?: boolean;
  className?: string;
  onDocumentsChange?: () => void;
}

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  entityType,
  entityId,
  entityTitle,
  currentUser,
  readOnly = false,
  className = '',
  onDocumentsChange,
}) => {
  const [documents, setDocuments] = useState<CentralDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CentralDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<CentralDocument | null>(null);

  // Form Fields
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategoryType>('OTHER');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docVisibility, setDocVisibility] = useState<DocumentVisibility>('RESTRICTED');
  const [docDescription, setDocDescription] = useState('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const isAdmin = currentUser && (
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MOSQUE_ADMIN' ||
    currentUser.role === 'ACCOUNTANT'
  );

  const canManage = !readOnly && (isAdmin || currentUser?.role === 'COMMITTEE_MEMBER');

  // Load documents for this entity
  const fetchDocuments = async () => {
    if (!entityId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDocuments({ entityType, entityId });
      setDocuments(data);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'ডকুমেন্ট লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId]);

  const resetForm = () => {
    setDocName('');
    setDocCategory('OTHER');
    setDocDate(new Date().toISOString().split('T')[0]);
    setDocVisibility('RESTRICTED');
    setDocDescription('');
    setGoogleDriveUrl('');
    setSelectedFile(null);
    setSelectedFileBase64(null);
    setEditingDoc(null);
    setUploadProgress(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: CentralDocument) => {
    setEditingDoc(doc);
    setDocName(doc.name);
    setDocCategory(doc.documentType);
    setDocDate(doc.documentDate || doc.createdAt.split('T')[0]);
    setDocVisibility(doc.visibility);
    setDocDescription(doc.description || '');
    setGoogleDriveUrl(doc.googleDriveUrl || '');
    setSelectedFile(null);
    setSelectedFileBase64(null);
    setIsModalOpen(true);
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 12MB
    if (file.size > 12 * 1024 * 1024) {
      alert('ফাইলের আকার সর্বোচ্চ ১২ মেগাবাইট (12MB) হতে পারবে। বড় ফাইলের জন্য অনুগ্রহ করে Google Drive লিংক ব্যবহার করুন।');
      return;
    }

    setSelectedFile(file);
    if (!docName.trim()) {
      // Auto-populate name if empty
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setDocName(cleanName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Save document (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      alert('অনুগ্রহ করে ডকুমেন্টের নাম প্রদান করুন।');
      return;
    }

    if (!editingDoc && !selectedFile && !googleDriveUrl.trim() && !docDescription.trim()) {
      alert('অনুগ্রহ করে ফাইল আপলোড করুন অথবা গুগল ড্রাইভ লিংক যুক্ত করুন।');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress('সংরক্ষণ প্রক্রিয়া চলছে...');

      let uploadedFileUrl = editingDoc?.fileUrl;
      let originalFileName = editingDoc?.originalFileName;
      let fileType = editingDoc?.fileType;
      let fileSize = editingDoc?.fileSize;

      // If new file chosen, upload to server first
      if (selectedFile && selectedFileBase64) {
        setUploadProgress('ফাইল আপলোড হচ্ছে...');
        const uploadResult = await api.uploadFile({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          base64Data: selectedFileBase64,
        });

        uploadedFileUrl = uploadResult.url || `/api/v1/files/${uploadResult.id}`;
        originalFileName = uploadResult.fileName;
        fileType = uploadResult.fileType;
        fileSize = uploadResult.fileSize;
      }

      setUploadProgress('ডকুমেন্টের তথ্য রেজিস্টারে রেকর্ড করা হচ্ছে...');

      const payload = {
        name: docName.trim(),
        entityType,
        entityId,
        entityTitle,
        documentType: docCategory,
        documentTypeBn: DOCUMENT_CATEGORY_LABELS[docCategory],
        documentDate: docDate,
        visibility: docVisibility,
        description: docDescription.trim(),
        googleDriveUrl: googleDriveUrl.trim() || undefined,
        fileUrl: uploadedFileUrl,
        originalFileName,
        fileType,
        fileSize,
      };

      if (editingDoc) {
        await api.updateDocument(editingDoc.id, payload);
        setSuccessMessage('ডকুমেন্ট সফলভাবে হালনাগাদ করা হয়েছে।');
      } else {
        await api.createDocument(payload);
        setSuccessMessage('ডকুমেন্ট সফলভাবে সংযুক্ত ও সংরক্ষণ করা হয়েছে।');
      }

      setIsModalOpen(false);
      resetForm();
      fetchDocuments();
      if (onDocumentsChange) onDocumentsChange();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving document:', err);
      alert(err.message || 'ডকুমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Delete Document
  const handleDelete = async (doc: CentralDocument) => {
    const confirmDelete = window.confirm(
      `আপনি কি নিশ্চিতভাবে "${doc.name}" ডকুমেন্টটি মুছে ফেলতে চান? এটি মুছে ফেললে অডিট লগ ব্যতীত অন্যান্য স্থান থেকে অপসারিত হবে।`
    );
    if (!confirmDelete) return;

    try {
      await api.deleteDocument(doc.id);
      setSuccessMessage('ডকুমেন্ট সফলভাবে মুছে ফেলা হয়েছে।');
      fetchDocuments();
      if (onDocumentsChange) onDocumentsChange();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'ডকুমেন্ট মুছতে সমস্যা হয়েছে।');
    }
  };

  // Format file size
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="w-5 h-5 text-emerald-600" />;
    if (fileType.includes('image')) return <FileImage className="w-5 h-5 text-blue-600" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-600" />;
    if (fileType.includes('sheet') || fileType.includes('csv') || fileType.includes('excel'))
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    return <FileCheck className="w-5 h-5 text-indigo-600" />;
  };

  return (
    <div className={`border border-stone-200 rounded-xl bg-white shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-stone-900 text-sm flex items-center gap-2">
              সংযুক্ত ডকুমেন্ট ও কাগজপত্র
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-medium">
                {documents.length} টি
              </span>
            </h4>
            <p className="text-xs text-stone-500">
              ফাইল আপলোড বা Google Drive লিংকের মাধ্যমে স্থায়ী সংরক্ষণ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDocuments}
            disabled={loading}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              ডকুমেন্ট সংযুক্ত করুন
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Document List */}
      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center text-stone-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-xs">সংযুক্ত ডকুমেন্টসমূহ লোড হচ্ছে...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-7 text-center border border-dashed border-stone-200 rounded-lg bg-stone-50/60">
            <Paperclip className="w-8 h-8 mx-auto text-stone-300 mb-1.5" />
            <p className="text-sm font-medium text-stone-600">কোনো ডকুমেন্ট সংযুক্ত নেই</p>
            <p className="text-xs text-stone-400 mt-0.5">
              প্রয়োজনীয় দলিল, রসিদ, ভাউচার, চুক্তিপত্র বা Google Drive লিংক যুক্ত করুন
            </p>
            {canManage && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition"
              >
                <Upload className="w-3 h-3" /> প্রথম ডকুমেন্ট যুক্ত করুন
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group p-3 border border-stone-200 hover:border-emerald-300 rounded-lg bg-white hover:bg-emerald-50/20 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-stone-100 group-hover:bg-emerald-100 transition flex-shrink-0 mt-0.5">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-semibold text-stone-900 text-sm truncate" title={doc.name}>
                          {doc.name}
                        </h5>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-stone-500">
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                            {doc.documentTypeBn || DOCUMENT_CATEGORY_LABELS[doc.documentType] || 'নথি'}
                          </span>
                          {doc.documentDate && (
                            <span className="flex items-center gap-1 text-stone-500">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              {doc.documentDate}
                            </span>
                          )}
                          {doc.version && doc.version > 1 && (
                            <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                              v{doc.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visibility Badge */}
                    <div className="flex-shrink-0">
                      {doc.visibility === 'PRIVATE' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200" title="শুধুমাত্র অ্যাডমিন">
                          <Lock className="w-2.5 h-2.5" /> প্রাইভেট
                        </span>
                      ) : doc.visibility === 'PUBLIC' ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title="পাবলিক">
                          <Globe className="w-2.5 h-2.5" /> পাবলিক
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200" title="সীমিত অ্যাক্সেস">
                          <Shield className="w-2.5 h-2.5" /> অভ্যন্তরীণ
                        </span>
                      )}
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-stone-600 mt-2 line-clamp-2 bg-stone-50 p-1.5 rounded">
                      {doc.description}
                    </p>
                  )}

                  {/* Attachment indicators */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-stone-100 text-[11px]">
                    {doc.fileUrl && (
                      <span className="inline-flex items-center gap-1 text-stone-600 font-medium">
                        <Upload className="w-3 h-3 text-emerald-600" />
                        {doc.originalFileName || 'সরাসরি ফাইল'} {formatBytes(doc.fileSize) && `(${formatBytes(doc.fileSize)})`}
                      </span>
                    )}
                    {doc.googleDriveUrl && (
                      <a
                        href={doc.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        <HardDrive className="w-3 h-3 text-blue-600" /> Google Drive লিংক
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1">
                    {doc.fileUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition"
                          title="প্রিভিউ দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-500" /> দেখুন
                        </button>
                        <a
                          href={doc.fileUrl}
                          download={doc.originalFileName || doc.name}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition"
                          title="ডাউনলোড করুন"
                        >
                          <Download className="w-3.5 h-3.5 text-stone-500" /> ডাউনলোড
                        </a>
                      </>
                    )}
                    {doc.googleDriveUrl && !doc.fileUrl && (
                      <a
                        href={doc.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> ড্রাইভে খুলুন
                      </a>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(doc)}
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                        title="সম্পাদনা"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <Paperclip className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingDoc ? 'ডকুমেন্ট তথ্য সম্পাদনা' : 'নতুন ডকুমেন্ট সংযুক্তকরণ'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {entityTitle} ({DOCUMENT_ENTITY_LABELS[entityType]})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Document Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ডকুমেন্টের নাম / শিরোনাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="উদাঃ জমির মূল দলিল, এনআইডি কপি, ভাউচার #১০২"
                  required
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    ডকুমেন্টের ধরন / ক্যাটাগরি
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as DocumentCategoryType)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  >
                    {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    নথির তারিখ
                  </label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Visibility / Privacy */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  গোপনীয়তা ও অ্যাক্সেস লেভেল
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-xs transition ${
                      docVisibility === 'RESTRICTED'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-medium'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={docVisibility === 'RESTRICTED'}
                      onChange={() => setDocVisibility('RESTRICTED')}
                      className="text-emerald-600"
                    />
                    <span>সীমিত (অভ্যন্তরীণ)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-xs transition ${
                      docVisibility === 'PRIVATE'
                        ? 'border-rose-600 bg-rose-50/50 text-rose-900 font-medium'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={docVisibility === 'PRIVATE'}
                      onChange={() => setDocVisibility('PRIVATE')}
                      className="text-rose-600"
                    />
                    <span>প্রাইভেট (অ্যাডমিন)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-xs transition ${
                      docVisibility === 'PUBLIC'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={docVisibility === 'PUBLIC'}
                      onChange={() => setDocVisibility('PUBLIC')}
                      className="text-blue-600"
                    />
                    <span>পাবলিক (সর্বসাধারণ)</span>
                  </label>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  {docVisibility === 'PRIVATE' && '🔒 শুধুমাত্র মসজিদ অ্যাডমিন ও অ্যাকাউন্ট্যান্ট দেখতে পারবেন।'}
                  {docVisibility === 'RESTRICTED' && '🛡️ মসজিদের সকল লগইনকৃত পরিচালনা সদস্য দেখতে পারবেন।'}
                  {docVisibility === 'PUBLIC' && '🌐 পাবলিক পোর্টালেও দৃশ্যমান থাকবে।'}
                </p>
              </div>

              {/* File Upload Option */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    সরাসরি ফাইল আপলোড (PDF, ছবি, ডকুমেন্ট)
                  </span>
                  {editingDoc?.fileUrl && !selectedFile && (
                    <span className="text-[11px] text-emerald-700 font-medium">
                      বর্তমান ফাইল সংরক্ষিত আছে
                    </span>
                  )}
                </div>

                <div className="relative border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-lg p-3 text-center bg-white transition cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-stone-400 mb-1" />
                    {selectedFile ? (
                      <div className="text-xs">
                        <span className="font-semibold text-emerald-700">{selectedFile.name}</span>{' '}
                        <span className="text-stone-400">({formatBytes(selectedFile.size)})</span>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600">
                        ফাইল সিলেক্ট করতে ক্লিক করুন অথবা ড্র্যাগ করে আনুন (সর্বোচ্চ ১২MB)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Google Drive Link Option */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                    Google Drive লিংক (বড় ফাইল বা ক্লাউড ড্রাইভের জন্য)
                  </label>
                </div>
                <input
                  type="url"
                  value={googleDriveUrl}
                  onChange={(e) => setGoogleDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                />
                <p className="text-[10px] text-stone-500">
                  💡 পরামর্শ: গুগল ড্রাইভে ফাইলটির শেয়ারিং অপশনে &quot;Anyone with the link can view&quot; চালু রাখুন যাতে সংশ্লিষ্ট ব্যক্তিরা সহজেই দেখতে পারেন।
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  সংক্ষিপ্ত বিবরণ বা নোট (ঐচ্ছিক)
                </label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  rows={2}
                  placeholder="নথি সম্পর্কিত প্রয়োজনীয় তথ্য, সারসংক্ষেপ বা মন্তব্য..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Progress */}
              {uploadProgress && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> সংরক্ষণ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {editingDoc ? 'হালনাগাদ সম্পন্ন করুন' : 'ডকুমেন্ট সংরক্ষণ করুন'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <h4 className="font-semibold text-sm truncate">{previewDoc.name}</h4>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.originalFileName || previewDoc.name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded transition"
                  >
                    <Download className="w-3.5 h-3.5" /> ডাউনলোড
                  </a>
                )}
                {previewDoc.googleDriveUrl && (
                  <a
                    href={previewDoc.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition"
                  >
                    <HardDrive className="w-3.5 h-3.5" /> Google Drive
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-stone-400 hover:text-white p-1 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[75vh] overflow-y-auto flex flex-col items-center justify-center bg-stone-100">
              {previewDoc.fileUrl && previewDoc.fileType?.includes('image') ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.name}
                  className="max-h-[65vh] max-w-full rounded-lg shadow object-contain"
                />
              ) : previewDoc.fileUrl && previewDoc.fileType?.includes('pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.name}
                  className="w-full h-[65vh] rounded-lg border border-stone-300"
                />
              ) : (
                <div className="py-12 text-center">
                  <FileText className="w-16 h-16 mx-auto text-stone-400 mb-3" />
                  <p className="font-medium text-stone-800 text-sm">{previewDoc.name}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {previewDoc.originalFileName || 'সংরক্ষিত ফাইল'} {formatBytes(previewDoc.fileSize) && `• ${formatBytes(previewDoc.fileSize)}`}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl}
                        download={previewDoc.originalFileName || previewDoc.name}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
                      >
                        <Download className="w-4 h-4" /> ডাউনলোড করে দেখুন
                      </a>
                    )}
                    {previewDoc.googleDriveUrl && (
                      <a
                        href={previewDoc.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" /> Google Drive-এ খুলুন
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {previewDoc.description && (
              <div className="px-5 py-3 bg-white border-t border-stone-200">
                <span className="text-xs font-semibold text-stone-700">সংক্ষিপ্ত বিবরণ:</span>
                <p className="text-xs text-stone-600 mt-0.5">{previewDoc.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

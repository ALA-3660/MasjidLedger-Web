import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Upload,
  ExternalLink,
  Eye,
  Download,
  Trash2,
  Lock,
  Globe,
  Shield,
  Calendar,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  FileSpreadsheet,
  FileImage,
  FileCheck,
  Edit2,
  X,
  Layers,
  FolderOpen,
  PieChart,
  Grid,
  List,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  CentralDocument,
  DocumentEntityType,
  DocumentCategoryType,
  DocumentVisibility,
  DOCUMENT_ENTITY_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  Mosque,
  User,
} from '../types';
import { api } from '../lib/api';
import { printElement } from '../lib/printUtils';

interface DocumentCenterProps {
  currentMosque: Mosque;
  currentUser: User | null;
}

export const DocumentCenter: React.FC<DocumentCenterProps> = ({
  currentMosque,
  currentUser,
}) => {
  // State
  const [documents, setDocuments] = useState<CentralDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('ALL');
  const [selectedAttachmentType, setSelectedAttachmentType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Stats
  const [stats, setStats] = useState<{
    totalDocuments: number;
    totalDirectFiles: number;
    totalGoogleDriveLinks: number;
    totalBothAttachments: number;
    totalStorageBytes: number;
    byEntityType: Record<string, number>;
    byDocumentType: Record<string, number>;
  }>({
    totalDocuments: 0,
    totalDirectFiles: 0,
    totalGoogleDriveLinks: 0,
    totalBothAttachments: 0,
    totalStorageBytes: 0,
    byEntityType: {},
    byDocumentType: {},
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CentralDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<CentralDocument | null>(null);

  // Form state
  const [docName, setDocName] = useState('');
  const [docEntityType, setDocEntityType] = useState<DocumentEntityType>('OTHER');
  const [docEntityId, setDocEntityId] = useState('GEN-01');
  const [docEntityTitle, setDocEntityTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategoryType>('OTHER');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docVisibility, setDocVisibility] = useState<DocumentVisibility>('RESTRICTED');
  const [docDescription, setDocDescription] = useState('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const isAdmin = currentUser && (
    currentUser.role === 'SUPER_ADMIN' ||
    currentUser.role === 'MOSQUE_ADMIN' ||
    currentUser.role === 'ACCOUNTANT'
  );

  // Load documents and stats
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docs, docStats] = await Promise.all([
        api.getDocuments({
          entityType: selectedEntity !== 'ALL' ? selectedEntity : undefined,
          documentType: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          visibility: selectedVisibility !== 'ALL' ? selectedVisibility : undefined,
          search: searchQuery.trim() || undefined,
          hasFile: selectedAttachmentType === 'FILE' || selectedAttachmentType === 'BOTH' ? true : undefined,
          hasDriveLink: selectedAttachmentType === 'DRIVE' || selectedAttachmentType === 'BOTH' ? true : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sortBy,
        }),
        api.getDocumentStats(),
      ]);
      setDocuments(docs);
      setStats(docStats);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setError(err.message || 'ডকুমেন্টসমূহ লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEntity, selectedCategory, selectedVisibility, selectedAttachmentType, sortBy, startDate, endDate]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetForm = () => {
    setDocName('');
    setDocEntityType('OTHER');
    setDocEntityId(`REC-${Date.now().toString().slice(-4)}`);
    setDocEntityTitle('সাধারণ মসজিদ নথি');
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
    setDocEntityType(doc.entityType);
    setDocEntityId(doc.entityId);
    setDocEntityTitle(doc.entityTitle);
    setDocCategory(doc.documentType);
    setDocDate(doc.documentDate || doc.createdAt.split('T')[0]);
    setDocVisibility(doc.visibility);
    setDocDescription(doc.description || '');
    setGoogleDriveUrl(doc.googleDriveUrl || '');
    setSelectedFile(null);
    setSelectedFileBase64(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert('ফাইলের আকার সর্বোচ্চ ১২ মেগাবাইট (12MB) হতে পারবে। বড় ফাইলের জন্য Google Drive লিংক ব্যবহার করুন।');
      return;
    }

    setSelectedFile(file);
    if (!docName.trim()) {
      setDocName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      alert('অনুগ্রহ করে ডকুমেন্টের নাম প্রদান করুন।');
      return;
    }

    if (!editingDoc && !selectedFile && !googleDriveUrl.trim() && !docDescription.trim()) {
      alert('অনুগ্রহ করে ফাইল আপলোড করুন অথবা গুগল ড্রাইভ লিংক অথবা বিবরণ যুক্ত করুন।');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress('সংরক্ষণ প্রক্রিয়া চলছে...');

      let uploadedFileUrl = editingDoc?.fileUrl;
      let originalFileName = editingDoc?.originalFileName;
      let fileType = editingDoc?.fileType;
      let fileSize = editingDoc?.fileSize;

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
        entityType: docEntityType,
        entityId: docEntityId.trim() || 'GEN-01',
        entityTitle: docEntityTitle.trim() || DOCUMENT_ENTITY_LABELS[docEntityType] || 'রেকর্ড',
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
        setSuccessMessage('ডকুমেন্ট সফলভাবে রেজিস্টারে সংযুক্ত করা হয়েছে।');
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving document:', err);
      alert(err.message || 'ডকুমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (doc: CentralDocument) => {
    const confirmDelete = window.confirm(
      `আপনি কি নিশ্চিতভাবে "${doc.name}" ডকুমেন্টটি মুছে ফেলতে চান? এটি মুছে ফেললে অডিট লগ ব্যতীত অন্যান্য স্থান থেকে অপসারিত হবে।`
    );
    if (!confirmDelete) return;

    try {
      await api.deleteDocument(doc.id);
      setSuccessMessage('ডকুমেন্ট সফলভাবে মুছে ফেলা হয়েছে।');
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'ডকুমেন্ট মুছতে সমস্যা হয়েছে।');
    }
  };

  // Format bytes
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '০ B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Icon selector
  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="w-4 h-4 text-emerald-600" />;
    if (fileType.includes('image')) return <FileImage className="w-4 h-4 text-blue-600" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-rose-600" />;
    if (fileType.includes('sheet') || fileType.includes('csv') || fileType.includes('excel'))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    return <FileCheck className="w-4 h-4 text-indigo-600" />;
  };

  // Handle Register Print
  const handlePrintRegister = async () => {
    const target = document.getElementById('central-document-register-print');
    if (target) {
      await printElement(target, {
        title: `মসজিদ_ডকুমেন্ট_রেজিস্টার_${currentMosque?.name || 'মসজিদ'}`,
        pageSize: 'A4',
        pageOrientation: 'landscape',
        margin: '8mm 10mm',
      });
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                কেন্দ্রীয় ডকুমেন্ট ও ফাইল সেন্টার
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  {stats.totalDocuments} টি নথি
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                মসজিদের সদস্য, ওয়াকফ, ব্যয় ভাউচার, কমিটি রেজুলেশনসহ সকল মডিউলের নথি সংরক্ষণাগার
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handlePrintRegister}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-stone-500" />
            ডকুমেন্ট রেজিস্টার প্রিন্ট
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              নতুন ডকুমেন্ট যুক্ত করুন
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2.5 animate-in fade-in duration-150 print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2.5 print:hidden">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>সর্বমোট সংরক্ষিত নথি</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{stats.totalDocuments}</p>
          <p className="text-[11px] text-stone-400 mt-1">সকল মডিউলে সংরক্ষিত</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>সরাসরি আপলোডকৃত ফাইল</span>
            <Upload className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{stats.totalDirectFiles}</p>
          <p className="text-[11px] text-stone-400 mt-1">PDF, ছবি, স্প্রেডশীট নথি</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>Google Drive লিংক</span>
            <HardDrive className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{stats.totalGoogleDriveLinks}</p>
          <p className="text-[11px] text-stone-400 mt-1">ক্লাউড ড্রাইভ লিংকযুক্ত</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
            <span>মোট ব্যবহৃত স্টোরেজ</span>
            <PieChart className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900">{formatBytes(stats.totalStorageBytes)}</p>
          <p className="text-[11px] text-stone-400 mt-1">সরাসরি ফাইল স্টোরেজ আকার</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ডকুমেন্টের নাম, ফাইলের নাম, মডিউল বা ব্যক্তির নাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Module / Entity Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-medium text-stone-700"
            >
              <option value="ALL">সকল মডিউল (All Modules)</option>
              {Object.entries(DOCUMENT_ENTITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-medium text-stone-700"
            >
              <option value="ALL">সকল নথির ধরন (All Types)</option>
              {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By & View Toggle */}
          <div className="md:col-span-2 flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-stone-700"
            >
              <option value="newest">নতুন আগে</option>
              <option value="oldest">পুরাতন আগে</option>
              <option value="name">নাম অনুসারে</option>
            </select>

            <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden p-0.5 bg-stone-50">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-emerald-800' : 'text-stone-400 hover:text-stone-700'
                }`}
                title="টেবিল ভিউ"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-emerald-800' : 'text-stone-400 hover:text-stone-700'
                }`}
                title="গ্রিড ভিউ"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Visibility & Attachment Type & Date Range */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-stone-500 font-medium">সংযুক্তি:</span>
            {[
              { id: 'ALL', label: 'সব' },
              { id: 'FILE', label: 'শুধুমাত্র ফাইল' },
              { id: 'DRIVE', label: 'Google Drive' },
              { id: 'BOTH', label: 'উভয় সংযুক্ত' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedAttachmentType(item.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  selectedAttachmentType === item.id
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-500">অ্যাক্সেস:</span>
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value)}
                className="px-2 py-1 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 outline-none"
              >
                <option value="ALL">সব লেভেল</option>
                <option value="RESTRICTED">সীমিত (অভ্যন্তরীণ)</option>
                <option value="PRIVATE">প্রাইভেট (অ্যাডমিন)</option>
                <option value="PUBLIC">পাবলিক (উন্মুক্ত)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-stone-500">
              <span>তারিখ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 outline-none"
              />
              <span>থেকে</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-stone-300 rounded-lg bg-white text-stone-700 outline-none"
              />
              {(startDate || endDate || selectedEntity !== 'ALL' || selectedCategory !== 'ALL' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedEntity('ALL');
                    setSelectedCategory('ALL');
                    setSelectedVisibility('ALL');
                    setSelectedAttachmentType('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-rose-600 hover:underline font-medium ml-1"
                >
                  ফিল্টার মুছুন
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block p-6 mb-4 text-center border-b-2 border-stone-800">
        <p className="text-xs text-stone-600 mb-1">বিসমিল্লাহির রাহমানির রাহিম</p>
        <h1 className="text-2xl font-bold text-stone-950">{currentMosque.name}</h1>
        <p className="text-xs text-stone-600">{currentMosque.address}</p>
        <div className="my-2 border-t border-stone-400 pt-2">
          <h2 className="text-lg font-bold text-stone-900">কেন্দ্রীয় ডকুমেন্ট ও ফাইল রেজিস্টার (Document Register)</h2>
          <p className="text-xs text-stone-600">
            মুদ্রণ তারিখ: {new Date().toLocaleDateString('bn-BD')} | মোট রেকর্ড: {documents.length} টি
            {selectedEntity !== 'ALL' && ` | মডিউল: ${DOCUMENT_ENTITY_LABELS[selectedEntity as DocumentEntityType] || selectedEntity}`}
          </p>
        </div>
      </div>

      {/* DOCUMENT LIST / TABLE */}
      {loading ? (
        <div className="py-16 text-center text-stone-400 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-stone-200">
          <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">ডকুমেন্ট রেজিস্টার লোড হচ্ছে...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-2xl border border-stone-200 p-6">
          <FileText className="w-12 h-12 mx-auto text-stone-300 mb-2" />
          <h3 className="text-base font-semibold text-stone-800">কোনো ডকুমেন্ট পাওয়া যায়নি</h3>
          <p className="text-xs text-stone-500 mt-1">
            আপনার নির্বাচিত ফিল্টারে কোনো সংরক্ষিত ডকুমেন্ট নেই অথবা এখনো কোনো নথি আপলোড করা হয়নি।
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition shadow-xs"
            >
              <Plus className="w-4 h-4" /> প্রথম ডকুমেন্ট যুক্ত করুন
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">ক্রমিক</th>
                  <th className="py-3 px-4">ডকুমেন্টের নাম ও ধরন</th>
                  <th className="py-3 px-4">সম্পর্কিত মডিউল ও রেকর্ড</th>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">সংযুক্তি ফাইল ও ড্রাইভ</th>
                  <th className="py-3 px-4">অ্যাক্সেস</th>
                  <th className="py-3 px-4 text-right print:hidden">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {documents.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-stone-50/70 transition group">
                    <td className="py-3 px-4 text-center font-medium text-stone-500">
                      {idx + 1}
                    </td>

                    {/* Name & Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-stone-100 text-stone-700 mt-0.5 flex-shrink-0 group-hover:bg-emerald-100 transition">
                          {getFileIcon(doc.fileType)}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 text-sm">{doc.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-stone-500">
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                              {doc.documentTypeBn || DOCUMENT_CATEGORY_LABELS[doc.documentType] || 'নথি'}
                            </span>
                            {doc.version && doc.version > 1 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-medium text-[10px] border border-amber-200">
                                v{doc.version}
                              </span>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-[11px] text-stone-500 mt-1 line-clamp-1 italic">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Entity Info */}
                    <td className="py-3 px-4">
                      <div className="text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          {DOCUMENT_ENTITY_LABELS[doc.entityType] || doc.entityType}
                        </span>
                        <p className="font-medium text-stone-800 mt-1">{doc.entityTitle}</p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{doc.documentDate || doc.createdAt.split('T')[0]}</span>
                      </div>
                    </td>

                    {/* Attachments */}
                    <td className="py-3 px-4">
                      <div className="space-y-1 text-xs">
                        {doc.fileUrl ? (
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <Upload className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate max-w-[150px] font-medium" title={doc.originalFileName}>
                              {doc.originalFileName || 'সরাসরি ফাইল'}
                            </span>
                            {doc.fileSize && (
                              <span className="text-stone-400 text-[10px]">({formatBytes(doc.fileSize)})</span>
                            )}
                          </div>
                        ) : null}

                        {doc.googleDriveUrl ? (
                          <div>
                            <a
                              href={doc.googleDriveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline text-[11px]"
                            >
                              <HardDrive className="w-3 h-3 text-blue-600 flex-shrink-0" />
                              <span>Google Drive লিংক</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        ) : null}

                        {!doc.fileUrl && !doc.googleDriveUrl && (
                          <span className="text-stone-400 text-[11px]">শুধুমাত্র বিবরণ রেকর্ড</span>
                        )}
                      </div>
                    </td>

                    {/* Visibility */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {doc.visibility === 'PRIVATE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <Lock className="w-3 h-3" /> প্রাইভেট
                        </span>
                      ) : doc.visibility === 'PUBLIC' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Globe className="w-3 h-3" /> পাবলিক
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Shield className="w-3 h-3" /> সীমিত
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                      <div className="flex items-center justify-end gap-1">
                        {doc.fileUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 text-stone-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                              title="প্রিভিউ দেখুন"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={doc.fileUrl}
                              download={doc.originalFileName || doc.name}
                              className="p-1.5 text-stone-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                              title="ডাউনলোড করুন"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        )}

                        {doc.googleDriveUrl && !doc.fileUrl && (
                          <a
                            href={doc.googleDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                            title="গুগল ড্রাইভে দেখুন"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(doc)}
                              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-stone-100 group-hover:bg-emerald-100 transition flex-shrink-0 mt-0.5">
                      {getFileIcon(doc.fileType)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 text-sm truncate" title={doc.name}>
                        {doc.name}
                      </h4>
                      <p className="text-xs text-stone-500 truncate mt-0.5 font-medium">
                        {doc.entityTitle}
                      </p>
                    </div>
                  </div>

                  {doc.visibility === 'PRIVATE' ? (
                    <span className="p-1 rounded bg-rose-50 text-rose-700 border border-rose-200" title="প্রাইভেট">
                      <Lock className="w-3 h-3" />
                    </span>
                  ) : doc.visibility === 'PUBLIC' ? (
                    <span className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="পাবলিক">
                      <Globe className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="p-1 rounded bg-blue-50 text-blue-700 border border-blue-200" title="সীমিত">
                      <Shield className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                    {DOCUMENT_ENTITY_LABELS[doc.entityType] || doc.entityType}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium">
                    {doc.documentTypeBn || DOCUMENT_CATEGORY_LABELS[doc.documentType] || 'নথি'}
                  </span>
                  {doc.documentDate && (
                    <span className="flex items-center gap-1 text-stone-400 ml-auto text-[11px]">
                      <Calendar className="w-3 h-3" />
                      {doc.documentDate}
                    </span>
                  )}
                </div>

                {doc.description && (
                  <p className="text-xs text-stone-600 mt-2.5 bg-stone-50 p-2 rounded-lg line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1 text-xs">
                  {doc.fileUrl && (
                    <div className="flex items-center gap-1.5 text-stone-600 font-medium">
                      <Upload className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{doc.originalFileName || 'সরাসরি ফাইল'}</span>
                      {doc.fileSize && <span className="text-stone-400 text-[10px]">({formatBytes(doc.fileSize)})</span>}
                    </div>
                  )}
                  {doc.googleDriveUrl && (
                    <a
                      href={doc.googleDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-[11px] hover:underline"
                    >
                      <HardDrive className="w-3 h-3 text-blue-600 flex-shrink-0" />
                      Google Drive লিংক
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Grid Footer Actions */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100">
                <div className="flex items-center gap-1.5">
                  {doc.fileUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-500" /> দেখুন
                      </button>
                      <a
                        href={doc.fileUrl}
                        download={doc.originalFileName || doc.name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> ড্রাইভে খুলুন
                    </a>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(doc)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                      title="সম্পাদনা"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

      {/* PRINT-ONLY SIGNATURE SECTION */}
      <div className="hidden print:flex justify-between items-end mt-16 pt-8 px-6 text-xs text-stone-800">
        <div className="text-center border-t border-stone-800 pt-2 w-48">
          <p className="font-semibold">ডকুমেন্ট সংরক্ষক</p>
          <p className="text-[10px] text-stone-500 mt-1">স্বাক্ষর ও তারিখ</p>
        </div>
        <div className="text-center border-t border-stone-800 pt-2 w-48">
          <p className="font-semibold">হিসাবরক্ষক / কোষাধ্যক্ষ</p>
          <p className="text-[10px] text-stone-500 mt-1">স্বাক্ষর ও তারিখ</p>
        </div>
        <div className="text-center border-t border-stone-800 pt-2 w-48">
          <p className="font-semibold">সাধারণ সম্পাদক / সভাপতি</p>
          <p className="text-[10px] text-stone-500 mt-1">স্বাক্ষর ও সিল</p>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingDoc ? 'ডকুমেন্ট তথ্য হালনাগাদ' : 'নতুন ডকুমেন্ট সংরক্ষণ ও রেজিস্ট্রি'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    মসজিদের যেকোনো মডিউলে বা কেন্দ্রীয়ভাবে নথি যুক্ত করুন
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
                  placeholder="উদাঃ মসজিদের প্রধান দলিল, ওয়াকফ গেজেট, জানুয়ারির অডিট রিপোর্ট"
                  required
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Entity Type & Target Record Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    সম্পর্কিত মডিউল <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={docEntityType}
                    onChange={(e) => setDocEntityType(e.target.value as DocumentEntityType)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-medium text-stone-700"
                  >
                    {Object.entries(DOCUMENT_ENTITY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    সম্পর্কিত ব্যক্তি বা রেকর্ডের নাম
                  </label>
                  <input
                    type="text"
                    value={docEntityTitle}
                    onChange={(e) => setDocEntityTitle(e.target.value)}
                    placeholder="উদাঃ ১৯ শতক ওয়াকফ জমি / মো: রফিকুল ইসলাম"
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
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
                      name="modal-visibility"
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
                      name="modal-visibility"
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
                      name="modal-visibility"
                      checked={docVisibility === 'PUBLIC'}
                      onChange={() => setDocVisibility('PUBLIC')}
                      className="text-blue-600"
                    />
                    <span>পাবলিক (উন্মুক্ত)</span>
                  </label>
                </div>
              </div>

              {/* Direct File Upload */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    সরাসরি ফাইল আপলোড (PDF, ছবি, ডকুমেন্ট)
                  </span>
                  {editingDoc?.fileUrl && !selectedFile && (
                    <span className="text-[11px] text-emerald-700 font-medium">
                      বর্তমান ফাইল বহাল আছে
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

              {/* Google Drive Link */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <label className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                  Google Drive লিংক (বড় ফাইল বা ক্লাউড ড্রাইভের জন্য)
                </label>
                <input
                  type="url"
                  value={googleDriveUrl}
                  onChange={(e) => setGoogleDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                />
                <p className="text-[10px] text-stone-500">
                  💡 পরামর্শ: গুগল ড্রাইভে ফাইলটির শেয়ারিং অপশনে &quot;Anyone with the link can view&quot; চালু রাখুন যাতে সংশ্লিষ্ট ব্যক্তিরা সহজে দেখতে পারেন।
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
                  placeholder="নথি সম্পর্কিত প্রয়োজনীয় তথ্য বা মন্তব্য..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

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

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{previewDoc.name}</h4>
                  <p className="text-xs text-stone-400 truncate">
                    {previewDoc.entityTitle} • {DOCUMENT_ENTITY_LABELS[previewDoc.entityType] || previewDoc.entityType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.originalFileName || previewDoc.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" /> ডাউনলোড
                  </a>
                )}
                {previewDoc.googleDriveUrl && (
                  <a
                    href={previewDoc.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition"
                  >
                    <HardDrive className="w-3.5 h-3.5" /> Google Drive
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition"
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
                  <p className="font-bold text-stone-800 text-base">{previewDoc.name}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    {previewDoc.originalFileName || 'সংরক্ষিত ফাইল'} {formatBytes(previewDoc.fileSize) && `• ${formatBytes(previewDoc.fileSize)}`}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl}
                        download={previewDoc.originalFileName || previewDoc.name}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                      >
                        <Download className="w-4 h-4" /> ফাইলটি ডাউনলোড করুন
                      </a>
                    )}
                    {previewDoc.googleDriveUrl && (
                      <a
                        href={previewDoc.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                      >
                        <ExternalLink className="w-4 h-4" /> Google Drive-এ খুলুন
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {previewDoc.description && (
              <div className="px-6 py-3 bg-white border-t border-stone-200">
                <span className="text-xs font-bold text-stone-700">সংক্ষিপ্ত বিবরণ:</span>
                <p className="text-xs text-stone-600 mt-0.5">{previewDoc.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Printable Document Register (A4 Landscape) */}
      <div id="central-document-register-print" className="hidden print:block p-6 bg-white text-stone-900 font-sans">
        {/* Letterhead */}
        <div className="text-center pb-4 border-b-2 border-stone-900 mb-4">
          <div className="text-center font-arabic text-sm text-stone-700 mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <h1 className="text-2xl font-bold font-siliguri text-stone-900 tracking-tight">
            {currentMosque?.name || 'মামুন জামে মসজিদ ওয়াক্ফ এস্টেট'}
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            {currentMosque?.address || 'মিরপুর, ঢাকা-১২১৬, বাংলাদেশ'}
            {currentMosque?.phone && <span> • ফোন: {currentMosque.phone}</span>}
            {currentMosque?.email && <span> • ইমেইল: {currentMosque.email}</span>}
          </p>
          <div className="mt-2 inline-block px-5 py-1 bg-stone-900 text-white text-xs font-bold rounded">
            কেন্দ্রীয় নথি ও ফাইল রেজিস্টার (Official Document Register)
          </div>
        </div>

        {/* Meta summary */}
        <div className="flex justify-between items-center text-xs text-stone-700 py-2 border-b border-stone-300 mb-4">
          <div>
            <span className="font-bold">মোট নথি সংখ্যা:</span> {documents.length} টি
            {selectedEntity !== 'ALL' && (
              <span className="ml-3">
                <span className="font-bold">মডিউল:</span> {DOCUMENT_ENTITY_LABELS[selectedEntity as DocumentEntityType] || selectedEntity}
              </span>
            )}
          </div>
          <div>
            <span className="font-bold">মুদ্রণ তারিখ:</span> {new Date().toLocaleDateString('bn-BD')}
          </div>
        </div>

        {/* Table of Documents */}
        <table className="w-full text-xs border-collapse border border-stone-800" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-stone-100 border-b border-stone-800 font-bold text-stone-900">
              <th className="p-2 border-r border-stone-400 text-center" style={{ width: '5%' }}>ক্র.নং</th>
              <th className="p-2 border-r border-stone-400 text-left" style={{ width: '25%' }}>ডকুমেন্ট / ফাইলের নাম</th>
              <th className="p-2 border-r border-stone-400 text-left" style={{ width: '15%' }}>মডিউল ও উৎস</th>
              <th className="p-2 border-r border-stone-400 text-left" style={{ width: '15%' }}>নথির ধরন</th>
              <th className="p-2 border-r border-stone-400 text-center" style={{ width: '12%' }}>সংযুক্তির তারিখ</th>
              <th className="p-2 border-r border-stone-400 text-center" style={{ width: '13%' }}>সংযুক্তি মাধ্যম</th>
              <th className="p-2 text-center" style={{ width: '15%' }}>গোপনীয়তা স্তর</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300">
            {documents.map((doc, idx) => (
              <tr key={doc.id} className="hover:bg-stone-50">
                <td className="p-2 border-r border-stone-300 text-center font-bold">{idx + 1}</td>
                <td className="p-2 border-r border-stone-300 font-medium">
                  <div className="font-bold text-stone-900">{doc.name}</div>
                  {doc.originalFileName && (
                    <div className="text-[10px] text-stone-500 truncate">{doc.originalFileName}</div>
                  )}
                </td>
                <td className="p-2 border-r border-stone-300">
                  <div className="font-semibold text-stone-800">{DOCUMENT_ENTITY_LABELS[doc.entityType] || doc.entityType}</div>
                  <div className="text-[10px] text-stone-500 truncate">{doc.entityTitle}</div>
                </td>
                <td className="p-2 border-r border-stone-300 font-medium">
                  {doc.documentTypeBn || DOCUMENT_CATEGORY_LABELS[doc.documentType] || doc.documentType}
                </td>
                <td className="p-2 border-r border-stone-300 text-center font-mono">
                  {doc.documentDate || doc.createdAt?.split('T')[0]}
                </td>
                <td className="p-2 border-r border-stone-300 text-center text-[10px]">
                  {doc.fileUrl && doc.googleDriveUrl ? (
                    <span className="font-bold text-indigo-700">ফাইল + ড্রাইভ</span>
                  ) : doc.fileUrl ? (
                    <span className="font-semibold text-emerald-700">সরাসরি ফাইল</span>
                  ) : doc.googleDriveUrl ? (
                    <span className="font-semibold text-blue-700">Google Drive</span>
                  ) : (
                    <span className="text-stone-400">তথ্য নথি</span>
                  )}
                </td>
                <td className="p-2 text-center text-[11px] font-semibold">
                  {doc.visibility === 'PUBLIC' ? 'সার্বজনীন' : doc.visibility === 'RESTRICTED' ? 'কমিটি সীমিত' : 'গোপনীয় / এডমিন'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="pt-16 grid grid-cols-3 gap-6 text-center text-xs font-siliguri text-stone-800 break-inside-avoid mt-8">
          <div>
            <div className="border-t border-stone-500 w-40 mx-auto pt-1 font-bold">ডকুমেন্ট ইনচার্জ / খতিব</div>
          </div>
          <div>
            <div className="border-t border-stone-500 w-40 mx-auto pt-1 font-bold">সাধারণ সম্পাদক</div>
          </div>
          <div>
            <div className="border-t border-stone-500 w-40 mx-auto pt-1 font-bold">সভাপতি / মোতাওয়াল্লী</div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-[10px] text-stone-400 border-t border-stone-200 mt-6 flex justify-between items-center">
          <span>মসজিদলেজার (MasjidLedger) • সেন্ট্রাল ডকুমেন্ট ম্যানেজমেন্ট সিস্টেম</span>
          <span>অফিসিয়াল কপি</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Lock,
  Globe,
  Shield,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
  FileCheck,
  X,
  HardDrive,
  Save,
} from 'lucide-react';
import {
  DocumentEntityType,
  DocumentCategoryType,
  DocumentVisibility,
  DOCUMENT_ENTITY_LABELS,
  DOCUMENT_CATEGORY_LABELS,
} from '../../types';
import { validateUploadedFile, formatFileSizeBn } from '../../lib/fileSecurity';
import { DriveLinkInput } from './DriveLinkInput';
import { GoogleDriveValidationResult } from '../../lib/urlValidator';

export interface DocumentUploadFormData {
  name: string;
  entityType: DocumentEntityType;
  entityId: string;
  entityTitle: string;
  documentType: DocumentCategoryType;
  documentDate: string;
  visibility: DocumentVisibility;
  description: string;
  googleDriveUrl?: string;
  file?: File | null;
  fileBase64?: string | null;
}

interface DocumentUploaderProps {
  initialEntityType?: DocumentEntityType;
  initialEntityId?: string;
  initialEntityTitle?: string;
  initialCategory?: DocumentCategoryType;
  onSubmit: (data: DocumentUploadFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
  initialData?: Partial<DocumentUploadFormData>;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  initialEntityType = 'OTHER',
  initialEntityId = 'GEN-01',
  initialEntityTitle = 'সাধারণ মসজিদ নথি',
  initialCategory = 'OTHER',
  onSubmit,
  onCancel,
  isLoading = false,
  isEditMode = false,
  initialData,
}) => {
  const [docName, setDocName] = useState(initialData?.name || '');
  const [docEntityType, setDocEntityType] = useState<DocumentEntityType>(
    initialData?.entityType || initialEntityType
  );
  const [docEntityId, setDocEntityId] = useState(initialData?.entityId || initialEntityId);
  const [docEntityTitle, setDocEntityTitle] = useState(
    initialData?.entityTitle || initialEntityTitle
  );
  const [docCategory, setDocCategory] = useState<DocumentCategoryType>(
    initialData?.documentType || initialCategory
  );
  const [docDate, setDocDate] = useState(
    initialData?.documentDate || new Date().toISOString().split('T')[0]
  );
  const [docVisibility, setDocVisibility] = useState<DocumentVisibility>(
    initialData?.visibility || 'RESTRICTED'
  );
  const [docDescription, setDocDescription] = useState(initialData?.description || '');
  const [googleDriveUrl, setGoogleDriveUrl] = useState(initialData?.googleDriveUrl || '');

  // File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const validation = validateUploadedFile(file);
    if (!validation.isValid) {
      setFileError(validation.errorMessageBn || 'ফাইলের ধরন গ্রহণযোগ্য নয়।');
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setSelectedFileBase64(null);
    setFileError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      alert('অনুগ্রহ করে ডকুমেন্টের নাম প্রদান করুন।');
      return;
    }

    if (!isEditMode && !selectedFile && !googleDriveUrl.trim() && !docDescription.trim()) {
      alert('অনুগ্রহ করে ফাইল আপলোড করুন অথবা গুগল ড্রাইভ লিংক অথবা বিবরণ যুক্ত করুন।');
      return;
    }

    await onSubmit({
      name: docName.trim(),
      entityType: docEntityType,
      entityId: docEntityId.trim() || 'GEN-01',
      entityTitle: docEntityTitle.trim() || DOCUMENT_ENTITY_LABELS[docEntityType] || 'রেকর্ড',
      documentType: docCategory,
      documentDate: docDate,
      visibility: docVisibility,
      description: docDescription.trim(),
      googleDriveUrl: googleDriveUrl.trim() || undefined,
      file: selectedFile,
      fileBase64: selectedFileBase64,
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* Document Name */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1">
          ডকুমেন্টের নাম ও শিরোনাম <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={docName}
          onChange={(e) => setDocName(e.target.value)}
          placeholder="উদাঃ ওয়াকফ মূল দলিলপত্র / নিয়োগ চুক্তিপত্র ২০২৬"
          required
          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-medium text-stone-800"
        />
      </div>

      {/* Row: Entity Module & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            সংশ্লিষ্ট মডিউল
          </label>
          <select
            value={docEntityType}
            onChange={(e) => setDocEntityType(e.target.value as DocumentEntityType)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white outline-hidden font-medium text-stone-800"
          >
            {Object.entries(DOCUMENT_ENTITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            ডকুমেন্টের ধরন / ক্যাটাগরি
          </label>
          <select
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value as DocumentCategoryType)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white outline-hidden font-medium text-stone-800"
          >
            {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: Date & Visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            নথির তারিখ (Document Date)
          </label>
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white outline-hidden font-medium text-stone-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            অ্যাক্সেস ও গোপনীয়তা
          </label>
          <select
            value={docVisibility}
            onChange={(e) => setDocVisibility(e.target.value as DocumentVisibility)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white outline-hidden font-medium text-stone-800"
          >
            <option value="RESTRICTED">সীমিত (অভ্যন্তরীণ কমিটি ও কর্মকর্তা)</option>
            <option value="PRIVATE">প্রাইভেট (শুধুমাত্র সুপার অ্যাডমিন)</option>
            <option value="PUBLIC">পাবলিক (সর্বসাধারণের জন্য উন্মুক্ত)</option>
          </select>
        </div>
      </div>

      {/* File Upload Box */}
      <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
        <label className="block text-xs font-semibold text-stone-700">
          সরাসরি ফাইল আপলোড (PDF, ছবি, স্প্রেডশীট)
        </label>
        {selectedFile ? (
          <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-300 rounded-xl">
            <div className="flex items-center gap-2 text-xs truncate">
              <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold text-stone-800 truncate">{selectedFile.name}</span>
              <span className="text-[11px] text-stone-400">({formatFileSizeBn(selectedFile.size)})</span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition"
              title="ফাইল বাতিল করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative border-2 border-dashed border-stone-300 hover:border-emerald-500 rounded-xl p-4 text-center bg-white transition cursor-pointer">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Upload className="w-5 h-5 mx-auto text-stone-400 mb-1" />
            <p className="text-xs font-semibold text-stone-700">
              ফাইল নির্বাচন করতে এখানে ক্লিক করুন বা ড্র্যাগ করুন
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              সর্বোচ্চ ১২ মেগাবাইট (PDF, JPG, PNG, DOCX, XLSX)
            </p>
          </div>
        )}
        {fileError && (
          <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{fileError}</span>
          </p>
        )}
      </div>

      {/* Google Drive Link */}
      <DriveLinkInput
        value={googleDriveUrl}
        onChange={(url) => setGoogleDriveUrl(url)}
        placeholder="https://drive.google.com/file/d/.../view"
      />

      {/* Description / Notes */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1">
          সংক্ষিপ্ত বিবরণ বা অতিরিক্ত মন্তব্য
        </label>
        <textarea
          value={docDescription}
          onChange={(e) => setDocDescription(e.target.value)}
          rows={2}
          placeholder="ডকুমেন্ট সম্পর্কিত প্রাসঙ্গিক বিবরণ, পৃষ্ঠা সংখ্যা বা সংরক্ষণাগারের অবস্থান..."
          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-stone-800 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
        >
          বাতিল
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {isLoading ? 'সংরক্ষণ হচ্ছে...' : isEditMode ? 'হালনাগাদ সম্পন্ন করুন' : 'ডকুমেন্ট সংরক্ষণ করুন'}
        </button>
      </div>
    </form>
  );
};

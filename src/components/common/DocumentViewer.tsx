import React from 'react';
import {
  X,
  ExternalLink,
  Download,
  HardDrive,
  FileText,
  Calendar,
  Lock,
  Globe,
  Tag,
  Eye,
  Building,
} from 'lucide-react';
import { CentralDocument, DOCUMENT_ENTITY_LABELS, DOCUMENT_CATEGORY_LABELS } from '../../types';
import { formatFileSizeBn } from '../../lib/fileSecurity';
import { validateGoogleDriveUrl } from '../../lib/urlValidator';

interface DocumentViewerProps {
  document: CentralDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (doc: CentralDocument) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document: doc,
  isOpen,
  onClose,
  onDownload,
}) => {
  if (!isOpen || !doc) return null;

  const driveInfo = doc.googleDriveUrl ? validateGoogleDriveUrl(doc.googleDriveUrl) : null;
  const isImage = doc.fileType?.startsWith('image/') || doc.fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const isPdf = doc.fileType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 font-siliguri truncate">
                {doc.name}
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                {DOCUMENT_ENTITY_LABELS[doc.entityType] || doc.entityType} • {DOCUMENT_CATEGORY_LABELS[doc.documentType] || doc.documentType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {doc.fileUrl && (
              <a
                href={doc.fileUrl}
                download={doc.fileName || doc.name}
                className="p-2 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                title="ডাউনলোড করুন"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            {doc.googleDriveUrl && (
              <a
                href={doc.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-stone-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                title="গুগল ড্রাইভে খুলুন"
              >
                <HardDrive className="w-4 h-4 text-blue-600" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-xl transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100/60 flex flex-col items-center justify-center min-h-[360px]">
          {/* Direct File Preview */}
          {doc.fileUrl ? (
            isImage ? (
              <div className="max-h-[60vh] max-w-full overflow-auto rounded-xl border border-stone-300 shadow-sm bg-white p-2">
                <img
                  src={doc.fileUrl}
                  alt={doc.name}
                  className="max-h-[56vh] object-contain rounded-lg mx-auto"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={`${doc.fileUrl}#toolbar=0`}
                title={doc.name}
                className="w-full h-[58vh] rounded-xl border border-stone-300 bg-white shadow-sm"
              />
            ) : (
              <div className="text-center p-8 bg-white rounded-2xl border border-stone-200 shadow-xs max-w-md">
                <FileText className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-stone-800 text-sm">{doc.fileName || doc.name}</h4>
                <p className="text-xs text-stone-500 mt-1">
                  এই ফাইলের প্রিভিউ সরাসরি ব্রাউজারে দেখা সম্ভব নয়। আপনি এটি ডাউনলোড করে দেখতে পারেন।
                </p>
                <a
                  href={doc.fileUrl}
                  download={doc.fileName || doc.name}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  ফাইল ডাউনলোড করুন ({formatFileSizeBn(doc.fileSize)})
                </a>
              </div>
            )
          ) : doc.googleDriveUrl ? (
            <div className="w-full flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-stone-200 shadow-xs max-w-lg">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <HardDrive className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-stone-900 text-sm font-siliguri">{doc.name}</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                ডকুমেন্টটি গুগল ক্লাউড ড্রাইভে সংরক্ষিত আছে। নিচের বাটনে ক্লিক করে সরাসরি ড্রাইভে ব্রাউজ করুন।
              </p>
              <a
                href={doc.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <span>গুগল ড্রাইভে দেখুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl border border-stone-200 max-w-md">
              <FileText className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-700">কোনো ফাইল বা লিংক সংযুক্ত নেই</p>
              <p className="text-[11px] text-stone-400 mt-0.5">শুধুমাত্র মেটাডাটা ও তথ্য সংরক্ষিত রয়েছে।</p>
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="px-5 py-3.5 bg-white border-t border-stone-200 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>তারিখ: {doc.documentDate || '—'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-stone-400" />
              <span>দৃশ্যমানতা: {doc.visibility}</span>
            </span>
            {doc.uploadedByName && (
              <span className="text-stone-500">
                আপলোডকারী: <strong className="text-stone-700">{doc.uploadedByName}</strong>
              </span>
            )}
          </div>

          {doc.description && (
            <p className="w-full text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200/60 mt-1">
              <strong>বিবরণ:</strong> {doc.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

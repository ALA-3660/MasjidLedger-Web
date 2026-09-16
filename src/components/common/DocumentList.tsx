import React, { useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  HardDrive,
  Eye,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  Calendar,
  Lock,
  Tag,
  Search,
  Plus,
} from 'lucide-react';
import { CentralDocument, DOCUMENT_ENTITY_LABELS, DOCUMENT_CATEGORY_LABELS } from '../../types';
import { formatFileSizeBn } from '../../lib/fileSecurity';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';

interface DocumentListProps {
  documents: CentralDocument[];
  onView: (doc: CentralDocument) => void;
  onEdit?: (doc: CentralDocument) => void;
  onDelete?: (id: string) => Promise<void>;
  onArchiveToggle?: (id: string, currentStatus: string) => Promise<void>;
  canManage?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onAddNew?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onView,
  onEdit,
  onDelete,
  onArchiveToggle,
  canManage = false,
  emptyTitle = 'কোনো ডকুমেন্ট যুক্ত নেই',
  emptyDescription = 'এই রেকর্ডের সাথে বর্তমানে কোনো ফাইল বা গুগল ড্রাইভ লিংক সংযুক্ত করা হয়নি।',
  onAddNew,
}) => {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
        <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-stone-700 font-siliguri">{emptyTitle}</p>
        <p className="text-[11px] text-stone-400 mt-0.5">{emptyDescription}</p>
        {canManage && onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ডকুমেন্ট যুক্ত করুন</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {documents.map((doc) => {
          const isArchived = doc.status === 'ARCHIVED';

          return (
            <div
              key={doc.id}
              className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                isArchived
                  ? 'bg-stone-100 border-stone-300 opacity-70'
                  : 'bg-white border-stone-200 hover:border-emerald-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 truncate">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4
                        onClick={() => onView(doc)}
                        className="text-xs font-bold text-stone-900 truncate hover:text-emerald-700 cursor-pointer font-siliguri"
                        title={doc.name}
                      >
                        {doc.name}
                      </h4>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {DOCUMENT_CATEGORY_LABELS[doc.documentType] || doc.documentType} •{' '}
                        {doc.documentDate || 'তারিখহীন'}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={doc.status || 'ACTIVE'} size="sm" />
                </div>

                {doc.description && (
                  <p className="text-[11px] text-stone-600 mt-2 line-clamp-2 bg-stone-50 p-1.5 rounded border border-stone-100">
                    {doc.description}
                  </p>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {doc.fileUrl && (
                    <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">
                      {formatFileSizeBn(doc.fileSize)}
                    </span>
                  )}
                  {doc.googleDriveUrl && (
                    <a
                      href={doc.googleDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Google Drive"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onView(doc)}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                    title="দেখুন"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName || doc.name}
                      className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded transition"
                      title="ডাউনলোড"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {canManage && onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(doc)}
                      className="p-1 text-stone-600 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canManage && onArchiveToggle && (
                    <button
                      type="button"
                      onClick={() => onArchiveToggle(doc.id, doc.status || 'ACTIVE')}
                      className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded transition"
                      title={isArchived ? 'পুনরুদ্ধার করুন' : 'আর্কাইভ করুন'}
                    >
                      {isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {canManage && onDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(doc.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      title="মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (!deleteTargetId || !onDelete) return;
          setIsDeleting(true);
          try {
            await onDelete(deleteTargetId);
            setDeleteTargetId(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        title="ডকুমেন্ট মুছে ফেলতে চান?"
        message="এই ডকুমেন্টটি সম্পূর্ণ মুছে ফেলা হবে। আপনি কি নিশ্চিত?"
        variant="danger"
        confirmText="হ্যাঁ, মুছুন"
        isLoading={isDeleting}
      />
    </>
  );
};

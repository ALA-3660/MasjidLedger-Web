import React, { useState } from 'react';
import {
  FileText,
  X,
  Building,
  Upload,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react';
import { MosqueProperty } from '../types';
import { Language } from '../lib/i18n';

interface PropertyDocumentModalProps {
  property: MosqueProperty | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  language: Language;
}

export const PROPERTY_DOCUMENT_TYPES = [
  { id: 'WAQF_DEED', labelBn: 'মূল ওয়াকফনামা দলিল' },
  { id: 'KHATIAN', labelBn: 'খতিয়ান (CS/SA/RS/BS/সিটি)' },
  { id: 'PORCHA', labelBn: 'পর্চা ও দাগের নকশা' },
  { id: 'NAMJARI', labelBn: 'নামজারি ও জমাভাগ ডিসিআর (Mutation)' },
  { id: 'IJARA_AGREEMENT', labelBn: 'ভাড়া / ইজারা চুক্তিপত্র' },
  { id: 'KHAJNA_DAKHILA', labelBn: 'ভূমি কর দাখিলা / রসিদ' },
  { id: 'MAP_CADASTRE', labelBn: 'মৌজা নকশা ও সার্ভে ম্যাপ' },
  { id: 'COURT_DECREE', labelBn: 'আদালতের রায় / ডিগ্রি / অর্ডার' },
  { id: 'OTHER', labelBn: 'অন্যান্য আইনগত রেকর্ড' }
];

export const PropertyDocumentModal: React.FC<PropertyDocumentModalProps> = ({
  property,
  isOpen,
  onClose,
  onSubmit,
  language
}) => {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('WAQF_DEED');
  const [issueDate, setIssueDate] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('নথির শিরোনাম আবশ্যক।');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const typeObj = PROPERTY_DOCUMENT_TYPES.find(t => t.id === documentType);

    try {
      await onSubmit({
        title: title.trim(),
        documentType,
        documentTypeBn: typeObj?.labelBn || documentType,
        issueDate,
        description,
        fileUrl: fileUrl || `/uploads/doc-${Date.now()}.pdf`,
        fileName: fileName || `${title.trim()}.pdf`,
        fileSize: 2450000
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'দলিল আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">ওয়াকফ দলিল ও রেকর্ডপত্র সংরক্ষণ</h3>
              <p className="text-xs text-blue-200">{property.name || property.propertyCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              দলিল বা নথির শিরোনাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: মূল ওয়াকফ দলিল নং ৪৫১২/১৯৮৮ অথবা বিএস ৪৭৫ খতিয়ান"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type & Issue Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                দলিলের ধরন <span className="text-rose-500">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              >
                {PROPERTY_DOCUMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelBn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">সম্পাদন / জারির তারিখ</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* File Upload Simulator / URL */}
          <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-2">
            <Upload className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-slate-600 font-medium">
              স্ক্যান কপি বা PDF ফাইল নির্বাচন করুন (সর্বোচ্চ ২৫ এমবি)
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFileName(file.name);
                  setFileUrl(URL.createObjectURL(file));
                }
              }}
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {fileName && (
              <p className="text-emerald-700 font-bold text-xs mt-1">
                নির্বাচিত ফাইল: {fileName}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">সংক্ষিপ্ত নোট বা রেফারেন্স</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: মূল কপি সাধারণ সম্পাদকের লকারে সংরক্ষিত রয়েছে..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'দলিল আর্কাইভে যোগ করুন'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

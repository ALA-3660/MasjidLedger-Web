import React, { useState } from 'react';
import {
  X,
  SearchCheck,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Save,
  CheckCircle2
} from 'lucide-react';
import { MosqueProperty, PropertyInspectionRecord } from '../types';
import { Language } from '../lib/i18n';

interface PropertyInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: MosqueProperty;
  onSubmit: (data: Partial<PropertyInspectionRecord>) => Promise<void>;
  language: Language;
}

export const PropertyInspectionModal: React.FC<PropertyInspectionModalProps> = ({
  isOpen,
  onClose,
  property,
  onSubmit,
  language
}) => {
  const [formData, setFormData] = useState({
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: '',
    inspectorDesignation: 'ওয়াকফ ও সম্পত্তি সাব-কমিটি',
    currentCondition: 'GOOD' as const,
    occupancyStatus: 'মসজিদের প্রত্যক্ষ নিয়ন্ত্রণে ও শান্তিপূর্ণ দখলে আছে',
    problemsObserved: '',
    requiredAction: '',
    nextInspectionDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.inspectorName.trim()) {
      setError('পরিদর্শকের নাম প্রদান করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-700/40 rounded-xl border border-blue-400/30">
              <SearchCheck className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">সম্পত্তি পরিদর্শন ও দখল রিপোর্ট</h2>
              <p className="text-xs text-blue-200">
                {property.name || property.description} ({property.propertyCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পরিদর্শনের তারিখ *</label>
              <input
                type="date"
                required
                value={formData.inspectionDate}
                onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পরবর্তী পরিদর্শনের সম্ভাব্য তারিখ</label>
              <input
                type="date"
                value={formData.nextInspectionDate}
                onChange={(e) => setFormData({ ...formData, nextInspectionDate: e.target.value })}
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পরিদর্শকের নাম *</label>
              <input
                type="text"
                required
                value={formData.inspectorName}
                onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                placeholder="যেমন: হাজী জহিরুল ইসলাম"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পদবি / দায়িত্ব</label>
              <input
                type="text"
                value={formData.inspectorDesignation}
                onChange={(e) => setFormData({ ...formData, inspectorDesignation: e.target.value })}
                placeholder="যেমন: সাধারণ সম্পাদক / সাব-কমিটি আহ্বায়ক"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">সম্পত্তির বর্তমান অবস্থা *</label>
              <select
                value={formData.currentCondition}
                onChange={(e) => setFormData({ ...formData, currentCondition: e.target.value as any })}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="GOOD">উত্তম / সন্তোষজনক (Good)</option>
                <option value="NEEDS_REPAIR">মেরামত প্রয়োজন (Needs Repair)</option>
                <option value="DAMAGED">ক্ষতিগ্রস্ত / ঝুঁকিপূর্ণ (Damaged)</option>
                <option value="DISPUTED">সীমানা নিয়ে জটিলতা (Disputed)</option>
                <option value="UNDER_CONSTRUCTION">নির্মাণাধীন (Under Construction)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">দখলদারিত্ব পরিস্থিতি</label>
              <input
                type="text"
                value={formData.occupancyStatus}
                onChange={(e) => setFormData({ ...formData, occupancyStatus: e.target.value })}
                placeholder="যেমন: সম্পূর্ণ নিয়ন্ত্রণে / শান্তিপূর্ণ দখল"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">পরিলক্ষিত সমস্যা বা ক্ষয়ক্ষতি</label>
            <textarea
              rows={2}
              value={formData.problemsObserved}
              onChange={(e) => setFormData({ ...formData, problemsObserved: e.target.value })}
              placeholder="যেমন: সীমানা প্রাচীরের পশ্চিম পাশে ফাটল বা ড্রেনের পানি নিষ্কাশনে সমস্যা..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কমিটির করণীয় ও প্রস্তাবিত পদক্ষেপ</label>
            <textarea
              rows={2}
              value={formData.requiredAction}
              onChange={(e) => setFormData({ ...formData, requiredAction: e.target.value })}
              placeholder="যেমন: বর্ষার আগেই সংস্কার কাজ সম্পন্ন করা ও সীমানা পিলার পুনঃস্থাপন..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'পরিদর্শন রিপোর্ট সংরক্ষণ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

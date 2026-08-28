import React, { useState } from 'react';
import {
  X,
  Scale,
  Calendar,
  User,
  Phone,
  FileText,
  Save,
  AlertOctagon
} from 'lucide-react';
import { MosqueProperty, PropertyLegalCase } from '../types';
import { Language } from '../lib/i18n';

interface PropertyLegalCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: MosqueProperty;
  onSubmit: (data: Partial<PropertyLegalCase>) => Promise<void>;
  language: Language;
}

export const PropertyLegalCaseModal: React.FC<PropertyLegalCaseModalProps> = ({
  isOpen,
  onClose,
  property,
  onSubmit,
  language
}) => {
  const [formData, setFormData] = useState({
    caseNumber: '',
    courtName: '',
    parties: '',
    subject: '',
    lawyerName: '',
    lawyerContact: '',
    filingDate: '',
    nextHearingDate: '',
    status: 'RUNNING' as const,
    courtOrders: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caseNumber.trim() || !formData.courtName.trim()) {
      setError('মামলা নম্বর ও আদালতের নাম প্রদান করুন');
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
        <div className="px-6 py-4 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-700/40 rounded-xl border border-rose-400/30">
              <Scale className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">আইনি মামলা ও বিরোধ তথ্য রেজিস্টার</h2>
              <p className="text-xs text-rose-200">
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
              <label className="block text-xs font-bold text-slate-700 mb-1">মামলা নম্বর *</label>
              <input
                type="text"
                required
                value={formData.caseNumber}
                onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                placeholder="যেমন: দেওয়ানি মোকদ্দমা নং- ১২৫/২০২৩"
                className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">আদালতের নাম *</label>
              <input
                type="text"
                required
                value={formData.courtName}
                onChange={(e) => setFormData({ ...formData, courtName: e.target.value })}
                placeholder="যেমন: ১ম যুগ্ম জেলা জজ আদালত, ঢাকা"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বাদী ও বিবাদী বিবরণ</label>
              <input
                type="text"
                value={formData.parties}
                onChange={(e) => setFormData({ ...formData, parties: e.target.value })}
                placeholder="যেমন: মসজিদ কমিটি বনাম মোঃ কালাম গং"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মামলার বিষয়বস্তু</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="যেমন: সীমানা প্রাচীর ও ওয়াকফ স্বত্ব ঘোষণা"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">নিয়োজিত আইনজীবী</label>
              <input
                type="text"
                value={formData.lawyerName}
                onChange={(e) => setFormData({ ...formData, lawyerName: e.target.value })}
                placeholder="এডভোকেট জনাব..."
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">আইনজীবীর মোবাইল</label>
              <input
                type="tel"
                value={formData.lawyerContact}
                onChange={(e) => setFormData({ ...formData, lawyerContact: e.target.value })}
                placeholder="017XXXXXXXX"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">দায়েরের তারিখ</label>
              <input
                type="date"
                value={formData.filingDate}
                onChange={(e) => setFormData({ ...formData, filingDate: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-800 mb-1">পরবর্তী শুনানির তারিখ</label>
              <input
                type="date"
                value={formData.nextHearingDate}
                onChange={(e) => setFormData({ ...formData, nextHearingDate: e.target.value })}
                className="w-full text-xs font-bold px-3 py-2 border border-rose-300 rounded-xl bg-rose-50/50 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মামলার অবস্থা</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
              >
                <option value="RUNNING">চলমান (Running)</option>
                <option value="STAY_ORDER">স্থগিতাদেশ প্রাপ্ত (Stay Order)</option>
                <option value="WON">মসজিদের পক্ষে রায় (Won)</option>
                <option value="LOST">বিপক্ষে রায় (Lost)</option>
                <option value="APPEAL">আপিল শুনানিতে (Appeal)</option>
                <option value="DISPOSED">নিষ্পত্তি (Disposed)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">আদালতের অন্তর্বর্তীকালীন আদেশ বা রায়</label>
            <textarea
              rows={2}
              value={formData.courtOrders}
              onChange={(e) => setFormData({ ...formData, courtOrders: e.target.value })}
              placeholder="আদালত কর্তৃক স্থিতাবস্থা বা কোনো আদেশ থাকলে উল্লেখ করুন..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 rounded-xl flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'মামলা তথ্য সংরক্ষণ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

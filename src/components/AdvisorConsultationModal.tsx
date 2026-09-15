import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  FileText,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Target,
  Sparkles
} from 'lucide-react';
import { AdvisorConsultation, AdvisorMember } from '../types';

interface AdvisorConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AdvisorConsultation>) => Promise<void>;
  initialData?: AdvisorConsultation | null;
  advisors: AdvisorMember[];
  preselectedAdvisorId?: string;
}

export const AdvisorConsultationModal: React.FC<AdvisorConsultationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  advisors,
  preselectedAdvisorId,
}) => {
  const [formData, setFormData] = useState({
    advisorId: '',
    advisorName: '',
    date: new Date().toISOString().split('T')[0],
    topic: '',
    advice: '',
    relatedContext: '',
    impactOutcome: '',
    status: 'RECORDED' as 'RECORDED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'ARCHIVED',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        advisorId: initialData.advisorId || '',
        advisorName: initialData.advisorName || '',
        date: initialData.date || new Date().toISOString().split('T')[0],
        topic: initialData.topic || '',
        advice: initialData.advice || '',
        relatedContext: initialData.relatedContext || '',
        impactOutcome: initialData.impactOutcome || '',
        status: initialData.status || 'RECORDED',
        notes: initialData.notes || '',
      });
    } else {
      const defaultAdvisor = preselectedAdvisorId
        ? advisors.find((a) => a.id === preselectedAdvisorId)
        : advisors[0];

      setFormData({
        advisorId: defaultAdvisor ? defaultAdvisor.id : '',
        advisorName: defaultAdvisor ? defaultAdvisor.name : '',
        date: new Date().toISOString().split('T')[0],
        topic: '',
        advice: '',
        relatedContext: '',
        impactOutcome: '',
        status: 'RECORDED',
        notes: '',
      });
    }
    setError(null);
  }, [initialData, advisors, preselectedAdvisorId, isOpen]);

  if (!isOpen) return null;

  const handleAdvisorSelect = (id: string) => {
    if (!id) {
      setFormData((prev) => ({ ...prev, advisorId: '', advisorName: 'সম্মানিত উপদেষ্টা পরিষদ' }));
      return;
    }
    const found = advisors.find((a) => a.id === id);
    setFormData((prev) => ({
      ...prev,
      advisorId: id,
      advisorName: found ? found.name : prev.advisorName,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.topic.trim()) {
      setError('পরামর্শের মূল বিষয়/শিরোনাম আবশ্যক।');
      return;
    }

    if (!formData.advice.trim()) {
      setError('প্রদত্ত পরামর্শ ও দিকনির্দেশনা আবশ্যক।');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        advisorName: formData.advisorName.trim() || 'সম্মানিত উপদেষ্টা পরিষদ',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'পরামর্শের রেকর্ড সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? 'পরামর্শ ও দিকনির্দেশনা সম্পাদনা' : 'নতুন পরামর্শ ও দিকনির্দেশনা নথিভুক্তকরণ'}
              </h2>
              <p className="text-xs text-indigo-200">
                সম্মানিত উপদেষ্টাদের সুচিন্তিত মতামত ও মূল্যবান দিকনির্দেশনা
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পরামর্শদাতা উপদেষ্টা <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.advisorId}
                onChange={(e) => handleAdvisorSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">সম্মানিত উপদেষ্টা পরিষদ (সম্মিলিত)</option>
                {advisors.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.name} ({adv.advisorRole || 'উপদেষ্টা'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পরামর্শের তারিখ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              পরামর্শের মূল বিষয় / শিরোনাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="যেমন: মসজিদ সম্প্রসারণ তহবিল সংগ্রহ ও ওয়াক্ফ সংরক্ষণ সংক্রান্ত দিকনির্দেশনা"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              প্রদত্ত পরামর্শ ও সুনির্দিষ্ট দিকনির্দেশনা <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={formData.advice}
              onChange={(e) => setFormData({ ...formData, advice: e.target.value })}
              placeholder="উপদেষ্টার সুনির্দিষ্ট পরামর্শ, সুপারিশ, করণীয় দিকসমূহ বিস্তারিত লিখুন..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রেক্ষাপট বা সংশ্লিষ্ট বিষয়
              </label>
              <input
                type="text"
                value={formData.relatedContext}
                onChange={(e) => setFormData({ ...formData, relatedContext: e.target.value })}
                placeholder="যেমন: ২০২৬ সালের বার্ষিক বাজেট / রমজান প্রস্তুতি"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                বাস্তবায়ন অবস্থা (Status)
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="RECORDED">নথিভুক্ত (Recorded)</option>
                <option value="IN_PROGRESS">বাস্তবায়নাধীন (In Progress)</option>
                <option value="IMPLEMENTED">বাস্তবায়িত (Implemented)</option>
                <option value="ARCHIVED">সংরক্ষিত (Archived)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              সম্ভাব্য প্রভাব বা অর্জিত ফলাফল (Outcome)
            </label>
            <input
              type="text"
              value={formData.impactOutcome}
              onChange={(e) => setFormData({ ...formData, impactOutcome: e.target.value })}
              placeholder="যেমন: অনুদান বৃদ্ধিতে সহায়ক হয়েছে / কার্যনির্বাহী কমিটির মিটিংয়ে গৃহীত হয়েছে"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              অতিরিক্ত মন্তব্য
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="প্রয়োজনীয় কোনো নোট বা মন্তব্য..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : initialData ? 'আপডেট করুন' : 'পরামর্শ নথিভুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

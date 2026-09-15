import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  FileText,
  Shield,
  Heart,
  CreditCard,
  Camera,
  AlertCircle
} from 'lucide-react';
import { AdvisorMember, AdvisoryCouncilTerm } from '../types';

interface AdvisorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AdvisorMember>) => Promise<void>;
  initialData?: AdvisorMember | null;
  terms: AdvisoryCouncilTerm[];
}

export const ADVISOR_ROLES = [
  { id: 'উপদেষ্টা', label: 'উপদেষ্টা (General Advisor)' },
  { id: 'প্রধান উপদেষ্টা', label: 'প্রধান উপদেষ্টা (Chief Advisor)' },
  { id: 'ধর্মীয় ও শরীয়াহ উপদেষ্টা', label: 'ধর্মীয় ও শরীয়াহ উপদেষ্টা (Religious & Shariah Advisor)' },
  { id: 'আইন ও প্রশাসনিক উপদেষ্টা', label: 'আইন ও প্রশাসনিক উপদেষ্টা (Legal & Admin Advisor)' },
  { id: 'শিক্ষাবিদ ও গবেষক উপদেষ্টা', label: 'শিক্ষাবিদ ও গবেষক উপদেষ্টা (Academic & Scholar)' },
  { id: 'অর্থ ও পরিকল্পনা উপদেষ্টা', label: 'অর্থ ও পরিকল্পনা উপদেষ্টা (Finance & Planning)' },
  { id: 'দানবীর ও আজীবন পৃষ্ঠপোষক', label: 'দানবীর ও আজীবন পৃষ্ঠপোষক (Philanthropist & Patron)' },
  { id: 'অন্যান্য', label: 'অন্যান্য (Custom Designation)' },
];

export const AdvisorFormModal: React.FC<AdvisorFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  terms,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    motherName: '',
    phone: '',
    altPhone: '',
    nid: '',
    email: '',
    dateOfBirth: '',
    bloodGroup: '',
    address: '',
    occupation: '',
    education: '',
    advisorRole: 'উপদেষ্টা',
    customRole: '',
    termId: '',
    joinDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'HONORARY' | 'DECEASED',
    photoUrl: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const isPredefinedRole = ADVISOR_ROLES.some(r => r.id === initialData.advisorRole);
      setFormData({
        name: initialData.name || '',
        fatherName: initialData.fatherName || '',
        motherName: initialData.motherName || '',
        phone: initialData.phone || '',
        altPhone: initialData.altPhone || '',
        nid: initialData.nid || '',
        email: initialData.email || '',
        dateOfBirth: initialData.dateOfBirth || '',
        bloodGroup: initialData.bloodGroup || '',
        address: initialData.address || '',
        occupation: initialData.occupation || '',
        education: initialData.education || '',
        advisorRole: isPredefinedRole ? initialData.advisorRole : 'অন্যান্য',
        customRole: isPredefinedRole ? '' : (initialData.advisorRole || ''),
        termId: initialData.termId || (terms[0]?.id || ''),
        joinDate: initialData.joinDate || new Date().toISOString().split('T')[0],
        endDate: initialData.endDate || '',
        status: (initialData.status as any) || 'ACTIVE',
        photoUrl: initialData.photoUrl || '',
        notes: initialData.notes || '',
      });
    } else {
      const activeTerm = terms.find(t => t.status === 'ACTIVE') || terms[0];
      setFormData({
        name: '',
        fatherName: '',
        motherName: '',
        phone: '',
        altPhone: '',
        nid: '',
        email: '',
        dateOfBirth: '',
        bloodGroup: '',
        address: '',
        occupation: '',
        education: '',
        advisorRole: 'উপদেষ্টা',
        customRole: '',
        termId: activeTerm?.id || '',
        joinDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'ACTIVE',
        photoUrl: '',
        notes: '',
      });
    }
    setError(null);
  }, [initialData, terms, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('উপদেষ্টার পুরো নাম আবশ্যক।');
      return;
    }

    if (!formData.phone.trim()) {
      setError('মোবাইল নম্বর আবশ্যক।');
      return;
    }

    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('অনুগ্রহ করে সঠিক ই-মেইল ঠিকানা প্রদান করুন।');
      return;
    }

    const finalRole = formData.advisorRole === 'অন্যান্য'
      ? (formData.customRole.trim() || 'উপদেষ্টা')
      : formData.advisorRole;

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        advisorRole: finalRole,
        termId: formData.termId || terms[0]?.id,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'উপদেষ্টার তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? 'উপদেষ্টার তথ্য সম্পাদনা' : 'নতুন উপদেষ্টা অন্তর্ভুক্তি'}
              </h2>
              <p className="text-xs text-indigo-200">
                স্বতন্ত্র উপদেষ্টা পরিষদ — সম্মানিত উপদেষ্টাবৃন্দ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Advisory Term & Role */}
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>উপদেষ্টা পরিষদের মেয়াদ ও পদবি</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  উপদেষ্টা পরিষদের মেয়াদকাল <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.termId}
                  onChange={(e) => setFormData({ ...formData, termId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status === 'ACTIVE' ? 'বর্তমান সক্রিয়' : 'পূর্ববর্তী'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  উপদেষ্টার পদবি / দায়িত্ব <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.advisorRole}
                  onChange={(e) => setFormData({ ...formData, advisorRole: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {ADVISOR_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.advisorRole === 'অন্যান্য' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  কাস্টম পদবি লিখুন <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customRole}
                  onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                  placeholder="যেমন: জ্যেষ্ঠ আইন উপদেষ্টা / সম্মানিত পৃষ্ঠপোষক"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>
            )}
          </div>

          {/* Section 2: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-500" />
              <span>ব্যক্তিগত মৌলিক তথ্য</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  উপদেষ্টার পূর্ণ নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="যেমন: আলহাজ্ব ড. মো. আব্দুল বারী"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পিতার নাম
                </label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  placeholder="পিতার নাম লিখুন"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মাতার নাম
                </label>
                <input
                  type="text"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  placeholder="মাতার নাম লিখুন"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  জাতীয় পরিচয়পত্র (NID) নম্বর
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.nid}
                    onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                    placeholder="১০, ১৩ বা ১৭ ডিজিটের NID নম্বর"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  জন্ম তারিখ
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রক্তের গ্রুপ
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">নির্বাচন করুন</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Professional Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>যোগাযোগ ও পেশাগত তথ্য</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="০১XXXXXXXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিকল্প ফোন নম্বর
                </label>
                <input
                  type="text"
                  value={formData.altPhone}
                  onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                  placeholder="বিকল্প মোবাইল / ল্যান্ডফোন"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ই-মেইল ঠিকানা
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@mail.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বর্তমান পেশা / পদবি
                </label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="যেমন: অবসরপ্রাপ্ত অধ্যাপক / ব্যবসায়ী / ব্যারিস্টার"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  শিক্ষাগত যোগ্যতা
                </label>
                <input
                  type="text"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="যেমন: পিএইচডি, এমএ (ইসলামিক স্টাডিজ), কামিল"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ঠিকানা (বর্তমান ও স্থায়ী)
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="বাড়ি, সড়ক, এলাকা, পোস্ট ও জেলা"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Photo & Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <Camera className="w-4 h-4 text-slate-500" />
              <span>ছবি, স্ট্যাটাস ও অন্যান্য</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ছবির লিংক / URL
                </label>
                <input
                  type="text"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://... অথবা ডেটা URL"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সদস্যপদ স্ট্যাটাস
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="HONORARY">সম্মানসূচক (Honorary / Life Patron)</option>
                  <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
                  <option value="DECEASED">মরহুম (Deceased)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  উপদেষ্টা পরিষদে যোগদানের তারিখ
                </label>
                <input
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মেয়াদ সমাপ্তির তারিখ (প্রযোজ্য ক্ষেত্রে)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সংক্ষিপ্ত পরিচিতি ও বিশেষ মন্তব্য
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="সম্মানিত উপদেষ্টার অবদান, বিশেষ ক্ষেত্র ও দিকনির্দেশনামূলক ভূমিকা..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
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
              {loading ? 'সংরক্ষণ হচ্ছে...' : initialData ? 'তথ্য আপডেট করুন' : 'উপদেষ্টা যুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

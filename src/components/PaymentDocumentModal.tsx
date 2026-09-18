import React, { useState } from 'react';
import {
  X,
  Paperclip,
  FileText,
  Link,
  Shield,
  Upload,
  CheckCircle,
  AlertTriangle,
  Lock,
  Globe,
  ExternalLink
} from 'lucide-react';
import { StaffPayment, StaffPaymentDocument } from '../types';
import { api } from '../lib/api';

interface PaymentDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: StaffPayment | null;
  onDocumentAdded: (updatedPayment: StaffPayment) => void;
}

export const PaymentDocumentModal: React.FC<PaymentDocumentModalProps> = ({
  isOpen,
  onClose,
  payment,
  onDocumentAdded
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<StaffPaymentDocument['type']>('TRANSFER_RECEIPT');
  const [url, setUrl] = useState('');
  const [googleDriveLink, setGoogleDriveLink] = useState('');
  const [isPrivate, setIsPrivate] = useState(true); // Default true as per Phase-7 specs
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('ডকুমেন্টের শিরোনাম দিন।');
      return;
    }
    if (!url.trim() && !googleDriveLink.trim()) {
      setErrorMsg('ডকুমেন্ট ফাইল লিঙ্ক অথবা গুগল ড্রাইভ লিঙ্ক প্রদান করুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.addStaffPaymentDocument(payment.id, {
        name,
        type,
        url: url.trim() || googleDriveLink.trim(),
        googleDriveLink: googleDriveLink.trim() || undefined,
        isPrivate,
        notes
      });
      onDocumentAdded(res.payment);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'ডকুমেন্ট আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Paperclip className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">পেমেন্ট ডকুমেন্ট ও ব্যাংক রসিদ সংযুক্তি</h3>
              <p className="text-xs text-slate-300">{payment.staffName} ({payment.month})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ডকুমেন্টের নাম / বিবরণ *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: ব্যাংক ট্রান্সফার এডভাইস স্লিপ / বেতন স্বাক্ষর রশিদ"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ডকুমেন্টের ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="TRANSFER_RECEIPT">ব্যাংক ট্রান্সফার রসিদ (Transfer Receipt)</option>
              <option value="BANK_ADVICE">ব্যাংক এডভাইস স্লিপ (Bank Advice)</option>
              <option value="VOUCHER">স্বাক্ষরিত ভাউচার (Voucher)</option>
              <option value="SALARY_SHEET">মাসিক বেতন শিট (Salary Sheet)</option>
              <option value="APPROVAL_NOTE">কমিটি অনুমোদন পত্র (Approval Note)</option>
              <option value="OTHER">অন্যান্য (Other)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">গুগল ড্রাইভ লিংক (Google Drive Link)</label>
            <div className="relative">
              <Link className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="url"
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">সরাসরি ফাইল ইউআরএল (File URL)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://... অথবা ড্রাইভ লিঙ্ক দিন"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPrivate ? <Lock className="w-4 h-4 text-amber-600" /> : <Globe className="w-4 h-4 text-emerald-600" />}
                <span className="text-xs font-bold text-slate-700">গোপনীয়তা স্তর (Privacy Level)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              {isPrivate
                ? '🔒 প্রাইভেট (ডিফল্ট) — শুধুমাত্র অনুমোদিত মসজিদ এডমিন ও ফাইন্যান্স ইউজার দেখতে পারবেন।'
                : '🌐 উন্মুক্ত — অনুমোদিত কমিটি সদস্য দেখতে পারবেন।'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য (ঐচ্ছিক)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="পেমেন্ট ডকুমেন্ট সম্পর্কিত অতিরিক্ত নোট..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'ডকুমেন্ট সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

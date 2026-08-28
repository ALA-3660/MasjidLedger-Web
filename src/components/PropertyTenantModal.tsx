import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Building,
  Calendar,
  Phone,
  CreditCard,
  AlertCircle,
  FileCheck,
  Save
} from 'lucide-react';
import { PropertyTenant, MosqueProperty } from '../types';
import { Language, formatCurrency } from '../lib/i18n';

interface PropertyTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: MosqueProperty;
  tenant?: PropertyTenant | null;
  onSubmit: (tenantData: Partial<PropertyTenant>) => Promise<void>;
  language: Language;
}

export const PropertyTenantModal: React.FC<PropertyTenantModalProps> = ({
  isOpen,
  onClose,
  property,
  tenant,
  onSubmit,
  language
}) => {
  const [formData, setFormData] = useState({
    tenantCode: '',
    name: '',
    fatherOrSpouseName: '',
    mobile: '',
    nid: '',
    address: '',
    photoUrl: '',
    unitOrShopNo: '',
    businessName: '',
    businessType: '',
    agreementNo: '',
    startDate: '',
    endDate: '',
    monthlyRent: 0,
    annualRent: 0,
    securityDeposit: 0,
    paymentDueDate: 10,
    status: 'ACTIVE' as const,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setFormData({
        tenantCode: tenant.tenantCode || '',
        name: tenant.name || '',
        fatherOrSpouseName: tenant.fatherOrSpouseName || '',
        mobile: tenant.mobile || '',
        nid: tenant.nid || '',
        address: tenant.address || '',
        photoUrl: tenant.photoUrl || '',
        unitOrShopNo: tenant.unitOrShopNo || '',
        businessName: tenant.businessName || '',
        businessType: tenant.businessType || '',
        agreementNo: tenant.agreementNo || '',
        startDate: tenant.startDate || '',
        endDate: tenant.endDate || '',
        monthlyRent: tenant.monthlyRent || 0,
        annualRent: tenant.annualRent || (tenant.monthlyRent || 0) * 12,
        securityDeposit: tenant.securityDeposit || 0,
        paymentDueDate: tenant.paymentDueDate || 10,
        status: tenant.status || 'ACTIVE',
        notes: tenant.notes || ''
      });
    } else {
      const year = new Date().getFullYear();
      const existingCount = (property.tenants?.length || 0) + 1;
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];

      setFormData({
        tenantCode: `TNT-${String(existingCount).padStart(3, '0')}`,
        name: '',
        fatherOrSpouseName: '',
        mobile: '',
        nid: '',
        address: '',
        photoUrl: '',
        unitOrShopNo: '',
        businessName: '',
        businessType: '',
        agreementNo: `AGR-${year}-${String(existingCount).padStart(2, '0')}`,
        startDate: today,
        endDate: nextYear,
        monthlyRent: 0,
        annualRent: 0,
        securityDeposit: 0,
        paymentDueDate: 10,
        status: 'ACTIVE',
        notes: ''
      });
    }
    setError(null);
  }, [tenant, property, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('ভাড়াটিয়ার নাম আবশ্যক');
      return;
    }
    if (!formData.mobile.trim()) {
      setError('ভাড়াটিয়ার মোবাইল নম্বর আবশ্যক');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        ...(tenant ? { id: tenant.id } : {}),
        ...formData,
        annualRent: formData.annualRent || formData.monthlyRent * 12
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-700/40 rounded-xl border border-emerald-400/30">
              <UserCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {tenant ? 'ভাড়াটিয়া চুক্তি সম্পাদনা' : 'নতুন ভাড়াটিয়া / ইজারাদার সংযোজন'}
              </h2>
              <p className="text-xs text-emerald-200">
                সম্পত্তি: {property.name || property.description} ({property.propertyCode})
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
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-900">
              কোড: <strong className="font-mono text-emerald-700">{formData.tenantCode}</strong>
            </span>
            <span className="font-bold text-emerald-900">
              চুক্তিপত্র নং: <strong className="font-mono text-emerald-700">{formData.agreementNo}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ভাড়াটিয়া / ইজারাদারের নাম *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পিতা / স্বামীর নাম</label>
              <input
                type="text"
                value={formData.fatherOrSpouseName}
                onChange={(e) => setFormData({ ...formData, fatherOrSpouseName: e.target.value })}
                placeholder="যেমন: মোঃ আব্দুর রশিদ"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="01711XXXXXX"
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">জাতীয় পরিচয়পত্র (NID)</label>
              <input
                type="text"
                value={formData.nid}
                onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                placeholder="NID নম্বর"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">দোকান / ইউনিট নং</label>
              <input
                type="text"
                value={formData.unitOrShopNo}
                onChange={(e) => setFormData({ ...formData, unitOrShopNo: e.target.value })}
                placeholder="যেমন: দোকান নং- ০১"
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">প্রতিষ্ঠানের নাম</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="যেমন: মেসার্স আল-মদিনা ফার্মেসি"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ব্যবসার ধরন</label>
              <input
                type="text"
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                placeholder="যেমন: ওষুধ / লাইব্রেরি"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              ভাড়ার শর্ত ও আর্থিক বিবরণী
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">মাসিক ভাড়া (৳) *</label>
                <input
                  type="number"
                  required
                  value={formData.monthlyRent || ''}
                  onChange={(e) => {
                    const rent = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      monthlyRent: rent,
                      annualRent: rent * 12
                    });
                  }}
                  placeholder="e.g. 15000"
                  className="w-full text-xs font-bold px-3 py-2 border border-emerald-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">অগ্রিম জামানত (৳)</label>
                <input
                  type="number"
                  value={formData.securityDeposit || ''}
                  onChange={(e) => setFormData({ ...formData, securityDeposit: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 100000"
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">প্রদেয় তারিখ (মাসের কত তারিখ)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.paymentDueDate}
                  onChange={(e) => setFormData({ ...formData, paymentDueDate: parseInt(e.target.value) || 10 })}
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">চুক্তি শুরুর তারিখ *</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">চুক্তি সমাপ্তির তারিখ *</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">চুক্তির বর্তমান স্ট্যাটাস</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="EXPIRING_SOON">শীঘ্রই মেয়াদোত্তীর্ণ</option>
                  <option value="EXPIRED">মেয়াদোত্তীর্ণ (Expired)</option>
                  <option value="TERMINATED">চুক্তি বাতিল / সমাপ্ত</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ভাড়াটিয়ার স্থায়ী ঠিকানা</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="গ্রাম/রোড, ডাকঘর, থানা ও জেলা"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">বিশেষ মন্তব্য বা শর্তাবলী</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="জামানতের চেক নম্বর বা বিশেষ কোনো শর্ত..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'ভাড়া চুক্তি সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

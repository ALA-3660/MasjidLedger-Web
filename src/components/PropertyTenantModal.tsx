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
  Save,
  Tag,
  DollarSign,
  MapPin,
  FileText,
  Clock,
  Briefcase,
  Image as ImageIcon
} from 'lucide-react';
import { PropertyTenant, MosqueProperty } from '../types';
import { Language, formatCurrency } from '../lib/i18n';

interface PropertyTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  property?: MosqueProperty | null;
  properties?: MosqueProperty[];
  tenant?: PropertyTenant | null;
  onSubmit: (tenantData: Partial<PropertyTenant>, propertyId?: string) => Promise<void>;
  language?: Language;
}

export const PropertyTenantModal: React.FC<PropertyTenantModalProps> = ({
  isOpen,
  onClose,
  property,
  properties = [],
  tenant,
  onSubmit,
  language = 'bn'
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
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
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED' | 'TERMINATED',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form data
  useEffect(() => {
    if (!isOpen) return;

    // Determine initial property id
    const initialPropId = property?.id || (properties.length > 0 ? properties[0].id : '');
    setSelectedPropertyId(initialPropId);

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
        annualRent: tenant.annualRent || (tenant.monthlyRent ? tenant.monthlyRent * 12 : 0),
        securityDeposit: tenant.securityDeposit || 0,
        paymentDueDate: tenant.paymentDueDate || 10,
        status: (tenant.status as any) || 'ACTIVE',
        notes: tenant.notes || ''
      });
    } else {
      const year = new Date().getFullYear();
      const currentTargetProp = properties.find((p) => p.id === initialPropId) || property;
      const existingCount = (currentTargetProp?.tenants?.length || 0) + 1;
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
  }, [tenant, property, properties, isOpen]);

  if (!isOpen) return null;

  const handleMonthlyRentChange = (val: number) => {
    setFormData((prev) => ({
      ...prev,
      monthlyRent: val,
      annualRent: val * 12
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId && !property?.id) {
      setError('অনুগ্রহ করে সংশ্লিষ্ট ওয়াকফ সম্পত্তি নির্বাচন করুন');
      return;
    }
    if (!formData.name.trim()) {
      setError('ভাড়াটিয়া / ইজারাদারের নাম আবশ্যক');
      return;
    }
    if (!formData.mobile.trim()) {
      setError('মোবাইল নম্বর আবশ্যক');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const targetPropertyId = selectedPropertyId || property?.id;
      await onSubmit(
        {
          ...(tenant ? { id: tenant.id } : {}),
          ...formData,
          annualRent: formData.annualRent || formData.monthlyRent * 12
        },
        targetPropertyId
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chosenProperty = properties.find((p) => p.id === selectedPropertyId) || property;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-siliguri">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-700/40 rounded-2xl border border-blue-400/30 text-white">
              <UserCheck className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                {tenant ? 'ভাড়াটিয়া / ইজারাদার চুক্তি সম্পাদনা' : 'নতুন ভাড়াটিয়া / ইজারাদার এন্ট্রি ফরম'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">
                  {tenant ? 'আপডেট' : 'নতুন সংযোজন'}
                </span>
              </h2>
              <p className="text-xs text-blue-200/90 font-tiro mt-0.5">
                {chosenProperty
                  ? `সম্পত্তি: ${chosenProperty.name || chosenProperty.description || chosenProperty.propertyCode} (${chosenProperty.propertyCode})`
                  : 'ওয়াকফ সম্পত্তি ও দোকান ভাড়াচুক্তি রেজিস্টার'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Property Selection & Unit */}
          <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <Building className="w-4 h-4 text-blue-700" />
              <span>১. ওয়াকফ সম্পত্তি ও অবস্থান নির্ধারণ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Property Select Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ওয়াকফ সম্পত্তি / জমিজমা নির্বাচন <span className="text-rose-500">*</span>
                </label>
                {properties.length > 0 ? (
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- সম্পত্তি নির্বাচন করুন --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.propertyCode}] {p.name || p.description} {p.mouza ? `(মৌজা: ${p.mouza})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={property?.name || 'ডিফল্ট সম্পত্তি'}
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-xl text-xs text-slate-700 font-medium"
                  />
                )}
              </div>

              {/* Unit / Shop No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  দোকান / কক্ষ / ফ্ল্যাট / ইউনিট নম্বর <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  value={formData.unitOrShopNo}
                  onChange={(e) => setFormData({ ...formData, unitOrShopNo: e.target.value })}
                  placeholder="যেমন: Shop-01, রুম-১০২, মার্কেট অংশ-১"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tenant Personal Details */}
          <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <UserCheck className="w-4 h-4 text-indigo-700" />
              <span>২. ভাড়াটিয়া / ইজারাদারের পরিচিতি</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ভাড়াটিয়া / ইজারাদারের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="যেমন: মো: রফিকুল ইসলাম"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পিতা / স্বামীর নাম
                </label>
                <input
                  type="text"
                  value={formData.fatherOrSpouseName}
                  onChange={(e) => setFormData({ ...formData, fatherOrSpouseName: e.target.value })}
                  placeholder="পিতা বা অভিভাবকের নাম"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="০১৭xxxxxxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জাতীয় পরিচয়পত্র (NID) নম্বর
                </label>
                <input
                  type="text"
                  value={formData.nid}
                  onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                  placeholder="১০ বা ১৭ ডিজিট NID"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ব্যবসার নাম / প্রতিষ্ঠানের নাম
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="যেমন: আল-মদিনা ক্লথ স্টোর"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ব্যবসার ধরন / ব্যবহারের উদ্দেশ্য
                </label>
                <input
                  type="text"
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  placeholder="যেমন: মুদি, ফার্মেসি, গুদাম, আবাসিক"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                স্থায়ী / বর্তমান ঠিকানা
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="গ্রাম/রোড, ডাকঘর, উপজেলা, জেলা"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 3: Agreement & Financials */}
          <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>৩. ভাড়াচুক্তি ও আর্থিক শর্তাবলী</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  চুক্তি নম্বর (Agreement No)
                </label>
                <input
                  type="text"
                  value={formData.agreementNo}
                  onChange={(e) => setFormData({ ...formData, agreementNo: e.target.value })}
                  placeholder="AGR-2026-01"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  চুক্তির শুরুর তারিখ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  চুক্তির সমাপ্তি / মেয়াদের তারিখ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মাসিক ভাড়া (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.monthlyRent || ''}
                  onChange={(e) => handleMonthlyRentChange(Number(e.target.value))}
                  placeholder="০.০০"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বার্ষিক ভাড়া (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.annualRent || ''}
                  onChange={(e) => setFormData({ ...formData, annualRent: Number(e.target.value) })}
                  placeholder="০.০০"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জামানত / সিকিউরিটি (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.securityDeposit || ''}
                  onChange={(e) => setFormData({ ...formData, securityDeposit: Number(e.target.value) })}
                  placeholder="০.০০"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ভাড়া পরিশোধের তারিখ (Due Day)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.paymentDueDate}
                  onChange={(e) => setFormData({ ...formData, paymentDueDate: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  চুক্তির বর্তমান অবস্থা (Status)
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="EXPIRING_SOON">মেয়াদ শেষের পথে (Expiring Soon)</option>
                  <option value="EXPIRED">মেয়াদোত্তীর্ণ (Expired)</option>
                  <option value="SUSPENDED">স্থগিত (Suspended)</option>
                  <option value="TERMINATED">সমাপ্ত / বাতিল (Terminated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ছবি বা চুক্তিপত্র লিঙ্ক (URL)
                </label>
                <input
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বিশেষ শর্তাবলী ও মন্তব্য (Terms & Notes)
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ভাড়ার বিশেষ নিয়মাবলী, বিদ্যুৎ বিল ও পানি বিলের শর্ত..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-tiro">
            * লাল চিহ্নিত ফিল্ডগুলো পূরণ করা আবশ্যক
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : tenant ? 'আপডেট করুন' : 'ভাড়াটিয়া সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

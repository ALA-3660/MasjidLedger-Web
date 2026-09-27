import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  MapPin,
  FileText,
  User,
  Shield,
  Save,
  Compass,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  Eye,
  Layers,
  Landmark
} from 'lucide-react';
import { MosqueProperty } from '../types';
import { Language, translations, formatCurrency } from '../lib/i18n';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  property?: MosqueProperty | null;
  onSubmit: (data: Partial<MosqueProperty>) => Promise<void>;
  language: Language;
}

export const PROPERTY_CATEGORIES = [
  { id: 'LAND', labelBn: 'জমি / প্লট', labelEn: 'Land / Plot' },
  { id: 'MARKET', labelBn: 'মার্কেট / বাণিজ্যিক চত্বর', labelEn: 'Commercial Market' },
  { id: 'SHOP', labelBn: 'দোকানঘর / বাণিজ্যিক কক্ষ', labelEn: 'Shop / Commercial Room' },
  { id: 'BUILDING', labelBn: 'ভবন / স্থাপনা', labelEn: 'Building / Facility' },
  { id: 'POND', labelBn: 'পুকুর / জলাশয়', labelEn: 'Pond / Waterbody' },
  { id: 'GARDEN', labelBn: 'বাগান / উন্মুক্ত প্রান্তর', labelEn: 'Garden / Plantation' },
  { id: 'OTHER', labelBn: 'অন্যান্য স্থাবর সম্পত্তি', labelEn: 'Other Property' }
];

export const PROPERTY_TYPES = [
  { id: 'COMMERCIAL_LAND', categoryId: 'LAND', labelBn: 'বাণিজ্যিক জমি / মার্কেট সংলগ্ন', labelEn: 'Commercial Land' },
  { id: 'AGRICULTURAL_LAND', categoryId: 'LAND', labelBn: 'কৃষি জমি / আবাদি জমি', labelEn: 'Agricultural Land' },
  { id: 'RESIDENTIAL_PLOT', categoryId: 'LAND', labelBn: 'আবাসিক প্লট / ভিটা জমি', labelEn: 'Residential Plot' },
  { id: 'GRAVEYARD_ADJACENT', categoryId: 'LAND', labelBn: 'কবরস্থান সংলগ্ন ওয়াকফ জমি', labelEn: 'Graveyard Adjacent Land' },
  { id: 'MARKET', categoryId: 'MARKET', labelBn: 'পাকা বাণিজ্যিক মার্কেট', labelEn: 'Commercial Market' },
  { id: 'SHOP', categoryId: 'SHOP', labelBn: 'দোকানঘর / বাণিজ্যিক কক্ষ', labelEn: 'Shop / Commercial Room' },
  { id: 'BUILDING', categoryId: 'BUILDING', labelBn: 'পাকা ভবন / বহুতল ইমারত', labelEn: 'Building' },
  { id: 'POND', categoryId: 'POND', labelBn: 'পুকুর / মৎস্য খামার', labelEn: 'Pond / Fishery' },
  { id: 'GARDEN', categoryId: 'GARDEN', labelBn: 'বাগান / ফলদ বৃক্ষরাজি', labelEn: 'Garden' },
  { id: 'OTHER', categoryId: 'OTHER', labelBn: 'অন্যান্য স্থাবর সম্পত্তি', labelEn: 'Other' }
];

export const POSSESSION_STATUSES = [
  { id: 'MOSQUE_CONTROL', labelBn: 'মসজিদের প্রত্যক্ষ নিয়ন্ত্রণে / নিজস্ব ব্যবহার', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'RENTED', labelBn: 'ভাড়া দেওয়া আছে (দোকান / ফ্ল্যাট)', color: 'bg-blue-100 text-blue-800' },
  { id: 'LEASED', labelBn: 'বাৎসরিক ইজারাভুক্ত (পুকুর / জমি)', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'VACANT', labelBn: 'ফাঁকা / উন্মুক্ত জমি', color: 'bg-amber-100 text-amber-800' },
  { id: 'PARTIAL', labelBn: 'আংশিক দখল ও আংশিক খালি', color: 'bg-teal-100 text-teal-800' },
  { id: 'DISPUTED', labelBn: 'বিরোধপূর্ণ / সীমানা জটিলতা', color: 'bg-orange-100 text-orange-800' },
  { id: 'ILLEGAL_OCCUPIED', labelBn: 'অবৈধ দখল / জবরদখলকৃত', color: 'bg-rose-100 text-rose-800' }
];

export const PROPERTY_STATUSES = [
  { id: 'ACTIVE', labelBn: 'সক্রিয় ও ব্যবহৃত' },
  { id: 'RENTED', labelBn: 'ভাড়াকৃত' },
  { id: 'LEASED', labelBn: 'ইজারাকৃত' },
  { id: 'VACANT', labelBn: 'অব্যবহৃত / ফাঁকা' },
  { id: 'UNDER_CONSTRUCTION', labelBn: 'নির্মাণাধীন' },
  { id: 'UNDER_MAINTENANCE', labelBn: 'সংস্কারাধীন' },
  { id: 'DISPUTED', labelBn: 'বিরোধপূর্ণ' },
  { id: 'LEGAL_CASE', labelBn: 'মামলাধীন' },
  { id: 'OTHER', labelBn: 'অন্যান্য' }
];

export const AREA_UNITS = [
  { id: 'DECIMAL', labelBn: 'শতাংশ / শতক' },
  { id: 'KATHA', labelBn: 'কাঠা' },
  { id: 'BIGHA', labelBn: 'বিঘা' },
  { id: 'ACRE', labelBn: 'একর' },
  { id: 'SQFT', labelBn: 'বর্গফুট' },
  { id: 'SHOTOK', labelBn: 'ছটাক' }
];

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
  isOpen,
  onClose,
  property,
  onSubmit,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'land' | 'boundaries' | 'waqf' | 'review'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    propertyCode: '',
    name: '',
    nameBn: '',
    category: 'LAND' as any,
    type: 'COMMERCIAL_LAND' as any,
    description: '',
    location: '',
    fullAddress: '',
    area: '',
    areaAmount: 0,
    areaUnit: 'DECIMAL' as any,
    ownershipType: 'WAQF' as any,

    // Land Records
    csPlotNo: '',
    saPlotNo: '',
    rsPlotNo: '',
    bsPlotNo: '',
    plotNo: '',
    csKhatianNo: '',
    saKhatianNo: '',
    rsKhatianNo: '',
    bsKhatianNo: '',
    mutationKhatianNo: '',
    khatianNo: '',
    mouza: '',
    jlNumber: '',
    subRegistryOffice: '',

    // Boundaries
    boundaryNorth: '',
    boundarySouth: '',
    boundaryEast: '',
    boundaryWest: '',

    // Waqf & Waqif
    waqfEnrollmentNo: '',
    waqfDeedNo: '',
    waqfYear: '',
    waqfDeedDate: '',
    waqifName: '',
    waqifFatherName: '',
    waqifAddress: '',
    waqfPurpose: '',
    waqfEstateName: '',

    // Use & Possession
    currentUse: '',
    possessionStatus: 'MOSQUE_CONTROL' as any,
    status: 'ACTIVE' as any,
    estimatedValue: 0,
    monthlyIncome: 0,
    annualIncome: 0,
    photoUrl: '',
    notes: ''
  });

  useEffect(() => {
    if (property) {
      setFormData({
        propertyCode: property.propertyCode || '',
        name: property.name || property.description || '',
        nameBn: property.nameBn || property.name || property.description || '',
        category: property.category || 'LAND',
        type: property.type || 'COMMERCIAL_LAND',
        description: property.description || '',
        location: property.location || '',
        fullAddress: property.fullAddress || property.location || '',
        area: property.area || '',
        areaAmount: property.areaAmount || 0,
        areaUnit: property.areaUnit || 'DECIMAL',
        ownershipType: property.ownershipType || 'WAQF',

        csPlotNo: property.csPlotNo || '',
        saPlotNo: property.saPlotNo || '',
        rsPlotNo: property.rsPlotNo || '',
        bsPlotNo: property.bsPlotNo || '',
        plotNo: property.plotNo || property.bsPlotNo || property.rsPlotNo || '',
        csKhatianNo: property.csKhatianNo || '',
        saKhatianNo: property.saKhatianNo || '',
        rsKhatianNo: property.rsKhatianNo || '',
        bsKhatianNo: property.bsKhatianNo || '',
        mutationKhatianNo: property.mutationKhatianNo || '',
        khatianNo: property.khatianNo || property.bsKhatianNo || property.rsKhatianNo || '',
        mouza: property.mouza || '',
        jlNumber: property.jlNumber || '',
        subRegistryOffice: property.subRegistryOffice || '',

        boundaryNorth: property.boundaryNorth || '',
        boundarySouth: property.boundarySouth || '',
        boundaryEast: property.boundaryEast || '',
        boundaryWest: property.boundaryWest || '',

        waqfEnrollmentNo: property.waqfEnrollmentNo || '',
        waqfDeedNo: property.waqfDeedNo || '',
        waqfYear: property.waqfYear || '',
        waqfDeedDate: property.waqfDeedDate || '',
        waqifName: property.waqifName || '',
        waqifFatherName: property.waqifFatherName || '',
        waqifAddress: property.waqifAddress || '',
        waqfPurpose: property.waqfPurpose || '',
        waqfEstateName: property.waqfEstateName || '',

        currentUse: property.currentUse || '',
        possessionStatus: property.possessionStatus || 'MOSQUE_CONTROL',
        status: property.status || 'ACTIVE',
        estimatedValue: property.estimatedValue || 0,
        monthlyIncome: property.monthlyIncome || property.monthlyRent || 0,
        annualIncome: property.annualIncome || 0,
        photoUrl: property.photoUrl || '',
        notes: property.notes || ''
      });
    } else {
      const year = new Date().getFullYear();
      const randHex = Math.floor(100 + Math.random() * 900);
      setFormData({
        propertyCode: `WPF-${year}-${randHex}`,
        name: '',
        nameBn: '',
        category: 'LAND',
        type: 'COMMERCIAL_LAND',
        description: '',
        location: '',
        fullAddress: '',
        area: '',
        areaAmount: 0,
        areaUnit: 'DECIMAL',
        ownershipType: 'WAQF',

        csPlotNo: '',
        saPlotNo: '',
        rsPlotNo: '',
        bsPlotNo: '',
        plotNo: '',
        csKhatianNo: '',
        saKhatianNo: '',
        rsKhatianNo: '',
        bsKhatianNo: '',
        mutationKhatianNo: '',
        khatianNo: '',
        mouza: '',
        jlNumber: '',
        subRegistryOffice: '',

        boundaryNorth: '',
        boundarySouth: '',
        boundaryEast: '',
        boundaryWest: '',

        waqfEnrollmentNo: '',
        waqfDeedNo: '',
        waqfYear: '',
        waqfDeedDate: '',
        waqifName: '',
        waqifFatherName: '',
        waqifAddress: '',
        waqfPurpose: '',
        waqfEstateName: '',

        currentUse: '',
        possessionStatus: 'MOSQUE_CONTROL',
        status: 'ACTIVE',
        estimatedValue: 0,
        monthlyIncome: 0,
        annualIncome: 0,
        photoUrl: '',
        notes: ''
      });
    }
    setError(null);
    setActiveTab('general');
  }, [property, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && !formData.description) {
      setError('অনুগ্রহ করে সম্পত্তির নাম বা বিবরণ প্রদান করুন');
      setActiveTab('general');
      return;
    }

    // Auto compute formatted area string if areaAmount provided
    let computedArea = formData.area;
    if (formData.areaAmount > 0) {
      const unitLabel = AREA_UNITS.find(u => u.id === formData.areaUnit)?.labelBn || 'শতাংশ';
      computedArea = `${formData.areaAmount} ${unitLabel}`;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        ...formData,
        area: computedArea || formData.area || '০ শতাংশ',
        description: formData.description || formData.name,
        name: formData.name || formData.description,
        nameBn: formData.nameBn || formData.name || formData.description
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryObj = PROPERTY_CATEGORIES.find(c => c.id === formData.category);
  const selectedTypeObj = PROPERTY_TYPES.find(t => t.id === formData.type);
  const selectedPossessionObj = POSSESSION_STATUSES.find(p => p.id === formData.possessionStatus);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-siliguri">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-900 via-stone-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-700/40 rounded-xl border border-amber-400/30">
              <Building className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {property ? 'ওয়াকফ সম্পত্তি তথ্য সম্পাদনা' : 'নতুন ওয়াকফ সম্পত্তি অন্তর্ভুক্তি'}
              </h2>
              <p className="text-xs text-amber-200 font-tiro">
                ওয়াকফ এস্টেটের জমি, মার্কেট, দোকান ও স্থাবর সম্পত্তির মাস্টার রেজিস্টার
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

        {/* Tab / Step Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            ১. সাধারণ তথ্য ও পরিমাপ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('land')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'land'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            ২. দাগ, খতিয়ান ও ভূমি রেকর্ড
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('boundaries')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'boundaries'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            ৩. চতুঃসীমানা ও ওয়াকফ দলিল
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('waqf')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'waqf'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            ৪. ওয়াকিফ ও দখল অবস্থা
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'review'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            ৫. চূড়ান্ত পর্যালোচনা
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সম্পত্তি কোড / আইডি (সিস্টেম জেনারেটেড) *
                  </label>
                  <input
                    type="text"
                    value={formData.propertyCode}
                    readOnly
                    className="w-full text-xs font-baloo font-bold px-3 py-2 border border-slate-300 rounded-xl bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">স্বয়ংক্রিয় ইউনিক কোড</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সম্পত্তির নাম / শিরোনাম *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value, nameBn: e.target.value })}
                    required
                    placeholder="যেমন: খুরুশকুল বাজার সংলগ্ন ওয়াকফ মার্কেট ও জমি"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    {PROPERTY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.labelBn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সম্পত্তির শ্রেণি / ধরন *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.labelBn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মালিকানা ধরন *</label>
                  <select
                    value={formData.ownershipType}
                    onChange={(e) => setFormData({ ...formData, ownershipType: e.target.value as any })}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="WAQF">ওয়াকফ সম্পত্তি (স্থায়ী)</option>
                    <option value="PURCHASED">মসজিদ কর্তৃক ক্রয়কৃত</option>
                    <option value="DONATED">দানপত্র / হেবা সূত্রে প্রাপ্ত</option>
                    <option value="LEASED">দীর্ঘমেয়াদী ইজারা নেওয়া</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সাধারণ অবস্থান *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    placeholder="যেমন: খুরুশকুল বাজার, কক্সবাজার"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণাঙ্গ ঠিকানা / হোল্ডিং নং</label>
                  <input
                    type="text"
                    value={formData.fullAddress}
                    onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                    placeholder="গ্রাম/মহল্লা, ডাকঘর, উপজেলা, জেলা ও হোল্ডিং নম্বর"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-700" />
                  <span>জমির পরিমাণ ও বর্তমান বাজারমূল্য</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">পরিমাণ (সংখ্যায়)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.areaAmount || ''}
                      onChange={(e) => setFormData({ ...formData, areaAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="যেমন: ১২.৫০"
                      className="w-full text-xs font-baloo font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">পরিমাপের একক</label>
                    <select
                      value={formData.areaUnit}
                      onChange={(e) => setFormData({ ...formData, areaUnit: e.target.value as any })}
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                    >
                      {AREA_UNITS.map((u) => (
                        <option key={u.id} value={u.id}>{u.labelBn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">আনুমানিক বর্তমান বাজারমূল্য (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimatedValue || ''}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })}
                      placeholder="টাকার পরিমাণ"
                      className="w-full text-xs font-baloo font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">সম্পত্তির ছবি / সাইট ম্যাপ URL</label>
                <input
                  type="text"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://example.com/property-photo.jpg"
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('land')}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>পরবর্তী ধাপ: ভূমি রেকর্ড</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LAND RECORDS */}
          {activeTab === 'land' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মৌজা নাম *</label>
                  <input
                    type="text"
                    value={formData.mouza}
                    onChange={(e) => setFormData({ ...formData, mouza: e.target.value })}
                    placeholder="যেমন: খুরুশকুল"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">জে.এল. (JL) নম্বর</label>
                  <input
                    type="text"
                    value={formData.jlNumber}
                    onChange={(e) => setFormData({ ...formData, jlNumber: e.target.value })}
                    placeholder="যেমন: ৪২"
                    className="w-full text-xs font-baloo font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সাব-রেজিস্ট্রি অফিস</label>
                  <input
                    type="text"
                    value={formData.subRegistryOffice}
                    onChange={(e) => setFormData({ ...formData, subRegistryOffice: e.target.value })}
                    placeholder="যেমন: কক্সবাজার সদর"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Khatian Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>খতিয়ান নম্বরসমূহ</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">সি.এস (CS) খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.csKhatianNo}
                      onChange={(e) => setFormData({ ...formData, csKhatianNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">এস.এ (SA) খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.saKhatianNo}
                      onChange={(e) => setFormData({ ...formData, saKhatianNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">আর.এস (RS) খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.rsKhatianNo}
                      onChange={(e) => setFormData({ ...formData, rsKhatianNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">বি.এস (BS) খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.bsKhatianNo}
                      onChange={(e) => setFormData({ ...formData, bsKhatianNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">নামজারি/মিউটেশন</label>
                    <input
                      type="text"
                      value={formData.mutationKhatianNo}
                      onChange={(e) => setFormData({ ...formData, mutationKhatianNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-blue-700"
                    />
                  </div>
                </div>
              </div>

              {/* Plot Numbers */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>দাগ নম্বরসমূহ</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">সি.এস (CS) দাগ</label>
                    <input
                      type="text"
                      value={formData.csPlotNo}
                      onChange={(e) => setFormData({ ...formData, csPlotNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">এস.এ (SA) দাগ</label>
                    <input
                      type="text"
                      value={formData.saPlotNo}
                      onChange={(e) => setFormData({ ...formData, saPlotNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">আর.এস (RS) দাগ</label>
                    <input
                      type="text"
                      value={formData.rsPlotNo}
                      onChange={(e) => setFormData({ ...formData, rsPlotNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">বি.এস / হাল (BS) দাগ</label>
                    <input
                      type="text"
                      value={formData.bsPlotNo}
                      onChange={(e) => setFormData({ ...formData, bsPlotNo: e.target.value, plotNo: e.target.value })}
                      className="w-full text-xs font-baloo px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>পূর্ববর্তী</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('boundaries')}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>পরবর্তী ধাপ: চতুঃসীমানা</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BOUNDARIES & DEED */}
          {activeTab === 'boundaries' && (
            <div className="space-y-4">
              {/* Boundaries */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  <span>চতুঃসীমানা বিবরণ</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">উত্তর সীমানা</label>
                    <input
                      type="text"
                      value={formData.boundaryNorth}
                      onChange={(e) => setFormData({ ...formData, boundaryNorth: e.target.value })}
                      placeholder="যেমন: সরকারি পাকা রাস্তা"
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">দক্ষিণ সীমানা</label>
                    <input
                      type="text"
                      value={formData.boundarySouth}
                      onChange={(e) => setFormData({ ...formData, boundarySouth: e.target.value })}
                      placeholder="যেমন: জামে মসজিদ চত্বর"
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ব সীমানা</label>
                    <input
                      type="text"
                      value={formData.boundaryEast}
                      onChange={(e) => setFormData({ ...formData, boundaryEast: e.target.value })}
                      placeholder="যেমন: মোঃ করিমের বাড়ি"
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">পশ্চিম সীমানা</label>
                    <input
                      type="text"
                      value={formData.boundaryWest}
                      onChange={(e) => setFormData({ ...formData, boundaryWest: e.target.value })}
                      placeholder="যেমন: নদী / খাল"
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Waqf Deed */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>ওয়াকফ দলিল ও সরকারি তালিকাভুক্তি</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ওয়াকফ দলিল নম্বর</label>
                    <input
                      type="text"
                      value={formData.waqfDeedNo}
                      onChange={(e) => setFormData({ ...formData, waqfDeedNo: e.target.value })}
                      placeholder="দলিল নং"
                      className="w-full text-xs font-baloo px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">দলিলের তারিখ</label>
                    <input
                      type="date"
                      value={formData.waqfDeedDate}
                      onChange={(e) => setFormData({ ...formData, waqfDeedDate: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ওয়াকফ প্রশাসন তালিকাভুক্তি নং (E.C)</label>
                    <input
                      type="text"
                      value={formData.waqfEnrollmentNo}
                      onChange={(e) => setFormData({ ...formData, waqfEnrollmentNo: e.target.value })}
                      placeholder="E.C নম্বর"
                      className="w-full text-xs font-baloo px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('land')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>পূর্ববর্তী</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('waqf')}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>পরবর্তী ধাপ: ওয়াকিফ ও দখল</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: WAQIF & POSSESSION */}
          {activeTab === 'waqf' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>ওয়াকিফ / দানকারীর পরিচয়</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ওয়াকিফের নাম</label>
                    <input
                      type="text"
                      value={formData.waqifName}
                      onChange={(e) => setFormData({ ...formData, waqifName: e.target.value })}
                      placeholder="ওয়াকিফের নাম"
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">পিতার নাম</label>
                    <input
                      type="text"
                      value={formData.waqifFatherName}
                      onChange={(e) => setFormData({ ...formData, waqifFatherName: e.target.value })}
                      placeholder="পিতার নাম"
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">ওয়াকিফের ঠিকানা</label>
                    <input
                      type="text"
                      value={formData.waqifAddress}
                      onChange={(e) => setFormData({ ...formData, waqifAddress: e.target.value })}
                      placeholder="ওয়াকিফের পূর্ণ ঠিকানা"
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">বর্তমান দখল ও ব্যবহার অবস্থা *</label>
                  <select
                    value={formData.possessionStatus}
                    onChange={(e) => setFormData({ ...formData, possessionStatus: e.target.value as any })}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    {POSSESSION_STATUSES.map((p) => (
                      <option key={p.id} value={p.id}>{p.labelBn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সম্পত্তির সার্বিক অবস্থা *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    {PROPERTY_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.labelBn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">বর্তমান ব্যবহারের বিবরণ</label>
                <input
                  type="text"
                  value={formData.currentUse}
                  onChange={(e) => setFormData({ ...formData, currentUse: e.target.value })}
                  placeholder="যেমন: নিচতলায় ১২টি দোকান ভাড়া, দোতলায় হেফজখানা"
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">অতিরিক্ত নোট / বিশেষ নির্দেশনা</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="সম্পত্তি সংক্রান্ত অন্য কোনো তথ্য বা নির্দেশনাবলি..."
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('boundaries')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>পূর্ববর্তী</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('review')}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>পরবর্তী ধাপ: চূড়ান্ত পর্যালোচনা</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: FINAL REVIEW BEFORE SAVE */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>সম্পত্তি সংরক্ষণের পূর্ববর্তী সারসংক্ষেপ পর্যালোচনা</span>
                </div>
                <p className="text-xs text-emerald-700 font-tiro">
                  অনুগ্রহ করে তথ্যাবলি যাচাই করুন। সবকিছু সঠিক থাকলে নিচে "সম্পত্তি সংরক্ষণ করুন" বাটনে ক্লিক করুন।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                    <div className="text-[11px] text-slate-500">সম্পত্তির কোড ও নাম:</div>
                    <div className="font-bold text-slate-900 text-sm">{formData.name || '—'}</div>
                    <div className="font-baloo text-xs text-amber-800 font-semibold">{formData.propertyCode}</div>
                    <div className="text-[11px] text-slate-600">{selectedCategoryObj?.labelBn} • {selectedTypeObj?.labelBn}</div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                    <div className="text-[11px] text-slate-500">অবস্থান ও পরিমাপ:</div>
                    <div className="font-bold text-slate-800">{formData.location || '—'}</div>
                    <div className="font-baloo font-bold text-emerald-700 text-sm">
                      {formData.areaAmount > 0 ? `${formData.areaAmount} ${AREA_UNITS.find(u => u.id === formData.areaUnit)?.labelBn}` : (formData.area || '০ শতাংশ')}
                    </div>
                    {formData.estimatedValue > 0 && (
                      <div className="text-[11px] text-slate-600 font-baloo">
                        বাজারমূল্য: {formatCurrency(formData.estimatedValue)}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                    <div className="text-[11px] text-slate-500">ভূমি রেকর্ড (খতিয়ান ও দাগ):</div>
                    <div className="text-slate-800">
                      <strong>মৌজা:</strong> {formData.mouza || '—'} {formData.jlNumber ? `(JL: ${formData.jlNumber})` : ''}
                    </div>
                    <div className="text-[11px] text-slate-600 font-baloo">
                      বি.এস দাগ: {formData.bsPlotNo || formData.plotNo || '—'} • নামজারি খতিয়ান: {formData.mutationKhatianNo || formData.bsKhatianNo || '—'}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                    <div className="text-[11px] text-slate-500">ওয়াকিফ ও দখল অবস্থা:</div>
                    <div className="font-semibold text-slate-800">ওয়াকিফ: {formData.waqifName || '—'}</div>
                    <div className="text-[11px] text-slate-600">দখল: {selectedPossessionObj?.labelBn || '—'}</div>
                    {formData.waqfDeedNo && (
                      <div className="text-[11px] text-slate-600 font-baloo">দলিল নং: {formData.waqfDeedNo}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('waqf')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>পূর্ববর্তী ধাপে সংশোধন</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : '💾 সম্পত্তি সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

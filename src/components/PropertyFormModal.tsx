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
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';
import { MosqueProperty } from '../types';
import { Language, translations } from '../lib/i18n';

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
  { id: 'COMMERCIAL_LAND', labelBn: 'বাণিজ্যিক জমি / মার্কেট', labelEn: 'Commercial Land / Market' },
  { id: 'AGRICULTURAL_LAND', labelBn: 'কৃষি জমি / আবাদি জমি', labelEn: 'Agricultural Land' },
  { id: 'RESIDENTIAL_PLOT', labelBn: 'আবাসিক প্লট / ভিটা জমি', labelEn: 'Residential Plot' },
  { id: 'SHOP', labelBn: 'দোকানঘর', labelEn: 'Shop' },
  { id: 'BUILDING', labelBn: 'পাকা ভবন / ইমারত', labelEn: 'Building' },
  { id: 'POND', labelBn: 'পুকুর / মৎস্য খামার', labelEn: 'Pond / Fishery' },
  { id: 'GRAVEYARD_ADJACENT', labelBn: 'কবরস্থান সংলগ্ন ওয়াকফ জমি', labelEn: 'Graveyard Adjacent Land' },
  { id: 'OTHER', labelBn: 'অন্যান্য', labelEn: 'Other' }
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
  const [activeTab, setActiveTab] = useState<'general' | 'land' | 'boundaries' | 'waqf'>('general');
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
      setFormData({
        propertyCode: `PROP-${year}-001`,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-700/40 rounded-xl border border-blue-400/30">
              <Building className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {property ? 'ওয়াকফ সম্পত্তি তথ্য সম্পাদনা' : 'নতুন ওয়াকফ সম্পত্তি অন্তর্ভুক্তি'}
              </h2>
              <p className="text-xs text-blue-200">
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 bg-white'
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
                ? 'border-blue-600 text-blue-600 bg-white'
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
                ? 'border-blue-600 text-blue-600 bg-white'
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
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            ৪. ওয়াকিফ ও দখল অবস্থা
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
                    সম্পত্তি কোড / আইডি *
                  </label>
                  <input
                    type="text"
                    value={formData.propertyCode}
                    onChange={(e) => setFormData({ ...formData, propertyCode: e.target.value })}
                    required
                    placeholder="e.g. PROP-2026-001"
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
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
                    placeholder="যেমন: মসজিদ সংলগ্ন পাকা মার্কেট ও দোকানঘর"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
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
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
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
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="WAQF">ওয়াকফকৃত সম্পত্তি (Waqf)</option>
                    <option value="PURCHASED">মসজিদের ক্রয়কৃত জমি</option>
                    <option value="DONATED">দানপত্র / হেবা সূত্রে প্রাপ্ত</option>
                    <option value="LEASED">সরকারি বন্দোবস্ত / লিজ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সাধারণ অবস্থান *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    placeholder="যেমন: মসজিদ সংলগ্ন মূল সড়ক, মিরপুর-১২"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণাঙ্গ ঠিকানা / হোল্ডিং নং</label>
                  <input
                    type="text"
                    value={formData.fullAddress}
                    onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                    placeholder="হোল্ডিং নং- ১২/এ, ব্লক-ডি, পল্লবী, ঢাকা"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-700" />
                  জমির পরিমাপ ও আর্থিক মূল্যায়ন
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">জমির পরিমাণ (সংখ্যায়)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.areaAmount || ''}
                      onChange={(e) => setFormData({ ...formData, areaAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 6.50"
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">পরিমাপের একক</label>
                    <select
                      value={formData.areaUnit}
                      onChange={(e) => setFormData({ ...formData, areaUnit: e.target.value as any })}
                      className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {AREA_UNITS.map((u) => (
                        <option key={u.id} value={u.id}>{u.labelBn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">আনুমানিক বর্তমান বাজারমূল্য (৳)</label>
                    <input
                      type="number"
                      value={formData.estimatedValue || ''}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 12500000"
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ছবি বা সাইট ম্যাপের লিঙ্ক (URL)</label>
                <input
                  type="text"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://... (ছবি বা লেআউট নকশার লিংক)"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: LAND RECORDS */}
          {activeTab === 'land' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মৌজা *</label>
                  <input
                    type="text"
                    value={formData.mouza}
                    onChange={(e) => setFormData({ ...formData, mouza: e.target.value })}
                    placeholder="যেমন: সেনপাড়া পর্বতা / তেজগাঁও"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">জে.এল. নম্বর (J.L. No)</label>
                  <input
                    type="text"
                    value={formData.jlNumber}
                    onChange={(e) => setFormData({ ...formData, jlNumber: e.target.value })}
                    placeholder="যেমন: ৪৫"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সাব-রেজিস্ট্রি অফিস</label>
                  <input
                    type="text"
                    value={formData.subRegistryOffice}
                    onChange={(e) => setFormData({ ...formData, subRegistryOffice: e.target.value })}
                    placeholder="যেমন: মিরপুর সাব-রেজিস্ট্রি অফিস"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dag / Plot Numbers Grid */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">দাগ নম্বরসমূহ (Plot / Dag Numbers)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">সি.এস. দাগ (CS)</label>
                    <input
                      type="text"
                      value={formData.csPlotNo}
                      onChange={(e) => setFormData({ ...formData, csPlotNo: e.target.value })}
                      placeholder="দাগ নং"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">এস.এ. দাগ (SA)</label>
                    <input
                      type="text"
                      value={formData.saPlotNo}
                      onChange={(e) => setFormData({ ...formData, saPlotNo: e.target.value })}
                      placeholder="দাগ নং"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">আর.এস. দাগ (RS)</label>
                    <input
                      type="text"
                      value={formData.rsPlotNo}
                      onChange={(e) => setFormData({ ...formData, rsPlotNo: e.target.value })}
                      placeholder="দাগ নং"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 mb-1">বি.এস. / সিটি দাগ (BS)</label>
                    <input
                      type="text"
                      value={formData.bsPlotNo}
                      onChange={(e) => setFormData({ ...formData, bsPlotNo: e.target.value, plotNo: e.target.value })}
                      placeholder="হাল দাগ নং"
                      className="w-full text-xs font-bold px-3 py-2 border border-blue-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Khatian Numbers Grid */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">খতিয়ান নম্বরসমূহ (Khatian Numbers)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">সি.এস. খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.csKhatianNo}
                      onChange={(e) => setFormData({ ...formData, csKhatianNo: e.target.value })}
                      placeholder="খতিয়ান নং"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">এস.এ. খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.saKhatianNo}
                      onChange={(e) => setFormData({ ...formData, saKhatianNo: e.target.value })}
                      placeholder="খতিয়ান নং"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">আর.এস. খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.rsKhatianNo}
                      onChange={(e) => setFormData({ ...formData, rsKhatianNo: e.target.value })}
                      placeholder="খতিয়ান নং"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 mb-1">বি.এস. খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.bsKhatianNo}
                      onChange={(e) => setFormData({ ...formData, bsKhatianNo: e.target.value, khatianNo: e.target.value })}
                      placeholder="হাল খতিয়ান"
                      className="w-full text-xs font-bold px-3 py-2 border border-blue-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-emerald-800 mb-1">নামজারি খতিয়ান</label>
                    <input
                      type="text"
                      value={formData.mutationKhatianNo}
                      onChange={(e) => setFormData({ ...formData, mutationKhatianNo: e.target.value })}
                      placeholder="মিউটেশন নং"
                      className="w-full text-xs font-bold px-3 py-2 border border-emerald-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BOUNDARIES & WAQF DEED */}
          {activeTab === 'boundaries' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-700" />
                  চতুঃসীমানা বিবরণী (Property Boundaries)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">উত্তরে (North)</label>
                    <input
                      type="text"
                      value={formData.boundaryNorth}
                      onChange={(e) => setFormData({ ...formData, boundaryNorth: e.target.value })}
                      placeholder="যেমন: প্রধান সড়ক ও ফুটপাত"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">দক্ষিণে (South)</label>
                    <input
                      type="text"
                      value={formData.boundarySouth}
                      onChange={(e) => setFormData({ ...formData, boundarySouth: e.target.value })}
                      placeholder="যেমন: মসজিদ চত্বর"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">পূর্বে (East)</label>
                    <input
                      type="text"
                      value={formData.boundaryEast}
                      onChange={(e) => setFormData({ ...formData, boundaryEast: e.target.value })}
                      placeholder="যেমন: আবাসিক প্লট"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">পশ্চিমে (West)</label>
                    <input
                      type="text"
                      value={formData.boundaryWest}
                      onChange={(e) => setFormData({ ...formData, boundaryWest: e.target.value })}
                      placeholder="যেমন: সংযোগ রাস্তা ও ড্রেন"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-700" />
                  ওয়াকফ দলিল ও এস্টেট বিবরণী
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ওয়াকফ এনরোলমেন্ট / ইসি নং</label>
                    <input
                      type="text"
                      value={formData.waqfEnrollmentNo}
                      onChange={(e) => setFormData({ ...formData, waqfEnrollmentNo: e.target.value })}
                      placeholder="e.g. EC-18452/1988"
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ওয়াকফ দলিল নম্বর</label>
                    <input
                      type="text"
                      value={formData.waqfDeedNo}
                      onChange={(e) => setFormData({ ...formData, waqfDeedNo: e.target.value })}
                      placeholder="যেমন: ৪৫১২/১৯৮৮"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ওয়াকফের সাল / দলিল তারিখ</label>
                    <input
                      type="text"
                      value={formData.waqfYear}
                      onChange={(e) => setFormData({ ...formData, waqfYear: e.target.value })}
                      placeholder="যেমন: ১৯৮৮ বা 1988-04-15"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ওয়াকফ এস্টেটের নাম</label>
                  <input
                    type="text"
                    value={formData.waqfEstateName}
                    onChange={(e) => setFormData({ ...formData, waqfEstateName: e.target.value })}
                    placeholder="যেমন: হাজী আলতাফ হোসেন ওয়াকফ এস্টেট"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WAQIF & POSSESSION */}
          {activeTab === 'waqf' && (
            <div className="space-y-4">
              {/* Waqif details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-700" />
                  ওয়াকিফ (দানকারী)-এর তথ্য
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 mb-1">ওয়াকিফের নাম</label>
                    <input
                      type="text"
                      value={formData.waqifName}
                      onChange={(e) => setFormData({ ...formData, waqifName: e.target.value })}
                      placeholder="যেমন: মরহুম হাজী মোহাম্মদ আলতাফ হোসেন"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 mb-1">পিতা / স্বামীর নাম</label>
                    <input
                      type="text"
                      value={formData.waqifFatherName}
                      onChange={(e) => setFormData({ ...formData, waqifFatherName: e.target.value })}
                      placeholder="যেমন: মরহুম মৌলভী আব্দুল করিম"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-700 mb-1">ওয়াকিফের স্থায়ী ঠিকানা</label>
                    <input
                      type="text"
                      value={formData.waqifAddress}
                      onChange={(e) => setFormData({ ...formData, waqifAddress: e.target.value })}
                      placeholder="গ্রাম/রোড, ডাকঘর, থানা ও জেলা"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-700 mb-1">ওয়াকফের উদ্দেশ্য ও বিশেষ শর্তাবলী</label>
                    <textarea
                      rows={2}
                      value={formData.waqfPurpose}
                      onChange={(e) => setFormData({ ...formData, waqfPurpose: e.target.value })}
                      placeholder="যেমন: মসজিদের ইমাম-মুয়াজ্জিনের সম্মানী ও হিফজখানার ছাত্রদের সহায়তা"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Current Possession & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">দখল অবস্থা (Possession Status) *</label>
                  <select
                    value={formData.possessionStatus}
                    onChange={(e) => setFormData({ ...formData, possessionStatus: e.target.value as any })}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {POSSESSION_STATUSES.map((p) => (
                      <option key={p.id} value={p.id}>{p.labelBn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">সম্পত্তির স্ট্যাটাস *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {PROPERTY_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.labelBn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">বর্তমান ব্যবহার বিবরণ *</label>
                <input
                  type="text"
                  value={formData.currentUse}
                  onChange={(e) => setFormData({ ...formData, currentUse: e.target.value })}
                  required
                  placeholder="যেমন: ১০টি দোকান ভাড়া দেওয়া আছে (মাসিক আয় মোট ৪৫,০০০ টাকা)"
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">অতিরিক্ত নোট বা মন্তব্য</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="অন্যান্য কোনো গুরুত্বপূর্ণ তথ্য বা কমিটির সিদ্ধান্ত..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab !== 'general' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'waqf') setActiveTab('boundaries');
                    else if (activeTab === 'boundaries') setActiveTab('land');
                    else if (activeTab === 'land') setActiveTab('general');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  পূর্ববর্তী ধাপ
                </button>
              )}
              {activeTab !== 'waqf' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'general') setActiveTab('land');
                    else if (activeTab === 'land') setActiveTab('boundaries');
                    else if (activeTab === 'boundaries') setActiveTab('waqf');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  পরবর্তী ধাপ →
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
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
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : property ? 'তথ্য আপডেট করুন' : 'সম্পত্তি সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

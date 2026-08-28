import React, { useState } from 'react';
import {
  X,
  Building,
  MapPin,
  FileText,
  User,
  Shield,
  Compass,
  Calendar,
  CreditCard,
  SearchCheck,
  Scale,
  Plus,
  Printer,
  Edit,
  Trash2,
  Archive,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { MosqueProperty, PropertyTenant, PropertyInspectionRecord, PropertyLegalCase } from '../types';
import { Language, formatCurrency, translations } from '../lib/i18n';
import { POSSESSION_STATUSES, PROPERTY_CATEGORIES } from './PropertyFormModal';

interface PropertyDetailsDrawerProps {
  property: MosqueProperty | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (property: MosqueProperty) => void;
  onArchiveToggle: (property: MosqueProperty) => void;
  onPrint: (property: MosqueProperty) => void;
  onAddTenant: (property: MosqueProperty) => void;
  onTerminateTenant: (property: MosqueProperty, tenantId: string) => void;
  onAddInspection: (property: MosqueProperty) => void;
  onAddLegalCase: (property: MosqueProperty) => void;
  language: Language;
}

export const PropertyDetailsDrawer: React.FC<PropertyDetailsDrawerProps> = ({
  property,
  isOpen,
  onClose,
  onEdit,
  onArchiveToggle,
  onPrint,
  onAddTenant,
  onTerminateTenant,
  onAddInspection,
  onAddLegalCase,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'tenants' | 'inspections' | 'legal'>('details');

  if (!isOpen || !property) return null;

  const categoryObj = PROPERTY_CATEGORIES.find(c => c.id === property.category);
  const possessionObj = POSSESSION_STATUSES.find(p => p.id === property.possessionStatus);

  const activeTenants = property.tenants?.filter(t => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON') || [];
  const totalMonthlyIncome = activeTenants.reduce((sum, t) => sum + (t.monthlyRent || 0), 0) || property.monthlyIncome || property.monthlyRent || 0;
  const totalDeposit = property.tenants?.reduce((sum, t) => sum + (t.securityDeposit || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-700/40 rounded-xl border border-blue-400/30">
              <Building className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-500/30 border border-blue-400/40 rounded-md text-blue-200">
                  {property.propertyCode || 'PROP-RECORD'}
                </span>
                {property.isArchived && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/30 text-amber-200 rounded-md">
                    আর্কাইভকৃত
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                {property.name || property.description}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint(property)}
              title="এ৪ প্রত্যয়ন ও শিট প্রিন্ট করুন"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(property)}
              title="সম্পাদনা করুন"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">জমির পরিমাণ</span>
            <strong className="text-slate-900 font-bold">{property.area || `${property.areaAmount || 0} শতাংশ`}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">মাসিক মোট আয়</span>
            <strong className="text-emerald-700 font-bold">{formatCurrency(totalMonthlyIncome, language)}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">মোট ভাড়াটিয়া</span>
            <strong className="text-blue-700 font-bold">{property.tenants?.length || 0} জন ({activeTenants.length} সক্রিয়)</strong>
          </div>
          <div>
            <span className="text-slate-500 block">দখল অবস্থা</span>
            <span className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] ${possessionObj?.color || 'bg-slate-200 text-slate-800'}`}>
              {possessionObj?.labelBn || property.possessionStatus || 'নিয়ন্ত্রণে'}
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 px-6 gap-2 bg-white text-xs font-bold overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            সম্পত্তির পূর্ণ তথ্য ও দাগ-খতিয়ান
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'tenants' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            ভাড়াটিয়া ও ইজারা ({property.tenants?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('inspections')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'inspections' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <SearchCheck className="w-4 h-4" />
            দখল ও পরিদর্শন ({property.inspections?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('legal')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'legal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            আইনি মামলা ({property.legalCases?.length || 0})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: FULL DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Location & Value Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">ক্যাটাগরি ও শ্রেণি</span>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">
                      {categoryObj?.labelBn || property.category} ({property.type})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block">আনুমানিক বাজারমূল্য</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {formatCurrency(property.estimatedValue || 0, language)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block">অবস্থান ও পূর্ণ ঠিকানা</span>
                    <p className="font-medium text-slate-800 mt-0.5 flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      {property.fullAddress || property.location || 'ঠিকানা নির্ধারিত নেই'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Land Record Schedule */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-700" />
                  ভূমি তফসিল ও দাগ-খতিয়ান রেকর্ড
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-blue-100">
                    <span className="text-slate-500 block text-[11px]">মৌজা ও জে.এল.</span>
                    <strong className="text-slate-800">{property.mouza || '—'} {property.jlNumber ? `(জে.এল- ${property.jlNumber})` : ''}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-blue-100">
                    <span className="text-slate-500 block text-[11px]">সাব-রেজিস্ট্রি অফিস</span>
                    <strong className="text-slate-800">{property.subRegistryOffice || '—'}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-blue-100">
                    <span className="text-slate-500 block text-[11px]">নামজারি খতিয়ান (মিউটেশন)</span>
                    <strong className="text-emerald-700 font-mono">{property.mutationKhatianNo || '—'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">সি.এস. দাগ / খতিয়ান</span>
                    <strong className="text-slate-800">{property.csPlotNo || '—'} / {property.csKhatianNo || '—'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">এস.এ. দাগ / খতিয়ান</span>
                    <strong className="text-slate-800">{property.saPlotNo || '—'} / {property.saKhatianNo || '—'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">আর.এস. দাগ / খতিয়ান</span>
                    <strong className="text-slate-800">{property.rsPlotNo || '—'} / {property.rsKhatianNo || '—'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-200">
                    <span className="text-blue-700 text-[10px] font-bold block">বি.এস./সিটি দাগ / খতিয়ান</span>
                    <strong className="text-blue-900 font-bold">{property.bsPlotNo || property.plotNo || '—'} / {property.bsKhatianNo || property.khatianNo || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Boundaries Visual Box */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-700" />
                  চতুঃসীমানা বিবরণী
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                    <span className="text-slate-500 text-[10px] block font-medium">উত্তরে (North)</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{property.boundaryNorth || 'উল্লেখ নেই'}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                    <span className="text-slate-500 text-[10px] block font-medium">দক্ষিণে (South)</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{property.boundarySouth || 'উল্লেখ নেই'}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                    <span className="text-slate-500 text-[10px] block font-medium">পূর্বে (East)</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{property.boundaryEast || 'উল্লেখ নেই'}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                    <span className="text-slate-500 text-[10px] block font-medium">পশ্চিমে (West)</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{property.boundaryWest || 'উল্লেখ নেই'}</p>
                  </div>
                </div>
              </div>

              {/* Waqf & Waqif Info */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-700" />
                  ওয়াকফ দলিল ও ওয়াকিফের তথ্য
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                    <span className="text-slate-500 block text-[11px]">ওয়াকফ ইসি / এনরোলমেন্ট নং</span>
                    <strong className="text-indigo-900 font-mono">{property.waqfEnrollmentNo || '—'}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                    <span className="text-slate-500 block text-[11px]">ওয়াকফ দলিল নং ও সাল</span>
                    <strong className="text-slate-800">{property.waqfDeedNo || '—'} {property.waqfYear ? `(${property.waqfYear})` : ''}</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100">
                    <span className="text-slate-500 block text-[11px]">ওয়াকফ এস্টেটের নাম</span>
                    <strong className="text-slate-800">{property.waqfEstateName || 'মসজিদ ওয়াকফ এস্টেট'}</strong>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-indigo-100 text-xs space-y-1">
                  <span className="text-slate-500 block font-medium">ওয়াকিফ (দানকারী)</span>
                  <p className="font-bold text-slate-900 text-sm">
                    {property.waqifName || 'ওয়াকিফের নাম সংরক্ষিত নেই'}
                  </p>
                  {property.waqifFatherName && (
                    <p className="text-slate-600">পিতা/স্বামী: {property.waqifFatherName}</p>
                  )}
                  {property.waqifAddress && (
                    <p className="text-slate-600">ঠিকানা: {property.waqifAddress}</p>
                  )}
                  {property.waqfPurpose && (
                    <p className="text-indigo-800 font-medium pt-1 border-t border-slate-100 mt-2">
                      ওয়াকফের উদ্দেশ্য: {property.waqfPurpose}
                    </p>
                  )}
                </div>
              </div>

              {/* Current Use & Notes */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                <span className="text-slate-500 block font-medium">বর্তমান ব্যবহার ও দখল</span>
                <p className="font-semibold text-slate-800">
                  {property.currentUse || 'মসজিদের প্রত্যক্ষ ব্যবহার ও নিয়ন্ত্রণে'}
                </p>
                {property.notes && (
                  <p className="text-slate-600 pt-2 border-t border-slate-100">
                    মন্তব্য: {property.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TENANTS */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">ভাড়াটিয়া ও ইজারা চুক্তি তালিকা</h4>
                  <p className="text-xs text-slate-500">
                    মোট সিকিউরিটি জামানত: {formatCurrency(totalDeposit, language)}
                  </p>
                </div>
                <button
                  onClick={() => onAddTenant(property)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন চুক্তি যোগ করুন
                </button>
              </div>

              {(!property.tenants || property.tenants.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো সক্রিয় ভাড়াটিয়া বা ইজারা চুক্তি নেই</p>
                  <button
                    onClick={() => onAddTenant(property)}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl"
                  >
                    + প্রথম ভাড়াটিয়া যোগ করুন
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {property.tenants.map((t) => {
                    const isExpiring = t.status === 'EXPIRING_SOON';
                    const isExpired = t.status === 'EXPIRED';
                    const isTerminated = t.status === 'TERMINATED';

                    return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isTerminated
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : isExpired
                            ? 'bg-rose-50/50 border-rose-200'
                            : isExpiring
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 rounded text-slate-700">
                                {t.unitOrShopNo || t.tenantCode || 'দোকান'}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900">{t.name}</h5>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                  isTerminated
                                    ? 'bg-slate-200 text-slate-700'
                                    : isExpired
                                    ? 'bg-rose-100 text-rose-800'
                                    : isExpiring
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isTerminated ? 'সমাপ্ত' : isExpired ? 'মেয়াদোত্তীর্ণ' : isExpiring ? 'শীঘ্রই শেষ' : 'সক্রিয়'}
                              </span>
                            </div>
                            {t.businessName && (
                              <p className="text-xs text-slate-600 mt-1">{t.businessName} ({t.businessType || 'বাণিজ্যিক'})</p>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-700 block">
                              {formatCurrency(t.monthlyRent, language)} / মাস
                            </span>
                            <span className="text-[11px] text-slate-500">
                              জামানত: {formatCurrency(t.securityDeposit || 0, language)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.mobile}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>মেয়াদ: {t.startDate} হতে {t.endDate}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            {!isTerminated && (
                              <button
                                onClick={() => {
                                  if (confirm(`আপনি কি নিশ্চিত যে ${t.name}-এর চুক্তি সমাপ্ত করতে চান?`)) {
                                    onTerminateTenant(property, t.id);
                                  }
                                }}
                                className="text-rose-600 hover:text-rose-800 font-bold hover:underline"
                              >
                                চুক্তি সমাপ্ত
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INSPECTIONS */}
          {activeTab === 'inspections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">সম্পত্তি পরিদর্শন ও দখল লগ</h4>
                  <p className="text-xs text-slate-500">নিয়মিত পরিদর্শন ও হেফাজতের হালনাগাদ রেকর্ড</p>
                </div>
                <button
                  onClick={() => onAddInspection(property)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন পরিদর্শন রিপোর্ট
                </button>
              </div>

              {(!property.inspections || property.inspections.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <SearchCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">এখনও কোনো পরিদর্শন রেকর্ড করা হয়নি</p>
                  <button
                    onClick={() => onAddInspection(property)}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl"
                  >
                    + প্রথম পরিদর্শন রিপোর্ট লিপিবদ্ধ করুন
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {property.inspections.map((ins) => (
                    <div key={ins.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-800 rounded">
                            {ins.inspectionDate}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900">পরিদর্শক: {ins.inspectorName}</h5>
                          {ins.inspectorDesignation && (
                            <span className="text-xs text-slate-500">({ins.inspectorDesignation})</span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            ins.currentCondition === 'GOOD'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ins.currentCondition === 'NEEDS_REPAIR'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ins.currentCondition === 'GOOD' ? 'উত্তম অবস্থা' : ins.currentCondition === 'NEEDS_REPAIR' ? 'মেরামত প্রয়োজন' : 'ঝুঁকিপূর্ণ / বিরোধ'}
                        </span>
                      </div>

                      {ins.occupancyStatus && (
                        <p className="text-xs text-slate-700">দখল পরিস্থিতি: {ins.occupancyStatus}</p>
                      )}

                      {ins.problemsObserved && (
                        <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 text-xs text-rose-800">
                          <strong>পরিলক্ষিত সমস্যা:</strong> {ins.problemsObserved}
                        </div>
                      )}

                      {ins.requiredAction && (
                        <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 text-xs text-blue-900">
                          <strong>প্রস্তাবিত পদক্ষেপ:</strong> {ins.requiredAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LEGAL CASES */}
          {activeTab === 'legal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">আইনি মোকদ্দমা ও বিরোধ নিষ্পত্তি</h4>
                  <p className="text-xs text-slate-500">আদালতের মামলা, আইনজীবী ও শুনানির রেকর্ড</p>
                </div>
                <button
                  onClick={() => onAddLegalCase(property)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন মামলা যোগ করুন
                </button>
              </div>

              {(!property.legalCases || property.legalCases.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Scale className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো বিচারাধীন বা নিষ্পত্তিকৃত মামলা নেই (নিষ্কণ্টক)</p>
                  <button
                    onClick={() => onAddLegalCase(property)}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl"
                  >
                    + বিরোধ বা মামলা এন্ট্রি করুন
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {property.legalCases.map((cs) => (
                    <div key={cs.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-100 text-rose-900 rounded">
                              {cs.caseNumber}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{cs.courtName}</span>
                          </div>
                          {cs.parties && (
                            <p className="text-xs text-slate-600 mt-1">{cs.parties}</p>
                          )}
                        </div>

                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-200 text-rose-900">
                          {cs.status === 'RUNNING' ? 'চলমান' : cs.status === 'STAY_ORDER' ? 'স্থগিতাদেশ' : cs.status === 'WON' ? 'মসজিদের জয়' : cs.status}
                        </span>
                      </div>

                      {cs.nextHearingDate && (
                        <div className="p-2 bg-amber-100/80 rounded-lg text-xs text-amber-900 flex items-center gap-2 font-bold">
                          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>পরবর্তী শুনানির তারিখ: {cs.nextHearingDate}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                        <div>
                          <span className="text-slate-400 block">আইনজীবী:</span>
                          <strong className="text-slate-800">{cs.lawyerName || '—'} {cs.lawyerContact ? `(${cs.lawyerContact})` : ''}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">বিষয়বস্তু:</span>
                          <span className="text-slate-800">{cs.subject || '—'}</span>
                        </div>
                      </div>

                      {cs.courtOrders && (
                        <div className="p-2.5 bg-white rounded-lg border border-rose-100 text-xs text-slate-700">
                          <strong>আদালতের আদেশ:</strong> {cs.courtOrders}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => onArchiveToggle(property)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors ${
              property.isArchived
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Archive className="w-4 h-4" />
            {property.isArchived ? 'আর্কাইভ থেকে ফিরিয়ে আনুন' : 'আর্কাইভ করুন (হিস্টোরিক্যাল রেকর্ড)'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint(property)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট শিট
            </button>
            <button
              onClick={() => onEdit(property)}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Edit className="w-4 h-4" />
              তথ্য সম্পাদনা
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

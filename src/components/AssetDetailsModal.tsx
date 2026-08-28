import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Wrench,
  DollarSign,
  Calendar,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  FileText,
  Clock,
  Printer,
  Edit2,
  Archive,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  History,
  Tag,
  Building,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { MosqueAsset, MosqueProfile, FinancialAccount, AccountHead } from '../types';
import { Language, translations, formatCurrency } from '../lib/i18n';
import { ASSET_CATEGORIES, ASSET_CONDITIONS } from './AssetFormModal';
import { AssetServiceModal } from './AssetServiceModal';

interface AssetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: MosqueAsset;
  currentMosque?: MosqueProfile | null;
  onEdit: (asset: MosqueAsset) => void;
  onArchive: (asset: MosqueAsset) => void;
  onDelete: (asset: MosqueAsset) => void;
  onAddServiceRecord: (assetId: string, serviceData: any) => Promise<void>;
  accounts?: FinancialAccount[];
  accountHeads?: AccountHead[];
  language: Language;
}

export const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({
  isOpen,
  onClose,
  asset,
  currentMosque,
  onEdit,
  onArchive,
  onDelete,
  onAddServiceRecord,
  accounts = [],
  accountHeads = [],
  language
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MAINTENANCE' | 'FINANCIAL' | 'AUDIT'>('OVERVIEW');
  const [showServiceModal, setShowServiceModal] = useState(false);

  if (!isOpen) return null;

  const categoryObj = ASSET_CATEGORIES.find((c) => c.key === asset.category);
  const conditionObj = ASSET_CONDITIONS.find((c) => c.key === asset.condition);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Top Bar / Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-2xl">
                {categoryObj?.icon || '📦'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
                    {asset.assetCode}
                  </span>
                  {asset.isArchived && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md">
                      আর্কাইভকৃত
                    </span>
                  )}
                  {asset.isDemo && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-md">
                      ডেমো রেকর্ড
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-white mt-1 font-siliguri">{asset.name}</h2>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                title="প্রিন্ট করুন"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">প্রিন্ট কার্ড</span>
              </button>
              <button
                onClick={() => onEdit(asset)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">সম্পাদনা</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center space-x-4 text-xs font-bold text-slate-600 overflow-x-auto">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-3 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>সারসংক্ষেপ ও বিবরণ</span>
            </button>

            <button
              onClick={() => setActiveTab('MAINTENANCE')}
              className={`py-3 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'MAINTENANCE'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>সার্ভিসিং ও রক্ষণাবেক্ষণ ইতিহাস ({asset.serviceHistory?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('FINANCIAL')}
              className={`py-3 border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'FINANCIAL'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>হিসাব ও ব্যয় ভাউচার সংযোগ</span>
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
            {/* OVERVIEW TAB */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6">
                {/* Highlight Status Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Purchase Value */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ক্রয়মূল্য</span>
                    </span>
                    <p className="text-base font-bold text-slate-900 font-siliguri">
                      ৳{(asset.purchaseValue || 0).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-400">তারিখ: {asset.purchaseDate || 'N/A'}</span>
                  </div>

                  {/* Current Estimated Value */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      <span>বর্তমান আনুমানিক মূল্য</span>
                    </span>
                    <p className="text-base font-bold text-blue-700 font-siliguri">
                      ৳{(asset.currentValue ?? asset.purchaseValue ?? 0).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-400">অবচয় সমন্বিত মূল্য</span>
                  </div>

                  {/* Condition */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>বর্তমান অবস্থা</span>
                    </span>
                    <div>
                      <span
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          conditionObj?.color || 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {conditionObj?.labelBn || asset.condition}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {asset.serviceHistory && asset.serviceHistory.length > 0
                        ? `${asset.serviceHistory.length} বার সার্ভিসিং`
                        : 'নতুনের মত সচল'}
                    </span>
                  </div>

                  {/* Next Service */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>পরবর্তী সার্ভিসিং</span>
                    </span>
                    <p className="text-sm font-bold text-slate-900 font-siliguri">
                      {asset.nextServiceDate || 'নির্ধারিত নেই'}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {asset.warrantyInfo ? 'ওয়ারেন্টি আওতাভুক্ত' : 'সাধারণ রক্ষণাবেক্ষণ'}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* General Specifications */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2 flex items-center space-x-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>মৌলিক স্পেসিফিকেশন ও তথ্য</span>
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">ক্যাটাগরি / ধরন:</span>
                        <span className="font-bold text-slate-900">{categoryObj?.labelBn || asset.category}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">ব্র্যান্ড ও মডেল:</span>
                        <span className="font-semibold text-slate-900">
                          {asset.brand || 'N/A'} {asset.model ? `(${asset.model})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">সিরিয়াল নম্বর:</span>
                        <span className="font-mono font-semibold text-slate-900">{asset.serialNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">ওয়ারেন্টি তথ্য:</span>
                        <span className="font-semibold text-slate-900">{asset.warrantyInfo || 'প্রযোজ্য নয়'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-medium">কমিটি মেয়াদ:</span>
                        <span className="font-semibold text-slate-900">
                          {asset.termTitle || 'সাধারণ / অপরিবর্তিত'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location & Responsibility */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2 flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>অবস্থান ও দায়িত্বপ্রাপ্ত ব্যক্তি</span>
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">অবস্থান:</span>
                        <span className="font-bold text-slate-900">{asset.location || 'মূল ভবন'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">দায়িত্বপ্রাপ্ত ব্যক্তি:</span>
                        <span className="font-bold text-slate-900">{asset.responsiblePerson || 'মসজিদ কর্তৃপক্ষ'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">মোবাইল নম্বর:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {asset.responsiblePersonPhone || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span className="text-slate-500 font-medium">সরবরাহকারী:</span>
                        <span className="font-semibold text-slate-900">{asset.supplier || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-medium">অর্থায়নের উৎস:</span>
                        <span className="font-semibold text-slate-900">{asset.sourceOfPurchase || 'মসজিদ তহবিল'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description & Notes */}
                {(asset.description || asset.notes) && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    {asset.description && (
                      <div>
                        <h4 className="font-bold text-slate-800 mb-1">ব্যবহার ও বিবরণ:</h4>
                        <p className="text-slate-600 leading-relaxed">{asset.description}</p>
                      </div>
                    )}
                    {asset.notes && (
                      <div className="pt-2 border-t border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-1">প্রশাসনিক নোট:</h4>
                        <p className="text-slate-600 italic">{asset.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MAINTENANCE TAB */}
            {activeTab === 'MAINTENANCE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">সার্ভিসিং ও মেরামতের পূর্ণ বিবরণ</h3>
                    <p className="text-[11px] text-slate-500">
                      নিয়মিত মবিল পরিবর্তন, ফিল্টার ও পার্টস প্রতিস্থাপনের সম্পূর্ণ অডিট লগ
                    </p>
                  </div>
                  <button
                    onClick={() => setShowServiceModal(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>নতুন সার্ভিস রেকর্ড যোগ করুন</span>
                  </button>
                </div>

                {asset.serviceHistory && asset.serviceHistory.length > 0 ? (
                  <div className="space-y-3">
                    {asset.serviceHistory.map((rec, index) => (
                      <div
                        key={rec.id || index}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 transition-colors space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">
                              {rec.serviceTypeBn || rec.serviceType}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">| {rec.serviceDate}</span>
                          </div>
                          {rec.cost > 0 && (
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold font-siliguri">
                              খরচ: ৳{rec.cost.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <p className="text-slate-700 text-xs leading-relaxed">{rec.description}</p>

                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>টেকনিশিয়ান: <strong className="text-slate-700">{rec.servicedBy || 'N/A'}</strong></span>
                          {rec.expenseVoucherNumber && (
                            <span className="font-mono text-blue-600 font-semibold">
                              ব্যয় ভাউচার: {rec.expenseVoucherNumber}
                            </span>
                          )}
                          {rec.nextServiceDate && (
                            <span className="text-amber-700">
                              পরবর্তী সার্ভিস: <strong>{rec.nextServiceDate}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                    <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">কোনো সার্ভিসিং রেকর্ড নেই</p>
                    <p className="text-[11px] text-slate-500">
                      এই সম্পদের জন্য কোনো রক্ষণাবেক্ষণ বা মেরামত রেকর্ড এখনো অন্তর্ভুক্ত করা হয়নি।
                    </p>
                    <button
                      onClick={() => setShowServiceModal(true)}
                      className="mt-2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition-colors"
                    >
                      প্রথম রেকর্ড যুক্ত করুন
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* FINANCIAL TAB */}
            {activeTab === 'FINANCIAL' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">হিসাবরক্ষণ ও ভাউচার ট্র্যাকিং</h3>
                  <p className="text-[11px] text-slate-500">
                    আর্থিক বিবরণী এবং লেজারের সাথে সম্পদের নিরবচ্ছিন্ন সংযোগ
                  </p>
                </div>

                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-700" />
                      <span>সংযুক্ত ক্রয় ব্যয় ভাউচার (Linked Expense Voucher)</span>
                    </span>
                    {asset.expenseVoucherNumber ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-mono text-xs font-bold">
                        {asset.expenseVoucherNumber}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-xs font-semibold">
                        সরাসরি লিঙ্ক নেই
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    {asset.expenseVoucherNumber
                      ? 'এই সম্পদটির ক্রয়মূল্য মসজিদের কেন্দ্রীয় লেজার ও দৈনিক খরচ বইয়ে নিবন্ধিত রয়েছে। কমিটি পরিবর্তন হলেও এই ব্যয় অপরিবর্তিত থাকে।'
                      : 'এই সম্পদটি দান হিসেবে প্রাপ্ত হয়েছে অথবা পূর্ববর্তী কমিটি হতে হস্তান্তরিত। প্রয়োজনে আপনি সম্পাদনা করে ভাউচার লিঙ্ক করতে পারেন।'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-2.5 bg-white border border-blue-100 rounded-lg">
                      <span className="text-[10px] text-slate-500">মূল ক্রয়মূল্য</span>
                      <p className="font-bold text-slate-900 font-siliguri">
                        ৳{(asset.purchaseValue || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-2.5 bg-white border border-blue-100 rounded-lg">
                      <span className="text-[10px] text-slate-500">সার্ভিসিং বাবদ মোট খরচ</span>
                      <p className="font-bold text-amber-700 font-siliguri">
                        ৳
                        {(asset.serviceHistory || [])
                          .reduce((sum, s) => sum + (Number(s.cost) || 0), 0)
                          .toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-2.5 bg-white border border-blue-100 rounded-lg">
                      <span className="text-[10px] text-slate-500">বর্তমান নেট বুক ভ্যালু</span>
                      <p className="font-bold text-blue-700 font-siliguri">
                        ৳{(asset.currentValue ?? asset.purchaseValue ?? 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Footer Action Controls */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onArchive(asset)}
                className={`px-3 py-1.5 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors ${
                  asset.isArchived
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{asset.isArchived ? 'আর্কাইভ থেকে ফিরিয়ে আনুন' : 'আর্কাইভে সরান'}</span>
              </button>

              <button
                onClick={() => onDelete(asset)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>তালিকা থেকে মুছুন</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <AssetServiceModal
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          asset={asset}
          onSaveService={onAddServiceRecord}
          accounts={accounts}
          accountHeads={accountHeads}
          language={language}
        />
      )}
    </>
  );
};

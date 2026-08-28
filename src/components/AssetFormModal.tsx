import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  DollarSign,
  Calendar,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Wrench,
  FileText,
  Tag,
  Hash,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Plus,
  Trash2,
  AlertCircle,
  Building,
  CheckCircle2,
  Upload
} from 'lucide-react';
import {
  MosqueAsset,
  AssetCategory,
  AssetCondition,
  CommitteeTerm,
  ExpenseEntry,
  FinancialAccount,
  AccountHead
} from '../types';
import { Language, translations, formatCurrency } from '../lib/i18n';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: any) => Promise<void>;
  editingAsset?: MosqueAsset | null;
  committeeTerms?: CommitteeTerm[];
  expenseEntries?: ExpenseEntry[];
  accounts?: FinancialAccount[];
  accountHeads?: AccountHead[];
  language: Language;
}

export const ASSET_CATEGORIES: { key: AssetCategory; labelBn: string; labelEn: string; icon: string }[] = [
  { key: 'GENERATOR', labelBn: 'জেনারেটর ও পাওয়ার সাপ্লাই', labelEn: 'Generator & Power', icon: '⚡' },
  { key: 'FAN', labelBn: 'সিলিং ও স্ট্যান্ড ফ্যান', labelEn: 'Ceiling & Stand Fan', icon: '🌀' },
  { key: 'AC', labelBn: 'এয়ার কন্ডিশনার (এসি)', labelEn: 'Air Conditioner', icon: '❄️' },
  { key: 'REFRIGERATOR', labelBn: 'রেফ্রিজারেটর', labelEn: 'Refrigerator', icon: '🧊' },
  { key: 'DEEP_FREEZER', labelBn: 'ডিপ ফ্রিজার (মরদেহ সংরক্ষণ)', labelEn: 'Deep Freezer', icon: '⚰️' },
  { key: 'SOUND_SYSTEM', labelBn: 'সাউন্ড সিস্টেম ও মাইক', labelEn: 'Sound System & Mic', icon: '🔊' },
  { key: 'CCTV', labelBn: 'সিসিটিভি ও সিকিউরিটি ক্যামেরা', labelEn: 'CCTV & Security', icon: '📹' },
  { key: 'COMPUTER_ICT', labelBn: 'কম্পিউটার ও আইসিটি সরঞ্জাম', labelEn: 'Computer & ICT', icon: '💻' },
  { key: 'FURNITURE', labelBn: 'আসবাবপত্র, কার্পেট ও জায়নামাজ', labelEn: 'Furniture & Carpet', icon: '🛋️' },
  { key: 'ELECTRICAL', labelBn: 'বৈদ্যুতিক সরঞ্জাম ও আইপিএস', labelEn: 'Electrical & IPS', icon: '🔌' },
  { key: 'WATER_WUDU', labelBn: 'পানি ও ওজুখানা সরঞ্জাম / পাম্প', labelEn: 'Water & Wudu Pump', icon: '💧' },
  { key: 'CONSTRUCTION', labelBn: 'নির্মাণ ও সংরক্ষণ সামগ্রী', labelEn: 'Construction & Tools', icon: '🔨' },
  { key: 'RELIGIOUS', labelBn: 'ধর্মীয় সামগ্রী, রেহাল ও কোরআন বক্স', labelEn: 'Religious Items & Rehal', icon: '📖' },
  { key: 'OTHER', labelBn: 'অন্যান্য স্থায়ী সম্পদ', labelEn: 'Other Equipment', icon: '📦' }
];

export const ASSET_CONDITIONS: { key: AssetCondition; labelBn: string; labelEn: string; color: string }[] = [
  { key: 'GOOD', labelBn: 'ভালো ও সক্রিয়', labelEn: 'Good & Operational', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { key: 'NEEDS_REPAIR', labelBn: 'মেরামত প্রয়োজন', labelEn: 'Needs Repair', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'OUT_OF_ORDER', labelBn: 'সম্পূর্ণ অচল', labelEn: 'Out of Order', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { key: 'LOST', labelBn: 'হারিয়ে গেছে', labelEn: 'Lost / Missing', color: 'bg-slate-200 text-slate-700 border-slate-300' },
  { key: 'DISPOSED', labelBn: 'বাতিল / পরিত্যক্ত', labelEn: 'Disposed / Scrapped', color: 'bg-stone-200 text-stone-700 border-stone-300' }
];

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAsset,
  committeeTerms = [],
  expenseEntries = [],
  accounts = [],
  accountHeads = [],
  language
}) => {
  const t = translations[language];

  // Form State
  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('GENERATOR');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseValue, setPurchaseValue] = useState<number | ''>('');
  const [currentValue, setCurrentValue] = useState<number | ''>('');
  const [location, setLocation] = useState('১ম তলা মূল নামাজ কক্ষ');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [responsiblePersonPhone, setResponsiblePersonPhone] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('GOOD');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sourceOfPurchase, setSourceOfPurchase] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [termId, setTermId] = useState('');

  // Accounting Linkage State
  const [expenseLinkType, setExpenseLinkType] = useState<'NONE' | 'EXISTING' | 'AUTO_CREATE'>('NONE');
  const [selectedExpenseVoucherNo, setSelectedExpenseVoucherNo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedExpenseHeadId, setSelectedExpenseHeadId] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate when editing or opening
  useEffect(() => {
    if (editingAsset) {
      setAssetCode(editingAsset.assetCode || '');
      setName(editingAsset.name || '');
      setCategory(editingAsset.category || 'OTHER');
      setBrand(editingAsset.brand || '');
      setModel(editingAsset.model || '');
      setSerialNumber(editingAsset.serialNumber || '');
      setPurchaseDate(editingAsset.purchaseDate || new Date().toISOString().split('T')[0]);
      setPurchaseValue(editingAsset.purchaseValue ?? '');
      setCurrentValue(editingAsset.currentValue ?? '');
      setLocation(editingAsset.location || 'মূল ভবন');
      setResponsiblePerson(editingAsset.responsiblePerson || '');
      setResponsiblePersonPhone(editingAsset.responsiblePersonPhone || '');
      setCondition(editingAsset.condition || 'GOOD');
      setNextServiceDate(editingAsset.nextServiceDate || '');
      setWarrantyInfo(editingAsset.warrantyInfo || '');
      setSupplier(editingAsset.supplier || '');
      setSourceOfPurchase(editingAsset.sourceOfPurchase || '');
      setDescription(editingAsset.description || '');
      setNotes(editingAsset.notes || '');
      setPhotoUrl(editingAsset.photoUrl || '');
      setTermId(editingAsset.termId || '');

      if (editingAsset.expenseVoucherNumber) {
        setExpenseLinkType('EXISTING');
        setSelectedExpenseVoucherNo(editingAsset.expenseVoucherNumber);
      } else {
        setExpenseLinkType('NONE');
      }
    } else {
      // Reset defaults for new asset
      setAssetCode('');
      setName('');
      setCategory('GENERATOR');
      setBrand('');
      setModel('');
      setSerialNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseValue('');
      setCurrentValue('');
      setLocation('১ম তলা মূল নামাজ কক্ষ');
      setResponsiblePerson('');
      setResponsiblePersonPhone('');
      setCondition('GOOD');
      setNextServiceDate('');
      setWarrantyInfo('');
      setSupplier('');
      setSourceOfPurchase('');
      setDescription('');
      setNotes('');
      setPhotoUrl('');

      const activeTerm = committeeTerms.find(t => t.status === 'ACTIVE');
      setTermId(activeTerm ? activeTerm.id : committeeTerms[0]?.id || '');

      setExpenseLinkType('NONE');
      setSelectedExpenseVoucherNo('');
      setSelectedAccountId(accounts[0]?.id || '');
      const assetHead = accountHeads.find(h => h.headType === 'EXPENSE' && (h.nameBn?.includes('সম্পদ') || h.nameBn?.includes('রক্ষণাবেক্ষণ')));
      setSelectedExpenseHeadId(assetHead ? assetHead.id : accountHeads.find(h => h.headType === 'EXPENSE')?.id || '');
    }
    setErrorMessage('');
  }, [editingAsset, isOpen, committeeTerms, accounts, accountHeads]);

  // Auto set currentValue when purchaseValue changes for new asset
  const handlePurchaseValueChange = (val: string) => {
    const num = val === '' ? '' : Number(val);
    setPurchaseValue(num);
    if (!editingAsset && (currentValue === '' || currentValue === purchaseValue)) {
      setCurrentValue(num);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('সম্পদের নাম প্রদান আবশ্যক।');
      return;
    }

    const selectedCategoryObj = ASSET_CATEGORIES.find(c => c.key === category);
    const selectedConditionObj = ASSET_CONDITIONS.find(c => c.key === condition);
    const selectedTermObj = committeeTerms.find(t => t.id === termId);

    setLoading(true);
    setErrorMessage('');

    try {
      const payload: any = {
        assetCode: assetCode.trim() || undefined,
        name: name.trim(),
        category,
        categoryBn: selectedCategoryObj?.labelBn || '',
        brand: brand.trim(),
        model: model.trim(),
        serialNumber: serialNumber.trim(),
        purchaseDate,
        purchaseValue: Number(purchaseValue) || 0,
        currentValue: currentValue !== '' ? Number(currentValue) : Number(purchaseValue) || 0,
        location: location.trim(),
        responsiblePerson: responsiblePerson.trim(),
        responsiblePersonPhone: responsiblePersonPhone.trim(),
        condition,
        conditionBn: selectedConditionObj?.labelBn || '',
        nextServiceDate,
        warrantyInfo: warrantyInfo.trim(),
        supplier: supplier.trim(),
        sourceOfPurchase: sourceOfPurchase.trim(),
        description: description.trim(),
        notes: notes.trim(),
        photoUrl: photoUrl.trim(),
        termId: selectedTermObj?.id || '',
        termTitle: selectedTermObj?.title || '',
      };

      if (expenseLinkType === 'EXISTING') {
        payload.expenseVoucherNumber = selectedExpenseVoucherNo;
      } else if (expenseLinkType === 'AUTO_CREATE') {
        payload.createExpenseVoucher = true;
        payload.accountId = selectedAccountId;
        payload.expenseHeadId = selectedExpenseHeadId;
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'সম্পদের তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-siliguri">
                {editingAsset ? 'সম্পদের তথ্য সংশোধন / আপডেট' : 'নতুন সম্পদ ও সরঞ্জাম অন্তর্ভুক্তি'}
              </h2>
              <p className="text-xs text-slate-300">
                {editingAsset
                  ? `সম্পদ কোড: ${editingAsset.assetCode} — ঐতিহাসিক তথ্য ও ক্রয় ভাউচার অক্ষুণ্ণ রেখে আপডেট করুন`
                  : 'মসজিদ কমপ্লেক্সের সকল স্থাবর-অস্থাবর সরঞ্জাম, ওয়ারেন্টি ও দায়িত্ব বণ্টন করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Basic & Identification Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>১. মৌলিক পরিচিতি ও ক্যাটাগরি</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">তারকা (*) চিহ্নিত ঘরগুলো আবশ্যক</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Asset Name */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-800">
                  সম্পদের নাম <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: Soundproof Diesel Generator 30 KVA / 4-Ton Standing AC"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              {/* Asset Code */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  সম্পদ কোড / আইডি <span className="text-slate-400 font-normal">(স্বয়ংক্রিয়)</span>
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="খালি রাখলে অটো কোড তৈরি হবে"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  সম্পদের ধরন / ক্যাটাগরি <span className="text-rose-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.icon} {cat.labelBn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">ব্র্যান্ড / প্রস্তুতকারক</label>
                <input
                  type="text"
                  placeholder="যেমন: Gree, Perkins, Ahuja, Walton, Hikvision"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              {/* Model */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">মডেল নম্বর / স্পেসিফিকেশন</label>
                <input
                  type="text"
                  placeholder="যেমন: GV-48C3, SSA-5000EM, PK-30KVA"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              {/* Serial Number */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">সিরিয়াল নম্বর / বারকোড</label>
                <input
                  type="text"
                  placeholder="যেমন: SN-2024-889104"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono text-slate-900"
                />
              </div>

              {/* Committee Term Linkage */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-800">
                  পরিচালনা কমিটির মেয়াদ <span className="text-slate-400 font-normal">(মালিকানা ইতিহাস সংরক্ষণ)</span>
                </label>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                >
                  <option value="">-- সাধারণ / পূর্ববর্তী কমিটি --</option>
                  {committeeTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.title} {term.status === 'ACTIVE' ? '(চলতি মেয়াদ)' : `(${term.startYear}-${term.endYear})`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  কমিটি পরিবর্তন হলেও অতীতের কেনা সকল সম্পদ ও খরচের হিসাব সংরক্ষিত থাকে।
                </p>
              </div>
            </div>
          </div>

          {/* 2. Purchase, Value & Accounting Link */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>২. ক্রয়মূল্য, বর্তমান মূল্যায়ন ও ভাউচার লিংক</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Purchase Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  ক্রয়ের তারিখ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              {/* Purchase Value */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  ক্রয়মূল্য (টাকা) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={purchaseValue}
                    onChange={(e) => handlePurchaseValueChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 font-siliguri"
                  />
                </div>
              </div>

              {/* Current Value */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  বর্তমান আনুমানিক মূল্য (টাকা)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 font-siliguri"
                  />
                </div>
              </div>

              {/* Supplier */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">সরবরাহকারী / দোকান</label>
                <input
                  type="text"
                  placeholder="যেমন: বাংলা পাওয়ার কোং / গ্রী ডিলার শোরুম"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              {/* Source of Purchase / Fund */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-800">ক্রয়ের উৎস / অর্থায়নের খাত</label>
                <input
                  type="text"
                  placeholder="যেমন: মসজিদ সাধারণ উন্নয়ন তহবিল / বিশিষ্ট দানবীর আলহাজ্ব করিম সাহেবের বিশেষ অনুদান"
                  value={sourceOfPurchase}
                  onChange={(e) => setSourceOfPurchase(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Accounting Integration Box */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center space-x-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
                  <span>হিসাবরক্ষণ ও ব্যয় ভাউচার সংযোগ (Accounting Linkage)</span>
                </span>
                <span className="text-[10px] text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded-full">
                  দ্বৈত এন্ট্রি প্রতিরোধ ব্যবস্থা
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-semibold">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="expenseLink"
                    checked={expenseLinkType === 'NONE'}
                    onChange={() => setExpenseLinkType('NONE')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>কোনো ভাউচার লিংক নেই</span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="expenseLink"
                    checked={expenseLinkType === 'EXISTING'}
                    onChange={() => setExpenseLinkType('EXISTING')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>বিদ্যমান অনুমোদিত ব্যয় ভাউচার সংযুক্ত করুন</span>
                </label>

                {!editingAsset && (
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="expenseLink"
                      checked={expenseLinkType === 'AUTO_CREATE'}
                      onChange={() => setExpenseLinkType('AUTO_CREATE')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>অ্যাকাউন্টিংয়ে স্বয়ংক্রিয় ব্যয় ভাউচার তৈরি করুন</span>
                  </label>
                )}
              </div>

              {expenseLinkType === 'EXISTING' && (
                <div className="pt-2 border-t border-blue-200/60 space-y-1">
                  <label className="font-bold text-slate-800">বিদ্যমান ব্যয় ভাউচার নম্বর সিলেক্ট করুন</label>
                  <select
                    value={selectedExpenseVoucherNo}
                    onChange={(e) => setSelectedExpenseVoucherNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-mono"
                  >
                    <option value="">-- ভাউচার নির্বাচন করুন --</option>
                    {expenseEntries.map((exp) => (
                      <option key={exp.id} value={exp.voucherNumber}>
                        {exp.voucherNumber} — ৳{exp.amount.toLocaleString('en-IN')} ({exp.mainHeadNameBn} - {exp.date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {expenseLinkType === 'AUTO_CREATE' && (
                <div className="pt-2 border-t border-blue-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">পরিশোধের একাউন্ট (ক্যাশ/ব্যাংক)</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountNameBn} (ব্যালেন্স: ৳{acc.currentBalance.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">ব্যয় খাত (Expense Head)</label>
                    <select
                      value={selectedExpenseHeadId}
                      onChange={(e) => setSelectedExpenseHeadId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                    >
                      {accountHeads
                        .filter((h) => h.headType === 'EXPENSE')
                        .map((head) => (
                          <option key={head.id} value={head.id}>
                            {head.nameBn} ({head.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Location, Condition & Responsibility */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>৩. অবস্থান, বর্তমান অবস্থা ও দায়িত্বপ্রাপ্ত ব্যক্তি</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Location */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  অবস্থান <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ১ম তলা মূল নামাজ কক্ষ / ছাদ / জেনারেটর রুম"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              {/* Condition */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  বর্তমান অবস্থা <span className="text-rose-600">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AssetCondition)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                >
                  {ASSET_CONDITIONS.map((cond) => (
                    <option key={cond.key} value={cond.key}>
                      {cond.labelBn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Next Service Date */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">পরবর্তী সার্ভিসিং তারিখ</label>
                <input
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              {/* Responsible Person */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">দায়িত্বপ্রাপ্ত ব্যক্তি</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="যেমন: মোঃ নুরুল ইসলাম (খাদেম) / সভাপতি"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Responsible Person Phone */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">মোবাইল নম্বর</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={responsiblePersonPhone}
                    onChange={(e) => setResponsiblePersonPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Warranty Info */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">ওয়ারেন্টি ও বিক্রয়োত্তর সেবা</label>
                <input
                  type="text"
                  placeholder="যেমন: ৩ বছর পার্টস ওয়ারেন্টি (মেয়াদ ২০২৮ পর্যন্ত)"
                  value={warrantyInfo}
                  onChange={(e) => setWarrantyInfo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 4. Description, Notes & Attachments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>৪. বিস্তারিত বিবরণ, ছবি ও রসিদ লিংক</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">সম্পদের ব্যবহার ও বিস্তারিত বিবরণ</label>
                <textarea
                  rows={2}
                  placeholder="সম্পদটির ব্যবহারবিধি ও প্রাসঙ্গিক তথ্য..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">বিশেষ সতর্কতা / প্রশাসনিক নোট</label>
                <textarea
                  rows={2}
                  placeholder="প্রতিমাসে চেক করতে হবে / রসিদ ফাইল নং ১২..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-800">ছবি / রসিদ ফাইলের লিঙ্ক (URL)</label>
                <input
                  type="url"
                  placeholder="https://example.com/asset-photo.jpg বা আপলোডকৃত ফাইল লিংক"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>সংরক্ষণ হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingAsset ? 'তথ্য হালনাগাদ করুন' : 'সম্পদ সংরক্ষণ করুন'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

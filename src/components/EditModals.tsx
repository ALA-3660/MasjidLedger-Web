import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Edit,
  Building,
  User,
  Phone,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  AlertCircle,
  Layers,
  MapPin,
  Package,
  ShieldAlert,
} from 'lucide-react';
import {
  IncomeEntry,
  ExpenseEntry,
  Donation,
  DonationBox,
  FinancialAccount,
  AccountHead,
  Staff,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  CommitteeMember,
  CommitteeMeeting,
  CommitteeTerm,
} from '../types';
import { Language, translations } from '../lib/i18n';

// ----------------------------------------------------
// 1. EDIT INCOME / EXPENSE MODAL
// ----------------------------------------------------
interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: IncomeEntry | ExpenseEntry | null;
  type: 'INCOME' | 'EXPENSE';
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
  language?: Language;
  onSave: (id: string, data: any) => Promise<void>;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  type,
  accountHeads,
  accounts,
  language = 'bn',
  onSave,
}) => {
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [subHeadId, setSubHeadId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setPersonName(('donorName' in transaction ? transaction.donorName : transaction.payeeName) || '');
      setPersonPhone(('donorPhone' in transaction ? transaction.donorPhone : transaction.payeePhone) || '');
      setDate(transaction.date || '');
      setReference(transaction.reference || '');
      setDescription(transaction.description || '');
      setSubHeadId(transaction.subHeadId || '');
      setError('');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const payload: any = {
        date,
        reference,
        description,
        subHeadId,
      };
      if (type === 'INCOME') {
        payload.donorName = personName;
        payload.donorPhone = personPhone;
      } else {
        payload.payeeName = personName;
        payload.payeePhone = personPhone;
      }
      await onSave(transaction.id, payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'আপডেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchingSubHeads = accountHeads.filter((h) => h.parentId === transaction.mainHeadId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm sm:text-base font-bold">
              {type === 'INCOME' ? 'আয় ভাউচার তথ্য সংশোধন' : 'ব্যয় ভাউচার তথ্য সংশোধন'} ({transaction.voucherNumber})
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (ফিক্সড)</label>
              <input
                type="text"
                disabled
                value={`৳ ${transaction.amount.toLocaleString('en-IN')}`}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {type === 'INCOME' ? 'দাতা / প্রদানকারীর নাম' : 'গ্রহীতা / ভেন্ডরের নাম'}
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
              <input
                type="tel"
                value={personPhone}
                onChange={(e) => setPersonPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">রেফারেন্স / স্লিপ নং</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {matchingSubHeads.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">উপ-খাত (Sub-head)</label>
              <select
                value={subHeadId}
                onChange={(e) => setSubHeadId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                <option value="">-- উপ-খাত নির্বাচন করুন --</option>
                {matchingSubHeads.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.nameBn}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ / নোট</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. EDIT DONATION BOX MASTER DATA MODAL
// ----------------------------------------------------
interface EditDonationBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: DonationBox | null;
  language?: Language;
  onSave: (id: string, data: any) => Promise<void>;
}

export const EditDonationBoxModal: React.FC<EditDonationBoxModalProps> = ({
  isOpen,
  onClose,
  box,
  language = 'bn',
  onSave,
}) => {
  const [boxCode, setBoxCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [location, setLocation] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [ward, setWard] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [status, setStatus] = useState<DonationBox['status']>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [lastCollectedDate, setLastCollectedDate] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [hasPreviousOpening, setHasPreviousOpening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (box) {
      setBoxCode(box.boxCode || '');
      setManualName(box.manualName || '');
      setLocation(box.location || '');
      setShopName(box.shopName || '');
      setOwnerName(box.ownerName || '');
      setOwnerPhone(box.ownerPhone || '');
      setAddress(box.address || '');
      setArea(box.area || '');
      setWard(box.ward || '');
      setResponsiblePerson(box.responsiblePerson || '');
      setStatus(box.status || 'ACTIVE');
      setNotes(box.notes || box.description || '');
      const prevDate = box.lastCollectedDate ? box.lastCollectedDate.split('T')[0] : '';
      setLastCollectedDate(prevDate);
      setHasPreviousOpening(!!prevDate);
      setInstallationDate(box.installationDate || (box.createdAt ? box.createdAt.split('T')[0] : ''));
      setError('');
    }
  }, [box]);

  if (!isOpen || !box) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await onSave(box.id, {
        boxCode,
        manualName,
        location,
        shopName,
        ownerName,
        ownerPhone,
        address,
        area,
        ward,
        responsiblePerson,
        status,
        notes,
        description: notes,
        lastCollectedDate: hasPreviousOpening && lastCollectedDate ? lastCollectedDate : '',
        installationDate: installationDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'আপডেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-4 bg-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Edit className="w-5 h-5 text-teal-300" />
            <h3 className="text-base font-bold">দানবাক্স তথ্য সংশোধন (Edit Donation Box)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Box Info */}
          <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-100 space-y-3">
            <div className="text-xs font-bold text-teal-900 flex items-center space-x-1.5">
              <Package className="w-4 h-4 text-teal-700" />
              <span>১. দানবাক্স পরিচিতি ও বিবরণ</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অটো সিরিয়াল / কোড <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={boxCode}
                  onChange={(e) => setBoxCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-teal-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ম্যানুয়াল নাম</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="যেমন: ১ নং উত্তর গেট বক্স"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">এক্টিভ অবস্থা (Status)</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
                  <option value="REPLACED">প্রতিস্থাপন (Replaced)</option>
                  <option value="LOST">হারিয়ে গেছে (Lost)</option>
                  <option value="DAMAGED">ক্ষতিগ্রস্ত (Damaged)</option>
                  <option value="MAINTENANCE">মেরামতে (Maintenance)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Location & Shop Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-slate-700" />
              <span>২. দানবাক্সের অবস্থান ও দোকানের তথ্য</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  স্থাপন স্থান / সাধারণ অবস্থান <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="যেমন: প্রধান ফটক / বাজার চত্বর"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">দোকানের নাম</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="যেমন: বিসমিল্লাহ স্টোর / মদিনা ফার্মেসী"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মালিকের নাম</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="যেমন: মোঃ কামরুল হাসান"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নং</label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণ ঠিকানা</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="যেমন: দোকান নং ১২, নিচতলা, মসজিদ মার্কেট, রোড #৩"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* 3. Last Opening / History Setup */}
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 space-y-3">
            <div className="text-xs font-bold text-amber-900 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>৩. সর্বশেষ খোলার তথ্য ও তারিখ (Opening History)</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <label className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer">
                  <input
                    type="radio"
                    name="hasPrevOpen"
                    checked={!hasPreviousOpening}
                    onChange={() => {
                      setHasPreviousOpening(false);
                      setLastCollectedDate('');
                    }}
                    className="text-amber-700 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-slate-800">কখনো খোলা হয়নি (আজই স্থাপন / নতুন)</span>
                </label>

                <label className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer">
                  <input
                    type="radio"
                    name="hasPrevOpen"
                    checked={hasPreviousOpening}
                    onChange={() => {
                      setHasPreviousOpening(true);
                      if (!lastCollectedDate) {
                        setLastCollectedDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="text-amber-700 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-slate-800">সফ্টওয়্যার ব্যবহারের পূর্বে খোলা হয়েছিল</span>
                </label>
              </div>

              {hasPreviousOpening && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      সর্বশেষ খোলার তারিখ (তারিখ পিকার) *
                    </label>
                    <input
                      type="date"
                      value={lastCollectedDate}
                      onChange={(e) => setLastCollectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      স্থাপনের তারিখ (Installation Date)
                    </label>
                    <input
                      type="date"
                      value={installationDate}
                      onChange={(e) => setInstallationDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">দায়িত্বপ্রাপ্ত প্রতিনিধি</label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="কমিটির প্রতিনিধি / কালেকশনকারী"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">নোট / বিবরণ</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="অতিরিক্ত তথ্য..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

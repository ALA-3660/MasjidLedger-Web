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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (box) {
      setBoxCode(box.boxCode || '');
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                দানবাক্স নম্বর / সিরিয়াল <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={boxCode}
                onChange={(e) => setBoxCode(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">অবস্থা (Status)</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="ACTIVE">সক্রিয় (Active)</option>
                <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
                <option value="REPLACED">প্রতিস্থাপন করা হয়েছে (Replaced)</option>
                <option value="LOST">হারিয়ে গেছে (Lost)</option>
                <option value="DAMAGED">ক্ষতিগ্রস্ত (Damaged)</option>
                <option value="MAINTENANCE">মেরামতে (Maintenance)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                স্থাপন স্থান <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="যেমন: প্রধান ফটক / বাজার চত্বর"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">দোকান / প্রতিষ্ঠানের নাম</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="যেমন: আল-আমিন স্টোর"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">দোকানদার / স্বত্বাধিকারীর নাম</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="মালিকের নাম"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
              <input
                type="tel"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">সম্পূর্ণ ঠিকানা</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="রোড, বাড়ি বা এলাকা"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ওয়ার্ড / ব্লক</label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="ওয়ার্ড নং"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">দায়িত্বপ্রাপ্ত ব্যক্তির নাম</label>
            <input
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder="কমিটির প্রতিনিধি / কালেকশনকারী"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">নোট / বিশেষ বিবরণ</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="অতিরিক্ত তথ্য..."
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

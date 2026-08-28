import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  Building,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { MosqueProperty, FinancialAccount } from '../types';
import { Language, formatCurrency } from '../lib/i18n';

interface PropertyExpenseModalProps {
  property: MosqueProperty | null;
  accounts: FinancialAccount[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  language: Language;
}

export const PROPERTY_EXPENSE_CATEGORIES = [
  { id: 'REPAIR', labelBn: 'মেরামত ও সংস্কার', icon: 'Wrench' },
  { id: 'MAINTENANCE', labelBn: 'নিয়মিত রক্ষণাবেক্ষণ ও পরিচ্ছন্নতা', icon: 'Sparkles' },
  { id: 'TAX_KHAJNA', labelBn: 'ভূমি উন্নয়ন কর ও খাজনা', icon: 'Landmark' },
  { id: 'UTILITIES', labelBn: 'বিদ্যুৎ, পানি ও ইউটিলিটি বিল', icon: 'Zap' },
  { id: 'LEGAL', labelBn: 'আইনি পরামর্শ ও মামলা খরচ', icon: 'Scale' },
  { id: 'CONSTRUCTION', labelBn: 'নতুন অবকাঠামো নির্মাণ/উন্নয়ন', icon: 'Building' },
  { id: 'OTHER', labelBn: 'অন্যান্য পরিচালন ব্যয়', icon: 'FileText' }
];

export const PropertyExpenseModal: React.FC<PropertyExpenseModalProps> = ({
  property,
  accounts,
  isOpen,
  onClose,
  onSubmit,
  language
}) => {
  const [expenseCategory, setExpenseCategory] = useState('REPAIR');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'BKASH' | 'NAGAD'>('CASH');
  const [accountId, setAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0]);
      setExpenseCategory('REPAIR');
      setAmount('');
      setPayeeName('');
      setDescription('');
      const defaultAcc = accounts.find(a => a.type === 'CASH') || accounts[0];
      setAccountId(defaultAcc ? defaultAcc.id : '');
      setError(null);
    }
  }, [isOpen, accounts]);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('ব্যয়ের পরিমাণ শূন্যের চেয়ে বেশি হতে হবে।');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const catObj = PROPERTY_EXPENSE_CATEGORIES.find(c => c.id === expenseCategory);

    try {
      await onSubmit({
        expenseCategory,
        expenseCategoryBn: catObj?.labelBn || expenseCategory,
        amount: Number(amount),
        date,
        payeeName,
        paymentMethod,
        accountId,
        description
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'ব্যয় সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Wrench className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">ওয়াকফ সম্পত্তি ব্যয় ও ভাউচার সংযোজন</h3>
              <p className="text-xs text-rose-200">{property.name || property.propertyCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Expense Category */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              ব্যয়ের খাত বা ক্যাটাগরি <span className="text-rose-500">*</span>
            </label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
            >
              {PROPERTY_EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.labelBn}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ব্যয়ের পরিমাণ (টাকা) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="যেমন: ৫০০০"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                খরচের তারিখ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Payee Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              প্রাপক / ভেন্ডর / কারিগরের নাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="যেমন: মেসার্স রহিম স্যানিটারি / মোস্তফা ইলেকট্রিক"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Payment Method & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">পরিশোধের মাধ্যম</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
              >
                <option value="CASH">নগদ (Cash)</option>
                <option value="BANK">ব্যাংক চেক / ট্রান্সফার</option>
                <option value="BKASH">বিকাশ (bKash)</option>
                <option value="NAGAD">নগদ (Nagad)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">যে হিসাব থেকে ব্যয় হবে</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn || acc.name} ({formatCurrency(acc.currentBalance, language)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">কাজের বিস্তারিত বিবরণ ও কারণ</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: মার্কেটের ছাদের পানির ট্যাংক ও ড্রেনেজ পাইপ মেরামত..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Integration Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900">
            <span className="font-bold block">অ্যাকাউন্টিং লিঙ্কড:</span>
            <p className="text-[11px] text-amber-800 mt-0.5">
              এই এন্ট্রিটি স্বয়ংক্রিয়ভাবে মসজিদের ব্যয় লেজারে ব্যয় ভাউচার হিসেবে জমা হবে এবং নির্বাচিত অ্যাকাউন্টের বর্তমান ব্যালেন্স থেকে কর্তন হবে।
            </p>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'ব্যয় ভাউচার সংরক্ষণ করুন'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

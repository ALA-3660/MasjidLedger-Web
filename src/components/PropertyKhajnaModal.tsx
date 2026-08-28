import React, { useState, useEffect } from 'react';
import {
  Landmark,
  X,
  Building,
  Calendar,
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MosqueProperty, FinancialAccount } from '../types';
import { Language, formatCurrency } from '../lib/i18n';

interface PropertyKhajnaModalProps {
  property: MosqueProperty | null;
  accounts: FinancialAccount[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  language: Language;
}

export const PropertyKhajnaModal: React.FC<PropertyKhajnaModalProps> = ({
  property,
  accounts,
  isOpen,
  onClose,
  onSubmit,
  language
}) => {
  const [taxYear, setTaxYear] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [holdingNo, setHoldingNo] = useState('');
  const [paidToOffice, setPaidToOffice] = useState('');
  const [notes, setNotes] = useState('');
  const [isExpenseLinked, setIsExpenseLinked] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      setTaxYear(`${year - 1}-${year} / ১৪৩১-১৪৩২ বঙ্গাব্দ`);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReceiptNumber('');
      setAmount('');
      setNextDueDate(`${year + 1}-03-31`);
      setHoldingNo('');
      setPaidToOffice('ইউনিয়ন / থানা ভূমি রাজস্ব অফিস');
      setNotes('');
      const defaultAcc = accounts.find(a => a.type === 'CASH') || accounts[0];
      setAccountId(defaultAcc ? defaultAcc.id : '');
      setError(null);
    }
  }, [isOpen, accounts]);

  if (!isOpen || !property) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxYear || !amount || Number(amount) <= 0) {
      setError('কর বছর ও সঠিক টাকার পরিমাণ আবশ্যক।');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        taxYear,
        amount: Number(amount),
        paymentDate,
        receiptNumber,
        nextDueDate,
        holdingNo,
        paidToOffice,
        notes,
        isExpenseLinked,
        accountId,
        paymentMethod
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'ভূমি কর রেকর্ড সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Landmark className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">ভূমি উন্নয়ন কর ও খাজনা দাখিলা সংযোজন</h3>
              <p className="text-xs text-amber-200">{property.name || property.propertyCode}</p>
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

          {/* Tax Year & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                কর বছর (Tax / Khajna Year) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                placeholder="যেমন: ২০২৫-২০২৬ / ১৪৩২ বঙ্গাব্দ"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                পরিশোধিত করের পরিমাণ (টাকা) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="যেমন: ৪৫০০"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Payment Date & Dakhila No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                পরিশোধের তারিখ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                দাখিলা / রসিদ নম্বর (Dakhila No)
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="যেমন: DAK-2026-9854"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Holding & Office */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">হোল্ডিং নম্বর (যদি থাকে)</label>
              <input
                type="text"
                value={holdingNo}
                onChange={(e) => setHoldingNo(e.target.value)}
                placeholder="যেমন: হোল্ডিং নং- ৮৫২/১"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">পরিশোধকৃত রাজস্ব অফিস</label>
              <input
                type="text"
                value={paidToOffice}
                onChange={(e) => setPaidToOffice(e.target.value)}
                placeholder="যেমন: পল্লবী থানা ভূমি রাজস্ব অফিস"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">পরবর্তী খাজনা পরিশোধের শেষ তারিখ</label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Safe Accounting Link Option */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isExpenseLinked}
                onChange={(e) => setIsExpenseLinked(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5"
              />
              <div>
                <span className="font-bold text-amber-900 block">মসজিদের ব্যয় ভাউচারে স্বয়ংক্রিয়ভাবে সংযুক্ত করুন</span>
                <span className="text-[11px] text-amber-800 block mt-0.5">
                  ভূমি উন্নয়ন কর বাবদ ব্যয় লেজারে এন্ট্রি হবে এবং নির্বাচিত ব্যাংক/ক্যাশ থেকে টাকা কর্তন হবে।
                </span>
              </div>
            </label>
          </div>

          {isExpenseLinked && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">পরিশোধের মাধ্যম</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                >
                  <option value="CASH">ক্যাশ (Cash)</option>
                  <option value="BANK">ব্যাংক চেক / অনলাইন</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">হিসাব খাত</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameBn || acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">মন্তব্য বা দাখিলা নোট</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: অনলাইন ই-নামজারি ও খাজনা পোর্টালে দাখিলা সংরক্ষিত..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
            />
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
              className="px-5 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'দাখিলা রেকর্ড সংরক্ষণ'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

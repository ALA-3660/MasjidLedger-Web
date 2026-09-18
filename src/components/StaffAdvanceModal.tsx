import React, { useState } from 'react';
import { X, Banknote, Save, AlertCircle, Building2, Wallet, Calendar, User, DollarSign } from 'lucide-react';
import { Staff, FinancialAccount } from '../types';
import { Language, translations, formatCurrency } from '../lib/i18n';

interface StaffAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  preselectedStaffId?: string;
  accounts: FinancialAccount[];
  onSubmit: (data: {
    staffId: string;
    amount: number;
    reason?: string;
    paymentMethod: 'CASH' | 'BANK' | 'CHEQUE';
    accountId: string;
    advanceDate: string;
    notes?: string;
  }) => Promise<void>;
  language?: Language;
}

export const StaffAdvanceModal: React.FC<StaffAdvanceModalProps> = ({
  isOpen,
  onClose,
  staffList = [],
  preselectedStaffId,
  accounts = [],
  onSubmit,
  language = 'bn'
}) => {
  const t = translations[language] || translations.bn;

  const [staffId, setStaffId] = useState<string>(preselectedStaffId || (staffList[0]?.id || ''));
  const [amount, setAmount] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('জরুরি পারিবারিক প্রয়োজনে অগ্রিম গ্রহণ');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('CASH');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [advanceDate, setAdvanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedStaff = staffList.find((s) => s.id === staffId);
  const selectedAccount = accounts.find((a) => a.id === accountId);

  // Active advance summary for selected staff
  const existingAdvances = (selectedStaff?.advanceRecords || []).filter(
    (a) => a.status === 'ACTIVE' || a.status === 'PARTIALLY_ADJUSTED'
  );
  const existingAdvanceTotal = existingAdvances.reduce((sum, a) => sum + (a.outstandingAmount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!staffId) {
      setError('অনুগ্রহ করে একজন স্টাফ নির্বাচন করুন।');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('অগ্রিমের সঠিক পরিমাণ লিখুন (০-এর বেশি হতে হবে)।');
      return;
    }

    if (selectedAccount && selectedAccount.currentBalance < numAmount) {
      const confirmLowBal = window.confirm(
        `সতর্কবার্তা: নির্বাচিত অ্যাকাউন্টের বর্তমান ব্যালেন্স (৳${selectedAccount.currentBalance}) প্রদানকৃত অগ্রিমের (৳${numAmount}) চেয়ে কম। আপনি কি তবুও এটি হিসাবভুক্ত করতে চান?`
      );
      if (!confirmLowBal) return;
    }

    try {
      setLoading(true);
      await onSubmit({
        staffId,
        amount: numAmount,
        reason,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        advanceDate,
        notes
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'অগ্রিম প্রদানের এন্ট্রি সম্পন্ন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">স্টাফ বেতন অগ্রিম প্রদান (Advance Loan)</h3>
              <p className="text-xs text-slate-300">হিসাবভুক্ত করে স্বয়ংক্রিয় খরচ ভাউচার তৈরি হবে</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Staff */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              স্টাফের নাম ও পদবী <span className="text-rose-500">*</span>
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">-- স্টাফ নির্বাচন করুন --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designationBn}) — মাসিক বেতন: ৳{s.monthlySalary || s.basicSalary || 0}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Info Card */}
          {selectedStaff && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
              <div>
                <p className="font-semibold">{selectedStaff.name} ({selectedStaff.designationBn})</p>
                <p className="text-purple-700 text-[11px] mt-0.5">আইডি: {selectedStaff.staffCode || 'N/A'} | মোবাইল: {selectedStaff.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-purple-700">বর্তমান সমন্বয়াধীন বকেয়া অগ্রিম:</p>
                <p className="text-sm font-bold text-purple-950">৳{existingAdvanceTotal.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                অগ্রিমের পরিমাণ (টাকা) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  required
                  min="1"
                  placeholder="যেমন: 5000"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                অগ্রিম প্রদানের তারিখ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              অগ্রিম গ্রহণের কারণ / বিবরণ
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: জরুরি চিকিৎসা / পারিবারিক প্রয়োজনে"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Payment Method & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                প্রদানের মাধ্যম <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="CASH">নগদ ক্যাশ (Cash)</option>
                <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
                <option value="CHEQUE">চেক (Cheque)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                উৎস অ্যাকাউন্ট (পরিশোধের উৎস) <span className="text-rose-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn} (ব্যালেন্স: ৳{acc.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              অনুমোদনের মন্তব্য / শর্তাবলী (ঐচ্ছিক)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="বেতন হতে প্রতি মাসে কত টাকা কর্তন করা হবে তা উল্লেখ করতে পারেন..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
            💡 <strong>সমন্বয় নিয়ম:</strong> এই অগ্রিম স্বয়ংক্রিয়ভাবে অ্যাকাউন্ট হতে কর্তন হবে এবং পরবর্তীতে মাসিক বেতন প্রদানের সময় ‘বেতন অগ্রিম কর্তন’ হিসেবে সমন্বয় করা যাবে।
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'অগ্রিম প্রদান ও ভাউচার ইস্যু'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

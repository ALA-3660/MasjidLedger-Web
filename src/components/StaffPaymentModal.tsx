import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertCircle, AlertTriangle, CheckCircle, Wallet, Calendar, FileText } from 'lucide-react';
import { Staff, StaffPayment, FinancialAccount } from '../types';
import { Language, translations, formatCurrency } from '../lib/i18n';

interface StaffPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  staffPayments: StaffPayment[];
  accounts: FinancialAccount[];
  initialStaffId?: string;
  initialMonth?: string;
  onPayStaff: (data: any) => Promise<void>;
  language: Language;
}

export const StaffPaymentModal: React.FC<StaffPaymentModalProps> = ({
  isOpen,
  onClose,
  staffList,
  staffPayments,
  accounts,
  initialStaffId,
  initialMonth,
  onPayStaff,
  language,
}) => {
  const t = translations[language];

  // Filter staff - Active by default
  const [includeInactive, setIncludeInactive] = useState(false);
  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');
  const availableStaff = includeInactive ? staffList : (activeStaff.length > 0 ? activeStaff : staffList);

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [paymentMonth, setPaymentMonth] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [basicSalary, setBasicSalary] = useState<number | ''>(0);
  const [bonus, setBonus] = useState<number | ''>(0);
  const [otherAllowance, setOtherAllowance] = useState<number | ''>(0);
  const [deduction, setDeduction] = useState<number | ''>(0);
  const [accountId, setAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE' | 'MFS'>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      const defaultStaff = (initialStaffId && staffList.find((s) => s.id === initialStaffId)) ||
        (activeStaff[0] || staffList[0]);

      const now = new Date();
      const currentYearMonth = initialMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const todayStr = now.toISOString().split('T')[0];

      if (defaultStaff) {
        setSelectedStaffId(defaultStaff.id);
        setBasicSalary(defaultStaff.monthlySalary || 0);
      }
      setPaymentMonth(currentYearMonth);
      setPaymentDate(todayStr);
      setBonus(0);
      setOtherAllowance(0);
      setDeduction(0);
      setAccountId(accounts[0]?.id || '');
      setPaymentMethod('CASH');
      setNotes('');
      setError(null);
    }
  }, [isOpen, initialStaffId, initialMonth, staffList, accounts]);

  // When selected staff changes, auto-fill basic salary
  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    const st = staffList.find((s) => s.id === staffId);
    if (st) {
      setBasicSalary(st.monthlySalary || 0);
    }
  };

  const currentSelectedStaff = staffList.find((s) => s.id === selectedStaffId);

  // Check duplicate payment
  const duplicatePayment = staffPayments.find(
    (p) => p.staffId === selectedStaffId && p.month === paymentMonth && p.status !== 'CANCELLED'
  );

  // Real-time calculations
  const numBasic = Number(basicSalary) || 0;
  const numBonus = Number(bonus) || 0;
  const numOther = Number(otherAllowance) || 0;
  const numDeduction = Number(deduction) || 0;

  const totalPayable = numBasic + numBonus + numOther;
  const netPaid = Math.max(0, totalPayable - numDeduction);

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const isInsufficientBalance = selectedAccount && selectedAccount.currentBalance < netPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError('অনুগ্রহ করে একজন স্টাফ নির্বাচন করুন।');
      return;
    }
    if (!paymentMonth) {
      setError('পরিশোধের মাস নির্ধারণ করুন।');
      return;
    }
    if (netPaid <= 0) {
      setError('পরিশোধিত অর্থের পরিমাণ ০-এর বেশি হতে হবে।');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onPayStaff({
        staffId: selectedStaffId,
        month: paymentMonth,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        basicSalary: numBasic,
        bonus: numBonus,
        otherAllowance: numOther,
        allowance: numBonus + numOther,
        deduction: numDeduction,
        totalPayable: totalPayable,
        netPaid: netPaid,
        accountId: accountId || accounts[0]?.id,
        paymentMethod: paymentMethod,
        notes: notes.trim(),
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'বেতন পরিশোধ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600/30 border border-emerald-400/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base font-siliguri">ইমাম ও স্টাফ মাসিক হাদিয়া/বেতন পরিশোধ</h3>
              <p className="text-xs text-slate-400">হাদিয়া, বোনাস ও ভাতা ভাউচার প্রস্তুত ও হিসাবভুক্তি</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Duplicate Warning Callout */}
          {duplicatePayment && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-amber-900">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>সতর্কতা: এই মাসের বেতন ইতিমধ্যে পরিশোধিত হয়েছে!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                <strong>{duplicatePayment.staffName}</strong>-কে <strong>{duplicatePayment.month}</strong> মাসের জন্য ইতিমধ্যে{' '}
                <strong>{formatCurrency(duplicatePayment.netPaid, language)}</strong> পরিশোধ করা হয়েছে (ভাউচার:{' '}
                <span className="font-mono font-bold text-amber-950">{duplicatePayment.expenseVoucherNumber}</span>, তারিখ:{' '}
                {duplicatePayment.paymentDate})। আপনি যদি কোনো বকেয়া বা বিশেষ বোনাস দিতে চান তবে নিচের অতিরিক্ত ফিল্ড ব্যবহার করুন।
              </p>
            </div>
          )}

          {/* Staff Selection & Inactive Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">স্টাফ বা প্রাপক নির্বাচন করুন *</label>
              <label className="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>নিষ্ক্রিয় স্টাফসহ দেখান</span>
              </label>
            </div>

            <select
              id="select-pay-staff"
              value={selectedStaffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold"
            >
              {availableStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} — {st.designationBn} [মূল হাদিয়া: ৳{st.monthlySalary?.toLocaleString('en-IN')}]
                  {st.status !== 'ACTIVE' ? ' (নিষ্ক্রিয়)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Month & Payment Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পরিশোধের মাস (Payment Month) *
              </label>
              <input
                id="input-pay-month"
                type="month"
                required
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পরিশোধের তারিখ (Payment Date) *
              </label>
              <input
                id="input-pay-date"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Salary Breakdown Box (Basic, Bonus, Other, Deduction) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800">বেতন ও ভাতার বিস্তারিত বিবরণ</span>
              <span className="text-[11px] text-slate-500">স্বয়ংক্রিয় গণনাকৃত</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Basic Salary */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  মূল বেতন / হাদিয়া (Basic) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-500">৳</span>
                  <input
                    id="input-basic-salary"
                    type="number"
                    min="0"
                    required
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
                <span className="text-[10px] text-slate-500">স্টাফ প্রোফাইল থেকে স্বয়ংক্রিয় পূরণকৃত</span>
              </div>

              {/* Bonus */}
              <div>
                <label className="block font-semibold text-emerald-800 mb-1">
                  ঈদ / বিশেষ বোনাস (Bonus)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-emerald-600">৳</span>
                  <input
                    id="input-salary-bonus"
                    type="number"
                    min="0"
                    placeholder="০"
                    value={bonus}
                    onChange={(e) => setBonus(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-emerald-950 focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <span className="text-[10px] text-emerald-600">ঈদ বা বিশেষ অনুদান (মূল বেতনের সাথে যুক্ত হবে না)</span>
              </div>

              {/* Other Allowance */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অন্যান্য ভাতা (Allowance)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-500">৳</span>
                  <input
                    id="input-salary-other-allowance"
                    type="number"
                    min="0"
                    placeholder="০"
                    value={otherAllowance}
                    onChange={(e) => setOtherAllowance(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
                <span className="text-[10px] text-slate-500">যাতায়াত / চিকিৎসা / আপ্যায়ন ভাতা</span>
              </div>

              {/* Deduction */}
              <div>
                <label className="block font-semibold text-rose-800 mb-1">
                  কর্তন / অগ্রিম সমন্বয় (Deduction)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-rose-500">-৳</span>
                  <input
                    id="input-salary-deduction"
                    type="number"
                    min="0"
                    placeholder="০"
                    value={deduction}
                    onChange={(e) => setDeduction(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-rose-300 rounded-lg text-rose-950 focus:ring-2 focus:ring-rose-500 font-bold"
                  />
                </div>
                <span className="text-[10px] text-rose-600">অনুপস্থিতি বা অগ্রিম পরিশোধ সমন্বয়</span>
              </div>
            </div>

            {/* Total Summary Banner */}
            <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-500">
                  মোট প্রদেয়: ৳{totalPayable.toLocaleString('en-IN')}{' '}
                  {numDeduction > 0 && `(কর্তন: ৳${numDeduction.toLocaleString('en-IN')})`}
                </div>
                <div className="text-xs font-bold text-slate-800">সর্বমোট প্রদেয় নিট টাকা (Net Paid):</div>
              </div>
              <div className="text-lg font-black text-emerald-700 font-siliguri">
                ৳ {netPaid.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পরিশোধের ব্যাংক বা ক্যাশ হিসাব *
              </label>
              <select
                id="select-pay-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nameBn} (স্থিতি: {formatCurrency(a.currentBalance, language)})
                  </option>
                ))}
              </select>
              {isInsufficientBalance && (
                <p className="text-[11px] text-amber-700 font-semibold mt-1">
                  ⚠️ সতর্কবার্তা: নির্বাচিত হিসাবে পর্যাপ্ত তহবিল নেই (স্থিতি: ৳{selectedAccount?.currentBalance.toLocaleString('en-IN')})
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">পরিশোধের মাধ্যম *</label>
              <select
                id="select-pay-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="CASH">ক্যাশ / নগদ টাকা</option>
                <option value="BANK">ব্যাংক ট্রান্সফার / EFT</option>
                <option value="CHEQUE">ব্যাংক চেক</option>
                <option value="MFS">বিকাশ / নগদ / রকেট</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">মন্তব্য বা রেফারেন্স</label>
            <input
              id="input-pay-notes"
              type="text"
              placeholder="যেমন: ঈদুল ফিতর বিশেষ হাদিয়াসহ পরিশোধ / চেক নং ১২৩৪৫৬"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Accounting info badge */}
          <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center space-x-2 text-[11px] text-blue-900">
            <FileText className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              এই পরিশোধের জন্য স্বয়ংক্রিয়ভাবে খরচ ভাউচার তৈরি হবে এবং বর্তমান কমিটির মেয়াদের হিসাবভুক্ত হবে।
            </span>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              id="btn-confirm-salary-pay"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{loading ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'পরিশোধ ও ভাউচার নিশ্চিত করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Gift, Check, AlertCircle, Building, DollarSign, Users, Landmark, ShieldCheck, Printer } from 'lucide-react';
import { Staff, FinancialAccount } from '../types';
import { Language, translations, formatCurrency } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';

interface StaffFestivalAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  accounts: FinancialAccount[];
  onDisburse: (data: any) => Promise<void>;
  language: Language;
}

export const StaffFestivalAllowanceModal: React.FC<StaffFestivalAllowanceModalProps> = ({
  isOpen,
  onClose,
  staffList,
  accounts,
  onDisburse,
  language,
}) => {
  const t = translations[language];

  const [festivalName, setFestivalName] = useState('পবিত্র ঈদুল ফিতর ২০২৬');
  const [paymentType, setPaymentType] = useState<'FESTIVAL_ALLOWANCE' | 'BONUS' | 'SPECIAL_ALLOWANCE'>('FESTIVAL_ALLOWANCE');
  const [paymentMonth, setPaymentMonth] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'CASH' | 'CHEQUE'>('BANK');
  const [notes, setNotes] = useState('');

  // Per staff allocation map: { [staffId]: { selected: boolean, amount: number, notes: string } }
  const [allocations, setAllocations] = useState<Record<string, { selected: boolean; amount: number; notes: string }>>({});
  const [commonAmount, setCommonAmount] = useState<number | ''>(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const todayStr = now.toISOString().split('T')[0];

      setFestivalName('পবিত্র ঈদুল ফিতর ২০২৬');
      setPaymentType('FESTIVAL_ALLOWANCE');
      setPaymentMonth(currentYearMonth);
      setPaymentDate(todayStr);
      setAccountId(accounts.find((a) => a.accountType === 'BANK')?.id || accounts[0]?.id || '');
      setPaymentMethod('BANK');
      setNotes('');
      setError(null);

      // Default: All active staff selected with 50% of their basic or 5,000 taka
      const initialMap: Record<string, { selected: boolean; amount: number; notes: string }> = {};
      activeStaff.forEach((s) => {
        const defaultBonus = Math.round((s.monthlySalary || 10000) * 0.5);
        initialMap[s.id] = {
          selected: true,
          amount: defaultBonus > 0 ? defaultBonus : 5000,
          notes: '',
        };
      });
      setAllocations(initialMap);
    }
  }, [isOpen, staffList, accounts]);

  const handleSelectAll = (select: boolean) => {
    const updated = { ...allocations };
    activeStaff.forEach((s) => {
      if (updated[s.id]) {
        updated[s.id].selected = select;
      }
    });
    setAllocations(updated);
  };

  const handleApplyCommonAmount = () => {
    if (commonAmount === '' || Number(commonAmount) < 0) return;
    const val = Number(commonAmount);
    const updated = { ...allocations };
    activeStaff.forEach((s) => {
      if (updated[s.id] && updated[s.id].selected) {
        updated[s.id].amount = val;
      }
    });
    setAllocations(updated);
  };

  const handleApplyPercentage = (pct: number) => {
    const updated = { ...allocations };
    activeStaff.forEach((s) => {
      if (updated[s.id] && updated[s.id].selected) {
        updated[s.id].amount = Math.round((s.monthlySalary || 0) * (pct / 100));
      }
    });
    setAllocations(updated);
  };

  const handleToggleStaff = (id: string) => {
    const updated = { ...allocations };
    if (updated[id]) {
      updated[id].selected = !updated[id].selected;
      setAllocations(updated);
    }
  };

  const handleAmountChange = (id: string, val: number) => {
    const updated = { ...allocations };
    if (updated[id]) {
      updated[id].amount = Math.max(0, val);
      setAllocations(updated);
    }
  };

  // Calculations
  const selectedStaffList = activeStaff.filter((s) => allocations[s.id]?.selected);
  const totalAmount = selectedStaffList.reduce((sum, s) => sum + (allocations[s.id]?.amount || 0), 0);
  const amountInWords = numberToBanglaWords(totalAmount);

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const isInsufficientBalance = selectedAccount && selectedAccount.currentBalance < totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festivalName.trim()) {
      setError('উৎসবের নাম প্রদান করুন (যেমন: পবিত্র ঈদুল ফিতর ২০২৬)');
      return;
    }
    if (selectedStaffList.length === 0) {
      setError('অন্তত একজন ইমাম বা স্টাফ নির্বাচন করুন।');
      return;
    }
    if (totalAmount <= 0) {
      setError('ভাতার মোট পরিমাণ ০ টাকার বেশি হতে হবে।');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const staffAllocations = selectedStaffList.map((s) => ({
        staffId: s.id,
        amount: allocations[s.id]?.amount || 0,
        notes: allocations[s.id]?.notes || '',
      }));

      await onDisburse({
        festivalName: festivalName.trim(),
        paymentType,
        month: paymentMonth,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        accountId: accountId || accounts[0]?.id,
        paymentMethod,
        staffAllocations,
        notes: notes.trim(),
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'উৎসব ভাতা বিতরণ সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/30 border border-amber-400/30 rounded-lg">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base font-siliguri">
                উৎসব ভাতা ও বিশেষ বোনাস বিতরণ (Festival Allowance)
              </h3>
              <p className="text-xs text-slate-400">
                ইমাম ও সকল স্টাফদের এক ক্লিকে উৎসব ভাতা নির্ধারণ, একাউন্ট থেকে প্রদান ও ভাউচার পোস্টিং
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Festival Presets */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  উৎসব / বোনাসের উপলক্ষ্য *
                </label>
                <input
                  id="input-festival-name"
                  type="text"
                  required
                  placeholder="যেমন: পবিত্র ঈদুল ফিতর ২০২৬"
                  value={festivalName}
                  onChange={(e) => setFestivalName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  পরিশোধের মাস ও অর্থবছর *
                </label>
                <input
                  id="input-festival-month"
                  type="month"
                  required
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  পরিশোধের তারিখ *
                </label>
                <input
                  id="input-festival-date"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            {/* Quick Tag presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-amber-900 mr-1">দ্রুত নির্বাচন:</span>
              <button
                type="button"
                onClick={() => setFestivalName('পবিত্র ঈদুল ফিতর ২০২৬')}
                className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 rounded text-[11px] text-amber-900 font-medium cursor-pointer"
              >
                ঈদুল ফিতর
              </button>
              <button
                type="button"
                onClick={() => setFestivalName('পবিত্র ঈদুল আযহা ২০২৬')}
                className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 rounded text-[11px] text-amber-900 font-medium cursor-pointer"
              >
                ঈদুল আযহা
              </button>
              <button
                type="button"
                onClick={() => setFestivalName('রমাদানুল মুবারক বিশেষ হাদিয়া')}
                className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 rounded text-[11px] text-amber-900 font-medium cursor-pointer"
              >
                রমাদান হাদিয়া
              </button>
              <button
                type="button"
                onClick={() => setFestivalName('বিশেষ পারফরম্যান্স বোনাস')}
                className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 rounded text-[11px] text-amber-900 font-medium cursor-pointer"
              >
                বিশেষ বোনাস
              </button>
            </div>
          </div>

          {/* Payment Account & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পরিশোধের তহবিল / হিসাব খাত *
              </label>
              <select
                id="select-festival-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn} ({acc.accountType === 'BANK' ? 'ব্যাংক' : 'ক্যাশ'}) - ব্যালেন্স: ৳ {acc.currentBalance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পরিশোধের মাধ্যম *
              </label>
              <select
                id="select-festival-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="BANK">ব্যাংক ট্রান্সফার (Bank Transfer)</option>
                <option value="CASH">নগদ প্রদান (Cash Payment)</option>
                <option value="CHEQUE">ব্যাংক চেক (Cheque)</option>
              </select>
            </div>
          </div>

          {/* Quick Bulk Amount Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-blue-950 text-xs">একযোগে পরিমাণ নির্ধারণ:</span>
              <button
                type="button"
                onClick={() => handleApplyPercentage(50)}
                className="px-2.5 py-1 bg-white border border-blue-300 hover:bg-blue-100 rounded text-blue-900 font-bold text-xs cursor-pointer"
                title="মূল বেতনের ৫০% বোনাস সেট করুন"
              >
                ৫০% বেতন
              </button>
              <button
                type="button"
                onClick={() => handleApplyPercentage(100)}
                className="px-2.5 py-1 bg-white border border-blue-300 hover:bg-blue-100 rounded text-blue-900 font-bold text-xs cursor-pointer"
                title="পূর্ণ ১ মাসের বেতন বোনাস সেট করুন"
              >
                ১০০% বেতন
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                placeholder="নির্দিষ্ট পরিমাণ"
                value={commonAmount}
                onChange={(e) => setCommonAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-28 px-2 py-1 bg-white border border-blue-200 rounded text-xs text-slate-900 font-bold"
              />
              <button
                type="button"
                onClick={handleApplyCommonAmount}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
              >
                সবাইকে প্রয়োগ
              </button>
            </div>
          </div>

          {/* Staff Allocation Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedStaffList.length === activeStaff.length && activeStaff.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-bold text-slate-800">
                  কর্মরত স্টাফ তালিকা ({selectedStaffList.length}/{activeStaff.length} জন নির্বাচিত)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">ব্যক্তিগতভাবে পরিমাণ পরিবর্তনযোগ্য</span>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-200 text-xs">
              {activeStaff.map((s, idx) => {
                const isSelected = Boolean(allocations[s.id]?.selected);
                const amt = allocations[s.id]?.amount || 0;

                return (
                  <div
                    key={s.id}
                    className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-white' : 'bg-slate-50/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStaff(s.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate flex items-center space-x-1.5">
                          <span>{s.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({s.staffCode || `STF-${idx + 1}`})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {s.designationBn} • মূল বেতন: ৳{s.monthlySalary?.toLocaleString('en-IN')}
                          {s.bankName ? ` • ${s.bankName}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[11px] font-bold text-slate-600">ভাতা: ৳</span>
                      <input
                        type="number"
                        min="0"
                        disabled={!isSelected}
                        value={amt}
                        onChange={(e) => handleAmountChange(s.id, Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-bold text-right font-mono"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Banner */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 text-sm">
                সর্বমোট উৎসব ভাতা বরাদ্দ ({selectedStaffList.length} জন স্টাফ):
              </span>
              <span className="font-black text-lg text-emerald-950 font-mono">
                ৳ {totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-xs text-emerald-900 font-medium">
              কথায়: {amountInWords} মাত্র
            </div>
            {isInsufficientBalance && (
              <div className="text-xs font-bold text-rose-700 pt-1">
                ⚠️ সতর্কবার্তা: নির্বাচিত একাউন্টের বর্তমান ব্যালেন্স (৳{selectedAccount?.currentBalance.toLocaleString('en-IN')}) অপর্যাপ্ত।
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              id="btn-disburse-festival-allowance"
              type="submit"
              disabled={loading || selectedStaffList.length === 0 || totalAmount <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{loading ? 'প্রসেসিং হচ্ছে...' : 'উৎসব ভাতা বিতরণ ও ভাউচার পোস্টিং'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

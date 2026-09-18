import React, { useState } from 'react';
import { X, Award, Save, AlertCircle, DollarSign, Banknote, Calendar, CheckCircle2 } from 'lucide-react';
import { Staff, FinancialAccount } from '../types';
import { Language, translations, formatCurrency } from '../lib/i18n';

interface StaffSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  accounts: FinancialAccount[];
  onSubmit: (data: {
    staffId: string;
    settlementDate: string;
    resignationOrTerminationDate: string;
    lastMonthlySalary: number;
    dueSalaryAmount: number;
    unadjustedAdvanceAmount: number;
    gratuityOrHonorarium: number;
    otherAllowances: number;
    totalDeduction: number;
    netSettlementAmount: number;
    paymentMethod: 'CASH' | 'BANK' | 'CHEQUE';
    accountId: string;
    notes?: string;
    settleAndEndEmployment: boolean;
  }) => Promise<void>;
  language?: Language;
}

export const StaffSettlementModal: React.FC<StaffSettlementModalProps> = ({
  isOpen,
  onClose,
  staff,
  accounts = [],
  onSubmit,
  language = 'bn'
}) => {
  const t = translations[language] || translations.bn;

  if (!isOpen || !staff) return null;

  // Calculate unadjusted advance for this staff
  const activeAdvances = (staff.advanceRecords || []).filter(
    (a) => a.status === 'ACTIVE' || a.status === 'PARTIALLY_ADJUSTED'
  );
  const totalOutstandingAdvance = activeAdvances.reduce((sum, a) => sum + (a.outstandingAmount || 0), 0);

  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [resignationOrTerminationDate, setResignationOrTerminationDate] = useState<string>(
    staff.resignationDate || staff.terminationDate || new Date().toISOString().split('T')[0]
  );
  const [lastMonthlySalary, setLastMonthlySalary] = useState<number>(staff.monthlySalary || staff.basicSalary || 0);
  const [dueSalaryAmount, setDueSalaryAmount] = useState<number>(0);
  const [unadjustedAdvanceAmount, setUnadjustedAdvanceAmount] = useState<number>(totalOutstandingAdvance);
  const [gratuityOrHonorarium, setGratuityOrHonorarium] = useState<number>(0);
  const [otherAllowances, setOtherAllowances] = useState<number>(0);
  const [otherDeduction, setOtherDeduction] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CHEQUE'>('BANK');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [notes, setNotes] = useState<string>('দীর্ঘদিনের সেবার জন্য বিদায়ী সম্মাননা ও চাকুরির চূড়ান্ত পাওনা নিষ্পত্তি');
  const [settleAndEndEmployment, setSettleAndEndEmployment] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Net settlement calculation
  const totalPayable = dueSalaryAmount + gratuityOrHonorarium + otherAllowances;
  const totalDeductions = unadjustedAdvanceAmount + otherDeduction;
  const netSettlement = Math.max(0, totalPayable - totalDeductions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const confirm = window.confirm(
      `আপনি কি নিশ্চিত যে ${staff.name} (${staff.designationBn}) এর চূড়ান্ত হিসাব নিষ্পত্তি (মোট প্রদেয়: ৳${netSettlement.toLocaleString()}) সম্পন্ন করতে চান? এটি হিসাবের স্থায়ী রেকর্ড তৈরি করবে।`
    );
    if (!confirm) return;

    try {
      setLoading(true);
      await onSubmit({
        staffId: staff.id,
        settlementDate,
        resignationOrTerminationDate,
        lastMonthlySalary,
        dueSalaryAmount,
        unadjustedAdvanceAmount,
        gratuityOrHonorarium,
        otherAllowances,
        totalDeduction: totalDeductions,
        netSettlementAmount: netSettlement,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        notes,
        settleAndEndEmployment
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'চূড়ান্ত নিষ্পত্তি সম্পন্ন করা সম্ভব হয়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">স্টাফ চাকুরির চূড়ান্ত নিষ্পত্তি (Final Settlement)</h3>
              <p className="text-xs text-slate-300">{staff.name} ({staff.designationBn}) - বিদায়ী সম্মাননা ও দেনা-পাওনা</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold mb-1">অবসর / পদত্যাগের কার্যকর তারিখ</label>
              <input
                type="date"
                value={resignationOrTerminationDate}
                onChange={(e) => setResignationOrTerminationDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">হিসাব নিষ্পত্তির তারিখ</label>
              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Calculations Breakdown */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">পাওনা ও কর্তনের হিসাব বিভাজন</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-emerald-700">+ বকেয়া বেতন (যদি থাকে)</label>
                <input
                  type="number"
                  min="0"
                  value={dueSalaryAmount}
                  onChange={(e) => setDueSalaryAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-700">+ গ্র্যাচুইটি / বিদায়ী সম্মাননা</label>
                <input
                  type="number"
                  min="0"
                  value={gratuityOrHonorarium}
                  onChange={(e) => setGratuityOrHonorarium(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-700">+ অন্যান্য বকেয়া সুবিধা / ভাতা</label>
                <input
                  type="number"
                  min="0"
                  value={otherAllowances}
                  onChange={(e) => setOtherAllowances(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-rose-700">- বকেয়া বেতন অগ্রিম কর্তন</label>
                <input
                  type="number"
                  min="0"
                  value={unadjustedAdvanceAmount}
                  onChange={(e) => setUnadjustedAdvanceAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-rose-700">- অন্যান্য কর্তন (যদি থাকে)</label>
              <input
                type="number"
                min="0"
                value={otherDeduction}
                onChange={(e) => setOtherDeduction(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
              />
            </div>

            {/* Net Amount Badge */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-950 text-sm">সর্বমোট চূড়ান্ত প্রদেয় পরিমাণ (Net Payable):</p>
                <p className="text-[11px] text-emerald-700">মোট পাওনা: ৳{totalPayable} | মোট কর্তন: ৳{totalDeductions}</p>
              </div>
              <p className="text-xl font-extrabold text-emerald-800">৳{netSettlement.toLocaleString()}</p>
            </div>
          </div>

          {/* Payment Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold mb-1">পরিশোধের মাধ্যম</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="BANK">ব্যাংক ট্রান্সফার (Bank)</option>
                <option value="CASH">নগদ ক্যাশ (Cash)</option>
                <option value="CHEQUE">চেক (Cheque)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">উৎস ব্যাংক/ক্যাশ অ্যাকাউন্ট</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn} (৳{acc.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold mb-1">সার্বিক মন্তব্য ও রেজুলেশন রেফারেন্স</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="endEmployment"
              checked={settleAndEndEmployment}
              onChange={(e) => setSettleAndEndEmployment(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="endEmployment" className="font-semibold text-slate-800">
              স্টাফের কর্মসংস্থান স্ট্যাটাসকে 'চাকুরি সমাপ্ত (Employment Ended)' হিসেবে মার্ক করুন
            </label>
          </div>

          {/* Footer */}
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
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'প্রক্রিয়াধীন...' : 'চূড়ান্ত হিসাব নিষ্পত্তি ও ভাউচার পাস'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

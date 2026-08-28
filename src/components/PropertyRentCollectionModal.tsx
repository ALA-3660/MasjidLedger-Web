import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  X,
  Building,
  User,
  Calendar,
  CreditCard,
  Receipt,
  FileCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MosqueProperty, PropertyTenant, FinancialAccount } from '../types';
import { Language, formatCurrency } from '../lib/i18n';

interface PropertyRentCollectionModalProps {
  property: MosqueProperty | null;
  accounts: FinancialAccount[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  language: Language;
}

export const PropertyRentCollectionModal: React.FC<PropertyRentCollectionModalProps> = ({
  property,
  accounts,
  isOpen,
  onClose,
  onSubmit,
  language
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [billingMonth, setBillingMonth] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [previousDue, setPreviousDue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'ROCKET'>('CASH');
  const [accountId, setAccountId] = useState('');
  const [isAccountingLinked, setIsAccountingLinked] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && property) {
      const activeTenants = (property.tenants || []).filter(t => t.status === 'ACTIVE' || t.status === 'EXPIRING_SOON');
      if (activeTenants.length > 0) {
        const first = activeTenants[0];
        setSelectedTenantId(first.id);
        setMonthlyRent(first.monthlyRent || 0);
      } else {
        setSelectedTenantId('');
        setMonthlyRent(property.monthlyIncome || property.monthlyRent || 0);
      }

      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setBillingMonth(currentMonthStr);
      setPaymentDate(now.toISOString().split('T')[0]);
      setPreviousDue(0);
      setPaidAmount(activeTenants[0]?.monthlyRent || property.monthlyIncome || property.monthlyRent || 0);

      const defaultAcc = accounts.find(a => a.type === 'CASH') || accounts[0];
      setAccountId(defaultAcc ? defaultAcc.id : '');
      setError(null);
    }
  }, [isOpen, property, accounts]);

  // When tenant changes, update default rent & past due if any
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = (property?.tenants || []).find(t => t.id === tenantId);
    if (tenant) {
      const rent = tenant.monthlyRent || 0;
      setMonthlyRent(rent);
      setPaidAmount(rent + previousDue);
    }
  };

  const totalDue = (Number(monthlyRent) || 0) + (Number(previousDue) || 0);
  const remainingDue = Math.max(0, totalDue - (Number(paidAmount) || 0));

  if (!isOpen || !property) return null;

  const activeTenants = (property.tenants || []).filter(t => t.status !== 'TERMINATED');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId) {
      setError('অনুগ্রহ করে একজন ভাড়াটিয়া বা ইজারাদার নির্বাচন করুন।');
      return;
    }
    if (Number(paidAmount) < 0) {
      setError('পরিশোধের পরিমাণ ঋণাত্মক হতে পারে না।');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        tenantId: selectedTenantId,
        billingMonth,
        monthlyRent: Number(monthlyRent),
        previousDue: Number(previousDue),
        paidAmount: Number(paidAmount),
        paymentDate,
        paymentMethod,
        accountId,
        isAccountingLinked,
        notes
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'ভাড়া সংগ্রহ সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">ওয়াকফ সম্পত্তি ভাড়া / কিস্তি আদায়</h3>
              <p className="text-xs text-emerald-200">{property.name || property.propertyCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tenant Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              ভাড়াটিয়া / ইজারাদার নির্বাচন করুন <span className="text-rose-500">*</span>
            </label>
            {activeTenants.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                এই সম্পত্তিতে কোনো সক্রিয় ভাড়াটিয়া নেই। অনুগ্রহ করে প্রথমে ভাড়াটিয়া যোগ করুন।
              </div>
            ) : (
              <select
                value={selectedTenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                {activeTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.unitOrShopNo || 'দোকান/ইউনিট'} (ভাড়া: ৳{t.monthlyRent?.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Month & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ভাড়ার মাস (Billing Month) <span className="text-rose-500">*</span>
              </label>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                টাকা জমা বা আদায়ের তারিখ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Receipt className="w-4 h-4 text-emerald-600" />
              ভাড়া ও বকেয়া হিসাব ক্যালকুলেশন
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">নির্ধারিত মাসিক ভাড়া (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={monthlyRent || ''}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">পূর্বের বকেয়া (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={previousDue || ''}
                  onChange={(e) => setPreviousDue(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">মোট প্রদেয় ভাড়া:</span>
              <strong className="text-slate-900 text-sm">{formatCurrency(totalDue, language)}</strong>
            </div>

            {/* Paid Amount */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block font-bold text-emerald-800 mb-1 text-sm">
                আদায়কৃত অর্থ / প্রাপ্ত টাকা (৳) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2.5 bg-emerald-50/60 border-2 border-emerald-500 rounded-xl text-base font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="font-semibold text-slate-600">অবশিষ্ট বকেয়া থাকবে:</span>
              <span className={`font-bold ${remainingDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {formatCurrency(remainingDue, language)}
              </span>
            </div>
          </div>

          {/* Payment Method & Bank/Cash Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">পেমেন্ট মেথড</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CASH">ক্যাশ (Cash)</option>
                <option value="BANK">ব্যাংক জমা / ট্রান্সফার</option>
                <option value="BKASH">বিকাশ (bKash)</option>
                <option value="NAGAD">নগদ (Nagad)</option>
                <option value="ROCKET">রকেট (Rocket)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">জমা হিসাব খাত (Account)</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn || acc.name} ({formatCurrency(acc.currentBalance, language)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Safe Accounting Link Option */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAccountingLinked}
                onChange={(e) => setIsAccountingLinked(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <span className="font-bold text-blue-900 block">মসজিদের মূল আয় হিসাব ও লেজারে স্বয়ংক্রিয় এন্ট্রি করুন</span>
                <span className="text-[11px] text-blue-700 block mt-0.5">
                  আদায়কৃত অর্থ সরাসরি আয় ভাউচার হিসেবে জমা হবে এবং ব্যালেন্স হালনাগাদ হবে। (নিরাপদ ইন্টিগ্রেশন)
                </span>
              </div>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">মন্তব্য বা বিবরণ (ঐচ্ছিক)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: আগস্ট মাসের ভাড়া পূর্ণ পরিশোধিত..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || activeTenants.length === 0}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'ভাড়া আদায় নিশ্চিত ও রসিদ তৈরি'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

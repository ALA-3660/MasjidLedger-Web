import React, { useState, useEffect } from 'react';
import {
  FinancialAccount,
  AccountOpeningBalancePayload,
} from '../types';
import {
  X,
  Scale,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Landmark,
  Wallet,
  Smartphone,
  FileText,
  Info,
  ShieldCheck,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import { formatDate } from '../lib/i18n';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  onUpdateOpeningBalance: (data: AccountOpeningBalancePayload) => Promise<void>;
  preselectedAccountId?: string;
}

export const OPENING_BALANCE_SOURCES = [
  { id: 'INITIAL_SETUP', label: 'সফটওয়্যার প্রাথমিক হিসাব সেটআপ (System Baseline Setup)' },
  { id: 'PREVIOUS_COMMITTEE_HANDOVER', label: 'পূর্ববর্তী কমিটির তহবিল হস্তান্তর (Previous Committee Handover)' },
  { id: 'ANNUAL_CLOSING_BROUGHT_FORWARD', label: 'পূর্ববর্তী অর্থবছরের সমাপনী জের (Annual Closing B/F)' },
  { id: 'BANK_STATEMENT_BASELINE', label: 'ব্যাংক হিসাব স্টেটমেন্ট প্রারম্ভিক জের (Bank Statement Baseline)' },
  { id: 'AUDIT_ADJUSTMENT', label: 'অডিট ও খতিয়ান প্রারম্ভিক সমন্বয় (Audit Baseline Adjustment)' },
  { id: 'OTHER', label: 'অন্যান্য বৈধ আর্থিক উৎস (Other Source)' },
];

export const OpeningBalanceModal: React.FC<OpeningBalanceModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onUpdateOpeningBalance,
  preselectedAccountId,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [balanceType, setBalanceType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [effectiveDate, setEffectiveDate] = useState<string>('2026-07-31');
  const [source, setSource] = useState<string>('INITIAL_SETUP');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const initialId = preselectedAccountId || (accounts.length > 0 ? accounts[0].id : '');
      setSelectedAccountId(initialId);
      loadAccountData(initialId);
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen, preselectedAccountId, accounts]);

  const loadAccountData = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    if (acc) {
      setAmount(acc.openingBalance !== undefined ? String(acc.openingBalance) : '0');
      setBalanceType(acc.openingBalanceType || 'DEBIT');
      setEffectiveDate(acc.openingBalanceDate || '2026-07-31');
      setSource(acc.openingBalanceSource || 'INITIAL_SETUP');
      setNote(acc.openingBalanceNote || '');
    }
  };

  const handleAccountChange = (accId: string) => {
    setSelectedAccountId(accId);
    loadAccountData(accId);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setErrorMessage('অনুগ্রহ করে একটি অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMessage('সঠিক প্রারম্ভিক স্থিতির পরিমাণ লিখুন (০ বা তার বেশি)।');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await onUpdateOpeningBalance({
        accountId: selectedAccountId,
        openingBalance: numAmount,
        openingBalanceType: balanceType,
        openingBalanceDate: effectiveDate || new Date().toISOString().split('T')[0],
        openingBalanceSource: source,
        openingBalanceNote: note.trim(),
      });

      const acc = accounts.find((a) => a.id === selectedAccountId);
      setSuccessMessage(`${acc?.nameBn || 'হিসাব'}-এর প্রারম্ভিক স্থিতি সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'প্রারম্ভিক স্থিতি সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOpeningBalance = accounts.reduce((sum, a) => {
    const bal = a.openingBalance || 0;
    return a.openingBalanceType === 'CREDIT' ? sum - bal : sum + bal;
  }, 0);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col font-siliguri">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">প্রারম্ভিক স্থিতি ব্যবস্থাপনা (Opening Balance)</h3>
              <p className="text-xs text-slate-300 font-baloo">
                ক্যাশ, ব্যাংক ও অন্যান্য তহবিলের হিসাবের শুরুর স্থিতি ও কার্যকর তারিখ নির্ধারণ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Important Accounting Notice Box */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 font-baloo leading-relaxed space-y-1">
                <p className="font-bold font-siliguri text-amber-950">
                  ⚠️ গুরুত্বপূর্ণ অ্যাকাউন্টিং নীতিমালা ও ডেটা নিরাপত্তা:
                </p>
                <p>
                  • <strong>কোনো আয় বা ব্যয় নয়:</strong> প্রারম্ভিক স্থিতি (Opening Balance) কখনোই আয় (Income), ব্যয় (Expense) বা অনুদান হিসেবে গণনা হবে না।
                </p>
                <p>
                  • <strong>ভাউচার সুরক্ষিত:</strong> এটি কোনো কাল্পনিক ভাউচার তৈরি করে না এবং বিদ্যমান আয়-ব্যয়ের লেজার বা ভাউচার নম্বরকে বিকৃত করে না।
                </p>
                <p>
                  • <strong>চলমান খতিয়ান (Running Ledger):</strong> নির্বাচিত কার্যকর তারিখ অনুযায়ী দৈনিক লেনদেন বিবরণী ও ক্যাশ/ব্যাংক খতিয়ানে প্রারম্ভিক জের হিসেবে হিসাব শুরু হবে।
                </p>
              </div>
            </div>
          </div>

          {/* Form & Overview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-6 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>প্রারম্ভিক স্থিতি এন্ট্রি / সমন্বয় ফর্ম</span>
              </h4>

              {/* Account Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  হিসাব / অ্যাকাউন্ট নির্বাচন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameBn} [{acc.accountType === 'CASH' ? 'নগদ ক্যাশ' : acc.accountType === 'BANK' ? 'ব্যাংক' : 'MFS/অন্যান্য'}]
                    </option>
                  ))}
                </select>
                {selectedAccount && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <span>বর্তমান খতিয়ান স্থিতি:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      ৳ {(selectedAccount.currentBalance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Amount and Balance Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    প্রারম্ভিক স্থিতি (টাকা) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">৳</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    স্থিতির ধরন (Balance Type)
                  </label>
                  <select
                    value={balanceType}
                    onChange={(e) => setBalanceType(e.target.value as 'DEBIT' | 'CREDIT')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  >
                    <option value="DEBIT">ডেবিট / জমা স্থিতি (Asset / Normal)</option>
                    <option value="CREDIT">ক্রেডিট / দেনা স্থিতি (Overdraft / Liability)</option>
                  </select>
                </div>
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>কার্যকর শুরুর তারিখ (Effective Baseline Date) <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  required
                />
                <span className="text-[10px] text-slate-500 block mt-1 font-baloo">
                  * এই তারিখ বা তার পূর্বে এই পরিমাণ দিয়ে চলমান খতিয়ান (Running Ledger) শুরু হবে।
                </span>
              </div>

              {/* Source / Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  প্রারম্ভিক স্থিতির উৎস / কারণ (Source / Baseline Reason)
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                >
                  {OPENING_BALANCE_SOURCES.map((src) => (
                    <option key={src.id} value={src.id}>
                      {src.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>রেফারেন্স / মেমো বা অডিট নোট (ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="যেমন: ব্যাংক বিবরণী পাতা নং ১২ / রেজুলেশন নং ৪"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-baloo"
                />
              </div>

              {/* Messages */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'প্রারম্ভিক স্থিতি সংরক্ষণ ও প্রয়োগ করুন'}</span>
                </button>
              </div>
            </form>

            {/* Right Column: Account Status Cards & Overview */}
            <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
              {/* Total Aggregate Opening Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    সর্বমোট প্রারম্ভিক স্থিতি (Total Opening Balance)
                  </span>
                  <Scale className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2 font-mono">
                  ৳ {totalOpeningBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between border-t border-slate-700/60 pt-2 font-baloo">
                  <span>মোট অ্যাকাউন্ট/তহবিল: {accounts.length} টি</span>
                  <span>সকল খতিয়ানের প্রাথমিক ভিত্তি</span>
                </div>
              </div>

              {/* Account list with quick switch */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>অ্যাকাউন্টভিত্তিক প্রারম্ভিক স্থিতির তালিকা</span>
                  <span className="text-[10px] text-slate-500 font-normal font-baloo">এক ক্লিকে এডিট করুন</span>
                </h4>

                <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1 flex-1">
                  {accounts.map((acc) => {
                    const isSelected = acc.id === selectedAccountId;
                    const op = acc.openingBalance || 0;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => handleAccountChange(acc.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                              acc.accountType === 'CASH'
                                ? 'bg-amber-100 text-amber-800'
                                : acc.accountType === 'BANK'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {acc.accountType === 'CASH' ? (
                              <Wallet className="w-4 h-4" />
                            ) : acc.accountType === 'BANK' ? (
                              <Landmark className="w-4 h-4" />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {acc.nameBn}
                            </div>
                            <div className="text-[10px] text-slate-500 font-baloo flex items-center space-x-1.5">
                              <span>শুরু: {formatDate(acc.openingBalanceDate || '2026-07-31')}</span>
                              <span>•</span>
                              <span>{acc.openingBalanceType === 'CREDIT' ? 'ক্রেডিট' : 'ডেবিট'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <div className="font-bold text-xs text-slate-900 font-mono">
                            ৳ {op.toLocaleString('en-IN')}
                          </div>
                          <button
                            type="button"
                            className="text-[10px] text-emerald-700 font-bold hover:underline inline-flex items-center space-x-0.5 mt-0.5"
                          >
                            <span>সমন্বয়</span>
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Help */}
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-baloo flex items-start space-x-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>
                  প্রারম্ভিক স্থিতি পরিবর্তনের সাথে সাথে খতিয়ান ও দৈনিক বিবরণীর রানিং ব্যালেন্স স্বয়ংক্রিয়ভাবে নির্ভুলভাবে পুনর্গণনা হবে।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-baloo">
            MasjidLedger • Opening Balance Baseline System
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

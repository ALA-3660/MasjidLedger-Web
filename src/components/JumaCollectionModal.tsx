import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Banknote,
  Users,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  X,
  Plus,
  Coins,
  FileText,
  Clock,
  Sparkles,
  Printer,
  Eye,
  RotateCcw,
} from 'lucide-react';
import {
  Mosque,
  FinancialAccount,
  AccountHead,
  PaymentMethod,
  CashDenominationData,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';

export interface JumaCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  currentMosque?: Mosque | null;
  language?: Language;
  onSaveJumaCollection: (payload: {
    date: string;
    amount: number;
    paymentMethod: PaymentMethod;
    accountId: string;
    donorName: string;
    reference: string;
    description: string;
    countingTeam: string;
    witness: string;
    denominationData?: CashDenominationData;
  }, options?: { print?: boolean; format?: 'POS_80' | 'A4' }) => Promise<void>;
}

// Find nearest past or today's Friday
function getNearestFridayDate(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 5 = Friday
  const diff = day >= 5 ? day - 5 : day + 2; // days since last Friday
  const lastFriday = new Date(today);
  lastFriday.setDate(today.getDate() - diff);
  return lastFriday.toISOString().split('T')[0];
}

export const JumaCollectionModal: React.FC<JumaCollectionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  accountHeads,
  currentMosque,
  language = 'bn',
  onSaveJumaCollection,
}) => {
  const t = translations[language] || translations.bn;

  const [date, setDate] = useState<string>(getNearestFridayDate());
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState<string>('');
  const [jumaType, setJumaType] = useState<string>('সাধারণ জুমা কালেকশন');
  const [countingTeam, setCountingTeam] = useState<string>('ইমাম, মোয়াজ্জিন ও কোষাধ্যক্ষ');
  const [witness, setWitness] = useState<string>('উপস্থিত মুসল্লিবৃন্দ');
  const [description, setDescription] = useState<string>('পবিত্র জুমার জামাত উপলক্ষে মুসল্লিদের সংগৃহীত নগদ অনুদান');
  const [denominationData, setDenominationData] = useState<CashDenominationData | null>(null);

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Default cash account selection
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const defaultCash = accounts.find((a) => a.accountType === 'CASH' || a.type === 'CASH') || accounts[0];
      setAccountId(defaultCash.id);
    }
  }, [accounts, accountId]);

  if (!isOpen) return null;

  const handleApplyDenomination = (total: number, data?: CashDenominationData) => {
    setAmount(total.toString());
    if (data) {
      setDenominationData(data);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, submitMode: 'SAVE_AND_PRINT' | 'SAVE_ONLY' = 'SAVE_AND_PRINT') => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage(language === 'bn' ? 'টাকার পরিমাণ আবশ্যক এবং শূন্যের বেশি হতে হবে।' : 'Amount is required and must be positive.');
      return;
    }

    if (denominationData && denominationData.grandTotal !== numAmount) {
      setErrorMessage(
        language === 'bn'
          ? `ভাংতি গণনা অনুযায়ী মোট টাকা (৳${denominationData.grandTotal.toLocaleString('en-IN')}) এবং ভাউচারের টাকার পরিমাণ (৳${numAmount.toLocaleString('en-IN')}) সমান হতে হবে।`
          : 'Denomination total must match voucher total.'
      );
      return;
    }

    const targetAccount = accounts.find((a) => a.id === accountId) || accounts[0];
    if (!targetAccount) {
      setErrorMessage(language === 'bn' ? 'অনুগ্রহ করে জমা গ্রহণের অ্যাকাউন্ট নির্বাচন করুন।' : 'Please select an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ref = `JUMA-${date.replace(/-/g, '')}-${jumaType.replace(/\s+/g, '')}`;
      await onSaveJumaCollection(
        {
          date,
          amount: numAmount,
          paymentMethod,
          accountId: targetAccount.id,
          donorName: 'পবিত্র জুমার জামাত ও মুসল্লিবৃন্দ',
          reference: ref,
          description: `${jumaType}: ${description}`,
          countingTeam,
          witness,
          denominationData: denominationData || undefined,
        },
        {
          print: submitMode === 'SAVE_AND_PRINT',
          format: 'POS_80',
        }
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[92vh] font-siliguri my-auto">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
                <Banknote className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg flex items-center space-x-2">
                  <span>🕌 জুমার দিনের কালেকশন ও হিসাব</span>
                </h3>
                <p className="text-xs text-emerald-100/90 font-medium">
                  পবিত্র জুমার জামাত কালেকশন, ক্যাশ নোট গণনা ও তাৎক্ষণিক রসিদ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={(e) => handleSubmit(e, 'SAVE_AND_PRINT')} className="p-5 space-y-4 overflow-y-auto flex-1">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Top Badge Info */}
            <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">খাত: <strong>দান ও অনুদান (Donations)</strong> → <strong>পবিত্র জুমার জামাত কালেকশন</strong></span>
              </div>
              <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase font-mono">
                AUTO POSTING
              </span>
            </div>

            {/* Date & Juma Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জুমার তারিখ *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জুমার উপলক্ষ / ধরণ</label>
                <select
                  value={jumaType}
                  onChange={(e) => setJumaType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white outline-hidden"
                >
                  <option value="সাধারণ জুমা কালেকশন">সাধারণ জুমা কালেকশন</option>
                  <option value="রমজান মাসের ১ম জুমা">রমজান মাসের ১ম জুমা</option>
                  <option value="রমজান মাসের ২য় জুমা">রমজান মাসের ২য় জুমা</option>
                  <option value="রমজান মাসের ৩য় জুমা">রমজান মাসের ৩য় জুমা</option>
                  <option value="জুমাতুল বিদা (রমজান)">জুমাতুল বিদা (রমজান)</option>
                  <option value="ঈদের বিশেষ জামাত কালেকশন">ঈদের বিশেষ জামাত কালেকশন</option>
                  <option value="উন্নয়ন ও ছাদ ঢালাই বিশেষ জুমা">উন্নয়ন ও ছাদ ঢালাই বিশেষ জুমা</option>
                </select>
              </div>
            </div>

            {/* Amount and Denomination Trigger */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>মোট সংগৃহীত টাকার পরিমাণ (৳) *</span>
                </label>
                <button
                  type="button"
                  id="btn-open-juma-denomination"
                  onClick={() => setIsCalculatorOpen(true)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>ভাংতি ও ক্যাশ নোট গণনা</span>
                </button>
              </div>

              <input
                id="input-juma-amount"
                type="number"
                min="1"
                step="any"
                placeholder="যেমন: ১৫৭৫০"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-4 py-3 text-lg font-bold font-mono text-emerald-700 bg-white border-2 border-emerald-300 rounded-xl focus:border-emerald-600 outline-hidden shadow-inner"
              />

              {denominationData && (
                <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                  <div>
                    <div className="font-bold flex items-center space-x-1.5 text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>ক্যাশ নোট ও কয়েন বিবরণী সংযুক্ত রয়েছে</span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-800 mt-0.5">
                      মোট নোট: {denominationData.totalNotesCount} টি (৳{denominationData.totalNotesAmount.toLocaleString('en-IN')}) | 
                      কয়েন: {denominationData.totalCoinsCount} টি (৳{denominationData.totalCoinsAmount.toLocaleString('en-IN')}) = 
                      <strong> ৳{denominationData.grandTotal.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setIsCalculatorOpen(true)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      সম্পাদনা
                    </button>
                    <button
                      type="button"
                      onClick={() => setDenominationData(null)}
                      className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="বাতিল করুন"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার হিসাব/অ্যাকাউন্ট *</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white outline-hidden"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameBn} (স্থিতি: {formatCurrency(acc.currentBalance, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white outline-hidden"
                >
                  <option value="CASH">ক্যাশ / নগদ টাকা</option>
                  <option value="BANK">ব্যাংক ডিপোজিট</option>
                  <option value="BKASH">বিকাশ (bKash)</option>
                  <option value="NAGAD">নগদ (Nagad)</option>
                </select>
              </div>
            </div>

            {/* Counting Team & Witness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  টাকা গণনাকারী কমিটি / দায়িত্বশীল
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ইমাম, মোয়াজ্জিন, কোষাধ্যক্ষ"
                  value={countingTeam}
                  onChange={(e) => setCountingTeam(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সাক্ষী / উপস্থিত ব্যক্তিবর্গ
                </label>
                <input
                  type="text"
                  placeholder="যেমন: সাধারণ সম্পাদক ও মুসল্লিবৃন্দ"
                  value={witness}
                  onChange={(e) => setWitness(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>
            </div>

            {/* Remarks / Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য ও বিবরণ</label>
              <textarea
                rows={2}
                placeholder="প্রয়োজনে অতিরিক্ত বিবরণ লিখুন..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, 'SAVE_ONLY')}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'শুধু সংরক্ষণ'}
              </button>
              <button
                id="btn-save-juma-and-print"
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ ও প্রিন্ট (POS)'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Cash Denomination Calculator */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyTotal={handleApplyDenomination}
        initialData={denominationData}
        expectedAmount={Number(amount) || undefined}
        collectionType="JUMA"
        reference={`জুমা কালেকশন (${formatDate(date, language)})`}
        countedByInitial={countingTeam}
        witnessesInitial={witness}
        mosque={currentMosque}
        language={language}
      />
    </>
  );
};

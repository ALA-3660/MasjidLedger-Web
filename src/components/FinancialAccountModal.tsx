import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Smartphone,
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { FinancialAccount } from '../types';

interface FinancialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<FinancialAccount>) => Promise<void>;
  accountToEdit?: FinancialAccount | null;
}

const BANGLADESH_BANKS = [
  'ইসলামী ব্যাংক বাংলাদেশ পিএলসি (IBBL)',
  'আল-আরাফাহ ইসলামী ব্যাংক পিএলসি (AIBL)',
  'সোশ্যাল ইসলামী ব্যাংক পিএলসি (SIBL)',
  'ফার্স্ট সিকিউরিটি ইসলামী ব্যাংক পিএলসি (FSIBL)',
  'শাহজালাল ইসলামী ব্যাংক পিএলসি (SJIBL)',
  'ডাচ-বাংলা ব্যাংক পিএলসি (DBBL)',
  'সোনালী ব্যাংক পিএলসি (Sonali Bank)',
  'জনতা ব্যাংক পিএলসি (Janata Bank)',
  'অগ্রণী ব্যাংক পিএলসি (Agrani Bank)',
  'রূপালী ব্যাংক পিএলসি (Rupali Bank)',
  'পূবালী ব্যাংক পিএলসি (Pubali Bank)',
  'উত্তরা ব্যাংক পিএলসি (Uttara Bank)',
  'ব্র্যাক ব্যাংক পিএলসি (BRAC Bank)',
  'ব্যাংক এশিয়া পিএলসি (Bank Asia)',
  'সিটি ব্যাংক পিএলসি (City Bank)',
  'ইউনাইটেড কমার্শিয়াল ব্যাংক পিএলসি (UCB)',
  'অন্যান্য ব্যাংক (Other)',
];

export const FinancialAccountModal: React.FC<FinancialAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accountToEdit,
}) => {
  const isEditing = !!accountToEdit;

  const [accountType, setAccountType] = useState<'BANK' | 'MFS' | 'CASH' | 'OTHER'>(
    accountToEdit?.accountType || 'BANK'
  );
  const [nameBn, setNameBn] = useState('');
  const [bankName, setBankName] = useState(BANGLADESH_BANKS[0]);
  const [customBankName, setCustomBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankAccountCategory, setBankAccountCategory] = useState<string>('CURRENT');
  const [mfsProvider, setMfsProvider] = useState<string>('BKASH');
  const [mfsAccountCategory, setMfsAccountCategory] = useState<'MERCHANT' | 'PERSONAL'>('MERCHANT');
  const [mobileNumber, setMobileNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingBalanceDate, setOpeningBalanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [openingBalanceType, setOpeningBalanceType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'CLOSED'>('ACTIVE');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (accountToEdit) {
      setAccountType(accountToEdit.accountType || 'BANK');
      setNameBn(accountToEdit.nameBn || accountToEdit.name || '');
      if (accountToEdit.bankName && BANGLADESH_BANKS.includes(accountToEdit.bankName)) {
        setBankName(accountToEdit.bankName);
        setCustomBankName('');
      } else if (accountToEdit.bankName) {
        setBankName('অন্যান্য ব্যাংক (Other)');
        setCustomBankName(accountToEdit.bankName);
      }
      setBranchName(accountToEdit.branchName || '');
      setAccountNumber(accountToEdit.accountNumber || '');
      setRoutingNumber(accountToEdit.routingNumber || '');
      setBankAccountCategory(accountToEdit.bankAccountCategory || 'CURRENT');
      setMfsProvider(accountToEdit.mfsProvider || 'BKASH');
      setMfsAccountCategory(accountToEdit.mfsAccountCategory || 'MERCHANT');
      setMobileNumber(accountToEdit.mobileNumber || accountToEdit.accountNumber || '');
      setContactPerson(accountToEdit.contactPerson || '');
      setOpeningBalance(accountToEdit.openingBalance || 0);
      setOpeningBalanceDate(
        accountToEdit.openingBalanceDate || new Date().toISOString().split('T')[0]
      );
      setOpeningBalanceType(accountToEdit.openingBalanceType || 'DEBIT');
      setNotes(accountToEdit.notes || '');
      setStatus(accountToEdit.status || 'ACTIVE');
    } else {
      setAccountType('BANK');
      setNameBn('');
      setBankName(BANGLADESH_BANKS[0]);
      setCustomBankName('');
      setBranchName('');
      setAccountNumber('');
      setRoutingNumber('');
      setBankAccountCategory('CURRENT');
      setMfsProvider('BKASH');
      setMfsAccountCategory('MERCHANT');
      setMobileNumber('');
      setContactPerson('');
      setOpeningBalance(0);
      setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
      setOpeningBalanceType('DEBIT');
      setNotes('');
      setStatus('ACTIVE');
    }
    setErrorMsg('');
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameBn.trim()) {
      setErrorMsg('অনুগ্রহ করে হিসাবের নাম লিখুন।');
      return;
    }

    const effectiveBankName =
      bankName === 'অন্যান্য ব্যাংক (Other)' ? customBankName.trim() : bankName;

    if (accountType === 'BANK') {
      if (!accountNumber.trim()) {
        setErrorMsg('অনুগ্রহ করে ব্যাংক অ্যাকাউন্ট নম্বর লিখুন।');
        return;
      }
    }

    if (accountType === 'MFS') {
      const num = mobileNumber.trim() || accountNumber.trim();
      if (!num) {
        setErrorMsg('অনুগ্রহ করে এমএফএস মোবাইল নম্বর লিখুন।');
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const payload: Partial<FinancialAccount> = {
        name: nameBn.trim(),
        nameBn: nameBn.trim(),
        accountType,
        bankName: accountType === 'BANK' ? effectiveBankName : undefined,
        branchName: accountType === 'BANK' ? branchName.trim() : undefined,
        accountNumber:
          accountType === 'BANK'
            ? accountNumber.trim()
            : accountType === 'MFS'
            ? mobileNumber.trim() || accountNumber.trim()
            : undefined,
        mfsProvider: accountType === 'MFS' ? mfsProvider : undefined,
        mobileNumber: accountType === 'MFS' ? mobileNumber.trim() : undefined,
        mfsAccountCategory: accountType === 'MFS' ? mfsAccountCategory : undefined,
        bankAccountCategory: accountType === 'BANK' ? (bankAccountCategory as any) : undefined,
        routingNumber: accountType === 'BANK' ? routingNumber.trim() : undefined,
        contactPerson: contactPerson.trim() || undefined,
        openingBalance: Number(openingBalance) || 0,
        openingBalanceDate,
        openingBalanceType,
        status,
        notes: notes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'অ্যাকাউন্ট সংরক্ষণে ত্রুটি দেখা দিয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-siliguri">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              {accountType === 'BANK' && <Building className="w-5 h-5 text-indigo-200" />}
              {accountType === 'MFS' && <Smartphone className="w-5 h-5 text-emerald-200" />}
              {accountType === 'CASH' && <Wallet className="w-5 h-5 text-amber-200" />}
              {accountType === 'OTHER' && <CreditCard className="w-5 h-5 text-purple-200" />}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? 'আর্থিক হিসাব সম্পাদনা' : 'নতুন আর্থিক হিসাব যোগ করুন'}
              </h2>
              <p className="text-xs text-indigo-200">
                {isEditing
                  ? 'হিসাবের বিবরণ ও তথ্য হালনাগাদ করুন'
                  : 'মসজিদের ব্যাংক, এমএফএস বা নগদ ক্যাশ হিসাব তৈরি করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-5">
          {/* Account Type Selector (Only selectable when creating new) */}
          {!isEditing ? (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                হিসাবের ধরন নির্বাচন করুন <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setAccountType('BANK');
                    if (!nameBn) setNameBn('ইসলামী ব্যাংক প্রধান হিসাব');
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                    accountType === 'BANK'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Building className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold">ব্যাংক হিসাব</span>
                  <span className="text-[10px] text-slate-500 text-center">বাণিজ্যিক / ইসলামিক</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountType('MFS');
                    if (!nameBn) setNameBn('অফিসিয়াল বিকাশ মার্চেন্ট');
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                    accountType === 'MFS'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold">মোবাইল ব্যাংকিং</span>
                  <span className="text-[10px] text-slate-500 text-center">বিকাশ / নগদ / রকেট</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountType('CASH');
                    if (!nameBn) setNameBn('মসজিদ প্রধান ক্যাশ ফান্ড');
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                    accountType === 'CASH'
                      ? 'border-amber-600 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Wallet className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold">নগদ ক্যাশ হিসাব</span>
                  <span className="text-[10px] text-slate-500 text-center">হাতে থাকা নগদ অর্থ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountType('OTHER');
                    if (!nameBn) setNameBn('বিশেষ প্রকল্প তহবিল');
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                    accountType === 'OTHER'
                      ? 'border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-bold">অন্যান্য তহবিল</span>
                  <span className="text-[10px] text-slate-500 text-center">রিজার্ভ বা স্থায়ী তহবিল</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">হিসাবের ধরন:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                {accountType === 'BANK' && 'ব্যাংক হিসাব (Commercial / Islamic Bank)'}
                {accountType === 'MFS' && 'মোবাইল ব্যাংকিং হিসাব (MFS)'}
                {accountType === 'CASH' && 'নগদ ক্যাশ হিসাব (Cash Book)'}
                {accountType === 'OTHER' && 'অন্যান্য তহবিল হিসাব'}
              </span>
            </div>
          )}

          {/* Account Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              হিসাবের নাম / শিরোনাম (বাংলায়) <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="উদাঃ ইসলামী ব্যাংক চলতি হিসাব অথবা অফিসিয়াল বিকাশ নম্বর"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500 bg-white shadow-2xs font-semibold"
              required
            />
          </div>

          {/* Dynamic Fields: BANK */}
          {accountType === 'BANK' && (
            <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>ব্যাংকের বিস্তারিত তথ্য</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Bank Name */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ব্যাংকের নাম <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    {BANGLADESH_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {bankName === 'অন্যান্য ব্যাংক (Other)' && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      নির্দিষ্ট ব্যাংকের নাম লিখুন <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ব্যাংকের পুরো নাম..."
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                      required
                    />
                  </div>
                )}

                {/* Account Number */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    হিসাব নম্বর (Account Number) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="২০৫০১১২২৩৩৪৪৫৫"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                    required
                  />
                </div>

                {/* Branch Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">শাখার নাম (Branch)</label>
                  <input
                    type="text"
                    placeholder="উদাঃ মতিঝিল শাখা / ধানমন্ডি শাখা"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>

                {/* Account Category */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">হিসাবের প্রকৃতি</label>
                  <select
                    value={bankAccountCategory}
                    onChange={(e) => setBankAccountCategory(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="CURRENT">চলতি হিসাব (Current Account)</option>
                    <option value="SAVINGS">সঞ্চয়ী হিসাব (Savings Account)</option>
                    <option value="MUDARABA">মুদারাবা সঞ্চয়ী (Mudaraba Savings)</option>
                    <option value="SND">স্পেশাল নোটিশ ডিপোজিট (SND)</option>
                    <option value="OTHER">অন্যান্য (Other)</option>
                  </select>
                </div>

                {/* Routing Number */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    রাউটিং নম্বর (Routing No)
                  </label>
                  <input
                    type="text"
                    placeholder="উদাঃ ১২৫২৭০..."
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Fields: MFS */}
          {accountType === 'MFS' && (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-4">
              <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>মোবাইল ফাইন্যান্সিয়াল সার্ভিস (MFS) তথ্য</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* MFS Provider */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    সেবাদাতা (MFS Provider) <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={mfsProvider}
                    onChange={(e) => setMfsProvider(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                  >
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="ROCKET">রকেট (Rocket - Dutch Bangla)</option>
                    <option value="UPAY">উপায় (Upay - UCB)</option>
                    <option value="OTHER">অন্যান্য (Other MFS)</option>
                  </select>
                </div>

                {/* Category: Merchant vs Personal */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    হিসাবের ক্যাটাগরি <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={mfsAccountCategory}
                    onChange={(e) => setMfsAccountCategory(e.target.value as any)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                  >
                    <option value="MERCHANT">অফিসিয়াল মার্চেন্ট হিসাব (Merchant / QR Payment)</option>
                    <option value="PERSONAL">ব্যক্তিগত হিসাব (Personal Account)</option>
                  </select>
                </div>

                {/* Mobile Number */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    মোবাইল নম্বর (Wallet Number) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="০১৭১১০০০০০০"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-white"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Opening Balance (Only shown or editable initially) */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                প্রারম্ভিক স্থিতি ও কার্যকর তারিখ (Opening Balance)
              </span>
              {isEditing && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                  সম্পাদনা মোড: স্থিতি সমন্বয় খতিয়ানে প্রয়োগ হবে
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  প্রারম্ভিক স্থিতি (৳)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="০.০০"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value))}
                  className="w-full text-sm font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">কার্যকর তারিখ</label>
                <input
                  type="date"
                  value={openingBalanceDate}
                  onChange={(e) => setOpeningBalanceDate(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">স্থিতির ধরন</label>
                <select
                  value={openingBalanceType}
                  onChange={(e) => setOpeningBalanceType(e.target.value as any)}
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                >
                  <option value="DEBIT">ডেবিট / জমা (সাধারণ সম্পদ স্থিতি)</option>
                  <option value="CREDIT">ক্রেডিট (ওভারড্রাফট / ঋণাত্মক)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Person & Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                দায়িত্বপ্রাপ্ত ব্যক্তি / অপারেটর
              </label>
              <input
                type="text"
                placeholder="উদাঃ কোষাধ্যক্ষ / সভাপতি / হিসাবরক্ষক"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">হিসাবের অবস্থা (Status)</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
              >
                <option value="ACTIVE">সক্রিয় (Active)</option>
                <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
                <option value="CLOSED">স্থায়ীভাবে বন্ধ (Closed)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">মন্তব্য বা বিশেষ বিবরণ</label>
              <input
                type="text"
                placeholder="হিসাব সংক্রান্ত যেকোনো জরুরি তথ্য..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'সংরক্ষণ করা হচ্ছে...' : isEditing ? 'হালনাগাদ করুন' : 'হিসাব তৈরি করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

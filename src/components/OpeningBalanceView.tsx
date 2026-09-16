import React, { useState, useMemo } from 'react';
import {
  Scale,
  Calendar,
  Shield,
  Edit3,
  Plus,
  Landmark,
  Wallet,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRightLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import { FinancialAccount, Mosque, AccountOpeningBalancePayload } from '../types';
import { Language, translations, formatDate, formatCurrency } from '../lib/i18n';
import { OpeningBalanceModal } from './OpeningBalanceModal';

interface OpeningBalanceViewProps {
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  language?: Language;
  onUpdateOpeningBalance?: (data: AccountOpeningBalancePayload) => Promise<void>;
  onNavigateToCashBank?: () => void;
}

export const OpeningBalanceView: React.FC<OpeningBalanceViewProps> = ({
  accounts = [],
  currentMosque,
  language = 'bn',
  onUpdateOpeningBalance,
  onNavigateToCashBank,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'management'>('overview');
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [selectedAccountIdForModal, setSelectedAccountIdForModal] = useState<string>(
    accounts[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CASH' | 'BANK' | 'MFS'>('ALL');

  // Calculations for Opening Balance
  const totalDebitOpening = useMemo(() => {
    return accounts
      .filter((a) => (a.openingBalanceType || 'DEBIT') === 'DEBIT')
      .reduce((sum, a) => sum + (a.openingBalance || 0), 0);
  }, [accounts]);

  const totalCreditOpening = useMemo(() => {
    return accounts
      .filter((a) => a.openingBalanceType === 'CREDIT')
      .reduce((sum, a) => sum + (a.openingBalance || 0), 0);
  }, [accounts]);

  const netOpeningBalance = useMemo(() => {
    return totalDebitOpening - totalCreditOpening;
  }, [totalDebitOpening, totalCreditOpening]);

  const totalCurrentBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (typeFilter !== 'ALL' && acc.accountType !== typeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = acc.nameBn.toLowerCase().includes(q);
        const matchBank = (acc.bankName || '').toLowerCase().includes(q);
        const matchNum = (acc.accountNumber || '').toLowerCase().includes(q);
        return matchName || matchBank || matchNum;
      }
      return true;
    });
  }, [accounts, typeFilter, searchTerm]);

  const handleOpenModal = (accountId?: string) => {
    setSelectedAccountIdForModal(accountId || accounts[0]?.id || '');
    setIsOpeningBalanceModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-siliguri">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl border border-amber-200">
              <Scale className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                প্রারম্ভিক স্থিতি (Opening Balance)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                বিভিন্ন ব্যাংক ও ক্যাশ হিসাবের প্রারম্ভিক জের এবং খতিয়ান সমন্বয় ব্যবস্থাপনা
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {onNavigateToCashBank && (
            <button
              onClick={onNavigateToCashBank}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              <ArrowRightLeft className="w-4 h-4 text-slate-500" />
              <span>ব্যাংক ও ক্যাশ হিসাব দেখুন</span>
            </button>
          )}

          <button
            id="btn-open-add-opening-balance"
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ প্রারম্ভিক স্থিতি এন্ট্রি / সমন্বয়</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              মোট প্রারম্ভিক ডেবিট স্থিতি
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl font-bold font-mono text-emerald-800">
            ৳ {totalDebitOpening.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            হিসাব চালুর সময় রক্ষিত প্রারম্ভিক তহবিল
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              প্রারম্ভিক ক্রেডিট / দায়
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl font-bold font-mono text-rose-800">
            ৳ {totalCreditOpening.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            ওভারড্রাফট বা ঋণাত্মক প্রারম্ভিক দায়
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/40 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              নিট প্রারম্ভিক তহবিল
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl font-bold font-mono text-amber-950">
            ৳ {netOpeningBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-amber-700 mt-1 block">
            খতিয়ানের ভিত্তি হিসেবে গণনাকৃত জের
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              বর্তমান মোট রানিং ব্যালেন্স
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl font-bold font-mono text-blue-900">
            ৳ {totalCurrentBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            মোট {accounts.length}টি অ্যাকাউন্টে চলমান ব্যালেন্স
          </span>
        </div>
      </div>

      {/* Accounting Integrity Rule Notice */}
      <div className="bg-amber-50/90 border-l-4 border-amber-500 p-4 rounded-r-2xl text-xs text-amber-950 space-y-1.5 shadow-xs">
        <p className="font-bold flex items-center space-x-1.5 text-amber-950 text-[13px]">
          <Shield className="w-4 h-4 text-amber-700 shrink-0" />
          <span>অ্যাকাউন্টিং নীতিমালা ও ডেটা অখণ্ডতা সুরক্ষা:</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px] text-amber-900 leading-relaxed">
          <div>
            <strong>১. নিয়মিত আয় বা অনুদান নয়:</strong> প্রারম্ভিক স্থিতি কখনো সাধারণ দান বা আয় হিসেবে কাউন্ট হয় না, ফলে আয় বিবরণী বা ভাউচার লিস্টে কোনো কৃত্রিম ডুপ্লিকেট ডাটা তৈরি হয় না।
          </div>
          <div>
            <strong>২. চলমান খতিয়ান জের:</strong> দৈনিক লেনদেন বিবরণী (Daily Statement), ক্যাশ বই (Cashbook) ও ব্যাংক বইতে এই প্রারম্ভিক স্থিতির উপর ভিত্তি করে রানিং ব্যালেন্স হিসাব করা হয়।
          </div>
        </div>
      </div>

      {/* Sub-Navigation & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            প্রারম্ভিক স্থিতি তালিকা
          </button>
          <button
            onClick={() => setActiveSubTab('management')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'management'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            স্থিতি ব্যবস্থাপনা সহায়িকা
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">সকল হিসাব ধরন</option>
            <option value="CASH">শুধু নগদ ক্যাশ</option>
            <option value="BANK">ব্যাংক একাউন্ট</option>
            <option value="MFS">MFS / মোবাইল ব্যাংকিং</option>
          </select>

          <input
            type="text"
            placeholder="অ্যাকাউন্ট খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-amber-500 w-44 sm:w-56"
          />
        </div>
      </div>

      {/* Main Table / View */}
      {activeSubTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm">
              অ্যাকাউন্টভিত্তিক প্রারম্ভিক স্থিতি ও চলমান ব্যালেন্স
            </span>
            <span className="text-xs text-slate-500 font-mono">
              মোট হিসাব: {filteredAccounts.length} টি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">অ্যাকাউন্ট / ফান্ডের নাম</th>
                  <th className="px-4 py-3.5">হিসাবের ধরন</th>
                  <th className="px-4 py-3.5">কার্যকর তারিখ</th>
                  <th className="px-4 py-3.5">উৎস / কারণ</th>
                  <th className="px-4 py-3.5 text-right">প্রারম্ভিক স্থিতি (টাকা)</th>
                  <th className="px-4 py-3.5 text-right">বর্তমান রানিং স্থিতি</th>
                  <th className="px-4 py-3.5 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-baloo">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-siliguri">
                      কোনো অ্যাকাউন্ট তথ্য পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-siliguri font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          {acc.accountType === 'CASH' ? (
                            <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : acc.accountType === 'BANK' ? (
                            <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                          )}
                          <div>
                            <span>{acc.nameBn}</span>
                            {acc.bankName && (
                              <span className="block text-[11px] text-slate-500 font-normal font-baloo">
                                {acc.bankName} {acc.accountNumber && `• ${acc.accountNumber}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            acc.accountType === 'CASH'
                              ? 'bg-amber-100 text-amber-800'
                              : acc.accountType === 'BANK'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {acc.accountType === 'CASH'
                            ? 'নগদ ক্যাশ'
                            : acc.accountType === 'BANK'
                            ? 'ব্যাংক হিসাব'
                            : 'MFS/অন্যান্য'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {formatDate(acc.openingBalanceDate || '2026-07-31')}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-siliguri">
                        {acc.openingBalanceSource === 'PREVIOUS_COMMITTEE_HANDOVER'
                          ? 'পূর্ববর্তী কমিটির তহবিল হস্তান্তর'
                          : acc.openingBalanceSource === 'ANNUAL_CLOSING_BROUGHT_FORWARD'
                          ? 'পূর্ববর্তী অর্থবছরের সমাপনী জের'
                          : acc.openingBalanceSource === 'BANK_STATEMENT_BASELINE'
                          ? 'ব্যাংক হিসাব স্টেটমেন্ট প্রারম্ভিক জের'
                          : acc.openingBalanceSource === 'AUDIT_ADJUSTMENT'
                          ? 'অডিট সমন্বয়'
                          : 'সফটওয়্যার প্রাথমিক সেটআপ'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        ৳ {(acc.openingBalance || 0).toLocaleString('en-IN')}
                        <span className="text-[10px] text-slate-400 block font-siliguri">
                          {acc.openingBalanceType === 'CREDIT' ? '(ক্রেডিট / ঋণ)' : '(ডেবিট / জমা)'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                        ৳ {(acc.currentBalance || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleOpenModal(acc.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 hover:border-emerald-300 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>সমন্বয়</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                <tr>
                  <td colSpan={4} className="px-4 py-3.5 text-slate-800 font-siliguri">
                    সর্বমোট প্রারম্ভিক ও বর্তমান তহবিলের স্থিতি:
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-900 font-black">
                    ৳{' '}
                    {filteredAccounts
                      .reduce((sum, a) => {
                        const bal = a.openingBalance || 0;
                        return a.openingBalanceType === 'CREDIT' ? sum - bal : sum + bal;
                      }, 0)
                      .toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-800 font-black text-sm">
                    ৳{' '}
                    {filteredAccounts
                      .reduce((sum, a) => sum + (a.currentBalance || 0), 0)
                      .toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Management / Guide Tab */}
      {activeSubTab === 'management' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              প্রারম্ভিক স্থিতি ব্যবস্থাপনা ও অডিট গাইডলাইন
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              সফটওয়্যার চালুর সময় বা কমিটি হস্তান্তরের সময় প্রারম্ভিক ব্যালেন্স সঠিকভাবে লিপিবদ্ধ করার নিয়মাবলী
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>১. পূর্ববর্তী কমিটি হস্তান্তর</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                নতুন কার্যনির্বাহী পরিষদ দায়িত্ব গ্রহণের সময় পূর্ববর্তী কমিটির হস্তান্তরকৃত ব্যাংক ও নগদ টাকার জের সঠিকভাবে নির্দিষ্ট করে এন্ট্রি দিন।
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center space-x-2 text-blue-700 font-bold text-xs">
                <Landmark className="w-4 h-4" />
                <span>২. ব্যাংক স্টেটমেন্ট বেসলাইন</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ব্যাংক একাউন্টগুলোর ক্ষেত্রে সফটওয়্যার চালুর পূর্ববর্তী দিনের অফিশিয়াল ব্যাংক স্টেটমেন্টের সমাপনী জেরকে প্রারম্ভিক স্থিতি হিসেবে নির্ধারণ করুন।
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center space-x-2 text-purple-700 font-bold text-xs">
                <Shield className="w-4 h-4" />
                <span>৩. অডিট সমন্বয়</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                কোনো কারণে প্রারম্ভিক স্থিতিতে অসঙ্গতি দেখা দিলে অডিট নোট ও কারণ উল্লেখপূর্বক নিরাপদে সমন্বয় করা যাবে।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Opening Balance Modal Component */}
      {isOpeningBalanceModalOpen && onUpdateOpeningBalance && (
        <OpeningBalanceModal
          isOpen={isOpeningBalanceModalOpen}
          onClose={() => setIsOpeningBalanceModalOpen(false)}
          accounts={accounts}
          onUpdateOpeningBalance={onUpdateOpeningBalance}
          preselectedAccountId={selectedAccountIdForModal}
        />
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
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
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { FinancialAccount, Mosque, AccountOpeningBalancePayload } from '../types';
import { Language, translations, formatDate, formatCurrency } from '../lib/i18n';
import { OpeningBalanceModal } from './OpeningBalanceModal';
import { FinancialSecondarySidebar, SecondarySidebarItem } from './FinancialSecondarySidebar';
import { ReportPrintDocument } from './ReportPrintDocument';

interface OpeningBalanceViewProps {
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  language?: Language;
  onUpdateOpeningBalance?: (data: AccountOpeningBalancePayload) => Promise<void>;
  onNavigateToCashBank?: () => void;
  hideInternalSidebar?: boolean;
  forcedSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const OpeningBalanceView: React.FC<OpeningBalanceViewProps> = ({
  accounts = [],
  currentMosque,
  language = 'bn',
  onUpdateOpeningBalance,
  onNavigateToCashBank,
  hideInternalSidebar = false,
  forcedSubTab,
  onSubTabChange,
}) => {
  const [activeSubItem, setActiveSubItem] = useState<string>(forcedSubTab || 'OPENING_OVERVIEW');

  useEffect(() => {
    if (forcedSubTab) {
      if (forcedSubTab === 'NEW_ENTRY') {
        handleOpenModal();
      } else {
        setActiveSubItem(forcedSubTab);
      }
    }
  }, [forcedSubTab]);

  const handleSelectSubTab = (id: string) => {
    if (id === 'NEW_ENTRY') {
      handleOpenModal();
    } else {
      setActiveSubItem(id);
      if (onSubTabChange) {
        onSubTabChange(id);
      }
    }
  };
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [selectedAccountIdForModal, setSelectedAccountIdForModal] = useState<string>(
    accounts[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CASH' | 'BANK' | 'MFS'>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  // Secondary Sidebar Items (Level 3 - Section 9)
  const sidebarItems: SecondarySidebarItem[] = [
    { id: 'OPENING_OVERVIEW', label: '📋 প্রারম্ভিক স্থিতি', icon: Scale },
    { id: 'NEW_ENTRY', label: '➕ নতুন প্রারম্ভিক স্থিতি', icon: Plus, isAction: true },
    { id: 'ACCOUNTS_LIST', label: '🏦 অ্যাকাউন্টভিত্তিক স্থিতি', icon: Landmark, badge: accounts.length },
    { id: 'ADJUSTMENT_HISTORY', label: '🔄 সমন্বয় ও গাইডলাইন', icon: CheckCircle2 },
    { id: 'SEARCH', label: '🔎 অনুসন্ধান', icon: Search },
    { id: 'SUMMARY', label: '📊 সারাংশ', icon: Filter },
    { id: 'REPORTS', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
  ];

  return (
    <div className="space-y-4 font-siliguri">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                📊 হিসাব ও লেনদেন / ২য় সাব-মডিউল
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1 flex items-center space-x-2">
              <Scale className="w-5 h-5 text-amber-600" />
              <span>প্রারম্ভিক স্থিতি (Opening Balance Baseline)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ক্যাশ, ব্যাংক ও অন্যান্য ফান্ডের হিসাব শুরুর প্রারম্ভিক জের ও বেসলাইন সমন্বয়
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / PDF</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ প্রারম্ভিক স্থিতি এন্ট্রি</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Secondary Layout */}
      <div className={hideInternalSidebar ? 'w-full' : 'flex flex-col lg:flex-row gap-5 items-start'}>
        {/* Secondary Sidebar (Level 3) */}
        {!hideInternalSidebar && (
          <FinancialSecondarySidebar
            subModuleName="প্রারম্ভিক স্থিতি"
            subModuleIcon={Scale}
            items={sidebarItems}
            activeItemId={activeSubItem}
            onSelectItem={handleSelectSubTab}
            quickStat={{
              label: 'নিট প্রারম্ভিক তহবিল',
              value: `৳ ${netOpeningBalance.toLocaleString('en-IN')}`,
            }}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 w-full space-y-4">
          {/* Explicit Accounting Rule Notice */}
          <div className="bg-amber-50/90 border-l-4 border-amber-500 p-3.5 rounded-r-xl text-xs text-amber-950 space-y-1 shadow-2xs">
            <p className="font-bold flex items-center space-x-1.5 text-amber-950 text-xs">
              <Shield className="w-4 h-4 text-amber-700 shrink-0" />
              <span>অ্যাকাউন্টিং নীতি ও স্পষ্ট সতর্কবার্তা:</span>
            </p>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <strong>প্রারম্ভিক স্থিতি কোনো আয় বা ব্যয় নয়, এটি হিসাব শুরুর স্থিতি।</strong> এটি কোনো সাধারণ দান বা ভাউচার লিস্টে ডুপ্লিকেট হিসেবে গণ্য হয় না। এটি দৈনিক লেনদেন বিবরণী, ক্যাশ বুক ও ব্যাংক বইয়ের মূল সূচনাবিন্দু হিসেবে কাজ করে।
            </p>
          </div>

          {/* 1. Main Overview View */}
          {(activeSubItem === 'OPENING_OVERVIEW' || activeSubItem === 'ACCOUNTS_LIST') && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    মোট প্রারম্ভিক জমা (ডেবিট)
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-800 mt-1">
                    ৳ {totalDebitOpening.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">হিসাব শুরুর রক্ষিত তহবিল</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    প্রারম্ভিক ক্রেডিট / দায়
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-rose-800 mt-1">
                    ৳ {totalCreditOpening.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">ওভারড্রাফট বা ঋণাত্মক দায়</span>
                </div>

                <div className="bg-white border border-amber-200 bg-amber-50/40 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                    নিট প্রারম্ভিক তহবিল
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-amber-950 mt-1">
                    ৳ {netOpeningBalance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-amber-700 block mt-0.5">খতিয়ান গণনার ভিত্তি জের</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    বর্তমান মোট রানিং ব্যালেন্স
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-blue-900 mt-1">
                    ৳ {totalCurrentBalance.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    মোট {accounts.length} টি অ্যাকাউন্টের স্থিতি
                  </span>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700 outline-none focus:border-amber-500"
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
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:border-amber-500 w-44 sm:w-56"
                  />
                </div>

                <span className="text-xs text-slate-500">
                  মোট তালিকাভুক্ত হিসাব: <span className="font-bold text-slate-800">{filteredAccounts.length}</span> টি
                </span>
              </div>

              {/* Opening Balance Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">অ্যাকাউন্ট / ফান্ডের নাম</th>
                        <th className="px-4 py-3">হিসাবের ধরন</th>
                        <th className="px-4 py-3">কার্যকর তারিখ</th>
                        <th className="px-4 py-3">উৎস / কারণ</th>
                        <th className="px-4 py-3 text-right">প্রারম্ভিক স্থিতি (৳)</th>
                        <th className="px-4 py-3 text-right">বর্তমান রানিং স্থিতি</th>
                        <th className="px-4 py-3 text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                            কোনো অ্যাকাউন্ট তথ্য পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        filteredAccounts.map((acc) => (
                          <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              <div className="flex items-center space-x-2">
                                {acc.accountType === 'CASH' ? (
                                  <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : acc.accountType === 'BANK' ? (
                                  <Landmark className="w-4 h-4 text-blue-600 shrink-0" />
                                ) : (
                                  <Smartphone className="w-4 h-4 text-purple-600 shrink-0" />
                                )}
                                <div>
                                  <span>{acc.nameBn}</span>
                                  {acc.bankName && (
                                    <span className="block text-[10px] text-slate-500 font-normal">
                                      {acc.bankName} {acc.accountNumber && `• ${acc.accountNumber}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  acc.accountType === 'CASH'
                                    ? 'bg-emerald-100 text-emerald-800'
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
                            <td className="px-4 py-3 font-mono text-slate-700">
                              {formatDate(acc.openingBalanceDate || '2026-07-31')}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {acc.openingBalanceSource === 'PREVIOUS_COMMITTEE_HANDOVER'
                                ? 'পূর্ববর্তী কমিটির তহবিল হস্তান্তর'
                                : acc.openingBalanceSource === 'ANNUAL_CLOSING_BROUGHT_FORWARD'
                                ? 'পূর্ববর্তী অর্থবছরের সমাপনী জের'
                                : acc.openingBalanceSource === 'BANK_STATEMENT_BASELINE'
                                ? 'ব্যাংক স্টেটমেন্ট প্রারম্ভিক জের'
                                : acc.openingBalanceSource === 'AUDIT_ADJUSTMENT'
                                ? 'অডিট সমন্বয়'
                                : 'সফটওয়্যার প্রাথমিক সেটআপ'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              ৳ {(acc.openingBalance || 0).toLocaleString('en-IN')}
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {acc.openingBalanceType === 'CREDIT' ? '(ক্রেডিট / ঋণ)' : '(ডেবিট / জমা)'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 text-sm">
                              ৳ {(acc.currentBalance || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-center">
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
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-slate-800">
                          সর্বমোট প্রারম্ভিক ও বর্তমান তহবিলের স্থিতি:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900 font-black">
                          ৳{' '}
                          {filteredAccounts
                            .reduce((sum, a) => {
                              const bal = a.openingBalance || 0;
                              return a.openingBalanceType === 'CREDIT' ? sum - bal : sum + bal;
                            }, 0)
                            .toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-800 font-black text-sm">
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
            </>
          )}

          {/* 2. Adjustment Guidelines */}
          {activeSubItem === 'ADJUSTMENT_HISTORY' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                প্রারম্ভিক স্থিতি ব্যবস্থাপনা ও অডিট গাইডলাইন
              </h3>
              <p className="text-xs text-slate-500">
                সফটওয়্যার চালুর সময় বা কমিটি হস্তান্তরের সময় প্রারম্ভিক ব্যালেন্স সঠিকভাবে লিপিবদ্ধ করার অ্যাকাউন্টিং নীতিমালা
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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

          {/* 3. Search */}
          {activeSubItem === 'SEARCH' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span>প্রারম্ভিক অ্যাকাউন্ট অনুসন্ধান</span>
              </h2>

              <input
                type="text"
                placeholder="অ্যাকাউন্ট নাম, ব্যাংক নাম বা একাউন্ট নম্বর..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-amber-500"
              />

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">হিসাবের নাম</th>
                      <th className="p-2.5">ধরন</th>
                      <th className="p-2.5 text-right">প্রারম্ভিক ব্যালেন্স (৳)</th>
                      <th className="p-2.5 text-right">বর্তমান ব্যালেন্স (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAccounts.map((acc) => (
                      <tr key={acc.id}>
                        <td className="p-2.5 font-bold text-slate-900">{acc.nameBn}</td>
                        <td className="p-2.5">{acc.accountType}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          ৳ {(acc.openingBalance || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          ৳ {(acc.currentBalance || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Summary */}
          {activeSubItem === 'SUMMARY' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                <span>প্রারম্ভিক স্থিতি সারসংক্ষেপ</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 block">মোট প্রারম্ভিক সম্পদ (ডেবিট)</span>
                  <span className="text-lg font-black font-mono text-emerald-900 block mt-1">
                    ৳ {totalDebitOpening.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-xs font-bold text-rose-700 block">মোট প্রারম্ভিক দায় (ক্রেডিট)</span>
                  <span className="text-lg font-black font-mono text-rose-900 block mt-1">
                    ৳ {totalCreditOpening.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-xs font-bold text-amber-800 block">নিট উদ্বৃত্ত</span>
                  <span className="text-lg font-black font-mono text-amber-950 block mt-1">
                    ৳ {netOpeningBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 5. Reports & Export */}
          {activeSubItem === 'REPORTS' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <span>প্রারম্ভিক স্থিতি রিপোর্ট ও এক্সপোর্ট</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors flex flex-col justify-between space-y-2 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">প্রিন্ট / PDF ভিউ</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      মসজিদের প্যাড সহ প্রারম্ভিক স্থিতির অফিশিয়াল রিপোর্ট
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* Print Modal */}
      {isPrintModalOpen && (
        <ReportPrintDocument
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          currentMosque={currentMosque}
          reportTitle="প্রারম্ভিক স্থিতি বিবরণী (Opening Balance Statement)"
          periodLabel="হিসাব সূচনাকালীন বেসলাইন"
          columns={[
            { header: 'হিসাব / ফান্ড', accessor: (a) => a.nameBn },
            { header: 'ধরন', accessor: (a) => a.accountType },
            { header: 'ব্যাংক / বিবরণ', accessor: (a) => a.bankName || a.accountNumber || '-' },
            { header: 'উৎস / কারণ', accessor: (a) => a.openingBalanceSource || 'সফটওয়্যার সেটআপ' },
            { header: 'প্রারম্ভিক স্থিতি (৳)', accessor: (a) => `৳ ${(a.openingBalance || 0).toLocaleString('en-IN')}` },
            { header: 'বর্তমান ব্যালেন্স (৳)', accessor: (a) => `৳ ${(a.currentBalance || 0).toLocaleString('en-IN')}` },
          ]}
          data={accounts}
          summaryRows={[
            { label: 'মোট প্রারম্ভিক ডেবিট স্থিতি', value: `৳ ${totalDebitOpening.toLocaleString('en-IN')}` },
            { label: 'মোট প্রারম্ভিক ক্রেডিট দায়', value: `৳ ${totalCreditOpening.toLocaleString('en-IN')}` },
            { label: 'নিট প্রারম্ভিক উদ্বৃত্ত', value: `৳ ${netOpeningBalance.toLocaleString('en-IN')}` },
          ]}
        />
      )}
    </div>
  );
};

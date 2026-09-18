import React, { useState } from 'react';
import {
  Coins,
  Plus,
  Calendar,
  DollarSign,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  CreditCard,
  Building
} from 'lucide-react';
import { Staff, StaffAdvanceRecord, FinancialAccount } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';

interface StaffAdvanceLoanSectionProps {
  staffList: Staff[];
  accounts: FinancialAccount[];
  onOpenAdvanceModal: (staffId?: string) => void;
  language: Language;
}

export const StaffAdvanceLoanSection: React.FC<StaffAdvanceLoanSectionProps> = ({
  staffList = [],
  accounts = [],
  onOpenAdvanceModal,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'FULLY_ADJUSTED'>('ACTIVE');

  // Collect all advances
  const allAdvances: (StaffAdvanceRecord & { staff?: Staff })[] = [];
  staffList.forEach((s) => {
    (s.advanceRecords || []).forEach((adv) => {
      allAdvances.push({
        ...adv,
        staff: s,
        staffName: adv.staffName || s.fullNameBn || s.name,
        designationBn: adv.designationBn || s.designationBn,
      });
    });
  });

  allAdvances.sort((a, b) => new Date(b.advanceDate).getTime() - new Date(a.advanceDate).getTime());

  const filteredAdvances = allAdvances.filter((adv) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && adv.status === 'ACTIVE') ||
      (statusFilter === 'FULLY_ADJUSTED' && adv.status === 'FULLY_ADJUSTED');

    const matchesSearch =
      searchQuery.trim() === '' ||
      adv.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adv.reason.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalAdvanced = allAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalAdjusted = allAdvances.reduce((sum, a) => sum + (a.adjustedAmount || 0), 0);
  const totalOutstanding = allAdvances.filter((a) => a.status === 'ACTIVE').reduce((sum, a) => sum + (a.outstandingAmount || 0), 0);

  const handlePrint = () => {
    printElement('printable-advance-loan-register', {
      title: 'অগ্রিম_ও_ঋণ_রেজিস্টার',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Coins className="w-5 h-5 text-indigo-600" />
            <span>কর্মী বেতন অগ্রিম ও ঋণ রেজিস্টার</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            কর্মীদের আপদকালীন অগ্রিম প্রদান, অবশিষ্ট পাওনা এবং মাসিক বেতন থেকে সমন্বয় ট্র্যাকিং
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAdvanceModal()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন অগ্রিম প্রদান</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">মোট অগ্রিম প্রদান</span>
          <div className="text-lg font-bold text-slate-900 font-siliguri mt-0.5">{formatCurrency(totalAdvanced, language)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">মোট সমন্বিত (আদায়)</span>
          <div className="text-lg font-bold text-emerald-700 font-siliguri mt-0.5">{formatCurrency(totalAdjusted, language)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase">অবশিষ্ট বকেয়া পাওনা</span>
          <div className="text-lg font-bold text-purple-700 font-siliguri mt-0.5">{formatCurrency(totalOutstanding, language)}</div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কর্মী বা কারণ খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ACTIVE' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              বকেয়া আছে
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল অগ্রিম
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('FULLY_ADJUSTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'FULLY_ADJUSTED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সম্পূর্ণ সমন্বয়কৃত
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">কর্মী ও পদবী</th>
                <th className="p-3">অগ্রিম তারিখ</th>
                <th className="p-3 font-mono">অগ্রিমের পরিমাণ</th>
                <th className="p-3 font-mono">সমন্বিত টাকা</th>
                <th className="p-3 font-mono font-bold">অবশিষ্ট পাওনা</th>
                <th className="p-3">কারণ ও বিবরণ</th>
                <th className="p-3">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    কোনো অগ্রিম রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block font-siliguri">{adv.staffName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{adv.designationBn}</span>
                    </td>
                    <td className="p-3 text-slate-600">{formatDate(adv.advanceDate, language)}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{formatCurrency(adv.amount, language)}</td>
                    <td className="p-3 font-mono text-emerald-600">-{formatCurrency(adv.adjustedAmount || 0, language)}</td>
                    <td className="p-3 font-mono font-bold text-purple-700">{formatCurrency(adv.outstandingAmount, language)}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{adv.reason}</td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          adv.status === 'FULLY_ADJUSTED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {adv.status === 'FULLY_ADJUSTED' ? 'সমন্বয় সম্পন্ন' : 'বকেয়া আছে'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Printable */}
      <div id="printable-advance-loan-register" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
          <h1 className="text-2xl font-bold font-siliguri">মসজিদলেজার — কর্মকর্তা ও কর্মচারী অগ্রিম ও ঋণ রেজিস্টার</h1>
        </div>

        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="p-2 border border-slate-300">ক্রমিক</th>
              <th className="p-2 border border-slate-300">নাম ও পদবী</th>
              <th className="p-2 border border-slate-300">তারিখ</th>
              <th className="p-2 border border-slate-300">অগ্রিম টাকা</th>
              <th className="p-2 border border-slate-300">সমন্বয়কৃত</th>
              <th className="p-2 border border-slate-300">অবশিষ্ট পাওনা</th>
              <th className="p-2 border border-slate-300 text-center">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdvances.map((adv, idx) => (
              <tr key={adv.id} className="border-b border-slate-200">
                <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-2 border border-slate-300 font-bold font-siliguri">{adv.staffName} ({adv.designationBn})</td>
                <td className="p-2 border border-slate-300">{formatDate(adv.advanceDate, language)}</td>
                <td className="p-2 border border-slate-300">{formatCurrency(adv.amount, language)}</td>
                <td className="p-2 border border-slate-300">{formatCurrency(adv.adjustedAmount || 0, language)}</td>
                <td className="p-2 border border-slate-300 font-bold">{formatCurrency(adv.outstandingAmount, language)}</td>
                <td className="p-2 border border-slate-300 text-center">{adv.status === 'FULLY_ADJUSTED' ? 'সমন্বয় সম্পন্ন' : 'বকেয়া'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

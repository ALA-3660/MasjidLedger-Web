import React, { useState } from 'react';
import {
  Gift,
  Plus,
  Calendar,
  DollarSign,
  Printer,
  Download,
  CheckCircle2,
  Users,
  Search,
  Receipt
} from 'lucide-react';
import { Staff, StaffPayment, FinancialAccount } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';

interface StaffFestivalAllowanceSectionProps {
  staffList: Staff[];
  staffPayments: StaffPayment[];
  accounts: FinancialAccount[];
  onOpenFestivalModal: () => void;
  language: Language;
}

export const StaffFestivalAllowanceSection: React.FC<StaffFestivalAllowanceSectionProps> = ({
  staffList = [],
  staffPayments = [],
  accounts = [],
  onOpenFestivalModal,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const [searchQuery, setSearchQuery] = useState('');

  // Filter festival payments
  const festivalPayments = staffPayments.filter(
    (p) =>
      p.paymentType === 'FESTIVAL_ALLOWANCE' ||
      p.paymentType === 'BONUS' ||
      (p.festivalName && p.festivalName.trim() !== '') ||
      (p.notes && (p.notes.includes('ঈদ') || p.notes.includes('বোনাস') || p.notes.includes('উৎসব')))
  );

  const filteredPayments = festivalPayments.filter(
    (p) =>
      searchQuery.trim() === '' ||
      p.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.festivalName && p.festivalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.designationBn && p.designationBn.includes(searchQuery))
  );

  const totalDisbursed = festivalPayments.reduce((sum, p) => sum + (p.bonus || p.netPayable || 0), 0);

  const handlePrint = () => {
    printElement('printable-festival-allowance-register', {
      title: 'উৎসব_ভাতা_রেজিস্টার',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Gift className="w-5 h-5 text-indigo-600" />
            <span>ঈদ ও উৎসব ভাতা ব্যবস্থাপনা</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ঈদুল ফিতর, ঈদুল আজহা ও বিশেষ উৎসব ভাতা প্রদান ও তালিকা সংরক্ষণ
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
            onClick={onOpenFestivalModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>উৎসব ভাতা প্রদান</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase">মোট উৎসব ভাতা প্রদান</span>
            <div className="text-xl font-bold text-indigo-950 font-siliguri mt-0.5">
              {formatCurrency(totalDisbursed, language)}
            </div>
          </div>
          <Gift className="w-8 h-8 text-indigo-300" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase">মোট সুবিধাভোগী এন্ট্রি</span>
            <div className="text-xl font-bold text-emerald-950 font-siliguri mt-0.5">
              {festivalPayments.length} টি
            </div>
          </div>
          <Users className="w-8 h-8 text-emerald-300" />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কর্মী বা উৎসবের নাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">কর্মী ও পদবী</th>
                <th className="p-3">উৎসবের নাম</th>
                <th className="p-3">পরিশোধ তারিখ</th>
                <th className="p-3 font-mono">ভাতার পরিমাণ</th>
                <th className="p-3">ভাউচার নম্বর</th>
                <th className="p-3">মন্তব্য</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    কোনো উৎসব ভাতার রেকর্ড মেলেনি।
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block font-siliguri">{p.staffName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{p.designationBn}</span>
                    </td>
                    <td className="p-3 font-bold text-indigo-900">{p.festivalName || 'ঈদুল ফিতর'}</td>
                    <td className="p-3 text-slate-600">{formatDate(p.paymentDate, language)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">
                      {formatCurrency(p.bonus || p.netPayable, language)}
                    </td>
                    <td className="p-3 font-mono text-slate-500">{p.voucherNumber || '-'}</td>
                    <td className="p-3 text-slate-500">{p.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden printable */}
      <div id="printable-festival-allowance-register" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
          <h1 className="text-2xl font-bold font-siliguri">মসজিদলেজার — কর্মকর্তা ও কর্মচারী উৎসব ভাতা রেজিস্টার</h1>
        </div>

        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="p-2 border border-slate-300">ক্রমিক</th>
              <th className="p-2 border border-slate-300">নাম ও পদবী</th>
              <th className="p-2 border border-slate-300">উৎসবের নাম</th>
              <th className="p-2 border border-slate-300">তারিখ</th>
              <th className="p-2 border border-slate-300">টাকার পরিমাণ</th>
              <th className="p-2 border border-slate-300 text-right">স্বাক্ষর</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((p, idx) => (
              <tr key={p.id} className="border-b border-slate-200">
                <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-2 border border-slate-300 font-bold font-siliguri">
                  {p.staffName} ({p.designationBn})
                </td>
                <td className="p-2 border border-slate-300">{p.festivalName || 'ঈদ বোনাস'}</td>
                <td className="p-2 border border-slate-300">{formatDate(p.paymentDate, language)}</td>
                <td className="p-2 border border-slate-300 font-bold">{formatCurrency(p.bonus || p.netPayable, language)}</td>
                <td className="p-2 border border-slate-300"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

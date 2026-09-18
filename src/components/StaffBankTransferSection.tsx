import React, { useState, useMemo } from 'react';
import {
  Building,
  CreditCard,
  Calendar,
  CheckCircle2,
  Printer,
  Download,
  Search,
  Filter,
  Users,
  ShieldCheck,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Staff, StaffPayment, FinancialAccount, Mosque } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';

interface StaffBankTransferSectionProps {
  staffList: Staff[];
  staffPayments: StaffPayment[];
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  onOpenPayModal: (staffId: string) => void;
  onNavigateToLetter?: () => void;
  language: Language;
}

export const StaffBankTransferSection: React.FC<StaffBankTransferSectionProps> = ({
  staffList = [],
  staffPayments = [],
  accounts = [],
  currentMosque,
  onOpenPayModal,
  onNavigateToLetter,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7);

  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Staff with bank account details
  const staffWithBank = staffList.filter((s) => s.status === 'ACTIVE' && Boolean(s.accountNumber));

  // Compute payment status for each
  const bankRows = useMemo(() => {
    return staffWithBank.map((staff) => {
      const payment = staffPayments.find(
        (p) => (p.paymentMonth === selectedMonth || p.month === selectedMonth) && p.staffId === staff.id && p.status !== 'CANCELLED'
      );
      const basic = staff.monthlySalary || staff.basicSalary || 0;
      const allowance = staff.allowance || 0;
      const netPayable = payment ? payment.netPayable : basic + allowance;
      const isPaid = Boolean(payment);

      return {
        staff,
        payment,
        netPayable,
        isPaid,
      };
    });
  }, [staffWithBank, staffPayments, selectedMonth]);

  const filteredRows = bankRows.filter((r) => {
    return (
      searchQuery.trim() === '' ||
      r.staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.staff.fullNameBn && r.staff.fullNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.staff.accountNumber && r.staff.accountNumber.includes(searchQuery))
    );
  });

  const totalBankDisbursement = filteredRows.reduce((sum, r) => sum + r.netPayable, 0);
  const totalPaidThroughBank = filteredRows.filter((r) => r.isPaid).reduce((sum, r) => sum + r.netPayable, 0);

  const handlePrint = () => {
    printElement('printable-bank-transfer-schedule', {
      title: `ব্যাংক_ট্রান্সফার_শিডিউল_${selectedMonth}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>ইমাম ও কর্মী বেতন ব্যাংক ট্রান্সফার হাব</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ব্যাংক অ্যাকাউন্টের মাধ্যমে কর্মীদের বেতন তালিকা প্রস্তুত ও সরাসরি স্থানান্তর
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month input */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            />
          </div>

          {/* Mandatory Letterhead Toggle */}
          <label className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 cursor-pointer select-none transition">
            <input
              type="checkbox"
              checked={includeLetterhead}
              onChange={(e) => setIncludeLetterhead(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>{includeLetterhead ? '☑ লেটারহেডসহ প্রিন্ট' : '☐ লেটারহেড ছাড়া প্রিন্ট'}</span>
          </label>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট শিডিউল</span>
          </button>

          {onNavigateToLetter && (
            <button
              type="button"
              onClick={onNavigateToLetter}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>ব্যাংক ট্রান্সফার লেটার</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-600 uppercase">ব্যাংক হিসাবধারী কর্মী</span>
          <div className="text-xl font-bold text-indigo-950 font-siliguri mt-0.5">{staffWithBank.length} জন</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">মোট ব্যাংক প্রদেয়</span>
          <div className="text-xl font-bold text-slate-900 font-siliguri mt-0.5">
            {formatCurrency(totalBankDisbursement, language)}
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">পরিশোধ সম্পন্ন</span>
          <div className="text-xl font-bold text-emerald-700 font-siliguri mt-0.5">
            {formatCurrency(totalPaidThroughBank, language)}
          </div>
        </div>
      </div>

      {/* Bank Account Selection & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কর্মী বা হিসাব নম্বর দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <span>উৎস মসজিদ ব্যাংক হিসাব:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountNumber || acc.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">কর্মী ও পদবী</th>
                <th className="p-3">ব্যাংকের নাম ও শাখা</th>
                <th className="p-3 font-mono">হিসাব নম্বর</th>
                <th className="p-3 font-mono font-bold">নিট প্রদেয় বেতন</th>
                <th className="p-3 text-center">স্ট্যাটাস</th>
                <th className="p-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.staff.id} className="hover:bg-slate-50/80">
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block font-siliguri">{row.staff.fullNameBn || row.staff.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{row.staff.designationBn}</span>
                  </td>
                  <td className="p-3 text-slate-700">
                    <span className="font-bold block">{row.staff.bankName || 'সোনালী ব্যাংক'}</span>
                    <span className="text-[10px] text-slate-400">{row.staff.branchName || 'মূল শাখা'}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800">{row.staff.accountNumber}</td>
                  <td className="p-3 font-mono font-bold text-indigo-900">{formatCurrency(row.netPayable, language)}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {row.isPaid ? 'পরিশোধিত' : 'অপেক্ষমাণ'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {!row.isPaid && (
                      <button
                        type="button"
                        onClick={() => onOpenPayModal(row.staff.id)}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                      >
                        পরিশোধ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Printable */}
      <div id="printable-bank-transfer-schedule" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        {includeLetterhead ? (
          <MosqueOfficialLetterhead
            mosque={currentMosque}
            documentTitle="ব্যাংক স্যালারি ট্রান্সফার শিডিউল"
            dateStr={`মাস: ${selectedMonth}`}
          />
        ) : (
          <div className="text-center pb-4 border-b border-slate-300 mb-6">
            <h1 className="text-xl font-bold font-siliguri">ব্যাংক স্যালারি ট্রান্সফার শিডিউল</h1>
            <p className="text-xs text-slate-600 mt-1">মাস: {selectedMonth}</p>
          </div>
        )}

        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="p-2 border border-slate-300">ক্রমিক</th>
              <th className="p-2 border border-slate-300">নাম ও পদবী</th>
              <th className="p-2 border border-slate-300">ব্যাংকের নাম</th>
              <th className="p-2 border border-slate-300">হিসাব নম্বর</th>
              <th className="p-2 border border-slate-300 font-mono">টাকার পরিমাণ</th>
              <th className="p-2 border border-slate-300 text-center">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => (
              <tr key={r.staff.id} className="border-b border-slate-200">
                <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-2 border border-slate-300 font-bold font-siliguri">{r.staff.fullNameBn || r.staff.name} ({r.staff.designationBn})</td>
                <td className="p-2 border border-slate-300">{r.staff.bankName || 'সোনালী ব্যাংক'}</td>
                <td className="p-2 border border-slate-300 font-mono">{r.staff.accountNumber}</td>
                <td className="p-2 border border-slate-300 font-bold">{formatCurrency(r.netPayable, language)}</td>
                <td className="p-2 border border-slate-300 text-center">{r.isPaid ? 'পরিশোধিত' : 'প্রস্তুত'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

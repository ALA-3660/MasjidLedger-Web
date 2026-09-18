import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Calendar,
  Building,
  CheckCircle2,
  Download,
  Users,
  Info
} from 'lucide-react';
import { Staff, StaffPayment, Mosque } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { printElement } from '../lib/printUtils';

interface StaffBankLetterSectionProps {
  staffList: Staff[];
  currentMosque?: Mosque | null;
  language: Language;
}

export const StaffBankLetterSection: React.FC<StaffBankLetterSectionProps> = ({
  staffList = [],
  currentMosque,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7);

  const [letterDate, setLetterDate] = useState<string>(today.toISOString().split('T')[0]);
  const [memoNumber, setMemoNumber] = useState<string>(`মসজিদ/বেতন/${today.getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
  const [targetBank, setTargetBank] = useState<string>('সোনালী ব্যাংক পিএলসি');
  const [targetBranch, setTargetBranch] = useState<string>('ধানমন্ডি শাখা, ঢাকা');
  const [sourceAccount, setSourceAccount] = useState<string>('0123456789012');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const activeStaffWithBank = staffList.filter((s) => s.status === 'ACTIVE' && Boolean(s.accountNumber));

  const totalAmount = activeStaffWithBank.reduce(
    (sum, s) => sum + (s.monthlySalary || s.basicSalary || 0) + (s.allowance || 0),
    0
  );
  const totalAmountInWords = numberToBanglaWords(totalAmount) + ' টাকা মাত্র';

  const handlePrintLetter = () => {
    printElement('printable-official-bank-advice-letter', {
      title: `ব্যাংক_ট্রান্সফার_চিঠি_${selectedMonth}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>অফিসিয়াল ব্যাংক ট্রান্সফার লেটার ও এডভাইস</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ব্যাংক ম্যানেজার বরাবর আনুষ্ঠানিক বেতন স্থানান্তর চিঠি প্রস্তুত ও প্রিন্ট
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintLetter}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>অফিসিয়াল লেটার প্রিন্ট</span>
        </button>
      </div>

      {/* Configuration Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">স্মারক নম্বর</label>
          <input
            type="text"
            value={memoNumber}
            onChange={(e) => setMemoNumber(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">চিঠির তারিখ</label>
          <input
            type="date"
            value={letterDate}
            onChange={(e) => setLetterDate(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">প্রাপক ব্যাংক</label>
          <input
            type="text"
            value={targetBank}
            onChange={(e) => setTargetBank(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          />
        </div>
        <div>
          <label className="font-bold text-slate-700 block mb-1">শাখা</label>
          <input
            type="text"
            value={targetBranch}
            onChange={(e) => setTargetBranch(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
          />
        </div>
      </div>

      {/* Live Letterhead Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10 max-w-4xl mx-auto space-y-6 text-slate-800 text-xs sm:text-sm">
        {/* Letterhead */}
        <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold font-siliguri text-slate-900">
            {currentMosque?.name || 'বাইতুল মোকাররম কেন্দ্রীয় জামে মসজিদ'}
          </h2>
          <p className="text-xs text-slate-600">
            {currentMosque?.address || 'মিরপুর, ঢাকা-১২১৬'} | ফোন: {currentMosque?.contactPhone || '০১৭১১০০০০০০'}
          </p>
        </div>

        {/* Top Info */}
        <div className="flex justify-between items-center text-xs text-slate-600">
          <span>স্মারক নং: <strong className="text-slate-900 font-mono">{memoNumber}</strong></span>
          <span>তারিখ: <strong className="text-slate-900">{formatDate(letterDate, language)}</strong></span>
        </div>

        {/* Salutation */}
        <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
          <p>বরাবর,</p>
          <p className="font-bold text-slate-900">শাখা ব্যবস্থাপক</p>
          <p>{targetBank}</p>
          <p>{targetBranch}</p>
        </div>

        {/* Subject */}
        <div className="font-bold text-slate-900 text-xs sm:text-sm pt-2 border-t border-slate-100">
          বিষয়: {selectedMonth} মাসের কর্মকর্তা ও কর্মচারীদের বেতন ভাতা ব্যাংক হিসাব মারফত স্থানান্তরকরণ প্রসঙ্গে।
        </div>

        {/* Body */}
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          জনাব, বিনীত নিবেদন এই যে, অত্র মসজিদের চলতি হিসাব নম্বর <strong>{sourceAccount}</strong> হতে নিম্নবর্ণিত সম্মানিত
          ইমাম, মুয়াজ্জিন ও কর্মচারীদের অনুকূলে উল্লিখিত ব্যাংক হিসাবসমূহে উল্লিখিত বেতন ও ভাতার অর্থ স্থানান্তরের (Bank Transfer)
          প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য অনুরোধ জানাচ্ছি।
        </p>

        {/* Schedule Table */}
        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="p-2.5 text-center">ক্র.</th>
                <th className="p-2.5">কর্মীর নাম ও পদবী</th>
                <th className="p-2.5">হিসাব নম্বর</th>
                <th className="p-2.5">ব্যাংক ও শাখা</th>
                <th className="p-2.5 text-right font-mono">টাকার পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeStaffWithBank.map((s, idx) => {
                const total = (s.monthlySalary || s.basicSalary || 0) + (s.allowance || 0);
                return (
                  <tr key={s.id}>
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-slate-900 font-siliguri">
                      {s.fullNameBn || s.name} ({s.designationBn})
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-800">{s.accountNumber}</td>
                    <td className="p-2.5 text-slate-600">{s.bankName || targetBank}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(total, language)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td colSpan={4} className="p-2.5 text-right">সর্বমোট স্থানান্তরের পরিমাণ:</td>
                <td className="p-2.5 text-right font-mono text-indigo-900 text-sm">
                  {formatCurrency(totalAmount, language)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Words */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
          কথায়: <span className="text-indigo-900">{totalAmountInWords}</span>
        </div>

        {/* Closing & Signatures */}
        <div className="pt-16 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="border-t border-slate-600 pt-1 font-bold">কোষাধ্যক্ষ</div>
            <span className="text-[10px] text-slate-400">মসজিদ পরিচালনা পরিষদ</span>
          </div>
          <div>
            <div className="border-t border-slate-600 pt-1 font-bold">সাধারণ সম্পাদক</div>
            <span className="text-[10px] text-slate-400">মসজিদ পরিচালনা পরিষদ</span>
          </div>
          <div>
            <div className="border-t border-slate-600 pt-1 font-bold">সভাপতি / মোতওয়াল্লী</div>
            <span className="text-[10px] text-slate-400">মসজিদ পরিচালনা পরিষদ</span>
          </div>
        </div>
      </div>

      {/* Hidden Printable Official Bank Letter for Clean Printing */}
      <div id="printable-official-bank-advice-letter" className="hidden print:block p-10 bg-white text-slate-900 font-sans">
        <div className="text-center pb-4 border-b-2 border-slate-800 mb-6 space-y-1">
          <h1 className="text-2xl font-bold font-siliguri">{currentMosque?.name || 'বাইতুল মোকাররম কেন্দ্রীয় জামে মসজিদ'}</h1>
          <p className="text-xs text-slate-600">{currentMosque?.address || 'মিরপুর, ঢাকা'} | ফোন: {currentMosque?.contactPhone || '০১৭১১০০০০০০'}</p>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-600 mb-4">
          <span>স্মারক নং: <strong>{memoNumber}</strong></span>
          <span>তারিখ: <strong>{formatDate(letterDate, language)}</strong></span>
        </div>

        <div className="space-y-1 text-xs mb-4">
          <p>বরাবর,</p>
          <p className="font-bold">শাখা ব্যবস্থাপক</p>
          <p>{targetBank}, {targetBranch}</p>
        </div>

        <div className="font-bold text-xs mb-4">
          বিষয়: {selectedMonth} মাসের কর্মকর্তা ও কর্মচারীদের বেতন ভাতা ব্যাংক হিসাব মারফত স্থানান্তরকরণ প্রসঙ্গে।
        </div>

        <p className="text-xs mb-4 leading-relaxed">
          জনাব, বিনীত নিবেদন এই যে, অত্র মসজিদের চলতি হিসাব নম্বর <strong>{sourceAccount}</strong> হতে নিম্নবর্ণিত সম্মানিত
          ইমাম, মুয়াজ্জিন ও কর্মচারীদের অনুকূলে উল্লিখিত ব্যাংক হিসাবসমূহে উল্লিখিত বেতন ও ভাতার অর্থ স্থানান্তরের (Bank Transfer)
          প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য অনুরোধ জানাচ্ছি।
        </p>

        <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-4">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="p-2 border border-slate-300 text-center">ক্র.</th>
              <th className="p-2 border border-slate-300">নাম ও পদবী</th>
              <th className="p-2 border border-slate-300">হিসাব নম্বর</th>
              <th className="p-2 border border-slate-300">ব্যাংক ও শাখা</th>
              <th className="p-2 border border-slate-300 text-right">টাকার পরিমাণ (৳)</th>
            </tr>
          </thead>
          <tbody>
            {activeStaffWithBank.map((s, idx) => {
              const total = (s.monthlySalary || s.basicSalary || 0) + (s.allowance || 0);
              return (
                <tr key={s.id}>
                  <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-2 border border-slate-300 font-bold font-siliguri">{s.fullNameBn || s.name} ({s.designationBn})</td>
                  <td className="p-2 border border-slate-300 font-mono">{s.accountNumber}</td>
                  <td className="p-2 border border-slate-300">{s.bankName || targetBank}</td>
                  <td className="p-2 border border-slate-300 text-right font-bold">{formatCurrency(total, language)}</td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={4} className="p-2 border border-slate-300 text-right">মোট:</td>
              <td className="p-2 border border-slate-300 text-right">{formatCurrency(totalAmount, language)}</td>
            </tr>
          </tbody>
        </table>

        <div className="p-2 border border-slate-300 text-xs font-bold mb-16">
          কথায়: {totalAmountInWords}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="border-t border-slate-600 pt-1 font-bold">কোষাধ্যক্ষ</div>
          </div>
          <div>
            <div className="border-t border-slate-600 pt-1 font-bold">সাধারণ সম্পাদক</div>
          </div>
          <div>
            <div className="border-t border-slate-600 pt-1 font-bold">সভাপতি / মোতওয়াল্লী</div>
          </div>
        </div>
      </div>
    </div>
  );
};

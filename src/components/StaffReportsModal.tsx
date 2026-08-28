import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  Building,
  Users,
  Calendar,
  DollarSign,
  Gift,
  Landmark,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  Search
} from 'lucide-react';
import { Staff, StaffPayment, Mosque, StaffBankTransferLetter } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';

export type StaffReportType =
  | 'MASTER_REGISTER'
  | 'ACTIVE_STAFF'
  | 'INACTIVE_STAFF'
  | 'MONTHLY_SALARY_REGISTER'
  | 'ANNUAL_STATEMENT'
  | 'STAFF_PAYMENT_HISTORY'
  | 'SALARY_REVISION_HISTORY'
  | 'FESTIVAL_BONUS_REGISTER'
  | 'BANK_TRANSFER_STATEMENT'
  | 'UNPAID_PENDING_SALARY';

interface StaffReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  staffPayments: StaffPayment[];
  bankLetters?: StaffBankTransferLetter[];
  currentMosque?: Mosque | null;
  initialReportType?: StaffReportType;
  language: Language;
}

export const StaffReportsModal: React.FC<StaffReportsModalProps> = ({
  isOpen,
  onClose,
  staffList,
  staffPayments,
  bankLetters = [],
  currentMosque,
  initialReportType = 'MASTER_REGISTER',
  language,
}) => {
  const t = translations[language];

  const [selectedReport, setSelectedReport] = useState<StaffReportType>(initialReportType);
  const [showLetterhead, setShowLetterhead] = useState(true);

  // Filters
  const currentYear = new Date().getFullYear();
  const currentMonthStr = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [filterMonth, setFilterMonth] = useState(currentMonthStr);
  const [filterYear, setFilterYear] = useState(currentYear.toString());
  const [filterStaffId, setFilterStaffId] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active', 'print-landscape-active');
      setSelectedReport(initialReportType);
    } else {
      document.body.classList.remove('print-modal-active', 'print-landscape-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active', 'print-landscape-active');
    };
  }, [isOpen, initialReportType]);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('print-modal-active', 'print-landscape-active');
    window.print();
  };

  const reportDefinitions: { id: StaffReportType; titleBn: string; titleEn: string; icon: any; category: string }[] = [
    { id: 'MASTER_REGISTER', titleBn: '১. স্টাফ মাস্টার রেজিস্টার', titleEn: 'Staff Master Register', icon: Users, category: 'স্টাফ তালিকা' },
    { id: 'ACTIVE_STAFF', titleBn: '২. কর্মরত ইমাম ও স্টাফ তালিকা', titleEn: 'Active Staff List', icon: UserCheck, category: 'স্টাফ তালিকা' },
    { id: 'INACTIVE_STAFF', titleBn: '৩. সাবেক ও অব্যাহতিপ্রাপ্ত স্টাফ তালিকা', titleEn: 'Former Staff List', icon: UserX, category: 'স্টাফ তালিকা' },
    { id: 'MONTHLY_SALARY_REGISTER', titleBn: '৪. মাসিক বেতন ও সম্মানী রেজিস্টার', titleEn: 'Monthly Salary Register', icon: FileText, category: 'বেতন ও পেমেন্ট' },
    { id: 'ANNUAL_STATEMENT', titleBn: '৫. বার্ষিক বেতন বিবরণী', titleEn: 'Annual Salary Statement', icon: TrendingUp, category: 'বেতন ও পেমেন্ট' },
    { id: 'STAFF_PAYMENT_HISTORY', titleBn: '৬. স্টাফভিত্তিক বেতন ইতিহাস', titleEn: 'Staff Payment History', icon: Clock, category: 'বেতন ও পেমেন্ট' },
    { id: 'SALARY_REVISION_HISTORY', titleBn: '৭. বেতন বৃদ্ধি ও স্কেল পরিবর্তনের ইতিহাস', titleEn: 'Salary Revision History', icon: DollarSign, category: 'বেতন ও পেমেন্ট' },
    { id: 'FESTIVAL_BONUS_REGISTER', titleBn: '৮. উৎসব ভাতা ও বোনাস রেজিস্টার', titleEn: 'Festival Allowance Register', icon: Gift, category: 'ভাতা ও ব্যাংক' },
    { id: 'BANK_TRANSFER_STATEMENT', titleBn: '৯. ব্যাংক ট্রান্সফার স্টেটমেন্ট ও চিঠিসমূহ', titleEn: 'Bank Transfer Statement', icon: Landmark, category: 'ভাতা ও ব্যাংক' },
    { id: 'UNPAID_PENDING_SALARY', titleBn: '১০. বকেয়া / অপরিশোধিত বেতন তালিকা', titleEn: 'Pending / Unpaid Salary', icon: AlertCircle, category: 'বেতন ও পেমেন্ট' },
  ];

  // Selected staff object if specific staff chosen
  const singleStaff = staffList.find((s) => s.id === filterStaffId);

  // Month list for annual view
  const monthsInYear = [
    { key: '01', name: 'জানুয়ারি' },
    { key: '02', name: 'ফেব্রুয়ারি' },
    { key: '03', name: 'মার্চ' },
    { key: '04', name: 'এপ্রিল' },
    { key: '05', name: 'মে' },
    { key: '06', name: 'জুন' },
    { key: '07', name: 'জুলাই' },
    { key: '08', name: 'আগস্ট' },
    { key: '09', name: 'সেপ্টেম্বর' },
    { key: '10', name: 'অক্টোবর' },
    { key: '11', name: 'নভেম্বর' },
    { key: '12', name: 'ডিসেম্বর' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 sm:py-6 overflow-y-auto print-modal-portal">
      {/* Landscape A4 Print Injection */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 8mm 10mm !important;
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-7xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150 print-modal-card print:max-h-none print:my-0 print:border-none print:shadow-none print:rounded-none">
        {/* Top Controls Toolbar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-600/40 rounded-lg border border-blue-400/30">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-siliguri">ইমাম ও স্টাফ ম্যানেজমেন্ট — অফিসিয়াল রিপোর্ট সেন্টার</h3>
              <p className="text-[11px] text-slate-400">১০টি সমন্বিত ও প্রিন্ট-উপযোগী রেজিস্টার ও বিবরণী</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Letterhead Toggle */}
            <label className="flex items-center space-x-1.5 text-xs font-semibold font-siliguri text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 select-none">
              <input
                id="toggle-staff-reports-letterhead"
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>লেটারহেড / প্যাড অন</span>
            </label>

            {/* Print Button */}
            <button
              id="btn-print-staff-report"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>A4 প্রিন্ট করুন (Print A4)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Selector & Filter Bar (Hidden in Print) */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0 print:hidden no-print">
          {/* Report Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700 font-siliguri">রিপোর্ট নির্বাচন:</span>
            <select
              id="select-staff-report-type"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as StaffReportType)}
              className="bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 font-bold font-siliguri focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              {reportDefinitions.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.titleBn}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Contextual Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(selectedReport === 'MONTHLY_SALARY_REGISTER' || selectedReport === 'UNPAID_PENDING_SALARY') && (
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-slate-600">মাস:</span>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium"
                />
              </div>
            )}

            {(selectedReport === 'ANNUAL_STATEMENT' || selectedReport === 'STAFF_PAYMENT_HISTORY' || selectedReport === 'SALARY_REVISION_HISTORY' || selectedReport === 'FESTIVAL_BONUS_REGISTER') && (
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-slate-600">বছর:</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium"
                >
                  {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedReport === 'STAFF_PAYMENT_HISTORY' || selectedReport === 'SALARY_REVISION_HISTORY') && (
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-slate-600">স্টাফ:</span>
                <select
                  value={filterStaffId}
                  onChange={(e) => setFilterStaffId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium max-w-[160px]"
                >
                  <option value="ALL">সকল স্টাফ</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.designationBn})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(selectedReport === 'MASTER_REGISTER' || selectedReport === 'ACTIVE_STAFF') && (
              <div className="flex items-center space-x-1">
                <span className="font-semibold text-slate-600">পদবি:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-medium"
                >
                  <option value="ALL">সকল পদবি</option>
                  <option value="IMAM">ইমাম / খতিব</option>
                  <option value="MUEZZIN">মুয়াজ্জিন</option>
                  <option value="TEACHER">শিক্ষক</option>
                  <option value="CLEANER">খাদেম / পরিচ্ছন্নতা</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Printable Report Canvas (A4 Landscape Formatted) */}
        <div className="p-6 sm:p-8 space-y-5 text-slate-900 bg-white font-sans text-xs flex-1 overflow-y-auto print:p-4 print:overflow-visible">
          {/* Header Block */}
          {showLetterhead ? (
            <div className="text-center space-y-1 pb-3 border-b-2 border-slate-900">
              <div className="flex items-center justify-center space-x-3">
                {currentMosque?.logoUrl ? (
                  <img
                    src={currentMosque.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 object-contain rounded-full border border-slate-200 p-0.5"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Building className="w-4 h-4" />
                  </div>
                )}
                <div className="text-left">
                  <h1 className="text-lg font-black font-siliguri text-slate-950">
                    {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ ও ইসলামিক সেন্টার'}
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium">
                    {currentMosque?.address || 'ঠিকানা: মসজিদ কমপ্লেক্স'}
                    {currentMosque?.phone ? ` | মোবাইল: ${currentMosque.phone}` : ''}
                  </p>
                </div>
              </div>

              <div className="pt-1.5">
                <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-md tracking-wide font-siliguri">
                  {reportDefinitions.find((r) => r.id === selectedReport)?.titleBn || 'ইমাম ও স্টাফ অফিশিয়াল রিপোর্ট'}
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-14 pb-2 text-center border-b border-dashed border-slate-300">
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-md tracking-wide font-siliguri">
                {reportDefinitions.find((r) => r.id === selectedReport)?.titleBn || 'ইমাম ও স্টাফ অফিশিয়াল রিপোর্ট'}
              </div>
            </div>
          )}

          {/* REPORT 1: MASTER STAFF REGISTER */}
          {selectedReport === 'MASTER_REGISTER' && (() => {
            const list = staffList.filter((s) => {
              if (filterCategory !== 'ALL' && s.designation !== filterCategory && !(filterCategory === 'IMAM' && s.designation === 'KHATIB')) return false;
              return true;
            });
            const activeCount = list.filter((s) => s.status === 'ACTIVE').length;
            const totalMonthly = list.filter((s) => s.status === 'ACTIVE').reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 pb-1">
                  <span>মোট স্টাফ রেকর্ড: {list.length} জন (সক্রিয়: {activeCount} জন)</span>
                  <span>মাসিক হাদিয়া দায়ভার: ৳ {totalMonthly.toLocaleString('en-IN')}</span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-2 text-center w-10">ক্র.নং</th>
                      <th className="border border-slate-300 p-2 text-left">আইডি ও নাম</th>
                      <th className="border border-slate-300 p-2 text-left">পদবি ও ধরন</th>
                      <th className="border border-slate-300 p-2 text-center">যোগদান</th>
                      <th className="border border-slate-300 p-2 text-left">মোবাইল ও NID</th>
                      <th className="border border-slate-300 p-2 text-right">মাসিক হাদিয়া (৳)</th>
                      <th className="border border-slate-300 p-2 text-left">ব্যাংক ও হিসাব নং</th>
                      <th className="border border-slate-300 p-2 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s, idx) => (
                      <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2">
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{s.staffCode || `STF-${idx + 1}`}</span>
                        </td>
                        <td className="border border-slate-300 p-2">
                          <span className="font-bold text-slate-800">{s.designationBn}</span>
                          <span className="text-[10px] text-slate-500 block">{s.employmentTypeBn || 'স্থায়ী'}</span>
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{s.joiningDate}</td>
                        <td className="border border-slate-300 p-2">
                          <span className="font-mono font-medium">{s.phone}</span>
                          {s.nid ? <span className="text-[10px] text-slate-500 block font-mono">{s.nid}</span> : null}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                          {s.monthlySalary?.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {s.accountNumber ? (
                            <div>
                              <span className="font-mono text-blue-900 font-bold block">{s.accountNumber}</span>
                              <span className="text-[10px] text-slate-500">{s.bankName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">নগদ প্রদান</span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* REPORT 2: CURRENT ACTIVE STAFF */}
          {selectedReport === 'ACTIVE_STAFF' && (() => {
            const list = staffList.filter((s) => s.status === 'ACTIVE');
            const totalMonthly = list.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 pb-1">
                  <span>বর্তমানে সক্রিয় ও কর্মরত মোট স্টাফ: {list.length} জন</span>
                  <span>মাসিক হাদিয়া বাজেট: ৳ {totalMonthly.toLocaleString('en-IN')} ({numberToBanglaWords(totalMonthly)} মাত্র)</span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-2 text-center w-10">ক্র.নং</th>
                      <th className="border border-slate-300 p-2 text-left">আইডি ও নাম</th>
                      <th className="border border-slate-300 p-2 text-left">পদবি</th>
                      <th className="border border-slate-300 p-2 text-center">যোগদানের তারিখ</th>
                      <th className="border border-slate-300 p-2 text-left">মোবাইল নম্বর</th>
                      <th className="border border-slate-300 p-2 text-left">বর্তমান বাসস্থান</th>
                      <th className="border border-slate-300 p-2 text-right">মাসিক হাদিয়া (৳)</th>
                      <th className="border border-slate-300 p-2 text-left">ব্যাংক ও হিসাব নং</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s, idx) => (
                      <tr key={s.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2">
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{s.staffCode}</span>
                        </td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-800">{s.designationBn}</td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{s.joiningDate}</td>
                        <td className="border border-slate-300 p-2 font-mono">{s.phone}</td>
                        <td className="border border-slate-300 p-2 text-slate-600">{s.presentAddress || s.address || 'মসজিদ কোয়ার্টার'}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                          {s.monthlySalary?.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {s.accountNumber ? `${s.bankName} - ${s.accountNumber}` : 'নগদ গ্রহণ'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={6} className="border border-slate-300 p-2 text-right">সর্বমোট মাসিক হাদিয়া:</td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-blue-900">
                        ৳ {totalMonthly.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}

          {/* REPORT 3: INACTIVE / FORMER STAFF */}
          {selectedReport === 'INACTIVE_STAFF' && (() => {
            const list = staffList.filter((s) => s.status === 'INACTIVE' || s.status === 'TERMINATED');

            return (
              <div className="space-y-4">
                <div className="text-xs font-medium text-slate-600 pb-1">
                  সাবেক ও অব্যাহতিপ্রাপ্ত মোট স্টাফ: {list.length} জন (অতীতের সমস্ত পেমেন্ট ইতিহাস অক্ষত ও সংরক্ষিত)
                </div>

                {list.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 font-medium">
                    কোনো নিষ্ক্রিয় বা অব্যাহতিপ্রাপ্ত স্টাফের রেকর্ড নেই। সকল স্টাফ বর্তমানে কর্মরত।
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="border border-slate-300 p-2 text-center w-10">ক্র.নং</th>
                        <th className="border border-slate-300 p-2 text-left">আইডি ও নাম</th>
                        <th className="border border-slate-300 p-2 text-left">দায়িত্ব ও পদবি</th>
                        <th className="border border-slate-300 p-2 text-center">যোগদান</th>
                        <th className="border border-slate-300 p-2 text-center">অব্যাহতি / সমাপ্তি</th>
                        <th className="border border-slate-300 p-2 text-left">যোগাযোগ নম্বর</th>
                        <th className="border border-slate-300 p-2 text-left">অব্যাহতির কারণ / মন্তব্য</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((s, idx) => (
                        <tr key={s.id} className="border-b border-slate-200">
                          <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold">{s.name}</td>
                          <td className="border border-slate-300 p-2">{s.designationBn}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{s.joiningDate}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono text-rose-800 font-bold">
                            {s.resignationDate || s.terminationDate || 'উল্লেখ নেই'}
                          </td>
                          <td className="border border-slate-300 p-2 font-mono">{s.phone}</td>
                          <td className="border border-slate-300 p-2 text-slate-600">{s.notes || 'স্বেচ্ছায় অব্যাহতি'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })()}

          {/* REPORT 4: MONTHLY SALARY REGISTER */}
          {selectedReport === 'MONTHLY_SALARY_REGISTER' && (() => {
            const paymentsInMonth = staffPayments.filter((p) => p.month === filterMonth && p.status !== 'CANCELLED');
            const totalBasic = paymentsInMonth.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
            const totalBonus = paymentsInMonth.reduce((sum, p) => sum + (p.bonus || 0), 0);
            const totalAllowance = paymentsInMonth.reduce((sum, p) => sum + (p.otherAllowance || 0), 0);
            const totalDeduction = paymentsInMonth.reduce((sum, p) => sum + (p.deduction || 0), 0);
            const totalNet = paymentsInMonth.reduce((sum, p) => sum + (p.netPaid || 0), 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 pb-1">
                  <span>পরিশোধের মাস: <strong className="text-slate-900 font-bold">{filterMonth}</strong></span>
                  <span>মোট পরিশোধিত: <strong className="text-blue-900 font-bold">৳ {totalNet.toLocaleString('en-IN')}</strong> ({numberToBanglaWords(totalNet)} মাত্র)</span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-2 text-center w-8">ক্র.</th>
                      <th className="border border-slate-300 p-2 text-left">স্টাফের নাম ও পদবি</th>
                      <th className="border border-slate-300 p-2 text-right">মূল হাদিয়া (৳)</th>
                      <th className="border border-slate-300 p-2 text-right">বোনাস (৳)</th>
                      <th className="border border-slate-300 p-2 text-right">ভাতা (৳)</th>
                      <th className="border border-slate-300 p-2 text-right">কর্তন (৳)</th>
                      <th className="border border-slate-300 p-2 text-right bg-blue-50/50">মোট প্রদান (৳)</th>
                      <th className="border border-slate-300 p-2 text-left">ভাউচার ও একাউন্ট</th>
                      <th className="border border-slate-300 p-2 text-center w-28">স্বাক্ষর / রসিদ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsInMonth.map((p, idx) => (
                      <tr key={p.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2">
                          <span className="font-bold text-slate-900 block">{p.staffName}</span>
                          <span className="text-[10px] text-slate-500">{p.designationBn}</span>
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono">{p.basicSalary?.toLocaleString('en-IN')}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-amber-800">{p.bonus ? p.bonus.toLocaleString('en-IN') : '-'}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono">{p.otherAllowance ? p.otherAllowance.toLocaleString('en-IN') : '-'}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-rose-800">{p.deduction ? p.deduction.toLocaleString('en-IN') : '-'}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold bg-blue-50/40 text-blue-950">
                          {p.netPaid?.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-2">
                          <span className="font-mono text-[10px] text-slate-700 block">{p.expenseVoucherNumber}</span>
                          <span className="text-[10px] text-slate-500">{p.accountNameBn || p.paymentMethod}</span>
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          <div className="h-6 border-b border-dashed border-slate-400 mt-2"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={2} className="border border-slate-300 p-2 text-right">সর্বমোট:</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">{totalBasic.toLocaleString('en-IN')}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-amber-900">{totalBonus.toLocaleString('en-IN')}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">{totalAllowance.toLocaleString('en-IN')}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-rose-900">{totalDeduction.toLocaleString('en-IN')}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-black text-blue-950 bg-blue-100/50">
                        ৳ {totalNet.toLocaleString('en-IN')}
                      </td>
                      <td colSpan={2} className="border border-slate-300 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}

          {/* REPORT 5: ANNUAL SALARY STATEMENT */}
          {selectedReport === 'ANNUAL_STATEMENT' && (() => {
            const activeList = staffList.filter((s) => s.status === 'ACTIVE');
            const annualPayments = staffPayments.filter((p) => p.month?.startsWith(filterYear) && p.status !== 'CANCELLED');

            const grandTotal = annualPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 pb-1">
                  <span>অর্থবছর / সন: <strong className="text-slate-900 font-bold">{filterYear}</strong></span>
                  <span>বছরে মোট বেতন-ভাতা ব্যয়: <strong className="text-blue-900 font-bold">৳ {grandTotal.toLocaleString('en-IN')}</strong></span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="border border-slate-300 p-1.5 text-center w-8">ক্র.</th>
                        <th className="border border-slate-300 p-1.5 text-left min-w-[120px]">স্টাফের নাম ও পদবি</th>
                        {monthsInYear.map((m) => (
                          <th key={m.key} className="border border-slate-300 p-1 text-center font-mono">
                            {m.name.slice(0, 3)}
                          </th>
                        ))}
                        <th className="border border-slate-300 p-1.5 text-right bg-blue-50/60 font-bold min-w-[70px]">
                          মোট (৳)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeList.map((s, idx) => {
                        let staffYearTotal = 0;

                        return (
                          <tr key={s.id} className="border-b border-slate-200">
                            <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-slate-300 p-1.5">
                              <span className="font-bold text-slate-900 block">{s.name}</span>
                              <span className="text-[9px] text-slate-500">{s.designationBn}</span>
                            </td>

                            {monthsInYear.map((m) => {
                              const ym = `${filterYear}-${m.key}`;
                              const p = annualPayments.find((pay) => pay.staffId === s.id && pay.month === ym);
                              const amt = p ? p.netPaid : 0;
                              staffYearTotal += amt;

                              return (
                                <td key={m.key} className="border border-slate-300 p-1 text-center font-mono">
                                  {amt > 0 ? amt.toLocaleString('en-IN') : <span className="text-slate-300">-</span>}
                                </td>
                              );
                            })}

                            <td className="border border-slate-300 p-1.5 text-right font-mono font-bold bg-blue-50/40 text-blue-950">
                              {staffYearTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                        <td colSpan={2} className="border border-slate-300 p-1.5 text-right">মাসিক সর্বমোট:</td>
                        {monthsInYear.map((m) => {
                          const ym = `${filterYear}-${m.key}`;
                          const monthSum = annualPayments
                            .filter((p) => p.month === ym)
                            .reduce((sum, p) => sum + (p.netPaid || 0), 0);

                          return (
                            <td key={m.key} className="border border-slate-300 p-1 text-center font-mono font-bold text-slate-900">
                              {monthSum > 0 ? monthSum.toLocaleString('en-IN') : '-'}
                            </td>
                          );
                        })}
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-black text-blue-950 bg-blue-100">
                          ৳ {grandTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* REPORT 6: STAFF PAYMENT HISTORY */}
          {selectedReport === 'STAFF_PAYMENT_HISTORY' && (() => {
            const list = staffPayments.filter((p) => {
              if (filterStaffId !== 'ALL' && p.staffId !== filterStaffId) return false;
              if (filterYear && !p.month?.startsWith(filterYear)) return false;
              return p.status !== 'CANCELLED';
            });
            const totalPaid = list.reduce((sum, p) => sum + (p.netPaid || 0), 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 pb-1">
                  <span>
                    {singleStaff ? `${singleStaff.name} (${singleStaff.designationBn}) - এর পেমেন্ট হিস্ট্রি` : 'সকল স্টাফের পেমেন্ট হিস্ট্রি'} (বছর: {filterYear})
                  </span>
                  <span>মোট পরিশোধিত: <strong className="text-blue-900 font-bold">৳ {totalPaid.toLocaleString('en-IN')}</strong></span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-2 text-center w-8">ক্র.</th>
                      <th className="border border-slate-300 p-2 text-left">স্টাফের নাম</th>
                      <th className="border border-slate-300 p-2 text-center">পরিশোধিত মাস</th>
                      <th className="border border-slate-300 p-2 text-center">তারিখ</th>
                      <th className="border border-slate-300 p-2 text-right">মূল হাদিয়া</th>
                      <th className="border border-slate-300 p-2 text-right">বোনাস/ভাতা</th>
                      <th className="border border-slate-300 p-2 text-right">কর্তন</th>
                      <th className="border border-slate-300 p-2 text-right font-bold bg-blue-50/50">পরিশোধিত অর্থ (৳)</th>
                      <th className="border border-slate-300 p-2 text-left">ভাউচার নম্বর</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((p, idx) => (
                      <tr key={p.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-bold">{p.staffName}</td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{p.month}</td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{p.paymentDate}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono">{p.basicSalary?.toLocaleString('en-IN')}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-emerald-800">
                          {((p.bonus || 0) + (p.otherAllowance || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-rose-800">{p.deduction || '-'}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold bg-blue-50/40 text-blue-950">
                          ৳ {p.netPaid?.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono text-[10px]">{p.expenseVoucherNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* REPORT 7: SALARY REVISION HISTORY */}
          {selectedReport === 'SALARY_REVISION_HISTORY' && (() => {
            const targetStaffList = filterStaffId !== 'ALL' ? staffList.filter((s) => s.id === filterStaffId) : staffList;

            return (
              <div className="space-y-4">
                <div className="text-xs font-medium text-slate-700 pb-1">
                  স্টাফদের বেতন বৃদ্ধি, ইনক্রিমেন্ট ও স্কেল পরিবর্তনের অফিসিয়াল হিস্ট্রি
                </div>

                <div className="space-y-4">
                  {targetStaffList.map((st) => {
                    const history = st.salaryHistory || [];

                    return (
                      <div key={st.id} className="border border-slate-300 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 p-3 flex items-center justify-between border-b border-slate-300">
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{st.name}</span>
                            <span className="text-slate-500 text-[11px] ml-2">({st.designationBn})</span>
                          </div>
                          <div className="text-xs font-bold text-blue-950">
                            বর্তমান বেতন স্কেল: ৳ {st.monthlySalary?.toLocaleString('en-IN')}
                          </div>
                        </div>

                        <table className="w-full border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                              <th className="p-2 text-left">কার্যকরের তারিখ</th>
                              <th className="p-2 text-right">পূর্ববর্তী বেতন</th>
                              <th className="p-2 text-right">নতুন বেতন (৳)</th>
                              <th className="p-2 text-right">বৃদ্ধির পরিমাণ (ইনক্রিমেন্ট)</th>
                              <th className="p-2 text-left">কারণ ও অনুমোদন</th>
                              <th className="p-2 text-left">রেকর্ডকারী</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                                  প্রারম্ভিক নির্ধারিত বেতন ব্যতীত কোনো ইনক্রিমেন্ট রেকর্ড নেই।
                                </td>
                              </tr>
                            ) : (
                              history.map((h, hIdx) => {
                                const inc = h.incrementAmount !== undefined ? h.incrementAmount : (h.previousSalary ? h.newSalary - h.previousSalary : 0);

                                return (
                                  <tr key={h.id || hIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="p-2 font-mono font-semibold text-blue-900">{h.effectiveDate}</td>
                                    <td className="p-2 text-right font-mono text-slate-500">
                                      {h.previousSalary ? `৳ ${h.previousSalary.toLocaleString('en-IN')}` : '-'}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                                      ৳ {h.newSalary?.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                      {inc > 0 ? `+ ৳ ${inc.toLocaleString('en-IN')}` : '-'}
                                    </td>
                                    <td className="p-2 text-slate-700">{h.reason || 'বেতন নির্ধারণ'}</td>
                                    <td className="p-2 text-slate-500 font-medium">{h.changedByName || 'কমিটি অ্যাডমিন'}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* REPORT 8: FESTIVAL ALLOWANCE / BONUS REGISTER */}
          {selectedReport === 'FESTIVAL_BONUS_REGISTER' && (() => {
            const festivalPayments = staffPayments.filter(
              (p) => (p.paymentType === 'FESTIVAL_ALLOWANCE' || p.bonus! > 0) && p.status !== 'CANCELLED'
            );
            const totalBonusPaid = festivalPayments.reduce((sum, p) => sum + (p.bonus || p.netPaid || 0), 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 pb-1">
                  <span>উৎসব ভাতা ও বিশেষ বোনাস প্রদানের তালিকা</span>
                  <span>সর্বমোট উৎসব ভাতা: <strong className="text-amber-900 font-bold">৳ {totalBonusPaid.toLocaleString('en-IN')}</strong></span>
                </div>

                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-2 text-center w-8">ক্র.</th>
                      <th className="border border-slate-300 p-2 text-left">স্টাফের নাম ও পদবি</th>
                      <th className="border border-slate-300 p-2 text-left">উৎসব / বোনাসের নাম</th>
                      <th className="border border-slate-300 p-2 text-center">মাস ও বছর</th>
                      <th className="border border-slate-300 p-2 text-center">তারিখ</th>
                      <th className="border border-slate-300 p-2 text-right font-bold bg-amber-50">ভাতার পরিমাণ (৳)</th>
                      <th className="border border-slate-300 p-2 text-left">ভাউচার নং</th>
                    </tr>
                  </thead>
                  <tbody>
                    {festivalPayments.map((p, idx) => (
                      <tr key={p.id} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-bold">
                          {p.staffName} <span className="text-[10px] text-slate-500 block font-normal">{p.designationBn}</span>
                        </td>
                        <td className="border border-slate-300 p-2 font-semibold text-amber-950">
                          {p.festivalName || p.notes || 'উৎসব ভাতা'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{p.month}</td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{p.paymentDate}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold bg-amber-50/60 text-amber-950">
                          ৳ {(p.bonus || p.netPaid)?.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono text-[10px]">{p.expenseVoucherNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={5} className="border border-slate-300 p-2 text-right">সর্বমোট বোনাস ব্যয়:</td>
                      <td className="border border-slate-300 p-2 text-right font-mono text-amber-950 font-black">
                        ৳ {totalBonusPaid.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}

          {/* REPORT 9: BANK TRANSFER STATEMENT */}
          {selectedReport === 'BANK_TRANSFER_STATEMENT' && (() => {
            return (
              <div className="space-y-4">
                <div className="text-xs font-medium text-slate-700 pb-1">
                  সংরক্ষিত অফিশিয়াল ব্যাংক ট্রান্সফার লেটার ও বিবরণীসমূহ ({bankLetters.length}টি)
                </div>

                {bankLetters.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 font-medium">
                    এখনও কোনো ব্যাংক ট্রান্সফার লেটার সংরক্ষিত হয়নি। "ব্যাংক ট্রান্সফার লেটার" অপশন থেকে নতুন লেটার তৈরি করুন।
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="border border-slate-300 p-2 text-center w-8">ক্র.</th>
                        <th className="border border-slate-300 p-2 text-left">স্মারক নম্বর (Memo No.)</th>
                        <th className="border border-slate-300 p-2 text-center">তারিখ</th>
                        <th className="border border-slate-300 p-2 text-left">প্রাপক ব্যাংক ও শাখা</th>
                        <th className="border border-slate-300 p-2 text-center">পরিশোধের মাস</th>
                        <th className="border border-slate-300 p-2 text-center">স্টাফ সংখ্যা</th>
                        <th className="border border-slate-300 p-2 text-right font-bold bg-blue-50">মোট অর্থ (৳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankLetters.map((l, idx) => (
                        <tr key={l.id} className="border-b border-slate-200">
                          <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-mono font-bold text-blue-900">{l.memoNumber}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{l.letterDate}</td>
                          <td className="border border-slate-300 p-2">{l.bankName}, {l.branchName}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{l.paymentMonth}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold">{l.staffCount} জন</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold bg-blue-50/50 text-blue-950">
                            ৳ {l.totalAmount?.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })()}

          {/* REPORT 10: UNPAID / PENDING SALARY */}
          {selectedReport === 'UNPAID_PENDING_SALARY' && (() => {
            const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');
            const paidStaffIds = new Set(
              staffPayments
                .filter((p) => p.month === filterMonth && p.status !== 'CANCELLED')
                .map((p) => p.staffId)
            );

            const unpaidList = activeStaff.filter((s) => !paidStaffIds.has(s.id));
            const totalUnpaid = unpaidList.reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 pb-1">
                  <span>মাস: <strong className="text-slate-900 font-bold">{filterMonth}</strong> — বকেয়া / অপরিশোধিত স্টাফ: <strong className="text-rose-700 font-bold">{unpaidList.length} জন</strong></span>
                  <span>মোট বকেয়া দায়ভার: <strong className="text-rose-800 font-bold">৳ {totalUnpaid.toLocaleString('en-IN')}</strong></span>
                </div>

                {unpaidList.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-bold text-sm">
                    ✓ চমৎকার! {filterMonth} মাসের সকল কর্মরত ইমাম ও স্টাফদের বেতন সম্পূর্ণ পরিশোধিত রয়েছে। কোনো বকেয়া নেই।
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-rose-50 text-rose-950 font-bold border-b border-rose-200">
                        <th className="border border-slate-300 p-2 text-center w-8">ক্র.</th>
                        <th className="border border-slate-300 p-2 text-left">আইডি ও নাম</th>
                        <th className="border border-slate-300 p-2 text-left">পদবি</th>
                        <th className="border border-slate-300 p-2 text-left">মোবাইল</th>
                        <th className="border border-slate-300 p-2 text-right">নির্ধারিত মাসিক হাদিয়া (৳)</th>
                        <th className="border border-slate-300 p-2 text-left">ব্যাংক ও হিসাব নম্বর</th>
                        <th className="border border-slate-300 p-2 text-center">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidList.map((s, idx) => (
                        <tr key={s.id} className="border-b border-slate-200">
                          <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <span className="font-bold text-slate-900 block">{s.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{s.staffCode}</span>
                          </td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-800">{s.designationBn}</td>
                          <td className="border border-slate-300 p-2 font-mono">{s.phone}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold text-rose-900">
                            ৳ {s.monthlySalary?.toLocaleString('en-IN')}
                          </td>
                          <td className="border border-slate-300 p-2">
                            {s.accountNumber ? `${s.bankName} - ${s.accountNumber}` : 'নগদ গ্রহণ'}
                          </td>
                          <td className="border border-slate-300 p-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                              অপরিশোধিত (Pending)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-rose-100/60 font-bold border-t-2 border-rose-300">
                        <td colSpan={4} className="border border-slate-300 p-2 text-right text-rose-950">সর্বমোট অপরিশোধিত হাদিয়া:</td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-black text-rose-950">
                          ৳ {totalUnpaid.toLocaleString('en-IN')}
                        </td>
                        <td colSpan={2} className="border border-slate-300 p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            );
          })()}

          {/* Standard Official Dual Signatures */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs font-semibold text-slate-800">
            <div className="space-y-1">
              <div className="w-48 border-t border-slate-900 mx-auto pt-1"></div>
              <p className="font-bold font-siliguri">কোষাধ্যক্ষ / হিসাবরক্ষক</p>
              <p className="text-[10px] text-slate-500 font-medium">মসজিদ পরিচালনা কমিটি</p>
            </div>
            <div className="space-y-1">
              <div className="w-48 border-t border-slate-900 mx-auto pt-1"></div>
              <p className="font-bold font-siliguri">সাধারণ সম্পাদক / সভাপতি</p>
              <p className="text-[10px] text-slate-500 font-medium">মসজিদ পরিচালনা কমিটি</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

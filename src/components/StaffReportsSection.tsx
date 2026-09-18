import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  Search,
  Users,
  Coins,
  DollarSign,
  Gift,
  Briefcase,
  FolderOpen,
  CalendarCheck,
  Building,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Staff, StaffPayment, Mosque } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';

interface StaffReportsSectionProps {
  staffList: Staff[];
  staffPayments: StaffPayment[];
  currentMosque?: Mosque | null;
  language: Language;
}

export const StaffReportsSection: React.FC<StaffReportsSectionProps> = ({
  staffList = [],
  staffPayments = [],
  currentMosque,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  const [reportType, setReportType] = useState<string>('SALARY_SHEET');
  const [dateFilter, setDateFilter] = useState<'CURRENT_MONTH' | 'LAST_MONTH' | 'CURRENT_YEAR' | 'ALL' | 'CUSTOM'>('CURRENT_MONTH');
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);

  // Quick date presets
  const handlePreset = (preset: 'CURRENT_MONTH' | 'LAST_MONTH' | 'CURRENT_YEAR' | 'ALL') => {
    setDateFilter(preset);
    const now = new Date();
    if (preset === 'CURRENT_MONTH') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]);
    } else if (preset === 'CURRENT_YEAR') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('2020-01-01');
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Filter staff list
  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');

  // Print report
  const handlePrint = () => {
    printElement('printable-hr-reports-container', {
      title: `এইচআর_রিপোর্ট_${reportType}_${new Date().toISOString().split('T')[0]}`,
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    let exportData: any[] = [];
    let fileName = `MasjidLedger_HR_Report_${reportType}`;

    if (reportType === 'SALARY_SHEET') {
      exportData = activeStaff.map((s, idx) => ({
        'ক্রমিক': idx + 1,
        'নাম': s.fullNameBn || s.name,
        'পদবী': s.designationBn,
        'মূল বেতন': s.monthlySalary || s.basicSalary || 0,
        'ভাতা': s.allowance || 0,
        'সর্বমোট': (s.monthlySalary || s.basicSalary || 0) + (s.allowance || 0),
        'ব্যাংক অ্যাকাউন্ট': s.accountNumber || 'নগদ',
      }));
    } else if (reportType === 'ATTENDANCE_SUMMARY') {
      exportData = activeStaff.map((s, idx) => ({
        'ক্রমিক': idx + 1,
        'নাম': s.fullNameBn || s.name,
        'পদবী': s.designationBn,
        'হাজিরা রেকর্ড সংখ্যা': s.attendanceRecords?.length || 0,
        'ছুটি রেকর্ড সংখ্যা': s.leaveRecords?.length || 0,
      }));
    } else if (reportType === 'ADVANCE_STATEMENT') {
      const advs: any[] = [];
      staffList.forEach((s) => {
        (s.advanceRecords || []).forEach((a, aIdx) => {
          advs.push({
            'ক্রমিক': advs.length + 1,
            'কর্মী': s.fullNameBn || s.name,
            'পদবী': s.designationBn,
            'তারিখ': a.advanceDate,
            'টাকার পরিমাণ': a.amount,
            'সমন্বয়কৃত': a.adjustedAmount || 0,
            'অবশিষ্ট': a.outstandingAmount,
            'স্ট্যাটাস': a.status === 'ACTIVE' ? 'বকেয়া' : 'সমন্বয় সম্পন্ন',
          });
        });
      });
      exportData = advs;
    } else {
      exportData = activeStaff.map((s, idx) => ({
        'ক্রমিক': idx + 1,
        'কর্মী কোড': s.staffCode || s.id,
        'নাম': s.fullNameBn || s.name,
        'পদবী': s.designationBn,
        'মোবাইল': s.phone,
        'যোগদান': s.joiningDate,
        'মাসিক বেতন': (s.monthlySalary || s.basicSalary || 0) + (s.allowance || 0),
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Report Selector Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>ইমাম ও কর্মী রিপোর্ট ও বিবরণী কেন্দ্র</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            হাজিরা, বেতন বিবরণী, ছুটি ও অগ্রিম আর্থিক স্টেটমেন্টের সমন্বিত রিপোর্ট
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Filter and Category Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">রিপোর্টের ধরণ নির্বাচন করুন</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
            >
              <option value="SALARY_SHEET">১. মাসিক কর্মকর্তা ও কর্মচারী বেতন বিবরণী</option>
              <option value="MASTER_REGISTER">২. কর্মী মাস্টার রেজিস্টার ও প্রোফাইল সারাংশ</option>
              <option value="ATTENDANCE_SUMMARY">৩. হাজিরা ও ছুটি সংক্ষেপ রিপোর্ট</option>
              <option value="ADVANCE_STATEMENT">৪. কর্মী অগ্রিম ও ঋণ হিসাব স্টেটমেন্ট</option>
              <option value="FESTIVAL_BONUS">৫. ঈদ ও উৎসব ভাতা বিতরণ তালিকা</option>
              <option value="DOCUMENTS_REGISTER">৬. Google Drive নথি সংরক্ষণ রেজিস্টার</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">কর্মী ফিল্টার</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
            >
              <option value="ALL">সকল কর্মী (সবার একত্রে)</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullNameBn || s.name} ({s.designationBn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">তারিখ পরিসীমা দ্রুত নির্বাচন</label>
            <div className="flex items-center space-x-1">
              {(['CURRENT_MONTH', 'LAST_MONTH', 'CURRENT_YEAR', 'ALL'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    dateFilter === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p === 'CURRENT_MONTH' ? 'চলতি মাস' : p === 'LAST_MONTH' ? 'গত মাস' : p === 'CURRENT_YEAR' ? 'চলতি বছর' : 'সব'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Data Preview Table Container */}
      <div id="printable-hr-reports-container" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 font-sans">
        {/* Printable Header with Letterhead System */}
        {includeLetterhead ? (
          <MosqueOfficialLetterhead
            mosque={currentMosque}
            documentTitle={
              reportType === 'SALARY_SHEET'
                ? 'মাসিক কর্মকর্তা ও কর্মচারী বেতন বিবরণী'
                : reportType === 'MASTER_REGISTER'
                ? 'কর্মী মাস্টার রেজিস্টার'
                : reportType === 'ATTENDANCE_SUMMARY'
                ? 'হাজিরা ও ছুটি বিবরণী'
                : reportType === 'ADVANCE_STATEMENT'
                ? 'অগ্রিম ও ঋণ স্টেটমেন্ট'
                : reportType === 'FESTIVAL_BONUS'
                ? 'উৎসব ভাতা বিবরণী'
                : 'নথি সংরক্ষণ রেজিস্টার'
            }
            dateStr={`${formatDate(startDate, language)} হতে ${formatDate(endDate, language)}`}
          />
        ) : (
          <div className="text-center pb-4 border-b border-slate-300 mb-6">
            <h2 className="text-lg font-bold font-siliguri text-slate-800">
              {reportType === 'SALARY_SHEET'
                ? 'মাসিক কর্মকর্তা ও কর্মচারী বেতন বিবরণী'
                : reportType === 'MASTER_REGISTER'
                ? 'কর্মী মাস্টার রেজিস্টার'
                : reportType === 'ATTENDANCE_SUMMARY'
                ? 'হাজিরা ও ছুটি বিবরণী'
                : reportType === 'ADVANCE_STATEMENT'
                ? 'অগ্রিম ও ঋণ স্টেটমেন্ট'
                : reportType === 'FESTIVAL_BONUS'
                ? 'উৎসব ভাতা বিবরণী'
                : 'নথি সংরক্ষণ রেজিস্টার'}
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              তারিখ: {formatDate(startDate, language)} হতে {formatDate(endDate, language)}
            </span>
          </div>
        )}

        {/* Dynamic Table based on Report Type */}
        {reportType === 'SALARY_SHEET' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-2.5 border border-slate-300 text-center">ক্রমিক</th>
                  <th className="p-2.5 border border-slate-300">নাম ও পদবী</th>
                  <th className="p-2.5 border border-slate-300 font-mono">মূল বেতন</th>
                  <th className="p-2.5 border border-slate-300 font-mono">ভাতা</th>
                  <th className="p-2.5 border border-slate-300 font-mono font-bold">সর্বমোট প্রদেয়</th>
                  <th className="p-2.5 border border-slate-300">ব্যাংক হিসাব নম্বর</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeStaff.map((s, idx) => {
                  const basic = s.monthlySalary || s.basicSalary || 0;
                  const allowance = s.allowance || 0;
                  return (
                    <tr key={s.id}>
                      <td className="p-2.5 border border-slate-300 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 border border-slate-300 font-bold font-siliguri">
                        {s.fullNameBn || s.name} ({s.designationBn})
                      </td>
                      <td className="p-2.5 border border-slate-300 font-mono">{formatCurrency(basic, language)}</td>
                      <td className="p-2.5 border border-slate-300 font-mono text-emerald-600">+{formatCurrency(allowance, language)}</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold text-indigo-900">
                        {formatCurrency(basic + allowance, language)}
                      </td>
                      <td className="p-2.5 border border-slate-300 font-mono text-slate-700">{s.accountNumber || 'নগদ'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'MASTER_REGISTER' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="p-2.5 border border-slate-300">আইডি</th>
                  <th className="p-2.5 border border-slate-300">নাম (বাংলা ও ইংরেজি)</th>
                  <th className="p-2.5 border border-slate-300">পদবী</th>
                  <th className="p-2.5 border border-slate-300">মোবাইল</th>
                  <th className="p-2.5 border border-slate-300">যোগদান</th>
                  <th className="p-2.5 border border-slate-300">মাসিক সর্বমোট</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2.5 border border-slate-300 font-mono">#{s.staffCode || s.id}</td>
                    <td className="p-2.5 border border-slate-300 font-bold font-siliguri">
                      {s.fullNameBn || s.name} ({s.name})
                    </td>
                    <td className="p-2.5 border border-slate-300">{s.designationBn}</td>
                    <td className="p-2.5 border border-slate-300 font-mono">{s.phone}</td>
                    <td className="p-2.5 border border-slate-300">{formatDate(s.joiningDate, language)}</td>
                    <td className="p-2.5 border border-slate-300 font-bold">
                      {formatCurrency((s.monthlySalary || 0) + (s.allowance || 0), language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'ADVANCE_STATEMENT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="p-2.5 border border-slate-300">কর্মী</th>
                  <th className="p-2.5 border border-slate-300">পদবী</th>
                  <th className="p-2.5 border border-slate-300">তারিখ</th>
                  <th className="p-2.5 border border-slate-300">অগ্রিমের পরিমাণ</th>
                  <th className="p-2.5 border border-slate-300">সমন্বয়কৃত</th>
                  <th className="p-2.5 border border-slate-300">অবশিষ্ট পাওনা</th>
                  <th className="p-2.5 border border-slate-300">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.flatMap((s) =>
                  (s.advanceRecords || []).map((a) => (
                    <tr key={a.id}>
                      <td className="p-2.5 border border-slate-300 font-bold font-siliguri">{s.fullNameBn || s.name}</td>
                      <td className="p-2.5 border border-slate-300">{s.designationBn}</td>
                      <td className="p-2.5 border border-slate-300">{formatDate(a.advanceDate, language)}</td>
                      <td className="p-2.5 border border-slate-300 font-mono">{formatCurrency(a.amount, language)}</td>
                      <td className="p-2.5 border border-slate-300 font-mono text-emerald-600">{formatCurrency(a.adjustedAmount || 0, language)}</td>
                      <td className="p-2.5 border border-slate-300 font-mono font-bold text-purple-700">{formatCurrency(a.outstandingAmount, language)}</td>
                      <td className="p-2.5 border border-slate-300">{a.status === 'ACTIVE' ? 'বকেয়া' : 'সমন্বয় সম্পন্ন'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'DOCUMENTS_REGISTER' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="p-2.5 border border-slate-300">কর্মী</th>
                  <th className="p-2.5 border border-slate-300">নথির শিরোনাম ও ধরণ</th>
                  <th className="p-2.5 border border-slate-300">সংযুক্তির তারিখ</th>
                  <th className="p-2.5 border border-slate-300">Google Drive লিংক অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.flatMap((s) =>
                  (s.documents || []).map((d) => (
                    <tr key={d.id}>
                      <td className="p-2.5 border border-slate-300 font-bold font-siliguri">{s.fullNameBn || s.name}</td>
                      <td className="p-2.5 border border-slate-300">{d.title} ({d.category})</td>
                      <td className="p-2.5 border border-slate-300">{formatDate(d.uploadedAt, language)}</td>
                      <td className="p-2.5 border border-slate-300 text-indigo-700 font-semibold">Google Drive লিংক সংযুক্ত</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Printable Signatures */}
        <div className="mt-16 pt-6 border-t border-slate-300 flex justify-between text-xs text-center">
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">হিসাবরক্ষক</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">সাধারণ সম্পাদক</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">সভাপতি / মোতওয়াল্লী</div>
          </div>
        </div>
      </div>
    </div>
  );
};

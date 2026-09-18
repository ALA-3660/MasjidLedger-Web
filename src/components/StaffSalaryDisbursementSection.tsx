import React, { useState, useMemo } from 'react';
import {
  Banknote,
  DollarSign,
  Calendar,
  Printer,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  Eye,
  Filter,
  Search,
  Building,
  CreditCard,
  FileCheck2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Staff, StaffPayment, FinancialAccount, Mosque } from '../types';
import { Language, formatCurrency, formatDate, formatBengaliMonthYear } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';

interface StaffSalaryDisbursementSectionProps {
  staffList: Staff[];
  staffPayments: StaffPayment[];
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  onOpenPayModal: (staffId: string) => void;
  onPrintSlip: (payment: StaffPayment, staff: Staff) => void;
  onOpenResolutionModal?: (paymentId?: string, month?: string) => void;
  language: Language;
}

export const StaffSalaryDisbursementSection: React.FC<StaffSalaryDisbursementSectionProps> = ({
  staffList = [],
  staffPayments = [],
  accounts = [],
  currentMosque,
  onOpenPayModal,
  onPrintSlip,
  onOpenResolutionModal,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  // Current Month default
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7); // e.g. "2026-08"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);

  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE');

  // Compute breakdown for selected month for each staff
  const staffSalaryRows = useMemo(() => {
    return activeStaff.map((staff) => {
      const payment = staffPayments.find(
        (p) => (p.paymentMonth === selectedMonth || p.month === selectedMonth) && p.staffId === staff.id && p.status !== 'CANCELLED'
      );

      const basic = staff.monthlySalary || staff.basicSalary || 0;
      const allowance = staff.allowance || 0;
      const gross = basic + allowance;
      const deduction = payment ? payment.deduction || 0 : 0;
      const netPayable = payment ? payment.netPayable : gross;
      const isPaid = Boolean(payment);

      return {
        staff,
        payment,
        basic,
        allowance,
        gross,
        deduction,
        netPayable,
        isPaid,
      };
    });
  }, [activeStaff, staffPayments, selectedMonth]);

  // Filtered
  const filteredRows = useMemo(() => {
    return staffSalaryRows.filter((row) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        row.staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.staff.fullNameBn && row.staff.fullNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (row.staff.designationBn && row.staff.designationBn.includes(searchQuery));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && row.isPaid) ||
        (statusFilter === 'UNPAID' && !row.isPaid);

      return matchesSearch && matchesStatus;
    });
  }, [staffSalaryRows, searchQuery, statusFilter]);

  // Total summary
  const totalGross = staffSalaryRows.reduce((sum, r) => sum + r.gross, 0);
  const totalPaid = staffSalaryRows.filter((r) => r.isPaid).reduce((sum, r) => sum + (r.payment?.netPayable || r.netPayable), 0);
  const totalDue = totalGross - totalPaid;
  const paidCount = staffSalaryRows.filter((r) => r.isPaid).length;

  // Print Salary Sheet
  const handlePrint = () => {
    printElement('printable-staff-salary-sheet', {
      title: `মাসিক_বেতন_বিবরণী_${selectedMonth}`,
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredRows.map((r, idx) => ({
      'ক্রমিক': idx + 1,
      'কর্মী আইডি': r.staff.staffCode || r.staff.id,
      'নাম': r.staff.fullNameBn || r.staff.name,
      'পদবী': r.staff.designationBn,
      'মূল বেতন': r.basic,
      'ভাতা': r.allowance,
      'মোট প্রদেয়': r.gross,
      'কর্তন': r.deduction,
      'নিট প্রদেয়': r.netPayable,
      'পরিশোধ স্ট্যাটাস': r.isPaid ? 'পরিশোধিত' : 'বকেয়া',
      'পরিশোধ তারিখ': r.payment ? formatDate(r.payment.paymentDate, language) : '-',
      'ভাউচার নম্বর': r.payment?.voucherNumber || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SalarySheet');
    XLSX.writeFile(wb, `MasjidLedger_Salary_Sheet_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Banknote className="w-5 h-5 text-indigo-600" />
            <span>মাসিক বেতন ও পরিশোধ বিবরণী</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            মাসভিত্তিক বেতন বিল প্রস্তুতকরণ, পে-স্লিপ প্রিন্ট ও সরাসরি পরিশোধ রেজিস্টার
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Input with Bengali Label */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            />
            <span className="text-indigo-800 font-extrabold font-siliguri border-l border-slate-300 pl-2">
              {formatBengaliMonthYear(selectedMonth)}
            </span>
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
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>স্যালারি শিট প্রিন্ট</span>
          </button>

          {onOpenResolutionModal && (
            <button
              type="button"
              onClick={() => onOpenResolutionModal(undefined, selectedMonth)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
              title="নগদ বেতন পরিশোধের রেজুলেশন প্রস্তুত করুন"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-300" />
              <span>নগদ বেতন রেজুলেশন</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">মোট বাজেট (গ্রস)</span>
          <div className="text-lg font-bold text-slate-900 font-siliguri mt-0.5">{formatCurrency(totalGross, language)}</div>
          <span className="text-[10px] text-slate-400">মোট সক্রিয়: {activeStaff.length} জন</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">পরিশোধিত</span>
          <div className="text-lg font-bold text-emerald-700 font-siliguri mt-0.5">{formatCurrency(totalPaid, language)}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">{paidCount} জনের বেতন পরিশোধ সম্পন্ন</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-600 uppercase">বকেয়া / অপ্রদত্ত</span>
          <div className="text-lg font-bold text-rose-700 font-siliguri mt-0.5">{formatCurrency(totalDue, language)}</div>
          <span className="text-[10px] text-rose-500 font-semibold">{activeStaff.length - paidCount} জন বাকি</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-600 uppercase">পরিশোধ অগ্রগতি</span>
          <div className="text-lg font-bold text-indigo-900 font-siliguri mt-0.5">
            {activeStaff.length > 0 ? Math.round((paidCount / activeStaff.length) * 100) : 0}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all"
              style={{ width: `${activeStaff.length > 0 ? (paidCount / activeStaff.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কর্মী খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              পরিশোধিত ({paidCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'UNPAID' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              বকেয়া ({activeStaff.length - paidCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">কর্মী ও আইডি</th>
                <th className="p-3.5">পদবী</th>
                <th className="p-3.5 font-mono">মূল বেতন</th>
                <th className="p-3.5 font-mono">ভাতা</th>
                <th className="p-3.5 font-mono">মোট প্রদেয়</th>
                <th className="p-3.5 font-mono">কর্তন</th>
                <th className="p-3.5 font-mono font-bold">নিট প্রদেয়</th>
                <th className="p-3.5">স্ট্যাটাস</th>
                <th className="p-3.5 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.staff.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <span className="font-bold text-slate-900 block font-siliguri">{row.staff.fullNameBn || row.staff.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">#{row.staff.staffCode || row.staff.id}</span>
                  </td>
                  <td className="p-3.5 text-indigo-900 font-bold font-siliguri">{row.staff.designationBn}</td>
                  <td className="p-3.5 font-mono text-slate-700">{formatCurrency(row.basic, language)}</td>
                  <td className="p-3.5 font-mono text-emerald-600">+{formatCurrency(row.allowance, language)}</td>
                  <td className="p-3.5 font-mono font-bold text-slate-800">{formatCurrency(row.gross, language)}</td>
                  <td className="p-3.5 font-mono text-rose-600">-{formatCurrency(row.deduction, language)}</td>
                  <td className="p-3.5 font-mono font-bold text-indigo-900">{formatCurrency(row.netPayable, language)}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {row.isPaid ? '● পরিশোধিত' : '● বকেয়া'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {row.isPaid && row.payment ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onPrintSlip(row.payment!, row.staff)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>স্লিপ</span>
                          </button>
                          {onOpenResolutionModal && (!row.payment.paymentMethod || row.payment.paymentMethod === 'CASH') && (
                            <button
                              type="button"
                              onClick={() => onOpenResolutionModal(row.payment?.id, selectedMonth)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                              title="নগদ বেতন পরিশোধের রেজুলেশন পত্র"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>রেজুলেশন</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenPayModal(row.staff.id)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>পরিশোধ</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Printable Salary Sheet */}
      <div id="printable-staff-salary-sheet" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        {includeLetterhead ? (
          <MosqueOfficialLetterhead
            mosque={currentMosque}
            documentTitle="মাসিক কর্মকর্তা ও কর্মচারী বেতন বিবরণী"
            dateStr={`বেতন মাস: ${formatBengaliMonthYear(selectedMonth)}`}
          />
        ) : (
          <div className="text-center pb-4 border-b border-slate-300 mb-6">
            <h1 className="text-xl font-bold font-siliguri">মাসিক কর্মকর্তা ও কর্মচারী বেতন বিবরণী</h1>
            <p className="text-xs text-slate-600 mt-1">বেতন মাস: {formatBengaliMonthYear(selectedMonth)}</p>
          </div>
        )}

        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="p-2 border border-slate-300">ক্রমিক</th>
              <th className="p-2 border border-slate-300">নাম (বাংলা)</th>
              <th className="p-2 border border-slate-300">পদবী</th>
              <th className="p-2 border border-slate-300">মূল বেতন</th>
              <th className="p-2 border border-slate-300">ভাতা</th>
              <th className="p-2 border border-slate-300">কর্তন</th>
              <th className="p-2 border border-slate-300">নিট প্রদেয়</th>
              <th className="p-2 border border-slate-300 text-center">স্ট্যাটাস</th>
              <th className="p-2 border border-slate-300 text-right">স্বাক্ষর</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r, idx) => (
              <tr key={r.staff.id} className="border-b border-slate-200">
                <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-2 border border-slate-300 font-bold font-siliguri">{r.staff.fullNameBn || r.staff.name}</td>
                <td className="p-2 border border-slate-300">{r.staff.designationBn}</td>
                <td className="p-2 border border-slate-300">{formatCurrency(r.basic, language)}</td>
                <td className="p-2 border border-slate-300">{formatCurrency(r.allowance, language)}</td>
                <td className="p-2 border border-slate-300">{formatCurrency(r.deduction, language)}</td>
                <td className="p-2 border border-slate-300 font-bold">{formatCurrency(r.netPayable, language)}</td>
                <td className="p-2 border border-slate-300 text-center">{r.isPaid ? 'পরিশোধিত' : 'বকেয়া'}</td>
                <td className="p-2 border border-slate-300"></td>
              </tr>
            ))}
          </tbody>
        </table>

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

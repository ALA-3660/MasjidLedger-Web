import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Calendar, Building, User, CheckCircle2, DollarSign } from 'lucide-react';
import { Staff, StaffPayment, Mosque } from '../types';
import { Language, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';

interface StaffAnnualStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  payments: StaffPayment[];
  initialStaffId?: string;
  currentMosque?: Mosque | null;
  language: Language;
}

export const StaffAnnualStatementModal: React.FC<StaffAnnualStatementModalProps> = ({
  isOpen,
  onClose,
  staffList,
  payments,
  initialStaffId,
  currentMosque,
  language,
}) => {
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    initialStaffId || (staffList.length > 0 ? staffList[0].id : '')
  );
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active', 'print-landscape-active');
    } else {
      document.body.classList.remove('print-modal-active', 'print-landscape-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active', 'print-landscape-active');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('print-modal-active', 'print-landscape-active');
    window.print();
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0] || null;

  // Available years from payments
  const availableYears = Array.from(
    new Set(
      payments
        .map((p) => p.month?.split('-')[0])
        .filter(Boolean)
        .concat([currentYear])
    )
  ).sort().reverse();

  // All 12 months for the selected year
  const months = [
    { num: '01', nameBn: 'জানুয়ারি (Jan)' },
    { num: '02', nameBn: 'ফেব্রুয়ারি (Feb)' },
    { num: '03', nameBn: 'মার্চ (Mar)' },
    { num: '04', nameBn: 'এপ্রিল (Apr)' },
    { num: '05', nameBn: 'মে (May)' },
    { num: '06', nameBn: 'জুন (Jun)' },
    { num: '07', nameBn: 'জুলাই (Jul)' },
    { num: '08', nameBn: 'আগস্ট (Aug)' },
    { num: '09', nameBn: 'সেপ্টেম্বর (Sep)' },
    { num: '10', nameBn: 'অক্টোবর (Oct)' },
    { num: '11', nameBn: 'নভেম্বর (Nov)' },
    { num: '12', nameBn: 'ডিসেম্বর (Dec)' },
  ];

  // Map payments for this staff in this year
  const staffYearPayments = payments.filter((p) => {
    if (p.status === 'CANCELLED') return false;
    if (p.staffId !== selectedStaff?.id) return false;
    return p.month?.startsWith(selectedYear);
  });

  const totalBasicPaid = staffYearPayments.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalBonusPaid = staffYearPayments.reduce((sum, p) => sum + (p.bonus || 0), 0);
  const totalOtherPaid = staffYearPayments.reduce(
    (sum, p) => sum + (p.otherAllowance || (p.allowance > (p.bonus || 0) ? p.allowance - (p.bonus || 0) : 0)),
    0
  );
  const totalDeductions = staffYearPayments.reduce((sum, p) => sum + (p.deduction || 0), 0);
  const totalNetPaid = staffYearPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

  const totalInWords = numberToBanglaWords(totalNetPaid);

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 sm:py-6 overflow-y-auto print-modal-portal">
      {/* Landscape A4 Print Stylesheet Injection */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 8mm 10mm !important;
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 print-modal-card print:max-h-none print:my-0 print:border-none print:shadow-none print:rounded-none">
        {/* Modal Top Toolbar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm font-siliguri">স্টাফভিত্তিক বার্ষিক পেমেন্ট বিবরণী (Annual Statement)</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Staff Selector */}
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold font-baloo focus:ring-0 cursor-pointer max-w-[180px]"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designationBn})
                </option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold font-baloo focus:ring-0 cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  বছর: {yr}
                </option>
              ))}
            </select>

            {/* Letterhead Toggle */}
            <label className="flex items-center space-x-1.5 font-semibold font-siliguri text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 select-none">
              <input
                id="toggle-annual-statement-letterhead"
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>লেটারহেড অন</span>
            </label>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper (A4 Landscape) */}
        <div id="annual-statement-printable" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-slate-900 bg-white font-baloo text-xs print-modal-paper print:p-0 print:overflow-visible print:space-y-4">
          {/* Header Block with Horizontally Centered Mosque Name & Left Logo */}
          {showLetterhead ? (
            <div className="relative pb-4 border-b-2 border-slate-900 text-center">
              {/* Logo Anchored to Left */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                {currentMosque?.logoUrl ? (
                  <img
                    src={currentMosque.logoUrl}
                    alt="Mosque Logo"
                    className="w-14 h-14 object-contain rounded-full border border-slate-200 p-0.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Building className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Centered Mosque Information (100% horizontally centered on the page) */}
              <div className="w-full text-center px-16 sm:px-20 space-y-1">
                <h1 className="text-xl sm:text-2xl font-black font-siliguri text-slate-950 tracking-tight leading-tight">
                  {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ ও ইসলামিক সেন্টার'}
                </h1>
                <p className="text-xs text-slate-600 font-baloo font-medium">
                  {currentMosque?.address || 'ঠিকানা: মসজিদ কমপ্লেক্স'}
                  {currentMosque?.phone ? ` | মোবাইল: ${currentMosque.phone}` : ''}
                  {currentMosque?.registrationNumber ? ` | রেজিঃ নং: ${currentMosque.registrationNumber}` : ''}
                </p>
                <div className="pt-1">
                  <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-md tracking-wider font-siliguri">
                    স্টাফভিত্তিক বার্ষিক সম্মানী ও হাদিয়া বিবরণী — {selectedYear}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-12 pb-3 text-center border-b border-dashed border-slate-300">
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-md tracking-wider font-siliguri">
                স্টাফভিত্তিক বার্ষিক সম্মানী ও হাদিয়া বিবরণী — {selectedYear}
              </div>
            </div>
          )}

          {/* Staff Profile Meta Summary */}
          {selectedStaff && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-baloo text-[11px]">স্টাফের নাম:</span>
                <div className="font-bold text-slate-950 font-siliguri text-sm">{selectedStaff.name}</div>
              </div>
              <div>
                <span className="text-slate-500 font-baloo text-[11px]">পদবি ও মোবাইল:</span>
                <div className="font-semibold text-slate-900 font-baloo">{selectedStaff.designationBn}</div>
                <div className="text-[11px] text-slate-600 font-mono">{selectedStaff.phone}</div>
              </div>
              <div>
                <span className="text-slate-500 font-baloo text-[11px]">নির্ধারিত মাসিক হাদিয়া:</span>
                <div className="font-black text-slate-900 font-mono text-sm">
                  ৳ {selectedStaff.monthlySalary?.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span className="text-slate-500 font-baloo text-[11px]">স্ট্যাটাস ও যোগদান:</span>
                <div className="font-semibold text-emerald-800 font-siliguri">
                  {selectedStaff.status === 'ACTIVE' ? 'সক্রিয় কর্মরত' : 'সাবেক / নিষ্ক্রিয়'}
                </div>
                <div className="text-[10px] text-slate-500 font-baloo">{formatDate(selectedStaff.joiningDate, language)}</div>
              </div>
            </div>
          )}

          {/* 12 Months Breakdown Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 font-siliguri">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-300">মাস</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300">ভাউচার নং</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300">পরিশোধ তারিখ</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">মূল হাদিয়া</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">বোনাস</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">অন্যান্য ভাতা</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">কর্তন</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-right">মোট পরিশোধ</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300">অ্যাকাউন্ট</th>
                  <th className="py-2.5 px-3 text-center">প্রাপ্তি স্বীকার</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-baloo">
                {months.map((m) => {
                  const monthStr = `${selectedYear}-${m.num}`;
                  const pay = staffYearPayments.find((p) => p.month === monthStr);

                  if (!pay) {
                    return (
                      <tr key={m.num} className="hover:bg-slate-50/50 text-slate-400">
                        <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-700">{m.nameBn}</td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center">—</td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center">—</td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right">—</td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right">—</td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right">—</td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-right">—</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-medium text-slate-400">—</td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center">—</td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-400">অপরিশোধিত</td>
                      </tr>
                    );
                  }

                  const basic = pay.basicSalary || 0;
                  const bonus = pay.bonus || 0;
                  const other = pay.otherAllowance || (pay.allowance > bonus ? pay.allowance - bonus : 0);
                  const deduction = pay.deduction || 0;
                  const net = pay.netPaid || (basic + bonus + other - deduction);

                  return (
                    <tr key={m.num} className="hover:bg-slate-50">
                      <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900 font-siliguri">
                        {m.nameBn}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 font-mono font-bold text-rose-700 whitespace-nowrap">
                        {pay.expenseVoucherNumber}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {formatDate(pay.paymentDate, language)}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-slate-800">
                        ৳{basic.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-emerald-700">
                        {bonus > 0 ? `৳${bonus.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-slate-700">
                        {other > 0 ? `৳${other.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-rose-600">
                        {deduction > 0 ? `-৳${deduction.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-950 text-xs">
                        ৳{net.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-slate-600 text-[10px]">
                        {pay.accountNameBn || 'ক্যাশ/ব্যাংক'}
                      </td>
                      <td className="py-2 px-3 text-center text-[10px] text-emerald-800 font-bold">
                        ✓ পরিশোধিত
                      </td>
                    </tr>
                  );
                })}

                {/* Annual Summary Footer Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-950 font-siliguri">
                  <td colSpan={3} className="py-3 px-3 text-right">
                    {selectedYear} সালের সর্বমোট পরিশোধের সংকলন:
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono">
                    ৳{totalBasicPaid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-emerald-800">
                    ৳{totalBonusPaid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono">
                    ৳{totalOtherPaid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-rose-700">
                    -৳{totalDeductions.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-900 text-sm">
                    ৳{totalNetPaid.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={2} className="py-3 px-2 text-center text-[11px] text-slate-600 font-siliguri">
                    মোট {staffYearPayments.length} টি মাস পরিশোধিত
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Bangla Words */}
          {totalNetPaid > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center space-x-2">
              <span className="font-bold whitespace-nowrap font-siliguri">{selectedYear} সালে মোট প্রাপ্তি কথায়:</span>
              <span className="font-siliguri font-semibold text-emerald-900">{totalInWords}</span>
            </div>
          )}

          {/* Signatures Section */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-slate-800 text-xs">
            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center"></div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                সংশ্লিষ্ট স্টাফের স্বাক্ষর
              </div>
              <div className="text-[11px] text-slate-600 font-baloo">({selectedStaff?.name})</div>
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center"></div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                কোষাধ্যক্ষ
              </div>
              <div className="text-[11px] text-slate-600 font-baloo">মসজিদ পরিচালনা কমিটি</div>
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center">
                {currentMosque?.presidentSignatureUrl ? (
                  <img
                    src={currentMosque.presidentSignatureUrl}
                    alt="President Signature"
                    className="max-h-10 object-contain mx-auto"
                  />
                ) : currentMosque?.secretarySignatureUrl ? (
                  <img
                    src={currentMosque.secretarySignatureUrl}
                    alt="Secretary Signature"
                    className="max-h-10 object-contain mx-auto"
                  />
                ) : null}
              </div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                সাধারণ সম্পাদক / সভাপতি
              </div>
              <div className="text-[11px] text-slate-600 font-baloo">মসজিদ পরিচালনা কমিটি</div>
            </div>
          </div>

          {/* Footer Watermark */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100 flex items-center justify-between font-baloo">
            <span>MasjidLedger ডিজিটাল মসজিদ ব্যবস্থাপনা সিস্টেম</span>
            <span>প্রিন্ট সময়: {new Date().toLocaleString('bn-BD')}</span>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Specially Styled & Fully Visible) */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden print-controls-bar no-print z-10">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-baloo">স্টাফ:</span>
            <span className="font-bold text-white font-siliguri">{selectedStaff?.name} ({selectedStaff?.designationBn})</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-baloo">{selectedYear} সালে মোট পরিশোধ:</span>
            <span className="font-mono font-bold text-emerald-400">৳{totalNetPaid.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold font-siliguri transition-colors cursor-pointer"
            >
              বাতিল / বন্ধ করুন
            </button>
            <button
              type="button"
              id="btn-print-annual-statement"
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold font-siliguri rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন (A4 Landscape)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

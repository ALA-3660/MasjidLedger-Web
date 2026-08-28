import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, DollarSign, Building, Filter, Calendar, Users } from 'lucide-react';
import { Staff, StaffPayment, Mosque } from '../types';
import { Language, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';

interface StaffPaymentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  payments: StaffPayment[];
  currentMosque?: Mosque | null;
  language: Language;
}

export const StaffPaymentRegisterModal: React.FC<StaffPaymentRegisterModalProps> = ({
  isOpen,
  onClose,
  staffList,
  payments,
  currentMosque,
  language,
}) => {
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

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

  // Get unique months from payments
  const availableMonths = Array.from(new Set(payments.map((p) => p.month))).filter(Boolean).sort().reverse();

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (p.status === 'CANCELLED') return false;

    if (selectedMonth !== 'ALL' && p.month !== selectedMonth) return false;
    if (selectedStaffId !== 'ALL' && p.staffId !== selectedStaffId) return false;

    if (fromDate && p.paymentDate < fromDate) return false;
    if (toDate && p.paymentDate > toDate) return false;

    return true;
  });

  // Calculate totals
  const totalBasic = filteredPayments.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalBonus = filteredPayments.reduce((sum, p) => sum + (p.bonus || 0), 0);
  const totalOther = filteredPayments.reduce((sum, p) => sum + (p.otherAllowance || (p.allowance > (p.bonus || 0) ? p.allowance - (p.bonus || 0) : 0)), 0);
  const totalDeduction = filteredPayments.reduce((sum, p) => sum + (p.deduction || 0), 0);
  const totalNetPaid = filteredPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);

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
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm font-siliguri">বেতন ও হাদিয়া প্রদান রেজিস্টার প্রিন্ট (Payment Register)</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold font-baloo focus:ring-0 cursor-pointer"
            >
              <option value="ALL">সকল মাস</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  মাস: {m}
                </option>
              ))}
            </select>

            {/* Staff Filter */}
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-semibold font-baloo focus:ring-0 cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">সকল স্টাফ</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.designationBn})
                </option>
              ))}
            </select>

            {/* Letterhead Toggle */}
            <label className="flex items-center space-x-1.5 font-semibold font-siliguri text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 select-none">
              <input
                id="toggle-payment-register-letterhead"
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
        <div id="payment-register-printable" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-slate-900 bg-white font-baloo text-xs print-modal-paper print:p-0 print:overflow-visible print:space-y-4">
          {/* Header Block with Centered Mosque Name and Left-Anchored Logo */}
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
                    বেতন ও হাদিয়া প্রদান রেজিস্টার (SALARY & HAADIA PAYMENT REGISTER)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-12 pb-3 text-center border-b border-dashed border-slate-300">
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-md tracking-wider font-siliguri">
                বেতন ও হাদিয়া প্রদান রেজিস্টার (SALARY & HAADIA PAYMENT REGISTER)
              </div>
            </div>
          )}

          {/* Meta Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-slate-500 font-baloo">বিবেচ্য মাস/পিরিয়ড: </span>
                <strong className="text-slate-900 font-siliguri">{selectedMonth === 'ALL' ? 'সকল রেকর্ড' : selectedMonth}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-baloo">প্রিন্ট তারিখ: </span>
                <strong className="text-slate-900 font-siliguri">{formatDate(new Date().toISOString(), language)}</strong>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-right">
              <span className="text-slate-600 font-baloo">
                মোট ভাউচার: <strong className="font-siliguri">{filteredPayments.length}</strong> টি | সর্বমোট পরিশোধ: <strong className="font-mono text-emerald-900">৳{totalNetPaid.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          {/* Payments Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 font-siliguri">
                <tr>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-center w-8">ক্র.নং</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300">ভাউচার নং</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300">তারিখ</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">স্টাফের নাম ও পদবি</th>
                  <th className="py-2.5 px-2 border-r border-slate-300 text-center">মাস</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">মূল হাদিয়া</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">বোনাস</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">অন্যান্য ভাতা</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right">কর্তন</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-right">নিট পরিশোধ</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300">অ্যাকাউন্ট</th>
                  <th className="py-2.5 px-3 text-center w-28">প্রাপকের স্বাক্ষর</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-baloo">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500 font-medium">
                      কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay, idx) => {
                    const basic = pay.basicSalary || 0;
                    const bonus = pay.bonus || 0;
                    const other = pay.otherAllowance || (pay.allowance > bonus ? pay.allowance - bonus : 0);
                    const deduction = pay.deduction || 0;
                    const net = pay.netPaid || (basic + bonus + other - deduction);

                    return (
                      <tr key={pay.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 font-mono font-bold text-rose-700 whitespace-nowrap">
                          {pay.expenseVoucherNumber}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                          {formatDate(pay.paymentDate, language)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-950 font-siliguri">
                          <div>{pay.staffName}</div>
                          <div className="text-[10px] text-slate-500 font-normal font-baloo">{pay.designationBn}</div>
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-semibold text-slate-800 whitespace-nowrap">
                          {pay.month}
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
                          {pay.accountNameBn || (pay.paymentMethod === 'BANK' ? 'ব্যাংক' : 'ক্যাশ')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {/* Blank space for physical signature */}
                          <div className="h-6 border-b border-dotted border-slate-300"></div>
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Summary Row */}
                {filteredPayments.length > 0 && (
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-950 font-siliguri">
                    <td colSpan={5} className="py-3 px-3 text-right">
                      সর্বমোট পরিশোধের সমষ্টি:
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono">
                      ৳{totalBasic.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono text-emerald-800">
                      ৳{totalBonus.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono">
                      ৳{totalOther.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono text-rose-700">
                      -৳{totalDeduction.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-900 text-sm">
                      ৳{totalNetPaid.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} className="py-3 px-2 text-center text-[11px] text-slate-600 font-siliguri">
                      {filteredPayments.length} টি ভাউচার
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total in Bangla Words */}
          {totalNetPaid > 0 && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center space-x-2">
              <span className="font-bold whitespace-nowrap font-siliguri">সর্বমোট পরিশোধিত টাকা কথায়:</span>
              <span className="font-siliguri font-semibold text-emerald-900">{totalInWords}</span>
            </div>
          )}

          {/* Signatures Section */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-slate-800 text-xs">
            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center"></div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                প্রস্তুতকারী / হিসাবরক্ষক
              </div>
              <div className="text-[11px] text-slate-600 font-baloo">মসজিদ কার্যালয়</div>
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

        {/* Modal Bottom Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-baloo">মোট ভাউচার:</span>
            <span className="font-bold text-white font-siliguri">{filteredPayments.length} টি</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-baloo">সর্বমোট পরিশোধ:</span>
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
              id="btn-print-payment-register"
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-siliguri rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
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

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, CheckCircle, Building, Phone, Mail, FileText, Check } from 'lucide-react';
import { Staff, StaffPayment, Mosque } from '../types';
import { Language, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';

interface StaffSalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  payment: StaffPayment | null;
  currentMosque?: Mosque | null;
  language: Language;
}

export const StaffSalarySlipModal: React.FC<StaffSalarySlipModalProps> = ({
  isOpen,
  onClose,
  staff,
  payment,
  currentMosque,
  language,
}) => {
  const [showLetterhead, setShowLetterhead] = useState(true);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active');
    } else {
      document.body.classList.remove('print-modal-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active');
    };
  }, [isOpen]);

  if (!isOpen || !staff || !payment) return null;

  const handlePrint = () => {
    document.body.classList.add('print-modal-active');
    window.print();
  };

  const basic = payment.basicSalary || staff.monthlySalary || 0;
  const bonus = payment.bonus || 0;
  const other = payment.otherAllowance || (payment.allowance > bonus ? payment.allowance - bonus : 0);
  const deduction = payment.deduction || 0;
  const netPaid = payment.netPaid || (basic + bonus + other - deduction);

  const amountInWords = numberToBanglaWords(netPaid);

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print-modal-portal">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 print-modal-card">
        {/* Modal Toolbar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm font-siliguri">স্টাফ বেতন ও সম্মানী পরিশোধ রসিদ (Payment Slip)</h3>
          </div>

          <div className="flex items-center space-x-3">
            {/* Letterhead Toggle */}
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 select-none">
              <input
                id="toggle-salary-slip-letterhead"
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>লেটারহেড / লোগো অন</span>
            </label>

            {/* Print Button */}
            <button
              id="btn-print-salary-slip"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন (Print Slip)</span>
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

        {/* Printable Slip Paper (A4 Optimized) */}
        <div id="salary-slip-printable" className="p-8 sm:p-10 space-y-6 text-slate-900 bg-white font-sans text-xs print-modal-paper print:p-8">
          {/* Header Block */}
          {showLetterhead ? (
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
              <div className="flex items-center justify-center space-x-3">
                {currentMosque?.logoUrl ? (
                  <img
                    src={currentMosque.logoUrl}
                    alt="Mosque Logo"
                    className="w-12 h-12 object-contain rounded-full border border-slate-200 p-0.5"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                )}
                <div className="text-left">
                  <h1 className="text-xl font-black font-siliguri text-slate-950">
                    {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ ও ইসলামিক সেন্টার'}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {currentMosque?.address || 'ঠিকানা: মসজিদ কমপ্লেক্স'}
                    {currentMosque?.phone ? ` | মোবাইল: ${currentMosque.phone}` : ''}
                    {currentMosque?.registrationNumber ? ` | রেজিঃ নং: ${currentMosque.registrationNumber}` : ''}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-md tracking-wide font-siliguri">
                  বেতন ও হাদিয়া পরিশোধ রসিদ (SALARY / HAADIA VOUCHER)
                </div>
              </div>
            </div>
          ) : (
            /* Padding for pre-printed letterhead pad */
            <div className="pt-16 pb-2 text-center border-b border-dashed border-slate-300">
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-md tracking-wide font-siliguri">
                বেতন ও হাদিয়া পরিশোধ রসিদ (SALARY / HAADIA VOUCHER)
              </div>
            </div>
          )}

          {/* Top Meta Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-500 font-medium">স্টাফের নাম: </span>
                <strong className="text-slate-950 font-siliguri text-sm">{staff.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">পদবি: </span>
                <strong className="text-slate-900 font-semibold">{staff.designationBn}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">মোবাইল: </span>
                <span className="text-slate-800 font-semibold">{staff.phone}</span>
              </div>
              {staff.nid && (
                <div>
                  <span className="text-slate-500 font-medium">এনআইডি (NID): </span>
                  <span className="text-slate-700 font-mono">{staff.nid}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-right sm:text-left">
              <div>
                <span className="text-slate-500 font-medium">ভাউচার নম্বর: </span>
                <strong className="font-mono text-rose-700 font-bold text-sm">{payment.expenseVoucherNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">পরিশোধের তারিখ: </span>
                <strong className="text-slate-900">{formatDate(payment.paymentDate, language)}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">বেতনের মাস: </span>
                <span className="inline-block bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-[11px]">
                  {payment.month}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">পরিশোধের মাধ্যম: </span>
                <span className="text-slate-800 font-semibold">
                  {payment.paymentMethod === 'BANK'
                    ? 'ব্যাংক ট্রান্সফার'
                    : payment.paymentMethod === 'CHEQUE'
                    ? 'ব্যাংক চেক'
                    : payment.paymentMethod === 'BKASH' || payment.paymentMethod === 'NAGAD' || payment.paymentMethod === 'ROCKET'
                    ? 'মোবাইল ব্যাংকিং'
                    : 'নগদ / ক্যাশ'}
                  {payment.accountNameBn ? ` (${payment.accountNameBn})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-4 font-siliguri">হাদিয়া ও ভাতার বিবরণ (Particulars)</th>
                  <th className="py-2.5 px-4 text-right font-siliguri">পরিমাণ (টাকা)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5 px-4 font-medium text-slate-800">
                    মূল মাসিক হাদিয়া / বেতন (Basic Monthly Haadia / Salary)
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                    ৳ {basic.toLocaleString('en-IN')}
                  </td>
                </tr>

                {bonus > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-emerald-800">
                      ঈদ / বিশেষ হাদিয়া ও বোনাস (Special / Festival Bonus)
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-700 font-mono">
                      + ৳ {bonus.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {other > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-700">
                      অন্যান্য ভাতা / চিকিৎসা / যাতায়াত (Allowances)
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                      + ৳ {other.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {deduction > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-rose-700">
                      অনুপস্থিতি বা অগ্রিম কর্তন (Advance / Deductions)
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600 font-mono">
                      - ৳ {deduction.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-100/80 font-bold text-sm border-t-2 border-slate-300">
                  <td className="py-3 px-4 text-slate-950 font-siliguri">
                    সর্বমোট পরিশোধিত নিট টাকা (Net Payable Amount)
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-900 font-siliguri font-black text-base">
                    ৳ {netPaid.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Bangla Words */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center space-x-2">
            <span className="font-bold text-emerald-900 whitespace-nowrap">কথায় (In Words):</span>
            <span className="font-siliguri font-semibold text-emerald-900">{amountInWords}</span>
          </div>

          {/* Remarks/Notes */}
          {payment.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs">
              <strong className="text-slate-900">বিশেষ মন্তব্য / বিবরণ: </strong> {payment.notes}
            </div>
          )}

          {/* Staff Acknowledgement Box */}
          <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-slate-800 font-bold font-siliguri text-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>স্টাফ প্রাপ্তি স্বীকার (Staff Acknowledgement):</span>
            </div>
            <p className="text-slate-600 text-xs italic">
              "আমি নিশ্চিত করিতেছি যে, উপরিউক্ত {payment.month} মাসের নির্ধারিত বেতন/হাদিয়া বাবদ মোট ৳{netPaid.toLocaleString('en-IN')} ({amountInWords}) সম্পূর্ণ বুঝিয়া পাইলাম এবং গ্রহণ করিলাম।"
            </p>
          </div>

          {/* Signatures Section */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-slate-800 text-xs">
            {/* Staff Recipient Signature */}
            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center">
                {/* Manual signature blank line */}
              </div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                প্রাপকের স্বাক্ষর
              </div>
              <div className="text-[11px] text-slate-600">({staff.name})</div>
              <div className="text-[10px] text-slate-500">তারিখ: .......................</div>
            </div>

            {/* Treasurer / Accountant Signature */}
            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center">
                {/* Auto signature placeholder or seal */}
              </div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                কোষাধ্যক্ষ / হিসাবরক্ষক
              </div>
              <div className="text-[11px] text-slate-600">মসজিদ পরিচালনা কমিটি</div>
            </div>

            {/* General Secretary / President Signature */}
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
              <div className="text-[11px] text-slate-600">মসজিদ পরিচালনা কমিটি</div>
            </div>
          </div>

          {/* Footer Watermark */}
          <div className="text-center text-[10px] text-slate-400 pt-6 border-t border-slate-100 flex items-center justify-between">
            <span>MasjidLedger ডিজিটাল মসজিদ ব্যবস্থাপনা সিস্টেম</span>
            <span>প্রিন্ট সময়: {new Date().toLocaleString('bn-BD')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

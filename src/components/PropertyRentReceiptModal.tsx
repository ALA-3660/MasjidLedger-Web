import React, { useRef, useState } from 'react';
import {
  Printer,
  X,
  Building,
  Receipt,
  CheckCircle2,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  Phone,
  Tag
} from 'lucide-react';
import { MosqueProperty, PropertyRentCollection, MosqueProfile, Mosque } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';

interface PropertyRentReceiptModalProps {
  collection: PropertyRentCollection | null;
  property: MosqueProperty | null;
  mosque: MosqueProfile | Mosque | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const PropertyRentReceiptModal: React.FC<PropertyRentReceiptModalProps> = ({
  collection,
  property,
  mosque,
  isOpen,
  onClose,
  language
}) => {
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !collection) return null;

  const handlePrint = () => {
    window.print();
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'নগদ (Cash)';
      case 'BANK': return 'ব্যাংক জমা / ট্রান্সফার (Bank)';
      case 'BKASH': return 'বিকাশ (bKash)';
      case 'NAGAD': return 'নগদ (Nagad)';
      case 'ROCKET': return 'রকেট (Rocket)';
      case 'CHEQUE': return 'চেক (Cheque)';
      default: return method;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Controls Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">ওয়াকফ সম্পত্তি ভাড়া আদায়ের অফিসিয়াল রসিদ</h3>
              <p className="text-xs text-slate-300">রসিদ নং: {collection.receiptNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              মসজিদ প্যাড / লেটারহেড যুক্ত রাখুন
            </label>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট রসিদ / PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
          <div
            ref={printRef}
            className="w-full max-w-[200mm] mx-auto bg-white p-6 sm:p-8 shadow-lg print:shadow-none print:p-4 border border-slate-200 print:border-none text-slate-900 font-sans"
          >
            {/* Mosque Letterhead Header */}
            {includeLetterhead && (
              <div className="text-center pb-4 border-b-2 border-slate-900 mb-5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {mosque?.nameBn || mosque?.name || 'মসজিদ ওয়াকফ এস্টেট'}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {mosque?.address || 'ঠিকানা: মসজিদ চত্বর'} | মোবাইল: {mosque?.phone || '০১৭XXXXXXXX'}
                </p>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-300 text-[11px] font-bold text-slate-800">
                  ওয়াকফ সম্পত্তি ও এস্টেট ব্যবস্থাপনা শাখা (Waqf Property Estate)
                </div>
              </div>
            )}

            {/* Receipt Title & Meta */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3.5 rounded-xl mb-5">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">ডকুমেন্ট টাইপ</span>
                <h2 className="text-base font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ওয়াকফ সম্পত্তি ভাড়া আদায়ের মূল রসিদ
                </h2>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">
                  রসিদ নং: <strong className="text-slate-900 font-mono text-sm">{collection.receiptNumber}</strong>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  আদায়ের তারিখ: <strong className="text-slate-900">{formatDate(collection.paymentDate, language)}</strong>
                </div>
                {collection.incomeVoucherNumber && (
                  <div className="text-[11px] text-blue-700 font-mono">
                    হিসাব ভাউচার: {collection.incomeVoucherNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Tenant & Property Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  ভাড়াটিয়া / ইজারাদারের তথ্য
                </h4>
                <div className="pt-1 space-y-1">
                  <p><span className="text-slate-500">নাম:</span> <strong className="text-slate-900 font-bold">{collection.tenantName}</strong></p>
                  <p><span className="text-slate-500">আইডি কোড:</span> <span className="font-mono font-semibold text-slate-700">{collection.tenantCode || 'N/A'}</span></p>
                  <p><span className="text-slate-500">দোকান / ইউনিট:</span> <span className="font-semibold text-slate-800">{collection.shopOrUnitNo || 'প্রধান অংশ'}</span></p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  ওয়াকফ সম্পত্তির বিবরণ
                </h4>
                <div className="pt-1 space-y-1">
                  <p><span className="text-slate-500">সম্পত্তির নাম:</span> <strong className="text-slate-900">{collection.propertyName || property?.name}</strong></p>
                  <p><span className="text-slate-500">সম্পত্তি কোড:</span> <span className="font-mono font-semibold text-slate-700">{collection.propertyCode || property?.propertyCode}</span></p>
                  <p><span className="text-slate-500">ভাড়ার মাস/সাল:</span> <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{collection.billingMonth}</span></p>
                </div>
              </div>
            </div>

            {/* Financial Calculation Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden mb-5">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-4">বিবরণ (Particulars)</th>
                    <th className="py-2.5 px-4 text-right">নির্ধারিত টাকা (Amount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td className="py-2.5 px-4 text-slate-800 font-medium">
                      চলতি মাসের নির্ধারিত ভাড়া ({collection.billingMonth})
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(collection.monthlyRent, language)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 text-slate-700">
                      পূর্বের বকেয়া ভাড়া (Previous Due)
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-700">
                      {formatCurrency(collection.previousDue, language)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-2.5 px-4 text-slate-900">
                      মোট প্রদেয় ভাড়া (Total Payable)
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-900">
                      {formatCurrency(collection.totalDue, language)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-900 font-bold text-sm">
                    <td className="py-3 px-4 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      আদায়কৃত মোট অর্থ (Paid Amount)
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-800 text-base font-bold">
                      {formatCurrency(collection.paidAmount, language)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-2.5 px-4 text-slate-700">
                      অবশিষ্ট বকেয়া ব্যালেন্স (Remaining Due)
                    </td>
                    <td className={`py-2.5 px-4 text-right ${collection.remainingDue > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {formatCurrency(collection.remainingDue, language)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-8">
              <div>
                <p><span className="text-slate-500">পরিশোধের মাধ্যম:</span> <strong className="text-slate-800">{getMethodLabel(collection.paymentMethod)}</strong></p>
                {collection.accountName && (
                  <p className="mt-0.5"><span className="text-slate-500">হিসাব খাত:</span> <span className="text-slate-800 font-semibold">{collection.accountName}</span></p>
                )}
              </div>
              <div>
                <p><span className="text-slate-500">আদায়কারী / কর্মকর্তা:</span> <strong className="text-slate-800">{collection.collectorName || 'অফিস ক্যাশিয়ার'}</strong></p>
                {collection.notes && (
                  <p className="mt-0.5"><span className="text-slate-500">মন্তব্য:</span> <span className="text-slate-700 italic">{collection.notes}</span></p>
                )}
              </div>
            </div>

            {/* Official Signatures */}
            <div className="pt-10 grid grid-cols-3 gap-4 text-center text-xs text-slate-700">
              <div>
                <div className="border-t border-slate-400 pt-2 font-bold">ভাড়াটিয়া / প্রদানকারী</div>
                <p className="text-[10px] text-slate-500 mt-0.5">স্বাক্ষর ও তারিখ</p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-2 font-bold">হিসাবরক্ষক / ক্যাশিয়ার</div>
                <p className="text-[10px] text-slate-500 mt-0.5">আদায়কারী কর্মকর্তার স্বাক্ষর</p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-2 font-bold">মোতাওয়াল্লি / সাধারণ সম্পাদক</div>
                <p className="text-[10px] text-slate-500 mt-0.5">অনুমোদন ও সিল</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
              এটি MasjidLedger ক্লাউড সফটওয়্যার কর্তৃক স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত ওয়াকফ ভাড়া রসিদ। সফটওয়্যার আইটি পার্টনার: MasjidLedger Waqf System.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

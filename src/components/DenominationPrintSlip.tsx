import React, { useState } from 'react';
import {
  Printer,
  X,
  Building2,
  CheckCircle2,
  Calendar,
  User,
  Users,
  Coins,
  Banknote,
  FileCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CashDenominationData, Mosque } from '../types';
import { Language, formatDate, formatCurrency } from '../lib/i18n';
import { numberToBengaliWords, NOTE_DENOMINATIONS, COIN_DENOMINATIONS } from './ChangeCalculatorModal';

export interface DenominationPrintSlipProps {
  isOpen: boolean;
  onClose: () => void;
  denominationData: CashDenominationData | null;
  mosque: Mosque | null;
  language?: Language;
  titleBn?: string;
}

export const DenominationPrintSlip: React.FC<DenominationPrintSlipProps> = ({
  isOpen,
  onClose,
  denominationData,
  mosque,
  language = 'bn',
  titleBn = 'নগদ টাকা ও কারেন্সি নোট-মুদ্রা গণনা স্লিপ (Cash Denomination Slip)',
}) => {
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);

  if (!isOpen || !denominationData) return null;

  const handlePrint = () => {
    window.print();
  };

  const {
    noteBreakdown = {},
    coinBreakdown = {},
    totalNotesCount = 0,
    totalCoinsCount = 0,
    totalNotesAmount = 0,
    totalCoinsAmount = 0,
    grandTotal = 0,
    countedBy = '',
    witnesses = [],
    countingDateTime = '',
    collectionType = 'DONATION',
    reference = '',
    notes = '',
  } = denominationData;

  const totalPieces = totalNotesCount + totalCoinsCount;

  const getCollectionTypeLabel = (type?: string) => {
    switch (type) {
      case 'JUMA':
        return 'পবিত্র জুমার জামাত কালেকশন';
      case 'DONATION_BOX':
        return 'মসজিদ দানবাক্স (Box) কালেকশন';
      case 'DONATION':
        return 'সাধারণ দান ও এককালীন অনুদান';
      case 'INCOME':
        return 'সাধারণ আয় ভাউচার';
      case 'WAQF_RENT':
        return 'ওয়াকফ দোকান ও বাড়ি ভাড়া কালেকশন';
      default:
        return 'নগদ ক্যাশ কালেকশন';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto single-invoice-print-wrapper">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto single-invoice-print-card font-sans">
        {/* Print Controls Bar - Hidden on Print */}
        <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center space-x-2 text-xs font-bold font-siliguri">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>ক্যাশ ডিনোমিনেশন প্রিন্ট ভিউ</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIncludeLetterhead(!includeLetterhead)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-siliguri flex items-center space-x-1 border transition-colors cursor-pointer ${
                includeLetterhead
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="লেটারহেড / প্যাড হেড দেখানো বা লুকানো"
            >
              {includeLetterhead ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{includeLetterhead ? 'লেটারহেড: চালু' : 'লেটারহেড: বন্ধ'}</span>
            </button>

            <button
              id="btn-print-denomination-slip"
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-siliguri flex items-center space-x-1 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-5 sm:p-7 bg-white text-slate-900">
          {/* Mosque Letterhead */}
          {includeLetterhead && (
            <div className="border-b-2 border-emerald-900 pb-3 mb-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Building2 className="w-6 h-6 text-emerald-800" />
                <h1 className="text-xl sm:text-2xl font-bold font-siliguri text-emerald-950">
                  {mosque?.nameBn || 'বায়তুল মুকাররম জামে মসজিদ ও কমপ্লেক্স'}
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-siliguri mt-1">
                {mosque?.address || 'কেন্দ্রীয় সড়ক, ঢাকা, বাংলাদেশ'}
                {mosque?.phone && ` • ফোন: ${mosque.phone}`}
                {mosque?.eiinOrRegNo && ` • রেজি/স্মারক নং: ${mosque.eiinOrRegNo}`}
              </p>
            </div>
          )}

          {/* Title and Badge */}
          <div className="text-center mb-4">
            <div className="inline-block bg-slate-100 border border-slate-300 rounded-full px-4 py-1">
              <h2 className="text-sm font-bold font-siliguri text-slate-900">
                ক্যাশ নোট ও মুদ্রা গণনা বিবরণী (Denomination Slip)
              </h2>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-siliguri bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
            <div>
              <span className="text-slate-500">কালেকশনের ধরন: </span>
              <strong className="text-slate-800">{getCollectionTypeLabel(collectionType)}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500">গণনার তারিখ ও সময়: </span>
              <strong className="text-slate-800 font-mono">
                {countingDateTime ? countingDateTime.replace('T', ' ') : formatDate(new Date().toISOString())}
              </strong>
            </div>
            {reference && (
              <div>
                <span className="text-slate-500">রেফারেন্স/ভাউচার নং: </span>
                <strong className="text-slate-800 font-mono">{reference}</strong>
              </div>
            )}
            <div className={reference ? 'text-right' : 'col-span-2'}>
              <span className="text-slate-500">গণনাকারী: </span>
              <strong className="text-slate-800">{countedBy || 'দায়িত্বপ্রাপ্ত প্রতিনিধি'}</strong>
            </div>
            {witnesses && witnesses.length > 0 && (
              <div className="col-span-2 pt-1 border-t border-slate-200">
                <span className="text-slate-500">উপস্থিত সাক্ষীবৃন্দ / কমিটি: </span>
                <strong className="text-slate-800">{witnesses.join(', ')}</strong>
              </div>
            )}
          </div>

          {/* Denomination Breakdowns */}
          <div className="space-y-3 mb-4">
            {/* Notes Table */}
            <div>
              <h3 className="text-xs font-bold font-siliguri text-emerald-950 mb-1 flex items-center space-x-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                <span>ব্যাংক নোট বিবরণী:</span>
              </h3>
              <table className="w-full text-xs border border-slate-300">
                <thead className="bg-slate-100 font-siliguri text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-1 px-2 text-left">নোটের মান</th>
                    <th className="py-1 px-2 text-center">সংখ্যা (টি)</th>
                    <th className="py-1 px-2 text-right">উপমোট টাকা (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {NOTE_DENOMINATIONS.map((denom) => {
                    const qty = noteBreakdown[denom] || 0;
                    const lineTotal = denom * qty;
                    if (qty === 0) return null;
                    return (
                      <tr key={`print-note-${denom}`}>
                        <td className="py-1 px-2 text-left font-bold text-slate-800 font-siliguri">
                          ৳ {denom} টাকার নোট
                        </td>
                        <td className="py-1 px-2 text-center text-slate-900 font-bold">{qty} টি</td>
                        <td className="py-1 px-2 text-right font-bold text-slate-900">
                          ৳ {lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-emerald-50/70 font-bold font-siliguri border-t-2 border-slate-300">
                    <td className="py-1 px-2 text-emerald-950">নোটের সর্বমোট:</td>
                    <td className="py-1 px-2 text-center font-mono text-emerald-950">{totalNotesCount} টি</td>
                    <td className="py-1 px-2 text-right font-mono text-emerald-950">
                      ৳ {totalNotesAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Coins Table (if coins exist) */}
            {totalCoinsCount > 0 && (
              <div>
                <h3 className="text-xs font-bold font-siliguri text-amber-950 mb-1 flex items-center space-x-1">
                  <Coins className="w-3.5 h-3.5 text-amber-700" />
                  <span>ধাতব মুদ্রা / কয়েন বিবরণী:</span>
                </h3>
                <table className="w-full text-xs border border-amber-300">
                  <thead className="bg-amber-50 font-siliguri text-amber-900 font-bold border-b border-amber-300">
                    <tr>
                      <th className="py-1 px-2 text-left">মুদ্রা / কয়েন মান</th>
                      <th className="py-1 px-2 text-center">সংখ্যা (টি)</th>
                      <th className="py-1 px-2 text-right">উপমোট টাকা (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 font-mono">
                    {COIN_DENOMINATIONS.map((denom) => {
                      const qty = coinBreakdown[denom] || 0;
                      const lineTotal = denom * qty;
                      if (qty === 0) return null;
                      return (
                        <tr key={`print-coin-${denom}`}>
                          <td className="py-1 px-2 text-left font-bold text-slate-800 font-siliguri">
                            ৳ {denom} ধাতব কয়েন
                          </td>
                          <td className="py-1 px-2 text-center text-slate-900 font-bold">{qty} টি</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900">
                            ৳ {lineTotal.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-amber-100/70 font-bold font-siliguri border-t-2 border-amber-300">
                      <td className="py-1 px-2 text-amber-950">কয়েনের সর্বমোট:</td>
                      <td className="py-1 px-2 text-center font-mono text-amber-950">{totalCoinsCount} টি</td>
                      <td className="py-1 px-2 text-right font-mono text-amber-950">
                        ৳ {totalCoinsAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Grand Total Summary Box */}
          <div className="bg-slate-900 text-white p-3 rounded-xl mb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-siliguri text-emerald-300 block">সর্বমোট গণনাকৃত নগদ টাকা:</span>
              <span className="text-[11px] text-slate-400 font-siliguri">
                (মোট নোট ও কয়েন সংখ্যা: {totalPieces} টি)
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg sm:text-xl font-mono font-bold text-emerald-300">
                ৳ {grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* In Words */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-siliguri mb-4">
            <span className="text-slate-500 font-semibold mr-1">টাকা কথায়:</span>
            <strong className="text-slate-900">{numberToBengaliWords(grandTotal)}</strong>
          </div>

          {notes && (
            <div className="text-xs font-siliguri text-slate-600 mb-6 bg-amber-50/60 p-2 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-900">মন্তব্য: </span>
              <span>{notes}</span>
            </div>
          )}

          {/* Signature Lines */}
          <div className="grid grid-cols-3 gap-4 pt-10 mt-6 border-t border-slate-300 text-center font-siliguri text-xs text-slate-700">
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold">গণনাকারীর স্বাক্ষর</div>
              <div className="text-[10px] text-slate-500">হিসাব পরীক্ষক</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold">সাক্ষীর স্বাক্ষর</div>
              <div className="text-[10px] text-slate-500">গণনা টিম সদস্য</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-bold">কোষাধ্যক্ষ / সভাপতি</div>
              <div className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</div>
            </div>
          </div>

          {/* Audit Verification Note */}
          <div className="mt-6 pt-2 border-t border-slate-100 text-center text-[10px] font-mono text-slate-400">
            MasjidLedger Universal Denomination Engine • Generated on {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

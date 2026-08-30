import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Receipt,
  Check,
  Building,
  Calendar,
  User,
  MapPin,
  Phone,
  ShieldCheck,
  Crosshair
} from 'lucide-react';
import { CemeteryRecord, Mosque, MosqueProfile } from '../types';
import { Language, formatDate, formatCurrency } from '../lib/i18n';
import { GRAVE_TYPES, PLOT_STATUSES } from './CemeteryFormModal';

interface CemeteryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CemeteryRecord | null;
  initialFormat?: 'A4' | 'POS';
  mosque?: Mosque | MosqueProfile | null;
  language?: Language;
}

export const CemeteryPrintModal: React.FC<CemeteryPrintModalProps> = ({
  isOpen,
  onClose,
  record,
  initialFormat = 'A4',
  mosque,
  language = 'bn',
}) => {
  const [printFormat, setPrintFormat] = useState<'A4' | 'POS'>(initialFormat);
  const [includeLetterhead, setIncludeLetterhead] = useState(true);

  if (!isOpen || !record) return null;

  const graveTypeObj = GRAVE_TYPES.find((g) => g.id === record.graveType);
  const plotStatusObj = PLOT_STATUSES.find((s) => s.id === record.plotStatus);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls Header (HIDDEN in Print) */}
        <div className="no-print px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-400/40">
              <Printer className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                কবরস্থান রেজিস্ট্রি ও দাফন প্রত্যয়ন প্রিন্ট
              </h3>
              <p className="text-xs text-slate-300">
                {record.deceasedName} — প্লট: {record.plotNumber} ({record.recordNumber || 'N/A'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar (HIDDEN in Print) */}
        <div className="no-print bg-slate-100 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">প্রিন্ট ফরম্যাট:</span>
            <div className="flex bg-white rounded-lg p-0.5 border border-slate-300">
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  printFormat === 'A4' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4 অফিসিয়াল প্রত্যয়ন</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('POS')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  printFormat === 'POS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>POS থার্মাল স্লিপ (80mm)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 border-slate-300"
              />
              <span className="font-bold text-slate-800">অফিসিয়াল লেটারহেড সহ</span>
            </label>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

        {/* Printable Area with Strict Isolation */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
          {/* FORMAT 1: A4 CERTIFICATE & RECORD */}
          {printFormat === 'A4' && (
            <div
              id="cemetery-print-document"
              className="w-full max-w-[210mm] bg-white min-h-[297mm] p-8 sm:p-12 shadow-xl border border-slate-300 rounded-sm text-slate-900 flex flex-col justify-between"
              style={{ fontFamily: "'Noto Serif Bengali', 'SolaimanLipi', serif" }}
            >
              <div>
                {/* Islamic Bismillah */}
                <div className="text-center pb-2">
                  <span className="text-base text-slate-800 font-serif font-bold tracking-wider">
                    بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
                  </span>
                  <div className="text-[11px] text-slate-500 italic mt-0.5">
                    "পরম করুণাময় অসীম দয়ালু আল্লাহর নামে"
                  </div>
                </div>

                {/* Letterhead */}
                {includeLetterhead ? (
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-wide">
                      {mosque?.name || 'বায়তুল আমান কেন্দ্রীয় জামে মসজিদ ও কমপ্লেক্স'}
                    </h1>
                    <p className="text-xs text-slate-600 mt-1">
                      {mosque?.address || 'মিরপুর-২, ঢাকা-১২১৬'}
                      {mosque?.phone ? ` | ফোন: ${mosque.phone}` : ''}
                      {mosque?.email ? ` | ইমেইল: ${mosque.email}` : ''}
                    </p>
                    <div className="inline-block mt-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full text-xs font-bold text-slate-800">
                      স্থায়ী ওয়াকফ কবরস্থান রেজিস্ট্রি ও দাফন প্রত্যয়নপত্র
                    </div>
                  </div>
                ) : (
                  <div className="h-16 border-b border-dashed border-slate-300 mb-6 flex items-center justify-between text-xs text-slate-400">
                    <span>[প্রি-প্রিন্টেড প্যাডের জন্য সংরক্ষিত স্থান]</span>
                    <span className="font-bold text-slate-800">দাফন প্রত্যয়নপত্র ও রেকর্ড স্লিপ</span>
                  </div>
                )}

                {/* Meta Bar */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-6 pb-3 border-b border-slate-200">
                  <div className="space-y-1">
                    <div>
                      <span className="text-slate-500 font-semibold">রেজিস্ট্রি ক্রমিক নং: </span>
                      <span className="font-mono font-bold text-slate-900">{record.recordNumber || 'CBR-AUTO'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">কবর / প্লট নম্বর: </span>
                      <span className="font-mono font-bold text-blue-900 text-sm">{record.plotNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">ব্লক ও অবস্থান: </span>
                      <span className="font-bold text-slate-800">{record.block || 'Block-A'} {record.row ? `(${record.row})` : ''}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-slate-500 font-semibold">দাফনের তারিখ: </span>
                      <span className="font-bold text-slate-900">{formatDate(record.burialDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">দাফনের সময়: </span>
                      <span className="font-bold text-slate-800">{record.burialTime || 'বাদ আসর'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">কবরের ধরন: </span>
                      <span className="font-bold text-slate-800">{graveTypeObj?.labelBn || 'স্থায়ী'}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: DECEASED PARTICULARS */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded-sm border-l-4 border-slate-800 mb-3">
                    ১. মরহুম / মরহুমার বিবরণ
                  </h3>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">মরহুমের পূর্ণ নাম:</td>
                        <td className="p-2 font-bold text-slate-900 text-sm" colSpan={3}>
                          {record.deceasedName}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">পিতা / স্বামীর নাম:</td>
                        <td className="w-1/4 p-2 font-medium text-slate-800 border-r border-slate-200">
                          {record.fatherOrSpouseName || record.fatherName || '-'}
                        </td>
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">লিঙ্গ ও ধর্মীয় পরিচয়:</td>
                        <td className="w-1/4 p-2 font-medium text-slate-800">
                          {record.gender === 'FEMALE' ? 'মহিলা' : 'পুরুষ'} ({record.religion || 'ইসলাম'})
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">ইন্তেকালের তারিখ:</td>
                        <td className="p-2 font-medium text-slate-800 border-r border-slate-200">
                          {formatDate(record.dateOfDeath)}
                        </td>
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">মৃত্যুকালে বয়স:</td>
                        <td className="p-2 font-medium text-slate-800">
                          {record.ageAtDeath || 'তথ্য নেই'}
                        </td>
                      </tr>
                      {record.causeOfDeath && (
                        <tr className="border-b border-slate-200">
                          <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">মৃত্যুর কারণ:</td>
                          <td className="p-2 font-medium text-slate-800" colSpan={3}>
                            {record.causeOfDeath}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* SECTION 2: BURIAL & JANAZA LOCATION */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded-sm border-l-4 border-slate-800 mb-3">
                    ২. দাফন, জানাজা ও কবরের সুনির্দিষ্ট অবস্থান
                  </h3>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">কবরস্থানের নাম:</td>
                        <td className="p-2 font-medium text-slate-800" colSpan={3}>
                          {record.graveyardName || 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">জানাজার স্থান:</td>
                        <td className="p-2 font-medium text-slate-800" colSpan={3}>
                          {record.janazaPlace || 'বায়তুল আমান জামে মসজিদ ঈদগাহ মাঠ'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">কবরের সীমানা ও অবস্থান:</td>
                        <td className="p-2 font-medium text-slate-800" colSpan={3}>
                          {record.graveLocation}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* SECTION 3: HEIR & GUARDIAN DETAILS */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded-sm border-l-4 border-slate-800 mb-3">
                    ৩. ওয়ারিশ / অভিভাবকের তথ্য
                  </h3>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">ওয়ারিশের নাম:</td>
                        <td className="w-1/4 p-2 font-bold text-slate-900 border-r border-slate-200">
                          {record.contactPersonName || '-'}
                        </td>
                        <td className="w-1/4 p-2 font-bold bg-slate-50 border-r border-slate-200">সম্পর্ক:</td>
                        <td className="w-1/4 p-2 font-medium text-slate-800">
                          {record.relationWithDeceased || 'ওয়ারিশ'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">মোবাইল নম্বর:</td>
                        <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                          {record.contactPersonPhone || '-'}
                        </td>
                        <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">বিকল্প নম্বর:</td>
                        <td className="p-2 font-mono font-medium text-slate-800">
                          {record.contactPersonAltPhone || '-'}
                        </td>
                      </tr>
                      {record.heirAddress && (
                        <tr className="border-b border-slate-200">
                          <td className="p-2 font-bold bg-slate-50 border-r border-slate-200">ঠিকানা:</td>
                          <td className="p-2 font-medium text-slate-800" colSpan={3}>
                            {record.heirAddress}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Notes and Rules */}
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-[11px] text-slate-600 mb-8 space-y-1">
                  <div className="font-bold text-slate-800">ওয়াকফ নীতিমালা ও প্রত্যয়ন বিধি:</div>
                  <p>
                    • এটি মসজিদ পরিচালনা কমিটি কর্তৃক সংরক্ষিত ওয়াকফ কবরস্থানের একটি প্রামাণ্য দাফন প্রত্যয়নপত্র।
                  </p>
                  <p>
                    • স্থায়ী ওয়াকফ কবরস্থান বিধিমোতাবেক কবরের সীমানা পরিবর্তন বা স্থায়ী পাকা কাঠামো নির্মাণ সম্পূর্ণ নিষিদ্ধ।
                  </p>
                  {record.notes && <p className="font-medium text-slate-800">• বিশেষ নোট: {record.notes}</p>}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-12 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <div className="border-t border-slate-800 w-36 mx-auto pt-1 font-bold text-slate-900">
                    আবেদনকারী / ওয়ারিশ
                  </div>
                  <span className="text-[10px] text-slate-500">স্বাক্ষর ও তারিখ</span>
                </div>
                <div>
                  <div className="border-t border-slate-800 w-36 mx-auto pt-1 font-bold text-slate-900">
                    কবরস্থান তত্ত্বাবধায়ক
                  </div>
                  <span className="text-[10px] text-slate-500">স্বাক্ষর ও সিল</span>
                </div>
                <div>
                  <div className="border-t border-slate-800 w-36 mx-auto pt-1 font-bold text-slate-900">
                    সাধারণ সম্পাদক / সভাপতি
                  </div>
                  <span className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</span>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 2: POS THERMAL RECEIPT (80mm) */}
          {printFormat === 'POS' && (
            <div
              id="cemetery-print-document"
              className="w-[80mm] bg-white p-4 shadow-xl border border-slate-300 rounded-sm text-slate-900 font-mono text-[11px] leading-tight flex flex-col"
            >
              {/* POS Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400 mb-2">
                <div className="text-[10px] font-serif">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
                <div className="font-bold text-xs mt-0.5 uppercase tracking-wide">
                  {mosque?.name || 'বায়তুল আমান জামে মসজিদ'}
                </div>
                <div className="text-[10px] text-slate-600">কবরস্থান দাফন রেজিস্ট্রি স্লিপ</div>
                {mosque?.phone && <div className="text-[9px]">ফোন: {mosque.phone}</div>}
              </div>

              {/* POS Slip Meta */}
              <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 mb-2 text-[10px]">
                <div className="flex justify-between">
                  <span>রেকর্ড নং:</span>
                  <span className="font-bold">{record.recordNumber || 'CBR-AUTO'}</span>
                </div>
                <div className="flex justify-between">
                  <span>প্লট নম্বর:</span>
                  <span className="font-bold text-xs">{record.plotNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>ব্লক:</span>
                  <span>{record.block || 'Block-A'} {record.row ? `(${record.row})` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>দাফন তারিখ:</span>
                  <span>{formatDate(record.burialDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>দাফন সময়:</span>
                  <span>{record.burialTime || 'বাদ আসর'}</span>
                </div>
              </div>

              {/* POS Deceased Info */}
              <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 mb-2">
                <div className="text-[10px] font-bold text-slate-700 underline">মরহুমের তথ্য:</div>
                <div className="font-bold text-xs">{record.deceasedName}</div>
                <div className="text-[10px]">পিতা/স্বামী: {record.fatherOrSpouseName || record.fatherName || '-'}</div>
                <div className="text-[10px]">বয়স: {record.ageAtDeath || '-'} | লিঙ্গ: {record.gender === 'FEMALE' ? 'মহিলা' : 'পুরুষ'}</div>
                <div className="text-[10px]">স্থান: {record.graveLocation}</div>
              </div>

              {/* POS Heir Info */}
              <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 mb-2 text-[10px]">
                <div className="font-bold text-slate-700 underline">ওয়ারিশ / অভিভাবক:</div>
                <div>নাম: {record.contactPersonName} ({record.relationWithDeceased || 'ওয়ারিশ'})</div>
                <div>মোবাইল: {record.contactPersonPhone}</div>
              </div>

              {/* Fees if any */}
              {(record.burialFee || record.maintenanceFee) && (
                <div className="space-y-1 pb-2 border-b border-dashed border-slate-400 mb-2 text-[10px]">
                  {record.burialFee && (
                    <div className="flex justify-between">
                      <span>দাফন ফি:</span>
                      <span className="font-bold">৳ {record.burialFee.toLocaleString()}</span>
                    </div>
                  )}
                  {record.maintenanceFee && (
                    <div className="flex justify-between">
                      <span>রক্ষণাবেক্ষণ ফি:</span>
                      <span className="font-bold">৳ {record.maintenanceFee.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* POS Footer */}
              <div className="text-center pt-2 text-[9px] text-slate-500 space-y-1">
                <div>কবর পাকা করা সম্পূর্ণ নিষিদ্ধ।</div>
                <div>আল্লাহ মরহুমকে জান্নাতুল ফেরদাউস দান করুন।</div>
                <div className="pt-2 font-mono text-[8px]">
                  প্রিন্ট: {new Date().toLocaleDateString('bn-BD')} | MasjidLedger
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

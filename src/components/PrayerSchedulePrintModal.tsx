import React, { useState } from 'react';
import { Mosque } from '../types';
import { WaqtStatus, MonthlyDayPrayerItem, toBanglaDigits, getBengaliDate, getHijriDate, formatTime12Hour } from '../lib/prayerEngine';
import { printElement } from '../lib/printUtils';
import { Printer, X, Calendar, CalendarDays, Moon, Sparkles, CheckCircle2 } from 'lucide-react';

export type PrayerPrintDocType = 'daily' | 'monthly' | 'jumuah' | 'ramadan';

interface PrayerSchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  mosque?: Mosque | null;
  prayerTimes: WaqtStatus;
  monthlyList: MonthlyDayPrayerItem[];
  selectedMonth: number;
  selectedYear: number;
  selectedDistrict: string;
}

const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const PrayerSchedulePrintModal: React.FC<PrayerSchedulePrintModalProps> = ({
  isOpen,
  onClose,
  mosque,
  prayerTimes,
  monthlyList,
  selectedMonth,
  selectedYear,
  selectedDistrict,
}) => {
  const [docType, setDocType] = useState<PrayerPrintDocType>('daily');
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const today = new Date();
  const bengaliDate = getBengaliDate(today);
  const hijriDate = getHijriDate(today);

  const handlePrint = async () => {
    setIsPrinting(true);
    const title = `${mosque?.nameBn || mosque?.name || 'মসজিদ'}_${
      docType === 'daily'
        ? 'আজকের_নামাজের_সময়সূচি'
        : docType === 'monthly'
        ? `মাসিক_নামাজের_ক্যালেন্ডার_${MONTH_NAMES_BN[selectedMonth]}_${selectedYear}`
        : docType === 'jumuah'
        ? 'জুমার_বিশেষ_সময়সূচি'
        : 'রমজান_সেহরি_ও_ইফতার_সময়সূচি'
    }`;

    await printElement('printable-prayer-schedule-canvas', {
      title,
      pageSize: 'A4',
      pageOrientation: docType === 'monthly' ? 'landscape' : 'portrait',
      margin: docType === 'monthly' ? '8mm 10mm' : '10mm 12mm',
      preserveColors: true,
    });
    setIsPrinting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden font-siliguri">
        {/* Modal Top Bar (Non-Printable) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-600" />
              <span>নামাজের সময়সূচি প্রিন্ট ও PDF রিলিজ (A4 Isolated Engine)</span>
            </h2>
            <p className="text-xs text-slate-500">
              মসজিদের অফিসিয়াল প্যাড ও অনুমোদিত স্বাক্ষরসহ প্রিন্ট হবে। কোনো সাইডবার বা অ্যাপ্লিকেশন অংশ প্রিন্টে থাকবে না।
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow flex items-center space-x-2 text-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'প্রিন্ট হচ্ছে...' : 'প্রিন্ট / PDF সংরক্ষণ'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Format Selector */}
        <div className="flex items-center space-x-2 px-6 py-2.5 bg-white border-b border-slate-200 overflow-x-auto text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] whitespace-nowrap mr-2">
            ফরমেট নির্বাচন:
          </span>
          <button
            onClick={() => setDocType('daily')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
              docType === 'daily'
                ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>১. আজকের নামাজের সময়সূচি (A4 Portrait)</span>
          </button>

          <button
            onClick={() => setDocType('monthly')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
              docType === 'monthly'
                ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>২. পুরো মাসের ক্যালেন্ডার (A4 Landscape)</span>
          </button>

          <button
            onClick={() => setDocType('jumuah')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
              docType === 'jumuah'
                ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>৩. জুমার বিশেষ নোটিশ (A4 Portrait)</span>
          </button>

          <button
            onClick={() => setDocType('ramadan')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
              docType === 'ramadan'
                ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-amber-600" />
            <span>৪. রমজান সেহরি ও ইফতার (A4 Portrait)</span>
          </button>
        </div>

        {/* Live Document Preview Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex justify-center">
          <div
            id="printable-prayer-schedule-canvas"
            className={`bg-white shadow-xl rounded-xl border border-slate-200 text-slate-900 font-siliguri flex flex-col justify-between ${
              docType === 'monthly'
                ? 'w-full max-w-[297mm] min-h-[210mm] p-6 sm:p-8'
                : 'w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10'
            }`}
          >
            {/* Top Mosque Authoritative Header */}
            <div className="space-y-4">
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="text-xs text-slate-500 font-serif italic mb-0.5">
                  بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {mosque?.nameBn || mosque?.name || 'বায়তুল মামুর জামে মসজিদ'}
                </h1>
                {mosque?.nameEn && (
                  <p className="text-xs font-semibold text-slate-600 font-sans tracking-wide">
                    {mosque.nameEn}
                  </p>
                )}
                <p className="text-xs text-slate-600">
                  {mosque?.address} {mosque?.district && `• ${mosque?.district}`} {mosque?.phone && `• ফোন: ${mosque?.phone}`}
                </p>
                {mosque?.waqfEstateName && (
                  <div className="pt-1">
                    <span className="inline-block text-[11px] font-bold px-3 py-0.5 rounded bg-slate-100 border border-slate-300">
                      ওয়াকফ এস্টেট: {mosque.waqfEstateName} {mosque.registrationNumber && `(রেজিস্ট্রেশন: ${mosque.registrationNumber})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Sub-header with Title & Dates */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {docType === 'daily' && 'দৈনিক নামাজের আনুষ্ঠানিক সময়সূচি'}
                    {docType === 'monthly' && `মাসিক নামাজের পূর্ণাঙ্গ সময়সূচি — ${MONTH_NAMES_BN[selectedMonth]} ${toBanglaDigits(selectedYear)}`}
                    {docType === 'jumuah' && 'পবিত্র জুমার নামাজের বিশেষ সময়সূচি ও নিয়মাবলি'}
                    {docType === 'ramadan' && 'পবিত্র মাহে রমজান ও নফল রোজা: সেহরি ও ইফতারের সময়সূচি'}
                  </h2>
                  <p className="text-slate-500 text-[11px]">
                    স্থান: {selectedDistrict} জেলা • হানাফি মাজহাব ও ইসলামিক ফাউন্ডেশন বাংলাদেশ মান অনুযায়ী নির্ধারিত
                  </p>
                </div>
                <div className="text-right space-y-0.5 text-[11px] font-medium">
                  <div><strong>হিজরি:</strong> {hijriDate.fullBn}</div>
                  <div><strong>বঙ্গাব্দ:</strong> {bengaliDate.fullBn}</div>
                  <div><strong>খ্রিষ্টাব্দ:</strong> {today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              {/* Document Type 1: DAILY PRAYER SCHEDULE TABLE */}
              {docType === 'daily' && (
                <div className="space-y-4">
                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-900 text-white font-bold text-[12px]">
                        <tr>
                          <th className="px-4 py-3">নামাজ</th>
                          <th className="px-4 py-3 text-center">ওয়াক্ত শুরু</th>
                          <th className="px-4 py-3 text-center bg-blue-900/60">আজানের সময়</th>
                          <th className="px-4 py-3 text-center bg-emerald-900/60">জামাতের নির্ধারিত সময়</th>
                          <th className="px-4 py-3 text-center">ওয়াক্ত শেষ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-900">
                        {prayerTimes.prayerList.map((p, idx) => (
                          <tr
                            key={p.key}
                            className={`transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-3 font-bold text-sm">
                              {p.nameBn}
                              <span className="block text-[11px] font-normal text-slate-500 font-sans">
                                {p.nameEn}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">
                              {toBanglaDigits(p.waqtStart12 || p.waqtStart)}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-blue-900 bg-blue-50/50">
                              {toBanglaDigits(p.adhan12 || p.adhan)}
                            </td>
                            <td className="px-4 py-3 text-center font-extrabold text-emerald-900 bg-emerald-50/50 text-sm">
                              {toBanglaDigits(p.jamaat12 || p.jamaat)}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">
                              {toBanglaDigits(p.waqtEnd12 || p.waqtEnd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Daily Informational Islamic Timings Box */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <h3 className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>সূর্য ও নফল ইবাদতের অন্যান্য সময় (তথ্যসূচক)</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-800">
                      <div className="bg-white p-2 rounded-lg border border-amber-200/80">
                        <span className="text-[11px] text-slate-500 block">তাহাজ্জুদ ও সেহরি শেষ</span>
                        <strong className="text-slate-900">{toBanglaDigits(prayerTimes.tahajjudEndTimeStr12)}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-amber-200/80">
                        <span className="text-[11px] text-slate-500 block">সূর্যোদয়</span>
                        <strong className="text-slate-900">{toBanglaDigits(prayerTimes.specialList.find(s => s.key === 'sunrise')?.timeStr12 || '৫:৪৫ AM')}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-amber-200/80">
                        <span className="text-[11px] text-slate-500 block">ইশরাক শুরু</span>
                        <strong className="text-slate-900">{toBanglaDigits(prayerTimes.specialList.find(s => s.key === 'ishraq')?.timeStr12 || '৬:০০ AM')}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-amber-200/80">
                        <span className="text-[11px] text-slate-500 block">সূর্যাস্ত ও ইফতার</span>
                        <strong className="text-rose-700">{toBanglaDigits(prayerTimes.iftarTimeStr12)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Type 2: FULL MONTHLY CALENDAR TABLE */}
              {docType === 'monthly' && (
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="px-2 py-2">তারিখ</th>
                        <th className="px-1.5 py-2">বার</th>
                        <th className="px-1.5 py-2">হিজরি</th>
                        <th className="px-2 py-2 text-center bg-slate-800">সেহরি শেষ</th>
                        <th className="px-2 py-2 text-center">ফজর আজান</th>
                        <th className="px-2 py-2 text-center font-extrabold bg-emerald-950">ফজর জামাত</th>
                        <th className="px-2 py-2 text-center">সূর্যোদয়</th>
                        <th className="px-2 py-2 text-center">যোহর আজান</th>
                        <th className="px-2 py-2 text-center font-extrabold bg-emerald-950">যোহর জামাত</th>
                        <th className="px-2 py-2 text-center">আসর আজান</th>
                        <th className="px-2 py-2 text-center font-extrabold bg-emerald-950">আসর জামাত</th>
                        <th className="px-2 py-2 text-center bg-rose-950">ইফতার ও মাগরিব</th>
                        <th className="px-2 py-2 text-center font-extrabold bg-emerald-950">মাগরিব জামাত</th>
                        <th className="px-2 py-2 text-center">এশা আজান</th>
                        <th className="px-2 py-2 text-center font-extrabold bg-emerald-950">এশা জামাত</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900 font-sans">
                      {monthlyList.map((item) => (
                        <tr
                          key={item.day}
                          className={`transition-colors ${
                            item.isToday
                              ? 'bg-amber-100/70 font-bold'
                              : item.isFriday
                              ? 'bg-purple-50/60'
                              : item.day % 2 === 0
                              ? 'bg-slate-50'
                              : 'bg-white'
                          }`}
                        >
                          <td className="px-2 py-1.5 font-bold font-siliguri">
                            {toBanglaDigits(item.day)} {MONTH_NAMES_BN[selectedMonth]}
                          </td>
                          <td className="px-1.5 py-1.5 font-medium font-siliguri">
                            {item.dayNameBn}
                          </td>
                          <td className="px-1.5 py-1.5 text-slate-600 font-siliguri">
                            {item.hijriDateBn}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-slate-800 bg-slate-100/50">
                            {toBanglaDigits(item.sehriEnd12)}
                          </td>
                          <td className="px-2 py-1.5 text-center text-slate-700">
                            {toBanglaDigits(item.fajrAzan12 || item.fajr12)}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-900 bg-emerald-50/40">
                            {toBanglaDigits(item.fajrJamaat12)}
                          </td>
                          <td className="px-2 py-1.5 text-center text-slate-500">
                            {toBanglaDigits(item.sunrise12)}
                          </td>
                          <td className="px-2 py-1.5 text-center text-slate-700">
                            {toBanglaDigits(item.isFriday ? (item.jumuahAzan12 || item.dhuhrAzan12) : item.dhuhrAzan12)}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-900 bg-emerald-50/40">
                            {toBanglaDigits(item.isFriday ? (item.jumuahJamaat12 || item.dhuhrJamaat12) : item.dhuhrJamaat12)}
                          </td>
                          <td className="px-2 py-1.5 text-center text-slate-700">
                            {toBanglaDigits(item.asrAzan12 || item.asr12)}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-900 bg-emerald-50/40">
                            {toBanglaDigits(item.asrJamaat12)}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-rose-800 bg-rose-50/40">
                            {toBanglaDigits(item.iftar12 || item.maghribAzan12)}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-900 bg-emerald-50/40">
                            {toBanglaDigits(item.maghribJamaat12)}
                          </td>
                          <td className="px-2 py-1.5 text-center text-slate-700">
                            {toBanglaDigits(item.ishaAzan12 || item.isha12)}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-900 bg-emerald-50/40">
                            {toBanglaDigits(item.ishaJamaat12)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Document Type 3: JUMUAH POSTER */}
              {docType === 'jumuah' && (
                <div className="space-y-6 py-2">
                  <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-6 text-center space-y-4">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-purple-800 bg-purple-200/70 px-4 py-1 rounded-full">
                      সাপ্তাহিক শ্রেষ্ঠ দিন • জুমাতুল মুবারক
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-purple-950">
                      পবিত্র জুমার জামাতের নির্ধারিত সময়সূচি
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs">
                        <span className="text-xs text-slate-500 font-bold block mb-1">প্রথম আজান / প্রস্তুতি</span>
                        <div className="text-2xl font-black text-purple-900 font-mono">
                          {toBanglaDigits(prayerTimes.jumuahTimeStr)}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs">
                        <span className="text-xs text-slate-500 font-bold block mb-1">বাংলা আলোচনা ও খুতবা</span>
                        <div className="text-2xl font-black text-indigo-900 font-mono">
                          {toBanglaDigits(prayerTimes.jumuahKhutbahTimeStr)}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/30 shadow-xs">
                        <span className="text-xs text-emerald-800 font-extrabold block mb-1">দ্বিতীয় আজান ও জামাত</span>
                        <div className="text-2xl font-black text-emerald-900 font-mono">
                          {toBanglaDigits(prayerTimes.jumuahJamaatTimeStr)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Jumuah Adab and Instructions */}
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-3 text-xs text-slate-700">
                    <h4 className="font-bold text-slate-900 text-sm">মুসুল্লিগণের প্রতি বিশেষ অনুরোধ:</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-slate-600">
                      <li>জুমার দিন আগে আগে মসজিদে উপস্থিত হয়ে তাহিয়্যাতুল মসজিদ ও নফল সালাত আদায় করুন।</li>
                      <li>খুতবা চলাকালীন যেকোনো প্রকার কথা বলা, সালাম বিনিময় বা ফোনে কথা বলা কঠোরভাবে নিষিদ্ধ।</li>
                      <li>মসজিদে প্রবেশের পূর্বে মোবাইল ফোন বন্ধ বা সাইলেন্ট মুডে রাখুন।</li>
                      <li>মসজিদের সামনে বা রাস্তায় অযথা যানবাহন পার্কিং করে জনচলাচলে বিঘ্ন সৃষ্টি করবেন না।</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Document Type 4: RAMADAN SEHRI & IFTAR */}
              {docType === 'ramadan' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border-2 border-amber-400/50 rounded-2xl p-5 text-center space-y-2">
                    <h3 className="text-xl font-black text-amber-950 flex items-center justify-center gap-2">
                      <Moon className="w-5 h-5 text-amber-600" />
                      <span>পবিত্র মাহে রমজান ও নফল রোজা সময়সূচি</span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      সেহরি ও ইফতারের সতর্কতামূলক সময়সহ প্রস্তুতকৃত
                    </p>
                  </div>

                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-900 text-white font-bold text-[11px]">
                        <tr>
                          <th className="px-3 py-2.5">তারিখ</th>
                          <th className="px-3 py-2.5">বার</th>
                          <th className="px-3 py-2.5 text-center bg-blue-950">সেহরির শেষ সময়</th>
                          <th className="px-3 py-2.5 text-center">ফজর আজান</th>
                          <th className="px-3 py-2.5 text-center">ফজর জামাত</th>
                          <th className="px-3 py-2.5 text-center bg-rose-950 font-bold text-amber-300">ইফতারের সময়</th>
                          <th className="px-3 py-2.5 text-center">মাগরিব জামাত</th>
                          <th className="px-3 py-2.5 text-center">এশা ও তারাবি জামাত</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-900 font-sans">
                        {monthlyList.map((item) => (
                          <tr
                            key={item.day}
                            className={`transition-colors ${
                              item.isToday ? 'bg-amber-100 font-bold' : item.day % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                            }`}
                          >
                            <td className="px-3 py-2 font-bold font-siliguri">
                              {toBanglaDigits(item.day)} {MONTH_NAMES_BN[selectedMonth]}
                            </td>
                            <td className="px-3 py-2 font-siliguri text-slate-700">
                              {item.dayNameBn}
                            </td>
                            <td className="px-3 py-2 text-center font-extrabold text-blue-900 bg-blue-50/40">
                              {toBanglaDigits(item.sehriEnd12)}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-700">
                              {toBanglaDigits(item.fajrAzan12 || item.fajr12)}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-900">
                              {toBanglaDigits(item.fajrJamaat12)}
                            </td>
                            <td className="px-3 py-2 text-center font-black text-rose-800 bg-rose-50/60 text-sm">
                              {toBanglaDigits(item.iftar12)}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-900">
                              {toBanglaDigits(item.maghribJamaat12)}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-slate-900">
                              {toBanglaDigits(item.ishaJamaat12)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Ramadan Roza Niyyat & Iftar Dua Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-1">
                      <strong className="text-slate-900 block font-bold text-[11px]">রোজার নিয়ত:</strong>
                      <p className="text-slate-600 italic">
                        "নাওয়াইতু আন আসুমা গাদাম মিন শাহরি রামাদানা..." (হে আল্লাহ! আমি আগামীকাল পবিত্র মাহে রমজানের রোজা রাখার নিয়ত করলাম।)
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-1">
                      <strong className="text-slate-900 block font-bold text-[11px]">ইফতারের দোয়া:</strong>
                      <p className="text-slate-600 italic">
                        "আল্লাহুম্মা লাকা সুমতু ওয়া আলা রিজক্বিকা আফতারতু..." (হে আল্লাহ! আমি আপনার উদ্দেশ্যেই রোজা রেখেছি এবং আপনার রিযিক দ্বারাই ইফতার করছি।)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Official Signatures & Footer (Consistent Across All Documents) */}
            <div className="mt-8 pt-6 border-t-2 border-slate-900 text-xs">
              <div className="flex items-center justify-between gap-4 text-center px-4">
                <div className="space-y-1">
                  <div className="w-32 border-b border-dashed border-slate-400 mx-auto mb-1"></div>
                  <p className="font-bold text-slate-800">পেশ ইমাম ও খতিব</p>
                  <p className="text-[10px] text-slate-500">{mosque?.nameBn || mosque?.name || 'মসজিদলেজার'}</p>
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-dashed border-slate-400 mx-auto mb-1"></div>
                  <p className="font-bold text-slate-800">সাধারণ সম্পাদক</p>
                  <p className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</p>
                </div>

                <div className="space-y-1">
                  <div className="w-32 border-b border-dashed border-slate-400 mx-auto mb-1"></div>
                  <p className="font-bold text-slate-800">সভাপতি</p>
                  <p className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-5 text-[10px] text-slate-400 border-t border-slate-100 mt-4">
                <div>
                  সিস্টেম জেনারেটেড ডিজিটাল রিলিজ • সময় মান: বাংলাদেশ মান সময় (BST / UTC+6)
                </div>
                <div>
                  মুদ্রণের তারিখ ও সময়: {today.toLocaleDateString('bn-BD')} {formatTime12Hour(today, { banglaDigits: true })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

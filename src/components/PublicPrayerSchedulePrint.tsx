import React from 'react';
import { Mosque, PublicPortalData } from '../types';
import { getBengaliDate, getHijriDate } from '../lib/prayerEngine';
import { Printer, X } from 'lucide-react';

interface PublicPrayerSchedulePrintProps {
  mosque: PublicPortalData['mosque'] | null;
  prayerTimes: PublicPortalData['prayerTimes'];
  jumuahTime?: PublicPortalData['jumuahTime'];
  onClose: () => void;
}

export const PublicPrayerSchedulePrint: React.FC<PublicPrayerSchedulePrintProps> = ({
  mosque,
  prayerTimes,
  jumuahTime,
  onClose,
}) => {
  const today = new Date();
  const bengaliDate = getBengaliDate(today);
  const hijriDate = getHijriDate(today);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Top action bar - Hidden during print */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-3 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center space-x-2 text-sm"
        >
          <Printer className="w-4 h-4" />
          <span>প্রিন্ট করুন (A4)</span>
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-xl shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* A4 Sheet Container */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-2xl rounded-2xl print:rounded-none print:shadow-none print:m-0 print:p-8 text-slate-900 font-siliguri flex flex-col justify-between">
        <div className="space-y-6">
          {/* Mosque Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
            <div className="text-xs text-slate-500 font-serif italic mb-1">
              بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {mosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
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
              <span className="inline-block text-[11px] font-bold px-3 py-0.5 mt-1 rounded bg-slate-100 border border-slate-300">
                ওয়াকফ এস্টেট: {mosque.waqfEstateName} {mosque.registrationNumber && `(রেজিস্ট্রেশন: ${mosque.registrationNumber})`}
              </span>
            )}
          </div>

          {/* Document Title & Date Grid */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                দৈনিক ও সাপ্তাহিক নামাজের আনুষ্ঠানিক সময়সূচি
              </h2>
              <p className="text-slate-500 text-[11px]">মসজিদ পরিচালনা কমিটি কর্তৃক অনুমোদিত ও জারিকৃত</p>
            </div>
            <div className="text-right space-y-0.5 text-[11px]">
              <div><strong>হিজরি:</strong> {hijriDate.fullBn}</div>
              <div><strong>বঙ্গাব্দ:</strong> {bengaliDate.fullBn}</div>
              <div><strong>খ্রিষ্টাব্দ:</strong> {today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          {/* 5 Daily Prayers Schedule Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              পাঁচ ওয়াক্ত আজান ও জামাতের নির্ধারিত সময়
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm text-center">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-4 border-r border-slate-300 text-left">নামাজের নাম</th>
                  <th className="py-2.5 px-4 border-r border-slate-300">ওয়াক্তের নাম (English)</th>
                  <th className="py-2.5 px-4 border-r border-slate-300">আজানের সময়</th>
                  <th className="py-2.5 px-4 bg-slate-200/80 font-black">জামাতের নির্ধারিত সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {prayerTimes.map((p, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="py-3 px-4 border-r border-slate-300 text-left font-bold text-slate-900">
                      {p.nameBn}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-600 font-mono text-xs">
                      {p.nameEn}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 font-mono text-slate-800">
                      {p.adhan}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-950 bg-slate-100/60 text-sm sm:text-base">
                      {p.iqamah}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Jumu'ah Timetable */}
          {jumuahTime && (
            <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>জুমার নামাজ (সাপ্তাহিক শুক্রবার)</span>
                <span className="text-[11px] font-semibold text-slate-600">সকল মুসল্লিকে যথাসময়ে উপস্থিত হওয়ার অনুরোধ</span>
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center text-xs sm:text-sm">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-slate-500 text-[11px]">আজান</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{jumuahTime.adhan}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-slate-500 text-[11px]">খুতবা শুরু</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{jumuahTime.khutbah}</div>
                </div>
                <div className="p-2.5 bg-slate-900 text-white rounded-lg">
                  <div className="text-slate-300 text-[11px]">জুমার জামাত</div>
                  <div className="font-mono font-black text-white mt-0.5 sm:text-base">{jumuahTime.iqamah}</div>
                </div>
              </div>
            </div>
          )}

          {/* General Guidelines & Hadith */}
          <div className="border-l-4 border-blue-600 bg-blue-50/60 p-4 rounded-r-xl text-xs space-y-1.5">
            <p className="font-bold text-blue-950">
              "যে ব্যক্তি উত্তমরূপে ওজু করে জামাতে সালাত আদায়ের উদ্দেশ্যে মসজিদে আগমন করে, আল্লাহ তার প্রতিটি পদক্ষেপে একটি করে গুনাহ মাফ করেন এবং একটি করে মর্যাদা বৃদ্ধি করেন।" — (সহিহ মুসলিম)
            </p>
            <p className="text-slate-600 text-[11px]">
              * বিশেষ দ্রষ্টব্য: জামাতের পূর্বে মোবাইল ফোন সাইলেন্ট বা বন্ধ রাখুন। কাতার সোজা করে দাঁড়ান।
            </p>
          </div>
        </div>

        {/* Footer & Signatures */}
        <div className="pt-8 border-t border-slate-300 text-xs">
          <div className="grid grid-cols-3 gap-8 text-center pt-8">
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">পেশ ইমাম / খতিব</div>
              <div className="text-[10px] text-slate-500">বায়তুল মামুর জামে মসজিদ</div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">সাধারণ সম্পাদক</div>
              <div className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">সভাপতি</div>
              <div className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</div>
            </div>
          </div>
          <div className="text-center pt-6 text-[10px] text-slate-400">
            মসজিদলেজার ডিজিটাল পাবলিক পোর্টাল প্ল্যাটফর্ম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত • কপিরাইট সংরক্ষিত
          </div>
        </div>
      </div>
    </div>
  );
};

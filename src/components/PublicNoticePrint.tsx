import React from 'react';
import { PublicPortalData } from '../types';
import { getBengaliDate } from '../lib/prayerEngine';
import { Printer, X, Bell } from 'lucide-react';

interface PublicNoticePrintProps {
  mosque: PublicPortalData['mosque'] | null;
  notice: PublicPortalData['notices'][0];
  onClose: () => void;
}

export const PublicNoticePrint: React.FC<PublicNoticePrintProps> = ({
  mosque,
  notice,
  onClose,
}) => {
  const today = new Date();
  const bengaliDate = getBengaliDate(today);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Top action bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-3 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg flex items-center space-x-2 text-sm"
        >
          <Printer className="w-4 h-4" />
          <span>নোটিশ প্রিন্ট করুন (A4)</span>
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
              {mosque?.address} {mosque?.district && `• ${mosque?.district}`}
            </p>
            {mosque?.waqfEstateName && (
              <span className="inline-block text-[11px] font-bold px-3 py-0.5 mt-1 rounded bg-slate-100 border border-slate-300">
                ওয়াকফ এস্টেট: {mosque.waqfEstateName}
              </span>
            )}
          </div>

          {/* Document Title & Notice Badge */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                  {notice.isEmergency ? 'জরুরি বিজ্ঞপ্তি' : 'অফিসিয়াল বিজ্ঞপ্তি'}
                </span>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  প্রকাশের তারিখ: {notice.publishDate}
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] space-y-0.5">
              <div><strong>বাংলা তারিখ:</strong> {bengaliDate.fullBn}</div>
              <div><strong>ইংরেজি তারিখ:</strong> {today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          {/* Notice Title */}
          <div className="text-center py-3 border-b border-slate-200">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {notice.title}
            </h2>
          </div>

          {/* Notice Body */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-6 sm:p-8 text-sm sm:text-base text-slate-800 leading-loose whitespace-pre-line text-justify font-siliguri">
            {notice.description}
          </div>

          {/* Notice Guidelines */}
          <div className="border-l-4 border-amber-600 bg-amber-50/50 p-4 rounded-r-xl text-xs space-y-1">
            <h4 className="font-bold text-amber-950">সকল মুসল্লিবৃন্দের দৃষ্টি আকর্ষণ</h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              উক্ত বিজ্ঞপ্তি মসজিদ পরিচালনা কমিটির সিদ্ধান্ত অনুযায়ী প্রকাশ করা হলো। সকলকে সহযোগিতা ও অবগত হওয়ার জন্য বিশেষ অনুরোধ জানানো যাচ্ছে।
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-8 border-t border-slate-300 text-xs">
          <div className="grid grid-cols-2 gap-12 text-center pt-8">
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">সাধারণ সম্পাদক</div>
              <div className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">সভাপতি / মুতাওয়াল্লী</div>
              <div className="text-[10px] text-slate-500">মসজিদ পরিচালনা কমিটি</div>
            </div>
          </div>
          <div className="text-center pt-6 text-[10px] text-slate-400">
            মসজিদলেজার ডিজিটাল পাবলিক পোর্টাল প্ল্যাটফর্ম দ্বারা প্রস্তুতকৃত
          </div>
        </div>
      </div>
    </div>
  );
};

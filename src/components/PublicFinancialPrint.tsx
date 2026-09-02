import React from 'react';
import { PublicPortalData } from '../types';
import { getBengaliDate } from '../lib/prayerEngine';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface PublicFinancialPrintProps {
  mosque: PublicPortalData['mosque'] | null;
  financialTransparency: PublicPortalData['financialTransparency'];
  settings: PublicPortalData['settings'];
  onClose: () => void;
}

export const PublicFinancialPrint: React.FC<PublicFinancialPrintProps> = ({
  mosque,
  financialTransparency,
  settings,
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
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center space-x-2 text-sm"
        >
          <Printer className="w-4 h-4" />
          <span>বিবরণী প্রিন্ট করুন (A4)</span>
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

          {/* Document Header */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                পাবলিক ফাইন্যান্সিয়াল ট্রান্সপারেন্সি রিপোর্ট
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                মাসিক সার্বজনীন আর্থিক আয়-ব্যয় ও তহবিল স্থিতি বিবরণী
              </h2>
              <p className="text-slate-600 text-[11px]">
                হিসাবের মাস: <strong>{financialTransparency?.currentMonthNameBn || 'চলতি মাস'}</strong>
              </p>
            </div>
            <div className="text-right space-y-0.5 text-[11px]">
              <div><strong>প্রকাশের তারিখ:</strong> {today.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div><strong>বাংলা তারিখ:</strong> {bengaliDate.fullBn}</div>
              <div className="text-emerald-700 font-bold flex items-center justify-end space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>অনুমোদিত হিসাব</span>
              </div>
            </div>
          </div>

          {/* Financial Summary Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              চলতি মাসের আর্থিক সংক্ষিপ্ত চিত্র
            </h3>
            <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-4 text-left border-r border-slate-300">হিসাবের খাত / বিষয়</th>
                  <th className="py-2.5 px-4 text-left border-r border-slate-300">বিবরণ</th>
                  <th className="py-2.5 px-4 text-right">টাকার পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium">
                {settings.monthlyIncome && financialTransparency?.monthlyIncome !== undefined && (
                  <tr className="bg-emerald-50/40">
                    <td className="py-3 px-4 border-r border-slate-300 font-bold text-emerald-900">
                      চলতি মাসের মোট আয়
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-600">
                      দানবাক্স, সদস্য চাঁদা, অনুদান ও অন্যান্য যাবতীয় সংগৃহীত আয়
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm sm:text-base">
                      ৳ {financialTransparency.monthlyIncome.toLocaleString('bn-BD')}
                    </td>
                  </tr>
                )}

                {settings.monthlyExpense && financialTransparency?.monthlyExpense !== undefined && (
                  <tr className="bg-rose-50/40">
                    <td className="py-3 px-4 border-r border-slate-300 font-bold text-rose-900">
                      চলতি মাসের মোট ব্যয়
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-600">
                      সম্মানী ভাতা, বিদ্যুৎ/গ্যাস বিল, মেরামত ও অন্যান্য পরিচালন ব্যয়
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm sm:text-base">
                      ৳ {financialTransparency.monthlyExpense.toLocaleString('bn-BD')}
                    </td>
                  </tr>
                )}

                {settings.monthlySurplus && financialTransparency?.monthlySurplus !== undefined && (
                  <tr className="bg-blue-50/60 font-bold">
                    <td className="py-3 px-4 border-r border-slate-300 text-blue-950">
                      মাসিক নিট উদ্বৃত্ত / ঘাটতি
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-blue-800">
                      (চলতি মাসের আয় বিয়োগ চলতি মাসের ব্যয়)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-900 text-sm sm:text-base">
                      ৳ {financialTransparency.monthlySurplus.toLocaleString('bn-BD')}
                    </td>
                  </tr>
                )}

                {settings.totalDonationReceived && financialTransparency?.totalDonationsReceived !== undefined && (
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-300 font-semibold text-slate-800">
                      মোট দান সংগ্রহ
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-600">
                      সাধারণ ও অনলাইন ডোনেশন চ্যানেলের মোট দান
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ৳ {financialTransparency.totalDonationsReceived.toLocaleString('bn-BD')}
                    </td>
                  </tr>
                )}

                {settings.cashBalance && financialTransparency?.cashBalance !== undefined && (
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-300 font-semibold text-slate-800">
                      হাতে নগদ ক্যাশ স্থিতি
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-600">
                      ক্যাশিয়ার / কোষাধ্যক্ষের কাছে রক্ষিত নগদ ক্যাশ
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ৳ {financialTransparency.cashBalance.toLocaleString('bn-BD')}
                    </td>
                  </tr>
                )}

                {settings.bankBalance && financialTransparency?.bankBalance !== undefined && (
                  <tr>
                    <td className="py-3 px-4 border-r border-slate-300 font-semibold text-slate-800">
                      মোট ব্যাংক একাউন্ট স্থিতি
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-600">
                      মসজিদের অনুমোদিত ব্যাংক হিসাবসমূহের মোট জমা স্থিতি
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ৳ {financialTransparency.bankBalance.toLocaleString('bn-BD')}
                    </td>
                  </tr>
                )}

                {settings.currentBalance && financialTransparency?.currentBalance !== undefined && (
                  <tr className="bg-slate-200 font-extrabold border-t-2 border-slate-400">
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-950">
                      সর্বমোট সংরক্ষিত তহবিল স্থিতি
                    </td>
                    <td className="py-3 px-4 border-r border-slate-300 text-slate-700">
                      (ক্যাশ + ব্যাংক + অন্যান্য রিজার্ভ ফান্ড)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base text-slate-950">
                      ৳ {financialTransparency.currentBalance.toLocaleString('bn-BD')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Verification Note */}
          <div className="border-l-4 border-emerald-600 bg-emerald-50/60 p-4 rounded-r-xl text-xs space-y-1">
            <h4 className="font-bold text-emerald-950">স্বচ্ছতা ও অডিট নিশ্চয়তা</h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              উক্ত আর্থিক বিবরণী মসজিদলেজার এনক্রিপ্টেড হিসাবরক্ষণ সিস্টেমের প্রকৃত লেজার ও ভাউচার রেকর্ডের ভিত্তিতে স্বয়ংক্রিয়ভাবে সংকলিত হয়েছে। এলাকার যেকোনো মুসল্লি ও দানকারী কমিটির অনুমোদন সাপেক্ষে হিসাবের বিস্তারিত ভাউচার পর্যালোচনা করতে পারেন।
            </p>
          </div>
        </div>

        {/* Footer & Signatures */}
        <div className="pt-8 border-t border-slate-300 text-xs">
          <div className="grid grid-cols-3 gap-8 text-center pt-8">
            <div className="space-y-1">
              <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">হিসাবরক্ষক / কোষাধ্যক্ষ</div>
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
            মসজিদলেজার ডিজিটাল পাবলিক পোর্টাল প্ল্যাটফর্ম দ্বারা প্রস্তুতকৃত • সর্বস্বত্ব সংরক্ষিত
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useRef } from 'react';
import { X, Printer, User, ShieldCheck, Phone, MapPin, Calendar } from 'lucide-react';
import { Staff, Mosque, MosqueProfile } from '../types';
import { Language, translations } from '../lib/i18n';

interface StaffIdCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  mosque?: Mosque | MosqueProfile | null;
  language?: Language;
}

export const StaffIdCardPrintModal: React.FC<StaffIdCardPrintModalProps> = ({
  isOpen,
  onClose,
  staff,
  mosque,
  language = 'bn'
}) => {
  const t = translations[language] || translations.bn;
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !staff) return null;

  const handlePrint = () => {
    window.print();
  };

  const mosqueName = (mosque as any)?.nameBn || (mosque as any)?.name || 'মসজিদ প্রশাসন';
  const mosqueAddress = (mosque as any)?.address || (mosque as any)?.location || 'ঢাকা, বাংলাদেশ';
  const mosquePhone = (mosque as any)?.phone || 'যোগাযোগ: মসজিদ অফিস';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold">স্টাফ অফিসিয়াল পরিচয়পত্র (Official ID Card)</h3>
              <p className="text-xs text-slate-300">প্রিন্ট ও লেমিনেশনের জন্য স্ট্যান্ডার্ড সাইজ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট করুন
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ID Card Display / Printable Area */}
        <div ref={printRef} className="p-8 overflow-y-auto flex-1 flex flex-col items-center justify-center gap-8 bg-slate-100 print:bg-white print:p-0">
          
          {/* Card Front */}
          <div className="w-[340px] h-[520px] bg-white rounded-2xl border-2 border-emerald-600 shadow-xl overflow-hidden flex flex-col justify-between relative print:shadow-none print:border-emerald-700">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 text-center relative">
              <div className="w-8 h-8 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-1 text-emerald-100 font-serif font-bold text-xs">
                🕌
              </div>
              <h2 className="text-base font-extrabold tracking-wide">{mosqueName}</h2>
              <p className="text-[10px] text-emerald-100 mt-0.5">{mosqueAddress}</p>
              <div className="mt-2 py-0.5 px-3 bg-emerald-950/60 rounded-full inline-block text-[10px] font-semibold tracking-wider uppercase text-emerald-200">
                অফিসিয়াল পরিচয়পত্র / Staff ID
              </div>
            </div>

            {/* Photo & Main Details */}
            <div className="p-4 flex flex-col items-center flex-1 text-center">
              <div className="w-24 h-24 rounded-full border-3 border-emerald-600 overflow-hidden bg-slate-100 shadow-md mb-3 flex items-center justify-center">
                {staff.photoUrl ? (
                  <img
                    src={staff.photoUrl}
                    alt={staff.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900 leading-snug">{staff.fullNameBn || staff.name}</h3>
              <p className="text-xs font-bold text-emerald-700 mt-0.5 bg-emerald-50 px-3 py-0.5 rounded-md border border-emerald-200 inline-block">
                {staff.designationBn}
              </p>

              <div className="w-full mt-4 space-y-1.5 text-[11px] text-left border-t border-slate-100 pt-3 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">আইডি নম্বর:</span>
                  <span className="font-bold text-slate-900">{staff.staffCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">মোবাইল নম্বর:</span>
                  <span className="font-semibold text-slate-900">{staff.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">যোগদানের তারিখ:</span>
                  <span className="font-medium text-slate-900">{staff.joiningDate}</span>
                </div>
                {staff.bloodGroup && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">রক্তের গ্রুপ:</span>
                    <span className="font-bold text-rose-600">{staff.bloodGroup}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <div className="text-left">
                <span className="block text-[8px] text-slate-400">অনুমোদনকারী</span>
                <span className="font-semibold text-slate-700">সাধারণ সম্পাদক / সভাপতি</span>
              </div>
              <div className="text-right">
                <span className="block text-[8px] text-slate-400">মেয়াদ</span>
                <span className="font-semibold text-emerald-700">কার্যকরী</span>
              </div>
            </div>
          </div>

          {/* Card Back */}
          <div className="w-[340px] h-[520px] bg-white rounded-2xl border-2 border-slate-400 shadow-xl overflow-hidden flex flex-col justify-between p-5 text-center text-xs text-slate-700 print:shadow-none">
            <div>
              <h4 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">জরুরি নির্দেশনাবলী</h4>
              <ul className="text-left text-[11px] space-y-2 mt-3 text-slate-600 list-disc list-inside">
                <li>এই পরিচয়পত্রটি {mosqueName}-এর সম্পত্তি।</li>
                <li>দায়িত্বরত অবস্থায় পরিচয়পত্র সাথে রাখা বাঞ্ছনীয়।</li>
                <li>কার্ডটি হারিয়ে গেলে বা পাওয়া গেলে অনতিবিলম্বে মসজিদ অফিসে যোগাযোগ করার জন্য অনুরোধ করা যাচ্ছে।</li>
                <li>কার্ডের অপব্যবহার আইনত দণ্ডনীয়।</li>
              </ul>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-3 text-[11px]">
              <p className="font-semibold text-slate-900">জরুরি যোগাযোগ ও ঠিকানা:</p>
              <p className="text-slate-600">{mosqueAddress}</p>
              <p className="font-bold text-emerald-800">{mosquePhone}</p>
            </div>

            <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-400">
              Powered by MasjidLedger Smart Mosque Platform
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

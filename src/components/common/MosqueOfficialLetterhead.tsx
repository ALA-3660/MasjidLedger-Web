import React from 'react';
import { Mosque } from '../../types';
import { getGlobalMosque } from '../../lib/mosqueStore';

export interface MosqueOfficialLetterheadProps {
  mosque?: Mosque | null;
  documentTitle?: string;
  subTitle?: string;
  refNumber?: string;
  dateStr?: string;
  periodLabel?: string;
  className?: string;
  variant?: 'standard' | 'minimal' | 'bordered';
  showBilingual?: boolean;
}

export const MosqueOfficialLetterhead: React.FC<MosqueOfficialLetterheadProps> = ({
  mosque: propMosque,
  documentTitle,
  subTitle,
  refNumber,
  dateStr,
  periodLabel,
  className = '',
  variant = 'standard',
  showBilingual = true,
}) => {
  const mosque = propMosque || getGlobalMosque();

  const nameBn = mosque?.nameBn || mosque?.name || 'বায়তুল মোকাররম কেন্দ্রীয় জামে মসজিদ';
  const nameEn = mosque?.nameEn || (mosque?.name && mosque.name !== mosque.nameBn ? mosque.name : 'Baitul Mukarram Central Jame Mosque');
  const address = mosque?.address || mosque?.district || 'ঢাকা, বাংলাদেশ';
  const phone = mosque?.phone || mosque?.altPhone || '';
  const email = mosque?.email || '';
  const website = mosque?.website || '';
  const regNo = mosque?.registrationNumber;
  const waqfEstate = mosque?.waqfEstateName;
  const bismillah = mosque?.letterheadSettings?.bismillahText || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  const showBismillah = mosque?.letterheadSettings?.showBismillah !== false;
  const hasLogo = Boolean(mosque?.logoUrl);

  return (
    <div
      className={`w-full letterhead-official-container bg-emerald-50/30 print:bg-emerald-50/20 border border-emerald-900/20 rounded-xl p-4 sm:p-5 mb-4 font-sans text-slate-900 transition-all ${className}`}
      style={{
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* 1. Arabic Bismillah Calligraphy */}
      {showBismillah && (
        <div className="text-center font-arabic text-sm sm:text-base text-stone-700 tracking-wider mb-2 font-semibold select-none">
          {bismillah}
        </div>
      )}

      {/* 2. Bilingual Mosque Branding (Dynamic) */}
      <div className={`flex items-center ${hasLogo ? 'justify-between' : 'justify-center'} gap-4`}>
        {/* Left: Mosque Logo (if exists, else clean centered layout without empty space) */}
        {hasLogo && (
          <div className="shrink-0 flex items-center justify-center">
            <img
              src={mosque!.logoUrl}
              alt="Mosque Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full border border-emerald-800/30 p-0.5 bg-white shadow-2xs"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Center: Mosque Bilingual Branding */}
        <div className={`flex-1 text-center ${!hasLogo ? 'max-w-2xl mx-auto' : 'px-2'}`}>
          {/* Bengali Name - Dominant & Large Typography */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-950 font-siliguri leading-tight tracking-tight drop-shadow-2xs">
            {nameBn}
          </h1>

          {/* English Name - Right Below Bengali Name in smaller size */}
          {showBilingual && nameEn && (
            <h2 className="text-xs sm:text-sm font-bold text-stone-600 uppercase tracking-wider font-sans mt-0.5">
              {nameEn}
            </h2>
          )}

          {/* Address & Waqf / Registration */}
          <p className="text-xs sm:text-[13px] text-stone-700 mt-1 leading-snug font-medium">
            {address}
            {regNo ? ` • রেজিঃ নং: ${regNo}` : ''}
            {waqfEstate ? ` • ওয়াকফ এস্টেট: ${waqfEstate}` : ''}
          </p>

          {/* Contact Bar: Phone, Email, Web */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-stone-600 mt-1 font-medium">
            {phone && (
              <span>
                <strong className="text-stone-700">মোবাইল:</strong> {phone}
              </span>
            )}
            {email && (
              <span>
                <strong className="text-stone-700">ইমেইল:</strong> {email}
              </span>
            )}
            {website && (
              <span>
                <strong className="text-stone-700">ওয়েব:</strong> {website}
              </span>
            )}
          </div>
        </div>

        {/* Right: Official Verification Seal / Mosque Code (shown when logo exists for balance) */}
        {hasLogo && (
          <div className="shrink-0 text-right hidden sm:block">
            <div className="border border-emerald-700/40 rounded-lg p-2 text-center bg-white/80 shadow-2xs">
              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-emerald-800 block">
                অফিসিয়াল নথি
              </span>
              <span className="text-[11px] font-mono font-bold text-stone-700 block">
                {mosque?.code || 'ML-PRO'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Subtle Islamic Decorative Accent Ribbon */}
      <div className="mt-3 relative flex items-center justify-center">
        <div className="w-full h-0.5 bg-gradient-to-r from-emerald-800 via-amber-500 to-emerald-800 rounded-full opacity-80" />
        <div className="absolute px-2 bg-emerald-50 text-emerald-800 text-[10px] select-none font-bold">
          ✦
        </div>
      </div>

      {/* 4. Document Header Sub-Bar (Title, Ref Number, Date, Period) */}
      {(documentTitle || subTitle || refNumber || dateStr || periodLabel) && (
        <div className="mt-2.5 pt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-700 font-medium">
          <div className="flex items-center gap-2">
            {documentTitle && (
              <span className="inline-block px-2.5 py-0.5 bg-emerald-900 text-white font-bold font-siliguri text-xs rounded-sm">
                {documentTitle}
              </span>
            )}
            {subTitle && <span className="text-[11px] text-stone-600 font-medium">({subTitle})</span>}
          </div>

          <div className="flex items-center gap-3 text-[11px] sm:text-xs">
            {periodLabel && (
              <span>
                <strong className="text-stone-800">সময়সীমা:</strong> {periodLabel}
              </span>
            )}
            {refNumber && (
              <span>
                <strong className="text-stone-800">স্মারক নং:</strong> {refNumber}
              </span>
            )}
            {dateStr && (
              <span>
                <strong className="text-stone-800">তারিখ:</strong> {dateStr}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Mosque } from '../../types';
import { printElement } from '../../lib/printUtils';

export type LetterheadBodyMode = 'blank' | 'sample_letter' | 'sample_notice' | 'guidelines';

export interface OfficialLetterheadPadProps {
  mosque?: Mosque | null;
  children?: React.ReactNode;
  bodyMode?: LetterheadBodyMode;
  showWritingGuidelines?: boolean;
  showSignatureImages?: boolean;
  className?: string;
  id?: string;
  isPrintMode?: boolean;
}

export const OfficialLetterheadPad: React.FC<OfficialLetterheadPadProps> = ({
  mosque,
  children,
  bodyMode = 'blank',
  showWritingGuidelines = false,
  showSignatureImages = true,
  className = '',
  id = 'official-letterhead-a4-sheet',
  isPrintMode = false,
}) => {
  const nameBn = mosque?.nameBn || mosque?.name || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট';
  const nameEn = mosque?.nameEn || (mosque?.name && mosque.name !== mosque.nameBn ? mosque.name : 'Mamun Jame Masjid Waqf Estate');
  const address = mosque?.address || 'খুরুশকুল, কক্সবাজার সদর, কক্সবাজার';
  const phone = mosque?.phone || mosque?.altPhone || '';
  const email = mosque?.email || '';
  const website = mosque?.website || '';
  const regNo = mosque?.registrationNumber;
  const waqfEstate = mosque?.waqfEstateName;
  const code = mosque?.code || 'MAMUN-WAQF-01';

  // Letterhead settings with authoritative defaults
  const settings = mosque?.letterheadSettings || {};
  const layout = settings.layout || 'CLASSICAL_WAQF';
  const showBismillah = settings.showBismillah !== false;
  const bismillahText = settings.bismillahText || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  const subtitleBn = settings.subtitleBn || 'গায়েবী মসজিদ নামে পরিচিত খুরুশকুলে সবচেয়ে পুরাতন মসজিদ';
  const footerNoteBn = settings.footerNoteBn || 'ওয়াকফ এস্টেটের সকল দান ও আয়-ব্যয় সরকারি ও শরীয়াহ অডিট সাপেক্ষে সংরক্ষিত।';
  const showWatermark = settings.showWatermark !== false;
  const showSignatures = settings.showSignatures !== false;
  const logoUrl = mosque?.logoUrl;

  // Authority & Signatures
  const presidentSig = showSignatureImages ? mosque?.presidentSignatureUrl : undefined;
  const secretarySig = showSignatureImages ? mosque?.secretarySignatureUrl : undefined;
  const presidentName = settings.presidentNameBn || '';
  const rawPresidentDesig = settings.presidentDesignationBn;
  const presidentDesignation = (!rawPresidentDesig || rawPresidentDesig === 'সভাপতি / মোতাওয়াল্লী' || rawPresidentDesig === 'সভাপতি / মোতাওয়াল্লী স্বাক্ষর')
    ? 'সভাপতি'
    : rawPresidentDesig;

  const secretaryName = settings.secretaryNameBn || '';
  const rawSecretaryDesig = settings.secretaryDesignationBn;
  const secretaryDesignation = (!rawSecretaryDesig || rawSecretaryDesig === 'সাধারণ সম্পাদক / খতিব' || rawSecretaryDesig === 'সাধারণ সম্পাদক / খতিব স্বাক্ষর' || rawSecretaryDesig === 'সাধারণ সম্পাদক / সেক্রেটারি' || rawSecretaryDesig === 'সাধারণ সম্পাদক')
    ? 'সাধারণ সম্পাদক/ মোতাওয়াল্লী'
    : rawSecretaryDesig;

  const effectiveGuidelines = showWritingGuidelines || bodyMode === 'guidelines';

  return (
    <div
      id={id}
      className={`official-letterhead-a4-sheet w-full max-w-[794px] min-h-[1123px] bg-white text-slate-900 rounded-none sm:rounded-lg shadow-2xl print:shadow-none border border-slate-300 print:border-none p-8 sm:p-12 print:p-10 mx-auto flex flex-col justify-between relative select-none box-border font-siliguri overflow-hidden ${className}`}
      style={{
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        fontFamily: "'Hind Siliguri', 'Tiro Bangla', 'Baloo Da 2', sans-serif",
      }}
    >
      {/* ================= 1. SUBTLE CENTRAL LOGO WATERMARK ================= */}
      {showWatermark && logoUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.045] print:opacity-[0.035] overflow-hidden z-0 select-none"
          aria-hidden="true"
        >
          <img
            src={logoUrl}
            alt=""
            className="w-[420px] h-[420px] object-contain filter grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* ================= 2. TOP HEADER SECTION ================= */}
      <header className="relative z-10 w-full shrink-0">
        {/* Arabic Bismillah Calligraphy */}
        {showBismillah && (
          <div className="text-center font-arabic text-sm sm:text-base text-stone-800 tracking-wider mb-2 font-semibold select-none">
            {bismillahText}
          </div>
        )}

        {/* --- PRESET 1: CLASSICAL WAQF PAD (ঐতিহ্যবাহী ওয়াকফ প্যাড - Centered Arch) --- */}
        {layout === 'CLASSICAL_WAQF' && (
          <div className="w-full text-center space-y-2 border-b-2 border-emerald-900/80 pb-3.5">
            {/* Centered Arch Emblem / Logo */}
            {logoUrl ? (
              <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto mb-1 flex items-center justify-center p-1 bg-white rounded-full border-2 border-emerald-800/40 shadow-xs">
                <img
                  src={logoUrl}
                  alt={nameBn}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-12 h-12 mx-auto mb-1 rounded-full border-2 border-emerald-800/30 flex items-center justify-center text-emerald-800 text-lg">
                🕌
              </div>
            )}

            {/* Bengali Name - Hind Siliguri, Large, Dominant */}
            <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight leading-tight">
              {nameBn}
            </h1>

            {/* English Name - Right Below */}
            {nameEn && (
              <h2 className="text-xs sm:text-sm font-bold text-stone-600 uppercase tracking-widest font-sans">
                {nameEn}
              </h2>
            )}

            {/* Subtitle / দ্বীনি স্লোগান Ribbon (Preserved) */}
            {subtitleBn && (
              <div className="inline-block px-3.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold font-baloo shadow-2xs">
                {subtitleBn}
              </div>
            )}

            {/* Waqf & Registration Row */}
            <div className="text-xs text-stone-700 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 font-medium">
              {waqfEstate && (
                <span>
                  <strong>ওয়াকফ এস্টেট:</strong> {waqfEstate}
                </span>
              )}
              {regNo && (
                <span>
                  • <strong>রেজিঃ নং:</strong> {regNo}
                </span>
              )}
              {code && (
                <span>
                  • <strong>কোড:</strong> {code}
                </span>
              )}
            </div>

            {/* Address & Contact Row */}
            <div className="text-[11px] sm:text-xs text-stone-600 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 font-tiro">
              <span>{address}</span>
              {phone && (
                <span>
                  • <strong>মোবাইল:</strong> {phone}
                </span>
              )}
              {email && (
                <span>
                  • <strong>ইমেইল:</strong> {email}
                </span>
              )}
              {website && (
                <span>
                  • <strong>ওয়েবসাইট:</strong> {website}
                </span>
              )}
            </div>

            {/* Classical Decorative Divider with Center Motif */}
            <div className="pt-1 flex items-center justify-center gap-2">
              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-emerald-800 to-emerald-900" />
              <span className="text-emerald-900 text-xs font-bold select-none px-1">❖</span>
              <div className="h-[1.5px] flex-1 bg-gradient-to-r from-emerald-900 via-emerald-800 to-transparent" />
            </div>
          </div>
        )}

        {/* --- PRESET 2: CENTERED TYPOGRAPHY (সেন্টার্ড টাইপোগ্রাফি - Formal Centered) --- */}
        {(layout === 'CENTERED' || layout === 'CENTERED_CREST') && (
          <div className="w-full text-center space-y-2 border-b-2 border-slate-800 pb-3">
            {logoUrl && (
              <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto mb-1 flex items-center justify-center p-0.5 bg-white">
                <img
                  src={logoUrl}
                  alt={nameBn}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {nameBn}
            </h1>

            {nameEn && (
              <h2 className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-widest font-sans">
                {nameEn}
              </h2>
            )}

            {subtitleBn && (
              <p className="text-xs text-slate-700 italic font-tiro">
                "{subtitleBn}"
              </p>
            )}

            <div className="text-xs text-slate-700 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 font-medium">
              <span>{address}</span>
              {phone && <span>• ফোন: {phone}</span>}
              {regNo && <span>• রেজিঃ: {regNo}</span>}
              {code && <span>• কোড: {code}</span>}
            </div>

            <div className="w-full h-0.5 bg-slate-800 mt-2" />
          </div>
        )}

        {/* --- PRESET 3: MODERN EMERALD (মডার্ন পান্না সবুজ - Left Logo + Right Block) --- */}
        {layout === 'MODERN_EMERALD' && (
          <div className="w-full border-b-2 border-emerald-800 pb-3.5 space-y-1">
            <div className="flex items-center justify-between gap-4">
              {/* Left Logo + Names */}
              <div className="flex items-center space-x-4">
                {logoUrl && (
                  <div className="w-18 h-18 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center p-1.5 bg-white rounded-2xl border border-emerald-600/30 shadow-xs">
                    <img
                      src={logoUrl}
                      alt={nameBn}
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-950 tracking-tight leading-tight">
                    {nameBn}
                  </h1>
                  {nameEn && (
                    <h2 className="text-xs sm:text-sm font-bold text-stone-600 uppercase tracking-wider font-sans">
                      {nameEn}
                    </h2>
                  )}
                  {subtitleBn && (
                    <p className="text-xs text-emerald-800 font-semibold font-baloo mt-0.5">
                      {subtitleBn}
                    </p>
                  )}
                  <p className="text-xs text-stone-600 mt-0.5 font-tiro">
                    {address}
                  </p>
                </div>
              </div>

              {/* Right Institutional Metadata Box */}
              <div className="shrink-0 text-right border-l-2 border-emerald-800/30 pl-4 space-y-0.5 text-xs text-stone-700 hidden sm:block">
                <div className="font-baloo font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block text-[11px]">
                  কোড: {code}
                </div>
                {regNo && (
                  <div className="text-[11px] text-stone-600 font-tiro">
                    রেজিঃ {regNo}
                  </div>
                )}
                {phone && (
                  <div className="text-[11px] text-stone-600 font-baloo">
                    মোবাইল: {phone}
                  </div>
                )}
                {email && (
                  <div className="text-[11px] text-stone-600 font-sans">
                    ইমেইল: {email}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- PRESET 4: MINIMAL HEADER (মিনিমালিস্ট - Clean Minimal) --- */}
        {(layout === 'MINIMAL_HEADER' || layout === 'STANDARD' || layout === 'CLASSIC') && (
          <div className="w-full border-b border-stone-400 pb-2.5 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                {logoUrl && (
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt={nameBn}
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-siliguri">
                    {nameBn}
                  </h1>
                  {nameEn && (
                    <h2 className="text-xs font-semibold text-stone-600 uppercase font-sans">
                      {nameEn}
                    </h2>
                  )}
                  <p className="text-[11px] text-stone-600 font-tiro">{address}</p>
                </div>
              </div>

              <div className="text-right text-[11px] text-stone-600 space-y-0.5">
                <div className="font-tiro">স্মারক ও রেজিস্ট্রি শাখা</div>
                <div className="font-baloo font-semibold text-stone-800">কোড: {code}</div>
                {phone && <div className="font-baloo">মোবাইল: {phone}</div>}
              </div>
            </div>
          </div>
        )}

        {/* --- Ref Number & Date Official Sub-Bar --- */}
        <div className="pt-2.5 flex items-center justify-between text-xs text-stone-700 font-medium">
          <div className="flex items-center space-x-1.5 font-tiro">
            <span className="font-bold text-stone-800 font-siliguri">স্মারক নং:</span>
            <span className="text-stone-400 tracking-wider">........................................................................</span>
          </div>
          <div className="flex items-center space-x-1.5 font-tiro">
            <span className="font-bold text-stone-800 font-siliguri">তারিখ:</span>
            <span className="text-stone-700 font-baloo">......... / ......... / ২০...... খ্রি.</span>
          </div>
        </div>
      </header>

      {/* ================= 3. MAIN DOCUMENT BODY (WRITING AREA) ================= */}
      <main className="relative z-10 flex-1 my-6 min-h-[520px] flex flex-col justify-start">
        {children ? (
          <div className="w-full text-slate-800 text-sm leading-relaxed font-tiro">
            {children}
          </div>
        ) : bodyMode === 'sample_letter' ? (
          /* Realistic Sample Certificate (প্রত্যয়নপত্র) */
          <div className="w-full flex-1 flex flex-col justify-start py-4 space-y-5 text-slate-800 font-tiro text-sm leading-relaxed">
            <div className="text-center font-siliguri font-bold text-lg sm:text-xl text-emerald-950 underline underline-offset-8 decoration-emerald-800/50 mb-2">
              প্রত্যয়নপত্র ও প্রশংসাপত্র
            </div>

            <div className="space-y-4 text-justify">
              <p>
                এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, জনাব/বেগম ...................................................................., পিতা/স্বামী: ...................................................................., মাতা: ...................................................................., গ্রাম/মহল্লা: {address.split(',')[0] || 'খুরুশকুল'}, ডাকঘর: {address.split(',')[1] || 'কক্সবাজার সদর'}, জেলা: {mosque?.district || 'কক্সবাজার'} অত্র জামে মসজিদের এলাকার একজন নিয়মিত ও সম্মানিত মুসল্লি।
              </p>
              <p>
                আমার জানামতে তিনি একজন সৎ, ধার্মিক ও চরিত্রবান ব্যক্তি। তিনি সামাজিক ও দ্বীনি কার্যক্রমে সক্রিয়ভাবে অংশগ্রহণ করেন। মসজিদ ও সমাজের শান্তি-শৃঙ্খলা বিরোধী কোনো কার্যকলাপে কখনো তাঁর সংশ্লিষ্টতা পাওয়া যায়নি। অত্র মসজিদ ওয়াকফ এস্টেটের সার্বিক কার্যক্রমে তাঁর অবদান প্রশংসনীয়।
              </p>
              <p>
                আমি তাঁর জীবনের সর্বাঙ্গীন কল্যাণ, সুস্বাস্থ্য ও উত্তরোত্তর সমৃদ্ধি কামনা করছি।
              </p>
            </div>
          </div>
        ) : bodyMode === 'sample_notice' ? (
          /* Realistic Sample Official Notice (অফিসিয়াল নোটিশ) */
          <div className="w-full flex-1 flex flex-col justify-start py-4 space-y-5 text-slate-800 font-tiro text-sm leading-relaxed">
            <div className="text-center font-siliguri font-bold text-lg sm:text-xl text-emerald-950 underline underline-offset-8 decoration-emerald-800/50 mb-2">
              জরুরি সাধারণ সভা ও আর্থিক প্রতিবেদন সংক্রান্ত নোটিশ
            </div>

            <div className="space-y-4 text-justify">
              <p>
                অত্র {nameBn}-এর সম্মানিত উপদেষ্টা মণ্ডলী, কার্যনির্বাহী কমিটির সকল সদস্য এবং এলাকার গণ্যমান্য মুসল্লিবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, আগামী .................................... তারিখ রোজ .................................... বাদ আছর মসজিদ সংলগ্ন কনফারেন্স কক্ষে এক জরুরি সাধারণ সভা অনুষ্ঠিত হবে।
              </p>
              <div className="bg-stone-50 border-l-4 border-emerald-800 p-3.5 my-2 space-y-1 font-sans text-xs">
                <div className="font-bold text-stone-900 font-siliguri text-sm mb-1">আলোচ্য বিষয়সমূহ:</div>
                <div>১. বিগত সভার কার্যবিবরণী অনুমোদন ও অগ্রগতি পর্যালোচনা।</div>
                <div>২. বিগত অর্থবছরের আয়-ব্যয়ের চূড়ান্ত নিরীক্ষিত হিসাব অনুমোদন।</div>
                <div>৩. মসজিদ উন্নয়ন ও সংস্কার প্রকল্পের অগ্রগতি ও পরিকল্পনা গ্রহণ।</div>
                <div>৪. বিবিধ (সভাপতির অনুমতিক্রমে)।</div>
              </div>
              <p>
                উক্ত গুরুত্বপূর্ণ সভায় সংশ্লিষ্ট সকল সম্মানিত সদস্য ও দায়িত্বশীলদের যথাসময়ে উপস্থিত হয়ে মূল্যবান মতামত ও পরামর্শ প্রদানের জন্য বিশেষভাবে অনুরোধ করা হলো।
              </p>
            </div>
          </div>
        ) : (
          /* Default: Pristine Blank Letterhead Pad Area */
          <div className="w-full flex-1 flex flex-col justify-between py-2 text-slate-400">
            <div className="w-full space-y-6 select-none">
              <div className="text-xs text-stone-400 font-tiro italic">
                বরাবর,
                <br />
                ...................................................................................................
                <br />
                ...................................................................................................
              </div>

              <div className="font-bold text-stone-500 text-xs font-siliguri">
                বিষয়: ....................................................................................................................................
              </div>

              <div className="text-xs text-stone-400 font-tiro italic">
                জনাব / মহোদয়,
                <br />
                যথাবিহিত সম্মান প্রদর্শনপূর্বক বিনীত নিবেদন এই যে,
              </div>

              {effectiveGuidelines && (
                <div className="space-y-4 pt-4 opacity-25">
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="h-0.5 w-full bg-slate-300" />
                  <div className="h-0.5 w-5/6 bg-slate-300" />
                </div>
              )}
            </div>

            <div className="text-center text-[11px] text-stone-400 italic print:hidden py-3">
              [এই খালি অংশে অফিসিয়াল চিঠি, আবেদন, প্রত্যয়নপত্র, নোটিশ বা সভার সিদ্ধান্ত লিখিত বা প্রিন্ট হবে]
            </div>
          </div>
        )}
      </main>

      {/* ================= 4. FOOTER & OFFICIAL AUTHORITY SECTION ================= */}
      {showSignatures && (
        <footer className="relative z-10 w-full shrink-0 pt-4 mt-auto">
          {/* Two-Column Balanced Signature & Authority Block */}
          <div className="grid grid-cols-2 gap-8 items-end border-t border-stone-300/80 pt-4 pb-3">
            {/* Left Column: সভাপতি */}
            <div className="text-left space-y-1">
              <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-[10px] font-bold font-siliguri mb-1">
                সভাপতি
              </div>

              <div className="h-16 flex items-end">
                {presidentSig ? (
                  <img
                    src={presidentSig}
                    alt="President Signature"
                    className="max-h-16 max-w-[190px] object-contain filter contrast-125 select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-44 sm:w-52">
                    <div className="w-full border-b-2 border-dashed border-stone-500 mb-1" />
                    <div className="text-[10px] text-stone-400 font-tiro italic">
                      স্বাক্ষর ও সীল
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-0.5 space-y-0.5">
                <div className="text-xs sm:text-sm font-bold text-stone-900 font-siliguri leading-snug">
                  {presidentName ? (
                    presidentName
                  ) : (
                    <span className="text-stone-400 font-normal font-tiro text-xs">
                      নাম: ....................................................
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-emerald-900 font-siliguri">
                  {presidentDesignation}
                </div>
                <div className="text-[10px] text-stone-600 font-tiro leading-tight">
                  {nameBn}
                </div>
                <div className="text-[10px] text-stone-500 font-baloo pt-0.5">
                  তারিখ: ........./........./২০... খ্রি.
                </div>
              </div>
            </div>

            {/* Right Column: সাধারণ সম্পাদক/ মোতাওয়াল্লী */}
            <div className="text-right space-y-1">
              <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-[10px] font-bold font-siliguri mb-1">
                সাধারণ সম্পাদক/ মোতাওয়াল্লী
              </div>

              <div className="h-16 flex items-end justify-end">
                {secretarySig ? (
                  <img
                    src={secretarySig}
                    alt="Secretary Signature"
                    className="max-h-16 max-w-[190px] object-contain filter contrast-125 select-none ml-auto"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-44 sm:w-52 ml-auto text-right">
                    <div className="w-full border-b-2 border-dashed border-stone-500 mb-1" />
                    <div className="text-[10px] text-stone-400 font-tiro italic">
                      স্বাক্ষর ও সীল
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-0.5 space-y-0.5">
                <div className="text-xs sm:text-sm font-bold text-stone-900 font-siliguri leading-snug">
                  {secretaryName ? (
                    secretaryName
                  ) : (
                    <span className="text-stone-400 font-normal font-tiro text-xs">
                      নাম: ....................................................
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-emerald-900 font-siliguri">
                  {secretaryDesignation}
                </div>
                <div className="text-[10px] text-stone-600 font-tiro leading-tight">
                  {nameBn}
                </div>
                <div className="text-[10px] text-stone-500 font-baloo pt-0.5">
                  তারিখ: ........./........./২০... খ্রি.
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Footer Note Bar */}
          {footerNoteBn && (
            <div className="mt-2 pt-2 border-t border-stone-200 text-center text-[10px] text-stone-600 font-tiro leading-tight">
              {footerNoteBn}
            </div>
          )}
        </footer>
      )}
    </div>
  );
};

/**
 * Clean isolated print trigger for the Official Letterhead Pad
 */
export async function printOfficialLetterheadPad(elementId: string = 'official-letterhead-a4-sheet') {
  return await printElement(elementId, {
    title: 'অফিসিয়াল লেটারহেড প্যাড — মামুন জামে মসজিদ',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    margin: '0mm',
    preserveColors: true,
    customStyles: `
      @page {
        size: A4 portrait !important;
        margin: 0mm !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      .official-letterhead-a4-sheet {
        width: 210mm !important;
        min-height: 297mm !important;
        max-width: 210mm !important;
        height: auto !important;
        padding: 16mm 20mm 16mm 20mm !important;
        box-sizing: border-box !important;
        border: none !important;
        box-shadow: none !important;
        margin: 0 auto !important;
        position: relative !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
      .official-letterhead-a4-sheet .relative {
        position: relative !important;
      }
      .official-letterhead-a4-sheet .absolute {
        position: absolute !important;
      }
    `,
  });
}

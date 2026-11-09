import React from 'react';
import { Mosque } from '../../types';

export interface OfficialReportSignaturesProps {
  currentMosque?: Mosque | null;
  /**
   * Title for column 1 (preparer/accountant)
   * Default: 'হিসাবরক্ষক / প্রস্তুতকারী'
   */
  preparerTitle?: string;
  preparerSubtitle?: string;
  preparerSignatureUrl?: string;

  /**
   * Title for column 2 (General Secretary / Mutawalli)
   * Default: 'সাধারণ সম্পাদক / মোতাওয়াল্লী'
   */
  secretaryTitle?: string;
  secretarySubtitle?: string;
  secretarySignatureUrl?: string;

  /**
   * Title for column 3 (President)
   * Default: 'সভাপতি'
   */
  presidentTitle?: string;
  presidentSubtitle?: string;
  presidentSignatureUrl?: string;

  /**
   * Optional middle column 4 if treasurer is also needed
   */
  showTreasurer?: boolean;
  treasurerTitle?: string;
  treasurerSubtitle?: string;
  treasurerSignatureUrl?: string;

  /**
   * Whether to include the system audit bottom line
   */
  showAuditFooter?: boolean;
  auditFooterText?: string;
  className?: string;
}

export const OfficialReportSignatures: React.FC<OfficialReportSignaturesProps> = ({
  currentMosque,
  preparerTitle = 'হিসাবরক্ষক / প্রস্তুতকারী',
  preparerSubtitle = 'স্বাক্ষর ও তারিখ',
  preparerSignatureUrl,
  secretaryTitle = 'সাধারণ সম্পাদক / মোতাওয়াল্লী',
  secretarySubtitle = 'স্বাক্ষর ও সীল',
  secretarySignatureUrl,
  presidentTitle = 'সভাপতি',
  presidentSubtitle = 'স্বাক্ষর ও সীল',
  presidentSignatureUrl,
  showTreasurer = false,
  treasurerTitle = 'কোষাধ্যক্ষ / অর্থ সম্পাদক',
  treasurerSubtitle = 'স্বাক্ষর ও তারিখ',
  treasurerSignatureUrl,
  showAuditFooter = true,
  auditFooterText,
  className = '',
}) => {
  const finalSecSig = secretarySignatureUrl ?? currentMosque?.secretarySignatureUrl;
  const finalPresSig = presidentSignatureUrl ?? currentMosque?.presidentSignatureUrl;
  const finalTreasSig = treasurerSignatureUrl ?? currentMosque?.treasurerSignatureUrl;

  const colsClass = showTreasurer ? 'grid-cols-4 gap-4' : 'grid-cols-3 gap-6';

  return (
    <div className={`mt-8 pt-6 border-t-2 border-slate-900 break-inside-avoid ${className}`}>
      <div className={`grid ${colsClass} text-center text-xs font-baloo`}>
        {/* Column 1: Preparer / Accountant */}
        <div className="flex flex-col items-center justify-end">
          <div className="h-12 w-full flex items-end justify-center mb-1">
            {preparerSignatureUrl ? (
              <img
                src={preparerSignatureUrl}
                alt="Preparer Signature"
                referrerPolicy="no-referrer"
                className="max-h-12 max-w-full object-contain"
              />
            ) : null}
          </div>
          <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
            {preparerTitle}
          </div>
          <div className="text-[10px] text-slate-600 font-baloo">{preparerSubtitle}</div>
        </div>

        {/* Optional Column: Treasurer */}
        {showTreasurer && (
          <div className="flex flex-col items-center justify-end">
            <div className="h-12 w-full flex items-end justify-center mb-1">
              {finalTreasSig ? (
                <img
                  src={finalTreasSig}
                  alt="Treasurer Signature"
                  referrerPolicy="no-referrer"
                  className="max-h-12 max-w-full object-contain"
                />
              ) : null}
            </div>
            <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
              {treasurerTitle}
            </div>
            <div className="text-[10px] text-slate-600 font-baloo">{treasurerSubtitle}</div>
          </div>
        )}

        {/* Column 2: Secretary / Mutawalli */}
        <div className="flex flex-col items-center justify-end">
          <div className="h-12 w-full flex items-end justify-center mb-1">
            {finalSecSig ? (
              <img
                src={finalSecSig}
                alt="Secretary Signature"
                referrerPolicy="no-referrer"
                className="max-h-12 max-w-full object-contain"
              />
            ) : (
              <span className="font-tiro italic font-bold text-slate-800 text-sm select-none">
                আলহাজ্ব মো: রফিকুল ইসলাম
              </span>
            )}
          </div>
          <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
            {secretaryTitle}
          </div>
          <div className="text-[10px] text-slate-600 font-baloo">{secretarySubtitle}</div>
        </div>

        {/* Column 3: President */}
        <div className="flex flex-col items-center justify-end">
          <div className="h-12 w-full flex items-end justify-center mb-1">
            {finalPresSig ? (
              <img
                src={finalPresSig}
                alt="President Signature"
                referrerPolicy="no-referrer"
                className="max-h-12 max-w-full object-contain"
              />
            ) : (
              <span className="font-tiro italic font-bold text-slate-800 text-sm select-none">
                হাজী মোঃ শামসুল আলম
              </span>
            )}
          </div>
          <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
            {presidentTitle}
          </div>
          <div className="text-[10px] text-slate-600 font-baloo">{presidentSubtitle}</div>
        </div>
      </div>

      {showAuditFooter && (
        <div className="border-t border-slate-300 mt-6 pt-2 flex flex-wrap justify-between items-center text-[10px] text-slate-600 font-baloo break-inside-avoid">
          <div>
            <span>প্রতিবেদন প্রস্তুতকারী সিস্টেম: </span>
            <span className="font-bold text-slate-800">
              {auditFooterText || 'মসজিদলেজার স্বয়ংক্রিয় হিসাব ও নিরীক্ষা ব্যবস্থাপনা সিস্টেম'}
            </span>
          </div>
          <div>
            <span>মুদ্রণ সময়: {new Date().toLocaleString('bn-BD')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { IncomeEntry, ExpenseEntry, Donation, Mosque } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { Barcode128 } from './BarcodeQRService';
import { getSmartPosReceiptFooter } from '../lib/posReceiptHelper';
import { getJumaDisplayDetails } from '../lib/jumaHelper';

export interface PosThermalDocumentProps {
  item: IncomeEntry | ExpenseEntry | Donation;
  type: 'INCOME' | 'EXPENSE' | 'DONATION';
  mosque: Mosque | null;
  paperSize?: '58mm' | '80mm';
  isReprint?: boolean;
  language?: Language;
  printedBy?: string;
}

export const PosThermalDocument: React.FC<PosThermalDocumentProps> = ({
  item,
  type,
  mosque,
  paperSize = '80mm',
  isReprint = false,
  language = 'bn',
  printedBy,
}) => {
  const isIncome = type === 'INCOME' || type === 'DONATION';
  const isDonation = type === 'DONATION';
  const is58mm = paperSize === '58mm';

  // Extract common fields safely
  const voucherOrReceiptNo =
    'voucherNumber' in item
      ? item.voucherNumber
      : 'receiptNumber' in item
      ? (item as Donation).receiptNumber
      : (item as any).id;

  const dateStr = item.date || new Date().toISOString().split('T')[0];

  const personName =
    'donorName' in item && item.donorName
      ? item.donorName
      : 'payeeName' in item && (item as ExpenseEntry).payeeName
      ? (item as ExpenseEntry).payeeName
      : isIncome
      ? 'সম্মানিত দানশীল মুসল্লি'
      : 'সরবরাহকারী / প্রাপক';

  const personPhone =
    'donorPhone' in item
      ? item.donorPhone
      : 'payeePhone' in item
      ? (item as ExpenseEntry).payeePhone
      : undefined;

  const headDisplay =
    'mainHeadNameBn' in item
      ? `${item.mainHeadNameBn || ''}${
          (item as IncomeEntry).subHeadNameBn ? ` › ${(item as IncomeEntry).subHeadNameBn}` : ''
        }`
      : 'category' in item
      ? `সাধারণ ও প্রকল্প অনুদান (${(item as Donation).category})`
      : 'সাধারণ লেনদেন';

  const paymentMethodDisplay = `${item.paymentMethod || 'CASH'} (${item.accountName || 'প্রধান ক্যাশ'})`;

  const amountInWordsBn = numberToBanglaWords(item.amount);

  const jumaInfo = getJumaDisplayDetails(item, language);
  const isJuma = jumaInfo.isJuma;

  const documentTitle = isJuma
    ? 'জুমার কালেকশন রসিদ'
    : isDonation
    ? 'দান ও অনুদান রসিদ'
    : isIncome
    ? 'আয় ও প্রাপ্তি রসিদ'
    : 'ব্যয় পরিশোধ ভাউচার';

  const documentSubTitle = isJuma
    ? 'JUMA COLLECTION RECEIPT'
    : isDonation
    ? 'DONATION RECEIPT'
    : isIncome
    ? 'INCOME RECEIPT'
    : 'EXPENSE VOUCHER';

  const smartFooterMessage = getSmartPosReceiptFooter(item, type);

  const currentTimeFormatted = new Date().toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`pos-thermal-container bg-white text-black font-tiro select-none ${
        is58mm ? 'pos-print-58mm max-w-[58mm] text-[10.5px]' : 'pos-print-80mm max-w-[80mm] text-[12px]'
      } leading-tight mx-auto p-2`}
      style={{
        width: is58mm ? '56mm' : '76mm',
        color: '#000000',
        backgroundColor: '#ffffff',
      }}
    >
      {/* 1. TOP BISMILLAH */}
      <div className="text-center font-arabic text-xs sm:text-sm font-bold tracking-wider mb-0.5">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </div>

      {/* 2. MOSQUE HEADER */}
      <div className="text-center space-y-0.5 border-b border-dashed border-black pb-1.5 mb-1.5">
        <h2 className="font-siliguri font-bold text-sm sm:text-base leading-snug tracking-tight text-black">
          {mosque?.nameBn || mosque?.name || 'বায়তুল মামুর জামে মসজিদ'}
        </h2>
        {mosque?.address && (
          <p className="font-baloo text-[10px] leading-tight text-slate-900">
            {mosque.address}
            {mosque.district ? `, ${mosque.district}` : ''}
          </p>
        )}
        {mosque?.phone && (
          <p className="font-baloo text-[10px] leading-tight font-mono text-slate-900">
            ফোন: {mosque.phone}
          </p>
        )}
        {mosque?.waqfEstateName && (
          <p className="font-baloo text-[9.5px] leading-tight text-slate-800">
            ওয়াকফ এস্টেট: {mosque.waqfEstateName}
          </p>
        )}
      </div>

      {/* 3. DOCUMENT TITLE & REPRINT BADGE */}
      <div className="text-center space-y-0.5 mb-1.5">
        <div className="inline-block border border-black px-2 py-0.5 font-siliguri font-bold text-[11px] uppercase tracking-wide">
          {documentTitle}
        </div>
        <div className="font-mono text-[9px] text-slate-800 tracking-wider">
          [{documentSubTitle}]
        </div>
        {isReprint && (
          <div className="font-siliguri font-bold text-[10px] text-black border-y border-black py-0.5 my-1 tracking-wider">
            ** পুনঃমুদ্রিত / ডুপ্লিকেট কপি **
          </div>
        )}
      </div>

      {/* 4. RECEIPT METADATA (NO, DATE, CREATOR) */}
      <div className="border-y border-dashed border-black py-1 mb-1.5 space-y-0.5 text-[10.5px]">
        <div className="flex justify-between items-center">
          <span className="font-semibold">{isIncome ? 'রসিদ নং:' : 'ভাউচার নং:'}</span>
          <span className="font-mono font-bold">{voucherOrReceiptNo}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold">তারিখ:</span>
          <span>{formatDate(dateStr, language)}</span>
        </div>
        {('createdByName' in item && item.createdByName) || printedBy ? (
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-semibold">এন্ট্রি কারক:</span>
            <span>{('createdByName' in item ? item.createdByName : printedBy) || 'ক্যাশিয়ার'}</span>
          </div>
        ) : null}
      </div>

      {/* 5. STRUCTURED TRANSACTION DETAILS */}
      <div className="space-y-1 text-[10.5px] mb-2">
        {/* Donor or Payee or Juma Detail */}
        {isJuma ? (
          <div className="space-y-0.5">
            <span className="font-semibold block text-[10px] text-slate-800">
              কালেকশনের বিবরণ ও জামাত:
            </span>
            <div className="font-bold text-black pl-1">{jumaInfo.title}</div>
            <div className="text-[10px] text-slate-800 pl-1">
              <span className="font-semibold">গণনা টিম: </span>
              <span>{jumaInfo.countingTeam}</span>
            </div>
            <div className="text-[10px] text-slate-800 pl-1">
              <span className="font-semibold">সাক্ষী: </span>
              <span>{jumaInfo.witness}</span>
            </div>
          </div>
        ) : (
          <div>
            <span className="font-semibold block text-[10px] text-slate-800">
              {isIncome ? 'প্রদানকারী / দাতার নাম:' : 'প্রাপকের নাম:'}
            </span>
            <div className="font-bold text-black pl-1">{personName}</div>
          </div>
        )}

        {/* Phone */}
        {!isJuma && personPhone && (
          <div className="flex justify-between">
            <span className="font-semibold text-slate-800">মোবাইল:</span>
            <span className="font-mono">{personPhone}</span>
          </div>
        )}

        {/* Head / Sector */}
        <div>
          <span className="font-semibold block text-[10px] text-slate-800">
            {isIncome ? 'আয়ের খাত ও বিবরণ:' : 'ব্যয়ের খাত ও বিবরণ:'}
          </span>
          <div className="font-medium text-black pl-1">
            {isJuma ? 'পবিত্র জুমার সাধারণ কালেকশন' : headDisplay}
          </div>
        </div>

        {/* Payment Method & Account */}
        <div className="flex justify-between text-[10px]">
          <span className="font-semibold text-slate-800">মাধ্যম ও হিসাব:</span>
          <span className="font-medium text-right">{paymentMethodDisplay}</span>
        </div>

        {/* Reference / Trx */}
        {item.reference && (
          <div className="flex justify-between text-[10px]">
            <span className="font-semibold text-slate-800">রেফারেন্স:</span>
            <span className="font-mono font-medium">{item.reference}</span>
          </div>
        )}

        {/* Description / Remarks if available */}
        {!isJuma && item.description && (
          <div className="pt-0.5 border-t border-dotted border-slate-400 text-[10px]">
            <span className="font-semibold text-slate-800">বিবরণ: </span>
            <span className="italic">{item.description}</span>
          </div>
        )}
      </div>

      {/* 6. GRAND TOTAL AMOUNT BOX */}
      <div className="border-2 border-black p-1.5 rounded-sm my-2 text-center bg-slate-50">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-900">
          {isIncome ? 'গৃহীত মোট পরিমাণ' : 'পরিশোধিত মোট পরিমাণ'}
        </div>
        <div className="text-base sm:text-lg font-mono font-bold text-black my-0.5 tracking-tight">
          {formatCurrency(item.amount, language)}
        </div>
        <div className="text-[9.5px] font-siliguri font-semibold text-slate-900 leading-tight">
          কথায়: {amountInWordsBn}
        </div>
      </div>

      {/* 7. SMART FOOTER MESSAGE / ISLAMIC DU'A (Contextual by Income Category or Expense) */}
      <div className="text-center py-1.5 border-y border-dashed border-black mb-2">
        <p
          className={`font-siliguri ${
            is58mm ? 'text-[9.5px]' : 'text-[10.5px]'
          } font-semibold text-black leading-snug px-0.5 break-words`}
        >
          {smartFooterMessage}
        </p>
      </div>

      {/* 8. SIGNATURE LINES */}
      <div className="pt-4 pb-2 grid grid-cols-2 gap-2 text-center text-[9.5px] font-siliguri">
        <div>
          <div className="border-t border-black pt-0.5">
            <span className="font-semibold">{isIncome ? 'আদায়কারী / ক্যাশিয়ার' : 'প্রস্তুতকারী'}</span>
          </div>
        </div>
        <div>
          <div className="border-t border-black pt-0.5">
            <span className="font-semibold">অনুমোদনকারী</span>
          </div>
        </div>
      </div>

      {/* 9. BARCODE / VERIFICATION */}
      <div className="text-center my-1.5 flex flex-col items-center justify-center">
        <Barcode128 value={voucherOrReceiptNo} width={1.2} height={24} showText={false} />
        <span className="font-mono text-[8.5px] tracking-widest mt-0.5">{voucherOrReceiptNo}</span>
      </div>

      {/* 10. FOOTER & TIMESTAMPS */}
      <div className="text-center space-y-0.5 text-[8.5px] text-slate-700 border-t border-dashed border-black pt-1">
        <div>প্রিন্ট: {currentTimeFormatted}</div>
        <div className="font-mono">MasjidLedger POS • জাযাকুমুল্লাহু খাইরান</div>
        <div className="text-[7.5px] text-slate-500 font-mono tracking-widest pt-0.5">
          - - - - - - - - - - - - - - - - - - - -
        </div>
      </div>
    </div>
  );
};

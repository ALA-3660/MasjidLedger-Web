import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  CheckCircle,
  ShieldCheck,
  Check,
  MessageSquare,
  Building2,
  FileText,
  Receipt,
  Copy,
} from 'lucide-react';
import { IncomeEntry, ExpenseEntry, Donation, Mosque } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords, numberToEnglishWords } from '../lib/banglaNumberToWords';
import { PosThermalDocument } from './PosThermalDocument';
import { getJumaDisplayDetails } from '../lib/jumaHelper';

export type PrintFormat = 'A4' | 'POS_80' | 'POS_58';

// ============================================================
// 1. OFFICIAL MONEY RECEIPT MODAL (দান ও অনুদান রসিদ)
// ============================================================
export interface MoneyReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: Donation | null;
  mosque: Mosque | null;
  language: Language;
  initialFormat?: PrintFormat;
  isReprint?: boolean;
  autoPrint?: boolean;
}

export const MoneyReceiptModal: React.FC<MoneyReceiptModalProps> = ({
  isOpen,
  onClose,
  donation,
  mosque,
  language,
  initialFormat = 'A4',
  isReprint: initialIsReprint = false,
  autoPrint = false,
}) => {
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>(initialFormat);
  const [isReprint, setIsReprint] = useState(initialIsReprint);

  useEffect(() => {
    if (isOpen) {
      setPrintFormat(initialFormat);
      setIsReprint(initialIsReprint);
      if (autoPrint) {
        const timer = setTimeout(() => {
          window.print();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, initialFormat, initialIsReprint, autoPrint]);

  if (!isOpen || !donation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendSms = async () => {
    if (!donation.donorPhone) return;
    setSmsSending(true);
    try {
      const token = localStorage.getItem('ml_auth_token') || localStorage.getItem('ml_token');
      const res = await fetch('/api/v1/sms/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          donationId: donation.id,
          recipientPhone: donation.donorPhone,
        }),
      });
      if (res.ok) {
        setSmsSent(true);
        setTimeout(() => setSmsSent(false), 4000);
      }
    } catch (err) {
      console.error('SMS send failed:', err);
    } finally {
      setSmsSending(false);
    }
  };

  const amountInWordsBn = numberToBanglaWords(donation.amount);
  const amountInWordsEn = numberToEnglishWords(donation.amount);

  const isPos = printFormat === 'POS_80' || printFormat === 'POS_58';
  const posPaperSize = printFormat === 'POS_58' ? '58mm' : '80mm';

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto single-invoice-print-wrapper ${
        isPos ? (printFormat === 'POS_58' ? 'pos-print-58mm-active' : 'pos-print-80mm-active') : 'a4-print-active'
      }`}
    >
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto single-invoice-print-card ${
          isPos ? (printFormat === 'POS_58' ? 'max-w-sm' : 'max-w-md') : 'max-w-xl'
        }`}
      >
        {/* Modal Controls Bar - Hidden on print */}
        <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden print-controls-bar">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold font-siliguri">
              দান ও অনুদান রসিদ
            </span>
          </div>

          {/* Format Selector & Actions */}
          <div className="flex items-center flex-wrap gap-1.5">
            {/* Format Switcher Tabs */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-siliguri font-semibold">
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                  printFormat === 'A4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="অফিসিয়াল A4 লেটারহেড রসিদ"
              >
                <FileText className="w-3 h-3" />
                <span>A4</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('POS_80')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                  printFormat === 'POS_80'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="POS 80mm থার্মাল পেপার (3 ইঞ্চি)"
              >
                <Receipt className="w-3 h-3" />
                <span>POS 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('POS_58')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                  printFormat === 'POS_58'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="POS 58mm থার্মাল পেপার (2 ইঞ্চি)"
              >
                <Receipt className="w-3 h-3" />
                <span>58mm</span>
              </button>
            </div>

            {/* Reprint Toggle Button */}
            <button
              type="button"
              onClick={() => setIsReprint(!isReprint)}
              className={`px-2 py-1 rounded-lg text-[11px] font-siliguri font-semibold flex items-center space-x-1 border transition-all cursor-pointer ${
                isReprint
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="ডুপ্লিকেট / পুনঃমুদ্রণ চিহ্নিতকরণ"
            >
              <Copy className="w-3 h-3" />
              <span>{isReprint ? 'ডুপ্লিকেট: অন' : 'ডুপ্লিকেট'}</span>
            </button>

            {/* SMS Receipt Button */}
            {donation.donorPhone && (
              <button
                id="btn-send-sms-receipt"
                type="button"
                onClick={handleSendSms}
                disabled={smsSending || smsSent}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  smsSent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                }`}
              >
                {smsSent ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>পাঠানো হয়েছে</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3 h-3" />
                    <span>{smsSending ? 'পাঠানো হচ্ছে...' : 'SMS'}</span>
                  </>
                )}
              </button>
            )}

            {/* Print Trigger Button */}
            <button
              id="btn-print-receipt-action"
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-receipt-modal"
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Content Container */}
        <div className="bg-slate-100 p-2 sm:p-4 overflow-y-auto max-h-[80vh] flex justify-center">
          {isPos ? (
            /* POS THERMAL RECEIPT VIEW */
            <div className="bg-white shadow-md border border-slate-300 rounded-sm print:shadow-none print:border-none p-1">
              <PosThermalDocument
                item={donation}
                type="DONATION"
                mosque={mosque}
                paperSize={posPaperSize}
                isReprint={isReprint}
                language={language}
                printedBy={donation.receivedByName}
              />
            </div>
          ) : (
            /* OFFICIAL A4 LETTERHEAD VIEW */
            <div className="p-5 sm:p-6 bg-white text-slate-900 border-2 border-slate-800 rounded-xl font-tiro single-invoice-sheet print:m-0 print:border-2 print:border-slate-800 print:rounded-none print:p-6 print:space-y-3 space-y-3.5 w-full">
              {/* Top Letterhead with Logo, Bismillah & Mosque Info */}
              <div className="border-b-2 border-slate-800 pb-3 space-y-2">
                {/* Arabic Bismillah */}
                <div className="text-center">
                  <div className="font-arabic-bismillah text-base sm:text-lg text-slate-950 font-bold tracking-wide">
                    بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                  </div>
                </div>

                {/* Letterhead Main Header */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Mosque Logo */}
                  <div className="w-16 h-16 flex items-center justify-center shrink-0">
                    {mosque?.logoUrl ? (
                      <img
                        src={mosque.logoUrl}
                        alt="Mosque Logo"
                        className="max-h-16 max-w-16 object-contain rounded"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-slate-600">
                        <Building2 className="w-6 h-6" />
                        <span className="text-[8px] font-bold font-siliguri mt-0.5">মসজিদ লোগো</span>
                      </div>
                    )}
                  </div>

                  {/* Center: Mosque Letterhead Info */}
                  <div className="text-center flex-1 space-y-0.5">
                    <h1 className="font-mosque-name text-xl sm:text-2xl font-bold text-black tracking-tight leading-snug">
                      {mosque?.nameBn || mosque?.name || 'বায়তুল মামুর জামে মসজিদ'}
                    </h1>
                    <p className="font-letterhead text-xs text-slate-800 font-medium">
                      {mosque?.address ? `${mosque.address}, ` : ''}{mosque?.district || 'ঢাকা'}
                      {mosque?.phone ? ` • ফোন: ${mosque.phone}` : ''}
                    </p>
                    {mosque?.waqfEstateName && (
                      <p className="font-letterhead text-[11px] text-slate-700 font-medium">
                        ওয়াকফ এস্টেট: {mosque.waqfEstateName}
                      </p>
                    )}
                    {/* Document Title */}
                    <div className="pt-1 flex items-center justify-center gap-2">
                      <span className="inline-block bg-slate-100 border border-slate-700 text-black font-siliguri font-bold text-xs sm:text-sm px-4 py-0.5 rounded shadow-2xs">
                        {donation && getJumaDisplayDetails(donation, language).isJuma
                          ? 'জুমার কালেকশন — অফিসিয়াল ক্যাশ রসিদ'
                          : 'দান ও অনুদান — অফিসিয়াল মানি রসিদ'}
                      </span>
                      {isReprint && (
                        <span className="inline-block bg-amber-100 border border-amber-700 text-amber-900 font-siliguri font-bold text-xs px-2 py-0.5 rounded">
                          ডুপ্লিকেট কপি
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Verified Box */}
                  <div className="w-16 text-center shrink-0 hidden sm:flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center text-[8px] text-slate-800 font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 mb-0.5" />
                      <span className="font-bold">VERIFIED</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Info Bar */}
              <div className="grid grid-cols-2 border border-slate-400 bg-slate-50 rounded text-xs">
                <div className="p-2 border-r border-slate-400">
                  <span className="text-slate-700 font-semibold">রশিদ নং: </span>
                  <strong className="font-mono text-black text-sm font-bold ml-1">{donation.receiptNumber}</strong>
                </div>
                <div className="p-2 text-right">
                  <span className="text-slate-700 font-semibold">তারিখ: </span>
                  <strong className="text-black font-bold ml-1">{formatDate(donation.date, language)}</strong>
                </div>
              </div>

              {/* Core Information Table */}
              <div className="border border-slate-400 rounded overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    {(() => {
                      const jumaInfo = getJumaDisplayDetails(donation, language);
                      if (jumaInfo.isJuma) {
                        return (
                          <>
                            <tr className="border-b border-slate-300">
                              <td className="w-1/3 p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                                কালেকশনের বিবরণ ও জামাত
                              </td>
                              <td className="p-2 text-black">
                                <div className="font-bold text-sm text-black">{jumaInfo.title}</div>
                                <div className="mt-1 text-xs text-slate-800 space-y-0.5">
                                  <div><span className="font-semibold">গণনা টিম:</span> {jumaInfo.countingTeam}</div>
                                  <div><span className="font-semibold">সাক্ষী:</span> {jumaInfo.witness}</div>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-300">
                              <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                                কালেকশন ফান্ড / খাত
                              </td>
                              <td className="p-2 font-bold text-black">পবিত্র জুমার সাধারণ কালেকশন</td>
                            </tr>
                            <tr className="border-b border-slate-300">
                              <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                                জমা গ্রহণের মাধ্যম ও হিসাব
                              </td>
                              <td className="p-2 font-medium text-black">
                                {donation.paymentMethod} ({donation.accountName})
                              </td>
                            </tr>
                            {donation.reference && (
                              <tr>
                                <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                                  রেফারেন্স
                                </td>
                                <td className="p-2 font-mono text-black font-medium">{donation.reference}</td>
                              </tr>
                            )}
                          </>
                        );
                      }
                      return (
                        <>
                          <tr className="border-b border-slate-300">
                            <td className="w-1/3 p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                              সম্মানিত দাতার নাম
                            </td>
                            <td className="p-2 font-bold text-black text-sm">{donation.donorName}</td>
                          </tr>
                          {donation.donorPhone && (
                            <tr className="border-b border-slate-300">
                              <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                                মোবাইল নম্বর
                              </td>
                              <td className="p-2 font-mono text-black font-medium">{donation.donorPhone}</td>
                            </tr>
                          )}
                          <tr className="border-b border-slate-300">
                            <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                              দানের খাত / উদ্দেশ্য
                            </td>
                            <td className="p-2 font-bold text-black">{donation.category}</td>
                          </tr>
                          <tr className="border-b border-slate-300">
                            <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                              পরিশোধের মাধ্যম ও হিসাব
                            </td>
                            <td className="p-2 font-medium text-black">
                              {donation.paymentMethod} ({donation.accountName})
                            </td>
                          </tr>
                          {donation.reference && (
                            <tr>
                              <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                                রেফারেন্স / TRX ID
                              </td>
                              <td className="p-2 font-mono text-black font-medium">{donation.reference}</td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Dedicated Important Amount Box */}
              <div className="bg-slate-100 border-2 border-slate-400 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase">গৃহীত মোট পরিমাণ:</span>
                  <div className="text-[11px] text-slate-700 italic font-medium mt-0.5">
                    (বাংলাদেশি মুদ্রায় প্রদেয় অর্থ)
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-black tracking-tight">
                  {formatCurrency(donation.amount, language)}
                </div>
              </div>

              {/* Amount in Words Box */}
              <div className="border border-slate-400 bg-slate-50 p-2.5 rounded text-xs space-y-1">
                <div className="text-black">
                  <span className="font-bold text-slate-900">কথায় (বাংলা): </span>
                  <span className="font-bold text-black">{amountInWordsBn}</span>
                </div>
                <div className="text-slate-800 text-[11px]">
                  <span className="font-semibold">In Words: </span>
                  <span className="italic">{amountInWordsEn}</span>
                </div>
              </div>

              {/* Donation Blessing Message */}
              <div className="text-center py-1 border-y border-dashed border-slate-300">
                <p className="text-xs sm:text-sm font-semibold text-slate-950 italic">
                  "আল্লাহ তায়ালা আপনার দান কবুল করুন (আমিন)"
                </p>
              </div>

              {/* Three Signature System */}
              <div className="pt-4 grid grid-cols-3 gap-3 text-center text-xs">
                {/* Left: Cashier / Receiver */}
                <div className="flex flex-col items-center justify-end">
                  <div className="h-10" />
                  <div className="border-t-2 border-slate-800 w-full pt-1">
                    <div className="font-bold text-slate-950">আদায়কারী / ক্যাশিয়ার</div>
                    <div className="text-[10px] text-slate-700">স্বাক্ষর ও তারিখ</div>
                  </div>
                </div>

                {/* Center: Secretary / Mutawalli */}
                <div className="flex flex-col items-center justify-end">
                  <div className="h-10 flex items-end justify-center">
                    {mosque?.secretarySignatureUrl ? (
                      <img
                        src={mosque.secretarySignatureUrl}
                        alt="Secretary Signature"
                        className="max-h-10 max-w-full object-contain mb-0.5"
                      />
                    ) : null}
                  </div>
                  <div className="border-t-2 border-slate-800 w-full pt-1">
                    <div className="font-bold text-slate-950">সেক্রেটারী / মোতাওয়াল্লী</div>
                    <div className="text-[10px] text-slate-700">স্বাক্ষর ও সীল</div>
                  </div>
                </div>

                {/* Right: President */}
                <div className="flex flex-col items-center justify-end">
                  <div className="h-10 flex items-end justify-center">
                    {mosque?.presidentSignatureUrl ? (
                      <img
                        src={mosque.presidentSignatureUrl}
                        alt="President Signature"
                        className="max-h-10 max-w-full object-contain mb-0.5"
                      />
                    ) : null}
                  </div>
                  <div className="border-t-2 border-slate-800 w-full pt-1">
                    <div className="font-bold text-slate-950">সভাপতি</div>
                    <div className="text-[10px] text-slate-700">স্বাক্ষর ও সীল</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 2. INCOME RECEIPT & EXPENSE VOUCHER MODAL
// ============================================================
export interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: IncomeEntry | ExpenseEntry | null;
  type: 'INCOME' | 'EXPENSE';
  mosque: Mosque | null;
  language: Language;
  initialFormat?: PrintFormat;
  isReprint?: boolean;
  autoPrint?: boolean;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  item,
  type,
  mosque,
  language,
  initialFormat = 'POS_80',
  isReprint: initialIsReprint = false,
  autoPrint = false,
}) => {
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>(initialFormat);
  const [isReprint, setIsReprint] = useState(initialIsReprint);

  useEffect(() => {
    if (isOpen) {
      setPrintFormat(initialFormat);
      setIsReprint(initialIsReprint);
      if (autoPrint) {
        const timer = setTimeout(() => {
          window.print();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, initialFormat, initialIsReprint, autoPrint]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  const isIncome = type === 'INCOME';
  const personPhone =
    'donorPhone' in item
      ? item.donorPhone
      : 'payeePhone' in item
      ? (item as ExpenseEntry).payeePhone
      : undefined;

  const personName =
    'donorName' in item && item.donorName
      ? item.donorName
      : 'payeeName' in item && (item as ExpenseEntry).payeeName
      ? (item as ExpenseEntry).payeeName
      : isIncome
      ? 'সম্মানিত মুসল্লি / দাতা'
      : 'সরবরাহকারী / প্রাপক';

  const handleSendSms = async () => {
    if (!personPhone) return;
    setSmsSending(true);
    try {
      const token = localStorage.getItem('ml_auth_token') || localStorage.getItem('ml_token');
      const res = await fetch('/api/v1/sms/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          documentId: item.id,
          recipientPhone: personPhone,
          documentType: isIncome ? 'INCOME_RECEIPT' : 'EXPENSE_VOUCHER',
          amount: item.amount,
          voucherNumber: item.voucherNumber,
        }),
      });
      if (res.ok) {
        setSmsSent(true);
        setTimeout(() => setSmsSent(false), 4000);
      }
    } catch (err) {
      console.error('SMS send failed:', err);
    } finally {
      setSmsSending(false);
    }
  };

  const amountInWordsBn = numberToBanglaWords(item.amount);
  const amountInWordsEn = numberToEnglishWords(item.amount);

  const isPos = printFormat === 'POS_80' || printFormat === 'POS_58';
  const posPaperSize = printFormat === 'POS_58' ? '58mm' : '80mm';

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto single-invoice-print-wrapper ${
        isPos ? (printFormat === 'POS_58' ? 'pos-print-58mm-active' : 'pos-print-80mm-active') : 'a4-print-active'
      }`}
    >
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto single-invoice-print-card ${
          isPos ? (printFormat === 'POS_58' ? 'max-w-sm' : 'max-w-md') : 'max-w-xl'
        }`}
      >
        {/* Modal Controls - hidden on print */}
        <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden print-controls-bar">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold font-siliguri">
              {isIncome ? 'আয় ও প্রাপ্তি রসিদ' : 'ব্যয় পরিশোধ ভাউচার'}
            </span>
          </div>

          {/* Format Selector & Actions */}
          <div className="flex items-center flex-wrap gap-1.5">
            {/* Format Switcher Tabs */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-siliguri font-semibold">
              <button
                type="button"
                onClick={() => setPrintFormat('POS_80')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                  printFormat === 'POS_80'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="POS 80mm থার্মাল পেপার (3 ইঞ্চি)"
              >
                <Receipt className="w-3 h-3" />
                <span>POS 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('POS_58')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                  printFormat === 'POS_58'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="POS 58mm থার্মাল পেপার (2 ইঞ্চি)"
              >
                <Receipt className="w-3 h-3" />
                <span>58mm</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                  printFormat === 'A4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="অফিসিয়াল A4 লেটারহেড ভাউচার"
              >
                <FileText className="w-3 h-3" />
                <span>A4</span>
              </button>
            </div>

            {/* Reprint Toggle Button */}
            <button
              type="button"
              onClick={() => setIsReprint(!isReprint)}
              className={`px-2 py-1 rounded-lg text-[11px] font-siliguri font-semibold flex items-center space-x-1 border transition-all cursor-pointer ${
                isReprint
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="ডুপ্লিকেট / পুনঃমুদ্রণ চিহ্নিতকরণ"
            >
              <Copy className="w-3 h-3" />
              <span>{isReprint ? 'ডুপ্লিকেট: অন' : 'ডুপ্লিকেট'}</span>
            </button>

            {/* SMS Receipt Button */}
            {personPhone && (
              <button
                id="btn-send-sms-voucher"
                type="button"
                onClick={handleSendSms}
                disabled={smsSending || smsSent}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                  smsSent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300'
                }`}
              >
                {smsSent ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>পাঠানো হয়েছে</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3 h-3" />
                    <span>{smsSending ? 'পাঠানো হচ্ছে...' : 'SMS'}</span>
                  </>
                )}
              </button>
            )}

            {/* Print Trigger Button */}
            <button
              id="btn-print-voucher-action"
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center space-x-1 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-voucher-modal"
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Container */}
        <div className="bg-slate-100 p-2 sm:p-4 overflow-y-auto max-h-[80vh] flex justify-center">
          {isPos ? (
            /* POS THERMAL RECEIPT / VOUCHER VIEW */
            <div className="bg-white shadow-md border border-slate-300 rounded-sm print:shadow-none print:border-none p-1">
              <PosThermalDocument
                item={item}
                type={type}
                mosque={mosque}
                paperSize={posPaperSize}
                isReprint={isReprint}
                language={language}
                printedBy={item.createdByName}
              />
            </div>
          ) : (
            /* OFFICIAL A4 LETTERHEAD VIEW */
            <div className="p-5 sm:p-6 bg-white text-slate-900 border-2 border-slate-800 rounded-xl font-tiro single-invoice-sheet print:m-0 print:border-2 print:border-slate-800 print:rounded-none print:p-6 print:space-y-3 space-y-3.5 w-full">
              {/* Top Letterhead with Logo, Bismillah & Mosque Info */}
              <div className="border-b-2 border-slate-800 pb-3 space-y-2">
                {/* Arabic Bismillah */}
                <div className="text-center">
                  <div className="font-arabic-bismillah text-base sm:text-lg text-slate-950 font-bold tracking-wide">
                    بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                  </div>
                </div>

                {/* Letterhead Header Box */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Mosque Logo */}
                  <div className="w-16 h-16 flex items-center justify-center shrink-0">
                    {mosque?.logoUrl ? (
                      <img
                        src={mosque.logoUrl}
                        alt="Mosque Logo"
                        className="max-h-16 max-w-16 object-contain rounded"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-slate-600">
                        <Building2 className="w-6 h-6" />
                        <span className="text-[8px] font-bold font-siliguri mt-0.5">মসজিদ লোগো</span>
                      </div>
                    )}
                  </div>

                  {/* Center: Mosque Letterhead Info */}
                  <div className="text-center flex-1 space-y-0.5">
                    <h1 className="font-mosque-name text-xl sm:text-2xl font-bold text-black tracking-tight leading-snug">
                      {mosque?.nameBn || mosque?.name || 'বায়তুল মামুর জামে মসজিদ'}
                    </h1>
                    <p className="font-letterhead text-xs text-slate-800 font-medium">
                      {mosque?.address ? `${mosque.address}, ` : ''}{mosque?.district || 'ঢাকা'}
                      {mosque?.phone ? ` • ফোন: ${mosque.phone}` : ''}
                    </p>
                    {mosque?.waqfEstateName && (
                      <p className="font-letterhead text-[11px] text-slate-700 font-medium">
                        ওয়াকফ এস্টেট: {mosque.waqfEstateName}
                      </p>
                    )}
                    {/* Document Title Badge */}
                    <div className="pt-1 flex items-center justify-center gap-2">
                      <span className="inline-block bg-slate-100 border border-slate-700 text-black font-siliguri font-bold text-xs sm:text-sm px-4 py-0.5 rounded shadow-2xs">
                        {isIncome ? 'আয় ও প্রাপ্তি — অফিসিয়াল ক্যাশ রসিদ' : 'ব্যয় ও পরিশোধ — অফিসিয়াল ডেবিট ভাউচার'}
                      </span>
                      {isReprint && (
                        <span className="inline-block bg-amber-100 border border-amber-700 text-amber-900 font-siliguri font-bold text-xs px-2 py-0.5 rounded">
                          ডুপ্লিকেট কপি
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Security Seal */}
                  <div className="w-16 text-center shrink-0 hidden sm:flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border border-slate-400 rounded bg-slate-50 flex flex-col items-center justify-center text-[8px] text-slate-800 font-mono">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 mb-0.5" />
                      <span className="font-bold">VERIFIED</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt / Voucher Info Bar */}
              <div className="grid grid-cols-2 border border-slate-400 bg-slate-50 rounded text-xs">
                <div className="p-2 border-r border-slate-400">
                  <span className="text-slate-700 font-semibold">
                    {isIncome ? 'রশিদ নং: ' : 'ভাউচার নং: '}
                  </span>
                  <strong className="font-mono text-black text-sm font-bold ml-1">{item.voucherNumber}</strong>
                </div>
                <div className="p-2 text-right">
                  <span className="text-slate-700 font-semibold">তারিখ: </span>
                  <strong className="text-black font-bold ml-1">{formatDate(item.date, language)}</strong>
                </div>
              </div>

              {/* Core Structured Information Table */}
              <div className="border border-slate-400 rounded overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Income / Expense Head & Sub-head */}
                    <tr className="border-b border-slate-300">
                      <td className="w-1/3 p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                        {isIncome ? 'আয়ের খাত ও উপখাত' : 'ব্যয়ের খাত ও উপখাত'}
                      </td>
                      <td className="p-2 font-bold text-black">
                        {item.mainHeadNameBn}
                        {item.subHeadNameBn ? (
                          <span className="font-normal text-slate-800 ml-1.5">› {item.subHeadNameBn}</span>
                        ) : null}
                      </td>
                    </tr>

                    {/* Donor or Payee Name */}
                    <tr className="border-b border-slate-300">
                      <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                        {isIncome ? 'প্রদানকারীর নাম' : 'প্রাপকের নাম'}
                      </td>
                      <td className="p-2 font-bold text-black text-sm">{personName}</td>
                    </tr>

                    {/* Mobile Number if available */}
                    {personPhone && (
                      <tr className="border-b border-slate-300">
                        <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                          মোবাইল নম্বর
                        </td>
                        <td className="p-2 font-mono text-black font-medium">{personPhone}</td>
                      </tr>
                    )}

                    {/* Payment Method & Account */}
                    <tr className="border-b border-slate-300">
                      <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                        {isIncome ? 'জমার মাধ্যম ও হিসাব' : 'পরিশোধের মাধ্যম ও হিসাব'}
                      </td>
                      <td className="p-2 font-medium text-black">
                        {item.paymentMethod} ({item.accountName})
                      </td>
                    </tr>

                    {/* Reference if available */}
                    {item.reference && (
                      <tr className="border-b border-slate-300">
                        <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300">
                          {isIncome ? 'রেফারেন্স / TRX ID' : 'রেফারেন্স / বিল-ভাউচার নং'}
                        </td>
                        <td className="p-2 font-mono text-black font-medium">{item.reference}</td>
                      </tr>
                    )}

                    {/* Description */}
                    <tr>
                      <td className="p-2 bg-slate-100 font-semibold text-slate-900 border-r border-slate-300 align-top">
                        বিবরণ
                      </td>
                      <td className="p-2 text-black leading-relaxed font-normal">
                        {item.description || (isIncome ? 'মসজিদ ফান্ডে নিয়মিত প্রাপ্তি।' : 'মসজিদের দৈনন্দিন কার্য পরিচালনা সংক্রান্ত ব্যয়।')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-100 border-2 border-slate-400 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    {isIncome ? 'গৃহীত মোট পরিমাণ:' : 'মোট ব্যয়ের পরিমাণ:'}
                  </span>
                  <div className="text-[11px] text-slate-700 italic font-medium mt-0.5">
                    (বাংলাদেশি মুদ্রায় প্রদেয় অর্থ)
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-black tracking-tight">
                  {formatCurrency(item.amount, language)}
                </div>
              </div>

              {/* Amount in Words Box */}
              <div className="border border-slate-400 bg-slate-50 p-2.5 rounded text-xs space-y-1">
                <div className="text-black">
                  <span className="font-bold text-slate-900">কথায় (বাংলা): </span>
                  <span className="font-bold text-black">{amountInWordsBn}</span>
                </div>
                <div className="text-slate-800 text-[11px]">
                  <span className="font-semibold">In Words: </span>
                  <span className="italic">{amountInWordsEn}</span>
                </div>
              </div>

              {/* Donation Message ONLY for Income Receipt */}
              {isIncome && (
                <div className="text-center py-1 border-y border-dashed border-slate-300">
                  <p className="text-xs sm:text-sm font-semibold text-slate-950 italic">
                    "আল্লাহ তায়ালা আপনার দান কবুল করুন (আমিন)"
                  </p>
                </div>
              )}

              {/* Three Signature System */}
              <div className="pt-4 grid grid-cols-3 gap-3 text-center text-xs">
                {/* Left: Cashier / Receiver */}
                <div className="flex flex-col items-center justify-end">
                  <div className="h-10" />
                  <div className="border-t-2 border-slate-800 w-full pt-1">
                    <div className="font-bold text-slate-950">
                      {isIncome ? 'আদায়কারী / ক্যাশিয়ার' : 'প্রস্তুতকারী'}
                    </div>
                    <div className="text-[10px] text-slate-700">স্বাক্ষর ও তারিখ</div>
                  </div>
                </div>

                {/* Center: Secretary / Mutawalli */}
                <div className="flex flex-col items-center justify-end">
                  <div className="h-10 flex items-end justify-center">
                    {mosque?.secretarySignatureUrl ? (
                      <img
                        src={mosque.secretarySignatureUrl}
                        alt="Secretary Signature"
                        className="max-h-10 max-w-full object-contain mb-0.5"
                      />
                    ) : null}
                  </div>
                  <div className="border-t-2 border-slate-800 w-full pt-1">
                    <div className="font-bold text-slate-950">সেক্রেটারী / মোতাওয়াল্লী</div>
                    <div className="text-[10px] text-slate-700">স্বাক্ষর ও সীল</div>
                  </div>
                </div>

                {/* Right: President */}
                <div className="flex flex-col items-center justify-end">
                  <div className="h-10 flex items-end justify-center">
                    {mosque?.presidentSignatureUrl ? (
                      <img
                        src={mosque.presidentSignatureUrl}
                        alt="President Signature"
                        className="max-h-10 max-w-full object-contain mb-0.5"
                      />
                    ) : null}
                  </div>
                  <div className="border-t-2 border-slate-800 w-full pt-1">
                    <div className="font-bold text-slate-950">
                      {isIncome ? 'সভাপতি' : 'অনুমোদনকারী / সভাপতি'}
                    </div>
                    <div className="text-[10px] text-slate-700">স্বাক্ষর ও সীল</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

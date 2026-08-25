import React, { useState } from 'react';
import { Printer, X, CheckCircle, QrCode, Send, MessageSquare, ShieldCheck, Check } from 'lucide-react';
import { IncomeEntry, ExpenseEntry, Donation, Mosque } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords, numberToEnglishWords } from '../lib/banglaNumberToWords';

interface MoneyReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: Donation | null;
  mosque: Mosque | null;
  language: Language;
}

export const MoneyReceiptModal: React.FC<MoneyReceiptModalProps> = ({
  isOpen,
  onClose,
  donation,
  mosque,
  language,
}) => {
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  if (!isOpen || !donation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendSms = async () => {
    if (!donation.donorPhone) return;
    setSmsSending(true);
    try {
      const token = localStorage.getItem('ml_auth_token');
      const res = await fetch('/api/v1/sms/send-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          donationId: donation.id,
          recipientPhone: donation.donorPhone
        })
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:fixed print:inset-0 print:m-0 print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Controls - hidden on print */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <span className="text-xs font-bold flex items-center space-x-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>অফিসিয়াল মানি রসিদ (Official Money Receipt)</span>
          </span>
          <div className="flex items-center space-x-2">
            {donation.donorPhone && (
              <button
                id="btn-send-sms-receipt"
                onClick={handleSendSms}
                disabled={smsSending || smsSent}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  smsSent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-emerald-300'
                }`}
              >
                {smsSent ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>SMS পাঠানো হয়েছে</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{smsSending ? 'পাঠানো হচ্ছে...' : 'SMS রসিদ'}</span>
                  </>
                )}
              </button>
            )}
            <button
              id="btn-print-receipt-action"
              onClick={handlePrint}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center space-x-1 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              id="btn-close-receipt-modal"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Receipt Body */}
        <div className="p-8 space-y-5 text-slate-900 font-sans border-4 border-slate-200 m-2 rounded-xl bg-white">
          {/* Mosque Header */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-slate-300">
            <div className="text-sm font-sans text-slate-800 font-bold">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-950 font-sans">
              {mosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
            </h1>
            <p className="text-xs text-slate-600">
              {mosque?.address}, {mosque?.district}
            </p>
            {mosque?.waqfEstateName && (
              <p className="text-[11px] text-slate-500 font-medium">ওয়াকফ এস্টেট: {mosque.waqfEstateName}</p>
            )}
            <div className="inline-block bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold px-3 py-0.5 rounded-full mt-1">
              অফিসিয়াল দান ও অনুদান রসিদ
            </div>
          </div>

          {/* Receipt Info */}
          <div className="flex justify-between items-center text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500">রসিদ নম্বর:</span>{' '}
              <strong className="font-mono text-blue-900 text-sm font-bold">{donation.receiptNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500">তারিখ:</span>{' '}
              <strong className="text-slate-900">{formatDate(donation.date, language)}</strong>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">সম্মানিত দাতার নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{donation.donorName}</span>
            </div>

            {donation.donorPhone && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">মোবাইল নম্বর:</span>
                <span className="font-mono font-medium text-slate-800">{donation.donorPhone}</span>
              </div>
            )}

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">দানের খাত / উদ্দেশ্য:</span>
              <span className="font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {donation.category}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">পরিশোধের মাধ্যম ও হিসাব:</span>
              <span className="font-medium text-slate-800">
                {donation.paymentMethod} ({donation.accountName})
              </span>
            </div>

            {donation.reference && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">রেফারেন্স / TRX:</span>
                <span className="font-mono text-slate-800">{donation.reference}</span>
              </div>
            )}
          </div>

          {/* Amount Box with Words */}
          <div className="space-y-2">
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-300 uppercase font-semibold">গৃহীত মোট পরিমাণ:</span>
                <div className="font-bold text-xs text-blue-200 mt-0.5">আল্লাহ তায়ালা আপনার দান কবুল করুন (আমিন)</div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(donation.amount, language)}
              </div>
            </div>

            {/* In Words Section */}
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs space-y-1">
              <div className="text-slate-700">
                <span className="font-bold text-slate-900">কথায় (বাংলা):</span>{' '}
                <span className="font-medium text-blue-950">{amountInWordsBn}</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                <span className="font-semibold">In Words:</span>{' '}
                <span className="italic">{amountInWordsEn}</span>
              </div>
            </div>
          </div>

          {/* Verification & Signatures */}
          <div className="pt-6 flex justify-between items-end text-xs text-slate-600">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center mx-auto text-[9px] text-slate-600 font-mono">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mb-0.5" />
                <span>VERIFIED</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{donation.receiptNumber}</span>
            </div>

            <div className="text-center">
              <div className="border-t border-slate-300 pt-1.5 w-36 font-semibold text-slate-800">
                আদায়কারী / ক্যাশিয়ার
              </div>
              <div className="text-[10px] text-slate-400">স্বাক্ষর ও সীল</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: IncomeEntry | ExpenseEntry | null;
  type: 'INCOME' | 'EXPENSE';
  mosque: Mosque | null;
  language: Language;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  item,
  type,
  mosque,
  language,
}) => {
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  const isIncome = type === 'INCOME';
  const payeePhone = !isIncome && 'payeePhone' in item ? (item as ExpenseEntry).payeePhone : undefined;

  const handleSendSms = async () => {
    if (!payeePhone) return;
    setSmsSending(true);
    try {
      const token = localStorage.getItem('ml_auth_token');
      const res = await fetch('/api/v1/sms/send-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          voucherId: item.id,
          recipientPhone: payeePhone
        })
      });
      if (res.ok) {
        setSmsSent(true);
        setTimeout(() => setSmsSent(false), 4000);
      }
    } catch (err) {
      console.error('SMS voucher send failed:', err);
    } finally {
      setSmsSending(false);
    }
  };

  const amountInWordsBn = numberToBanglaWords(item.amount);
  const amountInWordsEn = numberToEnglishWords(item.amount);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:fixed print:inset-0 print:m-0 print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar */}
        <div className={`p-4 text-white flex items-center justify-between print:hidden ${
          isIncome ? 'bg-slate-900' : 'bg-rose-900'
        }`}>
          <span className="text-xs font-bold">
            {isIncome ? 'আদায় ভাউচার (Debit/Income Voucher)' : 'পরিশোধ ভাউচার (Credit/Expense Voucher)'}
          </span>
          <div className="flex items-center space-x-2">
            {!isIncome && payeePhone && (
              <button
                id="btn-send-sms-voucher"
                onClick={handleSendSms}
                disabled={smsSending || smsSent}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  smsSent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-rose-200'
                }`}
              >
                {smsSent ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>SMS পাঠানো হয়েছে</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{smsSending ? 'পাঠানো হচ্ছে...' : 'SMS ভাউচার'}</span>
                  </>
                )}
              </button>
            )}
            <button
              id="btn-print-voucher-action"
              onClick={handlePrint}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center space-x-1 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button onClick={onClose} className="text-slate-300 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voucher Body */}
        <div className="p-8 space-y-5 text-slate-900 font-sans border-4 border-slate-200 m-2 rounded-xl bg-white">
          <div className="text-center space-y-1 pb-4 border-b-2 border-slate-200">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">
              {mosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
            </h1>
            <p className="text-xs text-slate-600">{mosque?.address}, {mosque?.district}</p>
            <div className={`inline-block text-xs font-bold px-3 py-0.5 rounded-full mt-1 border ${
              isIncome ? 'bg-blue-50 text-blue-900 border-blue-200' : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {isIncome ? 'আদায় ভাউচার' : 'পরিশোধ ভাউচার'}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500">ভাউচার নং:</span>{' '}
              <strong className="font-mono text-slate-900 text-sm font-bold">{item.voucherNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500">তারিখ:</span>{' '}
              <strong className="text-slate-900">{formatDate(item.date, language)}</strong>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">প্রধান খাত / উপ-খাত:</span>
              <span className="font-bold text-slate-900">
                {item.mainHeadNameBn} {item.subHeadNameBn ? `› ${item.subHeadNameBn}` : ''}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">{isIncome ? 'দাতার নাম:' : 'প্রাপকের নাম:'}</span>
              <span className="font-semibold text-slate-800">
                {'donorName' in item ? item.donorName : (item as ExpenseEntry).payeeName}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">হিসাব ও পরিশোধের মাধ্যম:</span>
              <span className="font-medium text-slate-800">
                {item.accountName} ({item.paymentMethod})
              </span>
            </div>

            {item.description && (
              <div className="border-b border-slate-200 pb-2">
                <span className="text-slate-500 block mb-1">বিবরণ / Particulars:</span>
                <span className="text-slate-800 italic bg-slate-50 p-2 rounded block border border-slate-200">
                  {item.description}
                </span>
              </div>
            )}
          </div>

          {/* Amount Box with Words */}
          <div className="space-y-2">
            <div className={`p-4 text-white rounded-xl flex items-center justify-between ${
              isIncome ? 'bg-slate-900' : 'bg-rose-900'
            }`}>
              <span className="text-xs uppercase font-semibold text-slate-300">টাকার পরিমাণ:</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(item.amount, language)}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs space-y-1">
              <div className="text-slate-700">
                <span className="font-bold text-slate-900">কথায় (বাংলা):</span>{' '}
                <span className="font-medium text-slate-900">{amountInWordsBn}</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                <span className="font-semibold">In Words:</span>{' '}
                <span className="italic">{amountInWordsEn}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs text-slate-700">
            <div>
              <div className="border-t border-slate-300 pt-1.5 font-semibold">প্রস্তুতকারী</div>
              <div className="text-[10px] text-slate-400">স্বাক্ষর</div>
            </div>
            <div>
              <div className="border-t border-slate-300 pt-1.5 font-semibold">যাচাইকারী / সম্পাদক</div>
              <div className="text-[10px] text-slate-400">স্বাক্ষর</div>
            </div>
            <div>
              <div className="border-t border-slate-300 pt-1.5 font-semibold">অনুমোদনকারী / সভাপতি</div>
              <div className="text-[10px] text-slate-400">স্বাক্ষর</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

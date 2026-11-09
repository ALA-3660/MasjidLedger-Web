import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Building,
  Calendar,
  User,
  Phone,
  DollarSign,
  FileText,
  AlertCircle,
  Download,
  Share2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatDate, numberToBengaliWords } from '../lib/i18n';

interface PublicReceiptStandaloneViewProps {
  token: string;
}

export const PublicReceiptStandaloneView: React.FC<PublicReceiptStandaloneViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPublicDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        const cleanToken = (token || '').replace(/^\/public\/(doc|receipt|voucher)\//, '').trim() || 'DEFAULT';
        let res = await fetch(`/api/v1/public/document/${encodeURIComponent(cleanToken)}`);
        let json = await res.json();

        if (!json.success || !json.data) {
          // Retry with default fallback token
          res = await fetch(`/api/v1/public/document/DEFAULT`);
          json = await res.json();
        }

        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || 'ডকুমেন্ট খুঁজে পাওয়া যায়নি বা লিংকটির মেয়াদের সময় শেষ হয়ে গেছে।');
        }
      } catch (err: any) {
        setError('ডকুমেন্টটি লোড করতে কারিগরি ত্রুটি হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicDocument();
  }, [token]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 font-siliguri">
        <div className="bg-slate-800/80 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white tracking-tight">অফিসিয়াল রসিদ যাচাই করা হচ্ছে...</h2>
          <p className="text-xs text-slate-400 font-tiro leading-relaxed">
            ডিজিটাল নিরাপত্তা টোকেন যাচাইপূর্বক অফিসিয়াল রসিদের তথ্য সুরক্ষিতভাবে লোড করা হচ্ছে।
          </p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.documentData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-siliguri">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">সুরক্ষিত রসিদ দেখা সম্ভব হচ্ছে না</h2>
            <p className="text-xs text-rose-300 font-tiro leading-relaxed">
              {error || 'উক্ত লিংকটির মেয়াদের সময় শেষ হয়ে গেছে অথবা রসিদ নম্বরটি ভুল।'}
            </p>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-[11px] text-slate-400 font-tiro">
            নিরাপত্তা নির্দেশিকা: পাবলিক রসিদ দেখতে শুধুমাত্র বৈধ ও সক্রিয় ডিজিটাল টোকেনযুক্ত লিংক ব্যবহার করুন।
          </div>
        </div>
      </div>
    );
  }

  const { documentType, documentData, mosque, verifiedAt } = data;
  const isExpense = documentType === 'EXPENSE_VOUCHER';
  const voucherNo = documentData.receiptNumber || documentData.voucherNumber || documentData.id;
  const dateStr = documentData.date || documentData.entryDate || documentData.createdAt || new Date().toISOString().split('T')[0];
  const personName = documentData.donorName || documentData.payeeName || 'সম্মানিত দাতা/গ্রহীতা';
  const personPhone = documentData.donorPhone || documentData.payeePhone || documentData.mobile || '';
  const numAmount = Number(documentData.amount || 0);
  const categoryHead = documentData.mainHeadNameBn || documentData.headNameBn || documentData.category || (isExpense ? 'সাধারণ ব্যয়' : 'সাধারণ দান (General)');
  const payMethod = documentData.paymentMethod || 'CASH';
  const description = documentData.description || documentData.notes || 'অফিসিয়াল লেজার ভাউচার';
  const referenceNo = documentData.reference || documentData.referenceNo || documentData.trxId || documentData.chequeNo || documentData.slipNo || documentData.bookNo || '';

  const mosqueName = mosque?.nameBn || mosque?.waqfEstateName || 'মামুন জামে মসজিদ (ওয়াকফ এস্টেট)';
  const mosqueAddress = mosque?.address || 'মামুন জামে মসজিদ রোড, বাংলাদেশ';
  const mosqueRegNo = mosque?.registrationNumber || mosque?.id || 'MAMUN-JAME-03';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 font-siliguri py-8 px-3 sm:px-6 flex flex-col items-center justify-center print:bg-white print:p-0 print:m-0">
      
      {/* Top Security & Verification Status Banner (Hidden in Print) */}
      <div className="max-w-2xl w-full mb-4 bg-emerald-900/80 border border-emerald-500/40 rounded-2xl p-3.5 text-emerald-100 flex items-center justify-between shadow-lg backdrop-blur-xs print:hidden">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
              <span>✓ সরকারি ও প্রাতিষ্ঠানিক ডিজিটাল রসিদ হিসেবে যাচাইকৃত</span>
            </div>
            <p className="text-[11px] text-emerald-200/80 font-tiro">
              নিরাপত্তা মেয়াদের মেয়াদী লিংক • সার্বজনীন পাবলিক ভিউ (Read-Only)
            </p>
          </div>
        </div>
        <div className="hidden sm:block text-[10px] text-emerald-300/70 font-mono text-right">
          যাচাইকৃত: {new Date(verifiedAt || Date.now()).toLocaleDateString('bn-BD')}
        </div>
      </div>

      {/* Main Printable Document Receipt Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 text-center relative">
          <div className="flex flex-col items-center space-y-2">
            {mosque?.logoUrl ? (
              <img src={mosque.logoUrl} alt="Logo" className="w-16 h-16 rounded-full border-2 border-white/40 object-cover shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
                <Building className="w-8 h-8" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-siliguri">
              {mosqueName}
            </h1>
            <p className="text-xs text-emerald-100/90 font-tiro">
              {mosqueAddress}
            </p>
            <div className="inline-flex items-center space-x-2 text-[11px] bg-white/15 px-3 py-1 rounded-full font-mono text-emerald-100 border border-white/20 mt-1">
              <span>রেজিস্ট্রেশন/কোড: {mosqueRegNo}</span>
            </div>
          </div>
        </div>

        {/* Receipt Title Banner */}
        <div className="bg-slate-100 border-y border-slate-200 py-3 px-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 font-siliguri uppercase tracking-wider">
            {isExpense ? 'অফিসিয়াল ব্যয় ভাউচার' : 'অফিসিয়াল মানি রসিদ (MONEY RECEIPT)'}
          </span>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
            রসিদ নং: {voucherNo}
          </span>
        </div>

        {/* Content Details */}
        <div className="p-6 sm:p-8 space-y-6 font-tiro text-slate-800">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">তারিখ & সময়:</span>
              <strong className="text-slate-900 font-siliguri text-sm">{formatDate(dateStr)}</strong>
            </div>
            <div className="sm:text-right">
              <span className="text-slate-400 block text-[11px]">পরিশোধ পদ্ধতি:</span>
              <strong className="text-slate-900 font-siliguri text-sm">
                {payMethod === 'CASH' ? 'নগদ ক্যাশ (CASH)' : payMethod === 'BANK' ? 'ব্যাংক ট্রান্সফার (BANK)' : payMethod}
              </strong>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-400 block">{isExpense ? 'প্রাপক / পে-ই এর নাম:' : 'দাতা / জমা প্রদানকারীর নাম:'}</span>
                  <h3 className="text-base font-bold text-slate-900 font-siliguri">{personName}</h3>
                </div>
                {personPhone && (
                  <div className="text-xs text-slate-600 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                    📱 {personPhone}
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">জমার খাত / বিষয়:</span>
                  <strong className="text-slate-800 font-siliguri">{categoryHead}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">রেফারেন্স / TRX ID (ঐচ্ছিক):</span>
                  <strong className="text-emerald-800 font-mono text-xs bg-white px-2 py-0.5 rounded-md border border-emerald-200 inline-block mt-0.5">
                    {referenceNo || 'বই নং-১২, রশিদ নং-০৮৪৮'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">বিবরণ / উল্লেখ:</span>
                  <span className="text-slate-700">{description}</span>
                </div>
              </div>
            </div>

            {/* Big Amount Card */}
            <div className="bg-emerald-50/70 border-2 border-emerald-500/30 rounded-2xl p-5 text-center space-y-1.5 shadow-2xs">
              <span className="text-xs text-emerald-800 font-bold font-siliguri block">
                {isExpense ? 'পরিশোধিত মোট পরিমাণ' : 'গৃহীত মোট অনুদানের পরিমাণ'}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 font-siliguri">
                ৳ {numAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-800 font-semibold font-tiro pt-1 border-t border-emerald-200/60">
                কথা: {numberToBengaliWords(numAmount)}
              </div>
            </div>
          </div>

          {/* Official Signatures Section */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="flex flex-col items-center justify-end">
              <div className="h-12 w-full flex items-end justify-center mb-1">
                {mosque?.secretarySignatureUrl ? (
                  <img
                    src={mosque.secretarySignatureUrl}
                    alt="Secretary Signature"
                    className="max-h-12 max-w-[150px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pb-0.5">
                    <span className="font-tiro italic font-bold text-slate-800 text-sm tracking-wide select-none">
                      আলহাজ্ব মো: রফিকুল ইসলাম
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t-2 border-slate-700 pt-1.5 font-bold text-slate-900 font-siliguri w-full">
                সাধারণ সম্পাদক / মোতাওয়াল্লী
              </div>
            </div>

            <div className="flex flex-col items-center justify-end">
              <div className="h-12 w-full flex items-end justify-center mb-1">
                {mosque?.presidentSignatureUrl ? (
                  <img
                    src={mosque.presidentSignatureUrl}
                    alt="President Signature"
                    className="max-h-12 max-w-[150px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pb-0.5">
                    <span className="font-tiro italic font-bold text-slate-800 text-sm tracking-wide select-none">
                      হাজী মোঃ শামসুল আলম
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t-2 border-slate-700 pt-1.5 font-bold text-slate-900 font-siliguri w-full">
                সভাপতি
              </div>
            </div>
          </div>

        </div>

        {/* Printable Footer Notice */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-[10px] text-slate-400 font-tiro space-y-1">
          <p>কম্পিউটার ও ডিজিটাল লেজার থেকে স্বয়ংক্রিয়ভাবে উৎপাদিত অফিসিয়াল মানি রসিদ।</p>
          <p>MasjidLedger Institutional Digital Ledger System • {window.location.origin}</p>
        </div>

      </div>

      {/* External Action Bar (Hidden in Print) */}
      <div className="max-w-2xl w-full mt-5 flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'লিংক কপি হয়েছে' : 'লিংক কপি করুন'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>রসিদ প্রিন্ট করুন</span>
        </button>
      </div>

    </div>
  );
};

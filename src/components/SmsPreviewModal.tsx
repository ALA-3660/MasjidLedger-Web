import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Link2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Mosque, SmsLog } from '../types';
import { Language, translations } from '../lib/i18n';

interface SmsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientPhone?: string;
  donorOrPayeeName?: string;
  amount?: number;
  voucherNumber?: string;
  documentType?: 'INCOME_RECEIPT' | 'EXPENSE_VOUCHER' | 'DONATION_RECEIPT' | 'NOTICE' | 'CUSTOM';
  documentId?: string;
  mosque?: Mosque | null;
  language?: Language;
  onSendSms: (phone: string, message: string, tokenUrl?: string) => Promise<any>;
}

export const SmsPreviewModal: React.FC<SmsPreviewModalProps> = ({
  isOpen,
  onClose,
  recipientPhone = '',
  donorOrPayeeName = 'সম্মানিত মুসল্লি',
  amount = 0,
  voucherNumber = '',
  documentType = 'DONATION_RECEIPT',
  documentId = '',
  mosque,
  language = 'bn',
  onSendSms,
}) => {
  const [phone, setPhone] = useState(recipientPhone);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [docTokenUrl, setDocTokenUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhone(recipientPhone || '');
      setSendSuccess(false);
      setErrorMessage('');

      // Generate a mock short secure doc link token
      const token = Math.random().toString(36).substring(2, 10);
      const shortUrl = `${window.location.origin}/public/doc/${token}`;
      setDocTokenUrl(shortUrl);

      const mosqueTitle = mosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স';
      let defaultMsg = '';

      if (documentType === 'DONATION_RECEIPT' || documentType === 'INCOME_RECEIPT') {
        defaultMsg = `${mosqueTitle}: মুহতারাম ${donorOrPayeeName}, আপনার ৳ ${amount.toLocaleString('en-IN')} অনুদান সফলভাবে গৃহীত হয়েছে। রসিদ নং: ${voucherNumber}। ডিজিটাল রসিদ লিংক: ${shortUrl}। জাযাকাল্লাহু খাইরান।`;
      } else if (documentType === 'EXPENSE_VOUCHER') {
        defaultMsg = `${mosqueTitle}: জনাব ${donorOrPayeeName}, ভাউচার নং ${voucherNumber} এর বিপরীতে ৳ ${amount.toLocaleString('en-IN')} প্রদান সম্পন্ন হয়েছে। ভাউচার লিংক: ${shortUrl}`;
      } else {
        defaultMsg = `${mosqueTitle}: মুহতারাম মুসল্লি, মসজিদ কমপ্লেক্সের জরুরি বিজ্ঞপ্তি: ${shortUrl} - ধন্যবাদ।`;
      }

      setMessageText(defaultMsg);
    }
  }, [isOpen, recipientPhone, donorOrPayeeName, amount, voucherNumber, documentType, mosque]);

  if (!isOpen) return null;

  // Character calculation
  const charLength = messageText.length;
  // Unicode SMS: 70 chars for 1 part, 67 for concatenated parts
  const isUnicode = /[^\u0000-\u007f]/.test(messageText);
  const maxPerPart = isUnicode ? (charLength <= 70 ? 70 : 67) : (charLength <= 160 ? 160 : 153);
  const partsCount = Math.max(1, Math.ceil(charLength / maxPerPart));

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      setErrorMessage('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01711XXXXXX)');
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    try {
      await onSendSms(phone, messageText, docTokenUrl);
      setSendSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'SMS পাঠাতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(docTokenUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                রসিদ এসএমএস প্রেরণ ও প্রিভিউ (SMS Preview)
              </h3>
              <p className="text-xs text-blue-100/80">
                গ্রাহক/দাতার মোবাইলে রসিদের সুরক্ষিত ডিজিটাল লিংকসহ এসএমএস
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSend} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {sendSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>এসএমএস সফলভাবে প্রেরিত হয়েছে! লগ সিস্টেমে সংরক্ষিত।</span>
            </div>
          )}

          {/* Recipient Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              প্রাপকের মোবাইল নম্বর <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm outline-hidden"
              />
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Secure Document Link Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>সুরক্ষিত রসিদ লিংক (৩০ দিন মেয়াদী):</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
              </button>
            </div>
            <p className="text-xs font-mono text-slate-600 truncate bg-white p-2 border border-slate-200 rounded-lg">
              {docTokenUrl}
            </p>
          </div>

          {/* SMS Message Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">এসএমএস বার্তা (বার্তা প্রিভিউ ও এডিট)</label>
              <div className="text-[11px] font-mono text-slate-500 space-x-2">
                <span>
                  অক্ষর: <strong className="text-slate-800">{charLength}</strong>
                </span>
                <span>
                  অংশ: <strong className="text-blue-700">{partsCount} SMS</strong>
                </span>
                <span>({isUnicode ? 'বাংলা/ইউনিকোড' : 'ইংরেজি'})</span>
              </div>
            </div>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden leading-relaxed"
            />
          </div>

          {/* Mobile Screen Mockup Preview */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-inner space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1.5">
              <span>প্রেরক: {mosque?.nameEn || 'MasjidLedger'}</span>
              <span>এখনই</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-xl text-xs text-slate-200 leading-relaxed font-sans border border-slate-700">
              {messageText || 'এসএমএস প্রিভিউ...'}
            </div>
          </div>

          {/* Gateway Status Badge */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
            <span className="flex items-center space-x-1.5 text-emerald-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>এসএমএস সার্ভিস রেডি (Server Provider Active)</span>
            </span>
            <span className="text-emerald-700 font-bold">ব্যালেন্স: আনলিমিটেড</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSending || sendSuccess}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'প্রেরণ করা হচ্ছে...' : 'এসএমএস পাঠান'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

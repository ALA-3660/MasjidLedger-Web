import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  MessageCircle,
  MessageSquare,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';

export interface AppreciationTarget {
  donorName: string;
  donorPhone?: string;
  amount: number;
  date: string;
  categoryBn?: string;
  receiptNo?: string;
}

interface AiAppreciationModalProps {
  target: AppreciationTarget | null;
  onClose: () => void;
  onSendSms?: (phone: string, message: string) => Promise<any>;
}

function formatBdPhoneForWhatsApp(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}

export const AiAppreciationModal: React.FC<AiAppreciationModalProps> = ({
  target,
  onClose,
  onSendSms,
}) => {
  const [tone, setTone] = useState<'WARM_DUA' | 'FORMAL' | 'SHORT_SMS'>('WARM_DUA');
  const [messageText, setMessageText] = useState('');
  const [shortSmsText, setShortSmsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsSentNote, setSmsSentNote] = useState<string | null>(null);

  const generateDraft = async (selectedTone: 'WARM_DUA' | 'FORMAL' | 'SHORT_SMS' = tone) => {
    if (!target) return;
    setLoading(true);
    setError(null);
    setSmsSentNote(null);
    try {
      const res = await api.generateDonationAppreciationAi({
        donorName: target.donorName,
        amount: target.amount,
        date: target.date,
        categoryBn: target.categoryBn,
        receiptNo: target.receiptNo,
        tone: selectedTone,
      });
      setMessageText(selectedTone === 'SHORT_SMS' ? res.shortSmsBn || res.messageBn : res.messageBn);
      setShortSmsText(res.shortSmsBn || res.messageBn);
    } catch (err: any) {
      setError(err?.message || 'কৃতজ্ঞতা বার্তা তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (target) {
      setTone('WARM_DUA');
      setMessageText('');
      setShortSmsText('');
      setError(null);
      setCopied(false);
      setSmsSentNote(null);
      generateDraft('WARM_DUA');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!target) return null;

  const waPhone = formatBdPhoneForWhatsApp(target.donorPhone);
  const waHref = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('ক্লিপবোর্ডে কপি করা যায়নি। অনুগ্রহ করে লেখাটি সিলেক্ট করে কপি করুন।');
    }
  };

  const handleSendAppSms = async () => {
    if (!onSendSms || !target.donorPhone || !messageText.trim()) return;
    setSmsSending(true);
    setError(null);
    setSmsSentNote(null);
    try {
      await onSendSms(target.donorPhone, shortSmsText || messageText);
      setSmsSentNote('দাতার মোবাইলে কৃতজ্ঞতা বার্তা SMS পাঠানো হয়েছে।');
    } catch (err: any) {
      setError(err?.message || 'SMS পাঠাতে ব্যর্থ হয়েছে।');
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-siliguri">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-siliguri">AI কৃতজ্ঞতা ও দোয়া বার্তা</h3>
              <p className="text-xs text-emerald-100 font-tiro">
                দাতার নাম, তারিখ ও দানের পরিমাণ অনুযায়ী WhatsApp/SMS শেয়ারযোগ্য বার্তা
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Donation Info Strip */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <div className="font-bold text-slate-900">{target.donorName}</div>
              <div className="text-[11px] text-slate-600 font-mono">
                তারিখ: {target.date} {target.receiptNo ? `• রসিদ: ${target.receiptNo}` : ''}
                {target.donorPhone ? ` • ${target.donorPhone}` : ''}
              </div>
            </div>
            <div className="text-sm font-black font-mono text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-200">
              ৳ {Number(target.amount).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Tone Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'WARM_DUA', label: 'দোয়া ও আন্তরিক' },
                  { id: 'FORMAL', label: 'আনুষ্ঠানিক' },
                  { id: 'SHORT_SMS', label: 'সংক্ষিপ্ত SMS' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setTone(item.id);
                    generateDraft(item.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    tone === item.id
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => generateDraft(tone)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>নতুন খসড়া</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {smsSentNote && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              {smsSentNote}
            </div>
          )}

          {/* Editable Draft Area */}
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-emerald-800 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-bold">AI দাতার জন্য শ্রদ্ধাশীল কৃতজ্ঞতা বার্তা লিখছে...</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                বার্তার খসড়া (প্রয়োজনে সম্পাদনা করতে পারবেন):
              </label>
              <textarea
                rows={6}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3.5 text-sm leading-relaxed text-slate-800 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 font-tiro"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={!messageText.trim() || loading}
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {target.donorPhone && onSendSms ? (
                <button
                  type="button"
                  disabled={!messageText.trim() || loading || smsSending}
                  onClick={handleSendAppSms}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {smsSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  <span>SMS পাঠান</span>
                </button>
              ) : (
                <a
                  href={`sms:${target.donorPhone || ''}?body=${encodeURIComponent(shortSmsText || messageText)}`}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition ${
                    !messageText.trim() || loading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>SMS অ্যাপ</span>
                </a>
              )}

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition ${
                  !messageText.trim() || loading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp শেয়ার</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

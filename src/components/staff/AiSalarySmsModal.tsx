import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  MessageSquare,
  Send,
  RefreshCw,
  Phone
} from 'lucide-react';
import { Staff, StaffPayment } from '../../types';
import { api } from '../../lib/api';
import { formatCurrency, formatBengaliMonthYear } from '../../lib/i18n';

interface AiSalarySmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  payment: StaffPayment | null;
  month: string;
}

const formatBdPhoneForWhatsApp = (rawPhone?: string): string => {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/[^\d]/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('01')) return `88${digits}`;
  return digits;
};

export const AiSalarySmsModal: React.FC<AiSalarySmsModalProps> = ({
  isOpen,
  onClose,
  staff,
  payment,
  month,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [shortSms, setShortSms] = useState('');
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  const generateSms = async (targetStaff: Staff, targetPayment: StaffPayment) => {
    setLoading(true);
    setError(null);
    try {
      const paidAmount =
        (targetPayment as any).netPayable ||
        targetPayment.netPaid ||
        targetPayment.basicSalary ||
        0;
      const voucherNo =
        (targetPayment as any).voucherNumber ||
        targetPayment.expenseVoucherNumber ||
        '';
      const data = await api.generateStaffSalarySmsAi({
        staffId: targetStaff.id,
        paymentId: targetPayment.id,
        month: (targetPayment as any).paymentMonth || targetPayment.month || month,
        netPaid: paidAmount,
        paymentMethod: targetPayment.paymentMethod,
        voucherNumber: voucherNo,
      });
      setWhatsappMsg(data.whatsappMessageBn || '');
      setShortSms(data.shortSmsBn || '');
    } catch (err: any) {
      setError(err?.message || 'AI বেতন SMS তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && staff && payment) {
      setCopiedWa(false);
      setCopiedSms(false);
      generateSms(staff, payment);
    }
  }, [isOpen, staff?.id, payment?.id]);

  if (!isOpen || !staff || !payment) return null;

  const paidAmount = (payment as any).netPayable || payment.netPaid || payment.basicSalary || 0;
  const waPhone = formatBdPhoneForWhatsApp(staff.phone);
  const whatsappHref = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

  const handleCopy = async (text: string, which: 'WA' | 'SMS') => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'WA') {
        setCopiedWa(true);
        setTimeout(() => setCopiedWa(false), 2000);
      } else {
        setCopiedSms(true);
        setTimeout(() => setCopiedSms(false), 2000);
      }
    } catch {
      setError('ক্লিপবোর্ডে কপি করা যায়নি।');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-siliguri">AI বেতন পরিশোধ SMS ও WhatsApp বার্তা</h3>
              <p className="text-xs text-emerald-200 font-siliguri">
                {staff.fullNameBn || staff.name} ({staff.designationBn}) • {formatBengaliMonthYear(month)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => generateSms(staff, payment)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition"
              title="নতুন করে খসড়া তৈরি করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>পুনরায়</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Summary Pill Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono">{staff.phone || 'মোবাইল নম্বর নেই'}</span>
            </div>
            <div className="font-bold text-emerald-800 font-siliguri">
              পরিশোধিত পরিমাণ: {formatCurrency(paidAmount, 'bn')}
            </div>
          </div>

          {loading && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
              <p className="font-bold text-slate-700 font-siliguri">
                মার্জিত বাংলা WhatsApp ও SMS বার্তা তৈরি হচ্ছে...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && (whatsappMsg || shortSms) && (
            <>
              {/* WhatsApp Box */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 font-siliguri flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp বার্তা (সম্পাদনাযোগ্য)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(whatsappMsg, 'WA')}
                      className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg font-bold flex items-center gap-1 transition"
                    >
                      {copiedWa ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWa ? 'কপি হয়েছে' : 'কপি'}</span>
                    </button>

                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  className="w-full p-3 bg-white border border-emerald-200 rounded-xl font-siliguri text-sm leading-relaxed focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Short SMS Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 font-siliguri">
                    সংক্ষিপ্ত মোবাইল SMS ({shortSms.length} অক্ষর)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(shortSms, 'SMS')}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center gap-1 transition"
                  >
                    {copiedSms ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSms ? 'কপি হয়েছে' : 'SMS কপি'}</span>
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={shortSms}
                  onChange={(e) => setShortSms(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-siliguri text-sm leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

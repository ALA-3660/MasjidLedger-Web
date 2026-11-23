import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Phone,
  Building,
  MessageSquare,
} from 'lucide-react';
import { api, WaqfRentRemindersResult } from '../../lib/api';
import { formatCurrency } from '../../lib/i18n';

interface WaqfRentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaqfRentReminderModal: React.FC<WaqfRentReminderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [billingMonth, setBillingMonth] = useState(defaultMonth);
  const [tone, setTone] = useState<'POLITE' | 'FORMAL'>('POLITE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<WaqfRentRemindersResult | null>(null);
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const loadReminders = async (targetMonth = billingMonth, targetTone = tone) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('রিমাইন্ডার ড্রাফট তৈরিতে নির্ধারিত সময়ের বেশি লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।')),
          45000
        )
      );
      const data = await Promise.race([
        api.getWaqfRentRemindersAi({ billingMonth: targetMonth, tone: targetTone }),
        timeoutPromise,
      ]);
      setResult(data);
      const draftMap: Record<string, string> = {};
      (data.reminders || []).forEach((r) => {
        draftMap[r.tenantId] = r.messageDraftBn;
      });
      setEditedDrafts(draftMap);
    } catch (err: any) {
      setErrorMsg(err?.message || 'বকেয়া ভাড়ার রিমাইন্ডার ড্রাফট তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result && !loading) {
      loadReminders(billingMonth, tone);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyOne = async (tenantId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(tenantId);
      setTimeout(() => setCopiedId((curr) => (curr === tenantId ? null : curr)), 2000);
    } catch {
      setErrorMsg('ক্লিপবোর্ডে কপি করা যায়নি। টেক্সট বক্স থেকে ম্যানুয়ালি কপি করুন।');
    }
  };

  const handleCopyAll = async () => {
    if (!result || result.reminders.length === 0) return;
    const combined = result.reminders
      .map((r, i) => {
        const msg = editedDrafts[r.tenantId] ?? r.messageDraftBn;
        return `${(i + 1).toLocaleString('bn-BD')}. ${r.tenantName} (${r.mobile || 'মোবাইল নেই'}) — ${r.propertyName} (${r.unitOrShopNo}):\n${msg}`;
      })
      .join('\n\n--------------------------------\n\n');
    try {
      await navigator.clipboard.writeText(combined);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      setErrorMsg('সব ড্রাফট একসাথে কপি করা যায়নি।');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-siliguri">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl border border-white/20">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                ✨ AI বকেয়া ভাড়া শনাক্তকরণ ও বিনম্র রিমাইন্ডার ড্রাফট
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 font-semibold">
                  অটো-সেন্ড বন্ধ
                </span>
              </h3>
              <p className="text-[11px] text-blue-100/90 font-tiro mt-0.5">
                সিস্টেমের প্রকৃত বকেয়া হিসাব অনুযায়ী মার্জিত বাংলা রিমাইন্ডার ড্রাফট — কেবল প্রিভিউ ও কপি করার জন্য।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700">বিলিং মাস:</label>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-baloo text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-700">ভাষার ধরন:</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as 'POLITE' | 'FORMAL')}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
              >
                <option value="POLITE">বিনম্র ও আন্তরিক (সুপারিশকৃত)</option>
                <option value="FORMAL">দাপ্তরিক ও সৌজন্যমূলক</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => loadReminders(billingMonth, tone)}
            className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{loading ? 'হিসাব ও ড্রাফট তৈরি হচ্ছে...' : 'বকেয়া যাচাই ও ড্রাফট তৈরি'}</span>
          </button>
        </div>

        {/* Protection Note */}
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200/80 flex items-center gap-2 text-[11px] text-amber-950 font-tiro shrink-0">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            কোনো মেসেজ বা SMS স্বয়ংক্রিয়ভাবে পাঠানো হবে না। বকেয়ার অঙ্ক সিস্টেমের ভাড়া খাতা থেকে গণনাকৃত; প্রয়োজনে লেখা সম্পাদনা করে কপি করে ব্যবহার করুন।
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-tiro">{errorMsg}</div>
            </div>
          )}

          {loading ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <div className="text-xs font-bold">বকেয়া ভাড়া যাচাই এবং বিনম্র বাংলা ড্রাফট তৈরি হচ্ছে...</div>
              <div className="text-[11px] text-slate-400 font-tiro">সিস্টেমের প্রকৃত ভাড়া আদায়ের রেকর্ড থেকে গণনা করা হচ্ছে</div>
            </div>
          ) : result ? (
            <>
              {/* Deterministic Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-slate-500">সক্রিয় ভাড়াটিয়া</div>
                  <div className="text-lg font-black text-slate-900 font-baloo">
                    {result.totalActiveTenants.toLocaleString('bn-BD')} জন
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-emerald-700">ভাড়া পরিশোধিত</div>
                  <div className="text-lg font-black text-emerald-900 font-baloo">
                    {result.paidTenantsCount.toLocaleString('bn-BD')} জন
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-rose-700">বকেয়া ভাড়াটিয়া</div>
                  <div className="text-lg font-black text-rose-900 font-baloo">
                    {result.overdueCount.toLocaleString('bn-BD')} জন
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                  <div className="text-[11px] font-bold text-amber-800">মোট বকেয়া ({result.billingMonthLabelBn})</div>
                  <div className="text-lg font-black text-amber-950 font-baloo">
                    {formatCurrency(result.totalDueAmount)}
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-950 font-tiro flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{result.summaryBn}</span>
              </div>

              {/* Reminders List */}
              {result.reminders.length === 0 ? (
                <div className="p-10 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-emerald-900">কোনো বকেয়া ভাড়া নেই</div>
                  <p className="text-xs text-emerald-800 font-tiro">{result.summaryBn}</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {result.reminders.map((item) => {
                    const draftText = editedDrafts[item.tenantId] ?? item.messageDraftBn;
                    const isCopied = copiedId === item.tenantId;
                    return (
                      <div
                        key={item.tenantId}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900">{item.tenantName}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.status === 'PARTIAL'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {item.status === 'PARTIAL' ? 'আংশিক বকেয়া' : 'অপরিশোধিত'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Building className="w-3.5 h-3.5 text-indigo-600" />
                                {item.propertyName} ({item.unitOrShopNo})
                              </span>
                              {item.mobile && (
                                <span className="flex items-center gap-1 font-baloo">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {item.mobile}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right font-baloo">
                            <div className="text-[11px] text-slate-500">
                              নির্ধারিত: {formatCurrency(item.monthlyRent)} • আদায়: {formatCurrency(item.paidThisMonth)}
                            </div>
                            <div className="text-sm font-black text-rose-700">
                              বকেয়া: {formatCurrency(item.dueAmount)}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            বিনম্র রিমাইন্ডার মেসেজ ড্রাফট (প্রয়োজনে সম্পাদনা করুন):
                          </label>
                          <textarea
                            rows={3}
                            value={draftText}
                            onChange={(e) =>
                              setEditedDrafts((prev) => ({ ...prev, [item.tenantId]: e.target.value }))
                            }
                            className="w-full p-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-xs font-tiro text-slate-800 leading-relaxed outline-none"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyOne(item.tenantId, draftText)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'কপি হয়েছে!' : 'বার্তা কপি করুন'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            বন্ধ করুন
          </button>

          {result && result.reminders.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'সকল ড্রাফট কপি হয়েছে!' : 'সকল ড্রাফট একসাথে কপি করুন'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

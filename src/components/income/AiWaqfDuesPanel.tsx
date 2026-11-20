import React, { useState } from 'react';
import {
  Sparkles,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  MessageSquare,
  Calendar,
  Phone,
  Banknote,
} from 'lucide-react';
import { api } from '../../lib/api';

interface AiWaqfDuesPanelProps {
  onCollectRentForTenant?: (propertyId: string, tenantId: string) => void;
}

function formatBdPhoneForWhatsApp(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}

export const AiWaqfDuesPanel: React.FC<AiWaqfDuesPanelProps> = ({
  onCollectRentForTenant,
}) => {
  const defaultMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [billingMonth, setBillingMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    billingMonth: string;
    billingMonthLabelBn: string;
    totalProperties: number;
    totalActiveTenants: number;
    paidTenantsCount: number;
    unpaidCount: number;
    totalDueAmount: number;
    summaryBn: string;
    unpaidTenants: Array<{
      propertyId: string;
      propertyName: string;
      propertyCode: string;
      tenantId: string;
      tenantName: string;
      phone: string;
      unitOrShopNo: string;
      monthlyRent: number;
      paidThisMonth: number;
      dueAmount: number;
      status: 'UNPAID_THIS_MONTH' | 'PARTIAL_DUE';
      reminderDraftBn: string;
    }>;
  } | null>(null);

  const handleCheckDues = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.checkWaqfRentDuesAi({ billingMonth });
      setResult(data);
      const map: Record<string, string> = {};
      data.unpaidTenants.forEach((t) => {
        map[t.tenantId] = t.reminderDraftBn;
      });
      setEditedDrafts(map);
    } catch (err: any) {
      setError(err?.message || 'ওয়াক্ফ সম্পত্তির বকেয়া ভাড়া যাচাই করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (tenantId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(tenantId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('ক্লিপবোর্ডে কপি করা যায়নি।');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden font-siliguri">
      {/* Top Action Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-amber-50/40 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              AI ওয়াক্ফ ভাড়া বকেয়া চেক ও ভদ্র রিমাইন্ডার
            </h3>
            <p className="text-xs text-slate-600 font-tiro mt-0.5">
              কোন কোন দোকান বা ভাড়াটিয়ার চলতি মাসের ভাড়া এখনো এন্ট্রি হয়নি তা খুঁজে বের করে প্রত্যেকের জন্য আলাদা ভদ্র বাংলা রিমাইন্ডার মেসেজ ড্রাফট করুন
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="text-xs font-mono font-bold text-slate-800 bg-transparent outline-hidden"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleCheckDues}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>যাচাই ও ড্রাফট হচ্ছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI বকেয়া চেক ও রিমাইন্ডার</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Summary KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-bold text-slate-500">সক্রিয় ভাড়াটিয়া</div>
              <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                {result.totalActiveTenants} জন
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="text-[11px] font-bold text-emerald-700">ভাড়া পরিশোধিত</div>
              <div className="text-lg font-black font-mono text-emerald-800 mt-0.5">
                {result.paidTenantsCount} জন
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="text-[11px] font-bold text-amber-800">বকেয়া রয়েছে</div>
              <div className="text-lg font-black font-mono text-amber-900 mt-0.5">
                {result.unpaidCount} জন
              </div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <div className="text-[11px] font-bold text-rose-700">মোট বকেয়া ({result.billingMonthLabelBn})</div>
              <div className="text-lg font-black font-mono text-rose-800 mt-0.5">
                ৳ {result.totalDueAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 font-medium font-tiro flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span>{result.summaryBn}</span>
          </div>

          {/* Unpaid Tenants Reminder Cards */}
          {result.unpaidTenants.length > 0 && (
            <div className="space-y-3">
              {result.unpaidTenants.map((tenant) => {
                const draft = editedDrafts[tenant.tenantId] ?? tenant.reminderDraftBn;
                const waPhone = formatBdPhoneForWhatsApp(tenant.phone);
                const waUrl = waPhone
                  ? `https://wa.me/${waPhone}?text=${encodeURIComponent(draft)}`
                  : `https://wa.me/?text=${encodeURIComponent(draft)}`;

                return (
                  <div
                    key={tenant.tenantId}
                    className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{tenant.tenantName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              tenant.status === 'PARTIAL_DUE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {tenant.status === 'PARTIAL_DUE' ? 'আংশিক বকেয়া' : 'চলতি মাস অপরিশোধিত'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {tenant.propertyName}
                              {tenant.unitOrShopNo ? ` (${tenant.unitOrShopNo})` : ''}
                            </span>
                          </span>
                          {tenant.phone && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{tenant.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-500">বকেয়া পরিমাণ</div>
                        <div className="text-base font-black font-mono text-rose-700">
                          ৳ {tenant.dueAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={draft}
                      onChange={(e) =>
                        setEditedDrafts((prev) => ({
                          ...prev,
                          [tenant.tenantId]: e.target.value,
                        }))
                      }
                      className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 leading-relaxed font-tiro focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(tenant.tenantId, draft)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          {copiedId === tenant.tenantId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === tenant.tenantId ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                        </button>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        <a
                          href={`sms:${tenant.phone || ''}?body=${encodeURIComponent(draft)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                      </div>

                      {onCollectRentForTenant && (
                        <button
                          type="button"
                          onClick={() => onCollectRentForTenant(tenant.propertyId, tenant.tenantId)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                        >
                          <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ভাড়া এন্ট্রি করুন</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

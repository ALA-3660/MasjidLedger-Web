import React, { useState, useRef } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Landmark,
  X,
  ClipboardPaste,
  Info,
} from 'lucide-react';
import { FinancialAccount } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/i18n';

interface AiBankReconciliationPanelProps {
  accounts: FinancialAccount[];
  defaultAccountId?: string;
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('স্টেটমেন্ট ফাইলটি পড়া যায়নি।'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      // For images, compress down to max 1600px JPEG to keep payload fast and crisp
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onerror = () => {
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          resolve({ base64, mimeType: file.type || 'image/jpeg' });
        };
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: dataUrl.split(',')[1] || '', mimeType: file.type || 'image/jpeg' });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          resolve({ base64: compressed.split(',')[1] || '', mimeType: 'image/jpeg' });
        };
        img.src = dataUrl;
      } else {
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve({ base64, mimeType: file.type || 'application/pdf' });
      }
    };
    reader.readAsDataURL(file);
  });
}

export const AiBankReconciliationPanel: React.FC<AiBankReconciliationPanelProps> = ({
  accounts,
  defaultAccountId,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bankAndMfsAccounts = accounts.filter((a) => a.accountType === 'BANK' || a.accountType === 'MFS');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    defaultAccountId || bankAndMfsAccounts[0]?.id || 'ALL'
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMode, setInputMode] = useState<'FILE' | 'TEXT'>('FILE');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [filePayload, setFilePayload] = useState<{ base64: string; mimeType: string } | null>(null);
  const [statementText, setStatementText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.reconcileBankStatementAi>> | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);

    try {
      const isTextLike =
        file.type === 'text/csv' ||
        file.type === 'text/plain' ||
        file.name.toLowerCase().endsWith('.csv') ||
        file.name.toLowerCase().endsWith('.txt');

      if (isTextLike) {
        const txt = await file.text();
        setStatementText(txt);
        setFilePayload(null);
        setSelectedFileName(file.name);
        setInputMode('TEXT');
      } else if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const encoded = await readFileAsBase64(file);
        setFilePayload(encoded);
        setSelectedFileName(file.name);
        setInputMode('FILE');
      } else {
        setError('অনুগ্রহ করে ব্যাংক/বিকাশ/নগদ স্টেটমেন্টের ছবি (JPG/PNG), PDF, অথবা CSV/TXT ফাইল নির্বাচন করুন।');
      }
    } catch (err: any) {
      setError(err?.message || 'ফাইল পড়তে সমস্যা হয়েছে।');
    }
  };

  const handleReconcile = async () => {
    setError(null);
    if (inputMode === 'FILE' && !filePayload) {
      setError('প্রথমে ব্যাংক বা বিকাশ/নগদ স্টেটমেন্টের একটি ছবি বা PDF ফাইল আপলোড করুন।');
      return;
    }
    if (inputMode === 'TEXT' && statementText.trim().length < 10) {
      setError('স্টেটমেন্টের টেক্সট বা CSV লাইনগুলো নিচের বক্সে পেস্ট করুন।');
      return;
    }

    setLoading(true);
    try {
      const res = await api.reconcileBankStatementAi({
        accountId: selectedAccountId === 'ALL' ? undefined : selectedAccountId,
        fileBase64: inputMode === 'FILE' ? filePayload?.base64 : undefined,
        mimeType: inputMode === 'FILE' ? filePayload?.mimeType : undefined,
        statementText: inputMode === 'TEXT' ? statementText : undefined,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'ব্যাংক/এমএফএস স্টেটমেন্ট মিলিয়ে দেখা ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200/90 shadow-xs overflow-hidden font-siliguri">
      {/* Header Banner */}
      <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold">
              AI ব্যাংক ও এমএফএস স্টেটমেন্ট রিকনসিলিয়েশন
            </h4>
            <p className="text-[11px] text-indigo-100 font-tiro">
              ব্যাংক বা বিকাশ/নগদ স্টেটমেন্টের ছবি, PDF বা টেক্সট আপলোড করে সফটওয়্যারের খতিয়ানের সাথে বাদ পড়া এন্ট্রি ও অঙ্কের অমিল বের করুন
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-xs transition cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isExpanded ? 'প্যানেল বন্ধ করুন' : 'AI স্টেটমেন্ট মিলিয়ে নিন'}</span>
        </button>
      </div>

      {/* Expandable Input & Results Panel */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40">
          {/* Account & Mode Selector Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                সফটওয়্যারের কোন ব্যাংক / এমএফএস হিসাবের সাথে মিলাবেন?
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">সকল ব্যাংক ও এমএফএস হিসাব ({bankAndMfsAccounts.length}টি)</option>
                {bankAndMfsAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameBn} ({acc.accountType}) — ৳ {(Number(acc.currentBalance) || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">স্টেটমেন্ট প্রদানের মাধ্যম</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode('FILE')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    inputMode === 'FILE'
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>ছবি / PDF আপলোড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('TEXT')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    inputMode === 'TEXT'
                      ? 'bg-indigo-700 text-white border-indigo-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>টেক্সট / CSV পেস্ট</span>
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Box */}
          {inputMode === 'FILE' && (
            <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-5 bg-white text-center space-y-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-700 mx-auto flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">
                  {selectedFileName ? `নির্বাচিত ফাইল: ${selectedFileName}` : 'ব্যাংক বা বিকাশ/নগদ স্টেটমেন্ট আপলোড করুন'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ছবি (JPG, PNG, WEBP), PDF স্টেটমেন্ট অথবা CSV ফাইল সমর্থিত
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-bold transition cursor-pointer"
                >
                  {selectedFileName ? 'অন্য ফাইল নির্বাচন করুন' : 'ফাইল / ছবি ব্রাউজ করুন'}
                </button>
                {selectedFileName && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFileName('');
                      setFilePayload(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    মুছুন
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Text / CSV Paste Box */}
          {inputMode === 'TEXT' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                ব্যাংক স্টেটমেন্টের কপি করা টেক্সট, বিকাশ/নগদ SMS তালিকা বা CSV ডেটা এখানে পেস্ট করুন:
              </label>
              <textarea
                rows={4}
                value={statementText}
                onChange={(e) => setStatementText(e.target.value)}
                placeholder={`উদাহরণ:\n2026-11-05 | Cash Deposit | Credit 25,000\n2026-11-10 | Bank SMS Charge | Debit 230\n2026-11-14 | bKash Cash In from 01712... | Credit 5,000`}
                className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              AI কেবল স্টেটমেন্টের সাথে সফটওয়্যারের অমিল ও বাদ পড়া এন্ট্রি চিহ্নিত করবে; ডাটাবেস পরিবর্তন করবে না।
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={handleReconcile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-extrabold shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI স্টেটমেন্ট বিশ্লেষণ ও মিলিয়ে দেখছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI দিয়ে স্টেটমেন্ট মিলিয়ে নিন</span>
                </>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError(null)} className="text-rose-700 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reconciliation Results */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Header Info & KPIs */}
              <div className="p-3.5 rounded-xl bg-white border border-indigo-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>{result.statementAccountLabelBn}</span>
                    </div>
                    {result.statementPeriodBn && (
                      <div className="text-[11px] text-slate-500">সময়কাল: {result.statementPeriodBn}</div>
                    )}
                  </div>
                  {result.balanceDifference !== null && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                        Math.abs(result.balanceDifference) <= 1
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      ব্যালেন্স পার্থক্য: ৳ {result.balanceDifference.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block">স্টেটমেন্টের লেনদেন</span>
                    <span className="text-base font-black font-mono text-slate-900">{result.totalStatementRows} টি</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 block">সঠিকভাবে মিলেছে</span>
                    <span className="text-base font-black font-mono text-emerald-800">{result.matchedCount} টি</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 block">সফটওয়্যারে এন্ট্রি নেই</span>
                    <span className="text-base font-black font-mono text-rose-800">
                      {result.unrecordedInSoftware.length} টি
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 block">অঙ্কের অমিল</span>
                    <span className="text-base font-black font-mono text-amber-900">
                      {result.amountMismatches.length} টি
                    </span>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 font-tiro leading-relaxed">
                  {result.summaryBn}
                </div>
              </div>

              {/* Table 1: Unrecorded in Software */}
              {result.unrecordedInSoftware.length > 0 && (
                <div className="bg-white border border-rose-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>সফটওয়্যারে এন্ট্রি করা হয়নি ({result.unrecordedInSoftware.length} টি লেনদেন)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">তারিখ</th>
                          <th className="px-3 py-2">ধরন</th>
                          <th className="px-3 py-2">স্টেটমেন্টের বিবরণ / রেফারেন্স</th>
                          <th className="px-3 py-2 text-right">পরিমাণ (৳)</th>
                          <th className="px-3 py-2">মন্তব্য</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.unrecordedInSoftware.map((row, i) => (
                          <tr key={i} className="hover:bg-rose-50/30">
                            <td className="px-3 py-2 font-mono whitespace-nowrap">{formatDate(row.date)}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.direction === 'DEPOSIT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {row.direction === 'DEPOSIT' ? 'জমা (Credit)' : 'উত্তোলন / চার্জ'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              <div className="font-semibold">{row.description}</div>
                              {row.reference && (
                                <div className="text-[10px] font-mono text-slate-500">Ref: {row.reference}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-black text-rose-800 whitespace-nowrap">
                              ৳ {row.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-600">{row.noteBn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Table 2: Amount Mismatches */}
              {result.amountMismatches.length > 0 && (
                <div className="bg-white border border-amber-300 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>অঙ্কের অমিল পাওয়া গেছে ({result.amountMismatches.length} টি লেনদেন)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">তারিখ</th>
                          <th className="px-3 py-2">স্টেটমেন্ট বিবরণ</th>
                          <th className="px-3 py-2">সফটওয়্যার ভাউচার</th>
                          <th className="px-3 py-2 text-right">স্টেটমেন্ট (৳)</th>
                          <th className="px-3 py-2 text-right">সফটওয়্যার (৳)</th>
                          <th className="px-3 py-2 text-right">পার্থক্য</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.amountMismatches.map((m, i) => (
                          <tr key={i} className="hover:bg-amber-50/40">
                            <td className="px-3 py-2 font-mono whitespace-nowrap">{formatDate(m.date)}</td>
                            <td className="px-3 py-2 text-slate-800">{m.statementDescription}</td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-700">{m.softwareVoucherNumber}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-indigo-800">
                              ৳ {m.statementAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                              ৳ {m.softwareAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-black text-rose-700">
                              {m.difference > 0 ? '+' : ''}৳ {m.difference.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Table 3: Only in Software (e.g. Uncleared Cheques) */}
              {result.onlyInSoftware.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-800">
                    শুধুমাত্র সফটওয়্যারে আছে / স্টেটমেন্টে এখনো ক্লিয়ার হয়নি ({result.onlyInSoftware.length} টি)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">তারিখ</th>
                          <th className="px-3 py-2">ভাউচার নং</th>
                          <th className="px-3 py-2">বিবরণ</th>
                          <th className="px-3 py-2 text-right">পরিমাণ (৳)</th>
                          <th className="px-3 py-2">মন্তব্য</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.onlyInSoftware.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono whitespace-nowrap">{formatDate(row.date)}</td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">{row.voucherNumber}</td>
                            <td className="px-3 py-2 text-slate-700">{row.description}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                              ৳ {row.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-500">{row.noteBn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Checklist */}
              {result.actionStepsBn.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>হিসাব সমন্বয়ের জন্য করণীয় ধাপসমূহ:</span>
                  </div>
                  <ul className="space-y-1">
                    {result.actionStepsBn.map((step, i) => (
                      <li key={i} className="text-xs text-emerald-950 flex items-start gap-1.5">
                        <span className="font-mono font-bold text-emerald-700">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

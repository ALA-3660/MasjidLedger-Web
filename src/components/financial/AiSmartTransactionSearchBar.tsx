import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Loader2,
  X,
  AlertCircle,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/i18n';

interface AiSmartTransactionSearchBarProps {
  scope?: 'ALL' | 'CASH' | 'BANK';
  accountId?: string;
}

const EXAMPLE_QUERIES_BY_SCOPE: Record<'ALL' | 'CASH' | 'BANK', string[]> = {
  ALL: [
    'গত সপ্তাহে ৫০০০ টাকার বেশি কী কী খরচ হয়েছে?',
    'অক্টোবরের ফান্ড ট্রান্সফার দেখাও',
    'এই মাসে ১০,০০০ টাকার বেশি দানগুলো দেখাও',
    'ইমাম সাহেবের বেতন কবে দেওয়া হয়েছে?',
  ],
  CASH: [
    'গত সপ্তাহে ৫০০০ টাকার বেশি কী কী নগদ খরচ হয়েছে?',
    'এই মাসে নগদ দান কতগুলো হয়েছে?',
    'বিদ্যুৎ বিল বাবদ নগদ খরচ দেখাও',
  ],
  BANK: [
    'অক্টোবরের ফান্ড ট্রান্সফার দেখাও',
    '১০,০০০ টাকার বেশি ব্যাংক উত্তোলন দেখাও',
    'এই মাসে বিকাশ বা ব্যাংকে কী কী জমা হয়েছে?',
  ],
};

export const AiSmartTransactionSearchBar: React.FC<AiSmartTransactionSearchBarProps> = ({
  scope = 'ALL',
  accountId,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<Awaited<ReturnType<typeof api.smartSearchTransactionsAi>> | null>(null);

  const normalizedScope: 'ALL' | 'CASH' | 'BANK' =
    scope === 'CASH' || scope === 'BANK' ? scope : 'ALL';
  const examples = EXAMPLE_QUERIES_BY_SCOPE[normalizedScope];

  const handleRunSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q || loading) return;
    setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const res = await api.smartSearchTransactionsAi({
        query: q,
        scope: normalizedScope,
        accountId,
      });
      setSearchResult(res);
    } catch (err: any) {
      setError(err?.message || 'AI লেনদেন অনুসন্ধান করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-white p-4 space-y-3.5 font-siliguri">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
              AI স্মার্ট লেনদেন অনুসন্ধান (প্রাকৃতিক বাংলায় খুঁজুন)
            </h3>
            <p className="text-[11px] text-slate-600 font-tiro">
              সাধারণ বাংলায় প্রশ্ন লিখুন — AI তারিখ, টাকার সীমা, খাত ও ফান্ড ট্রান্সফার বুঝে সরাসরি টেবিলে ফলাফল দেখাবে
            </p>
          </div>
        </div>
        {searchResult && (
          <button
            type="button"
            onClick={() => {
              setSearchResult(null);
              setQuery('');
              setError(null);
            }}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>AI ফলাফল রিসেট</span>
          </button>
        )}
      </div>

      {/* Input Form */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-blue-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRunSearch();
              }
            }}
            placeholder='যেমন: "গত সপ্তাহে ৫০০০ টাকার বেশি কী কী খরচ হয়েছে?" বা "অক্টোবরের ফান্ড ট্রান্সফার দেখাও"'
            className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 font-tiro"
          />
        </div>

        <button
          type="button"
          disabled={!query.trim() || loading}
          onClick={() => handleRunSearch()}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-extrabold shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>খোঁজা হচ্ছে...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI খুঁজুন</span>
            </>
          )}
        </button>
      </div>

      {/* Clickable Examples */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-500">উদাহরণ:</span>
        {examples.map((ex, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleRunSearch(ex)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-blue-200/80 text-slate-700 hover:text-blue-900 transition cursor-pointer"
          >
            “{ex}”
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Filtered Results Table */}
      {searchResult && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-2xs overflow-hidden space-y-0">
          {/* Interpreted Filter Bar & Totals */}
          <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-700" />
                <span>AI ফিল্টার: {searchResult.interpretedQueryBn}</span>
              </div>
              <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
                <span>মোট পাওয়া গেছে: <strong className="font-mono text-slate-900">{searchResult.totalCount}</strong> টি লেনদেন</span>
                {searchResult.appliedFilters.startDate && (
                  <span>• তারিখ: <strong className="font-mono">{formatDate(searchResult.appliedFilters.startDate)}</strong> – <strong className="font-mono">{formatDate(searchResult.appliedFilters.endDate || searchResult.appliedFilters.startDate)}</strong></span>
                )}
                {searchResult.appliedFilters.minAmount && (
                  <span>• ন্যূনতম: <strong className="font-mono">৳ {searchResult.appliedFilters.minAmount.toLocaleString('en-IN')}</strong></span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold">
              {searchResult.totalDebit > 0 && (
                <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900">
                  আয়: ৳ {searchResult.totalDebit.toLocaleString('en-IN')}
                </span>
              )}
              {searchResult.totalCredit > 0 && (
                <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-900">
                  ব্যয়: ৳ {searchResult.totalCredit.toLocaleString('en-IN')}
                </span>
              )}
              {searchResult.totalTransfer > 0 && (
                <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-900">
                  ট্রান্সফার: ৳ {searchResult.totalTransfer.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5">ভাউচার</th>
                  <th className="p-2.5">ধরন</th>
                  <th className="p-2.5">খাত ও বিবরণ</th>
                  <th className="p-2.5">হিসাব</th>
                  <th className="p-2.5">দাতা / প্রাপক</th>
                  <th className="p-2.5 text-right">পরিমাণ (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {searchResult.results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      এই শর্ত অনুযায়ী কোনো লেনদেন পাওয়া যায়নি। অন্যভাবে তারিখ বা অঙ্ক লিখে চেষ্টা করুন।
                    </td>
                  </tr>
                ) : (
                  searchResult.results.map((item) => (
                    <tr key={`${item.txType}-${item.id}`} className="hover:bg-blue-50/40">
                      <td className="p-2.5 font-mono whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">{item.voucherNumber}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.txType === 'INCOME'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.txType === 'EXPENSE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {item.txType === 'INCOME' && <ArrowDownLeft className="w-3 h-3" />}
                          {item.txType === 'EXPENSE' && <ArrowUpRight className="w-3 h-3" />}
                          {item.txType === 'TRANSFER' && <ArrowRightLeft className="w-3 h-3" />}
                          <span>{item.txTypeLabelBn}</span>
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{item.headNameBn}</div>
                        {item.description && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[220px]">{item.description}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-700">{item.accountName}</td>
                      <td className="p-2.5 text-slate-700">{item.partyName}</td>
                      <td
                        className={`p-2.5 text-right font-mono font-black whitespace-nowrap ${
                          item.txType === 'INCOME'
                            ? 'text-emerald-700'
                            : item.txType === 'EXPENSE'
                            ? 'text-rose-700'
                            : 'text-indigo-700'
                        }`}
                      >
                        ৳ {item.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

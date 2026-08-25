import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { IncomeEntry, ExpenseEntry, FinancialAccount, Mosque } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';

interface DailyTransactionsViewProps {
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accounts: FinancialAccount[];
  currentMosque: Mosque | null;
  language?: Language;
}

export const DailyTransactionsView: React.FC<DailyTransactionsViewProps> = ({
  incomes,
  expenses,
  accounts,
  currentMosque,
  language = 'bn',
}) => {
  const t = translations[language] || translations.bn;

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('THIS_MONTH' as any);
  const [fromDate, setFromDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');

  const handlePresetChange = (preset: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'TODAY') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      setFromDate(yest);
      setToDate(yest);
    } else if (preset === 'WEEK') {
      const past7 = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      setFromDate(past7);
      setToDate(todayStr);
    } else if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    }
  };

  // Combine and sort approved transactions
  const allTx: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    date: string;
    voucherNumber: string;
    mainHeadNameBn: string;
    subHeadNameBn?: string;
    amount: number;
    accountId: string;
    accountName: string;
    donorOrPayee: string;
    description?: string;
    reference?: string;
    paymentMethod: string;
    createdAt: string;
  }> = [
    ...incomes
      .filter((i) => i.status === 'APPROVED')
      .map((i) => ({
        id: i.id,
        type: 'INCOME' as const,
        date: i.date,
        voucherNumber: i.voucherNumber,
        mainHeadNameBn: i.mainHeadNameBn,
        subHeadNameBn: i.subHeadNameBn,
        amount: i.amount,
        accountId: i.accountId,
        accountName: i.accountName,
        donorOrPayee: i.donorName || 'সাধারণ দানশীল',
        description: i.description,
        reference: i.reference,
        paymentMethod: i.paymentMethod,
        createdAt: i.createdAt,
      })),
    ...expenses
      .filter((e) => e.status === 'APPROVED')
      .map((e) => ({
        id: e.id,
        type: 'EXPENSE' as const,
        date: e.date,
        voucherNumber: e.voucherNumber,
        mainHeadNameBn: e.mainHeadNameBn,
        subHeadNameBn: e.subHeadNameBn,
        amount: e.amount,
        accountId: e.accountId,
        accountName: e.accountName,
        donorOrPayee: e.payeeName || 'ভেন্ডর / সাধারণ',
        description: e.description,
        reference: e.reference,
        paymentMethod: e.paymentMethod,
        createdAt: e.createdAt,
      })),
  ];

  // Calculate opening balance before `fromDate`
  const selectedAccounts =
    selectedAccountId === 'ALL'
      ? accounts
      : accounts.filter((a) => a.id === selectedAccountId);

  const initialOpeningFromAccounts = selectedAccounts.reduce(
    (sum, acc) => sum + (acc.openingBalance || 0),
    0
  );

  const priorTransactions = allTx.filter((t) => {
    const matchesAccount =
      selectedAccountId === 'ALL' || t.accountId === selectedAccountId;
    return matchesAccount && t.date < fromDate;
  });

  const priorIncome = priorTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const priorExpense = priorTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const openingBalance = initialOpeningFromAccounts + priorIncome - priorExpense;

  // Filter transactions within date range and search
  const periodTransactions = allTx
    .filter((t) => {
      const matchesAccount =
        selectedAccountId === 'ALL' || t.accountId === selectedAccountId;
      const matchesDate = t.date >= fromDate && t.date <= toDate;
      const matchesSearch =
        t.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.mainHeadNameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subHeadNameBn && t.subHeadNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.donorOrPayee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesAccount && matchesDate && matchesSearch;
    })
    .sort((a, b) => {
      // Sort chronologically for running statement
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  // Calculate running balances
  let running = openingBalance;
  const ledgerRows = periodTransactions.map((tx) => {
    if (tx.type === 'INCOME') {
      running += tx.amount;
    } else {
      running -= tx.amount;
    }
    return {
      ...tx,
      runningBalance: running,
    };
  });

  const totalPeriodIncome = periodTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPeriodExpense = periodTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const closingBalance = openingBalance + totalPeriodIncome - totalPeriodExpense;

  const handleExportCSV = () => {
    const headers = [
      'তারিখ',
      'ভাউচার নম্বর',
      'হিসাব খাত',
      'উপ-খাত',
      'গ্রহীতা/দাতা',
      'অ্যাকাউন্ট',
      'মাধ্যম',
      'জমা (টাকা)',
      'খরচ (টাকা)',
      'চলমান স্থিতি (টাকা)',
      'বিবরণ',
    ];

    const rows = [
      ['প্রারম্ভিক স্থিতি (Opening Balance)', '', '', '', '', '', '', '', '', openingBalance.toString(), ''],
      ...ledgerRows.map((r) => [
        r.date,
        r.voucherNumber,
        r.mainHeadNameBn,
        r.subHeadNameBn || '',
        `"${r.donorOrPayee}"`,
        r.accountName,
        r.paymentMethod,
        r.type === 'INCOME' ? r.amount.toString() : '0',
        r.type === 'EXPENSE' ? r.amount.toString() : '0',
        r.runningBalance.toString(),
        `"${(r.description || '').replace(/"/g, '""')}"`,
      ]),
      ['সমাপনী স্থিতি (Closing Balance)', '', '', '', '', '', '', totalPeriodIncome.toString(), totalPeriodExpense.toString(), closingBalance.toString(), ''],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((row) => row.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Statement_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                দৈনিক লেনদেন বিবরণী (Daily Transaction Statement & Running Ledger)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ব্যাংক স্টেটমেন্টের ন্যায় প্রারম্ভিক স্থিতি, প্রতিটি এন্ট্রির পর চলমান স্থিতি ও সমাপনী স্থিতি
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV ডাউনলোড</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>স্টেটমেন্ট প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Filter Controls (Hidden on Print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5 print:hidden">
        {/* Preset Tabs & Account Selector */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => handlePresetChange('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePreset === 'TODAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              আজ
            </button>
            <button
              onClick={() => handlePresetChange('YESTERDAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePreset === 'YESTERDAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              গতকাল
            </button>
            <button
              onClick={() => handlePresetChange('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePreset === 'WEEK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              গত ৭ দিন
            </button>
            <button
              onClick={() => handlePresetChange('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePreset === 'MONTH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              চলতি মাস
            </button>
            <button
              onClick={() => setDatePreset('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePreset === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              কাস্টম তারিখ
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-600 shrink-0">হিসাব / অ্যাকাউন্ট:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-hidden w-full md:w-60"
            >
              <option value="ALL">সকল ক্যাশ ও ব্যাংক হিসাব (সম্মিলিত)</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.nameBn} ({acc.accountType === 'CASH' ? 'ক্যাশ' : 'ব্যাংক'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date pickers and search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium">তারিখ সীমা:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
            <span className="text-slate-400 text-xs">থেকে</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ভাউচার, খাত বা বিবরণ দিয়ে ফিল্টার..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Summary Highlights Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">প্রারম্ভিক স্থিতি (Opening)</span>
          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
            ৳ {openingBalance.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">তারিখ: {formatDate(fromDate)} এর পূর্বে</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <span className="text-xs font-bold text-emerald-700 block">মোট জমা / আয় (Credit)</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block font-mono">
            + ৳ {totalPeriodIncome.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">{periodTransactions.filter((t) => t.type === 'INCOME').length} টি ভাউচার</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <span className="text-xs font-bold text-rose-700 block">মোট খরচ / ব্যয় (Debit)</span>
          <span className="text-xl font-black text-rose-700 mt-1 block font-mono">
            - ৳ {totalPeriodExpense.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-600 block mt-0.5">{periodTransactions.filter((t) => t.type === 'EXPENSE').length} টি ভাউচার</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/30">
          <span className="text-xs font-bold text-blue-800 block">সমাপনী স্থিতি (Closing)</span>
          <span className="text-xl font-black text-blue-900 mt-1 block font-mono">
            ৳ {closingBalance.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-blue-600 block mt-0.5">তারিখ: {formatDate(toDate)} পর্যন্ত</span>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
        <h1 className="text-xl font-bold">{currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}</h1>
        <p className="text-xs text-slate-600">{currentMosque?.address || 'মিরপুর-১২, ঢাকা-১২১৬'}</p>
        <h2 className="text-sm font-bold mt-2 bg-slate-100 py-1 border border-slate-300">
          দৈনিক লেনদেন বিবরণী ও চলমান লেজার (Daily Transaction Statement)
        </h2>
        <div className="flex justify-between text-[11px] text-slate-600 mt-2 font-medium">
          <span>হিসাব: {selectedAccountId === 'ALL' ? 'সকল হিসাব (সম্মিলিত)' : accounts.find((a) => a.id === selectedAccountId)?.nameBn}</span>
          <span>সময়সীমা: {formatDate(fromDate)} হতে {formatDate(toDate)}</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5 w-24">তারিখ</th>
                <th className="py-3 px-3.5 w-32">ভাউচার নং</th>
                <th className="py-3 px-3.5">খাত ও বিবরণ</th>
                <th className="py-3 px-3.5 w-36">গ্রহীতা / দাতা</th>
                <th className="py-3 px-3.5 w-28">অ্যাকাউন্ট</th>
                <th className="py-3 px-3.5 text-right w-28 text-emerald-300">জমা (Income)</th>
                <th className="py-3 px-3.5 text-right w-28 text-rose-300">খরচ (Expense)</th>
                <th className="py-3 px-3.5 text-right w-32">চলমান স্থিতি</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Opening Balance Row */}
              <tr className="bg-slate-50/90 font-bold text-slate-700 border-b border-slate-200">
                <td className="py-2.5 px-3.5 font-mono">{formatDate(fromDate)}</td>
                <td className="py-2.5 px-3.5 font-mono text-slate-500">—</td>
                <td colSpan={5} className="py-2.5 px-3.5 text-slate-800">
                  <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold text-[11px] mr-2">
                    OPENING
                  </span>
                  প্রারম্ভিক স্থিতি (Opening Balance)
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                  ৳ {openingBalance.toLocaleString('en-IN')}
                </td>
              </tr>

              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    নির্বাচিত সময়সীমায় কোনো লেনদেন পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                ledgerRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono whitespace-nowrap text-slate-600">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-800">
                      {row.voucherNumber}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{row.mainHeadNameBn}</div>
                      {row.subHeadNameBn && (
                        <div className="text-[11px] text-slate-500">{row.subHeadNameBn}</div>
                      )}
                      {row.description && (
                        <div className="text-[10px] text-slate-400 italic truncate max-w-xs mt-0.5">
                          {row.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">{row.donorOrPayee}</td>
                    <td className="py-3 px-3.5 text-slate-600 font-medium">
                      {row.accountName}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700">
                      {row.type === 'INCOME' ? `+ ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-700">
                      {row.type === 'EXPENSE' ? `- ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 bg-slate-50/40">
                      ৳ {row.runningBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}

              {/* Closing Balance Row */}
              <tr className="bg-slate-900 text-white font-bold">
                <td className="py-3 px-3.5 font-mono">{formatDate(toDate)}</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">—</td>
                <td colSpan={3} className="py-3 px-3.5">
                  সমাপনী মোট ও নিট স্থিতি (Closing Balance)
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-emerald-300">
                  + ৳ {totalPeriodIncome.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-rose-300">
                  - ৳ {totalPeriodExpense.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3.5 text-right font-mono text-white bg-slate-800 text-sm">
                  ৳ {closingBalance.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Print Signatures Block */}
        <div className="hidden print:grid grid-cols-3 gap-8 pt-16 px-6 pb-6 text-center text-xs">
          <div className="border-t border-slate-400 pt-2 font-bold">প্রস্তুতকারী (অ্যাকাউন্ট্যান্ট)</div>
          <div className="border-t border-slate-400 pt-2 font-bold">যাচাইকারী (কোষাধ্যক্ষ)</div>
          <div className="border-t border-slate-400 pt-2 font-bold">অনুমোদনকারী (সাধারণ সম্পাদক / সভাপতি)</div>
        </div>
      </div>
    </div>
  );
};

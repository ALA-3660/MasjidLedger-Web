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
  Building,
  CheckCircle2,
} from 'lucide-react';
import { IncomeEntry, ExpenseEntry, FinancialAccount, Mosque, User } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';

interface DailyTransactionsViewProps {
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accounts: FinancialAccount[];
  currentMosque: Mosque | null;
  currentUser?: User | null;
  language?: Language;
}

export const DailyTransactionsView: React.FC<DailyTransactionsViewProps> = ({
  incomes,
  expenses,
  accounts,
  currentMosque,
  currentUser,
  language = 'bn',
}) => {
  const t = translations[language] || translations.bn;

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('MONTH');
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
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

  const reportRefNumber = `RPT-DT-${(currentMosque?.code || 'ML').toUpperCase()}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const printTimestamp = new Date().toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

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
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-baloo">
      {/* ============================================================
          1. SCREEN-ONLY CONTROLS & HEADER (PRINT HIDDEN)
          ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden no-print">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black font-siliguri text-slate-900 tracking-tight">
                দৈনিক লেনদেন বিবরণী (Daily Transaction Statement & Running Ledger)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-baloo">
                ব্যাংক স্টেটমেন্টের ন্যায় প্রারম্ভিক স্থিতি, প্রতিটি এন্ট্রির পর চলমান স্থিতি ও সমাপনী স্থিতি
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-export-csv-daily"
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV ডাউনলোড</span>
          </button>
          <button
            id="btn-print-daily-statement"
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-siliguri rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>স্টেটমেন্ট প্রিন্ট (A4)</span>
          </button>
        </div>
      </div>

      {/* Filter Controls (Screen Only / Hidden on Print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5 print:hidden no-print">
        {/* Preset Tabs & Account Selector */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => handlePresetChange('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri transition-all cursor-pointer ${
                datePreset === 'TODAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              আজ
            </button>
            <button
              onClick={() => handlePresetChange('YESTERDAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri transition-all cursor-pointer ${
                datePreset === 'YESTERDAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              গতকাল
            </button>
            <button
              onClick={() => handlePresetChange('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri transition-all cursor-pointer ${
                datePreset === 'WEEK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              গত ৭ দিন
            </button>
            <button
              onClick={() => handlePresetChange('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri transition-all cursor-pointer ${
                datePreset === 'MONTH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              চলতি মাস
            </button>
            <button
              onClick={() => setDatePreset('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri transition-all cursor-pointer ${
                datePreset === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              কাস্টম তারিখ
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-600 shrink-0 font-baloo">হিসাব / ফান্ড:</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-hidden w-full md:w-60 font-baloo"
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
          <div className="flex items-center space-x-2 w-full sm:w-auto text-xs font-baloo">
            <span className="text-slate-500 font-medium">তারিখ সীমা:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-baloo"
            />
            <span className="text-slate-400">থেকে</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-baloo"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ভাউচার, খাত বা বিবরণ দিয়ে ফিল্টার..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white font-baloo"
            />
          </div>
        </div>
      </div>

      {/* Screen Summary Highlights Cards (Screen Only / Hidden on Print) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden no-print">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block font-siliguri">প্রারম্ভিক স্থিতি (Opening)</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block font-siliguri">
            ৳ {openingBalance.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-baloo">তারিখ: {formatDate(fromDate)} এর পূর্বে</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <span className="text-xs font-bold text-emerald-700 block font-siliguri">মোট জমা / আয় (Credit)</span>
          <span className="text-xl font-bold text-emerald-700 mt-1 block font-siliguri">
            + ৳ {totalPeriodIncome.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-baloo">
            {periodTransactions.filter((t) => t.type === 'INCOME').length} টি ভাউচার
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <span className="text-xs font-bold text-rose-700 block font-siliguri">মোট খরচ / ব্যয় (Debit)</span>
          <span className="text-xl font-bold text-rose-700 mt-1 block font-siliguri">
            - ৳ {totalPeriodExpense.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-600 block mt-0.5 font-baloo">
            {periodTransactions.filter((t) => t.type === 'EXPENSE').length} টি ভাউচার
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/30">
          <span className="text-xs font-bold text-blue-800 block font-siliguri">সমাপনী স্থিতি (Closing)</span>
          <span className="text-xl font-bold text-blue-900 mt-1 block font-siliguri">
            ৳ {closingBalance.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-blue-600 block mt-0.5 font-baloo">তারিখ: {formatDate(toDate)} পর্যন্ত</span>
        </div>
      </div>

      {/* Screen Interactive Table View (Screen Only / Hidden on Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:hidden no-print">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold font-siliguri text-slate-800">চলমান খতিয়ান তালিকা ({ledgerRows.length} টি লেনদেন)</span>
          <span className="text-slate-500 font-baloo">
            সময়সীমা: {formatDate(fromDate)} হতে {formatDate(toDate)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-baloo">
            <thead className="bg-slate-900 text-white font-bold border-b border-slate-800 font-siliguri">
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
                <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 font-siliguri">
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
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-800">
                      {row.voucherNumber}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 font-siliguri">{row.mainHeadNameBn}</div>
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
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-700 font-siliguri">
                      {row.type === 'INCOME' ? `+ ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-rose-700 font-siliguri">
                      {row.type === 'EXPENSE' ? `- ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-slate-900 bg-slate-50/40 font-siliguri">
                      ৳ {row.runningBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}

              {/* Closing Balance Row */}
              <tr className="bg-slate-900 text-white font-bold">
                <td className="py-3 px-3.5">{formatDate(toDate)}</td>
                <td className="py-3 px-3.5 text-slate-400">—</td>
                <td colSpan={3} className="py-3 px-3.5 font-siliguri">
                  সমাপনী মোট ও নিট স্থিতি (Closing Balance)
                </td>
                <td className="py-3 px-3.5 text-right font-siliguri text-emerald-300">
                  + ৳ {totalPeriodIncome.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3.5 text-right font-siliguri text-rose-300">
                  - ৳ {totalPeriodExpense.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3.5 text-right font-siliguri text-white bg-slate-800 text-sm">
                  ৳ {closingBalance.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          2. OFFICIAL PRINTABLE DOCUMENT (SHOWN ONLY ON PRINT)
          Letterhead at Top -> Structured KPI Boxes -> Full Bordered Table -> Triple Signatures Block
          ============================================================ */}
      <div className="report-print-root hidden print:block bg-white text-slate-900 font-baloo w-full max-w-full box-border">
        {/* Dynamic @page rule for Browser Print Dialog */}
        <style>{`
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        `}</style>

        {/* --- [A] OFFICIAL MOSQUE LETTERHEAD AT THE VERY TOP --- */}
        <div className="border-2 border-slate-900 bg-white mb-3 rounded-none overflow-hidden break-inside-avoid">
          <div className="grid grid-cols-12 items-center p-3 gap-2 border-b border-slate-300">
            {/* LEFT: Mosque Official Logo (2 cols) */}
            <div className="col-span-2 flex items-center justify-start">
              {currentMosque?.logoUrl ? (
                <img
                  src={currentMosque.logoUrl}
                  alt="Mosque Logo"
                  className="max-h-16 max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 border border-dashed border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                  <Building className="w-6 h-6 mb-0.5 text-slate-500" />
                  <span className="text-[9px] font-baloo text-slate-500">লোগো</span>
                </div>
              )}
            </div>

            {/* CENTER: Mosque Bengali Name, Address, Report Title (7 cols) */}
            <div className="col-span-7 text-center">
              <h1 className="font-siliguri text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-tight">
                {currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স ও ওয়াকফ এস্টেট'}
              </h1>
              {currentMosque?.address && (
                <p className="font-baloo text-xs text-slate-700 mt-0.5">
                  {currentMosque.address} {currentMosque.phone ? `• ফোন: ${currentMosque.phone}` : ''}
                </p>
              )}
              <div className="inline-block mt-1.5 px-3 py-0.5 bg-slate-900 text-white font-siliguri font-bold text-xs sm:text-sm tracking-wide">
                দৈনিক লেনদেন বিবরণী ও চলমান লেজার (Daily Transaction Statement)
              </div>
              <p className="font-baloo text-xs font-semibold text-slate-800 mt-1">
                হিসাবের সময়সীমা: <span className="font-bold text-slate-950">{formatDate(fromDate)}</span> হতে{' '}
                <span className="font-bold text-slate-950">{formatDate(toDate)}</span> পর্যন্ত
              </p>
            </div>

            {/* RIGHT: Structured Meta Box (3 cols) */}
            <div className="col-span-3 border border-slate-800 bg-slate-50 p-2 text-[11px] font-baloo space-y-1">
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-600">রিপোর্ট নং:</span>
                <span className="font-bold text-slate-950">{reportRefNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-600">মসজিদ কোড:</span>
                <span className="font-bold text-slate-900">{currentMosque?.code || 'MOSQUE'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-0.5">
                <span className="text-slate-600">মুদ্রা:</span>
                <span className="font-bold text-slate-900">BDT (টাকা ৳)</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                <span>প্রিন্ট সময়:</span>
                <span className="font-medium text-slate-800">{printTimestamp}</span>
              </div>
            </div>
          </div>

          {/* Sub-bar: Filter Status & Prepared By */}
          <div className="bg-slate-100 px-3.5 py-1.5 flex justify-between items-center text-xs font-baloo border-t border-slate-300">
            <div>
              <span className="text-slate-600 font-medium">হিসাব খাত/ফান্ড ফিল্টার: </span>
              <span className="font-bold text-slate-900">
                {selectedAccountId === 'ALL'
                  ? 'সকল ক্যাশ ও ব্যাংক হিসাব (সম্মিলিত ফান্ড)'
                  : accounts.find((a) => a.id === selectedAccountId)?.nameBn || 'নির্দিষ্ট ফান্ড'}
              </span>
            </div>
            <div>
              <span className="text-slate-600 font-medium">প্রস্তুতকারী: </span>
              <span className="font-bold text-slate-900">{currentUser?.fullName || 'হিসাব শাখা (মসজিদলেজার)'}</span>
            </div>
          </div>
        </div>

        {/* --- [B] EXECUTIVE SUMMARY 4-KPI BOXES WITH SOLID BORDERS --- */}
        <div className="grid grid-cols-4 gap-2 mb-3 break-inside-avoid">
          {/* 1. Opening Balance Box */}
          <div className="border-2 border-slate-900 p-2 bg-slate-50 text-center">
            <span className="font-baloo text-[11px] font-bold text-slate-700 block">প্রারম্ভিক স্থিতি (Opening)</span>
            <span className="font-siliguri text-base sm:text-lg font-bold text-slate-950 block mt-0.5">
              ৳ {openingBalance.toLocaleString('en-IN')}
            </span>
            <span className="font-baloo text-[10px] text-slate-500 block">তারিখ: {formatDate(fromDate)} এর পূর্বে</span>
          </div>

          {/* 2. Total Income Box */}
          <div className="border-2 border-slate-900 p-2 bg-slate-50 text-center">
            <span className="font-baloo text-[11px] font-bold text-emerald-800 block">মোট জমা / আয় (Credit)</span>
            <span className="font-siliguri text-base sm:text-lg font-bold text-emerald-900 block mt-0.5">
              + ৳ {totalPeriodIncome.toLocaleString('en-IN')}
            </span>
            <span className="font-baloo text-[10px] text-slate-600 block">
              {periodTransactions.filter((t) => t.type === 'INCOME').length} টি অনুমোদিত ভাউচার
            </span>
          </div>

          {/* 3. Total Expense Box */}
          <div className="border-2 border-slate-900 p-2 bg-slate-50 text-center">
            <span className="font-baloo text-[11px] font-bold text-rose-800 block">মোট খরচ / ব্যয় (Debit)</span>
            <span className="font-siliguri text-base sm:text-lg font-bold text-rose-900 block mt-0.5">
              - ৳ {totalPeriodExpense.toLocaleString('en-IN')}
            </span>
            <span className="font-baloo text-[10px] text-slate-600 block">
              {periodTransactions.filter((t) => t.type === 'EXPENSE').length} টি অনুমোদিত ভাউচার
            </span>
          </div>

          {/* 4. Closing Balance Box */}
          <div className="border-2 border-slate-900 p-2 bg-slate-100 text-center">
            <span className="font-baloo text-[11px] font-bold text-slate-900 block">সমাপনী স্থিতি (Closing)</span>
            <span className="font-siliguri text-base sm:text-lg font-bold text-slate-950 block mt-0.5">
              ৳ {closingBalance.toLocaleString('en-IN')}
            </span>
            <span className="font-baloo text-[10px] text-slate-700 font-semibold block">তারিখ: {formatDate(toDate)} পর্যন্ত</span>
          </div>
        </div>

        {/* --- [C] OFFICIAL BOXED LEDGER TABLE WITH SOLID BORDERS (NO CLIPPING) --- */}
        <div className="border-2 border-slate-900 mb-3 overflow-hidden">
          <table
            className="w-full text-xs font-baloo border-collapse"
            style={{ tableLayout: 'fixed', width: '100%' }}
          >
            <thead className="bg-slate-100 border-b-2 border-slate-900 text-slate-950 font-bold font-siliguri">
              <tr>
                <th className="py-2 px-1.5 text-center border-r border-slate-400" style={{ width: '11%' }}>
                  তারিখ
                </th>
                <th className="py-2 px-1.5 text-center border-r border-slate-400" style={{ width: '13%' }}>
                  ভাউচার নং
                </th>
                <th className="py-2 px-2 text-left border-r border-slate-400" style={{ width: '25%' }}>
                  হিসাব খাত ও বিবরণ
                </th>
                <th className="py-2 px-1.5 text-left border-r border-slate-400" style={{ width: '14%' }}>
                  গ্রহীতা / দাতা
                </th>
                <th className="py-2 px-1.5 text-left border-r border-slate-400" style={{ width: '13%' }}>
                  হিসাব / ফান্ড
                </th>
                <th className="py-2 px-1 text-right border-r border-slate-400" style={{ width: '8%' }}>
                  জমা (৳)
                </th>
                <th className="py-2 px-1 text-right border-r border-slate-400" style={{ width: '8%' }}>
                  খরচ (৳)
                </th>
                <th className="py-2 px-1.5 text-right" style={{ width: '8%' }}>
                  স্থিতি (৳)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {/* Distinct Opening Balance Boxed Row */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-b border-slate-400">
                <td className="py-1.5 px-1.5 text-center border-r border-slate-300">{formatDate(fromDate)}</td>
                <td className="py-1.5 px-1.5 text-center border-r border-slate-300 text-slate-500">—</td>
                <td colSpan={3} className="py-1.5 px-2 border-r border-slate-300 font-siliguri">
                  <span className="inline-block px-1.5 py-0.2 bg-slate-800 text-white rounded text-[10px] mr-1.5 font-bold">
                    OPENING
                  </span>
                  প্রারম্ভিক স্থিতি (Opening Balance)
                </td>
                <td className="py-1.5 px-1 text-right border-r border-slate-300 text-slate-400">—</td>
                <td className="py-1.5 px-1 text-right border-r border-slate-300 text-slate-400">—</td>
                <td className="py-1.5 px-1.5 text-right font-bold text-slate-950 font-siliguri bg-slate-200/60">
                  ৳ {openingBalance.toLocaleString('en-IN')}
                </td>
              </tr>

              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                    নির্বাচিত সময়সীমায় কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                ledgerRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <td className="py-1.5 px-1.5 text-center border-r border-slate-300 text-slate-700 whitespace-nowrap text-[11px]">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-1.5 px-1.5 text-center border-r border-slate-300 font-bold text-slate-900 text-[11px] break-words">
                      {row.voucherNumber}
                    </td>
                    <td className="py-1.5 px-2 text-left border-r border-slate-300 break-words">
                      <div className="font-bold text-slate-950 font-siliguri text-xs">{row.mainHeadNameBn}</div>
                      {row.subHeadNameBn && (
                        <div className="text-[10px] text-slate-600">{row.subHeadNameBn}</div>
                      )}
                      {row.description && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-2">
                          {row.description}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-1.5 text-left border-r border-slate-300 text-slate-800 text-[11px] break-words">
                      {row.donorOrPayee}
                    </td>
                    <td className="py-1.5 px-1.5 text-left border-r border-slate-300 text-slate-700 text-[11px] break-words">
                      {row.accountName}
                    </td>
                    <td className="py-1.5 px-1 text-right border-r border-slate-300 font-bold text-emerald-900 font-siliguri text-[11px]">
                      {row.type === 'INCOME' ? `+ ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-1.5 px-1 text-right border-r border-slate-300 font-bold text-rose-900 font-siliguri text-[11px]">
                      {row.type === 'EXPENSE' ? `- ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-bold text-slate-950 bg-slate-50 font-siliguri text-[11px]">
                      ৳ {row.runningBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}

              {/* Distinct Closing Balance Row */}
              <tr className="bg-slate-900 text-white font-bold font-siliguri border-t-2 border-slate-900">
                <td className="py-2 px-1.5 text-center">{formatDate(toDate)}</td>
                <td className="py-2 px-1.5 text-center text-slate-400">—</td>
                <td colSpan={3} className="py-2 px-2 text-left">
                  সমাপনী মোট ও নিট তহবিল স্থিতি (Closing Total Balance)
                </td>
                <td className="py-2 px-1 text-right text-emerald-300">
                  + ৳ {totalPeriodIncome.toLocaleString('en-IN')}
                </td>
                <td className="py-2 px-1 text-right text-rose-300">
                  - ৳ {totalPeriodExpense.toLocaleString('en-IN')}
                </td>
                <td className="py-2 px-1.5 text-right text-white bg-slate-800 text-xs">
                  ৳ {closingBalance.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- [D] OFFICIAL 3-PARTY APPROVAL & SIGNATURE BOXES (সভাপতি ও সেক্রেটারী/মোতাওয়াল্লী স্বাক্ষর) --- */}
        <div className="border-t-2 border-slate-900 pt-5 mt-6 break-inside-avoid">
          <div className="grid grid-cols-3 gap-6 text-center text-xs font-baloo">
            {/* 1. Accountant / Preparer */}
            <div className="flex flex-col items-center justify-end">
              <div className="h-12 w-full flex items-end justify-center">
                {/* Physical handwriting line */}
              </div>
              <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
                হিসাবরক্ষক / প্রস্তুতকারী
              </div>
              <div className="text-[10px] text-slate-600 font-baloo">স্বাক্ষর ও তারিখ</div>
            </div>

            {/* 2. General Secretary / Mutawalli with saved signature image */}
            <div className="flex flex-col items-center justify-end">
              <div className="h-12 w-full flex items-end justify-center">
                {currentMosque?.secretarySignatureUrl ? (
                  <img
                    src={currentMosque.secretarySignatureUrl}
                    alt="Secretary Signature"
                    className="max-h-12 max-w-full object-contain mb-1"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
              <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
                সাধারণ সম্পাদক / মোতাওয়াল্লী
              </div>
              <div className="text-[10px] text-slate-600 font-baloo">স্বাক্ষর ও সীল</div>
            </div>

            {/* 3. President with saved signature image */}
            <div className="flex flex-col items-center justify-end">
              <div className="h-12 w-full flex items-end justify-center">
                {currentMosque?.presidentSignatureUrl ? (
                  <img
                    src={currentMosque.presidentSignatureUrl}
                    alt="President Signature"
                    className="max-h-12 max-w-full object-contain mb-1"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
              <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
                সভাপতি
              </div>
              <div className="text-[10px] text-slate-600 font-baloo">স্বাক্ষর ও সীল</div>
            </div>
          </div>
        </div>

        {/* --- [E] OFFICIAL REPORT FOOTER (SYSTEM AUDIT NOTE) --- */}
        <div className="border-t border-slate-300 mt-5 pt-2 flex justify-between items-center text-[10px] text-slate-600 font-baloo break-inside-avoid">
          <div>
            <span>প্রতিবেদন উৎস: </span>
            <span className="font-bold text-slate-800">মসজিদলেজার স্বয়ংক্রিয় হিসাব ও নিরীক্ষা ব্যবস্থাপনা সিস্টেম</span>
          </div>
          <div>
            <span>পৃষ্ঠা: </span>
            <span className="font-bold text-slate-800">১ / ১ (অথবা ধারাবাহিক)</span>
          </div>
          <div>
            <span>জেনারেট সময়: {printTimestamp}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

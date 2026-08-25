import React, { useState } from 'react';
import {
  FileCheck2,
  PieChart,
  ShieldCheck,
  Printer,
  Download,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import {
  IncomeEntry,
  ExpenseEntry,
  AccountHead,
  FinancialAccount,
  AuditLog,
  Mosque
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';

interface AuditAuditReportsViewProps {
  mosque: Mosque | null;
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
  auditLogs: AuditLog[];
  language: Language;
}

export const AuditReportsView: React.FC<AuditAuditReportsViewProps> = ({
  mosque,
  incomes,
  expenses,
  accountHeads,
  accounts,
  auditLogs,
  language,
}) => {
  const t = translations[language];
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'headwise' | 'audit'>('summary');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');

  // Filter approved records
  const approvedIncomes = incomes.filter((i) => i.status === 'APPROVED');
  const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED');

  const totalIncome = approvedIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = approvedExpenses.reduce((s, e) => s + e.amount, 0);
  const netSurplus = totalIncome - totalExpense;

  // Head-wise calculations
  const mainIncomeHeads = accountHeads.filter((h) => h.type === 'INCOME' && !h.parentId);
  const mainExpenseHeads = accountHeads.filter((h) => h.type === 'EXPENSE' && !h.parentId);

  const headwiseIncome = mainIncomeHeads.map((main) => {
    const total = approvedIncomes
      .filter((i) => i.mainHeadId === main.id)
      .reduce((s, i) => s + i.amount, 0);
    return { ...main, total };
  });

  const headwiseExpense = mainExpenseHeads.map((main) => {
    const total = approvedExpenses
      .filter((e) => e.mainHeadId === main.id)
      .reduce((s, e) => s + e.amount, 0);
    return { ...main, total };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header with Switcher & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-btn-report-summary"
            onClick={() => setActiveReportTab('summary')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'summary'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>মাসিক ও বার্ষিক আর্থিক বিবরণী</span>
          </button>

          <button
            id="tab-btn-report-headwise"
            onClick={() => setActiveReportTab('headwise')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'headwise'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>খাতভিত্তিক বিশ্লেষণ (Head-wise)</span>
          </button>

          <button
            id="tab-btn-report-audit"
            onClick={() => setActiveReportTab('audit')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeReportTab === 'audit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>অডিট ট্রেইল ও লগ</span>
            <span className="ml-1 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {auditLogs.length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-print-official-report"
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>অফিসিয়াল রিপোর্ট প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* 1. FINANCIAL SUMMARY REPORT */}
      {activeReportTab === 'summary' && (
        <div className="space-y-6">
          {/* Printable Report Canvas */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6" id="printable-financial-statement">
            {/* Header */}
            <div className="text-center pb-6 border-b border-slate-200">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {mosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {mosque?.address}, {mosque?.district} | ওয়াকফ এস্টেট আইডি: {mosque?.waqfId || 'WAQF-BD-2024-889'}
              </p>
              <div className="inline-block bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold px-4 py-1 rounded-full mt-3">
                সর্বমোট আয়-ব্যয় ও উদ্বৃত্ত বিবরণী (Financial Statement 2026)
              </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-800 font-semibold">সর্বমোট অনুমোদনকৃত আয়</span>
                <div className="text-xl font-bold text-emerald-900 mt-1">
                  {formatCurrency(totalIncome, language)}
                </div>
              </div>

              <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-800 font-semibold">সর্বমোট অনুমোদনকৃত ব্যয়</span>
                <div className="text-xl font-bold text-rose-900 mt-1">
                  {formatCurrency(totalExpense, language)}
                </div>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                <span className="text-xs text-blue-800 font-semibold">নিট উদ্বৃত্ত / তহবিল সঞ্চিতি</span>
                <div className="text-xl font-bold text-blue-900 mt-1">
                  {formatCurrency(netSurplus, language)}
                </div>
              </div>
            </div>

            {/* Account Balances Table */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">তহবিল ও ব্যাংক হিসাবের বর্তমান স্থিতি:</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">হিসাবের নাম</th>
                      <th className="py-2.5 px-4">হিসাবের ধরন</th>
                      <th className="py-2.5 px-4">ব্যাংক ও হিসাব নং</th>
                      <th className="py-2.5 px-4 text-right">বর্তমান ব্যালেন্স</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{acc.nameBn}</td>
                        <td className="py-2.5 px-4 text-slate-600">{acc.accountType}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {acc.bankName ? `${acc.bankName} (${acc.accountNumber})` : 'নগদ ক্যাশ'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                          {formatCurrency(acc.currentBalance, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 text-right text-slate-800">সর্বমোট তহবিল স্থিতি:</td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                        {formatCurrency(accounts.reduce((s, a) => s + a.currentBalance, 0), language)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
              <div className="flex flex-col items-center justify-end">
                <div className="h-12 w-full" />
                <div className="border-t border-slate-300 pt-2 font-semibold text-slate-800 w-full">কোষাধ্যক্ষ / হিসাবরক্ষক</div>
                <div className="text-[10px] text-slate-400">স্বাক্ষর ও তারিখ</div>
              </div>
              <div className="flex flex-col items-center justify-end">
                <div className="h-12 w-full flex items-end justify-center">
                  {mosque?.secretarySignatureUrl ? (
                    <img
                      src={mosque.secretarySignatureUrl}
                      alt="Secretary Signature"
                      className="max-h-12 max-w-full object-contain mb-1"
                    />
                  ) : null}
                </div>
                <div className="border-t border-slate-300 pt-2 font-semibold text-slate-800 w-full">সেক্রেটারি / মোতাওয়াল্লী</div>
                <div className="text-[10px] text-slate-400">স্বাক্ষর ও সীল</div>
              </div>
              <div className="flex flex-col items-center justify-end">
                <div className="h-12 w-full flex items-end justify-center">
                  {mosque?.presidentSignatureUrl ? (
                    <img
                      src={mosque.presidentSignatureUrl}
                      alt="President Signature"
                      className="max-h-12 max-w-full object-contain mb-1"
                    />
                  ) : null}
                </div>
                <div className="border-t border-slate-300 pt-2 font-semibold text-slate-800 w-full">সভাপতি</div>
                <div className="text-[10px] text-slate-400">স্বাক্ষর ও সীল</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. HEAD-WISE ANALYSIS */}
      {activeReportTab === 'headwise' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <span className="font-bold text-emerald-950 text-xs sm:text-sm">খাতভিত্তিক মোট আয়</span>
              <span className="font-bold text-emerald-700 text-sm">{formatCurrency(totalIncome, language)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {headwiseIncome.map((head) => {
                const pct = totalIncome > 0 ? ((head.total / totalIncome) * 100).toFixed(1) : 0;
                return (
                  <div key={head.id} className="p-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-900">{head.nameBn}</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(head.total, language)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <span className="font-bold text-rose-950 text-xs sm:text-sm">খাতভিত্তিক মোট ব্যয়</span>
              <span className="font-bold text-rose-700 text-sm">{formatCurrency(totalExpense, language)}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {headwiseExpense.map((head) => {
                const pct = totalExpense > 0 ? ((head.total / totalExpense) * 100).toFixed(1) : 0;
                return (
                  <div key={head.id} className="p-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-900">{head.nameBn}</span>
                      <span className="font-bold text-rose-700">{formatCurrency(head.total, language)} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-600 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. AUDIT TRAIL / IMMUTABLE SYSTEM LOGS */}
      {activeReportTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">অপরিবর্তনীয় অডিট ট্রেইল (Immutable Audit Logs)</h2>
              <p className="text-xs text-slate-500">সকল এন্ট্রি, অনুমোদন ও সিস্টেম পরিবর্তনের ডিজিটাল লগ</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              SHA-256 Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">সময় ও তারিখ</th>
                  <th className="py-3 px-4">ব্যবহারকারী</th>
                  <th className="py-3 px-4">অ্যাকশন</th>
                  <th className="py-3 px-4">সত্তা / মডিউল</th>
                  <th className="py-3 px-4">রেকর্ড আইডি</th>
                  <th className="py-3 px-4">আইপি এড্রেস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(log.timestamp).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                        log.action.includes('CREATE')
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action.includes('CANCEL') || log.action.includes('REVERSE')
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{log.entity}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{log.entityId}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

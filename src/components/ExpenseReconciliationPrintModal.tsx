import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, AlertTriangle, ShieldCheck, FileDown } from 'lucide-react';
import { Mosque } from '../types';
import {
  ExpenseReconciliationDataset,
  ExpenseReconciliationItem,
  exportReconciliationDatasetToExcel,
} from '../lib/expenseReconciliationService';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';
import { formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';

interface ExpenseReconciliationPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: ExpenseReconciliationDataset;
  mosque: Mosque | null;
}

export const ExpenseReconciliationPrintModal: React.FC<ExpenseReconciliationPrintModalProps> = ({
  isOpen,
  onClose,
  dataset,
  mosque,
}) => {
  const [printMode, setPrintMode] = useState<'REGISTER' | 'EXCEPTIONS' | 'ACCOUNTS'>('REGISTER');
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  if (!isOpen) return null;

  const printableElementId = 'reconciliation-printable-area';

  const handlePrint = () => {
    printElement(printableElementId, {
      title: `Expense_Reconciliation_${printMode}_${dataset.effectiveDates.startDate}`,
      pageSize: 'A4',
      pageOrientation: orientation,
      margin: orientation === 'landscape' ? '6mm 8mm' : '8mm 10mm',
    });
  };

  const handleExcelExport = () => {
    exportReconciliationDatasetToExcel({
      dataset,
      mosque,
      mode: printMode,
    });
  };

  const displayedItems = printMode === 'EXCEPTIONS' ? dataset.exceptionItems : dataset.items;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static report-modal-print-wrapper font-sans">
      <div className={`bg-white w-full ${orientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl'} rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none report-modal-print-card`}>
        {/* Modal Controls Toolbar (Hidden in Print) */}
        <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2.5 shrink-0 print:hidden print-controls-bar border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold font-siliguri">
                ব্যয় রিকনসিলিয়েশন — A4 অফিসিয়াল প্রিন্ট ও PDF প্রিভিউ
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-secondary">
                সময়সীমা: {dataset.effectiveDates.labelBn} • রেকর্ড: {displayedItems.length} টি
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Print Mode Selector */}
            <div className="bg-slate-800 p-0.5 rounded-xl flex items-center text-xs font-siliguri">
              <button
                type="button"
                onClick={() => setPrintMode('REGISTER')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                  printMode === 'REGISTER'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                পূর্ণাঙ্গ রেজিস্টার
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('EXCEPTIONS')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                  printMode === 'EXCEPTIONS'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ব্যতিক্রম ({dataset.exceptionItems.length})
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('ACCOUNTS')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                  printMode === 'ACCOUNTS'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                হিসাবওয়ারি
              </button>
            </div>

            {/* Letterhead Toggle */}
            <button
              type="button"
              onClick={() => setIncludeLetterhead(!includeLetterhead)}
              className={`px-2.5 py-1 rounded-xl text-xs font-siliguri transition cursor-pointer border ${
                includeLetterhead
                  ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="লেটারহেড প্রিন্ট হবে কি না নির্ধারণ করুন"
            >
              {includeLetterhead ? '☑ লেটারহেডসহ' : '☐ লেটারহেড ছাড়া'}
            </button>

            {/* Orientation Toggle */}
            <div className="bg-slate-800 p-0.5 rounded-xl flex items-center text-xs font-siliguri border border-slate-700">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                পোর্ট্রেট
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ল্যান্ডস্কেপ
              </button>
            </div>

            <button
              type="button"
              onClick={handleExcelExport}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold font-secondary flex items-center space-x-1 transition cursor-pointer"
              title="এক্সেল ফাইল হিসেবে ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-siliguri flex items-center space-x-1.5 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-50 print:bg-white print:p-0 print:overflow-visible flex-1">
          <div
            id={printableElementId}
            className="printable-content max-w-full mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xs border border-slate-200 print:border-none print:shadow-none print:p-0 font-sans text-slate-900 text-xs"
          >
            {/* 1. Global Dynamic Mosque Official Letterhead */}
            {includeLetterhead ? (
              <div className="break-inside-avoid">
                <MosqueOfficialLetterhead
                  mosque={mosque}
                  documentTitle={
                    printMode === 'EXCEPTIONS'
                      ? 'ব্যয় রিকনসিলিয়েশন — ব্যতিক্রম ও অমিল নিরীক্ষা প্রতিবেদন'
                      : printMode === 'ACCOUNTS'
                      ? 'ব্যয় ↔ ব্যাংক/ক্যাশ হিসাবওয়ারি সমন্বয় প্রতিবেদন'
                      : 'ব্যয় ↔ আর্থিক হিসাব ↔ লেজার রিকনসিলিয়েশন পূর্ণাঙ্গ প্রতিবেদন'
                  }
                  subTitle="Financial Integrity & Reconciliation Audit Report"
                  periodLabel={dataset.effectiveDates.labelBn}
                  dateStr={formatDate(new Date().toISOString().slice(0, 10))}
                  refNumber={`ML-REC-${dataset.effectiveDates.startDate.replace(/-/g, '')}`}
                />
              </div>
            ) : (
              <div className="border border-slate-300 bg-slate-50 p-3.5 rounded-lg break-inside-avoid mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <h1 className="text-xl font-black text-slate-950 font-siliguri">
                      {mosque?.nameBn || mosque?.name || 'বায়তুল মোকাররম কেন্দ্রীয় জামে মসজিদ'}
                    </h1>
                    <p className="text-xs text-slate-700 font-bold font-siliguri mt-0.5">
                      {printMode === 'EXCEPTIONS'
                        ? 'ব্যয় রিকনসিলিয়েশন — ব্যতিক্রম ও অমিল নিরীক্ষা প্রতিবেদন'
                        : printMode === 'ACCOUNTS'
                        ? 'ব্যয় ↔ ব্যাংক/ক্যাশ হিসাবওয়ারি সমন্বয় প্রতিবেদন'
                        : 'ব্যয় ↔ আর্থিক হিসাব ↔ লেজার রিকনসিলিয়েশন পূর্ণাঙ্গ প্রতিবেদন'}
                    </p>
                  </div>
                  <div className="text-right text-xs font-mono">
                    <div className="text-slate-600">তারিখ: {formatDate(new Date().toISOString().slice(0, 10))}</div>
                    <div className="text-slate-500 text-[11px]">স্মারক: ML-REC-{dataset.effectiveDates.startDate.replace(/-/g, '')}</div>
                  </div>
                </div>
                <div className="pt-2 text-xs font-semibold text-slate-800">
                  সময়সীমা: <span className="font-bold text-slate-950">{dataset.effectiveDates.labelBn}</span> • মোট রেকর্ড: <span className="font-bold text-slate-950">{displayedItems.length} টি</span>
                </div>
              </div>
            )}

            {/* 2. Executive Integrity KPI Summary Box */}
            <div className="grid grid-cols-4 gap-3 my-4 p-4 rounded-xl border border-slate-300 bg-slate-50/50 print:bg-white">
              <div>
                <span className="text-[10px] font-bold text-slate-500 font-siliguri uppercase">মোট ভাউচার সংখ্যা</span>
                <div className="text-sm font-black font-secondary text-slate-900 mt-0.5">
                  {dataset.summary.totalExpenseEvents} টি
                </div>
                <span className="text-[9px] text-emerald-700 font-secondary font-bold">
                  সঠিক: {dataset.summary.matchedCount} টি ({dataset.summary.matchedRate.toFixed(1)}%)
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 font-siliguri uppercase">মোট ব্যয়ের পরিমাণ</span>
                <div className="text-sm font-black font-secondary text-rose-700 mt-0.5">
                  ৳ {dataset.summary.totalExpenseAmount.toLocaleString('en-IN')}
                </div>
                <span className="text-[9px] text-slate-500 font-siliguri">অনুমোদিত ভাউচার যোগফল</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 font-siliguri uppercase">লেজার ক্রেডিট আউটফ্লো</span>
                <div className="text-sm font-black font-secondary text-blue-700 mt-0.5">
                  ৳ {dataset.summary.actualLedgerAmount.toLocaleString('en-IN')}
                </div>
                <span className="text-[9px] text-slate-500 font-siliguri">প্রকৃত পোস্টিং যোগফল</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 font-siliguri uppercase">আর্থিক পার্থক্য (Delta)</span>
                <div className={`text-sm font-black font-secondary mt-0.5 ${dataset.summary.hasZeroDelta ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ৳ {dataset.summary.differenceAmount.toLocaleString('en-IN')}
                </div>
                <span className="text-[9px] text-emerald-700 font-secondary font-bold flex items-center space-x-1">
                  {dataset.summary.hasZeroDelta ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 inline text-emerald-600" />
                      <span>Integrity 100% (Zero Delta)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 inline text-rose-600" />
                      <span>{dataset.summary.mismatchedCount + dataset.summary.missingCount} টি অসঙ্গতি</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* 3. Main Printable Tables */}
            {printMode === 'ACCOUNTS' ? (
              <div className="my-4">
                <h3 className="font-bold text-sm text-slate-900 font-siliguri mb-2">
                  আর্থিক হিসাবওয়ারি ব্যয়ের সমন্বয় খতিয়ান
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                  <thead className="bg-slate-100 font-siliguri font-bold border-b border-slate-300">
                    <tr>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center w-8">ক্রঃ</th>
                      <th className="border border-slate-300 px-2.5 py-1.5">আর্থিক হিসাবের নাম</th>
                      <th className="border border-slate-300 px-2.5 py-1.5">ধরন</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center">মোট ভাউচার</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right">প্রত্যাশিত ব্যয় (৳)</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right">প্রকৃত লেজার (৳)</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right">পার্থক্য (৳)</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dataset.accountGroups.map((grp, idx) => (
                      <tr key={grp.accountId}>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-center font-secondary">{idx + 1}</td>
                        <td className="border border-slate-300 px-2.5 py-1.5 font-bold">{grp.accountName}</td>
                        <td className="border border-slate-300 px-2.5 py-1.5 font-siliguri text-slate-600">{grp.accountType}</td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-center font-secondary">{grp.totalVouchersCount} টি</td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-right font-secondary font-bold text-rose-700">
                          ৳ {grp.expectedOutflow.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-right font-secondary font-bold text-blue-700">
                          ৳ {grp.actualOutflow.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-right font-secondary font-bold">
                          ৳ {grp.difference.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-center font-siliguri font-bold">
                          {grp.status === 'BALANCED' ? (
                            <span className="text-emerald-700">সমন্বিত (Balanced)</span>
                          ) : (
                            <span className="text-rose-700">অমিল ({grp.exceptionCount})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={3} className="border border-slate-300 px-2.5 py-1.5 text-right font-siliguri">
                        সর্বমোট:
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-center font-secondary">
                        {dataset.summary.totalExpenseEvents} টি
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-secondary font-black text-rose-800">
                        ৳ {dataset.summary.expectedAccountOutflow.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-secondary font-black text-blue-800">
                        ৳ {dataset.summary.actualAccountOutflow.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right font-secondary font-black text-slate-900">
                        ৳ {dataset.summary.differenceAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-center font-siliguri">
                        {dataset.summary.hasZeroDelta ? 'সম্পূর্ণ সমন্বিত' : 'অসঙ্গতিযুক্ত'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="my-4">
                <h3 className="font-bold text-sm text-slate-900 font-siliguri mb-2">
                  {printMode === 'EXCEPTIONS'
                    ? 'ব্যতিক্রম ও অমিল তালিকা (Exception Register)'
                    : 'ব্যয় রিকনসিলিয়েশন বিস্তারিত রেজিস্টার'}
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-left text-[10px]">
                  <thead className="bg-slate-100 font-siliguri font-bold border-b border-slate-300">
                    <tr>
                      <th className="border border-slate-300 px-2 py-1 text-center w-7">ক্রঃ</th>
                      <th className="border border-slate-300 px-2 py-1">ভাউচার</th>
                      <th className="border border-slate-300 px-2 py-1">তারিখ</th>
                      <th className="border border-slate-300 px-2 py-1">ব্যয়ের খাত</th>
                      <th className="border border-slate-300 px-2 py-1">প্রাপক</th>
                      <th className="border border-slate-300 px-2 py-1">হিসাব</th>
                      <th className="border border-slate-300 px-2 py-1 text-right">ভাউচার (৳)</th>
                      <th className="border border-slate-300 px-2 py-1 text-right">লেজার (৳)</th>
                      <th className="border border-slate-300 px-2 py-1 text-right">পার্থক্য (৳)</th>
                      <th className="border border-slate-300 px-2 py-1 text-center">পোস্টিং</th>
                      <th className="border border-slate-300 px-2 py-1 text-center">অবস্থা</th>
                      <th className="border border-slate-300 px-2 py-1">পর্যবেক্ষণ / কারণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedItems.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="border border-slate-300 px-4 py-6 text-center text-slate-500 font-siliguri">
                          কোনো রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      displayedItems.map((item, idx) => (
                        <tr key={item.expenseId}>
                          <td className="border border-slate-300 px-2 py-1 text-center font-secondary">{idx + 1}</td>
                          <td className="border border-slate-300 px-2 py-1 font-mono font-bold">{item.voucherNumber}</td>
                          <td className="border border-slate-300 px-2 py-1 font-secondary whitespace-nowrap">{formatDate(item.date)}</td>
                          <td className="border border-slate-300 px-2 py-1 font-bold">{item.mainHeadNameBn}</td>
                          <td className="border border-slate-300 px-2 py-1 truncate max-w-[100px]">{item.payeeName}</td>
                          <td className="border border-slate-300 px-2 py-1 font-siliguri text-slate-700">{item.accountName}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-secondary font-bold text-rose-700">
                            {item.expenseAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-secondary font-bold text-blue-700">
                            {item.actualLedgerAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-secondary font-bold">
                            {item.differenceAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-secondary">
                            {item.actualLedgerPostingCount}/{item.expectedLedgerPostingCount}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-siliguri font-bold">
                            <span className={item.status === 'MATCHED' ? 'text-emerald-700' : 'text-rose-700'}>
                              {item.statusLabelBn}
                            </span>
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-siliguri text-[9px] text-slate-600">
                            {item.exceptionReasons.length > 0 ? item.exceptionReasons.join(', ') : 'নিখুঁত মিল'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {displayedItems.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={6} className="border border-slate-300 px-2 py-1.5 text-right font-siliguri">
                          সর্বমোট:
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-secondary font-black text-rose-800">
                          ৳ {displayedItems.reduce((s, i) => s + i.expenseAmount, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-secondary font-black text-blue-800">
                          ৳ {displayedItems.reduce((s, i) => s + i.actualLedgerAmount, 0).toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-secondary font-black text-slate-900">
                          ৳ {displayedItems.reduce((s, i) => s + i.differenceAmount, 0).toLocaleString('en-IN')}
                        </td>
                        <td colSpan={3} className="border border-slate-300"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* 4. Official Audit Sign-off Box */}
            <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-4 gap-4 text-center text-[10px] font-siliguri text-slate-700 print:mt-16 break-inside-avoid">
              <div>
                <div className="border-t border-slate-400 pt-1 mx-2 font-bold">নিরীক্ষক / প্রস্তুতি কারক</div>
                <div className="text-[9px] text-slate-400 mt-0.5">স্বাক্ষর ও তারিখ</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1 mx-2 font-bold">হিসাবরক্ষক</div>
                <div className="text-[9px] text-slate-400 mt-0.5">স্বাক্ষর ও তারিখ</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1 mx-2 font-bold">সাধারণ সম্পাদক</div>
                <div className="text-[9px] text-slate-400 mt-0.5">স্বাক্ষর ও তারিখ</div>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1 mx-2 font-bold">সভাপতি / মোতওয়াল্লী</div>
                <div className="text-[9px] text-slate-400 mt-0.5">স্বাক্ষর ও তারিখ</div>
              </div>
            </div>

            {/* 5. System Footer */}
            <div className="mt-6 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-2 font-secondary">
              MasjidLedger Pro v2.6 • Automated Financial Integrity & Reconciliation Verification Engine • Generated: {new Date().toLocaleString('bn-BD')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

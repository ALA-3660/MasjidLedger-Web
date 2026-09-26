import React, { useState } from 'react';
import { Printer, Download, X, CheckSquare, Square, Building2 } from 'lucide-react';
import { Mosque, Budget, BudgetControlDataset } from '../../types';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import {
  formatCurrencyBn,
  formatPercentBn,
  toBnDigits,
  getBudgetStatusMeta,
} from '../../lib/budgetService';

interface BudgetPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: BudgetControlDataset;
  currentMosque?: Mosque | null;
  onExportExcel: () => void;
}

export const BudgetPrintPreviewModal: React.FC<BudgetPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  dataset,
  currentMosque,
  onExportExcel,
}) => {
  const [includeLetterhead, setIncludeLetterhead] = useState(true);

  if (!isOpen) return null;

  const budget = dataset.budget;
  const periodLabel = budget
    ? `${toBnDigits(budget.startDate)} হতে ${toBnDigits(budget.endDate)}`
    : 'সমগ্র অর্থবছর';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Modal Top Bar (Screen Only) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold">🖨️ বাজেট নিয়ন্ত্রণ ও বাস্তব ব্যয় রিপোর্ট প্রিভিউ (A4)</h2>
              <p className="text-[11px] text-slate-300">
                {budget?.budgetName || 'বাজেট ও ব্যয় বিবরণী'} • রিভিশন #{toBnDigits(budget?.revisionNumber || 1)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIncludeLetterhead(!includeLetterhead)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              {includeLetterhead ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>লেটারহেডসহ প্রিন্ট</span>
            </button>

            <button
              onClick={onExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
          <div className="max-w-[210mm] mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-xs print:shadow-none print:p-0 print:m-0 text-slate-900 font-sans">
            {/* 1. Official Letterhead / Header */}
            {includeLetterhead ? (
              <div className="break-inside-avoid">
                <MosqueOfficialLetterhead
                  mosque={currentMosque}
                  documentTitle="বাজেট বনাম বাস্তব ব্যয় বিবরণী ও নিয়ন্ত্রণ প্রতিবেদন"
                  subTitle={budget?.budgetName ? `বাজেট শিরোনাম: ${budget.budgetName}` : undefined}
                  periodLabel={periodLabel}
                  dateStr={toBnDigits(new Date().toLocaleDateString('bn-BD'))}
                />
              </div>
            ) : (
              <div className="border-b-2 border-slate-800 pb-3 mb-4 text-center break-inside-avoid">
                <h1 className="text-lg font-black text-slate-900">
                  {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ কর্তৃপক্ষ'}
                </h1>
                <h2 className="text-sm font-bold text-slate-700 mt-0.5">
                  বাজেট বনাম বাস্তব ব্যয় বিবরণী ও নিয়ন্ত্রণ প্রতিবেদন
                </h2>
                <div className="text-xs text-slate-600 mt-1 flex justify-between">
                  <span>বাজেট: {budget?.budgetName || 'সাধারণ বাজেট'}</span>
                  <span>সময়সীমা: {periodLabel}</span>
                  <span>তারিখ: {toBnDigits(new Date().toLocaleDateString('bn-BD'))}</span>
                </div>
              </div>
            )}

            {/* 2. Executive KPI Summary Box */}
            <div className="mt-4 mb-5 p-3.5 bg-slate-50 border border-slate-300 rounded-lg break-inside-avoid">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 border-r border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">মোট প্রাক্কলিত বাজেট</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-secondary tabular-nums">
                    {formatCurrencyBn(dataset.summary.totalPlannedAmount)}
                  </span>
                </div>
                <div className="p-2 border-r border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">বাস্তব অর্জিত ব্যয়</span>
                  <span className="text-sm sm:text-base font-bold text-rose-700 font-secondary tabular-nums">
                    {formatCurrencyBn(dataset.summary.totalActualAmount)}
                  </span>
                </div>
                <div className="p-2 border-r border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">অবশিষ্টাংশ / ব্যবধান</span>
                  <span
                    className={`text-sm sm:text-base font-bold font-secondary tabular-nums ${
                      dataset.summary.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrencyBn(dataset.summary.remainingAmount)}
                  </span>
                </div>
                <div className="p-2">
                  <span className="text-[11px] text-slate-500 font-medium block">সামগ্রিক ব্যয় হার</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-secondary tabular-nums">
                    {formatPercentBn(dataset.summary.overallUtilizationPercent)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Detailed Line-by-Line Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                    <th className="p-2 border-r border-slate-300 text-center w-10">ক্রম</th>
                    <th className="p-2 border-r border-slate-300">ব্যয়ের প্রধান খাত ও উপ-খাত</th>
                    <th className="p-2 border-r border-slate-300 text-right">প্রাক্কলিত বাজেট</th>
                    <th className="p-2 border-r border-slate-300 text-right">বাস্তব ব্যয়</th>
                    <th className="p-2 border-r border-slate-300 text-right">অবশিষ্টাংশ</th>
                    <th className="p-2 border-r border-slate-300 text-center">ব্যয় হার %</th>
                    <th className="p-2 text-center">নিয়ন্ত্রণ স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.lines.map((line, idx) => {
                    const meta = getBudgetStatusMeta(line.warningStatus);
                    return (
                      <tr key={line.id} className="border-b border-slate-200 hover:bg-slate-50/60">
                        <td className="p-2 border-r border-slate-200 text-center text-slate-500 font-secondary tabular-nums">
                          {toBnDigits(idx + 1)}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="font-semibold text-slate-900">{line.mainHeadNameBn}</div>
                          {line.subHeadNameBn && (
                            <div className="text-[11px] text-slate-500">{line.subHeadNameBn}</div>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-bold text-slate-800 font-secondary tabular-nums">
                          {formatCurrencyBn(line.plannedAmount)}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-bold text-rose-700 font-secondary tabular-nums">
                          {formatCurrencyBn(line.actualAmount)}
                        </td>
                        <td
                          className={`p-2 border-r border-slate-200 text-right font-bold font-secondary tabular-nums ${
                            line.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrencyBn(line.remainingAmount)}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700 font-secondary tabular-nums">
                          {formatPercentBn(line.utilizationPercent)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass}`}>
                            {meta.labelBn}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-slate-900">
                    <td colSpan={2} className="p-2.5 border-r border-slate-300 text-right">
                      সর্বমোট যোগফল:
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-right font-secondary tabular-nums">
                      {formatCurrencyBn(dataset.summary.totalPlannedAmount)}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-right text-rose-700 font-secondary tabular-nums">
                      {formatCurrencyBn(dataset.summary.totalActualAmount)}
                    </td>
                    <td
                      className={`p-2.5 border-r border-slate-300 text-right font-secondary tabular-nums ${
                        dataset.summary.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatCurrencyBn(dataset.summary.remainingAmount)}
                    </td>
                    <td className="p-2.5 border-r border-slate-300 text-center font-secondary tabular-nums">
                      {formatPercentBn(dataset.summary.overallUtilizationPercent)}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="text-[11px] font-bold text-slate-700">
                        {dataset.summary.isOverBudget ? '⚠️ বাজেট অতিক্রম' : '✓ সীমার মধ্যে'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. Official Three-Tier Signatures */}
            <div className="mt-14 pt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700 break-inside-avoid">
              <div>
                <div className="border-t border-dashed border-slate-400 pt-1 mx-4 font-semibold text-slate-900">
                  প্রস্তুতকারী (হিসাবরক্ষক)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">স্বাক্ষর ও তারিখ</div>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 pt-1 mx-4 font-semibold text-slate-900">
                  যাচাইকারী (সাধারণ সম্পাদক)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">স্বাক্ষর ও তারিখ</div>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 pt-1 mx-4 font-semibold text-slate-900">
                  অনুমোদনকারী (সভাপতি / মোতাওয়াল্লী)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">স্বাক্ষর ও সীলমোহর</div>
              </div>
            </div>

            {/* Print Footer */}
            <div className="mt-8 text-[10px] text-slate-400 text-center border-t border-slate-200 pt-2 break-inside-avoid">
              প্রিন্ট তারিখ ও সময়: {toBnDigits(new Date().toLocaleString('bn-BD'))} • MasjidLedger Pro v2.6 (Audit Ready)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

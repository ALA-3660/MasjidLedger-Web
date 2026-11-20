import React, { useState } from 'react';
import {
  Sparkles,
  Printer,
  Loader2,
  AlertCircle,
  Wallet,
  Building2,
  ClipboardList,
  Edit3,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Mosque } from '../../types';
import { api } from '../../lib/api';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';

interface AiHandoverProtocolPanelProps {
  mosque?: Mosque | null;
  outgoingTermId?: string;
  incomingTermId?: string;
  handoverDate: string;
}

const toBnNum = (val: string | number) => {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[+d]);
};

const fmtTk = (val: number) => `৳ ${Number(val || 0).toLocaleString('bn-BD')}`;

export const AiHandoverProtocolPanel: React.FC<AiHandoverProtocolPanelProps> = ({
  mosque,
  outgoingTermId,
  incomingTermId,
  handoverDate,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState<Awaited<
    ReturnType<typeof api.generateCommitteeHandoverProtocolAi>
  > | null>(null);

  const handleGenerate = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await api.generateCommitteeHandoverProtocolAi({
        outgoingTermId: outgoingTermId || undefined,
        incomingTermId: incomingTermId || undefined,
        handoverDate,
      });
      setReport(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI দায়িত্ব হস্তান্তর প্রতিবেদন তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    printElement('ai-handover-protocol-printable', {
      title: `দায়িত্ব_হস্তান্তর_প্রতিবেদন_${handoverDate}`,
    });
  };

  const updateRecommendation = (idx: number, val: string) => {
    if (!report) return;
    setReport({
      ...report,
      recommendationsForIncomingBn: report.recommendationsForIncomingBn.map((r, i) =>
        i === idx ? val : r
      ),
    });
  };

  const addRecommendation = () => {
    if (!report) return;
    setReport({
      ...report,
      recommendationsForIncomingBn: [...report.recommendationsForIncomingBn, ''],
    });
  };

  const removeRecommendation = (idx: number) => {
    if (!report) return;
    setReport({
      ...report,
      recommendationsForIncomingBn: report.recommendationsForIncomingBn.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-5 font-siliguri">
      {/* Trigger Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold">
              AI আনুষ্ঠানিক দায়িত্ব হস্তান্তর প্রতিবেদন (Handover Protocol)
            </h3>
            <p className="text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
              সফটওয়্যারের প্রকৃত ক্যাশ ব্যালেন্স, ব্যাংক স্থিতি, ওয়াকফ বকেয়া ভাড়া এবং চলমান অসমাপ্ত প্রকল্পগুলো একত্রিত করে ১ ক্লিকে সম্পাদনাযোগ্য ও প্রিন্ট-রেডি বাংলা প্রতিবেদন তৈরি করুন।
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center space-x-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI প্রতিবেদন তৈরি করছে...</span>
              </>
            ) : (
              <>
                {report ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>{report ? 'হালনাগাদ প্রতিবেদন তৈরি করুন' : '১ ক্লিকে AI হস্তান্তর প্রতিবেদন তৈরি করুন'}</span>
              </>
            )}
          </button>

          {report && (
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>প্রতিবেদন প্রিন্ট করুন (A4)</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {report && (
        <div className="space-y-5">
          {/* Live Real Financial & Project Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>মোট তহবিল (ক্যাশ + ব্যাংক)</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-black text-emerald-700">
                {fmtTk(report.liveSnapshot.totalFundBalance)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                নগদ ক্যাশ: {fmtTk(report.liveSnapshot.cashBalance)} • ব্যাংক: {fmtTk(report.liveSnapshot.bankTotalBalance)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>ব্যাংক ও এমএফএস হিসাব</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-black text-blue-700">
                {toBnNum(report.liveSnapshot.bankBalances.length)} টি অ্যাকাউন্ট
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                মোট স্থিতি: {fmtTk(report.liveSnapshot.bankTotalBalance)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>ওয়াকফ সম্পত্তি ও বকেয়া ভাড়া</span>
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-black text-amber-700">
                বকেয়া {fmtTk(report.liveSnapshot.waqfStats.totalDueRent)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                সম্পত্তি {toBnNum(report.liveSnapshot.waqfStats.totalProperties)}টি • সক্রিয় ভাড়াটিয়া {toBnNum(report.liveSnapshot.waqfStats.totalActiveTenants)} জন
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>চলমান / অসমাপ্ত প্রকল্প</span>
                <ClipboardList className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg font-black text-purple-700">
                {toBnNum(report.liveSnapshot.pendingProjects.length)} টি কর্মপরিকল্পনা
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                অসমাপ্ত সদস্য টাস্ক: {toBnNum(report.liveSnapshot.pendingTasksCount)}টি
              </div>
            </div>
          </div>

          {/* Editable Preview Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900 flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>সম্পাদনাযোগ্য প্রিভিউ:</strong> নিচের প্রতিটি অনুচ্ছেদ সাধারণ সম্পাদক/সভাপতি প্রয়োজনমতো সংশোধন করতে পারবেন। যাচাই শেষে উপরের <strong>“প্রতিবেদন প্রিন্ট করুন (A4)”</strong> বাটনে ক্লিক করুন।
            </span>
          </div>

          {/* Editable Handover Protocol Editor */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">প্রতিবেদনের শিরোনাম</label>
                <input
                  type="text"
                  value={report.protocolTitleBn}
                  onChange={(e) => setReport({ ...report, protocolTitleBn: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg font-tiro"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">স্মারক নম্বর</label>
                <input
                  type="text"
                  value={report.memoNoSuggestion}
                  onChange={(e) => setReport({ ...report, memoNoSuggestion: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">১. আনুষ্ঠানিক ঘোষণা ও প্রারম্ভিক বক্তব্য</label>
              <textarea
                rows={3}
                value={report.executiveDeclarationBn}
                onChange={(e) => setReport({ ...report, executiveDeclarationBn: e.target.value })}
                className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg font-tiro"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">২. নগদ ক্যাশ ও ব্যাংক তহবিল হস্তান্তর বিবরণ</label>
              <textarea
                rows={3}
                value={report.financialHandoverSummaryBn}
                onChange={(e) => setReport({ ...report, financialHandoverSummaryBn: e.target.value })}
                className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg font-tiro"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">৩. ওয়াকফ সম্পত্তি, ভাড়াটিয়া ও বকেয়া ভাড়া বিবরণ</label>
              <textarea
                rows={3}
                value={report.waqfAndPropertySummaryBn}
                onChange={(e) => setReport({ ...report, waqfAndPropertySummaryBn: e.target.value })}
                className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg font-tiro"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">৪. চলমান প্রকল্প ও অসমাপ্ত কর্মপরিকল্পনা</label>
              <textarea
                rows={3}
                value={report.ongoingProjectsSummaryBn}
                onChange={(e) => setReport({ ...report, ongoingProjectsSummaryBn: e.target.value })}
                className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg font-tiro"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-600">৫. নবাগত কমিটির জন্য বিশেষ সুপারিশমালা</label>
                <button
                  type="button"
                  onClick={addRecommendation}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>সুপারিশ যোগ করুন</span>
                </button>
              </div>
              {report.recommendationsForIncomingBn.map((rec, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-5">{toBnNum(i + 1)}.</span>
                  <input
                    type="text"
                    value={rec}
                    onChange={(e) => updateRecommendation(i, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-tiro"
                  />
                  <button
                    type="button"
                    onClick={() => removeRecommendation(i)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">৬. সমাপনী অঙ্গীকারনামা</label>
              <textarea
                rows={2}
                value={report.closingPledgeBn}
                onChange={(e) => setReport({ ...report, closingPledgeBn: e.target.value })}
                className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg font-tiro"
              />
            </div>
          </div>

          {/* Hidden Printable Official A4 Handover Protocol */}
          <div className="hidden">
            <div id="ai-handover-protocol-printable" className="p-6 text-slate-900 font-tiro bg-white">
              <MosqueOfficialLetterhead
                mosque={mosque || undefined}
                reportTitle={report.protocolTitleBn}
                reportSubTitle={`স্মারক নং: ${report.memoNoSuggestion} • হস্তান্তরের তারিখ: ${report.liveSnapshot.handoverDate}`}
                language="bn"
              />

              <div className="mt-4 space-y-4 text-xs leading-relaxed">
                <div className="grid grid-cols-2 gap-3 p-3 border border-slate-300 rounded bg-slate-50">
                  <div><strong>বিদায়ী পরিষদ:</strong> {report.liveSnapshot.outgoingTermTitle}</div>
                  <div><strong>নবাগত পরিষদ:</strong> {report.liveSnapshot.incomingTermTitle}</div>
                </div>

                <p className="text-justify">{report.executiveDeclarationBn}</p>

                {/* Section: Financial Balances Table */}
                <div className="space-y-2 break-inside-avoid">
                  <h4 className="font-bold text-sm border-b border-slate-800 pb-1">
                    ১. নগদ তহবিল ও ব্যাংক হিসাবের স্থিতি হস্তান্তর
                  </h4>
                  <p className="text-justify">{report.financialHandoverSummaryBn}</p>
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-left">হিসাবের নাম ও বিবরণ</th>
                        <th className="border border-slate-300 p-2 text-left">ধরন / নম্বর</th>
                        <th className="border border-slate-300 p-2 text-right">বর্তমান স্থিতি (৳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.liveSnapshot.cashAccounts.map((ca, idx) => (
                        <tr key={`c-${idx}`}>
                          <td className="border border-slate-300 p-2">{ca.nameBn}</td>
                          <td className="border border-slate-300 p-2">নগদ ক্যাশ</td>
                          <td className="border border-slate-300 p-2 text-right font-bold">{fmtTk(ca.balance)}</td>
                        </tr>
                      ))}
                      {report.liveSnapshot.bankBalances.map((ba, idx) => (
                        <tr key={`b-${idx}`}>
                          <td className="border border-slate-300 p-2">
                            {ba.nameBn} {ba.bankName ? `(${ba.bankName})` : ''}
                          </td>
                          <td className="border border-slate-300 p-2">{ba.accountNumber || ba.accountType}</td>
                          <td className="border border-slate-300 p-2 text-right font-bold">{fmtTk(ba.balance)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td className="border border-slate-300 p-2" colSpan={2}>সর্বমোট হস্তান্তরিত তহবিল</td>
                        <td className="border border-slate-300 p-2 text-right">{fmtTk(report.liveSnapshot.totalFundBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section: Waqf & Due Rent */}
                <div className="space-y-2 break-inside-avoid">
                  <h4 className="font-bold text-sm border-b border-slate-800 pb-1">
                    ২. ওয়াকফ সম্পত্তি ও বকেয়া ভাড়ার বিবরণ
                  </h4>
                  <p className="text-justify">{report.waqfAndPropertySummaryBn}</p>
                  {report.liveSnapshot.waqfStats.dueTenantsList.length > 0 && (
                    <table className="w-full border-collapse border border-slate-300 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 p-2 text-left">সম্পত্তি</th>
                          <th className="border border-slate-300 p-2 text-left">ভাড়াটিয়া / দোকান নং</th>
                          <th className="border border-slate-300 p-2 text-right">বকেয়া ভাড়া (৳)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.liveSnapshot.waqfStats.dueTenantsList.map((dt, idx) => (
                          <tr key={idx}>
                            <td className="border border-slate-300 p-2">{dt.propertyName}</td>
                            <td className="border border-slate-300 p-2">
                              {dt.tenantName} {dt.shopNo ? `(${dt.shopNo})` : ''}
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-bold">{fmtTk(dt.dueAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section: Ongoing / Incomplete Projects */}
                <div className="space-y-2 break-inside-avoid">
                  <h4 className="font-bold text-sm border-b border-slate-800 pb-1">
                    ৩. চলমান প্রকল্প ও অসমাপ্ত কর্মপরিকল্পনা
                  </h4>
                  <p className="text-justify">{report.ongoingProjectsSummaryBn}</p>
                  {report.liveSnapshot.pendingProjects.length > 0 && (
                    <table className="w-full border-collapse border border-slate-300 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 p-2 text-left">প্রকল্প / কাজের নাম</th>
                          <th className="border border-slate-300 p-2 text-left">দায়িত্বপ্রাপ্ত</th>
                          <th className="border border-slate-300 p-2 text-center">অগ্রগতি</th>
                          <th className="border border-slate-300 p-2 text-right">বাজেট / ব্যয়</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.liveSnapshot.pendingProjects.map((pr, idx) => (
                          <tr key={idx}>
                            <td className="border border-slate-300 p-2">{pr.title}</td>
                            <td className="border border-slate-300 p-2">{pr.responsibleName}</td>
                            <td className="border border-slate-300 p-2 text-center">{toBnNum(pr.progressPercentage)}%</td>
                            <td className="border border-slate-300 p-2 text-right">
                              {fmtTk(pr.estimatedBudget)} / {fmtTk(pr.actualCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section: Recommendations */}
                {report.recommendationsForIncomingBn.filter(Boolean).length > 0 && (
                  <div className="space-y-1.5 break-inside-avoid">
                    <h4 className="font-bold text-sm border-b border-slate-800 pb-1">
                      ৪. নবাগত কমিটির জন্য বিশেষ সুপারিশমালা
                    </h4>
                    <ol className="list-decimal pl-5 space-y-1">
                      {report.recommendationsForIncomingBn.filter(Boolean).map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <p className="text-justify pt-1">{report.closingPledgeBn}</p>

                {/* Official Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-14 text-center text-[11px] break-inside-avoid">
                  <div>
                    <div className="border-t border-slate-800 pt-1 font-bold">সাবেক সভাপতি / সাধারণ সম্পাদক</div>
                    <div className="text-[10px] text-slate-600">{report.liveSnapshot.outgoingTermTitle}</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-800 pt-1 font-bold">কোষাধ্যক্ষ (হিসাব যাচাইকারী)</div>
                    <div className="text-[10px] text-slate-600">বিদায়ী ও নবাগত পরিষদ</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-800 pt-1 font-bold">বর্তমান সভাপতি / সাধারণ সম্পাদক</div>
                    <div className="text-[10px] text-slate-600">{report.liveSnapshot.incomingTermTitle}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

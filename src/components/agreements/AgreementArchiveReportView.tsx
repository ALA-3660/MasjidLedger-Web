import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Clock,
  CheckCircle2,
  Landmark,
  FileSignature,
  Printer,
  RefreshCw,
  ShieldAlert,
  Stamp,
  RotateCcw,
  AlertTriangle,
  History,
} from 'lucide-react';
import { AgreementArchiveReport, AgreementRecord } from '../../types/agreementTypes';
import { AGREEMENT_STATUS_META } from '../../lib/agreementCatalog';
import { api } from '../../lib/api';
import { printElement } from '../../lib/printUtils';

interface AgreementArchiveReportViewProps {
  canManageArchive: boolean;
  onSelectPreview: (ag: AgreementRecord) => void;
  onSelectGovernance: (ag: AgreementRecord, tab?: 'approval' | 'signature' | 'versions' | 'archive') => void;
  onArchiveChanged: () => void;
}

export const AgreementArchiveReportView: React.FC<AgreementArchiveReportViewProps> = ({
  canManageArchive,
  onSelectPreview,
  onSelectGovernance,
  onArchiveChanged,
}) => {
  const [report, setReport] = useState<AgreementArchiveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getAgreementArchiveReport();
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'আর্কাইভ ও গভর্ন্যান্স রিপোর্ট লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleUnarchive = async (ag: AgreementRecord) => {
    setBusyId(ag.id);
    setErrorMsg(null);
    try {
      await api.closeOrArchiveAgreement(ag.id, { mode: 'UNARCHIVE' });
      await loadReport();
      onArchiveChanged();
    } catch (err: any) {
      setErrorMsg(err?.message || 'আর্কাইভ থেকে পুনরুদ্ধার করা যায়নি।');
    } finally {
      setBusyId(null);
    }
  };

  const handlePrintReport = () => {
    printElement('agreement-archive-governance-report', {
      title: 'চুক্তিপত্র_গভর্ন্যান্স_ও_আর্কাইভ_রিপোর্ট',
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '12mm 14mm',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-siliguri flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-700" />
            <span>আর্কাইভ, মেয়াদ ও গভর্ন্যান্স রিপোর্ট (Count-Only Report)</span>
          </h3>
          <p className="text-xs text-slate-500 font-tiro mt-0.5">
            সম্পূর্ণ সংখ্যার হিসাবভিত্তিক রিপোর্ট — কোনো আর্থিক লেনদেন, ভাউচার বা বকেয়া সংযুক্ত নয়
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            disabled={!report}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 font-siliguri disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>রিপোর্ট প্রিন্ট / PDF</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-tiro flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && !report ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : report ? (
        <div id="agreement-archive-governance-report" className="space-y-5">
          {/* Zero-Financial Policy Strip */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 font-tiro flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                গভর্ন্যান্স ও আর্কাইভ সারসংক্ষেপ (সংখ্যাভিত্তিক) · মোট চুক্তিপত্র:{' '}
                <strong className="font-baloo">{report.totalAgreements}</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-800 font-baloo">
              প্রস্তুতের সময়: {new Date(report.generatedAt).toLocaleString('bn-BD')}
            </span>
          </div>

          {/* Count-Only KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>কার্যকর চুক্তি (Effective)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700 font-baloo tabular-nums">
                {report.activeOrEffectiveCount}
              </div>
              <p className="text-[11px] text-slate-500 font-tiro mt-1">
                সম্পূর্ণ স্বাক্ষরিত: <span className="font-baloo font-semibold">{report.fullySignedCount}</span>
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>অনুমোদন / স্বাক্ষর বাকি</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-700 font-baloo tabular-nums">
                {report.pendingApprovalCount + report.pendingOrPartialSignatureCount}
              </div>
              <p className="text-[11px] text-slate-500 font-tiro mt-1">
                অনুমোদন {report.pendingApprovalCount} · স্বাক্ষর {report.pendingOrPartialSignatureCount}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>ওয়াকফ/জমি আইনি বাকি</span>
                <Landmark className="w-4 h-4 text-teal-700" />
              </div>
              <div className="mt-2 text-2xl font-bold text-teal-800 font-baloo tabular-nums">
                {report.waqfLandPendingLegalReviewCount}
              </div>
              <p className="text-[11px] text-slate-500 font-tiro mt-1">
                মোট ওয়াকফ/জমি চুক্তি: <span className="font-baloo font-semibold">{report.waqfLandTotalCount}</span>
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-siliguri">
                <span>স্বাক্ষর ও সংশোধনী</span>
                <FileSignature className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="mt-2 text-2xl font-bold text-indigo-800 font-baloo tabular-nums">
                {report.totalSignaturesRecorded}
              </div>
              <p className="text-[11px] text-slate-500 font-tiro mt-1">
                সংশোধনী: <span className="font-baloo font-semibold">{report.totalAmendmentsCount}</span> · আর্কাইভ:{' '}
                <span className="font-baloo font-semibold">{report.archivedCount}</span>
              </p>
            </div>
          </div>

          {/* Expiring Within 30 Days Alert Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>আগামী ৩০ দিনের মধ্যে মেয়াদোত্তীর্ণ হবে ({report.expiringWithin30Days.length}টি)</span>
              </h4>
              <span className="text-xs text-slate-500 font-tiro">
                ইতিমধ্যে মেয়াদোত্তীর্ণ: <strong className="font-baloo text-slate-800">{report.expiredCount}</strong> · সম্পন্ন:{' '}
                <strong className="font-baloo text-slate-800">{report.completedCount}</strong> · অবসান/বাতিল:{' '}
                <strong className="font-baloo text-slate-800">{report.terminatedOrCancelledCount}</strong>
              </span>
            </div>
            {report.expiringWithin30Days.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 font-tiro">
                আগামী ৩০ দিনের মধ্যে কোনো কার্যকর চুক্তিপত্রের মেয়াদ শেষ হচ্ছে না।
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-siliguri">
                      <th className="py-2 px-4">চুক্তি নং</th>
                      <th className="py-2 px-3">শিরোনাম</th>
                      <th className="py-2 px-3">স্ট্যাটাস</th>
                      <th className="py-2 px-3">মেয়াদ শেষের তারিখ</th>
                      <th className="py-2 px-4 text-right">বাকি দিন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.expiringWithin30Days.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-baloo font-bold text-emerald-800">
                          {item.agreementNumber}
                        </td>
                        <td className="py-2.5 px-3 font-siliguri font-semibold text-slate-900">
                          {item.title}
                        </td>
                        <td className="py-2.5 px-3 font-siliguri">
                          {AGREEMENT_STATUS_META[item.status]?.shortBn || item.status}
                        </td>
                        <td className="py-2.5 px-3 font-baloo">{item.expiryDate}</td>
                        <td className="py-2.5 px-4 text-right font-baloo font-bold text-amber-700">
                          {item.daysRemaining} দিন
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Status & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-xs font-bold text-slate-800 font-siliguri mb-2.5">
                স্ট্যাটাস অনুযায়ী সংখ্যা
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {report.byStatus.map((row) => {
                  const meta = AGREEMENT_STATUS_META[row.status];
                  return (
                    <div
                      key={row.status}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs"
                    >
                      <span className="inline-flex items-center gap-1.5 font-siliguri text-slate-700 truncate">
                        <span className={`w-2 h-2 rounded-full ${meta?.dotClass || 'bg-slate-400'}`} />
                        {meta?.shortBn || row.status}
                      </span>
                      <span className="font-baloo font-bold text-slate-900 tabular-nums">{row.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-xs font-bold text-slate-800 font-siliguri mb-2.5">
                ক্যাটাগরি অনুযায়ী সংখ্যা
              </h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {report.byCategory.map((cat) => (
                  <div
                    key={cat.code}
                    className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 text-xs"
                  >
                    <span className="font-tiro text-slate-700">{cat.nameBn}</span>
                    <span className="font-baloo font-bold text-slate-900 tabular-nums">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Archived Agreements Register */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-siliguri">
                  আর্কাইভকৃত চুক্তিপত্রের তালিকা ({report.archivedItems.length}টি)
                </h4>
                <p className="text-[11px] text-slate-500 font-tiro">
                  আর্কাইভকৃত সকল চুক্তি, অনুমোদন, স্বাক্ষর ও ভার্সনের ইতিহাস স্থায়ীভাবে সুরক্ষিত আছে
                </p>
              </div>
            </div>

            {report.archivedItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-tiro">
                এখনো কোনো চুক্তিপত্র আর্কাইভ করা হয়নি। যেকোনো চুক্তিপত্রের "অনুমোদন ও স্বাক্ষর" প্যানেলের "সমাপ্তি ও আর্কাইভ" ট্যাব থেকে আর্কাইভ করতে পারবেন।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-siliguri">
                      <th className="py-2.5 px-4">চুক্তি নং ও শিরোনাম</th>
                      <th className="py-2.5 px-3">অবস্থা ও ভার্সন</th>
                      <th className="py-2.5 px-3">সমাপ্তি / আর্কাইভ বিবরণ</th>
                      <th className="py-2.5 px-4 text-right">কার্যক্রম</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.archivedItems.map((ag) => {
                      const stMeta = AGREEMENT_STATUS_META[ag.status] || AGREEMENT_STATUS_META.DRAFT;
                      return (
                        <tr key={ag.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <p className="font-baloo font-bold text-emerald-800">{ag.agreementNumber}</p>
                            <p className="font-siliguri font-semibold text-slate-900">{ag.title}</p>
                            <p className="text-[11px] text-slate-500 font-tiro">{ag.categoryNameBn}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-siliguri font-semibold ${stMeta.bgClass} ${stMeta.textClass} ${stMeta.borderClass}`}
                            >
                              {stMeta.shortBn}
                            </span>
                            <p className="text-[11px] text-slate-500 font-baloo mt-1">
                              v{ag.versionNumber || 1} · স্বাক্ষর: {ag.signatures?.length || 0}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-[11px] font-tiro text-slate-600 max-w-xs">
                            {ag.closureInfo?.reason && (
                              <p className="text-slate-800">কারণ: {ag.closureInfo.reason}</p>
                            )}
                            {ag.archiveNote && <p>আর্কাইভ নোট: {ag.archiveNote}</p>}
                            {ag.archivedAt && (
                              <p className="text-slate-400 font-baloo mt-0.5">
                                {new Date(ag.archivedAt).toLocaleDateString('bn-BD')} · {ag.archivedByName}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectPreview(ag)}
                                title="A4 প্রিন্ট/PDF"
                                className="p-1.5 rounded-lg border border-slate-200 text-emerald-700 hover:bg-emerald-50"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectGovernance(ag, 'versions')}
                                title="ভার্সন ও অডিট ইতিহাস"
                                className="p-1.5 rounded-lg border border-slate-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectGovernance(ag, 'approval')}
                                title="অনুমোদন ও স্বাক্ষর রেকর্ড"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                              >
                                <Stamp className="w-3.5 h-3.5" />
                              </button>
                              {canManageArchive && (
                                <button
                                  type="button"
                                  disabled={busyId === ag.id}
                                  onClick={() => handleUnarchive(ag)}
                                  title="আর্কাইভ থেকে সক্রিয় করুন"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-siliguri font-semibold disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>পুনরুদ্ধার</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

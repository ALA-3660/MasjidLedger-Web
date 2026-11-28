import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  GitMerge,
  History,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  PARTY_PROFILE_TYPE_LABELS,
  formatPartyAddressLine,
  getPartyRoleLabelBn,
} from '../../lib/partyCatalog';
import { formatDate } from '../../lib/i18n';
import {
  PartyCustomRoleDef,
  PartyDuplicateCandidatePair,
  PartyMergeHistoryRecord,
  PartyRecord,
} from '../../types/partyTypes';
import { toBanglaNumber } from '../CommitteeView';

export interface PartyDuplicateMergeViewProps {
  customRoles: PartyCustomRoleDef[];
  canMerge: boolean;
  onOpenPartyProfile: (partyId: string) => void;
  onMergedSuccess: (mergedParty: PartyRecord) => void;
}

const MERGE_FIELDS: Array<{
  key: keyof PartyRecord;
  labelBn: string;
}> = [
  { key: 'name', labelBn: 'নাম / প্রতিষ্ঠানের নাম' },
  { key: 'partyType', labelBn: 'প্রোফাইলের ধরন' },
  { key: 'phone', labelBn: 'প্রাথমিক মোবাইল' },
  { key: 'alternatePhone', labelBn: 'বিকল্প মোবাইল' },
  { key: 'email', labelBn: 'ইমেইল' },
  { key: 'nidNumber', labelBn: 'NID নম্বর' },
  { key: 'fullAddress', labelBn: 'পূর্ণ ঠিকানা' },
  { key: 'district', labelBn: 'জেলা' },
  { key: 'occupationOrSkill', labelBn: 'পেশা / দক্ষতা' },
];

export const PartyDuplicateMergeView: React.FC<PartyDuplicateMergeViewProps> = ({
  customRoles,
  canMerge,
  onOpenPartyProfile,
  onMergedSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState<PartyDuplicateCandidatePair[]>([]);
  const [mergeHistory, setMergeHistory] = useState<PartyMergeHistoryRecord[]>(
    []
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active Merge Modal state
  const [activePair, setActivePair] =
    useState<PartyDuplicateCandidatePair | null>(null);
  const [targetSide, setTargetSide] = useState<'A' | 'B'>('A');
  const [fieldChoices, setFieldChoices] = useState<
    Record<string, 'TARGET' | 'SOURCE'>
  >({});
  const [mergeNote, setMergeNote] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [dupPairs, history] = await Promise.all([
        api.getPartyDuplicates(),
        api.getPartyMergeHistory(),
      ]);
      setPairs(dupPairs);
      setMergeHistory(history);
    } catch (err: any) {
      setErrorMsg(err?.message || 'ডুপ্লিকেট তথ্য স্ক্যান করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openMergeWorkbench = (pair: PartyDuplicateCandidatePair) => {
    setActivePair(pair);
    setTargetSide('A');
    setFieldChoices({});
    setMergeNote('');
    setErrorMsg('');
  };

  const handleConfirmMerge = async () => {
    if (!activePair || !canMerge) return;
    const targetParty =
      targetSide === 'A' ? activePair.primaryParty : activePair.duplicateParty;
    const sourceParty =
      targetSide === 'A' ? activePair.duplicateParty : activePair.primaryParty;

    try {
      setIsMerging(true);
      setErrorMsg('');
      const result = await api.mergeParties({
        targetPartyId: targetParty.id,
        sourcePartyId: sourceParty.id,
        fieldChoices,
        note: mergeNote.trim() || undefined,
      });
      setActivePair(null);
      setSuccessMsg(
        `"${sourceParty.name}" (${sourceParty.partyCode}) প্রোফাইলটি নিরাপদে "${result.mergedParty.name}" (${result.mergedParty.partyCode})-এর সাথে একীভূত হয়েছে এবং পুরোনো partyId ইতিহাস সংরক্ষিত রয়েছে।`
      );
      await loadData();
      onMergedSuccess(result.mergedParty);
    } catch (err: any) {
      setErrorMsg(err?.message || 'একীভূতকরণ (Merge) সম্পন্ন করা যায়নি।');
    } finally {
      setIsMerging(false);
    }
  };

  const renderFieldVal = (p: PartyRecord, key: keyof PartyRecord) => {
    if (key === 'partyType') return PARTY_PROFILE_TYPE_LABELS[p.partyType];
    if (key === 'fullAddress') return formatPartyAddressLine(p) || '—';
    return String(p[key] || '—');
  };

  return (
    <div className="space-y-5 font-siliguri">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            ডুপ্লিকেট তথ্য শনাক্তকরণ ও নিরাপদ একীভূতকরণ (Merge)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            মোবাইল নম্বর, বিকল্প নম্বর, NID অথবা একই প্রতিষ্ঠানের নামের ভিত্তিতে সম্ভাব্য ডুপ্লিকেট প্রোফাইল শনাক্ত করা হয়। Merge করলেও পুরোনো partyId-এর ইতিহাস হারিয়ে যায় না।
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          পুনরায় স্ক্যান করুন
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Detected Duplicate Pairs */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="h-5 w-44 bg-slate-100 rounded animate-pulse" />
          <div className="h-28 w-full bg-slate-100 rounded-xl animate-pulse" />
        </div>
      ) : pairs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            কোনো ডুপ্লিকেট প্রোফাইল পাওয়া যায়নি
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            এই মসজিদের কেন্দ্রীয় ব্যক্তি ও প্রতিষ্ঠান রেজিস্ট্রিতে বর্তমানে মোবাইল, NID বা নামের ভিত্তিতে কোনো দ্বৈত এন্ট্রি নেই।
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-700">
            শনাক্তকৃত সম্ভাব্য ডুপ্লিকেট জোড়া: {toBanglaNumber(pairs.length)}টি
          </div>
          {pairs.map((pair) => (
            <div
              key={pair.pairKey}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      pair.confidence === 'HIGH'
                        ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}
                  />
                  <span className="font-bold text-slate-900">
                    {pair.confidence === 'HIGH'
                      ? 'উচ্চ মিল (High Confidence)'
                      : 'মাঝারি মিল (Medium Confidence)'}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-amber-800 font-medium">
                    {pair.reasonLabelsBn.join(' · ')}
                  </span>
                </div>

                {canMerge && (
                  <button
                    type="button"
                    onClick={() => openMergeWorkbench(pair)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    তুলনা ও Merge করুন
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[pair.primaryParty, pair.duplicateParty].map((party, idx) => (
                  <div
                    key={party.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          প্রোফাইল {idx === 0 ? '১' : '২'} ·{' '}
                          <span className="font-baloo">{party.partyCode}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {party.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenPartyProfile(party.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        বিস্তারিত
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-700 space-y-1">
                      <div>
                        মোবাইল:{' '}
                        <span className="font-baloo font-semibold">
                          {party.phone}
                        </span>
                        {party.alternatePhone ? ` / ${party.alternatePhone}` : ''}
                      </div>
                      {party.nidNumber && (
                        <div>
                          NID:{' '}
                          <span className="font-baloo">{party.nidNumber}</span>
                        </div>
                      )}
                      <div>
                        ভূমিকা:{' '}
                        <span className="font-medium text-slate-900">
                          {(party.roles || [])
                            .map((r) => getPartyRoleLabelBn(r, customRoles))
                            .join(', ')}
                        </span>
                      </div>
                      <div>
                        ঠিকানা: {formatPartyAddressLine(party) || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merge History Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
          <History className="w-4 h-4 text-slate-500" />
          সম্পন্নকৃত Merge ইতিহাস ({toBanglaNumber(mergeHistory.length)}টি)
        </h3>
        {mergeHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            এখনও কোনো প্রোফাইল Merge করা হয়নি।
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {mergeHistory.map((m) => (
              <div
                key={m.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900">
                    {m.resolutionSummaryBn}
                  </div>
                  <div className="text-slate-500">
                    {formatDate(m.mergedAt, 'bn')} · সম্পাদনাকারী: {m.mergedByName}
                    {m.note ? ` · নোট: ${m.note}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPartyProfile(m.targetPartyId)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  মূল প্রোফাইল দেখুন
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Merge Workbench Modal */}
      {activePair && (() => {
        const targetParty =
          targetSide === 'A'
            ? activePair.primaryParty
            : activePair.duplicateParty;
        const sourceParty =
          targetSide === 'A'
            ? activePair.duplicateParty
            : activePair.primaryParty;
        const combinedRoles = Array.from(
          new Set([...(targetParty.roles || []), ...(sourceParty.roles || [])])
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-5 space-y-4 shadow-xl my-8">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    প্রোফাইল Merge পর্যালোচনা ও অনুমোদন
                  </h3>
                  <p className="text-xs text-slate-500">
                    কোন প্রোফাইলটি মূল (Target) হিসেবে থাকবে তা নির্বাচন করুন। দুটি প্রোফাইলের সকল ভূমিকা একত্রিত হবে এবং পুরোনো partyId ইতিহাস সংরক্ষিত থাকবে।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTargetSide((prev) => (prev === 'A' ? 'B' : 'A'))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  মূল প্রোফাইল অদলবদল করুন
                </button>
              </div>

              {/* Target vs Source Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl p-3">
                  <div className="font-bold text-emerald-900">
                    মূল প্রোফাইল (সক্রিয় থাকবে)
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {targetParty.name}
                  </div>
                  <div className="text-slate-600 font-baloo">
                    {targetParty.partyCode} · {targetParty.partyId}
                  </div>
                </div>
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-3">
                  <div className="font-bold text-slate-700">
                    একীভূত হতে যাওয়া রেকর্ড (ইতিহাস সংরক্ষিত হবে)
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {sourceParty.name}
                  </div>
                  <div className="text-slate-600 font-baloo">
                    {sourceParty.partyCode} · {sourceParty.partyId}
                  </div>
                </div>
              </div>

              {/* Combined Roles Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700">
                <span className="font-bold text-slate-900">
                  সম্মিলিত ভূমিকা (Merge-এর পর):
                </span>{' '}
                {combinedRoles
                  .map((r) => getPartyRoleLabelBn(r, customRoles))
                  .join(' · ')}
              </div>

              {/* Field-by-field conflict choice table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">তথ্যের ক্ষেত্র</th>
                      <th className="px-3 py-2 font-semibold">
                        মূল প্রোফাইল ({targetParty.partyCode})
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        দ্বিতীয় প্রোফাইল ({sourceParty.partyCode})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MERGE_FIELDS.map((f) => {
                      const tVal = renderFieldVal(targetParty, f.key);
                      const sVal = renderFieldVal(sourceParty, f.key);
                      if (tVal === '—' && sVal === '—') return null;
                      const choice = fieldChoices[String(f.key)] || 'TARGET';
                      const same = tVal === sVal;
                      return (
                        <tr key={String(f.key)}>
                          <td className="px-3 py-2 font-semibold text-slate-700">
                            {f.labelBn}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              disabled={same || tVal === '—'}
                              onClick={() =>
                                setFieldChoices((prev) => ({
                                  ...prev,
                                  [String(f.key)]: 'TARGET',
                                }))
                              }
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                                choice === 'TARGET' || same
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {tVal}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              disabled={same || sVal === '—'}
                              onClick={() =>
                                setFieldChoices((prev) => ({
                                  ...prev,
                                  [String(f.key)]: 'SOURCE',
                                }))
                              }
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
                                choice === 'SOURCE' && !same
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {sVal}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merge সংক্রান্ত নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={mergeNote}
                  onChange={(e) => setMergeNote(e.target.value)}
                  placeholder="যেমন: যাচাই করে একই ব্যক্তি নিশ্চিত হওয়া গেছে"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivePair(null)}
                  disabled={isMerging}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={isMerging}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-60"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  {isMerging ? 'Merge হচ্ছে...' : 'নিশ্চিত করে Merge করুন'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

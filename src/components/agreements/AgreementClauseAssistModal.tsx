import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  ShieldAlert,
} from 'lucide-react';
import {
  AgreementClauseAssistAction,
  AgreementClauseAssistResult,
} from '../../types/agreementTypes';
import { api } from '../../lib/api';

interface AgreementClauseAssistModalProps {
  currentClauses: string;
  agreementTitle?: string;
  categoryNameBn?: string;
  onApplyRevisedClauses: (revisedClauses: string) => void;
  onClose: () => void;
}

const CLAUSE_ACTIONS: Array<{
  id: AgreementClauseAssistAction;
  labelBn: string;
  descBn: string;
}> = [
  { id: 'ADD_CLAUSE', labelBn: 'নতুন ধারা যোগ', descBn: 'নির্দেশনা অনুযায়ী নতুন সুস্পষ্ট ধারা যুক্ত করুন' },
  { id: 'CLARIFY_TERMS', labelBn: 'শর্ত স্পষ্ট করুন', descBn: 'অস্পষ্ট ও দ্ব্যর্থবোধক বাক্যগুলো নির্ভুল করুন' },
  { id: 'FORMAL_BANGLA', labelBn: 'আনুষ্ঠানিক বাংলা', descBn: 'প্রমিত দাপ্তরিক চুক্তিপত্রের ভাষায় রূপান্তর' },
  { id: 'SIMPLE_BANGLA', labelBn: 'সহজ বাংলা', descBn: 'সবার বোধগম্য সহজ ও প্রাঞ্জল বাংলায় রূপান্তর' },
  { id: 'SEPARATE_RESPONSIBILITIES', labelBn: 'দায়িত্ব আলাদা করুন', descBn: 'প্রথম পক্ষ, দ্বিতীয় পক্ষ ও যৌথ দায়িত্ব পৃথক করুন' },
  { id: 'IDENTIFY_WEAKNESSES', labelBn: 'দুর্বল দিক চিহ্নিত', descBn: 'ফাঁকফোকর ও ঝুঁকি শনাক্ত করে সংশোধিত খসড়া' },
];

export const AgreementClauseAssistModal: React.FC<AgreementClauseAssistModalProps> = ({
  currentClauses,
  agreementTitle,
  categoryNameBn,
  onApplyRevisedClauses,
  onClose,
}) => {
  const [selectedAction, setSelectedAction] = useState<AgreementClauseAssistAction>('CLARIFY_TERMS');
  const [userInstruction, setUserInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AgreementClauseAssistResult | null>(null);
  const [editableRevised, setEditableRevised] = useState('');

  const handleRun = async () => {
    setErrorMsg(null);
    if (!currentClauses.trim() && !userInstruction.trim()) {
      setErrorMsg('অনুগ্রহ করে বিদ্যমান শর্তাবলি অথবা নতুন ধারার নির্দেশনা প্রদান করুন।');
      return;
    }
    setLoading(true);
    try {
      const res = await api.aiAssistAgreementClause({
        action: selectedAction,
        currentClauses,
        agreementTitle,
        categoryNameBn,
        userInstruction: userInstruction.trim() || undefined,
      });
      setResult(res);
      setEditableRevised(res.revisedClauses);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI ধারা সহায়তা সম্পন্ন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl overflow-hidden my-4">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-siliguri">
                AI ধারা সহকারী (AI Clause Assistant)
              </h3>
              <p className="text-[11px] text-slate-500 font-tiro">
                বিদ্যমান খসড়া বা টেমপ্লেটের ধারা পরিমার্জন, ভাষা পরিবর্তন, দায়িত্ব বিভাজন ও দুর্বল দিক শনাক্ত করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          {/* Action Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CLAUSE_ACTIONS.map((act) => {
              const active = selectedAction === act.id;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setSelectedAction(act.id)}
                  className={`p-2.5 rounded-xl border text-left transition-colors ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold font-siliguri">{act.labelBn}</p>
                  <p className="text-[11px] text-slate-500 font-tiro mt-0.5 leading-snug">{act.descBn}</p>
                </button>
              );
            })}
          </div>

          {/* Optional Extra Instruction */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              {selectedAction === 'ADD_CLAUSE'
                ? 'কী ধরনের নতুন ধারা যোগ করতে চান লিখুন *'
                : 'অতিরিক্ত নির্দেশনা (ঐচ্ছিক)'}
            </label>
            <input
              type="text"
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              placeholder={
                selectedAction === 'ADD_CLAUSE'
                  ? 'যেমন: কাজ বিলম্ব হলে এবং মান বজায় না থাকলে সংশোধনের শর্ত যুক্ত করো...'
                  : 'যেমন: নামাজের সময় কাজ বন্ধ রাখার বিষয়টি জোর দাও...'
              }
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 font-tiro">
              বর্তমান শর্তাবলি: <strong className="font-baloo text-slate-700">{currentClauses.trim().length}</strong> অক্ষর
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={handleRun}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? 'বিশ্লেষণ হচ্ছে...' : 'AI পরিমার্জন চালান'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-tiro flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="border-t border-slate-200 pt-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-tiro">
                <strong className="font-siliguri text-slate-900">পরিবর্তনের সারসংক্ষেপ:</strong> {result.summaryBn}
              </div>

              {result.weaknessesDetected.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
                  <p className="text-xs font-bold text-amber-950 font-siliguri flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>শনাক্তকৃত দুর্বল দিক ({result.weaknessesDetected.length})</span>
                  </p>
                  <ul className="list-disc list-inside text-xs text-amber-950 font-tiro space-y-0.5">
                    {result.weaknessesDetected.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestedAdditions.length > 0 && (
                <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 space-y-1">
                  <p className="text-xs font-bold text-sky-950 font-siliguri flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-sky-700" />
                    <span>প্রস্তাবিত অতিরিক্ত ধারা</span>
                  </p>
                  <ul className="list-disc list-inside text-xs text-sky-950 font-tiro space-y-0.5">
                    {result.suggestedAdditions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 font-siliguri mb-1">
                  পরিমার্জিত শর্তাবলি (প্রয়োগের আগে চাইলে এখানেই সংশোধন করুন)
                </label>
                <textarea
                  rows={8}
                  value={editableRevised}
                  onChange={(e) => setEditableRevised(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-tiro leading-relaxed rounded-xl border border-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 font-tiro">
                {result.safetyNoticeBn} · মডেল: {result.modelUsed}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 font-siliguri"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => onApplyRevisedClauses(editableRevised)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>পরিমার্জিত শর্তাবলি প্রয়োগ করুন</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

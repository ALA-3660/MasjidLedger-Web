import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  AgreementAiDraftResult,
  AgreementCategoryDef,
} from '../../types/agreementTypes';
import { api } from '../../lib/api';
import { WRITTEN_PAYMENT_MODE_LABELS } from '../../lib/agreementCatalog';

interface AgreementAiAssistantModalProps {
  categories: AgreementCategoryDef[];
  initialCategoryCode?: string;
  onApplyDraft: (draft: AgreementAiDraftResult) => void;
  onClose: () => void;
}

const SAMPLE_PROMPTS_BN = [
  'মসজিদের দ্বিতীয় তলায় ৪০×২০ ফুট অজুখানা নির্মাণের জন্য একজন স্থানীয় ঠিকাদারের সাথে ৩ কিস্তিতে লিখিত নির্মাণ চুক্তির খসড়া তৈরি করো। নির্মাণ সামগ্রী মসজিদ কমিটি দেবে এবং শ্রমিক ও মিস্ত্রি ঠিকাদার বহন করবে।',
  'মসজিদে মুসল্লিদের প্রবেশের জন্য উত্তর পাশের জমির মালিকের সাথে ১০ ফুট প্রস্থের চলাচলের রাস্তার অধিকার চুক্তির খসড়া সাজিয়ে দাও।',
  'মসজিদ মার্কেটের নিচতলার একটি কক্ষ বৈধ হালাল ব্যবসার জন্য ৩ বছর মেয়াদে ব্যবহার ও ভাড়ার লিখিত চুক্তিপত্র তৈরি করো।',
];

export const AgreementAiAssistantModal: React.FC<AgreementAiAssistantModalProps> = ({
  categories,
  initialCategoryCode,
  onApplyDraft,
  onClose,
}) => {
  const [instructionBn, setInstructionBn] = useState('');
  const [preferredCategoryCode, setPreferredCategoryCode] = useState(initialCategoryCode || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AgreementAiDraftResult | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!instructionBn.trim()) {
      setErrorMsg('অনুগ্রহ করে সাধারণ বাংলায় আপনার চুক্তিপত্রের প্রয়োজনীয় বিবরণ লিখুন।');
      return;
    }
    setLoading(true);
    try {
      const res = await api.aiDraftAgreement({
        instructionBn: instructionBn.trim(),
        preferredCategoryCode: preferredCategoryCode || undefined,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI খসড়া তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-siliguri">
                AI চুক্তিপত্র খসড়া সহকারী (AI Agreement Assistant)
              </h3>
              <p className="text-[11px] text-slate-500 font-tiro">
                সাধারণ বাংলা নির্দেশনা থেকে ক্যাটাগরি শনাক্ত, পক্ষ-দায়িত্ব ও লিখিত শর্তাবলি সাজিয়ে নিন — অনুপস্থিত তথ্য স্পষ্ট প্লেসহোল্ডার হিসেবে থাকবে
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
          {/* Strict Non-Fabrication & Zero-Finance Policy Notice */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-950 font-tiro flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>সততা ও নিরাপত্তা নীতি:</strong> AI কখনো NID, মোবাইল, জমির দাগ/খতিয়ান, টাকার অঙ্ক বা তারিখ নিজে থেকে বানাবে না—যা দেওয়া নেই তা স্পষ্ট প্লেসহোল্ডার ও প্রশ্নতালিকায় রাখবে। এটি কেবল লিখিত খসড়া; কোনো আর্থিক লেনদেন, অনুমোদন বা আইনগত নিশ্চয়তা নয়।
            </p>
          </div>

          {/* Input Form */}
          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                সাধারণ বাংলায় চুক্তির বিবরণ লিখুন *
              </label>
              <textarea
                rows={4}
                value={instructionBn}
                onChange={(e) => setInstructionBn(e.target.value)}
                placeholder="যেমন: মসজিদের উত্তর পাশের নতুন অজুখানা নির্মাণের জন্য একজন স্থানীয় ঠিকাদারের সাথে চুক্তি করতে চাই। সামগ্রী মসজিদ কমিটি দেবে, শ্রমিক ঠিকাদার দেবে। ৩ কিস্তিতে লিখিত শর্ত থাকবে..."
                className="w-full px-3.5 py-2.5 text-xs font-tiro leading-relaxed rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 font-siliguri mr-1">নমুনা নির্দেশনা:</span>
              {SAMPLE_PROMPTS_BN.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInstructionBn(sample)}
                  className="text-[11px] font-tiro px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 transition-colors"
                >
                  নমুনা #{idx + 1}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 font-siliguri shrink-0">
                  ক্যাটাগরি ইঙ্গিত (ঐচ্ছিক):
                </label>
                <select
                  value={preferredCategoryCode}
                  onChange={(e) => setPreferredCategoryCode(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">AI স্বয়ংক্রিয়ভাবে শনাক্ত করবে</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'খসড়া তৈরি হচ্ছে...' : 'AI খসড়া তৈরি করুন'}</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-tiro flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Result Preview */}
          {result && (
            <div className="border-t border-slate-200 pt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 font-siliguri">
                    শনাক্তকৃত ক্যাটাগরি: {result.detectedCategoryNameBn} ·{' '}
                    {WRITTEN_PAYMENT_MODE_LABELS[result.writtenFinancialTerms?.mode || 'NON_FINANCIAL']}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 font-siliguri mt-0.5">{result.title}</h4>
                </div>
                <span className="text-[11px] text-slate-400 font-tiro">মডেল: {result.modelUsed}</span>
              </div>

              <p className="text-xs text-slate-700 font-tiro bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                <strong className="font-siliguri text-slate-900">উদ্দেশ্য:</strong> {result.purpose}
              </p>

              {/* Missing Info Questions (Mandatory Transparency) */}
              {result.missingInfoQuestions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <h5 className="text-xs font-bold text-amber-950 font-siliguri flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-700" />
                    <span>অনুপস্থিত তথ্যের তালিকা — ফর্মে বসানোর পর এগুলো পূরণ করুন ({result.missingInfoQuestions.length})</span>
                  </h5>
                  <ul className="list-disc list-inside text-xs text-amber-950 font-tiro space-y-1">
                    {result.missingInfoQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parties & Clauses Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.parties.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white text-xs">
                    <p className="font-bold text-slate-900 font-siliguri">
                      {p.roleLabel}: {p.name}
                    </p>
                    {p.representatives.length > 0 && (
                      <p className="text-[11px] text-slate-600 font-tiro mt-1">
                        প্রতিনিধি: {p.representatives.map((r) => `${r.name} (${r.designation})`).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <h5 className="text-xs font-bold text-slate-800 font-siliguri">প্রস্তাবিত সাধারণ শর্তাবলি</h5>
                <div className="text-xs text-slate-700 font-tiro whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed">
                  {result.generalClauses}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-tiro">{result.safetyNoticeBn}</p>

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
                  onClick={() => onApplyDraft(result)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>খসড়া ফর্মে প্রয়োগ করুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

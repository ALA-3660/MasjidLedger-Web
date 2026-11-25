import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Wrench, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { api, FormAlertAssistResult } from '../../lib/api';

export interface FormAlertAssistantProps {
  alertMessage: string | null | undefined;
  formNameBn?: string;
  moduleKey?: string;
  moduleName?: string;
  alertType?: 'ERROR' | 'WARNING' | 'VALIDATION';
  fieldValuesSnapshot?: Record<string, any>;
  formValues?: Record<string, any>;
  availablePatchFields?: Array<{ fieldKey: string; fieldLabelBn: string; currentValue?: string }>;
  onApplyPatch?: (fieldKey: string, proposedValue: string) => void;
  onDismissAlert?: () => void;
  className?: string;
  compact?: boolean;
}

export const FormAlertAssistant: React.FC<FormAlertAssistantProps> = ({
  alertMessage,
  formNameBn,
  moduleKey,
  moduleName,
  alertType = 'ERROR',
  fieldValuesSnapshot,
  formValues,
  availablePatchFields,
  onApplyPatch,
  className = '',
  compact = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [assistResult, setAssistResult] = useState<FormAlertAssistResult | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [appliedKeys, setAppliedKeys] = useState<Record<string, boolean>>({});

  const trimmed = (alertMessage || '').trim();
  const resolvedFormNameBn = formNameBn || moduleName || 'এন্ট্রি ফর্ম';
  const resolvedModuleKey = moduleKey || moduleName || 'GENERAL_FORM';
  const resolvedSnapshot = fieldValuesSnapshot || formValues;

  useEffect(() => {
    setAssistResult(null);
    setAssistError(null);
    setAppliedKeys({});
    setExpanded(true);
  }, [trimmed]);

  if (!trimmed) return null;

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    setAssistError(null);
    try {
      const safeAlertType: 'ERROR' | 'WARNING' | 'VALIDATION' =
        alertType === 'WARNING' || alertType === 'VALIDATION' ? alertType : 'ERROR';
      const res = await api.analyzeFormAlertAi({
        formNameBn: resolvedFormNameBn,
        moduleKey: resolvedModuleKey,
        alertType: safeAlertType,
        alertMessageBn: trimmed,
        fieldValuesSnapshot: resolvedSnapshot,
        availablePatchFields,
      });
      setAssistResult(res);
      setExpanded(true);
    } catch (err: any) {
      setAssistError(err?.message || 'এই মুহূর্তে AI সমাধান ব্যাখ্যা আনা যায়নি। অনুগ্রহ করে লাল চিহ্নিত ঘরগুলো পরীক্ষা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mt-2 space-y-2 font-siliguri ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-lg font-bold transition shadow-2xs cursor-pointer disabled:opacity-60 ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          } bg-indigo-700 hover:bg-indigo-800 text-white`}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI কারণ ও সমাধান খুঁজছে...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI দিয়ে সমাধান খুঁজুন</span>
            </>
          )}
        </button>

        {assistResult && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
          >
            {expanded ? (
              <>
                <span>ব্যাখ্যা গুটিয়ে নিন</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>AI সমাধান দেখুন</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {assistError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{assistError}</span>
        </div>
      )}

      {assistResult && expanded && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-indigo-50/90 border border-indigo-200 text-xs text-slate-800 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 border-b border-indigo-200/70 pb-1.5">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              AI ফর্ম সতর্কতা সহায়ক ({formNameBn})
            </span>
            <span className="text-[10px] font-semibold text-indigo-700 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              যাচাই ছাড়া কিছু সেভ হবে না
            </span>
          </div>

          <div className="space-y-1.5 font-tiro text-[12px] leading-relaxed">
            <div>
              <span className="font-bold font-siliguri text-rose-800">(ক) সম্ভাব্য কারণ: </span>
              <span>{assistResult.causeBn}</span>
            </div>
            <div>
              <span className="font-bold font-siliguri text-emerald-800">(খ) ঠিক করার উপায়: </span>
              <span>{assistResult.howToFixBn}</span>
            </div>
            {assistResult.checklistBn && assistResult.checklistBn.length > 0 && (
              <ul className="list-disc list-inside pl-1 space-y-0.5 text-slate-700">
                {assistResult.checklistBn.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
            <div className="p-2 rounded-lg bg-white/80 border border-indigo-200/70 text-slate-800">
              <span className="font-bold font-siliguri text-indigo-900">(গ) নিরাপদ প্রস্তাব ও সতর্কতা: </span>
              <span>{assistResult.safeSuggestionBn}</span>
            </div>
          </div>

          {onApplyPatch && assistResult.patchSuggestions && assistResult.patchSuggestions.length > 0 && (
            <div className="pt-1.5 border-t border-indigo-200/70 space-y-1.5">
              <div className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                <span>অনুমোদনসাপেক্ষ নিরাপদ সংশোধন প্রস্তাব:</span>
              </div>
              {assistResult.patchSuggestions.map((patch) => {
                const isApplied = Boolean(appliedKeys[patch.fieldKey]);
                return (
                  <div
                    key={patch.fieldKey}
                    className="p-2 rounded-lg bg-white border border-indigo-200 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-[11px]">
                        {patch.fieldLabelBn}: <span className="text-indigo-700 font-tiro">“{patch.proposedValue}”</span>
                      </div>
                      {patch.reasonBn && (
                        <div className="text-[10px] text-slate-500 font-tiro">{patch.reasonBn}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isApplied}
                      onClick={() => {
                        onApplyPatch(patch.fieldKey, patch.proposedValue);
                        setAppliedKeys((prev) => ({ ...prev, [patch.fieldKey]: true }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shrink-0 ${
                        isApplied
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isApplied ? 'প্রয়োগ হয়েছে' : 'প্রস্তাবিত সমাধান প্রয়োগ করুন'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

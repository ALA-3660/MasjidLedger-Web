import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Scale,
  RefreshCw,
} from 'lucide-react';
import {
  AgreementAiReviewResult,
  AgreementRecord,
  AgreementRiskSeverity,
} from '../../types/agreementTypes';
import { api } from '../../lib/api';

interface AgreementReviewPanelModalProps {
  agreementId?: string;
  draftAgreement?: Partial<AgreementRecord>;
  agreementTitle?: string;
  onClose: () => void;
}

const SEVERITY_META: Record<
  AgreementRiskSeverity,
  { labelBn: string; borderClass: string; bgClass: string; textClass: string; dotClass: string }
> = {
  HIGH: {
    labelBn: 'উচ্চ ঝুঁকি',
    borderClass: 'border-rose-200',
    bgClass: 'bg-rose-50/70',
    textClass: 'text-rose-900',
    dotClass: 'bg-rose-600',
  },
  MEDIUM: {
    labelBn: 'মধ্যম ঝুঁকি',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50/70',
    textClass: 'text-amber-950',
    dotClass: 'bg-amber-500',
  },
  LOW: {
    labelBn: 'সাধারণ পরামর্শ',
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50/60',
    textClass: 'text-emerald-950',
    dotClass: 'bg-emerald-600',
  },
};

const AREA_LABELS_BN: Record<string, string> = {
  PARTY_IDENTITY: 'পক্ষের পরিচয়',
  REPRESENTATIVE_AUTHORITY: 'প্রতিনিধিত্বের ক্ষমতার ভিত্তি',
  WORK_SCOPE: 'কাজের বিবরণ ও পরিধি',
  ARITHMETIC_CONSISTENCY: 'কিস্তি ও মোট মূল্যের গাণিতিক সামঞ্জস্য',
  DATE_TIMELINE: 'তারিখ ও সময়সীমা',
  CLAUSE_CLARITY: 'ধারার স্পষ্টতা ও সামঞ্জস্য',
  WAQF_LAND_LEGAL: 'ওয়াকফ ও জমি-সংক্রান্ত আইনি ঝুঁকি',
  MISSING_INFO: 'অপূর্ণ প্লেসহোল্ডার তথ্য',
};

export const AgreementReviewPanelModal: React.FC<AgreementReviewPanelModalProps> = ({
  agreementId,
  draftAgreement,
  agreementTitle,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [review, setReview] = useState<AgreementAiReviewResult | null>(null);

  const runReview = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.aiReviewAgreement({
        agreementId,
        agreement: agreementId ? undefined : draftAgreement,
      });
      setReview(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI চুক্তি পর্যালোচনা সম্পন্ন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreementId]);

  const overallMeta = review ? SEVERITY_META[review.overallRiskLevel] : SEVERITY_META.MEDIUM;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-siliguri">
                AI চুক্তি পর্যালোচনা ও ঝুঁকি শনাক্তকরণ (Contract Review & Risk Detection)
              </h3>
              <p className="text-[11px] text-slate-500 font-tiro truncate max-w-xl">
                {agreementTitle || draftAgreement?.title || 'খসড়া চুক্তিপত্র পর্যালোচনা'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={loading}
              onClick={runReview}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>পুনরায় যাচাই</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-800 font-siliguri">
                চুক্তিপত্রের পক্ষ, প্রতিনিধিত্বের ভিত্তি, কিস্তির গাণিতিক সামঞ্জস্য ও ওয়াকফ/জমি ঝুঁকি যাচাই হচ্ছে...
              </p>
              <p className="text-xs text-slate-500 font-tiro">অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-tiro flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : review ? (
            <>
              {/* Overall Risk & Legal Review Banner */}
              <div className={`p-4 rounded-xl border ${overallMeta.borderClass} ${overallMeta.bgClass} space-y-2`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${overallMeta.dotClass}`} />
                    <span className={`text-sm font-bold font-siliguri ${overallMeta.textClass}`}>
                      সামগ্রিক ঝুঁকির মাত্রা: {overallMeta.labelBn}
                    </span>
                  </div>
                  {review.legalReviewRequired && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 font-siliguri">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Legal Review Required — আইনি / ওয়াকফ পর্যালোচনা আবশ্যক</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-800 font-tiro leading-relaxed">{review.summaryBn}</p>
              </div>

              {/* Arithmetic Consistency Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3">
                <Calculator className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <strong className="font-siliguri text-slate-900">
                      লিখিত মোট মূল্য ও কিস্তির গাণিতিক সামঞ্জস্য যাচাই
                    </strong>
                    {review.mathConsistencyCheck.checked && (
                      <span
                        className={`text-[11px] font-bold font-siliguri ${
                          review.mathConsistencyCheck.isConsistent ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        · {review.mathConsistencyCheck.isConsistent ? 'সামঞ্জস্যপূর্ণ' : 'গরমিল শনাক্ত'}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-tiro">{review.mathConsistencyCheck.noteBn}</p>
                </div>
              </div>

              {/* Missing Placeholders */}
              {review.missingPlaceholders.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                  <p className="text-xs font-bold text-rose-900 font-siliguri">
                    অপূর্ণ প্লেসহোল্ডার শনাক্ত ({review.missingPlaceholders.length}টি):
                  </p>
                  <p className="text-xs text-rose-800 font-tiro">
                    {review.missingPlaceholders.join(' · ')}
                  </p>
                </div>
              )}

              {/* Findings List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 font-siliguri">
                  বিস্তারিত পর্যালোচনা ও পরামর্শসমূহ ({review.findings.length})
                </h4>
                {review.findings.length === 0 ? (
                  <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs text-emerald-900 font-tiro flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>কোনো বড় অসামঞ্জস্যতা শনাক্ত হয়নি। তবুও চূড়ান্ত স্বাক্ষরের পূর্বে নিজ দায়িত্বে সম্পূর্ণ খসড়া পড়ে নিন।</span>
                  </div>
                ) : (
                  review.findings.map((f) => {
                    const m = SEVERITY_META[f.severity] || SEVERITY_META.MEDIUM;
                    return (
                      <div key={f.id} className={`p-3.5 rounded-xl border ${m.borderClass} bg-white space-y-1.5`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${m.dotClass}`} />
                            <h5 className="text-xs font-bold text-slate-900 font-siliguri">{f.titleBn}</h5>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 font-siliguri">
                            {AREA_LABELS_BN[f.area] || f.area} · {m.labelBn}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-tiro leading-relaxed">{f.detailBn}</p>
                        <p className="text-xs text-emerald-900 font-tiro bg-emerald-50/60 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                          <strong className="font-siliguri">পরামর্শ:</strong> {f.suggestionBn}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mandatory Non-Legal-Guarantee Disclaimer */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-tiro leading-relaxed">
                {review.disclaimerBn} <span className="text-slate-400">· মডেল: {review.modelUsed}</span>
              </div>
            </>
          ) : null}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold font-siliguri hover:bg-slate-800"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

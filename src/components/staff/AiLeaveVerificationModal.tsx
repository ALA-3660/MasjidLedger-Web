import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Staff, StaffLeaveRecord, Mosque } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/i18n';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import { OfficialReportSignatures } from '../common/OfficialReportSignatures';

interface AiLeaveVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: (StaffLeaveRecord & { staff?: Staff }) | null;
  currentMosque?: Mosque | null;
  onApproveLeave?: (leaveId: string) => Promise<void>;
  onRejectLeave?: (leaveId: string) => Promise<void>;
}

type LeaveVerifyResult = Awaited<ReturnType<typeof api.verifyStaffLeaveRequestAi>>;

export const AiLeaveVerificationModal: React.FC<AiLeaveVerificationModalProps> = ({
  isOpen,
  onClose,
  leave,
  currentMosque,
  onApproveLeave,
  onRejectLeave,
}) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeaveVerifyResult | null>(null);
  const [editableLetter, setEditableLetter] = useState('');
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [copied, setCopied] = useState(false);

  const runVerification = async (targetLeave: StaffLeaveRecord & { staff?: Staff }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.verifyStaffLeaveRequestAi({
        staffId: targetLeave.staffId || targetLeave.staff?.id || '',
        leaveId: targetLeave.id,
        leaveType: targetLeave.leaveType,
        leaveTypeBn: targetLeave.leaveTypeBn,
        startDate: targetLeave.startDate,
        endDate: targetLeave.endDate,
        daysCount: targetLeave.daysCount || 1,
        reason: targetLeave.reason,
      });
      setResult(data);
      setEditableLetter(data.approvalLetterBodyBn || '');
    } catch (err: any) {
      setError(err?.message || 'AI ছুটি যাচাই করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leave) {
      setResult(null);
      setEditableLetter('');
      setCopied(false);
      runVerification(leave);
    }
  }, [isOpen, leave?.id]);

  if (!isOpen || !leave) return null;

  const getRecommendationStyle = (rec: LeaveVerifyResult['recommendation']) => {
    switch (rec) {
      case 'APPROVE':
        return 'bg-emerald-50 border-emerald-300 text-emerald-900';
      case 'APPROVE_WITH_BACKUP':
        return 'bg-amber-50 border-amber-300 text-amber-900';
      case 'REVIEW_CAREFULLY':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      default:
        return 'bg-rose-50 border-rose-300 text-rose-900';
    }
  };

  const handleCopyLetter = async () => {
    if (!editableLetter.trim()) return;
    try {
      await navigator.clipboard.writeText(editableLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('ক্লিপবোর্ডে কপি করা যায়নি।');
    }
  };

  const handlePrintLetter = () => {
    printElement('printable-ai-leave-letter', {
      title: `ছুটির_মঞ্জুরিপত্র_${leave.staffName}`,
    });
  };

  const handleManualDecision = async (decision: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    try {
      if (decision === 'APPROVE' && onApproveLeave) {
        await onApproveLeave(leave.id);
      } else if (decision === 'REJECT' && onRejectLeave) {
        await onRejectLeave(leave.id);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'ছুটির স্ট্যাটাস হালনাগাদ ব্যর্থ হয়েছে।');
    } finally {
      setActionLoading(false);
    }
  };

  const quotaPercent = result
    ? Math.min(100, Math.round(((result.usedDaysThisYear + result.daysCount) / Math.max(1, result.annualQuotaDays)) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-siliguri">
                AI ছুটি যাচাই ও অনুমোদন সহকারী
              </h3>
              <p className="text-xs text-slate-300 font-siliguri">
                {leave.staffName} ({leave.designationBn}) • {formatDate(leave.startDate, 'bn')} – {formatDate(leave.endDate, 'bn')} ({leave.daysCount} দিন)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => runVerification(leave)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>পুনরায় যাচাই</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {loading && (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="font-bold text-slate-800 font-siliguri">
                একই সময়ে অন্য ইমাম/মুয়াজ্জিনের ছুটি ও বার্ষিক কোটা যাচাই করা হচ্ছে...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && !loading && (
            <>
              {/* AI Recommendation Banner */}
              <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${getRecommendationStyle(result.recommendation)}`}>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] font-bold uppercase opacity-75">AI সুপারিশ (চূড়ান্ত সিদ্ধান্ত অ্যাডমিনের)</div>
                    <div className="text-sm sm:text-base font-bold font-siliguri mt-0.5">
                      {result.recommendationLabelBn}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/80 text-slate-800 font-bold text-[11px] self-start sm:self-center">
                  {leave.leaveTypeBn || leave.leaveType} • {leave.daysCount} দিন
                </span>
              </div>

              {/* Two Core Checks: (ক) Overlap + (খ) Annual Quota */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Check (ক): Overlapping Leave Check */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-900 font-siliguri">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>(ক) একই সময়ে অন্য কর্মীর ছুটি যাচাই</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        result.hasConflict
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {result.hasConflict
                        ? `${result.overlappingLeaves.length} জনের সাথে মিল`
                        : 'সংঘাত নেই'}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed font-siliguri">
                    {result.conflictAnalysisBn}
                  </p>

                  {result.overlappingLeaves.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {result.overlappingLeaves.map((ov, idx) => (
                        <div
                          key={`${ov.staffId}-${idx}`}
                          className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-amber-950 font-siliguri">{ov.staffNameBn}</span>
                            <span className="text-[11px] text-amber-800 ml-1">({ov.designationBn})</span>
                            <div className="text-[10px] text-amber-700">
                              {formatDate(ov.startDate, 'bn')} – {formatDate(ov.endDate, 'bn')}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-amber-800 border border-amber-200">
                            {ov.status === 'APPROVED' ? 'অনুমোদিত' : 'অপেক্ষমাণ'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5 font-siliguri">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>এই তারিখে মসজিদের অন্য কোনো ইমাম, মুয়াজ্জিন বা কর্মীর ছুটি নেই।</span>
                    </div>
                  )}
                </div>

                {/* Check (খ): Annual Leave Quota */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-900 font-siliguri">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>(খ) বার্ষিক ছুটির কোটা ({result.annualQuotaDays} দিন)</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        result.remainingAfterRequest < 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      অবশিষ্ট থাকবে: {result.remainingAfterRequest} দিন
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed font-siliguri">
                    {result.quotaAnalysisBn}
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500">ইতিমধ্যে ভোগকৃত</div>
                      <div className="text-sm font-bold text-slate-900">{result.usedDaysThisYear} দিন</div>
                    </div>
                    <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                      <div className="text-[10px] text-indigo-600">বর্তমান আবেদন</div>
                      <div className="text-sm font-bold text-indigo-900">{result.daysCount} দিন</div>
                    </div>
                    <div
                      className={`p-2 rounded-xl border ${
                        result.remainingAfterRequest < 0
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <div className="text-[10px] text-slate-600">অনুমোদনের পর বাকি</div>
                      <div
                        className={`text-sm font-bold ${
                          result.remainingAfterRequest < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {result.remainingAfterRequest} দিন
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        result.remainingAfterRequest < 0
                          ? 'bg-rose-600'
                          : quotaPercent >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Official Leave Approval Letter Draft */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 font-siliguri">
                      আনুষ্ঠানিক ছুটির মঞ্জুরিপত্র (খসড়া)
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      স্মারক নং: {result.approvalLetterMemoNo}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeLetterhead}
                        onChange={(e) => setIncludeLetterhead(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600"
                      />
                      <span>লেটারহেডসহ প্রিন্ট</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleCopyLetter}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'কপি হয়েছে' : 'কপি'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintLetter}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>মঞ্জুরিপত্র প্রিন্ট</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={8}
                  value={editableLetter}
                  onChange={(e) => setEditableLetter(e.target.value)}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-tiro text-sm leading-relaxed focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Hidden Printable Leave Approval Letter */}
        {result && (
          <div id="printable-ai-leave-letter" className="hidden print:block p-10 bg-white text-slate-900 font-tiro">
            {includeLetterhead ? (
              <MosqueOfficialLetterhead
                mosque={currentMosque}
                documentTitle={result.approvalLetterTitleBn || 'ছুটির মঞ্জুরিপত্র'}
                memoNumber={result.approvalLetterMemoNo}
                dateStr={formatDate(new Date().toISOString().split('T')[0], 'bn')}
              />
            ) : (
              <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
                <h1 className="text-2xl font-bold font-siliguri">
                  {result.approvalLetterTitleBn || 'ছুটির মঞ্জুরিপত্র'}
                </h1>
                <p className="text-xs mt-1 font-mono">স্মারক নং: {result.approvalLetterMemoNo}</p>
              </div>
            )}

            <div className="whitespace-pre-line text-sm leading-7 text-justify">{editableLetter}</div>

            <div className="mt-14">
              <OfficialReportSignatures
                currentMosque={currentMosque}
                preparerTitle="আবেদনকারী / দপ্তর"
                secretaryTitle="সাধারণ সম্পাদক / মোতাওয়াল্লী"
                presidentTitle="সভাপতি"
                showAuditFooter={true}
                auditFooterText="মসজিদ লেজার • কর্মী ছুটি অনুমোদন নথি"
              />
            </div>
          </div>
        )}

        {/* Footer — Manual Admin Approval Controls Only */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>AI স্বয়ংক্রিয়ভাবে ছুটি অনুমোদন করে না; আপনি নিজে যাচাই করে সিদ্ধান্ত নিন।</span>
          </span>

          <div className="flex items-center gap-2">
            {leave.status === 'PENDING' && onApproveLeave && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleManualDecision('APPROVE')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ছুটি অনুমোদন করুন</span>
              </button>
            )}
            {leave.status === 'PENDING' && onRejectLeave && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleManualDecision('REJECT')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 transition"
              >
                <XCircle className="w-4 h-4" />
                <span>প্রত্যাখ্যান</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useCallback } from 'react';
import { Printer, Download, X, Edit3, AlertTriangle, ShieldAlert, Stamp, CheckCircle2 } from 'lucide-react';
import { Mosque } from '../../types';
import { AgreementRecord } from '../../types/agreementTypes';
import {
  AGREEMENT_PARTY_TYPE_LABELS,
  AGREEMENT_SIGNATURE_LIMITATION_BN,
  AGREEMENT_SIGNATURE_METHOD_LABELS,
  AGREEMENT_STATUS_META,
  WRITTEN_PAYMENT_MODE_LABELS,
  isAgreementLockedForDirectEdit,
} from '../../lib/agreementCatalog';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import { printElement } from '../../lib/printUtils';

interface AgreementPrintPreviewProps {
  agreement: AgreementRecord;
  mosque?: Mosque | null;
  inlineMode?: boolean;
  canEdit?: boolean;
  onEdit?: (agreement: AgreementRecord) => void;
  onRunAiReview?: (agreement: AgreementRecord) => void;
  onOpenGovernance?: (agreement: AgreementRecord) => void;
  onClose?: () => void;
}

export const AgreementPrintPreviewModal: React.FC<AgreementPrintPreviewProps> = ({
  agreement,
  mosque,
  inlineMode = false,
  canEdit = false,
  onEdit,
  onRunAiReview,
  onOpenGovernance,
  onClose,
}) => {
  const canvasId = inlineMode ? 'agreement-inline-printable-canvas' : 'agreement-modal-printable-canvas';
  const lockedForEdit = isAgreementLockedForDirectEdit(agreement);
  const currentVersion = agreement.versionNumber || 1;
  const currentVersionSignatures = (agreement.signatures || []).filter(
    (s) => (s.versionNumber || 1) === currentVersion
  );
  const latestApproval = [...(agreement.approvalRecords || [])]
    .reverse()
    .find((a) => a.decision === 'APPROVED');

  const handlePrintOrPdf = useCallback(() => {
    const cleanTitle = (agreement.title || 'চুক্তিপত্র').trim().replace(/[\/\\?%*:|"<>]/g, '_');
    const cleanNo = (agreement.agreementNumber || agreement.id).trim().replace(/[\/\\?%*:|"<>]/g, '_');
    const docTitle = `${mosque?.nameBn || mosque?.name || 'মসজিদ'}_${cleanNo}_${cleanTitle}`;

    printElement(canvasId, {
      title: docTitle,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '12mm 14mm',
      customStyles: `
        @page {
          size: A4 portrait !important;
          margin: 12mm 14mm !important;
        }
        #${canvasId} {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .agreement-avoid-break {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      `,
    });
  }, [agreement, canvasId, mosque]);

  const statusMeta = AGREEMENT_STATUS_META[agreement.status] || AGREEMENT_STATUS_META.DRAFT;
  const cd = agreement.constructionDetails;
  const ld = agreement.landWaqfDetails;
  const wf = agreement.writtenFinancialTerms;

  const documentCanvas = (
    <div
      id={canvasId}
      className="bg-white text-slate-900 w-full max-w-[210mm] mx-auto border border-slate-200 rounded-xl shadow-xs p-6 sm:p-10 space-y-5 font-tiro"
    >
      {/* Official Mosque Letterhead */}
      <MosqueOfficialLetterhead
        mosque={mosque}
        documentTitle={agreement.title}
        subTitle={agreement.categoryNameBn}
        refNumber={agreement.agreementNumber}
        dateStr={agreement.agreementDate}
        variant="standard"
      />

      {/* Agreement Meta Bar */}
      <div className="border-y border-slate-300 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-slate-500 block text-[10px] font-siliguri">চুক্তি নম্বর ও ভার্সন</span>
          <strong className="font-baloo text-slate-900">
            {agreement.agreementNumber} (v{currentVersion}
            {agreement.isAmendment ? ` · সংশোধনী #${agreement.amendmentNumber || 1}` : ''})
          </strong>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] font-siliguri">চুক্তির তারিখ</span>
          <strong className="font-baloo text-slate-900">{agreement.agreementDate}</strong>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] font-siliguri">কার্যকর / মেয়াদ</span>
          <strong className="font-baloo text-slate-900">
            {agreement.effectiveDate || agreement.agreementDate}
            {agreement.expiryDate
              ? ` — ${agreement.expiryDate}`
              : agreement.durationText
              ? ` (${agreement.durationText})`
              : ''}
          </strong>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] font-siliguri">অবস্থা / স্থান</span>
          <strong className="font-siliguri text-slate-900">
            {statusMeta.shortBn}
            {agreement.executionPlace ? ` · ${agreement.executionPlace}` : ''}
          </strong>
        </div>
      </div>

      {/* Closure Reason Notice if Completed/Expired/Terminated/Cancelled */}
      {agreement.closureInfo && (
        <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-[11px] text-slate-800 agreement-avoid-break">
          <strong className="font-siliguri">
            চুক্তি সমাপ্তি / অবসান রেকর্ড ({AGREEMENT_STATUS_META[agreement.closureInfo.action]?.labelBn}):
          </strong>{' '}
          <span>{agreement.closureInfo.reason}</span>
          {agreement.closureInfo.effectiveClosureDate && (
            <span className="font-baloo"> · তারিখ: {agreement.closureInfo.effectiveClosureDate}</span>
          )}
        </div>
      )}

      {/* Official Approval Record Summary */}
      {latestApproval && (
        <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/50 text-[11px] text-emerald-950 agreement-avoid-break flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-siliguri">অনুমোদিত চুক্তি:</strong> অনুমোদনকারী{' '}
            <strong>{latestApproval.approverName}</strong> ({latestApproval.approverRole}) · সময়:{' '}
            <span className="font-baloo">
              {new Date(latestApproval.decidedAt).toLocaleString('bn-BD')}
            </span>
            {latestApproval.committeeResolutionRef
              ? ` · কমিটি রেজুলেশন: ${latestApproval.committeeResolutionRef}`
              : ''}
            {latestApproval.comment ? ` — মন্তব্য: ${latestApproval.comment}` : ''}
          </div>
        </div>
      )}

      {/* Purpose */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1">
          চুক্তির বিষয় ও উদ্দেশ্য
        </h3>
        <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
          {agreement.purpose}
        </p>
      </div>

      {/* Multi-Party & Representatives */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1">
          চুক্তির পক্ষসমূহ ও ক্ষমতাপ্রাপ্ত প্রতিনিধিগণ
        </h3>
        <div className="space-y-2.5">
          {agreement.parties.map((party) => (
            <div key={party.id} className="p-3 rounded-lg border border-slate-300/80 bg-slate-50/40 agreement-avoid-break">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs sm:text-[13px] font-bold text-slate-900 font-siliguri">
                  {party.roleLabel}: {party.name}
                </p>
                <span className="text-[11px] text-slate-600 font-tiro">
                  {AGREEMENT_PARTY_TYPE_LABELS[party.partyType] || party.partyType}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                {party.fatherOrOrgHead ? `পিতা/প্রধান: ${party.fatherOrOrgHead} · ` : ''}
                {party.address ? `ঠিকানা: ${party.address} · ` : ''}
                {party.phone ? `মোবাইল: ${party.phone}` : ''}
                {party.nidOrRegNo ? ` · এনআইডি/রেজি: ${party.nidOrRegNo}` : ''}
              </p>
              {party.representatives.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                  <p className="text-[11px] font-bold text-slate-700 font-siliguri">
                    পক্ষে প্রতিনিধি / স্বাক্ষরকারীগণ:
                  </p>
                  {party.representatives.map((rep, i) => (
                    <p key={rep.id} className="text-[11px] text-slate-700 leading-snug">
                      {i + 1}. <strong>{rep.name}</strong> ({rep.designation})
                      {rep.phone ? ` · মোবাইল: ${rep.phone}` : ''}
                      {rep.authorityBasis ? ` — ক্ষমতার ভিত্তি: ${rep.authorityBasis}` : ''}
                      {rep.isSignatory ? ' [স্বাক্ষরকারী]' : ''}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Construction Details Schedule (when present) */}
      {cd && (
        <div className="space-y-2 agreement-avoid-break">
          <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1">
            নির্মাণ / কাজের পরিমাপ ও কারিগরি বিবরণ
          </h3>
          {cd.workSummary && <p className="text-xs text-slate-800">{cd.workSummary}</p>}
          <table className="w-full text-xs border-collapse border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300 w-1/4">
                  পরিমাপ (দৈর্ঘ্য × প্রস্থ × উচ্চতা)
                </td>
                <td className="p-2 border-r border-slate-300 w-1/4 font-baloo">
                  {[cd.length, cd.width, cd.height].filter(Boolean).join(' × ') || '—'}{' '}
                  {cd.dimensionUnit || ''}
                </td>
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300 w-1/4">
                  মোট পরিমাণ
                </td>
                <td className="p-2 w-1/4 font-baloo">
                  {cd.quantity ? `${cd.quantity} ${cd.quantityUnit || ''}` : '—'}
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">একক দর</td>
                <td className="p-2 border-r border-slate-300">{cd.unitRate || '—'}</td>
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">
                  মোট চুক্তিমূল্য (লিখিত)
                </td>
                <td className="p-2 font-semibold">{cd.totalContractValueText || '—'}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">সময়সীমা / সমাপ্তি</td>
                <td className="p-2 border-r border-slate-300" colSpan={3}>
                  {[cd.timelineDuration, cd.completionDeadline ? `সমাপ্তির তারিখ: ${cd.completionDeadline}` : '']
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </td>
              </tr>
              {cd.materialsResponsibility && (
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">সামগ্রীর দায়িত্ব</td>
                  <td className="p-2" colSpan={3}>{cd.materialsResponsibility}</td>
                </tr>
              )}
              {cd.laborResponsibility && (
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">শ্রমিকের দায়িত্ব</td>
                  <td className="p-2" colSpan={3}>{cd.laborResponsibility}</td>
                </tr>
              )}
              {cd.qualityInspectionTerms && (
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">মান যাচাই</td>
                  <td className="p-2" colSpan={3}>{cd.qualityInspectionTerms}</td>
                </tr>
              )}
              {cd.handoverTerms && (
                <tr>
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">হস্তান্তর শর্ত</td>
                  <td className="p-2" colSpan={3}>{cd.handoverTerms}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Land / Waqf / Road Right Schedule (when present) */}
      {ld && (
        <div className="space-y-2 agreement-avoid-break">
          <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1">
            জমি, ওয়াকফ সম্পত্তি ও রাস্তার তফসিল
          </h3>
          <table className="w-full text-xs border-collapse border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300 w-1/4">মৌজা</td>
                <td className="p-2 border-r border-slate-300 w-1/4">{ld.mouza || '—'}</td>
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300 w-1/4">জে.এল. নম্বর</td>
                <td className="p-2 w-1/4 font-baloo">{ld.jlNumber || '—'}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">খতিয়ান নং</td>
                <td className="p-2 border-r border-slate-300 font-baloo">{ld.khatianNumber || '—'}</td>
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">দাগ নং</td>
                <td className="p-2 font-baloo">{ld.dagNumber || '—'}</td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">জমির পরিমাণ</td>
                <td className="p-2 border-r border-slate-300 font-baloo">
                  {ld.landArea ? `${ld.landArea} ${ld.landAreaUnit || ''}` : '—'}
                </td>
                <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">রাস্তার মাপ (দৈর্ঘ্য × প্রস্থ)</td>
                <td className="p-2 font-baloo">
                  {ld.roadLength || ld.roadWidth
                    ? `${ld.roadLength || '—'} × ${ld.roadWidth || '—'} ${ld.roadUnit || ''}`
                    : '—'}
                </td>
              </tr>
              {ld.proposedPortionDesc && (
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">প্রস্তাবিত অংশ / চৌহদ্দি</td>
                  <td className="p-2" colSpan={3}>{ld.proposedPortionDesc}</td>
                </tr>
              )}
              {ld.partyContributions && (
                <tr>
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">পক্ষসমূহের অবদান</td>
                  <td className="p-2" colSpan={3}>{ld.partyContributions}</td>
                </tr>
              )}
            </tbody>
          </table>

          {ld.waqfLegalReviewRequired && (
            <div className="p-2.5 rounded-lg border border-amber-400 bg-amber-50/70 text-[11px] text-amber-950 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <strong className="font-siliguri">
                  ওয়াকফ / আইনি পর্যালোচনা নোট ({ld.waqfLegalCautionAcknowledged ? 'পর্যালোচনা নিশ্চিত' : 'পর্যালোচনা অপেক্ষমাণ'}):
                </strong>{' '}
                <span>{ld.waqfLegalReviewNote || 'চূড়ান্ত স্বাক্ষরের পূর্বে মূল ওয়াকফ দলিল ও কমিটির রেজুলেশন যাচাই আবশ্যক।'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Written Financial Terms (Strictly Non-Accounting Clause) */}
      {wf && wf.mode !== 'NON_FINANCIAL' && (
        <div className="space-y-2 agreement-avoid-break">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h3 className="text-sm font-bold text-slate-900 font-siliguri">
              লিখিত আর্থিক শর্তাবলি ({WRITTEN_PAYMENT_MODE_LABELS[wf.mode]})
            </h3>
            <span className="text-[10px] text-slate-500 font-tiro">
              * শুধুমাত্র চুক্তিপত্রের লিখিত ধারা (হিসাব খতিয়ান বা ভাউচার নয়)
            </span>
          </div>
          {wf.totalWrittenAmount && (
            <p className="text-xs text-slate-800">
              <strong className="font-siliguri">লিখিত মোট চুক্তিমূল্য:</strong> {wf.totalWrittenAmount}
            </p>
          )}
          {wf.paymentTermsNote && <p className="text-xs text-slate-700">{wf.paymentTermsNote}</p>}

          {wf.schedules.length > 0 && (
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 font-siliguri text-slate-800">
                  <th className="p-2 border-r border-slate-300 text-left">পর্যায় / কিস্তি</th>
                  <th className="p-2 border-r border-slate-300 text-left">শর্ত</th>
                  <th className="p-2 border-r border-slate-300 text-left">সময়সীমা</th>
                  <th className="p-2 text-right">লিখিত অঙ্ক</th>
                </tr>
              </thead>
              <tbody>
                {wf.schedules.map((row) => (
                  <tr key={row.id} className="border-b border-slate-200">
                    <td className="p-2 border-r border-slate-300 font-semibold">{row.stageTitle}</td>
                    <td className="p-2 border-r border-slate-300">{row.condition || '—'}</td>
                    <td className="p-2 border-r border-slate-300">{row.timingOrMilestone || '—'}</td>
                    <td className="p-2 text-right font-baloo font-semibold">{row.writtenAmount || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Clauses */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
            চুক্তির সাধারণ শর্তাবলি
          </h3>
          <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
            {agreement.generalClauses}
          </div>
        </div>

        {agreement.specialClauses && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
              বিশেষ শর্তাবলি
            </h3>
            <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
              {agreement.specialClauses}
            </div>
          </div>
        )}

        {agreement.terminationClause && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
              সমাপ্তি ও বাতিলের শর্তাবলি
            </h3>
            <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
              {agreement.terminationClause}
            </div>
          </div>
        )}

        {agreement.disputeResolutionClause && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
              বিরোধ নিষ্পত্তির শর্তাবলি
            </h3>
            <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
              {agreement.disputeResolutionClause}
            </div>
          </div>
        )}
      </div>

      {/* Attached Documents Reference List */}
      {agreement.attachments && agreement.attachments.length > 0 && (
        <div className="agreement-avoid-break">
          <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
            সংযুক্ত দলিল ও নথিপত্রের তালিকা
          </h3>
          <ul className="list-disc list-inside text-xs text-slate-800 space-y-1">
            {agreement.attachments.map((att) => (
              <li key={att.id}>
                <strong>{att.title}</strong>
                {att.referenceNo ? ` (রেফারেন্স নং: ${att.referenceNo})` : ''}
                {att.notes ? ` — ${att.notes}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Multi-Party Signature Blocks */}
      <div className="pt-6 space-y-6 agreement-avoid-break">
        <p className="text-xs text-slate-700 italic">
          উপরোক্ত সমস্ত শর্তাবলি পাঠ করিয়া ও অর্থ বুঝিয়া সুস্থ মস্তিষ্কে ও স্বেচ্ছায় নিম্নস্বাক্ষরকারী পক্ষগণ ও সাক্ষীগণের উপস্থিতিতে এই চুক্তিপত্রে স্বাক্ষর প্রদান করিলাম।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          {agreement.parties.map((party) => {
            const signatories = party.representatives.filter((r) => r.isSignatory);
            const partySigs = currentVersionSignatures.filter((s) => s.partyId === party.id);
            return (
              <div key={party.id} className="border-t border-slate-400 pt-2.5 space-y-1.5">
                <p className="text-xs font-bold text-slate-900 font-siliguri">
                  {party.roleLabel} এর স্বাক্ষর ও সিল
                </p>
                <p className="text-xs text-slate-800 font-semibold">{party.name}</p>

                {partySigs.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {partySigs.map((rec) => (
                      <div key={rec.id} className="p-2 rounded border border-slate-200 bg-slate-50/50 space-y-1">
                        {rec.signatureImageDataUrl ? (
                          <img
                            src={rec.signatureImageDataUrl}
                            alt={rec.signerName}
                            className="h-10 max-w-[160px] object-contain"
                          />
                        ) : (
                          <p className="text-sm italic font-serif text-slate-900">
                            {rec.typedSignatureText || rec.signerName}
                          </p>
                        )}
                        <p className="text-[11px] font-semibold text-slate-800">
                          {rec.signerName} ({rec.signerDesignation})
                        </p>
                        <p className="text-[10px] text-slate-600">
                          {rec.authorityBasis} · {AGREEMENT_SIGNATURE_METHOD_LABELS[rec.method]}
                          {rec.otpVerified ? ' · OTP যাচাইকৃত' : ''}
                        </p>
                        <p className="text-[10px] text-slate-500 font-baloo">
                          সময়: {new Date(rec.signedAt).toLocaleString('bn-BD')} · v{rec.versionNumber}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : signatories.length > 0 ? (
                  signatories.map((sig) => (
                    <p key={sig.id} className="text-[11px] text-slate-600">
                      প্রতিনিধি: {sig.name} ({sig.designation})
                      {sig.authorityBasis ? ` · ${sig.authorityBasis}` : ''}
                    </p>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500">স্বাক্ষর ও তারিখ: ..........................</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Witnesses Signature Grid */}
        {((agreement.witnesses && agreement.witnesses.length > 0) ||
          (agreement.witnessSignatures && agreement.witnessSignatures.length > 0)) && (
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 font-siliguri mb-3">সাক্ষীগণের স্বাক্ষর</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agreement.witnesses.map((w, idx) => (
                <div key={w.id} className="text-xs text-slate-800 border-b border-dashed border-slate-300 pb-2">
                  <p className="font-semibold">
                    {idx + 1}. {w.name} {w.fatherName ? `(পিতা: ${w.fatherName})` : ''}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {[w.address, w.phone ? `মোবাইল: ${w.phone}` : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ))}
              {(agreement.witnessSignatures || []).map((ws) => (
                <div key={ws.id} className="text-xs text-slate-800 border border-slate-200 rounded p-2 space-y-1">
                  {ws.signatureImageDataUrl ? (
                    <img
                      src={ws.signatureImageDataUrl}
                      alt={ws.witnessName}
                      className="h-9 max-w-[140px] object-contain"
                    />
                  ) : (
                    <p className="text-sm italic font-serif">{ws.typedSignatureText}</p>
                  )}
                  <p className="font-semibold text-[11px]">
                    সাক্ষী: {ws.witnessName} {ws.partySide ? `(${ws.partySide})` : ''}
                  </p>
                  <p className="text-[10px] text-slate-500 font-baloo">
                    {new Date(ws.signedAt).toLocaleString('bn-BD')} · v{ws.versionNumber}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integrity Hash & Electronic Signature Legal Scope Footnote */}
        <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
          {agreement.currentDocumentHash && (
            <p className="font-mono break-all">
              ডকুমেন্ট ইন্টিগ্রিটি হ্যাশ (SHA-256 · v{currentVersion}): {agreement.currentDocumentHash}
            </p>
          )}
          <p className="font-tiro leading-relaxed">{AGREEMENT_SIGNATURE_LIMITATION_BN}</p>
        </div>
      </div>
    </div>
  );

  const actionToolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-900 font-siliguri truncate">
          {agreement.agreementNumber} — {agreement.title}
        </p>
        <p className="text-[11px] text-slate-500 font-tiro">
          বাংলা ইউনিকোড A4 প্রিন্ট ও PDF প্রিভিউ (Save as PDF অপশন দিয়ে সরাসরি PDF সংরক্ষণ করুন)
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {onOpenGovernance && (
          <button
            type="button"
            onClick={() => onOpenGovernance(agreement)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 text-xs font-semibold font-siliguri"
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>অনুমোদন ও স্বাক্ষর</span>
          </button>
        )}
        {onRunAiReview && (
          <button
            type="button"
            onClick={() => onRunAiReview(agreement)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-semibold font-siliguri"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>AI ঝুঁকি পর্যালোচনা</span>
          </button>
        )}
        {canEdit && onEdit && !lockedForEdit && (
          <button
            type="button"
            onClick={() => onEdit(agreement)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>সম্পাদনা</span>
          </button>
        )}
        <button
          type="button"
          onClick={handlePrintOrPdf}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 font-siliguri"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>প্রিন্ট / PDF সংরক্ষণ</span>
        </button>
        <button
          type="button"
          onClick={handlePrintOrPdf}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 font-siliguri"
        >
          <Download className="w-3.5 h-3.5" />
          <span>A4 PDF</span>
        </button>
        {!inlineMode && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  if (inlineMode) {
    return (
      <div className="space-y-4">
        {actionToolbar}
        {documentCanvas}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 overflow-y-auto p-3 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-3">
        {actionToolbar}
        {documentCanvas}
      </div>
    </div>
  );
};

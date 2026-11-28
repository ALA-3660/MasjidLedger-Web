import React, { useCallback, useMemo, useState } from 'react';
import {
  Printer,
  Download,
  X,
  Edit3,
  AlertTriangle,
  ShieldAlert,
  Stamp,
  CheckCircle2,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from 'lucide-react';
import { Mosque } from '../../types';
import { AgreementRecord, AgreementWitness } from '../../types/agreementTypes';
import {
  AGREEMENT_PARTY_TYPE_LABELS,
  AGREEMENT_SIGNATURE_METHOD_LABELS,
  AGREEMENT_STATUS_META,
  WRITTEN_PAYMENT_MODE_LABELS,
  isAgreementLockedForDirectEdit,
} from '../../lib/agreementCatalog';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import { printElement } from '../../lib/printUtils';
import { toBanglaDigits } from '../../lib/banglaDigits';

type AgreementPaperPreset = 'A4' | 'LEGAL' | 'STAMP_PAPER' | 'CARTRIDGE' | 'CUSTOM';
type AgreementMarginPreset = 'NORMAL' | 'NARROW' | 'WIDE' | 'STAMP' | 'CUSTOM';
type MarginUnit = 'in' | 'mm';

interface PaperPresetMeta {
  labelBn: string;
  shortBn: string;
  widthIn: number;
  heightIn: number;
  hintBn: string;
}

const PAPER_PRESETS: Record<AgreementPaperPreset, PaperPresetMeta> = {
  A4: {
    labelBn: 'A4 (8.27" × 11.69")',
    shortBn: 'A4',
    widthIn: 8.27,
    heightIn: 11.69,
    hintBn: 'আন্তর্জাতিক স্ট্যান্ডার্ড A4 (২১০ × ২৯৭ মিমি)',
  },
  LEGAL: {
    labelBn: 'লিগ্যাল পেইজ (8.5" × 14")',
    shortBn: 'Legal (8.5×14")',
    widthIn: 8.5,
    heightIn: 14,
    hintBn: 'বাংলাদেশি দলিল ও দাপ্তরিক লিগ্যাল পেইজ (৮.৫ × ১৪ ইঞ্চি)',
  },
  STAMP_PAPER: {
    labelBn: 'নন-জুডিশিয়াল স্ট্যাম্প (8.5" × 13")',
    shortBn: 'স্ট্যাম্প (8.5×13")',
    widthIn: 8.5,
    heightIn: 13,
    hintBn: 'নন-জুডিশিয়াল স্ট্যাম্প পেপার (প্রায় ৮.৫ × ১৩ ইঞ্চি — উপরের স্ট্যাম্পের জন্য মার্জিন সমন্বয় করুন)',
  },
  CARTRIDGE: {
    labelBn: 'কার্টিজ পেপার (20" × 30")',
    shortBn: 'কার্টিজ (20×30")',
    widthIn: 20,
    heightIn: 30,
    hintBn: 'কার্টিজ পেপার (সাধারণত ২০ × ৩০ ইঞ্চি; প্রয়োজনে নিচে প্রস্থ-উচ্চতা পরিবর্তন করা যাবে)',
  },
  CUSTOM: {
    labelBn: 'কাস্টম পেপার সাইজ',
    shortBn: 'কাস্টম সাইজ',
    widthIn: 8.5,
    heightIn: 13,
    hintBn: 'যেকোনো কাস্টম প্রস্থ ও উচ্চতা ইঞ্চিতে নির্ধারণ করুন',
  },
};

interface MarginValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const MARGIN_PRESETS_IN: Record<Exclude<AgreementMarginPreset, 'CUSTOM'>, { labelBn: string; values: MarginValues }> = {
  NORMAL: {
    labelBn: 'সাধারণ মার্জিন (0.5")',
    values: { top: 0.5, right: 0.55, bottom: 0.5, left: 0.55 },
  },
  NARROW: {
    labelBn: 'কম মার্জিন (0.35")',
    values: { top: 0.35, right: 0.35, bottom: 0.35, left: 0.35 },
  },
  WIDE: {
    labelBn: 'দলিল / বড় মার্জিন (1.0")',
    values: { top: 1.0, right: 0.8, bottom: 0.85, left: 1.0 },
  },
  STAMP: {
    labelBn: 'স্ট্যাম্প পেপার (উপরে 3.2")',
    values: { top: 3.2, right: 0.75, bottom: 0.75, left: 0.85 },
  },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampDim(val: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

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
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [padTopMm, setPadTopMm] = useState<number>(42);

  // Paper size, orientation & 4-side margin controls
  const [paperPreset, setPaperPreset] = useState<AgreementPaperPreset>('A4');
  const [paperWidthIn, setPaperWidthIn] = useState<number>(8.27);
  const [paperHeightIn, setPaperHeightIn] = useState<number>(11.69);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const [marginPreset, setMarginPreset] = useState<AgreementMarginPreset>('NORMAL');
  const [marginUnit, setMarginUnit] = useState<MarginUnit>('in');
  const [marginsIn, setMarginsIn] = useState<MarginValues>(MARGIN_PRESETS_IN.NORMAL.values);
  const [showCustomPageSettings, setShowCustomPageSettings] = useState<boolean>(false);

  const canvasId = inlineMode ? 'agreement-inline-printable-canvas' : 'agreement-modal-printable-canvas';
  const lockedForEdit = isAgreementLockedForDirectEdit(agreement);
  const currentVersion = agreement.versionNumber || 1;
  const currentVersionSignatures = (agreement.signatures || []).filter(
    (s) => (s.versionNumber || 1) === currentVersion
  );
  const latestApproval = [...(agreement.approvalRecords || [])]
    .reverse()
    .find((a) => a.decision === 'APPROVED');

  const handlePaperPresetChange = (nextPreset: AgreementPaperPreset) => {
    setPaperPreset(nextPreset);
    const meta = PAPER_PRESETS[nextPreset];
    setPaperWidthIn(meta.widthIn);
    setPaperHeightIn(meta.heightIn);

    if (nextPreset === 'STAMP_PAPER') {
      // Non-judicial stamp papers have pre-printed stamp headers on page 1
      setIncludeLetterhead(false);
      setPadTopMm(0);
      setMarginPreset('STAMP');
      setMarginsIn(MARGIN_PRESETS_IN.STAMP.values);
      setShowCustomPageSettings(true);
    } else if (nextPreset === 'CARTRIDGE' || nextPreset === 'CUSTOM') {
      setShowCustomPageSettings(true);
    }
  };

  const handleMarginPresetChange = (nextMargin: AgreementMarginPreset) => {
    setMarginPreset(nextMargin);
    if (nextMargin === 'CUSTOM') {
      setShowCustomPageSettings(true);
    } else {
      setMarginsIn(MARGIN_PRESETS_IN[nextMargin].values);
    }
  };

  const handleMarginSideChange = (side: keyof MarginValues, rawVal: number) => {
    const safeVal = Number.isFinite(rawVal) ? Math.max(0, rawVal) : 0;
    const inches = marginUnit === 'mm' ? safeVal / 25.4 : safeVal;
    const clamped = clampDim(inches, 0, 8, 0.5);
    setMarginPreset('CUSTOM');
    setMarginsIn((prev) => ({ ...prev, [side]: round2(clamped) }));
  };

  const displayMarginVal = (inches: number) =>
    marginUnit === 'mm' ? Math.round(inches * 25.4) : round2(inches);

  const effectiveDimensionsIn = useMemo(() => {
    const w = clampDim(paperWidthIn, 4, 40, 8.27);
    const h = clampDim(paperHeightIn, 5, 50, 11.69);
    return orientation === 'landscape' ? { widthIn: h, heightIn: w } : { widthIn: w, heightIn: h };
  }, [paperWidthIn, paperHeightIn, orientation]);

  // Guarantee enough bottom margin in print so centered "চলমান পাতা- ১, ২, ৩" is never clipped
  const printMarginCss = useMemo(
    () =>
      `${round2(marginsIn.top)}in ${round2(marginsIn.right)}in ${round2(
        Math.max(marginsIn.bottom, 0.58)
      )}in ${round2(marginsIn.left)}in`,
    [marginsIn]
  );

  const pageSizeCss = useMemo(() => {
    if (paperPreset === 'A4') return `A4 ${orientation}`;
    if (paperPreset === 'LEGAL') return `legal ${orientation}`;
    return `${round2(effectiveDimensionsIn.widthIn)}in ${round2(effectiveDimensionsIn.heightIn)}in`;
  }, [paperPreset, orientation, effectiveDimensionsIn]);

  // Screen preview style reflecting chosen paper width & margins (overridden to 0 padding in print so @page margins aren't doubled)
  const previewCanvasStyle = useMemo<React.CSSProperties>(() => {
    // Cap visual preview max-width nicely for huge Cartridge sheets while preserving proportional width for A4/Legal/Stamp
    const widthCss = `${Math.min(effectiveDimensionsIn.widthIn, 11.5)}in`;
    const padTop = `${Math.min(marginsIn.top, 3.8)}in`;
    const padRight = `${Math.min(marginsIn.right, 1.8)}in`;
    const padBottom = `${Math.min(marginsIn.bottom, 2.2)}in`;
    const padLeft = `${Math.min(marginsIn.left, 1.8)}in`;
    return {
      maxWidth: widthCss,
      paddingTop: padTop,
      paddingRight: padRight,
      paddingBottom: padBottom,
      paddingLeft: padLeft,
    };
  }, [effectiveDimensionsIn.widthIn, marginsIn]);

  const handlePrintOrPdf = useCallback(() => {
    const cleanTitle = (agreement.title || 'চুক্তিপত্র').trim().replace(/[\/\\?%*:|"<>]/g, '_');
    const cleanNo = (agreement.agreementNumber || agreement.id).trim().replace(/[\/\\?%*:|"<>]/g, '_');
    const docTitle = `${mosque?.nameBn || mosque?.name || 'মসজিদ'}_${cleanNo}_${cleanTitle}`;

    printElement(canvasId, {
      title: docTitle,
      pageSize:
        paperPreset === 'A4'
          ? 'A4'
          : paperPreset === 'LEGAL'
          ? 'Legal'
          : paperPreset === 'STAMP_PAPER'
          ? 'NonJudicialStamp'
          : paperPreset === 'CARTRIDGE'
          ? 'Cartridge'
          : 'Custom',
      customPageSizeCss: pageSizeCss,
      pageOrientation: orientation,
      margin: printMarginCss,
      customStyles: `
        @page {
          size: ${pageSizeCss} !important;
          margin: ${printMarginCss} !important;
          @top-left { content: none; }
          @top-center { content: none; }
          @top-right { content: none; }
          @bottom-left { content: none; }
          @bottom-right { content: none; }
          @bottom-center {
            content: "চলমান পাতা- " counter(page, bengali);
            font-family: 'Hind Siliguri', 'Baloo Da 2', 'Tiro Bangla', sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: #334155;
            vertical-align: middle;
            padding-top: 4px;
          }
        }
        #${canvasId} {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        table.agreement-print-sheet {
          width: 100% !important;
          border-collapse: collapse !important;
          border: none !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        table.agreement-print-sheet > thead.agreement-print-thead {
          display: table-header-group !important;
        }
        table.agreement-print-sheet > thead.agreement-print-thead > tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        table.agreement-print-sheet > thead.agreement-print-thead > tr > td.agreement-print-header-cell {
          border: none !important;
          padding: 0 0 10px 0 !important;
          vertical-align: top !important;
          text-align: left !important;
          white-space: normal !important;
          max-width: none !important;
        }
        table.agreement-print-sheet > tbody.agreement-print-tbody > tr {
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        table.agreement-print-sheet > tbody.agreement-print-tbody > tr > td.agreement-print-body-cell {
          border: none !important;
          padding: 0 !important;
          vertical-align: top !important;
          text-align: left !important;
          white-space: normal !important;
          max-width: none !important;
        }
        .agreement-avoid-break {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        .agreement-tiro-body {
          font-family: 'Tiro Bangla', serif !important;
          font-size: 12.5px !important;
        }
        .agreement-justify {
          text-align: justify !important;
          text-justify: inter-word;
        }
        .agreement-main-heading {
          font-size: 24px !important;
          line-height: 1.35 !important;
        }
        .agreement-pad-guide-label {
          display: none !important;
        }
        .agreement-pad-spacer {
          display: block !important;
          height: ${padTopMm}mm !important;
          min-height: ${padTopMm}mm !important;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }
      `,
    });
  }, [agreement, canvasId, mosque, orientation, padTopMm, pageSizeCss, paperPreset, printMarginCss]);

  const statusMeta = AGREEMENT_STATUS_META[agreement.status] || AGREEMENT_STATUS_META.DRAFT;
  const cd = agreement.constructionDetails;
  const ld = agreement.landWaqfDetails;
  const wf = agreement.writtenFinancialTerms;

  const documentCanvas = (
    <div
      id={canvasId}
      style={previewCanvasStyle}
      className="bg-white text-slate-900 w-full mx-auto border border-slate-200 rounded-xl shadow-xs font-tiro text-[12.5px] transition-all"
    >
      <table className="agreement-print-sheet w-full border-collapse">
        {/* Repeating Header on EVERY Printed Page: Full Letterhead OR Reserved Blank Pad Space */}
        {(includeLetterhead || padTopMm > 0) && (
          <thead className="agreement-print-thead">
            <tr>
              <td className="agreement-print-header-cell align-top p-0 pb-3 border-0">
                {includeLetterhead ? (
                  <div className="space-y-1">
                    <MosqueOfficialLetterhead mosque={mosque} variant="standard" className="mb-0" />
                    <p className="text-[10px] text-emerald-700/80 text-right font-siliguri print:hidden">
                      প্রতিটি পৃষ্ঠায় এই লেটারহেড স্বয়ংক্রিয়ভাবে প্রিন্ট হবে
                    </p>
                  </div>
                ) : (
                  <div
                    className="agreement-pad-spacer w-full rounded-lg border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-center text-center px-4 print:border-none print:bg-transparent"
                    style={{ height: `${padTopMm}mm` }}
                  >
                    <span className="agreement-pad-guide-label text-[11px] text-slate-400 font-siliguri print:hidden">
                      প্রতিটি পৃষ্ঠায় মসজিদের ছাপানো প্যাডের লেটারহেডের জায়গা খালি থাকবে ({padTopMm}mm) — প্রিন্টে এই লেখা দেখাবে না
                    </span>
                  </div>
                )}
              </td>
            </tr>
          </thead>
        )}

        <tbody className="agreement-print-tbody">
          <tr>
            <td className="agreement-print-body-cell align-top p-0 border-0">
              <div className="space-y-5">
      {/* Ref No (Left) & Date (Right) above the Main Heading */}
      <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px] text-slate-900 font-siliguri pt-1">
        <div>
          <span className="font-bold">স্মারক নং:</span>{' '}
          <span className="font-baloo font-semibold">{agreement.agreementNumber}</span>
        </div>
        <div className="text-right">
          <span className="font-bold">তারিখ:</span>{' '}
          <span className="font-baloo font-semibold">{agreement.agreementDate}</span>
        </div>
      </div>

      {/* Large Centered Main Document Heading */}
      <div className="text-center pt-1 pb-2">
        <h2 className="agreement-main-heading text-2xl sm:text-[28px] font-black text-slate-900 font-siliguri leading-snug tracking-tight inline-block border-b-2 border-slate-800 pb-1.5 px-4">
          {agreement.title}
          {agreement.categoryNameBn ? ` (${agreement.categoryNameBn})` : ''}
        </h2>
      </div>

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
        <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 agreement-avoid-break">
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
        <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/50 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-emerald-950 agreement-avoid-break flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-1" />
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
        <p className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 leading-relaxed whitespace-pre-line">
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
                <span className="text-[12.5px] text-slate-600 font-tiro agreement-tiro-body">
                  {AGREEMENT_PARTY_TYPE_LABELS[party.partyType] || party.partyType}
                </span>
              </div>
              <p className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-700 mt-1 leading-relaxed">
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
                    <p key={rep.id} className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-700 leading-snug">
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
          {cd.workSummary && (
            <p className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 leading-relaxed">
              {cd.workSummary}
            </p>
          )}
          <table className="w-full font-tiro text-[12.5px] agreement-tiro-body border-collapse border border-slate-300">
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
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">নির্মাণ সামগ্রীর দায়িত্ব</td>
                  <td className="p-2 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify leading-relaxed" colSpan={3}>{cd.materialsResponsibility}</td>
                </tr>
              )}
              {cd.laborResponsibility && (
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">শ্রমিকের দায়িত্ব</td>
                  <td className="p-2 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify leading-relaxed" colSpan={3}>{cd.laborResponsibility}</td>
                </tr>
              )}
              {cd.qualityInspectionTerms && (
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">মান যাচাই</td>
                  <td className="p-2 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify leading-relaxed" colSpan={3}>{cd.qualityInspectionTerms}</td>
                </tr>
              )}
              {cd.handoverTerms && (
                <tr>
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">হস্তান্তর শর্ত</td>
                  <td className="p-2 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify leading-relaxed" colSpan={3}>{cd.handoverTerms}</td>
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
          <table className="w-full font-tiro text-[12.5px] agreement-tiro-body border-collapse border border-slate-300">
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
                  <td className="p-2 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify leading-relaxed" colSpan={3}>{ld.proposedPortionDesc}</td>
                </tr>
              )}
              {ld.partyContributions && (
                <tr>
                  <td className="p-2 font-siliguri font-semibold bg-slate-50 border-r border-slate-300">পক্ষসমূহের অবদান</td>
                  <td className="p-2 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify leading-relaxed" colSpan={3}>{ld.partyContributions}</td>
                </tr>
              )}
            </tbody>
          </table>

          {ld.waqfLegalReviewRequired && (
            <div className="p-2.5 rounded-lg border border-amber-400 bg-amber-50/70 font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-amber-950 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 mt-1 shrink-0" />
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
            <p className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800">
              <strong className="font-siliguri">লিখিত মোট চুক্তিমূল্য:</strong> {wf.totalWrittenAmount}
            </p>
          )}
          {wf.paymentTermsNote && (
            <p className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-700 leading-relaxed">
              {wf.paymentTermsNote}
            </p>
          )}

          {wf.schedules.length > 0 && (
            <table className="w-full font-tiro text-[12.5px] agreement-tiro-body border-collapse border border-slate-300">
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
                    <td className="p-2 border-r border-slate-300 agreement-justify text-justify">{row.condition || '—'}</td>
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
          <div className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 leading-relaxed whitespace-pre-line">
            {agreement.generalClauses}
          </div>
        </div>

        {agreement.specialClauses && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
              বিশেষ শর্তাবলি
            </h3>
            <div className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 leading-relaxed whitespace-pre-line">
              {agreement.specialClauses}
            </div>
          </div>
        )}

        {agreement.terminationClause && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
              সমাপ্তি ও বাতিলের শর্তাবলি
            </h3>
            <div className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 leading-relaxed whitespace-pre-line">
              {agreement.terminationClause}
            </div>
          </div>
        )}

        {agreement.disputeResolutionClause && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-siliguri border-b border-slate-200 pb-1 mb-1.5">
              বিরোধ নিষ্পত্তির শর্তাবলি
            </h3>
            <div className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 leading-relaxed whitespace-pre-line">
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
          <ul className="list-disc list-inside font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-800 space-y-1">
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
      <div className="pt-6 space-y-6">
        <p className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify text-slate-700 italic leading-relaxed">
          উপরোক্ত সমস্ত শর্তাবলি পাঠ করিয়া ও অর্থ বুঝিয়া সুস্থ মস্তিষ্কে ও স্বেচ্ছায় নিম্নস্বাক্ষরকারী পক্ষগণ ও সাক্ষীগণের উপস্থিতিতে এই চুক্তিপত্রে স্বাক্ষর প্রদান করিলাম।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-5 pt-2">
          {agreement.parties.map((party) => {
            const signatories = party.representatives.filter((r) => r.isSignatory);
            const partySigs = currentVersionSignatures.filter((s) => s.partyId === party.id);
            return (
              <div
                key={party.id}
                className="border border-slate-300 rounded-lg p-3 space-y-2 bg-white agreement-avoid-break"
              >
                <div className="border-b border-slate-200 pb-1.5">
                  <p className="text-xs font-bold text-slate-900 font-siliguri">
                    {party.roleLabel} এর স্বাক্ষর ও সিল
                  </p>
                  <p className="text-xs text-slate-800 font-semibold">{party.name}</p>
                </div>

                {signatories.length > 0 && (
                  <div className="space-y-0.5">
                    {signatories.map((sig) => (
                      <p key={sig.id} className="text-[11px] text-slate-600">
                        প্রতিনিধি: {sig.name} ({sig.designation})
                        {sig.authorityBasis ? ` · ${sig.authorityBasis}` : ''}
                      </p>
                    ))}
                  </div>
                )}

                {partySigs.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <p className="text-[10px] font-bold text-emerald-800 font-siliguri">
                      ডিজিটাল / ইলেকট্রনিক স্বাক্ষর:
                    </p>
                    {partySigs.map((rec) => (
                      <div key={rec.id} className="p-2 rounded border border-slate-200 bg-slate-50/70 space-y-0.5">
                        {rec.signatureImageDataUrl ? (
                          <img
                            src={rec.signatureImageDataUrl}
                            alt={rec.signerName}
                            className="h-9 max-w-[150px] object-contain"
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
                          সময়: {new Date(rec.signedAt).toLocaleString('bn-BD')} · v{toBanglaDigits(rec.versionNumber)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dedicated Handwritten Signature Box — ALWAYS shown */}
                <div className="pt-1">
                  <div className="h-12 rounded border border-dashed border-slate-400 bg-white flex items-end justify-between px-2.5 pb-1.5">
                    <span className="text-[10px] text-slate-500 font-siliguri">হাতে কলমে স্বাক্ষর ও সিল</span>
                    <span className="text-[10px] text-slate-500 font-tiro">তারিখ: ...........................</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Witnesses Signature Grid — Minimum 3 Default Slots + Handwritten Signature Box */}
        {(() => {
          const savedWitnesses = agreement.witnesses || [];
          const witnessSlots: AgreementWitness[] = Array.from(
            { length: Math.max(3, savedWitnesses.length) },
            (_, idx) =>
              savedWitnesses[idx] || {
                id: `default-wit-${idx + 1}`,
                name: '',
                fatherName: '',
                address: '',
                phone: '',
                partySide: '',
              }
          );

          const allWitnessSigs = agreement.witnessSignatures || [];
          const matchedSigIds = new Set<string>();
          const slotMatches = witnessSlots.map((w) => {
            const matched = allWitnessSigs.filter((ws) => {
              if (matchedSigIds.has(ws.id)) return false;
              if (ws.witnessId && ws.witnessId === w.id) return true;
              const wName = (w.name || '').trim();
              if (wName && ws.witnessName.trim() === wName) return true;
              return false;
            });
            matched.forEach((m) => matchedSigIds.add(m.id));
            return matched;
          });
          const extraDigitalWitnessSigs = allWitnessSigs.filter((ws) => !matchedSigIds.has(ws.id));

          return (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 font-siliguri">
                সাক্ষীগণের তথ্য ও স্বাক্ষর (ডিজিটাল ও হাতে কলমে স্বাক্ষর)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3.5">
                {witnessSlots.map((w, idx) => {
                  const matchedSigs = slotMatches[idx] || [];
                  const idxBn = toBanglaDigits(idx + 1);
                  const hasName = Boolean(w.name && w.name.trim());
                  const hasFather = Boolean(w.fatherName && w.fatherName.trim());
                  const hasAddress = Boolean(w.address && w.address.trim());
                  const hasPhone = Boolean(w.phone && w.phone.trim());
                  return (
                    <div
                      key={w.id || idx}
                      className="rounded-lg border border-slate-300 bg-white p-2.5 space-y-1.5 text-[11px] text-slate-800 agreement-avoid-break"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-900 font-siliguri">
                          {idxBn} নং সাক্ষী
                        </span>
                        {w.partySide ? (
                          <span className="text-[10px] text-slate-500 font-tiro">({w.partySide})</span>
                        ) : null}
                      </div>

                      <div className="space-y-1 leading-snug">
                        <p className="flex items-baseline gap-1">
                          <span className="font-semibold text-slate-700 shrink-0">নাম:</span>
                          {hasName ? (
                            <span className="font-semibold text-slate-900">{w.name}</span>
                          ) : (
                            <span className="flex-1 border-b border-dotted border-slate-400 h-3.5" />
                          )}
                        </p>
                        <p className="flex items-baseline gap-1">
                          <span className="font-semibold text-slate-700 shrink-0">পিতা:</span>
                          {hasFather ? (
                            <span>{w.fatherName}</span>
                          ) : (
                            <span className="flex-1 border-b border-dotted border-slate-400 h-3.5" />
                          )}
                        </p>
                        <p className="flex items-baseline gap-1">
                          <span className="font-semibold text-slate-700 shrink-0">ঠিকানা:</span>
                          {hasAddress ? (
                            <span>{w.address}</span>
                          ) : (
                            <span className="flex-1 border-b border-dotted border-slate-400 h-3.5" />
                          )}
                        </p>
                        <p className="flex items-baseline gap-1">
                          <span className="font-semibold text-slate-700 shrink-0">মোবাইল নং:</span>
                          {hasPhone ? (
                            <span className="font-baloo">{toBanglaDigits(w.phone)}</span>
                          ) : (
                            <span className="flex-1 border-b border-dotted border-slate-400 h-3.5" />
                          )}
                        </p>
                      </div>

                      {matchedSigs.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <p className="text-[10px] font-bold text-emerald-800 font-siliguri">
                            ডিজিটাল স্বাক্ষর:
                          </p>
                          {matchedSigs.map((ws) => (
                            <div key={ws.id} className="p-1.5 rounded border border-slate-200 bg-slate-50/70 space-y-0.5">
                              {ws.signatureImageDataUrl ? (
                                <img
                                  src={ws.signatureImageDataUrl}
                                  alt={ws.witnessName}
                                  className="h-8 max-w-[130px] object-contain"
                                />
                              ) : (
                                <p className="text-xs italic font-serif text-slate-900">{ws.typedSignatureText}</p>
                              )}
                              <p className="text-[9px] text-slate-500 font-baloo">
                                {new Date(ws.signedAt).toLocaleString('bn-BD')} · v{toBanglaDigits(ws.versionNumber)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dedicated Handwritten Witness Signature Box — ALWAYS shown */}
                      <div className="pt-1">
                        <div className="h-10 rounded border border-dashed border-slate-400 bg-white flex items-end justify-between px-2 pb-1">
                          <span className="text-[10px] text-slate-500 font-siliguri">হাতে কলমে স্বাক্ষর</span>
                          <span className="text-[10px] text-slate-500 font-tiro">তারিখ: ..................</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {extraDigitalWitnessSigs.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 font-siliguri">
                    অতিরিক্ত ডিজিটাল সাক্ষী স্বাক্ষর:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3.5">
                    {extraDigitalWitnessSigs.map((ws) => (
                      <div
                        key={ws.id}
                        className="text-xs text-slate-800 border border-slate-300 rounded-lg p-2.5 space-y-1.5 bg-white agreement-avoid-break"
                      >
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
                        {(ws.fatherName || ws.address || ws.phone) && (
                          <p className="text-[10px] text-slate-600">
                            {[
                              ws.fatherName ? `পিতা: ${ws.fatherName}` : '',
                              ws.address || '',
                              ws.phone ? `মোবাইল: ${toBanglaDigits(ws.phone)}` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 font-baloo">
                          {new Date(ws.signedAt).toLocaleString('bn-BD')} · v{toBanglaDigits(ws.versionNumber)}
                        </p>
                        <div className="h-9 rounded border border-dashed border-slate-400 bg-white flex items-end justify-between px-2 pb-1">
                          <span className="text-[10px] text-slate-500 font-siliguri">হাতে কলমে স্বাক্ষর</span>
                          <span className="text-[10px] text-slate-500 font-tiro">তারিখ: ..................</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Mosque Committee Official 3-Column Bottom Signatures */}
        <div className="pt-6 border-t border-slate-300 agreement-avoid-break">
          <p className="text-xs sm:text-[13px] font-bold text-slate-900 font-siliguri mb-12">
            মসজিদ কমিটির পক্ষে-
          </p>
          <div className="grid grid-cols-3 gap-6 text-center pt-4">
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[165px] border-t border-slate-700 pt-1.5">
                <p className="text-xs sm:text-[13px] font-bold text-slate-900 font-siliguri">
                  অর্থ সম্পাদক
                </p>
                <p className="text-[11px] text-slate-600 font-tiro mt-0.5">নাম ও স্বাক্ষর</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[165px] border-t border-slate-700 pt-1.5">
                <p className="text-xs sm:text-[13px] font-bold text-slate-900 font-siliguri">
                  সেক্রেটারী/ মোতাওয়াল্লী
                </p>
                <p className="text-[11px] text-slate-600 font-tiro mt-0.5">নাম ও স্বাক্ষর</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[165px] border-t border-slate-700 pt-1.5">
                <p className="text-xs sm:text-[13px] font-bold text-slate-900 font-siliguri">
                  সভাপতি
                </p>
                <p className="text-[11px] text-slate-600 font-tiro mt-0.5">নাম ও স্বাক্ষর</p>
              </div>
            </div>
          </div>
        </div>

        {/* Official Legal Declaration Footnote */}
        <div className="pt-3 border-t border-slate-200 text-slate-600">
          <p className="font-tiro text-[12.5px] agreement-tiro-body agreement-justify text-justify leading-relaxed">
            <span className="font-bold text-slate-800 font-siliguri">আইনগত ঘোষণা:</span>{' '}
            এই চুক্তিপত্র উভয় পক্ষের স্বাক্ষর ও সাক্ষীদের উপস্থিতিতে সম্পাদিত একটি পারস্পরিক চুক্তি, যা বাংলাদেশের প্রচলিত আইন অনুযায়ী কার্যকর হবে।
          </p>
        </div>

        {/* Screen-only Preview Indicator of Centered Bottom Page Number (in print, @page @bottom-center dynamically renders চলমান পাতা- ১, ২, ৩...) */}
        <div className="pt-4 mt-2 border-t border-dashed border-slate-200 text-center print:hidden">
          <p className="text-[11px] font-bold text-slate-700 font-siliguri">
            চলমান পাতা- ১
          </p>
          <p className="text-[10px] text-slate-400 font-tiro mt-0.5">
            প্রিন্ট/PDF কপিতে প্রতিটি পৃষ্ঠার নিচে মাঝখানে “চলমান পাতা- ১, ২, ৩...” স্বয়ংক্রিয়ভাবে প্রিন্ট হবে
          </p>
        </div>
      </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const actionToolbar = (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2.5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 font-siliguri truncate">
            {agreement.agreementNumber} — {agreement.title}
          </p>
          <p className="text-[11px] text-slate-500 font-tiro">
            বাংলা ইউনিকোড A4 প্রিন্ট ও PDF প্রিভিউ (মসজিদের প্যাডে বা লেটারহেডসহ প্রিন্ট করুন)
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
          {!inlineMode && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Print Format, Paper Size, Margin & Letterhead Toggle Row */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Letterhead Checkbox */}
          <label
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold font-siliguri cursor-pointer select-none transition-colors ${
              includeLetterhead
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="টিক মার্ক দেওয়া থাকলে লেটারহেডসহ প্রিন্ট হবে, আনচেক থাকলে লেটারহেড ছাড়া মসজিদের প্যাডে প্রিন্ট হবে"
          >
            <input
              type="checkbox"
              checked={includeLetterhead}
              onChange={(e) => {
                const checked = e.target.checked;
                setIncludeLetterhead(checked);
                if (!checked && paperPreset !== 'STAMP_PAPER' && padTopMm === 0) {
                  setPadTopMm(42);
                }
              }}
              className="sr-only"
            />
            {includeLetterhead ? (
              <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span>{includeLetterhead ? 'প্রতি পৃষ্ঠায় লেটারহেডসহ' : 'লেটারহেড ছাড়া (প্রতি পৃষ্ঠায় প্যাড ফাঁকা)'}</span>
          </label>

          {/* Paper Size Selector */}
          <select
            value={paperPreset}
            onChange={(e) => handlePaperPresetChange(e.target.value as AgreementPaperPreset)}
            title="পেপার সাইজ নির্বাচন করুন"
            className="px-2.5 py-1.5 text-xs font-siliguri font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            {(Object.keys(PAPER_PRESETS) as AgreementPaperPreset[]).map((key) => (
              <option key={key} value={key}>
                {PAPER_PRESETS[key].labelBn}
              </option>
            ))}
          </select>

          {/* Margin Preset Selector */}
          <select
            value={marginPreset}
            onChange={(e) => handleMarginPresetChange(e.target.value as AgreementMarginPreset)}
            title="পেইজ মার্জিন নির্বাচন করুন"
            className="px-2.5 py-1.5 text-xs font-siliguri font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-emerald-500"
          >
            {(Object.keys(MARGIN_PRESETS_IN) as Array<Exclude<AgreementMarginPreset, 'CUSTOM'>>).map(
              (key) => (
                <option key={key} value={key}>
                  {MARGIN_PRESETS_IN[key].labelBn}
                </option>
              )
            )}
            <option value="CUSTOM">কাস্টম মার্জিন</option>
          </select>

          {/* Toggle Custom Margin & Paper Dimensions Panel */}
          <button
            type="button"
            onClick={() => setShowCustomPageSettings((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold font-siliguri transition-colors ${
              showCustomPageSettings
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="পেপার মাপ ও চারপাশের মার্জিন কাস্টমাইজ করুন"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>মার্জিন / সাইজ সেটিংস</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[11px] font-siliguri font-semibold text-slate-600 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 font-baloo">
            {PAPER_PRESETS[paperPreset].shortBn} · {orientation === 'portrait' ? 'পোর্ট্রেট' : 'ল্যান্ডস্কেপ'}
          </span>
          <button
            type="button"
            onClick={handlePrintOrPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 font-siliguri"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট করুন</span>
          </button>
          <button
            type="button"
            onClick={handlePrintOrPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 font-siliguri"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF সংরক্ষণ</span>
          </button>
        </div>
      </div>

      {/* Expandable Paper Size (Custom / Cartridge / Stamp), Orientation, 4-Side Margin & Pad Top Spacer Panel */}
      {(showCustomPageSettings || !includeLetterhead) && (
        <div className="pt-2.5 border-t border-slate-100 bg-slate-50/80 -mx-4 px-4 pb-1 rounded-b-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-tiro">
            <span>{PAPER_PRESETS[paperPreset].hintBn}</span>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-md border border-slate-200 bg-white overflow-hidden text-[11px] font-siliguri">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2 py-0.5 font-semibold ${
                    orientation === 'portrait' ? 'bg-emerald-700 text-white' : 'text-slate-600'
                  }`}
                >
                  পোর্ট্রেট
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2 py-0.5 font-semibold ${
                    orientation === 'landscape' ? 'bg-emerald-700 text-white' : 'text-slate-600'
                  }`}
                >
                  ল্যান্ডস্কেপ
                </button>
              </div>
              <div className="inline-flex items-center rounded-md border border-slate-200 bg-white overflow-hidden text-[11px] font-siliguri">
                <button
                  type="button"
                  onClick={() => setMarginUnit('in')}
                  className={`px-2 py-0.5 font-semibold ${
                    marginUnit === 'in' ? 'bg-slate-800 text-white' : 'text-slate-600'
                  }`}
                >
                  ইঞ্চি (in)
                </button>
                <button
                  type="button"
                  onClick={() => setMarginUnit('mm')}
                  className={`px-2 py-0.5 font-semibold ${
                    marginUnit === 'mm' ? 'bg-slate-800 text-white' : 'text-slate-600'
                  }`}
                >
                  মিমি (mm)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
            {/* Custom Paper Width & Height (editable for Cartridge, Stamp, Custom) */}
            {(paperPreset === 'CARTRIDGE' || paperPreset === 'STAMP_PAPER' || paperPreset === 'CUSTOM') && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                    পেপার প্রস্থ (ইঞ্চি)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="4"
                    max="40"
                    value={paperWidthIn}
                    onChange={(e) => setPaperWidthIn(parseFloat(e.target.value) || 8.5)}
                    className="w-full px-2 py-1 text-xs font-baloo rounded-md border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                    পেপার উচ্চতা (ইঞ্চি)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="50"
                    value={paperHeightIn}
                    onChange={(e) => setPaperHeightIn(parseFloat(e.target.value) || 13)}
                    className="w-full px-2 py-1 text-xs font-baloo rounded-md border border-slate-300 bg-white text-slate-900"
                  />
                </div>
              </>
            )}

            {/* 4-Side Margins */}
            {(
              [
                ['top', 'উপরের মার্জিন'],
                ['bottom', 'নিচের মার্জিন'],
                ['left', 'বামের মার্জিন'],
                ['right', 'ডানের মার্জিন'],
              ] as Array<[keyof MarginValues, string]>
            ).map(([side, label]) => (
              <div key={side}>
                <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                  {label} ({marginUnit === 'in' ? 'ইঞ্চি' : 'মিমি'})
                </label>
                <input
                  type="number"
                  step={marginUnit === 'in' ? '0.05' : '1'}
                  min="0"
                  max={marginUnit === 'in' ? '8' : '200'}
                  value={displayMarginVal(marginsIn[side])}
                  onChange={(e) => handleMarginSideChange(side, parseFloat(e.target.value))}
                  className="w-full px-2 py-1 text-xs font-baloo rounded-md border border-slate-300 bg-white text-slate-900"
                />
              </div>
            ))}

            {/* Pad Top Spacer (repeats on EVERY page when Letterhead is unchecked) */}
            {!includeLetterhead && (
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                  প্রতি পৃষ্ঠার প্যাডের ফাঁকা (মিমি)
                </label>
                <select
                  value={padTopMm}
                  onChange={(e) => setPadTopMm(Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs font-baloo rounded-md border border-slate-300 bg-white text-slate-900"
                >
                  <option value={0}>০ মিমি (স্ট্যাম্প/নাই)</option>
                  <option value={30}>৩০ মিমি (ছোট প্যাড)</option>
                  <option value={42}>৪২ মিমি (স্ট্যান্ডার্ড)</option>
                  <option value={52}>৫২ মিমি (বড় প্যাড)</option>
                  <option value={60}>৬০ মিমি (অতিরিক্ত বড় প্যাড)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  PenTool,
  History,
  Archive,
  KeyRound,
  UserCheck,
  Stamp,
  GitCompare,
  Lock,
  Printer,
  Eraser,
  FilePlus2,
  Clock,
  Landmark,
  ShieldAlert,
  Fingerprint,
} from 'lucide-react';
import { User } from '../../types';
import {
  AgreementApprovalDecision,
  AgreementClosureInfo,
  AgreementRecord,
  AgreementReviewDecision,
  AgreementReviewStage,
  AgreementSignatureMethod,
} from '../../types/agreementTypes';
import {
  AGREEMENT_REVIEW_STAGE_LABELS,
  AGREEMENT_SIGNATURE_LIMITATION_BN,
  AGREEMENT_SIGNATURE_METHOD_LABELS,
  AGREEMENT_STATUS_META,
  buildRequiredSignerSlots,
  hasClientAgreementPermission,
  isAgreementLockedForDirectEdit,
} from '../../lib/agreementCatalog';
import { api } from '../../lib/api';

export type GovernanceModalTab = 'approval' | 'signature' | 'versions' | 'archive';

interface AgreementGovernanceModalProps {
  agreement: AgreementRecord;
  currentUser?: User | null;
  initialTab?: GovernanceModalTab;
  onAgreementUpdated: (updated: AgreementRecord, toastMsg?: string) => void;
  onOpenPrintPreview?: (ag: AgreementRecord) => void;
  onClose: () => void;
}

interface SignatureCanvasPadProps {
  onChangeDataUrl: (dataUrl: string) => void;
  clearSignal?: number;
  label?: string;
}

const SignatureCanvasPad: React.FC<SignatureCanvasPadProps> = ({
  onChangeDataUrl,
  clearSignal = 0,
  label = 'নিচের বক্সে আঙুল বা মাউস দিয়ে স্বাক্ষর আঁকুন',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
    onChangeDataUrl('');
  };

  useEffect(() => {
    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSignal]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    drawingRef.current = true;
    hasStrokeRef.current = true;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasStrokeRef.current) {
      onChangeDataUrl(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-700 font-siliguri">{label}</span>
        <button
          type="button"
          onClick={clearCanvas}
          className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-rose-700 font-siliguri"
        >
          <Eraser className="w-3 h-3" />
          <span>মুছে আবার আঁকুন</span>
        </button>
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={520}
          height={148}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-32 sm:h-36 touch-none cursor-crosshair block bg-white"
        />
      </div>
    </div>
  );
};

function formatDateTimeBn(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AgreementGovernanceModal: React.FC<AgreementGovernanceModalProps> = ({
  agreement,
  currentUser,
  initialTab = 'approval',
  onAgreementUpdated,
  onOpenPrintPreview,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GovernanceModalTab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // RBAC capabilities (backend enforces all of these strictly as well)
  const canReview = hasClientAgreementPermission(currentUser, 'agreement.review');
  const canWaqfReview = hasClientAgreementPermission(currentUser, 'agreement.manage_waqf_review');
  const canApprove = hasClientAgreementPermission(currentUser, 'agreement.approve');
  const canReject = hasClientAgreementPermission(currentUser, 'agreement.reject');
  const canSign = hasClientAgreementPermission(currentUser, 'agreement.sign');
  const canManageSignatures = hasClientAgreementPermission(currentUser, 'agreement.manage_signatures');
  const canCreateVersion =
    hasClientAgreementPermission(currentUser, 'agreement.edit') ||
    hasClientAgreementPermission(currentUser, 'agreement.create');

  const currentVersion = agreement.versionNumber || 1;
  const statusMeta = AGREEMENT_STATUS_META[agreement.status] || AGREEMENT_STATUS_META.DRAFT;
  const lockedForEdit = isAgreementLockedForDirectEdit(agreement);
  const waqfReviewRequired = Boolean(
    agreement.isWaqfOrLandRelated || agreement.landWaqfDetails?.waqfLegalReviewRequired
  );
  const waqfReviewCleared =
    !waqfReviewRequired || agreement.waqfLegalReviewStatus === 'CLEARED';

  // ---- TAB 1: REVIEW & APPROVAL STATE ----
  const [reviewStage, setReviewStage] = useState<AgreementReviewStage>(
    waqfReviewRequired && !waqfReviewCleared ? 'WAQF_LEGAL' : 'INTERNAL'
  );
  const [reviewDecision, setReviewDecision] = useState<AgreementReviewDecision>(
    waqfReviewRequired && !waqfReviewCleared ? 'WAQF_LEGAL_CLEARED' : 'REVIEWED'
  );
  const [reviewComment, setReviewComment] = useState('');
  const [sendForApprovalAfterReview, setSendForApprovalAfterReview] = useState(true);

  const [approvalDecision, setApprovalDecision] = useState<AgreementApprovalDecision>('APPROVED');
  const [committeeResolutionRef, setCommitteeResolutionRef] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [readyForSignature, setReadyForSignature] = useState(true);

  // ---- TAB 2: DIGITAL SIGNATURE & WITNESS STATE ----
  const requiredSlots = useMemo(() => buildRequiredSignerSlots(agreement), [agreement]);
  const currentVersionSignatures = useMemo(
    () => (agreement.signatures || []).filter((s) => (s.versionNumber || 1) === currentVersion),
    [agreement.signatures, currentVersion]
  );
  const signedSlotKeys = useMemo(
    () => new Set(currentVersionSignatures.map((s) => s.slotKey)),
    [currentVersionSignatures]
  );
  const nextUnsignedSlot = useMemo(
    () => requiredSlots.find((slot) => !signedSlotKeys.has(slot.slotKey)) || null,
    [requiredSlots, signedSlotKeys]
  );

  const [selectedSlotKey, setSelectedSlotKey] = useState<string>(nextUnsignedSlot?.slotKey || '');
  const [sigMethod, setSigMethod] = useState<AgreementSignatureMethod>('DRAW_TOUCH');
  const [sigCanvasDataUrl, setSigCanvasDataUrl] = useState('');
  const [sigCanvasReset, setSigCanvasReset] = useState(0);
  const [typedSigText, setTypedSigText] = useState('');
  const [signerIdentityRef, setSignerIdentityRef] = useState('');
  const [authorityBasisOverride, setAuthorityBasisOverride] = useState('');
  const [legalLimitationChecked, setLegalLimitationChecked] = useState(false);

  // OTP state
  const [otpPhoneOverride, setOtpPhoneOverride] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpPreviewInfo, setOtpPreviewInfo] = useState<{
    maskedTarget: string;
    verificationCodePreview: string;
    noticeBn: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState('');

  // Witness signature state
  const [selectedWitnessId, setSelectedWitnessId] = useState(agreement.witnesses?.[0]?.id || '');
  const [witnessName, setWitnessName] = useState(agreement.witnesses?.[0]?.name || '');
  const [witnessFatherName, setWitnessFatherName] = useState(agreement.witnesses?.[0]?.fatherName || '');
  const [witnessPhone, setWitnessPhone] = useState(agreement.witnesses?.[0]?.phone || '');
  const [witnessNid, setWitnessNid] = useState(agreement.witnesses?.[0]?.nid || '');
  const [witnessAddress, setWitnessAddress] = useState(agreement.witnesses?.[0]?.address || '');
  const [witnessPartySide, setWitnessPartySide] = useState(
    agreement.witnesses?.[0]?.partySide || 'সাক্ষী'
  );
  const [witnessMethod, setWitnessMethod] = useState<'DRAW_TOUCH' | 'TYPED_ELECTRONIC'>('DRAW_TOUCH');
  const [witnessCanvasUrl, setWitnessCanvasUrl] = useState('');
  const [witnessCanvasReset, setWitnessCanvasReset] = useState(0);
  const [witnessTypedText, setWitnessTypedText] = useState('');

  // Effective date for Mark Effective
  const [effectiveDateInput, setEffectiveDateInput] = useState(
    agreement.effectiveDate || new Date().toISOString().slice(0, 10)
  );

  // ---- TAB 3: VERSION HISTORY & AMENDMENTS STATE ----
  const [isAmendmentMode, setIsAmendmentMode] = useState(lockedForEdit);
  const [amendmentTitle, setAmendmentTitle] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [verTitle, setVerTitle] = useState(agreement.title);
  const [verPurpose, setVerPurpose] = useState(agreement.purpose);
  const [verExpiryDate, setVerExpiryDate] = useState(agreement.expiryDate || '');
  const [verDurationText, setVerDurationText] = useState(agreement.durationText || '');
  const [verGeneralClauses, setVerGeneralClauses] = useState(agreement.generalClauses);
  const [verSpecialClauses, setVerSpecialClauses] = useState(agreement.specialClauses || '');
  const [verTerminationClause, setVerTerminationClause] = useState(agreement.terminationClause || '');
  const [verDisputeClause, setVerDisputeClause] = useState(agreement.disputeResolutionClause || '');

  const versionHistory = useMemo(() => {
    const list = [...(agreement.versionHistory || [])];
    list.sort((a, b) => b.versionNumber - a.versionNumber);
    return list;
  }, [agreement.versionHistory]);

  const [compareRightVer, setCompareRightVer] = useState<number>(
    versionHistory[0]?.versionNumber || currentVersion
  );
  const [compareLeftVer, setCompareLeftVer] = useState<number>(
    versionHistory[1]?.versionNumber || versionHistory[0]?.versionNumber || 1
  );

  // ---- TAB 4: CLOSURE & ARCHIVE STATE ----
  const [closureAction, setClosureAction] = useState<AgreementClosureInfo['action']>('COMPLETED');
  const [closureReason, setClosureReason] = useState('');
  const [closureDate, setClosureDate] = useState(new Date().toISOString().slice(0, 10));
  const [alsoArchive, setAlsoArchive] = useState(false);
  const [archiveNote, setArchiveNote] = useState(agreement.archiveNote || '');

  // Keep selected slot synced when agreement updates
  useEffect(() => {
    if (nextUnsignedSlot && (!selectedSlotKey || signedSlotKeys.has(selectedSlotKey))) {
      setSelectedSlotKey(nextUnsignedSlot.slotKey);
      setSignerIdentityRef(nextUnsignedSlot.signerNid || '');
      setAuthorityBasisOverride(nextUnsignedSlot.authorityBasis || '');
      setOtpPhoneOverride(nextUnsignedSlot.signerPhone || '');
      setOtpChallengeId('');
      setOtpPreviewInfo(null);
      setOtpCode('');
    }
  }, [nextUnsignedSlot, selectedSlotKey, signedSlotKeys]);

  // Keep version comparison selectors updated when new version is added
  useEffect(() => {
    if (versionHistory.length > 0) {
      setCompareRightVer(versionHistory[0].versionNumber);
      setCompareLeftVer(versionHistory[1]?.versionNumber || versionHistory[0].versionNumber);
    }
    setVerTitle(agreement.title);
    setVerPurpose(agreement.purpose);
    setVerExpiryDate(agreement.expiryDate || '');
    setVerDurationText(agreement.durationText || '');
    setVerGeneralClauses(agreement.generalClauses);
    setVerSpecialClauses(agreement.specialClauses || '');
    setVerTerminationClause(agreement.terminationClause || '');
    setVerDisputeClause(agreement.disputeResolutionClause || '');
  }, [agreement, versionHistory]);

  const activeSlot = useMemo(
    () => requiredSlots.find((s) => s.slotKey === selectedSlotKey) || null,
    [requiredSlots, selectedSlotKey]
  );

  const handleSelectSlot = (slotKey: string) => {
    setSelectedSlotKey(slotKey);
    const slot = requiredSlots.find((s) => s.slotKey === slotKey);
    setSignerIdentityRef(slot?.signerNid || '');
    setAuthorityBasisOverride(slot?.authorityBasis || '');
    setOtpPhoneOverride(slot?.signerPhone || '');
    setOtpChallengeId('');
    setOtpPreviewInfo(null);
    setOtpCode('');
  };

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // ---- SUBMIT HANDLERS ----
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!reviewComment.trim()) {
      setErrorMsg('পর্যালোচনার মন্তব্য লেখা আবশ্যক।');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.submitAgreementReview(agreement.id, {
        stage: reviewStage,
        decision: reviewDecision,
        comment: reviewComment.trim(),
        sendForApproval: sendForApprovalAfterReview,
      });
      setReviewComment('');
      const msg = 'পর্যালোচনা রেকর্ড অপরিবর্তনীয়ভাবে সংরক্ষিত হয়েছে।';
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'পর্যালোচনা সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!approvalComment.trim()) {
      setErrorMsg('অনুমোদন বা প্রত্যাখ্যানের কারণ/মন্তব্য লেখা আবশ্যক।');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.submitAgreementApproval(agreement.id, {
        decision: approvalDecision,
        comment: approvalComment.trim(),
        committeeResolutionRef: committeeResolutionRef.trim() || undefined,
        readyForSignature,
      });
      setApprovalComment('');
      const msg =
        approvalDecision === 'APPROVED'
          ? 'চুক্তিপত্র অনুমোদিত হয়েছে এবং অনুমোদনের রেকর্ড সংরক্ষিত হয়েছে।'
          : 'অনুমোদন সিদ্ধান্ত সংরক্ষিত হয়েছে।';
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'অনুমোদন সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestOtp = async () => {
    clearFeedback();
    if (!selectedSlotKey) {
      setErrorMsg('প্রথমে একজন স্বাক্ষরকারী স্লট নির্বাচন করুন।');
      return;
    }
    setBusy(true);
    try {
      const data = await api.requestAgreementSignatureOtp(agreement.id, {
        slotKey: selectedSlotKey,
        phoneOverride: otpPhoneOverride.trim() || undefined,
      });
      setOtpChallengeId(data.challengeId);
      setOtpPreviewInfo({
        maskedTarget: data.maskedTarget,
        verificationCodePreview: data.verificationCodePreview,
        noticeBn: data.noticeBn,
      });
      setSuccessMsg(`৬-অঙ্কের OTP তৈরি হয়েছে (${data.maskedTarget})। মেয়াদ ৫ মিনিট।`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'OTP তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setBusy(false);
    }
  };

  const handleSignSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!selectedSlotKey) {
      setErrorMsg('স্বাক্ষরকারী স্লট নির্বাচন করুন।');
      return;
    }
    if (!legalLimitationChecked) {
      setErrorMsg('ইলেকট্রনিক স্বাক্ষরের আইনি সীমাবদ্ধতা নোটটি পড়ে সম্মতি টিক চিহ্ন দিন।');
      return;
    }
    if (sigMethod === 'DRAW_TOUCH' && !sigCanvasDataUrl) {
      setErrorMsg('স্ক্রিনে স্বাক্ষর আঁকুন।');
      return;
    }
    if (sigMethod === 'TYPED_ELECTRONIC' && typedSigText.trim().length < 2) {
      setErrorMsg('টাইপকৃত স্বাক্ষর হিসেবে পূর্ণ নাম লিখুন।');
      return;
    }
    if (sigMethod === 'OTP_VERIFIED_ELECTRONIC' && (!otpChallengeId || otpCode.trim().length < 6)) {
      setErrorMsg('প্রথমে OTP অনুরোধ করুন এবং ৬-অঙ্কের OTP কোড লিখুন।');
      return;
    }

    setBusy(true);
    try {
      const updated = await api.signAgreementSlot(agreement.id, {
        slotKey: selectedSlotKey,
        method: sigMethod,
        signatureImageDataUrl: sigCanvasDataUrl || undefined,
        typedSignatureText: typedSigText.trim() || undefined,
        otpChallengeId: otpChallengeId || undefined,
        otpCode: otpCode.trim() || undefined,
        signerIdentityRef: signerIdentityRef.trim() || undefined,
        authorityBasisOverride: authorityBasisOverride.trim() || undefined,
        legalLimitationAcknowledged: legalLimitationChecked,
      });
      setSigCanvasDataUrl('');
      setSigCanvasReset((c) => c + 1);
      setTypedSigText('');
      setOtpChallengeId('');
      setOtpPreviewInfo(null);
      setOtpCode('');
      setLegalLimitationChecked(false);
      const msg = 'পক্ষের ডিজিটাল/ইলেকট্রনিক স্বাক্ষর SHA-256 হ্যাশসহ অপরিবর্তনীয়ভাবে সংরক্ষিত হয়েছে।';
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'স্বাক্ষর সংরক্ষণ করা যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkEffective = async () => {
    clearFeedback();
    setBusy(true);
    try {
      const updated = await api.markAgreementEffective(
        agreement.id,
        effectiveDateInput || undefined
      );
      const msg = 'চুক্তিপত্রটি সফলভাবে কার্যকর (Effective) ঘোষণা করা হয়েছে।';
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'কার্যকর ঘোষণা করা যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  const handleSignWitness = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!witnessName.trim()) {
      setErrorMsg('সাক্ষীর নাম লেখা আবশ্যক।');
      return;
    }
    if (witnessMethod === 'DRAW_TOUCH' && !witnessCanvasUrl) {
      setErrorMsg('সাক্ষীর স্বাক্ষর স্ক্রিনে আঁকুন।');
      return;
    }
    if (witnessMethod === 'TYPED_ELECTRONIC' && witnessTypedText.trim().length < 2) {
      setErrorMsg('সাক্ষীর টাইপকৃত স্বাক্ষর লিখুন।');
      return;
    }
    setBusy(true);
    try {
      const matchedPreset = (agreement.witnesses || []).find(
        (w) => w.id === selectedWitnessId && w.name.trim() === witnessName.trim()
      );
      const updated = await api.signAgreementWitness(agreement.id, {
        witnessId: matchedPreset?.id,
        witnessName: witnessName.trim(),
        fatherName: witnessFatherName.trim() || undefined,
        phone: witnessPhone.trim() || undefined,
        nid: witnessNid.trim() || undefined,
        address: witnessAddress.trim() || undefined,
        partySide: witnessPartySide.trim() || undefined,
        method: witnessMethod,
        signatureImageDataUrl: witnessMethod === 'DRAW_TOUCH' ? witnessCanvasUrl : undefined,
        typedSignatureText: witnessMethod === 'TYPED_ELECTRONIC' ? witnessTypedText.trim() : undefined,
      });
      setWitnessCanvasUrl('');
      setWitnessCanvasReset((c) => c + 1);
      setWitnessTypedText('');
      setSelectedWitnessId('');
      setWitnessName('');
      setWitnessFatherName('');
      setWitnessPhone('');
      setWitnessNid('');
      setWitnessAddress('');
      const msg = 'সাক্ষীর স্বাক্ষর অপরিবর্তনীয়ভাবে সংরক্ষিত হয়েছে।';
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'সাক্ষীর স্বাক্ষর সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateVersionOrAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (changeSummary.trim().length < 4) {
      setErrorMsg('কী পরিবর্তন করা হয়েছে তার সংক্ষিপ্ত বিবরণ (কমপক্ষে ৪ অক্ষর) লেখা আবশ্যক।');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.createAgreementVersionOrAmendment(agreement.id, {
        isAmendment: isAmendmentMode,
        amendmentTitle: isAmendmentMode ? amendmentTitle.trim() || undefined : undefined,
        changeSummary: changeSummary.trim(),
        title: verTitle.trim(),
        purpose: verPurpose.trim(),
        expiryDate: verExpiryDate || undefined,
        durationText: verDurationText.trim() || undefined,
        generalClauses: verGeneralClauses.trim(),
        specialClauses: verSpecialClauses.trim() || undefined,
        terminationClause: verTerminationClause.trim() || undefined,
        disputeResolutionClause: verDisputeClause.trim() || undefined,
      });
      setChangeSummary('');
      setAmendmentTitle('');
      const msg = isAmendmentMode
        ? `সংশোধনী চুক্তি (${updated.agreementNumber}) সফলভাবে তৈরি হয়েছে। পূর্বের মূল চুক্তি ও স্বাক্ষর অক্ষুণ্ণ রয়েছে।`
        : `নতুন ভার্সন (v${updated.versionNumber}) তৈরি হয়েছে। পূর্বের ভার্সন ও স্বাক্ষরের ইতিহাস সুরক্ষিত আছে।`;
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'নতুন ভার্সন/সংশোধনী তৈরি করা যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  const handleCloseAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (closureReason.trim().length < 4) {
      setErrorMsg('সমাপ্তি / বাতিলের সুনির্দিষ্ট কারণ লেখা আবশ্যক।');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.closeOrArchiveAgreement(agreement.id, {
        mode: 'CLOSE',
        action: closureAction,
        reason: closureReason.trim(),
        effectiveClosureDate: closureDate || undefined,
        alsoArchive,
      });
      setClosureReason('');
      const msg = 'চুক্তিপত্রের সমাপ্তি/বাতিল অবস্থা ও কারণ স্থায়ীভাবে সংরক্ষিত হয়েছে।';
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'সমাপ্তি রেকর্ড সংরক্ষণ করা যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleArchive = async (archive: boolean) => {
    clearFeedback();
    setBusy(true);
    try {
      const updated = await api.closeOrArchiveAgreement(agreement.id, {
        mode: archive ? 'ARCHIVE' : 'UNARCHIVE',
        archiveNote: archive ? archiveNote.trim() || undefined : undefined,
      });
      const msg = archive
        ? 'চুক্তিপত্রটি আর্কাইভে সংরক্ষিত হয়েছে।'
        : 'চুক্তিপত্রটি আর্কাইভ থেকে পুনরুদ্ধার করা হয়েছে।';
      setSuccessMsg(msg);
      onAgreementUpdated(updated, msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'আর্কাইভ অবস্থা পরিবর্তন করা যায়নি।');
    } finally {
      setBusy(false);
    }
  };

  const leftSnapshot = useMemo(
    () => versionHistory.find((v) => v.versionNumber === compareLeftVer) || null,
    [versionHistory, compareLeftVer]
  );
  const rightSnapshot = useMemo(
    () => versionHistory.find((v) => v.versionNumber === compareRightVer) || null,
    [versionHistory, compareRightVer]
  );

  const allRequiredSigned =
    requiredSlots.length > 0 && currentVersionSignatures.length >= requiredSlots.length;

  const tabs: Array<{
    id: GovernanceModalTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    {
      id: 'approval',
      label: 'পর্যালোচনা ও অনুমোদন',
      icon: Stamp,
      badge: `${(agreement.reviewRecords?.length || 0) + (agreement.approvalRecords?.length || 0)}`,
    },
    {
      id: 'signature',
      label: 'ডিজিটাল স্বাক্ষর ও সাক্ষী',
      icon: PenTool,
      badge: `${currentVersionSignatures.length}/${requiredSlots.length}`,
    },
    {
      id: 'versions',
      label: 'ভার্সন ও সংশোধনী',
      icon: History,
      badge: `v${currentVersion}`,
    },
    {
      id: 'archive',
      label: 'সমাপ্তি ও আর্কাইভ',
      icon: Archive,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 overflow-y-auto p-3 sm:p-5">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-2">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold font-baloo text-emerald-800">
                {agreement.agreementNumber}
              </span>
              <span className="text-slate-300">·</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold font-siliguri ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                {statusMeta.labelBn}
              </span>
              <span className="text-[11px] font-baloo font-semibold text-slate-600 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                ভার্সন v{currentVersion}
              </span>
              {agreement.isAmendment && (
                <span className="text-[11px] font-siliguri font-semibold text-indigo-800 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200">
                  সংশোধনী #{agreement.amendmentNumber || 1}
                </span>
              )}
              {lockedForEdit && (
                <span className="inline-flex items-center gap-1 text-[11px] font-siliguri font-semibold text-amber-900 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                  <Lock className="w-3 h-3" />
                  সরাসরি সম্পাদনা লকড
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 font-siliguri mt-1 truncate">
              {agreement.title}
            </h3>
            {agreement.currentDocumentHash && (
              <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>SHA-256: {agreement.currentDocumentHash.slice(0, 24)}…</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenPrintPreview && (
              <button
                type="button"
                onClick={() => onOpenPrintPreview(agreement)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                <span>A4 প্রিন্ট/PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto bg-white">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  clearFeedback();
                  setActiveTab(t.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold font-siliguri border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-emerald-700 text-emerald-800'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-baloo ${
                      active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Banner */}
        {(errorMsg || successMsg) && (
          <div className="px-5 pt-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-tiro flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-tiro flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 space-y-5 max-h-[74vh] overflow-y-auto">
          {/* ============ TAB 1: REVIEW & APPROVAL WORKFLOW ============ */}
          {activeTab === 'approval' && (
            <div className="space-y-5">
              {/* Waqf / Land Legal Gate Banner */}
              {waqfReviewRequired && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    waqfReviewCleared
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <Landmark
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      waqfReviewCleared ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  />
                  <div className="text-xs space-y-1 font-tiro">
                    <p className="font-bold font-siliguri">
                      ওয়াকফ / জমি ও রাস্তার বাধ্যতামূলক আইনগত পর্যালোচনা:{' '}
                      {waqfReviewCleared ? 'সম্পন্ন (Cleared)' : 'অপেক্ষমাণ (Pending — অনুমোদন ও স্বাক্ষরের পূর্বে বাধ্যতামূলক)'}
                    </p>
                    <p>
                      {waqfReviewCleared
                        ? 'ওয়াকফ ও আইনি পর্যালোচনা ছাড়পত্র রেকর্ড হয়েছে। এখন কমিটি অনুমোদন ও স্বাক্ষর প্রক্রিয়া সম্পন্ন করা যাবে।'
                        : 'ওয়াকফ বা জমি-সংক্রান্ত চুক্তিতে "ওয়াকফ / আইনগত পর্যালোচনা" পর্যায়ে ছাড়পত্র (WAQF_LEGAL_CLEARED) না দেওয়া পর্যন্ত চূড়ান্ত অনুমোদন বা স্বাক্ষর সম্পন্ন করা যাবে না।'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Review Form (Internal / Committee / Waqf Legal) */}
                <form
                  onSubmit={handleSubmitReview}
                  className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                >
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-700" />
                      <span>১. পর্যালোচনা রেকর্ড করুন (Review Stage)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                      অভ্যন্তরীণ, কমিটি অথবা ওয়াকফ/আইনি পর্যালোচনার মতামত স্থায়ীভাবে লিপিবদ্ধ করুন
                    </p>
                  </div>

                  {!canReview && !canWaqfReview ? (
                    <p className="text-xs text-slate-500 font-tiro py-4">
                      আপনার একাউন্টে চুক্তি পর্যালোচনার অনুমতি নেই।
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                            পর্যালোচনার ধাপ
                          </label>
                          <select
                            value={reviewStage}
                            onChange={(e) => {
                              const st = e.target.value as AgreementReviewStage;
                              setReviewStage(st);
                              if (st === 'WAQF_LEGAL') setReviewDecision('WAQF_LEGAL_CLEARED');
                              else setReviewDecision('REVIEWED');
                            }}
                            className="w-full px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white"
                          >
                            {canReview && <option value="INTERNAL">অভ্যন্তরীণ পর্যালোচনা</option>}
                            {canReview && <option value="COMMITTEE">কমিটি পর্যালোচনা</option>}
                            {canWaqfReview && <option value="WAQF_LEGAL">ওয়াকফ / আইনগত পর্যালোচনা</option>}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                            পর্যালোচনার সিদ্ধান্ত
                          </label>
                          <select
                            value={reviewDecision}
                            onChange={(e) => setReviewDecision(e.target.value as AgreementReviewDecision)}
                            className="w-full px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white"
                          >
                            {reviewStage === 'WAQF_LEGAL' ? (
                              <>
                                <option value="WAQF_LEGAL_CLEARED">ওয়াকফ/আইনি ছাড়পত্র প্রদান (Cleared)</option>
                                <option value="WAQF_LEGAL_REJECTED">আইনি আপত্তি / প্রত্যাখ্যান</option>
                                <option value="CHANGES_REQUESTED">সংশোধন প্রয়োজন</option>
                                <option value="INFO_PENDING">তথ্য/দলিল অসম্পূর্ণ</option>
                              </>
                            ) : (
                              <>
                                <option value="REVIEWED">পর্যালোচনা সম্পন্ন (সঠিক আছে)</option>
                                <option value="CHANGES_REQUESTED">সংশোধনের জন্য ফেরত</option>
                                <option value="INFO_PENDING">তথ্য অপেক্ষমাণ (Info Pending)</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          পর্যালোচকের মন্তব্য *
                        </label>
                        <textarea
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="দলিল যাচাই, শর্তাবলি বা সংশোধনের নির্দিষ্ট মন্তব্য লিখুন..."
                          className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {(reviewDecision === 'REVIEWED' || reviewDecision === 'WAQF_LEGAL_CLEARED') && (
                        <label className="inline-flex items-center gap-2 text-xs font-tiro text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sendForApprovalAfterReview}
                            onChange={(e) => setSendForApprovalAfterReview(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-700"
                          />
                          <span>পর্যালোচনা শেষে অনুমোদনের জন্য প্রেরণ (Pending Approval) করুন</span>
                        </label>
                      )}

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold font-siliguri disabled:opacity-60"
                      >
                        {busy ? 'সংরক্ষণ হচ্ছে...' : 'পর্যালোচনা সংরক্ষণ করুন'}
                      </button>
                    </>
                  )}
                </form>

                {/* Formal Approval / Rejection Form */}
                <form
                  onSubmit={handleSubmitApproval}
                  className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                >
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
                      <Stamp className="w-4 h-4 text-emerald-700" />
                      <span>২. কমিটি অনুমোদন / প্রত্যাখ্যান সিদ্ধান্ত</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                      অনুমোদনকারীর নাম, সময়, রেজুলেশন রেফারেন্স ও ডকুমেন্ট হ্যাশ অপরিবর্তনীয়ভাবে সংরক্ষিত হবে
                    </p>
                  </div>

                  {!canApprove && !canReject ? (
                    <p className="text-xs text-slate-500 font-tiro py-4">
                      আপনার একাউন্টে চুক্তি অনুমোদন বা প্রত্যাখ্যানের অনুমতি নেই।
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                            সিদ্ধান্ত *
                          </label>
                          <select
                            value={approvalDecision}
                            onChange={(e) =>
                              setApprovalDecision(e.target.value as AgreementApprovalDecision)
                            }
                            className="w-full px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white"
                          >
                            {canApprove && <option value="APPROVED">অনুমোদিত (Approved)</option>}
                            {canReject && (
                              <option value="RETURNED_FOR_REVISION">সংশোধনের জন্য ফেরত</option>
                            )}
                            {canReject && <option value="REJECTED">প্রত্যাখ্যাত (Rejected)</option>}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                            কমিটি রেজুলেশন নং / সূত্র
                          </label>
                          <input
                            type="text"
                            value={committeeResolutionRef}
                            onChange={(e) => setCommitteeResolutionRef(e.target.value)}
                            placeholder="যেমন: রেজুলেশন-২০২৬/১৪"
                            className="w-full px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          অনুমোদন / প্রত্যাখ্যান মন্তব্য *
                        </label>
                        <textarea
                          rows={3}
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          placeholder="অনুমোদন বা সংশোধনের নির্দেশনা ও মন্তব্য লিখুন..."
                          className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {approvalDecision === 'APPROVED' && (
                        <label className="inline-flex items-center gap-2 text-xs font-tiro text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={readyForSignature}
                            onChange={(e) => setReadyForSignature(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-700"
                          />
                          <span>অনুমোদনের সাথে সাথে স্বাক্ষরের জন্য উন্মুক্ত (Pending Signature) করুন</span>
                        </label>
                      )}

                      <button
                        type="submit"
                        disabled={busy || (approvalDecision === 'APPROVED' && !waqfReviewCleared)}
                        className={`w-full py-2 rounded-lg text-white text-xs font-semibold font-siliguri disabled:opacity-50 ${
                          approvalDecision === 'APPROVED'
                            ? 'bg-emerald-700 hover:bg-emerald-800'
                            : 'bg-rose-700 hover:bg-rose-800'
                        }`}
                      >
                        {busy
                          ? 'সংরক্ষণ হচ্ছে...'
                          : approvalDecision === 'APPROVED'
                          ? 'চূড়ান্ত অনুমোদন রেকর্ড করুন'
                          : 'সিদ্ধান্ত রেকর্ড করুন'}
                      </button>
                    </>
                  )}
                </form>
              </div>

              {/* Immutable Approval & Review History Log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 font-siliguri">
                    অনুমোদন রেকর্ডসমূহ (অপরিবর্তনীয় — {agreement.approvalRecords?.length || 0}টি)
                  </h4>
                  {(agreement.approvalRecords || []).length === 0 ? (
                    <p className="text-xs text-slate-500 font-tiro">এখনো কোনো অনুমোদন রেকর্ড হয়নি।</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {[...(agreement.approvalRecords || [])].reverse().map((rec) => (
                        <div
                          key={rec.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold font-siliguri text-slate-900">
                              {rec.decision === 'APPROVED' ? (
                                <span className="text-emerald-700 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> অনুমোদিত
                                </span>
                              ) : rec.decision === 'REJECTED' ? (
                                <span className="text-rose-700 inline-flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> প্রত্যাখ্যাত
                                </span>
                              ) : (
                                <span className="text-amber-700">সংশোধনের জন্য ফেরত</span>
                              )}
                              {' · '}v{rec.versionNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 font-baloo">
                              {formatDateTimeBn(rec.decidedAt)}
                            </span>
                          </div>
                          <p className="font-tiro text-slate-700">{rec.comment}</p>
                          <p className="text-[11px] text-slate-500 font-tiro">
                            অনুমোদনকারী: <strong className="text-slate-700">{rec.approverName}</strong> ({rec.approverRole})
                            {rec.committeeResolutionRef ? ` · সূত্র: ${rec.committeeResolutionRef}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 font-siliguri">
                    পর্যালোচনা লগ ({agreement.reviewRecords?.length || 0}টি)
                  </h4>
                  {(agreement.reviewRecords || []).length === 0 ? (
                    <p className="text-xs text-slate-500 font-tiro">এখনো কোনো পর্যালোচনা লিপিবদ্ধ হয়নি।</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {[...(agreement.reviewRecords || [])].reverse().map((rev) => (
                        <div
                          key={rev.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold font-siliguri text-slate-800">
                              {AGREEMENT_REVIEW_STAGE_LABELS[rev.stage]} · v{rev.versionNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 font-baloo">
                              {formatDateTimeBn(rev.reviewedAt)}
                            </span>
                          </div>
                          <p className="font-tiro text-slate-700">{rev.comment}</p>
                          <p className="text-[11px] text-slate-500 font-tiro">
                            পর্যালোচক: <strong className="text-slate-700">{rev.reviewerName}</strong> ({rev.decision})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============ TAB 2: DIGITAL SIGNATURE, OTP & WITNESSES ============ */}
          {activeTab === 'signature' && (
            <div className="space-y-5">
              {/* Honest Legal Limitation Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 font-tiro flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{AGREEMENT_SIGNATURE_LIMITATION_BN}</p>
              </div>

              {/* Progress + Mark Effective Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-900 font-siliguri">
                    স্বাক্ষরের অগ্রগতি (ভার্সন v{currentVersion}):{' '}
                    <span className="font-baloo text-emerald-700">
                      {currentVersionSignatures.length} / {requiredSlots.length}
                    </span>{' '}
                    জন নির্ধারিত স্বাক্ষরকারী সম্পন্ন
                  </p>
                  <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                    {agreement.enforceSigningOrder
                      ? 'স্বাক্ষরের ক্রম বাধ্যতামূলক (১, ২, ৩... ক্রমানুসারে স্বাক্ষর করতে হবে)'
                      : 'নির্ধারিত সকল পক্ষের স্বাক্ষর সম্পন্ন হলেই চুক্তি সম্পূর্ণ স্বাক্ষরিত (Fully Signed) হবে'}
                  </p>
                </div>

                {allRequiredSigned &&
                  agreement.status !== 'EFFECTIVE' &&
                  agreement.status !== 'ACTIVE' &&
                  (canApprove || canManageSignatures) && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <input
                        type="date"
                        value={effectiveDateInput}
                        onChange={(e) => setEffectiveDateInput(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-baloo rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        disabled={busy || !waqfReviewCleared}
                        onClick={handleMarkEffective}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold font-siliguri disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>কার্যকর (Effective) ঘোষণা করুন</span>
                      </button>
                    </div>
                  )}
              </div>

              {/* Ordered Signatory Slots List */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 font-siliguri">
                  নির্ধারিত স্বাক্ষরকারীদের তালিকা ও ক্রম (Signing Order)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {requiredSlots.map((slot) => {
                    const existingSig = currentVersionSignatures.find(
                      (s) => s.slotKey === slot.slotKey
                    );
                    const isSelected = selectedSlotKey === slot.slotKey;
                    const isBlockedByOrder =
                      Boolean(agreement.enforceSigningOrder) &&
                      !existingSig &&
                      nextUnsignedSlot?.slotKey !== slot.slotKey;

                    return (
                      <button
                        key={slot.slotKey}
                        type="button"
                        disabled={Boolean(existingSig) || isBlockedByOrder}
                        onClick={() => handleSelectSlot(slot.slotKey)}
                        className={`text-left p-3 rounded-xl border transition-colors ${
                          existingSig
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : isSelected
                            ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-300'
                            : isBlockedByOrder
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 font-siliguri">
                            #{slot.signingOrder} · {slot.partyRoleLabel}
                          </span>
                          {existingSig ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 font-siliguri">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              স্বাক্ষরিত
                            </span>
                          ) : isBlockedByOrder ? (
                            <span className="text-[10px] text-slate-500 font-siliguri">
                              পূর্ববর্তী ক্রম বাকি
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-indigo-700 font-siliguri">
                              স্বাক্ষরের জন্য প্রস্তুত
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 font-siliguri mt-1">
                          {slot.signerName}{' '}
                          <span className="font-normal text-slate-500">({slot.signerDesignation})</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-tiro truncate">
                          {slot.partyName} · {slot.authorityBasis}
                        </p>
                        {existingSig && (
                          <div className="mt-2 pt-2 border-t border-emerald-200/70 flex items-center justify-between gap-2">
                            {existingSig.signatureImageDataUrl ? (
                              <img
                                src={existingSig.signatureImageDataUrl}
                                alt={existingSig.signerName}
                                className="h-9 max-w-[140px] object-contain bg-white rounded border border-emerald-100 px-1"
                              />
                            ) : (
                              <span className="text-sm italic font-serif text-slate-900">
                                {existingSig.typedSignatureText || existingSig.signerName}
                              </span>
                            )}
                            <div className="text-right text-[10px] text-slate-600 font-tiro">
                              <p>{AGREEMENT_SIGNATURE_METHOD_LABELS[existingSig.method]}</p>
                              <p className="font-baloo">{formatDateTimeBn(existingSig.signedAt)}</p>
                              {existingSig.otpVerified && (
                                <p className="text-emerald-700 font-semibold">OTP যাচাইকৃত</p>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Signatory Capture Form */}
              {!allRequiredSigned && canSign && activeSlot && !signedSlotKeys.has(activeSlot.slotKey) && (
                <form
                  onSubmit={handleSignSlot}
                  className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3.5"
                >
                  <div className="border-b border-slate-100 pb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-indigo-700" />
                        <span>
                          স্বাক্ষর প্রদান: #{activeSlot.signingOrder} — {activeSlot.signerName} ({activeSlot.partyRoleLabel})
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-tiro">
                        পক্ষ: {activeSlot.partyName} · পদবি: {activeSlot.signerDesignation}
                      </p>
                    </div>
                  </div>

                  {/* Signature Method Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['DRAW_TOUCH', 'TYPED_ELECTRONIC', 'OTP_VERIFIED_ELECTRONIC'] as AgreementSignatureMethod[]).map(
                      (m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSigMethod(m)}
                          className={`p-2.5 rounded-lg border text-left text-xs font-siliguri transition-colors ${
                            sigMethod === m
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {AGREEMENT_SIGNATURE_METHOD_LABELS[m]}
                        </button>
                      )
                    )}
                  </div>

                  {/* Identity Ref & Authority Basis */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        স্বাক্ষরকারীর NID / পরিচয় রেফারেন্স
                      </label>
                      <input
                        type="text"
                        value={signerIdentityRef}
                        onChange={(e) => setSignerIdentityRef(e.target.value)}
                        placeholder="NID / পাসপোর্ট / পরিচয় নম্বর"
                        className="w-full px-2.5 py-2 text-xs font-baloo rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        প্রতিনিধিত্বের ক্ষমতার ভিত্তি
                      </label>
                      <input
                        type="text"
                        value={authorityBasisOverride}
                        onChange={(e) => setAuthorityBasisOverride(e.target.value)}
                        placeholder="যেমন: কমিটির রেজুলেশন নং ও তারিখ"
                        className="w-full px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Draw Canvas (for DRAW_TOUCH or optional visual in OTP mode) */}
                  {(sigMethod === 'DRAW_TOUCH' || sigMethod === 'OTP_VERIFIED_ELECTRONIC') && (
                    <SignatureCanvasPad
                      onChangeDataUrl={setSigCanvasDataUrl}
                      clearSignal={sigCanvasReset}
                      label={
                        sigMethod === 'OTP_VERIFIED_ELECTRONIC'
                          ? 'ঐচ্ছিক আঁকা স্বাক্ষর (OTP যাচাইয়ের সাথে যুক্ত করতে চাইলে আঁকুন)'
                          : 'স্বাক্ষরকারীর স্বাক্ষর আঁকুন (Touch / Mouse) *'
                      }
                    />
                  )}

                  {/* Typed Electronic Signature */}
                  {(sigMethod === 'TYPED_ELECTRONIC' || sigMethod === 'OTP_VERIFIED_ELECTRONIC') && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        টাইপকৃত ইলেকট্রনিক স্বাক্ষর {sigMethod === 'TYPED_ELECTRONIC' ? '*' : '(ঐচ্ছিক)'}
                      </label>
                      <input
                        type="text"
                        value={typedSigText}
                        onChange={(e) => setTypedSigText(e.target.value)}
                        placeholder={activeSlot.signerName}
                        className="w-full px-3 py-2 text-sm italic font-serif rounded-lg border border-slate-200"
                      />
                    </div>
                  )}

                  {/* Server-side OTP Challenge Block */}
                  {sigMethod === 'OTP_VERIFIED_ELECTRONIC' && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-[180px]">
                          <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                            স্বাক্ষরকারীর মোবাইল নম্বর (OTP পাঠানোর জন্য)
                          </label>
                          <input
                            type="text"
                            value={otpPhoneOverride}
                            onChange={(e) => setOtpPhoneOverride(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full px-2.5 py-2 text-xs font-baloo rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handleRequestOtp}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold font-siliguri disabled:opacity-60"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>OTP তৈরি / পাঠান</span>
                        </button>
                      </div>

                      {otpPreviewInfo && (
                        <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs space-y-1">
                          <p className="font-siliguri text-indigo-950 font-semibold">
                            লক্ষ্য: {otpPreviewInfo.maskedTarget} · যাচাইকরণ কোড:{' '}
                            <span className="font-baloo text-base tracking-widest text-indigo-800">
                              {otpPreviewInfo.verificationCodePreview}
                            </span>
                          </p>
                          <p className="text-[11px] text-indigo-800 font-tiro">
                            {otpPreviewInfo.noticeBn}
                          </p>
                        </div>
                      )}

                      {otpChallengeId && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                            ৬-অঙ্কের OTP কোড লিখুন *
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="৬-অঙ্কের কোড"
                            className="w-48 px-3 py-2 text-sm font-baloo tracking-widest rounded-lg border border-indigo-300 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mandatory Legal Limitation Acknowledgement */}
                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-tiro cursor-pointer">
                    <input
                      type="checkbox"
                      checked={legalLimitationChecked}
                      onChange={(e) => setLegalLimitationChecked(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-emerald-700"
                    />
                    <span>
                      আমি অবগত হয়েছি যে এই ইলেকট্রনিক স্বাক্ষরটি দাপ্তরিক অডিট ও সম্মতির প্রমাণ হিসেবে সংরক্ষিত হচ্ছে এবং প্রযোজ্য ক্ষেত্রে কাগুজে স্ট্যাম্প বা রেজিস্ট্রেশনের বিকল্প নয়।
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={busy || !legalLimitationChecked}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold font-siliguri disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{busy ? 'স্বাক্ষর সংরক্ষণ হচ্ছে...' : 'স্বাক্ষর নিশ্চিত ও স্থায়ীভাবে সংরক্ষণ করুন'}</span>
                  </button>
                </form>
              )}

              {/* Witness Signature Capture & List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <form
                  onSubmit={handleSignWitness}
                  className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                >
                  <h4 className="text-xs font-bold text-slate-900 font-siliguri">
                    সাক্ষীর তথ্য ও স্বাক্ষর যুক্ত করুন (Witness Signature)
                  </h4>
                  {!canSign ? (
                    <p className="text-xs text-slate-500 font-tiro">
                      আপনার একাউন্টে স্বাক্ষর যুক্ত করার অনুমতি নেই।
                    </p>
                  ) : (
                    <>
                      {(agreement.witnesses || []).some((w) => w.name && w.name.trim()) && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-slate-600 font-siliguri">
                            তালিকাভুক্ত সাক্ষী নির্বাচন করুন (ঐচ্ছিক):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {(agreement.witnesses || [])
                              .filter((w) => w.name && w.name.trim())
                              .map((w, idx) => (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedWitnessId(w.id);
                                    setWitnessName(w.name || '');
                                    setWitnessFatherName(w.fatherName || '');
                                    setWitnessPhone(w.phone || '');
                                    setWitnessNid(w.nid || '');
                                    setWitnessAddress(w.address || '');
                                    setWitnessPartySide(w.partySide || 'সাক্ষী');
                                  }}
                                  className={`px-2 py-1 rounded text-[11px] font-tiro border ${
                                    selectedWitnessId === w.id
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {idx + 1}. {w.name}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={witnessName}
                          onChange={(e) => setWitnessName(e.target.value)}
                          placeholder="সাক্ষীর পূর্ণ নাম *"
                          className="px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={witnessFatherName}
                          onChange={(e) => setWitnessFatherName(e.target.value)}
                          placeholder="পিতার নাম"
                          className="px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={witnessPhone}
                          onChange={(e) => setWitnessPhone(e.target.value)}
                          placeholder="মোবাইল নম্বর"
                          className="px-2.5 py-2 text-xs font-baloo rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={witnessNid}
                          onChange={(e) => setWitnessNid(e.target.value)}
                          placeholder="NID নম্বর"
                          className="px-2.5 py-2 text-xs font-baloo rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={witnessAddress}
                          onChange={(e) => setWitnessAddress(e.target.value)}
                          placeholder="ঠিকানা"
                          className="px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                        />
                        <input
                          type="text"
                          value={witnessPartySide}
                          onChange={(e) => setWitnessPartySide(e.target.value)}
                          placeholder="কোন পক্ষের সাক্ষী"
                          className="px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWitnessMethod('DRAW_TOUCH')}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-siliguri ${
                            witnessMethod === 'DRAW_TOUCH'
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          আঁকা স্বাক্ষর
                        </button>
                        <button
                          type="button"
                          onClick={() => setWitnessMethod('TYPED_ELECTRONIC')}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-siliguri ${
                            witnessMethod === 'TYPED_ELECTRONIC'
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          টাইপকৃত স্বাক্ষর
                        </button>
                      </div>

                      {witnessMethod === 'DRAW_TOUCH' ? (
                        <SignatureCanvasPad
                          onChangeDataUrl={setWitnessCanvasUrl}
                          clearSignal={witnessCanvasReset}
                          label="সাক্ষীর স্বাক্ষর আঁকুন *"
                        />
                      ) : (
                        <input
                          type="text"
                          value={witnessTypedText}
                          onChange={(e) => setWitnessTypedText(e.target.value)}
                          placeholder="সাক্ষীর টাইপকৃত স্বাক্ষর..."
                          className="w-full px-3 py-2 text-sm italic font-serif rounded-lg border border-slate-200"
                        />
                      )}

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold font-siliguri disabled:opacity-60"
                      >
                        {busy ? 'সংরক্ষণ হচ্ছে...' : 'সাক্ষীর স্বাক্ষর সংরক্ষণ করুন'}
                      </button>
                    </>
                  )}
                </form>

                {/* Recorded Witness Signatures + Signature Audit Trail */}
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-800 font-siliguri">
                      সংরক্ষিত সাক্ষী স্বাক্ষর ({agreement.witnessSignatures?.length || 0}টি)
                    </h4>
                    {(agreement.witnessSignatures || []).length === 0 ? (
                      <p className="text-xs text-slate-500 font-tiro">এখনো কোনো সাক্ষীর ডিজিটাল স্বাক্ষর যুক্ত হয়নি।</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(agreement.witnessSignatures || []).map((ws) => (
                          <div
                            key={ws.id}
                            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 font-siliguri truncate">
                                {ws.witnessName} {ws.partySide ? `(${ws.partySide})` : ''}
                              </p>
                              <p className="text-[10px] text-slate-500 font-baloo">
                                v{ws.versionNumber} · {formatDateTimeBn(ws.signedAt)}
                              </p>
                            </div>
                            {ws.signatureImageDataUrl ? (
                              <img
                                src={ws.signatureImageDataUrl}
                                alt={ws.witnessName}
                                className="h-8 max-w-[110px] object-contain bg-white rounded border border-slate-200 px-1 shrink-0"
                              />
                            ) : (
                              <span className="italic font-serif text-slate-800 shrink-0">
                                {ws.typedSignatureText}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 font-siliguri flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>অপরিবর্তনীয় স্বাক্ষর অডিট ট্রেইল ({agreement.signatureAuditTrail?.length || 0})</span>
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {[...(agreement.signatureAuditTrail || [])].reverse().map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-tiro"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 font-siliguri">
                              {ev.eventType} · v{ev.versionNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 font-baloo">
                              {formatDateTimeBn(ev.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-0.5">{ev.detailsBn}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            Actor: {ev.actorName} · Hash: {ev.documentHash.slice(0, 16)}…
                          </p>
                        </div>
                      ))}
                      {(agreement.signatureAuditTrail || []).length === 0 && (
                        <p className="text-xs text-slate-500 font-tiro">এখনো কোনো স্বাক্ষর ইভেন্ট রেকর্ড হয়নি।</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ TAB 3: VERSION HISTORY & AMENDMENTS ============ */}
          {activeTab === 'versions' && (
            <div className="space-y-5">
              {/* Side-by-side Version Comparison */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
                    <GitCompare className="w-4 h-4 text-emerald-700" />
                    <span>ভার্সন ইতিহাস ও তুলনা (Version History & Diff)</span>
                  </h4>
                  {versionHistory.length >= 2 && (
                    <div className="flex items-center gap-2 text-xs font-siliguri">
                      <select
                        value={compareLeftVer}
                        onChange={(e) => setCompareLeftVer(Number(e.target.value))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-baloo"
                      >
                        {versionHistory.map((v) => (
                          <option key={v.id} value={v.versionNumber}>
                            পূর্ববর্তী: v{v.versionNumber}
                          </option>
                        ))}
                      </select>
                      <span className="text-slate-400">বনাম</span>
                      <select
                        value={compareRightVer}
                        onChange={(e) => setCompareRightVer(Number(e.target.value))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-baloo"
                      >
                        {versionHistory.map((v) => (
                          <option key={v.id} value={v.versionNumber}>
                            পরবর্তী: v{v.versionNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Version Timeline Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {versionHistory.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold font-baloo text-emerald-800">
                          ভার্সন v{snap.versionNumber}
                          {snap.isAmendment ? ' (সংশোধনী)' : ''}
                        </span>
                        <span className="text-[10px] text-slate-500 font-baloo">
                          {formatDateTimeBn(snap.changedAt)}
                        </span>
                      </div>
                      <p className="font-tiro text-slate-800 font-medium">{snap.changeSummary}</p>
                      <p className="text-[11px] text-slate-500 font-tiro">
                        সম্পাদক: {snap.changedByName} · অনুমোদন: {snap.approvalStatusAtSnapshot} · স্বাক্ষর:{' '}
                        <span className="font-baloo">{snap.signatureCountAtSnapshot}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        Hash: {snap.documentHash}
                      </p>
                    </div>
                  ))}
                  {versionHistory.length === 0 && (
                    <p className="text-xs text-slate-500 font-tiro">
                      ভার্সন ১ সক্রিয় রয়েছে। পরবর্তী যেকোনো পরিবর্তন এখানে পূর্ণ ইতিহাসে সংরক্ষিত হবে।
                    </p>
                  )}
                </div>

                {/* Side-by-Side Comparison Cards when 2 versions exist */}
                {leftSnapshot && rightSnapshot && leftSnapshot.versionNumber !== rightSnapshot.versionNumber && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    {[
                      { label: `পূর্ববর্তী ভার্সন v${leftSnapshot.versionNumber}`, snap: leftSnapshot, tone: 'bg-slate-50 border-slate-200' },
                      { label: `পরবর্তী ভার্সন v${rightSnapshot.versionNumber}`, snap: rightSnapshot, tone: 'bg-emerald-50/40 border-emerald-200' },
                    ].map(({ label, snap, tone }) => (
                      <div key={label} className={`p-3 rounded-xl border ${tone} text-xs space-y-2 font-tiro`}>
                        <p className="font-bold font-siliguri text-slate-900">{label}</p>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-siliguri">শিরোনাম</span>
                          <p className="font-semibold text-slate-800">{snap.snapshotData.title}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-siliguri">মেয়াদ</span>
                          <p className="font-baloo text-slate-800">
                            {snap.snapshotData.expiryDate || snap.snapshotData.durationText || '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-siliguri">সাধারণ শর্তাবলি</span>
                          <p className="whitespace-pre-line text-slate-700 max-h-40 overflow-y-auto bg-white/80 p-2 rounded border border-slate-200/70">
                            {snap.snapshotData.generalClauses}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Version or Amendment Form */}
              {canCreateVersion && (
                <form
                  onSubmit={handleCreateVersionOrAmendment}
                  className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
                        <FilePlus2 className="w-4 h-4 text-emerald-700" />
                        <span>নতুন ভার্সন (v{currentVersion + 1}) অথবা সংশোধনী চুক্তি (Amendment) তৈরি করুন</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                        স্বাক্ষরিত চুক্তি কখনো নীরবে পরিবর্তন হয় না — এখানে নতুন ভার্সন বা পৃথক সংশোধনী চুক্তি তৈরি করলে পূর্বের অনুমোদন ও স্বাক্ষরের রেকর্ড সম্পূর্ণ অক্ষুণ্ণ থাকে
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAmendmentMode(false)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-siliguri ${
                          !isAmendmentMode
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        নতুন ভার্সন (v{currentVersion + 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAmendmentMode(true)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-siliguri ${
                          isAmendmentMode
                            ? 'bg-indigo-700 text-white border-indigo-700'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        সংশোধনী চুক্তি (Amendment)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {isAmendmentMode && (
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          সংশোধনী চুক্তির শিরোনাম (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={amendmentTitle}
                          onChange={(e) => setAmendmentTitle(e.target.value)}
                          placeholder={`${agreement.title} — সংশোধনী`}
                          className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        পরিবর্তনের সংক্ষিপ্ত বিবরণ (Change Summary) *
                      </label>
                      <input
                        type="text"
                        required
                        value={changeSummary}
                        onChange={(e) => setChangeSummary(e.target.value)}
                        placeholder="যেমন: কাজের মেয়াদ ৩০ দিন বৃদ্ধি ও ৪নং শর্ত সংশোধন করা হয়েছে"
                        className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        হালনাগাদ শিরোনাম
                      </label>
                      <input
                        type="text"
                        value={verTitle}
                        onChange={(e) => setVerTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          নতুন মেয়াদোত্তীর্ণ তারিখ
                        </label>
                        <input
                          type="date"
                          value={verExpiryDate}
                          onChange={(e) => setVerExpiryDate(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs font-baloo rounded-lg border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          মেয়াদকাল (কথায়)
                        </label>
                        <input
                          type="text"
                          value={verDurationText}
                          onChange={(e) => setVerDurationText(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        সংশোধিত সাধারণ শর্তাবলি
                      </label>
                      <textarea
                        rows={4}
                        value={verGeneralClauses}
                        onChange={(e) => setVerGeneralClauses(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        সংশোধিত বিশেষ শর্তাবলি (ঐচ্ছিক)
                      </label>
                      <textarea
                        rows={2}
                        value={verSpecialClauses}
                        onChange={(e) => setVerSpecialClauses(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className={`w-full py-2.5 rounded-lg text-white text-xs font-semibold font-siliguri disabled:opacity-60 ${
                      isAmendmentMode
                        ? 'bg-indigo-700 hover:bg-indigo-800'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    {busy
                      ? 'তৈরি হচ্ছে...'
                      : isAmendmentMode
                      ? 'নতুন সংশোধনী চুক্তি (Amendment) তৈরি করুন'
                      : `নতুন ভার্সন v${currentVersion + 1} সংরক্ষণ করুন`}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ============ TAB 4: CLOSURE, TERMINATION & ARCHIVE ============ */}
          {activeTab === 'archive' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Closure / Termination Form */}
              <form
                onSubmit={handleCloseAgreement}
                className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
              >
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-bold text-slate-900 font-siliguri">
                    চুক্তি সমাপ্তি / মেয়াদোত্তীর্ণ / অবসান / বাতিল
                  </h4>
                  <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                    সম্পন্ন, মেয়াদোত্তীর্ণ, অবসানকৃত বা বাতিল করার ক্ষেত্রে সুনির্দিষ্ট কারণ লিপিবদ্ধ করা বাধ্যতামূলক
                  </p>
                </div>

                {agreement.closureInfo && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-tiro space-y-1">
                    <p className="font-bold font-siliguri text-slate-800">
                      সর্বশেষ সমাপ্তি রেকর্ড: {AGREEMENT_STATUS_META[agreement.closureInfo.action]?.labelBn}
                    </p>
                    <p className="text-slate-700">কারণ: {agreement.closureInfo.reason}</p>
                    <p className="text-[11px] text-slate-500">
                      নথিভুক্তকারী: {agreement.closureInfo.recordedByName} ·{' '}
                      {formatDateTimeBn(agreement.closureInfo.recordedAt)}
                    </p>
                  </div>
                )}

                {!canApprove && !canReject ? (
                  <p className="text-xs text-slate-500 font-tiro">
                    আপনার একাউন্টে চুক্তি সমাপ্ত বা বাতিল করার অনুমতি নেই।
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          চূড়ান্ত অবস্থা *
                        </label>
                        <select
                          value={closureAction}
                          onChange={(e) =>
                            setClosureAction(e.target.value as AgreementClosureInfo['action'])
                          }
                          className="w-full px-2.5 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="COMPLETED">সম্পন্ন (Completed)</option>
                          <option value="EXPIRED">মেয়াদোত্তীর্ণ (Expired)</option>
                          <option value="TERMINATED">সমাপ্ত / অবসানকৃত (Terminated)</option>
                          <option value="CANCELLED">বাতিল (Cancelled)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          কার্যকর তারিখ
                        </label>
                        <input
                          type="date"
                          value={closureDate}
                          onChange={(e) => setClosureDate(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs font-baloo rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                        সুনির্দিষ্ট কারণ (বাধ্যতামূলক) *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={closureReason}
                        onChange={(e) => setClosureReason(e.target.value)}
                        placeholder="চুক্তি সম্পন্ন, মেয়াদোত্তীর্ণ, অবসান বা বাতিলের বিস্তারিত কারণ লিখুন..."
                        className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                      />
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-tiro text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alsoArchive}
                        onChange={(e) => setAlsoArchive(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-700"
                      />
                      <span>একসাথে আর্কাইভে সংরক্ষণ করুন</span>
                    </label>

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold font-siliguri disabled:opacity-60"
                    >
                      {busy ? 'সংরক্ষণ হচ্ছে...' : 'সমাপ্তি / বাতিল রেকর্ড সংরক্ষণ করুন'}
                    </button>
                  </>
                )}
              </form>

              {/* Archive / Unarchive Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-slate-700" />
                    <span>আর্কাইভ ব্যবস্থাপনা (Archive Control)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                    আর্কাইভ করলে চুক্তিপত্রটি সক্রিয় তালিকা থেকে সরে গিয়ে স্থায়ী আর্কাইভ রেজিস্টারে সংরক্ষিত থাকবে (কখনো মুছে যাবে না)
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-tiro space-y-1">
                  <p>
                    বর্তমান অবস্থা:{' '}
                    <strong className="font-siliguri text-slate-900">
                      {agreement.isArchived ? 'আর্কাইভকৃত (Archived)' : 'সক্রিয় তালিকায় আছে'}
                    </strong>
                  </p>
                  {agreement.isArchived && agreement.archivedAt && (
                    <p className="text-[11px] text-slate-500">
                      আর্কাইভকারী: {agreement.archivedByName} · {formatDateTimeBn(agreement.archivedAt)}
                    </p>
                  )}
                  {agreement.archiveNote && (
                    <p className="text-[11px] text-slate-600">নোট: {agreement.archiveNote}</p>
                  )}
                </div>

                {(canApprove || canReject) && (
                  <>
                    {!agreement.isArchived && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                          আর্কাইভ নোট / রেফারেন্স (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={archiveNote}
                          onChange={(e) => setArchiveNote(e.target.value)}
                          placeholder="যেমন: ফাইল ক্যাবিনেট-০২, বার্ষিক নথি ২০২৬"
                          className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleArchive(!agreement.isArchived)}
                      className={`w-full py-2.5 rounded-lg text-xs font-semibold font-siliguri disabled:opacity-60 ${
                        agreement.isArchived
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-amber-700 hover:bg-amber-800 text-white'
                      }`}
                    >
                      {busy
                        ? 'হালনাগাদ হচ্ছে...'
                        : agreement.isArchived
                        ? 'আর্কাইভ থেকে সক্রিয় তালিকায় ফিরিয়ে আনুন'
                        : 'চুক্তিপত্রটি আর্কাইভে সংরক্ষণ করুন'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

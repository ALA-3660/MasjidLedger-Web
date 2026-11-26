import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  X,
  Users,
  UserPlus,
  Hammer,
  Landmark,
  AlertTriangle,
  FileText,
  Paperclip,
  ShieldCheck,
  Info,
  Sparkles,
  Camera,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { Mosque } from '../../types';
import {
  AgreementAiDraftResult,
  AgreementAttachmentRef,
  AgreementCategoryDef,
  AgreementConstructionDetails,
  AgreementLandWaqfDetails,
  AgreementParty,
  AgreementPartyType,
  AgreementPaymentScheduleItem,
  AgreementRecord,
  AgreementRepresentative,
  AgreementStatus,
  AgreementTemplateDef,
  AgreementWitness,
  WrittenPaymentMode,
} from '../../types/agreementTypes';
import {
  AGREEMENT_PARTY_TYPE_LABELS,
  AGREEMENT_STATUS_META,
  getOrdinalPartyRoleBn,
  isAgreementLockedForDirectEdit,
  isConstructionCategoryCode,
  isWaqfOrLandCategoryCode,
  WRITTEN_PAYMENT_MODE_LABELS,
} from '../../lib/agreementCatalog';
import { AgreementAiAssistantModal } from './AgreementAiAssistantModal';
import { AgreementClauseAssistModal } from './AgreementClauseAssistModal';
import { AgreementReviewPanelModal } from './AgreementReviewPanelModal';
import {
  AgreementOcrScannerModal,
  AgreementOcrVerifiedApplyPayload,
} from './AgreementOcrScannerModal';

interface AgreementFormViewProps {
  mosque?: Mosque | null;
  categories: AgreementCategoryDef[];
  templates: AgreementTemplateDef[];
  editingAgreement?: AgreementRecord | null;
  presetCategoryCode?: string;
  presetTemplate?: AgreementTemplateDef | null;
  initialAiDraft?: AgreementAiDraftResult | null;
  onSave: (payload: Partial<AgreementRecord>, editingId?: string) => Promise<void>;
  onCancel: () => void;
}

function makeTempId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultParties(mosque?: Mosque | null): AgreementParty[] {
  const mosqueName = mosque?.nameBn || mosque?.name || 'মসজিদ পরিচালনা কমিটি';
  const mosqueAddr = mosque?.address || '';
  return [
    {
      id: makeTempId('party'),
      roleLabel: 'প্রথম পক্ষ',
      roleOrder: 1,
      partyType: 'MOSQUE_COMMITTEE',
      name: mosqueName,
      address: mosqueAddr,
      phone: mosque?.phone || '',
      nidOrRegNo: mosque?.registrationNumber || '',
      representatives: [
        {
          id: makeTempId('rep'),
          name: '',
          designation: 'সভাপতি / সাধারণ সম্পাদক',
          phone: '',
          nid: '',
          authorityBasis: 'মসজিদ পরিচালনা কমিটির রেজুলেশন নং ও তারিখ অনুযায়ী ক্ষমতাপ্রাপ্ত',
          isSignatory: true,
        },
      ],
    },
    {
      id: makeTempId('party'),
      roleLabel: 'দ্বিতীয় পক্ষ',
      roleOrder: 2,
      partyType: 'INDIVIDUAL',
      name: '',
      address: '',
      phone: '',
      nidOrRegNo: '',
      representatives: [],
    },
  ];
}

export const AgreementFormView: React.FC<AgreementFormViewProps> = ({
  mosque,
  categories,
  templates,
  editingAgreement,
  presetCategoryCode,
  presetTemplate,
  initialAiDraft,
  onSave,
  onCancel,
}) => {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState(editingAgreement?.title || presetTemplate?.titleBn || '');
  const [categoryCode, setCategoryCode] = useState(
    editingAgreement?.categoryCode || presetTemplate?.categoryCode || presetCategoryCode || 'CONSTRUCTION'
  );
  const [status, setStatus] = useState<AgreementStatus>(editingAgreement?.status || 'DRAFT');
  const [agreementDate, setAgreementDate] = useState(editingAgreement?.agreementDate || todayIso);
  const [effectiveDate, setEffectiveDate] = useState(editingAgreement?.effectiveDate || todayIso);
  const [expiryDate, setExpiryDate] = useState(editingAgreement?.expiryDate || '');
  const [durationText, setDurationText] = useState(editingAgreement?.durationText || '');
  const [executionPlace, setExecutionPlace] = useState(
    editingAgreement?.executionPlace || mosque?.address || mosque?.nameBn || ''
  );
  const [purpose, setPurpose] = useState(editingAgreement?.purpose || presetTemplate?.defaultPurpose || '');
  const [enforceSigningOrder, setEnforceSigningOrder] = useState<boolean>(
    Boolean(editingAgreement?.enforceSigningOrder)
  );
  const lockedForDirectEdit = isAgreementLockedForDirectEdit(editingAgreement);
  const preApprovalStatuses: AgreementStatus[] = [
    'DRAFT',
    'INFORMATION_PENDING',
    'AI_REVIEWED',
    'UNDER_REVIEW',
    'PENDING_APPROVAL',
  ];

  // Multi-Party & Multiple Representatives
  const [parties, setParties] = useState<AgreementParty[]>(
    editingAgreement?.parties?.length ? editingAgreement.parties : createDefaultParties(mosque)
  );

  // Dynamic Construction Section
  const [constructionDetails, setConstructionDetails] = useState<AgreementConstructionDetails>(
    editingAgreement?.constructionDetails || {
      dimensionUnit: 'ফুট',
      quantityUnit: 'বর্গফুট',
      ...(presetTemplate?.defaultConstructionDetails || {}),
    }
  );
  const [forceShowConstruction, setForceShowConstruction] = useState(Boolean(editingAgreement?.constructionDetails));

  // Dynamic Land / Waqf / Road Right Section
  const [landWaqfDetails, setLandWaqfDetails] = useState<AgreementLandWaqfDetails>(
    editingAgreement?.landWaqfDetails || {
      landAreaUnit: 'শতাংশ',
      roadUnit: 'ফুট',
      waqfLegalReviewRequired: true,
      waqfLegalCautionAcknowledged: false,
      ...(presetTemplate?.defaultLandWaqfDetails || {}),
    }
  );
  const [forceShowLandWaqf, setForceShowLandWaqf] = useState(Boolean(editingAgreement?.landWaqfDetails));

  // Written Financial Terms (Zero Financial Integration)
  const [payMode, setPayMode] = useState<WrittenPaymentMode>(
    editingAgreement?.writtenFinancialTerms?.mode ||
      presetTemplate?.defaultWrittenFinancialMode ||
      'NON_FINANCIAL'
  );
  const [totalWrittenAmount, setTotalWrittenAmount] = useState(
    editingAgreement?.writtenFinancialTerms?.totalWrittenAmount || ''
  );
  const [paymentTermsNote, setPaymentTermsNote] = useState(
    editingAgreement?.writtenFinancialTerms?.paymentTermsNote || ''
  );
  const [schedules, setSchedules] = useState<AgreementPaymentScheduleItem[]>(
    editingAgreement?.writtenFinancialTerms?.schedules || []
  );

  // Clauses
  const [generalClauses, setGeneralClauses] = useState(
    editingAgreement?.generalClauses || presetTemplate?.defaultGeneralClauses || ''
  );
  const [specialClauses, setSpecialClauses] = useState(
    editingAgreement?.specialClauses || presetTemplate?.defaultSpecialClauses || ''
  );
  const [terminationClause, setTerminationClause] = useState(
    editingAgreement?.terminationClause || presetTemplate?.defaultTerminationClause || ''
  );
  const [disputeResolutionClause, setDisputeResolutionClause] = useState(
    editingAgreement?.disputeResolutionClause || presetTemplate?.defaultDisputeResolutionClause || ''
  );

  // Witnesses & Attachments
  const [witnesses, setWitnesses] = useState<AgreementWitness[]>(
    editingAgreement?.witnesses?.length
      ? editingAgreement.witnesses
      : [
          { id: makeTempId('wit'), name: '', fatherName: '', address: '', phone: '', partySide: 'প্রথম পক্ষের সাক্ষী' },
          { id: makeTempId('wit'), name: '', fatherName: '', address: '', phone: '', partySide: 'দ্বিতীয় পক্ষের সাক্ষী' },
        ]
  );
  const [attachments, setAttachments] = useState<AgreementAttachmentRef[]>(editingAgreement?.attachments || []);
  const [templateIdUsed, setTemplateIdUsed] = useState<string | undefined>(
    editingAgreement?.templateIdUsed || presetTemplate?.id
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Part 2: AI Assistant, Clause Assistant, Risk Review & Zero-Storage OCR modals
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [showClauseAssistModal, setShowClauseAssistModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [aiMissingQuestions, setAiMissingQuestions] = useState<string[]>([]);
  const [ocrBannerMsg, setOcrBannerMsg] = useState<string | null>(null);

  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.code === categoryCode),
    [categories, categoryCode]
  );

  const showConstructionSection =
    forceShowConstruction || isConstructionCategoryCode(categoryCode, categories);
  const showLandWaqfSection =
    forceShowLandWaqf || isWaqfOrLandCategoryCode(categoryCode, categories);
  const isRoadCategory =
    categoryCode === 'ROAD_RIGHT_OF_WAY' || activeCategoryObj?.formProfile === 'ROAD_RIGHT';

  useEffect(() => {
    if (payMode === 'INSTALLMENT' && schedules.length === 0) {
      setSchedules([
        {
          id: makeTempId('pay'),
          stageTitle: '১ম কিস্তি (কাজ শুরু / স্বাক্ষর পর্যায়)',
          condition: 'চুক্তি স্বাক্ষর ও প্রাথমিক প্রস্তুতি সম্পন্ন হলে',
          timingOrMilestone: 'স্বাক্ষরের দিন',
          writtenAmount: '',
        },
        {
          id: makeTempId('pay'),
          stageTitle: '২য় কিস্তি (চূড়ান্ত হস্তান্তর পর্যায়)',
          condition: 'কাজ সন্তোষজনকভাবে সম্পন্ন ও হস্তান্তর হলে',
          timingOrMilestone: 'সমাপ্তি পর্যায়ে',
          writtenAmount: '',
        },
      ]);
    }
  }, [payMode, schedules.length]);

  const handleApplyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setTemplateIdUsed(tpl.id);
    setCategoryCode(tpl.categoryCode);
    if (!title.trim()) setTitle(tpl.titleBn);
    if (tpl.defaultPurpose) setPurpose(tpl.defaultPurpose);
    setGeneralClauses(tpl.defaultGeneralClauses);
    if (tpl.defaultSpecialClauses) setSpecialClauses(tpl.defaultSpecialClauses);
    if (tpl.defaultTerminationClause) setTerminationClause(tpl.defaultTerminationClause);
    if (tpl.defaultDisputeResolutionClause) setDisputeResolutionClause(tpl.defaultDisputeResolutionClause);
    if (tpl.defaultWrittenFinancialMode) setPayMode(tpl.defaultWrittenFinancialMode);
    if (tpl.defaultConstructionDetails) {
      setConstructionDetails((prev) => ({ ...prev, ...tpl.defaultConstructionDetails }));
    }
    if (tpl.defaultLandWaqfDetails) {
      setLandWaqfDetails((prev) => ({ ...prev, ...tpl.defaultLandWaqfDetails }));
    }
  };

  // Part 2: Apply AI-generated draft cleanly into form state (strictly preserving placeholders)
  const applyAiDraftToForm = (draft: AgreementAiDraftResult) => {
    if (draft.detectedCategoryCode) {
      const catExists = categories.some((c) => c.code === draft.detectedCategoryCode);
      if (catExists) setCategoryCode(draft.detectedCategoryCode);
    }
    if (draft.title) setTitle(draft.title);
    if (draft.purpose) setPurpose(draft.purpose);
    if (draft.durationText) setDurationText(draft.durationText);

    if (Array.isArray(draft.parties) && draft.parties.length >= 2) {
      const mappedParties: AgreementParty[] = draft.parties.map((p, idx) => ({
        id: makeTempId('party'),
        roleLabel: p.roleLabel || getOrdinalPartyRoleBn(idx + 1),
        roleOrder: idx + 1,
        partyType: p.partyType || (idx === 0 ? 'MOSQUE_COMMITTEE' : 'INDIVIDUAL'),
        name: p.name || '',
        address: p.address || '',
        phone: p.phone || '',
        nidOrRegNo: p.nidOrRegNo || '',
        representatives: Array.isArray(p.representatives)
          ? p.representatives.map((r) => ({
              id: makeTempId('rep'),
              name: r.name || '',
              designation: r.designation || '',
              authorityBasis: r.authorityBasis || '',
              isSignatory: r.isSignatory !== false,
            }))
          : [],
      }));
      setParties(mappedParties);
    }

    if (draft.constructionDetails && Object.keys(draft.constructionDetails).length > 0) {
      setForceShowConstruction(true);
      setConstructionDetails((prev) => ({
        ...prev,
        ...draft.constructionDetails,
      }));
    }

    if (draft.landWaqfDetails && Object.keys(draft.landWaqfDetails).length > 0) {
      setForceShowLandWaqf(true);
      setLandWaqfDetails((prev) => ({
        ...prev,
        ...draft.landWaqfDetails,
        waqfLegalReviewRequired: true,
        waqfLegalCautionAcknowledged: false,
      }));
    }

    if (draft.writtenFinancialTerms) {
      setPayMode(draft.writtenFinancialTerms.mode || 'NON_FINANCIAL');
      setTotalWrittenAmount(draft.writtenFinancialTerms.totalWrittenAmount || '');
      setPaymentTermsNote(draft.writtenFinancialTerms.paymentTermsNote || '');
      if (Array.isArray(draft.writtenFinancialTerms.schedules)) {
        setSchedules(
          draft.writtenFinancialTerms.schedules.map((s) => ({
            id: makeTempId('pay'),
            stageTitle: s.stageTitle || '',
            condition: s.condition || '',
            timingOrMilestone: s.timingOrMilestone || '',
            writtenAmount: s.writtenAmount || '',
          }))
        );
      }
    }

    if (draft.generalClauses) setGeneralClauses(draft.generalClauses);
    if (draft.specialClauses !== undefined) setSpecialClauses(draft.specialClauses || '');
    if (draft.terminationClause !== undefined) setTerminationClause(draft.terminationClause || '');
    if (draft.disputeResolutionClause !== undefined) {
      setDisputeResolutionClause(draft.disputeResolutionClause || '');
    }

    setAiMissingQuestions(Array.isArray(draft.missingInfoQuestions) ? draft.missingInfoQuestions : []);
    setShowAiDraftModal(false);
  };

  useEffect(() => {
    if (initialAiDraft && !editingAgreement) {
      applyAiDraftToForm(initialAiDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAiDraft]);

  // Part 2: Apply user-verified OCR data (Zero-Storage: only structured text mapped after verification)
  const handleApplyOcrVerified = (payload: AgreementOcrVerifiedApplyPayload) => {
    const appliedParts: string[] = [];

    if (payload.partyData) {
      const idx = Math.max(0, Math.min(payload.targetPartyIndex, parties.length - 1));
      const pd = payload.partyData;
      setParties((prev) =>
        prev.map((party, i) => {
          if (i !== idx) return party;
          if (payload.applyToRepresentative || payload.docType === 'COMMITTEE_RESOLUTION') {
            const newRep: AgreementRepresentative = {
              id: makeTempId('rep'),
              name: pd.name || '',
              designation: pd.designation || 'ক্ষমতাপ্রাপ্ত প্রতিনিধি',
              phone: pd.phone || '',
              nid: pd.nidOrRegNo || '',
              authorityBasis: pd.authorityBasis || '',
              isSignatory: true,
            };
            const hasEmptyFirstRep =
              party.representatives.length === 1 && !party.representatives[0].name.trim();
            return {
              ...party,
              representatives: hasEmptyFirstRep
                ? [{ ...party.representatives[0], ...newRep, id: party.representatives[0].id }]
                : [...party.representatives, newRep],
            };
          }
          return {
            ...party,
            name: pd.name || party.name,
            fatherOrOrgHead: pd.fatherOrOrgHead || party.fatherOrOrgHead,
            nidOrRegNo: pd.nidOrRegNo || party.nidOrRegNo,
            address: pd.address || party.address,
            phone: pd.phone || party.phone,
          };
        })
      );
      appliedParts.push(
        payload.applyToRepresentative || payload.docType === 'COMMITTEE_RESOLUTION'
          ? `${parties[idx]?.roleLabel || 'নির্বাচিত পক্ষ'} এর প্রতিনিধি`
          : `${parties[idx]?.roleLabel || 'নির্বাচিত পক্ষ'} এর তথ্য`
      );
    }

    if (payload.landWaqfData) {
      const ld = payload.landWaqfData;
      setForceShowLandWaqf(true);
      setLandWaqfDetails((prev) => ({
        ...prev,
        mouza: ld.mouza || prev.mouza,
        jlNumber: ld.jlNumber || prev.jlNumber,
        khatianNumber: ld.khatianNumber || prev.khatianNumber,
        dagNumber: ld.dagNumber || prev.dagNumber,
        landArea: ld.landArea || prev.landArea,
        landAreaUnit: ld.landAreaUnit || prev.landAreaUnit || 'শতাংশ',
        proposedPortionDesc: ld.proposedPortionDesc || prev.proposedPortionDesc,
        waqfLegalReviewRequired: true,
        waqfLegalCautionAcknowledged: false,
      }));
      appliedParts.push('জমি/ওয়াকফ তফসিল');
    }

    if (payload.clausesData) {
      const cd = payload.clausesData;
      if (cd.suggestedTitle && !title.trim()) setTitle(cd.suggestedTitle);
      if (cd.suggestedPurpose && !purpose.trim()) setPurpose(cd.suggestedPurpose);
      if (cd.extractedClauses) {
        setGeneralClauses((prev) =>
          prev.trim() ? `${prev.trim()}\n\n${cd.extractedClauses}` : cd.extractedClauses || ''
        );
      }
      appliedParts.push('চুক্তির শর্তাবলি');
    }

    setOcrBannerMsg(
      `ব্যবহারকারীর যাচাইকৃত OCR তথ্য ফর্মে যুক্ত হয়েছে (${appliedParts.join(', ') || 'সাধারণ তথ্য'})। ছবি সার্ভারে সংরক্ষণ করা হয়নি।`
    );
    setShowOcrModal(false);
  };

  // Party & Representative handlers
  const handleAddParty = () => {
    const nextOrder = parties.length + 1;
    setParties((prev) => [
      ...prev,
      {
        id: makeTempId('party'),
        roleLabel: getOrdinalPartyRoleBn(nextOrder),
        roleOrder: nextOrder,
        partyType: 'INDIVIDUAL',
        name: '',
        address: '',
        phone: '',
        nidOrRegNo: '',
        representatives: [],
      },
    ]);
  };

  const handleRemoveParty = (partyId: string) => {
    if (parties.length <= 2) return;
    setParties((prev) =>
      prev
        .filter((p) => p.id !== partyId)
        .map((p, idx) => ({ ...p, roleOrder: idx + 1, roleLabel: p.roleLabel || getOrdinalPartyRoleBn(idx + 1) }))
    );
  };

  const handleUpdateParty = (partyId: string, patch: Partial<AgreementParty>) => {
    setParties((prev) => prev.map((p) => (p.id === partyId ? { ...p, ...patch } : p)));
  };

  const handleAddRepresentative = (partyId: string) => {
    const newRep: AgreementRepresentative = {
      id: makeTempId('rep'),
      name: '',
      designation: '',
      phone: '',
      nid: '',
      authorityBasis: '',
      isSignatory: true,
    };
    setParties((prev) =>
      prev.map((p) => (p.id === partyId ? { ...p, representatives: [...p.representatives, newRep] } : p))
    );
  };

  const handleUpdateRepresentative = (
    partyId: string,
    repId: string,
    patch: Partial<AgreementRepresentative>
  ) => {
    setParties((prev) =>
      prev.map((p) =>
        p.id === partyId
          ? {
              ...p,
              representatives: p.representatives.map((r) => (r.id === repId ? { ...r, ...patch } : r)),
            }
          : p
      )
    );
  };

  const handleRemoveRepresentative = (partyId: string, repId: string) => {
    setParties((prev) =>
      prev.map((p) =>
        p.id === partyId
          ? { ...p, representatives: p.representatives.filter((r) => r.id !== repId) }
          : p
      )
    );
  };

  // Payment Schedule handlers
  const handleAddScheduleRow = () => {
    setSchedules((prev) => [
      ...prev,
      {
        id: makeTempId('pay'),
        stageTitle: `${prev.length + 1}ম কিস্তি`,
        condition: '',
        timingOrMilestone: '',
        writtenAmount: '',
      },
    ]);
  };

  // Witness handlers
  const handleAddWitness = () => {
    setWitnesses((prev) => [
      ...prev,
      { id: makeTempId('wit'), name: '', fatherName: '', address: '', phone: '', partySide: '' },
    ]);
  };

  // Attachment reference handlers
  const handleAddAttachmentRef = () => {
    setAttachments((prev) => [
      ...prev,
      {
        id: makeTempId('att'),
        title: '',
        docType: 'দলিল / নকশা / রেজুলেশন',
        referenceNo: '',
        url: '',
        notes: '',
        addedAt: new Date().toISOString(),
      },
    ]);
  };

  const buildCurrentDraftPayload = (): Partial<AgreementRecord> => ({
    title: title.trim(),
    categoryCode,
    categoryNameBn: activeCategoryObj?.nameBn,
    status,
    agreementDate,
    effectiveDate: effectiveDate || undefined,
    expiryDate: expiryDate || undefined,
    durationText: durationText.trim() || undefined,
    executionPlace: executionPlace.trim() || undefined,
    purpose: purpose.trim() || title.trim(),
    parties: parties.map((p, idx) => ({
      ...p,
      roleOrder: idx + 1,
      roleLabel: p.roleLabel.trim() || getOrdinalPartyRoleBn(idx + 1),
      name: p.name.trim(),
      representatives: p.representatives.filter((r) => r.name.trim()),
    })),
    constructionDetails: showConstructionSection ? constructionDetails : undefined,
    landWaqfDetails: showLandWaqfSection ? landWaqfDetails : undefined,
    writtenFinancialTerms: {
      mode: payMode,
      totalWrittenAmount: payMode === 'NON_FINANCIAL' ? undefined : totalWrittenAmount.trim() || undefined,
      paymentTermsNote: paymentTermsNote.trim() || undefined,
      schedules:
        payMode === 'NON_FINANCIAL'
          ? []
          : schedules.filter((s) => s.stageTitle.trim() || s.writtenAmount.trim()),
    },
    generalClauses: generalClauses.trim(),
    specialClauses: specialClauses.trim() || undefined,
    terminationClause: terminationClause.trim() || undefined,
    disputeResolutionClause: disputeResolutionClause.trim() || undefined,
    witnesses: witnesses.filter((w) => w.name.trim()),
    attachments: attachments.filter((a) => a.title.trim()),
    templateIdUsed,
    isWaqfOrLandRelated: showLandWaqfSection,
    enforceSigningOrder,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (lockedForDirectEdit) {
      setErrorMsg(
        'স্বাক্ষরিত বা কার্যকর চুক্তিপত্র সরাসরি সম্পাদনা করা যাবে না। "অনুমোদন ও স্বাক্ষর" প্যানেল থেকে নতুন ভার্সন বা সংশোধনী চুক্তি তৈরি করুন।'
      );
      return;
    }

    if (!title.trim()) {
      setErrorMsg('চুক্তিপত্রের শিরোনাম প্রদান করা আবশ্যক।');
      return;
    }

    const validParties = parties
      .map((p, idx) => ({
        ...p,
        roleOrder: idx + 1,
        roleLabel: p.roleLabel.trim() || getOrdinalPartyRoleBn(idx + 1),
        name: p.name.trim(),
        representatives: p.representatives.filter((r) => r.name.trim()),
      }))
      .filter((p) => p.name);

    if (validParties.length < 2) {
      setErrorMsg('একটি বৈধ চুক্তিপত্রের জন্য কমপক্ষে দুটি পক্ষের নাম লিখতে হবে।');
      return;
    }

    if (!generalClauses.trim()) {
      setErrorMsg('চুক্তির সাধারণ শর্তাবলি খালি রাখা যাবে না।');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<AgreementRecord> = {
        ...buildCurrentDraftPayload(),
        parties: validParties,
      };

      await onSave(payload, editingAgreement?.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'চুক্তিপত্র সংরক্ষণে ত্রুটি হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sticky Action Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-siliguri">
              {editingAgreement
                ? `চুক্তিপত্র সম্পাদনা — ${editingAgreement.agreementNumber}`
                : 'নতুন চুক্তিপত্র তৈরি করুন'}
            </h3>
            <p className="text-xs text-slate-500 font-tiro mt-0.5">
              একাধিক পক্ষ, প্রতিনিধি ও ক্ষমতার ভিত্তি, ক্যাটাগরিভিত্তিক ডায়নামিক তথ্য এবং লিখিত শর্তাবলি পূরণ করুন
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!editingAgreement && templates.length > 0 && (
              <select
                value={templateIdUsed || ''}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-500 max-w-[230px]"
              >
                <option value="">টেমপ্লেট থেকে শর্ত লোড করুন...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titleBn}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
            >
              <X className="w-3.5 h-3.5" />
              <span>বাতিল</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 font-siliguri disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'সংরক্ষণ হচ্ছে...' : editingAgreement ? 'হালনাগাদ করুন' : 'চুক্তিপত্র সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </div>

        {/* Part 2: Smart AI Drafting, Zero-Storage Camera/OCR & Risk Review Toolbar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiDraftModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold font-siliguri"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI খসড়া সহকারী</span>
            </button>
            <button
              type="button"
              onClick={() => setShowOcrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold font-siliguri"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>ক্যামেরা / OCR স্ক্যান (NID, দলিল, রেজুলেশন)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-semibold font-siliguri"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>AI ঝুঁকি ও অসঙ্গতি পর্যালোচনা</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-tiro">
            সেন্ট্রাল AI ও Zero-Storage OCR (চূড়ান্ত অনুমোদন সম্পূর্ণ মানুষের নিয়ন্ত্রণে)
          </span>
        </div>
      </div>

      {/* Dismissible AI Missing Info Checklist */}
      {aiMissingQuestions.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-xs font-bold font-siliguri">
                AI খসড়ায় এখনো অপূর্ণ তথ্য ({aiMissingQuestions.length}টি) — সংরক্ষণের আগে যাচাই ও পূরণ করুন
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAiMissingQuestions([])}
              className="text-amber-700 hover:text-amber-950"
              title="তালিকা বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-900 font-tiro space-y-0.5">
            {aiMissingQuestions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Dismissible Verified OCR Notice */}
      {ocrBannerMsg && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-tiro flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{ocrBannerMsg}</span>
          </div>
          <button type="button" onClick={() => setOcrBannerMsg(null)} className="text-teal-700 hover:text-teal-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-tiro flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: General Info */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 className="text-sm font-bold text-slate-900 font-siliguri">
            ১. সাধারণ তথ্য (General Agreement Information)
          </h4>
          {editingAgreement && (
            <span className="text-xs font-bold font-baloo text-emerald-800">
              নম্বর: {editingAgreement.agreementNumber}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              চুক্তিপত্রের শিরোনাম *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: মসজিদের উত্তর পার্শ্বের অজুখানা নির্মাণ চুক্তিপত্র"
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              চুক্তির ধরন / ক্যাটাগরি (১৩টি মূল + কাস্টম) *
            </label>
            <select
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
            >
              {categories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.nameBn}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              প্রাথমিক স্ট্যাটাস
            </label>
            <select
              value={status}
              disabled={lockedForDirectEdit}
              onChange={(e) => setStatus(e.target.value as AgreementStatus)}
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 disabled:bg-slate-100"
            >
              {(preApprovalStatuses.includes(status)
                ? preApprovalStatuses
                : [...preApprovalStatuses, status]
              ).map((st) => (
                <option key={st} value={st}>
                  {AGREEMENT_STATUS_META[st].shortBn}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              চুক্তির তারিখ *
            </label>
            <input
              type="date"
              required
              value={agreementDate}
              onChange={(e) => setAgreementDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              কার্যকর তারিখ
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              মেয়াদোত্তীর্ণ তারিখ (যদি থাকে)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              মেয়াদকাল (কথায়)
            </label>
            <input
              type="text"
              value={durationText}
              onChange={(e) => setDurationText(e.target.value)}
              placeholder="যেমন: ৬ মাস / ৩ বছর / স্থায়ী"
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              চুক্তি সম্পাদনের স্থান
            </label>
            <input
              type="text"
              value={executionPlace}
              onChange={(e) => setExecutionPlace(e.target.value)}
              placeholder="মসজিদ কার্যালয়, গ্রাম/রোড, থানা, জেলা"
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-7">
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              চুক্তির মূল উদ্দেশ্য *
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="সংক্ষেপে চুক্তির উদ্দেশ্য লিখুন..."
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Optional Dynamic Form Toggles for custom scenarios */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-tiro text-slate-600">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showConstructionSection}
              onChange={(e) => setForceShowConstruction(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>নির্মাণ পরিমাপ ও কাজের বিবরণ সেকশন যুক্ত করুন</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showLandWaqfSection}
              onChange={(e) => setForceShowLandWaqf(e.target.checked)}
              className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            <span>জমি / ওয়াকফ / রাস্তার তফসিল সেকশন যুক্ত করুন</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={enforceSigningOrder}
              onChange={(e) => setEnforceSigningOrder(e.target.checked)}
              className="rounded border-slate-300 text-indigo-700 focus:ring-indigo-600"
            />
            <span>স্বাক্ষরের ক্রম (১, ২, ৩...) বাধ্যতামূলক রাখুন</span>
          </label>
        </div>
      </section>

      {/* SECTION 2: Multi-Party & Multiple Representatives */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>২. পক্ষসমূহ ও প্রতিনিধি (Multi-Party & Multiple Representatives)</span>
            </h4>
            <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
              প্রথম পক্ষ, দ্বিতীয় পক্ষ এবং প্রয়োজনমতো তৃতীয়/চতুর্থ পক্ষ যুক্ত করুন। প্রতিটি পক্ষের একাধিক প্রতিনিধি ও তাঁদের ক্ষমতার ভিত্তি (রেজুলেশন/অনুমোদনপত্র) যুক্ত করা যাবে।
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddParty}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold font-siliguri hover:bg-emerald-100"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>অতিরিক্ত পক্ষ যোগ করুন</span>
          </button>
        </div>

        <div className="space-y-4">
          {parties.map((party, idx) => (
            <div key={party.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-900 font-siliguri">
                    {party.roleLabel || getOrdinalPartyRoleBn(idx + 1)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-slate-500 font-tiro">পক্ষ #{idx + 1}</span>
                </div>
                {parties.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveParty(party.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline font-siliguri"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>পক্ষ অপসারণ</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                    পক্ষের অবস্থান
                  </label>
                  <input
                    type="text"
                    value={party.roleLabel}
                    onChange={(e) => handleUpdateParty(party.id, { roleLabel: e.target.value })}
                    placeholder="প্রথম পক্ষ / দ্বিতীয় পক্ষ"
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                    পক্ষের ধরন
                  </label>
                  <select
                    value={party.partyType}
                    onChange={(e) => handleUpdateParty(party.id, { partyType: e.target.value as AgreementPartyType })}
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    {(Object.keys(AGREEMENT_PARTY_TYPE_LABELS) as AgreementPartyType[]).map((pt) => (
                      <option key={pt} value={pt}>
                        {AGREEMENT_PARTY_TYPE_LABELS[pt]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                    পক্ষের নাম (মসজিদ / ব্যক্তি / প্রতিষ্ঠান) *
                  </label>
                  <input
                    type="text"
                    required
                    value={party.name}
                    onChange={(e) => handleUpdateParty(party.id, { name: e.target.value })}
                    placeholder="পূর্ণ নাম লিখুন..."
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                    পিতা / প্রতিষ্ঠান প্রধান
                  </label>
                  <input
                    type="text"
                    value={party.fatherOrOrgHead || ''}
                    onChange={(e) => handleUpdateParty(party.id, { fatherOrOrgHead: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    value={party.phone || ''}
                    onChange={(e) => handleUpdateParty(party.id, { phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                    এনআইডি / রেজিস্ট্রেশন নং
                  </label>
                  <input
                    type="text"
                    value={party.nidOrRegNo || ''}
                    onChange={(e) => handleUpdateParty(party.id, { nidOrRegNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 font-siliguri mb-1">
                    ঠিকানা
                  </label>
                  <input
                    type="text"
                    value={party.address || ''}
                    onChange={(e) => handleUpdateParty(party.id, { address: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Representatives & Signatories Sub-list */}
              <div className="pt-2.5 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-siliguri">
                    এই পক্ষের প্রতিনিধি ও স্বাক্ষরকারীগণ ({party.representatives.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddRepresentative(party.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 font-siliguri"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>প্রতিনিধি যোগ করুন</span>
                  </button>
                </div>

                {party.representatives.map((rep, rIdx) => (
                  <div
                    key={rep.id}
                    className="p-3 rounded-lg bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        প্রতিনিধির নাম #{rIdx + 1}
                      </label>
                      <input
                        type="text"
                        value={rep.name}
                        onChange={(e) => handleUpdateRepresentative(party.id, rep.id, { name: e.target.value })}
                        placeholder="প্রতিনিধির পূর্ণ নাম"
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        পদবি
                      </label>
                      <input
                        type="text"
                        value={rep.designation}
                        onChange={(e) =>
                          handleUpdateRepresentative(party.id, rep.id, { designation: e.target.value })
                        }
                        placeholder="সভাপতি / সেক্রেটারি / প্রোপ্রাইটর"
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        মোবাইল / এনআইডি
                      </label>
                      <input
                        type="text"
                        value={rep.phone || ''}
                        onChange={(e) => handleUpdateRepresentative(party.id, rep.id, { phone: e.target.value })}
                        placeholder="০১৭..."
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        প্রতিনিধিত্বের ক্ষমতার ভিত্তি (রেজুলেশন নং / অনুমোদনপত্র)
                      </label>
                      <input
                        type="text"
                        value={rep.authorityBasis}
                        onChange={(e) =>
                          handleUpdateRepresentative(party.id, rep.id, { authorityBasis: e.target.value })
                        }
                        placeholder="যেমন: কমিটির রেজুলেশন নং ০৪, তাং ১০/০৩/২০২৬"
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2 pb-1">
                      <label className="inline-flex items-center gap-1 text-[10px] font-siliguri text-slate-600 cursor-pointer" title="চুক্তিপত্রে স্বাক্ষর করবেন">
                        <input
                          type="checkbox"
                          checked={rep.isSignatory}
                          onChange={(e) =>
                            handleUpdateRepresentative(party.id, rep.id, { isSignatory: e.target.checked })
                          }
                          className="rounded border-slate-300 text-emerald-700"
                        />
                        <span>স্বাক্ষর</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveRepresentative(party.id, rep.id)}
                        className="text-rose-500 hover:text-rose-700"
                        title="অপসারণ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3A: Dynamic Construction Details */}
      {showConstructionSection && (
        <section className="bg-white rounded-xl border border-emerald-200 p-5 space-y-4">
          <div className="border-b border-emerald-100 pb-2.5">
            <h4 className="text-sm font-bold text-emerald-950 font-siliguri flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-emerald-700" />
              <span>৩. নির্মাণ / কাজের পরিমাপ ও শর্ত (Dynamic Construction Fields)</span>
            </h4>
            <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
              কাজের দৈর্ঘ্য, প্রস্থ, উচ্চতা, পরিমাণ, একক দর, মোট চুক্তিমূল্য (লিখিত), সামগ্রী/শ্রমিকের দায়িত্ব, মান যাচাই ও হস্তান্তর শর্তাবলি
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                কাজের সংক্ষিপ্ত বিবরণ
              </label>
              <input
                type="text"
                value={constructionDetails.workSummary || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, workSummary: e.target.value }))}
                placeholder="যেমন: দ্বিতীয় তলার ছাদ ঢালাই, গাঁথুনি ও প্লাস্টার কাজ"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">দৈর্ঘ্য (Length)</label>
              <input
                type="text"
                value={constructionDetails.length || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, length: e.target.value }))}
                placeholder="যেমন: ৬০"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">প্রস্থ (Width)</label>
              <input
                type="text"
                value={constructionDetails.width || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, width: e.target.value }))}
                placeholder="যেমন: ৪০"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">উচ্চতা (Height)</label>
              <input
                type="text"
                value={constructionDetails.height || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, height: e.target.value }))}
                placeholder="যেমন: ১২"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">পরিমাপের একক</label>
              <input
                type="text"
                value={constructionDetails.dimensionUnit || 'ফুট'}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, dimensionUnit: e.target.value }))}
                placeholder="ফুট / মিটার / ইঞ্চি"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">মোট পরিমাণ (Quantity)</label>
              <input
                type="text"
                value={constructionDetails.quantity || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="যেমন: ২৪০০"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">পরিমাণের একক</label>
              <input
                type="text"
                value={constructionDetails.quantityUnit || 'বর্গফুট'}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, quantityUnit: e.target.value }))}
                placeholder="বর্গফুট / ঘনফুট / রানিং ফুট"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">একক দর (Unit Rate)</label>
              <input
                type="text"
                value={constructionDetails.unitRate || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, unitRate: e.target.value }))}
                placeholder="যেমন: প্রতি বর্গফুট ২২০ টাকা"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                মোট চুক্তিমূল্য (শুধুমাত্র লিখিত)
              </label>
              <input
                type="text"
                value={constructionDetails.totalContractValueText || ''}
                onChange={(e) =>
                  setConstructionDetails((p) => ({ ...p, totalContractValueText: e.target.value }))
                }
                placeholder="যেমন: ৫,২৮,০০০/- (পাঁচ লক্ষ আটাশ হাজার টাকা)"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                নির্মাণ সামগ্রীর দায়িত্ব (Materials Responsibility)
              </label>
              <textarea
                rows={2}
                value={constructionDetails.materialsResponsibility || ''}
                onChange={(e) =>
                  setConstructionDetails((p) => ({ ...p, materialsResponsibility: e.target.value }))
                }
                placeholder="ইট, বালু, সিমেন্ট, রড ইত্যাদি কোন পক্ষ সরবরাহ করবে..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                শ্রমিক ও যন্ত্রপাতির দায়িত্ব (Labor Responsibility)
              </label>
              <textarea
                rows={2}
                value={constructionDetails.laborResponsibility || ''}
                onChange={(e) =>
                  setConstructionDetails((p) => ({ ...p, laborResponsibility: e.target.value }))
                }
                placeholder="মিস্ত্রি, হেল্পার, শাটারিং ও নিরাপত্তা দায়িত্ব..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">সময়সীমা</label>
              <input
                type="text"
                value={constructionDetails.timelineDuration || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, timelineDuration: e.target.value }))}
                placeholder="যেমন: ৯০ কার্যদিবস"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                সম্ভাব্য সমাপ্তির তারিখ
              </label>
              <input
                type="date"
                value={constructionDetails.completionDeadline || ''}
                onChange={(e) =>
                  setConstructionDetails((p) => ({ ...p, completionDeadline: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                মান যাচাই (Quality Inspection)
              </label>
              <input
                type="text"
                value={constructionDetails.qualityInspectionTerms || ''}
                onChange={(e) =>
                  setConstructionDetails((p) => ({ ...p, qualityInspectionTerms: e.target.value }))
                }
                placeholder="প্রকৌশলী / নির্মাণ উপ-কমিটির পরিদর্শন শর্ত..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                হস্তান্তর শর্তাবলি (Handover Terms)
              </label>
              <textarea
                rows={2}
                value={constructionDetails.handoverTerms || ''}
                onChange={(e) => setConstructionDetails((p) => ({ ...p, handoverTerms: e.target.value }))}
                placeholder="কাজ বুঝিয়ে দেওয়া, যৌথ পরিমাপ ও চূড়ান্ত ছাড়পত্রের শর্ত..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3B: Dynamic Land / Waqf / Road Right-of-Way Details */}
      {showLandWaqfSection && (
        <section className="bg-white rounded-xl border border-teal-200 p-5 space-y-4">
          <div className="border-b border-teal-100 pb-2.5">
            <h4 className="text-sm font-bold text-teal-950 font-siliguri flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-teal-700" />
              <span>
                ৩. {isRoadCategory ? 'রাস্তা, চলাচলের অধিকার ও জমির তফসিল' : 'জমি ও ওয়াকফ সম্পত্তির তফসিল'} (Land / Waqf / Road Right)
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
              মৌজা, জে.এল. নম্বর, খতিয়ান, দাগ, জমির পরিমাণ, প্রস্তাবিত অংশ/রাস্তার দৈর্ঘ্য-প্রস্থ, পক্ষের অবদান এবং ওয়াকফ/আইনি পর্যালোচনা সতর্কতা
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">মৌজা (Mouza)</label>
              <input
                type="text"
                value={landWaqfDetails.mouza || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, mouza: e.target.value }))}
                placeholder="মৌজার নাম"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">জে.এল. নম্বর (JL No)</label>
              <input
                type="text"
                value={landWaqfDetails.jlNumber || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, jlNumber: e.target.value }))}
                placeholder="যেমন: ৪৫"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">খতিয়ান নং (Khatian)</label>
              <input
                type="text"
                value={landWaqfDetails.khatianNumber || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, khatianNumber: e.target.value }))}
                placeholder="আর.এস / বি.এস খতিয়ান নং"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">দাগ নং (Dag / Plot)</label>
              <input
                type="text"
                value={landWaqfDetails.dagNumber || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, dagNumber: e.target.value }))}
                placeholder="সাবেক ও হাল দাগ নং"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">জমির পরিমাণ</label>
              <input
                type="text"
                value={landWaqfDetails.landArea || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, landArea: e.target.value }))}
                placeholder="যেমন: ১২.৫০"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">জমির একক</label>
              <input
                type="text"
                value={landWaqfDetails.landAreaUnit || 'শতাংশ'}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, landAreaUnit: e.target.value }))}
                placeholder="শতাংশ / কাঠা / বর্গফুট / একর"
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                রাস্তার দৈর্ঘ্য (প্রযোজ্য হলে)
              </label>
              <input
                type="text"
                value={landWaqfDetails.roadLength || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, roadLength: e.target.value }))}
                placeholder="যেমন: ১২০ ফুট"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                রাস্তার প্রস্থ (প্রযোজ্য হলে)
              </label>
              <input
                type="text"
                value={landWaqfDetails.roadWidth || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, roadWidth: e.target.value }))}
                placeholder="যেমন: ১২ ফুট"
                className="w-full px-3 py-2 text-xs font-baloo rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                প্রস্তাবিত অংশ / চৌহদ্দির বিবরণ
              </label>
              <textarea
                rows={2}
                value={landWaqfDetails.proposedPortionDesc || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, proposedPortionDesc: e.target.value }))}
                placeholder="উত্তর, দক্ষিণ, পূর্ব ও পশ্চিমের সীমানা বা প্রস্তাবিত অংশের বিবরণ..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                পক্ষসমূহের অবদান (Party Contributions)
              </label>
              <textarea
                rows={2}
                value={landWaqfDetails.partyContributions || ''}
                onChange={(e) => setLandWaqfDetails((p) => ({ ...p, partyContributions: e.target.value }))}
                placeholder="কোন পক্ষ কতটুকু জমি/রাস্তা ছাড়বেন বা রক্ষণাবেক্ষণে কী ভূমিকা রাখবেন..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Waqf / Legal Review Caution Box */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-amber-950 font-siliguri">
                  ওয়াকফ ও আইনি পর্যালোচনা সতর্কতার ঘর (Waqf / Legal Review Caution)
                </h5>
                <p className="text-[11px] text-amber-900 font-tiro mt-0.5 leading-relaxed">
                  জমি, ওয়াকফ সম্পত্তি বা চলাচলের রাস্তা সংক্রান্ত যেকোনো চুক্তি চূড়ান্ত স্বাক্ষরের পূর্বে মূল ওয়াকফ দলিল, খতিয়ান, পরিচালনা কমিটির সাধারণ সভার রেজুলেশন এবং প্রযোজ্য ক্ষেত্রে আইনজীবী/ওয়াকফ প্রশাসনের পর্যালোচনা যাচাই করে নিন।
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-siliguri text-amber-950 pl-6">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={landWaqfDetails.waqfLegalReviewRequired}
                  onChange={(e) =>
                    setLandWaqfDetails((p) => ({ ...p, waqfLegalReviewRequired: e.target.checked }))
                  }
                  className="rounded border-amber-400 text-amber-700"
                />
                <span>আইনি / ওয়াকফ পর্যালোচনা আবশ্যক</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={landWaqfDetails.waqfLegalCautionAcknowledged}
                  onChange={(e) =>
                    setLandWaqfDetails((p) => ({ ...p, waqfLegalCautionAcknowledged: e.target.checked }))
                  }
                  className="rounded border-amber-400 text-emerald-700"
                />
                <span>সতর্কতা যাচাই ও কমিটির পর্যালোচনা নিশ্চিত করা হয়েছে</span>
              </label>
            </div>

            <div className="pl-6">
              <textarea
                rows={2}
                value={landWaqfDetails.waqfLegalReviewNote || ''}
                onChange={(e) =>
                  setLandWaqfDetails((p) => ({ ...p, waqfLegalReviewNote: e.target.value }))
                }
                placeholder="আইন উপদেষ্টা / ওয়াকফ এস্টেট রেজুলেশন বা পর্যালোচনা সংক্রান্ত মন্তব্য লিখুন..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-amber-300 bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: Written Financial Terms (Zero Financial Integration) */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-siliguri">
              ৪. লিখিত আর্থিক শর্তাবলি — শুধুমাত্র চুক্তিপত্রের লিখিত ধারা
            </h4>
            <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
              এককালীন বা কিস্তির শর্তাবলি এখানে লিখুন। এটি শুধুমাত্র প্রিন্টযোগ্য চুক্তির লিখিত অংশ।
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-tiro">
            <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>আর্থিক লেজার, রসিদ বা ভাউচারে কোনো এন্ট্রি হবে না</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['NON_FINANCIAL', 'LUMP_SUM', 'INSTALLMENT'] as WrittenPaymentMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPayMode(m)}
              className={`px-3 py-2.5 rounded-lg border text-left text-xs font-semibold font-siliguri transition-colors ${
                payMode === m
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {WRITTEN_PAYMENT_MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {payMode !== 'NON_FINANCIAL' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                  লিখিত মোট টাকার অঙ্ক (কথায় ও অঙ্কে)
                </label>
                <input
                  type="text"
                  value={totalWrittenAmount}
                  onChange={(e) => setTotalWrittenAmount(e.target.value)}
                  placeholder="যেমন: ২,৫০,০০০/- (দুই লক্ষ পঞ্চাশ হাজার টাকা মাত্র)"
                  className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                  পরিশোধ পদ্ধতি / সাধারণ লিখিত নোট
                </label>
                <input
                  type="text"
                  value={paymentTermsNote}
                  onChange={(e) => setPaymentTermsNote(e.target.value)}
                  placeholder="যেমন: কমিটির ভাউচারের বিপরীতে নগদ বা চেকের মাধ্যমে..."
                  className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {payMode === 'INSTALLMENT' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-siliguri">
                    কিস্তি / পর্যায়ভিত্তিক লিখিত শর্তাবলি ({schedules.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddScheduleRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 font-siliguri"
                  >
                    <Plus className="w-3 h-3" />
                    <span>কিস্তি যোগ করুন</span>
                  </button>
                </div>

                {schedules.map((row, idx) => (
                  <div
                    key={row.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                  >
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        কিস্তির বিবরণ #{idx + 1}
                      </label>
                      <input
                        type="text"
                        value={row.stageTitle}
                        onChange={(e) =>
                          setSchedules((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, stageTitle: e.target.value } : x))
                          )
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        কিস্তির শর্ত / পর্যায়
                      </label>
                      <input
                        type="text"
                        value={row.condition}
                        onChange={(e) =>
                          setSchedules((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, condition: e.target.value } : x))
                          )
                        }
                        placeholder="কোন কাজ সম্পন্ন হলে..."
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        সময়সীমা / তারিখ
                      </label>
                      <input
                        type="text"
                        value={row.timingOrMilestone}
                        onChange={(e) =>
                          setSchedules((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, timingOrMilestone: e.target.value } : x))
                          )
                        }
                        placeholder="স্বাক্ষরের সময় / ১ম মাস"
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        লিখিত টাকার অঙ্ক
                      </label>
                      <input
                        type="text"
                        value={row.writtenAmount}
                        onChange={(e) =>
                          setSchedules((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, writtenAmount: e.target.value } : x))
                          )
                        }
                        placeholder="৫০,০০০/-"
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end pb-1">
                      <button
                        type="button"
                        onClick={() => setSchedules((prev) => prev.filter((x) => x.id !== row.id))}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 5: Clauses */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="border-b border-slate-100 pb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>৫. চুক্তির শর্তাবলি, বাতিল ও বিরোধ নিষ্পত্তি</span>
          </h4>
          <button
            type="button"
            onClick={() => setShowClauseAssistModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold font-siliguri"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI ধারা সহায়তা (স্পষ্ট / আনুষ্ঠানিক / সহজ / দুর্বলতা যাচাই)</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
            সাধারণ শর্তাবলি (ধারা ১, ২, ৩...) *
          </label>
          <textarea
            rows={6}
            required
            value={generalClauses}
            onChange={(e) => setGeneralClauses(e.target.value)}
            placeholder="১. উভয় পক্ষ নিম্নবর্ণিত শর্তাবলি মেনে চলতে অঙ্গীকারাবদ্ধ থাকবেন...&#10;২. ..."
            className="w-full px-3 py-2.5 text-xs font-tiro leading-relaxed rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
            বিশেষ শর্তাবলি (ঐচ্ছিক)
          </label>
          <textarea
            rows={3}
            value={specialClauses}
            onChange={(e) => setSpecialClauses(e.target.value)}
            placeholder="অতিরিক্ত কোনো বিশেষ শর্ত বা সংযোজনী থাকলে লিখুন..."
            className="w-full px-3 py-2 text-xs font-tiro leading-relaxed rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              চুক্তি সমাপ্তি / বাতিলের শর্ত
            </label>
            <textarea
              rows={3}
              value={terminationClause}
              onChange={(e) => setTerminationClause(e.target.value)}
              placeholder="কোনো পক্ষ শর্ত ভঙ্গ করলে নোটিশ ও বাতিলের নিয়ম..."
              className="w-full px-3 py-2 text-xs font-tiro leading-relaxed rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
              বিরোধ নিষ্পত্তির শর্ত
            </label>
            <textarea
              rows={3}
              value={disputeResolutionClause}
              onChange={(e) => setDisputeResolutionClause(e.target.value)}
              placeholder="সালিশ, পরিচালনা কমিটি বা আইনগত মীমাংসার নিয়ম..."
              className="w-full px-3 py-2 text-xs font-tiro leading-relaxed rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* SECTION 6: Witnesses & Attached Documents */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        {/* Witnesses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>৬. সাক্ষীগণের তথ্য (Witnesses)</span>
            </h4>
            <button
              type="button"
              onClick={handleAddWitness}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 font-siliguri"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>সাক্ষী যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {witnesses.map((w, idx) => (
              <div
                key={w.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
              >
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                    সাক্ষীর নাম #{idx + 1}
                  </label>
                  <input
                    type="text"
                    value={w.name}
                    onChange={(e) =>
                      setWitnesses((prev) => prev.map((x) => (x.id === w.id ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="পূর্ণ নাম"
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                    পিতার নাম
                  </label>
                  <input
                    type="text"
                    value={w.fatherName || ''}
                    onChange={(e) =>
                      setWitnesses((prev) =>
                        prev.map((x) => (x.id === w.id ? { ...x, fatherName: e.target.value } : x))
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                    মোবাইল
                  </label>
                  <input
                    type="text"
                    value={w.phone || ''}
                    onChange={(e) =>
                      setWitnesses((prev) => prev.map((x) => (x.id === w.id ? { ...x, phone: e.target.value } : x)))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                    ঠিকানা ও পরিচয়
                  </label>
                  <input
                    type="text"
                    value={w.address || ''}
                    onChange={(e) =>
                      setWitnesses((prev) => prev.map((x) => (x.id === w.id ? { ...x, address: e.target.value } : x)))
                    }
                    placeholder="গ্রাম/মহল্লা, পদবি"
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={() => setWitnesses((prev) => prev.filter((x) => x.id !== w.id))}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attached Documents Reference */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 font-siliguri flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-slate-600" />
              <span>সংযুক্ত দলিল ও নথিপত্রের তালিকা (Attached Documents Reference)</span>
            </h4>
            <button
              type="button"
              onClick={handleAddAttachmentRef}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>দলিল রেফারেন্স যোগ করুন</span>
            </button>
          </div>

          {attachments.length === 0 ? (
            <p className="text-xs text-slate-500 font-tiro">
              কোনো সংযুক্ত দলিল যুক্ত করা হয়নি (যেমন: কমিটির রেজুলেশন কপি, জমির নকশা, খতিয়ান, এনআইডি কপি ইত্যাদি)।
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att, idx) => (
                <div
                  key={att.id}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                      দলিলের নাম #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={att.title}
                      onChange={(e) =>
                        setAttachments((prev) =>
                          prev.map((x) => (x.id === att.id ? { ...x, title: e.target.value } : x))
                        )
                      }
                      placeholder="যেমন: পরিচালনা কমিটির রেজুলেশন কপি"
                      className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                      রেফারেন্স / স্মারক / দলিল নং
                    </label>
                    <input
                      type="text"
                      value={att.referenceNo || ''}
                      onChange={(e) =>
                        setAttachments((prev) =>
                          prev.map((x) => (x.id === att.id ? { ...x, referenceNo: e.target.value } : x))
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                      মন্তব্য / নোট
                    </label>
                    <input
                      type="text"
                      value={att.notes || ''}
                      onChange={(e) =>
                        setAttachments((prev) =>
                          prev.map((x) => (x.id === att.id ? { ...x, notes: e.target.value } : x))
                        )
                      }
                      placeholder="ফটোকপি / মূল কপি সংযুক্ত"
                      className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== att.id))}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom Submit Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => setShowReviewModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-semibold font-siliguri"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>সংরক্ষণের আগে AI ঝুঁকি পর্যালোচনা</span>
        </button>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 font-siliguri"
          >
            বাতিল করুন
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 font-siliguri disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'সংরক্ষণ হচ্ছে...' : editingAgreement ? 'পরিবর্তন সংরক্ষণ করুন' : 'চুক্তিপত্র সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </div>
    </form>

    {/* Part 2 Modals (mounted outside <form> to avoid nested form submissions) */}
    {showAiDraftModal && (
      <AgreementAiAssistantModal
        categories={categories}
        initialCategoryCode={categoryCode}
        onApplyDraft={applyAiDraftToForm}
        onClose={() => setShowAiDraftModal(false)}
      />
    )}

    {showClauseAssistModal && (
      <AgreementClauseAssistModal
        currentClauses={generalClauses}
        agreementTitle={title}
        categoryNameBn={activeCategoryObj?.nameBn}
        onApplyRevisedClauses={(revised) => {
          setGeneralClauses(revised);
          setShowClauseAssistModal(false);
        }}
        onClose={() => setShowClauseAssistModal(false)}
      />
    )}

    {showReviewModal && (
      <AgreementReviewPanelModal
        draftAgreement={buildCurrentDraftPayload()}
        agreementTitle={title || 'খসড়া চুক্তিপত্র'}
        onClose={() => setShowReviewModal(false)}
      />
    )}

    {showOcrModal && (
      <AgreementOcrScannerModal
        partyLabels={parties.map((p, i) => `${p.roleLabel || getOrdinalPartyRoleBn(i + 1)}${p.name ? ` (${p.name})` : ''}`)}
        onApplyVerifiedData={handleApplyOcrVerified}
        onClose={() => setShowOcrModal(false)}
      />
    )}
    </>
  );
};

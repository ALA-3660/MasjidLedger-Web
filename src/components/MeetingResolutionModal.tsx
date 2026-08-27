import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  History,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  Layers,
  FileText,
  Copy,
  AlertTriangle,
  ChevronRight,
  Info,
  DollarSign,
  Briefcase,
  Flag,
  Percent
} from 'lucide-react';
import {
  MeetingResolution,
  CommitteeMeeting,
  CommitteeMember,
  ResolutionStatus,
  ResolutionType,
  ResolutionImplementationStatus,
  ResolutionDecisionEntry,
  MeetingDecisionItem,
  Mosque
} from '../types';

interface MeetingResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resolutionData: any) => Promise<void>;
  meetings: CommitteeMeeting[];
  members: CommitteeMember[];
  initialResolution?: MeetingResolution | null;
  initialMeetingId?: string;
  initialDecisionId?: string;
  isRevisionMode?: boolean;
  mosque?: Mosque | null;
  language?: string;
}

interface DecisionFormState {
  decisionId: string;
  decisionNumber: string;
  subject: string;
  details: string;
  background: string;
  consideration: string;
  proposal: string;
  proposerName: string;
  supporterName: string;
  resolutionText: string;
  assignedMemberId: string;
  assignedMemberName: string;
  assignedMemberDesignation: string;
  assignedMemberPhone: string;
  taskDescription: string;
  deadline: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  implementationStatus: ResolutionImplementationStatus;
  progressPercentage: number;
  financialAmount?: number;
  remarks: string;
}

export const MeetingResolutionModal: React.FC<MeetingResolutionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  meetings,
  members,
  initialResolution,
  initialMeetingId,
  initialDecisionId,
  isRevisionMode = false,
  mosque,
  language = 'bn'
}) => {
  const activeMembers = useMemo(() => members.filter(m => m.status === 'ACTIVE'), [members]);

  // Mode Selection: 'INDIVIDUAL' (separate record for each decision) vs 'COMBINED' (1 document with all decisions)
  const [creationMode, setCreationMode] = useState<ResolutionType>('INDIVIDUAL');

  // Selected Meeting
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  
  // Multi-selected decision IDs
  const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>([]);

  // Overall Document Fields (for Combined Document or Single Document)
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [documentDate, setDocumentDate] = useState<string>('');
  const [documentSubject, setDocumentSubject] = useState<string>('');
  const [documentBackground, setDocumentBackground] = useState<string>('');
  const [documentConsideration, setDocumentConsideration] = useState<string>('');
  const [documentStatus, setDocumentStatus] = useState<ResolutionStatus>('DRAFT');
  const [documentPriority, setDocumentPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [documentRemarks, setDocumentRemarks] = useState<string>('');

  // Per-Decision Config Map
  const [decisionForms, setDecisionForms] = useState<{ [decisionId: string]: DecisionFormState }>({});
  const [activeDecisionTab, setActiveDecisionTab] = useState<string>('');

  // Revision state
  const [isRevision, setIsRevision] = useState<boolean>(isRevisionMode);
  const [revisionReason, setRevisionReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Find currently selected meeting object
  const selectedMeeting = useMemo(() => {
    return meetings.find(m => m.id === selectedMeetingId);
  }, [meetings, selectedMeetingId]);

  // Helper: check if a decision already has a resolution
  const getExistingResolutionForDecision = (decId: string) => {
    if (!selectedMeeting?.decisionItems) return null;
    const dec = selectedMeeting.decisionItems.find(d => d.id === decId);
    if (dec && dec.resolutionNumber && (!initialResolution || dec.resolutionId !== initialResolution.id)) {
      return dec.resolutionNumber;
    }
    return null;
  };

  // Helper to build initial form state for a decision item
  const buildInitialDecisionForm = (dec: MeetingDecisionItem, parentMeeting?: CommitteeMeeting): DecisionFormState => {
    const defaultSubject = dec.agendaTitle
      ? `${dec.agendaTitle} সংক্রান্ত সিদ্ধান্ত ও রেজোলিউশন`
      : `${dec.decisionNumber}: সিদ্ধান্ত বাস্তবায়ন ও কার্যকরীকরণ`;

    const mem = members.find(m => m.id === dec.assignedMemberId);

    return {
      decisionId: dec.id,
      decisionNumber: dec.decisionNumber || 'সিদ্ধান্ত',
      subject: defaultSubject,
      details: dec.details || '',
      background: parentMeeting ? `${parentMeeting.date} তারিখে অনুষ্ঠিত ${parentMeeting.meetingTypeBn || 'কমিটি'} সভায় বিস্তারিত পর্যালোচনার প্রেক্ষিতে গৃহীত।` : '',
      consideration: `সভায় উপস্থাপিত প্রস্তাব ও সামগ্রিক পরিস্থিতি পুঙ্খানুপুঙ্খ বিবেচনার পর সর্বসম্মতিক্রমে এই সিদ্ধান্ত গৃহীত হয়।`,
      proposal: `সংশ্লিষ্ট বিষয়ে কার্যকর পদক্ষেপ গ্রহণের প্রস্তাব উপস্থাপন করা হয়।`,
      proposerName: parentMeeting?.conductor || parentMeeting?.secretary || '',
      supporterName: parentMeeting?.chairman || '',
      resolutionText: dec.details || '',
      assignedMemberId: dec.assignedMemberId || '',
      assignedMemberName: dec.assignedMemberName || mem?.name || '',
      assignedMemberDesignation: dec.assignedMemberDesignation || mem?.positionCustomBn || mem?.position || '',
      assignedMemberPhone: mem?.phone || '',
      taskDescription: dec.details ? `সিদ্ধান্ত বাস্তবায়ন: ${dec.details.slice(0, 100)}...` : '',
      deadline: dec.deadline || '',
      priority: dec.priority || 'NORMAL',
      implementationStatus: 'PENDING',
      progressPercentage: 0,
      financialAmount: undefined,
      remarks: dec.remarks || ''
    };
  };

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setFormError('');
    const today = new Date().toISOString().split('T')[0];
    const curYear = new Date().getFullYear();

    if (initialResolution) {
      // Editing existing resolution
      setCreationMode(initialResolution.resolutionType || 'INDIVIDUAL');
      setSelectedMeetingId(initialResolution.meetingId || '');
      setDocumentNumber(initialResolution.resolutionNumber || '');
      setDocumentDate(initialResolution.date || today);
      setDocumentSubject(initialResolution.subject || '');
      setDocumentBackground(initialResolution.background || '');
      setDocumentConsideration(initialResolution.consideration || '');
      setDocumentStatus(initialResolution.status || 'DRAFT');
      setDocumentPriority(initialResolution.priority || 'NORMAL');
      setDocumentRemarks(initialResolution.remarks || '');
      setIsRevision(isRevisionMode || initialResolution.status === 'APPROVED');
      setRevisionReason('');

      // Setup decision links
      const dIds = initialResolution.decisionIds || (initialResolution.decisionId ? [initialResolution.decisionId] : []);
      setSelectedDecisionIds(dIds);

      // If combined items exist
      if (initialResolution.items && initialResolution.items.length > 0) {
        const fMap: { [id: string]: DecisionFormState } = {};
        initialResolution.items.forEach((item, idx) => {
          const key = item.decisionId || `item-${idx}`;
          fMap[key] = {
            decisionId: key,
            decisionNumber: item.decisionNumber,
            subject: item.subject || '',
            details: item.details || '',
            background: item.background || '',
            consideration: item.consideration || '',
            proposal: item.proposal || '',
            proposerName: item.proposerName || '',
            supporterName: item.supporterName || '',
            resolutionText: item.resolutionText || '',
            assignedMemberId: item.assignedMemberId || '',
            assignedMemberName: item.assignedMemberName || '',
            assignedMemberDesignation: item.assignedMemberDesignation || '',
            assignedMemberPhone: item.assignedMemberPhone || '',
            taskDescription: item.taskDescription || '',
            deadline: item.deadline || '',
            priority: item.priority || 'NORMAL',
            implementationStatus: item.implementationStatus || 'PENDING',
            progressPercentage: item.progressPercentage || 0,
            financialAmount: item.financialAmount,
            remarks: item.remarks || ''
          };
        });
        setDecisionForms(fMap);
        setActiveDecisionTab(initialResolution.items[0]?.decisionId || 'item-0');
      } else {
        // Single resolution form
        const key = initialResolution.decisionId || 'single-decision';
        const singleForm: DecisionFormState = {
          decisionId: key,
          decisionNumber: initialResolution.decisionNumber || 'রেজোলিউশন-১',
          subject: initialResolution.subject,
          details: initialResolution.resolutionText,
          background: initialResolution.background || '',
          consideration: initialResolution.consideration || '',
          proposal: initialResolution.proposal || '',
          proposerName: initialResolution.proposerName || '',
          supporterName: initialResolution.supporterName || '',
          resolutionText: initialResolution.resolutionText,
          assignedMemberId: initialResolution.assignedMemberId || '',
          assignedMemberName: initialResolution.assignedMemberName || '',
          assignedMemberDesignation: initialResolution.assignedMemberDesignation || '',
          assignedMemberPhone: initialResolution.assignedMemberPhone || '',
          taskDescription: initialResolution.taskDescription || '',
          deadline: initialResolution.deadline || '',
          priority: initialResolution.priority || 'NORMAL',
          implementationStatus: initialResolution.implementationStatus || 'PENDING',
          progressPercentage: initialResolution.progressPercentage || 0,
          financialAmount: initialResolution.financialAmount,
          remarks: initialResolution.remarks || ''
        };
        setDecisionForms({ [key]: singleForm });
        setActiveDecisionTab(key);
      }
    } else {
      // Create New
      const autoNum = `RES-${curYear}-${String(Math.floor(Math.random() * 899) + 100)}`;
      setDocumentNumber(autoNum);
      setDocumentDate(today);
      setDocumentStatus('DRAFT');
      setDocumentPriority('NORMAL');
      setDocumentRemarks('');
      setIsRevision(false);
      setRevisionReason('');
      setCreationMode('INDIVIDUAL');

      const targetMeetingId = initialMeetingId || (meetings.length > 0 ? meetings[0].id : '');
      setSelectedMeetingId(targetMeetingId);

      const targetMeeting = meetings.find(m => m.id === targetMeetingId);

      if (targetMeeting && targetMeeting.decisionItems && targetMeeting.decisionItems.length > 0) {
        if (initialDecisionId) {
          setSelectedDecisionIds([initialDecisionId]);
          const targetDec = targetMeeting.decisionItems.find(d => d.id === initialDecisionId);
          if (targetDec) {
            const form = buildInitialDecisionForm(targetDec, targetMeeting);
            setDecisionForms({ [targetDec.id]: form });
            setActiveDecisionTab(targetDec.id);
            setDocumentSubject(form.subject);
            setDocumentBackground(form.background);
            setDocumentConsideration(form.consideration);
          }
        } else {
          // Select first decision by default or all if requested
          const firstDec = targetMeeting.decisionItems[0];
          setSelectedDecisionIds([firstDec.id]);
          const form = buildInitialDecisionForm(firstDec, targetMeeting);
          setDecisionForms({ [firstDec.id]: form });
          setActiveDecisionTab(firstDec.id);
          setDocumentSubject(form.subject);
          setDocumentBackground(form.background);
          setDocumentConsideration(form.consideration);
        }
      } else {
        setSelectedDecisionIds([]);
        setDecisionForms({});
        setActiveDecisionTab('');
        setDocumentSubject('');
        setDocumentBackground('');
        setDocumentConsideration('');
      }
    }
  }, [isOpen, initialResolution, initialMeetingId, initialDecisionId, isRevisionMode, meetings, members]);

  // Handle meeting change
  const handleMeetingChange = (mId: string) => {
    setSelectedMeetingId(mId);
    const m = meetings.find(item => item.id === mId);
    if (!m) {
      setSelectedDecisionIds([]);
      setDecisionForms({});
      setActiveDecisionTab('');
      return;
    }

    if (m.date) setDocumentDate(m.date);

    if (m.decisionItems && m.decisionItems.length > 0) {
      const first = m.decisionItems[0];
      setSelectedDecisionIds([first.id]);
      const initialForm = buildInitialDecisionForm(first, m);
      setDecisionForms({ [first.id]: initialForm });
      setActiveDecisionTab(first.id);
      setDocumentSubject(initialForm.subject);
      setDocumentBackground(initialForm.background);
      setDocumentConsideration(initialForm.consideration);
    } else {
      setSelectedDecisionIds([]);
      setDecisionForms({});
      setActiveDecisionTab('');
      setDocumentSubject('');
      setDocumentBackground('');
      setDocumentConsideration('');
    }
  };

  // Toggle single decision selection
  const handleToggleDecision = (dec: MeetingDecisionItem) => {
    const isSelected = selectedDecisionIds.includes(dec.id);
    let updatedIds: string[];

    if (isSelected) {
      updatedIds = selectedDecisionIds.filter(id => id !== dec.id);
      const updatedForms = { ...decisionForms };
      delete updatedForms[dec.id];
      setDecisionForms(updatedForms);

      if (activeDecisionTab === dec.id) {
        setActiveDecisionTab(updatedIds.length > 0 ? updatedIds[0] : '');
      }
    } else {
      updatedIds = [...selectedDecisionIds, dec.id];
      const newForm = buildInitialDecisionForm(dec, selectedMeeting);
      setDecisionForms(prev => ({ ...prev, [dec.id]: newForm }));
      setActiveDecisionTab(dec.id);
    }

    setSelectedDecisionIds(updatedIds);

    // If combined mode, auto-generate overall title if empty
    if (creationMode === 'COMBINED' && selectedMeeting) {
      const decCount = updatedIds.length;
      setDocumentSubject(`${selectedMeeting.meetingTypeBn || 'কার্যনির্বাহী'} সভার গৃহীত ${decCount}টি সিদ্ধান্তের সমন্বিত রেজোলিউশন`);
    }
  };

  // Select all decisions
  const handleSelectAllDecisions = () => {
    if (!selectedMeeting || !selectedMeeting.decisionItems) return;

    const allDecs = selectedMeeting.decisionItems;
    const allIds = allDecs.map(d => d.id);
    
    // If all are already selected, unselect all (or keep at least 1)
    if (selectedDecisionIds.length === allIds.length) {
      // Unselect all
      setSelectedDecisionIds([]);
      setDecisionForms({});
      setActiveDecisionTab('');
    } else {
      // Select all
      const newForms: { [id: string]: DecisionFormState } = {};
      allDecs.forEach(dec => {
        newForms[dec.id] = decisionForms[dec.id] || buildInitialDecisionForm(dec, selectedMeeting);
      });
      setSelectedDecisionIds(allIds);
      setDecisionForms(newForms);
      setActiveDecisionTab(allIds[0]);

      if (creationMode === 'COMBINED') {
        setDocumentSubject(`${selectedMeeting.meetingTypeBn || 'কার্যনির্বাহী'} সভার গৃহীত সর্বসম্মত রেজোলিউশনসমূহ (${allDecs.length}টি সিদ্ধান্ত)`);
      }
    }
  };

  // Update specific field in decision form state
  const handleDecisionFieldChange = (decId: string, field: keyof DecisionFormState, value: any) => {
    setDecisionForms(prev => {
      const cur = prev[decId];
      if (!cur) return prev;
      return {
        ...prev,
        [decId]: {
          ...cur,
          [field]: value
        }
      };
    });
  };

  // Handle member assignment change for active decision
  const handleMemberChange = (decId: string, memberId: string) => {
    const m = members.find(item => item.id === memberId);
    setDecisionForms(prev => {
      const cur = prev[decId];
      if (!cur) return prev;
      return {
        ...prev,
        [decId]: {
          ...cur,
          assignedMemberId: memberId,
          assignedMemberName: m ? m.name : '',
          assignedMemberDesignation: m ? (m.positionCustomBn || m.position || 'কমিটি সদস্য') : '',
          assignedMemberPhone: m ? (m.phone || '') : ''
        }
      };
    });
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedMeetingId) {
      setFormError('অনুগ্রহ করে একটি মিটিং কার্যবিবরণী নির্বাচন করুন।');
      return;
    }

    if (selectedDecisionIds.length === 0) {
      setFormError('অনুগ্রহ করে অন্তত একটি সিদ্ধান্ত নির্বাচন করুন।');
      return;
    }

    if (isRevision && !revisionReason.trim()) {
      setFormError('অনুমোদিত রেজোলিউশন সংশোধনের জন্য কারণ উল্লেখ করা আবশ্যক।');
      return;
    }

    try {
      setIsSubmitting(true);

      const m = selectedMeeting;
      const curYear = new Date(documentDate || Date.now()).getFullYear();

      // ==========================================
      // MODE A: INDIVIDUAL RESOLUTIONS PER DECISION
      // ==========================================
      if (creationMode === 'INDIVIDUAL') {
        if (selectedDecisionIds.length === 1 || initialResolution) {
          // Single resolution create or edit
          const decId = selectedDecisionIds[0] || 'single';
          const f = decisionForms[decId] || Object.values(decisionForms)[0];

          if (!f.subject.trim()) {
            setFormError('রেজোলিউশনের বিষয় উল্লেখ করা আবশ্যক।');
            setIsSubmitting(false);
            return;
          }
          if (!f.resolutionText.trim()) {
            setFormError('রেজোলিউশন ও সিদ্ধান্তের বিবরণ প্রদান করুন।');
            setIsSubmitting(false);
            return;
          }

          const payload = {
            resolutionNumber: documentNumber.trim(),
            resolutionType: 'INDIVIDUAL' as ResolutionType,
            meetingId: selectedMeetingId,
            meetingDocumentNumber: m?.documentNumber,
            meetingNumber: m?.meetingNumber,
            meetingMemoNumber: m?.memoNumber,
            meetingDate: m?.date,
            meetingDayName: m?.dayName,
            meetingTime: m?.time,
            meetingType: m?.meetingType,
            meetingTypeBn: m?.meetingTypeBn,
            meetingVenue: m?.location,
            meetingChairman: m?.chairman,
            meetingSecretary: m?.secretary,
            meetingConductor: m?.conductor,
            meetingAgendas: m?.agenda,
            decisionId: f.decisionId,
            decisionNumber: f.decisionNumber,
            decisionIds: [f.decisionId],
            date: documentDate,
            subject: f.subject.trim(),
            background: f.background.trim() || undefined,
            consideration: f.consideration.trim() || undefined,
            proposal: f.proposal.trim() || undefined,
            proposerName: f.proposerName.trim() || undefined,
            supporterName: f.supporterName.trim() || undefined,
            resolutionText: f.resolutionText.trim(),
            assignedMemberId: f.assignedMemberId || undefined,
            assignedMemberName: f.assignedMemberName || undefined,
            assignedMemberDesignation: f.assignedMemberDesignation || undefined,
            assignedMemberPhone: f.assignedMemberPhone || undefined,
            taskDescription: f.taskDescription.trim() || undefined,
            deadline: f.deadline || undefined,
            status: documentStatus,
            priority: f.priority || documentPriority,
            implementationStatus: f.implementationStatus || 'PENDING',
            progressPercentage: f.progressPercentage || 0,
            financialAmount: f.financialAmount ? Number(f.financialAmount) : undefined,
            remarks: f.remarks.trim() || documentRemarks.trim() || undefined,
            isRevision,
            revisionReason: isRevision ? revisionReason.trim() : undefined,
            presidentSignatureUrl: mosque?.presidentSignatureUrl,
            secretarySignatureUrl: mosque?.secretarySignatureUrl
          };

          await onSave(payload);
        } else {
          // Bulk create multiple individual resolutions
          const batchList = selectedDecisionIds.map((decId, idx) => {
            const f = decisionForms[decId];
            const autoNum = `RES-${curYear}-${String(Math.floor(Math.random() * 800) + 100 + idx)}`;
            return {
              resolutionNumber: autoNum,
              resolutionType: 'INDIVIDUAL' as ResolutionType,
              meetingId: selectedMeetingId,
              meetingDocumentNumber: m?.documentNumber,
              meetingNumber: m?.meetingNumber,
              meetingMemoNumber: m?.memoNumber,
              meetingDate: m?.date,
              meetingDayName: m?.dayName,
              meetingTime: m?.time,
              meetingType: m?.meetingType,
              meetingTypeBn: m?.meetingTypeBn,
              meetingVenue: m?.location,
              meetingChairman: m?.chairman,
              meetingSecretary: m?.secretary,
              meetingConductor: m?.conductor,
              meetingAgendas: m?.agenda,
              decisionId: f.decisionId,
              decisionNumber: f.decisionNumber,
              decisionIds: [f.decisionId],
              date: documentDate,
              subject: f.subject.trim(),
              background: f.background.trim() || undefined,
              consideration: f.consideration.trim() || undefined,
              proposal: f.proposal.trim() || undefined,
              proposerName: f.proposerName.trim() || undefined,
              supporterName: f.supporterName.trim() || undefined,
              resolutionText: f.resolutionText.trim(),
              assignedMemberId: f.assignedMemberId || undefined,
              assignedMemberName: f.assignedMemberName || undefined,
              assignedMemberDesignation: f.assignedMemberDesignation || undefined,
              assignedMemberPhone: f.assignedMemberPhone || undefined,
              taskDescription: f.taskDescription.trim() || undefined,
              deadline: f.deadline || undefined,
              status: documentStatus,
              priority: f.priority || 'NORMAL',
              implementationStatus: f.implementationStatus || 'PENDING',
              progressPercentage: f.progressPercentage || 0,
              financialAmount: f.financialAmount ? Number(f.financialAmount) : undefined,
              remarks: f.remarks.trim() || undefined,
              presidentSignatureUrl: mosque?.presidentSignatureUrl,
              secretarySignatureUrl: mosque?.secretarySignatureUrl
            };
          });

          await onSave({ resolutions: batchList });
        }
      }

      // ==========================================
      // MODE B: COMBINED RESOLUTION DOCUMENT
      // ==========================================
      else {
        if (!documentSubject.trim()) {
          setFormError('সম্মিলিত রেজোলিউশন ডকুমেন্টের মূল শিরোনাম/বিষয় প্রদান করুন।');
          setIsSubmitting(false);
          return;
        }

        const items: ResolutionDecisionEntry[] = selectedDecisionIds.map((decId, idx) => {
          const f = decisionForms[decId];
          return {
            id: `entry-${decId}-${idx}`,
            decisionId: f.decisionId,
            decisionNumber: f.decisionNumber,
            subject: f.subject.trim(),
            details: f.details,
            background: f.background.trim() || undefined,
            consideration: f.consideration.trim() || undefined,
            proposal: f.proposal.trim() || undefined,
            proposerName: f.proposerName.trim() || undefined,
            supporterName: f.supporterName.trim() || undefined,
            resolutionText: f.resolutionText.trim(),
            assignedMemberId: f.assignedMemberId || undefined,
            assignedMemberName: f.assignedMemberName || undefined,
            assignedMemberDesignation: f.assignedMemberDesignation || undefined,
            assignedMemberPhone: f.assignedMemberPhone || undefined,
            taskDescription: f.taskDescription.trim() || undefined,
            deadline: f.deadline || undefined,
            priority: f.priority || 'NORMAL',
            implementationStatus: f.implementationStatus || 'PENDING',
            progressPercentage: f.progressPercentage || 0,
            financialAmount: f.financialAmount ? Number(f.financialAmount) : undefined,
            remarks: f.remarks.trim() || undefined
          };
        });

        // Combined resolution summary text
        const combinedResolutionText = items
          .map((it, i) => `【${it.decisionNumber}: ${it.subject}】\n${it.resolutionText}${it.assignedMemberName ? `\n(বাস্তবায়নে: ${it.assignedMemberName}${it.deadline ? `, সময়সীমা: ${it.deadline}` : ''})` : ''}`)
          .join('\n\n');

        const payload = {
          resolutionNumber: documentNumber.trim(),
          resolutionType: 'COMBINED' as ResolutionType,
          meetingId: selectedMeetingId,
          meetingDocumentNumber: m?.documentNumber,
          meetingNumber: m?.meetingNumber,
          meetingMemoNumber: m?.memoNumber,
          meetingDate: m?.date,
          meetingDayName: m?.dayName,
          meetingTime: m?.time,
          meetingType: m?.meetingType,
          meetingTypeBn: m?.meetingTypeBn,
          meetingVenue: m?.location,
          meetingChairman: m?.chairman,
          meetingSecretary: m?.secretary,
          meetingConductor: m?.conductor,
          meetingAgendas: m?.agenda,
          decisionIds: selectedDecisionIds,
          items,
          date: documentDate,
          subject: documentSubject.trim(),
          background: documentBackground.trim() || undefined,
          consideration: documentConsideration.trim() || undefined,
          resolutionText: combinedResolutionText,
          status: documentStatus,
          priority: documentPriority,
          implementationStatus: 'PENDING' as ResolutionImplementationStatus,
          remarks: documentRemarks.trim() || undefined,
          isRevision,
          revisionReason: isRevision ? revisionReason.trim() : undefined,
          presidentSignatureUrl: mosque?.presidentSignatureUrl,
          secretarySignatureUrl: mosque?.secretarySignatureUrl
        };

        await onSave(payload);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving resolution:', err);
      setFormError(err.message || 'রেজোলিউশন সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-siliguri">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-900/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 shadow-inner">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>{initialResolution ? (isRevision ? 'রেজোলিউশন পরিমার্জন ও সংশোধন (Revision)' : 'মিটিং রেজোলিউশন সম্পাদনা') : 'নতুন মিটিং রেজোলিউশন প্রণয়ন'}</span>
                {initialResolution?.resolutionNumber && (
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-full font-mono border border-emerald-500/40">
                    {initialResolution.resolutionNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 font-baloo mt-0.5">
                মিটিং কার্যবিবরণীর সিদ্ধান্তসমূহকে আইনি ও নির্বাহী রেজোলিউশনে রূপান্তরকরণ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 bg-slate-50/50">
          
          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start space-x-3 text-xs font-baloo">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold font-siliguri block text-sm">ত্রুটি দেখা দিয়েছে</strong>
                <span>{formError}</span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 1: MEETING MINUTES SELECTION & METADATA AUTO-DISPLAY */}
          {/* ============================================================ */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs font-mono">
                  ১
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  মিটিং কার্যবিবরণী নির্বাচন (Meeting Minutes Linkage)
                </h3>
              </div>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
                রিলেশনাল লিংকেজ
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 font-siliguri">
                মিটিং কার্যবিবরণী নির্বাচন করুন <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-meeting-minutes-dropdown"
                value={selectedMeetingId}
                onChange={(e) => handleMeetingChange(e.target.value)}
                disabled={!!initialResolution}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">-- মিটিং কার্যবিবরণী বেছে নিন --</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meetingNumber || 'মিটিং'} ({m.date}) - {m.memoNumber ? `স্মারক: ${m.memoNumber}` : (m.documentNumber || m.id)} [{m.meetingTypeBn || 'সাধারণ সভা'}] - {m.decisionItems?.length || m.decisions?.length || 0}টি সিদ্ধান্ত
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Meeting Complete Info Card */}
            {selectedMeeting ? (
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-baloo">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">স্মারক ও আইডি:</span>
                    <strong className="text-slate-900 font-mono text-xs">{selectedMeeting.memoNumber || selectedMeeting.documentNumber || selectedMeeting.id}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">সভার ক্রমিক ও ধরন:</span>
                    <strong className="text-slate-900">{selectedMeeting.meetingNumber || '১'} • {selectedMeeting.meetingTypeBn || 'সাধারণ সভা'}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">তারিখ ও বার:</span>
                    <strong className="text-emerald-800">{selectedMeeting.date} ({selectedMeeting.dayName || 'সভা'})</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">সভার স্থান:</span>
                    <strong className="text-slate-900">{selectedMeeting.location || 'মসজিদ কার্যালয়'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-baloo">
                  <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-[11px]">সভাপতিত্বকারী: </span>
                      <strong className="text-slate-900">{selectedMeeting.chairman || 'সভাপতি'}</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200">
                    <Users className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-slate-500 text-[11px]">সভা পরিচালনাকারী: </span>
                      <strong className="text-slate-900">{selectedMeeting.conductor || selectedMeeting.secretary || 'সাধারণ সম্পাদক'}</strong>
                    </div>
                  </div>
                </div>

                {/* Meeting Agendas */}
                {selectedMeeting.agenda && selectedMeeting.agenda.length > 0 && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 font-siliguri block mb-1">
                      সভার আলোচ্যসূচি (Agendas):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMeeting.agenda.map((ag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-baloo border border-slate-200">
                          {i + 1}. {ag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 font-baloo flex items-center space-x-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>রেজোলিউশন তৈরি করার জন্য প্রথমে উপরের ড্রপডাউন থেকে সংশ্লিষ্ট মিটিং কার্যবিবরণী নির্বাচন করুন।</span>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* STEP 2: MULTI-SELECT DECISIONS FROM THE MEETING */}
          {/* ============================================================ */}
          {selectedMeeting && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs font-mono">
                    ২
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      সভার গৃহীত সিদ্ধান্তসমূহ নির্বাচন করুন (Multi-Select)
                    </h3>
                    <p className="text-xs text-slate-500 font-baloo">
                      যেসব সিদ্ধান্তের জন্য রেজোলিউশন প্রণয়ন করতে চান তা টিক দিন
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="btn-select-all-decisions"
                    onClick={handleSelectAllDecisions}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {selectedMeeting.decisionItems && selectedDecisionIds.length === selectedMeeting.decisionItems.length
                        ? 'সব সিদ্ধান্ত বাদ দিন'
                        : 'সব সিদ্ধান্ত নির্বাচন করুন'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Decision Cards List with Checkboxes */}
              {selectedMeeting.decisionItems && selectedMeeting.decisionItems.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedMeeting.decisionItems.map((dec, idx) => {
                    const isSelected = selectedDecisionIds.includes(dec.id);
                    const existingResNo = getExistingResolutionForDecision(dec.id);

                    return (
                      <div
                        key={dec.id || idx}
                        onClick={() => handleToggleDecision(dec)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent container click
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />

                        <div className="flex-1 space-y-1.5 text-xs font-baloo">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 font-siliguri text-xs sm:text-sm flex items-center space-x-2">
                              <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[11px]">
                                {dec.decisionNumber || `সিদ্ধান্ত-${idx + 1}`}
                              </span>
                              {dec.agendaTitle && (
                                <span className="text-slate-700">({dec.agendaTitle})</span>
                              )}
                            </span>

                            {existingResNo && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>ইতিমধ্যে রেজোলিউশন বিদ্যমান: {existingResNo}</span>
                              </span>
                            )}
                          </div>

                          <p className="text-slate-800 leading-relaxed font-tiro text-xs sm:text-sm">
                            {dec.details}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            {dec.assignedMemberName && (
                              <span className="flex items-center space-x-1 text-slate-700">
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                <span>দায়িত্বপ্রাপ্ত: <strong>{dec.assignedMemberName}</strong></span>
                              </span>
                            )}
                            {dec.deadline && (
                              <span className="flex items-center space-x-1 text-slate-700">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>সময়সীমা: <strong>{dec.deadline}</strong></span>
                              </span>
                            )}
                            {dec.priority && (
                              <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-bold">
                                {dec.priority === 'URGENT' ? 'জরুরি' : dec.priority === 'HIGH' ? 'উচ্চ' : 'সাধারণ'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-baloo text-center">
                  এই মিটিং কার্যবিবরণীতে কোনো সিদ্ধান্তের তালিকা পাওয়া যায়নি।
                </div>
              )}

              <div className="text-xs font-baloo text-slate-500 flex items-center justify-between pt-1">
                <span>নির্বাচিত সিদ্ধান্ত: <strong className="text-emerald-700 font-bold">{selectedDecisionIds.length}</strong> টি</span>
                <span>মোট সিদ্ধান্ত: {selectedMeeting.decisionItems?.length || 0} টি</span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: RESOLUTION CREATION MODE SELECTION */}
          {/* ============================================================ */}
          {selectedDecisionIds.length > 0 && !initialResolution && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs font-mono">
                  ৩
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  রেজোলিউশন প্রণয়নের ধরন (Creation Mode)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Separate Resolutions */}
                <div
                  id="mode-individual-card"
                  onClick={() => setCreationMode('INDIVIDUAL')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                    creationMode === 'INDIVIDUAL'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                      <Layers className="w-4 h-4 text-emerald-700" />
                      <span>A. প্রতিটি সিদ্ধান্তের জন্য আলাদা রেজোলিউশন</span>
                    </div>
                    <input
                      type="radio"
                      name="creation_mode"
                      checked={creationMode === 'INDIVIDUAL'}
                      onChange={() => setCreationMode('INDIVIDUAL')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-slate-600 font-baloo leading-relaxed">
                    নির্বাচিত {selectedDecisionIds.length}টি সিদ্ধান্তের প্রতিটির জন্য স্বয়ংক্রিয়ভাবে আলাদা স্মারক ও নম্বরযুক্ত স্বতন্ত্র রেজোলিউশন রেকর্ড তৈরি হবে।
                  </p>
                  <div className="text-[11px] font-mono text-emerald-800 bg-emerald-100/60 px-2 py-1 rounded">
                    উদাঃ RES-2026-001, RES-2026-002, RES-2026-003
                  </div>
                </div>

                {/* Option B: Combined Document */}
                <div
                  id="mode-combined-card"
                  onClick={() => setCreationMode('COMBINED')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                    creationMode === 'COMBINED'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>B. নির্বাচিত সকল সিদ্ধান্ত নিয়ে একটি রেজোলিউশন ডকুমেন্ট</span>
                    </div>
                    <input
                      type="radio"
                      name="creation_mode"
                      checked={creationMode === 'COMBINED'}
                      onChange={() => setCreationMode('COMBINED')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-slate-600 font-baloo leading-relaxed">
                    নির্বাচিত সকল সিদ্ধান্ত একটি সমন্বিত রেজোলিউশন নথিতে ধারাভিত্তিক ক্রমানুসারে সন্নিবেশিত হবে।
                  </p>
                  <div className="text-[11px] font-mono text-blue-800 bg-blue-100/60 px-2 py-1 rounded">
                    উদাঃ RES-2026-001 (রেজোলিউশন-১, রেজোলিউশন-২, রেজোলিউশন-৩...)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 4: RESOLUTION DETAILS & RESPONSIBILITY CONFIGURATION */}
          {/* ============================================================ */}
          {selectedDecisionIds.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs font-mono">
                    ৪
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {creationMode === 'COMBINED'
                        ? 'সম্মিলিত রেজোলিউশন ও প্রতিটি সিদ্ধান্তের বিস্তারিত কনফিগারেশন'
                        : 'রেজোলিউশন বিবরণ ও দায়িত্ব অর্পণ'}
                    </h3>
                    <p className="text-xs text-slate-500 font-baloo">
                      বিষয়, পটভূমি, প্রস্তাবক, সর্বসম্মত সিদ্ধান্ত ও বাস্তবায়ন তদারকি
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 font-baloo text-xs">
                  <div>
                    <span className="text-slate-500 mr-1">রেজোলিউশন নং:</span>
                    <strong className="font-mono text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {documentNumber}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Master Document Level Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-baloo">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                    রেজোলিউশন স্মারক / নথি নং
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="RES-2026-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                    রেজোলিউশন গ্রহণের তারিখ
                  </label>
                  <input
                    type="date"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                    রেজোলিউশন স্ট্যাটাস
                  </label>
                  <select
                    value={documentStatus}
                    onChange={(e) => setDocumentStatus(e.target.value as ResolutionStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DRAFT">খসড়া প্রস্তাবনা (Draft)</option>
                    <option value="APPROVED">অনুমোদিত ও কার্যকর (Approved)</option>
                    <option value="IMPLEMENTED">সম্পূর্ণ বাস্তবায়িত (Implemented)</option>
                    <option value="REJECTED">প্রত্যাখ্যাত (Rejected)</option>
                    <option value="CANCELLED">বাতিলকৃত (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* In Combined Mode: Overall Subject & Preamble */}
              {creationMode === 'COMBINED' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 font-siliguri">
                      সম্মিলিত রেজোলিউশন ডকুমেন্টের মূল বিষয় / শিরোনাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={documentSubject}
                      onChange={(e) => setDocumentSubject(e.target.value)}
                      placeholder="উদাঃ মসজিদ পরিচালনা কমিটির সাধারণ সভার সর্বসম্মত সিদ্ধান্ত ও রেজোলিউশনপত্র"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                        সাধারণ প্রেক্ষাপট ও সভার ভূমিকা (Preamble)
                      </label>
                      <textarea
                        rows={2}
                        value={documentBackground}
                        onChange={(e) => setDocumentBackground(e.target.value)}
                        placeholder="সভার প্রাথমিক প্রেক্ষাপট..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                        সার্বিক বিবেচনা ও পর্যালোচনার বিবরণ
                      </label>
                      <textarea
                        rows={2}
                        value={documentConsideration}
                        onChange={(e) => setDocumentConsideration(e.target.value)}
                        placeholder="সভার সামগ্রিক আলোচনা ও সিদ্ধান্ত গ্রহণের পটভূমি..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs for Multiple Decisions */}
              {selectedDecisionIds.length > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-500 font-siliguri shrink-0 mr-1">
                    সিদ্ধান্তসমূহ সম্পাদনা:
                  </span>
                  {selectedDecisionIds.map((decId, i) => {
                    const f = decisionForms[decId];
                    const isActive = activeDecisionTab === decId;
                    return (
                      <button
                        key={decId}
                        type="button"
                        onClick={() => setActiveDecisionTab(decId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{f?.decisionNumber || `সিদ্ধান্ত-${i + 1}`}</span>
                        {f?.subject && (
                          <span className="max-w-[120px] truncate text-[11px] opacity-80">
                            • {f.subject}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active Decision Form Fields */}
              {activeDecisionTab && decisionForms[activeDecisionTab] && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  <div className="flex items-center justify-between bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                    <span className="font-bold text-xs text-emerald-950 font-siliguri flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-emerald-800 text-white rounded text-[11px] font-mono">
                        {decisionForms[activeDecisionTab].decisionNumber}
                      </span>
                      <span>সম্পাদনা ফর্ম</span>
                    </span>
                    <span className="text-[11px] text-emerald-800 font-baloo">
                      {creationMode === 'INDIVIDUAL' ? 'স্বতন্ত্র রেজোলিউশন রেকর্ড' : 'সম্মিলিত রেজোলিউশন আইটেম'}
                    </span>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      রেজোলিউশনের বিষয় (Subject) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={decisionForms[activeDecisionTab].subject}
                      onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'subject', e.target.value)}
                      placeholder="উদাঃ দ্বিতীয় তলার কাজের জন্য বাজেট বরাদ্দ ও বাস্তবায়ন"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Background & Consideration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-baloo">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                        পটভূমি ও প্রেক্ষাপট (Background)
                      </label>
                      <textarea
                        rows={2}
                        value={decisionForms[activeDecisionTab].background}
                        onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'background', e.target.value)}
                        placeholder="প্রস্তাব গ্রহণের প্রয়োজনীয়তা..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                        বিবেচনা ও সভার আলোচনা (Consideration)
                      </label>
                      <textarea
                        rows={2}
                        value={decisionForms[activeDecisionTab].consideration}
                        onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'consideration', e.target.value)}
                        placeholder="সভায় বিস্তারিত পর্যালোচনা..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Proposal, Proposer, Supporter */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-baloo">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                        প্রস্তাবনা (Proposal)
                      </label>
                      <input
                        type="text"
                        value={decisionForms[activeDecisionTab].proposal}
                        onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'proposal', e.target.value)}
                        placeholder="উদাঃ বাজেট অনুমোদনের প্রস্তাব পেশ"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                        প্রস্তাবক (Proposer)
                      </label>
                      <input
                        type="text"
                        value={decisionForms[activeDecisionTab].proposerName}
                        onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'proposerName', e.target.value)}
                        placeholder="প্রস্তাবকের নাম"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                        সমর্থনকারী (Seconder / Supporter)
                      </label>
                      <input
                        type="text"
                        value={decisionForms[activeDecisionTab].supporterName}
                        onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'supporterName', e.target.value)}
                        placeholder="সমর্থনকারীর নাম"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Resolution Text (Adopted Decision) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 font-siliguri flex items-center justify-between">
                      <span>গৃহীত রেজোলিউশন ও বাস্তবায়নের চূড়ান্ত আদেশ <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] text-emerald-700 font-normal font-baloo">অফিসিয়াল সার্টিফাইড সিদ্ধান্ত</span>
                    </label>
                    <textarea
                      rows={3}
                      value={decisionForms[activeDecisionTab].resolutionText}
                      onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'resolutionText', e.target.value)}
                      placeholder="সর্বসম্মতিক্রমে গৃহীত রেজোলিউশন..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-tiro leading-relaxed"
                    />
                  </div>

                  {/* Section: Responsibility & Implementation Tracking */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 font-siliguri flex items-center space-x-1.5">
                      <Briefcase className="w-4 h-4 text-emerald-700" />
                      <span>দায়িত্ব অর্পণ ও বাস্তবায়ন তদারকি (Responsibility & Progress)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-baloo">
                      {/* Responsible Member */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                          দায়িত্বপ্রাপ্ত সদস্য
                        </label>
                        <select
                          value={decisionForms[activeDecisionTab].assignedMemberId}
                          onChange={(e) => handleMemberChange(activeDecisionTab, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">-- সদস্য বেছে নিন --</option>
                          {activeMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.positionCustomBn || m.position || 'সদস্য'}) {m.phone ? `- ${m.phone}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Deadline */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                          বাস্তবায়নের সময়সীমা (Deadline)
                        </label>
                        <input
                          type="date"
                          value={decisionForms[activeDecisionTab].deadline}
                          onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'deadline', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                          অগ্রাধিকার (Priority)
                        </label>
                        <select
                          value={decisionForms[activeDecisionTab].priority}
                          onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'priority', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="NORMAL">সাধারণ (Normal)</option>
                          <option value="HIGH">উচ্চ অগ্রাধিকার (High)</option>
                          <option value="URGENT">জরুরি (Urgent)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-baloo">
                      {/* Implementation Status */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                          বাস্তবায়ন অগ্রগতি স্ট্যাটাস
                        </label>
                        <select
                          value={decisionForms[activeDecisionTab].implementationStatus}
                          onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'implementationStatus', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="PENDING">অপেক্ষমান (Pending)</option>
                          <option value="IN_PROGRESS">চলমান (In Progress)</option>
                          <option value="COMPLETED">সম্পন্ন (Completed)</option>
                          <option value="DELAYED">বিলম্বিত (Delayed)</option>
                          <option value="CANCELLED">বাতিল (Cancelled)</option>
                        </select>
                      </div>

                      {/* Progress % */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri flex items-center justify-between">
                          <span>অগ্রগতি শতকরা (%): {decisionForms[activeDecisionTab].progressPercentage}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={decisionForms[activeDecisionTab].progressPercentage}
                          onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'progressPercentage', Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
                        />
                      </div>

                      {/* Financial Amount if any */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                          বরাদ্দকৃত অর্থ / বাজেট (যদি থাকে)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">৳</span>
                          <input
                            type="number"
                            value={decisionForms[activeDecisionTab].financialAmount || ''}
                            onChange={(e) => handleDecisionFieldChange(activeDecisionTab, 'financialAmount', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 5: REVISION MODE REASON IF APPLICABLE */}
          {/* ============================================================ */}
          {isRevision && (
            <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-amber-900">
                <History className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-sm sm:text-base font-siliguri">
                  রেজোলিউশন সংশোধন / রিভিশন বিবরণ (Audit Trail)
                </h3>
              </div>
              <p className="text-xs text-amber-800 font-baloo">
                অনুমোদিত রেজোলিউশন সরাসরি মোছা যায় না। যেকোনো সংশোধনির ক্ষেত্রে সুস্পষ্ট কারণ উল্লেখ করতে হবে। পূর্ববর্তী সংস্করণ অডিট হিস্ট্রিতে সংরক্ষিত থাকবে।
              </p>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1 font-siliguri">
                  সংশোধনের সুস্পষ্ট কারণ ও রেফারেন্স <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="উদাঃ পরবর্তী কার্যনির্বাহী সভার সিদ্ধান্ত অনুযায়ী বাজেট বৃদ্ধি ও সময়সীমা বর্ধিতকরণ..."
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 font-baloo"
                />
              </div>
            </div>
          )}

        </form>

        {/* Footer Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-baloo text-center sm:text-left">
            {creationMode === 'COMBINED' ? (
              <span>১টি সম্মিলিত রেজোলিউশন ডকুমেন্ট ({selectedDecisionIds.length}টি সিদ্ধান্ত অন্তর্ভুক্ত)</span>
            ) : (
              <span>{selectedDecisionIds.length}টি স্বতন্ত্র রেজোলিউশন তৈরি হবে</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              বাতিল
            </button>

            <button
              type="button"
              id="btn-save-resolution-submit"
              disabled={isSubmitting || selectedDecisionIds.length === 0}
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'সংরক্ষণ করা হচ্ছে...'
                  : initialResolution
                  ? (isRevision ? 'সংশোধিত রেজোলিউশন অনুমোদন' : 'রেজোলিউশন আপডেট করুন')
                  : (creationMode === 'COMBINED' ? 'সম্মিলিত রেজোলিউশন সংরক্ষণ' : `${selectedDecisionIds.length}টি রেজোলিউশন প্রণয়ন করুন`)}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

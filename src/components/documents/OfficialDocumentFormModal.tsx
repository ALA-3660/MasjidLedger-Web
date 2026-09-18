import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  FileText,
  Building,
  User,
  Users,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Paperclip,
  CheckCircle2,
  Plus,
  Trash2,
  HelpCircle,
  Eye,
  Columns,
  Layers,
  Send,
  Lock,
  Globe,
  Award,
  Link,
  ChevronDown,
  Upload,
} from 'lucide-react';
import {
  OfficialDocument,
  OfficialDocumentType,
  OfficialDocumentPriority,
  OfficialDocumentVisibility,
  OfficialDocumentStatus,
  DocumentSignatory,
  DocumentAttachment,
} from '../../types/officialDocumentTypes';
import { Mosque, CommitteeTerm, CommitteeMeeting, MeetingResolution, Member, Staff } from '../../types';
import { DEFAULT_DOCUMENT_TEMPLATES, replaceTemplatePlaceholders } from '../../lib/officialDocumentTemplates';
import { OfficialDocumentAiModal } from './OfficialDocumentAiModal';

interface OfficialDocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<OfficialDocument>) => Promise<void>;
  documentToEdit?: OfficialDocument | null;
  initialDocType?: OfficialDocumentType;
  mosque?: Mosque | null;
  committeeTerms?: CommitteeTerm[];
  committeeMeetings?: CommitteeMeeting[];
  resolutions?: MeetingResolution[];
  members?: any[];
  staffList?: any[];
}

export const OfficialDocumentFormModal: React.FC<OfficialDocumentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  documentToEdit,
  initialDocType = 'NOTICE',
  mosque,
  committeeTerms = [],
  committeeMeetings = [],
  resolutions = [],
  members = [],
  staffList = [],
}) => {
  const isEditing = Boolean(documentToEdit);

  // Form State
  const [docType, setDocType] = useState<OfficialDocumentType>(initialDocType);
  const [subType, setSubType] = useState('');
  const [title, setTitle] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [memoNumber, setMemoNumber] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [venueStr, setVenueStr] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderDesignation, setSenderDesignation] = useState('');
  const [senderOrg, setSenderOrg] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [recipientType, setRecipientType] = useState('ALL');
  const [recipientName, setRecipientName] = useState('');
  const [recipientDesignation, setRecipientDesignation] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [body, setBody] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<OfficialDocumentStatus>('DRAFT');
  const [priority, setPriority] = useState<OfficialDocumentPriority>('NORMAL');
  const [visibility, setVisibility] = useState<OfficialDocumentVisibility>('PUBLIC');
  const [includeLetterhead, setIncludeLetterhead] = useState(true);

  // Specific Sub-fields
  const [certificateFor, setCertificateFor] = useState('');
  const [certificateSubject, setCertificateSubject] = useState('');
  const [recommendationFor, setRecommendationFor] = useState('');
  const [recommendationReason, setRecommendationReason] = useState('');
  const [dispatchMethod, setDispatchMethod] = useState('');
  const [dispatchedAt, setDispatchedAt] = useState('');
  const [replyRequired, setReplyRequired] = useState(false);
  const [replyDeadline, setReplyDeadline] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  // Linkings
  const [committeeTermId, setCommitteeTermId] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [resolutionId, setResolutionId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [staffId, setStaffId] = useState('');

  // Signatories & Attachments
  const [signatories, setSignatories] = useState<DocumentSignatory[]>([
    { id: 'sig-1', title: 'সাধারণ সম্পাদক', name: 'আলহাজ্ব মো: রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', signed: true },
    { id: 'sig-2', title: 'সভাপতি', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true },
  ]);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [newAttName, setNewAttName] = useState('');
  const [newAttDriveLink, setNewAttDriveLink] = useState('');

  // UI helpers
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state on open / edit
  useEffect(() => {
    if (isOpen) {
      if (documentToEdit) {
        setDocType(documentToEdit.docType);
        setSubType(documentToEdit.subType || '');
        setTitle(documentToEdit.title || '');
        setDocumentNumber(documentToEdit.documentNumber || '');
        setMemoNumber(documentToEdit.memoNumber || '');
        setApplicationNumber(documentToEdit.applicationNumber || '');
        setReferenceNumber(documentToEdit.referenceNumber || '');
        setDocumentDate(documentToEdit.documentDate || new Date().toISOString().split('T')[0]);
        setEffectiveDate(documentToEdit.effectiveDate || '');
        setTimeStr(documentToEdit.timeStr || '');
        setVenueStr(documentToEdit.venueStr || '');
        setSenderName(documentToEdit.senderName || '');
        setSenderDesignation(documentToEdit.senderDesignation || '');
        setSenderOrg(documentToEdit.senderOrg || '');
        setSenderAddress(documentToEdit.senderAddress || '');
        setRecipientType(documentToEdit.recipientType || 'ALL');
        setRecipientName(documentToEdit.recipientName || '');
        setRecipientDesignation(documentToEdit.recipientDesignation || '');
        setRecipientOrg(documentToEdit.recipientOrg || '');
        setRecipientAddress(documentToEdit.recipientAddress || '');
        setBody(documentToEdit.body || '');
        setSummary(documentToEdit.summary || '');
        setStatus(documentToEdit.status || 'DRAFT');
        setPriority(documentToEdit.priority || 'NORMAL');
        setVisibility(documentToEdit.visibility || 'PUBLIC');
        setIncludeLetterhead(documentToEdit.includeLetterhead !== false);
        setCertificateFor(documentToEdit.certificateFor || '');
        setCertificateSubject(documentToEdit.certificateSubject || '');
        setRecommendationFor(documentToEdit.recommendationFor || '');
        setRecommendationReason(documentToEdit.recommendationReason || '');
        setDispatchMethod(documentToEdit.dispatchMethod || '');
        setDispatchedAt(documentToEdit.dispatchedAt || '');
        setReplyRequired(Boolean(documentToEdit.replyRequired));
        setReplyDeadline(documentToEdit.replyDeadline || '');
        setActionTaken(documentToEdit.actionTaken || '');
        setCommitteeTermId(documentToEdit.committeeTermId || '');
        setMeetingId(documentToEdit.meetingId || '');
        setResolutionId(documentToEdit.resolutionId || '');
        setMemberId(documentToEdit.memberId || '');
        setStaffId(documentToEdit.staffId || '');
        setSignatories(documentToEdit.signatories && documentToEdit.signatories.length > 0 ? documentToEdit.signatories : [
          { id: 'sig-1', title: 'সাধারণ সম্পাদক', name: 'সাধারণ সম্পাদক', designation: 'সাধারণ সম্পাদক', signed: true }
        ]);
        setAttachments(documentToEdit.attachments || []);
      } else {
        // Reset defaults for new doc
        setDocType(initialDocType);
        setSubType('');
        setTitle('');
        setDocumentNumber('');
        setMemoNumber('');
        setApplicationNumber('');
        setReferenceNumber('');
        setDocumentDate(new Date().toISOString().split('T')[0]);
        setEffectiveDate('');
        setTimeStr('');
        setVenueStr('');
        setSenderName(mosque?.nameBn || 'মসজিদ পরিচালনা পরিষদ');
        setSenderDesignation('পরিচালনা পরিষদ');
        setSenderOrg(mosque?.nameBn || '');
        setSenderAddress(mosque?.address || '');
        setRecipientType('ALL');
        setRecipientName('');
        setRecipientDesignation('');
        setRecipientOrg('');
        setRecipientAddress('');
        setBody('<p></p>');
        setSummary('');
        setStatus('DRAFT');
        setPriority('NORMAL');
        setVisibility('PUBLIC');
        setIncludeLetterhead(true);
        setCertificateFor('');
        setCertificateSubject('');
        setRecommendationFor('');
        setRecommendationReason('');
        setDispatchMethod('');
        setDispatchedAt('');
        setReplyRequired(false);
        setReplyDeadline('');
        setActionTaken('');
        setCommitteeTermId('');
        setMeetingId('');
        setResolutionId('');
        setMemberId('');
        setStaffId('');
        setSignatories([
          { id: 'sig-1', title: 'সাধারণ সম্পাদক', name: 'আলহাজ্ব মো: রফিকুল ইসলাম', designation: 'সাধারণ সম্পাদক', signed: true },
          { id: 'sig-2', title: 'সভাপতি', name: 'জনাব মো: নুরুল হুদা চৌধুরী', designation: 'সভাপতি', signed: true },
        ]);
        setAttachments([]);
      }
      setSelectedTemplateId('');
      setError(null);
    }
  }, [isOpen, documentToEdit, initialDocType, mosque]);

  if (!isOpen) return null;

  // Apply template
  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = DEFAULT_DOCUMENT_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;

    setDocType(tmpl.docType);
    if (tmpl.subType) setSubType(tmpl.subType);
    if (tmpl.defaultTitle) setTitle(tmpl.defaultTitle);
    
    // Replace placeholders with mosque data
    const populated = replaceTemplatePlaceholders(tmpl.bodyTemplate, {
      mosqueName: mosque?.nameBn || mosque?.name || 'বায়তুল আমান জামে মসজিদ',
      date: documentDate,
      time: timeStr || 'বাদ মাগরিব',
      venue: venueStr || 'মসজিদ কনফারেন্স রুম',
    });
    setBody(populated);
    if (tmpl.defaultSignatories && tmpl.defaultSignatories.length > 0) {
      setSignatories(tmpl.defaultSignatories.map(s => ({ ...s, signed: true })));
    }
  };

  const handleAddSignatory = () => {
    const id = `sig-${Date.now()}`;
    setSignatories([...signatories, { id, title: 'সদস্য', name: '', designation: 'সদস্য', signed: true }]);
  };

  const handleRemoveSignatory = (id: string) => {
    setSignatories(signatories.filter(s => s.id !== id));
  };

  const handleAddDriveAttachment = () => {
    if (!newAttName.trim() || !newAttDriveLink.trim()) return;
    setAttachments([
      ...attachments,
      {
        id: `att-${Date.now()}`,
        name: newAttName.trim(),
        googleDriveLink: newAttDriveLink.trim(),
        type: 'DRIVE_LINK',
      }
    ]);
    setNewAttName('');
    setNewAttDriveLink('');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('নথির বিষয় বা শিরোনাম প্রদান করা আবশ্যক।');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        docType,
        subType: subType || undefined,
        title: title.trim(),
        documentNumber: documentNumber.trim() || undefined,
        memoNumber: memoNumber.trim() || undefined,
        applicationNumber: applicationNumber.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        documentDate,
        effectiveDate: effectiveDate || undefined,
        timeStr: timeStr || undefined,
        venueStr: venueStr || undefined,
        senderName: senderName.trim() || undefined,
        senderDesignation: senderDesignation.trim() || undefined,
        senderOrg: senderOrg.trim() || undefined,
        senderAddress: senderAddress.trim() || undefined,
        recipientType: recipientType as any,
        recipientName: recipientName.trim() || undefined,
        recipientDesignation: recipientDesignation.trim() || undefined,
        recipientOrg: recipientOrg.trim() || undefined,
        recipientAddress: recipientAddress.trim() || undefined,
        body,
        summary: summary.trim() || undefined,
        status,
        priority,
        visibility,
        includeLetterhead,
        certificateFor: certificateFor.trim() || undefined,
        certificateSubject: certificateSubject.trim() || undefined,
        recommendationFor: recommendationFor.trim() || undefined,
        recommendationReason: recommendationReason.trim() || undefined,
        dispatchMethod: dispatchMethod || undefined,
        dispatchedAt: dispatchedAt || undefined,
        replyRequired,
        replyDeadline: replyDeadline || undefined,
        actionTaken: actionTaken.trim() || undefined,
        committeeTermId: committeeTermId || undefined,
        meetingId: meetingId || undefined,
        resolutionId: resolutionId || undefined,
        memberId: memberId || undefined,
        staffId: staffId || undefined,
        signatories,
        attachments,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving official document:', err);
      setError(err.message || 'নথি সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const availableTemplates = DEFAULT_DOCUMENT_TEMPLATES.filter(
    t => !docType || t.docType === docType
  );

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  {isEditing ? 'দাপ্তরিক নথি সম্পাদনা (Edit Document)' : 'নতুন দাপ্তরিক নথি সৃষ্টি (Create Official Document)'}
                </h2>
                <p className="text-xs text-slate-300">
                  অফিসিয়াল নোটিশ, আবেদন, স্মারকপত্র, সনদ, সুপারিশ ও যোগাযোগ ড্রাফট তৈরি
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>AI ড্রাফটিং সহকারী</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              {/* Row 1: Document Type & Template Select */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    নথির ধরন (Document Category) *
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="NOTICE">📢 বিজ্ঞপ্তি / নোটিশ (Notice)</option>
                    <option value="APPLICATION">📝 দরখাস্ত / আবেদন (Application)</option>
                    <option value="ANNOUNCEMENT">📣 সাধারণ ঘোষণা (Announcement)</option>
                    <option value="OUTGOING_LETTER">📤 প্রেরিত পত্র / স্মারক (Outgoing Letter)</option>
                    <option value="INCOMING_LETTER">📥 প্রাপ্ত পত্র (Incoming Letter)</option>
                    <option value="OFFICE_ORDER">🏢 অফিস আদেশ (Office Order)</option>
                    <option value="CERTIFICATE">📄 প্রত্যয়নপত্র / সনদ (Certificate)</option>
                    <option value="RECOMMENDATION">📜 সুপারিশপত্র (Recommendation)</option>
                    <option value="MEMO_REGISTER">🔖 স্মারক রেজিস্টার এন্ট্রি (Memo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    রেডি টেমপ্লেট নির্বাচন (Select Template)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- কাস্টম / খালি ড্রাফট --</option>
                    {availableTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    স্ট্যাটাস (Status)
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="DRAFT">খসড়া (Draft)</option>
                    <option value="PREPARED">প্রস্তুতকৃত (Prepared)</option>
                    <option value="UNDER_REVIEW">পর্যালোচনাধীন (Under Review)</option>
                    <option value="PENDING_APPROVAL">অনুমোদন অপেক্ষমাণ (Pending Approval)</option>
                    <option value="APPROVED">অনুমোদিত (Approved)</option>
                    <option value="SENT">প্রেরিত (Sent / Dispatched)</option>
                    <option value="REPLY_AWAITED">উত্তর অপেক্ষমাণ (Reply Awaited)</option>
                    <option value="IN_PROGRESS">চলমান কার্যক্রম (In Progress)</option>
                    <option value="RESOLVED">নিষ্পন্ন / কার্যকর (Resolved)</option>
                    <option value="ARCHIVED">আর্কাইভড (Archived)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Title, Number, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    নথির বিষয় / শিরোনাম (Document Subject / Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: পরিচালনা পরিষদের মাসিক সাধারণ সভা সংক্রান্ত নোটিশ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    স্মারক / নথি নম্বর (Memo / Doc No)
                  </label>
                  <input
                    type="text"
                    value={documentNumber || memoNumber}
                    onChange={(e) => {
                      setDocumentNumber(e.target.value);
                      setMemoNumber(e.target.value);
                    }}
                    placeholder="স্বয়ংক্রিয়ভাবে তৈরি হবে (ঐচ্ছিক)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    তারিখ (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Type-Specific Fields */}
              {docType === 'NOTICE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">সময় (Time)</label>
                    <input
                      type="text"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      placeholder="যেমন: বাদ মাগরিব (সন্ধ্যা ৬:৪৫)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">স্থান (Venue)</label>
                    <input
                      type="text"
                      value={venueStr}
                      onChange={(e) => setVenueStr(e.target.value)}
                      placeholder="যেমন: মসজিদ কনফারেন্স কক্ষ / ২য় তলা"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {docType === 'OUTGOING_LETTER' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">প্রাপক ব্যক্তি / পদবি</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="যেমন: উপজেলা নির্বাহী অফিসার (ইউএনও)"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">প্রাপক প্রতিষ্ঠান / দপ্তর</label>
                    <input
                      type="text"
                      value={recipientOrg}
                      onChange={(e) => setRecipientOrg(e.target.value)}
                      placeholder="যেমন: উপজেলা পরিষদ কার্যালয়"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">প্রেরণের মাধ্যম</label>
                    <select
                      value={dispatchMethod}
                      onChange={(e) => setDispatchMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    >
                      <option value="">-- নির্বাচন করুন --</option>
                      <option value="HAND_DELIVERY">সরাসরি হাতে হাতে (Hand Delivery)</option>
                      <option value="POSTAL_COURIER">ডাক / কুরিয়ার সার্ভিস</option>
                      <option value="EMAIL">ইমেইল (Email)</option>
                      <option value="WHATSAPP">হোয়াটসঅ্যাপ / মেসেঞ্জার</option>
                    </select>
                  </div>
                </div>
              )}

              {docType === 'INCOMING_LETTER' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-amber-50/40 p-4 rounded-xl border border-amber-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">প্রেরক ব্যক্তি / প্রতিষ্ঠান</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="যেমন: ইসলামিক ফাউন্ডেশন জেলা কার্যালয়"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">প্রাপ্তির তারিখ</label>
                    <input
                      type="date"
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">মূল নির্দেশ বা সিদ্ধান্ত</label>
                    <input
                      type="text"
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="যেমন: উন্নয়ন সাব-কমিটিকে বাস্তবায়ন দায়িত্ব"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {docType === 'CERTIFICATE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/40 p-4 rounded-xl border border-purple-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">সনদ গ্রহীতার নাম</label>
                    <input
                      type="text"
                      value={certificateFor}
                      onChange={(e) => setCertificateFor(e.target.value)}
                      placeholder="যার নামে সনদপত্র ইস্যু হচ্ছে"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">সনদের বিষয় / উপলক্ষ</label>
                    <input
                      type="text"
                      value={certificateSubject}
                      onChange={(e) => setCertificateSubject(e.target.value)}
                      placeholder="যেমন: পরিচালনা পরিষদ সদস্যপদ প্রত্যয়ন"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Main Body (Rich Text Canvas) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    নথির মূল বিষয়বস্তু ও বিবরণ (Document Body / HTML Content) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>এআই দিয়ে ড্রাফট লিখুন বা পরিমার্জন করুন</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="<p>সম্মানিত সদস্যবৃন্দ...</p>"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>প্যারাগ্রাফ ও তালিকা তৈরিতে &lt;p&gt;, &lt;strong&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;br&gt; ট্যাগ ব্যবহার করুন।</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeLetterhead}
                      onChange={(e) => setIncludeLetterhead(e.target.checked)}
                      className="w-3.5 h-3.5 rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-700">গ্লোবাল লেটারহেড প্রিন্টে যুক্ত থাকবে (Include Letterhead)</span>
                  </label>
                </div>
              </div>

              {/* Signatories & Attachments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Signatories */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      স্বাক্ষরকারী ব্যক্তিবর্গ (Signatories)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSignatory}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>স্বাক্ষরকারী যোগ</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {signatories.map((sig, idx) => (
                      <div key={sig.id || idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                        <input
                          type="text"
                          value={sig.name}
                          onChange={(e) => {
                            const updated = [...signatories];
                            updated[idx].name = e.target.value;
                            setSignatories(updated);
                          }}
                          placeholder="স্বাক্ষরকারীর নাম"
                          className="flex-1 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none"
                        />
                        <input
                          type="text"
                          value={sig.designation}
                          onChange={(e) => {
                            const updated = [...signatories];
                            updated[idx].designation = e.target.value;
                            setSignatories(updated);
                          }}
                          placeholder="পদবি (যেমন: সভাপতি)"
                          className="w-32 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSignatory(sig.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments / Google Drive Link */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <label className="text-xs font-bold text-slate-800 block">
                    সংযুক্তি বা গুগল ড্রাইভ লিংক (Attachments & Links)
                  </label>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newAttName}
                      onChange={(e) => setNewAttName(e.target.value)}
                      placeholder="ফাইলের নাম / বিবরণ"
                      className="w-1/3 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    />
                    <input
                      type="url"
                      value={newAttDriveLink}
                      onChange={(e) => setNewAttDriveLink(e.target.value)}
                      placeholder="গুগল ড্রাইভ বা ফাইল URL"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddDriveAttachment}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      যুক্ত
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                        <span className="truncate font-medium text-slate-700">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-rose-500 hover:text-rose-700 ml-2 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <div className="text-[11px] text-slate-400 italic py-1">কোনো সংযুক্তি নেই</div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                বাতিল
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'হালনাগাদ সংরক্ষণ করুন' : 'নথি সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>

      {/* Embedded AI Assistant Modal */}
      <OfficialDocumentAiModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        docType={docType}
        currentSubject={title}
        currentContent={body}
        onInsertContent={(newContent, newSubject) => {
          setBody(newContent);
          if (newSubject && !title) setTitle(newSubject);
        }}
      />
    </>
  );
};

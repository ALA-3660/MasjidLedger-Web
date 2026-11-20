import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  FileText,
  Camera,
  Upload,
  CheckCircle2,
  Printer,
  Save,
  Plus,
  Trash2,
  Users,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import { CommitteeMember, CommitteeTerm, Mosque } from '../../types';
import { api } from '../../lib/api';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';

interface AiResolutionDraft {
  decisionNumber: string;
  agendaTopic: string;
  discussionSummaryBn: string;
  proposerName: string;
  seconderName: string;
  decisionTextBn: string;
  responsiblePersonName: string;
  targetDeadline: string;
  estimatedBudget: number;
}

interface AiMinutesDraft {
  meetingTitleBn: string;
  meetingDate: string;
  dayNameBn: string;
  timeBn: string;
  venueBn: string;
  meetingTypeBn: string;
  chairmanName: string;
  secretaryName: string;
  attendeeNames: string[];
  openingRemarksBn: string;
  agendas: string[];
  resolutions: AiResolutionDraft[];
  closingRemarksBn: string;
  ocrConfidenceNoteBn: string;
}

interface AiMeetingMinutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mosque?: Mosque | null;
  activeTerm?: CommitteeTerm | null;
  members: CommitteeMember[];
  existingMeetingsCount: number;
  onSaveMeeting: (meetingData: any) => Promise<void>;
  onSaveResolution?: (resolutionData: any) => Promise<void>;
}

const POSITION_BN: Record<string, string> = {
  PRESIDENT: 'সভাপতি',
  VICE_PRESIDENT: 'সহ-সভাপতি',
  SECRETARY: 'সাধারণ সম্পাদক',
  JOINT_SECRETARY: 'যুগ্ম সাধারণ সম্পাদক',
  TREASURER: 'কোষাধ্যক্ষ',
  ORGANIZING_SECRETARY: 'সাংগঠনিক সম্পাদক',
  MEMBER: 'কার্যনির্বাহী সদস্য',
  IMAM: 'ইমাম ও খতিব',
  ADVISOR: 'উপদেষ্টা',
  OTHER: 'সদস্য',
};

const toBnDigits = (val: string | number) => {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[+d]);
};

async function compressImageToBase64(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ছবিটি পড়তে সমস্যা হয়েছে।'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('অবৈধ ছবি ফাইল।'));
      img.onload = () => {
        const maxDim = 1800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = String(reader.result || '');
          resolve({ base64: raw.split(',')[1] || '', mimeType: file.type || 'image/jpeg', previewUrl: raw });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          base64: dataUrl.split(',')[1] || '',
          mimeType: 'image/jpeg',
          previewUrl: dataUrl,
        });
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const AiMeetingMinutesModal: React.FC<AiMeetingMinutesModalProps> = ({
  isOpen,
  onClose,
  mosque,
  activeTerm,
  members,
  existingMeetingsCount,
  onSaveMeeting,
  onSaveResolution,
}) => {
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');
  const defaultChairman =
    activeMembers.find((m) => m.position === 'PRESIDENT')?.name || '';
  const defaultSecretary =
    activeMembers.find((m) => m.position === 'SECRETARY')?.name || '';

  const [mode, setMode] = useState<'NOTES' | 'HANDWRITTEN_SCAN'>('NOTES');
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState<string>('বাদ মাগরিব');
  const [venue, setVenue] = useState<string>(`${mosque?.nameBn || mosque?.name || 'মসজিদ'} কার্যালয়`);
  const [meetingTypeBn, setMeetingTypeBn] = useState<string>('কার্যনির্বাহী পরিষদের সাধারণ সভা');
  const [chairmanName, setChairmanName] = useState<string>(defaultChairman);
  const [secretaryName, setSecretaryName] = useState<string>(defaultSecretary);
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>(
    activeMembers.slice(0, 8).map((m) => m.id)
  );
  const [customAttendeesText, setCustomAttendeesText] = useState<string>('');
  const [rawNotes, setRawNotes] = useState<string>('');

  // Handwritten notebook image state
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generation & Editable Preview State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [draft, setDraft] = useState<AiMinutesDraft | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const toggleAttendee = (id: string) => {
    setSelectedAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      const compressed = await compressImageToBase64(file);
      setImageBase64(compressed.base64);
      setImageMimeType(compressed.mimeType);
      setImagePreviewUrl(compressed.previewUrl);
      setImageFileName(file.name);
    } catch (err: any) {
      setErrorMsg(err?.message || 'ছবিটি লোড করা যায়নি।');
    }
  };

  const handleGenerate = async () => {
    setErrorMsg('');
    setSaveSuccessMsg('');

    if (mode === 'NOTES' && !rawNotes.trim()) {
      setErrorMsg('অনুগ্রহ করে মিটিংয়ে আলোচিত সংক্ষিপ্ত পয়েন্ট বা কাঁচা নোট লিখুন।');
      return;
    }
    if (mode === 'HANDWRITTEN_SCAN' && !imageBase64) {
      setErrorMsg('অনুগ্রহ করে হাতে লেখা পুরনো রেজুলেশন খাতার একটি স্পষ্ট ছবি আপলোড করুন।');
      return;
    }

    const selectedMemberNames = activeMembers
      .filter((m) => selectedAttendeeIds.includes(m.id))
      .map((m) => `${m.name} (${m.positionCustomBn || POSITION_BN[m.position] || m.position})`);
    const extraNames = customAttendeesText
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    setIsGenerating(true);
    try {
      const result = await api.generateCommitteeMeetingMinutesAi({
        mode,
        meetingDate,
        meetingTime,
        venue,
        meetingTypeBn,
        chairmanName: chairmanName.trim() || undefined,
        secretaryName: secretaryName.trim() || undefined,
        attendeeNames: [...selectedMemberNames, ...extraNames],
        rawNotes: rawNotes.trim() || undefined,
        imageBase64: mode === 'HANDWRITTEN_SCAN' ? imageBase64 : undefined,
        mimeType: mode === 'HANDWRITTEN_SCAN' ? imageMimeType : undefined,
      });
      setDraft(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI কার্যবিবরণী তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateResolutionField = (idx: number, field: keyof AiResolutionDraft, value: any) => {
    if (!draft) return;
    setDraft({
      ...draft,
      resolutions: draft.resolutions.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    });
  };

  const addEmptyResolution = () => {
    if (!draft) return;
    const nextNum = draft.resolutions.length + 1;
    setDraft({
      ...draft,
      resolutions: [
        ...draft.resolutions,
        {
          decisionNumber: `সিদ্ধান্ত-${toBnDigits(nextNum)}`,
          agendaTopic: '',
          discussionSummaryBn: '',
          proposerName: draft.secretaryName || '',
          seconderName: draft.chairmanName || '',
          decisionTextBn: '',
          responsiblePersonName: '',
          targetDeadline: '',
          estimatedBudget: 0,
        },
      ],
    });
  };

  const removeResolution = (idx: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      resolutions: draft.resolutions.filter((_, i) => i !== idx),
    });
  };

  const handlePrintPreview = () => {
    if (!draft) return;
    printElement('ai-meeting-minutes-printable', {
      title: `কার্যবিবরণী_${draft.meetingDate}`,
    });
  };

  // Explicit user-confirmed save (NEVER auto-saves!)
  const handleSaveConfirmed = async (andPrint: boolean) => {
    if (!draft) return;
    setIsSaving(true);
    setErrorMsg('');
    try {
      const serial = existingMeetingsCount + 1;
      const dateParts = draft.meetingDate.split('-');
      const memoNumber = `AI-MM-${dateParts[0] || '2026'}/${String(serial).padStart(3, '0')}`;

      const meetingPayload = {
        meetingNumber: String(serial),
        memoNumber,
        date: draft.meetingDate,
        dayName: draft.dayNameBn,
        time: draft.timeBn,
        location: draft.venueBn,
        meetingType: 'GENERAL',
        meetingTypeBn: draft.meetingTypeBn,
        chairman: draft.chairmanName,
        secretary: draft.secretaryName,
        agenda: draft.resolutions.map((r) => r.agendaTopic).filter(Boolean),
        agendaItems: draft.resolutions.map((r, i) => ({
          id: `ag-${Date.now()}-${i}`,
          agendaNumber: i + 1,
          title: r.agendaTopic,
          discussion: r.discussionSummaryBn,
        })),
        decisions: draft.resolutions.map(
          (r) =>
            `${r.decisionNumber}: ${r.decisionTextBn} (প্রস্তাবক: ${r.proposerName}, সমর্থনকারী: ${r.seconderName})`
        ),
        decisionItems: draft.resolutions.map((r, i) => ({
          id: `dec-${Date.now()}-${i}`,
          decisionNumber: r.decisionNumber,
          title: r.agendaTopic,
          decisionText: r.decisionTextBn,
          proposer: r.proposerName,
          seconder: r.seconderName,
          responsibleName: r.responsiblePersonName,
          deadline: r.targetDeadline,
          estimatedBudget: r.estimatedBudget,
        })),
        resolutions: draft.resolutions.map((r) => r.decisionTextBn),
        membersPresent: draft.attendeeNames,
        membersAbsent: [],
        attendees: draft.attendeeNames.map((name, i) => ({
          id: `att-${Date.now()}-${i}`,
          name,
          status: 'PRESENT',
          isPresent: true,
        })),
        notes: [draft.openingRemarksBn, draft.closingRemarksBn].filter(Boolean).join('\n\n'),
        status: 'FINAL',
      };

      await onSaveMeeting(meetingPayload);

      // Also save each resolution into the Resolution Book if callback is available
      if (onSaveResolution && draft.resolutions.length > 0) {
        for (let i = 0; i < draft.resolutions.length; i++) {
          const r = draft.resolutions[i];
          if (!r.decisionTextBn.trim()) continue;
          const matchedMember = members.find(
            (m) =>
              r.responsiblePersonName &&
              m.name.toLowerCase().includes(r.responsiblePersonName.toLowerCase())
          );
          await onSaveResolution({
            resolutionNumber: `RES-${dateParts[0] || '2026'}-${String(serial).padStart(2, '0')}-${i + 1}`,
            meetingId: '',
            meetingNumber: String(serial),
            meetingMemoNumber: memoNumber,
            meetingDate: draft.meetingDate,
            meetingDayName: draft.dayNameBn,
            meetingTime: draft.timeBn,
            meetingVenue: draft.venueBn,
            meetingChairman: draft.chairmanName,
            meetingSecretary: draft.secretaryName,
            date: draft.meetingDate,
            subject: r.agendaTopic || draft.meetingTitleBn,
            background: r.discussionSummaryBn,
            proposerName: r.proposerName,
            supporterName: r.seconderName,
            resolutionText: r.decisionTextBn,
            assignedMemberId: matchedMember?.id,
            assignedMemberName: matchedMember?.name || r.responsiblePersonName || undefined,
            deadline: r.targetDeadline || undefined,
            financialAmount: Number(r.estimatedBudget) || undefined,
            termId: activeTerm?.id,
            termTitle: activeTerm?.title,
            status: 'APPROVED',
            priority: 'NORMAL',
            implementationStatus: 'PENDING',
            progressPercentage: 0,
          });
        }
      }

      setSaveSuccessMsg('কার্যবিবরণী ও রেজুলেশনসমূহ সফলভাবে সংরক্ষণ করা হয়েছে!');
      if (andPrint) {
        setTimeout(() => {
          handlePrintPreview();
        }, 180);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-siliguri">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                AI দিয়ে কার্যবিবরণী ও রেজুলেশন তৈরি করুন
              </h3>
              <p className="text-xs text-emerald-200/85">
                সংক্ষিপ্ত নোট অথবা হাতে লেখা পুরনো রেজুলেশন খাতার ছবি থেকে প্রমিত বাংলায় প্রিন্ট-রেডি কার্যবিবরণী
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/70">
          {/* Error & Success banners */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {saveSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMsg}</span>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          )}

          {/* STEP 1: INPUT FORM (when draft is not generated yet) */}
          {!draft ? (
            <div className="space-y-4">
              {/* Mode Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('NOTES')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                    mode === 'NOTES'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${mode === 'NOTES' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">১. সংক্ষিপ্ত নোট থেকে তৈরি করুন</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      তারিখ, উপস্থিতি ও বুলেট পয়েন্ট দিলে AI পূর্ণাঙ্গ প্রস্তাবক-সমর্থনকারীসহ রেজুলেশন লিখবে
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('HANDWRITTEN_SCAN')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                    mode === 'HANDWRITTEN_SCAN'
                      ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${mode === 'HANDWRITTEN_SCAN' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">২. হাতের লেখা খাতার ছবি স্ক্যান করুন</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      পুরনো রেজুলেশন খাতার ছবি তুললে AI পড়ে ডিজিটাল সম্পাদনাযোগ্য বাংলায় রূপান্তর করবে
                    </div>
                  </div>
                </button>
              </div>

              {/* Meeting Metadata */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>মিটিংয়ের তারিখ</span>
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>সময়</span>
                  </label>
                  <input
                    type="text"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    placeholder="যেমন: বাদ মাগরিব / রাত ৮:০০টা"
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>স্থান</span>
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">সভার ধরন</label>
                  <select
                    value={meetingTypeBn}
                    onChange={(e) => setMeetingTypeBn(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="কার্যনির্বাহী পরিষদের সাধারণ সভা">কার্যনির্বাহী পরিষদের সাধারণ সভা</option>
                    <option value="মাসিক সাধারণ সভা">মাসিক সাধারণ সভা</option>
                    <option value="জরুরি বিশেষ সভা">জরুরি বিশেষ সভা</option>
                    <option value="বার্ষিক সাধারণ সভা (AGM)">বার্ষিক সাধারণ সভা (AGM)</option>
                    <option value="রমজান ও ঈদ প্রস্তুতি সভা">রমজান ও ঈদ প্রস্তুতি সভা</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">সভাপতিত্বকারী</label>
                  <input
                    type="text"
                    value={chairmanName}
                    onChange={(e) => setChairmanName(e.target.value)}
                    placeholder="সভাপতির নাম"
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">সাধারণ সম্পাদক / সচিব</label>
                  <input
                    type="text"
                    value={secretaryName}
                    onChange={(e) => setSecretaryName(e.target.value)}
                    placeholder="সাধারণ সম্পাদকের নাম"
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {mode === 'NOTES' ? (
                <>
                  {/* Attendees selector */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>উপস্থিত সদস্যবৃন্দ নির্বাচন করুন ({toBnDigits(selectedAttendeeIds.length)} জন নির্বাচিত)</span>
                      </label>
                      {activeMembers.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAttendeeIds(
                              selectedAttendeeIds.length === activeMembers.length
                                ? []
                                : activeMembers.map((m) => m.id)
                            )
                          }
                          className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          {selectedAttendeeIds.length === activeMembers.length ? 'সব বাদ দিন' : 'সবাইকে নির্বাচন করুন'}
                        </button>
                      )}
                    </div>

                    {activeMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {activeMembers.map((m) => {
                          const selected = selectedAttendeeIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleAttendee(m.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                selected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <input
                      type="text"
                      value={customAttendeesText}
                      onChange={(e) => setCustomAttendeesText(e.target.value)}
                      placeholder="অন্যান্য উপস্থিত সদস্য বা আমন্ত্রিত অতিথির নাম (কমা দিয়ে আলাদা করুন, ঐচ্ছিক)"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/70"
                    />
                  </div>

                  {/* Raw Bullet Points Textarea */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      মিটিংয়ে আলোচিত সংক্ষিপ্ত পয়েন্ট বা কাঁচা নোট লিখুন <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      value={rawNotes}
                      onChange={(e) => setRawNotes(e.target.value)}
                      placeholder={`উদাহরণ:\n১. ওয়াকফ দোকানের ভাড়া ১০% বৃদ্ধি করে আগামী মাস থেকে কার্যকর করা\n২. মসজিদের মূল হলের জন্য ৮টি নতুন সিলিং ফ্যান কেনা (বাজেট ৩৫,০০০ টাকা)\n৩. আসন্ন রমজানের ইফতার ও তারাবিহ ব্যবস্থাপনা বাজেট অনুমোদন`}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-500">
                      টিপস: প্রতিটি আলোচ্য বিষয় ১, ২, ৩ আকারে লিখুন — AI প্রতিটি পয়েন্টকে আনুষ্ঠানিক প্রস্তাবক, সমর্থনকারী ও সর্বসম্মত সিদ্ধান্তসহ রেজুলেশনে সাজিয়ে দেবে।
                    </p>
                  </div>
                </>
              ) : (
                /* Handwritten Notebook Scan Upload */
                <div className="bg-white p-5 rounded-xl border-2 border-dashed border-purple-300 space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-xl bg-purple-100 text-purple-700">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          হাতের লেখা পুরনো রেজুলেশন খাতার ছবি আপলোড করুন
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          JPG বা PNG ছবি — পরিষ্কার আলোতে তোলা ছবি দিলে AI নিখুঁত বাংলা টেক্সটে রূপান্তর করবে
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{imagePreviewUrl ? 'অন্য ছবি নির্বাচন করুন' : 'ছবি নির্বাচন করুন'}</span>
                    </button>
                  </div>

                  {imagePreviewUrl && (
                    <div className="border border-purple-200 rounded-xl p-3 bg-purple-50/40 flex flex-col sm:flex-row gap-4 items-start">
                      <img
                        src={imagePreviewUrl}
                        alt="হাতের লেখা খাতার প্রিভিউ"
                        className="w-full sm:w-48 max-h-56 object-contain rounded-lg border border-slate-200 bg-white"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="text-xs font-bold text-purple-900">আপলোডকৃত ফাইল: {imageFileName}</div>
                        <label className="text-xs font-semibold text-slate-700 block">
                          অতিরিক্ত নির্দেশনা (ঐচ্ছিক):
                        </label>
                        <textarea
                          rows={3}
                          value={rawNotes}
                          onChange={(e) => setRawNotes(e.target.value)}
                          placeholder="যেমন: কোনো নির্দিষ্ট নাম বা তারিখ স্পষ্ট করে দিতে চাইলে এখানে লিখুন..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI কার্যবিবরণী প্রস্তুত করছে...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{mode === 'HANDWRITTEN_SCAN' ? 'ছবি পড়ে ডিজিটাল কার্যবিবরণী তৈরি করুন' : 'AI দিয়ে পূর্ণাঙ্গ কার্যবিবরণী তৈরি করুন'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: EDITABLE PREVIEW (NEVER AUTO-SAVES!) */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start space-x-2 text-xs text-amber-900">
                  <Edit3 className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <div>
                    <span className="font-bold">সম্পাদনাযোগ্য প্রিভিউ (অটো-সেভ হয়নি): </span>
                    সাধারণ সম্পাদক/দায়িত্বশীল ব্যক্তি নিচের প্রতিটি অংশ যাচাই ও প্রয়োজনমতো সম্পাদনা করে শেষে{' '}
                    <strong>“সংরক্ষণ ও প্রিন্ট করুন”</strong> বাটনে ক্লিক করুন।
                    {draft.ocrConfidenceNoteBn && (
                      <div className="mt-1 text-purple-800 font-semibold">
                        স্ক্যান নোট: {draft.ocrConfidenceNoteBn}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold flex items-center space-x-1 hover:bg-amber-100 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>পুনরায় তৈরি করুন</span>
                </button>
              </div>

              {/* Editable Header Metadata */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">কার্যবিবরণীর শিরোনাম</label>
                    <input
                      type="text"
                      value={draft.meetingTitleBn}
                      onChange={(e) => setDraft({ ...draft, meetingTitleBn: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg font-tiro"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">তারিখ</label>
                    <input
                      type="date"
                      value={draft.meetingDate}
                      onChange={(e) => setDraft({ ...draft, meetingDate: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">সময় ও স্থান</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={draft.timeBn}
                        onChange={(e) => setDraft({ ...draft, timeBn: e.target.value })}
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={draft.venueBn}
                        onChange={(e) => setDraft({ ...draft, venueBn: e.target.value })}
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">সভাপতি</label>
                    <input
                      type="text"
                      value={draft.chairmanName}
                      onChange={(e) => setDraft({ ...draft, chairmanName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">সাধারণ সম্পাদক</label>
                    <input
                      type="text"
                      value={draft.secretaryName}
                      onChange={(e) => setDraft({ ...draft, secretaryName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">সভার প্রারম্ভিক বিবরণ</label>
                  <textarea
                    rows={2}
                    value={draft.openingRemarksBn}
                    onChange={(e) => setDraft({ ...draft, openingRemarksBn: e.target.value })}
                    className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg font-tiro"
                  />
                </div>
              </div>

              {/* Editable Structured Resolutions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    গৃহীত রেজুলেশন ও সিদ্ধান্তসমূহ ({toBnDigits(draft.resolutions.length)}টি)
                  </h4>
                  <button
                    type="button"
                    onClick={addEmptyResolution}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>সিদ্ধান্ত যোগ করুন</span>
                  </button>
                </div>

                {draft.resolutions.map((resItem, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type="text"
                          value={resItem.decisionNumber}
                          onChange={(e) => updateResolutionField(idx, 'decisionNumber', e.target.value)}
                          className="w-24 px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={resItem.agendaTopic}
                          onChange={(e) => updateResolutionField(idx, 'agendaTopic', e.target.value)}
                          placeholder="আলোচ্য বিষয়"
                          className="flex-1 px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeResolution(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">প্রস্তাবক (Proposer)</label>
                        <input
                          type="text"
                          value={resItem.proposerName}
                          onChange={(e) => updateResolutionField(idx, 'proposerName', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">সমর্থনকারী (Seconder)</label>
                        <input
                          type="text"
                          value={resItem.seconderName}
                          onChange={(e) => updateResolutionField(idx, 'seconderName', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">আলোচনার সারসংক্ষেপ</label>
                      <textarea
                        rows={2}
                        value={resItem.discussionSummaryBn}
                        onChange={(e) => updateResolutionField(idx, 'discussionSummaryBn', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-tiro"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-emerald-800 block mb-1">সর্বসম্মত সিদ্ধান্ত (Resolution)</label>
                      <textarea
                        rows={2}
                        value={resItem.decisionTextBn}
                        onChange={(e) => updateResolutionField(idx, 'decisionTextBn', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium border border-emerald-200 bg-emerald-50/40 rounded-lg font-tiro"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">বাস্তবায়নের দায়িত্ব</label>
                        <input
                          type="text"
                          value={resItem.responsiblePersonName}
                          onChange={(e) => updateResolutionField(idx, 'responsiblePersonName', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">সম্ভাব্য সময়সীমা</label>
                        <input
                          type="date"
                          value={resItem.targetDeadline}
                          onChange={(e) => updateResolutionField(idx, 'targetDeadline', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 block mb-1">আনুমানিক বাজেট (৳)</label>
                        <input
                          type="number"
                          value={resItem.estimatedBudget || 0}
                          onChange={(e) => updateResolutionField(idx, 'estimatedBudget', Number(e.target.value) || 0)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Editable Closing Remarks */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">সভার সমাপনী ও মোনাজাত</label>
                <textarea
                  rows={2}
                  value={draft.closingRemarksBn}
                  onChange={(e) => setDraft({ ...draft, closingRemarksBn: e.target.value })}
                  className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg font-tiro"
                />
              </div>

              {/* Hidden Printable A4 Official Resolution Document */}
              <div className="hidden">
                <div id="ai-meeting-minutes-printable" className="p-6 text-slate-900 font-tiro bg-white">
                  <MosqueOfficialLetterhead
                    mosque={mosque || undefined}
                    reportTitle={draft.meetingTitleBn}
                    reportSubTitle={`${draft.meetingTypeBn} • তারিখ: ${draft.meetingDate} (${draft.dayNameBn}) • সময়: ${draft.timeBn} • স্থান: ${draft.venueBn}`}
                    language="bn"
                  />

                  <div className="mt-4 text-xs leading-relaxed space-y-3">
                    <div className="grid grid-cols-2 gap-2 border border-slate-300 p-2.5 rounded bg-slate-50">
                      <div><strong>সভাপতিত্বকারী:</strong> {draft.chairmanName}</div>
                      <div><strong>সাধারণ সম্পাদক / সচিব:</strong> {draft.secretaryName}</div>
                      <div className="col-span-2">
                        <strong>উপস্থিত সদস্যবৃন্দ:</strong> {draft.attendeeNames.join(' • ')}
                      </div>
                    </div>

                    <p className="text-justify">{draft.openingRemarksBn}</p>

                    <div className="space-y-3 mt-3">
                      <div className="font-bold text-sm border-b border-slate-800 pb-1">
                        আলোচ্যসূচি ও গৃহীত সর্বসম্মত সিদ্ধান্তসমূহ (রেজুলেশন):
                      </div>
                      {draft.resolutions.map((r, i) => (
                        <div key={i} className="border border-slate-300 rounded p-3 space-y-1.5 break-inside-avoid">
                          <div className="font-bold text-slate-900">
                            {r.decisionNumber} — {r.agendaTopic}
                          </div>
                          {r.discussionSummaryBn && (
                            <p className="text-slate-700 text-justify">{r.discussionSummaryBn}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-[11px] text-slate-700 pt-1">
                            <span><strong>প্রস্তাবক:</strong> {r.proposerName}</span>
                            <span><strong>সমর্থনকারী:</strong> {r.seconderName}</span>
                            {r.responsiblePersonName && (
                              <span><strong>দায়িত্বপ্রাপ্ত:</strong> {r.responsiblePersonName}</span>
                            )}
                            {r.targetDeadline && (
                              <span><strong>সময়সীমা:</strong> {r.targetDeadline}</span>
                            )}
                            {r.estimatedBudget > 0 && (
                              <span><strong>অনুমোদিত বাজেট:</strong> ৳ {r.estimatedBudget.toLocaleString('bn-BD')}</span>
                            )}
                          </div>
                          <div className="bg-slate-50 border-l-4 border-slate-800 pl-2.5 py-1.5 font-semibold text-slate-900">
                            সর্বসম্মত সিদ্ধান্ত: {r.decisionTextBn}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-justify pt-2">{draft.closingRemarksBn}</p>

                    <div className="grid grid-cols-2 gap-16 pt-14 text-center text-xs">
                      <div>
                        <div className="border-t border-slate-800 pt-1 font-bold">{draft.secretaryName}</div>
                        <div className="text-[11px] text-slate-600">সাধারণ সম্পাদক / সচিব</div>
                      </div>
                      <div>
                        <div className="border-t border-slate-800 pt-1 font-bold">{draft.chairmanName}</div>
                        <div className="text-[11px] text-slate-600">সভাপতি / সভাপতিত্বকারী</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions when Draft is Ready */}
        {draft && (
          <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintPreview}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>শুধু প্রিন্ট প্রিভিউ (A4)</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveConfirmed(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>সংরক্ষণ করুন</span>
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveConfirmed(true)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                <span>সংরক্ষণ ও প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

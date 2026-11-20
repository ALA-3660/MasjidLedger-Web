import React, { useState } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  Bell,
  ListChecks,
  Save,
  Trash2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { CommitteeMeeting, CommitteeMember, MeetingResolution } from '../../types';
import { api } from '../../lib/api';

interface ExtractedActionItem {
  tempId: string;
  selected: boolean;
  title: string;
  category: string;
  description: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  responsibleMemberId: string;
  responsibleMemberName: string;
  startDate: string;
  dueDate: string;
  estimatedBudget: number;
  remarks: string;
  meetingId?: string;
  meetingNumber?: string;
  resolutionId?: string;
  resolutionNumber?: string;
}

interface AiActionPlanAssistantProps {
  selectedTermId: string;
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  resolutions: MeetingResolution[];
  onPlansCreated: () => Promise<void>;
  isExtractModalOpen: boolean;
  onCloseExtractModal: () => void;
  statusReport: {
    metrics: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
      overdue: number;
      completionRate: number;
    };
    overallStatusBn: string;
    executiveSummaryBn: string;
    keyHighlightsBn: string[];
    riskAlertsBn: string[];
    reminderMessages: Array<{
      planId: string;
      planTitle: string;
      responsibleName: string;
      daysOverdue: number;
      recipientLabelBn: string;
      subjectBn: string;
      messageDraftBn: string;
    }>;
  } | null;
  onCloseStatusReport: () => void;
}

const STANDARD_CATEGORIES = [
  'উন্নয়ন ও সংস্কার',
  'অবকাঠামো ও নির্মাণ',
  'ক্রয় ও সংস্থাপন',
  'ধর্মীয় ও দাওয়াতি কার্যক্রম',
  'আইসিটি ও ডিজিটালাইজেশন',
  'রমজান ও ঈদ ব্যবস্থাপনা',
  'রক্ষণাবেক্ষণ ও পরিচ্ছন্নতা',
  'শিক্ষা ও মক্তব কার্যক্রম',
  'ত্রাণ ও সমাজকল্যাণ',
  'অন্যান্য',
];

const toBnNum = (val: string | number) => {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[+d]);
};

export const AiActionPlanAssistant: React.FC<AiActionPlanAssistantProps> = ({
  selectedTermId,
  members,
  meetings,
  resolutions,
  onPlansCreated,
  isExtractModalOpen,
  onCloseExtractModal,
  statusReport,
  onCloseStatusReport,
}) => {
  // Status Report Reminder Copy/Edit state
  const [editedReminders, setEditedReminders] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string>('');

  // Extract Action Items Modal state
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [selectedResolutionId, setSelectedResolutionId] = useState<string>('');
  const [customMinutesText, setCustomMinutesText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string>('');
  const [sourceSummary, setSourceSummary] = useState<string>('');
  const [extractedItems, setExtractedItems] = useState<ExtractedActionItem[]>([]);
  const [isSavingItems, setIsSavingItems] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const handleCopyReminder = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleExtract = async () => {
    setExtractError('');
    setSaveMessage('');
    if (!selectedMeetingId && !selectedResolutionId && !customMinutesText.trim()) {
      setExtractError('অনুগ্রহ করে একটি মিটিং বা রেজুলেশন নির্বাচন করুন অথবা কার্যবিবরণীর লেখা লিখুন।');
      return;
    }

    setIsExtracting(true);
    try {
      const res = await api.extractCommitteeActionPlansAi({
        meetingId: selectedMeetingId || undefined,
        resolutionId: selectedResolutionId || undefined,
        rawText: customMinutesText.trim() || undefined,
        termId: selectedTermId || undefined,
      });
      setSourceSummary(res.sourceSummaryBn);
      setExtractedItems(res.actionItems.map((item) => ({ ...item, selected: true })));
    } catch (err: any) {
      setExtractError(err?.message || 'কার্যবিবরণী থেকে কর্মপরিকল্পনা বের করতে সমস্যা হয়েছে।');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateExtractedItem = (tempId: string, field: keyof ExtractedActionItem, value: any) => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        if (field === 'responsibleMemberId') {
          const found = members.find((m) => m.id === value);
          return {
            ...item,
            responsibleMemberId: value,
            responsibleMemberName: found?.name || item.responsibleMemberName,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleSaveSelectedPlans = async () => {
    const toSave = extractedItems.filter((i) => i.selected && i.title.trim());
    if (toSave.length === 0) {
      setExtractError('সংরক্ষণের জন্য অন্তত একটি করণীয় কাজ নির্বাচন করুন।');
      return;
    }

    setIsSavingItems(true);
    setExtractError('');
    try {
      const token = localStorage.getItem('token');
      let savedCount = 0;
      for (const item of toSave) {
        const res = await fetch('/api/v1/committee/action-plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            termId: selectedTermId,
            title: item.title.trim(),
            category: item.category,
            description: item.description,
            priority: item.priority,
            responsibleMemberId: item.responsibleMemberId || undefined,
            startDate: item.startDate,
            dueDate: item.dueDate,
            estimatedBudget: Number(item.estimatedBudget) || 0,
            fundingSource: 'মসজিদ সাধারণ তহবিল',
            status: 'TODO',
            progressPercentage: 0,
            remarks: item.remarks || 'AI কার্যবিবরণী বিশ্লেষণ থেকে সংযুক্ত',
            meetingId: item.meetingId,
            meetingNumber: item.meetingNumber,
            resolutionId: item.resolutionId,
            resolutionNumber: item.resolutionNumber,
          }),
        });
        const json = await res.json();
        if (json.success) savedCount++;
      }

      await onPlansCreated();
      setSaveMessage(`সফলভাবে ${toBnNum(savedCount)}টি কর্মপরিকল্পনা সংরক্ষণ করা হয়েছে!`);
      setTimeout(() => {
        setExtractedItems([]);
        setSourceSummary('');
        setSaveMessage('');
        onCloseExtractModal();
      }, 1200);
    } catch (err: any) {
      setExtractError(err?.message || 'কর্মপরিকল্পনা সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setIsSavingItems(false);
    }
  };

  return (
    <>
      {/* 1. AI STATUS REPORT & OVERDUE AUTO-REMINDER PANEL */}
      {statusReport && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-5 space-y-4 font-siliguri">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    AI অগ্রগতি স্ট্যাটাস রিপোর্ট ও অটো-রিমাইন্ডার
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {statusReport.overallStatusBn}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  সম্পন্ন {toBnNum(statusReport.metrics.completed)}টি ({toBnNum(statusReport.metrics.completionRate)}%) •
                  চলমান {toBnNum(statusReport.metrics.inProgress)}টি • বিলম্বিত {toBnNum(statusReport.metrics.overdue)}টি
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseStatusReport}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-tiro bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            {statusReport.executiveSummaryBn}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {statusReport.keyHighlightsBn.length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>অগ্রগতির মূল দিকসমূহ</span>
                </div>
                <ul className="space-y-1 text-xs text-emerald-900 list-disc pl-4">
                  {statusReport.keyHighlightsBn.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {statusReport.riskAlertsBn.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>সতর্কতা ও করণীয়</span>
                </div>
                <ul className="space-y-1 text-xs text-amber-900 list-disc pl-4">
                  {statusReport.riskAlertsBn.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Auto-Reminder Drafts for Overdue Tasks */}
          {statusReport.reminderMessages.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-800">
                <Bell className="w-4 h-4 text-rose-600" />
                <span>
                  বিলম্বিত কাজের অটো-রিমাইন্ডার মেসেজ খসড়া (সভাপতি / সাধারণ সম্পাদকের জন্য — সম্পাদনা করে কপি করুন)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {statusReport.reminderMessages.map((rem) => {
                  const textValue = editedReminders[rem.planId] ?? rem.messageDraftBn;
                  return (
                    <div
                      key={rem.planId}
                      className="bg-rose-50/40 border border-rose-200 rounded-xl p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{rem.planTitle}</div>
                          <div className="text-[11px] text-rose-700 font-semibold">
                            প্রাপক: {rem.recipientLabelBn} • দায়িত্ব: {rem.responsibleName} • {toBnNum(rem.daysOverdue)} দিন বিলম্বিত
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyReminder(rem.planId, textValue)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                        >
                          {copiedId === rem.planId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>মেসেজ কপি</span>
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={textValue}
                        onChange={(e) =>
                          setEditedReminders((prev) => ({ ...prev, [rem.planId]: e.target.value }))
                        }
                        className="w-full text-xs leading-relaxed p-2.5 rounded-lg border border-rose-200/80 bg-white font-tiro text-slate-800"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. EXTRACT ACTION ITEMS FROM MEETING MINUTES MODAL */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-siliguri">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">কার্যবিবরণী থেকে AI কর্মপরিকল্পনা (Action Items) তৈরি</h3>
                  <p className="text-xs text-emerald-200/80">
                    মিটিং রেজুলেশন পড়ে AI স্বয়ংক্রিয়ভাবে করণীয় কাজ, দায়িত্বশীল সদস্য ও সময়সীমা সাজিয়ে দেবে (সংরক্ষণের আগে যাচাই করুন)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseExtractModal}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/70">
              {extractError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{extractError}</span>
                </div>
              )}

              {saveMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveMessage}</span>
                </div>
              )}

              {/* Source Picker */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      সংরক্ষিত মিটিং কার্যবিবরণী নির্বাচন করুন
                    </label>
                    <select
                      value={selectedMeetingId}
                      onChange={(e) => setSelectedMeetingId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">— কোনো মিটিং নির্বাচন করুন (ঐচ্ছিক) —</option>
                      {meetings.map((m) => (
                        <option key={m.id} value={m.id}>
                          মিটিং #{m.meetingNumber} • {m.date} ({m.agenda?.[0] || m.location || 'সাধারণ সভা'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      অথবা নির্দিষ্ট রেজুলেশন নির্বাচন করুন
                    </label>
                    <select
                      value={selectedResolutionId}
                      onChange={(e) => setSelectedResolutionId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">— কোনো রেজুলেশন নির্বাচন করুন (ঐচ্ছিক) —</option>
                      {resolutions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.resolutionNumber} • {r.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>অথবা কার্যবিবরণী / সিদ্ধান্তের লেখা এখানে পেস্ট করুন</span>
                  </label>
                  <textarea
                    rows={3}
                    value={customMinutesText}
                    onChange={(e) => setCustomMinutesText(e.target.value)}
                    placeholder="যেমন: সর্বসম্মতিক্রমে সিদ্ধান্ত হয় যে আগামী ৩০ দিনের মধ্যে অজুখানার টাইলস সংস্কার ও নতুন ১০টি ফ্যান ক্রয় সম্পন্ন করা হবে..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={handleExtract}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI করণীয় কাজ বের করছে...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI দিয়ে করণীয় টাস্ক তৈরি করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editable Extracted Action Items Preview */}
              {extractedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-900">
                    <strong>সম্পাদনাযোগ্য প্রিভিউ:</strong> {sourceSummary} — প্রতিটি কাজের দায়িত্বপ্রাপ্ত সদস্য, বাজেট ও শেষ তারিখ যাচাই করে নিচের{' '}
                    <strong>“নির্বাচিত কর্মপরিকল্পনা সংরক্ষণ করুন”</strong> বাটনে ক্লিক করুন।
                  </div>

                  {extractedItems.map((item) => (
                    <div
                      key={item.tempId}
                      className={`bg-white p-4 rounded-xl border transition-all space-y-3 ${
                        item.selected ? 'border-emerald-300 shadow-2xs' : 'border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => updateExtractedItem(item.tempId, 'selected', e.target.checked)}
                          className="mt-1.5 w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">কাজের শিরোনাম</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateExtractedItem(item.tempId, 'title', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">বিভাগ</label>
                            <select
                              value={item.category}
                              onChange={(e) => updateExtractedItem(item.tempId, 'category', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                            >
                              {STANDARD_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">অগ্রাধিকার</label>
                            <select
                              value={item.priority}
                              onChange={(e) => updateExtractedItem(item.tempId, 'priority', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                            >
                              <option value="URGENT">অতি জরুরি (Urgent)</option>
                              <option value="HIGH">উচ্চ (High)</option>
                              <option value="MEDIUM">মধ্যম (Medium)</option>
                              <option value="NORMAL">সাধারণ (Normal)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">দায়িত্বপ্রাপ্ত সদস্য</label>
                            <select
                              value={item.responsibleMemberId}
                              onChange={(e) => updateExtractedItem(item.tempId, 'responsibleMemberId', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                            >
                              <option value="">— সদস্য নির্বাচন করুন —</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">শুরুর তারিখ</label>
                            <input
                              type="date"
                              value={item.startDate}
                              onChange={(e) => updateExtractedItem(item.tempId, 'startDate', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">শেষ তারিখ (Deadline)</label>
                            <input
                              type="date"
                              value={item.dueDate}
                              onChange={(e) => updateExtractedItem(item.tempId, 'dueDate', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">আনুমানিক বাজেট (৳)</label>
                            <input
                              type="number"
                              value={item.estimatedBudget}
                              onChange={(e) =>
                                updateExtractedItem(item.tempId, 'estimatedBudget', Number(e.target.value) || 0)
                              }
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-4">
                            <label className="text-[11px] font-bold text-slate-600 block mb-0.5">বিস্তারিত বিবরণ</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateExtractedItem(item.tempId, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExtractedItems((prev) => prev.filter((x) => x.tempId !== item.tempId))
                          }
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {extractedItems.length > 0 && (
              <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-slate-600">
                  নির্বাচিত: {toBnNum(extractedItems.filter((i) => i.selected).length)} / {toBnNum(extractedItems.length)} টি কাজ
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCloseExtractModal}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="button"
                    disabled={isSavingItems}
                    onClick={handleSaveSelectedPlans}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {isSavingItems ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>নির্বাচিত কর্মপরিকল্পনা সংরক্ষণ করুন</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

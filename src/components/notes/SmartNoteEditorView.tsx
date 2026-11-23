import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Mic,
  Camera,
  Sparkles,
  Pin,
  Star,
  Archive,
  Trash2,
  RotateCcw,
  History,
  Lock,
  Users,
  Building2,
  Paperclip,
  Printer,
  FileDown,
  BellPlus,
  Send,
  MessageSquare,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudOff,
  RefreshCw,
  Eye,
  Download,
  ChevronDown,
  Tag,
  Clock,
  FileText,
  Check,
} from 'lucide-react';
import { Mosque, User } from '../../types';
import {
  NoteAiAssistAction,
  SMART_NOTE_TYPES,
  SmartNote,
  SmartNoteActivity,
  SmartNoteAiAssistResult,
  SmartNoteAttachment,
  SmartNoteCategory,
  SmartNoteComment,
  SmartNoteOcrResult,
  SmartNotePrivacyMode,
  SmartNoteShareEntry,
  SmartNoteShareRole,
  SmartNoteType,
  SmartNoteVersion,
} from '../../types/smartNotesTypes';
import { api } from '../../lib/api';
import {
  getOfflineNoteDraft,
  removeOfflineNoteDraft,
  saveOfflineNoteDraft,
} from '../../lib/notesOfflineDrafts';
import { exportSmartNoteToDocx, exportSmartNoteToTxt } from '../../lib/notesExport';
import { SmartNoteRichEditor, sanitizeNoteHtmlClient } from './SmartNoteRichEditor';
import { SmartNoteVoiceModal } from './SmartNoteVoiceModal';
import { SmartNoteOcrModal } from './SmartNoteOcrModal';
import { SmartNotePrintModal } from './SmartNotePrintModal';
import { formatFileSizeBn } from '../../lib/fileSecurity';

interface SmartNoteEditorViewProps {
  note: SmartNote | null;
  categories: SmartNoteCategory[];
  mosque?: Mosque | null;
  currentUser?: User | null;
  initialOpenVoice?: boolean;
  initialOpenOcr?: boolean;
  onBack: () => void;
  onNoteSaved: (saved: SmartNote) => void;
  onNoteDeleted: (noteId: string) => void;
  onCategoryCreated: (cat: SmartNoteCategory) => void;
  onConvertToNotice?: (draft: { title: string; bodyHtml: string; plainText: string }) => void;
  onConvertToSms?: (draft: { messageText: string; title: string }) => void;
}

const AI_ASSIST_ACTIONS: Array<{ action: NoteAiAssistAction; labelBn: string; descBn: string }> = [
  { action: 'POLISH', labelBn: '✨ ভাষা মার্জিত করুন', descBn: 'বানান ও বাক্য আরও প্রাঞ্জল করুন' },
  { action: 'OFFICIAL', labelBn: '🏛️ দাপ্তরিক ভাষায় রূপান্তর', descBn: 'অফিসিয়াল নোটিশ বা চিঠির উপযোগী ভাষা' },
  { action: 'SUMMARIZE', labelBn: '📌 সংক্ষিপ্ত করুন', descBn: 'মূল পয়েন্ট ও সংক্ষিপ্ত সারসংক্ষেপ' },
  { action: 'EXPAND', labelBn: '📄 বিস্তারিত করুন', descBn: 'সুশৃঙ্খল অনুচ্ছেদে বিস্তারিত ব্যাখ্যা' },
  { action: 'MINUTES', labelBn: '📜 সভার কার্যবিবরণী তৈরি', descBn: 'আলোচ্য বিষয় ও প্রস্তাবিত সিদ্ধান্ত' },
  { action: 'ACTION_ITEMS', labelBn: '✅ করণীয় কাজ বের করুন', descBn: 'Action Items / চেকলিস্ট তৈরি' },
  { action: 'TRANSLATE_BN_EN', labelBn: '🌐 বাংলা → ইংরেজি অনুবাদ', descBn: 'অফিসিয়াল ইংরেজি অনুবাদ' },
  { action: 'TRANSLATE_EN_BN', labelBn: '🌐 ইংরেজি → বাংলা অনুবাদ', descBn: 'প্রমিত বাংলা অনুবাদ' },
];

export const SmartNoteEditorView: React.FC<SmartNoteEditorViewProps> = ({
  note,
  categories,
  mosque,
  currentUser,
  initialOpenVoice = false,
  initialOpenOcr = false,
  onBack,
  onNoteSaved,
  onNoteDeleted,
  onCategoryCreated,
  onConvertToNotice,
  onConvertToSms,
}) => {
  const tenantId = mosque?.id || currentUser?.mosqueId || 'default';
  const userId = currentUser?.id || 'anon';

  const [currentNote, setCurrentNote] = useState<SmartNote | null>(note);
  const [title, setTitle] = useState(note?.title || '');
  const [contentHtml, setContentHtml] = useState(note?.contentHtml || '<p></p>');
  const [plainText, setPlainText] = useState(note?.plainText || '');
  const [categoryId, setCategoryId] = useState(
    note?.categoryId || categories[9]?.id || categories[0]?.id || ''
  );
  const [noteType, setNoteType] = useState<SmartNoteType>(note?.noteType || 'QUICK_NOTE');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(Boolean(note?.isPinned));
  const [isFavorite, setIsFavorite] = useState(Boolean(note?.isFavorite));

  // Save & Offline sync status
  const [saveState, setSaveState] = useState<'SAVED' | 'SAVING' | 'UNSAVED' | 'OFFLINE_DRAFT' | 'ERROR'>('SAVED');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(note?.updatedAt || null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  // Custom Category inline modal
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');
  const [creatingCat, setCreatingCat] = useState(false);

  // Voice & OCR & Print Modals
  const [showVoiceModal, setShowVoiceModal] = useState(initialOpenVoice);
  const [showOcrModal, setShowOcrModal] = useState(initialOpenOcr);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // AI Writing Assistant dropdown + Preview Modal
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiAssistLoading, setAiAssistLoading] = useState<NoteAiAssistAction | null>(null);
  const [aiPreviewResult, setAiPreviewResult] = useState<SmartNoteAiAssistResult | null>(null);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);
  const aiMenuRef = useRef<HTMLDivElement | null>(null);

  // Version History Modal
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [versions, setVersions] = useState<SmartNoteVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Privacy & Sharing Modal
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<SmartNotePrivacyMode>(note?.privacyMode || 'PRIVATE');
  const [sharedWith, setSharedWith] = useState<SmartNoteShareEntry[]>(note?.sharedWith || []);
  const [shareCandidates, setShareCandidates] = useState<Array<{ id: string; name: string; role: string; phone: string }>>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedCandidateRole, setSelectedCandidateRole] = useState<SmartNoteShareRole>('VIEWER');
  const [savingShare, setSavingShare] = useState(false);

  // Comments & Activity Drawer
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [comments, setComments] = useState<SmartNoteComment[]>([]);
  const [activities, setActivities] = useState<SmartNoteActivity[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Reminder Modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remDueDate, setRemDueDate] = useState('');
  const [remPriority, setRemPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [savingRem, setSavingRem] = useState(false);

  // Conversion Confirmation Modal (Notice / SMS)
  const [confirmConversion, setConfirmConversion] = useState<'NOTICE' | 'SMS' | null>(null);

  // Attachments
  const [uploadingAtt, setUploadingAtt] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{ att: SmartNoteAttachment; blobUrl: string } | null>(null);
  const attFileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3200);
  };

  const canEdit = currentNote ? currentNote.canEdit !== false : true;
  const canDelete = currentNote ? currentNote.canDelete !== false : true;
  const canShare = currentNote ? currentNote.canShare !== false : true;

  // Recover offline draft if newer than server note
  useEffect(() => {
    const offline = getOfflineNoteDraft(tenantId, userId, note?.id || 'new');
    if (offline) {
      const serverUpdated = note?.updatedAt ? new Date(note.updatedAt).getTime() : 0;
      const draftUpdated = new Date(offline.updatedAt).getTime();
      if (draftUpdated > serverUpdated) {
        setTitle(offline.title);
        setContentHtml(offline.contentHtml);
        setCategoryId(offline.categoryId || categoryId);
        setNoteType(offline.noteType || 'QUICK_NOTE');
        setTags(offline.tags || []);
        setSaveState('OFFLINE_DRAFT');
        isDirtyRef.current = true;
      }
    }
  }, [note?.id]);

  // Close AI dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setShowAiMenu(false);
      }
    };
    if (showAiMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAiMenu]);

  const performSave = useCallback(
    async (opts?: {
      createSnapshot?: boolean;
      changeSummary?: string;
      overrideTitle?: string;
      overrideHtml?: string;
      overridePlain?: string;
      overrideCategoryId?: string;
      overrideNoteType?: SmartNoteType;
      overridePinned?: boolean;
      overrideFavorite?: boolean;
      overrideTags?: string[];
      aiAssisted?: boolean;
      silent?: boolean;
    }): Promise<SmartNote | null> => {
      if (!canEdit) return currentNote;
      const finalTitle = (opts?.overrideTitle ?? title).trim() || 'শিরোনামহীন খসড়া নোট';
      const finalHtml = opts?.overrideHtml ?? contentHtml;
      const finalPlain = opts?.overridePlain ?? plainText;
      const finalCatId = opts?.overrideCategoryId ?? categoryId;
      const finalType = opts?.overrideNoteType ?? noteType;
      const finalTags = opts?.overrideTags ?? tags;
      const finalPinned = opts?.overridePinned ?? isPinned;
      const finalFavorite = opts?.overrideFavorite ?? isFavorite;

      // Skip auto-saving a completely blank unsaved note
      if (!currentNote && !finalPlain.trim() && finalTitle === 'শিরোনামহীন খসড়া নোট') {
        return null;
      }

      // Check offline first
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        saveOfflineNoteDraft({
          noteId: currentNote?.id || 'new',
          tenantId,
          userId,
          title: finalTitle,
          contentHtml: finalHtml,
          categoryId: finalCatId,
          noteType: finalType,
          tags: finalTags,
          isPinned: finalPinned,
          isFavorite: finalFavorite,
          syncStatus: 'PENDING_SYNC',
        });
        setSaveState('OFFLINE_DRAFT');
        setSaveErrorMsg('ইন্টারনেট সংযোগ নেই — নোটটি লোকাল ড্রাফটে সংরক্ষিত হয়েছে। নেট ফিরলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।');
        return null;
      }

      setSaveState('SAVING');
      setSaveErrorMsg(null);
      try {
        let saved: SmartNote;
        if (currentNote) {
          saved = await api.updateSmartNote(currentNote.id, {
            title: finalTitle,
            contentHtml: finalHtml,
            categoryId: finalCatId,
            noteType: finalType,
            tags: finalTags,
            isPinned: finalPinned,
            isFavorite: finalFavorite,
            aiAssisted: opts?.aiAssisted ?? currentNote.aiAssisted,
            createSnapshot: opts?.createSnapshot,
            changeSummary: opts?.changeSummary,
          });
        } else {
          saved = await api.createSmartNote({
            title: finalTitle,
            contentHtml: finalHtml,
            categoryId: finalCatId,
            noteType: finalType,
            tags: finalTags,
            privacyMode,
            sharedWith,
            isPinned: finalPinned,
            isFavorite: finalFavorite,
            aiAssisted: Boolean(opts?.aiAssisted),
            sourceChannel: initialOpenVoice ? 'VOICE' : initialOpenOcr ? 'OCR' : 'WEB',
          });
        }

        removeOfflineNoteDraft(tenantId, userId, currentNote?.id || 'new');
        removeOfflineNoteDraft(tenantId, userId, saved.id);
        setCurrentNote(saved);
        setPrivacyMode(saved.privacyMode);
        setSharedWith(saved.sharedWith || []);
        setLastSavedAt(saved.updatedAt);
        setSaveState('SAVED');
        isDirtyRef.current = false;
        onNoteSaved(saved);
        if (!opts?.silent && opts?.createSnapshot) {
          showToast('success', 'নোট সফলভাবে সংরক্ষিত হয়েছে।');
        }
        return saved;
      } catch (err: any) {
        saveOfflineNoteDraft({
          noteId: currentNote?.id || 'new',
          tenantId,
          userId,
          title: finalTitle,
          contentHtml: finalHtml,
          categoryId: finalCatId,
          noteType: finalType,
          tags: finalTags,
          isPinned: finalPinned,
          isFavorite: finalFavorite,
          syncStatus: 'SYNC_FAILED',
          lastError: err?.message,
        });
        setSaveState('ERROR');
        setSaveErrorMsg(err?.message || 'সার্ভারে সংরক্ষণ ব্যর্থ হয়েছে। লোকাল ড্রাফট নিরাপদ আছে।');
        return null;
      }
    },
    [
      canEdit,
      currentNote,
      title,
      contentHtml,
      plainText,
      categoryId,
      noteType,
      tags,
      isPinned,
      isFavorite,
      privacyMode,
      sharedWith,
      tenantId,
      userId,
      initialOpenVoice,
      initialOpenOcr,
      onNoteSaved,
    ]
  );

  // Schedule auto-save when content changes
  const scheduleAutoSave = useCallback(() => {
    if (!canEdit) return;
    isDirtyRef.current = true;
    setSaveState((prev) => (prev === 'OFFLINE_DRAFT' ? 'OFFLINE_DRAFT' : 'UNSAVED'));
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      performSave({ silent: true });
    }, 1800);
  }, [canEdit, performSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Auto-sync when browser reconnects online
  useEffect(() => {
    const handleOnline = () => {
      if (saveState === 'OFFLINE_DRAFT' || saveState === 'ERROR' || isDirtyRef.current) {
        performSave({ silent: false, createSnapshot: true, changeSummary: 'অফলাইন ড্রাফট সিঙ্ক' });
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [saveState, performSave]);

  const handleAddTag = () => {
    const cleaned = tagInput.trim().replace(/^#/, '');
    if (!cleaned || tags.includes(cleaned)) {
      setTagInput('');
      return;
    }
    const next = [...tags, cleaned].slice(0, 15);
    setTags(next);
    setTagInput('');
    scheduleAutoSave();
  };

  const handleCreateCustomCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const created = await api.createSmartNoteCategory({
        nameBn: newCatName.trim(),
        icon: newCatIcon || '🏷️',
      });
      onCategoryCreated(created);
      setCategoryId(created.id);
      setNewCatName('');
      setShowAddCategory(false);
      showToast('success', `নতুন ক্যাটাগরি "${created.nameBn}" যুক্ত হয়েছে।`);
      scheduleAutoSave();
    } catch (err: any) {
      showToast('error', err?.message || 'ক্যাটাগরি তৈরি করা যায়নি।');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleVoiceAccept = (text: string, aiFormatted: boolean) => {
    const paragraphsHtml = text
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    const nextHtml = plainText.trim() ? `${contentHtml}${paragraphsHtml}` : paragraphsHtml;
    const nextPlain = plainText.trim() ? `${plainText}\n\n${text}` : text;
    setContentHtml(nextHtml);
    setPlainText(nextPlain);
    performSave({
      overrideHtml: nextHtml,
      overridePlain: nextPlain,
      aiAssisted: aiFormatted || currentNote?.aiAssisted,
      createSnapshot: true,
      changeSummary: aiFormatted ? 'ভয়েস টাইপিং + AI দাঁড়ি-কমা যুক্ত' : 'ভয়েস টাইপিং যুক্ত',
    });
  };

  const handleOcrApply = async (payload: {
    result: SmartNoteOcrResult;
    editedHtml: string;
    editedText: string;
    editedTitle: string;
    attachScannedFiles?: File[];
  }) => {
    const matchedCat = categories.find(
      (c) => c.nameBn.trim() === payload.result.suggestedCategoryNameBn.trim()
    );
    const nextCatId = matchedCat?.id || categoryId;
    const nextTitle = title.trim() ? title : payload.editedTitle;
    const nextHtml = plainText.trim()
      ? `${contentHtml}<hr/>${payload.editedHtml}`
      : payload.editedHtml;
    const nextPlain = plainText.trim()
      ? `${plainText}\n\n${payload.editedText}`
      : payload.editedText;

    setTitle(nextTitle);
    setContentHtml(nextHtml);
    setPlainText(nextPlain);
    setCategoryId(nextCatId);
    if (payload.result.suggestedNoteType) {
      setNoteType(payload.result.suggestedNoteType);
    }

    const saved = await performSave({
      overrideTitle: nextTitle,
      overrideHtml: nextHtml,
      overridePlain: nextPlain,
      overrideCategoryId: nextCatId,
      overrideNoteType: payload.result.suggestedNoteType || noteType,
      aiAssisted: true,
      createSnapshot: true,
      changeSummary: 'ক্যামেরা OCR স্ক্যান থেকে লেখা যুক্ত',
    });

    if (saved && payload.attachScannedFiles && payload.attachScannedFiles.length > 0) {
      try {
        setUploadingAtt(true);
        const upRes = await api.uploadSmartNoteAttachments(saved.id, payload.attachScannedFiles);
        setCurrentNote(upRes.note);
        onNoteSaved(upRes.note);
        showToast('success', 'OCR লেখা ও স্ক্যান করা ছবি উভয়ই সংরক্ষিত হয়েছে।');
      } catch (err: any) {
        showToast('error', err?.message || 'স্ক্যান ছবি অ্যাটাচ করতে ব্যর্থ হয়েছে।');
      } finally {
        setUploadingAtt(false);
      }
    }
  };

  const handleRunAiAssist = async (action: NoteAiAssistAction) => {
    setShowAiMenu(false);
    if (!plainText.trim()) {
      showToast('error', 'AI সহকারী ব্যবহারের জন্য আগে নোটে কিছু লিখুন।');
      return;
    }
    setAiErrorMsg(null);
    setAiAssistLoading(action);
    try {
      const res = await api.assistSmartNoteAi({
        action,
        title,
        plainText,
      });
      setAiPreviewResult(res);
    } catch (err: any) {
      setAiErrorMsg(err?.message || 'AI সহায়তা পাওয়া যায়নি।');
      showToast('error', err?.message || 'AI সহায়তা পাওয়া যায়নি।');
    } finally {
      setAiAssistLoading(null);
    }
  };

  const applyAiPreview = (mode: 'REPLACE' | 'APPEND') => {
    if (!aiPreviewResult) return;
    const sanitized = sanitizeNoteHtmlClient(aiPreviewResult.resultHtml);
    const nextHtml = mode === 'REPLACE' ? sanitized : `${contentHtml}<hr/>${sanitized}`;
    const nextPlain =
      mode === 'REPLACE' ? aiPreviewResult.resultText : `${plainText}\n\n${aiPreviewResult.resultText}`;
    setContentHtml(nextHtml);
    setPlainText(nextPlain);
    setAiPreviewResult(null);
    performSave({
      overrideHtml: nextHtml,
      overridePlain: nextPlain,
      aiAssisted: true,
      createSnapshot: true,
      changeSummary: `AI সহকারী প্রয়োগ (${aiPreviewResult.action})`,
    });
    showToast('success', 'AI পরামর্শ নোটে প্রয়োগ করা হয়েছে।');
  };

  const handleUploadAttachments = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setAttError(null);
    let targetNote = currentNote;
    if (!targetNote) {
      targetNote = await performSave({ createSnapshot: true, silent: true });
    }
    if (!targetNote) {
      setAttError('ফাইল যুক্ত করার আগে নোটটি সংরক্ষণ হওয়া আবশ্যক।');
      return;
    }
    setUploadingAtt(true);
    try {
      const res = await api.uploadSmartNoteAttachments(targetNote.id, Array.from(fileList));
      setCurrentNote(res.note);
      onNoteSaved(res.note);
      showToast('success', `${res.attachments.length}টি ফাইল সফলভাবে সংযুক্ত হয়েছে।`);
    } catch (err: any) {
      setAttError(err?.message || 'ফাইল আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setUploadingAtt(false);
    }
  };

  const handleOpenAttachmentPreview = async (att: SmartNoteAttachment) => {
    try {
      const blobUrl = await api.fetchSmartNoteAttachmentBlobUrl(att.downloadUrl);
      setPreviewAttachment({ att, blobUrl });
    } catch (err: any) {
      showToast('error', err?.message || 'ফাইল প্রিভিউ লোড করা যায়নি।');
    }
  };

  const handleDownloadAttachment = async (att: SmartNoteAttachment) => {
    try {
      const blobUrl = await api.fetchSmartNoteAttachmentBlobUrl(`${att.downloadUrl}?download=true`);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = att.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err: any) {
      showToast('error', err?.message || 'ফাইল ডাউনলোড করা যায়নি।');
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!currentNote) return;
    try {
      const updated = await api.deleteSmartNoteAttachment(currentNote.id, attId);
      setCurrentNote(updated);
      onNoteSaved(updated);
      showToast('success', 'সংযুক্ত ফাইল মুছে ফেলা হয়েছে।');
    } catch (err: any) {
      showToast('error', err?.message || 'ফাইল মুছে ফেলা যায়নি।');
    }
  };

  const openVersions = async () => {
    if (!currentNote) {
      showToast('error', 'সংস্করণ ইতিহাস দেখতে নোটটি আগে সংরক্ষণ করুন।');
      return;
    }
    setShowVersionsModal(true);
    setLoadingVersions(true);
    try {
      const list = await api.getSmartNoteVersions(currentNote.id);
      setVersions(list);
    } catch (err: any) {
      showToast('error', err?.message || 'সংস্করণ লোড করা যায়নি।');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (ver: SmartNoteVersion) => {
    if (!currentNote) return;
    try {
      const restored = await api.restoreSmartNoteVersion(currentNote.id, ver.id);
      setCurrentNote(restored);
      setTitle(restored.title);
      setContentHtml(restored.contentHtml);
      setPlainText(restored.plainText);
      setCategoryId(restored.categoryId);
      setNoteType(restored.noteType);
      setLastSavedAt(restored.updatedAt);
      onNoteSaved(restored);
      setShowVersionsModal(false);
      showToast('success', `সংস্করণ #${ver.versionNumber} পুনরুদ্ধার করা হয়েছে।`);
    } catch (err: any) {
      showToast('error', err?.message || 'পুনরুদ্ধার ব্যর্থ হয়েছে।');
    }
  };

  const openSharing = async () => {
    let target = currentNote;
    if (!target) {
      target = await performSave({ createSnapshot: true, silent: true });
    }
    if (!target) return;
    setPrivacyMode(target.privacyMode);
    setSharedWith(target.sharedWith || []);
    setShowSharingModal(true);
    try {
      const users = await api.getSmartNoteShareCandidates();
      setShareCandidates(users);
    } catch {
      // ignore
    }
  };

  const handleSaveSharing = async () => {
    if (!currentNote) return;
    setSavingShare(true);
    try {
      const updated = await api.updateSmartNoteSharing(currentNote.id, {
        privacyMode,
        sharedWith: privacyMode === 'PRIVATE' ? [] : sharedWith,
      });
      setCurrentNote(updated);
      onNoteSaved(updated);
      setShowSharingModal(false);
      showToast('success', 'প্রাইভেসি ও শেয়ারিং সেটিংস সংরক্ষিত হয়েছে।');
    } catch (err: any) {
      showToast('error', err?.message || 'শেয়ারিং আপডেট ব্যর্থ হয়েছে।');
    } finally {
      setSavingShare(false);
    }
  };

  const openActivityAndComments = async () => {
    if (!currentNote) return;
    setShowActivityPanel(true);
    try {
      const data = await api.getSmartNoteCommentsAndActivities(currentNote.id);
      setComments(data.comments || []);
      setActivities(data.activities || []);
    } catch {
      // ignore
    }
  };

  const handlePostComment = async () => {
    if (!currentNote || !newCommentText.trim()) return;
    setPostingComment(true);
    try {
      const added = await api.addSmartNoteComment(currentNote.id, newCommentText.trim());
      setComments((prev) => [...prev, added]);
      setNewCommentText('');
      const refreshed = await api.getSmartNoteCommentsAndActivities(currentNote.id);
      setActivities(refreshed.activities || []);
    } catch (err: any) {
      showToast('error', err?.message || 'মন্তব্য যোগ করা যায়নি।');
    } finally {
      setPostingComment(false);
    }
  };

  const handleCreateReminder = async () => {
    let target = currentNote;
    if (!target) {
      target = await performSave({ createSnapshot: true, silent: true });
    }
    if (!target) return;
    setSavingRem(true);
    try {
      await api.createSmartNoteReminder(target.id, {
        title: remTitle.trim() || target.title,
        dueDate: remDueDate || undefined,
        priority: remPriority,
      });
      setShowReminderModal(false);
      setRemTitle('');
      setRemDueDate('');
      showToast('success', 'কাজ ও অনুস্মারক সফলভাবে যুক্ত হয়েছে।');
    } catch (err: any) {
      showToast('error', err?.message || 'অনুস্মারক তৈরি করা যায়নি।');
    } finally {
      setSavingRem(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!currentNote) return;
    const nextStatus = currentNote.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    try {
      const updated = await api.updateSmartNote(currentNote.id, { status: nextStatus });
      setCurrentNote(updated);
      onNoteSaved(updated);
      showToast('success', nextStatus === 'ARCHIVED' ? 'নোট আর্কাইভে সরানো হয়েছে।' : 'নোট পুনরায় সক্রিয় করা হয়েছে।');
    } catch (err: any) {
      showToast('error', err?.message || 'স্ট্যাটাস পরিবর্তন করা যায়নি।');
    }
  };

  const handleTrashOrRestore = async () => {
    if (!currentNote) return;
    try {
      if (currentNote.status === 'TRASHED') {
        const restored = await api.updateSmartNote(currentNote.id, { status: 'ACTIVE' });
        setCurrentNote(restored);
        onNoteSaved(restored);
        showToast('success', 'নোট ট্র্যাশ থেকে পুনরুদ্ধার করা হয়েছে।');
      } else {
        await api.deleteSmartNote(currentNote.id, false);
        onNoteDeleted(currentNote.id);
        onBack();
      }
    } catch (err: any) {
      showToast('error', err?.message || 'প্রক্রিয়াটি সম্পন্ন করা যায়নি।');
    }
  };

  const activeCategory = categories.find((c) => c.id === categoryId) || categories[0];

  return (
    <div className="space-y-4 font-siliguri">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[80] px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-700 text-white border-rose-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Sticky Action Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={async () => {
              if (isDirtyRef.current && canEdit) {
                await performSave({ silent: true });
              }
              onBack();
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>তালিকায় ফিরুন</span>
          </button>

          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveState === 'SAVING' && (
              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> সংরক্ষণ হচ্ছে...
              </span>
            )}
            {saveState === 'SAVED' && (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> সংরক্ষিত
                {lastSavedAt && (
                  <span className="text-[10px] font-baloo text-emerald-600 ml-1 hidden sm:inline">
                    ({new Date(lastSavedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </span>
            )}
            {saveState === 'UNSAVED' && (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-bold">
                <Clock className="w-3.5 h-3.5" /> অটো-সেভ অপেক্ষমাণ...
              </span>
            )}
            {saveState === 'OFFLINE_DRAFT' && (
              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg font-bold">
                <CloudOff className="w-3.5 h-3.5" /> অফলাইন ড্রাফট সংরক্ষিত
              </span>
            )}
            {saveState === 'ERROR' && (
              <button
                type="button"
                onClick={() => performSave({ createSnapshot: true })}
                className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> সেভ ব্যর্থ — Retry
              </button>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => {
                  const next = !isPinned;
                  setIsPinned(next);
                  performSave({ overridePinned: next, silent: true });
                }}
                title={isPinned ? 'আনপিন করুন' : 'পিন করুন'}
                className={`p-2 rounded-xl border text-xs cursor-pointer ${
                  isPinned ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !isFavorite;
                  setIsFavorite(next);
                  performSave({ overrideFavorite: next, silent: true });
                }}
                title={isFavorite ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয় (Favourite) করুন'}
                className={`p-2 rounded-xl border text-xs cursor-pointer ${
                  isFavorite ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
              </button>
            </>
          )}

          {canShare && (
            <button
              type="button"
              onClick={openSharing}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {privacyMode === 'PRIVATE' ? (
                <Lock className="w-3.5 h-3.5 text-slate-600" />
              ) : privacyMode === 'COMMITTEE_SHARED' ? (
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Users className="w-3.5 h-3.5 text-blue-700" />
              )}
              <span className="hidden sm:inline">
                {privacyMode === 'PRIVATE'
                  ? 'ব্যক্তিগত'
                  : privacyMode === 'COMMITTEE_SHARED'
                  ? 'কমিটি শেয়ার্ড'
                  : `শেয়ার্ড (${sharedWith.length})`}
              </span>
            </button>
          )}

          {currentNote && (
            <>
              <button
                type="button"
                onClick={openVersions}
                title="পূর্বের সংস্করণ ইতিহাস (Version History)"
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={openActivityAndComments}
                title="মন্তব্য ও অ্যাক্টিভিটি হিস্ট্রি"
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                title="প্রিন্ট / PDF / DOCX / TXT এক্সপোর্ট"
                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden md:inline">প্রিন্ট / এক্সপোর্ট</span>
              </button>
            </>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => performSave({ createSnapshot: true, changeSummary: 'ম্যানুয়াল সংরক্ষণ' })}
              className="px-4 py-2 bg-gradient-to-r from-[#064e3b] to-[#0f766e] hover:from-[#065f46] hover:to-[#0d9488] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>সংরক্ষণ</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Error Alert */}
      {saveErrorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => performSave({ createSnapshot: true })}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
          >
            আবার চেষ্টা করুন (Retry)
          </button>
        </div>
      )}

      {/* TOP PROMINENT LARGE COLOR-CODED CATEGORY SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">১. নোটের ক্যাটাগরি নির্বাচন করুন (Color-Coded):</span>
            {activeCategory && (
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: activeCategory.colorHex }}
              >
                {activeCategory.icon} {activeCategory.nameBn}
              </span>
            )}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>কাস্টম ক্যাটাগরি</span>
            </button>
          )}
        </div>

        {/* Inline Custom Category Creator */}
        {showAddCategory && (
          <div className="flex flex-wrap items-center gap-2 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
            <input
              type="text"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="w-12 px-2 py-1.5 rounded-lg border border-emerald-300 bg-white text-center text-sm"
              maxLength={4}
              title="আইকন ইমোজি"
            />
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="নতুন ক্যাটাগরির বাংলা নাম লিখুন (যেমন: রমজান প্রস্তুতি)..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs outline-none"
            />
            <button
              type="button"
              disabled={creatingCat || !newCatName.trim()}
              onClick={handleCreateCustomCategory}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              {creatingCat ? 'যোগ হচ্ছে...' : 'যুক্ত করুন'}
            </button>
          </div>
        )}

        {/* Large Color-Coded Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
          {categories.map((cat) => {
            const selected = cat.id === categoryId;
            return (
              <button
                key={cat.id}
                type="button"
                disabled={!canEdit}
                onClick={() => {
                  setCategoryId(cat.id);
                  scheduleAutoSave();
                }}
                style={
                  selected
                    ? {
                        borderColor: cat.colorHex,
                        backgroundColor: `${cat.colorHex}18`,
                      }
                    : undefined
                }
                className={`px-3 py-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 cursor-pointer ${
                  selected
                    ? 'shadow-sm ring-2 ring-emerald-500/15 font-bold'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className="text-base shrink-0">{cat.icon}</span>
                <span className="text-xs leading-tight line-clamp-2 text-slate-900">{cat.nameBn}</span>
                {selected && <Check className="w-3.5 h-3.5 ml-auto shrink-0 text-emerald-700" />}
              </button>
            );
          })}
        </div>

        {/* Separate Note Type Selector */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 mb-2">২. নোটের ধরন (Note Type):</div>
          <div className="flex flex-wrap gap-1.5">
            {SMART_NOTE_TYPES.map((nt) => {
              const active = noteType === nt.value;
              return (
                <button
                  key={nt.value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    setNoteType(nt.value);
                    scheduleAutoSave();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {nt.labelBn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN EDITOR CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Title Input (Hind Siliguri) */}
        <div>
          <input
            type="text"
            disabled={!canEdit}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleAutoSave();
            }}
            placeholder="নোটের স্পষ্ট শিরোনাম লিখুন (যেমন: আগামী শুক্রবারের পরিচালনা কমিটির সভার আলোচ্যসূচি)..."
            className="w-full text-lg sm:text-xl font-bold font-siliguri text-emerald-950 placeholder:text-slate-400 border-b-2 border-slate-200 focus:border-emerald-600 pb-2.5 outline-none bg-transparent"
          />
        </div>

        {/* Smart AI & Capture Action Strip: Voice Typing, Camera OCR, AI Writing Assistant */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-slate-50 border border-emerald-200/80 rounded-2xl p-2.5">
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>🎙️ ভয়েস টাইপিং</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOcrModal(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>📷 কাগজ স্ক্যান / OCR</span>
            </button>

            {/* AI Assistant Dropdown */}
            <div ref={aiMenuRef} className="relative">
              <button
                type="button"
                disabled={Boolean(aiAssistLoading)}
                onClick={() => setShowAiMenu((p) => !p)}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                {aiAssistLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI কাজ করছে...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>✨ AI সহকারী</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {showAiMenu && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 space-y-1">
                  <div className="px-2.5 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-500">
                    AI রাইটিং অ্যাসিস্ট্যান্ট (প্রিভিউ দেখে প্রয়োগ করুন)
                  </div>
                  {AI_ASSIST_ACTIONS.map((item) => (
                    <button
                      key={item.action}
                      type="button"
                      onClick={() => handleRunAiAssist(item.action)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-bold text-slate-900">{item.labelBn}</div>
                      <div className="text-[11px] text-slate-500 font-tiro">{item.descBn}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 text-[11px] font-baloo text-slate-500">
              <span>শব্দ: {(plainText.trim() ? plainText.trim().split(/\s+/).length : 0).toLocaleString('bn-BD')}</span>
              <span>•</span>
              <span>অক্ষর: {plainText.length.toLocaleString('bn-BD')}</span>
            </div>
          </div>
        )}

        {aiErrorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between">
            <span>{aiErrorMsg}</span>
            <button type="button" onClick={() => setAiErrorMsg(null)} className="p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Rich Text Editor */}
        <SmartNoteRichEditor
          value={contentHtml}
          readOnly={!canEdit}
          onChange={(html, plain) => {
            setContentHtml(html);
            setPlainText(plain);
            scheduleAutoSave();
          }}
        />

        {/* Tags Input Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-emerald-700" /> ট্যাগ:
          </span>
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-bold"
            >
              #{t}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setTags((prev) => prev.filter((x) => x !== t));
                    scheduleAutoSave();
                  }}
                  className="hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {canEdit && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="ট্যাগ লিখে Enter চাপুন..."
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 w-44"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                + যোগ
              </button>
            </div>
          )}
        </div>

        {/* Attachments Section (Disk storage via Multer — JPG, PNG, WebP, PDF, DOCX, TXT) */}
        <div className="border-t border-slate-100 pt-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-emerald-700" />
              <span>সংযুক্ত ফাইল ও ছবি ({(currentNote?.attachments || []).length.toLocaleString('bn-BD')})</span>
              <span className="text-[11px] font-normal text-slate-500">(JPG, PNG, PDF, DOCX, TXT • সর্বোচ্চ ১০MB)</span>
            </div>
            {canEdit && (
              <>
                <button
                  type="button"
                  disabled={uploadingAtt}
                  onClick={() => attFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {uploadingAtt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{uploadingAtt ? 'আপলোড হচ্ছে...' : 'ফাইল / ছবি যুক্ত করুন'}</span>
                </button>
                <input
                  ref={attFileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadAttachments(e.target.files);
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>

          {attError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{attError}</div>
          )}

          {(currentNote?.attachments || []).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(currentNote?.attachments || []).map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{att.originalName}</div>
                      <div className="text-[10px] text-slate-500 font-baloo">{formatFileSizeBn(att.sizeBytes)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf') && (
                      <button
                        type="button"
                        onClick={() => handleOpenAttachmentPreview(att)}
                        title="প্রিভিউ দেখুন"
                        className="p-1.5 text-slate-600 hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(att)}
                      title="ডাউনলোড করুন"
                      className="p-1.5 text-emerald-700 hover:bg-white rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        title="মুছে ফেলুন"
                        className="p-1.5 text-rose-600 hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Quick Conversion & Lifecycle Action Bar */}
        <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRemTitle(title || 'নোট অনুস্মারক');
                setShowReminderModal(true);
              }}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <BellPlus className="w-3.5 h-3.5" />
              <span>টাস্ক / রিমাইন্ডার</span>
            </button>

            {onConvertToNotice && (
              <button
                type="button"
                onClick={() => setConfirmConversion('NOTICE')}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>নোটিশ ড্রাফটে পাঠান</span>
              </button>
            )}

            {onConvertToSms && (
              <button
                type="button"
                onClick={() => setConfirmConversion('SMS')}
                className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>এসএমএস ড্রাফটে পাঠান</span>
              </button>
            )}

            {currentNote && (
              <>
                <button
                  type="button"
                  onClick={() => exportSmartNoteToDocx({ ...currentNote, title, contentHtml, plainText }, mosque)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>DOCX</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportSmartNoteToTxt({ ...currentNote, title, contentHtml, plainText }, mosque)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-600" />
                  <span>TXT</span>
                </button>
              </>
            )}
          </div>

          {currentNote && canDelete && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleArchiveToggle}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{currentNote.status === 'ARCHIVED' ? 'আর্কাইভ থেকে ফেরান' : 'আর্কাইভ'}</span>
              </button>
              <button
                type="button"
                onClick={handleTrashOrRestore}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  currentNote.status === 'TRASHED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                {currentNote.status === 'TRASHED' ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{currentNote.status === 'TRASHED' ? 'পুনরুদ্ধার করুন' : 'ট্র্যাশে পাঠান'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}

      {/* 1. Voice Typing Modal */}
      <SmartNoteVoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onAcceptText={handleVoiceAccept}
      />

      {/* 2. Camera Scanner & OCR Modal */}
      <SmartNoteOcrModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onApplyOcrResult={handleOcrApply}
      />

      {/* 3. Print / PDF / DOCX / TXT Modal */}
      {showPrintModal && currentNote && (
        <SmartNotePrintModal
          note={{ ...currentNote, title, contentHtml, plainText, tags }}
          mosque={mosque}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* 4. AI Writing Assistant Preview Modal (Never overwrites automatically) */}
      {aiPreviewResult && (
        <div className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <div>
                  <h4 className="text-sm font-bold">AI সহকারী প্রিভিউ — যাচাই করে প্রয়োগ করুন</h4>
                  <p className="text-[11px] text-blue-100 font-baloo">মডেল: {aiPreviewResult.modelUsed}</p>
                </div>
              </div>
              <button type="button" onClick={() => setAiPreviewResult(null)} className="p-1.5 hover:bg-white/15 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div
                className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl font-tiro text-sm leading-relaxed text-slate-900 [&_h3]:font-siliguri [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeNoteHtmlClient(aiPreviewResult.resultHtml) }}
              />
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAiPreviewResult(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => applyAiPreview('APPEND')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                মূল লেখার নিচে যুক্ত করুন
              </button>
              <button
                type="button"
                onClick={() => applyAiPreview('REPLACE')}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ✅ প্রয়োগ করুন (প্রতিস্থাপন)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Privacy & Sharing Modal */}
      {showSharingModal && (
        <div className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4" /> প্রাইভেসি ও শেয়ারিং সেটিংস
              </h4>
              <button type="button" onClick={() => setShowSharingModal(false)} className="p-1 hover:bg-white/15 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {(
                  [
                    {
                      mode: 'PRIVATE' as SmartNotePrivacyMode,
                      title: '🔒 ব্যক্তিগত (Private)',
                      desc: 'শুধুমাত্র আপনি (মালিক) এই নোটটি দেখতে ও সম্পাদনা করতে পারবেন।',
                    },
                    {
                      mode: 'SHARED_SELECTED' as SmartNotePrivacyMode,
                      title: '👥 নির্বাচিত শেয়ারিং (Selected Users)',
                      desc: 'নিচে নির্বাচিত মসজিদ ব্যবহারকারীরা নির্ধারিত ভূমিকা অনুযায়ী দেখতে/মন্তব্য/সম্পাদনা করতে পারবেন।',
                    },
                    {
                      mode: 'COMMITTEE_SHARED' as SmartNotePrivacyMode,
                      title: '🕌 কমিটি শেয়ার্ড নোট (Committee Shared)',
                      desc: 'এই মসজিদের পরিচালনা কমিটি ও অনুমোদিত প্রশাসনিক সদস্যরা নোটটি দেখতে ও অ্যাক্টিভিটি অনুসরণ করতে পারবেন।',
                    },
                  ]
                ).map((opt) => (
                  <label
                    key={opt.mode}
                    className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      privacyMode === opt.mode
                        ? 'border-emerald-600 bg-emerald-50/70'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="privacyMode"
                        checked={privacyMode === opt.mode}
                        onChange={() => setPrivacyMode(opt.mode)}
                        className="mt-1 accent-emerald-700"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{opt.title}</div>
                        <div className="text-[11px] text-slate-600 font-tiro mt-0.5">{opt.desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {privacyMode !== 'PRIVATE' && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700">সদস্য যুক্ত করুন (Viewer / Commenter / Editor):</div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => setSelectedCandidateId(e.target.value)}
                      className="flex-1 min-w-[160px] px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="">ব্যবহারকারী নির্বাচন করুন...</option>
                      {shareCandidates
                        .filter((c) => !sharedWith.some((s) => s.userId === c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.role})
                          </option>
                        ))}
                    </select>
                    <select
                      value={selectedCandidateRole}
                      onChange={(e) => setSelectedCandidateRole(e.target.value as SmartNoteShareRole)}
                      className="px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="VIEWER">Viewer (শুধু দেখা)</option>
                      <option value="COMMENTER">Commenter (মন্তব্য)</option>
                      <option value="EDITOR">Editor (সম্পাদনা)</option>
                    </select>
                    <button
                      type="button"
                      disabled={!selectedCandidateId}
                      onClick={() => {
                        const cand = shareCandidates.find((c) => c.id === selectedCandidateId);
                        if (!cand) return;
                        setSharedWith((prev) => [
                          ...prev,
                          {
                            userId: cand.id,
                            userName: cand.name,
                            userRole: cand.role,
                            accessRole: selectedCandidateRole,
                            addedAt: new Date().toISOString(),
                          },
                        ]);
                        setSelectedCandidateId('');
                      }}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      যোগ করুন
                    </button>
                  </div>

                  {sharedWith.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {sharedWith.map((entry) => (
                        <div
                          key={entry.userId}
                          className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{entry.userName}</div>
                            <div className="text-[10px] text-slate-500">{entry.accessRole}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSharedWith((prev) => prev.filter((x) => x.userId !== entry.userId))}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSharingModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                disabled={savingShare}
                onClick={handleSaveSharing}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {savingShare ? 'সংরক্ষণ হচ্ছে...' : 'প্রাইভেসি সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Version History Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" /> নোটের সংস্করণ ইতিহাস (Version History)
              </h4>
              <button type="button" onClick={() => setShowVersionsModal(false)} className="p-1 hover:bg-white/15 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {loadingVersions ? (
                <div className="py-10 text-center text-xs text-slate-500">সংস্করণ ইতিহাস লোড হচ্ছে...</div>
              ) : versions.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">কোনো পূর্বের সংস্করণ পাওয়া যায়নি।</div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-emerald-900 font-baloo">সংস্করণ #{v.versionNumber}</span>
                        <span className="text-[11px] text-slate-500 ml-2">• {v.savedByName}</span>
                        <span className="text-[11px] text-slate-400 ml-2 font-baloo">
                          {new Date(v.createdAt).toLocaleString('bn-BD')}
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(v)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> রিস্টোর করুন
                        </button>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-800">{v.title}</div>
                    <div className="text-[11px] text-slate-600 font-tiro line-clamp-2">{v.plainText}</div>
                    <div className="text-[10px] text-slate-500 italic">{v.changeSummary}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Comments & Activity History Modal */}
      {showActivityPanel && (
        <div className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> মন্তব্য ও অ্যাক্টিভিটি হিস্ট্রি
              </h4>
              <button type="button" onClick={() => setShowActivityPanel(false)} className="p-1 hover:bg-white/15 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800">মন্তব্যসমূহ ({comments.length.toLocaleString('bn-BD')})</div>
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 font-tiro">এখনো কোনো মন্তব্য নেই।</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-900">{c.authorName}</span>
                        <span className="text-slate-400 font-baloo">{new Date(c.createdAt).toLocaleString('bn-BD')}</span>
                      </div>
                      <p className="text-xs text-slate-800 font-tiro mt-1">{c.text}</p>
                    </div>
                  ))
                )}

                {currentNote?.canComment !== false && (
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="আপনার মন্তব্য লিখুন..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={postingComment || !newCommentText.trim()}
                      onClick={handlePostComment}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      পাঠান
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-800">অ্যাক্টিভিটি লগ ({activities.length.toLocaleString('bn-BD')})</div>
                {activities.map((a) => (
                  <div key={a.id} className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                    <span>
                      <strong>{a.actorName}:</strong> {a.detailsBn}
                    </span>
                    <span className="text-[10px] text-slate-400 font-baloo shrink-0">
                      {new Date(a.createdAt).toLocaleString('bn-BD')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Create Task / Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-amber-600 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <BellPlus className="w-4 h-4" /> নোট থেকে টাস্ক / অনুস্মারক তৈরি
              </h4>
              <button type="button" onClick={() => setShowReminderModal(false)} className="p-1 hover:bg-white/15 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">কাজের শিরোনাম</label>
                <input
                  type="text"
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">নির্ধারিত তারিখ</label>
                  <input
                    type="date"
                    value={remDueDate}
                    onChange={(e) => setRemDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-baloo"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">অগ্রাধিকার</label>
                  <select
                    value={remPriority}
                    onChange={(e) => setRemPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="NORMAL">সাধারণ</option>
                    <option value="HIGH">গুরুত্বপূর্ণ</option>
                    <option value="URGENT">অত্যন্ত জরুরি</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={savingRem}
                onClick={handleCreateReminder}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {savingRem ? 'তৈরি হচ্ছে...' : 'টাস্ক সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Confirmation Modal for Notice / SMS Conversion */}
      {confirmConversion && (
        <div className="fixed inset-0 z-[75] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-emerald-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">
                {confirmConversion === 'NOTICE' ? '📢 নোটিশ ও বিজ্ঞপ্তিতে ড্রাফট পাঠান' : '💬 এসএমএস বক্সে ড্রাফট পাঠান'}
              </h4>
              <button type="button" onClick={() => setConfirmConversion(null)} className="p-1 hover:bg-white/15 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 text-xs text-slate-700 font-tiro">
              <p>
                {confirmConversion === 'NOTICE'
                  ? 'এই নোটের শিরোনাম ও লেখা "নোটিশ ও বিজ্ঞপ্তি" ফর্মে খসড়া হিসেবে বসানো হবে। আপনি সেখানে চূড়ান্ত যাচাই করে প্রকাশ বা সংরক্ষণ করতে পারবেন।'
                  : 'এই নোটের মূল লেখা "এসএমএস ও নোটিফিকেশন গেটওয়ে সেন্টার"-এর মেসেজ বক্সে ড্রাফট হিসেবে বসানো হবে। আপনার চূড়ান্ত অনুমোদন ছাড়া কোনো এসএমএস পাঠানো হবে না।'}
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto text-[11px]">
                <strong>{title || 'শিরোনামহীন নোট'}</strong>
                <div className="mt-1 line-clamp-4">{plainText}</div>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmConversion(null)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = confirmConversion;
                  setConfirmConversion(null);
                  if (target === 'NOTICE' && onConvertToNotice) {
                    onConvertToNotice({ title: title || 'দাপ্তরিক নোটিশ', bodyHtml: contentHtml, plainText });
                  } else if (target === 'SMS' && onConvertToSms) {
                    onConvertToSms({ title, messageText: plainText.slice(0, 600) });
                  }
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                নিশ্চিত করুন ও যান
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Authenticated Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold truncate">{previewAttachment.att.originalName}</span>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewAttachment.blobUrl);
                  setPreviewAttachment(null);
                }}
                className="p-1.5 hover:bg-white/15 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center">
              {previewAttachment.att.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewAttachment.blobUrl}
                  title={previewAttachment.att.originalName}
                  className="w-full h-[70vh] rounded-xl bg-white"
                />
              ) : (
                <img
                  src={previewAttachment.blobUrl}
                  alt={previewAttachment.att.originalName}
                  className="max-h-[75vh] object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

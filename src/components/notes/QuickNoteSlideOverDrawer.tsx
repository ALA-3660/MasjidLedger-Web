import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Mic,
  Camera,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudOff,
  RefreshCw,
  Check,
  Clock,
} from 'lucide-react';
import { Mosque, User } from '../../types';
import {
  DEFAULT_SMART_NOTE_CATEGORIES,
  SMART_NOTE_TYPES,
  SmartNote,
  SmartNoteCategory,
  SmartNoteOcrResult,
  SmartNoteType,
} from '../../types/smartNotesTypes';
import { api } from '../../lib/api';
import {
  getOfflineNoteDraft,
  removeOfflineNoteDraft,
  saveOfflineNoteDraft,
} from '../../lib/notesOfflineDrafts';
import { SmartNoteRichEditor } from './SmartNoteRichEditor';
import { SmartNoteVoiceModal } from './SmartNoteVoiceModal';
import { SmartNoteOcrModal } from './SmartNoteOcrModal';

interface QuickNoteSlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mosque?: Mosque | null;
  currentUser?: User | null;
  onOpenFullModule?: () => void;
}

export const QuickNoteSlideOverDrawer: React.FC<QuickNoteSlideOverDrawerProps> = ({
  isOpen,
  onClose,
  mosque,
  currentUser,
  onOpenFullModule,
}) => {
  const tenantId = mosque?.id || currentUser?.mosqueId || 'default';
  const userId = currentUser?.id || 'anon';

  const [categories, setCategories] = useState<SmartNoteCategory[]>([]);
  const [recentNotes, setRecentNotes] = useState<SmartNote[]>([]);
  const [activeNote, setActiveNote] = useState<SmartNote | null>(null);

  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('<p></p>');
  const [plainText, setPlainText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [noteType, setNoteType] = useState<SmartNoteType>('QUICK_NOTE');

  const [saveState, setSaveState] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'OFFLINE_DRAFT' | 'ERROR'>('IDLE');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const [cats, notes] = await Promise.all([
          api.getSmartNoteCategories(),
          api.getSmartNotes({ status: 'ACTIVE' }),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setRecentNotes(notes.slice(0, 5));
        if (!categoryId && cats.length > 0) {
          setCategoryId(cats[9]?.id || cats[0].id);
        }
      } catch {
        // Offline fallback default categories
        if (!mounted) return;
        const fallbackCats: SmartNoteCategory[] = DEFAULT_SMART_NOTE_CATEGORIES.map((c) => ({
          ...c,
          id: `${c.id}-${tenantId}`,
          tenantId,
        }));
        setCategories(fallbackCats);
        if (!categoryId && fallbackCats.length > 0) {
          setCategoryId(fallbackCats[9]?.id || fallbackCats[0].id);
        }
      }

      const offlineDraft = getOfflineNoteDraft(tenantId, userId, 'quick_drawer');
      if (offlineDraft && !activeNote && !title && !plainText) {
        setTitle(offlineDraft.title);
        setContentHtml(offlineDraft.contentHtml);
        setCategoryId(offlineDraft.categoryId || categoryId);
        setNoteType(offlineDraft.noteType || 'QUICK_NOTE');
        setSaveState('OFFLINE_DRAFT');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const performQuickSave = async (opts?: {
    overrideTitle?: string;
    overrideHtml?: string;
    overridePlain?: string;
    overrideCategoryId?: string;
    overrideNoteType?: SmartNoteType;
    aiAssisted?: boolean;
  }) => {
    const finalTitle = (opts?.overrideTitle ?? title).trim() || 'কুইক খসড়া নোট';
    const finalHtml = opts?.overrideHtml ?? contentHtml;
    const finalPlain = opts?.overridePlain ?? plainText;
    const finalCatId = opts?.overrideCategoryId ?? categoryId;
    const finalType = opts?.overrideNoteType ?? noteType;

    if (!finalPlain.trim() && finalTitle === 'কুইক খসড়া নোট') return null;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      saveOfflineNoteDraft({
        noteId: activeNote?.id || 'quick_drawer',
        tenantId,
        userId,
        title: finalTitle,
        contentHtml: finalHtml,
        categoryId: finalCatId,
        noteType: finalType,
        tags: [],
        syncStatus: 'PENDING_SYNC',
      });
      setSaveState('OFFLINE_DRAFT');
      setSaveError('অফলাইন — ড্রাফট লোকাল স্টোরেজে সংরক্ষিত হয়েছে।');
      return null;
    }

    setSaveState('SAVING');
    setSaveError(null);
    try {
      let saved: SmartNote;
      if (activeNote) {
        saved = await api.updateSmartNote(activeNote.id, {
          title: finalTitle,
          contentHtml: finalHtml,
          categoryId: finalCatId,
          noteType: finalType,
          aiAssisted: opts?.aiAssisted ?? activeNote.aiAssisted,
          createSnapshot: true,
        });
      } else {
        saved = await api.createSmartNote({
          title: finalTitle,
          contentHtml: finalHtml,
          categoryId: finalCatId,
          noteType: finalType,
          privacyMode: 'PRIVATE',
          sourceChannel: 'QUICK_DRAWER',
          aiAssisted: Boolean(opts?.aiAssisted),
        });
      }
      removeOfflineNoteDraft(tenantId, userId, 'quick_drawer');
      setActiveNote(saved);
      setSaveState('SAVED');
      setRecentNotes((prev) => [saved, ...prev.filter((n) => n.id !== saved.id)].slice(0, 5));
      window.dispatchEvent(new CustomEvent('ml-smart-notes-updated'));
      return saved;
    } catch (err: any) {
      saveOfflineNoteDraft({
        noteId: activeNote?.id || 'quick_drawer',
        tenantId,
        userId,
        title: finalTitle,
        contentHtml: finalHtml,
        categoryId: finalCatId,
        noteType: finalType,
        tags: [],
        syncStatus: 'SYNC_FAILED',
        lastError: err?.message,
      });
      setSaveState('ERROR');
      setSaveError(err?.message || 'সংরক্ষণ ব্যর্থ হয়েছে। লোকাল ড্রাফট নিরাপদ আছে।');
      return null;
    }
  };

  const triggerAutoSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      performQuickSave();
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const handleStartNew = () => {
    setActiveNote(null);
    setTitle('');
    setContentHtml('<p></p>');
    setPlainText('');
    setNoteType('QUICK_NOTE');
    setSaveState('IDLE');
    setSaveError(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Right Slide-Over Drawer (Full height, sits above mobile bottom nav cleanly with pb-20 on mobile) */}
      <aside className="fixed top-0 right-0 bottom-0 z-[65] w-full sm:w-[540px] max-w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col font-siliguri animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-[#064e3b] to-[#0f766e] text-white px-4 py-3.5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold leading-tight">📝 কুইক নোট / খসড়া</h3>
            <p className="text-[11px] text-emerald-100 font-tiro">
              বর্তমান পেজ না ছেড়েই দ্রুত নোট, ভয়েস টাইপিং বা কাগজ স্ক্যান করুন
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenFullModule && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullModule();
                }}
                title="পূর্ণাঙ্গ খসড়া — Smart Notes মডিউল খুলুন"
                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">পূর্ণাঙ্গ মডিউল</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-6">
          {/* Save Status & New Note Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              {saveState === 'SAVING' && (
                <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> সংরক্ষণ হচ্ছে...
                </span>
              )}
              {saveState === 'SAVED' && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> সংরক্ষিত
                </span>
              )}
              {saveState === 'OFFLINE_DRAFT' && (
                <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                  <CloudOff className="w-3.5 h-3.5" /> অফলাইন ড্রাফট সংরক্ষিত
                </span>
              )}
              {saveState === 'ERROR' && (
                <button
                  type="button"
                  onClick={() => performQuickSave()}
                  className="inline-flex items-center gap-1 text-rose-700 font-bold underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> সেভ ব্যর্থ — Retry
                </button>
              )}
              {saveState === 'IDLE' && (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> অটো-সেভ সক্রিয়
                </span>
              )}
            </div>

            {activeNote && (
              <button
                type="button"
                onClick={handleStartNew}
                className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                + নতুন খসড়া শুরু করুন
              </button>
            )}
          </div>

          {saveError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Color-coded Category Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">ক্যাটাগরি নির্বাচন করুন:</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const selected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      triggerAutoSave();
                    }}
                    style={
                      selected
                        ? { backgroundColor: cat.colorHex, borderColor: cat.colorHex, color: '#ffffff' }
                        : undefined
                    }
                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      selected ? 'shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.nameBn}</span>
                    {selected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note Type & Quick Voice/OCR Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={noteType}
              onChange={(e) => {
                setNoteType(e.target.value as SmartNoteType);
                triggerAutoSave();
              }}
              className="flex-1 min-w-[150px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none focus:border-emerald-500"
            >
              {SMART_NOTE_TYPES.map((nt) => (
                <option key={nt.value} value={nt.value}>
                  ধরন: {nt.labelBn}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>ভয়েস</span>
            </button>
            <button
              type="button"
              onClick={() => setShowOcrModal(true)}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>OCR স্ক্যান</span>
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              triggerAutoSave();
            }}
            placeholder="কুইক নোটের শিরোনাম..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none text-sm font-bold font-siliguri text-slate-900"
          />

          {/* Compact Rich Editor */}
          <SmartNoteRichEditor
            value={contentHtml}
            minHeightClass="min-h-[180px]"
            placeholder="তাৎক্ষণিক খসড়া বা তথ্য লিখুন..."
            onChange={(html, plain) => {
              setContentHtml(html);
              setPlainText(plain);
              triggerAutoSave();
            }}
          />

          {/* Recent Quick Notes Strip */}
          {recentNotes.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500">সাম্প্রতিক খসড়া নোটসমূহ:</div>
              <div className="space-y-1.5">
                {recentNotes.map((rn) => (
                  <button
                    key={rn.id}
                    type="button"
                    onClick={() => {
                      setActiveNote(rn);
                      setTitle(rn.title);
                      setContentHtml(rn.contentHtml);
                      setPlainText(rn.plainText);
                      setCategoryId(rn.categoryId);
                      setNoteType(rn.noteType);
                      setSaveState('SAVED');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      activeNote?.id === rn.id
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <span className="font-bold text-slate-800 truncate">{rn.title}</span>
                    <span className="text-[10px] font-baloo text-slate-500 shrink-0">{rn.categoryNameBn}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            বন্ধ করুন
          </button>
          <button
            type="button"
            onClick={() => performQuickSave()}
            className="px-5 py-2 bg-gradient-to-r from-[#064e3b] to-[#0f766e] hover:from-[#065f46] hover:to-[#0d9488] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>নোট সংরক্ষণ করুন</span>
          </button>
        </div>
      </aside>

      {/* Nested Voice & OCR Modals */}
      <SmartNoteVoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onAcceptText={(text, aiFormatted) => {
          const html = text
            .split(/\n{2,}/)
            .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
          const nextHtml = plainText.trim() ? `${contentHtml}${html}` : html;
          const nextPlain = plainText.trim() ? `${plainText}\n\n${text}` : text;
          setContentHtml(nextHtml);
          setPlainText(nextPlain);
          performQuickSave({ overrideHtml: nextHtml, overridePlain: nextPlain, aiAssisted: aiFormatted });
        }}
      />

      <SmartNoteOcrModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onApplyOcrResult={(payload: { result: SmartNoteOcrResult; editedHtml: string; editedText: string; editedTitle: string }) => {
          const nextTitle = title.trim() ? title : payload.editedTitle;
          const nextHtml = plainText.trim() ? `${contentHtml}<hr/>${payload.editedHtml}` : payload.editedHtml;
          const nextPlain = plainText.trim() ? `${plainText}\n\n${payload.editedText}` : payload.editedText;
          const matchedCat = categories.find((c) => c.nameBn === payload.result.suggestedCategoryNameBn);
          const nextCatId = matchedCat?.id || categoryId;
          setTitle(nextTitle);
          setContentHtml(nextHtml);
          setPlainText(nextPlain);
          setCategoryId(nextCatId);
          performQuickSave({
            overrideTitle: nextTitle,
            overrideHtml: nextHtml,
            overridePlain: nextPlain,
            overrideCategoryId: nextCatId,
            overrideNoteType: payload.result.suggestedNoteType || noteType,
            aiAssisted: true,
          });
        }}
      />
    </>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Mic,
  Camera,
  Search,
  Pin,
  Star,
  Archive,
  Trash2,
  Lock,
  Users,
  Building2,
  FileText,
  Sparkles,
  RefreshCw,
  Bell,
  CheckCircle2,
  CloudOff,
  Calendar,
  Filter,
  Paperclip,
  RotateCcw,
} from 'lucide-react';
import { Mosque, User } from '../../types';
import {
  SMART_NOTE_TYPES,
  SmartNote,
  SmartNoteCategory,
  SmartNoteReminder,
  SmartNoteStats,
} from '../../types/smartNotesTypes';
import { api } from '../../lib/api';
import {
  listPendingOfflineNoteDrafts,
  OfflineNoteDraft,
  removeOfflineNoteDraft,
} from '../../lib/notesOfflineDrafts';
import { SmartNoteEditorView } from './SmartNoteEditorView';

interface SmartNotesViewProps {
  mosque?: Mosque | null;
  currentUser?: User | null;
  onConvertToNotice?: (draft: { title: string; bodyHtml: string; plainText: string }) => void;
  onConvertToSms?: (draft: { messageText: string; title: string }) => void;
}

export const SmartNotesView: React.FC<SmartNotesViewProps> = ({
  mosque,
  currentUser,
  onConvertToNotice,
  onConvertToSms,
}) => {
  const tenantId = mosque?.id || currentUser?.mosqueId || 'default';
  const userId = currentUser?.id || 'anon';

  const [notes, setNotes] = useState<SmartNote[]>([]);
  const [categories, setCategories] = useState<SmartNoteCategory[]>([]);
  const [stats, setStats] = useState<SmartNoteStats>({
    totalActive: 0,
    personalCount: 0,
    sharedSelectedCount: 0,
    committeeSharedCount: 0,
    pinnedCount: 0,
    favoriteCount: 0,
    archivedCount: 0,
    trashedCount: 0,
    pendingRemindersCount: 0,
  });
  const [reminders, setReminders] = useState<SmartNoteReminder[]>([]);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineNoteDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Filter state
  const [statusView, setStatusView] = useState<'ACTIVE' | 'PINNED' | 'FAVORITE' | 'ARCHIVED' | 'TRASHED' | 'REMINDERS'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [selectedNoteType, setSelectedNoteType] = useState('ALL');
  const [selectedPrivacy, setSelectedPrivacy] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Active editor view
  const [editorMode, setEditorMode] = useState<{
    open: boolean;
    note: SmartNote | null;
    openVoice?: boolean;
    openOcr?: boolean;
  }>({ open: false, note: null });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [catsRes, statsRes, notesRes, remRes] = await Promise.all([
        api.getSmartNoteCategories(),
        api.getSmartNoteStats(),
        api.getSmartNotes({
          status: statusView === 'ARCHIVED' ? 'ARCHIVED' : statusView === 'TRASHED' ? 'TRASHED' : 'ACTIVE',
          pinnedOnly: statusView === 'PINNED',
          favoriteOnly: statusView === 'FAVORITE',
          categoryId: selectedCategoryId !== 'ALL' ? selectedCategoryId : undefined,
          noteType: selectedNoteType !== 'ALL' ? selectedNoteType : undefined,
          privacyMode: selectedPrivacy !== 'ALL' ? selectedPrivacy : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.getSmartNoteReminders().catch(() => []),
      ]);
      setCategories(catsRes);
      setStats(statsRes);
      setNotes(notesRes);
      setReminders(remRes);
    } catch (err) {
      console.error('Failed to load smart notes:', err);
    } finally {
      setOfflineDrafts(listPendingOfflineNoteDrafts(tenantId, userId));
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [statusView, selectedCategoryId, selectedNoteType, selectedPrivacy, dateFrom, dateTo]);

  // Listen for custom global event when quick note drawer creates a note
  useEffect(() => {
    const refreshHandler = () => loadAll();
    window.addEventListener('ml-smart-notes-updated', refreshHandler);
    return () => window.removeEventListener('ml-smart-notes-updated', refreshHandler);
  }, [statusView, selectedCategoryId, selectedNoteType, selectedPrivacy]);

  const handleSyncOfflineDrafts = async () => {
    if (offlineDrafts.length === 0) return;
    setSyncingOffline(true);
    try {
      for (const d of offlineDrafts) {
        if (d.noteId && d.noteId !== 'new' && d.noteId !== 'new_quick') {
          await api.updateSmartNote(d.noteId, {
            title: d.title,
            contentHtml: d.contentHtml,
            categoryId: d.categoryId,
            noteType: d.noteType,
            tags: d.tags,
            createSnapshot: true,
            changeSummary: 'অফলাইন ড্রাফট সিঙ্ক',
          });
        } else {
          await api.createSmartNote({
            title: d.title,
            contentHtml: d.contentHtml,
            categoryId: d.categoryId,
            noteType: d.noteType,
            tags: d.tags,
          });
        }
        removeOfflineNoteDraft(d.tenantId, d.userId, d.noteId);
      }
      await loadAll();
    } catch (err) {
      console.error('Offline sync failed:', err);
    } finally {
      setSyncingOffline(false);
    }
  };

  const visibleNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.trim().toLowerCase();
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.plainText || '').toLowerCase().includes(q) ||
        (n.categoryNameBn || '').toLowerCase().includes(q) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  const handlePermanentDelete = async (id: string) => {
    try {
      await api.deleteSmartNote(id, true);
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreTrashed = async (id: string) => {
    try {
      await api.updateSmartNote(id, { status: 'ACTIVE' });
      await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  if (editorMode.open) {
    return (
      <SmartNoteEditorView
        note={editorMode.note}
        categories={categories}
        mosque={mosque}
        currentUser={currentUser}
        initialOpenVoice={editorMode.openVoice}
        initialOpenOcr={editorMode.openOcr}
        onBack={() => {
          setEditorMode({ open: false, note: null });
          loadAll();
        }}
        onNoteSaved={(saved) => {
          setNotes((prev) => {
            const exists = prev.some((n) => n.id === saved.id);
            return exists ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev];
          });
        }}
        onNoteDeleted={(deletedId) => {
          setNotes((prev) => prev.filter((n) => n.id !== deletedId));
        }}
        onCategoryCreated={(cat) => {
          setCategories((prev) => [...prev, cat]);
        }}
        onConvertToNotice={onConvertToNotice}
        onConvertToSms={onConvertToSms}
      />
    );
  }

  return (
    <div className="space-y-5 font-siliguri">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#0f766e] text-white rounded-3xl p-5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-100 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI ভয়েস টাইপিং ও ক্যামেরা OCR সমৃদ্ধ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">📝 খসড়া — Smart Notes</h2>
          <p className="text-xs sm:text-sm text-emerald-100 font-tiro mt-1">
            মসজিদের সভার খসড়া, জমি-সম্পত্তির তথ্য, ব্যক্তিগত ও কমিটি নোট — বাংলা-ফার্স্ট রিচ টেক্সট ও স্মার্ট AI সহায়তাসহ
          </p>
        </div>

        {/* Quick Creation Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setEditorMode({ open: true, note: null })}
            className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>নতুন নোট</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorMode({ open: true, note: null, openVoice: true })}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>ভয়েস নোট</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorMode({ open: true, note: null, openOcr: true })}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>কাগজ স্ক্যান</span>
          </button>
        </div>
      </div>

      {/* Offline Pending Drafts Sync Banner */}
      {offlineDrafts.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              আপনার ব্রাউজারে <strong>{offlineDrafts.length.toLocaleString('bn-BD')}টি</strong> অফলাইন খসড়া অপেক্ষমাণ রয়েছে।
            </span>
          </div>
          <button
            type="button"
            disabled={syncingOffline}
            onClick={handleSyncOfflineDrafts}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
            <span>{syncingOffline ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}</span>
          </button>
        </div>
      )}

      {/* 4 Summary Cards (Numbers in Baloo Da 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setStatusView('ACTIVE');
            setSelectedPrivacy('ALL');
          }}
          className="text-left bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">মোট সক্রিয় নোট</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-baloo text-emerald-950 mt-2">
            {stats.totalActive.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 font-baloo mt-0.5">
            পিনকৃত: {stats.pinnedCount.toLocaleString('bn-BD')} • প্রিয়: {stats.favoriteCount.toLocaleString('bn-BD')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusView('ACTIVE');
            setSelectedPrivacy('PRIVATE');
          }}
          className="text-left bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">ব্যক্তিগত নোট</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-baloo text-indigo-950 mt-2">
            {stats.personalCount.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 font-tiro mt-0.5">শুধুমাত্র আপনার জন্য সুরক্ষিত</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusView('ACTIVE');
            setSelectedPrivacy('SHARED_SELECTED');
          }}
          className="text-left bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">শেয়ার্ড নোট</span>
            <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-baloo text-blue-950 mt-2">
            {stats.sharedSelectedCount.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 font-tiro mt-0.5">নির্বাচিত সদস্যদের সাথে শেয়ার্ড</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusView('ACTIVE');
            setSelectedPrivacy('COMMITTEE_SHARED');
          }}
          className="text-left bg-white border border-slate-200 hover:border-teal-300 rounded-2xl p-4 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">কমিটি নোট</span>
            <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold font-baloo text-teal-950 mt-2">
            {stats.committeeSharedCount.toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 font-tiro mt-0.5">কমিটি সদস্যদের যৌথ খসড়া</div>
        </button>
      </div>

      {/* View Switcher Tabs + Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ACTIVE', label: 'সকল নোট', count: stats.totalActive },
                { id: 'PINNED', label: '📌 পিনকৃত', count: stats.pinnedCount },
                { id: 'FAVORITE', label: '⭐ প্রিয়', count: stats.favoriteCount },
                { id: 'REMINDERS', label: '⏰ টাস্ক ও রিমাইন্ডার', count: stats.pendingRemindersCount },
                { id: 'ARCHIVED', label: '📦 আর্কাইভ', count: stats.archivedCount },
                { id: 'TRASHED', label: '🗑️ ট্র্যাশ', count: stats.trashedCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusView(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  statusView === tab.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-baloo text-[11px] opacity-85">({tab.count.toLocaleString('bn-BD')})</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadAll}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search & Filter Controls */}
        {statusView !== 'REMINDERS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="শিরোনাম, লেখা, ক্যাটাগরি বা ট্যাগ দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500"
            >
              <option value="ALL">সকল ক্যাটাগরি ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.nameBn}
                </option>
              ))}
            </select>

            <select
              value={selectedNoteType}
              onChange={(e) => setSelectedNoteType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-emerald-500"
            >
              <option value="ALL">সকল ধরন (Note Type)</option>
              {SMART_NOTE_TYPES.map((nt) => (
                <option key={nt.value} value={nt.value}>
                  {nt.labelBn}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="শুরুর তারিখ"
                className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 text-[11px] font-baloo"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="শেষ তারিখ"
                className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 text-[11px] font-baloo"
              />
            </div>
          </div>
        )}
      </div>

      {/* REMINDERS LIST VIEW */}
      {statusView === 'REMINDERS' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" /> নোট থেকে তৈরি কাজ ও অনুস্মারক ({reminders.length.toLocaleString('bn-BD')})
          </h3>
          {reminders.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 font-tiro">
              কোনো কাজ বা রিমাইন্ডার নেই। যেকোনো নোট খুলে ১ ক্লিকে টাস্ক/রিমাইন্ডার তৈরি করতে পারবেন।
            </div>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  r.status === 'DONE' ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-amber-50/40 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const nextStatus = r.status === 'DONE' ? 'PENDING' : 'DONE';
                      const updated = await api.toggleSmartNoteReminder(r.id, nextStatus);
                      setReminders((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
                      loadAll();
                    }}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                      r.status === 'DONE' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-amber-500 bg-white'
                    }`}
                  >
                    {r.status === 'DONE' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${r.status === 'DONE' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {r.title}
                    </div>
                    {r.description && <p className="text-[11px] text-slate-600 font-tiro line-clamp-2 mt-0.5">{r.description}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-baloo text-slate-500">
                      {r.dueDate && <span>📅 নির্ধারিত: {r.dueDate}</span>}
                      <span>অগ্রাধিকার: {r.priority === 'URGENT' ? 'জরুরি' : r.priority === 'HIGH' ? 'গুরুত্বপূর্ণ' : 'সাধারণ'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500">
          খসড়া নোটসমূহ লোড হচ্ছে...
        </div>
      ) : visibleNotes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto text-2xl">
            📝
          </div>
          <h4 className="text-sm font-bold text-slate-800">এই তালিকায় এখনো কোনো খসড়া নোট নেই</h4>
          <p className="text-xs text-slate-500 font-tiro max-w-md mx-auto">
            নতুন নোট লিখুন, ভয়েস টাইপিং ব্যবহার করে দ্রুত বাংলায় নোট নিন অথবা কাগজের ছবি স্ক্যান করে AI OCR দিয়ে এডিটেবল নোট তৈরি করুন।
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditorMode({ open: true, note: null })}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              ➕ প্রথম নোট তৈরি করুন
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {visibleNotes.map((n) => {
            const typeMeta = SMART_NOTE_TYPES.find((t) => t.value === n.noteType);
            const catMeta = categories.find((c) => c.id === n.categoryId);
            return (
              <div
                key={n.id}
                onClick={() => setEditorMode({ open: true, note: n })}
                className="group bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                {/* Top color bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: n.categoryColorHex || catMeta?.colorHex || '#0f766e' }}
                />

                <div className="space-y-2 pt-1">
                  {/* Category + Privacy + Pin/Fav badges */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg text-white truncate max-w-[65%]"
                      style={{ backgroundColor: n.categoryColorHex || catMeta?.colorHex || '#0f766e' }}
                    >
                      <span>{catMeta?.icon || '📝'}</span>
                      <span className="truncate">{n.categoryNameBn}</span>
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {n.isPinned && <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />}
                      {n.isFavorite && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                      {n.privacyMode === 'PRIVATE' ? (
                        <span title="ব্যক্তিগত">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      ) : n.privacyMode === 'COMMITTEE_SHARED' ? (
                        <span title="কমিটি শেয়ার্ড">
                          <Building2 className="w-3.5 h-3.5 text-teal-600" />
                        </span>
                      ) : (
                        <span title="নির্বাচিত শেয়ার্ড">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title (Hind Siliguri) */}
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 font-siliguri line-clamp-2 leading-snug">
                    {n.title}
                  </h4>

                  {/* Snippet (Tiro Bangla) */}
                  <p className="text-xs text-slate-600 font-tiro line-clamp-3 leading-relaxed">
                    {n.plainText || 'কোনো বিস্তারিত লেখা নেই...'}
                  </p>

                  {/* Tags & Type */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {typeMeta && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeMeta.badgeColor}`}>
                        {typeMeta.labelBn}
                      </span>
                    )}
                    {n.aiAssisted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        ✨ AI
                      </span>
                    )}
                    {(n.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-baloo">
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{n.ownerName}</span>
                    {(n.attachments || []).length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-700">
                        <Paperclip className="w-3 h-3" /> {n.attachments.length.toLocaleString('bn-BD')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {statusView === 'TRASHED' ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreTrashed(n.id);
                          }}
                          className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-siliguri font-bold text-[10px] cursor-pointer flex items-center gap-0.5"
                        >
                          <RotateCcw className="w-3 h-3" /> ফেরান
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermanentDelete(n.id);
                          }}
                          className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg font-siliguri font-bold text-[10px] cursor-pointer"
                        >
                          স্থায়ী মুছুন
                        </button>
                      </>
                    ) : (
                      <span>
                        {new Date(n.updatedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

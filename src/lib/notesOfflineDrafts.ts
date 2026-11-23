import { SmartNoteType } from '../types/smartNotesTypes';

export interface OfflineNoteDraft {
  draftKey: string;
  noteId?: string;
  tenantId: string;
  userId: string;
  title: string;
  contentHtml: string;
  categoryId: string;
  noteType: SmartNoteType;
  tags: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  updatedAt: string;
  syncStatus: 'PENDING_SYNC' | 'SYNC_FAILED';
  lastError?: string;
}

const DRAFT_PREFIX = 'ml_smart_note_draft_v1_';

function buildDraftStorageKey(tenantId: string, userId: string, noteId?: string): string {
  const safeTenant = (tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeUser = (userId || 'anon').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeNote = (noteId || 'new_quick').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${DRAFT_PREFIX}${safeTenant}_${safeUser}_${safeNote}`;
}

export function saveOfflineNoteDraft(draft: Omit<OfflineNoteDraft, 'draftKey' | 'updatedAt'>): OfflineNoteDraft | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const draftKey = buildDraftStorageKey(draft.tenantId, draft.userId, draft.noteId);
    const record: OfflineNoteDraft = {
      ...draft,
      draftKey,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(draftKey, JSON.stringify(record));
    return record;
  } catch (err) {
    console.warn('[SmartNotesOffline] Failed to persist local draft:', err);
    return null;
  }
}

export function getOfflineNoteDraft(tenantId: string, userId: string, noteId?: string): OfflineNoteDraft | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const key = buildDraftStorageKey(tenantId, userId, noteId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineNoteDraft;
  } catch {
    return null;
  }
}

export function removeOfflineNoteDraft(tenantId: string, userId: string, noteId?: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = buildDraftStorageKey(tenantId, userId, noteId);
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function listPendingOfflineNoteDrafts(tenantId: string, userId: string): OfflineNoteDraft[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const safeTenant = (tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeUser = (userId || 'anon').replace(/[^a-zA-Z0-9_-]/g, '_');
    const prefix = `${DRAFT_PREFIX}${safeTenant}_${safeUser}_`;
    const drafts: OfflineNoteDraft[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as OfflineNoteDraft;
            if (parsed && (parsed.title || parsed.contentHtml)) {
              drafts.push(parsed);
            }
          } catch {
            // ignore corrupted entry
          }
        }
      }
    }
    return drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

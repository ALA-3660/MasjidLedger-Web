export type SmartNoteType =
  | 'QUICK_NOTE'
  | 'PERSONAL_NOTE'
  | 'OFFICIAL_DRAFT'
  | 'MEETING_PREP'
  | 'RESOLUTION_DRAFT'
  | 'APPLICATION_DRAFT'
  | 'COMPLAINT_INVESTIGATION'
  | 'FUTURE_PLAN';

export const SMART_NOTE_TYPES: Array<{
  value: SmartNoteType;
  labelBn: string;
  descriptionBn: string;
  badgeColor: string;
}> = [
  { value: 'QUICK_NOTE', labelBn: 'দ্রুত নোট', descriptionBn: 'তাৎক্ষণিক সংক্ষিপ্ত নোট বা তথ্য', badgeColor: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'PERSONAL_NOTE', labelBn: 'ব্যক্তিগত নোট', descriptionBn: 'সম্পূর্ণ ব্যক্তিগত ও গোপনীয় নোট', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'OFFICIAL_DRAFT', labelBn: 'দাপ্তরিক খসড়া', descriptionBn: 'নোটিশ, স্মারক বা দাপ্তরিক চিঠির খসড়া', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'MEETING_PREP', labelBn: 'সভার প্রস্তুতি', descriptionBn: 'আলোচ্যসূচি ও সভার পূর্বপ্রস্তুতি', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'RESOLUTION_DRAFT', labelBn: 'সিদ্ধান্তের খসড়া', descriptionBn: 'রেজল্যুশন ও কার্যবিবরণীর খসড়া', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'APPLICATION_DRAFT', labelBn: 'আবেদন/চিঠির খসড়া', descriptionBn: 'দরখাস্ত, আবেদন ও অনুরোধপত্র', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'COMPLAINT_INVESTIGATION', labelBn: 'অভিযোগ/তদন্ত নোট', descriptionBn: 'অভিযোগ যাচাই, সাক্ষ্য ও তদন্ত নোট', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'FUTURE_PLAN', labelBn: 'ভবিষ্যৎ পরিকল্পনা', descriptionBn: 'উন্নয়ন ধারণা ও দীর্ঘমেয়াদী পরিকল্পনা', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
];

export type SmartNotePrivacyMode = 'PRIVATE' | 'SHARED_SELECTED' | 'COMMITTEE_SHARED';
export type SmartNoteShareRole = 'VIEWER' | 'COMMENTER' | 'EDITOR';
export type SmartNoteStatus = 'ACTIVE' | 'ARCHIVED' | 'TRASHED';

export interface SmartNoteCategory {
  id: string;
  tenantId: string;
  nameBn: string;
  nameEn?: string;
  colorHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  icon: string;
  sortOrder: number;
  isDefault?: boolean;
  createdBy?: string;
  createdAt?: string;
}

export const DEFAULT_SMART_NOTE_CATEGORIES: Omit<SmartNoteCategory, 'tenantId'>[] = [
  { id: 'cat-note-01', nameBn: 'সভা ও বৈঠক', nameEn: 'Meetings', colorHex: '#047857', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-300', textClass: 'text-emerald-900', icon: '🕌', sortOrder: 1, isDefault: true },
  { id: 'cat-note-02', nameBn: 'জমি ও সম্পত্তি', nameEn: 'Land & Waqf', colorHex: '#b45309', bgClass: 'bg-amber-50', borderClass: 'border-amber-300', textClass: 'text-amber-900', icon: '🏛️', sortOrder: 2, isDefault: true },
  { id: 'cat-note-03', nameBn: 'আয়-ব্যয় ও হিসাব', nameEn: 'Accounts & Finance', colorHex: '#0f766e', bgClass: 'bg-teal-50', borderClass: 'border-teal-300', textClass: 'text-teal-900', icon: '💰', sortOrder: 3, isDefault: true },
  { id: 'cat-note-04', nameBn: 'দাপ্তরিক যোগাযোগ', nameEn: 'Official Correspondence', colorHex: '#1d4ed8', bgClass: 'bg-blue-50', borderClass: 'border-blue-300', textClass: 'text-blue-900', icon: '📢', sortOrder: 4, isDefault: true },
  { id: 'cat-note-05', nameBn: 'সিদ্ধান্ত ও কার্যবিবরণী', nameEn: 'Resolutions & Minutes', colorHex: '#4338ca', bgClass: 'bg-indigo-50', borderClass: 'border-indigo-300', textClass: 'text-indigo-900', icon: '📜', sortOrder: 5, isDefault: true },
  { id: 'cat-note-06', nameBn: 'নির্মাণ ও উন্নয়ন', nameEn: 'Construction & Development', colorHex: '#c2410c', bgClass: 'bg-orange-50', borderClass: 'border-orange-300', textClass: 'text-orange-900', icon: '🏗️', sortOrder: 6, isDefault: true },
  { id: 'cat-note-07', nameBn: 'কমিটি ও প্রশাসন', nameEn: 'Committee & Admin', colorHex: '#6d28d9', bgClass: 'bg-violet-50', borderClass: 'border-violet-300', textClass: 'text-violet-900', icon: '👥', sortOrder: 7, isDefault: true },
  { id: 'cat-note-08', nameBn: 'কাজ ও অনুস্মারক', nameEn: 'Tasks & Reminders', colorHex: '#be123c', bgClass: 'bg-rose-50', borderClass: 'border-rose-300', textClass: 'text-rose-900', icon: '⏰', sortOrder: 8, isDefault: true },
  { id: 'cat-note-09', nameBn: 'অভিযোগ ও পরামর্শ', nameEn: 'Complaints & Feedback', colorHex: '#9f1239', bgClass: 'bg-pink-50', borderClass: 'border-pink-300', textClass: 'text-pink-900', icon: '⚖️', sortOrder: 9, isDefault: true },
  { id: 'cat-note-10', nameBn: 'ব্যক্তিগত ও সাধারণ', nameEn: 'Personal & General', colorHex: '#334155', bgClass: 'bg-slate-100', borderClass: 'border-slate-300', textClass: 'text-slate-900', icon: '📝', sortOrder: 10, isDefault: true },
  { id: 'cat-note-11', nameBn: 'পরিকল্পনা ও ধারণা', nameEn: 'Plans & Ideas', colorHex: '#0e7490', bgClass: 'bg-cyan-50', borderClass: 'border-cyan-300', textClass: 'text-cyan-900', icon: '💡', sortOrder: 11, isDefault: true },
  { id: 'cat-note-12', nameBn: 'অন্যান্য', nameEn: 'Others', colorHex: '#4b5563', bgClass: 'bg-gray-100', borderClass: 'border-gray-300', textClass: 'text-gray-800', icon: '📂', sortOrder: 12, isDefault: true },
];

export interface SmartNoteShareEntry {
  userId: string;
  userName: string;
  userRole?: string;
  accessRole: SmartNoteShareRole;
  addedAt: string;
  addedBy?: string;
}

export interface SmartNoteAttachment {
  id: string;
  noteId: string;
  tenantId: string;
  uploadedBy: string;
  uploadedByName?: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  createdAt: string;
}

export interface SmartNoteVersion {
  id: string;
  noteId: string;
  tenantId: string;
  versionNumber: number;
  title: string;
  contentHtml: string;
  plainText: string;
  categoryId: string;
  noteType: SmartNoteType;
  savedBy: string;
  savedByName: string;
  changeSummary: string;
  createdAt: string;
}

export interface SmartNoteComment {
  id: string;
  noteId: string;
  tenantId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  text: string;
  createdAt: string;
}

export interface SmartNoteActivity {
  id: string;
  noteId: string;
  tenantId: string;
  actorId: string;
  actorName: string;
  action: 'CREATED' | 'UPDATED' | 'SHARED' | 'PRIVACY_CHANGED' | 'COMMENTED' | 'RESTORED_VERSION' | 'ATTACHMENT_ADDED' | 'ATTACHMENT_REMOVED' | 'ARCHIVED' | 'TRASHED' | 'RESTORED' | 'CONVERTED';
  detailsBn: string;
  createdAt: string;
}

export interface SmartNoteReminder {
  id: string;
  noteId: string;
  tenantId: string;
  ownerId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'DONE';
  assignedToUserId?: string;
  assignedToName?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SmartNote {
  id: string;
  tenantId: string;
  mosqueId: string;
  ownerId: string;
  ownerName: string;
  title: string;
  contentHtml: string;
  plainText: string;
  categoryId: string;
  categoryNameBn: string;
  categoryColorHex?: string;
  noteType: SmartNoteType;
  tags: string[];
  privacyMode: SmartNotePrivacyMode;
  sharedWith: SmartNoteShareEntry[];
  isPinned: boolean;
  isFavorite: boolean;
  status: SmartNoteStatus;
  archivedAt?: string;
  trashedAt?: string;
  attachments: SmartNoteAttachment[];
  version: number;
  aiAssisted?: boolean;
  sourceChannel?: 'WEB' | 'QUICK_DRAWER' | 'VOICE' | 'OCR';
  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
  lastEditedByName?: string;
  // Computed client hints
  canEdit?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
  canComment?: boolean;
}

export interface SmartNoteStats {
  totalActive: number;
  personalCount: number;
  sharedSelectedCount: number;
  committeeSharedCount: number;
  pinnedCount: number;
  favoriteCount: number;
  archivedCount: number;
  trashedCount: number;
  pendingRemindersCount: number;
}

export type NoteOcrMode =
  | 'SCAN_TO_TEXT'
  | 'SCAN_TO_DOCUMENT'
  | 'SCAN_AND_SUMMARIZE'
  | 'SCAN_TO_SMART_NOTE';

export type NoteAiAssistAction =
  | 'POLISH'
  | 'OFFICIAL'
  | 'SUMMARIZE'
  | 'EXPAND'
  | 'MINUTES'
  | 'ACTION_ITEMS'
  | 'TRANSLATE_BN_EN'
  | 'TRANSLATE_EN_BN';

export interface SmartNoteVoiceFormatResult {
  originalText: string;
  correctedText: string;
  changesSummaryBn: string;
  modelUsed: string;
}

export interface SmartNoteOcrResult {
  extractedText: string;
  formattedHtml: string;
  summary: string;
  suggestedTitle: string;
  suggestedCategoryNameBn: string;
  suggestedNoteType: SmartNoteType;
  warningNoteBn?: string;
  modelUsed: string;
}

export interface SmartNoteAiAssistResult {
  action: NoteAiAssistAction;
  resultText: string;
  resultHtml: string;
  actionItems?: string[];
  modelUsed: string;
}

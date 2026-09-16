import React from 'react';

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'APPROVE'
  | 'REJECT'
  | 'VOID'
  | 'CANCEL'
  | 'PRINT'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SETTINGS_CHANGE'
  | string;

interface AuditBadgeProps {
  action: AuditActionType;
  customLabel?: string;
  className?: string;
}

export const AuditBadge: React.FC<AuditBadgeProps> = ({
  action,
  customLabel,
  className = '',
}) => {
  const norm = (action || '').toUpperCase();

  const actionMap: Record<string, { label: string; color: string }> = {
    CREATE: { label: 'নতুন সংযোজন', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    UPDATE: { label: 'হালনাগাদ/সম্পাদনা', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    DELETE: { label: 'অপসারণ', color: 'bg-rose-50 text-rose-800 border-rose-200' },
    ARCHIVE: { label: 'আর্কাইভ', color: 'bg-stone-100 text-stone-800 border-stone-300' },
    RESTORE: { label: 'পুনরুদ্ধার', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    APPROVE: { label: 'অনুমোদন', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    REJECT: { label: 'প্রত্যাখ্যান', color: 'bg-rose-50 text-rose-800 border-rose-200' },
    VOID: { label: 'ভয়েড/বাতিল', color: 'bg-rose-50 text-rose-800 border-rose-200' },
    CANCEL: { label: 'বাতিল', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    PRINT: { label: 'মুদ্রণ/প্রিন্ট', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    EXPORT: { label: 'এক্সপোর্ট', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    LOGIN: { label: 'লগইন', color: 'bg-slate-100 text-slate-800 border-slate-200' },
    LOGOUT: { label: 'লগআউট', color: 'bg-slate-100 text-slate-800 border-slate-200' },
    SETTINGS_CHANGE: { label: 'সেটিংস পরিবর্তন', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  };

  const item = actionMap[norm] || {
    label: customLabel || action,
    color: 'bg-stone-100 text-stone-700 border-stone-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${item.color} ${className}`}
    >
      {customLabel || item.label}
    </span>
  );
};

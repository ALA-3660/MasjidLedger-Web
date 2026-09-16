import React from 'react';

export type GeneralStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ARCHIVED'
  | 'VOID'
  | 'REVIEW'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'UNDER_MAINTENANCE'
  | string;

interface StatusBadgeProps {
  status: GeneralStatus;
  customLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  size = 'sm',
  className = '',
}) => {
  const normalized = (status || '').toUpperCase();

  const statusConfig: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'সক্রিয়', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    INACTIVE: { label: 'নিষ্ক্রিয়', color: 'bg-stone-100 text-stone-600 border-stone-200' },
    DRAFT: { label: 'খসড়া', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    PENDING: { label: 'অনুমোদন অপেক্ষমাণ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    APPROVED: { label: 'অনুমোদিত', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    REJECTED: { label: 'বাতিলকৃত', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    CANCELLED: { label: 'বাতিল', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    ARCHIVED: { label: 'আর্কাইভকৃত', color: 'bg-stone-100 text-stone-600 border-stone-300' },
    VOID: { label: 'বাতিল/ভয়েড', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    REVIEW: { label: 'পর্যালোচনাধীন', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    SUSPENDED: { label: 'স্থগিত', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    COMPLETED: { label: 'সম্পন্ন', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    UNDER_MAINTENANCE: { label: 'রক্ষণাবেক্ষণাধীন', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  const config = statusConfig[normalized] || {
    label: customLabel || status || 'সাধারণ',
    color: 'bg-stone-100 text-stone-700 border-stone-200',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-md border ${config.color} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
      <span>{customLabel || config.label}</span>
    </span>
  );
};

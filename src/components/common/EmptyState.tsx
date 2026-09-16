import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'কোনো তথ্য পাওয়া যায়নি',
  description = 'নির্বাচিত ফিল্টার অথবা তালিকায় বর্তমানে কোনো রেকর্ড বিদ্যমান নেই।',
  icon,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-6 text-center bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-bold text-stone-800 font-siliguri">{title}</h3>
      <p className="text-xs text-stone-500 max-w-sm mt-1 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

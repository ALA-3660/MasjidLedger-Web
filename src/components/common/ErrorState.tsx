import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'তথ্য লোড করা সম্ভব হয়নি',
  message = 'সার্ভার বা নেটওয়ার্ক সংযোগে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center flex flex-col items-center justify-center gap-2.5 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-rose-900 font-siliguri">{title}</h4>
      <p className="text-xs text-rose-700 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          আবার চেষ্টা করুন
        </button>
      )}
    </div>
  );
};

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'তথ্য লোড হচ্ছে...',
  className = '',
}) => {
  return (
    <div
      className={`py-16 text-center text-stone-400 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-stone-200 shadow-xs ${className}`}
    >
      <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
      <span className="text-xs font-semibold text-stone-600 font-siliguri">{message}</span>
    </div>
  );
};

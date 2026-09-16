import React from 'react';
import { AlertTriangle, X, Check, Trash2, Archive, RotateCcw } from 'lucide-react';

export type DialogVariant = 'danger' | 'warning' | 'archive' | 'restore' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'নিশ্চিত করুন',
  cancelText = 'বাতিল',
  variant = 'warning',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bgIcon: 'bg-rose-100 text-rose-600',
      btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white',
      icon: <Trash2 className="w-5 h-5" />,
    },
    warning: {
      bgIcon: 'bg-amber-100 text-amber-600',
      btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    archive: {
      bgIcon: 'bg-stone-100 text-stone-700',
      btnConfirm: 'bg-stone-800 hover:bg-stone-900 text-white',
      icon: <Archive className="w-5 h-5" />,
    },
    restore: {
      bgIcon: 'bg-emerald-100 text-emerald-700',
      btnConfirm: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      icon: <RotateCcw className="w-5 h-5" />,
    },
    info: {
      bgIcon: 'bg-blue-100 text-blue-600',
      btnConfirm: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: <Check className="w-5 h-5" />,
    },
  };

  const current = variantStyles[variant] || variantStyles.warning;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl flex-shrink-0 ${current.bgIcon}`}>
            {current.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-stone-900 font-siliguri">{title}</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${current.btnConfirm} disabled:opacity-50`}
          >
            {isLoading ? 'প্রক্রিয়াধীন...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

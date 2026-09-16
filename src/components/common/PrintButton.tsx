import React, { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { printElement, PrintOptions } from '../../lib/printUtils';

interface PrintButtonProps {
  elementId?: string;
  onPrint?: () => void | Promise<void>;
  options?: PrintOptions;
  title?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  elementId,
  onPrint,
  options,
  title = 'প্রিন্ট',
  className = '',
  variant = 'outline',
  size = 'md',
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintClick = async () => {
    setIsPrinting(true);
    try {
      if (onPrint) {
        await onPrint();
      } else if (elementId) {
        await printElement(elementId, options);
      }
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const variantStyles = {
    primary: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs',
    secondary: 'bg-stone-800 hover:bg-stone-900 text-white shadow-xs',
    outline: 'border border-stone-300 hover:bg-stone-100 text-stone-700 bg-white shadow-xs',
    ghost: 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-xs',
  };

  return (
    <button
      type="button"
      onClick={handlePrintClick}
      disabled={isPrinting}
      className={`inline-flex items-center gap-1.5 font-bold rounded-xl transition cursor-pointer disabled:opacity-50 font-siliguri ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      title={title}
    >
      {isPrinting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
      ) : (
        <Printer className="w-3.5 h-3.5 text-current" />
      )}
      <span>{isPrinting ? 'প্রস্তুত হচ্ছে...' : title}</span>
    </button>
  );
};

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { printElement, PrintOptions } from '../../lib/printUtils';

interface PdfButtonProps {
  elementId?: string;
  onPdf?: () => void | Promise<void>;
  options?: PrintOptions;
  title?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export const PdfButton: React.FC<PdfButtonProps> = ({
  elementId,
  onPdf,
  options,
  title = 'PDF সংরক্ষণ',
  className = '',
  variant = 'outline',
  size = 'md',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePdfClick = async () => {
    setIsLoading(true);
    try {
      if (onPdf) {
        await onPdf();
      } else if (elementId) {
        await printElement(elementId, {
          ...options,
          documentTitle: options?.documentTitle || 'MasjidLedger-Document',
        });
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsLoading(false);
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
      onClick={handlePdfClick}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 font-bold rounded-xl transition cursor-pointer disabled:opacity-50 font-siliguri ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      title={title}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
      ) : (
        <Download className="w-3.5 h-3.5 text-current" />
      )}
      <span>{isLoading ? 'তৈরি হচ্ছে...' : title}</span>
    </button>
  );
};

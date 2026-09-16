import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileText,
  Building,
} from 'lucide-react';
import { printElement, PrintOptions } from '../../lib/printUtils';
import { Mosque } from '../../types';

interface CommonPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  contentId: string;
  mosque?: Mosque | null;
  children: React.ReactNode;
  defaultOrientation?: 'portrait' | 'landscape' | 'thermal';
}

export const CommonPrintPreviewModal: React.FC<CommonPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  contentId,
  mosque,
  children,
  defaultOrientation = 'portrait',
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'thermal'>(
    defaultOrientation
  );
  const [zoom, setZoom] = useState(100);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printElement(contentId, {
        title: title || 'MasjidLedger Document',
        pageOrientation: orientation === 'landscape' ? 'landscape' : 'portrait',
        pageSize: orientation === 'thermal' ? 'POS_80' : 'A4',
      });
    } catch (err) {
      console.error('Printing failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150 print:hidden">
      <div className="bg-stone-100 rounded-2xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl border border-stone-300 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Control Bar */}
        <div className="bg-white px-5 py-3.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex-shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 font-siliguri truncate">
                {title} (প্রিন্ট ও PDF প্রিভিউ)
              </h3>
              {subtitle && <p className="text-[11px] text-stone-500">{subtitle}</p>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Orientation Picker */}
            <div className="bg-stone-100 p-0.5 rounded-xl border border-stone-200 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  orientation === 'portrait'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                A4 পোর্ট্রেট
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  orientation === 'landscape'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                A4 ল্যান্ডস্কেপ
              </button>
              <button
                type="button"
                onClick={() => setOrientation('thermal')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  orientation === 'thermal'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                POS রসিদ
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition"
                title="জুম আউট"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1 text-stone-700 min-w-[36px] text-center">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="p-1 text-stone-600 hover:text-stone-900 hover:bg-white rounded transition"
                title="জুম ইন"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Trigger */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'প্রস্তুত হচ্ছে...' : 'প্রিন্ট / PDF'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Canvas Preview Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-stone-200/80">
          <div
            id={contentId}
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className={`bg-white shadow-xl rounded-sm text-stone-900 print:shadow-none print:m-0 ${
              orientation === 'thermal'
                ? 'w-[320px] p-4 text-xs'
                : orientation === 'landscape'
                ? 'w-[1040px] min-h-[720px] p-8'
                : 'w-[800px] min-h-[1100px] p-8 sm:p-12'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

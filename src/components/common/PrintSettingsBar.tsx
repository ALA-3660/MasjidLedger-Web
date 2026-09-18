import React from 'react';
import { Printer, FileDown, Sliders, CheckSquare, Square, Download, X } from 'lucide-react';

export interface PrintSettingsBarProps {
  includeLetterhead: boolean;
  onToggleLetterhead: (include: boolean) => void;
  onPrint: () => void;
  onPdf?: () => void;
  onExcel?: () => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  pageSize?: 'A4' | 'POS_80' | 'POS_58';
  orientation?: 'portrait' | 'landscape';
  onChangeOrientation?: (orientation: 'portrait' | 'landscape') => void;
  className?: string;
}

export const PrintSettingsBar: React.FC<PrintSettingsBarProps> = ({
  includeLetterhead,
  onToggleLetterhead,
  onPrint,
  onPdf,
  onExcel,
  onClose,
  title = 'প্রিন্ট সেটিংস',
  subtitle,
  pageSize = 'A4',
  orientation = 'portrait',
  onChangeOrientation,
  className = '',
}) => {
  const handlePdfClick = () => {
    if (onPdf) {
      onPdf();
    } else {
      // Default browser print will offer "Save as PDF"
      onPrint();
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-4 bg-slate-900 text-white rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 font-sans print:hidden ${className}`}
    >
      {/* Title & Info */}
      <div className="flex items-center space-x-2.5">
        <div className="p-2 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-400">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold font-siliguri flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-emerald-400">
              {pageSize} {orientation === 'landscape' ? 'ল্যান্ডস্কেপ' : 'পোর্ট্রেট'}
            </span>
          </h4>
          {subtitle && <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>}
        </div>
      </div>

      {/* Settings & Action Controls */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Mandatory Letterhead Toggle Checkbox */}
        <label
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold font-siliguri cursor-pointer transition select-none ${
            includeLetterhead
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 hover:bg-emerald-600/30'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
          title="প্রিন্টে মসজিদের অফিসিয়াল লেটারহেড থাকবে কিনা নির্ধারণ করুন"
        >
          <input
            type="checkbox"
            checked={includeLetterhead}
            onChange={(e) => onToggleLetterhead(e.target.checked)}
            className="sr-only"
          />
          {includeLetterhead ? (
            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span>{includeLetterhead ? '☑ লেটারহেডসহ প্রিন্ট' : '☐ লেটারহেড ছাড়া প্রিন্ট'}</span>
        </label>

        {/* Orientation Toggle (if callback provided) */}
        {onChangeOrientation && (
          <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-[11px] font-siliguri font-bold">
            <button
              type="button"
              onClick={() => onChangeOrientation('portrait')}
              className={`px-2 py-1 rounded-lg transition ${
                orientation === 'portrait'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              পোর্ট্রেট
            </button>
            <button
              type="button"
              onClick={() => onChangeOrientation('landscape')}
              className={`px-2 py-1 rounded-lg transition ${
                orientation === 'landscape'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ল্যান্ডস্কেপ
            </button>
          </div>
        )}

        {/* Excel Export (optional) */}
        {onExcel && (
          <button
            type="button"
            onClick={onExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-siliguri rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            title="এক্সেল ফাইল (.xlsx) হিসেবে ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>
        )}

        {/* PDF Download Button */}
        <button
          type="button"
          onClick={handlePdfClick}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-siliguri rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs active:scale-95"
          title="PDF হিসেবে সেভ করতে ব্রাউজারের প্রিন্ট ডায়ালগ খুলুন"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>PDF তৈরি করুন</span>
        </button>

        {/* Direct Print Button */}
        <button
          type="button"
          onClick={onPrint}
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-siliguri rounded-xl flex items-center space-x-1.5 transition cursor-pointer shadow-xs active:scale-95"
          title="প্রিন্ট করুন"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>🖨️ প্রিন্ট</span>
        </button>

        {/* Close Button (if in modal) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer ml-1"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

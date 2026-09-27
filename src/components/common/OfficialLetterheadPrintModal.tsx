import React, { useState, useEffect } from 'react';
import { Mosque } from '../../types';
import { OfficialLetterheadPad, LetterheadBodyMode } from './OfficialLetterheadPad';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  Landmark,
  ShieldCheck,
  Eye,
  Sliders,
} from 'lucide-react';

export interface OfficialLetterheadPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  mosque?: Mosque | null;
  initialBodyMode?: LetterheadBodyMode;
}

export const OfficialLetterheadPrintModal: React.FC<OfficialLetterheadPrintModalProps> = ({
  isOpen,
  onClose,
  mosque,
  initialBodyMode = 'blank',
}) => {
  const [bodyMode, setBodyMode] = useState<LetterheadBodyMode>(initialBodyMode);
  const [showSignatureImages, setShowSignatureImages] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75, 100, 125

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active');
    } else {
      document.body.classList.remove('print-modal-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-between overflow-y-auto print-modal-portal">
      {/* ================= TOP TOOLBAR (Strictly Hidden on Print) ================= */}
      <div className="w-full bg-slate-900 border-b border-slate-700/80 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden no-print print-controls-bar shadow-xl z-20">
        {/* Left: Title & Mosque Badge */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-600/30 border border-emerald-400/30 rounded-xl text-emerald-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm sm:text-base font-siliguri text-white">
                অফিসিয়াল A4 Letterhead প্যাড — পূর্ণাঙ্গ প্রিন্ট ও প্রিভিউ
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-baloo font-bold hidden sm:inline-block">
                A4 Portrait (210×297mm)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-tiro">
              {mosque?.nameBn || mosque?.name || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট'} • অফিশিয়াল ব্যবহারের জন্য অনুমোদিত
            </p>
          </div>
        </div>

        {/* Center: Pad Mode Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setBodyMode('blank')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              bodyMode === 'blank'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="খালি অফিসিয়াল প্যাড (হাতে বা প্রিন্টারে চিঠি লেখার জন্য)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📄 খালি প্যাড</span>
          </button>
          <button
            type="button"
            onClick={() => setBodyMode('sample_letter')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              bodyMode === 'sample_letter'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="নমুনা প্রত্যয়নপত্র সহ দেখতে"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>📝 নমুনা প্রত্যয়নপত্র</span>
          </button>
          <button
            type="button"
            onClick={() => setBodyMode('sample_notice')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              bodyMode === 'sample_notice'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="নমুনা জরুরি নোটিশ সহ দেখতে"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>📋 নমুনা নোটিশ</span>
          </button>
          <button
            type="button"
            onClick={() => setBodyMode('guidelines')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
              bodyMode === 'guidelines'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
            title="লেখার মার্জিন গাইডলাইন লাইন সহ"
          >
            <span>📏 গাইডলাইন</span>
          </button>
        </div>

        {/* Right: Signature Toggle, Zoom & Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Signature Image Toggle */}
          <button
            type="button"
            onClick={() => setShowSignatureImages(!showSignatureImages)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition-all cursor-pointer ${
              showSignatureImages
                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={showSignatureImages ? 'ডিজিটাল স্বাক্ষর প্রদর্শিত হচ্ছে (ক্লিক করে শুধু স্বাক্ষর রেখা করুন)' : 'খালি স্বাক্ষর রেখা সক্রিয় (ক্লিক করে ডিজিটাল স্বাক্ষর আনুন)'}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {showSignatureImages ? 'ডিজিটাল স্বাক্ষর: চালু' : 'স্বাক্ষর: খালি রেখা'}
            </span>
          </button>

          {/* Zoom Buttons */}
          <div className="hidden lg:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel(75)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                zoomLevel === 75 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ৭৫%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                zoomLevel === 100 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ১০০%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(125)}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                zoomLevel === 125 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ১২৫%
            </button>
          </div>

          {/* Primary Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ প্রিন্ট করুন</span>
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ================= MAIN PREVIEW VIEWPORT ================= */}
      <div className="flex-1 w-full overflow-auto p-4 sm:p-8 flex justify-center items-start print:p-0 print:m-0 print:overflow-visible bg-stone-300/40">
        <div
          className="transition-transform duration-200 origin-top flex justify-center print:transform-none"
          style={{
            transform: zoomLevel === 100 ? 'none' : `scale(${zoomLevel / 100})`,
          }}
        >
          <OfficialLetterheadPad
            id="modal-official-letterhead-sheet"
            mosque={mosque}
            bodyMode={bodyMode}
            showSignatureImages={showSignatureImages}
            className="print-modal-card"
          />
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  RotateCcw,
  Crop,
  Sparkles,
  X,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  SwitchCamera,
  ShieldCheck,
  Paperclip,
} from 'lucide-react';
import { api } from '../../lib/api';
import { NoteOcrMode, SmartNoteOcrResult } from '../../types/smartNotesTypes';

interface SmartNoteOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyOcrResult: (payload: {
    result: SmartNoteOcrResult;
    editedHtml: string;
    editedText: string;
    editedTitle: string;
    attachScannedFiles?: File[];
  }) => void;
}

interface ScannedPageItem {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  rotation: number; // 0, 90, 180, 270
  cropMarginPercent: number; // 0, 5, 10, 15 simple safe crop framing
  originalFile?: File;
}

const OCR_MODES: Array<{ value: NoteOcrMode; labelBn: string; descBn: string }> = [
  { value: 'SCAN_TO_TEXT', labelBn: '১. Scan to Text', descBn: 'কাগজের হুবহু প্লেইন টেক্সট' },
  { value: 'SCAN_TO_DOCUMENT', labelBn: '২. Scan to Document', descBn: 'হেডিং, অনুচ্ছেদ ও টেবিলসহ নথি' },
  { value: 'SCAN_AND_SUMMARIZE', labelBn: '৩. Scan & Summarize', descBn: 'মূল লেখা ও সংক্ষিপ্ত সারসংক্ষেপ' },
  { value: 'SCAN_TO_SMART_NOTE', labelBn: '৪. Scan to Smart Note', descBn: 'স্মার্ট নোট + শিরোনাম ও ক্যাটাগরি সাজেশন' },
];

async function renderTransformedImageDataUrl(item: ScannedPageItem): Promise<string> {
  if (item.mimeType === 'application/pdf') return item.dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const marginRatio = Math.min(0.25, Math.max(0, (item.cropMarginPercent || 0) / 100));
      const sx = Math.round(img.width * marginRatio);
      const sy = Math.round(img.height * marginRatio);
      const sw = Math.max(50, Math.round(img.width * (1 - marginRatio * 2)));
      const sh = Math.max(50, Math.round(img.height * (1 - marginRatio * 2)));

      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const dw = Math.round(sw * scale);
      const dh = Math.round(sh * scale);

      const rot = ((item.rotation % 360) + 360) % 360;
      const canvas = document.createElement('canvas');
      if (rot === 90 || rot === 270) {
        canvas.width = dh;
        canvas.height = dw;
      } else {
        canvas.width = dw;
        canvas.height = dh;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(item.dataUrl);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => resolve(item.dataUrl);
    img.src = item.dataUrl;
  });
}

function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): File {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mimeType });
}

export const SmartNoteOcrModal: React.FC<SmartNoteOcrModalProps> = ({
  isOpen,
  onClose,
  onApplyOcrResult,
}) => {
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [outputMode, setOutputMode] = useState<NoteOcrMode>('SCAN_TO_SMART_NOTE');
  const [customHint, setCustomHint] = useState('');
  const [attachFilesToo, setAttachFilesToo] = useState(false);

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // OCR Result state
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<SmartNoteOcrResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [editedTitle, setEditedTitle] = useState('');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setErrorMsg(null);
    stopCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('আপনার ডিভাইসে সরাসরি ক্যামেরা অ্যাক্সেস সাপোর্ট নেই। অনুগ্রহ করে গ্যালারি/ফাইল আপলোড ব্যবহার করুন।');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setErrorMsg('ক্যামেরা চালু করা যায়নি। ক্যামেরার অনুমতি (Permission) যাচাই করুন অথবা ছবি আপলোড করুন।');
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const newItem: ScannedPageItem = {
      id: `cam-${Date.now()}`,
      fileName: `camera_scan_${pages.length + 1}.jpg`,
      mimeType: 'image/jpeg',
      dataUrl,
      rotation: 0,
      cropMarginPercent: 0,
    };
    setPages((prev) => {
      const next = [...prev, newItem].slice(0, 6);
      setSelectedIdx(next.length - 1);
      return next;
    });
    stopCamera();
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const added: ScannedPageItem[] = [];

    for (const file of Array.from(fileList).slice(0, 6 - pages.length)) {
      if (!allowed.includes(file.type)) {
        setErrorMsg('শুধুমাত্র JPG, PNG, WebP বা PDF ফাইল স্ক্যান করা যাবে।');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`"${file.name}" ১০ মেগাবাইটের বড় হওয়ায় বাদ দেওয়া হয়েছে।`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      added.push({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
        rotation: 0,
        cropMarginPercent: 0,
        originalFile: file,
      });
    }

    if (added.length > 0) {
      setPages((prev) => {
        const next = [...prev, ...added].slice(0, 6);
        setSelectedIdx(next.length - 1);
        return next;
      });
    }
  };

  const rotateSelected = (delta: number) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === selectedIdx ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p
      )
    );
  };

  const cycleCropSelected = () => {
    setPages((prev) =>
      prev.map((p, idx) => {
        if (idx !== selectedIdx) return p;
        const nextCrop = p.cropMarginPercent === 0 ? 6 : p.cropMarginPercent === 6 ? 12 : 0;
        return { ...p, cropMarginPercent: nextCrop };
      })
    );
  };

  const removePage = (idxToRemove: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== idxToRemove);
      setSelectedIdx(Math.max(0, Math.min(selectedIdx, next.length - 1)));
      return next;
    });
  };

  const runOcrScan = async () => {
    if (pages.length === 0) {
      setErrorMsg('আগে ক্যামেরা দিয়ে ছবি তুলুন অথবা গ্যালারি থেকে ছবি/PDF নির্বাচন করুন।');
      return;
    }
    setErrorMsg(null);
    setScanning(true);
    try {
      const transformedFiles = await Promise.all(
        pages.map(async (p) => {
          const transformedUrl = await renderTransformedImageDataUrl(p);
          return {
            mimeType: p.mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg',
            base64Data: transformedUrl.replace(/^data:[^;]+;base64,/, ''),
            fileName: p.fileName,
          };
        })
      );

      const res = await api.ocrScanDocumentAi({
        files: transformedFiles,
        outputMode,
        customHint: customHint.trim() || undefined,
      });

      setOcrResult(res);
      setEditedTitle(res.suggestedTitle || 'স্ক্যানকৃত কাগজের নোট');
      setEditedText(
        outputMode === 'SCAN_AND_SUMMARIZE' && res.summary
          ? `${res.summary}\n\n--- মূল স্ক্যানকৃত লেখা ---\n${res.extractedText}`
          : res.extractedText
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'কাগজ OCR স্ক্যান করতে ত্রুটি হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setScanning(false);
    }
  };

  const handleApply = async () => {
    if (!ocrResult) return;
    let attachFiles: File[] | undefined;
    if (attachFilesToo && pages.length > 0) {
      attachFiles = await Promise.all(
        pages.map(async (p) => {
          if (p.originalFile && p.rotation === 0 && p.cropMarginPercent === 0) {
            return p.originalFile;
          }
          const finalUrl = await renderTransformedImageDataUrl(p);
          const mime = p.mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg';
          return dataUrlToFile(finalUrl, p.fileName, mime);
        })
      );
    }

    const htmlFromEdited =
      editedText.trim() === ocrResult.extractedText.trim() && ocrResult.formattedHtml
        ? ocrResult.formattedHtml
        : editedText
            .split(/\n{2,}/)
            .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
            .join('');

    onApplyOcrResult({
      result: ocrResult,
      editedHtml: htmlFromEdited,
      editedText,
      editedTitle: editedTitle.trim() || ocrResult.suggestedTitle,
      attachScannedFiles: attachFiles,
    });
    setPages([]);
    setOcrResult(null);
    setEditedText('');
    setEditedTitle('');
    onClose();
  };

  if (!isOpen) return null;

  const activePage = pages[selectedIdx] || null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden font-siliguri">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] to-[#0f766e] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">📷 ক্যামেরা স্ক্যানার ও AI OCR (কাগজ থেকে নোট)</h3>
              <p className="text-[11px] text-emerald-100 font-tiro">
                হাতে লেখা বা ছাপা কাগজ, দলিল, নোটিশ বা PDF থেকে নির্ভুল বাংলা-ইংরেজি টেক্সট ও স্মার্ট নোট
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Capture / Upload Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>ক্যামেরা দিয়ে ছবি তুলুন</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>গ্যালারি / PDF আপলোড (সর্বোচ্চ ৬টি)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            <span className="text-xs font-baloo font-bold text-slate-600">
              নির্বাচিত পৃষ্ঠা: {pages.length.toLocaleString('bn-BD')} / ৬
            </span>
          </div>

          {/* Live Camera View */}
          {cameraOpen && (
            <div className="bg-slate-900 rounded-2xl p-3 space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black max-h-[340px] flex items-center justify-center">
                <video ref={videoRef} playsInline muted className="w-full max-h-[340px] object-contain" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>ছবি ক্যাপচার করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
                    setFacingMode(nextMode);
                    startCamera(nextMode);
                  }}
                  className="px-3.5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <SwitchCamera className="w-4 h-4" />
                  <span>ক্যামেরা বদলান</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  ক্যামেরা বন্ধ
                </button>
              </div>
            </div>
          )}

          {/* 4 Output Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {OCR_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setOutputMode(m.value)}
                className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  outputMode === m.value
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">{m.labelBn}</div>
                <div className="text-[11px] text-slate-500 font-tiro mt-0.5">{m.descBn}</div>
              </button>
            ))}
          </div>

          {/* Safety Policy Notice */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-xl text-[11px] font-tiro">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              দলিল নম্বর, জমির দাগ/খতিয়ান, তারিখ ও টাকার অঙ্ক AI কখনো অনুমান করে বদলাবে না; অস্পষ্ট অংশ [অস্পষ্ট] হিসেবে চিহ্নিত থাকবে। প্রয়োগের আগে মূল ছবির সাথে মিলিয়ে নিন।
            </span>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Side-by-Side Workspace: Left = Scanned Image Preview + Rotate/Crop; Right = Extracted Editable Result */}
          <div className={`grid gap-4 ${ocrResult ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Left: Original Scanned Image Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">মূল স্ক্যান করা ছবি / ডকুমেন্ট প্রিভিউ</span>
                {activePage && activePage.mimeType !== 'application/pdf' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => rotateSelected(-90)}
                      title="বামে ৯০° ঘোরান"
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotateSelected(90)}
                      title="ডানে ৯০° ঘোরান"
                      className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cycleCropSelected}
                      title="প্রান্ত ক্রপ (Crop Margin) পরিবর্তন করুন"
                      className={`px-2 py-1 border rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                        activePage.cropMarginPercent > 0
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>ক্রপ {activePage.cropMarginPercent > 0 ? `(${activePage.cropMarginPercent}%)` : ''}</span>
                    </button>
                  </div>
                )}
              </div>

              {activePage ? (
                <div className="bg-white border border-slate-200 rounded-xl p-2 min-h-[240px] max-h-[380px] overflow-auto flex items-center justify-center relative">
                  {activePage.mimeType === 'application/pdf' ? (
                    <div className="text-center p-6 space-y-2">
                      <FileText className="w-12 h-12 text-rose-600 mx-auto" />
                      <div className="text-sm font-bold text-slate-800">{activePage.fileName}</div>
                      <div className="text-xs text-slate-500">PDF ডকুমেন্ট OCR বিশ্লেষণের জন্য প্রস্তুত</div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden flex items-center justify-center">
                      <img
                        src={activePage.dataUrl}
                        alt={activePage.fileName}
                        style={{
                          transform: `rotate(${activePage.rotation}deg)`,
                          clipPath:
                            activePage.cropMarginPercent > 0
                              ? `inset(${activePage.cropMarginPercent}%)`
                              : undefined,
                        }}
                        className="max-h-[340px] object-contain transition-transform duration-200"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500 space-y-2 bg-white">
                  <Camera className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">এখনো কোনো ছবি বা PDF যুক্ত করা হয়নি</p>
                  <p className="text-[11px] font-tiro">উপরের বাটন থেকে ক্যামেরা চালু করুন বা গ্যালারি থেকে কাগজের ছবি নির্বাচন করুন</p>
                </div>
              )}

              {/* Thumbnails Strip */}
              {pages.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {pages.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedIdx(idx)}
                      className={`relative shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden cursor-pointer flex items-center justify-center bg-white ${
                        idx === selectedIdx ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200'
                      }`}
                    >
                      {p.mimeType === 'application/pdf' ? (
                        <FileText className="w-6 h-6 text-rose-600" />
                      ) : (
                        <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePage(idx);
                        }}
                        className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Hint */}
              <input
                type="text"
                value={customHint}
                onChange={(e) => setCustomHint(e.target.value)}
                placeholder="ঐচ্ছিক নির্দেশনা (যেমন: জমির খতিয়ান নম্বরগুলো টেবিলে সাজাও)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-emerald-500 font-tiro"
              />
            </div>

            {/* Right: Extracted Editable Text & Suggestions */}
            {ocrResult && (
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-3.5 space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>এক্সট্র্যাক্ট করা লেখা (সম্পাদনাযোগ্য)</span>
                  </span>
                  <span className="text-[10px] font-baloo bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    {ocrResult.modelUsed}
                  </span>
                </div>

                {/* Suggested Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">প্রস্তাবিত শিরোনাম</label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">সাজেস্টেড ক্যাটাগরি</label>
                    <div className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-bold text-emerald-900">
                      🏷️ {ocrResult.suggestedCategoryNameBn}
                    </div>
                  </div>
                </div>

                <textarea
                  rows={11}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full flex-1 p-3 rounded-xl border border-emerald-300 bg-white text-sm font-tiro leading-relaxed text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y"
                />

                {ocrResult.warningNoteBn && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    ⚠️ {ocrResult.warningNoteBn}
                  </p>
                )}

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachFilesToo}
                    onChange={(e) => setAttachFilesToo(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700 rounded"
                  />
                  <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                  <span>মূল স্ক্যান করা ছবিটি নোটের ফাইল অ্যাটাচমেন্ট হিসেবেও সংরক্ষণ করুন</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={scanning || pages.length === 0}
            onClick={runOcrScan}
            className="px-5 py-2.5 bg-gradient-to-r from-[#064e3b] to-[#0f766e] hover:from-[#065f46] hover:to-[#0d9488] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gemini Vision দিয়ে কাগজ পড়া হচ্ছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>✨ AI OCR বিশ্লেষণ করুন</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              বাতিল
            </button>
            {ocrResult && (
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>নোটে প্রয়োগ করুন</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

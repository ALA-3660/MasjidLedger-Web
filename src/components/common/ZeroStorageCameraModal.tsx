import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ZeroStorageCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleBn: string;
  subtitleBn?: string;
  accentColor?: 'emerald' | 'rose' | 'indigo';
  allowPdfFallback?: boolean;
  onCaptureConfirm: (payload: {
    base64: string;
    mimeType: string;
    source: 'CAMERA' | 'FILE';
  }) => Promise<void>;
}

function compressDataUrlToJpegBase64(dataUrl: string, maxDim = 1440): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => {
      const idx = dataUrl.indexOf(',');
      resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
    };
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const idx = dataUrl.indexOf(',');
        resolve(idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Clear ephemeral canvas pixels immediately
      ctx.clearRect(0, 0, width, height);
      canvas.width = 0;
      canvas.height = 0;
      const idx = jpegUrl.indexOf(',');
      resolve(idx >= 0 ? jpegUrl.slice(idx + 1) : jpegUrl);
    };
    img.src = dataUrl;
  });
}

export const ZeroStorageCameraModal: React.FC<ZeroStorageCameraModalProps> = ({
  isOpen,
  onClose,
  titleBn,
  subtitleBn = 'সরাসরি ক্যামেরায় তুলুন বা অস্থায়ী ফাইল বাছাই করুন — প্রক্রিয়া শেষে ছবি সম্পূর্ণ মুছে যাবে।',
  accentColor = 'emerald',
  allowPdfFallback = false,
  onCaptureConfirm,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'INIT' | 'READY' | 'DENIED' | 'UNAVAILABLE'>('INIT');
  const [cameraErrorBn, setCameraErrorBn] = useState<string>('');
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [capturedMimeType, setCapturedMimeType] = useState<string>('image/jpeg');
  const [capturedSource, setCapturedSource] = useState<'CAMERA' | 'FILE'>('CAMERA');
  const [capturedPdfBase64, setCapturedPdfBase64] = useState<string | null>(null);
  const [lowLightWarning, setLowLightWarning] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
  }, []);

  const clearVolatileMemory = useCallback(() => {
    setCapturedPreviewUrl(null);
    setCapturedPdfBase64(null);
    setLowLightWarning(false);
    setProcessError(null);
    if (canvasRef.current) {
      const c = canvasRef.current;
      const ctx = c.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      c.width = 0;
      c.height = 0;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setCameraErrorBn('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('UNAVAILABLE');
      setCameraErrorBn('এই ব্রাউজারে সরাসরি ক্যামেরা সমর্থিত নয়। নিচের ফাইল/গ্যালারি বাটন ব্যবহার করুন।');
      return;
    }

    setCameraState('INIT');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState('READY');
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        setCameraState('DENIED');
        setCameraErrorBn(
          'ক্যামেরা ব্যবহারের অনুমতি পাওয়া যায়নি। ব্রাউজার সেটিংস থেকে ক্যামেরা Allow করুন, অথবা নিচের গ্যালারি/ছবি স্ক্যান কিংবা ম্যানুয়াল/টেক্সট এন্ট্রি ব্যবহার করুন।'
        );
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCameraState('UNAVAILABLE');
        setCameraErrorBn(
          'ক্যামেরাটি অন্য কোনো অ্যাপে চালু রয়েছে বা সাড়া দিচ্ছে না। গ্যালারি থেকে ছবি বাছাই করুন অথবা ম্যানুয়াল/টেক্সট এন্ট্রিতে ফিরে যান।'
        );
      } else {
        setCameraState('UNAVAILABLE');
        setCameraErrorBn(
          'ডিভাইসে ক্যামেরা চালু করা যায়নি (সম্ভবত ওয়েবক্যাম সংযুক্ত নেই)। নিচের বাটন থেকে গ্যালারির ছবি দিয়েও জিরো-স্টোরেজ স্ক্যান করতে পারবেন অথবা ম্যানুয়াল এন্ট্রি চালু রাখুন।'
        );
      }
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      clearVolatileMemory();
      return;
    }
    if (!capturedPreviewUrl && !capturedPdfBase64) {
      startCamera();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, capturedPreviewUrl, capturedPdfBase64, startCamera, stopStream, clearVolatileMemory]);

  const handleClose = () => {
    if (isProcessing) return;
    stopStream();
    clearVolatileMemory();
    onClose();
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setProcessError('ক্যামেরা ফ্রেম এখনো প্রস্তুত হয়নি। অনুগ্রহ করে এক মুহূর্ত অপেক্ষা করুন।');
      return;
    }

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const maxDim = 1440;
    let width = vw;
    let height = vh;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    // Quick ephemeral low-light brightness check before clearing canvas
    let isDim = false;
    try {
      const sample = ctx.getImageData(0, 0, Math.min(width, 160), Math.min(height, 120)).data;
      let sumLum = 0;
      let count = 0;
      for (let i = 0; i < sample.length; i += 16) {
        sumLum += 0.299 * sample[i] + 0.587 * sample[i + 1] + 0.114 * sample[i + 2];
        count++;
      }
      if (count > 0 && sumLum / count < 55) {
        isDim = true;
      }
    } catch {
      // ignore luminance sampling errors
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    ctx.clearRect(0, 0, width, height);
    canvas.width = 0;
    canvas.height = 0;

    stopStream();
    setCapturedMimeType('image/jpeg');
    setCapturedSource('CAMERA');
    setCapturedPdfBase64(null);
    setCapturedPreviewUrl(dataUrl);
    setLowLightWarning(isDim);
    setProcessError(null);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isImage && !(allowPdfFallback && isPdf)) {
      setProcessError(
        allowPdfFallback
          ? 'অনুগ্রহ করে পরিষ্কার ছবি (JPG/PNG/WEBP) অথবা PDF ফাইল বাছাই করুন।'
          : 'অনুগ্রহ করে রসিদ বা বিলের একটি পরিষ্কার ছবি (JPG/PNG/WEBP) বাছাই করুন।'
      );
      return;
    }

    stopStream();
    setProcessError(null);

    const reader = new FileReader();
    reader.onerror = () => setProcessError('ফাইলটি পড়া যায়নি। অনুগ্রহ করে অন্য একটি স্পষ্ট ছবি চেষ্টা করুন।');
    reader.onload = () => {
      const raw = String(reader.result || '');
      if (isPdf) {
        const idx = raw.indexOf(',');
        setCapturedPdfBase64(idx >= 0 ? raw.slice(idx + 1) : raw);
        setCapturedPreviewUrl(null);
        setCapturedMimeType('application/pdf');
        setCapturedSource('FILE');
      } else {
        setCapturedPdfBase64(null);
        setCapturedPreviewUrl(raw);
        setCapturedMimeType(file.type || 'image/jpeg');
        setCapturedSource('FILE');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmExtract = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessError(null);

    let tempBase64 = '';
    try {
      if (capturedPdfBase64) {
        tempBase64 = capturedPdfBase64;
      } else if (capturedPreviewUrl) {
        tempBase64 = await compressDataUrlToJpegBase64(capturedPreviewUrl, 1440);
      }
      if (!tempBase64) {
        throw new Error('স্ক্যান করার মতো কোনো ছবি পাওয়া যায়নি।');
      }

      await onCaptureConfirm({
        base64: tempBase64,
        mimeType: capturedPdfBase64 ? 'application/pdf' : 'image/jpeg',
        source: capturedSource,
      });

      // Zero-storage cleanup immediately after extraction completes
      tempBase64 = '';
      clearVolatileMemory();
      stopStream();
      onClose();
    } catch (err: any) {
      tempBase64 = '';
      setProcessError(err?.message || 'ছবি থেকে তথ্য পড়া যায়নি। অনুগ্রহ করে পর্যাপ্ত আলোতে পরিষ্কার ছবি তুলে আবার চেষ্টা করুন।');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const accentBg =
    accentColor === 'rose'
      ? 'from-rose-700 to-red-900'
      : accentColor === 'indigo'
      ? 'from-indigo-700 to-slate-900'
      : 'from-emerald-700 to-teal-900';

  const primaryBtn =
    accentColor === 'rose'
      ? 'bg-rose-700 hover:bg-rose-800'
      : accentColor === 'indigo'
      ? 'bg-indigo-700 hover:bg-indigo-800'
      : 'bg-emerald-700 hover:bg-emerald-800';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[94vh] font-siliguri">
        {/* Header */}
        <div className={`px-5 py-3.5 bg-gradient-to-r ${accentBg} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold truncate">{titleBn}</h3>
              <p className="text-[11px] text-white/85 font-tiro truncate">{subtitleBn}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg hover:bg-white/15 text-white/85 hover:text-white transition"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zero-Storage Privacy Guarantee Strip */}
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-900 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            জিরো-স্টোরেজ নীতি: এই ছবি/স্ক্যান সার্ভার বা ডাটাবেসে স্থায়ীভাবে সেভ হবে না; তথ্য পড়ার সাথে সাথেই মেমোরি থেকে মুছে যাবে।
          </span>
        </div>

        {/* Camera / Preview Area */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50">
          <input
            ref={fileInputRef}
            type="file"
            accept={allowPdfFallback ? 'image/*,application/pdf' : 'image/*'}
            onChange={handleFilePick}
            className="hidden"
          />
          <canvas ref={canvasRef} className="hidden" />

          {processError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{processError}</span>
            </div>
          )}

          {/* Captured Preview */}
          {capturedPreviewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-900 flex items-center justify-center max-h-[360px]">
                <img
                  src={capturedPreviewUrl}
                  alt="অস্থায়ী স্ক্যান প্রিভিউ"
                  className="max-h-[360px] w-auto object-contain"
                />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-bold">
                  অস্থায়ী মেমোরি প্রিভিউ
                </span>
              </div>

              {lowLightWarning && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2 font-tiro">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    আলো কিছুটা কম মনে হচ্ছে — লেখা ঝাপসা হলে পর্যাপ্ত আলোতে পুনরায় ছবি তুলুন অথবা স্ক্যান করে প্রিভিউ ভালোভাবে যাচাই করুন।
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    clearVolatileMemory();
                    startCamera();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>পুনরায় ছবি তুলুন</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmExtract}
                  className={`px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition disabled:opacity-60 ${primaryBtn}`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>তথ্য বিশ্লেষণ হচ্ছে (ছবি সেভ ছাড়াই)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>তথ্য বের করে প্রিভিউ দেখান</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : capturedPdfBase64 ? (
            <div className="p-6 rounded-2xl border-2 border-dashed border-emerald-300 bg-white text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">PDF নথি অস্থায়ীভাবে লোড হয়েছে</h4>
                <p className="text-xs text-slate-500 mt-1 font-tiro">
                  তথ্য বের করার পর ফাইলটি মেমোরি থেকে পরিষ্কার করে দেওয়া হবে।
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    clearVolatileMemory();
                    startCamera();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold"
                >
                  বাতিল / পরিবর্তন
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmExtract}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 ${primaryBtn}`}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isProcessing ? 'পড়া হচ্ছে...' : 'তথ্য বের করে প্রিভিউ দেখান'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera View */
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] max-h-[340px] w-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${cameraState === 'READY' ? 'block' : 'hidden'}`}
                />

                {cameraState === 'READY' && (
                  <div className="pointer-events-none absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-xl flex items-end justify-center pb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-950/70 text-emerald-200 text-[10px] font-semibold">
                      পর্যাপ্ত আলোতে নথি বা রসিদটি ফ্রেমের ভেতরে রাখুন
                    </span>
                  </div>
                )}

                {cameraState === 'INIT' && (
                  <div className="text-center text-slate-300 space-y-2 p-6">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                    <p className="text-xs font-medium">ক্যামেরা চালু হচ্ছে...</p>
                  </div>
                )}

                {(cameraState === 'DENIED' || cameraState === 'UNAVAILABLE') && (
                  <div className="text-center text-slate-200 space-y-3 p-6 max-w-md">
                    <AlertCircle className="w-9 h-9 text-amber-400 mx-auto" />
                    <p className="text-xs leading-relaxed font-tiro">{cameraErrorBn}</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>পুনরায় ক্যামেরা চেষ্টা</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{allowPdfFallback ? 'ছবি / PDF বাছাই করুন' : 'গ্যালারি থেকে ছবি নিন'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-bold"
                      >
                        ম্যানুয়াল / টেক্সট এন্ট্রিতে ফিরুন
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>ক্যামেরা বদলান</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{allowPdfFallback ? 'গ্যালারি / PDF' : 'গ্যালারি থেকে ছবি'}</span>
                  </button>
                </div>

                {cameraState === 'READY' && (
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md ${primaryBtn}`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>ছবি তুলুন</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

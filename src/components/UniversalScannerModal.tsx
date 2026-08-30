import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  RotateCw,
  Flashlight,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Search,
  Zap,
  HelpCircle,
  Smartphone,
  Keyboard,
  Layers,
  ArrowRight,
  History,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { User, Mosque } from '../types';
import { Language } from '../lib/i18n';
import { ResolvedRecordItem } from '../types/qrBarcodeTypes';
import {
  QrScanResult,
  parseQrCode,
  checkUserPermissionForScan,
  playScanSuccessSound,
  playScanErrorSound,
  triggerHapticFeedback,
  MODULE_ACTIONS,
} from '../services/qrBarcodeService';

export interface RecentScanItem {
  id: string;
  code: string;
  type: 'ACTION' | 'RECORD' | 'UNKNOWN';
  titleBn: string;
  titleEn?: string;
  timestamp: number;
  timeFormatted: string;
}

interface UniversalScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentMosque?: Mosque | null;
  language?: Language;
  onNavigateToTarget: (result: QrScanResult) => void;
  onOpenActionCardHub?: () => void;
  onOpenRecordAction?: (recordItem: ResolvedRecordItem) => void;
  resolveRecord?: (code: string) => ResolvedRecordItem | null;
}

const RECENT_SCANS_STORAGE_KEY = 'masjidledger_recent_scans';

export const UniversalScannerModal: React.FC<UniversalScannerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentMosque,
  language = 'bn',
  onNavigateToTarget,
  onOpenActionCardHub,
  onOpenRecordAction,
  resolveRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'history'>('camera');
  const [cameraState, setCameraState] = useState<'INIT' | 'RUNNING' | 'ERROR' | 'DENIED' | 'NOT_SUPPORTED'>('INIT');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualInput, setManualInput] = useState<string>('');
  const [scanResult, setScanResult] = useState<QrScanResult | null>(null);
  const [resolvedRecordItem, setResolvedRecordItem] = useState<ResolvedRecordItem | null>(null);
  const [permissionCheck, setPermissionCheck] = useState<{ allowed: boolean; reasonBn?: string; reasonEn?: string }>({ allowed: true });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Load Recent Scans on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SCANS_STORAGE_KEY);
      if (stored) {
        setRecentScans(JSON.parse(stored));
      }
    } catch {
      // ignore parsing error
    }
  }, []);

  const saveRecentScan = useCallback((result: QrScanResult, title: string) => {
    if (!result.code || result.type === 'UNKNOWN') return;
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    
    const newEntry: RecentScanItem = {
      id: `${Date.now()}-${result.code}`,
      code: result.code,
      type: result.type,
      titleBn: title,
      titleEn: result.actionTitleEn,
      timestamp: Date.now(),
      timeFormatted,
    };

    setRecentScans((prev) => {
      const filtered = prev.filter((p) => p.code !== result.code);
      const updated = [newEntry, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const clearRecentScans = () => {
    setRecentScans([]);
    try {
      localStorage.removeItem(RECENT_SCANS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Stop camera media tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Handle successful code capture
  const handleCodeDetected = useCallback((rawCode: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const parsed = parseQrCode(rawCode);
    const perm = checkUserPermissionForScan(parsed, currentUser);
    
    setScanResult(parsed);
    setPermissionCheck(perm);

    let resolvedItem: ResolvedRecordItem | null = null;
    if (parsed.type === 'RECORD' && resolveRecord) {
      resolvedItem = resolveRecord(parsed.code || rawCode);
      setResolvedRecordItem(resolvedItem);
    } else {
      setResolvedRecordItem(null);
    }

    // Save to Recent Scans
    const scanTitle = resolvedItem?.titleBn || parsed.actionTitleBn || parsed.code;
    saveRecentScan(parsed, scanTitle);

    if (soundEnabled) {
      if (parsed.type !== 'UNKNOWN' && perm.allowed) {
        playScanSuccessSound();
      } else {
        playScanErrorSound();
      }
    }
    triggerHapticFeedback([80, 50, 80]);

    // Freeze camera scanning loop temporarily
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  }, [isProcessing, currentUser, soundEnabled, resolveRecord, saveRecentScan]);

  // Frame processing loop with jsQR & BarcodeDetector fallback
  const scanVideoFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 1. Scan using jsQR
    try {
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (qrCode && qrCode.data) {
        handleCodeDetected(qrCode.data);
        return;
      }
    } catch {
      // jsQR frame error
    }

    // 2. Scan using window.BarcodeDetector if available (for 1D barcodes)
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'qr_code', 'ean_13', 'code_39', 'data_matrix'],
        });
        barcodeDetector.detect(canvas).then((barcodes: any[]) => {
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleCodeDetected(barcodes[0].rawValue);
          } else {
            animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
          }
        }).catch(() => {
          animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
        });
        return;
      } catch {
        // BarcodeDetector error fallback
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
  }, [handleCodeDetected]);

  // Initialize and start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState('INIT');
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('NOT_SUPPORTED');
      setErrorMessage(
        language === 'bn'
          ? 'আপনার ব্রাউজার বা ডিভাইসে ক্যামেরা স্ক্যানিং সমর্থিত নয়। অনুগ্রহ করে ম্যানুয়াল ইনপুট ব্যবহার করুন।'
          : 'Camera access is not supported on this browser/device. Please use manual code entry.'
      );
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack.getCapabilities as any) === 'function') {
        const caps = (videoTrack.getCapabilities as any)();
        if (caps && caps.torch) {
          setHasTorch(true);
        }
      }

      setCameraState('RUNNING');
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('DENIED');
        setErrorMessage(
          language === 'bn'
            ? 'ক্যামেরা ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে ক্যামেরার পারমিশন দিন।'
            : 'Camera permission denied. Please allow camera access in your browser settings.'
        );
      } else {
        setCameraState('ERROR');
        setErrorMessage(
          language === 'bn'
            ? 'ক্যামেরা চালু করা সম্ভব হয়নি। অন্য কোনো অ্যাপে ক্যামেরা চালু আছে কিনা পরীক্ষা করুন।'
            : 'Could not initialize camera stream. Ensure no other application is using the camera.'
        );
      }
    }
  }, [facingMode, language, scanVideoFrame, stopCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !isTorchOn;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch constraint error:', e);
    }
  };

  // Flip Camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Reset scan state and resume video scanning
  const handleResumeScanning = () => {
    setScanResult(null);
    setIsProcessing(false);
    setManualInput('');
    if (activeTab === 'camera') {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  // Execute manual code submission
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualInput.trim()) return;
    handleCodeDetected(manualInput.trim());
  };

  // Dispatch navigation to target record/module
  const handleExecuteAction = () => {
    if (!scanResult) return;
    if (!permissionCheck.allowed) return;

    if (scanResult.type === 'RECORD' && onOpenRecordAction) {
      if (resolvedRecordItem) {
        onOpenRecordAction(resolvedRecordItem);
        onClose();
        return;
      } else if (resolveRecord) {
        const resolved = resolveRecord(scanResult.code || scanResult.raw);
        if (resolved) {
          onOpenRecordAction(resolved);
          onClose();
          return;
        }
      }
    }

    onNavigateToTarget(scanResult);
    onClose();
  };

  // Lifecycle listeners
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-universal-scanner"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in print:hidden"
    >
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base flex items-center gap-1.5 font-siliguri">
                <span>{language === 'bn' ? 'ইউনিভার্সাল QR ও বারকোড স্ক্যানার' : 'Universal QR & Barcode Scanner'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-baloo">
                {language === 'bn'
                  ? 'ভাউচার, রশিদ, দানবাক্স, সম্পদ ও অ্যাকশন কোড স্ক্যান করুন'
                  : 'Scan receipts, vouchers, assets, burial plots and action cards'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-scanner-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Controls Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
          {/* Mode Switcher */}
          <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold font-siliguri">
            <button
              id="tab-scanner-camera"
              type="button"
              onClick={() => {
                setActiveTab('camera');
                handleResumeScanning();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'bn' ? 'ক্যামেরা স্ক্যান' : 'Camera'}</span>
            </button>
            <button
              id="tab-scanner-manual"
              type="button"
              onClick={() => {
                setActiveTab('manual');
                stopCamera();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'bn' ? 'ম্যানুয়াল ইনপুট' : 'Manual'}</span>
            </button>
            <button
              id="tab-scanner-history"
              type="button"
              onClick={() => {
                setActiveTab('history');
                stopCamera();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'bn' ? 'স্ক্যান হিস্ট্রি' : 'History'}</span>
              {recentScans.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-800 text-[10px] flex items-center justify-center font-mono">
                  {recentScans.length}
                </span>
              )}
            </button>
          </div>

          {/* Camera Quick Controls */}
          <div className="flex items-center space-x-1">
            {activeTab === 'camera' && cameraState === 'RUNNING' && (
              <>
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    title="ফ্ল্যাশলাইট"
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isTorchOn
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  title="ক্যামেরা পরিবর্তন করুন"
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'সাউন্ড বন্ধ করুন' : 'সাউন্ড চালু করুন'}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-siliguri">
          {/* A. CAMERA VIEWPORT */}
          {activeTab === 'camera' && !scanResult && (
            <div className="relative w-full aspect-square max-h-[340px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Active Overlay Box */}
              {cameraState === 'RUNNING' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                  {/* Targeting Reticle Frame */}
                  <div className="relative w-56 h-56 border-2 border-blue-400/60 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
                    {/* Corner Accent Marks */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />

                    {/* Animated Laser Scan Bar */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                  </div>

                  <p className="mt-4 text-xs font-semibold text-white/90 bg-slate-900/80 px-3 py-1 rounded-full border border-white/20 backdrop-blur-xs font-siliguri">
                    {language === 'bn' ? 'QR কোড বা বারকোড ফ্রেমে ধরুন' : 'Align QR / Barcode inside the box'}
                  </p>
                </div>
              )}

              {/* Loading / Error States */}
              {cameraState === 'INIT' && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-2">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold font-siliguri">{language === 'bn' ? 'ক্যামেরা চালু হচ্ছে...' : 'Initializing Camera...'}</p>
                </div>
              )}

              {(cameraState === 'DENIED' || cameraState === 'ERROR' || cameraState === 'NOT_SUPPORTED') && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold font-siliguri max-w-xs text-rose-200">{errorMessage}</p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Retry'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {language === 'bn' ? 'ম্যানুয়াল টাইপ করুন' : 'Enter Manually'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* B. MANUAL INPUT TAB */}
          {activeTab === 'manual' && !scanResult && (
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 font-siliguri">
                    {language === 'bn' ? 'কোড বা ভাউচার/রশিদ রেফারেন্স লিখুন:' : 'Enter Code or Voucher Reference:'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id="input-manual-scanner-code"
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="e.g. REC-2026-000106, AST-GEN-01, ACT-INC-NEW"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        autoFocus
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    <button
                      id="btn-submit-manual-code"
                      type="submit"
                      disabled={!manualInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer font-siliguri"
                    >
                      <span>{language === 'bn' ? 'যাচাই করুন' : 'Verify'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Quick Test Codes Simulation Grid */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === 'bn' ? 'দ্রুত পরীক্ষামূলক কোড (Quick Test Sample):' : 'Quick Test Codes:'}</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { code: 'AST-GEN-01', label: 'জেনারেটর (Asset AST-GEN-01)' },
                    { code: 'AST-MIC-01', label: 'মাইক সেট (Asset AST-MIC-01)' },
                    { code: 'PROP-WAQF-01', label: 'ওয়াকফ মার্কেট (WPF-SHOP-01)' },
                    { code: 'STF-01', label: 'প্রধান ইমাম (Staff STF-01)' },
                    { code: 'AP-2026-001', label: 'অ্যাকশন প্ল্যান (Plan AP-001)' },
                    { code: 'CBR-2026-0001', label: 'কবরস্থান (Plot CEM-A-01)' },
                    { code: 'BOX-MAIN-01', label: 'প্রধান দানবাক্স (Box-01)' },
                    { code: 'INC-2026-000001', label: 'আয় রশিদ (Income REC-01)' },
                    { code: 'EXP-2026-000001', label: 'ব্যয় ভাউচার (Expense EXP-01)' },
                    { code: 'ACT-INC-NEW', label: 'আয় এন্ট্রি অ্যাকশন (Action)' },
                    { code: 'ACT-EXP-NEW', label: 'ব্যয় এন্ট্রি অ্যাকশন (Action)' },
                    { code: 'ACT-BOX-COLLECT', label: 'দানবাক্স গণনা (Action)' },
                  ].map((sample) => (
                    <button
                      key={sample.code}
                      type="button"
                      onClick={() => {
                        setManualInput(sample.code);
                        handleCodeDetected(sample.code);
                      }}
                      className="text-left p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 transition-all text-xs cursor-pointer group"
                    >
                      <span className="font-mono font-bold text-blue-700 group-hover:text-blue-900 block">
                        {sample.code}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {sample.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* C. SCAN HISTORY TAB */}
          {activeTab === 'history' && !scanResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-siliguri">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>{language === 'bn' ? 'সাম্প্রতিক স্ক্যানের তালিকা' : 'Recent Scan History'}</span>
                </h4>
                {recentScans.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRecentScans}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer font-siliguri"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ইতিহাস মুছুন' : 'Clear'}</span>
                  </button>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500 font-siliguri">
                    {language === 'bn' ? 'এখনো কোনো স্ক্যান হিস্ট্রি নেই।' : 'No scan history recorded yet.'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-siliguri">
                    {language === 'bn' ? 'ক্যামেরা দিয়ে স্ক্যান বা কোড এন্ট্রি করলে এখানে সংরক্ষিত থাকবে।' : 'Scanned QR and Barcode logs will appear here for fast re-access.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {recentScans.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl transition-all flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            item.type === 'ACTION'
                              ? 'bg-purple-100 text-purple-700'
                              : item.type === 'RECORD'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.type === 'ACTION' ? <Zap className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-blue-700">
                              {item.code}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.timeFormatted}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 truncate font-siliguri">
                            {item.titleBn || item.code}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCodeDetected(item.code)}
                        className="shrink-0 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer font-siliguri"
                      >
                        <span>{language === 'bn' ? 'খুলুন' : 'Open'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* D. SCAN RESULT VERIFICATION & ROUTING CARD */}
          {scanResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in">
              {/* Header Status */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  {scanResult.type !== 'UNKNOWN' && permissionCheck.allowed ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                      <AlertTriangle className="w-4.5 h-4.5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm font-siliguri">
                      {scanResult.type === 'ACTION'
                        ? 'মডিউল অ্যাকশন সনাক্ত হয়েছে'
                        : scanResult.type === 'RECORD'
                        ? 'রেকর্ড সনাক্ত হয়েছে'
                        : 'অপরিচিত কোড'}
                    </h4>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {scanResult.code}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase font-mono ${
                    scanResult.type === 'ACTION'
                      ? 'bg-purple-100 text-purple-800'
                      : scanResult.type === 'RECORD'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {scanResult.prefix || 'UNKNOWN'}
                </span>
              </div>

              {/* Recognized Information */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">{language === 'bn' ? 'বিষয় / শিরোনাম:' : 'Title:'}</span>
                  <span className="font-bold text-slate-900">{scanResult.actionTitleBn || scanResult.code}</span>
                </div>
                {scanResult.targetTab && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">{language === 'bn' ? 'গন্তব্য মডিউল:' : 'Target Tab:'}</span>
                    <span className="font-semibold text-blue-700 capitalize bg-slate-100 px-2 py-0.5 rounded">
                      {scanResult.targetTab}
                    </span>
                  </div>
                )}
                {scanResult.requiredPermission && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">{language === 'bn' ? 'প্রয়োজনীয় অনুমতি:' : 'Permission:'}</span>
                    <span className="font-mono text-[10px] text-slate-600">{scanResult.requiredPermission}</span>
                  </div>
                )}
              </div>

              {/* Permission & Security Status Notice */}
              {!permissionCheck.allowed ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">{language === 'bn' ? 'অনুমতি নেই (Access Restricted)' : 'Access Restricted'}</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 font-siliguri">
                      {language === 'bn' ? permissionCheck.reasonBn : permissionCheck.reasonEn}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold font-siliguri">
                    {language === 'bn'
                      ? 'ইউজার পারমিশন যাচাই সম্পন্ন — আপনি এই অ্যাকশন সম্পন্ন করতে পারবেন।'
                      : 'Permission verified — you are authorized to access this action.'}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResumeScanning}
                  className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center font-siliguri"
                >
                  {language === 'bn' ? 'পুনরায় স্ক্যান করুন' : 'Scan Another'}
                </button>
                {permissionCheck.allowed && scanResult.type !== 'UNKNOWN' && (
                  <button
                    id="btn-scanner-execute-action"
                    type="button"
                    onClick={handleExecuteAction}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer font-siliguri"
                  >
                    <span>
                      {scanResult.type === 'RECORD'
                        ? language === 'bn'
                          ? 'অ্যাকশন স্ক্রিন খুলুন (View & Act)'
                          : 'Open Action Screen'
                        : language === 'bn'
                        ? 'সরাসরি এন্ট্রি ফর্ম খুলুন'
                        : 'Open / Execute'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Hub Quicklink */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 font-siliguri">
          {onOpenActionCardHub && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenActionCardHub();
              }}
              className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'প্রিন্টযোগ্য Action QR কার্ড সেন্টার' : 'Printable Action QR Hub'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium ml-auto cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

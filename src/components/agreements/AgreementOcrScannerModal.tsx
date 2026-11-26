import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  SwitchCamera,
  RotateCw,
  Sparkles,
  X,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FileScan,
} from 'lucide-react';
import {
  AgreementOcrDocType,
  AgreementOcrExtractResult,
} from '../../types/agreementTypes';
import { api } from '../../lib/api';

export interface AgreementOcrVerifiedApplyPayload {
  docType: AgreementOcrDocType;
  targetPartyIndex: number; // 0 = 1st party, 1 = 2nd party, etc.
  applyToRepresentative: boolean;
  partyData?: {
    name?: string;
    fatherOrOrgHead?: string;
    nidOrRegNo?: string;
    address?: string;
    phone?: string;
    designation?: string;
    authorityBasis?: string;
  };
  landWaqfData?: {
    mouza?: string;
    jlNumber?: string;
    khatianNumber?: string;
    dagNumber?: string;
    landArea?: string;
    landAreaUnit?: string;
    proposedPortionDesc?: string;
  };
  clausesData?: {
    suggestedTitle?: string;
    suggestedPurpose?: string;
    extractedClauses?: string;
  };
}

interface AgreementOcrScannerModalProps {
  partyLabels: string[];
  onApplyVerifiedData: (payload: AgreementOcrVerifiedApplyPayload) => void;
  onClose: () => void;
}

const OCR_DOC_TYPES: Array<{ id: AgreementOcrDocType; labelBn: string; hintBn: string }> = [
  { id: 'NID', labelBn: 'জাতীয় পরিচয়পত্র (NID)', hintBn: 'নাম, পিতা/স্বামী, NID ও ঠিকানা' },
  { id: 'PASSPORT', labelBn: 'পাসপোর্ট', hintBn: 'নাম, পাসপোর্ট নং ও ঠিকানা' },
  { id: 'TRADE_LICENSE', labelBn: 'ট্রেড লাইসেন্স', hintBn: 'প্রতিষ্ঠান, প্রোপ্রাইটর ও লাইসেন্স নং' },
  { id: 'LAND_DEED_KHATIAN', labelBn: 'জমির দলিল / খতিয়ান / পর্চা / ম্যাপ', hintBn: 'মৌজা, JL, খতিয়ান, দাগ ও জমির পরিমাণ' },
  { id: 'COMMITTEE_RESOLUTION', labelBn: 'কমিটির রেজুলেশন / অনুমোদনপত্র', hintBn: 'রেজুলেশন নং, তারিখ ও প্রতিনিধির ক্ষমতা' },
  { id: 'PREVIOUS_AGREEMENT', labelBn: 'পূর্বের চুক্তিপত্র', hintBn: 'শিরোনাম, উদ্দেশ্য ও শর্তাবলি' },
  { id: 'OTHER', labelBn: 'অন্যান্য নথি', hintBn: 'সাধারণ তথ্য শনাক্তকরণ' },
];

async function compressAndRotateDataUrl(dataUrl: string, mimeType: string, rotationDeg: number): Promise<{ dataUrl: string; mimeType: string }> {
  if (mimeType === 'application/pdf') return { dataUrl, mimeType };
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const dw = Math.max(100, Math.round(img.width * scale));
      const dh = Math.max(100, Math.round(img.height * scale));
      const rot = ((rotationDeg % 360) + 360) % 360;
      const canvas = document.createElement('canvas');
      if (rot === 90 || rot === 270) {
        canvas.width = dh;
        canvas.height = dw;
      } else {
        canvas.width = dw;
        canvas.height = dh;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ dataUrl, mimeType });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.84), mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve({ dataUrl, mimeType });
    img.src = dataUrl;
  });
}

export const AgreementOcrScannerModal: React.FC<AgreementOcrScannerModalProps> = ({
  partyLabels,
  onApplyVerifiedData,
  onClose,
}) => {
  const [docType, setDocType] = useState<AgreementOcrDocType>('NID');
  const [userHint, setUserHint] = useState('');

  // Zero-Storage In-Memory Capture State
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedMimeType, setCapturedMimeType] = useState<string>('image/jpeg');
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [rotation, setRotation] = useState(0);

  // Live Camera (Web + Android WebView compatible)
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // OCR Result & Editable Verification State
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<AgreementOcrExtractResult | null>(null);
  const [userConfirmedVerified, setUserConfirmedVerified] = useState(false);

  // Target Mapping
  const [targetPartyIndex, setTargetPartyIndex] = useState(1);
  const [applyToRepresentative, setApplyToRepresentative] = useState(false);

  // Editable fields (User MUST review & edit before applying)
  const [edPartyName, setEdPartyName] = useState('');
  const [edFatherOrHead, setEdFatherOrHead] = useState('');
  const [edNidOrReg, setEdNidOrReg] = useState('');
  const [edAddress, setEdAddress] = useState('');
  const [edPhone, setEdPhone] = useState('');
  const [edDesignation, setEdDesignation] = useState('');
  const [edAuthorityBasis, setEdAuthorityBasis] = useState('');

  const [edMouza, setEdMouza] = useState('');
  const [edJlNo, setEdJlNo] = useState('');
  const [edKhatian, setEdKhatian] = useState('');
  const [edDag, setEdDag] = useState('');
  const [edLandArea, setEdLandArea] = useState('');
  const [edLandUnit, setEdLandUnit] = useState('শতাংশ');
  const [edPortion, setEdPortion] = useState('');

  const [edTitle, setEdTitle] = useState('');
  const [edPurpose, setEdPurpose] = useState('');
  const [edClauses, setEdClauses] = useState('');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startLiveCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setErrorMsg(null);
    stopCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback smoothly to native mobile camera file picker on restricted Android WebViews
      mobileCameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setErrorMsg('লাইভ ক্যামেরা চালু করা যায়নি। নিচের "মোবাইল ক্যামেরা / ফাইল নির্বাচন" বাটন ব্যবহার করুন।');
      mobileCameraInputRef.current?.click();
    }
  };

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    setCapturedMimeType('image/jpeg');
    setCapturedFileName('live-camera-capture.jpg');
    setRotation(0);
    setOcrResult(null);
    setUserConfirmedVerified(false);
    stopCamera();
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    if (file.size > 6 * 1024 * 1024) {
      setErrorMsg('ফাইলের আকার সর্বোচ্চ ৬ মেগাবাইট হতে পারবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedDataUrl(reader.result);
        setCapturedMimeType(file.type || 'image/jpeg');
        setCapturedFileName(file.name);
        setRotation(0);
        setOcrResult(null);
        setUserConfirmedVerified(false);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRunOcr = async () => {
    if (!capturedDataUrl) {
      setErrorMsg('অনুগ্রহ করে প্রথমে ক্যামেরা দিয়ে ছবি তুলুন বা ডকুমেন্ট নির্বাচন করুন।');
      return;
    }
    setScanning(true);
    setErrorMsg(null);
    setUserConfirmedVerified(false);

    try {
      const prepared = await compressAndRotateDataUrl(capturedDataUrl, capturedMimeType, rotation);
      const res = await api.ocrExtractAgreementDocument({
        docType,
        mimeType: prepared.mimeType,
        imageBase64: prepared.dataUrl,
        userHint: userHint.trim() || undefined,
      });

      setOcrResult(res);
      setEdPartyName(res.partyCandidate?.name || '');
      setEdFatherOrHead(res.partyCandidate?.fatherOrOrgHead || '');
      setEdNidOrReg(res.partyCandidate?.nidOrRegNo || '');
      setEdAddress(res.partyCandidate?.address || '');
      setEdPhone(res.partyCandidate?.phone || '');
      setEdDesignation(res.partyCandidate?.designation || '');
      setEdAuthorityBasis(
        res.partyCandidate?.authorityBasis ||
          [
            res.resolutionCandidate?.resolutionNo ? `রেজুলেশন নং: ${res.resolutionCandidate.resolutionNo}` : '',
            res.resolutionCandidate?.resolutionDate ? `তারিখ: ${res.resolutionCandidate.resolutionDate}` : '',
            res.resolutionCandidate?.authoritySummary || '',
          ]
            .filter(Boolean)
            .join(', ')
      );

      setEdMouza(res.landWaqfCandidate?.mouza || '');
      setEdJlNo(res.landWaqfCandidate?.jlNumber || '');
      setEdKhatian(res.landWaqfCandidate?.khatianNumber || '');
      setEdDag(res.landWaqfCandidate?.dagNumber || '');
      setEdLandArea(res.landWaqfCandidate?.landArea || '');
      setEdLandUnit(res.landWaqfCandidate?.landAreaUnit || 'শতাংশ');
      setEdPortion(res.landWaqfCandidate?.proposedPortionDesc || '');

      setEdTitle(res.clausesCandidate?.suggestedTitle || '');
      setEdPurpose(res.clausesCandidate?.suggestedPurpose || '');
      setEdClauses(res.clausesCandidate?.extractedClauses || '');

      if (docType === 'COMMITTEE_RESOLUTION') {
        setTargetPartyIndex(0);
        setApplyToRepresentative(true);
      } else if (docType === 'NID' || docType === 'PASSPORT' || docType === 'TRADE_LICENSE') {
        setTargetPartyIndex(Math.min(1, Math.max(0, partyLabels.length - 1)));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'OCR তথ্য শনাক্তকরণে ত্রুটি হয়েছে।');
    } finally {
      setScanning(false);
    }
  };

  const handleApply = () => {
    if (!userConfirmedVerified) return;
    const hasParty = Boolean(
      edPartyName || edFatherOrHead || edNidOrReg || edAddress || edPhone || edDesignation || edAuthorityBasis
    );
    const hasLand = Boolean(edMouza || edJlNo || edKhatian || edDag || edLandArea || edPortion);
    const hasClauses = Boolean(edTitle || edPurpose || edClauses);

    onApplyVerifiedData({
      docType,
      targetPartyIndex,
      applyToRepresentative,
      partyData: hasParty
        ? {
            name: edPartyName.trim() || undefined,
            fatherOrOrgHead: edFatherOrHead.trim() || undefined,
            nidOrRegNo: edNidOrReg.trim() || undefined,
            address: edAddress.trim() || undefined,
            phone: edPhone.trim() || undefined,
            designation: edDesignation.trim() || undefined,
            authorityBasis: edAuthorityBasis.trim() || undefined,
          }
        : undefined,
      landWaqfData: hasLand
        ? {
            mouza: edMouza.trim() || undefined,
            jlNumber: edJlNo.trim() || undefined,
            khatianNumber: edKhatian.trim() || undefined,
            dagNumber: edDag.trim() || undefined,
            landArea: edLandArea.trim() || undefined,
            landAreaUnit: edLandUnit.trim() || undefined,
            proposedPortionDesc: edPortion.trim() || undefined,
          }
        : undefined,
      clausesData: hasClauses
        ? {
            suggestedTitle: edTitle.trim() || undefined,
            suggestedPurpose: edPurpose.trim() || undefined,
            extractedClauses: edClauses.trim() || undefined,
          }
        : undefined,
    });
  };

  const showPartyFields =
    docType === 'NID' ||
    docType === 'PASSPORT' ||
    docType === 'TRADE_LICENSE' ||
    docType === 'COMMITTEE_RESOLUTION' ||
    docType === 'OTHER';
  const showLandFields = docType === 'LAND_DEED_KHATIAN' || Boolean(edMouza || edKhatian || edDag);
  const showClausesFields = docType === 'PREVIOUS_AGREEMENT' || Boolean(edClauses);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
              <FileScan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-siliguri">
                জিরো-স্টোরেজ ক্যামেরা স্ক্যানার ও OCR (Web ও Android)
              </h3>
              <p className="text-[11px] text-slate-500 font-tiro">
                NID, পাসপোর্ট, ট্রেড লাইসেন্স, খতিয়ান/দলিল, রেজুলেশন ও পূর্বের চুক্তি থেকে তথ্য পড়ে যাচাইয়ের মাধ্যমে ফর্মে বসান
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[82vh] overflow-y-auto space-y-4">
          {/* Zero-Storage Privacy & Unverified OCR Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-tiro flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>জিরো-স্টোরেজ গোপনীয়তা:</strong> স্ক্যানকৃত NID বা সংবেদনশীল দলিলের ছবি সার্ভারে বা ডাটাবেসে সংরক্ষিত হয় না (কোনো স্টোরেজ ব্লোট নেই)। OCR ফলাফল ব্যবহারকারী যাচাই ও সংশোধন না করা পর্যন্ত অযাচাইকৃত থাকবে এবং সরকারি দলিলের সত্যতা নিশ্চিত করে না।
            </p>
          </div>

          {/* Document Type Selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                স্ক্যানকৃত নথির ধরন নির্বাচন করুন *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as AgreementOcrDocType)}
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500"
              >
                {OCR_DOC_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.labelBn} — {dt.hintBn}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 font-siliguri mb-1">
                অতিরিক্ত নোট (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={userHint}
                onChange={(e) => setUserHint(e.target.value)}
                placeholder="যেমন: ২য় পক্ষের NID / আর.এস খতিয়ান অংশ পড়ো..."
                className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Capture Controls (Web Camera + Mobile Native Camera + File Upload) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => startLiveCamera('environment')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold font-siliguri hover:bg-teal-800"
            >
              <Camera className="w-4 h-4" />
              <span>লাইভ ক্যামেরা চালু করুন</span>
            </button>

            <button
              type="button"
              onClick={() => mobileCameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-900 text-xs font-semibold font-siliguri hover:bg-teal-100"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Android / মোবাইল ক্যামেরা</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold font-siliguri hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ছবি / PDF ফাইল নির্বাচন</span>
            </button>

            {/* Hidden Native Inputs */}
            <input
              ref={mobileCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFilePicked}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFilePicked}
              className="hidden"
            />
          </div>

          {/* Live Camera Preview */}
          {cameraActive && (
            <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-950 space-y-2 p-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-72 object-contain mx-auto rounded-lg"
              />
              <div className="flex items-center justify-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={captureFromVideo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold font-siliguri hover:bg-emerald-700"
                >
                  <Camera className="w-4 h-4" />
                  <span>ছবি তুলুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
                    setFacingMode(nextMode);
                    startLiveCamera(nextMode);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-siliguri hover:bg-slate-700"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>ক্যামেরা পরিবর্তন</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-siliguri"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          )}

          {/* Captured Preview + Run OCR */}
          {capturedDataUrl && !cameraActive && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {capturedMimeType === 'application/pdf' ? (
                  <div className="w-16 h-16 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center text-xs font-bold font-siliguri shrink-0">
                    PDF
                  </div>
                ) : (
                  <img
                    src={capturedDataUrl}
                    alt="স্ক্যানকৃত নথি"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="w-24 h-16 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 font-siliguri truncate">
                    {capturedFileName || 'স্ক্যানকৃত ডকুমেন্ট'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-tiro">
                    কেবল সাময়িকভাবে ব্রাউজার মেমোরিতে আছে — সার্ভারে সংরক্ষণ হবে না
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {capturedMimeType !== 'application/pdf' && (
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 font-siliguri"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>ঘোরান</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={scanning}
                  onClick={handleRunOcr}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800 disabled:opacity-60"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{scanning ? 'OCR শনাক্ত হচ্ছে...' : 'OCR তথ্য শনাক্ত করুন'}</span>
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-tiro flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Unverified Editable OCR Result Review */}
          {ocrResult && (
            <div className="border-t border-slate-200 pt-4 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 font-tiro space-y-1">
                <p className="font-bold font-siliguri flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>অযাচাইকৃত OCR ফলাফল (UNVERIFIED DRAFT) — প্রয়োগের আগে প্রতিটি ঘর মিলিয়ে সংশোধন করুন</span>
                </p>
                <p className="text-[11px] leading-relaxed">{ocrResult.unverifiedWarningBn}</p>
                {ocrResult.uncertainFields.length > 0 && (
                  <p className="text-[11px] text-rose-800 font-semibold">
                    অস্পষ্ট/সন্দেহজনক ঘর: {ocrResult.uncertainFields.join(', ')}
                  </p>
                )}
              </div>

              {/* Target Mapping Selector */}
              {showPartyFields && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 font-siliguri">
                      পক্ষ / প্রতিনিধি সংক্রান্ত শনাক্তকৃত তথ্য (সম্পাদনাযোগ্য)
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-siliguri">
                      <select
                        value={targetPartyIndex}
                        onChange={(e) => setTargetPartyIndex(Number(e.target.value))}
                        className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs"
                      >
                        {partyLabels.map((lbl, idx) => (
                          <option key={idx} value={idx}>
                            {lbl}-এ বসান
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={applyToRepresentative}
                          onChange={(e) => setApplyToRepresentative(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-700"
                        />
                        <span>প্রতিনিধি / রেজুলেশন ঘরে যোগ করুন</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">নাম / প্রতিষ্ঠান</label>
                      <input
                        type="text"
                        value={edPartyName}
                        onChange={(e) => setEdPartyName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">পিতা / প্রতিষ্ঠান প্রধান</label>
                      <input
                        type="text"
                        value={edFatherOrHead}
                        onChange={(e) => setEdFatherOrHead(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">NID / পাসপোর্ট / লাইসেন্স নং</label>
                      <input
                        type="text"
                        value={edNidOrReg}
                        onChange={(e) => setEdNidOrReg(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">মোবাইল</label>
                      <input
                        type="text"
                        value={edPhone}
                        onChange={(e) => setEdPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">পদবি (প্রতিনিধি হলে)</label>
                      <input
                        type="text"
                        value={edDesignation}
                        onChange={(e) => setEdDesignation(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">ঠিকানা</label>
                      <input
                        type="text"
                        value={edAddress}
                        onChange={(e) => setEdAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">
                        প্রতিনিধিত্বের ক্ষমতার ভিত্তি / কমিটির রেজুলেশন বিবরণ
                      </label>
                      <input
                        type="text"
                        value={edAuthorityBasis}
                        onChange={(e) => setEdAuthorityBasis(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Land / Khaitian / Deed Editable Fields */}
              {showLandFields && (
                <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2.5">
                  <h4 className="text-xs font-bold text-teal-950 font-siliguri">
                    জমি / খতিয়ান / দলিল থেকে শনাক্তকৃত তফসিল (সম্পাদনাযোগ্য)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">মৌজা</label>
                      <input
                        type="text"
                        value={edMouza}
                        onChange={(e) => setEdMouza(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">জে.এল. নম্বর</label>
                      <input
                        type="text"
                        value={edJlNo}
                        onChange={(e) => setEdJlNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">খতিয়ান নং</label>
                      <input
                        type="text"
                        value={edKhatian}
                        onChange={(e) => setEdKhatian(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">দাগ নং</label>
                      <input
                        type="text"
                        value={edDag}
                        onChange={(e) => setEdDag(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">জমির পরিমাণ</label>
                      <input
                        type="text"
                        value={edLandArea}
                        onChange={(e) => setEdLandArea(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-baloo rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">একক</label>
                      <input
                        type="text"
                        value={edLandUnit}
                        onChange={(e) => setEdLandUnit(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-600 font-siliguri mb-0.5">চৌহদ্দি / অংশের বিবরণ</label>
                      <input
                        type="text"
                        value={edPortion}
                        onChange={(e) => setEdPortion(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Agreement Clauses */}
              {showClausesFields && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 font-siliguri">
                    পূর্বের চুক্তি থেকে শনাক্তকৃত শর্তাবলি (সম্পাদনাযোগ্য)
                  </h4>
                  <input
                    type="text"
                    value={edTitle}
                    onChange={(e) => setEdTitle(e.target.value)}
                    placeholder="শনাক্তকৃত শিরোনাম"
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                  />
                  <textarea
                    rows={4}
                    value={edClauses}
                    onChange={(e) => setEdClauses(e.target.value)}
                    placeholder="শনাক্তকৃত শর্তাবলি..."
                    className="w-full px-2.5 py-1.5 text-xs font-tiro rounded-md border border-slate-200 bg-white"
                  />
                </div>
              )}

              {/* Mandatory User Verification Gate */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userConfirmedVerified}
                  onChange={(e) => setUserConfirmedVerified(e.target.checked)}
                  className="mt-0.5 rounded border-emerald-400 text-emerald-700"
                />
                <span className="text-xs text-emerald-950 font-siliguri leading-relaxed">
                  আমি মূল কাগজপত্রের সাথে মিলিয়ে উপরের OCR তথ্য যাচাই ও প্রয়োজনীয় সংশোধন করেছি এবং বুঝেছি যে এটি সরকারি দলিলের সত্যতা সনদ নয়।
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 font-siliguri"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={!userConfirmedVerified}
                  onClick={handleApply}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold font-siliguri hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>যাচাইকৃত তথ্য ফর্মে বসান</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

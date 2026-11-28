import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ExternalLink,
  FileScan,
  Loader2,
  RotateCw,
  ShieldAlert,
  Sparkles,
  SwitchCamera,
  Upload,
  User as UserIcon,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getAllRoleDefinitions } from '../../lib/partyCatalog';
import {
  PartyCustomRoleDef,
  PartyOcrDocType,
  PartyOcrExtractResult,
  PartyOrganizationDetails,
  PartyProfileType,
} from '../../types/partyTypes';

export interface PartyOcrVerifiedApplyPayload {
  partyType: PartyProfileType;
  name?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  nidNumber?: string;
  fullAddress?: string;
  villageOrMahalla?: string;
  unionOrWard?: string;
  upazila?: string;
  district?: string;
  division?: string;
  postCode?: string;
  occupationOrSkill?: string;
  description?: string;
  organizationDetails?: PartyOrganizationDetails;
  roles: string[];
}

export interface PartyOcrScannerModalProps {
  customRoles: PartyCustomRoleDef[];
  onApplyVerifiedData: (payload: PartyOcrVerifiedApplyPayload) => void;
  onOpenExistingProfile?: (partyId: string) => void;
  onClose: () => void;
}

const OCR_DOC_TYPES: Array<{ id: PartyOcrDocType; labelBn: string; hintBn: string }> = [
  { id: 'NID', labelBn: 'জাতীয় পরিচয়পত্র (NID)', hintBn: 'নাম, NID নম্বর ও ঠিকানা' },
  {
    id: 'TRADE_LICENSE',
    labelBn: 'ট্রেড লাইসেন্স',
    hintBn: 'প্রতিষ্ঠানের নাম, প্রোপ্রাইটর, লাইসেন্স নং ও ঠিকানা',
  },
  {
    id: 'BUSINESS_CARD_OR_ID',
    labelBn: 'ভিজিটিং কার্ড / দোকান বা পরিচয়পত্র',
    hintBn: 'নাম, দোকান/সেবা, মোবাইল, ইমেইল ও পেশা',
  },
  { id: 'OTHER', labelBn: 'অন্যান্য নথি', hintBn: 'সাধারণ পরিচিতি ও যোগাযোগের তথ্য' },
];

async function compressAndRotateDataUrl(
  dataUrl: string,
  mimeType: string,
  rotationDeg: number
): Promise<{ dataUrl: string; mimeType: string }> {
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
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), mimeType: 'image/jpeg' });
    };
    img.onerror = () => resolve({ dataUrl, mimeType });
    img.src = dataUrl;
  });
}

export const PartyOcrScannerModal: React.FC<PartyOcrScannerModalProps> = ({
  customRoles,
  onApplyVerifiedData,
  onOpenExistingProfile,
  onClose,
}) => {
  const [docType, setDocType] = useState<PartyOcrDocType>('NID');
  const [userHint, setUserHint] = useState('');

  // Zero-Storage In-Memory Capture State
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedMimeType, setCapturedMimeType] = useState<string>('image/jpeg');
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [rotation, setRotation] = useState(0);

  // Camera & Upload Refs
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // OCR State
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<PartyOcrExtractResult | null>(null);
  const [userConfirmedVerified, setUserConfirmedVerified] = useState(false);

  // Editable Draft Fields (Review & Edit before applying)
  const [edPartyType, setEdPartyType] = useState<PartyProfileType>('INDIVIDUAL');
  const [edName, setEdName] = useState('');
  const [edPhone, setEdPhone] = useState('');
  const [edAltPhone, setEdAltPhone] = useState('');
  const [edEmail, setEdEmail] = useState('');
  const [edNid, setEdNid] = useState('');
  const [edFullAddress, setEdFullAddress] = useState('');
  const [edVillage, setEdVillage] = useState('');
  const [edUnion, setEdUnion] = useState('');
  const [edUpazila, setEdUpazila] = useState('');
  const [edDistrict, setEdDistrict] = useState('');
  const [edDivision, setEdDivision] = useState('');
  const [edPostCode, setEdPostCode] = useState('');
  const [edOccupation, setEdOccupation] = useState('');
  const [edDescription, setEdDescription] = useState('');
  const [edRoles, setEdRoles] = useState<string[]>([]);

  // Organization Draft Fields
  const [edTradeLicense, setEdTradeLicense] = useState('');
  const [edTinOrBin, setEdTinOrBin] = useState('');
  const [edContactPerson, setEdContactPerson] = useState('');
  const [edContactDesignation, setEdContactDesignation] = useState('');
  const [edContactPhone, setEdContactPhone] = useState('');
  const [edBusinessCategory, setEdBusinessCategory] = useState('');

  const allRoleDefs = useMemo(() => getAllRoleDefinitions(customRoles), [customRoles]);

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
      e.target.value = '';
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
      const res = await api.scanPartyDocumentOcr({
        docType,
        dataUrl: prepared.dataUrl,
        mimeType: prepared.mimeType,
        userHint: userHint.trim() || undefined,
      });

      setOcrResult(res);
      setEdPartyType(res.suggestedPartyType || 'INDIVIDUAL');
      setEdName(res.name || '');
      setEdPhone(res.phone || '');
      setEdAltPhone(res.alternatePhone || '');
      setEdEmail(res.email || '');
      setEdNid(res.nidNumber || '');
      setEdFullAddress(res.fullAddress || '');
      setEdVillage(res.villageOrMahalla || '');
      setEdUnion(res.unionOrWard || '');
      setEdUpazila(res.upazila || '');
      setEdDistrict(res.district || '');
      setEdDivision(res.division || '');
      setEdPostCode(res.postCode || '');
      setEdOccupation(res.occupationOrSkill || '');
      setEdDescription(res.description || '');
      setEdRoles(Array.isArray(res.suggestedRoles) ? res.suggestedRoles : []);

      setEdTradeLicense(res.organizationDetails?.registrationOrTradeLicenseNo || '');
      setEdTinOrBin(res.organizationDetails?.tinOrBin || '');
      setEdContactPerson(res.organizationDetails?.contactPersonName || '');
      setEdContactDesignation(res.organizationDetails?.contactPersonDesignation || '');
      setEdContactPhone(res.organizationDetails?.contactPersonPhone || '');
      setEdBusinessCategory(res.organizationDetails?.businessCategory || '');
    } catch (err: any) {
      setErrorMsg(err?.message || 'OCR তথ্য শনাক্তকরণে ত্রুটি হয়েছে।');
    } finally {
      setScanning(false);
    }
  };

  const toggleDraftRole = (code: string) => {
    setEdRoles((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  };

  const handleApply = () => {
    if (!userConfirmedVerified) return;
    const orgDetails: PartyOrganizationDetails | undefined =
      edPartyType === 'ORGANIZATION'
        ? {
            registrationOrTradeLicenseNo: edTradeLicense.trim() || undefined,
            tinOrBin: edTinOrBin.trim() || undefined,
            contactPersonName: edContactPerson.trim() || undefined,
            contactPersonDesignation: edContactDesignation.trim() || undefined,
            contactPersonPhone: edContactPhone.trim() || undefined,
            businessCategory: edBusinessCategory.trim() || undefined,
          }
        : undefined;

    onApplyVerifiedData({
      partyType: edPartyType,
      name: edName.trim() || undefined,
      phone: edPhone.trim() || undefined,
      alternatePhone: edAltPhone.trim() || undefined,
      email: edEmail.trim() || undefined,
      nidNumber: edNid.trim() || undefined,
      fullAddress: edFullAddress.trim() || undefined,
      villageOrMahalla: edVillage.trim() || undefined,
      unionOrWard: edUnion.trim() || undefined,
      upazila: edUpazila.trim() || undefined,
      district: edDistrict.trim() || undefined,
      division: edDivision.trim() || undefined,
      postCode: edPostCode.trim() || undefined,
      occupationOrSkill: edOccupation.trim() || undefined,
      description: edDescription.trim() || undefined,
      organizationDetails: orgDetails,
      roles: edRoles,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-siliguri">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <FileScan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                জিরো-স্টোরেজ ক্যামেরা ও ডকুমেন্ট OCR সহায়তা (AI)
              </h3>
              <p className="text-[11px] text-slate-500 font-tiro">
                NID, ট্রেড লাইসেন্স বা ভিজিটিং কার্ড থেকে তথ্য পড়ে খসড়া তৈরি করুন — সংরক্ষণের আগে যাচাই বাধ্যতামূলক
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
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[82vh] overflow-y-auto space-y-4">
          {/* Privacy & Human-in-the-loop Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-tiro flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>গোপনীয়তা ও যাচাই নীতি:</strong> স্ক্যানকৃত NID বা নথির ছবি ডাটাবেস বা সার্ভারে সংরক্ষিত হয় না। AI শুধু অযাচাইকৃত খসড়া (UNVERIFIED DRAFT) দেয় — স্বয়ংক্রিয়ভাবে কোনো প্রোফাইল সংরক্ষণ, সম্পাদনা বা Merge করা হয় না।
            </p>
          </div>

          {/* Document Type Pills */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              নথির ধরন নির্বাচন করুন
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {OCR_DOC_TYPES.map((dt) => {
                const active = docType === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDocType(dt.id)}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                      active
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{dt.labelBn}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{dt.hintBn}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              অতিরিক্ত নির্দেশনা (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={userHint}
              onChange={(e) => setUserHint(e.target.value)}
              placeholder="যেমন: দোকানের নাম ও মালিকের মোবাইল নম্বর আলাদাভাবে পড়ুন..."
              className="w-full px-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Capture Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => startLiveCamera('environment')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
            >
              <Camera className="w-4 h-4" />
              <span>লাইভ ক্যামেরা চালু করুন</span>
            </button>

            <button
              type="button"
              onClick={() => mobileCameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold hover:bg-emerald-100"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>মোবাইল ক্যামেরা</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ছবি / PDF ফাইল নির্বাচন (সর্বোচ্চ ৬ MB)</span>
            </button>

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

          {/* Live Camera View */}
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
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
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs hover:bg-slate-700"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>ক্যামেরা পরিবর্তন</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-2 rounded-lg bg-slate-700 text-white text-xs"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          )}

          {/* Captured Preview + Run OCR */}
          {capturedDataUrl && !cameraActive && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {capturedMimeType === 'application/pdf' ? (
                  <div className="w-16 h-16 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center text-xs font-bold shrink-0">
                    PDF
                  </div>
                ) : (
                  <img
                    src={capturedDataUrl}
                    alt="স্ক্যানকৃত নথি"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="w-20 h-16 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {capturedFileName || 'নির্বাচিত ডকুমেন্ট'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    শুধুমাত্র মেমোরিতে আছে · AI স্ক্যানের পর ছবি মুছে ফেলা যাবে
                  </div>
                  {capturedMimeType !== 'application/pdf' && (
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <RotateCw className="w-3 h-3" />
                      ৯০° ঘোরান
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunOcr}
                disabled={scanning}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-60 shrink-0"
              >
                {scanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{scanning ? 'তথ্য শনাক্ত করা হচ্ছে...' : 'OCR তথ্য শনাক্ত করুন (AI)'}</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Unverified Draft Review & Verification Panel */}
          {ocrResult && (
            <div className="border border-emerald-200 rounded-2xl bg-white p-4 space-y-4">
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>খসড়া (UNVERIFIED DRAFT) — সংরক্ষণের আগে যাচাই প্রয়োজন</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-tiro mt-0.5">
                    {ocrResult.confidenceNoteBn}
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">
                  নথি: {ocrResult.detectedDocTypeBn} · মডেল: {ocrResult.modelUsed}
                </span>
              </div>

              {/* Duplicate Check Warning inside OCR */}
              {ocrResult.potentialDuplicates && ocrResult.potentialDuplicates.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      সতর্কতা: স্ক্যানকৃত তথ্যের সাথে বিদ্যমান প্রোফাইলের মিল পাওয়া গেছে!
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ocrResult.potentialDuplicates.map((dup) => (
                      <div
                        key={dup.party.id}
                        className="bg-white border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {dup.party.name}
                          </div>
                          <div className="text-[11px] text-slate-600 font-baloo tabular-nums">
                            {dup.party.partyCode} · {dup.party.phone}
                          </div>
                          <div className="text-[11px] text-amber-800">
                            {dup.reasonLabelsBn.join(', ')}
                          </div>
                        </div>
                        {onOpenExistingProfile && (
                          <button
                            type="button"
                            onClick={() => {
                              stopCamera();
                              onOpenExistingProfile(dup.party.id);
                            }}
                            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[11px] font-semibold"
                          >
                            বিদ্যমান প্রোফাইল দেখুন
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unclear Fields Alert */}
              {ocrResult.unclearFieldsBn && ocrResult.unclearFieldsBn.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                  <span className="font-bold text-slate-800">অস্পষ্ট বা অনুপস্থিত তথ্য: </span>
                  {ocrResult.unclearFieldsBn.join(', ')}
                </div>
              )}

              {/* Editable Fields */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">প্রোফাইলের ধরন:</span>
                  {(['INDIVIDUAL', 'ORGANIZATION'] as PartyProfileType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEdPartyType(t)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        edPartyType === t
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'INDIVIDUAL' ? (
                        <UserIcon className="w-3.5 h-3.5" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5" />
                      )}
                      {t === 'INDIVIDUAL' ? 'ব্যক্তি (Individual)' : 'প্রতিষ্ঠান (Organization)'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {edPartyType === 'ORGANIZATION' ? 'প্রতিষ্ঠানের নাম' : 'পূর্ণ নাম'}
                    </label>
                    <input
                      type="text"
                      value={edName}
                      onChange={(e) => setEdName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      প্রাথমিক মোবাইল
                    </label>
                    <input
                      type="text"
                      value={edPhone}
                      onChange={(e) => setEdPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      বিকল্প মোবাইল
                    </label>
                    <input
                      type="text"
                      value={edAltPhone}
                      onChange={(e) => setEdAltPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      NID নম্বর
                    </label>
                    <input
                      type="text"
                      value={edNid}
                      onChange={(e) => setEdNid(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ইমেইল
                    </label>
                    <input
                      type="text"
                      value={edEmail}
                      onChange={(e) => setEdEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      পূর্ণ ঠিকানা
                    </label>
                    <input
                      type="text"
                      value={edFullAddress}
                      onChange={(e) => setEdFullAddress(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      পেশা / মূল দক্ষতা
                    </label>
                    <input
                      type="text"
                      value={edOccupation}
                      onChange={(e) => setEdOccupation(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      উপজেলা / থানা
                    </label>
                    <input
                      type="text"
                      value={edUpazila}
                      onChange={(e) => setEdUpazila(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      জেলা
                    </label>
                    <input
                      type="text"
                      value={edDistrict}
                      onChange={(e) => setEdDistrict(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      পোস্ট কোড
                    </label>
                    <input
                      type="text"
                      value={edPostCode}
                      onChange={(e) => setEdPostCode(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Organization Details when ORGANIZATION */}
                {edPartyType === 'ORGANIZATION' && (
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        ট্রেড লাইসেন্স / রেজিঃ নং
                      </label>
                      <input
                        type="text"
                        value={edTradeLicense}
                        onChange={(e) => setEdTradeLicense(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        TIN / BIN
                      </label>
                      <input
                        type="text"
                        value={edTinOrBin}
                        onChange={(e) => setEdTinOrBin(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        ব্যবসার ধরন
                      </label>
                      <input
                        type="text"
                        value={edBusinessCategory}
                        onChange={(e) => setEdBusinessCategory(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        প্রতিনিধি / প্রোপ্রাইটর
                      </label>
                      <input
                        type="text"
                        value={edContactPerson}
                        onChange={(e) => setEdContactPerson(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        পদবি
                      </label>
                      <input
                        type="text"
                        value={edContactDesignation}
                        onChange={(e) => setEdContactDesignation(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        প্রতিনিধির মোবাইল
                      </label>
                      <input
                        type="text"
                        value={edContactPhone}
                        onChange={(e) => setEdContactPhone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Suggested Roles Selector */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-700">
                    প্রস্তাবিত ভূমিকার (Roles) খসড়া — প্রয়োজন অনুযায়ী নির্বাচন করুন:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allRoleDefs.map((role) => {
                      const active = edRoles.includes(role.code);
                      return (
                        <button
                          key={role.code}
                          type="button"
                          onClick={() => toggleDraftRole(role.code)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                            active
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          <span>{role.labelBn}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mandatory User Verification Checkbox */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={userConfirmedVerified}
                    onChange={(e) => setUserConfirmedVerified(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>
                    আমি স্ক্যানকৃত ডকুমেন্টের সাথে মিলিয়ে উপরের খসড়া তথ্যসমূহ যাচাই ও সংশোধন করেছি।
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!userConfirmedVerified}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  যাচাইকৃত তথ্য ফর্মে বসান
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

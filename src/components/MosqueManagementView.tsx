import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark,
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  Upload,
  Image as ImageIcon,
  FileCheck2,
  PenTool,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  ExternalLink,
  ShieldCheck,
  FolderOpen,
  Info,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  FileText,
  Compass,
  FileUp,
  Share2,
} from 'lucide-react';
import { Mosque, User, MosqueLetterheadSettings } from '../types';
import { Language, translations } from '../lib/i18n';
import { api } from '../lib/api';
import { hasPermission } from '../lib/permissions';
import { DocumentSection } from './DocumentSection';
import { printElement } from '../lib/printUtils';
import { DriveLinkInput } from './common/DriveLinkInput';
import { PageHeader } from './common/PageHeader';
import { ConfirmDialog } from './common/ConfirmDialog';

interface MosqueManagementViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
  onSaveMosque: (updated: Partial<Mosque>) => Promise<void>;
  onNavigateTab?: (tab: any) => void;
}

type SubTab = 'identity' | 'address' | 'media' | 'letterhead' | 'documents';

const BANGLADESH_DIVISIONS = [
  'ঢাকা',
  'চট্টগ্রাম',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'সিলেট',
  'রংপুর',
  'ময়মনসিংহ',
];

const BANGLADESH_DISTRICTS: Record<string, string[]> = {
  ঢাকা: ['ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'মুন্সীগঞ্জ', 'মানিকগঞ্জ', 'নরসিংদী', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'ফরিদপুর', 'গোপালগঞ্জ', 'মাদারীপুর', 'শরীয়তপুর', 'রাজবাড়ী'],
  চট্টগ্রাম: ['চট্টগ্রাম', 'কক্সবাজার', 'কুমিল্লা', 'ফেনী', 'ব্রাহ্মণবাড়িয়া', 'নোয়াখালী', 'লক্ষ্মীপুর', 'চাঁদপুর', 'খাগড়াছড়ি', 'রাঙ্গামাটি', 'বান্দরবান'],
  রাজশাহী: ['রাজশাহী', 'বগুড়া', 'পাবনা', 'সিরাজগঞ্জ', 'নওগাঁ', 'নাটোর', 'জয়পুরহাট', 'চাঁপাইনবাবগঞ্জ'],
  খুলনা: ['খুলনা', 'যশোর', 'কুষ্টিয়া', 'ঝিনাইদহ', 'সাতক্ষীরা', 'বাগেরহাট', 'চুয়াডাঙ্গা', 'মেহেরপুর', 'নড়াইল', 'মাগুরা'],
  বরিশাল: ['বরিশাল', 'পটুয়াখালী', 'ভোলা', 'পিরোজপুর', 'বরগুনা', 'ঝালকাঠি'],
  সিলেট: ['সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ'],
  রংপুর: ['রংপুর', 'দিনাজপুর', 'গাইবান্ধা', 'কুড়িগ্রাম', 'নীলফামারী', 'লালমনিরহাট', 'ঠাকুরগাঁও', 'পঞ্চগড়'],
  ময়মনসিংহ: ['ময়মনসিংহ', 'জামালপুর', 'নেত্রকোণা', 'শেরপুর'],
};

export const MosqueManagementView: React.FC<MosqueManagementViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  onSaveMosque,
  onNavigateTab,
}) => {
  const t = translations[language] || translations.bn;
  const canEdit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    hasPermission(currentUser, 'MANAGE_SETTINGS');

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Mosque>>({});
  const [letterheadSettings, setLetterheadSettings] = useState<MosqueLetterheadSettings>({
    layout: 'STANDARD',
    showBismillah: true,
    bismillahText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    subtitleBn: 'একটি দ্বীনি, শিক্ষামূলক ও সমাজকল্যাণমূলক ওয়াকফ প্রতিষ্ঠান',
    contactLineCustom: '',
    footerNoteBn: 'যাবতীয় দান-অনুদান মসজিদের অফিসিয়াল রসিদ অথবা ব্যাংক একাউন্টের মাধ্যমে প্রদান করুন।',
    showWatermark: true,
  });

  // Logo & Photo Action State
  const [logoUploading, setLogoUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [sigUploading, setSigUploading] = useState<{ president?: boolean; secretary?: boolean }>({});
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Confirm modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Sync state with currentMosque
  useEffect(() => {
    if (currentMosque) {
      setFormData({
        name: currentMosque.name || '',
        nameBn: currentMosque.nameBn || '',
        nameEn: currentMosque.nameEn || '',
        code: currentMosque.code || '',
        waqfEstateName: currentMosque.waqfEstateName || '',
        registrationNumber: currentMosque.registrationNumber || '',
        descriptionBn: currentMosque.descriptionBn || '',
        establishedDate: currentMosque.establishedDate || '',
        address: currentMosque.address || '',
        village: currentMosque.village || '',
        union: currentMosque.union || '',
        ward: currentMosque.ward || '',
        upazila: currentMosque.upazila || '',
        district: currentMosque.district || '',
        division: currentMosque.division || '',
        country: currentMosque.country || 'Bangladesh',
        latitude: currentMosque.latitude,
        longitude: currentMosque.longitude,
        phone: currentMosque.phone || '',
        altPhone: currentMosque.altPhone || '',
        email: currentMosque.email || '',
        website: currentMosque.website || '',
        logoUrl: currentMosque.logoUrl || '',
        logoAssetId: currentMosque.logoAssetId,
        logoMetadata: currentMosque.logoMetadata,
        photoUrl: currentMosque.photoUrl || '',
        coverPhotoUrl: currentMosque.coverPhotoUrl || '',
        presidentSignatureUrl: currentMosque.presidentSignatureUrl || '',
        secretarySignatureUrl: currentMosque.secretarySignatureUrl || '',
        status: currentMosque.status || 'ACTIVE',
      });

      if (currentMosque.letterheadSettings) {
        setLetterheadSettings({
          layout: currentMosque.letterheadSettings.layout || 'STANDARD',
          showBismillah: currentMosque.letterheadSettings.showBismillah ?? true,
          bismillahText: currentMosque.letterheadSettings.bismillahText || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          subtitleBn: currentMosque.letterheadSettings.subtitleBn || 'একটি দ্বীনি, শিক্ষামূলক ও সমাজকল্যাণমূলক ওয়াকফ প্রতিষ্ঠান',
          contactLineCustom: currentMosque.letterheadSettings.contactLineCustom || '',
          footerNoteBn: currentMosque.letterheadSettings.footerNoteBn || 'যাবতীয় দান-অনুদান মসজিদের অফিসিয়াল রসিদ অথবা ব্যাংক একাউন্টের মাধ্যমে প্রদান করুন।',
          showWatermark: currentMosque.letterheadSettings.showWatermark ?? true,
        });
      }
    }
  }, [currentMosque]);

  // Handle Text Field Change
  const handleChange = (field: keyof Mosque, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Handle Letterhead Setting Change
  const handleLetterheadChange = (field: keyof MosqueLetterheadSettings, value: any) => {
    setLetterheadSettings((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Save General / Address / Letterhead changes
  const handleSave = async () => {
    if (!canEdit) {
      setErrorMsg('আপনার মসজিদ তথ্য পরিবর্তনের অনুমতি নেই।');
      return;
    }

    if (!formData.nameBn?.trim()) {
      setErrorMsg('মসজিদের বাংলা নাম আবশ্যক।');
      setActiveSubTab('identity');
      return;
    }

    if (!formData.phone?.trim()) {
      setErrorMsg('মসজিদের প্রধান যোগাযোগ নম্বর প্রদান করুন।');
      setActiveSubTab('address');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: Partial<Mosque> = {
        ...formData,
        name: formData.nameBn || formData.nameEn || currentMosque?.name || '',
        letterheadSettings,
      };

      await onSaveMosque(payload);
      setSuccessMsg('মসজিদের তথ্য ও লেটারহেড সফলভাবে সংরক্ষিত হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Logo Upload (Local File)
  const handleLogoUpload = async (file: File) => {
    if (!canEdit) {
      setErrorMsg('লোগো পরিবর্তনের অনুমতি নেই।');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('শুধুমাত্র PNG, JPG, JPEG, WEBP অথবা SVG ফরম্যাটের ছবি আপলোড করা যাবে।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('লোগো ফাইলের আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।');
      return;
    }

    setLogoUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch('/api/v1/mosques/current/branding/logo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type,
              base64Data: base64,
            }),
          });

          const data = await res.json();
          if (data.success && data.data) {
            setFormData((prev) => ({
              ...prev,
              logoUrl: data.data.logoUrl,
              logoAssetId: data.data.logoAssetId,
              logoMetadata: data.data.logoMetadata,
            }));
            await onSaveMosque({
              logoUrl: data.data.logoUrl,
              logoAssetId: data.data.logoAssetId,
              logoMetadata: data.data.logoMetadata,
            });
            setSuccessMsg('মসজিদের অফিসিয়াল লোগো সফলভাবে আপলোড ও আপডেট করা হয়েছে।');
          } else {
            throw new Error(data.error?.message || 'Logo upload failed');
          }
        } catch (innerErr: any) {
          setErrorMsg(innerErr.message || 'লোগো আপলোড ব্যর্থ হয়েছে।');
        } finally {
          setLogoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setLogoUploading(false);
      setErrorMsg(err.message || 'ফাইল প্রসেসিং ব্যর্থ হয়েছে।');
    }
  };

  // Handle Google Drive Logo Import
  const handleDriveLogoImport = async (driveUrl: string) => {
    if (!canEdit) {
      setErrorMsg('লোগো পরিবর্তনের অনুমতি নেই।');
      return;
    }

    setLogoUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/v1/mosques/current/branding/import-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ driveUrl }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setFormData((prev) => ({
          ...prev,
          logoUrl: data.data.logoUrl,
          logoAssetId: data.data.logoAssetId,
          logoMetadata: data.data.logoMetadata,
        }));
        await onSaveMosque({
          logoUrl: data.data.logoUrl,
          logoAssetId: data.data.logoAssetId,
          logoMetadata: data.data.logoMetadata,
        });
        setSuccessMsg('Google Drive থেকে অফিসিয়াল লোগো সফলভাবে ইমপোর্ট ও সংরক্ষণ করা হয়েছে।');
      } else {
        throw new Error(data.error?.message || 'Failed to import from Google Drive');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Drive থেকে লোগো আনতে ব্যর্থ হয়েছে। লিংকটি পাবলিক Viewer আছে কিনা নিশ্চিত করুন।');
    } finally {
      setLogoUploading(false);
    }
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    if (!canEdit) return;
    setConfirmDialog({
      isOpen: true,
      title: 'লোগো মুছে ফেলুন',
      message: 'আপনি কি নিশ্চিতভাবে মসজিদের বর্তমান সংরক্ষিত লোগো মুছে ফেলতে চান? এটি মুছে ফেললে সকল রসিদ ও লেটারহেডে ডিফল্ট মার্কার প্রদর্শিত হবে।',
      confirmText: 'হ্যাঁ, মুছে ফেলুন',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLogoUploading(true);
        try {
          await onSaveMosque({
            logoUrl: '',
            logoAssetId: undefined,
            logoMetadata: undefined,
          });
          setFormData((prev) => ({
            ...prev,
            logoUrl: '',
            logoAssetId: undefined,
            logoMetadata: undefined,
          }));
          setSuccessMsg('মসজিদের সংরক্ষিত লোগো সফলভাবে মুছে ফেলা হয়েছে।');
        } catch (err: any) {
          setErrorMsg(err.message || 'লোগো মুছতে ব্যর্থ হয়েছে।');
        } finally {
          setLogoUploading(false);
        }
      },
    });
  };

  // Handle Photo Upload (Mosque Building Photo)
  const handlePhotoUpload = async (file: File) => {
    if (!canEdit) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('শুধুমাত্র ছবি ফাইল (PNG, JPG, WEBP) আপলোড করা যাবে।');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('ছবির আকার সর্বোচ্চ ৮ মেগাবাইট (8MB) হতে পারে।');
      return;
    }

    setPhotoUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          await onSaveMosque({
            photoUrl: base64,
          });
          setFormData((prev) => ({ ...prev, photoUrl: base64 }));
          setSuccessMsg('মসজিদের মূল ছবি সফলভাবে সংরক্ষিত হয়েছে।');
        } catch (err: any) {
          setErrorMsg(err.message || 'ছবি সংরক্ষণ ব্যর্থ হয়েছে।');
        } finally {
          setPhotoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setPhotoUploading(false);
      setErrorMsg(err.message || 'ছবি প্রসেসিং ব্যর্থ হয়েছে।');
    }
  };

  // Handle Signature Upload
  const handleSignatureUpload = async (role: 'president' | 'secretary', file: File) => {
    if (!canEdit) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('স্বাক্ষরের জন্য স্বচ্ছ PNG বা ছবি ফাইল নির্বাচন করুন।');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('স্বাক্ষর ফাইলের আকার সর্বোচ্চ ২ মেগাবাইট হতে পারে।');
      return;
    }

    setSigUploading((prev) => ({ ...prev, [role]: true }));
    setErrorMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const key = role === 'president' ? 'presidentSignatureUrl' : 'secretarySignatureUrl';
          await onSaveMosque({ [key]: base64 });
          setFormData((prev) => ({ ...prev, [key]: base64 }));
          setSuccessMsg(`${role === 'president' ? 'সভাপতির' : 'সেক্রেটারির'} ডিজিটাল স্বাক্ষর সফলভাবে আপলোড হয়েছে।`);
        } catch (err: any) {
          setErrorMsg(err.message || 'স্বাক্ষর সংরক্ষণ ব্যর্থ হয়েছে।');
        } finally {
          setSigUploading((prev) => ({ ...prev, [role]: false }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setSigUploading((prev) => ({ ...prev, [role]: false }));
      setErrorMsg(err.message || 'স্বাক্ষর প্রসেসিং ব্যর্থ হয়েছে।');
    }
  };

  // Remove Signature
  const handleRemoveSignature = async (role: 'president' | 'secretary') => {
    if (!canEdit) return;
    const key = role === 'president' ? 'presidentSignatureUrl' : 'secretarySignatureUrl';
    setSigUploading((prev) => ({ ...prev, [role]: true }));
    try {
      await onSaveMosque({ [key]: '' });
      setFormData((prev) => ({ ...prev, [key]: '' }));
      setSuccessMsg('ডিজিটাল স্বাক্ষর মুছে ফেলা হয়েছে।');
    } catch (err: any) {
      setErrorMsg(err.message || 'স্বাক্ষর মুছতে ব্যর্থ হয়েছে।');
    } finally {
      setSigUploading((prev) => ({ ...prev, [role]: false }));
    }
  };

  // Print Blank Letterhead Pad
  const handlePrintLetterheadPad = async () => {
    try {
      await printElement('printable-mosque-letterhead-pad', {
        title: `${currentMosque?.nameBn || currentMosque?.name || 'মসজিদ'}_অফিসিয়াল_লেটারহেড_প্যাড`,
        pageSize: 'A4',
        pageOrientation: 'portrait',
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <PageHeader
        title="মসজিদ ব্যবস্থাপনা"
        subtitle="মসজিদের কেন্দ্রীয় পরিচয়, অবস্থান ও ঠিকানা, লোগো ও ছবি, অফিসিয়াল Letterhead এবং প্রশাসনিক নথিপত্র"
        icon={Landmark}
        actions={
          <div className="flex items-center space-x-2.5">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('publicPortal')}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
                title="পাবলিক পোর্টাল প্রিভিউ দেখুন"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">পাবলিক ভিউ</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Permission Warning Banner (if user cannot edit) */}
      {!canEdit && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center space-x-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>অনুমতি বার্তা:</strong> আপনি বর্তমানে শুধুমাত্র তথ্যসমূহ পড়ার (View Only) মোডে আছেন। মসজিদের পরিচয় ও লেটারহেড পরিবর্তনের জন্য সুপার অ্যাডমিন বা মসজিদ অ্যাডমিন হওয়া আবশ্যক।
          </span>
        </div>
      )}

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-medium text-emerald-900">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-medium text-rose-900">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-rose-700 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mosque Compact Summary Card (Central Source of Truth Banner) */}
      <div className="bg-gradient-to-r from-emerald-850 via-slate-900 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-900/60 relative overflow-hidden">
        {/* Subtle decorative Islamic arch geometric glow */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-emerald-500/10 pointer-events-none blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Mosque Logo & Main Identity */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white p-1.5 shadow-md shrink-0 flex items-center justify-center border border-white/20">
              {currentMosque?.logoUrl ? (
                <img
                  src={currentMosque.logoUrl}
                  alt={currentMosque.nameBn || 'Mosque Logo'}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Building className="w-8 h-8 text-emerald-700" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-siliguri text-white">
                  {formData.nameBn || currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}
                </h2>
                <span className="px-2 py-0.5 bg-emerald-700/80 text-emerald-100 text-[11px] font-mono font-semibold rounded-md border border-emerald-600/60">
                  {formData.code || currentMosque?.code || 'MOSQUE'}
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md">
                  সক্রিয় ওয়াকফ
                </span>
              </div>

              {formData.nameEn && (
                <p className="text-xs text-slate-300 font-medium">
                  {formData.nameEn}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="line-clamp-1">{formData.address || currentMosque?.address || 'ঠিকানা নির্ধারিত হয়নি'}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formData.phone || currentMosque?.phone || '—'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Info & Waqf Details */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs border-t md:border-t-0 md:border-l border-white/15 pt-3 md:pt-0 md:pl-5 text-slate-300">
            {formData.waqfEstateName && (
              <div className="bg-white/10 px-2.5 py-1 rounded-lg">
                <span className="text-slate-400">এস্টেট:</span>{' '}
                <span className="font-semibold text-white">{formData.waqfEstateName}</span>
              </div>
            )}
            {formData.registrationNumber && (
              <div className="bg-white/10 px-2.5 py-1 rounded-lg font-mono">
                <span className="text-slate-400 font-sans">রেজিস্ট্রেশন:</span>{' '}
                <span className="font-semibold text-emerald-300">{formData.registrationNumber}</span>
              </div>
            )}
            {formData.establishedDate && (
              <div className="text-[11px] text-slate-400">
                প্রতিষ্ঠা সাল: <span className="text-slate-200">{formData.establishedDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clean Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 sm:space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('identity')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'identity'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>১. মসজিদ পরিচিতি</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('address')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'address'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>২. যোগাযোগ ও ঠিকানা</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('media')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'media'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>৩. ছবি ও লোগো</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('letterhead')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'letterhead'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>৪. অফিসিয়াল Letterhead</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('documents')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'documents'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>৫. নথিপত্র ও ডকুমেন্টস</span>
        </button>
      </div>

      {/* SUB-TAB 1: মসজিদ পরিচিতি (Identity & Official Profile) */}
      {activeSubTab === 'identity' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <Landmark className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">মসজিদের মূল প্রাতিষ্ঠানিক পরিচয়</h3>
                <p className="text-xs text-slate-500">বাংলা ও ইংরেজি নাম, প্রতিষ্ঠা সাল এবং ওয়াকফ এস্টেটের পরিচিতি</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bengali Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <span>মসজিদের নাম (বাংলা)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.nameBn || ''}
                  onChange={(e) => handleChange('nameBn', e.target.value)}
                  placeholder="যেমন: মামুন জামে মসজিদ ওয়াকফ এস্টেট"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-siliguri text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* English Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mosque Name (English)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.nameEn || ''}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  placeholder="e.g. Mamun Jame Masjid Waqf Estate"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Mosque Unique Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>মসজিদ কোড / আইডি (Mosque Code)</span>
                  <span className="text-[10px] text-slate-400 font-normal">সিস্টেম আইডেন্টিফায়ার</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.code || ''}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  placeholder="যেমন: MAMUN-WAQF-01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Established Date / Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  প্রতিষ্ঠা সাল / তারিখ (Established Date)
                </label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={formData.establishedDate || ''}
                  onChange={(e) => handleChange('establishedDate', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Waqf Estate Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  ওয়াকফ এস্টেটের পূর্ণ নাম (Waqf Estate Name)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.waqfEstateName || ''}
                  onChange={(e) => handleChange('waqfEstateName', e.target.value)}
                  placeholder="যেমন: মামুন ওয়াকফ এস্টেট (ইসি নং: ১৮৪৫২)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Registration Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  সরকারি / ওয়াকফ রেজিস্ট্রেশন নম্বর
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.registrationNumber || ''}
                  onChange={(e) => handleChange('registrationNumber', e.target.value)}
                  placeholder="যেমন: REG-DHAKA-2014-9912"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Brief Description */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700">
                সংক্ষিপ্ত পরিচিতি ও ইতিহাস (Mosque Description)
              </label>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={formData.descriptionBn || ''}
                onChange={(e) => handleChange('descriptionBn', e.target.value)}
                placeholder="মসজিদের সংক্ষিপ্ত ইতিহাস, লক্ষ্য, কমপ্লেক্সের কার্যক্রম এবং বৈশিষ্ট্যসমূহ..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors shadow-xs cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>পরিবর্তন সংরক্ষণ করুন</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: যোগাযোগ ও ঠিকানা (Address & Contact) */}
      {activeSubTab === 'address' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <MapPin className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">মসজিদের ভৌগোলিক অবস্থান ও প্রশাসনিক ঠিকানা</h3>
                <p className="text-xs text-slate-500">বিভাগ, জেলা, উপজেলা, ইউনিয়ন/ওয়ার্ড এবং পূর্ণ পোস্টাল ঠিকানা</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Division */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">বিভাগ</label>
                <select
                  disabled={!canEdit}
                  value={formData.division || ''}
                  onChange={(e) => {
                    const div = e.target.value;
                    handleChange('division', div);
                    // Reset district if not in division
                    if (div && BANGLADESH_DISTRICTS[div] && !BANGLADESH_DISTRICTS[div].includes(formData.district || '')) {
                      handleChange('district', BANGLADESH_DISTRICTS[div][0] || '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                >
                  <option value="">-- বিভাগ নির্বাচন করুন --</option>
                  {BANGLADESH_DIVISIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">জেলা</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.district || ''}
                  onChange={(e) => handleChange('district', e.target.value)}
                  placeholder="যেমন: ঢাকা"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Upazila / Thana */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">উপজেলা / থানা</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.upazila || ''}
                  onChange={(e) => handleChange('upazila', e.target.value)}
                  placeholder="যেমন: মিরপুর / সদর"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Union / Municipality */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ইউনিয়ন / পৌরসভা / সিটি কর্পোরেশন</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.union || ''}
                  onChange={(e) => handleChange('union', e.target.value)}
                  placeholder="যেমন: ঢাকা উত্তর সিটি কর্পোরেশন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Ward */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ওয়ার্ড নং</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.ward || ''}
                  onChange={(e) => handleChange('ward', e.target.value)}
                  placeholder="যেমন: ওয়ার্ড নং ০৩"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>

              {/* Village / Mohalla */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">গ্রাম / মহল্লা / রোড</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.village || ''}
                  onChange={(e) => handleChange('village', e.target.value)}
                  placeholder="যেমন: ব্লক-সি, সেকশন-১২"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Full Formatted Address */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <span>পূর্ণ পোস্টাল ঠিকানা (Full Address)</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="বাড়ি #৪২, রোড #০৭, ব্লক #সি, মিরপুর-১২, ঢাকা-১২১৬"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
              />
              <p className="text-[11px] text-slate-400">এই ঠিকানাটি সমস্ত রশিদ, ভাউচার ও অফিশিয়াল লেটারহেডে স্বয়ংক্রিয়ভাবে সংযুক্ত হবে।</p>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <Phone className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">অফিসিয়াল যোগাযোগ মাধ্যম</h3>
                <p className="text-xs text-slate-500">মোবাইল নম্বর, ইমেইল ও ওয়েবসাইট তথ্য</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Mobile */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <span>প্রধান মোবাইল নম্বর</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+8801711223344"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Alt Mobile */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">বিকল্প মোবাইল নম্বর / অফিস ফোন</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.altPhone || ''}
                    onChange={(e) => handleChange('altPhone', e.target.value)}
                    placeholder="+8801811223344"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">অফিসিয়াল ইমেইল (Email)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    disabled={!canEdit}
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="info@mamunmosque.org"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ওয়েবসাইট (Website)</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://mamunmosque.org"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors shadow-xs cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>ঠিকানা ও যোগাযোগ সংরক্ষণ করুন</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ছবি ও লোগো (Photos & Logo) */}
      {activeSubTab === 'media' && (
        <div className="space-y-6">
          {/* Official Logo Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <ImageIcon className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">অফিসিয়াল মসজিদ লোগো (Official Logo)</h3>
                  <p className="text-xs text-slate-500">সকল ভাউচার, মানি রিসিট, রিপোর্ট ও লেটারহেডে প্রদর্শিত মূল ব্র্যান্ডিং লোগো</p>
                </div>
              </div>
              {formData.logoUrl && canEdit && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={logoUploading}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>লোগো মুছুন</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Logo Preview Box */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <div className="w-28 h-28 rounded-2xl bg-white p-2 shadow-sm border border-slate-200 flex items-center justify-center relative overflow-hidden">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Mosque Logo"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Building className="w-10 h-10 mx-auto text-slate-300 mb-1" />
                      <span className="text-[10px] font-medium">কোনো লোগো নেই</span>
                    </div>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin" />
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-600 mt-2.5">
                  {formData.logoUrl ? 'বর্তমান সক্রিয় লোগো' : 'লোগো আপলোড করুন'}
                </span>
                {formData.logoMetadata?.source && (
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    উৎস: {formData.logoMetadata.source === 'GOOGLE_DRIVE' ? 'Google Drive' : 'সরাসরি আপলোড'}
                  </span>
                )}
              </div>

              {/* Upload & Google Drive Import Options */}
              <div className="md:col-span-8 space-y-4">
                {/* Drag & Drop File Upload */}
                {canEdit ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                    onDragLeave={() => setIsDraggingLogo(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleLogoUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`p-5 rounded-2xl border-2 border-dashed text-center transition-all ${
                      isDraggingLogo
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-emerald-700 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      লোগো ফাইল টেনে আনুন অথবা ক্লিক করে আপলোড করুন
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      PNG, JPG, WEBP অথবা SVG (স্বচ্ছ ব্যাকগ্রাউন্ড বাঞ্ছনীয়, সর্বোচ্চ ৫ MB)
                    </p>

                    <label className="inline-block mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
                      <span>কম্পিউটার থেকে ছবি বাছুন</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLogoUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                    লোগো পরিবর্তন করার জন্য অ্যাডমিন অনুমতি প্রয়োজন।
                  </div>
                )}

                {/* Google Drive Import */}
                {canEdit && (
                  <div className="pt-2 border-t border-slate-100">
                    <DriveLinkInput
                      label="অথবা Google Drive থেকে লোগো সংযুক্ত করুন"
                      helperText="Google Drive ছবির লিংক পেস্ট করুন (যেমন: https://drive.google.com/file/d/...)। ফাইলটির এক্সেস 'Anyone with the link' হতে হবে।"
                      placeholder="https://drive.google.com/file/d/..."
                      onValidateAndSave={handleDriveLogoImport}
                      disabled={logoUploading}
                      required={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mosque Main Photo Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <Building className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">মসজিদের মূল ভবন ও মিনার ফটো (Exterior Photo)</h3>
                  <p className="text-xs text-slate-500">পাবলিক পোর্টাল ও ডিসপ্লে স্ক্রিনে প্রদর্শিত মসজিদের মূল ছবি</p>
                </div>
              </div>
              {formData.photoUrl && canEdit && (
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveMosque({ photoUrl: '' });
                    setFormData((prev) => ({ ...prev, photoUrl: '' }));
                    setSuccessMsg('মসজিদের ছবি মুছে ফেলা হয়েছে।');
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ছবি মুছুন</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Photo Preview Box */}
              <div className="md:col-span-5 h-44 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-xs">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Mosque Exterior"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <Building className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <span className="text-xs font-medium">কোনো ফটো সংরক্ষিত নেই</span>
                  </div>
                )}
                {photoUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="md:col-span-7 space-y-3">
                {canEdit ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingPhoto(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handlePhotoUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`p-5 rounded-2xl border-2 border-dashed text-center transition-all ${
                      isDraggingPhoto
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-emerald-700 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      মসজিদের সুন্দর একটি ছবি আপলোড করুন
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      JPG, PNG, WEBP (সর্বোচ্চ ৮ MB)
                    </p>

                    <label className="inline-block mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
                      <span>ছবি নির্বাচন করুন</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handlePhotoUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                    ছবি পরিবর্তন করার জন্য অ্যাডমিন অনুমতি প্রয়োজন।
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Official Digital Signatures Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <PenTool className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">অনুমোদিত ডিজিটাল স্বাক্ষর (Official Signatures)</h3>
                <p className="text-xs text-slate-500">ব্যাংক ট্রান্সফার লেটার, রেজুলেশন ও মানি রিসিটে যুক্ত করার জন্য স্বচ্ছ ডিজিটাল স্বাক্ষর</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* President Signature */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">১. সভাপতি / মোতাওয়াল্লী স্বাক্ষর</span>
                  {formData.presidentSignatureUrl && canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSignature('president')}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      মুছে ফেলুন
                    </button>
                  )}
                </div>

                <div className="h-24 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2 relative">
                  {formData.presidentSignatureUrl ? (
                    <img
                      src={formData.presidentSignatureUrl}
                      alt="President Signature"
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400">স্বাক্ষর নেই (প্রিন্টে খালি লাইন প্রযোজ্য)</span>
                  )}
                  {sigUploading.president && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin" />
                    </div>
                  )}
                </div>

                {canEdit && (
                  <label className="block w-full text-center px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                    <span>স্বাক্ষর আপলোড (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleSignatureUpload('president', e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Secretary Signature */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">২. সাধারণ সম্পাদক / খতিব স্বাক্ষর</span>
                  {formData.secretarySignatureUrl && canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSignature('secretary')}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      মুছে ফেলুন
                    </button>
                  )}
                </div>

                <div className="h-24 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2 relative">
                  {formData.secretarySignatureUrl ? (
                    <img
                      src={formData.secretarySignatureUrl}
                      alt="Secretary Signature"
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400">স্বাক্ষর নেই (প্রিন্টে খালি লাইন প্রযোজ্য)</span>
                  )}
                  {sigUploading.secretary && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin" />
                    </div>
                  )}
                </div>

                {canEdit && (
                  <label className="block w-full text-center px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                    <span>স্বাক্ষর আপলোড (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleSignatureUpload('secretary', e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: অফিসিয়াল Letterhead (Central Source of Truth) */}
      {activeSubTab === 'letterhead' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Letterhead Configuration Controls */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">লেটারহেড কনফিগারেশন</h3>
                    <p className="text-xs text-slate-500">প্যাড লেআউট, স্লোগান ও কাস্টমাইজেশন</p>
                  </div>
                </div>

                {/* Header Layout */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">হেডার স্টাইল ও লেআউট</label>
                  <select
                    disabled={!canEdit}
                    value={letterheadSettings.layout || 'STANDARD'}
                    onChange={(e) => handleLetterheadChange('layout', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                  >
                    <option value="STANDARD">১. ক্লাসিক্যাল ওয়াকফ প্যাড (Centered Arch)</option>
                    <option value="CENTERED">২. সেন্টার্ড টাইপোগ্রাফি (Formal Centered)</option>
                    <option value="MODERN_EMERALD">৩. মডার্ন পান্না সবুজ (Left Logo + Right Block)</option>
                    <option value="CLASSIC">৪. মিনিমালিস্ট একক লাইন (Clean Minimal)</option>
                  </select>
                </div>

                {/* Show Bismillah */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800">বিসমিল্লাহির রাহমানির রাহীম</span>
                    <p className="text-[11px] text-slate-500">লেটারহেডের শীর্ষে আরবী ক্যালিগ্রাফি প্রদর্শন</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={letterheadSettings.showBismillah ?? true}
                    onChange={(e) => handleLetterheadChange('showBismillah', e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500"
                  />
                </div>

                {/* Subtitle / Slogan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">সাবটাইটেল / দ্বীনি স্লোগান</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={letterheadSettings.subtitleBn || ''}
                    onChange={(e) => handleLetterheadChange('subtitleBn', e.target.value)}
                    placeholder="যেমন: একটি দ্বীনি, শিক্ষামূলক ও সমাজকল্যাণমূলক ওয়াকফ প্রতিষ্ঠান"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>

                {/* Footer Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">পাদটীকা / ফুটার বার্তা (Footer Note)</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={letterheadSettings.footerNoteBn || ''}
                    onChange={(e) => handleLetterheadChange('footerNoteBn', e.target.value)}
                    placeholder="যাবতীয় দান-অনুদান মসজিদের অফিসিয়াল রসিদ অথবা ব্যাংক একাউন্টের মাধ্যমে প্রদান করুন।"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50"
                  />
                </div>

                {/* Watermark Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800">ওয়াটারমার্ক ব্যাকগ্রাউন্ড</span>
                    <p className="text-[11px] text-slate-500">পাতার মাঝখানে হালকা অপাসিটিতে লোগো প্রদর্শন</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={letterheadSettings.showWatermark ?? true}
                    onChange={(e) => handleLetterheadChange('showWatermark', e.target.checked)}
                    className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500"
                  />
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-xs cursor-pointer"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>লেটারহেড সেটিংস সংরক্ষণ করুন</span>
                  </button>
                )}
              </div>

              {/* Print Blank Pad Button */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">ব্ল্যাংক লেটারহেড প্যাড প্রিন্ট</h4>
                  <p className="text-[11px] text-emerald-800">হাতে লেখা বা অফিশিয়াল সিলযুক্ত চিঠির জন্য প্রস্তুত প্যাড</p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintLetterheadPad}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্যাড প্রিন্ট</span>
                </button>
              </div>
            </div>

            {/* Live Interactive High-Resolution A4 Preview */}
            <div className="lg:col-span-7">
              <div className="bg-slate-200/80 p-4 sm:p-6 rounded-2xl border border-slate-300/80 shadow-inner flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-3 text-xs text-slate-700 font-bold">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>A4 লেটারহেড লাইভ প্রিভিউ (Live Print Preview)</span>
                  </div>
                  <span className="text-[11px] bg-white px-2 py-0.5 rounded-md border border-slate-300 font-mono">
                    210mm × 297mm
                  </span>
                </div>

                {/* Printable High-Resolution Letterhead Container */}
                <div
                  id="printable-mosque-letterhead-pad"
                  className="w-full max-w-[560px] min-h-[760px] bg-white rounded-lg shadow-xl p-8 flex flex-col justify-between border border-slate-300 relative select-none"
                  style={{ fontFamily: 'var(--font-siliguri, sans-serif)' }}
                >
                  {/* Subtle Central Watermark */}
                  {letterheadSettings.showWatermark && formData.logoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] overflow-hidden">
                      <img
                        src={formData.logoUrl}
                        alt="Watermark"
                        className="w-80 h-80 object-contain filter grayscale"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Top Letterhead Header Block */}
                  <div className="space-y-3 relative z-10">
                    {/* Bismillah Calligraphy */}
                    {letterheadSettings.showBismillah && (
                      <div className="text-center text-sm font-amiri font-bold text-slate-800 tracking-wider pb-1">
                        {letterheadSettings.bismillahText || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
                      </div>
                    )}

                    {/* Standard / Centered Layout */}
                    {letterheadSettings.layout !== 'MODERN_EMERALD' ? (
                      <div className="flex items-center justify-between border-b-2 border-emerald-900 pb-3 gap-4">
                        {/* Logo Left */}
                        <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                          {formData.logoUrl ? (
                            <img
                              src={formData.logoUrl}
                              alt="Mosque Logo"
                              className="max-w-full max-h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Building className="w-10 h-10 text-emerald-800" />
                          )}
                        </div>

                        {/* Center Typography */}
                        <div className="text-center flex-1 space-y-0.5">
                          <h1 className="text-base sm:text-lg font-bold text-emerald-950 font-siliguri leading-tight">
                            {formData.nameBn || currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}
                          </h1>
                          {formData.nameEn && (
                            <h2 className="text-[11px] font-semibold text-slate-700 tracking-wide font-sans">
                              {formData.nameEn}
                            </h2>
                          )}
                          {letterheadSettings.subtitleBn && (
                            <p className="text-[10px] text-emerald-800 font-medium italic">
                              {letterheadSettings.subtitleBn}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-600 pt-0.5">
                            {formData.address || currentMosque?.address || 'ঠিকানা নির্ধারিত হয়নি'}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            ফোন: {formData.phone || '—'} {formData.email ? `• ইমেইল: ${formData.email}` : ''}
                          </p>
                        </div>

                        {/* Reg / Waqf Badge Right */}
                        <div className="w-16 shrink-0 text-right text-[9px] text-slate-600 font-mono space-y-1">
                          {formData.code && (
                            <div className="font-bold text-emerald-900">
                              #{formData.code}
                            </div>
                          )}
                          {formData.registrationNumber && (
                            <div>
                              রেজিস্ট্রেশন:<br />{formData.registrationNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Modern Emerald Layout */
                      <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-emerald-50 p-1.5 rounded-xl border border-emerald-200">
                            {formData.logoUrl ? (
                              <img
                                src={formData.logoUrl}
                                alt="Mosque Logo"
                                className="max-w-full max-h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Building className="w-8 h-8 text-emerald-800" />
                            )}
                          </div>
                          <div>
                            <h1 className="text-base font-bold text-emerald-950 font-siliguri">
                              {formData.nameBn || currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}
                            </h1>
                            <p className="text-[11px] text-slate-700">{formData.nameEn}</p>
                            <p className="text-[10px] text-slate-500">{formData.address}</p>
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                          <p className="font-bold text-emerald-900">মোবাইল: {formData.phone}</p>
                          {formData.email && <p>{formData.email}</p>}
                          {formData.website && <p>{formData.website}</p>}
                        </div>
                      </div>
                    )}

                    {/* Reference & Date Bar */}
                    <div className="flex items-center justify-between pt-2 text-[10px] font-mono text-slate-600 border-b border-slate-200 pb-2">
                      <div>স্মারক নং: ................................................</div>
                      <div>তারিখ: ...... / ...... / ২০...... ইং</div>
                    </div>
                  </div>

                  {/* Sample Pad Writing Space (Watermark Body) */}
                  <div className="my-8 flex-1 flex flex-col justify-center items-center text-center opacity-40 text-slate-400">
                    <p className="text-xs italic">
                      [অফিসিয়াল চিঠি, নোটিশ, রেজুলেশন বা প্রত্যয়নপত্রের মূল বিবরণী এই স্থানে মুদ্রিত হবে]
                    </p>
                  </div>

                  {/* Bottom Signatures & Footer Note */}
                  <div className="relative z-10 space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-end justify-between px-4">
                      {/* Left: General Secretary Signature */}
                      <div className="text-center space-y-1">
                        <div className="h-12 flex items-end justify-center">
                          {formData.secretarySignatureUrl ? (
                            <img
                              src={formData.secretarySignatureUrl}
                              alt="Secretary Signature"
                              className="max-h-10 max-w-28 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                        </div>
                        <div className="w-36 border-t border-slate-700 pt-1 text-[10px] font-bold text-slate-800">
                          সাধারণ সম্পাদক / খতিব
                        </div>
                      </div>

                      {/* Right: President Signature */}
                      <div className="text-center space-y-1">
                        <div className="h-12 flex items-end justify-center">
                          {formData.presidentSignatureUrl ? (
                            <img
                              src={formData.presidentSignatureUrl}
                              alt="President Signature"
                              className="max-h-10 max-w-28 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                        </div>
                        <div className="w-36 border-t border-slate-700 pt-1 text-[10px] font-bold text-slate-800">
                          সভাপতি / মোতাওয়াল্লী
                        </div>
                      </div>
                    </div>

                    {/* Footer Note */}
                    {letterheadSettings.footerNoteBn && (
                      <div className="text-center text-[9px] text-slate-500 pt-1 border-t border-slate-100">
                        {letterheadSettings.footerNoteBn}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: নথিপত্র ও ডকুমেন্টস (Central Document Integration) */}
      {activeSubTab === 'documents' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-950">
            <div className="flex items-center space-x-2.5">
              <FolderOpen className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold">মসজিদের কেন্দ্রীয় নথিপত্র ও অনুমোদনপত্র:</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  ওয়াকফ দলিল, খতিয়ান, নামজারি, ট্যাক্স রসিদ, সরকারি অনুমোদনপত্র ও অন্যান্য প্রাতিষ্ঠানিক ডকুমেন্টস
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-white text-emerald-900 font-semibold rounded-lg border border-emerald-200 shrink-0">
              সেন্ট্রাল ডকুমেন্ট সিস্টেম
            </span>
          </div>

          {/* Reusable DocumentSection for Mosque Entity */}
          <DocumentSection
            entityType="MOSQUE"
            entityId={currentMosque?.id || 'mosque-main'}
            entityTitle={currentMosque?.nameBn || currentMosque?.name || 'মসজিদ পরিচয়'}
            title="মসজিদের অফিসিয়াল ডকুমেন্টস ও ফাইলসমূহ"
            allowUpload={canEdit}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          isDanger={confirmDialog.isDanger}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

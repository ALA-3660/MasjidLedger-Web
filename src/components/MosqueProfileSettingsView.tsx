import React, { useState, useEffect, useRef } from 'react';
import {
  Landmark,
  MapPin,
  Image as ImageIcon,
  FileText,
  PenTool,
  Receipt,
  QrCode,
  Globe,
  Clock,
  Cloud,
  Settings,
  FolderOpen,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  ExternalLink,
  Navigation,
  Compass,
  Printer,
  Copy,
  ChevronRight,
  Menu,
  X,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  FileCheck,
  Building2,
  Shield,
  Phone,
  Mail,
  Calendar,
  Lock,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { Mosque, User, MosqueLetterheadSettings } from '../types';
import { Language, translations } from '../lib/i18n';
import { api } from '../lib/api';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_GEO,
  getDivisions,
  getDistrictsByDivision,
  getUpazilasByDistrict,
  getUnionsByUpazila,
  reverseGeocodeCoordinates,
  formatFullBanglaAddress,
  ReverseGeocodeResult
} from '../lib/bangladeshAdministrativeData';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';
import { PublicPortalSettingsView } from './PublicPortalSettingsView';
import { GoogleDriveBackupView } from './GoogleDriveBackupView';
import { MosqueLocationPrayerSettings } from './MosqueLocationPrayerSettings';
import { DocumentSection } from './DocumentSection';
import { ConfirmDialog } from './common/ConfirmDialog';

export type MosqueSettingsSubTab =
  | 'identity'
  | 'address_contact'
  | 'branding'
  | 'letterhead'
  | 'signatures'
  | 'receipt_voucher'
  | 'online_qr'
  | 'public_portal'
  | 'prayer_location'
  | 'cloud_backup'
  | 'system_policy'
  | 'documents';

interface MosqueProfileSettingsViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
  onSaveMosque: (updated: Partial<Mosque>) => Promise<void>;
  onNavigateTab?: (tab: any) => void;
  onOpenLivePortal?: () => void;
  initialSubTab?: MosqueSettingsSubTab;
}

export const MosqueProfileSettingsView: React.FC<MosqueProfileSettingsViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  onSaveMosque,
  onNavigateTab,
  onOpenLivePortal,
  initialSubTab = 'identity',
}) => {
  const t = translations[language] || translations.bn;
  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN';

  // Subtab selection
  const [activeSubTab, setActiveSubTab] = useState<MosqueSettingsSubTab>(initialSubTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Consolidated form state
  const [formData, setFormData] = useState<Partial<Mosque>>({
    name: '',
    nameBn: '',
    nameEn: '',
    waqfEstateName: '',
    registrationNumber: '',
    descriptionBn: '',
    division: 'চট্টগ্রাম',
    district: 'কক্সবাজার',
    upazila: 'কক্সবাজার সদর',
    union: 'খুরুশকুল',
    ward: '',
    village: '',
    address: '',
    country: 'বাংলাদেশ',
    phone: '',
    altPhone: '',
    email: '',
    website: '',
    latitude: 21.4272,
    longitude: 92.0058,
    logoUrl: '',
    logoAssetId: '',
    photoUrl: '',
    coverPhotoUrl: '',
    presidentSignatureUrl: '',
    secretarySignatureUrl: '',
    establishedDate: '',
    letterheadSettings: {
      layout: 'CLASSICAL_WAQF',
      showBismillah: true,
      subtitleBn: 'গায়েবী মসজিদ নামে পরিচিত খুরুশকুলে সবচেয়ে পুরাতন মসজিদ',
      footerNoteBn: 'ওয়াকফ এস্টেটের সকল দান ও আয়-ব্যয় সরকারি ও শরীয়াহ অডিট সাপেক্ষে সংরক্ষিত।',
      showWatermark: true,
    },
    qrSettings: {
      bkashNumber: '',
      nagadNumber: '',
      rocketNumber: '',
      bankAccountInfo: '',
      onlinePaymentUrl: '',
      instructionsBn: '',
    },
  });

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  // Address Cascading Options
  const [districtList, setDistrictList] = useState<string[]>([]);
  const [upazilaList, setUpazilaList] = useState<string[]>([]);
  const [unionList, setUnionList] = useState<string[]>([]);
  const [customUnionInput, setCustomUnionInput] = useState('');

  // GPS & Map States
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [reverseGeocodeSuggestion, setReverseGeocodeSuggestion] = useState<ReverseGeocodeResult | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 21.4272, lng: 92.0058 });

  // Branding states
  const [logoUploading, setLogoUploading] = useState(false);
  const [driveImportUrl, setDriveImportUrl] = useState('');
  const [driveImporting, setDriveImporting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const presidentSigInputRef = useRef<HTMLInputElement>(null);
  const secretarySigInputRef = useRef<HTMLInputElement>(null);

  // Sync with currentMosque baseline
  useEffect(() => {
    if (currentMosque) {
      setFormData({
        name: currentMosque.name || '',
        nameBn: currentMosque.nameBn || '',
        nameEn: currentMosque.nameEn || '',
        waqfEstateName: currentMosque.waqfEstateName || '',
        registrationNumber: currentMosque.registrationNumber || '',
        descriptionBn: currentMosque.descriptionBn || '',
        division: currentMosque.division || 'চট্টগ্রাম',
        district: currentMosque.district || 'কক্সবাজার',
        upazila: currentMosque.upazila || 'কক্সবাজার সদর',
        union: currentMosque.union || 'খুরুশকুল',
        ward: currentMosque.ward || '',
        village: currentMosque.village || '',
        address: currentMosque.address || '',
        country: currentMosque.country || 'বাংলাদেশ',
        phone: currentMosque.phone || '',
        altPhone: currentMosque.altPhone || '',
        email: currentMosque.email || '',
        website: currentMosque.website || '',
        latitude: currentMosque.latitude ?? 21.4272,
        longitude: currentMosque.longitude ?? 92.0058,
        logoUrl: currentMosque.logoUrl || '',
        logoAssetId: currentMosque.logoAssetId || '',
        logoMetadata: currentMosque.logoMetadata,
        photoUrl: currentMosque.photoUrl || '',
        coverPhotoUrl: currentMosque.coverPhotoUrl || '',
        presidentSignatureUrl: currentMosque.presidentSignatureUrl || '',
        secretarySignatureUrl: currentMosque.secretarySignatureUrl || '',
        establishedDate: currentMosque.establishedDate || '',
        letterheadSettings: currentMosque.letterheadSettings || {
          layout: 'CLASSICAL_WAQF',
          showBismillah: true,
          subtitleBn: 'গায়েবী মসজিদ নামে পরিচিত খুরুশকুলে সবচেয়ে পুরাতন মসজিদ',
          footerNoteBn: 'ওয়াকফ এস্টেটের সকল দান ও আয়-ব্যয় সরকারি ও শরীয়াহ অডিট সাপেক্ষে সংরক্ষিত।',
          showWatermark: true,
        },
        qrSettings: currentMosque.qrSettings || {
          bkashNumber: '',
          nagadNumber: '',
          rocketNumber: '',
          bankAccountInfo: '',
          onlinePaymentUrl: '',
          instructionsBn: '',
        },
      });

      if (currentMosque.latitude && currentMosque.longitude) {
        setMapCenter({ lat: currentMosque.latitude, lng: currentMosque.longitude });
      }
    }
  }, [currentMosque]);

  // Update Cascading Dropdowns when Division changes
  useEffect(() => {
    const districts = getDistrictsByDivision(formData.division).map(d => d.nameBn);
    setDistrictList(districts);

    if (formData.district && !districts.includes(formData.district)) {
      setFormData(prev => ({ ...prev, district: districts[0] || '', upazila: '', union: '' }));
    }
  }, [formData.division]);

  // Update Cascading Dropdowns when District changes
  useEffect(() => {
    if (formData.district) {
      const upazilas = getUpazilasByDistrict(formData.district);
      setUpazilaList(upazilas);

      if (formData.upazila && !upazilas.includes(formData.upazila)) {
        setFormData(prev => ({ ...prev, upazila: upazilas[0] || '', union: '' }));
      }
    } else {
      setUpazilaList([]);
    }
  }, [formData.district]);

  // Update Cascading Dropdowns when Upazila changes
  useEffect(() => {
    if (formData.upazila) {
      const unions = getUnionsByUpazila(formData.upazila, formData.district);
      setUnionList(unions);
      if (formData.union && !unions.includes(formData.union)) {
        setCustomUnionInput(formData.union);
      }
    } else {
      setUnionList([]);
    }
  }, [formData.upazila]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Handle generic input change
  const handleInputChange = (field: keyof Mosque, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle Save
  const handleSave = async (customPayload?: Partial<Mosque>) => {
    if (!canEdit) {
      setErrorMsg('আপনার মসজিদ পরিচিতি ও সেটিংস সম্পাদনার অনুমতি নেই।');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload: Partial<Mosque> = customPayload || {
        name: formData.name,
        nameBn: formData.nameBn,
        nameEn: formData.nameEn,
        waqfEstateName: formData.waqfEstateName,
        registrationNumber: formData.registrationNumber,
        descriptionBn: formData.descriptionBn,
        division: formData.division,
        district: formData.district,
        upazila: formData.upazila,
        union: customUnionInput.trim() ? customUnionInput.trim() : formData.union,
        ward: formData.ward,
        village: formData.village,
        address: formData.address,
        country: formData.country || 'বাংলাদেশ',
        phone: formData.phone,
        altPhone: formData.altPhone,
        email: formData.email,
        website: formData.website,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        logoUrl: formData.logoUrl,
        logoAssetId: formData.logoAssetId,
        photoUrl: formData.photoUrl,
        coverPhotoUrl: formData.coverPhotoUrl,
        presidentSignatureUrl: formData.presidentSignatureUrl,
        secretarySignatureUrl: formData.secretarySignatureUrl,
        establishedDate: formData.establishedDate,
        letterheadSettings: formData.letterheadSettings,
        qrSettings: formData.qrSettings,
      };

      await onSaveMosque(payload);
      setSuccessMsg('মসজিদ পরিচিতি ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে।');
    } catch (err: any) {
      setErrorMsg(err.message || 'সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  // GPS Geolocation Handler
  const handleAcquireGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('আপনার ব্রাউজার বা ডিভাইসে জিপিএস লোকেশন সমর্থিত নয়।');
      return;
    }

    setIsGpsLoading(true);
    setGpsError('');
    setReverseGeocodeSuggestion(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setMapCenter({ lat, lng });

        // Trigger Reverse Geocoding for Suggestion Card
        try {
          const result = await reverseGeocodeCoordinates(lat, lng);
          if (result.success) {
            setReverseGeocodeSuggestion(result);
          }
        } catch (e) {
          console.warn('Reverse geocoding error:', e);
        }
      },
      (err) => {
        setIsGpsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('ব্রাউজারে লোকেশন পারমিশন অনুমোদিত নয়। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে লোকেশন পারমিশন দিন।');
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError('ডিভাইস থেকে জিপিএস লোকেশন তথ্য পাওয়া যায়নি। জিপিএস সক্রিয় আছে কিনা নিশ্চিত করুন।');
            break;
          case err.TIMEOUT:
            setGpsError('জিপিএস লোকেশন পেতে সময় অতিবাহিত হয়েছে। পুনরায় চেষ্টা করুন বা মানচিত্রে নির্বাচন করুন।');
            break;
          default:
            setGpsError('জিপিএস লোকেশন গ্রহণ করতে সমস্যা হয়েছে।');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Reverse Geocode Acceptance Safeguard
  const handleAcceptGeocodedAddress = () => {
    if (!reverseGeocodeSuggestion) return;
    setFormData(prev => {
      const updated: Partial<Mosque> = { ...prev };
      if (reverseGeocodeSuggestion.division) updated.division = reverseGeocodeSuggestion.division;
      if (reverseGeocodeSuggestion.district) updated.district = reverseGeocodeSuggestion.district;
      if (reverseGeocodeSuggestion.upazila) updated.upazila = reverseGeocodeSuggestion.upazila;
      if (reverseGeocodeSuggestion.village) updated.village = reverseGeocodeSuggestion.village;
      if (reverseGeocodeSuggestion.formattedSuggestion) {
        updated.address = reverseGeocodeSuggestion.formattedSuggestion;
      }
      return updated;
    });
    setSuccessMsg('GPS থেকে পাওয়া ঠিকানা সফলভাবে গ্রহণ করা হয়েছে। প্রয়োজন অনুযায়ী সম্পাদনা করুন।');
    setReverseGeocodeSuggestion(null);
  };

  // File Upload Handlers (Logo & Signatures)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('শুধুমাত্র PNG, JPEG বা WebP ইমেজ ফরম্যাট অনুমোদিত।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('লোগো ফাইলের আকার সর্বোচ্চ ৫ মেগাবাইট হতে পারে।');
      return;
    }

    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = (evt.target?.result as string).split(',')[1];
      try {
        const res = await fetch('/api/v1/mosques/current/branding/logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser?.id || '',
            'x-mosque-id': currentMosque?.id || '',
          },
          body: JSON.stringify({
            base64Data,
            mimeType: file.type,
            fileName: file.name,
          }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          setFormData(prev => ({
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
          setErrorMsg(data.error?.message || 'লোগো আপলোড ব্যর্থ হয়েছে।');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'সার্ভার যোগাযোগে সমস্যা হয়েছে।');
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDriveImport = async () => {
    if (!driveImportUrl.trim()) return;
    setDriveImporting(true);
    try {
      const res = await fetch('/api/v1/mosques/current/branding/import-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
          'x-mosque-id': currentMosque?.id || '',
        },
        body: JSON.stringify({ driveUrl: driveImportUrl.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setFormData(prev => ({
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
        setSuccessMsg('Google Drive থেকে অফিসিয়াল লোগো সফলভাবে ইমপোর্ট করা হয়েছে।');
        setDriveImportUrl('');
      } else {
        setErrorMsg(data.error?.message || 'Google Drive থেকে লোগো আনতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'যোগাযোগ ব্যর্থ হয়েছে।');
    } finally {
      setDriveImporting(false);
    }
  };

  const handleRemoveLogo = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'লোগো মুছে ফেলা নিশ্চিত করুন',
      message: 'আপনি কি নিশ্চিত যে বর্তমান অফিসিয়াল লোগোটি স্থায়ীভাবে মুছে ফেলতে চান?',
      confirmText: 'হ্যাঁ, মুছে ফেলুন',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await onSaveMosque({
            logoUrl: '',
            logoAssetId: undefined,
            logoMetadata: undefined,
          });
          setFormData(prev => ({
            ...prev,
            logoUrl: '',
            logoAssetId: undefined,
            logoMetadata: undefined,
          }));
          setSuccessMsg('লোগো সফলভাবে মুছে ফেলা হয়েছে।');
        } catch (e: any) {
          setErrorMsg(e.message || 'লোগো মোছা সম্ভব হয়নি।');
        }
      },
    });
  };

  const handleSignatureUpload = (type: 'president' | 'secretary', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        if (type === 'president') {
          handleInputChange('presidentSignatureUrl', dataUrl);
        } else {
          handleInputChange('secretarySignatureUrl', dataUrl);
        }
        setSuccessMsg(`${type === 'president' ? 'সভাপতি' : 'সাধারণ সম্পাদক'} স্বাক্ষর সংযুক্ত হয়েছে। সংরক্ষণ করুন।`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sidebar Menu Items Definition (Strict 12 Options)
  const SUB_TABS: { id: MosqueSettingsSubTab; label: string; icon: any; badge?: string }[] = [
    { id: 'identity', label: '১. 🏛️ মসজিদ পরিচিতি', icon: Landmark, badge: 'মূল পরিচয়' },
    { id: 'address_contact', label: '২. 📍 ঠিকানা ও যোগাযোগ', icon: MapPin },
    { id: 'branding', label: '৩. 🖼️ লোগো ও ব্র্যান্ডিং', icon: ImageIcon },
    { id: 'letterhead', label: '৪. 📄 অফিসিয়াল Letterhead', icon: FileText, badge: 'প্যাড' },
    { id: 'signatures', label: '৫. ✍️ অনুমোদিত স্বাক্ষর', icon: PenTool },
    { id: 'receipt_voucher', label: '৬. 🧾 রশিদ ও ভাউচার সেটিংস', icon: Receipt },
    { id: 'online_qr', label: '৭. 💳 অনলাইন ও QR দান', icon: QrCode },
    { id: 'public_portal', label: '৮. 🌐 পাবলিক পোর্টাল দৃশ্যমানতা', icon: Globe },
    { id: 'prayer_location', label: '৯. 🕌 অবস্থান ও নামাজের সময়সূচি', icon: Clock },
    { id: 'cloud_backup', label: '১০. ☁️ Google Drive ও Cloud Backup', icon: Cloud },
    { id: 'system_policy', label: '১১. ⚙️ সিস্টেম ও পলিসি', icon: Settings },
    { id: 'documents', label: '১২. 📁 কেন্দ্রীয় নথিপত্র', icon: FolderOpen, badge: 'সেন্ট্রাল' },
  ];

  return (
    <div className="space-y-4 font-siliguri pb-16">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md p-2 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Mosque Logo"
                  className="w-full h-full object-contain filter drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Landmark className="w-8 h-8 text-amber-300" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  ঐতিহ্যবাহী ওয়াকফ এস্টেট
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-emerald-200">
                  {currentMosque?.code || 'MAMUN-WAQF-01'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                🏛️ মসজিদ পরিচিতি ও সেটিংস
              </h1>
              <p className="text-xs text-emerald-100/80 font-sans mt-0.5">
                {currentMosque?.nameBn || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট'} • {currentMosque?.address || 'খুরুশকুল, কক্সবাজার'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2.5 self-end md:self-auto">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>পরিবর্তন সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            )}
            {onOpenLivePortal && (
              <button
                type="button"
                onClick={onOpenLivePortal}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-white/20"
                title="পাবলিক পোর্টাল দেখুন"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">লাইভ পোর্টাল</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center space-x-2 text-xs text-emerald-100 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-400/40 rounded-xl flex items-center space-x-2 text-xs text-rose-100 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Mobile Subtab Selector Button */}
      <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <Menu className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-bold text-slate-700">
            {SUB_TABS.find(t => t.id === activeSubTab)?.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
        >
          {isMobileMenuOpen ? 'বন্ধ করুন' : 'মেনু পরিবর্তন'}
        </button>
      </div>

      {/* Main Consolidated Layout: Secondary Left Sidebar + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= SECONDARY LEFT SIDEBAR (12 OPTIONS) ================= */}
        <div
          className={`lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-3 shadow-xs space-y-1 ${
            isMobileMenuOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            পরিচিতি ও কনফিগারেশন তালিকা
          </div>
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSubTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs transition-all text-left cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-700 text-white font-bold shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================= MAIN CONTENT VIEW PANEL ================= */}
        <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
          {/* TAB 1: 🏛️ মসজিদ পরিচিতি (Identity) */}
          {activeSubTab === 'identity' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">১. মসজিদ পরিচিতি ও মূল প্রোফাইল</h2>
                  <p className="text-xs text-slate-500">মসজিদের আনুষ্ঠানিক নাম, ওয়াকফ সনদ, রেজিস্ট্রেশন ও প্রতিষ্ঠাকালীন বিবরণ</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                  সার্ভার মালিকানাধীন পরিচয় সুরক্ষিত
                </span>
              </div>

              {/* Server-Owned Identity Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">মসজিদ সিস্টেম আইডি (System ID)</span>
                  <span className="font-mono font-bold text-slate-800">{currentMosque?.id || 'mosque-mamun-001'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">প্রাতিষ্ঠানিক কোড (Mosque Code)</span>
                  <span className="font-mono font-bold text-emerald-700">{currentMosque?.code || 'MAMUN-WAQF-01'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">নিবন্ধন শুরুর তারিখ (CreatedAt)</span>
                  <span className="font-mono text-slate-700">{currentMosque?.createdAt || '2026-01-01T00:00:00.000Z'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মসজিদের পূর্ণ নাম (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.nameBn || ''}
                    onChange={(e) => handleInputChange('nameBn', e.target.value)}
                    placeholder="যেমন: মামুন জামে মসজিদ ওয়াকফ এস্টেট"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mosque Official Name (English)
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.nameEn || ''}
                    onChange={(e) => handleInputChange('nameEn', e.target.value)}
                    placeholder="e.g. Mamun Jame Masjid Waqf Estate"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ওয়াকফ এস্টেটের পূর্ণ নাম ও EC নম্বর
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.waqfEstateName || ''}
                    onChange={(e) => handleInputChange('waqfEstateName', e.target.value)}
                    placeholder="যেমন: Mamun Waqf Estate (EC No: 18452)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সরকারি / ওয়াকফ রেজিস্ট্রেশন নম্বর
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.registrationNumber || ''}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    placeholder="যেমন: REG-DHAKA-2014-9912"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রতিষ্ঠা সাল / তারিখ
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.establishedDate || ''}
                    onChange={(e) => handleInputChange('establishedDate', e.target.value)}
                    placeholder="যেমন: ১৯৫২ বা ১৭৮০ খ্রিষ্টাব্দ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সার্বজনীন যোগাযোগ নম্বর
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+880 1711-000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সংক্ষিপ্ত পরিচিতি ও ঐতিহাসিক পটভূমি
                </label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={formData.descriptionBn || ''}
                  onChange={(e) => handleInputChange('descriptionBn', e.target.value)}
                  placeholder="মসজিদের সংক্ষিপ্ত পরিচিতি ও ঐতিহাসিক তথ্য লিখুন..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: 📍 ঠিকানা ও যোগাযোগ (Address & Contact - Enhanced Cascading Dropdowns + GPS + Map) */}
          {activeSubTab === 'address_contact' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">২. ঠিকানা ও যোগাযোগ ব্যবস্থা</h2>
                <p className="text-xs text-slate-500">প্রশাসনিক ৪-স্তরের ক্যাসকেডিং ঠিকানা, ম্যানুয়াল লোকেশন এবং জিপিএস জিও-কোঅর্ডিনেট</p>
              </div>

              {/* A. Administrative Cascading Dropdowns */}
              <div className="p-5 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-4">
                <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
                  <Compass className="w-4 h-4 text-emerald-700" />
                  <span>প্রশাসনিক ঠিকানা (বিভাগ → জেলা → উপজেলা/থানা → ইউনিয়ন)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Division */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">বিভাগ (Division)</label>
                    <select
                      disabled={!canEdit}
                      value={formData.division || 'চট্টগ্রাম'}
                      onChange={(e) => handleInputChange('division', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600"
                    >
                      {BANGLADESH_DIVISIONS.map((d) => (
                        <option key={d.id} value={d.nameBn}>
                          {d.nameBn} ({d.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">জেলা (District)</label>
                    <select
                      disabled={!canEdit}
                      value={formData.district || 'কক্সবাজার'}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600"
                    >
                      {districtList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Upazila / Thana */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">উপজেলা / থানা (Upazila)</label>
                    <select
                      disabled={!canEdit}
                      value={formData.upazila || 'কক্সবাজার সদর'}
                      onChange={(e) => handleInputChange('upazila', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600"
                    >
                      {upazilaList.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Union / Ward */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ইউনিয়ন / পৌর এলাকা (Union)</label>
                    <select
                      disabled={!canEdit}
                      value={formData.union || 'খুরুশকুল'}
                      onChange={(e) => {
                        handleInputChange('union', e.target.value);
                        setCustomUnionInput('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600"
                    >
                      {unionList.map((un) => (
                        <option key={un} value={un}>
                          {un}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Custom Union Input */}
                <div className="pt-1">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    তালিকায় না থাকলে কাস্টম ইউনিয়ন/এলাকা লিখুন:
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={customUnionInput}
                    onChange={(e) => setCustomUnionInput(e.target.value)}
                    placeholder="যেমন: খুরুশকুল বা বিশেষ ওয়ার্ড"
                    className="w-full sm:w-80 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* B. Manual Address Details */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-700">ম্যানুয়াল ঠিকানা ও যোগাযোগ বিবরণ:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ওয়ার্ড নং</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={formData.ward || ''}
                      onChange={(e) => handleInputChange('ward', e.target.value)}
                      placeholder="যেমন: ০৩ নং ওয়ার্ড"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">গ্রাম / মহল্লা</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={formData.village || ''}
                      onChange={(e) => handleInputChange('village', e.target.value)}
                      placeholder="যেমন: খুরুশকুল / মধ্যমপাড়া"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">ইমেইল ঠিকানা</label>
                    <input
                      type="email"
                      disabled={!canEdit}
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="info@mosque.org"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">বিকল্প ফোন নম্বর</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={formData.altPhone || ''}
                      onChange={(e) => handleInputChange('altPhone', e.target.value)}
                      placeholder="+880 1811-000000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    পূর্ণ অফিসিয়াল পোস্টাল ঠিকানা (Full Address Line)
                  </label>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="গ্রাম: খুরুশকুল, ডাকঘর: খুরুশকুল, উপজেলা: কক্সবাজার সদর, জেলা: কক্সবাজার"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {/* Address Live Preview Card */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-3 text-xs">
                  <MapPin className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block">পূর্ণ ঠিকানা প্রিভিউ (Preview):</span>
                    <span className="font-semibold text-slate-800">
                      {formatFullBanglaAddress({
                        village: formData.village,
                        ward: formData.ward,
                        union: customUnionInput || formData.union,
                        upazila: formData.upazila,
                        district: formData.district,
                        division: formData.division,
                      }) || formData.address || 'ঠিকানা নির্ধারিত হয়নি'}
                    </span>
                  </div>
                </div>
              </div>

              {/* C. Dedicated GPS Location Card */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold">📍 মসজিদের অবস্থান (GPS Location)</h3>
                      <p className="text-[11px] text-slate-300">নামাজের সঠিক সময় ও কিবলা গণনার জন্য নিখুঁত ভৌগোলিক স্থানাঙ্ক</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={isGpsLoading}
                      onClick={handleAcquireGpsLocation}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      {isGpsLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>লোকেশন রিড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5" />
                          <span>📍 বর্তমান GPS অবস্থান ব্যবহার করুন</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(!isMapPickerOpen)}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-white/20"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-300" />
                      <span>🗺️ মানচিত্রে অবস্থান নির্বাচন করুন</span>
                    </button>
                  </div>
                </div>

                {gpsError && (
                  <div className="p-3 bg-rose-500/20 border border-rose-400/30 rounded-xl text-xs text-rose-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                    <span>{gpsError}</span>
                  </div>
                )}

                {/* Coordinates Display & Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">অক্ষাংশ (Latitude - উত্তর)</label>
                    <input
                      type="number"
                      step="any"
                      disabled={!canEdit}
                      value={formData.latitude ?? 21.4272}
                      onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white font-mono focus:bg-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">দ্রাঘিমাংশ (Longitude - পূর্ব)</label>
                    <input
                      type="number"
                      step="any"
                      disabled={!canEdit}
                      value={formData.longitude ?? 92.0058}
                      onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white font-mono focus:bg-white/20"
                    />
                  </div>
                </div>

                {/* GPS Reverse Geocoding Safeguard Suggestion Card */}
                {reverseGeocodeSuggestion && (
                  <div className="p-4 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">📍 GPS থেকে পাওয়া সম্ভাব্য ঠিকানা:</span>
                      <button
                        type="button"
                        onClick={() => setReverseGeocodeSuggestion(null)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        বাতিল
                      </button>
                    </div>
                    <p className="text-xs text-slate-200">
                      {reverseGeocodeSuggestion.formattedSuggestion}
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAcceptGeocodedAddress}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        ✓ তথ্য গ্রহণ করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setReverseGeocodeSuggestion(null)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs cursor-pointer"
                      >
                        ম্যানুয়ালি সম্পাদনা করুন
                      </button>
                    </div>
                  </div>
                )}

                {/* Interactive Map Pin Picker (OpenStreetMap Tile Embed) */}
                {isMapPickerOpen && (
                  <div className="p-4 bg-white text-slate-900 rounded-2xl shadow-inner space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <MapPin className="w-4 h-4 text-emerald-700" />
                        <span>ওপেনস্ট্রিটম্যাপ মানচিত্র পিন প্রিভিউ</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Lat: {formData.latitude}, Lng: {formData.longitude}
                      </span>
                    </div>

                    <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-300 relative bg-slate-100 flex items-center justify-center">
                      <iframe
                        title="Mosque Location Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${(formData.longitude || 92.0058) - 0.01}%2C${(formData.latitude || 21.4272) - 0.01}%2C${(formData.longitude || 92.0058) + 0.01}%2C${(formData.latitude || 21.4272) + 0.01}&layer=mapnik&marker=${formData.latitude || 21.4272}%2C${formData.longitude || 92.0058}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>* অবস্থান পরিবর্তন করতে উপরের স্থানাঙ্ক পরিবর্তন করুন বা GPS রিড করুন।</span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${formData.latitude}&mlon=${formData.longitude}#map=16/${formData.latitude}/${formData.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-bold hover:underline inline-flex items-center space-x-1"
                      >
                        <span>বড় মানচিত্রে দেখুন</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 🖼️ লোগো ও ব্র্যান্ডিং (Branding) */}
          {activeSubTab === 'branding' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">৩. লোগো ও ব্র্যান্ডিং কনফিগারেশন</h2>
                <p className="text-xs text-slate-500">সকল অফিসিয়াল রসিদ, লেটারহেড, ভাউচার ও ব্যানারে ব্যবহৃত লোগো ও ছবি</p>
              </div>

              {/* Logo Manager Card */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Logo Preview */}
                  <div className="w-32 h-32 rounded-3xl bg-white p-3 shadow-md border border-slate-200 flex items-center justify-center relative shrink-0 overflow-hidden">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Mosque Logo"
                        className="w-full h-full object-contain filter drop-shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                    )}
                    {logoUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">অফিসিয়াল মসজিদ লোগো</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        স্বচ্ছ ব্যাকগ্রাউন্ডসহ PNG অথবা WebP ফরম্যাট সবচেয়ে মানসম্মত। সর্বোচ্চ ৫ মেগাবাইট।
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={!canEdit || logoUploading}
                        onClick={() => logoInputRef.current?.click()}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>ডিভাইস থেকে আপলোড</span>
                      </button>

                      {formData.logoUrl && (
                        <button
                          type="button"
                          disabled={!canEdit || logoUploading}
                          onClick={handleRemoveLogo}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>লোগো মুছুন</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Google Drive Import Option */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    অথবা Google Drive লিংক থেকে লোগো ইমপোর্ট করুন:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      disabled={!canEdit || driveImporting}
                      value={driveImportUrl}
                      onChange={(e) => setDriveImportUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      disabled={!canEdit || driveImporting || !driveImportUrl.trim()}
                      onClick={handleDriveImport}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {driveImporting ? 'ইমপোর্ট হচ্ছে...' : 'ইমপোর্ট করুন'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 📄 অফিসিয়াল Letterhead (Letterhead Management) */}
          {activeSubTab === 'letterhead' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">৪. অফিসিয়াল Letterhead প্যাড</h2>
                  <p className="text-xs text-slate-500">প্রশাসনিক চিঠিপত্র, প্রত্যয়নপত্র ও নোটিশের জন্য নির্ধারিত অফিসিয়াল প্যাড</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>খালি প্যাড প্রিন্ট</span>
                </button>
              </div>

              {/* Letterhead Configuration Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">লেটারহেড লেআউট প্রিসেট</label>
                  <select
                    disabled={!canEdit}
                    value={formData.letterheadSettings?.layout || 'CLASSICAL_WAQF'}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        letterheadSettings: {
                          ...prev.letterheadSettings!,
                          layout: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="CLASSICAL_WAQF">১. ক্লাসিক্যাল ওয়াকফ প্যাড (ঐতিহ্যবাহী)</option>
                    <option value="CENTERED_CREST">২. সেন্টারড টাইপোগ্রাফি (Centered)</option>
                    <option value="MODERN_EMERALD">৩. আধুনিক বাম লোগো + ডানে ব্লক</option>
                    <option value="MINIMAL_HEADER">৪. মিনিমালিস্ট হেডার (Minimalist)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4 pt-5">
                  <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.letterheadSettings?.showBismillah !== false}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          letterheadSettings: {
                            ...prev.letterheadSettings!,
                            showBismillah: e.target.checked,
                          },
                        }))
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>বিসমিল্লাহির রাহমানির রাহীম প্রদর্শন</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.letterheadSettings?.showWatermark !== false}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          letterheadSettings: {
                            ...prev.letterheadSettings!,
                            showWatermark: e.target.checked,
                          },
                        }))
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>জলছাপ (Watermark)</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    লেটারহেড সাবটাইটেল / দ্বীনি স্লোগান (Preserved)
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.letterheadSettings?.subtitleBn || 'গায়েবী মসজিদ নামে পরিচিত খুরুশকুলে সবচেয়ে পুরাতন মসজিদ'}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        letterheadSettings: {
                          ...prev.letterheadSettings!,
                          subtitleBn: e.target.value,
                        },
                      }))
                    }
                    placeholder="গায়েবী মসজিদ নামে পরিচিত খুরুশকুলে সবচেয়ে পুরাতন মসজিদ"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Live Official Letterhead Preview */}
              <div className="border border-slate-300 rounded-2xl p-6 bg-slate-100 shadow-inner">
                <span className="text-[11px] font-bold text-slate-500 block mb-3">
                  অফিসিয়াল লাইভ প্রিভিউ (A4 প্যাড ভিউ):
                </span>
                <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto border border-slate-200">
                  <MosqueOfficialLetterhead
                    mosque={{
                      ...(currentMosque || ({} as any)),
                      ...formData,
                    } as Mosque}
                  />
                  <div className="mt-8 pt-8 border-t border-dashed border-slate-300 min-h-[160px] flex items-center justify-center text-slate-300 text-xs italic">
                    [এখানে দাপ্তরিক চিঠিপত্র, নোটিশ বা অনুমোদনপত্রের মূল বিষয়বস্তু মুদ্রিত হবে]
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ✍️ অনুমোদিত স্বাক্ষর (Authorized Signatures) */}
          {activeSubTab === 'signatures' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">৫. অনুমোদিত স্বাক্ষর কনফিগারেশন</h2>
                <p className="text-xs text-slate-500">ভাউচার, আর্থিক অনুমোদন ও প্রত্যয়নপত্রে স্বয়ংক্রিয় স্বাক্ষরের জন্য</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* President Signature Card */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">সভাপতি / মোতাওয়াল্লী স্বাক্ষর</h4>
                      <p className="text-[11px] text-slate-500">President / Motawalli Authorized Signature</p>
                    </div>
                    {formData.presidentSignatureUrl ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">সংরক্ষিত</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">অনুপস্থিত</span>
                    )}
                  </div>

                  <div className="w-full h-28 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-2 relative overflow-hidden">
                    {formData.presidentSignatureUrl ? (
                      <img
                        src={formData.presidentSignatureUrl}
                        alt="President Signature"
                        className="max-h-full max-w-full object-contain filter contrast-125"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 italic">স্বাক্ষর নেই (প্রিন্টে খালি দাগ দেখাবে)</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={presidentSigInputRef}
                      onChange={(e) => handleSignatureUpload('president', e)}
                      accept="image/png,image/jpeg"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => presidentSigInputRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      স্বাক্ষর আপলোড
                    </button>
                    {formData.presidentSignatureUrl && (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => handleInputChange('presidentSignatureUrl', '')}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        মুছে ফেলুন
                      </button>
                    )}
                  </div>
                </div>

                {/* Secretary Signature Card */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">সাধারণ সম্পাদক / খতিব স্বাক্ষর</h4>
                      <p className="text-[11px] text-slate-500">Secretary / Khatib Authorized Signature</p>
                    </div>
                    {formData.secretarySignatureUrl ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">সংরক্ষিত</span>
                    ) : (
                      <span className="text-[10px] text-slate-400">অনুপস্থিত</span>
                    )}
                  </div>

                  <div className="w-full h-28 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-2 relative overflow-hidden">
                    {formData.secretarySignatureUrl ? (
                      <img
                        src={formData.secretarySignatureUrl}
                        alt="Secretary Signature"
                        className="max-h-full max-w-full object-contain filter contrast-125"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 italic">স্বাক্ষর নেই (প্রিন্টে খালি দাগ দেখাবে)</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={secretarySigInputRef}
                      onChange={(e) => handleSignatureUpload('secretary', e)}
                      accept="image/png,image/jpeg"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => secretarySigInputRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      স্বাক্ষর আপলোড
                    </button>
                    {formData.secretarySignatureUrl && (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => handleInputChange('secretarySignatureUrl', '')}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        মুছে ফেলুন
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: 🧾 রশিদ ও ভাউচার সেটিংস (Receipt & Voucher Settings) */}
          {activeSubTab === 'receipt_voucher' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">৬. রশিদ ও ভাউচার মুদ্রণ সেটিংস</h2>
                <p className="text-xs text-slate-500">মানি রিসিট ও ডেবিট/ক্রেডিট ভাউচারের প্রাক-নির্ধারিত ফরম্যাট ও প্রিফিক্স</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">ভাউচার ফরম্যাট কনফিগারেশন</h4>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">রশিদ নম্বর প্রিফিক্স (Receipt Prefix)</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      defaultValue="MR-"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">ভাউচার নম্বর প্রিফিক্স (Voucher Prefix)</label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      defaultValue="VCH-"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">প্রিন্টার মোড ও অটোমেশন</h4>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">ডিফল্ট প্রিন্টার সাইজ</label>
                    <select
                      disabled={!canEdit}
                      defaultValue="POS_80"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="POS_80">POS থার্মাল রিসিট (80mm)</option>
                      <option value="A4">A4 অফিসিয়াল ভাউচার প্যাড</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <label className="flex items-center space-x-2 text-xs cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                      <span>অর্থ গ্রহণের সাথে সাথে প্রিন্ট ডায়লগ খুলুন</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: 💳 অনলাইন ও QR দান (Online Donation & QR) */}
          {activeSubTab === 'online_qr' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">৭. অনলাইন ও কিউআর (QR) দান ব্যবস্থা</h2>
                <p className="text-xs text-slate-500">বিকাশ, নগদ, রকেট ও ব্যাংক একাউন্টের মাধ্যমে ডিজিটাল অনুদান গ্রহণ</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">বিকাশ মার্চেন্ট / পার্সোনাল নম্বর</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.qrSettings?.bkashNumber || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        qrSettings: { ...prev.qrSettings!, bkashNumber: e.target.value },
                      }))
                    }
                    placeholder="01700-000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">নগদ নম্বর</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.qrSettings?.nagadNumber || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        qrSettings: { ...prev.qrSettings!, nagadNumber: e.target.value },
                      }))
                    }
                    placeholder="01800-000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">রকেট নম্বর</label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.qrSettings?.rocketNumber || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        qrSettings: { ...prev.qrSettings!, rocketNumber: e.target.value },
                      }))
                    }
                    placeholder="01900-000000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ব্যাংক হিসাবের বিবরণ (Islami Bank Account Info)</label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={formData.qrSettings?.bankAccountInfo || ''}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      qrSettings: { ...prev.qrSettings!, bankAccountInfo: e.target.value },
                    }))
                  }
                  placeholder="হিসাবের নাম: মামুন জামে মসজিদ ওয়াকফ এস্টেট&#10;হিসাব নম্বর: ২০৫০১২৩৪৫৬৭৮৯০&#10;ব্যাংক: ইসলামী ব্যাংক বাংলাদেশ পিএলসি, কক্সবাজার শাখা"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 8: 🌐 পাবলিক পোর্টাল দৃশ্যমানতা (Public Portal Visibility - Phase 1 text removed) */}
          {activeSubTab === 'public_portal' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <PublicPortalSettingsView
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onSave={onSaveMosque}
                onOpenLivePortal={onOpenLivePortal}
              />
            </div>
          )}

          {/* TAB 9: 🕌 অবস্থান ও নামাজের সময়সূচি (Prayer Times & Calculation Settings) */}
          {activeSubTab === 'prayer_location' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <MosqueLocationPrayerSettings
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onSave={onSaveMosque}
                onNavigateTab={onNavigateTab}
              />
            </div>
          )}

          {/* TAB 10: ☁️ Google Drive ও Cloud Backup */}
          {activeSubTab === 'cloud_backup' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <GoogleDriveBackupView
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
              />
            </div>
          )}

          {/* TAB 11: ⚙️ সিস্টেম ও পলিসি (System & Security Policies) */}
          {activeSubTab === 'system_policy' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">১১. প্রাতিষ্ঠানিক সিস্টেম ও পলিসি</h2>
                <p className="text-xs text-slate-500">নিরাপত্তা নীতিমালা, সেশন কনফিগারেশন ও অডিট সিস্টেমের সংযোগ</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="font-bold text-slate-800 block">সিস্টেম সংস্করণ</span>
                    <span className="text-slate-500 text-[11px]">MasjidLedger Pro Production Engine</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg font-mono">
                    v2.6.0
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="font-bold text-slate-800 block">সিস্টেম ও আর্থিক অডিট লগ</span>
                    <span className="text-slate-500 text-[11px]">সকল প্রশাসনিক কর্মকাণ্ডের সময় ও ইউজারভিত্তিক লগ</span>
                  </div>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('audit')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      অডিট লগ দেখুন
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">ডাটাবেজ ও স্টেটাস</span>
                    <span className="text-slate-500 text-[11px]">মাল্টি-টেন্যান্ট সুরক্ষিত স্টোরেজ ও সিঙ্ক</span>
                  </div>
                  <span className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>সক্রিয় ও সিঙ্কড</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: 📁 কেন্দ্রীয় নথিপত্র (Central Institutional Documents) */}
          {activeSubTab === 'documents' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">১২. কেন্দ্রীয় নথিপত্র ও ফাইল সেন্টার</h2>
                <p className="text-xs text-slate-500">ওয়াকফ দলিল, খতিয়ান, নামজারি, ট্যাক্স রসিদ ও সরকারি অনুমোদনপত্রের ডিজিটাল সংরক্ষণাগার</p>
              </div>

              <DocumentSection
                entityType="MOSQUE"
                entityId={currentMosque?.id || 'mosque-mamun-001'}
                entityTitle={currentMosque?.nameBn || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট'}
                title="মসজিদের অফিসিয়াল প্রাতিষ্ঠানিক নথিপত্র ও দলিলসমূহ"
                allowUpload={canEdit}
                currentUser={currentUser}
              />
            </div>
          )}
        </div>
      </div>

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

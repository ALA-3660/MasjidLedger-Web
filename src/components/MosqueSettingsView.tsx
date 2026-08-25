import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  QrCode,
  FileCheck2,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Info,
  ShieldCheck,
  CreditCard,
  Hash,
  Landmark,
  Image as ImageIcon,
  PenTool,
  Trash2,
  RefreshCw,
  X,
  Check,
  FileUp,
  CloudDownload,
  ExternalLink,
  UploadCloud,
  FileImage,
  Sparkles,
  Layers,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Mosque, User } from '../types';
import { Language, translations } from '../lib/i18n';
import { api } from '../lib/api';

interface MosqueSettingsViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
  onSaveSettings: (settings: Partial<Mosque>) => Promise<void>;
}

export const MosqueSettingsView: React.FC<MosqueSettingsViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  onSaveSettings,
}) => {
  const t = translations[language] || translations.bn;

  const [activeTab, setActiveTab] = useState<'general' | 'address' | 'branding' | 'signatures' | 'vouchers' | 'qr' | 'system'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sigUploadError, setSigUploadError] = useState<{ president?: string; secretary?: string }>({});
  
  // Dedicated Logo Management State
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  const [gdriveImportLoading, setGdriveImportLoading] = useState(false);
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [logoActionSuccess, setLogoActionSuccess] = useState('');
  const [logoActionError, setLogoActionError] = useState('');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Mosque>>({
    nameBn: '',
    nameEn: '',
    code: '',
    waqfEstateName: '',
    registrationNumber: '',
    establishedDate: '',
    address: '',
    village: '',
    union: '',
    upazila: '',
    district: '',
    division: '',
    country: 'বাংলাদেশ',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    presidentSignatureUrl: '',
    secretarySignatureUrl: '',
    qrSettings: {
      bkashNumber: '',
      nagadNumber: '',
      rocketNumber: '',
      bankAccountInfo: '',
      onlinePaymentUrl: '',
      customQrImageUrl: '',
      instructionsBn: '',
    },
  });

  // Check Permissions
  const canEdit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('MANAGE_SETTINGS');

  useEffect(() => {
    if (currentMosque) {
      setFormData({
        nameBn: currentMosque.nameBn || currentMosque.name || '',
        nameEn: currentMosque.nameEn || '',
        code: currentMosque.code || '',
        waqfEstateName: currentMosque.waqfEstateName || '',
        registrationNumber: currentMosque.registrationNumber || '',
        establishedDate: currentMosque.establishedDate || '',
        address: currentMosque.address || '',
        village: currentMosque.village || '',
        union: currentMosque.union || '',
        upazila: currentMosque.upazila || '',
        district: currentMosque.district || '',
        division: currentMosque.division || '',
        country: currentMosque.country || 'বাংলাদেশ',
        phone: currentMosque.phone || '',
        email: currentMosque.email || '',
        website: currentMosque.website || '',
        logoUrl: currentMosque.logoUrl || '',
        presidentSignatureUrl: currentMosque.presidentSignatureUrl || '',
        secretarySignatureUrl: currentMosque.secretarySignatureUrl || '',
        qrSettings: {
          bkashNumber: currentMosque.qrSettings?.bkashNumber || '',
          nagadNumber: currentMosque.qrSettings?.nagadNumber || '',
          rocketNumber: currentMosque.qrSettings?.rocketNumber || '',
          bankAccountInfo: currentMosque.qrSettings?.bankAccountInfo || '',
          onlinePaymentUrl: currentMosque.qrSettings?.onlinePaymentUrl || '',
          customQrImageUrl: currentMosque.qrSettings?.customQrImageUrl || '',
          instructionsBn: currentMosque.qrSettings?.instructionsBn || '',
        },
      });
    }
  }, [currentMosque]);

  const handleInputChange = (field: keyof Mosque, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);
  };

  const handleQrChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      qrSettings: {
        ...(prev.qrSettings || {}),
        [field]: value,
      },
    }));
    setSaveSuccess(false);
  };

  const handleSignatureFile = (type: 'president' | 'secretary', file: File | null) => {
    if (!file) return;

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setSigUploadError((prev) => ({
        ...prev,
        [type]: 'শুধুমাত্র PNG, JPG বা JPEG ফরম্যাটের ইমেজ ফাইল গ্রহণযোগ্য (স্বচ্ছ PNG বাঞ্ছনীয়)।',
      }));
      return;
    }

    // Validate size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setSigUploadError((prev) => ({
        ...prev,
        [type]: 'স্বাক্ষর ফাইলের সাইজ সর্বোচ্চ ২ মেগাবাইট (2MB) হতে পারবে।',
      }));
      return;
    }

    setSigUploadError((prev) => ({ ...prev, [type]: undefined }));

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        if (type === 'president') {
          handleInputChange('presidentSignatureUrl', dataUrl);
        } else {
          handleInputChange('secretarySignatureUrl', dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRequestRemoveSignature = (type: 'president' | 'secretary') => {
    const title = type === 'president' ? 'সভাপতির সংরক্ষিত স্বাক্ষর মুছে ফেলা' : 'সেক্রেটারি / মোতাওয়াল্লীর সংরক্ষিত স্বাক্ষর মুছে ফেলা';
    const message = type === 'president'
      ? 'আপনি কি সভাপতির সংরক্ষিত ডিজিটাল স্বাক্ষরটি মুছে ফেলতে চান? মুছে ফেললে রশিদ ও রিপোর্টে খালি স্বাক্ষর লাইন মুদ্রিত হবে।'
      : 'আপনি কি সেক্রেটারি / মোতাওয়াল্লীর সংরক্ষিত ডিজিটাল স্বাক্ষরটি মুছে ফেলতে চান? মুছে ফেললে রশিদ ও রিপোর্টে খালি স্বাক্ষর লাইন মুদ্রিত হবে।';

    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'হ্যাঁ, স্বাক্ষর মুছে ফেলুন',
      isDanger: true,
      onConfirm: () => {
        if (type === 'president') {
          handleInputChange('presidentSignatureUrl', '');
        } else {
          handleInputChange('secretarySignatureUrl', '');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleRequestReplaceSignature = (type: 'president' | 'secretary', inputElementId: string) => {
    const title = type === 'president' ? 'সভাপতির স্বাক্ষর পরিবর্তন' : 'সেক্রেটারি / মোতাওয়াল্লীর স্বাক্ষর পরিবর্তন';
    const message = type === 'president'
      ? 'আপনি কি সভাপতির বর্তমান সংরক্ষিত স্বাক্ষর পরিবর্তন করে নতুন স্বাক্ষর আপলোড করতে চান?'
      : 'আপনি কি সেক্রেটারি / মোতাওয়াল্লীর বর্তমান সংরক্ষিত স্বাক্ষর পরিবর্তন করে নতুন স্বাক্ষর আপলোড করতে চান?';

    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'হ্যাঁ, নতুন স্বাক্ষর নির্বাচন করুন',
      isDanger: false,
      onConfirm: () => {
        setConfirmModal(null);
        const fileInput = document.getElementById(inputElementId) as HTMLInputElement;
        if (fileInput) {
          fileInput.click();
        }
      },
    });
  };

  // ----------------------------------------------------
  // Dedicated Mosque Logo Management Handlers
  // ----------------------------------------------------
  const handleLogoFileSelect = async (file: File | null) => {
    if (!file) return;
    if (!canEdit) {
      setLogoActionError('লোগো পরিবর্তন করার অনুমতি শুধুমাত্র অ্যাডমিনের রয়েছে।');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setLogoActionError('শুধুমাত্র PNG, JPG, JPEG বা WEBP ফরম্যাটের ছবি আপলোড করা যাবে।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoActionError('ফাইলের আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।');
      return;
    }

    setLogoActionError('');
    setLogoActionSuccess('');
    setLogoUploadLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result as string;
          const updatedMosque = await api.uploadMosqueLogo({
            fileName: file.name,
            fileType: file.type,
            base64Data,
          });
          setFormData((prev) => ({
            ...prev,
            logoUrl: updatedMosque.logoUrl,
            logoAssetId: updatedMosque.logoAssetId,
            logoMetadata: updatedMosque.logoMetadata,
          }));
          setLogoActionSuccess('মসজিদের অফিসিয়াল লোগো সফলভাবে আপলোড ও কেন্দ্রীয়ভাবে সংরক্ষণ করা হয়েছে।');
          setTimeout(() => setLogoActionSuccess(''), 5000);
        } catch (err: any) {
          setLogoActionError(err.message || 'লোগো আপলোড করতে সমস্যা হয়েছে।');
        } finally {
          setLogoUploadLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setLogoActionError(err.message || 'ফাইল প্রসেস করতে ব্যর্থ হয়েছে।');
      setLogoUploadLoading(false);
    }
  };

  const handleGoogleDriveImport = async () => {
    if (!canEdit) {
      setLogoActionError('লোগো পরিবর্তনের অনুমতি শুধুমাত্র অ্যাডমিনের রয়েছে।');
      return;
    }
    if (!gdriveUrl.trim()) {
      setLogoActionError('অনুগ্রহ করে একটি সঠিক Google Drive লিংক দিন।');
      return;
    }

    setLogoActionError('');
    setLogoActionSuccess('');
    setGdriveImportLoading(true);

    try {
      const updatedMosque = await api.importMosqueLogoFromGoogleDrive(gdriveUrl.trim());
      setFormData((prev) => ({
        ...prev,
        logoUrl: updatedMosque.logoUrl,
        logoAssetId: updatedMosque.logoAssetId,
        logoMetadata: updatedMosque.logoMetadata,
      }));
      setGdriveUrl('');
      setLogoActionSuccess('Google Drive থেকে লোগো সফলভাবে ইমপোর্ট ও সার্ভারে স্থায়ীভাবে সংরক্ষণ করা হয়েছে।');
      setTimeout(() => setLogoActionSuccess(''), 5000);
    } catch (err: any) {
      setLogoActionError(
        err.message ||
          'Google Drive লিংক থেকে লোগো নেওয়া সম্ভব হয়নি। অনুগ্রহ করে ফাইলটির এক্সেস "Anyone with the link (Viewer)" করা আছে কিনা নিশ্চিত করুন অথবা ছবিটি সরাসরি Upload করুন।'
      );
    } finally {
      setGdriveImportLoading(false);
    }
  };

  const handleRequestRemoveLogo = () => {
    if (!canEdit) return;
    setConfirmModal({
      isOpen: true,
      title: 'মসজিদের লোগো মুছে ফেলা',
      message: 'আপনি কি নিশ্চিতভাবে মসজিদের বর্তমান সংরক্ষিত অফিশিয়াল লোগোটি মুছে ফেলতে চান? এটি মুছে ফেললে অফিশিয়াল রশিদ, ভাউচার ও রিপোর্টে ডিফল্ট প্রতীক প্রদর্শিত হবে।',
      confirmText: 'হ্যাঁ, লোগো মুছে ফেলুন',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setLogoActionError('');
        setLogoActionSuccess('');
        try {
          await api.deleteMosqueLogo();
          setFormData((prev) => ({
            ...prev,
            logoUrl: '',
            logoAssetId: undefined,
            logoMetadata: undefined,
          }));
          setLogoActionSuccess('মসজিদের লোগো সফলভাবে মুছে ফেলা হয়েছে।');
          setTimeout(() => setLogoActionSuccess(''), 5000);
        } catch (err: any) {
          setLogoActionError(err.message || 'লোগো মুছে ফেলতে ব্যর্থ হয়েছে।');
        }
      },
    });
  };

  const handleSelectPresetLogo = (presetUrl: string, presetName: string) => {
    if (!canEdit) return;
    setLogoActionError('');
    setLogoActionSuccess('');
    handleInputChange('logoUrl', presetUrl);
    setLogoActionSuccess(`নমুনা লোগো "${presetName}" নির্বাচন করা হয়েছে। এটি স্থায়ী করতে ওপরের 'সেটিংস সংরক্ষণ করুন' বাটনে ক্লিক করুন।`);
    setTimeout(() => setLogoActionSuccess(''), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMessage('আপনার সেটিংস পরিবর্তনের অনুমতি নেই।');
      return;
    }

    if (!formData.nameBn?.trim()) {
      setErrorMessage('মসজিদের নাম (বাংলা) আবশ্যক।');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSaveSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {language === 'bn' ? 'মসজিদ সেটিং' : 'Mosque Settings'}
              </h2>
              <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {formData.code || 'CONFIG'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {language === 'bn'
                ? 'মসজিদের সার্বিক তথ্য, যোগাযোগের ঠিকানা, ওয়াকফ সনদ, অনলাইন দান কিউআর এবং সিস্টেম কনফিগারেশন পরিচালনা করুন।'
                : 'Configure mosque profile, waqf registration, contact details, receipt formats, and online QR payment settings.'}
            </p>
          </div>
        </div>

        {/* Status Badge / Action */}
        <div className="flex items-center space-x-2">
          {!canEdit ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>শুধুমাত্র দেখার অনুমতি (Read-Only)</span>
            </div>
          ) : (
            <button
              id="btn-save-mosque-settings-top"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>সেটিংস সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>মসজিদের সকল সেটিংস সফলভাবে হালনাগাদ ও সংরক্ষিত হয়েছে।</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto no-scrollbar space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'general'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>সাধারণ তথ্য ও ওয়াকফ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('address')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'address'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>ঠিকানা ও যোগাযোগ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>লোগো ও ব্র্যান্ডিং</span>
        </button>

        <button
          id="tab-btn-settings-signatures"
          type="button"
          onClick={() => setActiveTab('signatures')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'signatures'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>অনুমোদিত স্বাক্ষর</span>
          {(formData.presidentSignatureUrl || formData.secretarySignatureUrl) && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vouchers')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'vouchers'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>রশিদ ও ভাউচার সেটিংস</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'qr'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>অনলাইন ও কিউআর দান</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>সিস্টেম ও পলিসি</span>
        </button>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab 1: General Info */}
        {activeTab === 'general' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>মসজিদের মূল পরিচিতি ও ওয়াকফ সনদ</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদের প্রাতিষ্ঠানিক নাম এবং সরকারি/ওয়াকফ রেজিস্ট্রেশন নম্বর
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মসজিদের নাম (বাংলা) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={formData.nameBn || ''}
                  onChange={(e) => handleInputChange('nameBn', e.target.value)}
                  placeholder="যেমন: মামুন জামে মসজিদ ওয়াকফ এস্টেট"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মসজিদের নাম (ইংরেজি)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.nameEn || ''}
                  onChange={(e) => handleInputChange('nameEn', e.target.value)}
                  placeholder="e.g. Mamun Jame Masjid Waqf Estate"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মসজিদ কোড / আইডি
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="MAMUN-WAQF-01"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ওয়াকফ এস্টেটের নাম ও ইসি নম্বর
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.waqfEstateName || ''}
                  onChange={(e) => handleInputChange('waqfEstateName', e.target.value)}
                  placeholder="যেমন: মামুন ওয়াকফ এস্টেট (ইসি নং: ১৮৪৫২)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ওয়াকফ / সরকারি রেজিস্ট্রেশন নম্বর
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.registrationNumber || ''}
                  onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                  placeholder="REG-DHAKA-2014-9912"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রতিষ্ঠাকাল (তারিখ / সাল)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={formData.establishedDate || ''}
                    onChange={(e) => handleInputChange('establishedDate', e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Address & Contact */}
        {activeTab === 'address' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>ঠিকানা ও যোগাযোগের তথ্য</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদের অবস্থান, গ্রাম, থানা, জেলা এবং অফিসিয়াল যোগাযোগ নম্বর
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সম্পূর্ণ ঠিকানা (রোড, ব্লক, হোল্ডিং)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="বাড়ি #৪২, রোড #০৭, ব্লক #সি, মিরপুর-১২, ঢাকা-১২১৬"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  গ্রাম / মহল্লা / এলাকা
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.village || ''}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  placeholder="মিরপুর"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ইউনিয়ন / ওয়ার্ড নং
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.union || ''}
                  onChange={(e) => handleInputChange('union', e.target.value)}
                  placeholder="ওয়ার্ড নং ০৩"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  থানা / উপজেলা
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.upazila || ''}
                  onChange={(e) => handleInputChange('upazila', e.target.value)}
                  placeholder="মিরপুর"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  জেলা
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.district || ''}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  placeholder="ঢাকা"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিভাগ
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.division || ''}
                  onChange={(e) => handleInputChange('division', e.target.value)}
                  placeholder="ঢাকা"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  দেশ
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.country || 'বাংলাদেশ'}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  অফিসিয়াল ফোন / মোবাইল নম্বর
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+8801711223344"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ইমেইল ঠিকানা
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    disabled={!canEdit}
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="info@mamunmosque.org"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  অফিসিয়াল ওয়েবসাইট
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    disabled={!canEdit}
                    value={formData.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://mamunmosque.org"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Branding & Logo */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            {/* Action Feedback Alerts */}
            {logoActionSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-semibold animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{logoActionSuccess}</span>
              </div>
            )}
            {logoActionError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-semibold animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{logoActionError}</span>
              </div>
            )}

            {/* Main Branding Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              {/* Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      <span>মসজিদের লোগো ও অফিসিয়াল ব্র্যান্ডিং</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      মসজিদের নিজস্ব লোগো আপলোড ও সংরক্ষণ করুন। সংরক্ষিত লোগোটি প্রতিটি দান রসিদ, আয়/ব্যয় ভাউচার, ক্যাশ মেমো, আর্থিক অডিট প্রতিবেদন ও পোর্টালে স্বয়ংক্রিয়ভাবে ব্যবহৃত হবে।
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.logoUrl ? (
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>লোগো সক্রিয়</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg shrink-0">
                        কোনো লোগো নেই (ডিফল্ট আইকন)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden File Input for Direct Logo Upload */}
              <input
                id="file-input-mosque-logo"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleLogoFileSelect(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />

              {/* Master 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (5 Cols): Live Preview & Current Asset */}
                <div className="lg:col-span-5 flex flex-col items-center p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span>বর্তমান লোগো প্রিভিউ</span>
                    </span>
                    {formData.logoUrl && (
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        HD Preview
                      </span>
                    )}
                  </div>

                  {/* Logo Viewport Box with Subtle Checkerboard for Transparency */}
                  <div className="w-full h-48 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-4 shadow-inner relative overflow-hidden group">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Mosque Logo"
                        className="max-h-40 max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-100 shadow-xs">
                          <Building className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500">কোনো লোগো আপলোড করা হয়নি</span>
                        <span className="text-[10px] text-slate-400 text-center">ডকুমেন্টে ডিফল্ট মসজিদ আইকন ব্যবহৃত হচ্ছে</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata Info (if available) */}
                  {formData.logoMetadata && (
                    <div className="w-full bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">উৎস:</span>
                        <span className="font-medium text-slate-800">
                          {formData.logoMetadata.source === 'DIRECT_UPLOAD'
                            ? 'সরাসরি আপলোড'
                            : formData.logoMetadata.source === 'GOOGLE_DRIVE_IMPORT'
                            ? 'Google Drive'
                            : 'ডিফল্ট'}
                        </span>
                      </div>
                      {formData.logoMetadata.fileSizeBytes && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">ফাইলের সাইজ:</span>
                          <span className="font-mono text-slate-800">
                            {(formData.logoMetadata.fileSizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      )}
                      {formData.logoMetadata.mimeType && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">ফরমেট:</span>
                          <span className="font-mono text-slate-800 uppercase">
                            {formData.logoMetadata.mimeType.split('/')[1] || 'IMAGE'}
                          </span>
                        </div>
                      )}
                      {formData.logoMetadata.uploadedAt && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-500">আপলোডের সময়:</span>
                          <span className="text-slate-800">
                            {new Date(formData.logoMetadata.uploadedAt).toLocaleDateString('bn-BD')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Action Buttons for Existing Logo */}
                  <div className="w-full flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      disabled={!canEdit || logoUploadLoading || gdriveImportLoading}
                      onClick={() => {
                        const fileInput = document.getElementById('file-input-mosque-logo') as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      {logoUploadLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>আপলোড হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>{formData.logoUrl ? 'নতুন লোগো দিয়ে প্রতিস্থাপন করুন' : 'লোগো ফাইল আপলোড করুন'}</span>
                        </>
                      )}
                    </button>

                    {formData.logoUrl && (
                      <button
                        type="button"
                        disabled={!canEdit || logoUploadLoading || gdriveImportLoading}
                        onClick={handleRequestRemoveLogo}
                        className="w-full py-2 px-4 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>লোগো মুছে ফেলুন</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Column (7 Cols): Upload Tools & Drive Import */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Method 1: Direct File Upload (Primary Recommendation) */}
                  <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          ১
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">সরাসরি ফাইল আপলোড (সর্বোত্তম পদ্ধতি)</h4>
                          <p className="text-[11px] text-slate-500">আপনার কম্পিউটার বা মোবাইল থেকে লোগো নির্বাচন করুন</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                        সুপারিশকৃত
                      </span>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (canEdit) setIsDraggingLogo(true);
                      }}
                      onDragLeave={() => setIsDraggingLogo(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(false);
                        if (canEdit && e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleLogoFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => {
                        if (!canEdit || logoUploadLoading) return;
                        const fileInput = document.getElementById('file-input-mosque-logo') as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }}
                      className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        isDraggingLogo
                          ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                          : 'border-slate-300 hover:border-blue-400 bg-white'
                      }`}
                    >
                      <UploadCloud className={`w-10 h-10 mb-2 transition-colors ${isDraggingLogo ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold text-slate-800">
                        ছবিটি এখানে টেনে আনুন (Drag & Drop) অথবা ব্রাউজ করুন
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1">
                        PNG (স্বচ্ছ ব্যাকগ্রাউন্ড বাঞ্ছনীয়), JPG, JPEG, WEBP • সর্বোচ্চ সাইজ: ৫ মেগাবাইট (5MB)
                      </span>
                    </div>
                  </div>

                  {/* Method 2: Google Drive Image Import */}
                  <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          ২
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Google Drive লিংক থেকে ইমপোর্ট</h4>
                          <p className="text-[11px] text-slate-500">গুগল ড্রাইভের শেয়ার লিংক দিয়ে সার্ভারে যুক্ত করুন</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        অটো-ডাউনলোড
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          disabled={!canEdit || gdriveImportLoading}
                          value={gdriveUrl}
                          onChange={(e) => setGdriveUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/1a2b3c.../view?usp=sharing"
                          className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          disabled={!canEdit || gdriveImportLoading || !gdriveUrl.trim()}
                          onClick={handleGoogleDriveImport}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
                        >
                          {gdriveImportLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>ইমপোর্ট হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <CloudDownload className="w-4 h-4" />
                              <span>Drive থেকে Import</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Google Drive Help Notes */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                          <span>Google Drive লিংক ব্যবহারের নিয়মাবলী:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
                          <li>Google Drive-এ ছবির Share সেটিংসে "Anyone with the link (Viewer)" নির্বাচন করুন।</li>
                          <li>সিস্টেম স্বয়ংক্রিয়ভাবে ছবিটি ডাউনলোড করে মসজিদের নিজস্ব সার্ভারে স্থায়ীভাবে জমা রাখবে।</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Method 3: Sample Islamic Preset Logos */}
                  <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          ৩
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">নমুনা ইসলামিক লোগো টেমপ্লেট</h4>
                          <p className="text-[11px] text-slate-500">আপনার নিজস্ব লোগো তৈরি না থাকলে তাৎক্ষণিক ব্যবহারের জন্য</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                        রেডিমেড
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          name: 'ঐতিহ্যবাহী গম্বুজ',
                          url: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=180&auto=format&fit=crop&q=80',
                          desc: 'ক্লাসিকাল গম্বুজ',
                        },
                        {
                          name: 'আধুনিক মিনার',
                          url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=180&auto=format&fit=crop&q=80',
                          desc: 'মিনার প্রতীক',
                        },
                        {
                          name: 'জামে মসজিদ আর্ট',
                          url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=180&auto=format&fit=crop&q=80',
                          desc: 'ইসলামিক জ্যামিতি',
                        },
                      ].map((preset, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectPresetLogo(preset.url, preset.name)}
                          className={`p-2.5 bg-white border rounded-xl flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-xs group ${
                            formData.logoUrl === preset.url
                              ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-12 h-12 rounded-lg object-cover mb-1.5 border border-slate-200 group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[11px] font-bold text-slate-800 leading-tight">
                            {preset.name}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            {preset.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Authorized Digital Signatures */}
        {activeTab === 'signatures' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-blue-600" />
                    <span>অনুমোদিত স্বাক্ষর ব্যবস্থাপনা (Authorized Signatures)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    সভাপতি এবং সেক্রেটারি/মোতাওয়াল্লীর অনুমোদিত ডিজিটাল স্বাক্ষর কেন্দ্রীয়ভাবে সংরক্ষণ করুন। এখানে সংরক্ষিত স্বাক্ষর সকল অফিশিয়াল রশিদ, ভাউচার ও প্রতিবেদনে স্বয়ংক্রিয়ভাবে মুদ্রিত হবে।
                  </p>
                </div>
                {!canEdit && (
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg shrink-0">
                    শুধুমাত্র অ্যাডমিন পরিবর্তন করতে পারেন
                  </span>
                )}
              </div>
            </div>

            {/* Hidden File Inputs for Signatures */}
            <input
              id="file-input-president-sig"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => {
                handleSignatureFile('president', e.target.files?.[0] || null);
                e.target.value = '';
              }}
            />
            <input
              id="file-input-secretary-sig"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => {
                handleSignatureFile('secretary', e.target.files?.[0] || null);
                e.target.value = '';
              }}
            />

            {/* Two Signature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: President Signature */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      ১
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">সভাপতির স্বাক্ষর</h4>
                      <span className="text-[11px] text-slate-500 font-medium">President's Authorized Signature</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {formData.presidentSignatureUrl ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>স্বাক্ষর সংরক্ষিত</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>স্বাক্ষর সংরক্ষিত নেই</span>
                    </span>
                  )}
                </div>

                {/* Preview Box with Transparency Grid */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-700">স্বাক্ষর প্রিভিউ (ডকুমেন্টে যেভাবে প্রদর্শিত হবে):</div>
                  <div
                    className="h-28 w-full border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden transition-all bg-white"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  >
                    {formData.presidentSignatureUrl ? (
                      <img
                        src={formData.presidentSignatureUrl}
                        alt="President Signature Preview"
                        className="max-h-full max-w-full object-contain drop-shadow-xs"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400 space-y-1">
                        <PenTool className="w-6 h-6 mx-auto stroke-1 text-slate-300" />
                        <p className="text-xs">কোনো স্বাক্ষর আপলোড করা হয়নি</p>
                        <p className="text-[10px] text-slate-400">প্রিন্টে স্বাভাবিক খালি স্বাক্ষর রেখা মুদ্রিত হবে</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {sigUploadError.president && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{sigUploadError.president}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    {!formData.presidentSignatureUrl ? (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => document.getElementById('file-input-president-sig')?.click()}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>নতুন স্বাক্ষর ফাইল আপলোড</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleRequestReplaceSignature('president', 'file-input-president-sig')}
                          className="flex-1 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                          <span>পরিবর্তন করুন</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleRequestRemoveSignature('president')}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>মুছে ফেলুন</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Direct URL input */}
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">অথবা সরাসরি ইমেজ লিংক (URL) প্রদান করুন:</label>
                    <input
                      type="url"
                      disabled={!canEdit}
                      value={formData.presidentSignatureUrl || ''}
                      onChange={(e) => handleInputChange('presidentSignatureUrl', e.target.value)}
                      placeholder="https://... বা ডাটা URL"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Secretary / Mutawalli Signature */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      ২
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">সেক্রেটারি / মোতাওয়াল্লীর স্বাক্ষর</h4>
                      <span className="text-[11px] text-slate-500 font-medium">Secretary / Mutawalli's Signature</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {formData.secretarySignatureUrl ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>স্বাক্ষর সংরক্ষিত</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>স্বাক্ষর সংরক্ষিত নেই</span>
                    </span>
                  )}
                </div>

                {/* Preview Box with Transparency Grid */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-700">স্বাক্ষর প্রিভিউ (ডকুমেন্টে যেভাবে প্রদর্শিত হবে):</div>
                  <div
                    className="h-28 w-full border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden transition-all bg-white"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  >
                    {formData.secretarySignatureUrl ? (
                      <img
                        src={formData.secretarySignatureUrl}
                        alt="Secretary Signature Preview"
                        className="max-h-full max-w-full object-contain drop-shadow-xs"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400 space-y-1">
                        <PenTool className="w-6 h-6 mx-auto stroke-1 text-slate-300" />
                        <p className="text-xs">কোনো স্বাক্ষর আপলোড করা হয়নি</p>
                        <p className="text-[10px] text-slate-400">প্রিন্টে স্বাভাবিক খালি স্বাক্ষর রেখা মুদ্রিত হবে</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {sigUploadError.secretary && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{sigUploadError.secretary}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    {!formData.secretarySignatureUrl ? (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => document.getElementById('file-input-secretary-sig')?.click()}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>নতুন স্বাক্ষর ফাইল আপলোড</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleRequestReplaceSignature('secretary', 'file-input-secretary-sig')}
                          className="flex-1 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                          <span>পরিবর্তন করুন</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleRequestRemoveSignature('secretary')}
                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>মুছে ফেলুন</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Direct URL input */}
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">অথবা সরাসরি ইমেজ লিংক (URL) প্রদান করুন:</label>
                    <input
                      type="url"
                      disabled={!canEdit}
                      value={formData.secretarySignatureUrl || ''}
                      onChange={(e) => handleInputChange('secretarySignatureUrl', e.target.value)}
                      placeholder="https://... বা ডাটা URL"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informational Guidance Box */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 text-xs text-slate-700 space-y-2">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>স্বাক্ষর ব্যবহারের নিয়মাবলী ও কারিগরি নির্দেশিকা:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                <li>
                  <strong>স্বচ্ছ ব্যাকগ্রাউন্ড (Transparent PNG):</strong> পরিষ্কার ও সুন্দর প্রিন্টের জন্য স্বচ্ছ ব্যাকগ্রাউন্ডের পিএনজি ফরম্যাটের স্বাক্ষর আপলোড করা সুপারিশ করা হচ্ছে।
                </li>
                <li>
                  <strong>ফাইলের সাইজ:</strong> স্বাক্ষর ফাইলের সাইজ সর্বোচ্চ ২ মেগাবাইট (2MB)।
                </li>
                <li>
                  <strong>আদায়কারী / প্রস্তুতকারী / ক্যাশিয়ার স্বাক্ষর:</strong> রশিদ ও ভাউচারে আদায়কারী বা হিসাব প্রস্তুতকারীর অংশটি লেনদেনের সময় সরাসরি কাগজে কলমে হস্তাক্ষরে স্বাক্ষরের জন্য খালি থাকবে।
                </li>
                <li>
                  <strong>নিরাপত্তা ও অডিট ট্রেইল:</strong> স্বাক্ষর পরিবর্তন বা মুছে ফেলার সাথে সাথে সিস্টেমে অপরিবর্তনীয় অডিট লগ সংরক্ষিত হবে।
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 5: Voucher & Receipt Settings */}
        {activeTab === 'vouchers' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <span>রশিদ ও ভাউচার ফরম্যাট সেটিংস</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                আদায় রসিদ, ব্যয় ভাউচার প্রিফিক্স এবং প্রিন্ট ফুটনোটের নিয়মাবলী
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  আয় রসিদ প্রিফিক্স (Income Voucher Prefix)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  defaultValue="INC"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">উদাহরণ: INC-2026-000001</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্যয় ভাউচার প্রিফিক্স (Expense Voucher Prefix)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  defaultValue="EXP"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-1">উদাহরণ: EXP-2026-000001</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রসিদের নিচের শর্তাবলী ও দোয়া (Receipt Footer Note)
                </label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  defaultValue="আল্লাহ তায়ালা আপনার দান কবুল করুন ও উত্তম প্রতিদান দান করুন। জাযাকাল্লাহু খাইরান।"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Digital Signatures for President & Secretary */}
              <div className="md:col-span-2 pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>রশিদ ও ভাউচারে ডিজিটাল স্বাক্ষর (Authorized Signatures)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    সেক্রেটারী/মোতাওয়াল্লী ও সভাপতির অনুমোদিত স্বাক্ষর (স্বচ্ছ ব্যাকগ্রাউন্ড পিএনজি ফরম্যাট সবচেয়ে উপযোগী)। আদায়কারী/ক্যাশিয়ার অংশে সরাসরি হাতে স্বাক্ষর হবে।
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Secretary / Mutawalli Signature */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">সেক্রেটারী / মোতাওয়াল্লী স্বাক্ষর</span>
                      {formData.secretarySignatureUrl && (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleInputChange('secretarySignatureUrl', '')}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                        >
                          মুছে ফেলুন
                        </button>
                      )}
                    </div>

                    <div className="h-20 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                      {formData.secretarySignatureUrl ? (
                        <img
                          src={formData.secretarySignatureUrl}
                          alt="Secretary Signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">কোনো স্বাক্ষর আপলোড করা হয়নি</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">স্বাক্ষর ইমেজ লিংক (URL) বা ফাইল নির্বাচন:</label>
                      <input
                        type="url"
                        disabled={!canEdit}
                        value={formData.secretarySignatureUrl || ''}
                        onChange={(e) => handleInputChange('secretarySignatureUrl', e.target.value)}
                        placeholder="https://... বা স্বচ্ছ পিএনজি ইমেজ URL"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* President Signature */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">সভাপতি স্বাক্ষর</span>
                      {formData.presidentSignatureUrl && (
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleInputChange('presidentSignatureUrl', '')}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                        >
                          মুছে ফেলুন
                        </button>
                      )}
                    </div>

                    <div className="h-20 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                      {formData.presidentSignatureUrl ? (
                        <img
                          src={formData.presidentSignatureUrl}
                          alt="President Signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-400">কোনো স্বাক্ষর আপলোড করা হয়নি</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">স্বাক্ষর ইমেজ লিংক (URL) বা ফাইল নির্বাচন:</label>
                      <input
                        type="url"
                        disabled={!canEdit}
                        value={formData.presidentSignatureUrl || ''}
                        onChange={(e) => handleInputChange('presidentSignatureUrl', e.target.value)}
                        placeholder="https://... বা স্বচ্ছ পিএনজি ইমেজ URL"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Online & QR Donation Settings */}
        {activeTab === 'qr' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>অনলাইন ও কিউআর দান (QR Donation Settings)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                পাবলিক পোর্টাল ও পোস্টারে প্রদর্শিত বিকাশ, নগদ, রকেট ও ব্যাংক একাউন্ট
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিকাশ মার্চেন্ট / পার্সোনাল নম্বর
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.qrSettings?.bkashNumber || ''}
                  onChange={(e) => handleQrChange('bkashNumber', e.target.value)}
                  placeholder="01711223344 (Merchant)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নগদ মার্চেন্ট / পার্সোনাল নম্বর
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.qrSettings?.nagadNumber || ''}
                  onChange={(e) => handleQrChange('nagadNumber', e.target.value)}
                  placeholder="01711223344 (Merchant)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রকেট নম্বর
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.qrSettings?.rocketNumber || ''}
                  onChange={(e) => handleQrChange('rocketNumber', e.target.value)}
                  placeholder="01711223344-8"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্যাংক হিসাবের পূর্ণ বিবরণ (পাবলিক দানের জন্য)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.qrSettings?.bankAccountInfo || ''}
                  onChange={(e) => handleQrChange('bankAccountInfo', e.target.value)}
                  placeholder="ইসলামী ব্যাংক বাংলাদেশ লিঃ, একাউন্ট নাম: মামুন মসজিদ ফান্ড, হিসাব নং: ২০৫০১২৩৪৫৬৭৮৯০, শাখা: মিরপুর"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  দানকারীদের জন্য পেমেন্ট রেফারেন্সের বিশেষ নির্দেশনা
                </label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  value={formData.qrSettings?.instructionsBn || ''}
                  onChange={(e) => handleQrChange('instructionsBn', e.target.value)}
                  placeholder="বিকাশ বা নগদ অ্যাপের মার্চেন্ট পেমেন্ট অপশনে গিয়ে রেফারেন্সে আপনার নাম বা দানের খাত লিখুন।"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: System & Policy */}
        {activeTab === 'system' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>সিস্টেম ও আর্থিক নীতি কনফিগারেশন</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                আর্থিক বছর নির্ধারণ, মুদ্রা এবং অটোমেশন সেটিংস
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ডিফল্ট মুদ্রা (Currency)
                </label>
                <input
                  type="text"
                  disabled
                  value="BDT (৳) - বাংলাদেশি টাকা"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  চলতি আর্থিক বছর (Fiscal Year)
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  defaultValue="2026-2027"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নগদ ক্যাশ সতর্কবার্তা সীমা (Low Cash Warning Limit)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  defaultValue={10000}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  আয়-ব্যয় অটো-অ্যাপ্রুভাল সীমা (টাকা)
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  defaultValue={5000}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        {canEdit && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>পরিবর্তন নিশ্চিত করতে নিচের বাটনে চাপুন। একটি অডিট রেকর্ড তৈরি হবে।</span>
            </div>

            <button
              id="btn-save-mosque-settings-bottom"
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>সেটিংস সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    confirmModal.isDanger
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{confirmModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${
                  confirmModal.isDanger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmText || 'নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

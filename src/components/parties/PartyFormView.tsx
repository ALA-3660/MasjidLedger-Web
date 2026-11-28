import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  ExternalLink,
  FileScan,
  ImagePlus,
  Info,
  Plus,
  Save,
  Trash2,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';
import {
  PartyOcrScannerModal,
  PartyOcrVerifiedApplyPayload,
} from './PartyOcrScannerModal';
import { api } from '../../lib/api';
import {
  PARTY_CATEGORY_GROUP_LABELS,
  PARTY_PROFILE_TYPE_LABELS,
  getAllRoleDefinitions,
  getPartyRoleLabelBn,
  partyHasArtisanRole,
} from '../../lib/partyCatalog';
import {
  PartyArtisanDetails,
  PartyCustomRoleDef,
  PartyDuplicateReasonCode,
  PartyOrganizationDetails,
  PartyProfileType,
  PartyRecord,
  PartyRoleCategoryGroup,
  PartyStatus,
} from '../../types/partyTypes';
import { toBanglaNumber } from '../CommitteeView';

const BD_DIVISIONS = [
  'ঢাকা',
  'চট্টগ্রাম',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'সিলেট',
  'রংপুর',
  'ময়মনসিংহ',
];

export interface PartyFormViewProps {
  mode: 'create' | 'edit';
  initialParty?: PartyRecord | null;
  customRoles: PartyCustomRoleDef[];
  canManageRoles: boolean;
  canUseOcr?: boolean;
  onCancel: () => void;
  onSaved: (saved: PartyRecord) => void;
  onCustomRoleCreated: (role: PartyCustomRoleDef) => void;
  onOpenExistingProfile: (partyId: string) => void;
}

interface DuplicateMatchItem {
  party: PartyRecord;
  confidence: 'HIGH' | 'MEDIUM';
  reasons: PartyDuplicateReasonCode[];
  reasonLabelsBn: string[];
}

export const PartyFormView: React.FC<PartyFormViewProps> = ({
  mode,
  initialParty,
  customRoles,
  canManageRoles,
  canUseOcr = true,
  onCancel,
  onSaved,
  onCustomRoleCreated,
  onOpenExistingProfile,
}) => {
  const [partyType, setPartyType] = useState<PartyProfileType>(
    initialParty?.partyType || 'INDIVIDUAL'
  );
  const [name, setName] = useState(initialParty?.name || '');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    initialParty?.roles || []
  );
  const [photoOrLogoUrl, setPhotoOrLogoUrl] = useState(
    initialParty?.photoOrLogoUrl || ''
  );
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const [phone, setPhone] = useState(initialParty?.phone || '');
  const [alternatePhone, setAlternatePhone] = useState(
    initialParty?.alternatePhone || ''
  );
  const [email, setEmail] = useState(initialParty?.email || '');

  const [fullAddress, setFullAddress] = useState(
    initialParty?.fullAddress || ''
  );
  const [villageOrMahalla, setVillageOrMahalla] = useState(
    initialParty?.villageOrMahalla || ''
  );
  const [unionOrWard, setUnionOrWard] = useState(
    initialParty?.unionOrWard || ''
  );
  const [upazila, setUpazila] = useState(initialParty?.upazila || '');
  const [district, setDistrict] = useState(initialParty?.district || '');
  const [division, setDivision] = useState(initialParty?.division || '');
  const [postCode, setPostCode] = useState(initialParty?.postCode || '');

  const [nidNumber, setNidNumber] = useState(initialParty?.nidNumber || '');
  const [occupationOrSkill, setOccupationOrSkill] = useState(
    initialParty?.occupationOrSkill || ''
  );
  const [description, setDescription] = useState(
    initialParty?.description || ''
  );
  const [notes, setNotes] = useState(initialParty?.notes || '');
  const [status, setStatus] = useState<PartyStatus>(
    initialParty?.status || 'ACTIVE'
  );

  // Organization Extra Details
  const [orgDetails, setOrgDetails] = useState<PartyOrganizationDetails>(
    initialParty?.organizationDetails || {}
  );

  // Artisan / Labourer Descriptive Details (No financial automation)
  const [artisanDetails, setArtisanDetails] = useState<PartyArtisanDetails>(
    initialParty?.artisanDetails || {}
  );
  const [showArtisanSectionManual, setShowArtisanSectionManual] = useState(
    Boolean(
      initialParty?.artisanDetails &&
        Object.values(initialParty.artisanDetails).some(Boolean)
    )
  );

  // Custom role inline creation
  const [showAddRoleBox, setShowAddRoleBox] = useState(false);
  const [newRoleLabelBn, setNewRoleLabelBn] = useState('');
  const [newRoleLabelEn, setNewRoleLabelEn] = useState('');
  const [newRoleCategoryGroup, setNewRoleCategoryGroup] =
    useState<PartyRoleCategoryGroup>('OTHER');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleError, setRoleError] = useState('');

  // Duplicate check state
  const [duplicateMatches, setDuplicateMatches] = useState<
    DuplicateMatchItem[]
  >([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Submit & OCR state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrAppliedNotice, setOcrAppliedNotice] = useState(false);

  const handleApplyOcrData = (payload: PartyOcrVerifiedApplyPayload) => {
    setPartyType(payload.partyType);
    if (payload.name) setName(payload.name);
    if (payload.phone) setPhone(payload.phone);
    if (payload.alternatePhone) setAlternatePhone(payload.alternatePhone);
    if (payload.email) setEmail(payload.email);
    if (payload.nidNumber) setNidNumber(payload.nidNumber);
    if (payload.fullAddress) setFullAddress(payload.fullAddress);
    if (payload.villageOrMahalla) setVillageOrMahalla(payload.villageOrMahalla);
    if (payload.unionOrWard) setUnionOrWard(payload.unionOrWard);
    if (payload.upazila) setUpazila(payload.upazila);
    if (payload.district) setDistrict(payload.district);
    if (payload.division) setDivision(payload.division);
    if (payload.postCode) setPostCode(payload.postCode);
    if (payload.occupationOrSkill) setOccupationOrSkill(payload.occupationOrSkill);
    if (payload.description) {
      setDescription((prev) => (prev.trim() ? prev : payload.description || ''));
    }
    if (payload.organizationDetails) {
      setOrgDetails((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(payload.organizationDetails || {}).filter(([, v]) => Boolean(v))
        ),
      }));
    }
    if (payload.roles && payload.roles.length > 0) {
      setSelectedRoles((prev) => Array.from(new Set([...prev, ...payload.roles])));
    }
    setOcrAppliedNotice(true);
    setOcrModalOpen(false);
  };

  const allRoleDefs = useMemo(
    () => getAllRoleDefinitions(customRoles),
    [customRoles]
  );

  const groupedRoles = useMemo(() => {
    const groups: Array<{
      group: PartyRoleCategoryGroup;
      label: string;
      roles: typeof allRoleDefs;
    }> = [
      {
        group: 'BUYER',
        label: PARTY_CATEGORY_GROUP_LABELS.BUYER,
        roles: [],
      },
      {
        group: 'SELLER_SUPPLIER',
        label: PARTY_CATEGORY_GROUP_LABELS.SELLER_SUPPLIER,
        roles: [],
      },
      {
        group: 'ARTISAN_LABOUR',
        label: PARTY_CATEGORY_GROUP_LABELS.ARTISAN_LABOUR,
        roles: [],
      },
      {
        group: 'CONTRACTOR_PROVIDER',
        label: PARTY_CATEGORY_GROUP_LABELS.CONTRACTOR_PROVIDER,
        roles: [],
      },
      {
        group: 'OTHER',
        label: PARTY_CATEGORY_GROUP_LABELS.OTHER,
        roles: [],
      },
    ];
    for (const r of allRoleDefs) {
      const target =
        groups.find((g) => g.group === r.categoryGroup) || groups[4];
      target.roles.push(r);
    }
    return groups.filter((g) => g.roles.length > 0);
  }, [allRoleDefs]);

  const hasArtisanRoleSelected = useMemo(
    () => partyHasArtisanRole(selectedRoles, customRoles),
    [selectedRoles, customRoles]
  );

  // Live debounced duplicate check
  useEffect(() => {
    const hasEnoughInput =
      phone.trim().length >= 6 ||
      alternatePhone.trim().length >= 6 ||
      nidNumber.trim().length >= 8 ||
      (partyType === 'ORGANIZATION' && name.trim().length >= 3);

    if (!hasEnoughInput) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicates(true);
        const matches = await api.checkPartyDuplicates({
          excludePartyId: mode === 'edit' ? initialParty?.id : undefined,
          partyType,
          name: name.trim(),
          phone: phone.trim(),
          alternatePhone: alternatePhone.trim() || undefined,
          nidNumber: nidNumber.trim() || undefined,
        });
        setDuplicateMatches(matches);
      } catch {
        // Ignore silent check errors while typing
      } finally {
        setCheckingDuplicates(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [
    partyType,
    name,
    phone,
    alternatePhone,
    nidNumber,
    mode,
    initialParty?.id,
  ]);

  const toggleRole = (code: string) => {
    setSelectedRoles((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('শুধুমাত্র ছবি ফাইল (PNG, JPG, WebP) নির্বাচন করুন।');
      return;
    }
    if (file.size > 900 * 1024) {
      setErrorMsg('ছবি বা লোগোর সাইজ সর্বোচ্চ ৯০০ কেবি-র মধ্যে হতে হবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoOrLogoUrl(reader.result);
        setImageLoadFailed(false);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCustomRole = async () => {
    if (!newRoleLabelBn.trim()) {
      setRoleError('নতুন ভূমিকার বাংলা নাম লিখুন।');
      return;
    }
    try {
      setIsCreatingRole(true);
      setRoleError('');
      const created = await api.createPartyCustomRole({
        labelBn: newRoleLabelBn.trim(),
        labelEn: newRoleLabelEn.trim() || undefined,
        categoryGroup: newRoleCategoryGroup,
      });
      onCustomRoleCreated(created);
      setSelectedRoles((prev) =>
        prev.includes(created.code) ? prev : [...prev, created.code]
      );
      setNewRoleLabelBn('');
      setNewRoleLabelEn('');
      setShowAddRoleBox(false);
    } catch (err: any) {
      setRoleError(err?.message || 'নতুন ভূমিকা তৈরি করা যায়নি।');
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg(
        partyType === 'ORGANIZATION'
          ? 'প্রতিষ্ঠান বা ব্যবসায়িক সংস্থার নাম প্রদান করা আবশ্যক।'
          : 'ব্যক্তির পূর্ণ নাম প্রদান করা আবশ্যক।'
      );
      return;
    }
    if (selectedRoles.length === 0) {
      setErrorMsg('কমপক্ষে একটি ভূমিকা (Role) নির্বাচন করতে হবে।');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('প্রাথমিক মোবাইল নম্বর প্রদান করা আবশ্যক।');
      return;
    }

    const payload: Partial<PartyRecord> = {
      partyType,
      name: name.trim(),
      roles: selectedRoles,
      photoOrLogoUrl: photoOrLogoUrl.trim() || '',
      phone: phone.trim(),
      alternatePhone: alternatePhone.trim() || undefined,
      email: email.trim() || undefined,
      fullAddress: fullAddress.trim() || undefined,
      villageOrMahalla: villageOrMahalla.trim() || undefined,
      unionOrWard: unionOrWard.trim() || undefined,
      upazila: upazila.trim() || undefined,
      district: district.trim() || undefined,
      division: division.trim() || undefined,
      postCode: postCode.trim() || undefined,
      nidNumber: nidNumber.trim() || undefined,
      occupationOrSkill: occupationOrSkill.trim() || undefined,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      organizationDetails:
        partyType === 'ORGANIZATION' ? orgDetails : undefined,
      artisanDetails:
        hasArtisanRoleSelected || showArtisanSectionManual
          ? artisanDetails
          : undefined,
    };

    try {
      setIsSaving(true);
      const saved =
        mode === 'edit' && initialParty
          ? await api.updateParty(initialParty.id, payload)
          : await api.createParty(payload);
      onSaved(saved);
    } catch (err: any) {
      setErrorMsg(err?.message || 'তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 font-siliguri">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            ফিরে যান
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'edit'
                ? 'ব্যক্তি বা প্রতিষ্ঠানের প্রোফাইল সম্পাদনা'
                : 'নতুন ব্যক্তি, প্রতিষ্ঠান বা সেবাদাতা যোগ করুন'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'edit' && initialParty
                ? `স্থায়ী কোড: ${initialParty.partyCode} · পার্টি আইডি: ${initialParty.partyId}`
                : 'একটি প্রোফাইলে প্রয়োজন অনুযায়ী একাধিক ভূমিকা (ক্রেতা, বিক্রেতা, কারিগর, ঠিকাদার ইত্যাদি) যুক্ত করা যাবে।'}
            </p>
          </div>
        </div>

        {/* OCR Scan & Status Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canUseOcr && (
            <button
              type="button"
              onClick={() => setOcrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold transition-colors"
            >
              <FileScan className="w-3.5 h-3.5" />
              ক্যামেরা / ডকুমেন্ট OCR স্ক্যান (AI)
            </button>
          )}
          <span className="text-xs font-medium text-slate-600">অবস্থা:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setStatus('ACTIVE')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                status === 'ACTIVE'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সক্রিয় (Active)
            </button>
            <button
              type="button"
              onClick={() => setStatus('INACTIVE')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                status === 'INACTIVE'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              নিষ্ক্রিয় (Inactive)
            </button>
          </div>
        </div>
      </div>

      {ocrAppliedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              OCR থেকে আপনার যাচাইকৃত খসড়া তথ্য ফর্মে বসানো হয়েছে। অনুগ্রহ করে চূড়ান্তভাবে মিলিয়ে ও ভূমিকা নির্বাচন করে সংরক্ষণ করুন।
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOcrAppliedNotice(false)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Duplicate Detection Alert */}
      {duplicateMatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-950">
                সম্ভাব্য ডুপ্লিকেট প্রোফাইল শনাক্ত হয়েছে (
                {toBanglaNumber(duplicateMatches.length)}টি)
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                একই মোবাইল নম্বর, জাতীয় পরিচয়পত্র বা প্রতিষ্ঠানের নামের সাথে মিল পাওয়া গেছে। নতুন করে তৈরি না করে বিদ্যমান প্রোফাইলে নতুন ভূমিকা যোগ করতে পারেন।
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {duplicateMatches.map((m) => (
              <div
                key={m.party.id}
                className="bg-white border border-amber-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {m.party.name}
                  </div>
                  <div className="text-xs text-slate-600 font-baloo tabular-nums">
                    {m.party.partyCode} · {m.party.phone}
                  </div>
                  <div className="text-[11px] font-medium text-amber-800 mt-0.5">
                    কারণ: {m.reasonLabelsBn.join(', ')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenExistingProfile(m.party.id)}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-semibold transition-colors"
                >
                  প্রোফাইল দেখুন
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800 flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Profile Type & Core Identity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              ১. মৌলিক পরিচিতি ও প্রোফাইলের ধরন
            </h3>
            {checkingDuplicates && (
              <span className="text-xs text-slate-500">
                ডুপ্লিকেট তথ্য যাচাই চলছে...
              </span>
            )}
          </div>

          {/* Profile Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              প্রোফাইলের ধরন <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {(['INDIVIDUAL', 'ORGANIZATION'] as PartyProfileType[]).map(
                (typeOption) => {
                  const active = partyType === typeOption;
                  return (
                    <button
                      key={typeOption}
                      type="button"
                      onClick={() => setPartyType(typeOption)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                        active
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {typeOption === 'INDIVIDUAL' ? (
                        <UserIcon
                          className={`w-5 h-5 shrink-0 ${
                            active ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        />
                      ) : (
                        <Building2
                          className={`w-5 h-5 shrink-0 ${
                            active ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        />
                      )}
                      <div>
                        <div className="text-sm font-bold">
                          {PARTY_PROFILE_TYPE_LABELS[typeOption]}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {typeOption === 'INDIVIDUAL'
                            ? 'একক ব্যক্তি, কারিগর, শ্রমিক, ক্রেতা বা ঠিকাদার'
                            : 'দোকান, সাপ্লায়ার, কোম্পানি, ঠিকাদারি বা সেবা প্রতিষ্ঠান'}
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Photo/Logo & Primary Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Photo / Logo Uploader */}
            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {partyType === 'ORGANIZATION'
                  ? 'প্রতিষ্ঠানের লোগো'
                  : 'ব্যক্তির ছবি'}
              </label>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 flex flex-col items-center text-center gap-2.5">
                <div className="w-20 h-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                  {photoOrLogoUrl && !imageLoadFailed ? (
                    <img
                      src={photoOrLogoUrl}
                      alt={name || 'Party'}
                      onError={() => setImageLoadFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : partyType === 'ORGANIZATION' ? (
                    <Building2 className="w-8 h-8 text-slate-300" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700">
                    <ImagePlus className="w-3.5 h-3.5" />
                    ছবি আপলোড
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                  {photoOrLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoOrLogoUrl('');
                        setImageLoadFailed(false);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-xs text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={
                    photoOrLogoUrl.startsWith('data:') ? '' : photoOrLogoUrl
                  }
                  onChange={(e) => {
                    setPhotoOrLogoUrl(e.target.value);
                    setImageLoadFailed(false);
                  }}
                  placeholder="অথবা ছবির URL দিন"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Identity Inputs */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {partyType === 'ORGANIZATION'
                    ? 'প্রতিষ্ঠান বা ব্যবসায়িক সংস্থার পূর্ণ নাম'
                    : 'ব্যক্তির পূর্ণ নাম'}{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    partyType === 'ORGANIZATION'
                      ? 'প্রতিষ্ঠান, দোকান বা সংস্থার নাম লিখুন'
                      : 'ব্যক্তির পূর্ণ নাম লিখুন'
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রাথমিক মোবাইল নম্বর <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="যেমন: 01XXXXXXXXX"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-baloo focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিকল্প মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="অতিরিক্ত যোগাযোগ নম্বর (ঐচ্ছিক)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-baloo focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ইমেইল ঠিকানা
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  জাতীয় পরিচয়পত্র (NID) নম্বর
                </label>
                <input
                  type="text"
                  value={nidNumber}
                  onChange={(e) => setNidNumber(e.target.value)}
                  placeholder="১০ বা ১৭ ডিজিটের NID নম্বর"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-baloo focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পেশা / মূল দক্ষতা / কাজের ধরন
                </label>
                <input
                  type="text"
                  value={occupationOrSkill}
                  onChange={(e) => setOccupationOrSkill(e.target.value)}
                  placeholder="যেমন: বৈদ্যুতিক ওয়্যারিং, নির্মাণসামগ্রী সরবরাহ, কাঠের ফার্নিচার কাজ ইত্যাদি"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Multi-Role Assignment + Custom Role Addition */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ২. একাধিক ভূমিকা নির্বাচন (Roles){' '}
                <span className="text-rose-600">*</span>
              </h3>
              <p className="text-xs text-slate-500">
                একই ব্যক্তি বা প্রতিষ্ঠান একসাথে একাধিক ভূমিকায় কাজ করতে পারেন (যেমন: বিক্রেতা ও ঠিকাদার)।
              </p>
            </div>
            {canManageRoles && (
              <button
                type="button"
                onClick={() => setShowAddRoleBox((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                নতুন ভূমিকা যোগ করুন
              </button>
            )}
          </div>

          {/* Inline Custom Role Creator */}
          {showAddRoleBox && canManageRoles && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">
                  কাস্টম ভূমিকা তৈরি করুন
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddRoleBox(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {roleError && (
                <p className="text-xs text-rose-700 font-medium">{roleError}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    ভূমিকার বাংলা নাম *
                  </label>
                  <input
                    type="text"
                    value={newRoleLabelBn}
                    onChange={(e) => setNewRoleLabelBn(e.target.value)}
                    placeholder="যেমন: সাউন্ড সিস্টেম টেকনিশিয়ান"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    ইংরেজি নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={newRoleLabelEn}
                    onChange={(e) => setNewRoleLabelEn(e.target.value)}
                    placeholder="যেমন: Sound Technician"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    মূল বিভাগ
                  </label>
                  <select
                    value={newRoleCategoryGroup}
                    onChange={(e) =>
                      setNewRoleCategoryGroup(
                        e.target.value as PartyRoleCategoryGroup
                      )
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {Object.entries(PARTY_CATEGORY_GROUP_LABELS).map(
                      ([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateCustomRole}
                  disabled={isCreatingRole}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isCreatingRole ? 'সংরক্ষণ হচ্ছে...' : 'ভূমিকা সংরক্ষণ ও নির্বাচন করুন'}
                </button>
              </div>
            </div>
          )}

          {/* Grouped Role Checkboxes */}
          <div className="space-y-3.5">
            {groupedRoles.map((grp) => (
              <div key={grp.group} className="space-y-1.5">
                <div className="text-xs font-bold text-slate-500">
                  {grp.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {grp.roles.map((r) => {
                    const checked = selectedRoles.includes(r.code);
                    return (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => toggleRole(r.code)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          checked
                            ? 'border-emerald-600 bg-emerald-700 text-white'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center ${
                            checked
                              ? 'border-white bg-white/20'
                              : 'border-slate-400 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-2.5 h-2.5" />}
                        </span>
                        {r.labelBn}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedRoles.length > 0 && (
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
              নির্বাচিত ভূমিকা ({toBanglaNumber(selectedRoles.length)}টি):{' '}
              <span className="font-semibold text-slate-900">
                {selectedRoles
                  .map((code) => getPartyRoleLabelBn(code, customRoles))
                  .join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* Section 3: Full Structured Address */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            ৩. ঠিকানা ও অবস্থান সংক্রান্ত তথ্য
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পূর্ণ ঠিকানা (বাড়ি/দোকান/রোড)
              </label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="বিস্তারিত ঠিকানা লিখুন"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                গ্রাম / মহল্লা / পাড়া
              </label>
              <input
                type="text"
                value={villageOrMahalla}
                onChange={(e) => setVillageOrMahalla(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ইউনিয়ন / ওয়ার্ড
              </label>
              <input
                type="text"
                value={unionOrWard}
                onChange={(e) => setUnionOrWard(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                উপজেলা / থানা
              </label>
              <input
                type="text"
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                জেলা
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                বিভাগ
              </label>
              <input
                type="text"
                list="bd-divisions-list"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="বিভাগ নির্বাচন বা লিখুন"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <datalist id="bd-divisions-list">
                {BD_DIVISIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পোস্ট কোড
              </label>
              <input
                type="text"
                value={postCode}
                onChange={(e) => setPostCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-baloo"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Conditional Organization Details */}
        {partyType === 'ORGANIZATION' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                ৪. প্রতিষ্ঠান ও ব্যবসায়িক সংস্থার অতিরিক্ত তথ্য
              </h3>
              <p className="text-xs text-slate-500">
                ট্রেড লাইসেন্স, দায়িত্বপ্রাপ্ত প্রতিনিধি ও ব্যবসায়িক বিবরণ (প্রযোজ্য ক্ষেত্রে)।
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ট্রেড লাইসেন্স / রেজিস্ট্রেশন নং
                </label>
                <input
                  type="text"
                  value={orgDetails.registrationOrTradeLicenseNo || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({
                      ...p,
                      registrationOrTradeLicenseNo: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  TIN / BIN (যদি থাকে)
                </label>
                <input
                  type="text"
                  value={orgDetails.tinOrBin || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({ ...p, tinOrBin: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-baloo"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্যবসা / সেবার ধরন
                </label>
                <input
                  type="text"
                  value={orgDetails.businessCategory || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({
                      ...p,
                      businessCategory: e.target.value,
                    }))
                  }
                  placeholder="যেমন: হার্ডওয়্যার, ইলেকট্রিক, নির্মাণ ঠিকাদারি"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  দায়িত্বপ্রাপ্ত প্রতিনিধির নাম
                </label>
                <input
                  type="text"
                  value={orgDetails.contactPersonName || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({
                      ...p,
                      contactPersonName: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রতিনিধির পদবি
                </label>
                <input
                  type="text"
                  value={orgDetails.contactPersonDesignation || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({
                      ...p,
                      contactPersonDesignation: e.target.value,
                    }))
                  }
                  placeholder="যেমন: স্বত্বাধিকারী / ম্যানেজার"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রতিনিধির মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={orgDetails.contactPersonPhone || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({
                      ...p,
                      contactPersonPhone: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-baloo"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রতিষ্ঠাকাল (সাল)
                </label>
                <input
                  type="text"
                  value={orgDetails.establishedYear || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({
                      ...p,
                      establishedYear: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-baloo"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ওয়েবসাইট
                </label>
                <input
                  type="text"
                  value={orgDetails.website || ''}
                  onChange={(e) =>
                    setOrgDetails((p) => ({ ...p, website: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Artisan / Labourer Descriptive Details (Zero Financial Integration) */}
        {(hasArtisanRoleSelected || showArtisanSectionManual) ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900">
                  কারিগর ও শ্রমিক সংক্রান্ত বর্ণনামূলক তথ্য
                </h3>
              </div>
              {!hasArtisanRoleSelected && (
                <button
                  type="button"
                  onClick={() => setShowArtisanSectionManual(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  লুকান
                </button>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-start gap-2 text-xs text-slate-700">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                এই অংশের মজুরি বা কাজের বিবরণ সম্পূর্ণভাবে তথ্য সংরক্ষণের জন্য (Descriptive Only)। এর মাধ্যমে কোনো স্বয়ংক্রিয় আয়-ব্যয় লেনদেন, বেতন বিল বা বকেয়া তৈরি হয় না।
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মূল কাজের ক্ষেত্র / ট্রেড
                </label>
                <input
                  type="text"
                  value={artisanDetails.primaryTrade || ''}
                  onChange={(e) =>
                    setArtisanDetails((p) => ({
                      ...p,
                      primaryTrade: e.target.value,
                    }))
                  }
                  placeholder="যেমন: থাই অ্যালুমিনিয়াম / টাইলস / সাউন্ড"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  কাজের অভিজ্ঞতা (বছর)
                </label>
                <input
                  type="text"
                  value={artisanDetails.experienceYears || ''}
                  onChange={(e) =>
                    setArtisanDetails((p) => ({
                      ...p,
                      experienceYears: e.target.value,
                    }))
                  }
                  placeholder="যেমন: ৮ বছর"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সহকারী / টিম সদস্য সংখ্যা
                </label>
                <input
                  type="text"
                  value={artisanDetails.teamSizeOrHelpers || ''}
                  onChange={(e) =>
                    setArtisanDetails((p) => ({
                      ...p,
                      teamSizeOrHelpers: e.target.value,
                    }))
                  }
                  placeholder="যেমন: ১ জন প্রধান + ২ জন হেল্পার"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মজুরির প্রচলিত একক (বর্ণনামূলক)
                </label>
                <input
                  type="text"
                  value={artisanDetails.wageUnitLabel || ''}
                  onChange={(e) =>
                    setArtisanDetails((p) => ({
                      ...p,
                      wageUnitLabel: e.target.value,
                    }))
                  }
                  placeholder="যেমন: দৈনিক / বর্গফুট / চুক্তিভিত্তিক"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সম্ভাব্য মজুরি / রেট নোট (বর্ণনামূলক)
                </label>
                <input
                  type="text"
                  value={artisanDetails.descriptiveWageRateText || ''}
                  onChange={(e) =>
                    setArtisanDetails((p) => ({
                      ...p,
                      descriptiveWageRateText: e.target.value,
                    }))
                  }
                  placeholder="যেমন: দৈনিক ৮০০-১০০০ টাকা (আলোচনা সাপেক্ষ)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রাপ্যতা / কাজের সময় নোট
                </label>
                <input
                  type="text"
                  value={artisanDetails.availabilityNote || ''}
                  onChange={(e) =>
                    setArtisanDetails((p) => ({
                      ...p,
                      availabilityNote: e.target.value,
                    }))
                  }
                  placeholder="যেমন: জরুরি মেরামতে কল করলে পাওয়া যায়"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  নিজস্ব যন্ত্রপাতি / সরঞ্জামের বিবরণ
                </label>
                <input
                  type="text"
                  value={artisanDetails.toolsAvailable || ''}
                  onChange={(e) =>
                    setArtisanDetails((p) => ({
                      ...p,
                      toolsAvailable: e.target.value,
                    }))
                  }
                  placeholder="যেমন: ড্রিল মেশিন, কাটার, ওয়েল্ডিং মেশিন নিজস্ব আছে"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setShowArtisanSectionManual(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <Wrench className="w-3.5 h-3.5" />
              কারিগর / শ্রমিক সংক্রান্ত অতিরিক্ত তথ্য যোগ করুন (ঐচ্ছিক)
            </button>
          </div>
        )}

        {/* Section 6: Description & Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            বিবরণ ও অভ্যন্তরীণ মন্তব্য
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                সংক্ষিপ্ত বিবরণ / কাজের ইতিহাস
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ব্যক্তি বা প্রতিষ্ঠানের সাথে কাজের ধরন ও সংক্ষিপ্ত বিবরণ..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-tiro focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                অভ্যন্তরীণ মন্তব্য / বিশেষ নোট
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="দাপ্তরিক যোগাযোগ বা রেফারেন্স সংক্রান্ত নোট..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-tiro focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            নিরাপত্তা নীতি: এই রেজিস্ট্রিতে সংরক্ষিত তথ্য কোনো আর্থিক হিসাব বা স্টাফ বেতনে প্রভাব ফেলে না।
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
            >
              বাতিল করুন
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving
                ? 'সংরক্ষণ হচ্ছে...'
                : mode === 'edit'
                ? 'পরিবর্তন সংরক্ষণ করুন'
                : 'নতুন প্রোফাইল সংরক্ষণ করুন'}
            </button>
          </div>
        </div>
      </form>

      {ocrModalOpen && (
        <PartyOcrScannerModal
          customRoles={customRoles}
          onApplyVerifiedData={handleApplyOcrData}
          onOpenExistingProfile={(existingId) => {
            setOcrModalOpen(false);
            onOpenExistingProfile(existingId);
          }}
          onClose={() => setOcrModalOpen(false)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  MapPin,
  Home,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  Loader2,
  Phone,
  Mail,
  Briefcase,
  Shield,
  Upload,
  Crown,
  Heart,
  Calendar,
  Layers,
} from 'lucide-react';
import { PersonMaster, FamilyMaster, AreaMaster, User as AuthUser } from '../../types';
import { Language } from '../../lib/i18n';
import { api } from '../../lib/api';

interface PersonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PersonMaster>) => Promise<void>;
  initialData?: PersonMaster | null;
  existingPersons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  currentUser?: AuthUser | null;
  language?: Language;
}

const FAMILY_RELATIONS = [
  'পরিবারের প্রধান',
  'পিতা',
  'মাতা',
  'স্বামী',
  'স্ত্রী',
  'পুত্র',
  'কন্যা',
  'ভাই',
  'বোন',
  'দাদা',
  'দাদি',
  'নানা',
  'নানি',
  'অন্যান্য',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingPersons,
  families,
  areas,
  currentUser,
  language = 'bn',
}) => {
  const [fullName, setFullName] = useState('');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [areaId, setAreaId] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [familyRelation, setFamilyRelation] = useState('');
  const [isFamilyHead, setIsFamilyHead] = useState(false);
  const [mobile, setMobile] = useState('');
  const [alternativeMobile, setAlternativeMobile] = useState('');
  const [email, setEmail] = useState('');
  const [houseRoadBlock, setHouseRoadBlock] = useState('');
  const [address, setAddress] = useState('');
  const [profession, setProfession] = useState('');
  const [organization, setOrganization] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');

  const [activeStep, setActiveStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matches: { person: PersonMaster; reasons: string[] }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isBn = language === 'bn';
  const isEditing = !!initialData;
  const canViewPersonalDocs = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN' || currentUser?.permissions?.includes('VIEW_PERSONAL_DOCUMENTS');

  const availableAreas = areas.filter(
    (a) => a.status === 'ACTIVE' || (initialData && a.id === initialData.areaId)
  );

  // Available families filtered by selected area
  const availableFamilies = families.filter(
    (f) =>
      (f.status === 'ACTIVE' || (initialData && f.id === initialData.familyId)) &&
      (!areaId || f.areaId === areaId)
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFullName(initialData.fullName || '');
        setFatherOrHusbandName(initialData.fatherOrHusbandName || '');
        setGender(initialData.gender || 'MALE');
        setDateOfBirth(initialData.dateOfBirth || '');
        setMaritalStatus(initialData.maritalStatus || '');
        setAreaId(initialData.areaId || '');
        setFamilyId(initialData.familyId || '');
        setFamilyRelation(initialData.familyRelation || '');
        setIsFamilyHead(Boolean(initialData.isFamilyHead));
        setMobile(initialData.mobile || '');
        setAlternativeMobile(initialData.alternativeMobile || '');
        setEmail(initialData.email || '');
        setHouseRoadBlock(initialData.houseRoadBlock || '');
        setAddress(initialData.address || '');
        setProfession(initialData.profession || initialData.occupation || '');
        setOrganization(initialData.organization || '');
        setBloodGroup(initialData.bloodGroup || '');
        setPhotoUrl(initialData.photoUrl || '');
        setNidNumber(initialData.nidNumber || '');
        setStatus(initialData.status || 'ACTIVE');
        setNotes(initialData.notes || '');
      } else {
        setFullName('');
        setFatherOrHusbandName('');
        setGender('MALE');
        setDateOfBirth('');
        setMaritalStatus('');
        setAreaId(availableAreas.length > 0 ? availableAreas[0].id : '');
        setFamilyId('');
        setFamilyRelation('');
        setIsFamilyHead(false);
        setMobile('');
        setAlternativeMobile('');
        setEmail('');
        setHouseRoadBlock('');
        setAddress('');
        setProfession('');
        setOrganization('');
        setBloodGroup('');
        setPhotoUrl('');
        setNidNumber('');
        setStatus('ACTIVE');
        setNotes('');
      }
      setActiveStep(1);
      setError(null);
      setDuplicateWarning(null);
    }
  }, [isOpen, initialData]);

  // When family changes, auto-set area and check if family head is empty
  const handleFamilyChange = (selectedFamId: string) => {
    setFamilyId(selectedFamId);
    if (selectedFamId) {
      const fam = families.find((f) => f.id === selectedFamId);
      if (fam && fam.areaId) {
        setAreaId(fam.areaId);
        // Also copy address if empty
        if (!address && fam.address) setAddress(fam.address);
        if (!houseRoadBlock && fam.houseRoadBlock) setHouseRoadBlock(fam.houseRoadBlock);
      }
    }
  };

  // When area changes, if current family doesn't belong to area, reset family
  const handleAreaChange = (selectedAreaId: string) => {
    setAreaId(selectedAreaId);
    if (familyId) {
      const fam = families.find((f) => f.id === familyId);
      if (fam && fam.areaId !== selectedAreaId) {
        setFamilyId('');
      }
    }
  };

  // Live duplicate check on name, father name, mobile, NID
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if ((fullName.trim().length >= 3 && (fatherOrHusbandName.trim() || mobile.trim())) || (mobile.trim().length >= 10) || (nidNumber.trim().length >= 10)) {
        try {
          const res = await api.checkDuplicatePerson({
            fullName: fullName.trim(),
            fatherOrHusbandName: fatherOrHusbandName.trim() || undefined,
            mobile: mobile.trim() || undefined,
            nidNumber: nidNumber.trim() || undefined,
            familyId: familyId || undefined,
            areaId: areaId || undefined,
            excludeId: initialData?.id,
          });
          if (active && res.hasPotentialDuplicates) {
            setDuplicateWarning({ matches: res.matches });
          } else if (active) {
            setDuplicateWarning(null);
          }
        } catch {
          // ignore background check error
        }
      } else {
        if (active) setDuplicateWarning(null);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fullName, fatherOrHusbandName, mobile, nidNumber, familyId, areaId, initialData?.id]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError(isBn ? 'ছবির সাইজ সর্বোচ্চ ২ মেগাবাইট হতে পারবে।' : 'Image size cannot exceed 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError(isBn ? 'মুসল্লি / ব্যক্তির পূর্ণ নাম প্রদান আবশ্যক।' : 'Full Name is required.');
      setActiveStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        fullName: fullName.trim(),
        fatherOrHusbandName: fatherOrHusbandName.trim() || undefined,
        gender,
        dateOfBirth: dateOfBirth.trim() || undefined,
        maritalStatus: maritalStatus.trim() || undefined,
        areaId: areaId || undefined,
        familyId: familyId || undefined,
        familyRelation: familyRelation.trim() || (isFamilyHead ? 'পরিবারের প্রধান' : undefined),
        isFamilyHead,
        mobile: mobile.trim() || undefined,
        alternativeMobile: alternativeMobile.trim() || undefined,
        email: email.trim() || undefined,
        houseRoadBlock: houseRoadBlock.trim() || undefined,
        address: address.trim() || undefined,
        profession: profession.trim() || undefined,
        occupation: profession.trim() || undefined,
        organization: organization.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        nidNumber: nidNumber.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (isBn ? 'সংরক্ষণে ত্রুটি হয়েছে।' : 'Failed to save person.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-siliguri tracking-wide">
                {isEditing
                  ? isBn
                    ? 'ব্যক্তি / মুসল্লির তথ্য সম্পাদন'
                    : 'Edit Musalli / Person'
                  : isBn
                  ? 'নতুন ব্যক্তি / মুসল্লি নিবন্ধন'
                  : 'Register New Musalli / Person'}
              </h2>
              <p className="text-xs text-emerald-100/90 font-tiro">
                {isBn
                  ? 'এলাকা ও পরিবারভিত্তিক কেন্দ্রীয় ব্যক্তি প্রোফাইল খতিয়ান'
                  : 'Central Musalli Identity Registry mapped with Area & Family'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-semibold overflow-x-auto shrink-0">
          <div className="flex items-center space-x-1 sm:space-x-2">
            {[
              { id: 1, label: isBn ? 'মৌলিক তথ্য' : 'Identity' },
              { id: 2, label: isBn ? 'এলাকা ও পরিবার' : 'Family & Area' },
              { id: 3, label: isBn ? 'যোগাযোগ ও পেশা' : 'Contact & Job' },
              { id: 4, label: isBn ? 'ঠিকানা ও অতিরিক্ত' : 'Address & Other' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStep(st.id)}
                className={`px-3 py-1.5 rounded-lg transition-all font-siliguri whitespace-nowrap flex items-center space-x-1.5 ${
                  activeStep === st.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {st.id}
                </span>
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-800 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-tiro leading-relaxed">{error}</span>
              </div>
            )}

            {duplicateWarning && duplicateWarning.matches.length > 0 && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
                <div className="flex items-center space-x-2 font-bold font-siliguri text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isBn ? '⚠️ সম্ভাব্য একই ব্যক্তির তথ্য পাওয়া গেছে (Duplicate Warning)' : '⚠️ Potential Duplicate Detected'}</span>
                </div>
                <div className="space-y-1.5 pl-6 font-tiro text-slate-700">
                  {duplicateWarning.matches.map((m, idx) => (
                    <div key={idx} className="bg-white/80 p-2 rounded-lg border border-amber-200/70 text-[11px]">
                      <span className="font-bold text-slate-900">{m.person.fullName}</span> ({m.person.personCode}) -{' '}
                      <span className="text-amber-800">{m.reasons.join(', ')}</span>
                    </div>
                  ))}
                  <div className="text-[11px] text-amber-800/90 italic pt-1">
                    {isBn
                      ? 'এটি শুধু একটি তথ্যভিত্তিক সতর্কতা। প্রয়োজন হলে নতুন ব্যক্তি হিসেবেই সংরক্ষণ করতে পারেন।'
                      : 'This is an advisory warning only. You can proceed to save as a distinct Person.'}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Basic Identity */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-full border-2 border-emerald-600 bg-white overflow-hidden flex items-center justify-center shadow-xs">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Person Photo"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-md border-2 border-white transition-colors"
                      title={isBn ? 'ছবি আপলোড করুন' : 'Upload photo'}
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <h4 className="text-xs font-bold text-slate-800 font-siliguri">
                      {isBn ? 'প্রোফাইল ছবি (ঐচ্ছিক)' : 'Profile Photo (Optional)'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-tiro leading-relaxed">
                      {isBn
                        ? 'সরাসরি ডিভাইস থেকে ছবি আপলোড করুন অথবা নিচে ফটো লিংক দিন। সর্বোচ্চ ২MB।'
                        : 'Upload photo from device or provide image URL. Max 2MB.'}
                    </p>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="text-[11px] text-red-600 hover:underline font-tiro"
                      >
                        {isBn ? 'ছবি মুছে ফেলুন' : 'Remove photo'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'মুসল্লি / ব্যক্তির পূর্ণ নাম *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isBn ? 'উদা: মোঃ আব্দুর রহমান' : 'e.g. Md. Abdur Rahman'}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-tiro"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'পিতা / স্বামীর নাম' : 'Father / Husband Name'}
                    </label>
                    <input
                      type="text"
                      value={fatherOrHusbandName}
                      onChange={(e) => setFatherOrHusbandName(e.target.value)}
                      placeholder={isBn ? 'উদা: মৃত আলহাজ্ব করিম উদ্দিন' : 'e.g. Late Alhaj Karim Uddin'}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-tiro"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'লিঙ্গ' : 'Gender'}
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri"
                    >
                      <option value="MALE">{isBn ? 'পুরুষ' : 'Male'}</option>
                      <option value="FEMALE">{isBn ? 'মহিলা' : 'Female'}</option>
                      <option value="OTHER">{isBn ? 'অন্যান্য' : 'Other'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'জন্ম তারিখ / বয়স' : 'Date of Birth'}
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-baloo"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'বৈবাহিক অবস্থা' : 'Marital Status'}
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri"
                    >
                      <option value="">{isBn ? 'নির্বাচন করুন...' : 'Select...'}</option>
                      <option value="বিবাহিত">{isBn ? 'বিবাহিত' : 'Married'}</option>
                      <option value="অবিবাহিত">{isBn ? 'অবিবাহিত' : 'Unmarried'}</option>
                      <option value="বিধবা / বিপত্নীক">{isBn ? 'বিধবা / বিপত্নীক' : 'Widowed'}</option>
                      <option value="অন্যান্য">{isBn ? 'অন্যান্য' : 'Other'}</option>
                    </select>
                  </div>
                </div>

                {canViewPersonalDocs && (
                  <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900 font-siliguri">
                      <Shield className="w-3.5 h-3.5 text-blue-700" />
                      <span>{isBn ? 'জাতীয় পরিচয়পত্র (NID) নম্বর [গোপনীয় ও সুরক্ষিত]' : 'NID Number (Protected)'}</span>
                    </div>
                    <input
                      type="text"
                      value={nidNumber}
                      onChange={(e) => setNidNumber(e.target.value)}
                      placeholder={isBn ? 'উদা: 19851234567890123' : 'e.g. 19851234567890123'}
                      className="w-full px-3.5 py-1.5 text-xs border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-baloo bg-white"
                    />
                    <p className="text-[10px] text-blue-700 font-tiro">
                      {isBn
                        ? 'এটি সাধারণ তালিকা বা সাধারণ ব্যবহারকারীদের নিকট দৃশ্যমান হবে না।'
                        : 'Restricted by VIEW_PERSONAL_DOCUMENTS permission.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Area & Family */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-tiro leading-relaxed flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold font-siliguri">{isBn ? 'পারিবারিক অন্তর্ভুক্তি নিয়ম: ' : 'Relational Rule: '}</span>
                    {isBn
                      ? 'ব্যক্তিকে কোনো পরিবারভুক্ত করতে পারেন অথবা সাময়িকভাবে "পরিবার নির্ধারণ অপেক্ষমাণ" রাখতে পারেন। পরিবার নির্বাচন করলে স্বয়ংক্রিয়ভাবে এলাকা ও ঠিকানা সমন্বিত হবে।'
                      : 'You can assign a family or keep unassigned. Selecting a family auto-links its designated Area.'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'এলাকা / মহল্লা' : 'Area / Mohalla'}
                    </label>
                    <select
                      value={areaId}
                      onChange={(e) => handleAreaChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri"
                    >
                      <option value="">{isBn ? '-- এলাকা নির্ধারণ অপেক্ষমাণ --' : '-- Area Pending --'}</option>
                      {availableAreas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} {a.areaCode ? `(${a.areaCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'পারিবারিক খানা / বাড়ি' : 'Family Unit / House'}
                    </label>
                    <select
                      value={familyId}
                      onChange={(e) => handleFamilyChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri"
                    >
                      <option value="">{isBn ? '🏠 পরিবার নির্ধারণ অপেক্ষমাণ (Unassigned)' : '🏠 Pending Family Assignment'}</option>
                      {availableFamilies.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.familyCode ? `(${f.familyCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'পরিবারে সম্পর্ক / ভূমিকা' : 'Relation in Family'}
                    </label>
                    <select
                      value={familyRelation}
                      onChange={(e) => {
                        setFamilyRelation(e.target.value);
                        if (e.target.value === 'পরিবারের প্রধান') {
                          setIsFamilyHead(true);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri"
                    >
                      <option value="">{isBn ? 'সম্পর্ক নির্বাচন করুন...' : 'Select relation...'}</option>
                      {FAMILY_RELATIONS.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="relative flex items-center space-x-3 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/50 transition-colors w-full">
                      <input
                        type="checkbox"
                        checked={isFamilyHead}
                        onChange={(e) => {
                          setIsFamilyHead(e.target.checked);
                          if (e.target.checked && !familyRelation) {
                            setFamilyRelation('পরিবারের প্রধান');
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 font-siliguri">
                        <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{isBn ? 'এই ব্যক্তি পরিবারের প্রধান (Head of Family)' : 'Mark as Head of Family'}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Contact & Profession */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'মোবাইল নম্বর' : 'Primary Mobile'}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder={isBn ? 'উদা: 018XXXXXXXX' : 'e.g. 018XXXXXXXX'}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-baloo"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'বিকল্প মোবাইল নম্বর (ঐচ্ছিক)' : 'Alternative Mobile'}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={alternativeMobile}
                        onChange={(e) => setAlternativeMobile(e.target.value)}
                        placeholder={isBn ? 'উদা: 017XXXXXXXX' : 'e.g. 017XXXXXXXX'}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-baloo"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@domain.com"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-tiro"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'পেশা / কর্মসংস্থান' : 'Profession / Occupation'}
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder={isBn ? 'উদা: ব্যবসায়ী / শিক্ষক' : 'e.g. Businessman / Teacher'}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-tiro"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'কর্মস্থল / প্রতিষ্ঠান' : 'Organization'}
                    </label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder={isBn ? 'উদা: রহমান ট্রেডার্স' : 'e.g. Rahman Traders'}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-tiro"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Address & Additional */}
            {activeStep === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'বাড়ি / রোড / ব্লক / হোল্ডিং' : 'House / Road / Block'}
                    </label>
                    <input
                      type="text"
                      value={houseRoadBlock}
                      onChange={(e) => setHouseRoadBlock(e.target.value)}
                      placeholder={isBn ? 'উদা: বাড়ি #১২, রোড #০৪' : 'e.g. House #12, Road #04'}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-tiro"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-baloo"
                    >
                      <option value="">{isBn ? 'রক্তের গ্রুপ নির্বাচন...' : 'Select blood group...'}</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                    {isBn ? 'বিস্তারিত ঠিকানা' : 'Detailed Address'}
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={isBn ? 'গ্রাম/মহল্লা, ডাকঘর, থানা ও স্থায়ী ঠিকানা...' : 'Village, Street, Post Office...'}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-tiro"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'স্ট্যাটাস' : 'Status'}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri"
                    >
                      <option value="ACTIVE">{isBn ? 'সক্রিয় (Active)' : 'Active'}</option>
                      <option value="INACTIVE">{isBn ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                      {isBn ? 'বিশেষ নোট / মন্তব্য' : 'Notes / Remarks'}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={isBn ? 'উদা: প্রবাসী / নিয়মিত জামাতে উপস্থিত' : 'e.g. Regular Musalli / Expatriate'}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-tiro"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors font-siliguri"
                >
                  {isBn ? '← পূর্ববর্তী' : '← Previous'}
                </button>
              )}
              {activeStep < 4 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors font-siliguri"
                >
                  {isBn ? 'পরবর্তী ধাপ →' : 'Next Step →'}
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors font-siliguri"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center space-x-2 font-siliguri disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isBn ? 'সংরক্ষণ করুন' : 'Save Person'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

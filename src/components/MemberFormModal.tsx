import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  FileText,
  Shield,
  Upload,
  Camera,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Heart,
  CreditCard,
  Building2
} from 'lucide-react';
import { CommitteeMember, CommitteeTerm } from '../types';

export const POSITION_MAP_BN: Record<CommitteeMember['position'], string> = {
  PRESIDENT: 'সভাপতি (President)',
  VICE_PRESIDENT: 'সহ-সভাপতি (Vice President)',
  SECRETARY: 'সাধারণ সম্পাদক (General Secretary)',
  JOINT_SECRETARY: 'যুগ্ম সম্পাদক (Joint Secretary)',
  TREASURER: 'কোষাধ্যক্ষ (Treasurer)',
  ORGANIZING_SECRETARY: 'সাংগঠনিক সম্পাদক',
  MEMBER: 'কার্যনির্বাহী সদস্য (Member)',
  IMAM: 'সম্মানিত ইমাম (সদস্য)',
  ADVISOR: 'উপদেষ্টা (Advisor)',
  OTHER: 'অন্যান্য পদবি',
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const MEMBER_STATUS_LIST = [
  { value: 'ACTIVE', labelBn: '🟢 সক্রিয় (Active)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'INACTIVE', labelBn: '⚪ নিষ্ক্রিয় (Inactive)', color: 'text-slate-600 bg-slate-100 border-slate-300' },
  { value: 'RESIGNED', labelBn: '🟡 অব্যাহতি প্রাপ্ত (Resigned)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'DECEASED', labelBn: '⚫ মরহুম (Deceased)', color: 'text-stone-700 bg-stone-100 border-stone-300' },
] as const;

export function calculateAgeFromBirthDate(birthDateStr?: string): { years: number; months: number; textBn: string } | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  if (birthDate > today) return null;

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return null;

  const toBn = (n: number) => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(n).replace(/[0-9]/g, (d) => bnDigits[+d]);
  };

  let textBn = `${toBn(years)} বছর`;
  if (months > 0) {
    textBn += ` ${toBn(months)} মাস`;
  }
  return { years, months, textBn };
}

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: CommitteeMember | null;
  terms: CommitteeTerm[];
  activeTermId?: string;
  onSave: (data: Partial<CommitteeMember> & { designation?: string; designationBn?: string }) => Promise<void>;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
  terms,
  activeTermId,
  onSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [termId, setTermId] = useState('');
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [nid, setNid] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [position, setPosition] = useState<CommitteeMember['position']>('MEMBER');
  const [positionCustomBn, setPositionCustomBn] = useState('');
  const [status, setStatus] = useState<CommitteeMember['status']>('ACTIVE');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // UI status
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUrlPhotoInput, setShowUrlPhotoInput] = useState(false);

  const isEdit = Boolean(memberToEdit);

  // Reset or initialize state
  useEffect(() => {
    if (isOpen) {
      setError('');
      setShowUrlPhotoInput(false);
      if (memberToEdit) {
        setTermId(memberToEdit.termId || activeTermId || (terms.length > 0 ? terms[0].id : ''));
        setName(memberToEdit.name || '');
        setFatherName(memberToEdit.fatherName || '');
        setMotherName(memberToEdit.motherName || '');
        setPhotoUrl(memberToEdit.photoUrl || '');
        setNid(memberToEdit.nid || '');
        setPhone(memberToEdit.phone || '');
        setAltPhone(memberToEdit.altPhone || '');
        setDateOfBirth(memberToEdit.dateOfBirth || '');
        setBloodGroup(memberToEdit.bloodGroup || '');
        setPosition(memberToEdit.position || 'MEMBER');
        setPositionCustomBn(memberToEdit.positionCustomBn || '');
        setStatus(memberToEdit.status || 'ACTIVE');
        setAddress(memberToEdit.address || '');
        setOccupation(memberToEdit.occupation || '');
        setEducation(memberToEdit.education || '');
        setEmail(memberToEdit.email || '');
        setNotes(memberToEdit.notes || '');
      } else {
        const defaultTerm = activeTermId || (terms.find((t) => t.status === 'ACTIVE') || terms[0])?.id || '';
        setTermId(defaultTerm);
        setName('');
        setFatherName('');
        setMotherName('');
        setPhotoUrl('');
        setNid('');
        setPhone('');
        setAltPhone('');
        setDateOfBirth('');
        setBloodGroup('');
        setPosition('MEMBER');
        setPositionCustomBn('কার্যনির্বাহী সদস্য');
        setStatus('ACTIVE');
        setAddress('');
        setOccupation('');
        setEducation('');
        setEmail('');
        setNotes('');
      }
    }
  }, [isOpen, memberToEdit, terms, activeTermId]);

  // Auto-calculated age
  const calculatedAge = useMemo(() => {
    return calculateAgeFromBirthDate(dateOfBirth);
  }, [dateOfBirth]);

  // Handle position change to suggest Bengali designation
  const handlePositionSelect = (newPos: CommitteeMember['position']) => {
    setPosition(newPos);
    const suggestedBn = POSITION_MAP_BN[newPos];
    if (suggestedBn) {
      // If positionCustomBn was untouched or matching previous default, update it
      setPositionCustomBn(suggestedBn.split(' (')[0]);
    }
  };

  // Image file handler
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('অনুগ্রহ করে একটি বৈধ ইমেজ ফাইল (JPG, PNG, WEBP) নির্বাচন করুন।');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('ছবির সাইজ ৩ মেগাবাইট (3MB)-এর কম হতে হবে।');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setPhotoUrl(dataUrl);
    };
    reader.onerror = () => {
      setError('ছবি লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form submission & validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!name.trim()) {
      setError('সদস্যের পুরো নাম আবশ্যক।');
      return;
    }

    if (!phone.trim()) {
      setError('মোবাইল নম্বর আবশ্যক।');
      return;
    }

    const cleanPhone = phone.trim();
    if (!/^(\+?8801|01)[3-9]\d{8}$/.test(cleanPhone.replace(/[\s-]/g, ''))) {
      setError('অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর প্রদান করুন (যেমন: 01712345678)');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('অনুগ্রহ করে সঠিক ই-মেইল ঠিকানা প্রদান করুন।');
      return;
    }

    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dob > today) {
        setError('জন্ম তারিখ ভবিষ্যতের তারিখ হতে পারবে না।');
        return;
      }
    }

    if (!termId) {
      setError('অনুগ্রহ করে একটি কমিটির মেয়াদকাল নির্বাচন করুন।');
      return;
    }

    const finalPosBn = positionCustomBn.trim() || POSITION_MAP_BN[position] || 'কার্যনির্বাহী সদস্য';

    setIsSubmitting(true);
    try {
      await onSave({
        termId,
        name: name.trim(),
        fatherName: fatherName.trim() || undefined,
        motherName: motherName.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        nid: nid.trim() || undefined,
        phone: cleanPhone,
        altPhone: altPhone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        bloodGroup: bloodGroup || undefined,
        position,
        positionCustomBn: finalPosBn,
        designation: position,
        designationBn: finalPosBn,
        status,
        address: address.trim() || undefined,
        occupation: occupation.trim() || undefined,
        education: education.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'সদস্যের তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-baloo">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isEdit ? 'সদস্য তথ্য সম্পাদনা' : 'নতুন সদস্য অন্তর্ভুক্তি ও প্রোফাইল গঠন'}
              </h2>
              <p className="text-xs text-slate-300">
                কমিটি সদস্যের পূর্ণাঙ্গ ব্যক্তিগত, যোগাযোগ, পরিচয় ও দায়িত্বের তথ্য
              </p>
            </div>
          </div>
          <button
            id="btn-close-member-form-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: ব্যক্তিগত তথ্য */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">১. ব্যক্তিগত তথ্য</h3>
            </div>

            {/* Profile Photo Upload & Preview */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="relative group shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Member Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-6 h-6 mb-0.5" />
                    <span className="text-[10px] font-semibold">ছবি নেই</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoFileChange}
                    id="input-member-photo-file"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{photoUrl ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlPhotoInput(!showUrlPhotoInput)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {showUrlPhotoInput ? 'URL ইনপুট বন্ধ করুন' : 'ওয়েব URL ব্যবহার'}
                  </button>

                  {photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ছবি মুছুন</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  সদস্যের পাসপোর্ট সাইজের ছবি নির্বাচন করুন (JPG/PNG, সর্বোচ্চ ৩ মেগাবাইট)।
                </p>

                {showUrlPhotoInput && (
                  <input
                    id="input-member-photo-url"
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Name, Father & Mother Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  সদস্যের পুরো নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-member-name"
                  type="text"
                  required
                  placeholder="যেমন: আলহাজ্ব মো. রফিকুল ইসলাম"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পিতার নাম (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-father-name"
                  type="text"
                  placeholder="যেমন: মরহুম আব্দুল জব্বার"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মাতার নাম (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-mother-name"
                  type="text"
                  placeholder="যেমন: রাবেয়া খাতুন"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Date of Birth, Auto Age & Blood Group */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জন্ম তারিখ (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-dob"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বয়স (স্বয়ংক্রিয় হিসাবকৃত)
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800 font-semibold flex items-center justify-between min-h-[42px]">
                  <span>{calculatedAge ? calculatedAge.textBn : 'জন্ম তারিখ দিলে দেখাবে'}</span>
                  {calculatedAge && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded">
                      গণনা সম্পন্ন
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  রক্তের গ্রুপ (ঐচ্ছিক)
                </label>
                <select
                  id="select-member-blood-group"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                >
                  <option value="">নির্বাচন করুন</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: যোগাযোগ ও পরিচয় */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
              <Phone className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">২. যোগাযোগ ও জাতীয় পরিচয়</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-member-phone"
                  type="tel"
                  required
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিকল্প মোবাইল নম্বর (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-alt-phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জাতীয় পরিচয়পত্র (NID) (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-nid"
                  type="text"
                  placeholder="১০ / ১৩ / ১৭ ডিজিট"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ই-মেইল ঠিকানা (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বর্তমান ও স্থায়ী ঠিকানা (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-address"
                  type="text"
                  placeholder="গ্রাম/রোড, ডাকঘর, উপজেলা, জেলা"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: কমিটি তথ্য */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
              <Building2 className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">৩. কমিটি ও পদবির তথ্য</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  কমিটি মেয়াদকাল নির্বাচন <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-member-term"
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.status === 'ACTIVE' ? ' (বর্তমান সক্রিয় কমিটি)' : ` (${t.status})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  পদবি নির্বাচন <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-member-position"
                  value={position}
                  onChange={(e) => handlePositionSelect(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                >
                  {Object.entries(POSITION_MAP_BN).map(([posKey, posLabel]) => (
                    <option key={posKey} value={posKey}>
                      {posLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বাংলা পদবি (প্রদর্শনের জন্য)
                </label>
                <input
                  id="input-member-position-custom-bn"
                  type="text"
                  placeholder="যেমন: কোষাধ্যক্ষ / সহ-সভাপতি"
                  value={positionCustomBn}
                  onChange={(e) => setPositionCustomBn(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  প্রোফাইল এবং অফিসিয়াল প্রিন্ট রিপোর্টে এই পদবিটি সুন্দরভাবে প্রদর্শিত হবে।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  সদস্যের স্ট্যাটাস <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-member-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                >
                  {MEMBER_STATUS_LIST.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.labelBn}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: পেশাগত ও অন্যান্য তথ্য */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
              <Briefcase className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">৪. পেশাগত ও অন্যান্য তথ্য</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পেশা (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-occupation"
                  type="text"
                  placeholder="যেমন: ব্যবসায়ী / অবসরপ্রাপ্ত সরকারি কর্মকর্তা"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  শিক্ষাগত যোগ্যতা (ঐচ্ছিক)
                </label>
                <input
                  id="input-member-education"
                  type="text"
                  placeholder="যেমন: বি.এ (সম্মান), কামিল হাদিস"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                মন্তব্য / বিশেষ নোট (ঐচ্ছিক)
              </label>
              <textarea
                id="textarea-member-notes"
                rows={2}
                placeholder="সদস্য সম্পর্কে কোনো বিশেষ তথ্য বা মন্তব্য থাকলে লিখুন..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            বাতিল
          </button>

          <button
            id="btn-save-member-form"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>সংরক্ষণ হচ্ছে...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEdit ? 'আপডেট সম্পন্ন করুন' : 'সদস্য অন্তর্ভুক্তি সম্পন্ন করুন'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

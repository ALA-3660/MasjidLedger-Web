import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, Sparkles, RefreshCw, Landmark, FileText, UserCheck, ShieldCheck } from 'lucide-react';
import { Staff, StaffEmploymentType } from '../types';
import { Language, translations } from '../lib/i18n';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: Staff | null; // if provided, edit mode; else create mode
  staffList?: Staff[];
  onSubmit: (data: Partial<Staff>) => Promise<void>;
  language: Language;
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  isOpen,
  onClose,
  staff,
  staffList = [],
  onSubmit,
  language,
}) => {
  const t = translations[language];
  const isEdit = Boolean(staff);

  const [staffCode, setStaffCode] = useState('');
  const [name, setName] = useState('');
  const [fullNameBn, setFullNameBn] = useState('');
  const [designation, setDesignation] = useState<Staff['designation']>('IMAM');
  const [designationBn, setDesignationBn] = useState('পেশ ইমাম');
  const [employmentType, setEmploymentType] = useState<StaffEmploymentType>('PERMANENT');
  const [phone, setPhone] = useState('');
  const [nid, setNid] = useState('');
  const [monthlySalary, setMonthlySalary] = useState<number | ''>(15000);
  const [allowance, setAllowance] = useState<number | ''>(0);
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryRevisionReason, setSalaryRevisionReason] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignationDate, setResignationDate] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'>('ACTIVE');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [educationQualification, setEducationQualification] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // Bank Account Fields
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CURRENT' | 'SALARY'>('SAVINGS');
  const [bankStatus, setBankStatus] = useState<'ACTIVE' | 'INACTIVE' | 'VERIFIED' | 'PENDING'>('ACTIVE');
  
  const [activeTab, setActiveTab] = useState<'BASIC' | 'EMPLOYMENT' | 'SALARY' | 'BANK' | 'DOCS'>('BASIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const designationMap: Record<Staff['designation'], string> = {
    IMAM: 'পেশ ইমাম',
    KHATIB: 'খতিব',
    MUEZZIN: 'মুয়াজ্জিন',
    TEACHER: 'মক্তব/হিফজ শিক্ষক',
    CLEANER: 'খাদেম ও পরিচ্ছন্নতাকর্মী',
    SECURITY: 'নিরাপত্তাকর্মী',
    OTHER: 'অন্যান্য স্টাফ',
  };

  const employmentTypeMap: Record<StaffEmploymentType, string> = {
    PERMANENT: 'স্থায়ী (Permanent)',
    CONTRACTUAL: 'চুক্তিভিত্তিক (Contractual)',
    PART_TIME: 'খণ্ডকালীন (Part-time)',
    TEMPORARY: 'অস্থায়ী (Temporary)',
  };

  const generateAutoCode = (joinDateStr: string) => {
    const year = joinDateStr ? joinDateStr.split('-')[0] : new Date().getFullYear().toString();
    const count = staffList.length + 1;
    return `STF-${year}-${String(count).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (staff) {
      setStaffCode(staff.staffCode || generateAutoCode(staff.joiningDate));
      setName(staff.name || '');
      setFullNameBn(staff.fullNameBn || staff.name || '');
      setDesignation(staff.designation || 'IMAM');
      setDesignationBn(staff.designationBn || designationMap[staff.designation || 'IMAM']);
      setEmploymentType((staff.employmentType as any) || 'PERMANENT');
      setPhone(staff.phone || '');
      setNid(staff.nid || '');
      setMonthlySalary(staff.monthlySalary !== undefined ? staff.monthlySalary : 15000);
      setAllowance(staff.allowance || 0);
      setSalaryEffectiveDate(staff.salaryEffectiveDate || staff.joiningDate || new Date().toISOString().split('T')[0]);
      setSalaryRevisionReason('');
      setJoiningDate(staff.joiningDate || new Date().toISOString().split('T')[0]);
      setResignationDate(staff.resignationDate || staff.terminationDate || '');
      setStatus((staff.status as any) || 'ACTIVE');
      setPresentAddress(staff.presentAddress || staff.address || '');
      setPermanentAddress(staff.permanentAddress || staff.address || '');
      setEducationQualification(staff.educationQualification || '');
      setNotes(staff.notes || '');
      setPhotoUrl(staff.photoUrl || '');
      setSignatureUrl(staff.signatureUrl || '');
      setBankName(staff.bankName || '');
      setBranchName(staff.branchName || '');
      setAccountHolderName(staff.accountHolderName || staff.name || '');
      setAccountNumber(staff.accountNumber || '');
      setRoutingNumber(staff.routingNumber || '');
      setAccountType((staff.accountType as any) || 'SAVINGS');
      setBankStatus((staff.bankStatus as any) || (staff.accountNumber ? 'ACTIVE' : 'PENDING'));
    } else {
      const today = new Date().toISOString().split('T')[0];
      setStaffCode(generateAutoCode(today));
      setName('');
      setFullNameBn('');
      setDesignation('IMAM');
      setDesignationBn('পেশ ইমাম');
      setEmploymentType('PERMANENT');
      setPhone('');
      setNid('');
      setMonthlySalary(15000);
      setAllowance(0);
      setSalaryEffectiveDate(today);
      setSalaryRevisionReason('');
      setJoiningDate(today);
      setResignationDate('');
      setStatus('ACTIVE');
      setPresentAddress('');
      setPermanentAddress('');
      setEducationQualification('');
      setNotes('');
      setPhotoUrl('');
      setSignatureUrl('');
      setBankName('Islami Bank Bangladesh PLC');
      setBranchName('');
      setAccountHolderName('');
      setAccountNumber('');
      setRoutingNumber('');
      setAccountType('SAVINGS');
      setBankStatus('ACTIVE');
    }
    setActiveTab('BASIC');
    setError(null);
  }, [staff, isOpen, staffList]);

  const handleDesignationChange = (val: Staff['designation']) => {
    setDesignation(val);
    setDesignationBn(designationMap[val]);
  };

  const handleRegenerateCode = () => {
    setStaffCode(generateAutoCode(joiningDate));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('স্টাফের নাম এবং মোবাইল নম্বর আবশ্যক।');
      setActiveTab('BASIC');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        staffCode: staffCode.trim() || generateAutoCode(joiningDate),
        name: name.trim(),
        fullNameBn: fullNameBn.trim() || name.trim(),
        designation,
        designationBn: designationBn.trim() || designationMap[designation],
        employmentType,
        employmentTypeBn: employmentType === 'CONTRACTUAL' ? 'চুক্তিভিত্তিক' : employmentType === 'PART_TIME' ? 'খণ্ডকালীন' : employmentType === 'TEMPORARY' ? 'অস্থায়ী' : 'স্থায়ী',
        phone: phone.trim(),
        nid: nid.trim(),
        monthlySalary: Number(monthlySalary) || 0,
        allowance: Number(allowance) || 0,
        salaryEffectiveDate,
        salaryRevisionReason: salaryRevisionReason.trim() || undefined,
        joiningDate,
        resignationDate: (status === 'INACTIVE' || status === 'TERMINATED') && resignationDate ? resignationDate : undefined,
        status,
        address: presentAddress.trim() || permanentAddress.trim(),
        presentAddress: presentAddress.trim(),
        permanentAddress: permanentAddress.trim(),
        educationQualification: educationQualification.trim() || undefined,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        signatureUrl: signatureUrl.trim() || undefined,
        bankName: bankName.trim() || undefined,
        branchName: branchName.trim() || undefined,
        accountHolderName: accountHolderName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        routingNumber: routingNumber.trim() || undefined,
        accountType,
        bankStatus,
      } as any);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'স্টাফ তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600/30 border border-blue-400/30 rounded-lg">
              {isEdit ? <Save className="w-5 h-5 text-blue-400" /> : <UserPlus className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
              <h3 className="font-bold text-base font-siliguri">
                {isEdit ? 'ইমাম ও স্টাফ প্রোফাইল সম্পাদনা' : 'নতুন ইমাম বা স্টাফ অন্তর্ভুক্তি (Staff Entry Form)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? `${staff?.name} (${staff?.staffCode || 'আইডি নেই'}) - এর তথ্য আপডেট করুন` : 'মসজিদের নতুন নিয়োগপ্রাপ্ত কর্মী ও ব্যাংকিং তথ্য নিবন্ধন করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 bg-slate-100 border-b border-slate-200 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('BASIC')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'BASIC' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ১. সাধারণ ও ব্যক্তিগত তথ্য
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EMPLOYMENT')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'EMPLOYMENT' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ২. পদবি ও চাকরির বিবরণ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SALARY')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'SALARY' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ৩. বেতন/হাদিয়া ও ভাতা
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BANK')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'BANK' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ৪. ব্যাংক হিসাব বিবরণ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DOCS')}
            className={`px-3.5 py-2.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'DOCS' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ৫. ঠিকানা ও স্বাক্ষর
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'BASIC' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Staff Code & NID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      স্টাফ আইডি / কোড (Employee ID) *
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="text-[11px] text-blue-600 hover:underline flex items-center space-x-0.5 cursor-pointer"
                      title="স্বয়ংক্রিয় আইডি জেনারেট"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>অটো-কোড</span>
                    </button>
                  </div>
                  <input
                    id="input-staff-code"
                    type="text"
                    required
                    placeholder="যেমন: STF-2026-001"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500">ফরম্যাট: STF-YYYY-001 (প্রয়োজনে এডিট করা যাবে)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    জাতীয় পরিচয়পত্র (NID) নম্বর
                  </label>
                  <input
                    id="input-staff-nid"
                    type="text"
                    placeholder="১০, ১৩ বা ১৭ ডিজিটের NID"
                    value={nid}
                    onChange={(e) => setNid(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Name (Bengali & English) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    স্টাফের পূর্ণ নাম (বাংলা) *
                  </label>
                  <input
                    id="input-staff-name-bn"
                    type="text"
                    required
                    placeholder="যেমন: মাওলানা মুফতি আব্দুল্লাহ আল-মামুন"
                    value={fullNameBn || name}
                    onChange={(e) => {
                      setFullNameBn(e.target.value);
                      if (!name) setName(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    স্টাফের নাম (ইংরেজি / প্রাতিষ্ঠানিক) *
                  </label>
                  <input
                    id="input-staff-name"
                    type="text"
                    required
                    placeholder="Mufti Abdullah Al Mamun"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Phone & Photo URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    মোবাইল নম্বর (যোগাযোগ) *
                  </label>
                  <input
                    id="input-staff-phone"
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    প্রোফাইল ছবি (Image URL - ঐচ্ছিক)
                  </label>
                  <input
                    id="input-staff-photo"
                    type="url"
                    placeholder="https://..."
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMPLOYMENT & STATUS */}
          {activeTab === 'EMPLOYMENT' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Category & Bangla Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ক্যাটেগরি / পদবি নির্বাচন *
                  </label>
                  <select
                    id="select-staff-designation"
                    value={designation}
                    onChange={(e) => handleDesignationChange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="IMAM">পেশ ইমাম (Imam)</option>
                    <option value="KHATIB">খতিব (Khatib)</option>
                    <option value="MUEZZIN">মুয়াজ্জিন (Muezzin)</option>
                    <option value="TEACHER">মক্তব/হিফজ শিক্ষক (Teacher)</option>
                    <option value="CLEANER">খাদেম ও পরিচ্ছন্নতাকর্মী (Cleaner/Khadem)</option>
                    <option value="SECURITY">নিরাপত্তাকর্মী (Security)</option>
                    <option value="OTHER">অন্যান্য স্টাফ (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    নির্দিষ্ট পদবি (বাংলা নাম) *
                  </label>
                  <input
                    id="input-staff-designation-bn"
                    type="text"
                    required
                    value={designationBn}
                    onChange={(e) => setDesignationBn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Employment Type & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    চাকরির ধরন (Employment Type) *
                  </label>
                  <select
                    id="select-staff-emp-type"
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="PERMANENT">স্থায়ী (Permanent)</option>
                    <option value="CONTRACTUAL">চুক্তিভিত্তিক (Contractual)</option>
                    <option value="PART_TIME">খণ্ডকালীন (Part-time)</option>
                    <option value="TEMPORARY">অস্থায়ী (Temporary)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    কর্মরত স্ট্যাটাস (Status) *
                  </label>
                  <select
                    id="select-staff-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-lg font-bold ${
                      status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : status === 'ON_LEAVE'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    <option value="ACTIVE">সক্রিয় (Active - বর্তমানে কর্মরত)</option>
                    <option value="ON_LEAVE">ছুটিতে (On Leave)</option>
                    <option value="INACTIVE">নিষ্ক্রিয় / অব্যাহতিপ্রাপ্ত (Inactive)</option>
                    <option value="TERMINATED">চাকরিচ্যুত / বাতিল (Terminated)</option>
                  </select>
                </div>
              </div>

              {/* Joining Date & Resignation Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    যোগদানের তারিখ (Joining Date) *
                  </label>
                  <input
                    id="input-staff-joining-date"
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {(status === 'INACTIVE' || status === 'TERMINATED') && (
                  <div>
                    <label className="block font-semibold text-rose-800 mb-1">
                      চাকরি শেষ / অব্যাহতির তারিখ
                    </label>
                    <input
                      id="input-staff-resignation-date"
                      type="date"
                      value={resignationDate}
                      onChange={(e) => setResignationDate(e.target.value)}
                      className="w-full px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  শিক্ষাগত ও দ্বীনি যোগ্যতা
                </label>
                <input
                  id="input-staff-education"
                  type="text"
                  placeholder="যেমন: দাওরায়ে হাদিস (তাকমিল), ক্বিরাত হাফেজ, কামিল (হাদিস)"
                  value={educationQualification}
                  onChange={(e) => setEducationQualification(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: SALARY & INCREMENT */}
          {activeTab === 'SALARY' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">
                      মূল মাসিক হাদিয়া / বেতন (৳) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-bold text-slate-500">৳</span>
                      <input
                        id="input-staff-salary"
                        type="number"
                        min="0"
                        required
                        value={monthlySalary}
                        onChange={(e) => setMonthlySalary(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      নিয়মিত মাসিক ভাতা (৳)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-bold text-slate-500">৳</span>
                      <input
                        id="input-staff-allowance"
                        type="number"
                        min="0"
                        value={allowance}
                        onChange={(e) => setAllowance(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      বর্তমান বেতন স্কেল কার্যকরের তারিখ
                    </label>
                    <input
                      id="input-salary-effective-date"
                      type="date"
                      value={salaryEffectiveDate}
                      onChange={(e) => setSalaryEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {isEdit && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        বেতন পরিবর্তন / ইনক্রিমেন্টের কারণ
                      </label>
                      <input
                        id="input-salary-revision-reason"
                        type="text"
                        placeholder="যেমন: বার্ষিক ইনক্রিমেন্ট বা কমিটি সিদ্ধান্ত"
                        value={salaryRevisionReason}
                        onChange={(e) => setSalaryRevisionReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-white/80 rounded-lg border border-blue-100 flex items-start space-x-2 text-[11px] text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>ডাটা ইন্টিগ্রিটি নীতি:</strong> বেতন পরিবর্তনের সাথে সাথে নতুন একটি স্যালারি হিস্ট্রি রেকর্ড যুক্ত হবে। পূর্বে পরিশোধিত কোনো বেতন বা হিসাবের ভাউচার কখনও পরিবর্তিত হবে না।
                  </span>
                </div>
              </div>

              {/* Show previous salary history summary if exists */}
              {isEdit && staff?.salaryHistory && staff.salaryHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1">
                    <span>📜 অতীতের বেতন পরিবর্তনের ইতিহাস ({staff.salaryHistory.length}টি)</span>
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
                    {staff.salaryHistory.map((hist, idx) => (
                      <div key={hist.id || idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">৳ {hist.newSalary?.toLocaleString('en-IN')}</span>
                          {hist.previousSalary ? (
                            <span className="text-slate-500 text-[10px] ml-1">
                              (পূর্বের: ৳{hist.previousSalary.toLocaleString('en-IN')})
                            </span>
                          ) : null}
                          <span className="text-slate-600 block text-[10px]">{hist.reason || 'বেতন স্কেল'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-700 font-mono font-semibold">{hist.effectiveDate}</span>
                          <span className="text-slate-400 block text-[10px]">{hist.changedByName || 'অ্যাডমিন'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BANK ACCOUNT */}
          {activeTab === 'BANK' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-emerald-950">অফিশিয়াল ব্যাংক ট্রান্সফার বিবরণ</span>
                </div>
                <span className="text-[10px] text-emerald-800 font-medium">ব্যাংক ট্রান্সফার লেটারে স্বয়ংক্রিয়ভাবে ব্যবহৃত হবে</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ব্যাংকের নাম
                  </label>
                  <input
                    id="input-staff-bank-name"
                    type="text"
                    placeholder="যেমন: Islami Bank Bangladesh PLC"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    শাখার নাম (Branch)
                  </label>
                  <input
                    id="input-staff-branch-name"
                    type="text"
                    placeholder="যেমন: Mirpur-10 Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    হিসাবধারীর নাম (A/C Name)
                  </label>
                  <input
                    id="input-staff-ac-holder"
                    type="text"
                    placeholder="হিসাবধারীর নাম (ব্যাংক চেক/বই অনুযায়ী)"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ব্যাংক হিসাব নম্বর (A/C Number)
                  </label>
                  <input
                    id="input-staff-ac-number"
                    type="text"
                    placeholder="যেমন: 205021300018894"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    রাউটিং নম্বর (Routing Number - ঐচ্ছিক)
                  </label>
                  <input
                    id="input-staff-routing-number"
                    type="text"
                    placeholder="৯ ডিজিটের রাউটিং নম্বর"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    হিসাবের ধরন (Account Type)
                  </label>
                  <select
                    id="select-staff-ac-type"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="SAVINGS">সঞ্চয়ী হিসাব (Savings A/C)</option>
                    <option value="CURRENT">চলতি হিসাব (Current A/C)</option>
                    <option value="SALARY">বেতন হিসাব (Salary A/C)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ADDRESS, NOTES & SIGNATURE */}
          {activeTab === 'DOCS' && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    বর্তমান ঠিকানা / কোয়ার্টার বাসস্থান
                  </label>
                  <textarea
                    id="input-staff-present-address"
                    rows={2}
                    placeholder="মসজিদ কোয়ার্টার ৩য় তলা, মিরপুর-১০..."
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    স্থায়ী ঠিকানা (গ্রাম, ডাকঘর, থানা, জেলা)
                  </label>
                  <textarea
                    id="input-staff-permanent-address"
                    rows={2}
                    placeholder="গ্রাম: আলীনগর, ডাকঘর: ফুলবাড়িয়া..."
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  স্বাক্ষর ইমেজ লিংক / ডিজিটাল স্বাক্ষর (ঐচ্ছিক)
                </label>
                <input
                  id="input-staff-signature-url"
                  type="text"
                  placeholder="https://... অথবা টেক্সট স্বাক্ষর"
                  value={signatureUrl}
                  onChange={(e) => setSignatureUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অতিরিক্ত মন্তব্য বা শর্তাবলী
                </label>
                <textarea
                  id="input-staff-notes"
                  rows={2}
                  placeholder="বিশেষ দ্রষ্টব্য, পূর্ববর্তী অভিজ্ঞতার তথ্য বা অন্যান্য নোট..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0">
            <div className="flex items-center space-x-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  const tabs: ('BASIC' | 'EMPLOYMENT' | 'SALARY' | 'BANK' | 'DOCS')[] = ['BASIC', 'EMPLOYMENT', 'SALARY', 'BANK', 'DOCS'];
                  const currIdx = tabs.indexOf(activeTab);
                  if (currIdx > 0) setActiveTab(tabs[currIdx - 1]);
                }}
                disabled={activeTab === 'BASIC'}
                className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium disabled:opacity-40 cursor-pointer"
              >
                ← পূর্ববর্তী
              </button>
              <button
                type="button"
                onClick={() => {
                  const tabs: ('BASIC' | 'EMPLOYMENT' | 'SALARY' | 'BANK' | 'DOCS')[] = ['BASIC', 'EMPLOYMENT', 'SALARY', 'BANK', 'DOCS'];
                  const currIdx = tabs.indexOf(activeTab);
                  if (currIdx < tabs.length - 1) setActiveTab(tabs[currIdx + 1]);
                }}
                disabled={activeTab === 'DOCS'}
                className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-bold disabled:opacity-40 cursor-pointer"
              >
                পরবর্তী →
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                id="btn-save-staff-profile"
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{loading ? 'সংরক্ষণ হচ্ছে...' : isEdit ? 'আপডেট সম্পন্ন করুন' : 'স্টাফ সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

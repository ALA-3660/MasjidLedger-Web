import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Save,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Landmark,
  FileText,
  UserCheck,
  ShieldCheck,
  Calendar,
  GraduationCap,
  Banknote,
  DollarSign,
  User,
  Phone,
  Briefcase,
  Layers,
  Heart
} from 'lucide-react';
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

  // Tab 1: Personal & Contact
  const [staffCode, setStaffCode] = useState('');
  const [name, setName] = useState('');
  const [fullNameBn, setFullNameBn] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<'MARRIED' | 'UNMARRIED' | 'OTHER'>('MARRIED');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [nid, setNid] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // Tab 2: Appointment & Employment
  const [designation, setDesignation] = useState<Staff['designation']>('IMAM');
  const [designationBn, setDesignationBn] = useState('পেশ ইমাম');
  const [employmentType, setEmploymentType] = useState<StaffEmploymentType>('PERMANENT');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentLetterNo, setAppointmentLetterNo] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'EMPLOYMENT_ENDED'>('ACTIVE');
  const [resignationDate, setResignationDate] = useState('');
  const [responsibilities, setResponsibilities] = useState('');

  // Tab 3: Education & Qualifications
  const [generalEducation, setGeneralEducation] = useState('');
  const [religiousEducation, setReligiousEducation] = useState('');
  const [specialSkills, setSpecialSkills] = useState('');
  const [previousExperience, setPreviousExperience] = useState('');
  const [quranMemorizationHifz, setQuranMemorizationHifz] = useState(false);
  const [qiratTajweedCertification, setQiratTajweedCertification] = useState(false);

  // Tab 4: Salary & Financial Structure
  const [basicSalary, setBasicSalary] = useState<number | ''>(15000);
  const [housingAllowance, setHousingAllowance] = useState<number | ''>(0);
  const [medicalAllowance, setMedicalAllowance] = useState<number | ''>(0);
  const [transportAllowance, setTransportAllowance] = useState<number | ''>(0);
  const [otherAllowance, setOtherAllowance] = useState<number | ''>(0);
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryRevisionReason, setSalaryRevisionReason] = useState('');
  const [paymentPreference, setPaymentPreference] = useState<'BANK' | 'CASH' | 'CHEQUE'>('BANK');

  // Tab 5: Bank Details
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CURRENT' | 'SALARY'>('SAVINGS');
  const [bankStatus, setBankStatus] = useState<'ACTIVE' | 'INACTIVE' | 'VERIFIED' | 'PENDING'>('ACTIVE');

  // Tab 6: Documents & Notes
  const [notes, setNotes] = useState('');
  const [officialAdminNotes, setOfficialAdminNotes] = useState('');
  const [documentLinks, setDocumentLinks] = useState('');

  // Navigation & Loading States
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'APPOINTMENT' | 'EDUCATION' | 'SALARY' | 'BANK' | 'DOCS'>('PERSONAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const designationMap: Record<Staff['designation'], string> = {
    IMAM: 'পেশ ইমাম',
    KHATIB: 'খতিব',
    MUEZZIN: 'মুয়াজ্জিন',
    KHADEM: 'খাদেম',
    TEACHER: 'মক্তব/হিফজ শিক্ষক',
    CLEANER: 'খাদেম ও পরিচ্ছন্নতাকর্মী',
    SECURITY: 'নিরাপত্তাকর্মী',
    OTHER: 'অন্যান্য স্টাফ',
  };

  const generateAutoCode = (joinDateStr: string) => {
    const year = joinDateStr ? joinDateStr.split('-')[0] : new Date().getFullYear().toString();
    const count = staffList.length + 1;
    return `STF-${year}-${String(count).padStart(3, '0')}`;
  };

  // Auto calculate age when Date of Birth changes
  useEffect(() => {
    if (dateOfBirth) {
      const birth = new Date(dateOfBirth);
      const today = new Date();
      if (!isNaN(birth.getTime())) {
        let calculatedAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge >= 0) {
          setAge(calculatedAge);
        }
      }
    }
  }, [dateOfBirth]);

  // Compute total monthly gross salary dynamically
  const calculatedGrossSalary =
    (Number(basicSalary) || 0) +
    (Number(housingAllowance) || 0) +
    (Number(medicalAllowance) || 0) +
    (Number(transportAllowance) || 0) +
    (Number(otherAllowance) || 0);

  useEffect(() => {
    if (staff) {
      setStaffCode(staff.staffCode || generateAutoCode(staff.joiningDate));
      setName(staff.name || '');
      setFullNameBn(staff.fullNameBn || staff.name || '');
      setFatherName(staff.fatherName || '');
      setMotherName(staff.motherName || '');
      setDateOfBirth(staff.dateOfBirth || '');
      setAge(staff.age || '');
      setBloodGroup(staff.bloodGroup || '');
      setMaritalStatus((staff.maritalStatus as any) || 'MARRIED');
      setPhone(staff.phone || '');
      setAlternatePhone(staff.alternatePhone || '');
      setEmail(staff.email || '');
      setNid(staff.nid || '');
      setPresentAddress(staff.presentAddress || staff.address || '');
      setPermanentAddress(staff.permanentAddress || staff.address || '');
      setEmergencyContactName(staff.emergencyContactName || '');
      setEmergencyContactPhone(staff.emergencyContactPhone || '');
      setPhotoUrl(staff.photoUrl || '');
      setSignatureUrl(staff.signatureUrl || '');

      setDesignation(staff.designation || 'IMAM');
      setDesignationBn(staff.designationBn || designationMap[staff.designation || 'IMAM']);
      setEmploymentType((staff.employmentType as any) || 'PERMANENT');
      setAppointmentDate(staff.appointmentDate || staff.joiningDate || '');
      setJoiningDate(staff.joiningDate || new Date().toISOString().split('T')[0]);
      setAppointmentLetterNo(staff.appointmentLetterNo || '');
      setContractEndDate(staff.contractEndDate || '');
      setStatus((staff.status as any) || 'ACTIVE');
      setResignationDate(staff.resignationDate || staff.terminationDate || '');
      setResponsibilities(staff.responsibilities || '');

      setGeneralEducation(staff.generalEducation || staff.educationQualification || '');
      setReligiousEducation(staff.religiousEducation || '');
      setSpecialSkills(staff.specialSkills || '');
      setPreviousExperience(staff.previousExperience || '');
      setQuranMemorizationHifz(staff.quranMemorizationHifz || false);
      setQiratTajweedCertification(staff.qiratTajweedCertification || false);

      const baseSal = staff.basicSalary !== undefined ? staff.basicSalary : (staff.monthlySalary !== undefined ? staff.monthlySalary : 15000);
      setBasicSalary(baseSal);
      setHousingAllowance(staff.housingAllowance || 0);
      setMedicalAllowance(staff.medicalAllowance || 0);
      setTransportAllowance(staff.transportAllowance || 0);
      setOtherAllowance(staff.otherAllowance || staff.allowance || 0);
      setSalaryEffectiveDate(staff.salaryEffectiveDate || staff.joiningDate || new Date().toISOString().split('T')[0]);
      setSalaryRevisionReason('');
      setPaymentPreference((staff.paymentPreference as any) || (staff.accountNumber ? 'BANK' : 'CASH'));

      setBankName(staff.bankName || '');
      setBranchName(staff.branchName || '');
      setAccountHolderName(staff.accountHolderName || staff.name || '');
      setAccountNumber(staff.accountNumber || '');
      setRoutingNumber(staff.routingNumber || '');
      setAccountType((staff.accountType as any) || 'SAVINGS');
      setBankStatus((staff.bankStatus as any) || (staff.accountNumber ? 'ACTIVE' : 'PENDING'));

      setNotes(staff.notes || '');
      setOfficialAdminNotes(staff.officialAdminNotes || '');
      setDocumentLinks(staff.documentLinks ? staff.documentLinks.join('\n') : '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setStaffCode(generateAutoCode(today));
      setName('');
      setFullNameBn('');
      setFatherName('');
      setMotherName('');
      setDateOfBirth('');
      setAge('');
      setBloodGroup('');
      setMaritalStatus('MARRIED');
      setPhone('');
      setAlternatePhone('');
      setEmail('');
      setNid('');
      setPresentAddress('');
      setPermanentAddress('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setPhotoUrl('');
      setSignatureUrl('');

      setDesignation('IMAM');
      setDesignationBn('পেশ ইমাম');
      setEmploymentType('PERMANENT');
      setAppointmentDate(today);
      setJoiningDate(today);
      setAppointmentLetterNo('');
      setContractEndDate('');
      setStatus('ACTIVE');
      setResignationDate('');
      setResponsibilities('৫ ওয়াক্ত সালাতে ইমামতি, খুৎবা প্রদান, এবং সংশ্লিষ্ট দ্বীনি খেদমত আঞ্জাম দেওয়া।');

      setGeneralEducation('আলিম / এইচএসসি');
      setReligiousEducation('দাওরায়ে হাদিস / কামিল');
      setSpecialSkills('খুতবা পাঠ, বিশুদ্ধ কুরআন তেলাওয়াত, তাজবীদ ও মসলা-মাসায়েল');
      setPreviousExperience('');
      setQuranMemorizationHifz(true);
      setQiratTajweedCertification(true);

      setBasicSalary(15000);
      setHousingAllowance(0);
      setMedicalAllowance(0);
      setTransportAllowance(0);
      setOtherAllowance(0);
      setSalaryEffectiveDate(today);
      setSalaryRevisionReason('');
      setPaymentPreference('BANK');

      setBankName('');
      setBranchName('');
      setAccountHolderName('');
      setAccountNumber('');
      setRoutingNumber('');
      setAccountType('SAVINGS');
      setBankStatus('ACTIVE');

      setNotes('');
      setOfficialAdminNotes('');
      setDocumentLinks('');
    }
    setActiveTab('PERSONAL');
    setError(null);
  }, [staff, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() && !fullNameBn.trim()) {
      setError('অনুগ্রহ করে স্টাফের নাম লিখুন।');
      setActiveTab('PERSONAL');
      return;
    }

    if (!phone.trim()) {
      setError('মোবাইল নম্বর আবশ্যক।');
      setActiveTab('PERSONAL');
      return;
    }

    if (!basicSalary && basicSalary !== 0) {
      setError('মূল বেতন/হাদিয়া আবশ্যক।');
      setActiveTab('SALARY');
      return;
    }

    try {
      setLoading(true);

      const payload: Partial<Staff> = {
        staffCode: staffCode.trim() || generateAutoCode(joiningDate),
        name: name.trim() || fullNameBn.trim(),
        fullNameBn: fullNameBn.trim() || name.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        dateOfBirth: dateOfBirth || undefined,
        age: age ? Number(age) : undefined,
        bloodGroup: bloodGroup || undefined,
        maritalStatus,
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        nid: nid.trim() || undefined,
        presentAddress: presentAddress.trim() || undefined,
        permanentAddress: permanentAddress.trim() || undefined,
        address: presentAddress.trim() || permanentAddress.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        signatureUrl: signatureUrl.trim() || undefined,

        designation,
        designationBn: designationBn.trim() || designationMap[designation],
        employmentType,
        appointmentDate: appointmentDate || joiningDate,
        joiningDate,
        appointmentLetterNo: appointmentLetterNo.trim() || undefined,
        contractEndDate: contractEndDate || undefined,
        status,
        resignationDate: resignationDate || undefined,
        terminationDate: resignationDate || undefined,
        responsibilities: responsibilities.trim() || undefined,

        generalEducation: generalEducation.trim() || undefined,
        religiousEducation: religiousEducation.trim() || undefined,
        educationQualification: `${generalEducation} ${religiousEducation}`.trim() || undefined,
        specialSkills: specialSkills.trim() || undefined,
        previousExperience: previousExperience.trim() || undefined,
        quranMemorizationHifz,
        qiratTajweedCertification,

        basicSalary: Number(basicSalary) || 0,
        monthlySalary: calculatedGrossSalary,
        housingAllowance: Number(housingAllowance) || 0,
        medicalAllowance: Number(medicalAllowance) || 0,
        transportAllowance: Number(transportAllowance) || 0,
        otherAllowance: Number(otherAllowance) || 0,
        allowance: (Number(housingAllowance) || 0) + (Number(medicalAllowance) || 0) + (Number(transportAllowance) || 0) + (Number(otherAllowance) || 0),
        salaryEffectiveDate,
        salaryRevisionReason: salaryRevisionReason.trim() || undefined,
        paymentPreference,

        bankName: bankName.trim() || undefined,
        branchName: branchName.trim() || undefined,
        accountHolderName: accountHolderName.trim() || name.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        routingNumber: routingNumber.trim() || undefined,
        accountType,
        bankStatus: accountNumber.trim() ? bankStatus : 'PENDING',

        notes: notes.trim() || undefined,
        officialAdminNotes: officialAdminNotes.trim() || undefined,
        documentLinks: documentLinks
          ? documentLinks.split('\n').map((l) => l.trim()).filter(Boolean)
          : undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'স্টাফ তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {isEdit ? 'স্টাফের পূর্ণাঙ্গ প্রোফাইল হালনাগাদ' : 'নতুন খতিব, ইমাম ও স্টাফ নিবন্ধন'}
              </h3>
              <p className="text-xs text-slate-300">
                ব্যক্তিগত, শিক্ষাগত, কর্মসংস্থান, বেতন ও ব্যাংক হিসাবের কেন্দ্রীয় কাঠামো
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('PERSONAL')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'PERSONAL'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            ১. ব্যক্তিগত ও যোগাযোগ
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('APPOINTMENT')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'APPOINTMENT'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            ২. নিয়োগ ও কর্মসংস্থান
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EDUCATION')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'EDUCATION'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            ৩. শিক্ষা ও ধর্মীয় যোগ্যতা
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SALARY')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'SALARY'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            ৪. বেতন ও ভাতা কাঠামো
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BANK')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'BANK'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            ৫. ব্যাংক ও পেমেন্ট তথ্য
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DOCS')}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'DOCS'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            ৬. নথি ও দাপ্তরিক নোট
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: PERSONAL & CONTACT */}
          {/* ========================================================= */}
          {activeTab === 'PERSONAL' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">
                    স্টাফ কোড / আইডি <span className="text-slate-400 font-normal">(স্বয়ংক্রিয়)</span>
                  </label>
                  <input
                    type="text"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    পুরো নাম (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullNameBn}
                    onChange={(e) => {
                      setFullNameBn(e.target.value);
                      if (!name) setName(e.target.value);
                    }}
                    required
                    placeholder="যেমন: হাফেজ মাওলানা মোঃ আব্দুল্লাহ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Full Name (English)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hafez Md. Abdullah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">পিতার নাম</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="পিতার পুরো নাম"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">মাতার নাম</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="মাতার পুরো নাম"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">জন্ম তারিখ</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">বয়স (বছর)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                    placeholder="স্বয়ংক্রিয় গণনা"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">রক্তের গ্রুপ</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="">-- নির্বাচন করুন --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">বৈবাহিক অবস্থা</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="MARRIED">বিবাহিত (Married)</option>
                    <option value="UNMARRIED">অবিবাহিত (Unmarried)</option>
                    <option value="OTHER">অন্যান্য (Other)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">
                    মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="০১৭xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">বিকল্প মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    placeholder="ঐচ্ছিক নম্বর"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">জাতীয় পরিচয়পত্র (NID) নম্বর</label>
                  <input
                    type="text"
                    value={nid}
                    onChange={(e) => setNid(e.target.value)}
                    placeholder="NID নম্বর"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">বর্তমান ঠিকানা</label>
                  <textarea
                    rows={2}
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                    placeholder="বর্তমান বাসস্থানের ঠিকানা..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">স্থায়ী ঠিকানা</label>
                  <textarea
                    rows={2}
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    placeholder="গ্রাম/রোড, ডাকঘর, থানা, জেলা..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">জরুরি যোগাযোগ ব্যক্তির নাম ও সম্পর্ক</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="যেমন: ভাই / পিতা / অভিভাবক"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">জরুরি যোগাযোগ নম্বর</label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="০১৮xxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">ছবি লিঙ্ক / Photo URL</label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">স্বাক্ষর লিঙ্ক / Signature URL</label>
                  <input
                    type="url"
                    value={signatureUrl}
                    onChange={(e) => setSignatureUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: APPOINTMENT & EMPLOYMENT */}
          {/* ========================================================= */}
          {activeTab === 'APPOINTMENT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">
                    পদবী ক্যাটাগরি <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={designation}
                    onChange={(e) => {
                      const val = e.target.value as Staff['designation'];
                      setDesignation(val);
                      setDesignationBn(designationMap[val]);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="IMAM">পেশ ইমাম (Imam)</option>
                    <option value="KHATIB">খতিব (Khatib)</option>
                    <option value="MUEZZIN">মুয়াজ্জিন (Muezzin)</option>
                    <option value="TEACHER">মক্তব/হিফজ শিক্ষক (Teacher)</option>
                    <option value="CLEANER">খাদেম ও পরিচ্ছন্নতাকর্মী (Khadem)</option>
                    <option value="SECURITY">নিরাপত্তাকর্মী (Security)</option>
                    <option value="OTHER">অন্যান্য স্টাফ (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    অফিসিয়াল পদবী (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={designationBn}
                    onChange={(e) => setDesignationBn(e.target.value)}
                    required
                    placeholder="যেমন: সিনিয়র পেশ ইমাম"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">কর্মসংস্থানের ধরণ</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="PERMANENT">স্থায়ী (Permanent)</option>
                    <option value="CONTRACTUAL">চুক্তিভিত্তিক (Contractual)</option>
                    <option value="PART_TIME">খণ্ডকালীন (Part-time)</option>
                    <option value="TEMPORARY">অস্থায়ী (Temporary)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">নিয়োগের তারিখ</label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    যোগদানের তারিখ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">নিয়োগপত্র স্মারক নম্বর</label>
                  <input
                    type="text"
                    value={appointmentLetterNo}
                    onChange={(e) => setAppointmentLetterNo(e.target.value)}
                    placeholder="যেমন: ML/APP/2026/04"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">বর্তমান চাকুরির স্ট্যাটাস</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="ACTIVE">সক্রিয় / চাকুরিরত (Active)</option>
                    <option value="ON_LEAVE">ছুটিতে রয়েছে (On Leave)</option>
                    <option value="INACTIVE">অব্যাহতি / নিষ্ক্রিয় (Inactive)</option>
                    <option value="TERMINATED">বরখাস্ত / বরখাস্তকৃত (Terminated)</option>
                    <option value="EMPLOYMENT_ENDED">চাকুরি সমাপ্ত (Ended)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">চুক্তির মেয়াদ সমাপ্তির তারিখ (প্রযোজ্য ক্ষেত্রে)</label>
                  <input
                    type="date"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">পদত্যাগ / সমাপ্তির তারিখ (যদি কার্যকর হয়)</label>
                  <input
                    type="date"
                    value={resignationDate}
                    onChange={(e) => setResignationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">প্রধান দায়িত্ব ও কার্যাবলী</label>
                <textarea
                  rows={3}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="দৈনন্দিন দায়িত্ব, জামাতের নেতৃত্ব ও দায়িত্বসমূহ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: EDUCATION & QUALIFICATIONS */}
          {/* ========================================================= */}
          {activeTab === 'EDUCATION' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">সাধারণ শিক্ষাগত যোগ্যতা</label>
                  <input
                    type="text"
                    value={generalEducation}
                    onChange={(e) => setGeneralEducation(e.target.value)}
                    placeholder="যেমন: দাখিল / আলিম / ফাজিল / এসএসসি / এইচএসসি"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">ধর্মীয় ও কওমি/আলিয়া সনদ</label>
                  <input
                    type="text"
                    value={religiousEducation}
                    onChange={(e) => setReligiousEducation(e.target.value)}
                    placeholder="যেমন: দাওরায়ে হাদিস (মাস্টার্স সমমান), ইফতা, তাফসির"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">বিশেষ দক্ষতা ও পারদর্শিতা</label>
                  <input
                    type="text"
                    value={specialSkills}
                    onChange={(e) => setSpecialSkills(e.target.value)}
                    placeholder="যেমন: সুমধুর খুতবা, তারাবীহ ইমামতি, তাজবীদ পাঠ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">পূর্ববর্তী অভিজ্ঞতা ও পূর্বতন প্রতিষ্ঠান</label>
                  <input
                    type="text"
                    value={previousExperience}
                    onChange={(e) => setPreviousExperience(e.target.value)}
                    placeholder="যেমন: বায়তুল আমান জামে মসজিদে ৫ বছর ইমামতি"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <h4 className="font-bold text-emerald-900">বিশেষ ধর্মীয় সনদ ও মর্যাদা</h4>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-emerald-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quranMemorizationHifz}
                      onChange={(e) => setQuranMemorizationHifz(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>হাফেজে কুরআন (পূর্ণ ৩০ পারা হিফজ)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-emerald-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qiratTajweedCertification}
                      onChange={(e) => setQiratTajweedCertification(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span>কেরাত ও তাজবীদ সনদপ্রাপ্ত (কারী)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: SALARY & FINANCIAL STRUCTURE */}
          {/* ========================================================= */}
          {activeTab === 'SALARY' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <h4 className="font-bold text-blue-900">মাসিক বেতন ও ভাতা বিভাজন</h4>
                  <div className="text-right">
                    <span className="text-[11px] text-blue-700">সর্বমোট প্রদেয় বেতন (Gross):</span>
                    <span className="ml-2 text-base font-extrabold text-blue-950">৳{calculatedGrossSalary.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-semibold mb-1">
                      মূল বেতন / হাদিয়া <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(e.target.value ? Number(e.target.value) : '')}
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">বাড়ি ভাড়া ভাতা</label>
                    <input
                      type="number"
                      min="0"
                      value={housingAllowance}
                      onChange={(e) => setHousingAllowance(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">চিকিৎসা ভাতা</label>
                    <input
                      type="number"
                      min="0"
                      value={medicalAllowance}
                      onChange={(e) => setMedicalAllowance(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold mb-1">যাতায়াত ভাতা</label>
                    <input
                      type="number"
                      min="0"
                      value={transportAllowance}
                      onChange={(e) => setTransportAllowance(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">অন্যান্য বিশেষ সুবিধা / ভাতা</label>
                    <input
                      type="number"
                      min="0"
                      value={otherAllowance}
                      onChange={(e) => setOtherAllowance(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">বেতন কাঠামো কার্যকরের তারিখ</label>
                  <input
                    type="date"
                    value={salaryEffectiveDate}
                    onChange={(e) => setSalaryEffectiveDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">বেতন পরিশোধ পছন্দ (Payment Method)</label>
                  <select
                    value={paymentPreference}
                    onChange={(e) => setPaymentPreference(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="BANK">ব্যাংক ট্রান্সফার (Bank Transfer)</option>
                    <option value="CASH">নগদ ক্যাশ (Cash)</option>
                    <option value="CHEQUE">চেক প্রদান (Cheque)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">বেতন সংশোধনের কারণ (ইনক্রিমেন্ট হলে)</label>
                  <input
                    type="text"
                    value={salaryRevisionReason}
                    onChange={(e) => setSalaryRevisionReason(e.target.value)}
                    placeholder="যেমন: বার্ষিক ইনক্রিমেন্ট"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: BANK DETAILS */}
          {/* ========================================================= */}
          {activeTab === 'BANK' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">ব্যাংকের নাম</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="যেমন: ইসলামী ব্যাংক বাংলাদেশ পিএলসি"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">শাখার নাম (Branch)</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="যেমন: ধানমন্ডি শাখা"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">হিসাবধারীর নাম (Account Title)</label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="ব্যাংক চেকবুক অনুযায়ী নাম"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">ব্যাংক হিসাব নম্বর (Account No)</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="২০৫xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">রাউটিং নম্বর (Routing Number)</label>
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    placeholder="যেমন: ১২৫২৬xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1">হিসাবের ধরণ (Account Type)</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="SAVINGS">মুদারাবা / সঞ্চয়ী হিসাব (Savings)</option>
                    <option value="CURRENT">চলতি হিসাব (Current)</option>
                    <option value="SALARY">বেতন হিসাব (Salary)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">অ্যাকাউন্ট স্ট্যাটাস</label>
                  <select
                    value={bankStatus}
                    onChange={(e) => setBankStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="ACTIVE">সক্রিয় (Active)</option>
                    <option value="VERIFIED">যাচাইকৃত (Verified)</option>
                    <option value="PENDING">অপেক্ষমাণ (Pending)</option>
                    <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: DOCUMENTS & NOTES */}
          {/* ========================================================= */}
          {activeTab === 'DOCS' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">
                  সংযুক্ত নথিপত্র ও সার্টিফিকেট লিংক (প্রতি লাইনে একটি URL)
                </label>
                <textarea
                  rows={3}
                  value={documentLinks}
                  onChange={(e) => setDocumentLinks(e.target.value)}
                  placeholder="https://drive.google.com/... (নিয়োগপত্র, NID কপি, শিক্ষাগত সনদ)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">সাধারণ মন্তব্য / নোট</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="স্টাফ সম্পর্কিত যেকোনো সাধারণ তথ্য..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-purple-900">
                  দাপ্তরিক ও প্রশাসনিক গোপনীয় নোট (কমিটি ও অ্যাডমিনের জন্য সংরক্ষিত)
                </label>
                <textarea
                  rows={2}
                  value={officialAdminNotes}
                  onChange={(e) => setOfficialAdminNotes(e.target.value)}
                  placeholder="কমিটির অভ্যন্তরীণ মূল্যায়ন, বিশেষ দিকনির্দেশনা..."
                  className="w-full px-3 py-2 bg-purple-50/60 border border-purple-200 rounded-xl text-purple-900"
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              {activeTab !== 'PERSONAL' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: Array<'PERSONAL' | 'APPOINTMENT' | 'EDUCATION' | 'SALARY' | 'BANK' | 'DOCS'> = [
                      'PERSONAL',
                      'APPOINTMENT',
                      'EDUCATION',
                      'SALARY',
                      'BANK',
                      'DOCS'
                    ];
                    const idx = tabs.indexOf(activeTab);
                    if (idx > 0) setActiveTab(tabs[idx - 1]);
                  }}
                  className="text-slate-600 hover:text-slate-900 font-semibold underline mr-2"
                >
                  ← পূর্ববর্তী ধাপ
                </button>
              )}
              {activeTab !== 'DOCS' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: Array<'PERSONAL' | 'APPOINTMENT' | 'EDUCATION' | 'SALARY' | 'BANK' | 'DOCS'> = [
                      'PERSONAL',
                      'APPOINTMENT',
                      'EDUCATION',
                      'SALARY',
                      'BANK',
                      'DOCS'
                    ];
                    const idx = tabs.indexOf(activeTab);
                    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
                  }}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold underline"
                >
                  পরবর্তী ধাপ →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'সংরক্ষণ হচ্ছে...' : isEdit ? 'প্রোফাইল আপডেট করুন' : 'স্টাফ নিবন্ধন সম্পন্ন করুন'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

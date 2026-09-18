import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  DollarSign,
  Gift,
  Receipt,
  Printer,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  FileText,
  CreditCard,
  TrendingUp,
  Award,
  Shield,
  Briefcase,
  Layers,
  History,
  Plus,
  Banknote,
  GraduationCap,
  Heart,
  Landmark,
  CalendarCheck,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  FolderOpen,
  Eye,
  Sparkles,
  RefreshCw,
  Coins,
  FileSpreadsheet
} from 'lucide-react';
import {
  Staff,
  StaffPayment,
  FinancialAccount,
  StaffLeaveRecord,
  StaffAdvanceRecord,
  StaffAttendanceRecord,
  StaffPhotoRecord,
  StaffDocumentRecord,
  StaffPositionChangeRecord,
  StaffPhotoType,
  StaffDocumentType
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';

interface StaffPersonnelProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  payments: StaffPayment[];
  accounts?: FinancialAccount[];
  onOpenPayModal?: (staffId: string) => void;
  onEditStaff?: (staff: Staff) => void;
  onUpdateStaff?: (staffId: string, updatedData: Partial<Staff>) => Promise<void>;
  onReviseSalary?: (staffId: string, data: { newSalary: number; effectiveDate: string; reason?: string }) => Promise<void>;
  onPrintSlip?: (payment: StaffPayment, staff: Staff) => void;
  onPrintAnnualStatement?: (staff: Staff) => void;
  onOpenAdvanceModal?: (staffId: string) => void;
  onOpenLeaveModal?: (staffId: string) => void;
  onOpenSettlementModal?: (staff: Staff) => void;
  onUpdateLeaveStatus?: (leaveId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => Promise<void>;
  language: Language;
}

type ProfileTab =
  | 'PERSONAL'
  | 'PHOTOS'
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'ATTENDANCE'
  | 'LEAVES'
  | 'SALARY'
  | 'ADVANCES'
  | 'PAYMENTS'
  | 'DOCUMENTS'
  | 'POSITION_HISTORY';

export const StaffPersonnelProfileModal: React.FC<StaffPersonnelProfileModalProps> = ({
  isOpen,
  onClose,
  staff,
  payments = [],
  accounts = [],
  onOpenPayModal,
  onEditStaff,
  onUpdateStaff,
  onReviseSalary,
  onPrintSlip,
  onPrintAnnualStatement,
  onOpenAdvanceModal,
  onOpenLeaveModal,
  onOpenSettlementModal,
  onUpdateLeaveStatus,
  language = 'bn',
}) => {
  const t = translations[language];
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<ProfileTab>('PERSONAL');

  // Photo modal state
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [photoType, setPhotoType] = useState<StaffPhotoType>('PROFILE');
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDriveLink, setPhotoDriveLink] = useState('');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoNotes, setPhotoNotes] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  // Document modal state
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docType, setDocType] = useState<StaffDocumentType>('NID');
  const [docTitle, setDocTitle] = useState('');
  const [docDriveLink, setDocDriveLink] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  // Position change modal state
  const [isAddPositionHistoryOpen, setIsAddPositionHistoryOpen] = useState(false);
  const [prevDesignation, setPrevDesignation] = useState(staff?.designationBn || '');
  const [newDesignation, setNewDesignation] = useState('');
  const [changeEffectiveDate, setChangeEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [changeReason, setChangeReason] = useState('');
  const [changeApprovedBy, setChangeApprovedBy] = useState('মসজিদ পরিচালনা কমিটি');
  const [positionLoading, setPositionLoading] = useState(false);

  if (!isOpen || !staff) return null;

  // Filter payments for this staff
  const staffPaymentsList = payments.filter((p) => p.staffId === staff.id);
  const totalPaid = staffPaymentsList.reduce((sum, p) => sum + (p.netPayable || p.basicSalary || 0), 0);

  // Print Profile Handlers
  const handlePrintProfile = () => {
    printElement('printable-staff-personnel-profile', {
      title: `কর্মী_প্রোফাইল_${staff.name}_${staff.staffCode || staff.id}`,
    });
  };

  // Add Photo Handler
  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoTitle.trim()) return;
    setPhotoLoading(true);
    try {
      const newPhoto: StaffPhotoRecord = {
        id: `photo-${Date.now()}`,
        type: photoType,
        title: photoTitle,
        url: photoUrl || staff.photoUrl,
        googleDriveLink: photoDriveLink,
        date: photoDate,
        notes: photoNotes,
        createdAt: new Date().toISOString(),
      };
      const updatedPhotos = [...(staff.photos || []), newPhoto];
      if (onUpdateStaff) {
        await onUpdateStaff(staff.id, {
          photos: updatedPhotos,
          ...(photoType === 'PROFILE' && photoUrl ? { photoUrl } : {}),
        });
      }
      setIsAddPhotoOpen(false);
      setPhotoTitle('');
      setPhotoDriveLink('');
      setPhotoNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setPhotoLoading(false);
    }
  };

  // Add Document Handler
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docDriveLink.trim()) return;
    setDocLoading(true);
    try {
      const newDoc: StaffDocumentRecord = {
        id: `doc-${Date.now()}`,
        title: docTitle,
        docType,
        description: docDescription,
        googleDriveLink: docDriveLink,
        docDate,
        uploadDate: new Date().toISOString(),
        expiryDate: docExpiryDate || undefined,
        status: 'ACTIVE',
        notes: docNotes,
        createdAt: new Date().toISOString(),
      };
      const updatedDocs = [...(staff.documents || []), newDoc];
      if (onUpdateStaff) {
        await onUpdateStaff(staff.id, { documents: updatedDocs });
      }
      setIsAddDocOpen(false);
      setDocTitle('');
      setDocDriveLink('');
      setDocDescription('');
      setDocNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setDocLoading(false);
    }
  };

  // Add Position History Handler
  const handleSavePositionHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesignation.trim()) return;
    setPositionLoading(true);
    try {
      const newRecord: StaffPositionChangeRecord = {
        id: `pos-${Date.now()}`,
        previousDesignation: prevDesignation || staff.designationBn,
        newDesignation,
        effectiveDate: changeEffectiveDate,
        reason: changeReason,
        approvedBy: changeApprovedBy,
        createdAt: new Date().toISOString(),
      };
      const updatedHistory = [...(staff.positionHistory || []), newRecord];
      if (onUpdateStaff) {
        await onUpdateStaff(staff.id, {
          designationBn: newDesignation,
          positionHistory: updatedHistory,
        });
      }
      setIsAddPositionHistoryOpen(false);
      setNewDesignation('');
      setChangeReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setPositionLoading(false);
    }
  };

  const getDocTypeName = (type: StaffDocumentType) => {
    switch (type) {
      case 'NID': return 'জাতীয় পরিচয়পত্র (NID)';
      case 'APPOINTMENT_LETTER': return 'নিয়োগপত্র';
      case 'ACADEMIC_CERTIFICATE': return 'শিক্ষাগত সনদ';
      case 'ISLAMIC_CERTIFICATE': return 'দ্বীনি শিক্ষা/সনদ';
      case 'TRAINING_CERTIFICATE': return 'প্রশিক্ষণ সনদ';
      case 'BANK_DOCUMENT': return 'ব্যাংক সংক্রান্ত নথি';
      case 'LEAVE_DOCUMENT': return 'ছুটির নথি';
      case 'POLICE_VERIFICATION': return 'পুলিশ ভেরিফিকেশন';
      case 'EXPERIENCE_CERTIFICATE': return 'অভিজ্ঞতা সনদ';
      default: return 'অন্যান্য গুরুত্বপূর্ণ নথি';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-indigo-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden shrink-0 flex items-center justify-center shadow-lg relative group">
                {staff.photoUrl ? (
                  <img
                    src={staff.photoUrl}
                    alt={staff.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-2xl sm:text-3xl font-bold text-indigo-200">
                    {staff.name.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold font-siliguri text-white tracking-tight">
                    {staff.fullNameBn || staff.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    {staff.designationBn || staff.designation}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      staff.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {staff.status === 'ACTIVE' ? '● কর্মরত / সক্রিয়' : '● নিষ্ক্রিয়'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-200/90 mt-1 font-medium">
                  {staff.staffCode && <span>আইডি: #{staff.staffCode}</span>}
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{staff.phone}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>যোগদান: {formatDate(staff.joiningDate, language)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {onEditStaff && (
                <button
                  type="button"
                  onClick={() => onEditStaff(staff)}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-white/20 transition-colors shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>সম্পাদনা</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintProfile}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-white/20 transition-colors shadow-xs"
                title="প্রোফাইল প্রিন্ট করুন"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Quick Tabs Nav Header */}
          <div className="flex items-center space-x-1 overflow-x-auto mt-4 pt-3 border-t border-white/10 scrollbar-none">
            {[
              { id: 'PERSONAL', label: '👤 পরিচিতি', count: undefined },
              { id: 'PHOTOS', label: '🖼️ ছবি', count: staff.photos?.length },
              { id: 'EMPLOYMENT', label: '💼 চাকরি ও দায়িত্ব', count: undefined },
              { id: 'POSITION_HISTORY', label: '📜 পদ পরিবর্তন', count: staff.positionHistory?.length },
              { id: 'EDUCATION', label: '🎓 শিক্ষা ও যোগ্যতা', count: undefined },
              { id: 'ATTENDANCE', label: '📅 হাজিরা', count: staff.attendanceRecords?.length },
              { id: 'LEAVES', label: '📝 ছুটি', count: staff.leaveRecords?.length },
              { id: 'SALARY', label: '💵 বেতন স্কেল', count: staff.salaryHistory?.length },
              { id: 'ADVANCES', label: '💰 অগ্রিম ও ঋণ', count: staff.advanceRecords?.length },
              { id: 'PAYMENTS', label: '🏦 পেমেন্ট হিস্ট্রি', count: staffPaymentsList.length },
              { id: 'DOCUMENTS', label: '📄 নথিপত্র', count: staff.documents?.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-900 shadow-sm'
                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === tab.id ? 'bg-indigo-100 text-indigo-900' : 'bg-white/20 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PERSONAL INFO */}
          {activeTab === 'PERSONAL' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">পূর্ণ নাম (বাংলা)</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block font-siliguri">{staff.fullNameBn || staff.name}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ইংরেজি নাম</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{staff.name}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">জাতীয় পরিচয়পত্র (NID)</span>
                  <span className="text-sm font-mono font-bold text-slate-800 mt-0.5 block">{staff.nid || 'তথ্য নেই'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">পিতা / স্বামীর নাম</span>
                  <span className="text-sm font-medium text-slate-800 mt-0.5 block">{staff.fatherName || 'তথ্য নেই'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">মাতার নাম</span>
                  <span className="text-sm font-medium text-slate-800 mt-0.5 block">{staff.motherName || 'তথ্য নেই'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">জন্মতারিখ ও বয়স</span>
                  <span className="text-sm font-medium text-slate-800 mt-0.5 block">
                    {staff.dateOfBirth ? formatDate(staff.dateOfBirth, language) : 'তথ্য নেই'} {staff.age ? `(${staff.age} বছর)` : ''}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">রক্তের গ্রুপ</span>
                  <span className="text-sm font-bold text-rose-600 mt-0.5 block">{staff.bloodGroup || 'অজানা'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">বৈবাহিক অবস্থা</span>
                  <span className="text-sm font-medium text-slate-800 mt-0.5 block">
                    {staff.maritalStatus === 'MARRIED' ? 'বিবাহিত' : staff.maritalStatus === 'UNMARRIED' ? 'অবিবাহিত' : 'অন্যান্য'}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">জরুরি যোগাযোগ</span>
                  <span className="text-sm font-medium text-slate-800 mt-0.5 block">
                    {staff.emergencyContactName || 'তথ্য নেই'} {staff.emergencyContactPhone ? `(${staff.emergencyContactPhone})` : ''}
                  </span>
                </div>
              </div>

              {/* Address Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5 mb-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>বর্তমান ঠিকানা</span>
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">{staff.presentAddress || staff.address || 'তথ্য নেই'}</p>
                </div>
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5 mb-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>স্থায়ী ঠিকানা</span>
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">{staff.permanentAddress || staff.address || 'তথ্য নেই'}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHOTOS */}
          {activeTab === 'PHOTOS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">কর্মীর ছবির গ্যালারি</h3>
                  <p className="text-xs text-slate-500">প্রোফাইল, পাসপোর্ট সাইজ, NID ও স্বাক্ষরের ছবি সংরক্ষণ</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPhotoOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>ছবি যোগ করুন</span>
                </button>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Default Profile Photo if available */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center text-center">
                  <div className="w-full h-40 bg-slate-100 rounded-xl overflow-hidden mb-2.5 flex items-center justify-center">
                    {staff.photoUrl ? (
                      <img src={staff.photoUrl} alt="Main Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800">প্রধান প্রোফাইল ছবি</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">সিস্টেম প্রোফাইল</span>
                </div>

                {/* Additional Photos */}
                {staff.photos?.map((photo) => (
                  <div key={photo.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div className="w-full h-40 bg-slate-100 rounded-xl overflow-hidden mb-2.5 flex items-center justify-center relative group">
                      {photo.url ? (
                        <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                      )}
                      {photo.googleDriveLink && (
                        <a
                          href={photo.googleDriveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1 text-xs font-bold"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Google Drive</span>
                        </a>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate">{photo.title}</span>
                        <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {photo.type}
                        </span>
                      </div>
                      {photo.notes && <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{photo.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EMPLOYMENT & RESPONSIBILITIES */}
          {activeTab === 'EMPLOYMENT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">বর্তমান পদ</span>
                  <span className="text-sm font-bold text-indigo-700 mt-0.5 block font-siliguri">{staff.designationBn}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">নিয়োগের ধরন</span>
                  <span className="text-sm font-medium text-slate-800 mt-0.5 block">
                    {staff.employmentType === 'PERMANENT' ? 'স্থায়ী / নিয়মিত' : 'চুক্তভিত্তিক'}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">যোগদানের তারিখ</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{formatDate(staff.joiningDate, language)}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">মাসিক মূল বেতন</span>
                  <span className="text-sm font-bold text-emerald-700 mt-0.5 block">{formatCurrency(staff.monthlySalary || staff.basicSalary || 0, language)}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">স্থায়ী ও অন্যান্য ভাতা</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">{formatCurrency(staff.allowance || 0, language)}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">নিয়োগপত্র নম্বর</span>
                  <span className="text-sm font-mono text-slate-800 mt-0.5 block">{staff.appointmentLetterNo || 'তথ্য নেই'}</span>
                </div>
              </div>

              {/* Responsibilities */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-900 mb-2">দায়িত্ব ও কর্তব্য বিবরণী</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {Array.isArray(staff.responsibilities)
                    ? staff.responsibilities.join('\n')
                    : staff.responsibilities || 'কোনো নির্দিষ্ট দায়িত্ব বিবরণী এন্ট্রি করা হয়নি।'}
                </p>
              </div>

              {/* Bank Account Info */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/70">
                <h4 className="text-xs font-bold text-emerald-900 mb-3 flex items-center space-x-2">
                  <Landmark className="w-4 h-4 text-emerald-700" />
                  <span>বেতন ব্যাংক হিসাব তথ্য</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">ব্যাংকের নাম:</span>
                    <span className="font-bold text-slate-800">{staff.bankName || 'তথ্য নেই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">শাখা:</span>
                    <span className="font-bold text-slate-800">{staff.branchName || 'তথ্য নেই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">হিসাব নম্বর:</span>
                    <span className="font-mono font-bold text-slate-800">{staff.accountNumber || 'তথ্য নেই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">হোল্ডারের নাম:</span>
                    <span className="font-bold text-slate-800">{staff.accountHolderName || staff.name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: POSITION HISTORY */}
          {activeTab === 'POSITION_HISTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">দায়িত্ব ও পদ পরিবর্তনের ইতিহাস</h3>
                  <p className="text-xs text-slate-500">পদোন্নতি, পদ পরিবর্তন ও পুনর্নিয়োগের ধারাবাহিক বিবরণ</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPositionHistoryOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>পদ পরিবর্তন যোগ করুন</span>
                </button>
              </div>

              {(!staff.positionHistory || staff.positionHistory.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো পদ পরিবর্তনের ইতিহাস এখনো যুক্ত করা হয়নি।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.positionHistory.map((hist) => (
                    <div key={hist.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-500 line-through">{hist.previousDesignation}</span>
                          <span className="text-xs text-indigo-600 font-bold">➔</span>
                          <span className="text-sm font-bold text-indigo-900 font-siliguri">{hist.newDesignation}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{hist.reason || 'নিয়মিত পদায়ন'}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <span className="block font-medium">কার্যকর: {formatDate(hist.effectiveDate, language)}</span>
                        <span className="text-[11px] text-slate-400">অনুমোদন: {hist.approvedBy || 'কমিটি'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EDUCATION & QUALIFICATIONS */}
          {activeTab === 'EDUCATION' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-indigo-900 mb-2 flex items-center space-x-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>সাধারণ শিক্ষাগত যোগ্যতা</span>
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {staff.generalEducation || staff.educationQualification || 'তথ্য উল্লেখ নেই'}
                  </p>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80">
                  <h4 className="text-xs font-bold text-emerald-900 mb-2 flex items-center space-x-1.5">
                    <Award className="w-4 h-4 text-emerald-700" />
                    <span>দ্বীনি ও ইসলামি শিক্ষা</span>
                  </h4>
                  <p className="text-xs text-emerald-950 leading-relaxed whitespace-pre-line">
                    {staff.religiousEducation || 'তথ্য উল্লেখ নেই'}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-emerald-200/60 text-xs">
                    {staff.quranMemorizationHifz && (
                      <span className="px-2.5 py-1 bg-emerald-700 text-white font-bold rounded-lg text-[11px]">
                        ★ হাফেজে কুরআন
                      </span>
                    )}
                    {staff.qiratTajweedCertification && (
                      <span className="px-2.5 py-1 bg-emerald-700 text-white font-bold rounded-lg text-[11px]">
                        ★ ক্বিরাত ও তাজবীদ সনদপ্রাপ্ত
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {staff.specialSkills && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 mb-1.5">বিশেষ দক্ষতা ও অভিজ্ঞতা</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">{staff.specialSkills}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ATTENDANCE */}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">হাজিরা রেকর্ড ও নামাজভিত্তিক উপস্থিতি</h3>
                  <p className="text-xs text-slate-500">পাঁচ ওয়াক্ত নামাজ / জুমার জামাতের হাজিরা</p>
                </div>
              </div>

              {(!staff.attendanceRecords || staff.attendanceRecords.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো হাজিরা রেকর্ড পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">তারিখ</th>
                        <th className="p-3">স্ট্যাটাস</th>
                        <th className="p-3">ইন টাইম</th>
                        <th className="p-3">উপস্থিত নামাজ</th>
                        <th className="p-3">মন্তব্য</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staff.attendanceRecords.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50">
                          <td className="p-3 font-medium">{formatDate(att.date, language)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              att.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                              att.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                              att.status === 'ON_LEAVE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{att.inTime || '-'}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {att.prayersAttended?.map((pr) => (
                                <span key={pr} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-semibold text-slate-700">
                                  {pr}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-slate-500">{att.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LEAVES */}
          {activeTab === 'LEAVES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ছুটি আবেদন ও রেকর্ড</h3>
                  <p className="text-xs text-slate-500">অনুমোদিত ও পেন্ডিং ছুটির বিবরণ</p>
                </div>
                {onOpenLeaveModal && (
                  <button
                    type="button"
                    onClick={() => onOpenLeaveModal(staff.id)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ছুটি আবেদন</span>
                  </button>
                )}
              </div>

              {(!staff.leaveRecords || staff.leaveRecords.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো ছুটির রেকর্ড পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.leaveRecords.map((lv) => (
                    <div key={lv.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-indigo-900">{lv.leaveTypeBn || lv.leaveType}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lv.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            lv.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {lv.status === 'APPROVED' ? 'অনুমোদিত' : lv.status === 'PENDING' ? 'অপেক্ষমাণ' : 'প্রত্যাখ্যাত'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{lv.reason}</p>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          মেয়াদ: {formatDate(lv.startDate, language)} থেকে {formatDate(lv.endDate, language)} ({lv.daysCount} দিন)
                        </span>
                      </div>
                      {lv.status === 'PENDING' && onUpdateLeaveStatus && (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onUpdateLeaveStatus(lv.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                          >
                            অনুমোদন
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLeaveStatus(lv.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                          >
                            বাতিল
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: SALARY SCALE & HISTORY */}
          {activeTab === 'SALARY' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider">বর্তমান সর্বমোট মাসিক বেতন</span>
                  <div className="text-2xl font-bold text-indigo-950 font-siliguri mt-1">
                    {formatCurrency(staff.monthlySalary || staff.basicSalary || 0, language)}
                  </div>
                  <p className="text-xs text-indigo-600/80 mt-0.5">
                    মূল বেতন: {formatCurrency(staff.basicSalary || staff.monthlySalary || 0, language)} + স্থায়ী ভাতা: {formatCurrency(staff.allowance || 0, language)}
                  </p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-900 mt-4">বেতন বৃদ্ধির ধারাবাহিক ইতিহাস</h4>
              {(!staff.salaryHistory || staff.salaryHistory.length === 0) ? (
                <p className="text-xs text-slate-500 italic">কোনো পূর্ববর্তী বেতন রিভিশন হিস্ট্রি নেই।</p>
              ) : (
                <div className="space-y-2">
                  {staff.salaryHistory.map((sh, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{formatCurrency(sh.newSalary, language)}</span>
                        <span className="text-slate-500 ml-2">({sh.reason || 'ইনক্রিমেন্ট'})</span>
                      </div>
                      <span className="text-slate-400 font-medium">কার্যকর: {formatDate(sh.effectiveDate, language)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: ADVANCES & LOANS */}
          {activeTab === 'ADVANCES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">অগ্রিম ও ঋণ রেজিস্টার</h3>
                  <p className="text-xs text-slate-500">বকেয়া অগ্রিম এবং মাসিক বেতন কর্তন সমন্বয়</p>
                </div>
                {onOpenAdvanceModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAdvanceModal(staff.id)}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন অগ্রিম</span>
                  </button>
                )}
              </div>

              {(!staff.advanceRecords || staff.advanceRecords.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Coins className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো অগ্রিম বা ঋণের রেকর্ড নেই।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.advanceRecords.map((adv) => (
                    <div key={adv.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(adv.amount, language)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adv.status === 'FULLY_ADJUSTED' ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {adv.status === 'FULLY_ADJUSTED' ? 'সম্পূর্ণ সমন্বয়কৃত' : 'বকেয়া আছে'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{adv.reason}</p>
                        <span className="text-[11px] text-slate-400">তারিখ: {formatDate(adv.advanceDate, language)}</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-500 block">অবশিষ্ট পাওনা:</span>
                        <span className="font-bold text-purple-700">{formatCurrency(adv.outstandingAmount, language)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: PAYMENTS HISTORY */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">বেতন ও ভাতার পেমেন্ট হিস্ট্রি</h3>
                  <p className="text-xs text-slate-500">পরিশোধিত মোট: {formatCurrency(totalPaid, language)}</p>
                </div>
                {onOpenPayModal && (
                  <button
                    type="button"
                    onClick={() => onOpenPayModal(staff.id)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>বেতন পরিশোধ</span>
                  </button>
                )}
              </div>

              {staffPaymentsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Banknote className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো পূর্ববর্তী পেমেন্ট রেকর্ড পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">মাস</th>
                        <th className="p-3">পরিশোধ তারিখ</th>
                        <th className="p-3">মূল বেতন</th>
                        <th className="p-3">ভাতা</th>
                        <th className="p-3">কর্তন</th>
                        <th className="p-3">পরিশোধিত টাকা</th>
                        <th className="p-3 text-right">রসিদ / স্লিপ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffPaymentsList.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-800 font-siliguri">{pmt.paymentMonth || pmt.month}</td>
                          <td className="p-3 text-slate-600">{formatDate(pmt.paymentDate, language)}</td>
                          <td className="p-3 font-mono">{formatCurrency(pmt.basicSalary, language)}</td>
                          <td className="p-3 font-mono text-emerald-600">+{formatCurrency(pmt.allowance || 0, language)}</td>
                          <td className="p-3 font-mono text-rose-600">-{formatCurrency(pmt.deduction || 0, language)}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{formatCurrency(pmt.netPayable, language)}</td>
                          <td className="p-3 text-right">
                            {onPrintSlip && (
                              <button
                                type="button"
                                onClick={() => onPrintSlip(pmt, staff)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>স্লিপ</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 11: GOOGLE DRIVE DOCUMENTS */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Google Drive নথিপত্র ও ডকুমেন্টস</h3>
                  <p className="text-xs text-slate-500">NID, নিয়োগপত্র, শিক্ষা ও ব্যাংকিং নথির লিংক</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>নথি লিংক যোগ করুন</span>
                </button>
              </div>

              {(!staff.documents || staff.documents.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">কোনো Google Drive নথি লিংক সংযুক্ত করা হয়নি।</p>
                  <button
                    type="button"
                    onClick={() => setIsAddDocOpen(true)}
                    className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold inline-flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>প্রথম নথি যুক্ত করুন</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {staff.documents.map((doc) => (
                    <div key={doc.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{doc.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                            {getDocTypeName(doc.docType)}
                          </span>
                        </div>
                        {doc.description && <p className="text-xs text-slate-500 mt-1">{doc.description}</p>}
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                          <span>আপলোড: {formatDate(doc.uploadDate, language)}</span>
                          {doc.expiryDate && <span className="text-amber-600">মেয়াদ: {formatDate(doc.expiryDate, language)}</span>}
                        </div>
                      </div>

                      <a
                        href={doc.googleDriveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors border border-indigo-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>🔗 Google Drive খুলুন</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden Printable Profile View for clean A4 printing */}
      <div id="printable-staff-personnel-profile" className="hidden print:block p-8 bg-white font-sans text-slate-900">
        <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
          <h1 className="text-2xl font-bold font-siliguri">মসজিদলেজার কর্মী প্রোফাইল ও কেন্দ্রীয় বিবরণী</h1>
          <p className="text-sm text-slate-600 mt-1">ইসলামিক ও প্রশাসনিক কর্মী কেন্দ্রীয় সেবা নথিপত্র</p>
        </div>

        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-siliguri">{staff.fullNameBn || staff.name}</h2>
            <p className="text-sm text-slate-700">পদবী: <strong>{staff.designationBn}</strong></p>
            <p className="text-xs text-slate-600">আইডি: #{staff.staffCode || staff.id} | মোবাইল: {staff.phone}</p>
            <p className="text-xs text-slate-600">যোগদান: {formatDate(staff.joiningDate, language)} | স্ট্যাটাস: {staff.status}</p>
          </div>
          {staff.photoUrl && (
            <div className="w-24 h-24 border border-slate-300 rounded overflow-hidden">
              <img src={staff.photoUrl} alt="Staff Photo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-6">
          <div className="p-3 border border-slate-200 rounded">
            <strong>ব্যক্তিগত তথ্য:</strong>
            <p>পিতা: {staff.fatherName || '-'}</p>
            <p>মাতা: {staff.motherName || '-'}</p>
            <p>NID: {staff.nid || '-'}</p>
            <p>রক্তের গ্রুপ: {staff.bloodGroup || '-'}</p>
          </div>
          <div className="p-3 border border-slate-200 rounded">
            <strong>বেতন ও আর্থিক তথ্য:</strong>
            <p>মাসিক মূল বেতন: {formatCurrency(staff.monthlySalary || 0, language)}</p>
            <p>স্থায়ী ভাতা: {formatCurrency(staff.allowance || 0, language)}</p>
            <p>ব্যাংক: {staff.bankName || '-'} (হিসাব: {staff.accountNumber || '-'})</p>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-slate-300 flex justify-between text-xs text-center">
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">কর্মীর স্বাক্ষর</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">সাধারণ সম্পাদক</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">সভাপতি / মোতওয়াল্লী</div>
          </div>
        </div>
      </div>

      {/* Add Photo Modal */}
      {isAddPhotoOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">নতুন ছবি যোগ করুন</h3>
              <button type="button" onClick={() => setIsAddPhotoOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePhoto} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ছবির ধরন</label>
                <select
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value as StaffPhotoType)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="PROFILE">প্রধান প্রোফাইল ছবি</option>
                  <option value="PASSPORT">পাসপোর্ট সাইজ ছবি</option>
                  <option value="NID">NID / পরিচয়পত্রের ছবি</option>
                  <option value="SIGNATURE">স্বাক্ষরের ছবি</option>
                  <option value="OTHER">অন্যান্য ছবি</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ছবির শিরোনাম / নাম *</label>
                <input
                  type="text"
                  required
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="যেমন: পাসপোর্ট ছবি ২০২৬"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ছবির URL (ঐচ্ছিক)</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Google Drive Link (প্রস্তাবিত)</label>
                <input
                  type="url"
                  value={photoDriveLink}
                  onChange={(e) => setPhotoDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">সংক্ষিপ্ত নোট</label>
                <input
                  type="text"
                  value={photoNotes}
                  onChange={(e) => setPhotoNotes(e.target.value)}
                  placeholder="মন্তব্য..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddPhotoOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={photoLoading}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  {photoLoading ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {isAddDocOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Google Drive নথি লিংক যোগ করুন</h3>
              <button type="button" onClick={() => setIsAddDocOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDocument} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">নথির ধরন</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as StaffDocumentType)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="NID">জাতীয় পরিচয়পত্র (NID)</option>
                  <option value="APPOINTMENT_LETTER">নিয়োগপত্র</option>
                  <option value="ACADEMIC_CERTIFICATE">শিক্ষাগত সনদ</option>
                  <option value="ISLAMIC_CERTIFICATE">দ্বীনি শিক্ষা/সনদ</option>
                  <option value="TRAINING_CERTIFICATE">প্রশিক্ষণ সনদ</option>
                  <option value="BANK_DOCUMENT">ব্যাংক সংক্রান্ত নথি</option>
                  <option value="LEAVE_DOCUMENT">ছুটির নথি</option>
                  <option value="POLICE_VERIFICATION">পুলিশ ভেরিফিকেশন</option>
                  <option value="EXPERIENCE_CERTIFICATE">অভিজ্ঞতা সনদ</option>
                  <option value="OTHER">অন্যান্য নথি</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">নথির নাম / শিরোনাম *</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="যেমন: মূল নিয়োগপত্র কপি"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Google Drive Link *</label>
                <input
                  type="url"
                  required
                  value={docDriveLink}
                  onChange={(e) => setDocDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">বিবরণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="নথি সম্পর্কিত তথ্য..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddDocOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={docLoading}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  {docLoading ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Position History Modal */}
      {isAddPositionHistoryOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">পদ পরিবর্তন রেজিস্টার</h3>
              <button type="button" onClick={() => setIsAddPositionHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePositionHistory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">আগের পদ</label>
                <input
                  type="text"
                  disabled
                  value={prevDesignation}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-slate-100"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">নতুন পদ *</label>
                <input
                  type="text"
                  required
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder="যেমন: সিনিয়র পেশ ইমাম"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">কার্যকর হওয়ার তারিখ</label>
                <input
                  type="date"
                  value={changeEffectiveDate}
                  onChange={(e) => setChangeEffectiveDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">পরিবর্তনের কারণ</label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="যেমন: পদোন্নতি ও দায়িত্ব বৃদ্ধি"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddPositionHistoryOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={positionLoading}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  {positionLoading ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

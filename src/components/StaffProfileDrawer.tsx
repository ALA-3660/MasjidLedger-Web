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
  CheckCircle2
} from 'lucide-react';
import { Staff, StaffPayment, FinancialAccount, SalaryHistoryEntry, StaffLeaveRecord, StaffAdvanceRecord } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { api } from '../lib/api';
import { DocumentSection } from './DocumentSection';

interface StaffProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  payments: StaffPayment[];
  accounts?: FinancialAccount[];
  onOpenPayModal: (staffId: string) => void;
  onEditStaff: (staff: Staff) => void;
  onReviseSalary?: (staffId: string, data: { newSalary: number; effectiveDate: string; reason?: string }) => Promise<void>;
  onUpdatePayment?: (id: string, data: any) => Promise<void>;
  onCancelPayment?: (id: string, reason?: string) => Promise<void>;
  onPrintSlip: (payment: StaffPayment, staff: Staff) => void;
  onPrintAnnualStatement?: (staff: Staff) => void;
  onOpenAdvanceModal?: (staffId: string) => void;
  onOpenLeaveModal?: (staffId: string) => void;
  onOpenSettlementModal?: (staff: Staff) => void;
  onOpenIdCardModal?: (staff: Staff) => void;
  onUpdateLeaveStatus?: (leaveId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => Promise<void>;
  language: Language;
}

export const StaffProfileDrawer: React.FC<StaffProfileDrawerProps> = ({
  isOpen,
  onClose,
  staff,
  payments,
  accounts = [],
  onOpenPayModal,
  onEditStaff,
  onReviseSalary,
  onUpdatePayment,
  onCancelPayment,
  onPrintSlip,
  onPrintAnnualStatement,
  onOpenAdvanceModal,
  onOpenLeaveModal,
  onOpenSettlementModal,
  onOpenIdCardModal,
  onUpdateLeaveStatus,
  language,
}) => {
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<
    'DETAILS' | 'PAYMENTS' | 'SALARY_HISTORY' | 'ADVANCES' | 'LEAVES' | 'ATTENDANCE' | 'HISTORY' | 'DOCUMENTS'
  >('DETAILS');

  // Salary Revision Modal
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [newSalary, setNewSalary] = useState<number>(staff?.monthlySalary || staff?.basicSalary || 0);
  const [revisionEffectiveDate, setRevisionEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [revisionReason, setRevisionReason] = useState<string>('বার্ষিক ইনক্রিমেন্ট ও বেতন বৃদ্ধি');
  const [revisionLoading, setRevisionLoading] = useState(false);

  // Edit payment modal state
  const [editingPayment, setEditingPayment] = useState<StaffPayment | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Cancel payment modal state
  const [cancellingPayment, setCancellingPayment] = useState<StaffPayment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  if (!isOpen || !staff) return null;

  // Filter payments for this staff
  const staffPayments = payments.filter((p) => p.staffId === staff.id);

  // Aggregate stats
  const totalPaid = staffPayments
    .filter((p) => p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + (p.netPaid || 0), 0);

  const totalBonus = staffPayments
    .filter((p) => p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + (p.bonus || 0), 0);

  const paidMonthsCount = staffPayments.filter((p) => p.status !== 'CANCELLED').length;

  // Active advance total
  const activeAdvances = (staff.advanceRecords || []).filter(
    (a) => a.status === 'ACTIVE' || a.status === 'PARTIALLY_ADJUSTED'
  );
  const totalOutstandingAdvance = activeAdvances.reduce((sum, a) => sum + (a.outstandingAmount || 0), 0);

  // Total leaves count
  const approvedLeaves = (staff.leaveRecords || []).filter((l) => l.status === 'APPROVED');
  const totalLeaveDays = approvedLeaves.reduce((sum, l) => sum + (l.daysCount || 0), 0);

  const handleSalaryRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalary || newSalary <= 0) return;
    try {
      setRevisionLoading(true);
      if (onReviseSalary) {
        await onReviseSalary(staff.id, {
          newSalary: Number(newSalary),
          effectiveDate: revisionEffectiveDate,
          reason: revisionReason,
        });
      }
      setIsRevisionModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'বেতন পরিবর্তন ব্যর্থ হয়েছে');
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !onUpdatePayment) return;
    try {
      setEditLoading(true);
      await onUpdatePayment(editingPayment.id, {
        notes: editNotes,
        paymentDate: editPaymentDate || editingPayment.paymentDate,
      });
      setEditingPayment(null);
    } catch (err: any) {
      alert(err.message || 'পেমেন্ট আপডেট ব্যর্থ হয়েছে');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPayment || !onCancelPayment) return;
    try {
      setCancelLoading(true);
      await onCancelPayment(cancellingPayment.id, cancelReason);
      setCancellingPayment(null);
    } catch (err: any) {
      alert(err.message || 'পেমেন্ট বাতিল ব্যর্থ হয়েছে');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleLeaveStatusChange = async (leaveId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    try {
      if (onUpdateLeaveStatus) {
        await onUpdateLeaveStatus(leaveId, status);
      } else {
        await api.updateStaffLeave(staff.id, leaveId, { status });
      }
    } catch (err: any) {
      alert(err.message || 'ছুটির স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
              {staff.photoUrl ? (
                <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
              ) : (
                <User className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{staff.fullNameBn || staff.name}</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold">
                  {staff.staffCode || 'আইডি নাই'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    staff.status === 'ACTIVE' || !staff.status
                      ? 'bg-emerald-500 text-white'
                      : staff.status === 'ON_LEAVE'
                      ? 'bg-blue-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {staff.status === 'ACTIVE' || !staff.status
                    ? 'চাকুরিরত'
                    : staff.status === 'ON_LEAVE'
                    ? 'ছুটিতে'
                    : 'নিষ্ক্রিয়/সমাপ্ত'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {staff.designationBn} • {staff.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenIdCardModal && (
              <button
                onClick={() => onOpenIdCardModal(staff)}
                title="অফিসিয়াল আইডি কার্ড প্রিন্ট"
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}

            {onPrintAnnualStatement && (
              <button
                onClick={() => onPrintAnnualStatement(staff)}
                title="বাৎসরিক স্টেটমেন্ট"
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onEditStaff(staff)}
              title="তথ্য সম্পাদনা"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Highlights Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <div>
              মাসিক মোট বেতন: <strong className="text-slate-900 font-bold">৳{(staff.monthlySalary || staff.basicSalary || 0).toLocaleString()}</strong>
            </div>
            <div>
              বকেয়া অগ্রিম: <strong className="text-purple-700 font-bold">৳{totalOutstandingAdvance.toLocaleString()}</strong>
            </div>
            <div>
              মোট ছুটি গ্রহণ: <strong className="text-amber-700 font-bold">{totalLeaveDays} দিন</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdvanceModal && (
              <button
                onClick={() => onOpenAdvanceModal(staff.id)}
                className="px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg font-semibold flex items-center gap-1 transition"
              >
                <Banknote className="w-3.5 h-3.5" />
                অগ্রিম প্রদান
              </button>
            )}

            {onOpenLeaveModal && (
              <button
                onClick={() => onOpenLeaveModal(staff.id)}
                className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg font-semibold flex items-center gap-1 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                ছুটি আবেদন
              </button>
            )}

            <button
              onClick={() => onOpenPayModal(staff.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-2xs transition"
            >
              <DollarSign className="w-3.5 h-3.5" />
              বেতন প্রদান
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 bg-white border-b border-slate-200 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'DETAILS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            পূর্ণ বিবরণী
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'PAYMENTS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            বেতন ইতিহাস ({staffPayments.length})
          </button>

          <button
            onClick={() => setActiveTab('SALARY_HISTORY')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'SALARY_HISTORY'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            ইনক্রিমেন্ট ট্রেইল ({staff.salaryHistory?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('ADVANCES')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'ADVANCES'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            বেতন অগ্রিম ({staff.advanceRecords?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('LEAVES')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'LEAVES'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            ছুটি রেকর্ড ({staff.leaveRecords?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'ATTENDANCE'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            উপস্থিতি
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'HISTORY'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            কর্মসংস্থান ট্রেইল
          </button>

          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'DOCUMENTS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            নথি ও ফাইল
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/40">
          
          {/* ========================================================= */}
          {/* TAB 1: FULL BIO & APPOINTMENT DETAILS */}
          {/* ========================================================= */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-5">
              {/* Personal Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  ব্যক্তিগত ও পারিবারিক তথ্য
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 block">নাম (বাংলা):</span>
                    <span className="font-bold text-slate-900">{staff.fullNameBn || staff.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">পিতার নাম:</span>
                    <span className="font-semibold text-slate-900">{staff.fatherName || 'উল্লেখ নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">মাতার নাম:</span>
                    <span className="font-semibold text-slate-900">{staff.motherName || 'উল্লেখ নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">জন্ম তারিখ ও বয়স:</span>
                    <span className="font-medium text-slate-900">
                      {staff.dateOfBirth ? `${staff.dateOfBirth} (${staff.age || 'N/A'} বছর)` : 'উল্লেখ নাই'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">রক্তের গ্রুপ:</span>
                    <span className="font-bold text-rose-600">{staff.bloodGroup || 'অজানা'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">বৈবাহিক অবস্থা:</span>
                    <span className="font-medium text-slate-900">
                      {staff.maritalStatus === 'MARRIED' ? 'বিবাহিত' : staff.maritalStatus === 'UNMARRIED' ? 'অবিবাহিত' : 'অন্যান্য'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">মোবাইল নম্বর:</span>
                    <span className="font-bold text-emerald-700">{staff.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">বিকল্প মোবাইল:</span>
                    <span className="font-medium text-slate-700">{staff.alternatePhone || 'নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">NID নম্বর:</span>
                    <span className="font-mono text-slate-900">{staff.nid || 'সংরক্ষিত নয়'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block">বর্তমান ঠিকানা:</span>
                    <span className="text-slate-800">{staff.presentAddress || staff.address || 'উল্লেখ নাই'}</span>
                  </div>
                  <div className="sm:col-span-1">
                    <span className="text-slate-500 block">স্থায়ী ঠিকানা:</span>
                    <span className="text-slate-800">{staff.permanentAddress || 'উল্লেখ নাই'}</span>
                  </div>
                  {staff.emergencyContactName && (
                    <div className="sm:col-span-3 p-2.5 bg-slate-50 rounded-lg text-slate-700 flex items-center justify-between">
                      <span>জরুরি যোগাযোগ: <strong>{staff.emergencyContactName}</strong></span>
                      <span>মোবাইল: <strong>{staff.emergencyContactPhone || 'নাই'}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  নিয়োগ ও দায়িত্ব বিবরণী
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 block">পদবী:</span>
                    <span className="font-bold text-blue-900">{staff.designationBn}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">কর্মসংস্থানের ধরণ:</span>
                    <span className="font-semibold text-slate-800">{staff.employmentType || 'স্থায়ী'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">যোগদানের তারিখ:</span>
                    <span className="font-medium text-slate-900">{staff.joiningDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">নিয়োগ স্মারক নং:</span>
                    <span className="font-mono text-slate-700">{staff.appointmentLetterNo || 'নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">বর্তমান স্ট্যাটাস:</span>
                    <span className="font-bold text-emerald-700">{staff.status || 'ACTIVE'}</span>
                  </div>
                  {staff.contractEndDate && (
                    <div>
                      <span className="text-slate-500 block">চুক্তির মেয়াদ শেষ:</span>
                      <span className="text-amber-700 font-semibold">{staff.contractEndDate}</span>
                    </div>
                  )}
                  <div className="sm:col-span-3">
                    <span className="text-slate-500 block">প্রধান দায়িত্ব ও কার্যাবলী:</span>
                    <p className="text-slate-800 mt-1 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
                      {staff.responsibilities || '৫ ওয়াক্ত সালাতে ইমামতি, খুৎবা প্রদান ও সংশ্লিষ্ট দায়িত্ব পালন।'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Education & Qualifications */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  শিক্ষা ও ধর্মীয় যোগ্যতা
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 block">সাধারণ শিক্ষা:</span>
                    <span className="font-semibold text-slate-900">{staff.generalEducation || staff.educationQualification || 'উল্লেখ নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ধর্মীয় ও কওমি/আলিয়া শিক্ষা:</span>
                    <span className="font-semibold text-indigo-900">{staff.religiousEducation || 'দাওরায়ে হাদিস'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">বিশেষ দক্ষতা:</span>
                    <span className="text-slate-800">{staff.specialSkills || 'খুতবা ও বয়ান'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">পূর্ববর্তী অভিজ্ঞতা:</span>
                    <span className="text-slate-800">{staff.previousExperience || 'নাই'}</span>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                    {staff.quranMemorizationHifz && (
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded-md">
                        ✓ হাফেজে কুরআন (হিফজুল কুরআন)
                      </span>
                    )}
                    {staff.qiratTajweedCertification && (
                      <span className="px-2.5 py-1 bg-teal-50 border border-teal-300 text-teal-800 font-bold rounded-md">
                        ✓ কেরাত ও তাজবীদ সনদপ্রাপ্ত
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Details Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Landmark className="w-4 h-4 text-emerald-600" />
                  ব্যাংক হিসাব ও পেমেন্ট চ্যানেল
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 block">ব্যাংকের নাম:</span>
                    <span className="font-bold text-slate-900">{staff.bankName || 'উল্লেখ নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">শাখা (Branch):</span>
                    <span className="font-medium text-slate-800">{staff.branchName || 'নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">হিসাব নম্বর:</span>
                    <span className="font-mono font-bold text-slate-900">{staff.accountNumber || 'নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">হিসাবধারীর নাম:</span>
                    <span className="text-slate-800">{staff.accountHolderName || staff.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">রাউটিং নম্বর:</span>
                    <span className="font-mono text-slate-700">{staff.routingNumber || 'নাই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">পেমেন্ট পছন্দ:</span>
                    <span className="font-semibold text-emerald-700">{staff.paymentPreference || 'BANK'}</span>
                  </div>
                </div>
              </div>

              {/* Final Settlement trigger if active */}
              {onOpenSettlementModal && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-amber-900 text-xs">চাকুরি সমাপ্তি ও চূড়ান্ত পাওনা নিষ্পত্তি</h5>
                    <p className="text-[11px] text-amber-700 mt-0.5">অবসর, পদত্যাগ বা স্থানান্তরের ক্ষেত্রে দেনা-পাওনা ও বিদায়ী সম্মাননা হিসাব করুন</p>
                  </div>
                  <button
                    onClick={() => onOpenSettlementModal(staff)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition"
                  >
                    চূড়ান্ত নিষ্পত্তি ফরম →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: PAYMENTS HISTORY */}
          {/* ========================================================= */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">মাসিক বেতন ও হাদিয়া পরিশোধ বিবরণী</h4>
                <button
                  onClick={() => onOpenPayModal(staff.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  নতুন বেতন প্রদান
                </button>
              </div>

              {staffPayments.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  এখনও কোনো বেতন পরিশোধের রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-3">
                  {staffPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-300 transition flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">মাস: {p.month}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded">
                            ৳{(p.netPaid || p.amount).toLocaleString()}
                          </span>
                          {p.status === 'CANCELLED' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded">বাতিলকৃত</span>
                          )}
                        </div>
                        <p className="text-slate-500 mt-1">
                          তারিখ: {p.paymentDate} • মাধ্যম: {p.paymentMethod} • ভাউচার: {p.voucherNo || 'N/A'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPrintSlip(p, staff)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          স্লিপ প্রিন্ট
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SALARY INCREMENT TRAIL */}
          {/* ========================================================= */}
          {activeTab === 'SALARY_HISTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">বেতন বৃদ্ধি ও ইনক্রিমেন্ট ইতিহাস</h4>
                  <p className="text-xs text-slate-500">পূর্ববর্তী সকল বেতন কাঠামো ও বৃদ্ধির কারণ</p>
                </div>
                <button
                  onClick={() => setIsRevisionModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  নতুন ইনক্রিমেন্ট যোগ
                </button>
              </div>

              {(!staff.salaryHistory || staff.salaryHistory.length === 0) ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  কোনো ইনক্রিমেন্ট বা সংশোধনের ইতিহাস পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.salaryHistory.map((hist, idx) => (
                    <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          পূর্ববর্তী বেতন: ৳{(hist.previousSalary || 0).toLocaleString()} ➔ নতুন বেতন: <strong className="text-emerald-700">৳{(hist.newSalary || 0).toLocaleString()}</strong>
                        </span>
                        <span className="text-slate-500 font-medium">কার্যকর: {hist.effectiveDate}</span>
                      </div>
                      <p className="text-slate-600">কারণ: {hist.reason || 'বার্ষিক ইনক্রিমেন্ট'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: ADVANCE RECORDS */}
          {/* ========================================================= */}
          {activeTab === 'ADVANCES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">বেতন অগ্রিম ও ঋণ হিসাব</h4>
                  <p className="text-xs text-slate-500">চলতি বকেয়া অগ্রিম: ৳{totalOutstandingAdvance.toLocaleString()}</p>
                </div>
                {onOpenAdvanceModal && (
                  <button
                    onClick={() => onOpenAdvanceModal(staff.id)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    অগ্রিম প্রদান করুন
                  </button>
                )}
              </div>

              {(!staff.advanceRecords || staff.advanceRecords.length === 0) ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  কোনো অগ্রিম গ্রহণের রেকর্ড নেই।
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.advanceRecords.map((adv) => (
                    <div key={adv.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">অগ্রিম: ৳{adv.amount.toLocaleString()}</span>
                          <span className="ml-2 text-purple-700 font-semibold">বকেয়া: ৳{(adv.outstandingAmount || 0).toLocaleString()}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            adv.status === 'FULLY_ADJUSTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {adv.status === 'FULLY_ADJUSTED' ? 'পূর্ণ সমন্বয়কৃত' : 'সমন্বয়াধীন'}
                        </span>
                      </div>
                      <p className="text-slate-600">তারিখ: {adv.advanceDate} • কারণ: {adv.reason || 'জরুরি প্রয়োজন'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: LEAVE RECORDS */}
          {/* ========================================================= */}
          {activeTab === 'LEAVES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">ছুটি আবেদন ও মঞ্জুরির রেকর্ড</h4>
                  <p className="text-xs text-slate-500">মোট অনুমোদিত ছুটি: {totalLeaveDays} দিন</p>
                </div>
                {onOpenLeaveModal && (
                  <button
                    onClick={() => onOpenLeaveModal(staff.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    ছুটি আবেদন
                  </button>
                )}
              </div>

              {(!staff.leaveRecords || staff.leaveRecords.length === 0) ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  কোনো ছুটির রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.leaveRecords.map((l) => (
                    <div key={l.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{l.leaveTypeBn || l.leaveType}</span>
                          <span className="ml-2 font-semibold text-amber-800">({l.daysCount} দিন)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              l.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : l.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {l.status === 'APPROVED' ? 'মঞ্জুরীকৃত' : l.status === 'PENDING' ? 'অপেক্ষমাণ' : 'প্রত্যাখ্যাত'}
                          </span>

                          {l.status === 'PENDING' && (
                            <button
                              onClick={() => handleLeaveStatusChange(l.id, 'APPROVED')}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              অনুমোদন
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600">মেয়াদ: {l.startDate} হতে {l.endDate} পর্যন্ত • কারণ: {l.reason || 'ব্যক্তিগত'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: ATTENDANCE RECORDS */}
          {/* ========================================================= */}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">উপস্থিতি ও দৈনিক সালাত জামাত লগ</h4>

              {(!staff.attendanceRecords || staff.attendanceRecords.length === 0) ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  কোনো উপস্থিতি রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-2">
                  {staff.attendanceRecords.slice(0, 15).map((att) => (
                    <div key={att.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{att.date}</span>
                        <span className="text-slate-500 ml-2">সময়: {att.inTime || 'N/A'} - {att.outTime || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {att.prayersAttended && att.prayersAttended.length > 0 && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            জামাত: {att.prayersAttended.join(', ')}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            att.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : att.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {att.status === 'PRESENT' ? 'উপস্থিত' : att.status === 'LATE' ? 'দেরি' : 'অনুপস্থিত'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: EMPLOYMENT TRAIL */}
          {/* ========================================================= */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">কর্মসংস্থান ও পদবী পরিবর্তন লগ</h4>

              {(!staff.employmentHistory || staff.employmentHistory.length === 0) ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  কোনো পদবী পরিবর্তন ইতিহাস রেকর্ড করা হয়নি।
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.employmentHistory.map((h, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{h.previousDesignation || 'প্রারম্ভিক'} ➔ {h.newDesignation}</span>
                        <span className="text-slate-500 font-normal">{h.effectiveDate}</span>
                      </div>
                      <p className="text-slate-600">{h.reason || 'পদোন্নতি / পুনর্বিন্যাস'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: DOCUMENTS */}
          {/* ========================================================= */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4">
              <DocumentSection
                entityId={staff.id}
                entityType="STAFF"
                entityTitle={staff.fullNameBn || staff.name}
                language={language}
              />
            </div>
          )}

        </div>

        {/* Revision Modal Popup */}
        {isRevisionModalOpen && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900">বেতন বৃদ্ধি / ইনক্রিমেন্ট নির্ধারণ</h4>
                <button onClick={() => setIsRevisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSalaryRevisionSubmit} className="space-y-3.5 text-xs text-slate-700">
                <div>
                  <label className="block font-semibold mb-1">নতুন মাসিক বেতন (টাকা)</label>
                  <input
                    type="number"
                    min="1"
                    value={newSalary}
                    onChange={(e) => setNewSalary(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">কার্যকরের তারিখ</label>
                  <input
                    type="date"
                    value={revisionEffectiveDate}
                    onChange={(e) => setRevisionEffectiveDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">বৃদ্ধির কারণ / মন্তব্য</label>
                  <input
                    type="text"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRevisionModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={revisionLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    {revisionLoading ? 'সংরক্ষণ...' : 'ইনক্রিমেন্ট নিশ্চিত করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

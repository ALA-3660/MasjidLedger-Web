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
  Plus
} from 'lucide-react';
import { Staff, StaffPayment, FinancialAccount, SalaryHistoryEntry } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { api } from '../lib/api';

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
  language,
}) => {
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'SALARY_HISTORY' | 'DETAILS'>('PAYMENTS');

  // Salary Revision Modal
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [newSalary, setNewSalary] = useState<number>(staff?.monthlySalary || 0);
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

  const salaryHistoryList: SalaryHistoryEntry[] = Array.isArray(staff.salaryHistory) && staff.salaryHistory.length > 0
    ? staff.salaryHistory
    : [
        {
          id: 'initial',
          previousSalary: 0,
          newSalary: staff.monthlySalary,
          effectiveDate: staff.joiningDate || '2025-01-01',
          revisedAt: staff.joiningDate || '2025-01-01',
          revisedBy: 'System',
          reason: 'যোগদানকালীন প্রাথমিক মূল বেতন নির্ধারণ',
        },
      ];

  // Calculate service tenure
  const calculateTenure = (joiningDateStr?: string) => {
    if (!joiningDateStr) return '—';
    try {
      const joinDate = new Date(joiningDateStr);
      const now = new Date();
      let years = now.getFullYear() - joinDate.getFullYear();
      let months = now.getMonth() - joinDate.getMonth();
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      if (years <= 0 && months <= 0) return 'নতুন যোগদানকৃত';
      if (years <= 0) return `${months} মাস`;
      return `${years} বছর ${months > 0 ? `${months} মাস` : ''}`;
    } catch {
      return '—';
    }
  };

  const handleOpenSalaryRevision = () => {
    setNewSalary(staff.monthlySalary || 0);
    setRevisionEffectiveDate(new Date().toISOString().split('T')[0]);
    setRevisionReason('বার্ষিক ইনক্রিমেন্ট ও বেতন বৃদ্ধি');
    setIsRevisionModalOpen(true);
  };

  const handleSaveSalaryRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalary || newSalary <= 0) {
      alert('সঠিক নতুন বেতন অংক লিখুন');
      return;
    }
    try {
      setRevisionLoading(true);
      if (onReviseSalary) {
        await onReviseSalary(staff.id, {
          newSalary,
          effectiveDate: revisionEffectiveDate,
          reason: revisionReason,
        });
      } else {
        await api.reviseStaffSalary(staff.id, {
          newSalary,
          effectiveDate: revisionEffectiveDate,
          reason: revisionReason,
        });
      }
      setIsRevisionModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'বেতন সংশোধন করতে ব্যর্থ হয়েছে');
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleOpenEditPayment = (p: StaffPayment) => {
    setEditingPayment(p);
    setEditNotes(p.notes || '');
    setEditPaymentDate(p.paymentDate || '');
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !onUpdatePayment) return;
    try {
      setEditLoading(true);
      await onUpdatePayment(editingPayment.id, {
        notes: editNotes.trim(),
        paymentDate: editPaymentDate,
      });
      setEditingPayment(null);
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmCancelPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPayment || !onCancelPayment) return;
    try {
      setCancelLoading(true);
      await onCancelPayment(cancellingPayment.id, cancelReason.trim());
      setCancellingPayment(null);
      setCancelReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-13 h-13 rounded-full bg-blue-600/30 border-2 border-blue-400/40 text-white font-bold text-xl flex items-center justify-center">
              {staff.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-lg font-siliguri text-white">{staff.name}</h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    staff.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {staff.status === 'ACTIVE' ? 'সক্রিয় স্টাফ (Active)' : 'নিষ্ক্রিয় / সাবেক (Inactive)'}
                </span>
                {staff.employeeCode && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    কোড: {staff.employeeCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-300 font-semibold mt-0.5">
                {staff.designationBn} • মোবাইল: {staff.phone}
                {staff.employmentType && (
                  <span className="ml-2 text-slate-300">
                    ({staff.employmentType === 'PERMANENT' ? 'স্থায়ী' : staff.employmentType === 'CONTRACTUAL' ? 'চুক্তিভিত্তিক' : staff.employmentType === 'HONORARY' ? 'সম্মানীভিত্তিক' : staff.employmentType})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenSalaryRevision}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="নতুন বেতন বৃদ্ধি বা ইনক্রিমেন্ট নির্ধারণ করুন"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>বেতন বৃদ্ধি / ইনক্রিমেন্ট</span>
            </button>
            {onPrintAnnualStatement && (
              <button
                onClick={() => onPrintAnnualStatement(staff)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                title="এই স্টাফের বার্ষিক পেমেন্ট বিবরণী প্রিন্ট করুন"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>বার্ষিক স্টেটমেন্ট</span>
              </button>
            )}
            <button
              onClick={() => onEditStaff(staff)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>প্রোফাইল এডিট</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Inside Drawer */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'PAYMENTS'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>বেতন ও পরিশোধ ইতিহাস ({staffPayments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('SALARY_HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'SALARY_HISTORY'
                ? 'bg-white text-amber-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>বেতন সংশোধন ও ইনক্রিমেন্ট ইতিহাস ({salaryHistoryList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'DETAILS'
                ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>পূর্ণাঙ্গ জীবনবৃত্তান্ত ও ব্যাংক তথ্য</span>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs flex-1">
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-blue-900 flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-700" />
                <span>বর্তমান মাসিক হাদিয়া</span>
              </div>
              <div className="text-base font-black text-blue-950 font-siliguri">
                ৳ {staff.monthlySalary?.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-blue-700 font-medium">বেসিক প্রতি মাসে</div>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-emerald-900 flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>সর্বমোট পরিশোধিত হাদিয়া</span>
              </div>
              <div className="text-base font-black text-emerald-950 font-siliguri">
                ৳ {totalPaid.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium">মোট {paidMonthsCount} মাসের রেকর্ড</div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                <Gift className="w-3.5 h-3.5 text-amber-700" />
                <span>সর্বমোট প্রদত্ত বোনাস</span>
              </div>
              <div className="text-base font-black text-amber-950 font-siliguri">
                ৳ {totalBonus.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-amber-700 font-medium">ঈদ ও উৎসব হাদিয়া</div>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-purple-900 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-purple-700" />
                <span>সেবা ও কর্মকাল</span>
              </div>
              <div className="text-base font-black text-purple-950 font-siliguri">
                {calculateTenure(staff.joiningDate)}
              </div>
              <div className="text-[10px] text-purple-700 font-medium">
                যোগদান: {formatDate(staff.joiningDate, language)}
              </div>
            </div>
          </div>

          {/* TAB 1: PAYMENTS */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    মাসিক হাদিয়া ও বেতন পরিশোধের পূর্ণাঙ্গ ইতিহাস
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    এই স্টাফকে প্রদত্ত সমস্ত বেতন, উৎসব ভাতা ও খরচের ভাউচার বিবরণ
                  </p>
                </div>

                <button
                  onClick={() => onOpenPayModal(staff.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 shadow-sm text-xs self-start sm:self-auto transition-all cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>নতুন বেতন প্রদান করুন</span>
                </button>
              </div>

              {staffPayments.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600 text-xs">কোনো বেতন পরিশোধের রেকর্ড পাওয়া যায়নি</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    &ldquo;নতুন বেতন প্রদান করুন&rdquo; বাটনে ক্লিক করে মাসিক হাদিয়া পরিশোধ রেকর্ড করুন।
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">মাস</th>
                        <th className="py-2.5 px-3">পরিশোধ তারিখ</th>
                        <th className="py-2.5 px-3 text-right">মূল হাদিয়া</th>
                        <th className="py-2.5 px-3 text-right">বোনাস / ভাতা</th>
                        <th className="py-2.5 px-3 text-right">কর্তন</th>
                        <th className="py-2.5 px-3 text-right">মোট পরিশোধ</th>
                        <th className="py-2.5 px-3">ভাউচার নং</th>
                        <th className="py-2.5 px-3">হিসাব</th>
                        <th className="py-2.5 px-3 text-center">রসিদ / অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {staffPayments.map((pay) => {
                        const isCancelled = pay.status === 'CANCELLED';
                        return (
                          <tr
                            key={pay.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              isCancelled ? 'bg-rose-50/40 opacity-70' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                              {pay.month}
                              {isCancelled && (
                                <span className="ml-1.5 text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                                  বাতিলকৃত
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {formatDate(pay.paymentDate, language)}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-slate-800">
                              ৳ {pay.basicSalary?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                              {pay.bonus && pay.bonus > 0 ? `+৳ ${pay.bonus.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-rose-600">
                              {pay.deduction && pay.deduction > 0 ? `-৳ ${pay.deduction.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-800 font-siliguri whitespace-nowrap">
                              ৳ {pay.netPaid?.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-rose-700 text-[11px] whitespace-nowrap">
                              {pay.expenseVoucherNumber}
                            </td>
                            <td className="py-3 px-3 text-slate-600 text-[11px]">
                              {pay.accountNameBn || 'ক্যাশ/ব্যাংক'}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1.5">
                                {/* Print Slip Button */}
                                <button
                                  onClick={() => onPrintSlip(pay, staff)}
                                  title="বেতন রসিদ প্রিন্ট করুন"
                                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit Remarks / Details */}
                                {!isCancelled && onUpdatePayment && (
                                  <button
                                    onClick={() => handleOpenEditPayment(pay)}
                                    title="বিবরণ সম্পাদনা করুন"
                                    className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Cancel / Reversal Button */}
                                {!isCancelled && onCancelPayment && (
                                  <button
                                    onClick={() => setCancellingPayment(pay)}
                                    title="পেমেন্ট বাতিল ও ব্যালেন্স রিভার্স করুন"
                                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SALARY REVISION HISTORY */}
          {activeTab === 'SALARY_HISTORY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    বেতন সংশোধন ও ইনক্রিমেন্ট ইতিহাস (Salary Revision Timeline)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    যোগদান থেকে শুরু করে এই স্টাফের সকল বেতন ও সম্মানী পরিবর্তনের নিরীক্ষা লগ
                  </p>
                </div>
                <button
                  onClick={handleOpenSalaryRevision}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নতুন বেতন বৃদ্ধি করুন</span>
                </button>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {salaryHistoryList.map((entry, idx) => {
                  const isLatest = idx === 0;
                  const diff = entry.previousSalary ? entry.newSalary - entry.previousSalary : 0;
                  const percentInc = entry.previousSalary ? ((diff / entry.previousSalary) * 100).toFixed(1) : null;
                  return (
                    <div key={entry.id || idx} className="relative group">
                      <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${
                        isLatest ? 'border-amber-500 text-amber-600 ring-4 ring-amber-50' : 'border-slate-300 text-slate-400'
                      }`}>
                        <TrendingUp className="w-2.5 h-2.5" />
                      </div>
                      <div className="bg-slate-50 hover:bg-white p-4 rounded-xl border border-slate-200 transition-all space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900 font-siliguri">
                              ৳ {entry.newSalary.toLocaleString('en-IN')}
                            </span>
                            {diff > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                +৳ {diff.toLocaleString('en-IN')} বৃদ্ধি ({percentInc}%)
                              </span>
                            )}
                            {isLatest && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                বর্তমান কার্যকর বেতন
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            কার্যকর তারিখ: <strong className="text-slate-800">{formatDate(entry.effectiveDate, language)}</strong>
                          </div>
                        </div>

                        {entry.reason && (
                          <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100 font-medium">
                            কারণ / বিবরণ: {entry.reason}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>পূর্বে নির্ধারিত ছিল: ৳ {(entry.previousSalary || 0).toLocaleString('en-IN')}</span>
                          <span>সংশোধক: {entry.revisedBy || 'কমিটি / অ্যাডমিন'} • {formatDate(entry.revisedAt, language)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FULL DETAILS & BIO */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-5">
              {/* Detailed Info Card */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-xs text-slate-900 border-b border-slate-200 pb-2">
                  ব্যক্তিগত ও পরিচিতি তথ্য
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-slate-500 block text-[11px]">পিতার নাম:</span>
                    <strong className="text-slate-900 text-xs">{staff.fatherName || 'উল্লেখ নেই'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">জাতীয় পরিচয়পত্র (NID):</span>
                    <strong className="text-slate-900 font-mono text-xs">{staff.nid || 'রেকর্ড নেই'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">রক্তের গ্রুপ:</span>
                    <strong className="text-rose-600 font-bold text-xs">{staff.bloodGroup || 'অজানা'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">জরুরি যোগাযোগ (মোবাইল):</span>
                    <strong className="text-slate-900 font-mono text-xs">{staff.emergencyContactPhone || 'উল্লেখ নেই'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">শিক্ষাগত ও দ্বীনি যোগ্যতা:</span>
                    <strong className="text-slate-900 text-xs">{staff.qualifications || 'উল্লেখ নেই'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">পূর্ব অভিজ্ঞতা:</span>
                    <strong className="text-slate-900 text-xs">{staff.experienceYears ? `${staff.experienceYears} বছর` : 'উল্লেখ নেই'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[11px]">স্থায়ী বা বর্তমান ঠিকানা:</span>
                    <strong className="text-slate-900 text-xs">{staff.address || 'রেকর্ড নেই'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">মন্তব্য / বিশেষ তথ্য:</span>
                    <strong className="text-slate-900 text-xs">{staff.notes || 'কোনো মন্তব্য নেই'}</strong>
                  </div>
                </div>
              </div>

              {/* Bank Account Details Card */}
              <div className="bg-blue-50/40 p-5 rounded-xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-950 text-xs flex items-center space-x-1.5">
                    <span>🏦 ব্যাংক হিসাব বিবরণ (Bank Transfer Information)</span>
                  </h4>
                  {staff.accountNumber ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                      সক্রিয় ব্যাংক একাউন্ট
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                      ব্যাংক তথ্য অসম্পূর্ণ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block text-[10px] font-medium">ব্যাংকের নাম</span>
                    <span className="font-bold text-slate-900 text-xs">{staff.bankName || 'উল্লেখ নেই'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block text-[10px] font-medium">শাখা (Branch)</span>
                    <span className="font-bold text-slate-900 text-xs">{staff.branchName || 'উল্লেখ নেই'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block text-[10px] font-medium">হিসাবধারীর নাম</span>
                    <span className="font-bold text-slate-900 text-xs">{staff.accountHolderName || staff.name}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-slate-500 block text-[10px] font-medium">ব্যাংক হিসাব নম্বর</span>
                    <span className="font-mono font-bold text-blue-800 text-xs">{staff.accountNumber || 'রেকর্ড নেই'}</span>
                  </div>
                </div>

                {staff.routingNumber && (
                  <div className="text-[11px] text-slate-600 flex items-center space-x-2 pt-1 border-t border-blue-100">
                    <span className="font-semibold text-slate-500">রাউটিং নম্বর:</span>
                    <span className="font-mono font-bold text-slate-800">{staff.routingNumber}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-500">হিসাবের ধরন:</span>
                    <span className="font-medium text-slate-800">
                      {staff.accountType === 'SAVINGS' ? 'সঞ্চয়ী হিসাব' : staff.accountType === 'CURRENT' ? 'চলতি হিসাব' : staff.accountType === 'SALARY' ? 'বেতন হিসাব' : staff.accountType || 'সঞ্চয়ী'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            স্টাফ আইডি: <span className="font-mono">{staff.id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* SALARY REVISION MODAL */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-amber-700">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">বেতন বৃদ্ধি / ইনক্রিমেন্ট নির্ধারণ</h3>
              </div>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalaryRevision} className="space-y-3.5">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-slate-800 space-y-1">
                <div>কর্মকর্তা: <strong>{staff.name}</strong> ({staff.designationBn})</div>
                <div>বর্তমান মূল হাদিয়া: <strong>৳ {staff.monthlySalary?.toLocaleString('en-IN')}</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">সংশোধিত নতুন মাসিক হাদিয়া (৳) *</label>
                <input
                  type="number"
                  required
                  min="500"
                  step="100"
                  value={newSalary}
                  onChange={(e) => setNewSalary(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-siliguri text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">কার্যকর হওয়ার তারিখ *</label>
                <input
                  type="date"
                  required
                  value={revisionEffectiveDate}
                  onChange={(e) => setRevisionEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ইনক্রিমেন্ট বা সংশোধনের কারণ</label>
                <input
                  type="text"
                  placeholder="যেমন: ২০২৬ সালের বার্ষিক ইনক্রিমেন্ট / বিশেষ যোগ্যতা বিবেচনা"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={revisionLoading}
                  className="px-4 py-1.5 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {revisionLoading ? 'সংরক্ষণ হচ্ছে...' : 'ইনক্রিমেন্ট সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL */}
      {editingPayment && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">পেমেন্ট বিবরণ সম্পাদনা</h3>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ভাউচার নম্বর</label>
                <input
                  type="text"
                  disabled
                  value={editingPayment.expenseVoucherNumber}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">পরিশোধের তারিখ *</label>
                <input
                  type="date"
                  required
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">মন্তব্য বা বিবরণ</label>
                <textarea
                  rows={3}
                  placeholder="পরিশোধ সংক্রান্ত সংশোধিত তথ্য..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {editLoading ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট সংরক্ষণ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL PAYMENT MODAL */}
      {cancellingPayment && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center space-x-2.5 text-rose-600 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">বেতন পেমেন্ট বাতিলের নিশ্চয়তা</h3>
            </div>

            <p className="text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিত যে <strong>{cancellingPayment.staffName}</strong>-এর{' '}
              <strong>{cancellingPayment.month}</strong> মাসের{' '}
              <strong>{formatCurrency(cancellingPayment.netPaid, language)}</strong> মূল্যের পেমেন্টটি বাতিল করতে চান?
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
              <strong>প্রভাব:</strong>
              <div>1. সংশ্লিষ্ট একাউন্টে ৳{cancellingPayment.netPaid?.toLocaleString('en-IN')} পুনরায় যুক্ত হবে।</div>
              <div>2. খরচের ভাউচারটি &lsquo;REJECTED / বাতিলকৃত&rsquo; হিসেবে চিহ্নিত হবে।</div>
            </div>

            <form onSubmit={handleConfirmCancelPayment} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">বাতিলের কারণ উল্লেখ করুন *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: ভুল এন্ট্রি / দ্বৈত পেমেন্ট বাতিল"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancellingPayment(null)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {cancelLoading ? 'বাতিল হচ্ছে...' : 'হ্যাঁ, পেমেন্ট বাতিল করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Users,
  DollarSign,
  UserCheck,
  Clock,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Briefcase,
  ShieldCheck,
  CalendarCheck,
  Layers,
  Banknote
} from 'lucide-react';
import { Staff, StaffPayment } from '../types';
import { Language, formatCurrency } from '../lib/i18n';

interface StaffDashboardSummaryProps {
  staff: Staff[];
  payments: StaffPayment[];
  language?: Language;
  onOpenAddStaff?: () => void;
  onOpenPayModal?: () => void;
  onOpenAdvanceModal?: () => void;
  onOpenLeaveModal?: () => void;
  onOpenAttendanceModal?: () => void;
}

export const StaffDashboardSummary: React.FC<StaffDashboardSummaryProps> = ({
  staff = [],
  payments = [],
  language = 'bn',
  onOpenAddStaff,
  onOpenPayModal,
  onOpenAdvanceModal,
  onOpenLeaveModal,
  onOpenAttendanceModal
}) => {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const activeStaff = staff.filter((s) => s.status === 'ACTIVE' || !s.status);
  const onLeaveStaff = staff.filter((s) => s.status === 'ON_LEAVE');
  const inactiveStaff = staff.filter((s) => s.status === 'INACTIVE' || s.status === 'TERMINATED' || s.status === 'EMPLOYMENT_ENDED');

  // Breakdown by roles
  const imamsCount = staff.filter((s) => s.designation === 'IMAM' || s.designation === 'KHATIB').length;
  const muezzinsCount = staff.filter((s) => s.designation === 'MUEZZIN').length;
  const khademsCount = staff.filter((s) => s.designation === 'CLEANER' || s.designation === 'SECURITY').length;
  const othersCount = staff.length - (imamsCount + muezzinsCount + khademsCount);

  // Total Monthly Salary Commitment
  const totalMonthlyPayroll = activeStaff.reduce((sum, s) => {
    const basic = s.basicSalary || s.monthlySalary || 0;
    const all = s.allowance || (s.housingAllowance || 0) + (s.medicalAllowance || 0) + (s.transportAllowance || 0) + (s.otherAllowance || 0);
    return sum + basic + all;
  }, 0);

  // Current Month Paid Status
  const currentMonthPayments = payments.filter(
    (p) => p.status !== 'CANCELLED' && p.month === currentMonthStr && p.paymentType !== 'FESTIVAL_ALLOWANCE'
  );
  const totalPaidThisMonth = currentMonthPayments.reduce((sum, p) => sum + (p.netPaid || 0), 0);
  const paidStaffIds = new Set(currentMonthPayments.map((p) => p.staffId));
  const unpaidStaffCount = activeStaff.filter((s) => !paidStaffIds.has(s.id)).length;

  // Active Advance Totals
  let totalOutstandingAdvances = 0;
  let staffWithAdvanceCount = 0;
  staff.forEach((s) => {
    const activeAdv = (s.advanceRecords || []).filter((a) => a.status === 'ACTIVE' || a.status === 'PARTIALLY_ADJUSTED');
    if (activeAdv.length > 0) {
      staffWithAdvanceCount++;
      activeAdv.forEach((a) => {
        totalOutstandingAdvances += (a.outstandingAmount || 0);
      });
    }
  });

  return (
    <div className="space-y-4 mb-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Staff */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট স্টাফ ও জনবল</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{staff.length} জন</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {activeStaff.length} সক্রিয় {onLeaveStaff.length > 0 ? `| ${onLeaveStaff.length} ছুটিতে` : ''}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ইমাম/খতিব: <strong className="text-slate-700">{imamsCount}</strong></span>
            <span>মুয়াজ্জিন: <strong className="text-slate-700">{muezzinsCount}</strong></span>
            <span>খাদেম/অন্যান্য: <strong className="text-slate-700">{khademsCount + othersCount}</strong></span>
          </div>
        </div>

        {/* Card 2: Monthly Payroll Budget */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">মাসিক বেতন বাজেট</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalMonthlyPayroll, language)}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                মূল বেতন + সমস্ত স্থায়ী ভাতা
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>ব্যাংক পেমেন্ট: <strong className="text-slate-700">{staff.filter(s => s.paymentPreference === 'BANK' || s.accountNumber).length} জন</strong></span>
            <span>নগদ গ্রহণকারী: <strong className="text-slate-700">{staff.filter(s => s.paymentPreference === 'CASH' && !s.accountNumber).length} জন</strong></span>
          </div>
        </div>

        {/* Card 3: Current Month Paid vs Due */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">চলতি মাসের বেতন স্থিতি</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalPaidThisMonth, language)}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                পরিশোধিত: <strong className="text-emerald-600">{paidStaffIds.size} জন</strong> | বকেয়া: <strong className={unpaidStaffCount > 0 ? 'text-amber-600' : 'text-slate-600'}>{unpaidStaffCount} জন</strong>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>কমিশন / ভাউচার প্রস্তুত: <strong className="text-slate-700">{currentMonthPayments.length} টি</strong></span>
            <span className={unpaidStaffCount === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
              {unpaidStaffCount === 0 ? '✓ শতভাগ পরিশোধ' : 'পেন্ডিং রয়েছে'}
            </span>
          </div>
        </div>

        {/* Card 4: Outstanding Advance / Loans */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">চলতি বেতন অগ্রিম স্থিতি</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalOutstandingAdvances, language)}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {staffWithAdvanceCount} জন স্টাফের অগ্রিম সমন্বয়াধীন
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>মাসিক কর্তনযোগ্য: <strong className="text-purple-700">বেতন হতে স্বয়ংক্রিয়</strong></span>
            <button
              onClick={onOpenAdvanceModal}
              className="text-purple-600 hover:text-purple-800 font-semibold underline text-[11px]"
            >
              + নতুন অগ্রিম
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            দ্রুত কার্যক্রম:
          </span>
          <span className="text-slate-500 hidden sm:inline">মসজিদের সকল স্টাফের জন্য এক ক্লিকে ব্যবস্থাপনা</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenAttendanceModal && (
            <button
              onClick={onOpenAttendanceModal}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
              দৈনিক উপস্থিতি/হাজিরা
            </button>
          )}

          {onOpenLeaveModal && (
            <button
              onClick={onOpenLeaveModal}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              ছুটি আবেদন ও রেকর্ড
            </button>
          )}

          {onOpenAdvanceModal && (
            <button
              onClick={onOpenAdvanceModal}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs"
            >
              <Banknote className="w-3.5 h-3.5 text-purple-600" />
              বেতন অগ্রিম প্রদান
            </button>
          )}

          {onOpenPayModal && (
            <button
              onClick={onOpenPayModal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition flex items-center gap-1.5 shadow-2xs"
            >
              <DollarSign className="w-3.5 h-3.5" />
              বেতন পরিশোধ ভাউচার
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

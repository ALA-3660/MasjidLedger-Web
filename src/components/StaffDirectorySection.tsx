import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  UserCheck,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  CalendarCheck,
  FileSpreadsheet,
  Coins,
  CreditCard,
  Grid,
  List,
  FolderOpen,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Staff, StaffPayment } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';

interface StaffDirectorySectionProps {
  staffList: Staff[];
  staffPayments: StaffPayment[];
  onAddNewStaff: () => void;
  onViewStaffProfile: (staff: Staff) => void;
  onEditStaff: (staff: Staff) => void;
  onPaySalary: (staffId: string) => void;
  onOpenAdvance: (staffId: string) => void;
  onOpenLeave: (staffId: string) => void;
  onOpenAttendance: (staffId: string) => void;
  language: Language;
}

export const StaffDirectorySection: React.FC<StaffDirectorySectionProps> = ({
  staffList = [],
  staffPayments = [],
  onAddNewStaff,
  onViewStaffProfile,
  onEditStaff,
  onPaySalary,
  onOpenAdvance,
  onOpenLeave,
  onOpenAttendance,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'>('ACTIVE');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Quick stats calculation
  const totalCount = staffList.length;
  const activeCount = staffList.filter((s) => s.status === 'ACTIVE').length;
  const imamKhatibCount = staffList.filter(
    (s) => s.designation === 'IMAM' || s.designation === 'KHATIB' || (s.designationBn && (s.designationBn.includes('ইমাম') || s.designationBn.includes('খতিব')))
  ).length;
  const muezzinCount = staffList.filter(
    (s) => s.designation === 'MUEZZIN' || (s.designationBn && s.designationBn.includes('মুয়াজ্জিন'))
  ).length;
  const khademCount = staffList.filter(
    (s) => s.designation === 'KHADEM' || s.designation === 'CLEANER' || (s.designationBn && (s.designationBn.includes('খাদেম') || s.designationBn.includes('পরিচ্ছন্ন')))
  ).length;

  const totalMonthlyBudget = staffList
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + (s.monthlySalary || s.basicSalary || 0) + (s.allowance || 0), 0);

  // Current month payment stats
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const paidThisMonth = staffPayments
    .filter((p) => (p.paymentMonth === currentMonthStr || p.month === currentMonthStr) && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + (p.netPayable || p.basicSalary || 0), 0);

  const dueThisMonth = Math.max(0, totalMonthlyBudget - paidThisMonth);

  const totalAdvanceOutstanding = staffList.reduce((sum, s) => {
    const advSum = (s.advanceRecords || [])
      .filter((a) => a.status === 'ACTIVE')
      .reduce((aSum, a) => aSum + (a.outstandingAmount || 0), 0);
    return sum + (s.advanceBalance || advSum);
  }, 0);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (staff.fullNameBn && staff.fullNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (staff.phone && staff.phone.includes(searchQuery)) ||
        (staff.designationBn && staff.designationBn.includes(searchQuery)) ||
        (staff.staffCode && staff.staffCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && staff.status === 'ACTIVE') ||
        (statusFilter === 'INACTIVE' && (staff.status === 'INACTIVE' || staff.status === 'TERMINATED' || staff.status === 'EMPLOYMENT_ENDED')) ||
        (statusFilter === 'ON_LEAVE' && staff.status === 'ON_LEAVE');

      let matchesDesignation = true;
      if (designationFilter === 'IMAM_KHATIB') {
        matchesDesignation =
          staff.designation === 'IMAM' ||
          staff.designation === 'KHATIB' ||
          Boolean(staff.designationBn && (staff.designationBn.includes('ইমাম') || staff.designationBn.includes('খতিব')));
      } else if (designationFilter === 'MUEZZIN') {
        matchesDesignation =
          staff.designation === 'MUEZZIN' ||
          Boolean(staff.designationBn && staff.designationBn.includes('মুয়াজ্জিন'));
      } else if (designationFilter === 'KHADEM') {
        matchesDesignation =
          staff.designation === 'KHADEM' ||
          staff.designation === 'CLEANER' ||
          Boolean(staff.designationBn && (staff.designationBn.includes('খাদেম') || staff.designationBn.includes('পরিচ্ছন্ন')));
      }

      return matchesSearch && matchesStatus && matchesDesignation;
    });
  }, [staffList, searchQuery, designationFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট কর্মী</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold text-slate-900 font-siliguri">{totalCount}</span>
            <span className="text-xs text-slate-400 font-medium">জন</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1">সক্রিয়: {activeCount} জন</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">ইমাম ও খতিব</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold text-indigo-900 font-siliguri">{imamKhatibCount}</span>
            <span className="text-xs text-slate-400 font-medium">জন</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">দ্বীনি নেতৃত্ব</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">মুয়াজ্জিন</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold text-emerald-900 font-siliguri">{muezzinCount}</span>
            <span className="text-xs text-slate-400 font-medium">জন</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">আজান ও ইকামত</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">খাদেম ও অন্যান্য</span>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="text-xl font-bold text-amber-900 font-siliguri">{khademCount}</span>
            <span className="text-xs text-slate-400 font-medium">জন</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">মসজিদ সেবা</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মাসিক বেতন বাজেট</span>
          <div className="text-sm font-bold text-slate-900 font-siliguri mt-1">
            {formatCurrency(totalMonthlyBudget, language)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1">পরিশোধ: {formatCurrency(paidThisMonth, language)}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">অগ্রিম পাওনা</span>
          <div className="text-sm font-bold text-purple-900 font-siliguri mt-1">
            {formatCurrency(totalAdvanceOutstanding, language)}
          </div>
          <span className="text-[10px] text-rose-500 font-semibold mt-1">বকেয়া বেতন: {formatCurrency(dueThisMonth, language)}</span>
        </div>
      </div>

      {/* 2. Control Bar (Search, Filters, New Staff Action) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, মোবাইল, পদবী বা আইডি দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Designation filter */}
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">সকল পদবী</option>
            <option value="IMAM_KHATIB">ইমাম ও খতিব</option>
            <option value="MUEZZIN">মুয়াজ্জিন</option>
            <option value="KHADEM">খাদেম ও পরিচ্ছন্নতাকর্মী</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="ACTIVE">সক্রিয় কর্মী</option>
            <option value="ALL">সকল স্ট্যাটাস</option>
            <option value="ON_LEAVE">ছুটিতে আছেন</option>
            <option value="INACTIVE">নিষ্ক্রিয় / সাবেক</option>
          </select>

          {/* View toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'GRID' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'TABLE' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary Action Button: ➕ নতুন কর্মী */}
          <button
            type="button"
            onClick={onAddNewStaff}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কর্মী</span>
          </button>
        </div>
      </div>

      {/* 3. Staff List (Grid or Table View) */}
      {filteredStaff.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">কোনো কর্মী তথ্য পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            আপনার ফিল্টার অনুযায়ী কোনো কর্মী মেলেনি। অনুগ্রহ করে অনুসন্ধান পরিবর্তন করুন অথবা নতুন কর্মী যুক্ত করুন।
          </p>
          <button
            type="button"
            onClick={onAddNewStaff}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কর্মী যুক্ত করুন</span>
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const hasDriveDocs = (staff.documents && staff.documents.length > 0) || (staff.documentLinks && staff.documentLinks.length > 0);
            return (
              <div
                key={staff.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all p-4 flex flex-col justify-between group"
              >
                <div>
                  {/* Top row: Photo, Name, Badge */}
                  <div className="flex items-start space-x-3">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {staff.photoUrl ? (
                        <img
                          src={staff.photoUrl}
                          alt={staff.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xl font-bold text-indigo-600">{staff.name.charAt(0)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 font-siliguri truncate block">
                          {staff.designationBn || staff.designation}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            staff.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {staff.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5 font-siliguri">
                        {staff.fullNameBn || staff.name}
                      </h4>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{staff.phone}</span>
                        </span>
                        {staff.staffCode && <span className="font-mono text-[10px] text-slate-400">#{staff.staffCode}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Financial and qualification stats */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">মাসিক সর্বমোট</span>
                      <span className="font-bold text-slate-800 font-siliguri">
                        {formatCurrency((staff.monthlySalary || staff.basicSalary || 0) + (staff.allowance || 0), language)}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl flex flex-col justify-center">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Google Drive</span>
                      <span className={`text-[11px] font-bold flex items-center space-x-1 ${hasDriveDocs ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <FolderOpen className="w-3 h-3" />
                        <span>{hasDriveDocs ? `${staff.documents?.length || 1}টি নথি সংযুক্ত` : 'নথি নেই'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewStaffProfile(staff)}
                    className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>প্রোফাইল</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPaySalary(staff.id)}
                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>বেতন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditStaff(staff)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    title="সম্পাদনা"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">কর্মী ও আইডি</th>
                  <th className="p-3.5">পদবী</th>
                  <th className="p-3.5">মোবাইল</th>
                  <th className="p-3.5">যোগদান</th>
                  <th className="p-3.5">মাসিক বেতন</th>
                  <th className="p-3.5">Google Drive নথি</th>
                  <th className="p-3.5">স্ট্যাটাস</th>
                  <th className="p-3.5 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff) => {
                  const hasDriveDocs = (staff.documents && staff.documents.length > 0) || (staff.documentLinks && staff.documentLinks.length > 0);
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                            {staff.photoUrl ? (
                              <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-indigo-700">{staff.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block font-siliguri">{staff.fullNameBn || staff.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{staff.staffCode || staff.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-indigo-900 font-siliguri">{staff.designationBn}</td>
                      <td className="p-3.5 font-mono text-slate-600">{staff.phone}</td>
                      <td className="p-3.5 text-slate-500">{formatDate(staff.joiningDate, language)}</td>
                      <td className="p-3.5 font-bold text-slate-900 font-siliguri">
                        {formatCurrency((staff.monthlySalary || staff.basicSalary || 0) + (staff.allowance || 0), language)}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hasDriveDocs ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          {hasDriveDocs ? `✓ ${staff.documents?.length || 1}টি নথি` : 'নথি নেই'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {staff.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => onViewStaffProfile(staff)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold"
                          >
                            প্রোফাইল
                          </button>
                          <button
                            type="button"
                            onClick={() => onPaySalary(staff.id)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold"
                          >
                            বেতন
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditStaff(staff)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

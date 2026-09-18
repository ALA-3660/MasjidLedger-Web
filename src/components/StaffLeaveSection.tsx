import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  Users,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { Staff, StaffLeaveRecord, StaffLeaveStatus } from '../types';
import { Language, formatDate } from '../lib/i18n';

interface StaffLeaveSectionProps {
  staffList: Staff[];
  onOpenNewLeaveModal: () => void;
  onUpdateLeaveStatus: (leaveId: string, status: StaffLeaveStatus) => Promise<void>;
  language: Language;
}

export const StaffLeaveSection: React.FC<StaffLeaveSectionProps> = ({
  staffList = [],
  onOpenNewLeaveModal,
  onUpdateLeaveStatus,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Flatten all leave records
  const allLeaves: (StaffLeaveRecord & { staff?: Staff })[] = [];
  staffList.forEach((s) => {
    (s.leaveRecords || []).forEach((lv) => {
      allLeaves.push({
        ...lv,
        staff: s,
        staffName: lv.staffName || s.fullNameBn || s.name,
        designationBn: lv.designationBn || s.designationBn,
      });
    });
  });

  // Sort descending by applied date / start date
  allLeaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Filtered
  const filteredLeaves = allLeaves.filter((lv) => {
    const matchesStatus = statusFilter === 'ALL' || lv.status === statusFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      lv.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lv.leaveTypeBn && lv.leaveTypeBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lv.reason && lv.reason.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const pendingCount = allLeaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = allLeaves.filter((l) => l.status === 'APPROVED').length;
  const totalDays = allLeaves.filter((l) => l.status === 'APPROVED').reduce((sum, l) => sum + (l.daysCount || 0), 0);

  const handleAction = async (leaveId: string, status: StaffLeaveStatus) => {
    setLoadingId(leaveId);
    try {
      await onUpdateLeaveStatus(leaveId, status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Leave */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>কর্মী ছুটি ব্যবস্থাপনা ও আবেদন হাব</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ইমাম ও কর্মীদের নৈমিত্তিক, অসুস্থতাজনিত ও বিশেষ ছুটির আবেদন ও অনুমোদন
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewLeaveModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ছুটি আবেদন</span>
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase">অপেক্ষমাণ আবেদন</span>
            <div className="text-xl font-bold text-amber-900 font-siliguri mt-0.5">{pendingCount} টি</div>
          </div>
          <Clock className="w-8 h-8 text-amber-300" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase">অনুমোদিত ছুটি</span>
            <div className="text-xl font-bold text-emerald-900 font-siliguri mt-0.5">{approvedCount} টি</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-300" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase">মোট মঞ্জুরিকৃত দিন</span>
            <div className="text-xl font-bold text-indigo-900 font-siliguri mt-0.5">{totalDays} দিন</div>
          </div>
          <Calendar className="w-8 h-8 text-indigo-300" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কর্মী বা কারণ খুঁজুন..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL'
                ? 'সকল'
                : st === 'PENDING'
                ? `অপেক্ষমাণ (${pendingCount})`
                : st === 'APPROVED'
                ? 'অনুমোদিত'
                : 'প্রত্যাখ্যাত'}
            </button>
          ))}
        </div>
      </div>

      {/* Leaves List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">কোনো ছুটির আবেদন মেলেনি।</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLeaves.map((lv) => (
              <div key={lv.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm font-siliguri">{lv.staffName}</span>
                    <span className="text-xs text-indigo-700 font-medium font-siliguri">({lv.designationBn})</span>
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold">
                      {lv.leaveTypeBn || lv.leaveType}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        lv.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : lv.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {lv.status === 'APPROVED' ? 'অনুমোদিত' : lv.status === 'PENDING' ? 'অপেক্ষমাণ' : 'প্রত্যাখ্যাত'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">{lv.reason}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span>
                      তারিখ: {formatDate(lv.startDate, language)} থেকে {formatDate(lv.endDate, language)} (
                      <strong className="text-slate-600">{lv.daysCount} দিন</strong>)
                    </span>
                    {lv.appliedDate && <span>আবেদনের তারিখ: {formatDate(lv.appliedDate, language)}</span>}
                    {lv.emergencyContact && <span>জরুরি যোগাযোগ: {lv.emergencyContact}</span>}
                  </div>
                </div>

                {/* Actions */}
                {lv.status === 'PENDING' && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      disabled={loadingId === lv.id}
                      onClick={() => handleAction(lv.id, 'APPROVED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>অনুমোদন</span>
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === lv.id}
                      onClick={() => handleAction(lv.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>বাতিল</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

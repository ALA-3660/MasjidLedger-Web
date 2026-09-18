import React, { useState } from 'react';
import {
  Users,
  ClipboardList,
  CalendarCheck,
  FileSpreadsheet,
  Banknote,
  Gift,
  Coins,
  Building,
  FileText,
  FileBarChart,
  Menu,
  X,
  ChevronRight,
  UserCheck,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { Staff } from '../types';
import { Language } from '../lib/i18n';

export type StaffSubSection =
  | 'staff-directory'
  | 'master-register'
  | 'attendance'
  | 'leaves'
  | 'salary-disbursement'
  | 'festival-allowance'
  | 'advance-loans'
  | 'bank-transfer'
  | 'reports';

interface StaffSecondarySidebarProps {
  activeSection: StaffSubSection;
  onSelectSection: (section: StaffSubSection) => void;
  staffList?: Staff[];
  totalStaffCount?: number;
  activeStaffCount?: number;
  pendingLeavesCount?: number;
  todayAttendanceCount?: number;
  activeAdvancesCount?: number;
  language?: Language;
}

interface SidebarGroup {
  groupTitle: string;
  items: {
    id: StaffSubSection;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

export const StaffSecondarySidebar: React.FC<StaffSecondarySidebarProps> = ({
  activeSection,
  onSelectSection,
  staffList = [],
  totalStaffCount = 0,
  activeStaffCount = 0,
  pendingLeavesCount = 0,
  todayAttendanceCount = 0,
  activeAdvancesCount = 0,
  language = 'bn',
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isBn = language === 'bn';

  const toBn = (val: number | string) => {
    if (!isBn) return String(val);
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(val).replace(/[0-9]/g, (d) => bnDigits[+d]);
  };

  const navGroups: SidebarGroup[] = [
    {
      groupTitle: isBn ? '👥 জনবল ব্যবস্থাপনা' : 'Personnel Management',
      items: [
        {
          id: 'staff-directory',
          label: isBn ? '👤 ইমাম ও স্টাফ' : 'Imam & Staff',
          icon: Users,
          badge: activeStaffCount > 0 ? toBn(activeStaffCount) : undefined,
          badgeColor: 'bg-indigo-100 text-indigo-700',
        },
        {
          id: 'master-register',
          label: isBn ? '📋 মাস্টার রেজিস্টার' : 'Master Register',
          icon: ClipboardList,
          badge: totalStaffCount > 0 ? toBn(totalStaffCount) : undefined,
          badgeColor: 'bg-slate-100 text-slate-700',
        },
      ],
    },
    {
      groupTitle: isBn ? '📅 হাজিরা ও ছুটি' : 'Attendance & Leave',
      items: [
        {
          id: 'attendance',
          label: isBn ? '📅 দৈনিক হাজিরা' : 'Daily Attendance',
          icon: CalendarCheck,
          badge: todayAttendanceCount > 0 ? `${toBn(todayAttendanceCount)} উপস্থিত` : undefined,
          badgeColor: 'bg-emerald-100 text-emerald-700',
        },
        {
          id: 'leaves',
          label: isBn ? '📝 ছুটি আবেদন' : 'Leave Applications',
          icon: FileSpreadsheet,
          badge: pendingLeavesCount > 0 ? `${toBn(pendingLeavesCount)} পেন্ডিং` : undefined,
          badgeColor: 'bg-amber-100 text-amber-700',
        },
      ],
    },
    {
      groupTitle: isBn ? '💰 বেতন ও আর্থিক সুবিধা' : 'Payroll & Benefits',
      items: [
        {
          id: 'salary-disbursement',
          label: isBn ? '💵 মাসিক বেতন ও পরিশোধ' : 'Monthly Salary & Disbursal',
          icon: Banknote,
        },
        {
          id: 'festival-allowance',
          label: isBn ? '🎁 উৎসব ভাতা' : 'Festival Allowance',
          icon: Gift,
        },
        {
          id: 'advance-loans',
          label: isBn ? '💰 অগ্রিম ও ঋণ' : 'Advances & Loans',
          badge: activeAdvancesCount > 0 ? toBn(activeAdvancesCount) : undefined,
          badgeColor: 'bg-purple-100 text-purple-700',
          icon: Coins,
        },
        {
          id: 'bank-transfer',
          label: isBn ? '🏦 বেতন ব্যাংক ট্রান্সফার' : 'Salary Bank Transfer',
          icon: Building,
        },
      ],
    },
    {
      groupTitle: isBn ? '📊 রিপোর্ট' : 'Reports',
      items: [
        {
          id: 'reports',
          label: isBn ? '📊 রিপোর্ট ও রেজিস্টার' : 'Reports & Registers',
          icon: FileBarChart,
        },
      ],
    },
  ];

  const handleSelect = (id: StaffSubSection) => {
    onSelectSection(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button (Sticky bar on mobile) */}
      <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            👥
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              {isBn ? 'ইমাম, স্টাফ ও বেতন মডিউল' : 'HR & Payroll Module'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {navGroups.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors border border-indigo-200"
        >
          <Menu className="w-4 h-4" />
          <span>{isBn ? 'মেনু' : 'Menu'}</span>
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 lg:z-auto w-72 bg-white lg:bg-transparent border-r lg:border-r-0 border-slate-200 p-4 lg:p-0 flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header with close button */}
        <div className="lg:hidden flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              👥
            </div>
            <span className="text-sm font-bold text-slate-900">
              {isBn ? 'ইমাম ও স্টাফ নেভিগেশন' : 'Staff Navigation'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Box Component */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Header Badge */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-lg shadow-inner">
                  👤
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    {isBn ? 'ইমাম, স্টাফ ও বেতন' : 'Staff & Payroll'}
                  </h3>
                  <p className="text-[11px] text-indigo-200 font-medium">
                    {isBn ? 'কর্মী প্রোফাইল ও পেরোল হাব' : 'HR, Attendance & Payroll'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick KPI Pill */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-indigo-100">
              <span className="flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
                <span>{isBn ? 'সক্রিয় কর্মী:' : 'Active Staff:'}</span>
              </span>
              <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-full text-[11px]">
                {toBn(activeStaffCount)} {isBn ? 'জন' : ''}
              </span>
            </div>
          </div>

          {/* Nav Items Groups */}
          <div className="p-2 space-y-4 max-h-[calc(100vh-280px)] lg:max-h-none overflow-y-auto">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.groupTitle}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-white'
                                : 'text-slate-400 group-hover:text-indigo-600'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : item.badgeColor || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Footer Advice */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="leading-tight">
              {isBn
                ? 'গুগল ড্রাইভ লিংক সংযুক্ত করে সকল নথি সুরক্ষিত রাখুন।'
                : 'Keep all records organized with Google Drive links.'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users2,
  Building,
  Shield,
  Clock,
  CalendarCheck,
  ClipboardList,
  Award,
  History,
  Repeat,
  Layers,
  FileBarChart,
  Menu,
  X,
  ChevronRight,
  AlertTriangle,
  LucideIcon,
  CheckCircle2,
} from 'lucide-react';
import { CommitteeTerm } from '../types';
import { Language, translations } from '../lib/i18n';
import { calculateTenure, toBanglaNumber } from './CommitteeView';

export type CommitteeSubSection =
  | 'dashboard'
  | 'members'
  | 'current-committee'
  | 'advisors'
  | 'terms'
  | 'meetings'
  | 'action-plans'
  | 'performance'
  | 'financial-history'
  | 'handover'
  | 'sub-committees'
  | 'reports';

export interface CommitteeSidebarItem {
  id: CommitteeSubSection;
  label: string;
  subLabel?: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
  badgeType?: 'default' | 'success' | 'warning' | 'alert';
}

interface CommitteeSecondarySidebarProps {
  activeSection: CommitteeSubSection;
  onSelectSection: (section: CommitteeSubSection) => void;
  activeTerm?: CommitteeTerm | null;
  totalMembersCount?: number;
  activeMembersCount?: number;
  advisorsCount?: number;
  meetingsCount?: number;
  actionPlansCount?: number;
  subCommitteesCount?: number;
  language?: Language;
  termsCount?: number;
}

export const CommitteeSecondarySidebar: React.FC<CommitteeSecondarySidebarProps> = ({
  activeSection,
  onSelectSection,
  activeTerm,
  totalMembersCount = 0,
  activeMembersCount = 0,
  advisorsCount = 0,
  meetingsCount = 0,
  actionPlansCount = 0,
  subCommitteesCount = 0,
  language = 'bn',
  termsCount = 0,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isBn = language === 'bn';

  // Calculate active term tenure info
  const tenure = activeTerm
    ? calculateTenure(activeTerm.startDate, activeTerm.endDate, (language as Language) || 'bn')
    : null;

  const sidebarItems: CommitteeSidebarItem[] = [
    {
      id: 'dashboard',
      label: isBn ? 'সারসংক্ষেপ ও ওভারভিউ' : 'Overview & Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'members',
      label: isBn ? 'সদস্য তালিকা' : 'Member Directory',
      icon: Users2,
      badge: totalMembersCount ? (isBn ? toBanglaNumber(totalMembersCount) : totalMembersCount) : undefined,
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'current-committee',
      label: isBn ? 'বর্তমান কমিটি' : 'Current Committee',
      icon: Building,
      badge: isBn ? 'সক্রিয়' : 'Active',
      badgeColor: 'bg-emerald-100 text-emerald-700 font-bold',
    },
    {
      id: 'advisors',
      label: isBn ? 'উপদেষ্টা পরিষদ' : 'Advisory Council',
      icon: Shield,
      badge: advisorsCount ? (isBn ? toBanglaNumber(advisorsCount) : advisorsCount) : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'terms',
      label: isBn ? 'মেয়াদকাল ও ইতিহাস' : 'Terms & History',
      icon: Clock,
      badge: termsCount ? (isBn ? toBanglaNumber(termsCount) : termsCount) : undefined,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'meetings',
      label: isBn ? 'মিটিং ও কার্যবিবরণী' : 'Meetings & Minutes',
      icon: CalendarCheck,
      badge: meetingsCount ? (isBn ? toBanglaNumber(meetingsCount) : meetingsCount) : undefined,
      badgeColor: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'action-plans',
      label: isBn ? 'কর্মপরিকল্পনা ও অগ্রগতি' : 'Action Plans',
      icon: ClipboardList,
      badge: actionPlansCount ? (isBn ? toBanglaNumber(actionPlansCount) : actionPlansCount) : undefined,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'performance',
      label: isBn ? 'সদস্য মূল্যায়ন ও স্কোর' : 'Member Performance',
      icon: Award,
      badge: isBn ? 'রেটিং' : 'Rating',
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'financial-history',
      label: isBn ? 'কমিটি ভিত্তিক হিসাব' : 'Financial History',
      icon: History,
      badge: isBn ? 'অডিট' : 'Audit',
      badgeColor: 'bg-teal-100 text-teal-700',
    },
    {
      id: 'handover',
      label: isBn ? 'দায়িত্ব হস্তান্তর প্রটোকল' : 'Handover Protocol',
      icon: Repeat,
      badge: isBn ? 'সনদ' : 'Cert',
      badgeColor: 'bg-orange-100 text-orange-700',
    },
    {
      id: 'sub-committees',
      label: isBn ? 'সাব-কমিটি ও উইং' : 'Sub-Committees',
      icon: Layers,
      badge: subCommitteesCount ? (isBn ? toBanglaNumber(subCommitteesCount) : subCommitteesCount) : undefined,
      badgeColor: 'bg-cyan-100 text-cyan-700',
    },
    {
      id: 'reports',
      label: isBn ? 'রিপোর্ট ও এক্সপোর্ট' : 'Reports & Export',
      icon: FileBarChart,
      badge: isBn ? 'পিডিএফ/প্রিন্ট' : 'PDF/Print',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
  ];

  const currentActiveItem = sidebarItems.find((item) => item.id === activeSection) || sidebarItems[0];
  const CurrentIcon = currentActiveItem.icon;

  const handleSelect = (id: CommitteeSubSection) => {
    onSelectSection(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <CurrentIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isBn ? 'কমিটি ব্যবস্থাপনা' : 'Committee Module'}
            </div>
            <div className="text-xs font-bold text-slate-800">{currentActiveItem.label}</div>
          </div>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>{isBn ? 'মেনু ও অপশন' : 'Menu & Sections'}</span>
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 lg:hidden"
        />
      )}

      {/* Secondary Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-4 flex flex-col font-sans transition-transform duration-200 ease-in-out lg:static lg:w-60 xl:w-64 lg:p-0 lg:border-r lg:border-slate-200 lg:bg-transparent lg:z-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 lg:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900">
                {isBn ? 'কমিটি ব্যবস্থাপনা' : 'Committee Management'}
              </span>
              <p className="text-[11px] text-slate-500">
                {isBn ? '১২টি পূর্ণাঙ্গ শাখা' : '12 Full Sections'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level 1 & 2 Breadcrumb Tag for Desktop */}
        <div className="hidden lg:flex flex-col mb-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>{isBn ? 'কমিটি' : 'Committee'}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-blue-700">{currentActiveItem.label}</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <CurrentIcon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">{currentActiveItem.label}</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`committee-nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor || 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Committee Term Quick Stat Box */}
        {activeTerm && tenure && (
          <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs font-sans">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate max-w-[120px]">{activeTerm.title}</span>
              </span>
              <span className="text-blue-700 text-[10px]">
                {isBn ? toBanglaNumber(tenure.progressPercent) : tenure.progressPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden my-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tenure.isNearEnd ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${tenure.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="truncate">{tenure.elapsedText}</span>
              <span className={`font-semibold shrink-0 ${tenure.isNearEnd ? 'text-amber-600' : 'text-slate-600'}`}>
                {tenure.remainingText}
              </span>
            </div>

            {tenure.isNearEnd && (
              <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-1.5 text-[10px] text-amber-800 font-medium">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{isBn ? 'মেয়াদ সমাপ্তির আর অল্প দিন বাকি' : 'Term expiring soon'}</span>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

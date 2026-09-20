import React, { useState } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Home,
  MapPin,
  HeartHandshake,
  Inbox,
  Coins,
  Briefcase,
  FileBarChart,
  Menu,
  X,
  ChevronRight,
  LucideIcon,
  Users2,
  Sparkles,
} from 'lucide-react';
import { Language } from '../lib/i18n';
import { toBanglaNumber } from './CommitteeView';

export type MusalliDonorSubSection =
  | 'dashboard'
  | 'persons'
  | 'families'
  | 'areas'
  | 'plans'
  | 'collections'
  | 'donations'
  | 'workers'
  | 'reports';

export interface MusalliDonorSidebarItem {
  id: MusalliDonorSubSection;
  label: string;
  subLabel?: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
}

interface MusalliDonorSecondarySidebarProps {
  activeSection: MusalliDonorSubSection;
  onSelectSection: (section: MusalliDonorSubSection) => void;
  personsCount?: number;
  familiesCount?: number;
  areasCount?: number;
  plansCount?: number;
  collectionsCount?: number;
  donationsCount?: number;
  workersCount?: number;
  language?: Language;
}

export const MusalliDonorSecondarySidebar: React.FC<MusalliDonorSecondarySidebarProps> = ({
  activeSection,
  onSelectSection,
  personsCount = 0,
  familiesCount = 0,
  areasCount = 0,
  plansCount = 0,
  collectionsCount = 0,
  donationsCount = 0,
  workersCount = 0,
  language = 'bn',
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isBn = language === 'bn';

  const sidebarItems: MusalliDonorSidebarItem[] = [
    {
      id: 'dashboard',
      label: isBn ? 'ড্যাশবোর্ড' : 'Dashboard',
      subLabel: isBn ? 'সারসংক্ষেপ ও পরিসংখ্যান' : 'Summary & Stats',
      icon: LayoutDashboard,
    },
    {
      id: 'persons',
      label: isBn ? 'মুসল্লি / ব্যক্তি' : 'Musalli / Persons',
      subLabel: isBn ? 'কেন্দ্রীয় পরিচয় তালিকা' : 'Central Directory',
      icon: UserCheck,
      badge: personsCount > 0 ? (isBn ? toBanglaNumber(personsCount) : personsCount) : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'families',
      label: isBn ? 'পরিবার / বাড়ি' : 'Families & Households',
      subLabel: isBn ? 'পারিবারিক খানা ও প্রধান' : 'Household Registry',
      icon: Home,
      badge: familiesCount > 0 ? (isBn ? toBanglaNumber(familiesCount) : familiesCount) : undefined,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'areas',
      label: isBn ? 'এলাকা / মহল্লা' : 'Areas & Mahallas',
      subLabel: isBn ? 'মসজিদ সীমানা ও লেন' : 'Territory Master',
      icon: MapPin,
      badge: areasCount > 0 ? (isBn ? toBanglaNumber(areasCount) : areasCount) : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'plans',
      label: isBn ? 'দান পরিকল্পনা' : 'Donation Plans',
      subLabel: isBn ? 'মাসিক/বাৎসরিক ওয়াদা' : 'Pledges & Frequency',
      icon: HeartHandshake,
      badge: plansCount > 0 ? (isBn ? toBanglaNumber(plansCount) : plansCount) : undefined,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'collections',
      label: isBn ? 'অনুদান সংগ্রহ' : 'Donation Collections',
      subLabel: isBn ? 'অপারেশনাল ট্র্যাকিং (B6)' : 'Collection Management',
      icon: Inbox,
      badge: collectionsCount > 0 ? (isBn ? toBanglaNumber(collectionsCount) : collectionsCount) : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
    },
    {
      id: 'donations',
      label: isBn ? 'অনুদান গ্রহণ ও রসিদ' : 'Actual Donations',
      subLabel: isBn ? 'বাস্তব কালেকশন ও পোস্টিং' : 'Collection & Receipts',
      icon: Coins,
      badge: donationsCount > 0 ? (isBn ? toBanglaNumber(donationsCount) : donationsCount) : undefined,
      badgeColor: 'bg-teal-100 text-teal-800 font-bold',
    },
    {
      id: 'workers',
      label: isBn ? 'সংগ্রহকারী কার্যক্রম' : 'Collection Worker Operations',
      subLabel: isBn ? 'দায়িত্ব, রুট ও সংগ্রহ অগ্রগতি' : 'Assignments & Field Operations',
      icon: Briefcase,
      badge: workersCount > 0 ? (isBn ? toBanglaNumber(workersCount) : workersCount) : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800 font-bold',
    },
    {
      id: 'reports',
      label: isBn ? 'রিপোর্ট ও রেজিস্টার' : 'Reports & Registers',
      subLabel: isBn ? 'তালিকা, এক্সপোর্ট ও প্রিন্ট' : 'Lists, Export & Print',
      icon: FileBarChart,
      badge: isBn ? 'রেজিস্টার' : 'Registry',
      badgeColor: 'bg-slate-100 text-slate-700',
    },
  ];

  const currentActiveItem = sidebarItems.find((item) => item.id === activeSection) || sidebarItems[0];
  const CurrentIcon = currentActiveItem.icon;

  const handleSelect = (id: MusalliDonorSubSection) => {
    onSelectSection(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CurrentIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-baloo">
              {isBn ? 'মুসল্লি ও দাতা ডেটাবেস' : 'Musalli Database'}
            </div>
            <div className="text-xs font-bold text-slate-800 font-siliguri">{currentActiveItem.label}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer font-siliguri"
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
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 font-siliguri">
                {isBn ? 'মুসল্লি ও দাতা ডেটাবেস' : 'Musalli & Donor DB'}
              </span>
              <p className="text-[11px] text-slate-500 font-tiro">
                {isBn ? '৭টি মূল শাখা' : '7 Core Sections'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level 1 & 2 Breadcrumb Tag for Desktop */}
        <div className="hidden lg:flex flex-col mb-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-baloo">
            <span>{isBn ? 'মূল মডিউল' : 'Module'}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-emerald-700">{isBn ? 'মুসল্লি ও দাতা' : 'Musalli & Donor'}</span>
          </div>
          <div className="text-xs font-bold text-slate-800 mt-0.5 truncate font-siliguri">
            {currentActiveItem.label}
          </div>
        </div>

        {/* Navigation Section Label */}
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 font-baloo">
          {isBn ? 'উপ-মডিউল তালিকা' : 'Sub-Sections'}
        </div>

        {/* Menu Items List */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-siliguri">{item.label}</div>
                    {item.subLabel && (
                      <div
                        className={`text-[10px] truncate leading-tight font-tiro ${
                          isActive ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {item.subLabel}
                      </div>
                    )}
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-md shrink-0 font-baloo ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Quick Architecture Info Card */}
        <div className="mt-4 pt-3 border-t border-slate-200 hidden lg:block">
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <div className="flex items-center space-x-1.5 text-emerald-800 text-[11px] font-bold mb-1 font-siliguri">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isBn ? 'সম্পর্কিত ডেটাবেস' : 'Relational Structure'}</span>
            </div>
            <p className="text-[10px] text-emerald-700 leading-relaxed font-tiro">
              {isBn
                ? 'এলাকা ➔ পরিবার ➔ ব্যক্তি ➔ নিয়মিত অনুদান'
                : 'Area ➔ Family ➔ Person ➔ Donation Plan'}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

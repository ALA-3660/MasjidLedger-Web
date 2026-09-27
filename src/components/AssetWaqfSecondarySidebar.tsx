import React, { useState } from 'react';
import {
  Package,
  Building,
  Users2,
  FileText,
  FileSpreadsheet,
  Layers,
  Compass,
  LayoutDashboard,
  LucideIcon,
  ChevronRight,
  Menu,
  X,
  Plus,
  Printer,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { Language } from '../lib/i18n';
import { toBanglaNumber } from './CommitteeView';

export type AssetWaqfSubSection =
  | 'assets'
  | 'properties'
  | 'tenants'
  | 'leases'
  | 'land_records'
  | 'documents'
  | 'boundaries';

export interface AssetWaqfSidebarItem {
  id: AssetWaqfSubSection;
  label: string;
  subLabel?: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
}

interface AssetWaqfSecondarySidebarProps {
  activeSection: AssetWaqfSubSection;
  onSelectSection: (section: AssetWaqfSubSection) => void;
  totalAssetsCount?: number;
  totalPropertiesCount?: number;
  totalTenantsCount?: number;
  totalLeasesCount?: number;
  totalLandRecordsCount?: number;
  language?: Language;
  onOpenNewAsset?: () => void;
  onOpenNewProperty?: () => void;
  onOpenNewTenant?: () => void;
  canEdit?: boolean;
}

export const AssetWaqfSecondarySidebar: React.FC<AssetWaqfSecondarySidebarProps> = ({
  activeSection,
  onSelectSection,
  totalAssetsCount = 0,
  totalPropertiesCount = 0,
  totalTenantsCount = 0,
  totalLeasesCount = 0,
  totalLandRecordsCount = 0,
  language = 'bn',
  onOpenNewAsset,
  onOpenNewProperty,
  onOpenNewTenant,
  canEdit = true,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isBn = language === 'bn';

  const sidebarItems: AssetWaqfSidebarItem[] = [
    {
      id: 'assets',
      label: isBn ? '📦 মসজিদের সম্পদ ও সরঞ্জাম' : 'Mosque Assets & Equipment',
      subLabel: isBn ? 'স্থাবর, অস্থাবর ও সার্ভিসিং' : 'Movable & Fixed Equipment',
      icon: Package,
      badge: totalAssetsCount ? (isBn ? toBanglaNumber(totalAssetsCount) : totalAssetsCount) : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'properties',
      label: isBn ? '🏞️ ওয়াকফ সম্পত্তি ও জমিজমা' : 'Waqf Properties & Real Estate',
      subLabel: isBn ? 'জমি, মার্কেট, দোকান ও স্থাপনা' : 'Land, Market, Shops & Plots',
      icon: Building,
      badge: totalPropertiesCount ? (isBn ? toBanglaNumber(totalPropertiesCount) : totalPropertiesCount) : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
    {
      id: 'tenants',
      label: isBn ? '👨‍💼 ভাড়াটিয়া / ইজারাদার' : 'Tenants & Lessees',
      subLabel: isBn ? 'মাস্টার ডেটাবেস ও ভাড়া হিস্ট্রি' : 'Master Database & Rent History',
      icon: Users2,
      badge: totalTenantsCount ? (isBn ? toBanglaNumber(totalTenantsCount) : totalTenantsCount) : undefined,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'leases',
      label: isBn ? '📜 চুক্তি ও ইজারা ব্যবস্থাপনা' : 'Lease & Rental Agreements',
      subLabel: isBn ? 'চুক্তিনামা, মেয়াদ ও জামানত' : 'Agreements, Terms & Deposits',
      icon: FileText,
      badge: totalLeasesCount ? (isBn ? toBanglaNumber(totalLeasesCount) : totalLeasesCount) : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'land_records',
      label: isBn ? '📑 ভূমি ও ওয়াকফ রেকর্ড' : 'Land & Waqf Records',
      subLabel: isBn ? 'মৌজা, দাগ, খতিয়ান ও খাজনা' : 'Mouza, Plot, Khatian & Tax',
      icon: Layers,
      badge: totalLandRecordsCount ? (isBn ? toBanglaNumber(totalLandRecordsCount) : totalLandRecordsCount) : undefined,
      badgeColor: 'bg-teal-100 text-teal-800',
    },
    {
      id: 'documents',
      label: isBn ? '📄 ওয়াকফ দলিল ও সম্পত্তির নথি' : 'Waqf Deeds & Legal Documents',
      subLabel: isBn ? 'দলিল, নামজারি ও সেন্ট্রাল আর্কাইভ' : 'Deeds, Mutation & Central Archive',
      icon: FolderOpen,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'boundaries',
      label: isBn ? '🧭 চতুঃসীমানা ও অবস্থান' : 'Boundaries & Geolocation',
      subLabel: isBn ? 'চতুঃসীমানা, মৌজা ও GPS ম্যাপ' : 'Boundaries, Mouza & GPS Map',
      icon: Compass,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
  ];

  const handleItemClick = (sectionId: AssetWaqfSubSection) => {
    onSelectSection(sectionId);
    setIsMobileOpen(false);
  };

  const currentItem = sidebarItems.find((item) => item.id === activeSection) || sidebarItems[0];

  return (
    <>
      {/* Mobile Bar */}
      <div className="lg:hidden bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs mb-4 flex items-center justify-between font-siliguri">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
            <currentItem.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{currentItem.label}</div>
            <div className="text-[11px] text-slate-500 font-tiro">{currentItem.subLabel}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>মেনু ({sidebarItems.length})</span>
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-0
          w-72 lg:w-64 bg-white border-r lg:border border-slate-200 lg:rounded-3xl
          p-4 shadow-xl lg:shadow-xs flex flex-col justify-between font-siliguri shrink-0
          transition-transform duration-200 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                🏢
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">
                  সম্পদ ও ওয়াকফ
                </h3>
                <p className="text-[10px] text-slate-500 font-tiro">
                  সমন্বিত স্থাবর ও অস্থাবর ব্যবস্থাপনা
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions (if user has permission) */}
          {canEdit && (
            <div className="p-2.5 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200/60 space-y-1.5">
              <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider px-1">
                দ্রুত অন্তর্ভুক্তি
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {onOpenNewProperty && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenNewProperty();
                      setIsMobileOpen(false);
                    }}
                    className="px-2 py-1.5 bg-white hover:bg-amber-100/80 text-amber-900 rounded-xl text-[11px] font-bold border border-amber-200 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3 text-amber-700" />
                    <span>ওয়াকফ জমি</span>
                  </button>
                )}
                {onOpenNewAsset && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenNewAsset();
                      setIsMobileOpen(false);
                    }}
                    className="px-2 py-1.5 bg-white hover:bg-emerald-100/80 text-emerald-900 rounded-xl text-[11px] font-bold border border-emerald-200 flex items-center justify-center space-x-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3 text-emerald-700" />
                    <span>নতুন সরঞ্জাম</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section Navigation Items */}
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer
                    ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 font-bold'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-amber-700'
                      }`}
                    />
                    <div className="truncate">
                      <div className="truncate font-siliguri leading-snug">{item.label}</div>
                      {item.subLabel && (
                        <div
                          className={`text-[10px] truncate font-tiro ${
                            isActive ? 'text-amber-100' : 'text-slate-400'
                          }`}
                        >
                          {item.subLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`
                        text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-baloo
                        ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeColor || 'bg-slate-100 text-slate-700'
                        }
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Summary / Note */}
        <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-tiro space-y-1">
          <div className="flex items-center space-x-1 text-slate-700 font-semibold font-siliguri">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ওয়াকফ অডিট ও লিজ ট্র্যাকড</span>
          </div>
          <p className="leading-tight">
            সকল আয়-ব্যয় কেন্দ্রীয় Income Entry ও Central Archive-এর সাথে সরাসরি সিঙ্কড।
          </p>
        </div>
      </aside>
    </>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  HeartHandshake,
  Box,
  Wallet,
  Landmark,
  Layers,
  Users2,
  CalendarCheck,
  UserCheck,
  Package,
  Building,
  Crosshair,
  Bell,
  FileBarChart,
  Settings,
  ShieldAlert,
  ExternalLink,
  Bot,
  Banknote,
  Calculator,
  QrCode,
  Scale,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n';

export type NavTab =
  | 'dashboard'
  | 'income'
  | 'expense'
  | 'donations'
  | 'donationBox'
  | 'dailyLedger'
  | 'openingBalance'
  | 'cashbook'
  | 'bank'
  | 'accountHeads'
  | 'committee'
  | 'meetings'
  | 'staff'
  | 'assets'
  | 'property'
  | 'cemetery'
  | 'notices'
  | 'reports'
  | 'users'
  | 'admin'
  | 'audit'
  | 'publicPortal'
  | 'qrManagement';

export interface SidebarProps {
  activeTab?: NavTab | string;
  onSelectTab?: (tab: NavTab) => void;
  onTabChange?: (tab: any) => void;
  onOpenCalculator?: () => void;
  onOpenScanner?: () => void;
  onOpenActionQrHub?: () => void;
  language?: Language;
  isOpen?: boolean;
  onClose?: () => void;
  currentUser?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'dashboard',
  onSelectTab,
  onTabChange,
  onOpenCalculator,
  onOpenScanner,
  onOpenActionQrHub,
  language = 'bn',
  isOpen = false,
  onClose,
}) => {
  const t = translations[language] || translations.bn;

  const handleTabClick = (tabId: NavTab) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tabId);
    } else if (typeof onTabChange === 'function') {
      onTabChange(tabId);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const navSections = [
    {
      title: language === 'bn' ? 'সারসংক্ষেপ' : 'Overview',
      items: [
        { id: 'dashboard' as NavTab, label: t.dashboard, icon: LayoutDashboard },
      ],
    },
    {
      title: t.financials,
      items: [
        { id: 'income' as NavTab, label: t.income, icon: ArrowDownLeft, color: 'text-emerald-600' },
        { id: 'expense' as NavTab, label: t.expense, icon: ArrowUpRight, color: 'text-rose-600' },
        { id: 'dailyLedger' as NavTab, label: language === 'bn' ? 'দৈনিক লেনদেন' : 'Daily Statement', icon: CalendarCheck, color: 'text-blue-600' },
        { id: 'openingBalance' as NavTab, label: language === 'bn' ? 'প্রারম্ভিক স্থিতি' : 'Opening Balance', icon: Scale, color: 'text-amber-600' },
        { id: 'donations' as NavTab, label: t.donations, icon: HeartHandshake, color: 'text-teal-600' },
        { id: 'donationBox' as NavTab, label: t.donationBox, icon: Box },
        { id: 'cashbook' as NavTab, label: t.cashbook, icon: Wallet },
        { id: 'bank' as NavTab, label: t.bankAccounts, icon: Landmark },
        { id: 'accountHeads' as NavTab, label: t.accountHeads, icon: Layers },
      ],
    },
    {
      title: t.committee,
      items: [
        { id: 'committee' as NavTab, label: t.currentCommittee, icon: Users2 },
        { id: 'meetings' as NavTab, label: t.meetings, icon: CalendarCheck },
      ],
    },
    {
      title: t.management,
      items: [
        { id: 'staff' as NavTab, label: t.staff, icon: UserCheck },
        { id: 'assets' as NavTab, label: t.assets, icon: Package },
        { id: 'property' as NavTab, label: t.property, icon: Building },
        { id: 'cemetery' as NavTab, label: t.cemetery, icon: Crosshair },
        { id: 'notices' as NavTab, label: t.notices, icon: Bell },
      ],
    },
    {
      title: language === 'bn' ? 'রিপোর্টিং ও পাবলিক' : 'Reports & Public',
      items: [
        { id: 'reports' as NavTab, label: t.reports, icon: FileBarChart, badge: '20+' },
        { id: 'publicPortal' as NavTab, label: t.publicPortal, icon: ExternalLink },
      ],
    },
    {
      title: t.admin,
      items: [
        { id: 'users' as NavTab, label: language === 'bn' ? 'ইউজার ব্যবস্থাপনা' : 'User Management', icon: Users2, color: 'text-blue-600' },
        { id: 'qrManagement' as NavTab, label: language === 'bn' ? 'QR ও কুইক এন্ট্রি' : 'QR Management', icon: QrCode, color: 'text-teal-600' },
        { id: 'admin' as NavTab, label: t.mosqueSettings, icon: Settings },
        { id: 'audit' as NavTab, label: t.auditLogs, icon: ShieldAlert },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        data-sidebar="true"
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col font-siliguri transition-transform duration-200 ease-in-out lg:translate-x-0 print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 font-siliguri">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-siliguri">
                {sec.title}
              </h3>
              <div className="space-y-1 mt-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-semibold font-siliguri transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate text-[13px] font-siliguri">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold font-siliguri">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Universal QR & Barcode Scanner Quick Trigger */}
          {onOpenScanner && (
            <button
              id="btn-sidebar-qr-scanner"
              type="button"
              onClick={() => {
                onOpenScanner();
                if (onClose) onClose();
              }}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/80 rounded-xl text-left transition-all group cursor-pointer shadow-2xs mb-2.5"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-950 font-siliguri">
                    {language === 'bn' ? 'QR ও বারকোড স্ক্যানার' : 'QR & Barcode Scanner'}
                  </p>
                  <p className="text-[11px] text-blue-700 font-baloo">
                    {language === 'bn' ? 'ক্যামেরা ও লাইভ স্ক্যান' : 'Live Camera & Actions'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-200/70 text-blue-900 font-bold px-1.5 py-0.5 rounded font-mono">
                Alt+Q
              </span>
            </button>
          )}

          {/* Action Cards Print Hub Quick Trigger */}
          {onOpenActionQrHub && (
            <button
              id="btn-sidebar-qr-action-hub"
              type="button"
              onClick={() => {
                onOpenActionQrHub();
                if (onClose) onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl text-left transition-all group cursor-pointer shadow-2xs mb-2.5"
            >
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-slate-700 text-white rounded-lg">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 font-siliguri">
                    {language === 'bn' ? 'অ্যাকশন QR প্রিন্ট সেন্টার' : 'Action QR Print Hub'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold font-siliguri">
                {language === 'bn' ? 'কার্ড / স্টিকার' : 'Cards / Sticker'}
              </span>
            </button>
          )}

          {/* Denomination Counter Quick Trigger */}
          {onOpenCalculator && (
            <button
              id="btn-sidebar-calculator"
              type="button"
              onClick={() => {
                onOpenCalculator();
                if (onClose) onClose();
              }}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/80 rounded-xl text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950 font-siliguri">
                    {language === 'bn' ? 'ভাংতি টাকা গণনা' : 'Cash & Change Counter'}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-baloo">
                    {language === 'bn' ? 'নোট ও কয়েন কাউন্টার' : 'Denomination Notes & Coins'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-bold px-1.5 py-0.5 rounded font-mono">
                Alt+C
              </span>
            </button>
          )}

          {/* Android Mobile Edition Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 mt-4 font-siliguri">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 font-siliguri">
              {language === 'bn' ? 'মোবাইল পরিকল্পনা' : 'Mobile Plan'}
            </p>
            <p className="text-xs leading-relaxed text-slate-700 font-siliguri">
              {language === 'bn'
                ? 'পরবর্তী সংস্করণ: অ্যান্ড্রয়েড নেটিভ অ্যাপ্লিকেশন। আপনার UI এখন প্রতিক্রিয়াশীল।'
                : 'Next edition: Android Native App. Responsive architecture active.'}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 font-semibold font-siliguri">
              <span>{language === 'bn' ? 'মুদ্রা:' : 'Currency:'} BDT (৳)</span>
              <span className="flex items-center text-green-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                {language === 'bn' ? 'অনলাইন' : 'Online'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

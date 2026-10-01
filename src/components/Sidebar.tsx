import React from 'react';
import {
  LayoutDashboard,
  Banknote,
  ArrowUpRight,
  BarChart3,
  Layers,
  UserCheck,
  Users,
  Users2,
  Bell,
  Crosshair,
  Building,
  BookOpen,
  Clock,
  Radio,
  Globe,
  FileBarChart,
  FolderOpen,
  Landmark,
  QrCode,
  ShieldAlert,
  HelpCircle,
  Camera,
  Printer,
  Calculator,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n';

export type NavTab =
  | 'dashboard'
  | 'mosqueManagement'
  | 'financialManagement'
  | 'dailyLedger'
  | 'openingBalance'
  | 'cashbook'
  | 'bank'
  | 'income'
  | 'new_income_entry'
  | 'income_juma'
  | 'donations'
  | 'donationBox'
  | 'income_waqf'
  | 'income_other'
  | 'income_register'
  | 'income_analytics'
  | 'income_reports'
  | 'expense'
  | 'accountHeads'
  | 'musalliDatabase'
  | 'committee'
  | 'advisors'
  | 'meetings'
  | 'staff'
  | 'salaryBankTransfer'
  | 'assets'
  | 'property'
  | 'documents'
  | 'cemetery'
  | 'notices'
  | 'knowledgeCenter'
  | 'library'
  | 'maktab'
  | 'hifz'
  | 'prayerTimes'
  | 'live'
  | 'reports'
  | 'users'
  | 'admin'
  | 'audit'
  | 'publicPortal'
  | 'qrManagement'
  | 'quickEntry'
  | 'userManual';

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

interface NavItemConfig {
  id?: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  isAction?: boolean;
  actionType?: 'scanner' | 'actionQr' | 'calculator';
}

interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
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

  const handleActionClick = (actionType?: 'scanner' | 'actionQr' | 'calculator') => {
    if (actionType === 'scanner' && onOpenScanner) {
      onOpenScanner();
    } else if (actionType === 'actionQr' && onOpenActionQrHub) {
      onOpenActionQrHub();
    } else if (actionType === 'calculator' && onOpenCalculator) {
      onOpenCalculator();
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const navSections: NavSectionConfig[] = [
    {
      title: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard',
      items: [
        {
          id: 'dashboard',
          label: language === 'bn' ? '📊 ড্যাশবোর্ড (সারসংক্ষেপ হিসাব)' : '📊 Dashboard (Summary)',
          icon: LayoutDashboard,
          color: 'text-blue-600',
        },
      ],
    },
    {
      title: language === 'bn' ? 'আর্থিক ব্যবস্থাপনা' : 'Financial Management',
      items: [
        {
          id: 'income',
          label: language === 'bn' ? '💵 আয় ও প্রাপ্তি' : '💵 Income & Receipts',
          icon: Banknote,
          color: 'text-emerald-600',
        },
        {
          id: 'expense',
          label: language === 'bn' ? '💸 ব্যয় ও পরিশোধ' : '💸 Expense & Payments',
          icon: ArrowUpRight,
          color: 'text-rose-600',
        },
        {
          id: 'financialManagement',
          label: language === 'bn' ? '📊 হিসাব ও লেনদেন' : '📊 Accounts & Ledgers',
          icon: BarChart3,
          color: 'text-blue-600',
        },
        {
          id: 'accountHeads',
          label: language === 'bn' ? '📑 আয়-ব্যয় খাত (হেড)' : '📑 Chart of Accounts',
          icon: Layers,
          color: 'text-slate-600',
        },
        {
          id: 'staff',
          label: language === 'bn' ? '👤 ইমাম, স্টাফ ও বেতন' : '👤 Staff & Payroll',
          icon: UserCheck,
          color: 'text-indigo-600',
        },
        {
          id: 'musalliDatabase',
          label: language === 'bn' ? '👥 মুসল্লি ও দাতা ডেটাবেস' : '👥 Musalli & Donor DB',
          icon: Users,
          color: 'text-emerald-700',
        },
      ],
    },
    {
      title: language === 'bn' ? 'পরিচালনা কমিটি ব্যবস্থাপনা' : 'Management Committee',
      items: [
        {
          id: 'committee',
          label: language === 'bn' ? '👥 কমিটি ব্যবস্থাপনা' : '👥 Committee Management',
          icon: Users2,
          color: 'text-blue-600',
        },
        {
          id: 'notices',
          label: language === 'bn' ? '📢 নোটিশ ও দাপ্তরিক যোগাযোগ' : '📢 Notices & Official Communications',
          icon: Bell,
          color: 'text-amber-600',
        },
      ],
    },
    {
      title: language === 'bn' ? 'সাধারণ ব্যবস্থাপনা' : 'General Management',
      items: [
        {
          id: 'cemetery',
          label: language === 'bn' ? '🪦 কবরস্থান ব্যবস্থাপনা' : '🪦 Cemetery Management',
          icon: Crosshair,
          color: 'text-stone-600',
        },
        {
          id: 'assets',
          label: language === 'bn' ? '🏢 সম্পদ ও ওয়াকফ ব্যবস্থাপনা' : '🏢 Assets & Waqf Management',
          icon: Building,
          color: 'text-amber-700',
        },
        {
          id: 'knowledgeCenter',
          label: language === 'bn' ? '📚 পাঠাগার ও জ্ঞানকেন্দ্র' : '📚 Library & Knowledge Center',
          icon: BookOpen,
          color: 'text-emerald-700',
        },
        {
          id: 'prayerTimes',
          label: language === 'bn' ? '🕌 নামাজের সময়সূচি' : '🕌 Prayer Schedule',
          icon: Clock,
          color: 'text-indigo-600',
        },
        {
          id: 'live',
          label: language === 'bn' ? '🔴 লাইভ' : '🔴 Live Kiosk Screen',
          icon: Radio,
          color: 'text-rose-600',
        },
        {
          id: 'publicPortal',
          label: language === 'bn' ? '🌐 পাবলিক পেজ' : '🌐 Public Portal Page',
          icon: Globe,
          color: 'text-cyan-600',
        },
      ],
    },
    {
      title: language === 'bn' ? 'রিপোর্টিং ও সেটিংস' : 'Reports & Settings',
      items: [
        {
          id: 'reports',
          label: language === 'bn' ? '📊 রিপোর্ট সেন্টার' : '📊 Report Center',
          icon: FileBarChart,
          color: 'text-blue-700',
        },
        {
          id: 'documents',
          label: language === 'bn' ? '📁 সেন্ট্রাল ডকুমেন্ট ও আর্কাইভ' : '📁 Central Documents & Archive',
          icon: FolderOpen,
          color: 'text-emerald-600',
        },
        {
          id: 'mosqueManagement',
          label: language === 'bn' ? '🏛️ মসজিদ পরিচিতি ও সেটিংস' : '🏛️ Mosque Settings',
          icon: Landmark,
          color: 'text-emerald-700',
        },
        {
          id: 'users',
          label: language === 'bn' ? '👤 ইউজার ব্যবস্থাপনা' : '👤 User Management',
          icon: Users2,
          color: 'text-blue-600',
        },
        {
          id: 'qrManagement',
          label: language === 'bn' ? '⚡ QR ও কুইক এন্ট্রি' : '⚡ QR & Quick Entry',
          icon: QrCode,
          color: 'text-teal-600',
        },
        {
          id: 'audit',
          label: language === 'bn' ? '🛡️ সিস্টেম ও আর্থিক অডিট লগ' : '🛡️ System & Audit Logs',
          icon: ShieldAlert,
          color: 'text-slate-700',
        },
        {
          id: 'userManual',
          label: language === 'bn' ? '📖 ব্যবহার বিধি ও সহায়িকা' : '📖 User Manual & Guide',
          icon: BookOpen,
          color: 'text-indigo-600',
        },
        {
          label: language === 'bn' ? '📷 ক্যামেরা ও লাইভ স্ক্যান' : '📷 Camera & Live Scan',
          icon: Camera,
          color: 'text-blue-600',
          isAction: true,
          actionType: 'scanner',
        },
        {
          label: language === 'bn' ? '🖨️ অ্যাকশন QR প্রিন্ট সেন্টার' : '🖨️ Action QR Print Hub',
          icon: Printer,
          color: 'text-slate-700',
          isAction: true,
          actionType: 'actionQr',
        },
        {
          label: language === 'bn' ? '🔢 নোট ও কয়েন কাউন্টার' : '🔢 Cash & Change Counter',
          icon: Calculator,
          color: 'text-emerald-600',
          isAction: true,
          actionType: 'calculator',
        },
      ],
    },
  ];

  const checkIsActive = (itemId?: NavTab): boolean => {
    if (!itemId) return false;
    if (itemId === 'dashboard') {
      return activeTab === 'dashboard';
    }
    if (itemId === 'income') {
      return [
        'income',
        'new_income_entry',
        'income_juma',
        'donations',
        'donationBox',
        'income_waqf',
        'income_other',
        'income_register',
        'income_analytics',
        'income_reports',
      ].includes(activeTab as string);
    }
    if (itemId === 'expense') {
      return activeTab === 'expense';
    }
    if (itemId === 'financialManagement') {
      return [
        'financialManagement',
        'dailyLedger',
        'openingBalance',
        'cashbook',
        'bank',
        'accounts',
      ].includes(activeTab as string);
    }
    if (itemId === 'accountHeads') {
      return activeTab === 'accountHeads';
    }
    if (itemId === 'staff') {
      return ['staff', 'salaryBankTransfer'].includes(activeTab as string);
    }
    if (itemId === 'musalliDatabase') {
      return ['musalliDatabase', 'musalli-database'].includes(activeTab as string);
    }
    if (itemId === 'committee') {
      return ['committee', 'meetings', 'advisors'].includes(activeTab as string);
    }
    if (itemId === 'notices') {
      return activeTab === 'notices';
    }
    if (itemId === 'cemetery') {
      return activeTab === 'cemetery';
    }
    if (itemId === 'assets') {
      return ['assets', 'property'].includes(activeTab as string);
    }
    if (itemId === 'knowledgeCenter') {
      return ['knowledgeCenter', 'library', 'maktab', 'hifz'].includes(activeTab as string);
    }
    if (itemId === 'prayerTimes') {
      return activeTab === 'prayerTimes';
    }
    if (itemId === 'live') {
      return activeTab === 'live';
    }
    if (itemId === 'publicPortal') {
      return ['publicPortal', 'public'].includes(activeTab as string);
    }
    if (itemId === 'reports') {
      return activeTab === 'reports';
    }
    if (itemId === 'documents') {
      return activeTab === 'documents';
    }
    if (itemId === 'mosqueManagement') {
      return [
        'mosqueManagement',
        'mosque',
        'admin',
        'settings',
        'mosqueProfileSettings',
        'publicPortalSettings',
      ].includes(activeTab as string);
    }
    if (itemId === 'users') {
      return activeTab === 'users';
    }
    if (itemId === 'qrManagement') {
      return ['qrManagement', 'quickEntry'].includes(activeTab as string);
    }
    if (itemId === 'audit') {
      return activeTab === 'audit';
    }
    if (itemId === 'userManual') {
      return activeTab === 'userManual';
    }
    return activeTab === itemId;
  };

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
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4 font-siliguri">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-0.5">
              <h3 className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-siliguri">
                {sec.title}
              </h3>
              <div className="space-y-0.5">
                {sec.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isActive = item.isAction ? false : checkIsActive(item.id);

                  if (item.isAction) {
                    const buttonId =
                      item.actionType === 'scanner'
                        ? 'btn-sidebar-qr-scanner'
                        : item.actionType === 'actionQr'
                        ? 'btn-sidebar-qr-action-hub'
                        : 'btn-sidebar-calculator';

                    return (
                      <button
                        key={itemIdx}
                        id={buttonId}
                        type="button"
                        onClick={() => handleActionClick(item.actionType)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-semibold font-siliguri transition-all cursor-pointer text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${item.color || 'text-slate-400'}`} />
                          <span className="truncate text-[13px] font-siliguri">{item.label}</span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id || itemIdx}
                      id={`nav-item-${item.id}`}
                      type="button"
                      onClick={() => item.id && handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-semibold font-siliguri transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs ring-1 ring-blue-100'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-blue-600' : item.color || 'text-slate-400'
                          }`}
                        />
                        <span className="truncate text-[13px] font-siliguri">{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Android Mobile Edition Card & Status Footer */}
          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 mt-3 font-siliguri">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 font-siliguri">
              {language === 'bn' ? 'মোবাইল পরিকল্পনা' : 'Mobile Plan'}
            </p>
            <p className="text-xs leading-relaxed text-slate-700 font-siliguri">
              {language === 'bn'
                ? 'পরবর্তী সংস্করণ: অ্যান্ড্রয়েড নেটিভ অ্যাপ্লিকেশন। আপনার UI এখন প্রতিক্রিয়াশীল।'
                : 'Next edition: Android Native App. Responsive UI active.'}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-600 font-semibold font-siliguri">
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

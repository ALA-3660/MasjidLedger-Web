import React, { useState } from 'react';
import { LucideIcon, Menu, X, ChevronRight } from 'lucide-react';

export interface SecondarySidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
  isAction?: boolean;
}

interface FinancialSecondarySidebarProps {
  subModuleName: string;
  subModuleIcon: LucideIcon;
  items: SecondarySidebarItem[];
  activeItemId: string;
  onSelectItem: (id: string) => void;
  quickStat?: {
    label: string;
    value: string;
  };
}

export const FinancialSecondarySidebar: React.FC<FinancialSecondarySidebarProps> = ({
  subModuleName,
  subModuleIcon: SubIcon,
  items,
  activeItemId,
  onSelectItem,
  quickStat,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSelect = (id: string) => {
    onSelectItem(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Bar */}
      <div className="lg:hidden flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-2xs">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <SubIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">হিসাব ও লেনদেন</div>
            <div className="text-xs font-bold text-slate-800">{subModuleName}</div>
          </div>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>মেনু ও অপশন</span>
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-4 flex flex-col font-siliguri transition-transform duration-200 ease-in-out lg:static lg:w-60 xl:w-64 lg:p-0 lg:border-r lg:border-slate-200 lg:bg-transparent lg:z-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 lg:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <SubIcon className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-900">{subModuleName}</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level 1 & 2 Breadcrumb Tag */}
        <div className="hidden lg:flex flex-col mb-3.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>হিসাব ও লেনদেন</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-blue-700">{subModuleName}</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <SubIcon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">{subModuleName}</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItemId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : item.isAction
                    ? 'bg-blue-50/70 hover:bg-blue-100/70 text-blue-800 border border-blue-200/60'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : item.isAction ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
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

        {/* Optional Quick Stat Card at bottom of secondary sidebar */}
        {quickStat && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {quickStat.label}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800 mt-0.5 block">
                {quickStat.value}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

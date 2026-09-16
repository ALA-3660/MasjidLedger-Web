import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
  User,
  Users2,
  Banknote,
  Building,
  Package,
  Crosshair,
  Bell,
  FileText,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Mosque, User as CurrentUser } from '../types';
import { canViewSensitiveData, maskSensitiveValue } from '../lib/permissions';

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'FINANCIAL' | 'PEOPLE' | 'PROPERTIES_ASSETS' | 'NOTICES_MEETINGS' | 'DOCUMENTS' | 'OTHER';
  categoryLabelBn: string;
  targetTab: string;
  targetRecordId?: string;
  date?: string;
  amount?: number;
  badge?: string;
  icon?: any;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, recordId?: string) => void;
  currentUser?: CurrentUser | null;
  // Raw datasets passed from App state for instant local search indexing
  incomes?: any[];
  expenses?: any[];
  donations?: any[];
  members?: any[];
  advisors?: any[];
  staff?: any[];
  assets?: any[];
  properties?: any[];
  cemeteryRecords?: any[];
  notices?: any[];
  meetings?: any[];
  resolutions?: any[];
  documents?: any[];
  accounts?: any[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentUser,
  incomes = [],
  expenses = [],
  donations = [],
  members = [],
  advisors = [],
  staff = [],
  assets = [],
  properties = [],
  cemeteryRecords = [],
  notices = [],
  meetings = [],
  resolutions = [],
  documents = [],
  accounts = [],
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Keyboard listener for Esc, Up/Down, Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex]);

  const canViewSensitive = canViewSensitiveData(currentUser);

  // Unified Search Index Builder
  const allIndexedResults = useMemo(() => {
    const list: GlobalSearchResult[] = [];

    // 1. Members
    members.forEach((m) => {
      list.push({
        id: `member-${m.id}`,
        title: m.name || m.nameBn,
        subtitle: `কমিটি সদস্য • ${m.designation || 'সদস্য'} • ফোন: ${
          canViewSensitive ? m.phone || '—' : maskSensitiveValue(m.phone)
        }`,
        category: 'PEOPLE',
        categoryLabelBn: 'কমিটি ও সদস্য',
        targetTab: 'committee',
        targetRecordId: m.id,
        badge: m.designation,
        icon: Users2,
      });
    });

    // 2. Advisors
    advisors.forEach((a) => {
      list.push({
        id: `advisor-${a.id}`,
        title: a.name,
        subtitle: `উপদেষ্টা পরিষদ • ${a.designation || 'উপদেষ্টা'}`,
        category: 'PEOPLE',
        categoryLabelBn: 'উপদেষ্টা পরিষদ',
        targetTab: 'advisors',
        targetRecordId: a.id,
        badge: 'উপদেষ্টা',
        icon: Shield,
      });
    });

    // 3. Staff
    staff.forEach((s) => {
      list.push({
        id: `staff-${s.id}`,
        title: s.name,
        subtitle: `ইমাম ও স্টাফ • ${s.designation || 'কর্মী'} • বেতন: ${
          canViewSensitive ? `৳${s.basicSalary?.toLocaleString() || 0}` : '••••••'
        }`,
        category: 'PEOPLE',
        categoryLabelBn: 'ইমাম ও স্টাফ',
        targetTab: 'staff',
        targetRecordId: s.id,
        badge: s.designation,
        icon: User,
      });
    });

    // 4. Incomes
    incomes.forEach((inc) => {
      list.push({
        id: `inc-${inc.id}`,
        title: inc.headTitle || inc.description || 'আয় ভাউচার',
        subtitle: `আয় ভাউচার #${inc.voucherNumber || inc.id} • তারিখ: ${inc.date} • হিসাব: ${
          inc.accountTitle || 'ক্যাশ'
        }`,
        category: 'FINANCIAL',
        categoryLabelBn: 'আর্থিক লেনদেন',
        targetTab: 'income',
        targetRecordId: inc.id,
        date: inc.date,
        amount: inc.amount,
        badge: `+৳${inc.amount?.toLocaleString()}`,
        icon: ArrowDownLeft,
      });
    });

    // 5. Expenses
    expenses.forEach((exp) => {
      list.push({
        id: `exp-${exp.id}`,
        title: exp.headTitle || exp.description || 'ব্যয় ভাউচার',
        subtitle: `ব্যয় ভাউচার #${exp.voucherNumber || exp.id} • প্রাপক: ${exp.payeeName || '—'} • তারিখ: ${
          exp.date
        }`,
        category: 'FINANCIAL',
        categoryLabelBn: 'আর্থিক লেনদেন',
        targetTab: 'expense',
        targetRecordId: exp.id,
        date: exp.date,
        amount: exp.amount,
        badge: `-৳${exp.amount?.toLocaleString()}`,
        icon: ArrowUpRight,
      });
    });

    // 6. Donations
    donations.forEach((d) => {
      list.push({
        id: `don-${d.id}`,
        title: d.donorName ? `দান - ${d.donorName}` : 'মসজিদ সাধারণ দান',
        subtitle: `রসিদ #${d.receiptNumber || d.id} • ফান্ড: ${d.headTitle || 'সাধারণ'} • ফোন: ${
          canViewSensitive ? d.donorPhone || '—' : maskSensitiveValue(d.donorPhone)
        }`,
        category: 'FINANCIAL',
        categoryLabelBn: 'আর্থিক লেনদেন',
        targetTab: 'donations',
        targetRecordId: d.id,
        amount: d.amount,
        badge: `৳${d.amount?.toLocaleString()}`,
        icon: Banknote,
      });
    });

    // 7. Bank Accounts
    accounts.forEach((acc) => {
      list.push({
        id: `acc-${acc.id}`,
        title: acc.accountName || acc.name,
        subtitle: `${acc.bankName || 'ব্যাংক'} • হিসাব নং: ${
          canViewSensitive ? acc.accountNumber || '—' : maskSensitiveValue(acc.accountNumber)
        } • ব্যালেন্স: ৳${acc.currentBalance?.toLocaleString() || 0}`,
        category: 'FINANCIAL',
        categoryLabelBn: 'ব্যাংক হিসাব',
        targetTab: 'bank',
        targetRecordId: acc.id,
        badge: acc.type === 'BANK' ? 'ব্যাংক' : 'ক্যাশ',
        icon: Layers,
      });
    });

    // 8. Assets
    assets.forEach((ast) => {
      list.push({
        id: `ast-${ast.id}`,
        title: ast.name,
        subtitle: `সম্পদ কোড: ${ast.assetCode || '—'} • অবস্থান: ${ast.location || 'মসজিদ'} • অবস্থা: ${
          ast.status || 'সক্রিয়'
        }`,
        category: 'PROPERTIES_ASSETS',
        categoryLabelBn: 'সম্পদ ও ওয়াকফ',
        targetTab: 'assets',
        targetRecordId: ast.id,
        badge: ast.category,
        icon: Package,
      });
    });

    // 9. Waqf Properties
    properties.forEach((p) => {
      list.push({
        id: `prop-${p.id}`,
        title: p.title || p.name,
        subtitle: `ওয়াকফ সম্পত্তি • খতিয়ান/দাগ: ${p.khatianNo || p.dagNo || '—'} • অবস্থান: ${
          p.location || '—'
        }`,
        category: 'PROPERTIES_ASSETS',
        categoryLabelBn: 'সম্পদ ও ওয়াকফ',
        targetTab: 'property',
        targetRecordId: p.id,
        badge: p.propertyType,
        icon: Building,
      });
    });

    // 10. Cemetery Records
    cemeteryRecords.forEach((c) => {
      list.push({
        id: `cem-${c.id}`,
        title: c.deceasedName,
        subtitle: `কবরস্থান রেকর্ড • কবর নং: ${c.plotNumber || '—'} • দাফন: ${c.burialDate || '—'}`,
        category: 'PROPERTIES_ASSETS',
        categoryLabelBn: 'কবরস্থান',
        targetTab: 'cemetery',
        targetRecordId: c.id,
        badge: `প্লট #${c.plotNumber || '—'}`,
        icon: Crosshair,
      });
    });

    // 11. Notices
    notices.forEach((n) => {
      list.push({
        id: `not-${n.id}`,
        title: n.title,
        subtitle: `নোটিশ • প্রকাশ: ${n.publishDate || n.date || '—'} • প্রাপক: ${n.targetAudience || 'সাধারণ'}`,
        category: 'NOTICES_MEETINGS',
        categoryLabelBn: 'নোটিশ ও মিটিং',
        targetTab: 'notices',
        targetRecordId: n.id,
        badge: n.priority,
        icon: Bell,
      });
    });

    // 12. Meetings
    meetings.forEach((m) => {
      list.push({
        id: `meet-${m.id}`,
        title: m.title || `কমিটি সভা #${m.meetingNumber || m.id}`,
        subtitle: `সভা তারিখ: ${m.meetingDate || m.date || '—'} • সভাপতি: ${m.presidedBy || '—'}`,
        category: 'NOTICES_MEETINGS',
        categoryLabelBn: 'নোটিশ ও মিটিং',
        targetTab: 'meetings',
        targetRecordId: m.id,
        badge: m.meetingType,
        icon: Calendar,
      });
    });

    // 13. Central Documents
    documents.forEach((d) => {
      list.push({
        id: `doc-${d.id}`,
        title: d.name,
        subtitle: `সেন্ট্রাল ডকুমেন্ট • মডিউল: ${d.entityTitle || d.entityType} • ধরন: ${
          d.documentType || 'ফাইল'
        }`,
        category: 'DOCUMENTS',
        categoryLabelBn: 'ডকুমেন্ট ও ফাইল',
        targetTab: 'documents',
        targetRecordId: d.id,
        badge: d.visibility,
        icon: FileText,
      });
    });

    return list;
  }, [
    members,
    advisors,
    staff,
    incomes,
    expenses,
    donations,
    accounts,
    assets,
    properties,
    cemeteryRecords,
    notices,
    meetings,
    documents,
    canViewSensitive,
  ]);

  // Filter based on active category and search text
  const filteredResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allIndexedResults
      .filter((item) => {
        if (activeCategory !== 'ALL' && item.category !== activeCategory) {
          return false;
        }
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.badge && item.badge.toLowerCase().includes(q))
        );
      })
      .slice(0, 30); // Max 30 results for crisp rendering
  }, [allIndexedResults, query, activeCategory]);

  const handleSelect = (item: GlobalSearchResult) => {
    onNavigate(item.targetTab, item.targetRecordId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-stone-50/70 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="নাম, ভাউচার নং, ফোন, ওয়াকফ খতিয়ান, ফাইল বা মডিউল খুঁজুন..."
            className="flex-1 bg-transparent border-none outline-hidden text-sm sm:text-base font-medium text-stone-900 placeholder-stone-400 font-siliguri"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-stone-400 hover:text-stone-700 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-stone-400 bg-stone-200/60 px-2 py-0.5 rounded">
            <span>ESC</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 border-b border-stone-100 bg-white flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'ALL', label: 'সবকিছু' },
            { id: 'FINANCIAL', label: 'আর্থিক ও ভাউচার' },
            { id: 'PEOPLE', label: 'সদস্য ও স্টাফ' },
            { id: 'PROPERTIES_ASSETS', label: 'ওয়াকফ ও সম্পদ' },
            { id: 'NOTICES_MEETINGS', label: 'মিটিং ও নোটিশ' },
            { id: 'DOCUMENTS', label: 'ডকুমেন্ট ও ফাইল' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-stone-100">
          {filteredResults.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs font-bold text-stone-700 font-siliguri">কোনো ফলাফল পাওয়া যায়নি</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                অন্য কোনো নাম, ফোন নম্বর বা তথ্য দিয়ে অনুসন্ধান করুন
              </p>
            </div>
          ) : (
            filteredResults.map((res, idx) => {
              const Icon = res.icon || FileText;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={res.id}
                  onClick={() => handleSelect(res)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl transition cursor-pointer ${
                    isSelected ? 'bg-emerald-50/80 border border-emerald-200' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`p-2 rounded-xl flex-shrink-0 ${
                        isSelected ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 truncate font-siliguri">
                          {res.title}
                        </span>
                        {res.badge && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium border border-stone-200">
                            {res.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 truncate mt-0.5 font-medium">
                        {res.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                    <span className="text-[10px] text-stone-400 font-semibold hidden sm:inline-block">
                      {res.categoryLabelBn}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        isSelected ? 'text-emerald-700 translate-x-0.5' : 'text-stone-300'
                      } transition`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              নেভিগেট করতে <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">↓</kbd>
            </span>
            <span>
              নির্বাচন করতে <kbd className="px-1 py-0.5 bg-stone-200 rounded font-mono">Enter</kbd>
            </span>
          </div>
          <span>মোট {filteredResults.length} টি ফলাফল</span>
        </div>
      </div>
    </div>
  );
};

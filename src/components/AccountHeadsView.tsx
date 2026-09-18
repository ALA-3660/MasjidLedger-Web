import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  FolderTree,
  Tag,
  CheckCircle2,
  Filter,
  X,
  Shield,
  FileText,
  Printer,
} from 'lucide-react';
import { AccountHead, Mosque } from '../types';
import { Language, translations } from '../lib/i18n';
import { FinancialSecondarySidebar, SecondarySidebarItem } from './FinancialSecondarySidebar';

interface AccountHeadsViewProps {
  accountHeads: AccountHead[];
  currentMosque?: Mosque | null;
  language?: Language;
  onAddAccountHead: (data: {
    nameBn: string;
    type: 'INCOME' | 'EXPENSE';
    parentId?: string | null;
    code?: string;
  }) => Promise<void>;
  onNavigateToCashBank?: () => void;
}

export const AccountHeadsView: React.FC<AccountHeadsViewProps> = ({
  accountHeads = [],
  currentMosque,
  language = 'bn',
  onAddAccountHead,
  onNavigateToCashBank,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);

  // Form State for new Account Head
  const [headNameBn, setHeadNameBn] = useState('');
  const [headType, setHeadType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [headParentId, setHeadParentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const incomeHeads = useMemo(
    () => accountHeads.filter((h) => h.type === 'INCOME'),
    [accountHeads]
  );
  const expenseHeads = useMemo(
    () => accountHeads.filter((h) => h.type === 'EXPENSE'),
    [accountHeads]
  );

  const mainIncomeHeads = useMemo(
    () => incomeHeads.filter((h) => !h.parentId),
    [incomeHeads]
  );
  const mainExpenseHeads = useMemo(
    () => expenseHeads.filter((h) => !h.parentId),
    [expenseHeads]
  );

  const filteredIncomeHeads = useMemo(() => {
    if (selectedTypeFilter === 'EXPENSE') return [];
    if (!searchTerm.trim()) return mainIncomeHeads;
    const q = searchTerm.toLowerCase().trim();
    return mainIncomeHeads.filter((main) => {
      const mainMatch = main.nameBn.toLowerCase().includes(q) || (main.code || '').toLowerCase().includes(q);
      const subMatch = accountHeads.some(
        (sub) => sub.parentId === main.id && (sub.nameBn.toLowerCase().includes(q) || (sub.code || '').toLowerCase().includes(q))
      );
      return mainMatch || subMatch;
    });
  }, [mainIncomeHeads, accountHeads, selectedTypeFilter, searchTerm]);

  const filteredExpenseHeads = useMemo(() => {
    if (selectedTypeFilter === 'INCOME') return [];
    if (!searchTerm.trim()) return mainExpenseHeads;
    const q = searchTerm.toLowerCase().trim();
    return mainExpenseHeads.filter((main) => {
      const mainMatch = main.nameBn.toLowerCase().includes(q) || (main.code || '').toLowerCase().includes(q);
      const subMatch = accountHeads.some(
        (sub) => sub.parentId === main.id && (sub.nameBn.toLowerCase().includes(q) || (sub.code || '').toLowerCase().includes(q))
      );
      return mainMatch || subMatch;
    });
  }, [mainExpenseHeads, accountHeads, selectedTypeFilter, searchTerm]);

  const handleSubmitNewHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headNameBn.trim()) {
      setErrorMsg('হিসাব খাতের নাম পূরণ করুন');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onAddAccountHead({
        nameBn: headNameBn.trim(),
        type: headType,
        parentId: headParentId || null,
      });
      setIsAddHeadModalOpen(false);
      setHeadNameBn('');
      setHeadParentId('');
    } catch (err: any) {
      setErrorMsg(err.message || 'হিসাব খাত যুক্ত করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sidebarItems: SecondarySidebarItem[] = useMemo(
    () => [
      {
        id: 'ALL',
        label: '📑 সকল হিসাব খাত',
        icon: Layers,
        count: accountHeads.length,
      },
      {
        id: 'INCOME',
        label: '📥 আয়ের খাতসমূহ',
        icon: ArrowDownLeft,
        count: incomeHeads.length,
      },
      {
        id: 'EXPENSE',
        label: '📤 ব্যয়ের খাতসমূহ',
        icon: ArrowUpRight,
        count: expenseHeads.length,
      },
      {
        id: 'NEW_HEAD',
        label: '➕ নতুন হিসাব খাত',
        icon: Plus,
        isAction: true,
      },
      {
        id: 'REPORTS',
        label: '🖨️ চার্ট অব অ্যাকাউন্টস রিপোর্ট',
        icon: Printer,
      },
    ],
    [accountHeads.length, incomeHeads.length, expenseHeads.length]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-siliguri">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-100 text-blue-900 rounded-xl border border-blue-200">
            <Layers className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              আয়-ব্যয়ের হিসাব খাত (COA)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              মসজিদের সকল আর্থিক লেনদেনের প্রধান ও উপ-হিসাব খাতের কাঠামো (Chart of Accounts)
            </p>
          </div>
        </div>

        <button
          id="btn-open-add-coa-head"
          onClick={() => {
            setErrorMsg('');
            setIsAddHeadModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ নতুন হিসাব খাত যোগ করুন</span>
        </button>
      </div>

      {/* Main Secondary Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Secondary Sidebar */}
        <FinancialSecondarySidebar
          subModuleName="আয়-ব্যয় খাত (COA)"
          subModuleIcon={Layers}
          items={sidebarItems}
          activeItemId={selectedTypeFilter}
          onSelectItem={(id) => {
            if (id === 'NEW_HEAD') {
              setErrorMsg('');
              setIsAddHeadModalOpen(true);
            } else if (id === 'REPORTS') {
              window.print();
            } else {
              setSelectedTypeFilter(id as any);
            }
          }}
          quickStat={{
            label: 'সর্বমোট হিসাব খাত',
            value: `${accountHeads.length} টি`,
          }}
        />

        {/* Content Area */}
        <div className="flex-1 w-full space-y-4 min-w-0">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  সর্বমোট হিসাব খাত
                </span>
                <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900">
                  {accountHeads.length} টি
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  প্রধান ও উপ-খাত মিলিয়ে সক্রিয় মোট সংখ্যা
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4.5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  আয়ের খাতসমূহ (Income)
                </span>
                <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-800">
                  {incomeHeads.length} টি
                </div>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">
                  {mainIncomeHeads.length} টি প্রধান খাত • {incomeHeads.length - mainIncomeHeads.length} টি উপ-খাত
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 bg-rose-50/30 p-4.5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  ব্যয়ের খাতসমূহ (Expense)
                </span>
                <div className="mt-1.5 text-2xl font-bold font-mono text-rose-800">
                  {expenseHeads.length} টি
                </div>
                <span className="text-[11px] text-rose-600 mt-0.5 block">
                  {mainExpenseHeads.length} টি প্রধান খাত • {expenseHeads.length - mainExpenseHeads.length} টি উপ-খাত
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700">
                {selectedTypeFilter === 'ALL'
                  ? 'সকল হিসাব খাত'
                  : selectedTypeFilter === 'INCOME'
                  ? 'আয়ের হিসাব খাত'
                  : 'ব্যয়ের হিসাব খাত'}
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                {selectedTypeFilter === 'ALL'
                  ? accountHeads.length
                  : selectedTypeFilter === 'INCOME'
                  ? incomeHeads.length
                  : expenseHeads.length}{' '}
                টি
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="খাতের নাম বা কোড খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Main Two-Column Structure: Income & Expense */}
          <div className={`grid gap-6 ${selectedTypeFilter === 'ALL' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Income Heads Section */}
        {(selectedTypeFilter === 'ALL' || selectedTypeFilter === 'INCOME') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-emerald-950 text-sm">
                  আয়ের হিসাব খাতসমূহ (Income Heads)
                </span>
              </div>
              <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                {filteredIncomeHeads.length} টি প্রধান খাত
              </span>
            </div>

            <div className="p-4 space-y-3.5 flex-1 divide-y divide-slate-100">
              {filteredIncomeHeads.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  কোনো আয়ের খাত পাওয়া যায়নি।
                </div>
              ) : (
                filteredIncomeHeads.map((main) => {
                  const subs = accountHeads.filter((h) => h.parentId === main.id);
                  return (
                    <div key={main.id} className="pt-3.5 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {main.nameBn}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {main.code && (
                            <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                              {main.code}
                            </span>
                          )}
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                            {subs.length} উপ-খাত
                          </span>
                        </div>
                      </div>

                      {subs.length > 0 && (
                        <div className="pl-4 ml-3 border-l-2 border-emerald-400 space-y-1.5 py-1">
                          {subs.map((sub) => (
                            <div
                              key={sub.id}
                              className="text-xs text-slate-700 flex items-center justify-between p-2 rounded-lg bg-slate-50/50 hover:bg-emerald-50/40 transition-colors"
                            >
                              <span className="font-medium">• {sub.nameBn}</span>
                              {sub.code && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {sub.code}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Expense Heads Section */}
        {(selectedTypeFilter === 'ALL' || selectedTypeFilter === 'EXPENSE') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-rose-700" />
                <span className="font-bold text-rose-950 text-sm">
                  ব্যয়ের হিসাব খাতসমূহ (Expense Heads)
                </span>
              </div>
              <span className="text-[11px] bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full font-bold">
                {filteredExpenseHeads.length} টি প্রধান খাত
              </span>
            </div>

            <div className="p-4 space-y-3.5 flex-1 divide-y divide-slate-100">
              {filteredExpenseHeads.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  কোনো ব্যয়ের খাত পাওয়া যায়নি।
                </div>
              ) : (
                filteredExpenseHeads.map((main) => {
                  const subs = accountHeads.filter((h) => h.parentId === main.id);
                  return (
                    <div key={main.id} className="pt-3.5 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {main.nameBn}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {main.code && (
                            <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                              {main.code}
                            </span>
                          )}
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-bold">
                            {subs.length} উপ-খাত
                          </span>
                        </div>
                      </div>

                      {subs.length > 0 && (
                        <div className="pl-4 ml-3 border-l-2 border-rose-400 space-y-1.5 py-1">
                          {subs.map((sub) => (
                            <div
                              key={sub.id}
                              className="text-xs text-slate-700 flex items-center justify-between p-2 rounded-lg bg-slate-50/50 hover:bg-rose-50/40 transition-colors"
                            >
                              <span className="font-medium">• {sub.nameBn}</span>
                              {sub.code && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {sub.code}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Add New Head Modal */}
      {isAddHeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">নতুন হিসাব খাত তৈরি</h3>
              </div>
              <button
                onClick={() => setIsAddHeadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewHead} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  খাতের ধরন *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHeadType('INCOME');
                      setHeadParentId('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      headType === 'INCOME'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    আয়ের খাত (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHeadType('EXPENSE');
                      setHeadParentId('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      headType === 'EXPENSE'
                        ? 'bg-rose-50 text-rose-800 border-rose-500 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ব্যয়ের খাত (Expense)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রধান খাত (ঐচ্ছিক - উপ-খাত হলে প্রধান খাত সিলেক্ট করুন)
                </label>
                <select
                  value={headParentId}
                  onChange={(e) => setHeadParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- এটি একটি প্রধান হিসাব খাত (Main Head) --</option>
                  {(headType === 'INCOME' ? mainIncomeHeads : mainExpenseHeads).map((mh) => (
                    <option key={mh.id} value={mh.id}>
                      {mh.nameBn} {mh.code ? `(${mh.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  হিসাব খাতের নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: অনুদান, বিদ্যুৎ বিল, পরিষ্কার-পরিচ্ছন্নতা..."
                  value={headNameBn}
                  onChange={(e) => setHeadNameBn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddHeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

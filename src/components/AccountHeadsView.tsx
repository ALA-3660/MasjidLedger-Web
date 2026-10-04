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
  Edit2,
  Trash2,
  Archive,
  Power,
  Info,
  AlertTriangle,
  ChevronRight,
  Check,
  Building,
} from 'lucide-react';
import { AccountHead, Mosque, IncomeEntry, ExpenseEntry } from '../types';
import { Language, translations } from '../lib/i18n';
import { FinancialSecondarySidebar, SecondarySidebarItem } from './FinancialSecondarySidebar';

interface AccountHeadsViewProps {
  accountHeads: AccountHead[];
  incomes?: IncomeEntry[];
  expenses?: ExpenseEntry[];
  currentMosque?: Mosque | null;
  language?: Language;
  onAddAccountHead: (data: {
    nameBn: string;
    nameEn?: string;
    type: 'INCOME' | 'EXPENSE';
    parentId?: string | null;
    description?: string;
  }) => Promise<void>;
  onUpdateAccountHead?: (id: string, data: Partial<AccountHead>) => Promise<void>;
  onDeleteAccountHead?: (id: string) => Promise<void>;
  onNavigateToCashBank?: () => void;
}

export const AccountHeadsView: React.FC<AccountHeadsViewProps> = ({
  accountHeads = [],
  incomes = [],
  expenses = [],
  currentMosque,
  language = 'bn',
  onAddAccountHead,
  onUpdateAccountHead,
  onDeleteAccountHead,
  onNavigateToCashBank,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ALL');

  // Modals state
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);
  const [isEditHeadModalOpen, setIsEditHeadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Active item for Edit/Delete
  const [selectedHead, setSelectedHead] = useState<AccountHead | null>(null);

  // Form State for new Account Head
  const [headNameBn, setHeadNameBn] = useState('');
  const [headNameEn, setHeadNameEn] = useState('');
  const [headDescription, setHeadDescription] = useState('');
  const [headType, setHeadType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [headParentId, setHeadParentId] = useState('');

  // Form State for editing Account Head
  const [editNameBn, setEditNameBn] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Loading & Error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Helper to compute usage count
  const getUsageCount = (head: AccountHead) => {
    if (typeof (head as any).usageCount === 'number') {
      return (head as any).usageCount;
    }
    const incCount = incomes.filter(i => i.mainHeadId === head.id || i.subHeadId === head.id).length;
    const expCount = expenses.filter(e => e.mainHeadId === head.id || e.subHeadId === head.id).length;
    return incCount + expCount;
  };

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

  // Active / Inactive / Archived counts
  const activeCount = useMemo(
    () => accountHeads.filter(h => (h.status === 'ACTIVE' || (h.isActive !== false && !h.status))).length,
    [accountHeads]
  );
  const inactiveCount = useMemo(
    () => accountHeads.filter(h => h.status === 'INACTIVE' || h.isActive === false).length,
    [accountHeads]
  );
  const archivedCount = useMemo(
    () => accountHeads.filter(h => h.status === 'ARCHIVED').length,
    [accountHeads]
  );

  const isHeadMatchingStatus = (head: AccountHead) => {
    const status = head.status || (head.isActive !== false ? 'ACTIVE' : 'INACTIVE');
    if (selectedStatusFilter === 'ALL') return true;
    return status === selectedStatusFilter;
  };

  const filteredIncomeHeads = useMemo(() => {
    if (selectedTypeFilter === 'EXPENSE') return [];
    const q = searchTerm.toLowerCase().trim();

    return mainIncomeHeads.filter((main) => {
      const mainStatusMatch = isHeadMatchingStatus(main);
      const subs = accountHeads.filter((s) => s.parentId === main.id);
      const matchingSubs = subs.filter(isHeadMatchingStatus);

      if (!mainStatusMatch && matchingSubs.length === 0 && selectedStatusFilter !== 'ALL') {
        return false;
      }

      if (!q) return true;

      const mainMatch = main.nameBn.toLowerCase().includes(q) ||
        (main.nameEn || '').toLowerCase().includes(q) ||
        (main.code || '').toLowerCase().includes(q);

      const subMatch = subs.some(
        (sub) => sub.nameBn.toLowerCase().includes(q) ||
          (sub.nameEn || '').toLowerCase().includes(q) ||
          (sub.code || '').toLowerCase().includes(q)
      );

      return mainMatch || subMatch;
    });
  }, [mainIncomeHeads, accountHeads, selectedTypeFilter, selectedStatusFilter, searchTerm]);

  const filteredExpenseHeads = useMemo(() => {
    if (selectedTypeFilter === 'INCOME') return [];
    const q = searchTerm.toLowerCase().trim();

    return mainExpenseHeads.filter((main) => {
      const mainStatusMatch = isHeadMatchingStatus(main);
      const subs = accountHeads.filter((s) => s.parentId === main.id);
      const matchingSubs = subs.filter(isHeadMatchingStatus);

      if (!mainStatusMatch && matchingSubs.length === 0 && selectedStatusFilter !== 'ALL') {
        return false;
      }

      if (!q) return true;

      const mainMatch = main.nameBn.toLowerCase().includes(q) ||
        (main.nameEn || '').toLowerCase().includes(q) ||
        (main.code || '').toLowerCase().includes(q);

      const subMatch = subs.some(
        (sub) => sub.nameBn.toLowerCase().includes(q) ||
          (sub.nameEn || '').toLowerCase().includes(q) ||
          (sub.code || '').toLowerCase().includes(q)
      );

      return mainMatch || subMatch;
    });
  }, [mainExpenseHeads, accountHeads, selectedTypeFilter, selectedStatusFilter, searchTerm]);

  const handleOpenAddSubHead = (parent: AccountHead) => {
    setHeadType(parent.type);
    setHeadParentId(parent.id);
    setHeadNameBn('');
    setHeadNameEn('');
    setHeadDescription('');
    setErrorMsg('');
    setIsAddHeadModalOpen(true);
  };

  const handleOpenEditModal = (head: AccountHead) => {
    setSelectedHead(head);
    setEditNameBn(head.nameBn || '');
    setEditNameEn(head.nameEn || '');
    setEditDescription(head.description || '');
    setEditStatus(head.status || (head.isActive !== false ? 'ACTIVE' : 'INACTIVE'));
    setErrorMsg('');
    setIsEditHeadModalOpen(true);
  };

  const handleOpenDeleteModal = (head: AccountHead) => {
    setSelectedHead(head);
    setErrorMsg('');
    setIsDeleteModalOpen(true);
  };

  const handleSubmitNewHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headNameBn.trim()) {
      setErrorMsg('হিসাব খাতের বাংলা নাম পূরণ করুন');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onAddAccountHead({
        nameBn: headNameBn.trim(),
        nameEn: headNameEn.trim() || undefined,
        type: headType,
        parentId: headParentId || null,
        description: headDescription.trim() || undefined,
      });
      setIsAddHeadModalOpen(false);
      setHeadNameBn('');
      setHeadNameEn('');
      setHeadDescription('');
      setHeadParentId('');
      setSuccessMsg('নতুন হিসাব খাত সফলভাবে যুক্ত হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'হিসাব খাত যুক্ত করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEditHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHead || !onUpdateAccountHead) return;
    if (!editNameBn.trim()) {
      setErrorMsg('হিসাব খাতের বাংলা নাম খালি রাখা যাবে না');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onUpdateAccountHead(selectedHead.id, {
        nameBn: editNameBn.trim(),
        nameEn: editNameEn.trim() || editNameBn.trim(),
        description: editDescription.trim(),
        status: editStatus,
        isActive: editStatus === 'ACTIVE',
      });
      setIsEditHeadModalOpen(false);
      setSelectedHead(null);
      setSuccessMsg('হিসাব খাতের তথ্য সফলভাবে আপডেট হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'হিসাব খাত আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (head: AccountHead, targetStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') => {
    if (!onUpdateAccountHead) return;
    try {
      await onUpdateAccountHead(head.id, {
        status: targetStatus,
        isActive: targetStatus === 'ACTIVE',
      });
      setSuccessMsg(`${head.nameBn} খাতের স্ট্যাটাস পরিবর্তিত হয়েছে।`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে।');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedHead || !onDeleteAccountHead) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onDeleteAccountHead(selectedHead.id);
      setIsDeleteModalOpen(false);
      setSelectedHead(null);
      setSuccessMsg('হিসাব খাত সফলভাবে নিষ্পত্তি/মুছে ফেলা হয়েছে।');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'হিসাব খাত মুছতে ব্যর্থ হয়েছে।');
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
              মসজিদের সকল আর্থিক লেনদেনের প্রধান ও উপ-হিসাব খাতের কাস্টমাইজেশন ও চার্ট অব অ্যাকাউন্টস
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-200"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট / রিপোর্ট</span>
          </button>
          <button
            id="btn-open-add-coa-head"
            onClick={() => {
              setErrorMsg('');
              setHeadParentId('');
              setHeadNameBn('');
              setHeadNameEn('');
              setHeadDescription('');
              setIsAddHeadModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন প্রধান হিসাব খাত</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              setHeadParentId('');
              setHeadNameBn('');
              setHeadNameEn('');
              setHeadDescription('');
              setIsAddHeadModalOpen(true);
            } else if (id === 'REPORTS') {
              setIsPrintModalOpen(true);
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                সর্বমোট খাত
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
                {accountHeads.length} <span className="text-xs font-normal text-slate-400">টি</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {mainIncomeHeads.length + mainExpenseHeads.length} প্রধান • {accountHeads.length - (mainIncomeHeads.length + mainExpenseHeads.length)} উপ-খাত
              </span>
            </div>

            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                আয়ের খাতসমূহ
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-800">
                {incomeHeads.length} <span className="text-xs font-normal text-emerald-600">টি</span>
              </div>
              <span className="text-[11px] text-emerald-600 mt-0.5 block">
                {mainIncomeHeads.length} প্রধান • {incomeHeads.length - mainIncomeHeads.length} উপ-খাত
              </span>
            </div>

            <div className="bg-rose-50/50 rounded-2xl border border-rose-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                ব্যয়ের খাতসমূহ
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-rose-800">
                {expenseHeads.length} <span className="text-xs font-normal text-rose-600">টি</span>
              </div>
              <span className="text-[11px] text-rose-600 mt-0.5 block">
                {mainExpenseHeads.length} প্রধান • {expenseHeads.length - mainExpenseHeads.length} উপ-খাত
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                সক্রিয় অবস্থা
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-800">
                {activeCount} <span className="text-xs font-normal text-slate-500">সক্রিয়</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {inactiveCount} নিষ্ক্রিয় {archivedCount > 0 && `• ${archivedCount} আর্কাইভ`}
              </span>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedTypeFilter('ALL')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTypeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সকল খাত ({accountHeads.length})
                </button>
                <button
                  onClick={() => setSelectedTypeFilter('INCOME')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTypeFilter === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  আয় ({incomeHeads.length})
                </button>
                <button
                  onClick={() => setSelectedTypeFilter('EXPENSE')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedTypeFilter === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  ব্যয় ({expenseHeads.length})
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="ALL">সকল অবস্থা (Active/Inactive/Archive)</option>
                <option value="ACTIVE">শুধুমাত্র সক্রিয় খাত ({activeCount})</option>
                <option value="INACTIVE">নিষ্ক্রিয় খাত ({inactiveCount})</option>
                <option value="ARCHIVED">আর্কাইভকৃত খাত ({archivedCount})</option>
              </select>
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
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
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

                <div className="p-4 space-y-4 flex-1 divide-y divide-slate-100">
                  {filteredIncomeHeads.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      কোনো আয়ের খাত পাওয়া যায়নি।
                    </div>
                  ) : (
                    filteredIncomeHeads.map((main) => {
                      const subs = accountHeads.filter((h) => h.parentId === main.id);
                      const filteredSubs = subs.filter(isHeadMatchingStatus);
                      const mainUsage = getUsageCount(main);
                      const isMainActive = main.status === 'ACTIVE' || (main.isActive !== false && !main.status);

                      return (
                        <div key={main.id} className="pt-3.5 first:pt-0 space-y-2">
                          {/* Main Head Row */}
                          <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                            isMainActive ? 'bg-slate-50 border-slate-200 hover:border-emerald-300' : 'bg-slate-100/70 border-slate-200/80 opacity-75'
                          }`}>
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className={`w-3 h-3 rounded-full shrink-0 ${isMainActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <div className="truncate">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-bold text-xs sm:text-sm ${isMainActive ? 'text-slate-900' : 'text-slate-600 line-through'}`}>
                                    {main.nameBn}
                                  </span>
                                  {main.code && (
                                    <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                                      {main.code}
                                    </span>
                                  )}
                                  {main.status === 'INACTIVE' && (
                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                                      নিষ্ক্রিয়
                                    </span>
                                  )}
                                  {main.status === 'ARCHIVED' && (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                      আর্কাইভকৃত
                                    </span>
                                  )}
                                </div>
                                {main.nameEn && main.nameEn !== main.nameBn && (
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    {main.nameEn}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                              {mainUsage > 0 && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="লেনদেন সংখ্যা">
                                  {mainUsage} লেনদেন
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenAddSubHead(main)}
                                title="উপ-খাত যুক্ত করুন"
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer border border-emerald-200"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="text-[10px]">উপ-খাত</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(main)}
                                title="সম্পাদনা করুন"
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(main)}
                                title="মুছুন / নিষ্ক্রিয় করুন"
                                className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sub-heads List */}
                          {filteredSubs.length > 0 && (
                            <div className="pl-4 ml-3 border-l-2 border-emerald-400 space-y-1.5 py-1">
                              {filteredSubs.map((sub) => {
                                const subUsage = getUsageCount(sub);
                                const isSubActive = sub.status === 'ACTIVE' || (sub.isActive !== false && !sub.status);

                                return (
                                  <div
                                    key={sub.id}
                                    className={`text-xs flex items-center justify-between p-2 rounded-lg transition-colors ${
                                      isSubActive ? 'bg-slate-50/60 hover:bg-emerald-50/40 text-slate-800' : 'bg-slate-100/60 text-slate-500 opacity-80'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 truncate">
                                      <span className="font-medium">• {sub.nameBn}</span>
                                      {sub.code && (
                                        <span className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                          {sub.code}
                                        </span>
                                      )}
                                      {sub.status === 'INACTIVE' && (
                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded">
                                          নিষ্ক্রিয়
                                        </span>
                                      )}
                                      {sub.status === 'ARCHIVED' && (
                                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">
                                          আর্কাইভ
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0">
                                      {subUsage > 0 && (
                                        <span className="text-[10px] text-slate-400 px-1 font-mono">
                                          {subUsage} এন্ট্রি
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleOpenEditModal(sub)}
                                        className="p-1 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                                        title="সম্পাদনা"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenDeleteModal(sub)}
                                        className="p-1 hover:bg-rose-100 text-rose-500 rounded cursor-pointer"
                                        title="মুছুন / নিষ্ক্রিয়"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
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

                <div className="p-4 space-y-4 flex-1 divide-y divide-slate-100">
                  {filteredExpenseHeads.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      কোনো ব্যয়ের খাত পাওয়া যায়নি।
                    </div>
                  ) : (
                    filteredExpenseHeads.map((main) => {
                      const subs = accountHeads.filter((h) => h.parentId === main.id);
                      const filteredSubs = subs.filter(isHeadMatchingStatus);
                      const mainUsage = getUsageCount(main);
                      const isMainActive = main.status === 'ACTIVE' || (main.isActive !== false && !main.status);

                      return (
                        <div key={main.id} className="pt-3.5 first:pt-0 space-y-2">
                          {/* Main Head Row */}
                          <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                            isMainActive ? 'bg-slate-50 border-slate-200 hover:border-rose-300' : 'bg-slate-100/70 border-slate-200/80 opacity-75'
                          }`}>
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className={`w-3 h-3 rounded-full shrink-0 ${isMainActive ? 'bg-rose-500' : 'bg-slate-400'}`} />
                              <div className="truncate">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-bold text-xs sm:text-sm ${isMainActive ? 'text-slate-900' : 'text-slate-600 line-through'}`}>
                                    {main.nameBn}
                                  </span>
                                  {main.code && (
                                    <span className="font-mono text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                                      {main.code}
                                    </span>
                                  )}
                                  {main.status === 'INACTIVE' && (
                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                                      নিষ্ক্রিয়
                                    </span>
                                  )}
                                  {main.status === 'ARCHIVED' && (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                                      আর্কাইভকৃত
                                    </span>
                                  )}
                                </div>
                                {main.nameEn && main.nameEn !== main.nameBn && (
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    {main.nameEn}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                              {mainUsage > 0 && (
                                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold" title="লেনদেন সংখ্যা">
                                  {mainUsage} লেনদেন
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenAddSubHead(main)}
                                title="উপ-খাত যুক্ত করুন"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer border border-rose-200"
                              >
                                <Plus className="w-3 h-3" />
                                <span className="text-[10px]">উপ-খাত</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(main)}
                                title="সম্পাদনা করুন"
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(main)}
                                title="মুছুন / নিষ্ক্রিয় করুন"
                                className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Sub-heads List */}
                          {filteredSubs.length > 0 && (
                            <div className="pl-4 ml-3 border-l-2 border-rose-400 space-y-1.5 py-1">
                              {filteredSubs.map((sub) => {
                                const subUsage = getUsageCount(sub);
                                const isSubActive = sub.status === 'ACTIVE' || (sub.isActive !== false && !sub.status);

                                return (
                                  <div
                                    key={sub.id}
                                    className={`text-xs flex items-center justify-between p-2 rounded-lg transition-colors ${
                                      isSubActive ? 'bg-slate-50/60 hover:bg-rose-50/40 text-slate-800' : 'bg-slate-100/60 text-slate-500 opacity-80'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 truncate">
                                      <span className="font-medium">• {sub.nameBn}</span>
                                      {sub.code && (
                                        <span className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                          {sub.code}
                                        </span>
                                      )}
                                      {sub.status === 'INACTIVE' && (
                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded">
                                          নিষ্ক্রিয়
                                        </span>
                                      )}
                                      {sub.status === 'ARCHIVED' && (
                                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">
                                          আর্কাইভ
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0">
                                      {subUsage > 0 && (
                                        <span className="text-[10px] text-slate-400 px-1 font-mono">
                                          {subUsage} এন্ট্রি
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleOpenEditModal(sub)}
                                        className="p-1 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                                        title="সম্পাদনা"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenDeleteModal(sub)}
                                        className="p-1 hover:bg-rose-100 text-rose-500 rounded cursor-pointer"
                                        title="মুছুন / নিষ্ক্রিয়"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
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
                <h3 className="font-bold text-sm">
                  {headParentId ? 'নতুন উপ-খাত তৈরি (Sub-Head)' : 'নতুন হিসাব খাত তৈরি (Account Head)'}
                </h3>
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
                  প্রধান খাত (উপ-খাত তৈরি করতে প্রধান খাত বেছে নিন)
                </label>
                <select
                  value={headParentId}
                  onChange={(e) => setHeadParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value="">-- এটি একটি প্রধান হিসাব খাত (Main Head) --</option>
                  {(headType === 'INCOME' ? mainIncomeHeads : mainExpenseHeads).map((mh) => (
                    <option key={mh.id} value={mh.id}>
                      {mh.nameBn} {mh.code ? `(${mh.code})` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  সর্বোচ্চ ২ স্তরের কাঠামো (প্রধান খাত ➔ উপ-খাত) অনুসৃত হয়।
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  হিসাব খাতের নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: দানবাক্স সংগ্রহ, বিদ্যুৎ বিল, খতিব সম্মানী..."
                  value={headNameBn}
                  onChange={(e) => setHeadNameBn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইংরেজি নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Donation Box, Electricity Bill..."
                  value={headNameEn}
                  onChange={(e) => setHeadNameEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিবরণ / নোট (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  placeholder="খাত সম্পর্কিত সংক্ষিপ্ত বর্ণনা..."
                  value={headDescription}
                  onChange={(e) => setHeadDescription(e.target.value)}
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

      {/* Edit Head Modal */}
      {isEditHeadModalOpen && selectedHead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">হিসাব খাত সম্পাদনা</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditHeadModalOpen(false);
                  setSelectedHead(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditHead} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Immutable Identity Display */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">হিসাব কোড (অপরিবর্তনীয়):</span>
                  <span className="font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                    {selectedHead.code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">খাতের ধরন:</span>
                  <span className={`font-bold ${selectedHead.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {selectedHead.type === 'INCOME' ? 'আয়ের খাত (Income)' : 'ব্যয়ের খাত (Expense)'}
                  </span>
                </div>
                {selectedHead.parentId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">প্রধান খাত:</span>
                    <span className="font-bold text-slate-700">
                      {accountHeads.find(h => h.id === selectedHead.parentId)?.nameBn || '—'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  হিসাব খাতের নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  required
                  value={editNameBn}
                  onChange={(e) => setEditNameBn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইংরেজি নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অবস্থা / স্ট্যাটাস *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white"
                >
                  <option value="ACTIVE">সক্রিয় (Active — নতুন লেনদেনে ব্যবহারযোগ্য)</option>
                  <option value="INACTIVE">নিষ্ক্রিয় (Inactive — সাময়িক বন্ধ)</option>
                  <option value="ARCHIVED">আর্কাইভকৃত (Archived — স্থায়ীভাবে বন্ধ, ইতিহাস সংরক্ষিত)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিবরণ / নোট (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditHeadModalOpen(false);
                    setSelectedHead(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'আপডেট হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {isDeleteModalOpen && selectedHead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-rose-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
                <h3 className="font-bold text-sm">হিসাব খাত অপসারণ / নিষ্ক্রিয়করণ</h3>
              </div>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedHead(null);
                }}
                className="p-1.5 text-rose-300 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-siliguri">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedHead.nameBn} <span className="font-mono text-xs text-slate-500">({selectedHead.code})</span>
                </div>
                <div className="text-slate-600">
                  ধরন: {selectedHead.type === 'INCOME' ? 'আয়ের খাত' : 'ব্যয়ের খাত'}
                </div>
                <div className="text-blue-700 font-bold">
                  মোট সম্পর্কিত লেনদেন সংখ্যা: {getUsageCount(selectedHead)} টি
                </div>
              </div>

              {getUsageCount(selectedHead) > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl leading-relaxed">
                  <div className="font-bold flex items-center space-x-1.5 mb-1">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>ইতিহাস সংরক্ষণের নিশ্চয়তা</span>
                  </div>
                  এই খাতের অধীনে পূর্ববর্তী আর্থিক লেনদেন সংরক্ষিত থাকায় এটি স্থায়ীভাবে মুছে ফেলা হবে না। পরিবর্তে এটি <strong>নিষ্ক্রিয়/আর্কাইভ</strong> করা হবে যাতে নতুন কোনো ভাউচারে এটি নির্বাচিত না হয়, কিন্তু অতীতের সকল রিপোর্ট ও অডিট ট্রেইল অক্ষত থাকে।
                </div>
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  এই খাতের অধীনে কোনো আর্থিক লেনদেন নেই। আপনি এটি স্থায়ীভাবে তালিকা থেকে মুছে ফেলতে পারেন।
                </p>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedHead(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'প্রসেসিং হচ্ছে...' : getUsageCount(selectedHead) > 0 ? 'নিষ্ক্রিয়/আর্কাইভ করুন' : 'স্থায়ীভাবে মুছুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable COA Report Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">চার্ট অব অ্যাকাউন্টস (COA) মুদ্রণ প্রিভিউ</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 font-siliguri space-y-6">
              {/* Report Header */}
              <div className="text-center border-b pb-4 border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  {currentMosque?.nameBn || 'মামুন জামে মসজিদ ওয়াকফ এস্টেট'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {currentMosque?.address || 'ঠিকানা'}
                </p>
                <h3 className="text-sm font-bold text-blue-900 bg-blue-50 inline-block px-4 py-1 rounded-full mt-2 border border-blue-200">
                  চার্ট অব অ্যাকাউন্টস (Chart of Accounts - COA)
                </h3>
              </div>

              {/* Income Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  📥 আয়ের হিসাব খাতসমূহ (Income Heads)
                </h4>
                <table className="w-full text-xs text-left border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 border-b">কোড</th>
                      <th className="p-2 border-b">খাতের নাম (বাংলা)</th>
                      <th className="p-2 border-b">English Name</th>
                      <th className="p-2 border-b">স্তর / সম্পর্ক</th>
                      <th className="p-2 border-b">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mainIncomeHeads.map(main => {
                      const subs = incomeHeads.filter(h => h.parentId === main.id);
                      return (
                        <React.Fragment key={main.id}>
                          <tr className="bg-slate-50 font-bold">
                            <td className="p-2 font-mono">{main.code}</td>
                            <td className="p-2">{main.nameBn}</td>
                            <td className="p-2 text-slate-500">{main.nameEn || '—'}</td>
                            <td className="p-2 text-emerald-700">প্রধান খাত</td>
                            <td className="p-2">{main.status || 'ACTIVE'}</td>
                          </tr>
                          {subs.map(sub => (
                            <tr key={sub.id} className="text-slate-600">
                              <td className="p-2 pl-6 font-mono text-slate-500">{sub.code}</td>
                              <td className="p-2 pl-6">↳ {sub.nameBn}</td>
                              <td className="p-2 text-slate-400">{sub.nameEn || '—'}</td>
                              <td className="p-2 text-slate-400">উপ-খাত</td>
                              <td className="p-2">{sub.status || 'ACTIVE'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Expense Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-rose-900 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                  📤 ব্যয়ের হিসাব খাতসমূহ (Expense Heads)
                </h4>
                <table className="w-full text-xs text-left border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 border-b">কোড</th>
                      <th className="p-2 border-b">খাতের নাম (বাংলা)</th>
                      <th className="p-2 border-b">English Name</th>
                      <th className="p-2 border-b">স্তর / সম্পর্ক</th>
                      <th className="p-2 border-b">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {mainExpenseHeads.map(main => {
                      const subs = expenseHeads.filter(h => h.parentId === main.id);
                      return (
                        <React.Fragment key={main.id}>
                          <tr className="bg-slate-50 font-bold">
                            <td className="p-2 font-mono">{main.code}</td>
                            <td className="p-2">{main.nameBn}</td>
                            <td className="p-2 text-slate-500">{main.nameEn || '—'}</td>
                            <td className="p-2 text-rose-700">প্রধান খাত</td>
                            <td className="p-2">{main.status || 'ACTIVE'}</td>
                          </tr>
                          {subs.map(sub => (
                            <tr key={sub.id} className="text-slate-600">
                              <td className="p-2 pl-6 font-mono text-slate-500">{sub.code}</td>
                              <td className="p-2 pl-6">↳ {sub.nameBn}</td>
                              <td className="p-2 text-slate-400">{sub.nameEn || '—'}</td>
                              <td className="p-2 text-slate-400">উপ-খাত</td>
                              <td className="p-2">{sub.status || 'ACTIVE'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

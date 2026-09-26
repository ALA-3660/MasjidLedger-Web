import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Printer,
  Download,
  Calendar,
  Layers,
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock,
  RefreshCw,
  FolderGit2,
  Briefcase,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Mosque,
  User,
  Budget,
  BudgetLine,
  AccountHead,
  FinancialAccount,
  Staff,
  MosqueAsset,
  MosqueProperty,
  ExpenseEntry,
  CommitteeActionPlan,
} from '../types';
import { api } from '../lib/api';
import { exportToXlsx, getDefaultDateFilterState } from '../lib/reportingEngine';
import { buildExpenseReportDataset } from '../lib/expenseReportingService';
import { hasPermission } from '../lib/permissions';
import {
  buildBudgetControlDataset,
  formatCurrencyBn,
  formatPercentBn,
  toBnDigits,
  getBudgetStatusMeta,
  getBudgetLifecycleStatusLabel,
  getBudgetTypeLabel,
} from '../lib/budgetService';
import { CreateOrEditBudgetModal, ReviseBudgetModal } from './budget/BudgetModals';
import { BudgetPrintPreviewModal } from './budget/BudgetPrintPreviewModal';

export type BudgetSubTab =
  | 'dashboard'
  | 'planning'
  | 'register'
  | 'vs_actual'
  | 'monthly'
  | 'headwise'
  | 'projects'
  | 'warnings'
  | 'analysis'
  | 'export';

interface BudgetControlViewProps {
  currentMosque?: Mosque | null;
  currentUser: User | null;
  expenses: ExpenseEntry[];
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
  staff?: Staff[];
  assets?: MosqueAsset[];
  properties?: MosqueProperty[];
  onNavigateToNewExpense?: () => void;
}

export const BudgetControlView: React.FC<BudgetControlViewProps> = ({
  currentMosque,
  currentUser,
  expenses,
  accountHeads,
  accounts,
  staff,
  assets,
  properties,
  onNavigateToNewExpense,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<BudgetSubTab>('dashboard');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [currentLines, setCurrentLines] = useState<BudgetLine[]>([]);
  const [actionPlans, setActionPlans] = useState<CommitteeActionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Search & Filter in tables
  const [searchQuery, setSearchQuery] = useState('');
  const [registerStatusFilter, setRegisterStatusFilter] = useState<string>('ALL');
  const [expandedHeadIds, setExpandedHeadIds] = useState<Record<string, boolean>>({});

  // 1. Load Budgets & Action Plans
  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const [fetchedBudgets, fetchedPlans] = await Promise.all([
        api.getBudgets({ includeArchived: true }),
        api.getActionPlans().catch(() => []),
      ]);

      setBudgets(fetchedBudgets);
      setActionPlans(fetchedPlans);

      // Select active or latest budget
      if (fetchedBudgets.length > 0) {
        const activeOne =
          fetchedBudgets.find((b) => b.status === 'ACTIVE' && !b.isArchived) ||
          fetchedBudgets.find((b) => b.status === 'APPROVED' && !b.isArchived) ||
          fetchedBudgets[0];

        setSelectedBudgetId(activeOne.id);
        const details = await api.getBudget(activeOne.id);
        setCurrentLines(details.lines);
      } else {
        setSelectedBudgetId('');
        setCurrentLines([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেট ডেটা লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMosque?.id]);

  // Handle Switching Selected Budget
  const handleSelectBudget = async (id: string) => {
    setSelectedBudgetId(id);
    try {
      const details = await api.getBudget(id);
      setCurrentLines(details.lines);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেটের বিস্তারিত তথ্য পেতে সমস্যা হয়েছে।');
    }
  };

  const selectedBudget = useMemo(() => {
    return budgets.find((b) => b.id === selectedBudgetId) || null;
  }, [budgets, selectedBudgetId]);

  // 2. Canonical E5-A Expense Dataset
  const expenseDataset = useMemo(() => {
    return buildExpenseReportDataset({
      expenses,
      currentMosqueId: currentMosque?.id,
      accounts,
      staffList: staff,
      assets,
      properties,
      filters: {
        dateFilter: {
          ...getDefaultDateFilterState(),
          mode: 'QUICK',
          quickFilter: 'ALL',
        },
      },
    });
  }, [expenses, currentMosque?.id, accounts, staff, assets, properties]);

  // 3. Calculation Engine: BudgetControlDataset
  const controlDataset = useMemo(() => {
    return buildBudgetControlDataset({
      budget: selectedBudget,
      budgetLines: currentLines,
      expenseDataset,
      allBudgets: budgets,
      actionPlans,
    });
  }, [selectedBudget, currentLines, expenseDataset, budgets, actionPlans]);

  // Quick Action Handlers
  const handleSaveBudget = async (data: {
    budget: Partial<Budget>;
    lines: Partial<BudgetLine>[];
    submitImmediately?: boolean;
  }) => {
    if (budgetToEdit) {
      const res = await api.updateBudget(budgetToEdit.id, data);
      if (data.submitImmediately) {
        await api.submitBudget(res.budget.id);
      }
      setSuccessMessage('খসড়া বাজেট সফলভাবে সংরক্ষণ ও হালনাগাদ করা হয়েছে।');
    } else {
      const res = await api.createBudget(data);
      if (data.submitImmediately) {
        await api.submitBudget(res.budget.id);
      }
      setSuccessMessage('নতুন বাজেট সফলভাবে প্রণয়ন করা হয়েছে।');
    }
    await loadData();
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleSubmitBudget = async (id: string) => {
    try {
      await api.submitBudget(id);
      setSuccessMessage('বাজেটটি অনুমোদনের জন্য সফলভাবে পেশ করা হয়েছে।');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেট সাবমিট করতে সমস্যা হয়েছে।');
    }
  };

  const handleApproveBudget = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বাজেটটি চূড়ান্ত অনুমোদন ও সক্রিয় করতে চান?')) return;
    try {
      await api.approveBudget(id);
      setSuccessMessage('বাজেটটি চূড়ান্তভাবে অনুমোদিত ও সক্রিয় করা হয়েছে।');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেট অনুমোদন করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleReviseBudget = async (newLines: Partial<BudgetLine>[], notes: string) => {
    if (!selectedBudget) return;
    const res = await api.reviseBudget(selectedBudget.id, { lines: newLines, notes });
    setSuccessMessage(`বাজেটটি সফলভাবে সংশোধন করা হয়েছে (রিভিশন #${toBnDigits(res.budget.revisionNumber)})।`);
    await loadData();
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleCloseBudget = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই বাজেটের মেয়াদ সমাপ্ত (Close) করতে চান?')) return;
    try {
      await api.closeBudget(id, 'মেয়াদ পূর্ণ হয়েছে');
      setSuccessMessage('বাজেটের মেয়াদ সমাপ্ত করা হয়েছে।');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেট সমাপ্ত করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই খসড়া বাজেটটি মুছে ফেলতে চান?')) return;
    try {
      await api.deleteBudget(id);
      setSuccessMessage('খসড়া বাজেট সফলভাবে মুছে ফেলা হয়েছে।');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেট মুছতে ব্যর্থ হয়েছে।');
    }
  };

  // RBAC Permission checks
  const canCreate = hasPermission(currentUser, 'CREATE_BUDGET');
  const canEdit = hasPermission(currentUser, 'EDIT_BUDGET');
  const canApprove = hasPermission(currentUser, 'APPROVE_BUDGET');
  const canRevise = hasPermission(currentUser, 'REVISE_BUDGET');
  const canClose = hasPermission(currentUser, 'CLOSE_BUDGET');
  const canExport = hasPermission(currentUser, 'EXPORT_BUDGET_REPORT') || hasPermission(currentUser, 'EXPORT_REPORT');

  // Multi-sheet Excel Export (Canonical BudgetControlDataset: 3-Sheet Architecture)
  const handleExportExcel = () => {
    if (!canExport) {
      setErrorMessage('রিপোর্ট এক্সপোর্ট করার অনুমতি আপনার নেই।');
      return;
    }

    const periodLabel = selectedBudget
      ? `${toBnDigits(selectedBudget.startDate)} হতে ${toBnDigits(selectedBudget.endDate)}`
      : 'সকল বাজেট';

    const mosqueName = currentMosque?.nameBn || currentMosque?.name || 'মসজিদ কর্তৃপক্ষ';
    const reportName = 'বাজেট ও ব্যয় নিয়ন্ত্রণ বিবরণী (Audit Ready)';
    const preparedDateTime = new Date().toLocaleString('bn-BD');
    const budgetName = selectedBudget?.budgetName || 'সকল সক্রিয় বাজেট';
    const budgetTypeLabel = getBudgetTypeLabel(selectedBudget?.budgetType || 'OPERATING');
    const warningCount = controlDataset.summary.warningCount + controlDataset.summary.highUtilizationCount;
    const overBudgetCount = controlDataset.summary.overBudgetCount;

    // Sheet 1: বাজেট সারসংক্ষেপ (Summary)
    const sheet1Aoa: any[][] = [
      [mosqueName],
      [reportName],
      ['বাজেট সারসংক্ষেপ'],
      [],
      ['মেট্রিক / সূচক', 'মান / পরিমাণ'],
      ['Mosque Name', mosqueName],
      ['Report Name', reportName],
      ['Period', periodLabel],
      ['Prepared Date/Time', preparedDateTime],
      ['Budget Name', budgetName],
      ['Budget Type', budgetTypeLabel],
      ['Total Planned', controlDataset.summary.totalPlannedAmount],
      ['Total Actual', controlDataset.summary.totalActualAmount],
      ['Remaining', controlDataset.summary.remainingAmount],
      ['Utilization', Number(controlDataset.summary.overallUtilizationPercent.toFixed(1))],
      ['Warning Count', warningCount],
      ['Over Budget Count', overBudgetCount],
    ];

    // Sheet 2: বাজেটের বিস্তারিত (Budget Lines)
    const sheet2Aoa: any[][] = [
      [mosqueName],
      ['বাজেটের বিস্তারিত খাতভিত্তিক বিবরণী'],
      [`সময়সীমা: ${periodLabel} | প্রস্তুত: ${preparedDateTime}`],
      [],
      [
        'Budget',
        'Budget Type',
        'Main Head',
        'Sub Head',
        'Planned Amount',
        'Actual Amount',
        'Remaining',
        'Variance',
        'Utilization %',
        'Status',
        'Project',
      ],
    ];

    controlDataset.lines.forEach((line) => {
      const projectTitle = line.projectId
        ? actionPlans.find((p) => p.id === line.projectId)?.title || 'সংযুক্ত প্রকল্প'
        : '—';

      sheet2Aoa.push([
        line.budgetName,
        getBudgetTypeLabel(line.budgetType),
        line.mainHeadNameBn,
        line.subHeadNameBn || '—',
        line.plannedAmount,
        line.actualAmount,
        line.remainingAmount,
        line.remainingAmount,
        Number(line.utilizationPercent.toFixed(1)),
        getBudgetStatusMeta(line.warningStatus).labelBn,
        projectTitle,
      ]);
    });

    // Grand total row for Sheet 2
    sheet2Aoa.push([
      'সর্বমোট',
      '',
      '',
      '',
      controlDataset.summary.totalPlannedAmount,
      controlDataset.summary.totalActualAmount,
      controlDataset.summary.remainingAmount,
      controlDataset.summary.remainingAmount,
      Number(controlDataset.summary.overallUtilizationPercent.toFixed(1)),
      controlDataset.summary.isOverBudget ? 'বাজেট অতিক্রম' : 'সীমার মধ্যে',
      '',
    ]);

    // Sheet 3: বাজেট সতর্কতা (Over Budget / Alerts)
    const alertLines = controlDataset.lines.filter(
      (l) => l.warningStatus === 'WARNING' || l.warningStatus === 'HIGH_UTILIZATION' || l.warningStatus === 'OVER_BUDGET'
    );

    const sheet3Aoa: any[][] = [
      [mosqueName],
      ['বাজেট সতর্কতা ও অতিক্রমকারী খাতের তালিকা'],
      [`সময়সীমা: ${periodLabel} | প্রস্তুত: ${preparedDateTime}`],
      [],
      [
        'Budget',
        'Main Head',
        'Sub Head',
        'Planned',
        'Actual',
        'Difference',
        'Utilization',
        'Alert Status',
      ],
    ];

    if (alertLines.length === 0) {
      sheet3Aoa.push([
        selectedBudget?.budgetName || 'সকল বাজেট',
        'কোনো সতর্কতাজনক বা বাজেট অতিক্রমকারী খাত নেই',
        '—',
        0,
        0,
        0,
        0,
        'সব খাত সীমার মধ্যে রয়েছে',
      ]);
    } else {
      alertLines.forEach((line) => {
        sheet3Aoa.push([
          line.budgetName,
          line.mainHeadNameBn,
          line.subHeadNameBn || '—',
          line.plannedAmount,
          line.actualAmount,
          line.remainingAmount,
          Number(line.utilizationPercent.toFixed(1)),
          getBudgetStatusMeta(line.warningStatus).labelBn,
        ]);
      });

      // Grand total row for Sheet 3
      const alertPlannedSum = alertLines.reduce((acc, l) => acc + l.plannedAmount, 0);
      const alertActualSum = alertLines.reduce((acc, l) => acc + l.actualAmount, 0);
      const alertDiffSum = alertPlannedSum - alertActualSum;
      const alertUtil = alertPlannedSum > 0 ? Number(((alertActualSum / alertPlannedSum) * 100).toFixed(1)) : 0;

      sheet3Aoa.push([
        'সর্বমোট সতর্কতা খাত',
        '',
        '',
        alertPlannedSum,
        alertActualSum,
        alertDiffSum,
        alertUtil,
        `${alertLines.length} টি সতর্কতা`,
      ]);
    }

    const sheets = [
      {
        name: 'বাজেট সারসংক্ষেপ',
        aoa: sheet1Aoa,
        colWidths: [{ wch: 32 }, { wch: 32 }],
      },
      {
        name: 'বাজেটের বিস্তারিত',
        aoa: sheet2Aoa,
        colWidths: [
          { wch: 25 },
          { wch: 16 },
          { wch: 24 },
          { wch: 22 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 14 },
          { wch: 16 },
          { wch: 24 },
        ],
      },
      {
        name: 'বাজেট সতর্কতা',
        aoa: sheet3Aoa,
        colWidths: [
          { wch: 25 },
          { wch: 24 },
          { wch: 22 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 14 },
          { wch: 20 },
        ],
      },
    ];

    exportToXlsx({
      filename: `Budget_Control_Report_${selectedBudget?.budgetName || 'Masjid'}_${Date.now()}.xlsx`,
      sheetName: 'বাজেট সারসংক্ষেপ',
      mosqueName,
      reportTitle: reportName,
      periodLabel,
      columns: [],
      data: [],
      sheets,
    });
  };

  const toggleHeadExpanded = (headId: string) => {
    setExpandedHeadIds((prev) => ({ ...prev, [headId]: !prev[headId] }));
  };

  // Sub-tabs list
  const subTabs: { id: BudgetSubTab; label: string; icon: any; count?: number }[] = [
    { id: 'dashboard', label: '📊 ড্যাশবোর্ড', icon: PieChart },
    { id: 'vs_actual', label: '📊 বাজেট বনাম ব্যয়', icon: TrendingUp },
    { id: 'planning', label: '📝 বাজেট পরিকল্পনা', icon: FileText },
    { id: 'register', label: '📋 বাজেট রেজিস্টার', icon: Layers, count: budgets.length },
    { id: 'monthly', label: '📅 মাসিক বাজেট', icon: Calendar },
    { id: 'headwise', label: '📑 খাতভিত্তিক বাজেট', icon: Layers },
    { id: 'projects', label: '🏗️ প্রকল্প ও উন্নয়ন', icon: Briefcase, count: actionPlans.length },
    {
      id: 'warnings',
      label: '⚠️ সতর্কতা ও অতিক্রম',
      icon: AlertTriangle,
      count: controlDataset.summary.overBudgetCount + controlDataset.summary.warningCount,
    },
    { id: 'analysis', label: '🔍 বিশ্লেষণ ও অন্তর্দৃষ্টি', icon: FolderGit2 },
    { id: 'export', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', icon: Printer },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header Banner & Budget Selector */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  🎯 বাজেট ও ব্যয় নিয়ন্ত্রণ
                </h2>
                {selectedBudget && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      selectedBudget.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedBudget.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {getBudgetLifecycleStatusLabel(selectedBudget.status)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদের আর্থিক পরিকল্পনা প্রণয়ন, খসড়া অনুমোদন, রিভিশন ও রিয়েল-টাইম ব্যয় পর্যবেক্ষণ
              </p>
            </div>
          </div>

          {/* Budget Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {budgets.length > 0 && (
              <div className="relative min-w-[200px]">
                <select
                  value={selectedBudgetId}
                  onChange={(e) => handleSelectBudget(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.budgetName} ({getBudgetLifecycleStatusLabel(b.status)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {canCreate && (
              <button
                onClick={() => {
                  setBudgetToEdit(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন বাজেট</span>
              </button>
            )}

            {canRevise && selectedBudget && (selectedBudget.status === 'ACTIVE' || selectedBudget.status === 'APPROVED') && (
              <button
                onClick={() => setIsReviseModalOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center space-x-1 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>রিভাইজ</span>
              </button>
            )}

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center space-x-1 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            {canExport && (
              <button
                onClick={handleExportExcel}
                className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center space-x-1 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Sub-Tab Navigation Bar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-thin">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {toBnDigits(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Tab Content */}

      {/* -------------------------------------------------------------
          SUB-TAB 1: DASHBOARD
      -------------------------------------------------------------- */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">মোট প্রাক্কলিত বাজেট</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-secondary tabular-nums">
                {formatCurrencyBn(controlDataset.summary.totalPlannedAmount)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {selectedBudget ? selectedBudget.budgetName : 'সক্রিয় কোনো বাজেট নেই'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">বাস্তব অর্জিত ব্যয়</span>
              <div className="text-xl sm:text-2xl font-black text-rose-700 font-secondary tabular-nums">
                {formatCurrencyBn(controlDataset.summary.totalActualAmount)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                ব্যয় হার:{' '}
                <strong className="text-slate-800">
                  {formatPercentBn(controlDataset.summary.overallUtilizationPercent)}
                </strong>
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">অবশিষ্টাংশ / উদ্বৃত্ত</span>
              <div
                className={`text-xl sm:text-2xl font-black font-secondary tabular-nums ${
                  controlDataset.summary.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrencyBn(controlDataset.summary.remainingAmount)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {controlDataset.summary.remainingAmount < 0 ? '⚠️ বাজেট অতিক্রম ঘটেছে' : '✓ বরাদ্দ সুরক্ষিত রয়েছে'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">সতর্কতা ও অতিক্রম</span>
              <div className="flex items-center space-x-2">
                <div className="text-xl sm:text-2xl font-black text-rose-600 font-secondary tabular-nums">
                  {toBnDigits(controlDataset.summary.overBudgetCount)}
                </div>
                <span className="text-xs text-slate-500">অতিক্রম /</span>
                <div className="text-xl sm:text-2xl font-black text-amber-600 font-secondary tabular-nums">
                  {toBnDigits(controlDataset.summary.warningCount)}
                </div>
                <span className="text-xs text-slate-500">সতর্কতা</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                মোট {toBnDigits(controlDataset.lines.length)}টি খাতের বিশ্লেষণ
              </span>
            </div>
          </div>

          {/* Alert Banner if Over Budget */}
          {controlDataset.overBudgetItems.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-rose-900">
                  ⚠️ সতর্কতা: {toBnDigits(controlDataset.overBudgetItems.length)}টি খাতে অনুমোদিত বাজেট অতিক্রম করেছে!
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  নিম্নোক্ত খাতগুলোতে অর্জিত ব্যয় বরাদ্দকৃত টাকার চেয়ে বেশি হয়েছে। বাজেট সংশোধন (Revise) অথবা ব্যয়ের রাশ
                  টানা প্রয়োজন:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {controlDataset.overBudgetItems.map((item) => (
                    <span
                      key={item.id}
                      className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-800 shadow-2xs font-secondary tabular-nums"
                    >
                      {item.mainHeadNameBn}: {formatCurrencyBn(item.actualAmount)} /{' '}
                      {formatCurrencyBn(item.plannedAmount)} ({formatPercentBn(item.utilizationPercent)})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Comparison Chart & Top Heads */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">মাসভিত্তিক বাজেট বনাম বাস্তব ব্যয়</h3>
              <p className="text-xs text-slate-500 mb-4">মাসওয়ারী প্রাক্কলিত বরাদ্দ ও প্রকৃত পরিশোধের তুলনা</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={controlDataset.monthlyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="monthNameBn" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val: any) => [formatCurrencyBn(val), '']}
                      labelFormatter={(l) => `মাস: ${l}`}
                    />
                    <Bar dataKey="plannedAmount" name="বাজেট" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualAmount" name="বাস্তব ব্যয়" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-1">শীর্ষ ব্যয়িত খাতসমূহ</h3>
              <p className="text-xs text-slate-500 mb-4">সর্বোচ্চ ব্যবহারকৃত ব্যয়ের খাত</p>
              <div className="space-y-3">
                {controlDataset.lines
                  .slice()
                  .sort((a, b) => b.actualAmount - a.actualAmount)
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-bold text-slate-900 truncate max-w-[150px]">
                          {item.mainHeadNameBn}
                        </span>
                        <span className="font-bold text-rose-700 font-secondary tabular-nums">
                          {formatCurrencyBn(item.actualAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.utilizationPercent >= 100
                              ? 'bg-rose-600'
                              : item.utilizationPercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, item.utilizationPercent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                        <span>বাজেট: {formatCurrencyBn(item.plannedAmount)}</span>
                        <span>{formatPercentBn(item.utilizationPercent)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 2: BUDGET VS ACTUAL TABLE
      -------------------------------------------------------------- */}
      {activeSubTab === 'vs_actual' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">📊 বাজেট বনাম বাস্তব ব্যয় তুলনা তালিকা</h3>
              <p className="text-xs text-slate-500">
                {selectedBudget?.budgetName || 'বাজেট'} অনুযায়ী প্রতিটি খাতের প্রাক্কলন ও ব্যয়ের ব্যবধান
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="খাত অনুসন্ধান করুন..."
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                  <th className="p-2.5 border-r border-slate-200">খাত ও বিবরণ</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">প্রাক্কলিত বাজেট</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">বাস্তব ব্যয়</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">অবশিষ্টাংশ / ব্যবধান</th>
                  <th className="p-2.5 border-r border-slate-200 text-center w-36">অগ্রগতি ও হার %</th>
                  <th className="p-2.5 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {controlDataset.lines
                  .filter(
                    (l) =>
                      !searchQuery ||
                      l.mainHeadNameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (l.subHeadNameBn && l.subHeadNameBn.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((line) => {
                    const meta = getBudgetStatusMeta(line.warningStatus);
                    return (
                      <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                        <td className="p-2.5 border-r border-slate-200">
                          <div className="font-bold text-slate-900">{line.mainHeadNameBn}</div>
                          {line.subHeadNameBn && (
                            <div className="text-[11px] text-slate-500 font-medium">{line.subHeadNameBn}</div>
                          )}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-bold text-slate-800 font-secondary tabular-nums">
                          {formatCurrencyBn(line.plannedAmount)}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-bold text-rose-700 font-secondary tabular-nums">
                          {formatCurrencyBn(line.actualAmount)}
                        </td>
                        <td
                          className={`p-2.5 border-r border-slate-200 text-right font-bold font-secondary tabular-nums ${
                            line.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrencyBn(line.remainingAmount)}
                        </td>
                        <td className="p-2.5 border-r border-slate-200">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span>ব্যয় হার</span>
                            <span className="font-bold font-secondary tabular-nums text-slate-800">
                              {formatPercentBn(line.utilizationPercent)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                line.utilizationPercent >= 100
                                  ? 'bg-rose-600'
                                  : line.utilizationPercent >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.min(100, line.utilizationPercent)}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.badgeClass}`}>
                            {meta.labelBn}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                  <td className="p-3 border-r border-slate-200 text-right">সর্বমোট:</td>
                  <td className="p-3 border-r border-slate-200 text-right font-secondary tabular-nums">
                    {formatCurrencyBn(controlDataset.summary.totalPlannedAmount)}
                  </td>
                  <td className="p-3 border-r border-slate-200 text-right text-rose-700 font-secondary tabular-nums">
                    {formatCurrencyBn(controlDataset.summary.totalActualAmount)}
                  </td>
                  <td
                    className={`p-3 border-r border-slate-200 text-right font-secondary tabular-nums ${
                      controlDataset.summary.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatCurrencyBn(controlDataset.summary.remainingAmount)}
                  </td>
                  <td className="p-3 border-r border-slate-200 text-center font-secondary tabular-nums">
                    {formatPercentBn(controlDataset.summary.overallUtilizationPercent)}
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-xs font-bold text-slate-700">
                      {controlDataset.summary.isOverBudget ? '⚠️ বাজেট অতিক্রম' : '✓ সীমার মধ্যে'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 3: PLANNING (Interactive Draft / Editor)
      -------------------------------------------------------------- */}
      {activeSubTab === 'planning' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">📝 বাজেট পরিকল্পনা ও খসড়া প্রণয়ন</h3>
              <p className="text-xs text-slate-500">
                নতুন অর্থবছরের জন্য বিভিন্ন খাতের ব্যয় প্রাক্কলন প্রস্তুত করুন
              </p>
            </div>
            <button
              onClick={() => {
                setBudgetToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন খসড়া তৈরি করুন</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-800 mb-2">খসড়া (Draft) বাজেটসমূহ:</h4>
              {budgets.filter((b) => b.status === 'DRAFT').length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">বর্তমানে কোনো খসড়া বাজেট নেই।</p>
              ) : (
                <div className="space-y-2">
                  {budgets
                    .filter((b) => b.status === 'DRAFT')
                    .map((b) => (
                      <div
                        key={b.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{b.budgetName}</div>
                          <div className="text-[11px] text-slate-500">
                            প্রাক্কলিত: <strong className="text-slate-800 font-secondary tabular-nums">{formatCurrencyBn(b.totalPlannedAmount)}</strong>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={async () => {
                              const res = await api.getBudget(b.id);
                              setBudgetToEdit(res.budget);
                              setCurrentLines(res.lines);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                            title="সম্পাদনা"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSubmitBudget(b.id)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                          >
                            সাবমিট
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(b.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition"
                            title="মুছুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-800 mb-2">অনুমোদনের জন্য অপেক্ষমান (Submitted):</h4>
              {budgets.filter((b) => b.status === 'SUBMITTED').length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">অনুমোদনের অপেক্ষায় কোনো বাজেট নেই।</p>
              ) : (
                <div className="space-y-2">
                  {budgets
                    .filter((b) => b.status === 'SUBMITTED')
                    .map((b) => (
                      <div
                        key={b.id}
                        className="p-3 bg-white border border-amber-200 rounded-xl flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{b.budgetName}</div>
                          <div className="text-[11px] text-slate-500">
                            প্রস্তাবক: {b.createdByName || 'হিসাবরক্ষক'} • বরাদ্দ:{' '}
                            <strong className="text-slate-800 font-secondary tabular-nums">
                              {formatCurrencyBn(b.totalPlannedAmount)}
                            </strong>
                          </div>
                        </div>
                        {canApprove && (
                          <button
                            onClick={() => handleApproveBudget(b.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>অনুমোদন করুন</span>
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 4: BUDGET REGISTER (Comprehensive Master Table)
      -------------------------------------------------------------- */}
      {activeSubTab === 'register' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">📋 বাজেট রেজিস্টার ও ইতিহাস</h3>
              <p className="text-xs text-slate-500">মসজিদের সকল বার্ষিক ও প্রকল্প বাজেটের তালিকা এবং রিভিশন লগ</p>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={registerStatusFilter}
                onChange={(e) => setRegisterStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
              >
                <option value="ALL">সকল স্ট্যাটাস</option>
                <option value="ACTIVE">সক্রিয় (Active)</option>
                <option value="DRAFT">খসড়া (Draft)</option>
                <option value="SUBMITTED">পেশকৃত (Submitted)</option>
                <option value="REVISED">সংশোধিত (Revised)</option>
                <option value="CLOSED">সমাপ্ত (Closed)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                  <th className="p-2.5 border-r border-slate-200">বাজেট শিরোনাম</th>
                  <th className="p-2.5 border-r border-slate-200">ধরন</th>
                  <th className="p-2.5 border-r border-slate-200">মেয়াদকাল</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">রিভিশন</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">মোট প্রাক্কলন</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">স্ট্যাটাস</th>
                  <th className="p-2.5 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {budgets
                  .filter((b) => registerStatusFilter === 'ALL' || b.status === registerStatusFilter)
                  .map((b) => (
                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{b.budgetName}</div>
                        {b.notes && <div className="text-[11px] text-slate-400">{b.notes}</div>}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-700">
                        {getBudgetTypeLabel(b.budgetType)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-600 font-secondary tabular-nums">
                        {toBnDigits(b.startDate)} হতে {toBnDigits(b.endDate)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center font-bold font-secondary tabular-nums text-slate-700">
                        #{toBnDigits(b.revisionNumber || 1)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-right font-black text-slate-900 font-secondary tabular-nums">
                        {formatCurrencyBn(b.totalPlannedAmount)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800'
                              : b.status === 'DRAFT'
                              ? 'bg-amber-100 text-amber-800'
                              : b.status === 'REVISED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getBudgetLifecycleStatusLabel(b.status)}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleSelectBudget(b.id)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && b.status === 'DRAFT' && (
                            <button
                              onClick={() => handleDeleteDraft(b.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="মুছুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {canRevise && (b.status === 'ACTIVE' || b.status === 'APPROVED') && (
                            <button
                              onClick={() => {
                                handleSelectBudget(b.id);
                                setIsReviseModalOpen(true);
                              }}
                              className="px-2 py-0.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-[10px] font-bold border border-amber-200 cursor-pointer"
                            >
                              রিভাইজ
                            </button>
                          )}
                          {canClose && b.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleCloseBudget(b.id)}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[10px] font-bold cursor-pointer"
                            >
                              ক্লোজ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 5: MONTHLY BUDGET BREAKDOWN
      -------------------------------------------------------------- */}
      {activeSubTab === 'monthly' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">📅 মাসিক বাজেট বনাম বাস্তব ব্যয় বিশ্লেষণ</h3>
            <p className="text-xs text-slate-500">প্রতি মাসের বরাদ্দ এবং প্রকৃত ব্যয়ের হ্রাস-বৃদ্ধি পর্যবেক্ষণ</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                  <th className="p-2.5 border-r border-slate-200">মাস</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">প্রাক্কলিত বরাদ্দ</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">প্রকৃত ব্যয়</th>
                  <th className="p-2.5 border-r border-slate-200 text-right">অবশিষ্টাংশ</th>
                  <th className="p-2.5 border-r border-slate-200 text-center">ব্যয় হার %</th>
                  <th className="p-2.5 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {controlDataset.monthlyBreakdown.map((m) => {
                  const meta = getBudgetStatusMeta(m.status);
                  return (
                    <tr key={m.monthKey} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{m.monthNameBn}</td>
                      <td className="p-2.5 border-r border-slate-200 text-right font-secondary tabular-nums text-slate-800">
                        {formatCurrencyBn(m.plannedAmount)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-right font-bold text-rose-700 font-secondary tabular-nums">
                        {formatCurrencyBn(m.actualAmount)}
                      </td>
                      <td
                        className={`p-2.5 border-r border-slate-200 text-right font-bold font-secondary tabular-nums ${
                          m.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrencyBn(m.remainingAmount)}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center font-bold font-secondary tabular-nums text-slate-800">
                        {formatPercentBn(m.utilizationPercent)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass}`}>
                          {meta.labelBn}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 6: HEAD-WISE DRILL DOWN
      -------------------------------------------------------------- */}
      {activeSubTab === 'headwise' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">📑 খাতভিত্তিক বাজেট ও উপ-খাত বিশ্লেষণ</h3>
            <p className="text-xs text-slate-500">
              প্রধান ব্যয়ের খাতের অধীনে উপ-খাতসমূহের বিস্তারিত বাজেট ও অর্জিত ব্যয় দেখুন
            </p>
          </div>

          <div className="space-y-3">
            {controlDataset.headwiseBreakdown.map((head) => {
              const isExpanded = !!expandedHeadIds[head.mainHeadId];
              const meta = getBudgetStatusMeta(head.status);
              return (
                <div
                  key={head.mainHeadId}
                  className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white"
                >
                  <div
                    onClick={() => toggleHeadExpanded(head.mainHeadId)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{head.mainHeadNameBn}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          ({toBnDigits(head.subHeads.length)}টি উপ-খাত)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs font-secondary tabular-nums">
                      <div>
                        <span className="text-slate-500 text-[10px] block">বাজেট:</span>
                        <span className="font-bold text-slate-800">{formatCurrencyBn(head.plannedAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">ব্যয়:</span>
                        <span className="font-bold text-rose-700">{formatCurrencyBn(head.actualAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">অবশিষ্টাংশ:</span>
                        <span
                          className={`font-bold ${
                            head.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrencyBn(head.remainingAmount)}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass}`}>
                        {formatPercentBn(head.utilizationPercent)}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-white border-t border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-semibold">
                            <th className="p-2">উপ-খাত</th>
                            <th className="p-2 text-right">প্রাক্কলিত বরাদ্দ</th>
                            <th className="p-2 text-right">প্রকৃত ব্যয়</th>
                            <th className="p-2 text-right">অবশিষ্টাংশ</th>
                            <th className="p-2 text-center">ব্যয় হার %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {head.subHeads.map((sh, sIdx) => (
                            <tr key={sIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-2 font-medium text-slate-800">{sh.subHeadNameBn}</td>
                              <td className="p-2 text-right font-secondary tabular-nums text-slate-700">
                                {formatCurrencyBn(sh.plannedAmount)}
                              </td>
                              <td className="p-2 text-right font-bold text-rose-700 font-secondary tabular-nums">
                                {formatCurrencyBn(sh.actualAmount)}
                              </td>
                              <td
                                className={`p-2 text-right font-bold font-secondary tabular-nums ${
                                  sh.remainingAmount < 0 ? 'text-rose-600' : 'text-emerald-700'
                                }`}
                              >
                                {formatCurrencyBn(sh.remainingAmount)}
                              </td>
                              <td className="p-2 text-center font-secondary tabular-nums text-slate-700 font-bold">
                                {formatPercentBn(sh.utilizationPercent)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 7: PROJECT BUDGETS (Committee Action Plan)
      -------------------------------------------------------------- */}
      {activeSubTab === 'projects' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">🏗️ প্রকল্প ও উন্নয়ন বাজেট মনিটরিং</h3>
            <p className="text-xs text-slate-500">
              কার্যনির্বাহী কমিটির অনুমোদিত কর্মপরিকল্পনা অনুযায়ী অবকাঠামো ও বিশেষ উন্নয়ন ব্যয়ের তদারকি
            </p>
          </div>

          {controlDataset.projectBudgets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              বর্তমানে কোনো সক্রিয় প্রকল্প বা কর্মপরিকল্পনা বাজেট পাওয়া যায়নি।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {controlDataset.projectBudgets.map((proj) => {
                const meta = getBudgetStatusMeta(proj.warningStatus);
                return (
                  <div key={proj.projectId} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{proj.projectName}</h4>
                        <span className="text-[11px] text-slate-500">স্ট্যাটাস: {proj.status}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass}`}>
                        {meta.labelBn}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-secondary tabular-nums bg-white p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 text-[10px] block">অনুমোদিত বাজেট</span>
                        <span className="font-bold text-slate-900">{formatCurrencyBn(proj.approvedBudget)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">বাস্তব ব্যয়</span>
                        <span className="font-bold text-rose-700">{formatCurrencyBn(proj.actualExpense)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">অবশিষ্টাংশ</span>
                        <span
                          className={`font-bold ${
                            proj.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrencyBn(proj.remaining)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>ব্যয় হার</span>
                        <span className="font-bold font-secondary tabular-nums text-slate-800">
                          {formatPercentBn(proj.utilizationPercent)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            proj.utilizationPercent >= 100
                              ? 'bg-rose-600'
                              : proj.utilizationPercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, proj.utilizationPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 8: WARNINGS & OVER-BUDGET ALERTS
      -------------------------------------------------------------- */}
      {activeSubTab === 'warnings' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">⚠️ বাজেট অতিক্রম ও সতর্কতামূলক খাতসমূহ</h3>
              <p className="text-xs text-slate-500">
                যেসব খাতের ব্যয় বরাদ্দের ৭৫% অতিক্রম করেছে বা অনুমোদিত বাজেট ছাড়িয়ে গেছে
              </p>
            </div>

            {controlDataset.warningItems.length === 0 && controlDataset.overBudgetItems.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold">
                ✓ সকল খাতের ব্যয় নিরাপদ সীমার মধ্যে রয়েছে (কোনো সতর্কতা বা অতিরিক্ত ব্যয় নেই)।
              </div>
            ) : (
              <div className="space-y-3">
                {controlDataset.lines
                  .filter((l) => l.warningStatus !== 'NORMAL')
                  .map((item) => {
                    const meta = getBudgetStatusMeta(item.warningStatus);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.warningStatus === 'OVER_BUDGET'
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-amber-50/70 border-amber-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.mainHeadNameBn}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass}`}>
                              {meta.labelBn}
                            </span>
                          </div>
                          {item.subHeadNameBn && (
                            <div className="text-[11px] text-slate-500">{item.subHeadNameBn}</div>
                          )}
                          <div className="text-[11px] text-slate-600 mt-1">
                            প্রাক্কলন: <strong className="font-secondary tabular-nums">{formatCurrencyBn(item.plannedAmount)}</strong> • বাস্তব ব্যয়:{' '}
                            <strong className="text-rose-700 font-secondary tabular-nums">{formatCurrencyBn(item.actualAmount)}</strong>
                          </div>
                        </div>

                        <div className="text-right sm:shrink-0 font-secondary tabular-nums">
                          <div className="text-xs text-slate-500">ব্যয় হার / অবশিষ্টাংশ</div>
                          <div className="text-base font-black text-slate-900">
                            {formatPercentBn(item.utilizationPercent)}
                          </div>
                          <div
                            className={`text-xs font-bold ${
                              item.remainingAmount < 0 ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {item.remainingAmount < 0
                              ? `ঘাটতি: ${formatCurrencyBn(Math.abs(item.remainingAmount))}`
                              : `অবশিষ্ট: ${formatCurrencyBn(item.remainingAmount)}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 9: ANALYSIS & INSIGHTS
      -------------------------------------------------------------- */}
      {activeSubTab === 'analysis' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">🔍 বাজেট ও ব্যয় বিশ্লেষণ ও অন্তর্দৃষ্টি</h3>
            <p className="text-xs text-slate-500">
              মসজিদের আর্থিক স্বাস্থ্য, পরিচালনা বনাম উন্নয়ন অনুপাত ও ভবিষ্যৎ ব্যয়ের পূর্বাভাস
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-700 block">বার্ষিক বাজেট ব্যবহার দক্ষতা</span>
              <div className="text-2xl font-black text-emerald-700 font-secondary tabular-nums">
                {formatPercentBn(controlDataset.summary.overallUtilizationPercent)}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                অনুমোদিত বাজেটের বিপরীতে বাস্তব ব্যয়ের সামগ্রিক অনুপাত।
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-700 block">গড় মাসিক বার্ন রেট (Burn Rate)</span>
              <div className="text-2xl font-black text-slate-900 font-secondary tabular-nums">
                {formatCurrencyBn(
                  controlDataset.monthlyBreakdown.length > 0
                    ? controlDataset.summary.totalActualAmount / controlDataset.monthlyBreakdown.length
                    : 0
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                প্রতি মাসে মসজিদের নিয়মিত ও উন্নয়ন কার্যক্রমের গড় ব্যয়।
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-700 block">সক্রিয় বাজেটের সংখ্যা</span>
              <div className="text-2xl font-black text-slate-900 font-secondary tabular-nums">
                {toBnDigits(controlDataset.summary.activeBudgetsCount)}টি
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                মসজিদ কার্যনির্বাহী কমিটি কর্তৃক অনুমোদিত কার্যকর বাজেট।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 10: REPORT & EXPORT
      -------------------------------------------------------------- */}
      {activeSubTab === 'export' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-black text-slate-900">🖨️ অফিসিয়াল বাজেট রিপোর্ট ও এক্সপোর্ট</h3>
            <p className="text-xs text-slate-500">
              কমিটি অডিট এবং সাধারণ সভার জন্য লেটারহেডযুক্ত প্রিন্ট ও এক্সেল ফাইল প্রস্তুত করুন
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>A4 পেপার প্রিন্ট প্রিভিউ</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                মসজিদের অফিসিয়াল প্যাড / লেটারহেডযুক্ত পূর্ণাঙ্গ বাজেট ও অর্জিত ব্যয় বিবরণী প্রিন্ট করুন। প্রস্তুতকারী,
                যাচাইকারী ও অনুমোদনকারীর তিন স্তরের স্বাক্ষর ব্লক অন্তর্ভুক্ত রয়েছে।
              </p>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট প্রিভিউ খুলুন</span>
              </button>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Download className="w-5 h-5 text-emerald-600" />
                <span>মাল্টি-শীট Excel (.xlsx) ফাইল</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                ৩-শীটবিশিষ্ট পূর্ণাঙ্গ এক্সেল ফাইল: শীট ১-এ নির্বাহী সারসংক্ষেপ, শীট ২-এ বিস্তারিত বাজেট খাত এবং শীট ৩-এ সতর্কতামূলক খাতের তালিকা ডাউনলোড করুন।
              </p>
              <button
                onClick={handleExportExcel}
                disabled={!canExport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Excel ডাউনলোড করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateOrEditBudgetModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setBudgetToEdit(null);
        }}
        budgetToEdit={budgetToEdit}
        initialLines={currentLines}
        accountHeads={accountHeads}
        actionPlans={actionPlans}
        onSave={handleSaveBudget}
      />

      <ReviseBudgetModal
        isOpen={isReviseModalOpen}
        onClose={() => setIsReviseModalOpen(false)}
        budget={selectedBudget}
        currentLines={currentLines}
        onRevise={handleReviseBudget}
      />

      <BudgetPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        dataset={controlDataset}
        currentMosque={currentMosque}
        onExportExcel={handleExportExcel}
      />
    </div>
  );
};

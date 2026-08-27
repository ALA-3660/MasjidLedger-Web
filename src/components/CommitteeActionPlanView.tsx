import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  UserCheck,
  Calendar,
  AlertTriangle,
  FileCheck2,
  ChevronDown,
  Layers,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  History,
  Eye,
  Sliders,
  Check,
  X,
  ArrowRight,
  ExternalLink,
  Kanban,
  ListFilter,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  FileText,
  Upload,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  CommitteeActionPlan,
  CommitteeActionPlanStatus,
  CommitteeActionPlanPriority,
  CommitteeActionPlanAttachment,
  CommitteeTerm,
  CommitteeMember,
  CommitteeMeeting,
  MeetingResolution,
  Mosque
} from '../types';
import { Language, formatDate } from '../lib/i18n';
import { CommitteeActionPlanPrint } from './CommitteeActionPlanPrint';

interface CommitteeActionPlanViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  resolutions: MeetingResolution[];
  mosque?: Mosque | null;
  language: Language;
  currentUser?: any;
  onNavigateToResolutionTab?: () => void;
  onOpenCreateResolution?: (meetingId?: string, decisionId?: string) => void;
}

export const CommitteeActionPlanView: React.FC<CommitteeActionPlanViewProps> = ({
  terms,
  members,
  meetings,
  resolutions,
  mosque,
  language = 'bn',
  currentUser,
  onNavigateToResolutionTab,
  onOpenCreateResolution
}) => {
  // Active Term default
  const activeTerm = useMemo(() => {
    return terms.find(t => t.status === 'ACTIVE') || terms[0];
  }, [terms]);

  const [selectedTermId, setSelectedTermId] = useState<string>(activeTerm?.id || '');

  // Master Action Plans State
  const [plans, setPlans] = useState<CommitteeActionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN' | 'CARDS'>('CARDS');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<CommitteeActionPlan | null>(null);
  const [detailPlan, setDetailPlan] = useState<CommitteeActionPlan | null>(null);

  // Quick Progress Modal State
  const [progressModalPlan, setProgressModalPlan] = useState<CommitteeActionPlan | null>(null);
  const [quickProgress, setQuickProgress] = useState<number>(0);
  const [quickStatus, setQuickStatus] = useState<CommitteeActionPlanStatus>('IN_PROGRESS');
  const [quickActualCost, setQuickActualCost] = useState<number>(0);
  const [quickRemarks, setQuickRemarks] = useState<string>('');
  const [isSavingProgress, setIsSavingProgress] = useState<boolean>(false);

  // Attachment Modal State
  const [attachmentModalPlan, setAttachmentModalPlan] = useState<CommitteeActionPlan | null>(null);
  const [attName, setAttName] = useState<string>('');
  const [attUrl, setAttUrl] = useState<string>('');
  const [attType, setAttType] = useState<'BEFORE_PHOTO' | 'DURING_PHOTO' | 'AFTER_PHOTO' | 'BILL' | 'INVOICE' | 'DOCUMENT'>('DOCUMENT');
  const [isSavingAttachment, setIsSavingAttachment] = useState<boolean>(false);

  // Delete Confirm State
  const [deletingPlan, setDeletingPlan] = useState<CommitteeActionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [activePrintPlan, setActivePrintPlan] = useState<CommitteeActionPlan | null>(null);

  // Form Fields State for Create / Edit Modal
  const [formTermId, setFormTermId] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('উন্নয়ন ও সংস্কার');
  const [formCustomCategory, setFormCustomCategory] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPriority, setFormPriority] = useState<CommitteeActionPlanPriority>('NORMAL');
  const [formResponsibleMemberId, setFormResponsibleMemberId] = useState<string>('');
  const [formAssistantMemberIds, setFormAssistantMemberIds] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formCompletedDate, setFormCompletedDate] = useState<string>('');
  const [formEstimatedBudget, setFormEstimatedBudget] = useState<string>('0');
  const [formActualCost, setFormActualCost] = useState<string>('0');
  const [formFundingSource, setFormFundingSource] = useState<string>('মসজিদ সাধারণ তহবিল');
  const [formFinancialVoucher, setFormFinancialVoucher] = useState<string>('');
  const [formStatus, setFormStatus] = useState<CommitteeActionPlanStatus>('TODO');
  const [formProgressPercentage, setFormProgressPercentage] = useState<number>(0);
  const [formRemarks, setFormRemarks] = useState<string>('');
  const [formResolutionId, setFormResolutionId] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);

  // Helper number formatter
  const toBnNum = (val: number | string | undefined): string => {
    if (val === undefined || val === null) return '০';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(val).replace(/[0-9]/g, d => bnDigits[+d]);
  };

  const formatCurrency = (amt?: number) => {
    if (amt === undefined || amt === null) return '৳০';
    return `৳${Number(amt).toLocaleString('bn-BD')}`;
  };

  // Categories list
  const STANDARD_CATEGORIES = [
    'উন্নয়ন ও সংস্কার',
    'অবকাঠামো ও নির্মাণ',
    'ক্রয় ও সংস্থাপন',
    'ধর্মীয় ও দাওয়াতি কার্যক্রম',
    'আইসিটি ও ডিজিটালাইজেশন',
    'রমজান ও ঈদ ব্যবস্থাপনা',
    'রক্ষণাবেক্ষণ ও পরিচ্ছন্নতা',
    'শিক্ষা ও মক্তব কার্যক্রম',
    'ত্রাণ ও সমাজকল্যাণ',
    'অন্যান্য'
  ];

  // Fetch Action Plans
  const fetchActionPlans = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const token = localStorage.getItem('token');
      const termParam = selectedTermId ? `?termId=${selectedTermId}` : '';
      const res = await fetch(`/api/v1/committee/action-plans${termParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data);
      } else {
        setErrorMessage(data.error?.message || 'কর্মপরিকল্পনা লোড করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'নেটওয়ার্ক সংযোগে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActionPlans();
  }, [selectedTermId]);

  // Today string for overdue checking
  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered List
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchNumber = p.planNumber.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        const matchResp = (p.responsibleMemberName || '').toLowerCase().includes(q);
        const matchRes = (p.resolutionNumber || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNumber && !matchCat && !matchDesc && !matchResp && !matchRes) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'OVERDUE') {
          if (p.status === 'COMPLETED' || p.status === 'CANCELLED' || !p.dueDate || p.dueDate >= todayStr) {
            return false;
          }
        } else if (p.status !== statusFilter) {
          return false;
        }
      }

      // Overdue toggle
      if (overdueOnly) {
        if (p.status === 'COMPLETED' || p.status === 'CANCELLED' || !p.dueDate || p.dueDate >= todayStr) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }

      // Priority
      if (priorityFilter !== 'ALL' && p.priority !== priorityFilter) {
        return false;
      }

      // Member
      if (memberFilter !== 'ALL') {
        const matchMain = p.responsibleMemberId === memberFilter;
        const matchMulti = p.responsibleMemberIds?.includes(memberFilter);
        const matchAsst = p.assistantMemberIds?.includes(memberFilter);
        if (!matchMain && !matchMulti && !matchAsst) return false;
      }

      return true;
    });
  }, [plans, searchQuery, statusFilter, categoryFilter, priorityFilter, memberFilter, overdueOnly, todayStr]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = plans.length;
    const completed = plans.filter(p => p.status === 'COMPLETED').length;
    const inProgress = plans.filter(p => p.status === 'IN_PROGRESS').length;
    const todo = plans.filter(p => p.status === 'TODO').length;
    const onHold = plans.filter(p => p.status === 'ON_HOLD').length;
    const cancelled = plans.filter(p => p.status === 'CANCELLED').length;
    const overdue = plans.filter(p => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && p.dueDate && p.dueDate < todayStr).length;

    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalBudget = plans.reduce((s, p) => s + (Number(p.estimatedBudget) || 0), 0);
    const totalActual = plans.reduce((s, p) => s + (Number(p.actualCost) || 0), 0);
    const variance = totalBudget - totalActual;

    return { total, completed, inProgress, todo, onHold, cancelled, overdue, rate, totalBudget, totalActual, variance };
  }, [plans, todayStr]);

  // Reset form for create
  const handleOpenCreateModal = (importedResId?: string) => {
    setEditingPlan(null);
    setFormError('');
    const today = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormTermId(selectedTermId || activeTerm?.id || terms[0]?.id || '');
    setFormTitle('');
    setFormCategory('উন্নয়ন ও সংস্কার');
    setFormCustomCategory('');
    setFormDescription('');
    setFormPriority('NORMAL');
    setFormResponsibleMemberId(members.length > 0 ? members[0].id : '');
    setFormAssistantMemberIds([]);
    setFormStartDate(today);
    setFormDueDate(defaultEnd);
    setFormCompletedDate('');
    setFormEstimatedBudget('0');
    setFormActualCost('0');
    setFormFundingSource('মসজিদ সাধারণ তহবিল');
    setFormFinancialVoucher('');
    setFormStatus('TODO');
    setFormProgressPercentage(0);
    setFormRemarks('');
    setFormResolutionId(importedResId || '');

    if (importedResId) {
      applyResolutionImport(importedResId);
    }

    setIsCreateModalOpen(true);
  };

  // Populate form for edit
  const handleOpenEditModal = (plan: CommitteeActionPlan) => {
    setEditingPlan(plan);
    setFormError('');

    setFormTermId(plan.termId || selectedTermId || activeTerm?.id || '');
    setFormTitle(plan.title);
    if (STANDARD_CATEGORIES.includes(plan.category)) {
      setFormCategory(plan.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('অন্যান্য');
      setFormCustomCategory(plan.category);
    }
    setFormDescription(plan.description || '');
    setFormPriority(plan.priority || 'NORMAL');
    setFormResponsibleMemberId(plan.responsibleMemberId || '');
    setFormAssistantMemberIds(plan.assistantMemberIds || []);
    setFormStartDate(plan.startDate || '');
    setFormDueDate(plan.dueDate || '');
    setFormCompletedDate(plan.completedDate || '');
    setFormEstimatedBudget(String(plan.estimatedBudget || 0));
    setFormActualCost(String(plan.actualCost || 0));
    setFormFundingSource(plan.fundingSource || 'মসজিদ সাধারণ তহবিল');
    setFormFinancialVoucher(plan.financialVoucherNumber || '');
    setFormStatus(plan.status || 'TODO');
    setFormProgressPercentage(plan.progressPercentage || 0);
    setFormRemarks(plan.remarks || '');
    setFormResolutionId(plan.resolutionId || '');

    setIsCreateModalOpen(true);
  };

  // Resolution Import auto-fill
  const applyResolutionImport = (resId: string) => {
    const res = resolutions.find(r => r.id === resId);
    if (!res) return;

    setFormResolutionId(res.id);
    if (!formTitle || formTitle === '') {
      setFormTitle(res.subject);
    }
    if (!formDescription || formDescription === '') {
      setFormDescription(res.resolutionText || res.taskDescription || '');
    }
    if (res.assignedMemberId) {
      setFormResponsibleMemberId(res.assignedMemberId);
    }
    if (res.financialAmount) {
      setFormEstimatedBudget(String(res.financialAmount));
    }
    if (res.deadline) {
      setFormDueDate(res.deadline);
    }
    if (res.priority) {
      setFormPriority(res.priority as any);
    }
  };

  // Submit Create / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formTitle.trim()) {
      setFormError('কাজের শিরোনাম আবশ্যক।');
      return;
    }
    if (!formStartDate || !formDueDate) {
      setFormError('শুরুর তারিখ ও সমাপ্তির লক্ষ্যমাত্রা আবশ্যক।');
      return;
    }

    const finalCategory = formCategory === 'অন্যান্য' && formCustomCategory.trim()
      ? formCustomCategory.trim()
      : formCategory;

    const payload = {
      termId: formTermId || selectedTermId || activeTerm?.id,
      title: formTitle.trim(),
      category: finalCategory,
      description: formDescription.trim() || undefined,
      priority: formPriority,
      responsibleMemberId: formResponsibleMemberId || undefined,
      assistantMemberIds: formAssistantMemberIds,
      startDate: formStartDate,
      dueDate: formDueDate,
      completedDate: formStatus === 'COMPLETED' ? (formCompletedDate || new Date().toISOString().split('T')[0]) : undefined,
      estimatedBudget: Number(formEstimatedBudget) || 0,
      actualCost: Number(formActualCost) || 0,
      fundingSource: formFundingSource.trim() || undefined,
      financialVoucherNumber: formFinancialVoucher.trim() || undefined,
      status: formStatus,
      progressPercentage: formStatus === 'COMPLETED' ? 100 : Number(formProgressPercentage) || 0,
      remarks: formRemarks.trim() || undefined,
      resolutionId: formResolutionId || undefined
    };

    try {
      setIsSubmittingForm(true);
      const token = localStorage.getItem('token');
      const url = editingPlan
        ? `/api/v1/committee/action-plans/${editingPlan.id}`
        : '/api/v1/committee/action-plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setEditingPlan(null);
        await fetchActionPlans();
      } else {
        setFormError(data.error?.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setFormError(err.message || 'সার্ভার যোগাযোগে ত্রুটি হয়েছে।');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Quick Toggle Complete Checkbox
  const handleToggleComplete = async (plan: CommitteeActionPlan) => {
    const isComplete = plan.status === 'COMPLETED';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/committee/action-plans/${plan.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: !isComplete })
      });
      const data = await res.json();
      if (data.success) {
        setPlans(prev => prev.map(p => p.id === plan.id ? data.data : p));
        if (detailPlan && detailPlan.id === plan.id) {
          setDetailPlan(data.data);
        }
      }
    } catch (err) {
      console.error('Error toggling plan completion:', err);
    }
  };

  // Quick Progress Modal Open
  const handleOpenProgressModal = (plan: CommitteeActionPlan) => {
    setProgressModalPlan(plan);
    setQuickProgress(plan.progressPercentage || 0);
    setQuickStatus(plan.status || 'IN_PROGRESS');
    setQuickActualCost(plan.actualCost || 0);
    setQuickRemarks(plan.remarks || '');
  };

  // Quick Progress Modal Save
  const handleSaveQuickProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressModalPlan) return;

    try {
      setIsSavingProgress(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/committee/action-plans/${progressModalPlan.id}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          progressPercentage: quickProgress,
          status: quickStatus,
          actualCost: quickActualCost,
          remarks: quickRemarks
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlans(prev => prev.map(p => p.id === progressModalPlan.id ? data.data : p));
        if (detailPlan && detailPlan.id === progressModalPlan.id) {
          setDetailPlan(data.data);
        }
        setProgressModalPlan(null);
      }
    } catch (err: any) {
      alert(err.message || 'অগ্রগতি আপডেট ব্যর্থ হয়েছে।');
    } finally {
      setIsSavingProgress(false);
    }
  };

  // Attachment Modal Open
  const handleOpenAttachmentModal = (plan: CommitteeActionPlan) => {
    setAttachmentModalPlan(plan);
    setAttName('');
    setAttUrl('');
    setAttType('DOCUMENT');
  };

  // Save Attachment
  const handleSaveAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachmentModalPlan || !attName.trim() || !attUrl.trim()) return;

    try {
      setIsSavingAttachment(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/committee/action-plans/${attachmentModalPlan.id}/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: attName.trim(),
          url: attUrl.trim(),
          type: attType
        })
      });
      const data = await res.json();
      if (data.success) {
        setPlans(prev => prev.map(p => p.id === attachmentModalPlan.id ? data.data : p));
        if (detailPlan && detailPlan.id === attachmentModalPlan.id) {
          setDetailPlan(data.data);
        }
        setAttachmentModalPlan(null);
      }
    } catch (err: any) {
      alert(err.message || 'সংযুক্তি যোগ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSavingAttachment(false);
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = async (planId: string, attId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই সংযুক্তিটি মুছে ফেলতে চান?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/committee/action-plans/${planId}/attachments/${attId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPlans(prev => prev.map(p => p.id === planId ? data.data : p));
        if (detailPlan && detailPlan.id === planId) {
          setDetailPlan(data.data);
        }
      }
    } catch (err: any) {
      alert(err.message || 'সংযুক্তি মোছা ব্যর্থ হয়েছে।');
    }
  };

  // Delete Plan
  const handleConfirmDelete = async () => {
    if (!deletingPlan) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/committee/action-plans/${deletingPlan.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPlans(prev => prev.filter(p => p.id !== deletingPlan.id));
        if (detailPlan && detailPlan.id === deletingPlan.id) {
          setDetailPlan(null);
        }
        setDeletingPlan(null);
      } else {
        alert(data.error?.message || 'মুছে ফেলতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      alert(err.message || 'সার্ভার ত্রুটি হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  // Priority styling helper
  const getPriorityBadge = (p: CommitteeActionPlanPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] px-2 py-0.5 rounded-full font-black">জরুরি (Urgent)</span>;
      case 'HIGH':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-bold">উচ্চ (High)</span>;
      case 'MEDIUM':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-medium">মাঝারি</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-medium">সাধারণ</span>;
    }
  };

  // Status styling helper
  const getStatusBadge = (s: CommitteeActionPlanStatus, dueDate?: string) => {
    const isOverdue = s !== 'COMPLETED' && s !== 'CANCELLED' && dueDate && dueDate < todayStr;
    if (isOverdue) {
      return (
        <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-xs animate-pulse">
          <AlertCircle className="w-3 h-3" />
          <span>মেয়াদোত্তীর্ণ (Overdue)</span>
        </span>
      );
    }
    switch (s) {
      case 'COMPLETED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> সম্পন্ন (Completed)</span>;
      case 'IN_PROGRESS':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Clock className="w-3 h-3 text-blue-600" /> চলমান (In Progress)</span>;
      case 'TODO':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">পরিকল্পিত (To Do)</span>;
      case 'ON_HOLD':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">স্থগিত (On Hold)</span>;
      case 'CANCELLED':
        return <span className="bg-slate-200 text-slate-700 border border-slate-300 text-[10px] px-2.5 py-0.5 rounded-full font-medium">বাতিল</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. MODULE HERO BANNER & KPI DASHBOARD */}
      <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 border-b border-emerald-800/50 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                <ClipboardList className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>📋 কমিটি কর্মপরিকল্পনা</span>
                  <span className="text-xs bg-emerald-500/30 text-emerald-200 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Committee Action Plan
                  </span>
                </h1>
                <p className="text-xs text-emerald-200/80">
                  বর্তমান পরিষদ মেয়াদে মসজিদের সার্বিক করণীয় কাজ, উন্নয়ন কর্মসূচি ও বাস্তবায়ন অগ্রগতি ট্র্যাকার
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Term selector dropdown */}
            <div className="flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <select
                id="select-action-plan-term"
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                {terms.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.title} {t.status === 'ACTIVE' ? '(সক্রিয়)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-print-action-plans-report"
              onClick={() => {
                setActivePrintPlan(null);
                setIsPrintModalOpen(true);
              }}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>প্রতিবেদন প্রিন্ট</span>
            </button>

            <button
              id="btn-open-create-action-plan"
              onClick={() => handleOpenCreateModal()}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কর্মপরিকল্পনা প্রণয়ন</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5 relative z-10">
          {/* Card 1: Total */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-200/70 font-medium">মোট কর্মপরিকল্পনা</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-white">{toBnNum(stats.total)}টি</span>
              <ClipboardList className="w-4 h-4 text-emerald-400 opacity-60" />
            </div>
          </div>

          {/* Card 2: In Progress */}
          <div className="bg-blue-500/10 backdrop-blur-md p-3.5 rounded-xl border border-blue-500/20 flex flex-col justify-between">
            <span className="text-[11px] text-blue-200 font-medium">চলমান কর্মসূচি</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-blue-300">{toBnNum(stats.inProgress)}টি</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          {/* Card 3: Completed & Rate */}
          <div className="bg-emerald-500/15 backdrop-blur-md p-3.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[11px] text-emerald-200">
              <span>সম্পন্ন কাজ</span>
              <span className="text-[10px] font-bold text-emerald-300 font-mono bg-emerald-900/60 px-1.5 rounded">{toBnNum(stats.rate)}% হার</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-300">{toBnNum(stats.completed)}টি</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* Card 4: Overdue Alert */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            stats.overdue > 0
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
              : 'bg-white/5 border-white/10 text-slate-300'
          }`}>
            <span className="text-[11px] font-medium">মেয়াদোত্তীর্ণ কাজ</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-black ${stats.overdue > 0 ? 'text-rose-300 animate-pulse' : 'text-slate-400'}`}>
                {toBnNum(stats.overdue)}টি
              </span>
              <AlertTriangle className={`w-4 h-4 ${stats.overdue > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            </div>
          </div>

          {/* Card 5: Estimated Budget */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-200/70 font-medium">প্রাক্কলিত মোট বাজেট</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base sm:text-lg font-black text-amber-300 font-mono truncate">{formatCurrency(stats.totalBudget)}</span>
              <DollarSign className="w-4 h-4 text-amber-400 opacity-60 shrink-0" />
            </div>
          </div>

          {/* Card 6: Actual Cost & Variance */}
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[11px] text-emerald-200/70">
              <span>প্রকৃত খরচ</span>
              <span className="text-[9px] text-slate-300">সাশ্রয়: {formatCurrency(stats.variance)}</span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base sm:text-lg font-black text-white font-mono truncate">{formatCurrency(stats.totalActual)}</span>
              <TrendingUp className="w-4 h-4 text-teal-300 opacity-60 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS & VIEW TOGGLE BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-search-action-plans"
              type="text"
              placeholder="কাজের নাম, বিভাগ, রেজোলিউশন নং বা দায়িত্বপ্রাপ্ত সদস্য দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-end sm:self-auto">
            <button
              id="btn-view-mode-cards"
              onClick={() => setViewMode('CARDS')}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'CARDS' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">গ্রিড ভিউ</span>
            </button>

            <button
              id="btn-view-mode-kanban"
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'KANBAN' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">কানবান বোর্ড</span>
            </button>

            <button
              id="btn-view-mode-list"
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'LIST' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">তালিকা ভিউ</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
          {/* Status Filter */}
          <div>
            <select
              id="filter-action-plan-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">সকল স্ট্যাটাস ({plans.length})</option>
              <option value="TODO">পরিকল্পিত / To Do ({stats.todo})</option>
              <option value="IN_PROGRESS">চলমান / In Progress ({stats.inProgress})</option>
              <option value="COMPLETED">সম্পন্ন / Completed ({stats.completed})</option>
              <option value="ON_HOLD">স্থগিত / On Hold ({stats.onHold})</option>
              <option value="CANCELLED">বাতিল / Cancelled ({stats.cancelled})</option>
              <option value="OVERDUE">🚨 মেয়াদোত্তীর্ণ ({stats.overdue})</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              id="filter-action-plan-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">সকল বিভাগ / ক্যাটাগরি</option>
              {STANDARD_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              id="filter-action-plan-priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">সকল অগ্রাধিকার</option>
              <option value="URGENT">জরুরি (Urgent)</option>
              <option value="HIGH">উচ্চ (High)</option>
              <option value="MEDIUM">মাঝারি (Medium)</option>
              <option value="NORMAL">সাধারণ (Normal)</option>
            </select>
          </div>

          {/* Responsible Member Filter */}
          <div>
            <select
              id="filter-action-plan-member"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">সকল দায়িত্বপ্রাপ্ত ব্যক্তি</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.positionCustomBn || m.position})</option>
              ))}
            </select>
          </div>

          {/* Overdue Checkbox Toggle */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-center justify-end">
            <label className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer text-xs font-semibold text-slate-700 w-full lg:w-auto justify-center">
              <input
                id="checkbox-filter-overdue"
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <span className={overdueOnly ? 'text-rose-700 font-bold' : ''}>শুধু ওভারডিউ দেখান</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: CARDS / KANBAN / LIST */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">কমিটি কর্মপরিকল্পনার তথ্য লোড হচ্ছে...</p>
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-bold text-sm text-rose-900">ত্রুটি দেখা দিয়েছে</h3>
          <p className="text-xs text-rose-700">{errorMessage}</p>
          <button
            onClick={fetchActionPlans}
            className="mt-2 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
          >
            পুনরায় চেষ্টা করুন
          </button>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">কোনো কর্মপরিকল্পনা পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            নির্বাচিত ফিল্টার বা মেয়াদের অধীনে কোনো কর্মপরিকল্পনা এন্ট্রি নেই। আপনি নতুন কর্মপরিকল্পনা তৈরি করতে পারেন অথবা ফিল্টার পরিবর্তন করতে পারেন।
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
                setPriorityFilter('ALL');
                setMemberFilter('ALL');
                setOverdueOnly(false);
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              ফিল্টার রিসেট
            </button>
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কাজ যুক্ত করুন</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* VIEW A: INTERACTIVE CARDS GRID */}
          {viewMode === 'CARDS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map(plan => {
                const isOverdue = plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && plan.dueDate && plan.dueDate < todayStr;
                const isCompleted = plan.status === 'COMPLETED';

                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                      isCompleted
                        ? 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/20 to-white'
                        : isOverdue
                        ? 'border-rose-300 bg-gradient-to-b from-rose-50/20 to-white'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Card Top Header */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleToggleComplete(plan)}
                            title={isCompleted ? 'সম্পন্ন হিসেবে চিহ্নিত' : 'সম্পন্ন করুন'}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {plan.planNumber}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {getPriorityBadge(plan.priority)}
                          {getStatusBadge(plan.status, plan.dueDate)}
                        </div>
                      </div>

                      {/* Title & Category */}
                      <div>
                        <h3
                          onClick={() => setDetailPlan(plan)}
                          className={`font-bold text-sm cursor-pointer hover:text-emerald-700 transition-colors leading-snug ${
                            isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {plan.title}
                        </h3>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                            {plan.category}
                          </span>
                          {plan.resolutionNumber && (
                            <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold">
                              রেজোলিউশন #{plan.resolutionNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description Snippet */}
                      {plan.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {plan.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-slate-500">অগ্রগতি</span>
                          <span className={plan.progressPercentage === 100 ? 'text-emerald-700 font-bold' : 'text-slate-800'}>
                            {toBnNum(plan.progressPercentage)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              plan.progressPercentage === 100
                                ? 'bg-emerald-500'
                                : plan.progressPercentage >= 50
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${plan.progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Details Box */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                        {/* Responsible Person */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>দায়িত্বপ্রাপ্ত:</span>
                          </span>
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">
                            {plan.responsibleMemberName || 'অনির্ধারিত'}
                          </span>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>সমাপ্তির লক্ষ্য:</span>
                          </span>
                          <span className={`font-mono font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                            {plan.dueDate ? formatDate(plan.dueDate, language) : '-'}
                          </span>
                        </div>

                        {/* Budget & Cost */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">বাজেট ও খরচ:</span>
                          <div className="font-mono text-right">
                            <span className="font-bold text-emerald-800">{formatCurrency(plan.estimatedBudget)}</span>
                            {Number(plan.actualCost) > 0 && (
                              <span className="text-[10px] text-slate-500 block">প্রকৃত: {formatCurrency(plan.actualCost)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom Action Bar */}
                    <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center space-x-1">
                        <button
                          id={`btn-open-quick-progress-${plan.id}`}
                          onClick={() => handleOpenProgressModal(plan)}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>অগ্রগতি</span>
                        </button>

                        <button
                          id={`btn-open-attachments-${plan.id}`}
                          onClick={() => handleOpenAttachmentModal(plan)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                          title="ছবি ও ভাউচার সংযুক্তি"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{toBnNum(plan.attachments?.length || 0)}</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setActivePrintPlan(plan);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="প্রিন্ট প্রিভিউ"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-edit-action-plan-${plan.id}`}
                          onClick={() => handleOpenEditModal(plan)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-delete-action-plan-${plan.id}`}
                          onClick={() => setDeletingPlan(plan)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW B: KANBAN BOARD VIEW */}
          {viewMode === 'KANBAN' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {/* Column 1: TODO */}
              <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    <h4 className="font-bold text-xs text-purple-950">পরিকল্পিত / করণীয় (To Do)</h4>
                  </div>
                  <span className="bg-purple-200 text-purple-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {toBnNum(filteredPlans.filter(p => p.status === 'TODO').length)}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {filteredPlans.filter(p => p.status === 'TODO').map(plan => (
                    <div
                      key={plan.id}
                      className="bg-white p-3 rounded-xl border border-purple-100 shadow-xs space-y-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-mono text-purple-800 font-bold">{plan.planNumber}</span>
                        {getPriorityBadge(plan.priority)}
                      </div>
                      <h5
                        onClick={() => setDetailPlan(plan)}
                        className="font-bold text-xs text-slate-900 cursor-pointer hover:text-purple-700"
                      >
                        {plan.title}
                      </h5>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>{plan.responsibleMemberName || 'অনির্ধারিত'}</span>
                        <span className="font-mono text-emerald-800 font-bold">{formatCurrency(plan.estimatedBudget)}</span>
                      </div>
                      <div className="flex justify-end gap-1 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenProgressModal(plan)}
                          className="text-[10px] text-purple-700 font-bold hover:underline"
                        >
                          অগ্রগতি আপডেট →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: IN_PROGRESS */}
              <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <h4 className="font-bold text-xs text-blue-950">চলমান কাজ (In Progress)</h4>
                  </div>
                  <span className="bg-blue-200 text-blue-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {toBnNum(filteredPlans.filter(p => p.status === 'IN_PROGRESS').length)}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {filteredPlans.filter(p => p.status === 'IN_PROGRESS').map(plan => (
                    <div
                      key={plan.id}
                      className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs space-y-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-mono text-blue-800 font-bold">{plan.planNumber}</span>
                        <span className="text-[10px] font-bold text-blue-700 font-mono">{toBnNum(plan.progressPercentage)}%</span>
                      </div>
                      <h5
                        onClick={() => setDetailPlan(plan)}
                        className="font-bold text-xs text-slate-900 cursor-pointer hover:text-blue-700"
                      >
                        {plan.title}
                      </h5>
                      <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${plan.progressPercentage}%` }}></div>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                        <span>{plan.responsibleMemberName || 'অনির্ধারিত'}</span>
                        <button
                          onClick={() => handleOpenProgressModal(plan)}
                          className="text-[10px] text-blue-700 font-bold hover:underline"
                        >
                          আপডেট
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: COMPLETED */}
              <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <h4 className="font-bold text-xs text-emerald-950">সম্পন্ন কর্মসূচি (Completed)</h4>
                  </div>
                  <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {toBnNum(filteredPlans.filter(p => p.status === 'COMPLETED').length)}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {filteredPlans.filter(p => p.status === 'COMPLETED').map(plan => (
                    <div
                      key={plan.id}
                      className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs space-y-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-mono text-emerald-800 font-bold">{plan.planNumber}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <h5
                        onClick={() => setDetailPlan(plan)}
                        className="font-bold text-xs text-slate-800 line-through cursor-pointer hover:text-emerald-700"
                      >
                        {plan.title}
                      </h5>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>ব্যয়: {formatCurrency(plan.actualCost || plan.estimatedBudget)}</span>
                        <span className="font-mono">{plan.completedDate ? formatDate(plan.completedDate, language) : 'সম্পন্ন'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 4: ON HOLD & CANCELLED */}
              <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h4 className="font-bold text-xs text-slate-900">স্থগিত ও অন্যান্য</h4>
                  </div>
                  <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {toBnNum(filteredPlans.filter(p => p.status === 'ON_HOLD' || p.status === 'CANCELLED').length)}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {filteredPlans.filter(p => p.status === 'ON_HOLD' || p.status === 'CANCELLED').map(plan => (
                    <div
                      key={plan.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-mono text-slate-700 font-bold">{plan.planNumber}</span>
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 rounded">{plan.status}</span>
                      </div>
                      <h5
                        onClick={() => setDetailPlan(plan)}
                        className="font-bold text-xs text-slate-700 cursor-pointer"
                      >
                        {plan.title}
                      </h5>
                      {plan.remarks && (
                        <p className="text-[10px] text-slate-500 italic line-clamp-2">{plan.remarks}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW C: DETAILED TABULAR LIST VIEW */}
          {viewMode === 'LIST' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-3 text-center w-10">
                        <Check className="w-3.5 h-3.5 mx-auto" />
                      </th>
                      <th className="p-3 w-28">কর্মপরিকল্পনা নং</th>
                      <th className="p-3">কাজের নাম ও বিভাগ</th>
                      <th className="p-3 w-32">দায়িত্বপ্রাপ্ত সদস্য</th>
                      <th className="p-3 text-center w-28">সময়সীমা</th>
                      <th className="p-3 text-right w-24">বাজেট</th>
                      <th className="p-3 text-right w-24">প্রকৃত ব্যয়</th>
                      <th className="p-3 text-center w-28">অগ্রগতি</th>
                      <th className="p-3 text-center w-28">স্ট্যাটাস</th>
                      <th className="p-3 text-right w-28">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPlans.map(plan => {
                      const isOverdue = plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && plan.dueDate && plan.dueDate < todayStr;
                      const isCompleted = plan.status === 'COMPLETED';

                      return (
                        <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => handleToggleComplete(plan)}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-800">
                            {plan.planNumber}
                          </td>
                          <td className="p-3">
                            <div
                              onClick={() => setDetailPlan(plan)}
                              className={`font-bold cursor-pointer hover:text-emerald-700 ${
                                isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                              }`}
                            >
                              {plan.title}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="font-semibold">{plan.category}</span>
                              {plan.resolutionNumber && (
                                <span className="text-blue-700 font-mono font-bold bg-blue-50 px-1 rounded">
                                  #{plan.resolutionNumber}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{plan.responsibleMemberName || 'অনির্ধারিত'}</div>
                            {plan.responsibleMemberDesignation && (
                              <div className="text-[10px] text-slate-500">{plan.responsibleMemberDesignation}</div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-[11px]">
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {plan.dueDate ? formatDate(plan.dueDate, language) : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-emerald-800">
                            {formatCurrency(plan.estimatedBudget)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-800">
                            {formatCurrency(plan.actualCost)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="font-bold text-[11px] text-slate-800">{toBnNum(plan.progressPercentage)}%</div>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden mt-1">
                              <div
                                className={`h-full ${plan.progressPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                style={{ width: `${plan.progressPercentage}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(plan.status, plan.dueDate)}
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => handleOpenProgressModal(plan)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg"
                              title="অগ্রগতি আপডেট"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(plan)}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg"
                              title="সম্পাদনা"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingPlan(plan)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. CREATE / EDIT ACTION PLAN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingPlan ? 'কর্মপরিকল্পনা সম্পাদনা' : 'নতুন কর্মপরিকল্পনা প্রণয়ন'}
                  </h3>
                  <p className="text-xs text-slate-500">কমিটি করণীয় কাজ ও সময়সীমা নির্ধারণ</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Resolution Import Banner */}
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>গৃহীত রেজোলিউশন থেকে আমদানি করুন (Optional)</span>
                  </span>
                  <span className="text-[11px] text-blue-800">
                    মিটিং রেজোলিউশন নির্বাচন করলে শিরোনাম, বাজেট ও দায়িত্ব স্বয়ংক্রিয়ভাবে পূরণ হবে
                  </span>
                </div>
                <select
                  id="select-import-resolution"
                  value={formResolutionId}
                  onChange={(e) => applyResolutionImport(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-blue-950 font-semibold focus:ring-2 focus:ring-blue-500 text-xs shrink-0"
                >
                  <option value="">-- রেজোলিউশন লিংক ছাড়া --</option>
                  {resolutions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.resolutionNumber}: {r.subject.slice(0, 35)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">কাজের শিরোনাম / নাম *</label>
                <input
                  id="input-action-plan-title"
                  type="text"
                  required
                  placeholder="e.g. মসজিদ কমপ্লেক্সের দ্বিতীয় তলার টাইলস ও সাউন্ড সিস্টেম আধুনিকায়ন"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ক্যাটাগরি / বিভাগ *</label>
                  <select
                    id="select-action-plan-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    {STANDARD_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {formCategory === 'অন্যান্য' && (
                    <input
                      type="text"
                      placeholder="কাস্টম ক্যাটাগরির নাম লিখুন..."
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      className="w-full mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">অগ্রাধিকার (Priority) *</label>
                  <select
                    id="select-action-plan-priority"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="NORMAL">সাধারণ (Normal)</option>
                    <option value="MEDIUM">মাঝারি (Medium)</option>
                    <option value="HIGH">উচ্চ অগ্রাধিকার (High)</option>
                    <option value="URGENT">জরুরি ও অগ্রাধিকারভিত্তিক (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* Responsible Member & Assistant Members */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্রধান দায়িত্বপ্রাপ্ত সদস্য</label>
                  <select
                    id="select-action-plan-member"
                    value={formResponsibleMemberId}
                    onChange={(e) => setFormResponsibleMemberId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="">-- সদস্য নির্বাচন করুন --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.positionCustomBn || m.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">সহকারী সদস্যবৃন্দ (Multi-select)</label>
                  <select
                    id="select-action-plan-assistant-members"
                    multiple
                    value={formAssistantMemberIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (opt: any) => opt.value);
                      setFormAssistantMemberIds(selected);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-[11px] h-20"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.positionCustomBn || m.position})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">কাজের শুরুর তারিখ *</label>
                  <input
                    id="input-action-plan-start-date"
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">সমাপ্তির লক্ষ্যমাত্রা (Due Date) *</label>
                  <input
                    id="input-action-plan-due-date"
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              {/* Estimated Budget, Actual Cost & Funding Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্রাক্কলিত বাজেট (৳)</label>
                  <input
                    id="input-action-plan-budget"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formEstimatedBudget}
                    onChange={(e) => setFormEstimatedBudget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্রকৃত খরচ (৳)</label>
                  <input
                    id="input-action-plan-actual-cost"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formActualCost}
                    onChange={(e) => setFormActualCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">অর্থায়নের উৎস / খাত</label>
                  <input
                    id="input-action-plan-funding-source"
                    type="text"
                    placeholder="e.g. মসজিদ উন্নয়ন ফান্ড"
                    value={formFundingSource}
                    onChange={(e) => setFormFundingSource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">বিস্তারিত বিবরণ ও বাস্তবায়ন নির্দেশনা</label>
                <textarea
                  id="textarea-action-plan-desc"
                  rows={2}
                  placeholder="কাজের বিস্তারিত পরিধি, বাস্তবায়ন প্রক্রিয়া ও বিশেষ শর্তাবলি লিখুন..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                ></textarea>
              </div>

              {/* Status & Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">বর্তমান স্ট্যাটাস</label>
                  <select
                    id="select-action-plan-status"
                    value={formStatus}
                    onChange={(e) => {
                      const newStat = e.target.value as CommitteeActionPlanStatus;
                      setFormStatus(newStat);
                      if (newStat === 'COMPLETED') setFormProgressPercentage(100);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold"
                  >
                    <option value="TODO">পরিকল্পিত (To Do)</option>
                    <option value="IN_PROGRESS">চলমান (In Progress)</option>
                    <option value="COMPLETED">সম্পন্ন (Completed)</option>
                    <option value="ON_HOLD">স্থগিত (On Hold)</option>
                    <option value="CANCELLED">বাতিল (Cancelled)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">বাস্তবায়ন অগ্রগতি (%)</label>
                    <span className="font-mono font-bold text-emerald-800">{formProgressPercentage}%</span>
                  </div>
                  <input
                    id="input-action-plan-progress-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formProgressPercentage}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormProgressPercentage(val);
                      if (val === 100) setFormStatus('COMPLETED');
                      else if (val > 0 && formStatus === 'TODO') setFormStatus('IN_PROGRESS');
                    }}
                    className="w-full accent-emerald-600"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  id="btn-save-action-plan"
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingForm ? 'সংরক্ষণ হচ্ছে...' : (editingPlan ? 'আপডেট সংরক্ষণ' : 'কর্মপরিকল্পনা তৈরি করুন')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. QUICK PROGRESS UPDATE MODAL */}
      {progressModalPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">বাস্তবায়ন অগ্রগতি আপডেট</h3>
                  <p className="text-xs text-slate-500 font-mono">#{progressModalPlan.planNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setProgressModalPlan(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickProgress} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-500 block text-[10px]">কাজের শিরোনাম:</span>
                <span className="font-bold text-slate-900 text-xs">{progressModalPlan.title}</span>
              </div>

              {/* Progress Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">অগ্রগতি শতাংশ:</span>
                  <span className="text-base font-black text-emerald-800 font-mono">{toBnNum(quickProgress)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={quickProgress}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setQuickProgress(val);
                    if (val === 100) setQuickStatus('COMPLETED');
                    else if (val > 0 && quickStatus === 'TODO') setQuickStatus('IN_PROGRESS');
                  }}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>০%</span>
                  <span>২৫%</span>
                  <span>৫০%</span>
                  <span>৭৫%</span>
                  <span>১০০%</span>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">কাজের অবস্থা / স্ট্যাটাস</label>
                <select
                  value={quickStatus}
                  onChange={(e) => {
                    const newStat = e.target.value as CommitteeActionPlanStatus;
                    setQuickStatus(newStat);
                    if (newStat === 'COMPLETED') setQuickProgress(100);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                >
                  <option value="TODO">পরিকল্পিত (To Do)</option>
                  <option value="IN_PROGRESS">চলমান (In Progress)</option>
                  <option value="COMPLETED">সম্পন্ন (Completed - 100%)</option>
                  <option value="ON_HOLD">স্থগিত (On Hold)</option>
                  <option value="CANCELLED">বাতিল (Cancelled)</option>
                </select>
              </div>

              {/* Actual Cost */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">প্রকৃত খরচ / ব্যয় (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={quickActualCost}
                  onChange={(e) => setQuickActualCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">বাস্তবায়ন অগ্রগতি মন্তব্য / নোট</label>
                <textarea
                  rows={2}
                  placeholder="অগ্রগতি সংক্রান্ত কোনো মন্তব্য থাকলে লিখুন..."
                  value={quickRemarks}
                  onChange={(e) => setQuickRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressModalPlan(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingProgress}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingProgress ? 'সংরক্ষণ হচ্ছে...' : 'অগ্রগতি সংরক্ষণ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ATTACHMENTS MODAL */}
      {attachmentModalPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Paperclip className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">ছবি ও ভাউচার সংযুক্তি গ্যালারি</h3>
                  <p className="text-xs text-slate-500 font-mono">#{attachmentModalPlan.planNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setAttachmentModalPlan(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Attachments List */}
            <div className="space-y-2">
              <span className="font-bold text-xs text-slate-700 block">বর্তমান সংযুক্তি সমূহ:</span>
              {attachmentModalPlan.attachments && attachmentModalPlan.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {attachmentModalPlan.attachments.map(att => (
                    <div
                      key={att.id}
                      className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="overflow-hidden">
                        <span className="font-bold text-slate-900 truncate block">{att.name}</span>
                        <span className="text-[10px] text-slate-500">{att.typeBn || att.type}</span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="ওপেন করুন"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(attachmentModalPlan.id, att.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  এখনও কোনো ছবি বা ভাউচার সংযুক্ত করা হয়নি
                </div>
              )}
            </div>

            {/* Add New Attachment Form */}
            <form onSubmit={handleSaveAttachment} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>নতুন সংযুক্তি যোগ করুন</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">সংযুক্তির ধরণ</label>
                  <select
                    value={attType}
                    onChange={(e) => setAttType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="BEFORE_PHOTO">কাজের পূর্বের ছবি (Before)</option>
                    <option value="DURING_PHOTO">চলমান কাজের ছবি (During)</option>
                    <option value="AFTER_PHOTO">সমাপ্তির ছবি (After)</option>
                    <option value="BILL">বিল ও ক্যাশ মেমো</option>
                    <option value="INVOICE">ইনভয়েস / রশিদ</option>
                    <option value="DOCUMENT">প্রমাণক নথি / ডকুমেন্ট</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ফাইলের নাম / শিরোনাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. টাইলস ক্রয়ের বিল মেমো"
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">ফাইল ইউআরএল / লিঙ্ক *</label>
                <input
                  type="text"
                  required
                  placeholder="https://... অথবা ফাইলের লিঙ্ক"
                  value={attUrl}
                  onChange={(e) => setAttUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSavingAttachment}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSavingAttachment ? 'সংযুক্ত হচ্ছে...' : 'সংযুক্তি যোগ করুন'}</span>
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAttachmentModalPlan(null)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DETAIL VIEW DRAWER MODAL */}
      {detailPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {detailPlan.planNumber}
                    </span>
                    {getPriorityBadge(detailPlan.priority)}
                    {getStatusBadge(detailPlan.status, detailPlan.dueDate)}
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-1">{detailPlan.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setDetailPlan(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
              {/* Description */}
              {detailPlan.description && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 block">কাজের বিস্তারিত বিবরণ:</span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{detailPlan.description}</p>
                </div>
              )}

              {/* Key Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">বিভাগ:</span>
                  <span className="font-bold text-slate-900">{detailPlan.category}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">সময়সীমা:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {detailPlan.dueDate ? formatDate(detailPlan.dueDate, language) : '-'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">প্রাক্কলিত বাজেট:</span>
                  <span className="font-bold text-emerald-800 font-mono">{formatCurrency(detailPlan.estimatedBudget)}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">প্রকৃত খরচ:</span>
                  <span className="font-bold text-slate-900 font-mono">{formatCurrency(detailPlan.actualCost)}</span>
                </div>
              </div>

              {/* Responsible Person Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 block">দায়িত্বপ্রাপ্ত সদস্য ও টিম:</span>
                <div className="text-slate-800">
                  <strong>মূল দায়িত্ব:</strong> {detailPlan.responsibleMemberName || 'অনির্ধারিত'}
                  {detailPlan.responsibleMemberDesignation && ` (${detailPlan.responsibleMemberDesignation})`}
                  {detailPlan.responsibleMemberPhone && ` • মোবাইল: ${detailPlan.responsibleMemberPhone}`}
                </div>
                {detailPlan.assistantMembers && detailPlan.assistantMembers.length > 0 && (
                  <div className="text-slate-700">
                    <strong>সহকারী সদস্যবৃন্দ:</strong> {detailPlan.assistantMembers.map(m => m.name).join(', ')}
                  </div>
                )}
              </div>

              {/* Linked Resolution Reference */}
              {detailPlan.resolutionNumber && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-blue-700 font-bold block">সংযুক্ত রেজোলিউশন:</span>
                    <span className="font-bold text-blue-950 font-mono">#{detailPlan.resolutionNumber}</span>
                    <span className="text-blue-900 ml-2">{detailPlan.resolutionSubject}</span>
                  </div>
                  {onNavigateToResolutionTab && (
                    <button
                      onClick={() => {
                        setDetailPlan(null);
                        onNavigateToResolutionTab();
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                    >
                      রেজোলিউশন দেখুন
                    </button>
                  )}
                </div>
              )}

              {/* Activity Timeline Logs */}
              {detailPlan.activityLogs && detailPlan.activityLogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>বাস্তবায়ন ও পরিবর্তন ইতিহাস (Audit Trail):</span>
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {detailPlan.activityLogs.map(log => (
                      <div key={log.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800">{log.action}:</span>{' '}
                          <span className="text-slate-600">{log.details}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">দ্বারা: {log.changedByName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setActivePrintPlan(detailPlan);
                  setIsPrintModalOpen(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center space-x-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট প্রিভিউ</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleOpenEditModal(detailPlan);
                    setDetailPlan(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>সম্পাদনা</span>
                </button>
                <button
                  onClick={() => setDetailPlan(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. DELETE CONFIRMATION MODAL */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">কর্মপরিকল্পনা মুছে ফেলবেন?</h3>
                <p className="text-xs text-slate-500 font-mono">আইডি: {deletingPlan.planNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              আপনি কি নিশ্চিত যে <strong>{deletingPlan.title}</strong> কর্মপরিকল্পনাটি মুছে ফেলতে চান? অডিট ট্রেইল রক্ষার স্বার্থে এটি সফট ডিলিট হিসেবে সংরক্ষিত থাকবে।
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingPlan(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. ACTION PLAN PRINT MODAL */}
      {isPrintModalOpen && (
        <CommitteeActionPlanPrint
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setActivePrintPlan(null);
          }}
          plan={activePrintPlan}
          plansList={activePrintPlan ? undefined : filteredPlans}
          term={terms.find(t => t.id === selectedTermId) || activeTerm}
          members={members}
          mosque={mosque}
          language={language}
        />
      )}
    </div>
  );
};

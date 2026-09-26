import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, FileEdit } from 'lucide-react';
import { Budget, BudgetLine, AccountHead, CommitteeActionPlan } from '../../types';
import { formatCurrencyBn, toBnDigits } from '../../lib/budgetService';

// ============================================================================
// 1. CREATE OR EDIT DRAFT BUDGET MODAL
// ============================================================================

interface CreateOrEditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetToEdit?: Budget | null;
  initialLines?: BudgetLine[];
  accountHeads: AccountHead[];
  actionPlans?: CommitteeActionPlan[];
  onSave: (data: {
    budget: Partial<Budget>;
    lines: Partial<BudgetLine>[];
    submitImmediately?: boolean;
  }) => Promise<void>;
}

export const CreateOrEditBudgetModal: React.FC<CreateOrEditBudgetModalProps> = ({
  isOpen,
  onClose,
  budgetToEdit,
  initialLines = [],
  accountHeads,
  actionPlans = [],
  onSave,
}) => {
  const [budgetName, setBudgetName] = useState('');
  const [budgetType, setBudgetType] = useState<Budget['budgetType']>('OPERATING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Partial<BudgetLine>[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const expenseHeads = accountHeads.filter((h) => h.type === 'EXPENSE');
  const mainExpenseHeads = expenseHeads.filter((h) => !h.parentId);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (budgetToEdit) {
        setBudgetName(budgetToEdit.budgetName || '');
        setBudgetType(budgetToEdit.budgetType || 'OPERATING');
        setStartDate(budgetToEdit.startDate ? budgetToEdit.startDate.slice(0, 10) : '');
        setEndDate(budgetToEdit.endDate ? budgetToEdit.endDate.slice(0, 10) : '');
        setProjectId(budgetToEdit.projectId);
        setNotes(budgetToEdit.notes || '');
        setLines(
          initialLines.length > 0
            ? initialLines.map((l) => ({ ...l }))
            : [{ mainHeadId: '', plannedAmount: 0, notes: '' }]
        );
      } else {
        const today = new Date();
        const year = today.getFullYear();
        setBudgetName(`${toBnDigits(year)} সালের বার্ষিক মসজিদ পরিচালন বাজেট`);
        setBudgetType('OPERATING');
        setStartDate(`${year}-01-01`);
        setEndDate(`${year}-12-31`);
        setProjectId(undefined);
        setNotes('');

        // Pre-populate with existing main expense heads for convenience
        if (mainExpenseHeads.length > 0) {
          setLines(
            mainExpenseHeads.slice(0, 6).map((h) => ({
              mainHeadId: h.id,
              mainHeadNameBn: h.nameBn,
              plannedAmount: 0,
              notes: '',
            }))
          );
        } else {
          setLines([{ mainHeadId: '', plannedAmount: 0, notes: '' }]);
        }
      }
    }
  }, [isOpen, budgetToEdit, initialLines]);

  if (!isOpen) return null;

  const totalPlanned = lines.reduce((sum, l) => sum + (Number(l.plannedAmount) || 0), 0);

  const handleAddLine = () => {
    setLines([...lines, { mainHeadId: '', plannedAmount: 0, notes: '' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof BudgetLine, val: any) => {
    const updated = [...lines];
    if (field === 'mainHeadId') {
      const head = expenseHeads.find((h) => h.id === val);
      updated[idx] = {
        ...updated[idx],
        mainHeadId: val,
        mainHeadNameBn: head?.nameBn || '',
        subHeadId: undefined,
        subHeadNameBn: undefined,
      };
    } else if (field === 'subHeadId') {
      const subHead = expenseHeads.find((h) => h.id === val);
      updated[idx] = {
        ...updated[idx],
        subHeadId: val || undefined,
        subHeadNameBn: subHead?.nameBn || undefined,
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: val };
    }
    setLines(updated);
  };

  const handleSubmit = async (submitImmediately = false) => {
    try {
      setErrorMessage('');
      if (!budgetName.trim()) {
        setErrorMessage('বাজেটের শিরোনাম উল্লেখ করা আবশ্যক।');
        return;
      }
      if (!startDate || !endDate) {
        setErrorMessage('বাজেটের শুরুর ও শেষের তারিখ নির্বাচন করুন।');
        return;
      }
      if (startDate > endDate) {
        setErrorMessage('শুরুর তারিখ শেষের তারিখের চেয়ে পূর্বে হতে হবে।');
        return;
      }

      const validLines = lines.filter((l) => l.mainHeadId && (Number(l.plannedAmount) || 0) > 0);
      if (validLines.length === 0) {
        setErrorMessage('কমপক্ষে একটি বৈধ খাতের নাম এবং প্রাক্কলিত পরিমাণ (টাকা) প্রদান করুন।');
        return;
      }

      const seenKeys = new Set<string>();
      for (const line of validLines) {
        const key = `${line.mainHeadId}_${line.subHeadId || ''}`;
        if (seenKeys.has(key)) {
          setErrorMessage('একই প্রধান খাত ও উপ-খাত এই বাজেটে ইতোমধ্যে যুক্ত আছে।');
          return;
        }
        seenKeys.add(key);

        const amount = Number(line.plannedAmount);
        if (isNaN(amount) || !isFinite(amount) || amount < 0) {
          setErrorMessage('বাজেটের প্রাক্কলিত অর্থ অবশ্যই একটি বৈধ অ-ঋণাত্মক সংখ্যা হতে হবে।');
          return;
        }
      }

      setIsSubmitting(true);
      await onSave({
        budget: {
          budgetName,
          budgetType,
          startDate,
          endDate,
          projectId: budgetType === 'PROJECT' ? projectId : undefined,
          notes,
        },
        lines: validLines,
        submitImmediately,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেট সংরক্ষণে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <FileEdit className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold">
                {budgetToEdit ? '📝 খসড়া বাজেট সম্পাদনা' : '➕ নতুন বাজেট প্রণয়ন'}
              </h2>
              <p className="text-[11px] text-slate-300">
                মসজিদের বিভিন্ন ব্যয়ের প্রাক্কলন ও আর্থিক পরিকল্পনা তৈরি করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বাজেটের শিরোনাম / নাম <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="যেমন: ২০২৬ সালের মসজিদ পরিচালন বাজেট"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বাজেটের ধরন</label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="OPERATING">নিয়মিত পরিচালন বাজেট (Operating)</option>
                <option value="PROJECT">প্রকল্প ও উন্নয়ন বাজেট (Project)</option>
              </select>
            </div>

            {budgetType === 'PROJECT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সম্পর্কিত কর্মপরিকল্পনা / প্রকল্প
                </label>
                <select
                  value={projectId || ''}
                  onChange={(e) => setProjectId(e.target.value || undefined)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">-- প্রকল্প নির্বাচন করুন --</option>
                  {actionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} (বাজেট: {formatCurrencyBn(plan.estimatedBudget)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                শুরুর তারিখ <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                সমাপ্তির তারিখ <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Budget Lines Section */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-800">ব্যয়ের খাত ও প্রাক্কলিত বরাদ্দ</h3>
                <p className="text-[11px] text-slate-500">প্রতিটি খাতের বিপরীতে প্রত্যাশিত বাজেট নির্ধারণ করুন</p>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>খাত যোগ করুন</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, idx) => {
                const subHeads = line.mainHeadId
                  ? expenseHeads.filter((h) => h.parentId === line.mainHeadId)
                  : [];

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">প্রধান খাত</label>
                      <select
                        value={line.mainHeadId || ''}
                        onChange={(e) => handleLineChange(idx, 'mainHeadId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">-- প্রধান খাত নির্বাচন --</option>
                        {mainExpenseHeads.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.nameBn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">উপ-খাত (ঐচ্ছিক)</label>
                      <select
                        value={line.subHeadId || ''}
                        onChange={(e) => handleLineChange(idx, 'subHeadId', e.target.value)}
                        disabled={subHeads.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white disabled:bg-slate-100"
                      >
                        <option value="">-- সমগ্র প্রধান খাত --</option>
                        {subHeads.map((sh) => (
                          <option key={sh.id} value={sh.id}>
                            {sh.nameBn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">প্রাক্কলিত টাকা (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={line.plannedAmount || ''}
                        onChange={(e) =>
                          handleLineChange(idx, 'plannedAmount', Math.max(0, Number(e.target.value) || 0))
                        }
                        placeholder="০"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-secondary tabular-nums text-right font-bold text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-end pt-3 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
                        title="খাত মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Planned Bar */}
            <div className="mt-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">মোট প্রাক্কলিত বাজেট বরাদ্দ:</span>
              <span className="text-base font-black text-emerald-700 font-secondary tabular-nums">
                {formatCurrencyBn(totalPlanned)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">মন্তব্য ও বিবরণী (ঐচ্ছিক)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="বাজেট সংক্রান্ত কোনো বিশেষ দিক বা নির্দেশনা থাকলে উল্লেখ করুন..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            বাতিল
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'খসড়া সংরক্ষণ (Save Draft)'}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'প্রক্রিয়াধীন...' : 'অনুমোদনে পেশ করুন'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. REVISE BUDGET MODAL
// ============================================================================

interface ReviseBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget | null;
  currentLines: BudgetLine[];
  onRevise: (newLines: Partial<BudgetLine>[], notes: string) => Promise<void>;
}

export const ReviseBudgetModal: React.FC<ReviseBudgetModalProps> = ({
  isOpen,
  onClose,
  budget,
  currentLines,
  onRevise,
}) => {
  const [lines, setLines] = useState<Partial<BudgetLine>[]>([]);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && budget) {
      setLines(currentLines.map((l) => ({ ...l })));
      setRevisionNotes(`সংশোধিত রিভিশন #${budget.revisionNumber + 1}`);
      setErrorMessage('');
    }
  }, [isOpen, budget, currentLines]);

  if (!isOpen || !budget) return null;

  const totalRevised = lines.reduce((sum, l) => sum + (Number(l.plannedAmount) || 0), 0);
  const oldTotal = budget.totalPlannedAmount || 0;
  const difference = totalRevised - oldTotal;

  const handleAmountChange = (idx: number, val: number) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], plannedAmount: Math.max(0, val) };
    setLines(updated);
  };

  const handleConfirmRevise = async () => {
    try {
      setErrorMessage('');
      if (!revisionNotes.trim()) {
        setErrorMessage('বাজেট সংশোধনের কারণ বা বিবরণ উল্লেখ করুন।');
        return;
      }
      for (const l of lines) {
        const amt = Number(l.plannedAmount);
        if (isNaN(amt) || !isFinite(amt) || amt < 0) {
          setErrorMessage('বাজেটের প্রাক্কলিত অর্থ অবশ্যই একটি বৈধ অ-ঋণাত্মক সংখ্যা হতে হবে।');
          return;
        }
      }
      setIsSubmitting(true);
      await onRevise(lines, revisionNotes);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'বাজেট সংশোধন ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        <div className="px-5 py-4 bg-amber-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-sm font-bold">
                🔄 বাজেট সংশোধন ও নতুন রিভিশন (#{toBnDigits(budget.revisionNumber + 1)})
              </h2>
              <p className="text-[11px] text-amber-200">
                বিদ্যমান বাজেটটি অপরিবর্তিত রেখে নতুন অনুমোদিত রিভিশন তৈরি করা হবে
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-amber-200 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            ⚠️ <strong>লক্ষ্য করুন:</strong> রিভিশন অনুমোদন হলে বর্তমান সংস্করণটি <em>REVISED</em> হিসেবে আর্কাইভ
            হবে এবং নতুন বরাদ্দ কার্যকর হবে। পূর্ববর্তী ব্যয়ের ডাটা অক্ষুণ্ণ থাকবে।
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800">খাতভিত্তিক নতুন বরাদ্দ নির্ধারণ:</h4>
            {lines.map((l, idx) => (
              <div
                key={l.id || idx}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{l.mainHeadNameBn}</div>
                  {l.subHeadNameBn && <div className="text-[11px] text-slate-500">{l.subHeadNameBn}</div>}
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[11px] text-slate-500">নতুন বরাদ্দ: ৳</span>
                  <input
                    type="number"
                    min="0"
                    value={l.plannedAmount || ''}
                    onChange={(e) => handleAmountChange(idx, Number(e.target.value) || 0)}
                    className="w-28 px-2 py-1 text-xs border border-slate-300 rounded-lg text-right font-bold font-secondary tabular-nums text-slate-900 bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-600 block">বর্তমান বাজেট: {formatCurrencyBn(oldTotal)}</span>
              <span className="text-slate-900 font-bold block">
                সংশোধিত নতুন বাজেট: {formatCurrencyBn(totalRevised)}
              </span>
            </div>
            <div className="text-right font-bold">
              <span className="text-slate-500 block">বরাদ্দ ব্যবধান:</span>
              <span
                className={`font-secondary tabular-nums text-sm ${
                  difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {difference > 0 ? `+${formatCurrencyBn(difference)}` : formatCurrencyBn(difference)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              সংশোধনের কারণ ও কমিটি সিদ্ধান্ত রেফারেন্স <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={2}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="যেমন: জরুরি মেরামত কাজের কারণে কার্যনির্বাহী কমিটির প্রস্তাবক্রমে বাজেট বৃদ্ধি..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmRevise}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'সংশোধন হচ্ছে...' : 'সংশোধিত বাজেট অনুমোদন করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

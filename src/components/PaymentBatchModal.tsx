import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Layers,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Building,
  User,
  DollarSign,
  Calendar,
  Search,
  Plus,
  Trash2,
  Printer,
  FileText,
  HelpCircle,
  Info,
  ShieldCheck,
  Send,
  Eye,
  Check
} from 'lucide-react';
import {
  Staff,
  PaymentBatch,
  PaymentBatchItem,
  FinancialAccount,
  Mosque,
  CommitteeTerm
} from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { printElement } from '../lib/printUtils';
import { api } from '../lib/api';

interface PaymentBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  committeeTerms?: CommitteeTerm[];
  language: Language;
  currentUser?: any;
  onBatchCreated: (batch: PaymentBatch) => void;
  onBatchDisbursed?: (batch: PaymentBatch) => void;
  initialMonth?: string;
  batchToView?: PaymentBatch | null;
}

export const PaymentBatchModal: React.FC<PaymentBatchModalProps> = ({
  isOpen,
  onClose,
  staffList,
  accounts,
  currentMosque,
  committeeTerms = [],
  language,
  currentUser,
  onBatchCreated,
  onBatchDisbursed,
  initialMonth,
  batchToView = null
}) => {
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [mode, setMode] = useState<'CREATE' | 'VIEW' | 'DISBURSE'>(batchToView ? 'VIEW' : 'CREATE');
  const [selectedBatch, setSelectedBatch] = useState<PaymentBatch | null>(batchToView);

  // Form State
  const [title, setTitle] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(initialMonth || currentMonthStr);
  const [paymentYear, setPaymentYear] = useState<number>(new Date().getFullYear());
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'SALARY' | 'HADIA' | 'HONORARIUM' | 'ALLOWANCE' | 'FESTIVAL_ALLOWANCE' | 'OTHER'>('SALARY');
  const [festivalName, setFestivalName] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState<'BANK' | 'CASH' | 'CHEQUE' | 'MIXED'>('BANK');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [googleDriveLink, setGoogleDriveLink] = useState('');

  // Selected staff IDs and their custom edits
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffOverrides, setStaffOverrides] = useState<Record<string, {
    basicSalary?: number;
    bonus?: number;
    otherAllowance?: number;
    deduction?: number;
    advanceAdjustment?: number;
    paymentMethod?: 'BANK' | 'CASH' | 'CHEQUE' | 'MFS';
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    notes?: string;
  }>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize active staff when modal opens
  useEffect(() => {
    if (batchToView) {
      setSelectedBatch(batchToView);
      setMode('VIEW');
    } else {
      setSelectedBatch(null);
      setMode('CREATE');
      const activeStaff = staffList.filter(s => s.status === 'ACTIVE');
      setSelectedStaffIds(activeStaff.map(s => s.id));
      const overrides: Record<string, any> = {};
      activeStaff.forEach(s => {
        // Calculate active outstanding advance
        const activeAdv = (s.advanceRecords || [])
          .filter(a => a.status === 'ACTIVE')
          .reduce((sum, a) => sum + (a.outstandingAmount || 0), 0);

        overrides[s.id] = {
          basicSalary: s.monthlySalary || 0,
          bonus: 0,
          otherAllowance: s.allowance || 0,
          deduction: 0,
          advanceAdjustment: activeAdv > 0 ? Math.min(activeAdv, Math.round((s.monthlySalary || 0) * 0.3)) : 0,
          paymentMethod: s.paymentPreference || (s.accountNumber ? 'BANK' : 'CASH'),
          bankName: s.bankName || '',
          branchName: s.branchName || '',
          accountNumber: s.accountNumber || '',
          notes: ''
        };
      });
      setStaffOverrides(overrides);
      setTitle(`${paymentMonth} নিয়মিত বেতন ও হাদিয়া পেমেন্ট ব্যাচ`);
    }
  }, [isOpen, batchToView, staffList, paymentMonth]);

  // Available bank & cash accounts
  const bankAndCashAccounts = useMemo(() => {
    return accounts.filter(a => a.status === 'ACTIVE' || !a.status);
  }, [accounts]);

  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // Calculate items for preview
  const calculatedItems = useMemo(() => {
    return selectedStaffIds.map(staffId => {
      const s = staffList.find(st => st.id === staffId);
      const ov = staffOverrides[staffId] || {};
      const basic = ov.basicSalary !== undefined ? ov.basicSalary : (s?.monthlySalary || 0);
      const bonus = ov.bonus || 0;
      const otherAllow = ov.otherAllowance !== undefined ? ov.otherAllowance : (s?.allowance || 0);
      const allow = bonus + otherAllow;
      const advAdj = ov.advanceAdjustment || 0;
      const deduct = (ov.deduction || 0) + advAdj;
      const totalPayable = basic + allow;
      const netPayable = Math.max(0, totalPayable - deduct);

      return {
        staffId,
        staffName: s?.name || '',
        staffCode: s?.staffCode,
        designationBn: s?.designationBn || '',
        phone: s?.phone,
        basicSalary: basic,
        bonus,
        allowance: allow,
        otherAllowance: otherAllow,
        deduction: deduct,
        advanceAdjustment: advAdj,
        totalPayable,
        netPayable,
        paymentMethod: ov.paymentMethod || s?.paymentPreference || 'BANK',
        bankName: ov.bankName || s?.bankName,
        branchName: ov.branchName || s?.branchName,
        accountNumber: ov.accountNumber || s?.accountNumber,
        notes: ov.notes
      };
    });
  }, [selectedStaffIds, staffList, staffOverrides]);

  const summary = useMemo(() => {
    const totalStaff = calculatedItems.length;
    const totalBasic = calculatedItems.reduce((sum, it) => sum + it.basicSalary, 0);
    const totalBonus = calculatedItems.reduce((sum, it) => sum + it.bonus, 0);
    const totalAllow = calculatedItems.reduce((sum, it) => sum + it.allowance, 0);
    const totalDeduct = calculatedItems.reduce((sum, it) => sum + it.deduction, 0);
    const totalAdv = calculatedItems.reduce((sum, it) => sum + it.advanceAdjustment, 0);
    const totalNet = calculatedItems.reduce((sum, it) => sum + it.netPayable, 0);

    const bankCount = calculatedItems.filter(it => it.paymentMethod === 'BANK').length;
    const bankTotal = calculatedItems.filter(it => it.paymentMethod === 'BANK').reduce((sum, it) => sum + it.netPayable, 0);
    const cashCount = calculatedItems.filter(it => it.paymentMethod === 'CASH' || it.paymentMethod === 'MFS').length;
    const cashTotal = calculatedItems.filter(it => it.paymentMethod === 'CASH' || it.paymentMethod === 'MFS').reduce((sum, it) => sum + it.netPayable, 0);

    const missingBankStaff = calculatedItems.filter(it => it.paymentMethod === 'BANK' && !it.accountNumber);

    return {
      totalStaff,
      totalBasic,
      totalBonus,
      totalAllow,
      totalDeduct,
      totalAdv,
      totalNet,
      bankCount,
      bankTotal,
      cashCount,
      cashTotal,
      missingBankStaff
    };
  }, [calculatedItems]);

  const toggleSelectAll = () => {
    const activeIds = staffList.filter(s => s.status === 'ACTIVE').map(s => s.id);
    if (selectedStaffIds.length === activeIds.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(activeIds);
    }
  };

  const handleCreateBatch = async (autoDisburse: boolean = false) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (calculatedItems.length === 0) {
      setErrorMsg('কমপক্ষে একজন স্টাফ নির্বাচন করুন।');
      return;
    }

    if (autoDisburse && selectedAccount && selectedAccount.currentBalance < summary.totalNet) {
      setErrorMsg(`নির্বাচিত অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${formatCurrency(selectedAccount.currentBalance, language)}, প্রয়োজন: ৳${formatCurrency(summary.totalNet, language)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const batchPayload: Partial<PaymentBatch> = {
        title: title || `${paymentMonth} বেতন পেমেন্ট ব্যাচ`,
        paymentMonth,
        paymentYear: Number(paymentYear) || new Date().getFullYear(),
        paymentDate,
        paymentType,
        festivalName: festivalName || undefined,
        disbursementMethod,
        accountId: selectedAccountId,
        items: calculatedItems as any,
        reference,
        notes,
        googleDriveLink
      };

      const created = await api.createPaymentBatch(batchPayload);
      onBatchCreated(created);

      if (autoDisburse) {
        const disburseResult = await api.disbursePaymentBatch(created.id, {
          accountId: selectedAccountId,
          paymentDate,
          notes
        });
        if (onBatchDisbursed) onBatchDisbursed(disburseResult.batch);
        setSelectedBatch(disburseResult.batch);
        setMode('VIEW');
        setSuccessMsg(`পেমেন্ট ব্যাচ (${created.batchNumber}) সফলভাবে তৈরি ও তাৎক্ষণিক বিতরণ করা হয়েছে!`);
      } else {
        setSelectedBatch(created);
        setMode('VIEW');
        setSuccessMsg(`পেমেন্ট ব্যাচ (${created.batchNumber}) সফলভাবে সংরক্ষিত হয়েছে।`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'পেমেন্ট ব্যাচ তৈরি ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisburseExisting = async () => {
    if (!selectedBatch) return;
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await api.disbursePaymentBatch(selectedBatch.id, {
        accountId: selectedAccountId || selectedBatch.accountId,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `অনুমোদিত ব্যাচ ডিসবার্সমেন্ট: ${selectedBatch.batchNumber}`
      });
      setSelectedBatch(res.batch);
      if (onBatchDisbursed) onBatchDisbursed(res.batch);
      setSuccessMsg(`পেমেন্ট ব্যাচ (${selectedBatch.batchNumber}) সফলভাবে বিতরণ ও একাউন্টিংয়ে সমন্বিত হয়েছে!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'পেমেন্ট ব্যাচ বিতরণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Layers className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {mode === 'CREATE' ? 'নতুন বেতন ও হাদিয়া পেমেন্ট ব্যাচ' : `পেমেন্ট ব্যাচ বিবরণী: ${selectedBatch?.batchNumber || ''}`}
              </h2>
              <p className="text-xs text-emerald-200">
                {mode === 'CREATE' ? 'একাধিক স্টাফের বেতন, হাদিয়া ও ভাতাসমূহ একত্রিত করে অনুমোদিত ব্যাচে প্রক্রিয়াকরণ' : selectedBatch?.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {mode === 'CREATE' ? (
            <>
              {/* Batch Configuration Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  ব্যাচের বিবরণ ও বিতরণ সেটিংস
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">ব্যাচের শিরোনাম</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="যেমন: সেপ্টেম্বর ২০২৬ নিয়মিত বেতন"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">বেতনের মাস</label>
                    <input
                      type="month"
                      value={paymentMonth}
                      onChange={(e) => {
                        setPaymentMonth(e.target.value);
                        setTitle(`${e.target.value} নিয়মিত বেতন ও হাদিয়া পেমেন্ট ব্যাচ`);
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">বিতরণ / পরিশোধের তারিখ</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">পেমেন্ট টাইপ</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="SALARY">নিয়মিত মাসিক বেতন</option>
                      <option value="HADIA">সম্মানী / হাদিয়া</option>
                      <option value="HONORARIUM">বিশেষ সম্মানী</option>
                      <option value="FESTIVAL_ALLOWANCE">উৎসব ভাতা</option>
                      <option value="ALLOWANCE">অন্যান্য ভাতা</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">বিতরণ মাধ্যম</label>
                    <select
                      value={disbursementMethod}
                      onChange={(e) => setDisbursementMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="BANK">ব্যাংক ট্রান্সফার (Bank Transfer)</option>
                      <option value="CASH">ক্যাশ পেমেন্ট (Cash)</option>
                      <option value="CHEQUE">চেক (Cheque)</option>
                      <option value="MIXED">মিশ্র মাধ্যম (Mixed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">মসজিদ ব্যাংক/ক্যাশ একাউন্ট</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {bankAndCashAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.nameBn} ({acc.accountType === 'BANK' ? `${acc.bankName || 'ব্যাংক'} - ৳${formatCurrency(acc.currentBalance, language)}` : `ক্যাশ - ৳${formatCurrency(acc.currentBalance, language)}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">গুগল ড্রাইভ লিংক (ঐচ্ছিক)</label>
                    <input
                      type="url"
                      value={googleDriveLink}
                      onChange={(e) => setGoogleDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">রেফারেন্স / মেমো নং</label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="রেফারেন্স নম্বর..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Staff Selection & Calculation Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      {selectedStaffIds.length === staffList.filter(s => s.status === 'ACTIVE').length ? 'সব আনচেক করুন' : 'সকল সক্রিয় কর্মী নির্বাচন'}
                    </button>
                    <span className="text-xs text-slate-500">
                      নির্বাচিত: <strong className="text-slate-800">{selectedStaffIds.length}</strong> জন কর্মী
                    </span>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="কর্মী খুঁজুন..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {summary.missingBankStaff.length > 0 && disbursementMethod === 'BANK' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>সতর্কতা:</strong> {summary.missingBankStaff.length} জন কর্মীর ব্যাংক হিসাব নম্বর সংরক্ষিত নেই ({summary.missingBankStaff.map(s => s.staffName).join(', ')})। তাদের তথ্য নিচে সরাসরি ইনপুট দিতে পারেন অথবা ক্যাশ পেমেন্ট নির্বাচন করুন।
                    </div>
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                          <th className="p-3 text-center w-10">#</th>
                          <th className="p-3">স্টাফের নাম ও পদবি</th>
                          <th className="p-3 text-right">মূল বেতন</th>
                          <th className="p-3 text-right">বোনাস/হাদিয়া</th>
                          <th className="p-3 text-right">ভাতা</th>
                          <th className="p-3 text-right">কর্তন</th>
                          <th className="p-3 text-right">অগ্রিম সমন্বয়</th>
                          <th className="p-3 text-right bg-emerald-50 text-emerald-900 font-bold">মোট প্রদেয়</th>
                          <th className="p-3">মাধ্যম ও ব্যাংক হিসাব</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {staffList
                          .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.designationBn?.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((staff, idx) => {
                            const isSelected = selectedStaffIds.includes(staff.id);
                            const ov = staffOverrides[staff.id] || {};
                            const basic = ov.basicSalary !== undefined ? ov.basicSalary : (staff.monthlySalary || 0);
                            const bonus = ov.bonus || 0;
                            const otherAllow = ov.otherAllowance !== undefined ? ov.otherAllowance : (staff.allowance || 0);
                            const advAdj = ov.advanceAdjustment || 0;
                            const deduct = (ov.deduction || 0) + advAdj;
                            const payable = basic + bonus + otherAllow;
                            const net = Math.max(0, payable - deduct);

                            return (
                              <tr key={staff.id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50/20' : 'opacity-60 bg-slate-50/50'}`}>
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStaffIds(prev => [...prev, staff.id]);
                                      } else {
                                        setSelectedStaffIds(prev => prev.filter(id => id !== staff.id));
                                      }
                                    }}
                                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="font-semibold text-slate-800">{staff.name}</div>
                                  <div className="text-[11px] text-slate-500">{staff.designationBn} {staff.staffCode ? `(${staff.staffCode})` : ''}</div>
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    value={basic}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setStaffOverrides(prev => ({
                                        ...prev,
                                        [staff.id]: { ...prev[staff.id], basicSalary: val }
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 text-right text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    value={bonus}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setStaffOverrides(prev => ({
                                        ...prev,
                                        [staff.id]: { ...prev[staff.id], bonus: val }
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 text-right text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    value={otherAllow}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setStaffOverrides(prev => ({
                                        ...prev,
                                        [staff.id]: { ...prev[staff.id], otherAllowance: val }
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 text-right text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    value={ov.deduction || 0}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setStaffOverrides(prev => ({
                                        ...prev,
                                        [staff.id]: { ...prev[staff.id], deduction: val }
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 text-right text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 text-rose-600"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    value={advAdj}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setStaffOverrides(prev => ({
                                        ...prev,
                                        [staff.id]: { ...prev[staff.id], advanceAdjustment: val }
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 text-right text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 text-amber-600"
                                  />
                                </td>
                                <td className="p-3 text-right bg-emerald-50/50 font-bold text-emerald-800 text-sm">
                                  ৳{formatCurrency(net, language)}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      disabled={!isSelected}
                                      value={ov.paymentMethod || staff.paymentPreference || 'BANK'}
                                      onChange={(e) => {
                                        const val = e.target.value as any;
                                        setStaffOverrides(prev => ({
                                          ...prev,
                                          [staff.id]: { ...prev[staff.id], paymentMethod: val }
                                        }));
                                      }}
                                      className="px-2 py-1 text-[11px] bg-white border border-slate-300 rounded"
                                    >
                                      <option value="BANK">ব্যাংক</option>
                                      <option value="CASH">ক্যাশ</option>
                                      <option value="MFS">বিকাশ/নগদ</option>
                                    </select>
                                    {staff.accountNumber ? (
                                      <span className="text-[11px] text-slate-500 truncate max-w-[130px]" title={`${staff.bankName || ''} - ${staff.accountNumber}`}>
                                        {staff.accountNumber}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-amber-600">হিসাব নেই</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                          <td colSpan={2} className="p-3 text-right">সর্বমোট ({summary.totalStaff} জন):</td>
                          <td className="p-3 text-right">৳{formatCurrency(summary.totalBasic, language)}</td>
                          <td className="p-3 text-right">৳{formatCurrency(summary.totalBonus, language)}</td>
                          <td className="p-3 text-right">৳{formatCurrency(summary.totalAllow, language)}</td>
                          <td className="p-3 text-right text-rose-600">৳{formatCurrency(summary.totalDeduct, language)}</td>
                          <td className="p-3 text-right text-amber-600">৳{formatCurrency(summary.totalAdv, language)}</td>
                          <td className="p-3 text-right text-emerald-800 text-base bg-emerald-100/70">
                            ৳{formatCurrency(summary.totalNet, language)}
                          </td>
                          <td className="p-3 text-xs text-slate-500">
                            ব্যাংক: {summary.bankCount} জন | ক্যাশ: {summary.cashCount} জন
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-600">
                    কথায়: <strong className="text-emerald-800">{numberToBanglaWords(summary.totalNet)}</strong>
                  </div>
                  <div className="text-slate-500">
                    হিসাব ডেবিট: <strong>{selectedAccount?.nameBn}</strong> (ব্যালেন্স: ৳{formatCurrency(selectedAccount?.currentBalance || 0, language)})
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* VIEW / DISBURSE MODE */
            <div className="space-y-6">
              {/* Batch Summary Card */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      selectedBatch?.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      selectedBatch?.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedBatch?.status === 'PAID' ? 'পরিশোধিত (Disbursed)' :
                       selectedBatch?.status === 'CANCELLED' ? 'বাতিলকৃত (Cancelled)' : 'অনুমোদিত (Approved)'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 mt-2">{selectedBatch?.title}</h3>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-4">
                      <span>ব্যাচ নং: <strong>{selectedBatch?.batchNumber}</strong></span>
                      <span>মাস: <strong>{selectedBatch?.paymentMonth}</strong></span>
                      <span>তারিখ: <strong>{selectedBatch?.paymentDate ? formatDate(selectedBatch.paymentDate, language) : ''}</strong></span>
                      <span>তৈরি করেছেন: <strong>{selectedBatch?.createdByName}</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">মোট বিতরণকৃত অর্থ</div>
                    <div className="text-2xl font-black text-emerald-700">
                      ৳{formatCurrency(selectedBatch?.totalAmount || 0, language)}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      মোট কর্মী: {selectedBatch?.totalStaff || 0} জন
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500">মূল বেতন:</span>
                    <div className="text-sm font-bold text-slate-800">৳{formatCurrency(selectedBatch?.totalBasicSalary || 0, language)}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500">মোট ভাতা ও বোনাস:</span>
                    <div className="text-sm font-bold text-slate-800">৳{formatCurrency(selectedBatch?.totalAllowances || 0, language)}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500">মোট কর্তন:</span>
                    <div className="text-sm font-bold text-rose-600">৳{formatCurrency(selectedBatch?.totalDeductions || 0, language)}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500">অগ্রিম সমন্বয়:</span>
                    <div className="text-sm font-bold text-amber-600">৳{formatCurrency(selectedBatch?.totalAdvanceAdjusted || 0, language)}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-700">
                  ব্যাচভুক্ত স্টাফদের তালিকা ও আর্থিক বিবরণী
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="p-3">#</th>
                        <th className="p-3">স্টাফের নাম</th>
                        <th className="p-3">পদবি</th>
                        <th className="p-3 text-right">মূল বেতন</th>
                        <th className="p-3 text-right">ভাতা/বোনাস</th>
                        <th className="p-3 text-right">কর্তন</th>
                        <th className="p-3 text-right font-bold text-emerald-800">নিট প্রদেয়</th>
                        <th className="p-3">মাধ্যম ও ব্যাংক হিসাব</th>
                        <th className="p-3 text-center">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedBatch?.items?.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-800">{item.staffName}</td>
                          <td className="p-3 text-slate-600">{item.designationBn}</td>
                          <td className="p-3 text-right">৳{formatCurrency(item.basicSalary, language)}</td>
                          <td className="p-3 text-right">৳{formatCurrency(item.allowance || 0, language)}</td>
                          <td className="p-3 text-right text-rose-600">৳{formatCurrency(item.deduction || 0, language)}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">৳{formatCurrency(item.netPayable, language)}</td>
                          <td className="p-3">
                            <span className="font-medium text-slate-700">{item.paymentMethod === 'BANK' ? 'ব্যাংক' : 'ক্যাশ'}</span>
                            {item.accountNumber && (
                              <div className="text-[11px] text-slate-500">{item.bankName} ({item.accountNumber})</div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              item.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {item.status === 'PAID' ? 'পরিশোধিত' : 'অপেক্ষমাণ'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
          >
            বন্ধ করুন
          </button>

          {mode === 'CREATE' ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSubmitting || summary.totalStaff === 0}
                onClick={() => handleCreateBatch(false)}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                অনুমোদিত হিসেবে সংরক্ষণ
              </button>
              <button
                type="button"
                disabled={isSubmitting || summary.totalStaff === 0}
                onClick={() => handleCreateBatch(true)}
                className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                সংরক্ষণ ও তাৎক্ষণিক বিতরণ (Disburse)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {selectedBatch?.status !== 'PAID' && selectedBatch?.status !== 'CANCELLED' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDisburseExisting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  ব্যাচ বিতরণ কার্যকর করুন (Disburse Now)
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                প্রিন্ট করুন
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

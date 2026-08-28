import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileText,
  History,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Edit3,
  RefreshCw,
  Search,
  Check,
  Ban,
  Download,
  Eye,
} from 'lucide-react';
import { Staff, StaffPayment, FinancialAccount, Mosque, CommitteeTerm, StaffBankTransferLetter, StaffBankTransferLetterItem } from '../types';
import { Language, formatDate, formatCurrency } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { api } from '../lib/api';

interface BankTransferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  staffPayments: StaffPayment[];
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  committeeTerms?: CommitteeTerm[];
  language: Language;
  currentUser?: any;
  onLetterCreated?: (letter: StaffBankTransferLetter) => void;
  initialSelectedMonth?: string;
  initialStaffIds?: string[];
}

export const BankTransferLetterModal: React.FC<BankTransferLetterModalProps> = ({
  isOpen,
  onClose,
  staffList,
  staffPayments,
  accounts,
  currentMosque,
  committeeTerms,
  language,
  currentUser,
  onLetterCreated,
  initialSelectedMonth,
  initialStaffIds,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'create' | 'archive'>('create');

  // Print & Layout Settings
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [showDeclaration, setShowDeclaration] = useState(true);
  const [signatoriesCount, setSignatoriesCount] = useState<3 | 4>(3);

  // Archive & History State
  const [savedLetters, setSavedLetters] = useState<StaffBankTransferLetter[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [selectedArchiveLetter, setSelectedArchiveLetter] = useState<StaffBankTransferLetter | null>(null);

  // Form State for Generator
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [paymentMonth, setPaymentMonth] = useState(initialSelectedMonth || currentMonthStr);
  const [paymentType, setPaymentType] = useState<StaffBankTransferLetter['paymentType']>('SALARY');
  const [paymentTypeCustomBn, setPaymentTypeCustomBn] = useState('');
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectionScope, setSelectionScope] = useState<'ALL' | 'SELECTED'>('ALL');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(initialStaffIds || []);

  // Bank & Mosque Account Selection
  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.accountType === 'BANK');
  }, [accounts]);

  const [selectedMosqueAccountId, setSelectedMosqueAccountId] = useState<string>(
    bankAccounts[0]?.id || ''
  );
  const [customMosqueBankName, setCustomMosqueBankName] = useState(
    bankAccounts[0]?.bankName || 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি'
  );
  const [customMosqueBranchName, setCustomMosqueBranchName] = useState(
    bankAccounts[0]?.branchName || 'মিরপুর শাখা, ঢাকা'
  );
  const [customMosqueAccountNumber, setCustomMosqueAccountNumber] = useState(
    bankAccounts[0]?.accountNumber || '২০৫০২১৩০০১২২৯'
  );
  const [bankAddress, setBankAddress] = useState('শাখা কার্যালয়, ঢাকা');

  // Memo Number & Auto Sequence
  const [memoNumber, setMemoNumber] = useState('');
  const [runningSerial, setRunningSerial] = useState(1);
  const [loadingMemo, setLoadingMemo] = useState(false);

  // Custom Amounts override per staff in the letter (id -> amount)
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  // Missing bank details inline edits (staffId -> fields)
  const [inlineBankDetails, setInlineBankDetails] = useState<Record<string, Partial<Staff>>>({});

  // Letter Text customizer
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [customDeclaration, setCustomDeclaration] = useState(
    'উপরোক্ত তালিকাভুক্ত সকল ব্যক্তিবর্গ বর্তমানে অত্র মসজিদে কর্মরত রয়েছেন এবং তাঁদের প্রদেয় অর্থ অত্র মসজিদ পরিচালনা কমিটির অনুমোদিত হিসাব অনুযায়ী নির্ধারিত।'
  );
  const [letterNotes, setLetterNotes] = useState('');

  // Saving / Printing state
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Month names in Bengali
  const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const getMonthNameBn = (monthStrVal: string) => {
    try {
      const parts = monthStrVal.split('-');
      const mIndex = parseInt(parts[1], 10) - 1;
      const year = parts[0];
      const mName = banglaMonths[mIndex] || monthStrVal;
      return `${mName} ${year}`;
    } catch {
      return monthStrVal;
    }
  };

  // Sync selected mosque bank account
  useEffect(() => {
    if (selectedMosqueAccountId) {
      const acc = bankAccounts.find((a) => a.id === selectedMosqueAccountId);
      if (acc) {
        setCustomMosqueBankName(acc.bankName || 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি');
        setCustomMosqueBranchName(acc.branchName || 'মিরপুর শাখা');
        setCustomMosqueAccountNumber(acc.accountNumber || '');
      }
    }
  }, [selectedMosqueAccountId, bankAccounts]);

  // Fetch Archive Letters
  const loadArchiveLetters = async () => {
    try {
      setLoadingArchive(true);
      const res = await api.getStaffBankTransferLetters();
      setSavedLetters(res || []);
    } catch (err) {
      console.error('Failed to load bank transfer letters archive:', err);
    } finally {
      setLoadingArchive(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active');
      loadArchiveLetters();
    } else {
      document.body.classList.remove('print-modal-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active');
    };
  }, [isOpen]);

  // Fetch next memo number whenever parameters change
  useEffect(() => {
    if (!isOpen || selectedArchiveLetter) return;

    let isMounted = true;
    const fetchMemo = async () => {
      try {
        setLoadingMemo(true);
        const [year, month] = paymentMonth.split('-');
        const data = await api.getNextBankTransferMemo({
          paymentType,
          selectionScope,
          paymentMonth,
          paymentYear: year,
        });
        if (isMounted && data) {
          setMemoNumber(data.memoNumber);
          setRunningSerial(data.nextSerial);
        }
      } catch (err) {
        console.error('Failed to fetch next memo number:', err);
      } finally {
        if (isMounted) setLoadingMemo(false);
      }
    };

    fetchMemo();
    return () => {
      isMounted = false;
    };
  }, [isOpen, paymentType, selectionScope, paymentMonth, selectedArchiveLetter]);

  // Active Staff Filtering
  const activeStaffList = useMemo(() => {
    return staffList.filter((s) => s.status !== 'INACTIVE' && (s.status as any) !== 'TERMINATED');
  }, [staffList]);

  // Initialize selected staff ids
  useEffect(() => {
    if (selectionScope === 'ALL') {
      setSelectedStaffIds(activeStaffList.map((s) => s.id));
    } else if (initialStaffIds && initialStaffIds.length > 0) {
      setSelectedStaffIds(initialStaffIds);
    }
  }, [selectionScope, activeStaffList, initialStaffIds]);

  // Determine items to include in the letter
  const letterItems: StaffBankTransferLetterItem[] = useMemo(() => {
    // If viewing an archived letter, use its fixed snapshot items
    if (selectedArchiveLetter) {
      return selectedArchiveLetter.items;
    }

    const targetStaff = activeStaffList.filter((s) =>
      selectionScope === 'ALL' ? true : selectedStaffIds.includes(s.id)
    );

    return targetStaff.map((staff, idx) => {
      // Check if there is an existing payment record for this staff and month
      const existingPay = staffPayments.find(
        (p) => p.staffId === staff.id && p.month === paymentMonth && p.status !== 'CANCELLED'
      );

      const overrideAmount = customAmounts[staff.id];
      const basicSalary = staff.monthlySalary || 0;
      const allowance = existingPay?.allowance || staff.allowance || 0;
      const bonus = existingPay?.bonus || 0;
      const deduction = existingPay?.deduction || 0;
      
      let netPayable = overrideAmount !== undefined 
        ? overrideAmount 
        : existingPay?.netPaid !== undefined 
          ? existingPay.netPaid 
          : (basicSalary + (paymentType === 'FESTIVAL_ALLOWANCE' ? allowance || basicSalary : 0) - deduction);

      if (netPayable < 0) netPayable = 0;

      const inlineBank = inlineBankDetails[staff.id] || {};
      const bankName = inlineBank.bankName || staff.bankName || customMosqueBankName || 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি';
      const branchName = inlineBank.branchName || staff.branchName || customMosqueBranchName || 'প্রধান শাখা';
      const accountHolderName = inlineBank.accountHolderName || staff.accountHolderName || staff.name;
      const accountNumber = inlineBank.accountNumber || staff.accountNumber || '';
      const routingNumber = inlineBank.routingNumber || staff.routingNumber || '';

      return {
        staffId: staff.id,
        staffName: staff.name,
        designation: staff.designation,
        designationBn: staff.designationBn || staff.designation,
        bankName,
        branchName,
        accountHolderName,
        accountNumber,
        routingNumber,
        basicSalary,
        allowance,
        bonus,
        deduction,
        netPayable,
        paymentId: existingPay?.id,
        notes: staff.notes,
      };
    });
  }, [
    selectedArchiveLetter,
    activeStaffList,
    selectionScope,
    selectedStaffIds,
    staffPayments,
    paymentMonth,
    customAmounts,
    paymentType,
    inlineBankDetails,
    customMosqueBankName,
    customMosqueBranchName,
  ]);

  // Calculate Totals
  const totalAmount = useMemo(() => {
    if (selectedArchiveLetter) {
      return selectedArchiveLetter.totalAmount;
    }
    return letterItems.reduce((sum, item) => sum + (item.netPayable || 0), 0);
  }, [selectedArchiveLetter, letterItems]);

  const totalAmountWordsBn = useMemo(() => {
    if (selectedArchiveLetter?.totalAmountInWordsBn) {
      return selectedArchiveLetter.totalAmountInWordsBn;
    }
    return numberToBanglaWords(totalAmount);
  }, [selectedArchiveLetter, totalAmount]);

  // Check for missing bank details
  const missingBankAccountsCount = useMemo(() => {
    return letterItems.filter((it) => !it.accountNumber || it.accountNumber.trim().length < 4).length;
  }, [letterItems]);

  // Payment Type labels in Bangla
  const getPaymentTypeTitleBn = (type: StaffBankTransferLetter['paymentType']) => {
    switch (type) {
      case 'SALARY':
        return 'নিয়মিত মাসিক হাদিয়া ও বেতন';
      case 'FESTIVAL_ALLOWANCE':
        return 'পবিত্র ঈদুল ফিতর / ঈদুল আযহা উৎসব ভাতা';
      case 'BONUS':
        return 'বিশেষ বোনাস ও অনুদান';
      case 'SPECIAL_ALLOWANCE':
        return 'বিশেষ মাসিক ভাতা';
      default:
        return paymentTypeCustomBn || 'মাসিক সম্মানী ও ভাতা';
    }
  };

  // Dynamic Subject calculation
  const generatedSubject = useMemo(() => {
    if (selectedArchiveLetter?.subject) return selectedArchiveLetter.subject;
    if (customSubject) return customSubject;

    const monthBn = getMonthNameBn(paymentMonth);
    const typeTitle = getPaymentTypeTitleBn(paymentType);
    return `বিষয়: ${monthBn} মাসের ইমাম ও স্টাফদের ${typeTitle} ব্যাংক হিসাবে স্থানান্তর প্রসঙ্গে।`;
  }, [selectedArchiveLetter, customSubject, paymentMonth, paymentType, paymentTypeCustomBn]);

  // Dynamic Body calculation
  const generatedBody = useMemo(() => {
    if (selectedArchiveLetter?.bodyParagraph) return selectedArchiveLetter.bodyParagraph;
    if (customBody) return customBody;

    const monthBn = getMonthNameBn(paymentMonth);
    const typeTitle = getPaymentTypeTitleBn(paymentType);
    return `অত্র মসজিদের কর্মরত ইমাম ও স্টাফদের ${monthBn} মাসের ${typeTitle} বাবদ সর্বমোট ${totalAmountWordsBn} (৳${totalAmount.toLocaleString('en-IN')}) নিম্নবর্ণিত স্টাফদের সংশ্লিষ্ট ব্যাংক হিসাবে সরাসরি ফান্ড ট্রান্সফার করার জন্য বিনীত অনুরোধ জানাচ্ছি।`;
  }, [selectedArchiveLetter, customBody, paymentMonth, paymentType, totalAmount, totalAmountWordsBn]);

  // Active Committee Term
  const activeTerm = useMemo(() => {
    return committeeTerms?.find((t) => t.status === 'ACTIVE') || committeeTerms?.[0];
  }, [committeeTerms]);

  // Handle Save & Finalize Letter
  const handleSaveLetter = async () => {
    if (letterItems.length === 0) {
      alert('কমপক্ষে একজন স্টাফ নির্বাচন করুন।');
      return;
    }

    try {
      setSaving(true);
      setSaveSuccessMsg(null);

      const payload: Partial<StaffBankTransferLetter> = {
        letterDate,
        paymentType,
        paymentTypeCustomBn: paymentTypeCustomBn || undefined,
        paymentMonth,
        paymentYear: parseInt(paymentMonth.split('-')[0], 10) || new Date().getFullYear(),
        selectionScope,
        bankName: customMosqueBankName,
        branchName: customMosqueBranchName,
        bankAddress,
        mosqueBankAccountId: selectedMosqueAccountId || undefined,
        mosqueBankAccountName: currentMosque?.name || 'মসজিদ তহবিল',
        mosqueBankAccountNumber: customMosqueAccountNumber,
        subject: generatedSubject,
        bodyParagraph: generatedBody,
        declarationText: customDeclaration,
        items: letterItems,
        relatedPaymentIds: letterItems.map((i) => i.paymentId).filter(Boolean) as string[],
        termId: activeTerm?.id,
        termTitle: activeTerm?.title,
        showLetterhead,
        totalAmountInWordsBn: totalAmountWordsBn,
        notes: letterNotes.trim() || undefined,
      };

      const saved = await api.createStaffBankTransferLetter(payload);
      setSaveSuccessMsg(`স্মারক নং ${saved.memoNumber} সফলভাবে সংরক্ষিত হয়েছে।`);
      setSavedLetters((prev) => [saved, ...prev]);
      if (onLetterCreated) onLetterCreated(saved);
      setSelectedArchiveLetter(saved);
    } catch (err: any) {
      alert(err?.message || 'লেটার সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  // Handle Print
  const handlePrint = () => {
    document.body.classList.add('print-modal-active');
    window.print();
  };

  // Switch to creating a new letter
  const handleStartNew = () => {
    setSelectedArchiveLetter(null);
    setActiveTab('create');
    setCustomAmounts({});
    setSaveSuccessMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print-modal-portal">
      <div className="bg-slate-100 rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-300 overflow-hidden my-4 flex flex-col max-h-[95vh] print-modal-card">
        {/* Modal Toolbar (Strictly Hidden on Print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/30 border border-blue-400/30 rounded-lg text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm font-siliguri text-white">
                  ইমাম ও স্টাফ বেতন/ভাতা ব্যাংক ট্রান্সফার লেটার
                </h3>
                {selectedArchiveLetter ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    সংরক্ষিত স্মারক: {selectedArchiveLetter.memoNumber}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                    নতুন ড্রাফট
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                ব্যাংক হিসাব ডেবিট/ক্রেডিট অনুরোধের অফিশিয়াল প্রিন্ট কপি ও রেজিস্ট্রি
              </p>
            </div>
          </div>

          {/* Tab buttons and Print controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div className="bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex items-center text-xs">
              <button
                id="btn-tab-create-letter"
                onClick={handleStartNew}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'create' && !selectedArchiveLetter
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন লেটার</span>
              </button>
              <button
                id="btn-tab-archive-letters"
                onClick={() => {
                  setActiveTab('archive');
                  loadArchiveLetters();
                }}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'archive'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>আর্কাইভ ও পূর্ববর্তী লেটার ({savedLetters.length})</span>
              </button>
            </div>

            {/* Letterhead Toggle */}
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 select-none transition-colors">
              <input
                id="toggle-bank-letter-letterhead"
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>লেটারহেড প্যাড অন</span>
            </label>

            {/* Save Button (If in draft mode) */}
            {!selectedArchiveLetter && (
              <button
                id="btn-save-bank-transfer-letter"
                onClick={handleSaveLetter}
                disabled={saving || letterItems.length === 0}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="স্মারক নম্বর সহ এই লেটারটি সিস্টেমে স্থায়ীভাবে সংরক্ষণ করুন"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ ও চূড়ান্ত করুন'}</span>
              </button>
            )}

            {/* Print Button */}
            <button
              id="btn-print-bank-transfer-letter"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট করুন (A4 Print)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row bg-slate-200">
          {/* LEFT: Configuration & Filter Sidebar (Hidden on Print) */}
          <div className="w-full lg:w-96 bg-white border-r border-slate-300 p-4 space-y-4 shrink-0 overflow-y-auto text-xs print:hidden no-print max-h-[85vh] lg:max-h-none">
            {activeTab === 'archive' ? (
              /* Archive List View */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h4 className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>পূর্বে ইস্যুকৃত ব্যাংক চিঠি তালিকা</span>
                  </h4>
                  <button
                    onClick={loadArchiveLetters}
                    className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                    title="রিফ্রেশ করুন"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingArchive ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingArchive ? (
                  <div className="py-8 text-center text-slate-500">লোড হচ্ছে...</div>
                ) : savedLetters.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    কোনো সংরক্ষিত ব্যাংক ট্রান্সফার চিঠি পাওয়া যায়নি।
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                    {savedLetters.map((letter) => {
                      const isSelected = selectedArchiveLetter?.id === letter.id;
                      return (
                        <div
                          key={letter.id}
                          onClick={() => setSelectedArchiveLetter(letter)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-400'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-blue-700 text-[11px]">
                              {letter.memoNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                letter.status === 'CANCELLED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {letter.status === 'CANCELLED' ? 'বাতিলকৃত' : 'অনুমোদিত'}
                            </span>
                          </div>

                          <div className="text-[11px] font-semibold text-slate-800">
                            মাস: {getMonthNameBn(letter.paymentMonth)} • {letter.staffCount} জন স্টাফ
                          </div>

                          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600">
                            <span>তারিখ: {formatDate(letter.letterDate, language)}</span>
                            <strong className="text-slate-900">৳ {letter.totalAmount.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Letter Generator Form */
              <div className="space-y-4">
                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Parameter 1: Month & Type */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>বেতন মাস ও হাদিয়ার ধরন</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        পরিশোধের মাস *
                      </label>
                      <input
                        id="input-letter-payment-month"
                        type="month"
                        value={paymentMonth}
                        onChange={(e) => setPaymentMonth(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        চিঠির তারিখ *
                      </label>
                      <input
                        id="input-letter-date"
                        type="date"
                        value={letterDate}
                        onChange={(e) => setLetterDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      পেমেন্টের শ্রেণি / ক্যাটাগরি *
                    </label>
                    <select
                      id="select-letter-payment-type"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SALARY">নিয়মিত মাসিক হাদিয়া/বেতন (Salary)</option>
                      <option value="FESTIVAL_ALLOWANCE">পবিত্র ঈদুল ফিতর / ঈদুল আযহা উৎসব ভাতা</option>
                      <option value="BONUS">বিশেষ বোনাস / অনুদান (Bonus)</option>
                      <option value="SPECIAL_ALLOWANCE">বিশেষ মাসিক ভাতা (Special Allowance)</option>
                      <option value="OTHER">অন্যান্য ভাতা (Custom)</option>
                    </select>
                  </div>

                  {paymentType === 'OTHER' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        কাস্টম ভাতার নাম (বাংলা)
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: রমজানুল মোবারক বিশেষ সম্মানী"
                        value={paymentTypeCustomBn}
                        onChange={(e) => setPaymentTypeCustomBn(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Parameter 2: Mosque Bank Account Details */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>মসজিদের ডেবিট ব্যাংক হিসাব</span>
                  </h4>

                  {bankAccounts.length > 0 ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        নিবন্ধিত একাউন্ট নির্বাচন করুন
                      </label>
                      <select
                        id="select-mosque-bank-account"
                        value={selectedMosqueAccountId}
                        onChange={(e) => setSelectedMosqueAccountId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        {bankAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.bankName} - {acc.accountName} ({acc.accountNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ব্যাংকের নাম *
                      </label>
                      <input
                        type="text"
                        value={customMosqueBankName}
                        onChange={(e) => setCustomMosqueBankName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        শাখার নাম *
                      </label>
                      <input
                        type="text"
                        value={customMosqueBranchName}
                        onChange={(e) => setCustomMosqueBranchName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      মসজিদের ব্যাংক একাউন্ট নম্বর *
                    </label>
                    <input
                      type="text"
                      value={customMosqueAccountNumber}
                      onChange={(e) => setCustomMosqueAccountNumber(e.target.value)}
                      placeholder="যে একাউন্ট হতে টাকা ডেবিট হবে"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Parameter 3: Staff Selection & Scope */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      <span>স্টাফ তালিকা নির্বাচন ({letterItems.length} জন)</span>
                    </h4>
                    <div className="flex items-center space-x-1 bg-slate-200 p-0.5 rounded-lg text-[10px]">
                      <button
                        onClick={() => setSelectionScope('ALL')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                          selectionScope === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        সকল ({activeStaffList.length})
                      </button>
                      <button
                        onClick={() => setSelectionScope('SELECTED')}
                        className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                          selectionScope === 'SELECTED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        নির্দিষ্ট
                      </button>
                    </div>
                  </div>

                  {missingBankAccountsCount > 0 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-amber-900 text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>{missingBankAccountsCount} জন স্টাফের ব্যাংক তথ্য অসম্পূর্ণ:</strong>
                        <p className="text-[10px] text-amber-800 mt-0.5">
                          চিঠি তৈরির পূর্বে নিচে তাঁদের ব্যাংক হিসাব নম্বর প্রদান করুন।
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Staff Selection List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activeStaffList.map((staff) => {
                      const isSelected = selectionScope === 'ALL' || selectedStaffIds.includes(staff.id);
                      const currentAcc = inlineBankDetails[staff.id]?.accountNumber ?? staff.accountNumber;
                      const hasAcc = Boolean(currentAcc && currentAcc.trim().length > 3);

                      return (
                        <div
                          key={staff.id}
                          className={`p-2 rounded-lg border text-xs transition-colors ${
                            isSelected ? 'bg-white border-blue-300' : 'bg-slate-100/60 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer select-none">
                              {selectionScope === 'SELECTED' && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStaffIds((prev) => [...prev, staff.id]);
                                    } else {
                                      setSelectedStaffIds((prev) => prev.filter((id) => id !== staff.id));
                                    }
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-0"
                                />
                              )}
                              <div>
                                <span className="font-bold text-slate-900 block">{staff.name}</span>
                                <span className="text-[10px] text-slate-500">{staff.designationBn}</span>
                              </div>
                            </label>

                            <div className="text-right">
                              <span className="font-mono font-bold text-blue-900 block text-xs">
                                ৳ {(customAmounts[staff.id] ?? staff.monthlySalary ?? 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[9px] text-slate-400">নির্ধারিত হাদিয়া</span>
                            </div>
                          </div>

                          {/* Inline Bank A/C Editor if missing */}
                          {!hasAcc && isSelected && (
                            <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[11px]">
                              <input
                                type="text"
                                placeholder="ব্যাংক হিসাব নম্বর লিখুন..."
                                value={inlineBankDetails[staff.id]?.accountNumber || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInlineBankDetails((prev) => ({
                                    ...prev,
                                    [staff.id]: {
                                      ...prev[staff.id],
                                      accountNumber: val,
                                      accountHolderName: staff.name,
                                    },
                                  }));
                                }}
                                className="px-2 py-1 bg-amber-50/60 border border-amber-300 rounded text-slate-900 font-mono text-[10px] focus:bg-white"
                              />
                              <input
                                type="text"
                                placeholder="শাখার নাম..."
                                value={inlineBankDetails[staff.id]?.branchName || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInlineBankDetails((prev) => ({
                                    ...prev,
                                    [staff.id]: {
                                      ...prev[staff.id],
                                      branchName: val,
                                    },
                                  }));
                                }}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-900 text-[10px] focus:bg-white"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Parameter 4: Custom Notes & Memo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      চিঠির স্মারক নম্বর (Memo No)
                    </label>
                    <input
                      type="text"
                      value={memoNumber}
                      onChange={(e) => setMemoNumber(e.target.value)}
                      placeholder="অটো জেনারেটেড স্মারক নম্বর"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-blue-900 font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      চিঠির প্রাপক ব্যাংক শাখা কার্যালয়
                    </label>
                    <input
                      type="text"
                      value={bankAddress}
                      onChange={(e) => setBankAddress(e.target.value)}
                      placeholder="যেমন: মিরপুর-১০, ঢাকা-১২১৬"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Live A4 Document Print Preview Paper */}
          <div className="flex-1 p-4 sm:p-8 flex justify-center items-start overflow-y-auto">
            {/* Real A4 Canvas Document Wrapper */}
            <div
              id="bank-letter-print-canvas"
              className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] shadow-lg rounded-xl p-8 sm:p-12 space-y-6 relative font-sans leading-relaxed print-modal-paper print:shadow-none print:rounded-none print:m-0 print:p-8"
              style={{
                fontFamily: 'var(--font-secondary, "Baloo Da 2", system-ui, sans-serif)',
              }}
            >
              {/* Top Letterhead Pad Header (Conditional on showLetterhead) */}
              {showLetterhead ? (
                <div className="text-center space-y-1.5 pb-4 border-b-2 border-slate-900">
                  {/* Bismillah */}
                  <div className="text-sm font-semibold text-slate-700 font-arabic tracking-wide pb-1">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>

                  <div className="flex items-center justify-center space-x-3">
                    {currentMosque?.logoUrl ? (
                      <img
                        src={currentMosque.logoUrl}
                        alt="Mosque Logo"
                        className="w-14 h-14 object-contain rounded-full border border-slate-200 p-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                    )}

                    <div className="text-left">
                      <h1 className="text-xl font-black font-siliguri text-slate-950 tracking-tight leading-tight">
                        {currentMosque?.nameBn || currentMosque?.name || 'বাইতুল মামুর জামে মসজিদ ও ইসলামিক কমপ্লেক্স'}
                      </h1>
                      <p className="text-[11px] text-slate-700 font-medium">
                        {currentMosque?.address || 'ঠিকানা: ব্লক-ডি, মিরপুর-১০, ঢাকা-১২১৬'}
                        {currentMosque?.phone ? ` | ফোন: ${currentMosque.phone}` : ''}
                        {currentMosque?.registrationNumber ? ` | রেজিঃ নং: ${currentMosque.registrationNumber}` : ''}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        (সমাজকল্যাণ ও ধর্মীয় কার্যাবলি পরিচালনা পরিষদ)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Pre-Printed Letterhead Space */
                <div className="h-28 sm:h-32 border-b border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs italic print:border-none print:text-transparent">
                  [ প্রি-প্রিন্টেড লেটারহেড প্যাডের জন্য সংরক্ষিত স্থান (Letterhead Pad Margin) ]
                </div>
              )}

              {/* Memo & Date Meta Header */}
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pt-1 pb-1">
                <div>
                  <span>স্মারক নং: </span>
                  <strong className="font-mono text-slate-950 font-bold text-xs">
                    {selectedArchiveLetter?.memoNumber || memoNumber || 'MJMWE/Bank/Salary/All/2026/01'}
                  </strong>
                </div>
                <div>
                  <span>তারিখ: </span>
                  <strong className="font-medium text-slate-950">
                    {formatDate(selectedArchiveLetter?.letterDate || letterDate, language)}
                  </strong>
                </div>
              </div>

              {/* Recipient Bank Official Address Block */}
              <div className="text-xs space-y-0.5 text-slate-900 leading-snug">
                <p className="font-bold">বরাবর,</p>
                <p className="font-bold text-slate-950">শাখা ব্যবস্থাপক</p>
                <p className="font-bold text-slate-950">
                  {selectedArchiveLetter?.bankName || customMosqueBankName || 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি'}
                </p>
                <p className="font-medium text-slate-800">
                  {selectedArchiveLetter?.branchName || customMosqueBranchName || 'মিরপুর শাখা'}
                </p>
                <p className="text-slate-600 text-[11px]">
                  {selectedArchiveLetter?.bankAddress || bankAddress || 'ঢাকা'}
                </p>
              </div>

              {/* Subject */}
              <div className="py-1">
                <h3 className="text-xs sm:text-[13px] font-bold font-siliguri text-slate-950 underline underline-offset-4 decoration-slate-400">
                  {generatedSubject}
                </h3>
              </div>

              {/* Salutation & Formal Request Body Paragraph */}
              <div className="text-xs text-slate-900 space-y-2 text-justify leading-relaxed">
                <p className="font-bold">জনাব,</p>
                <p className="indent-6">
                  আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ।
                </p>
                <p>
                  {generatedBody}
                </p>
                <p>
                  অত্র মসজিদের অনুকূলে আপনার শাখায় পরিচালিত চলতি/সঞ্চয়ী হিসাব নং{' '}
                  <strong className="font-mono font-bold text-slate-950 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                    {selectedArchiveLetter?.mosqueBankAccountNumber || customMosqueAccountNumber || '২০৫০২১৩০০১২২৯'}
                  </strong>{' '}
                  হতে উল্লেখিত সর্বমোট{' '}
                  <strong className="font-bold text-slate-950">
                    ৳ {totalAmount.toLocaleString('en-IN')} ({totalAmountWordsBn})
                  </strong>{' '}
                  ডেবিট করে নিম্নবর্ণিত কর্মরত ব্যক্তিবর্গের ব্যাংক হিসাবে অনতিবিলম্বে ট্রান্সফার/ক্রেডিট করার প্রয়োজনীয় ব্যবস্থা গ্রহণে আপনার একান্ত মর্জি কামনা করছি।
                </p>
              </div>

              {/* Detailed Staff Transfer Schedule Table */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 pb-1">
                  <span>কর্মরত ইমাম ও স্টাফদের ব্যাংক হিসাবের তফসিল বিবরণী:</span>
                  <span>মোট স্টাফ: {letterItems.length} জন</span>
                </div>

                <table className="w-full text-left text-xs border-collapse border border-slate-900">
                  <thead>
                    <tr className="bg-slate-100 text-slate-950 font-bold border-b border-slate-900 text-[11px]">
                      <th className="py-2 px-2 border-r border-slate-900 text-center w-10">ক্রম</th>
                      <th className="py-2 px-2.5 border-r border-slate-900">স্টাফের নাম ও পদবি</th>
                      <th className="py-2 px-2.5 border-r border-slate-900">হিসাবধারীর নাম (A/C Title)</th>
                      <th className="py-2 px-2.5 border-r border-slate-900 font-mono text-center">ব্যাংক হিসাব নম্বর</th>
                      <th className="py-2 px-2 border-r border-slate-900">ব্যাংক ও শাখা</th>
                      <th className="py-2 px-2.5 text-right w-28">স্থানান্তরিত অর্থ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400 text-[11px] text-slate-900">
                    {letterItems.map((item, index) => (
                      <tr key={item.staffId || index} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 border-r border-slate-900 text-center font-bold">
                          {index + 1}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-900">
                          <strong className="block text-slate-950 font-bold">{item.staffName}</strong>
                          <span className="text-[10px] text-slate-600 font-medium">{item.designationBn}</span>
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-900 font-medium">
                          {item.accountHolderName || item.staffName}
                        </td>
                        <td className="py-1.5 px-2.5 border-r border-slate-900 font-mono font-bold text-slate-950 text-center">
                          {item.accountNumber || (
                            <span className="text-rose-600 font-normal italic text-[10px]">তথ্য নেই</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-900 text-[10px]">
                          <span className="block font-semibold text-slate-900">{item.bankName}</span>
                          <span className="text-slate-600">{item.branchName}</span>
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-950">
                          ৳ {item.netPayable?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
                      <td colSpan={5} className="py-2 px-3 border-r border-slate-900 text-right font-bold">
                        সর্বমোট প্রদেয় অর্থ (Total Amount):
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-slate-950 text-sm">
                        ৳ {totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Amount in Bangla Words Under Table */}
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs flex items-center justify-between">
                  <span className="font-bold text-slate-700">কথায় (In Words):</span>
                  <strong className="font-bold text-slate-950 text-xs font-siliguri">
                    {totalAmountWordsBn}
                  </strong>
                </div>
              </div>

              {/* Official Declaration Text */}
              {showDeclaration && (
                <div className="text-[11px] text-slate-700 bg-slate-50/50 p-2.5 rounded border border-dashed border-slate-300 italic leading-snug">
                  <strong>ঘোষণা ও প্রত্যয়ন: </strong>
                  {selectedArchiveLetter?.declarationText || customDeclaration}
                </div>
              )}

              {/* Official Committee Signatories Block */}
              <div className="pt-12 pb-4">
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  {/* Signatory 1: Treasurer */}
                  <div className="space-y-1">
                    <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-950">
                      কোষাধ্যক্ষ / ক্যাশিয়ার
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                    </div>
                  </div>

                  {/* Signatory 2: General Secretary */}
                  <div className="space-y-1">
                    <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-950">
                      সাধারণ সম্পাদক
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                    </div>
                  </div>

                  {/* Signatory 3: President / Mutawalli */}
                  <div className="space-y-1">
                    <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-950">
                      সভাপতি / মুতাওয়াল্লী
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Stamp & Verification Footer */}
              <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                <div>
                  প্রস্তুতকারী: {currentUser?.name || 'অফিস সহকারী'} • তারিখ:{' '}
                  {new Date().toLocaleDateString('bn-BD')}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider">
                  MasjidLedger Official Bank Dispatch Doc • ID: {selectedArchiveLetter?.id || 'DRAFT'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

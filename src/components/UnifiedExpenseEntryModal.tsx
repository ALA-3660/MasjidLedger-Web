import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Calculator,
  Banknote,
  Receipt,
  Users,
  Building,
  Building2,
  Wrench,
  Hammer,
  Printer,
  Calendar,
  AlertCircle,
  FileText,
  Layers,
  Sparkles,
  Phone,
  Clock,
  ChevronRight,
  Info,
  DollarSign,
  UserCheck,
  Tag,
  Lightbulb,
  ShoppingBag,
  ShieldCheck,
  Landmark,
  FileCheck,
} from 'lucide-react';
import {
  ExpenseEntry,
  FinancialAccount,
  AccountHead,
  PaymentMethod,
  Staff,
  MosqueAsset,
  MosqueProperty,
  Mosque,
  User,
} from '../types';
import { api } from '../lib/api';
import { Language, translations, formatCurrency, formatDate, toBanglaNumber } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { PrintFormat } from './PrintModals';

export type ExpenseEntryType =
  | 'GENERAL_EXPENSE'   // 💸 সাধারণ পরিচালন ব্যয়
  | 'STAFF_EXPENSE'     // 👤 ইমাম, স্টাফ ও বেতন
  | 'ASSET_EXPENSE'     // 🏢 সম্পদ / মেরামত ও রক্ষণাবেক্ষণ
  | 'PROPERTY_EXPENSE'; // 🏠 ওয়াক্ফ সম্পত্তি সংক্রান্ত ব্যয়

export interface UnifiedExpenseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ExpenseEntryType;
  initialMainHeadId?: string;
  initialStaffId?: string;
  initialAssetId?: string;
  initialPropertyId?: string;
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  staff?: Staff[];
  assets?: MosqueAsset[];
  properties?: MosqueProperty[];
  currentUser: User | null;
  currentMosque?: Mosque | null;
  language?: Language;
  onSuccess?: () => void;
  onSaveExpense: (
    data: any,
    options?: { print?: boolean; format?: PrintFormat }
  ) => Promise<ExpenseEntry>;
  onPrintVoucher?: (
    item: ExpenseEntry,
    type: 'EXPENSE',
    format?: PrintFormat,
    isReprint?: boolean
  ) => void;
}

export const UnifiedExpenseEntryModal: React.FC<UnifiedExpenseEntryModalProps> = ({
  isOpen,
  onClose,
  initialType = 'GENERAL_EXPENSE',
  initialMainHeadId,
  initialStaffId,
  initialAssetId,
  initialPropertyId,
  accounts: initialAccounts,
  accountHeads: initialAccountHeads,
  staff: initialStaff,
  assets: initialAssets,
  properties: initialProperties,
  currentUser,
  currentMosque,
  language = 'bn',
  onSuccess,
  onSaveExpense,
  onPrintVoucher,
}) => {
  const t = translations[language] || translations.bn;
  const isBn = language === 'bn';

  // Dynamic / local dataset states with fallback fetch
  const [accounts, setAccounts] = useState<FinancialAccount[]>(initialAccounts || []);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>(initialAccountHeads || []);
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff || []);
  const [assetsList, setAssetsList] = useState<MosqueAsset[]>(initialAssets || []);
  const [propertiesList, setPropertiesList] = useState<MosqueProperty[]>(initialProperties || []);

  // 1. Entry Type Selection
  const [expenseType, setExpenseType] = useState<ExpenseEntryType>(initialType);

  // 2. Common Financial Fields
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mainHeadId, setMainHeadId] = useState<string>(initialMainHeadId || '');
  const [subHeadId, setSubHeadId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [payeePhone, setPayeePhone] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');

  // 3. Specialized Context State — 👤 STAFF_EXPENSE
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId || '');
  const [salaryDisbursementType, setSalaryDisbursementType] = useState<string>('REGULAR_SALARY');
  const [salaryMonth, setSalaryMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 4. Specialized Context State — 🏢 ASSET_EXPENSE
  const [selectedAssetId, setSelectedAssetId] = useState<string>(initialAssetId || '');
  const [assetMaintenanceType, setAssetMaintenanceType] = useState<string>('ROUTINE_SERVICING');
  const [assetVendorName, setAssetVendorName] = useState<string>('');
  const [assetVendorPhone, setAssetVendorPhone] = useState<string>('');

  // 5. Specialized Context State — 🏠 PROPERTY_EXPENSE
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || '');
  const [propertyExpenseNature, setPropertyExpenseNature] = useState<string>('MAINTENANCE');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);

  // Load auxiliary data if missing when opened
  useEffect(() => {
    if (!isOpen) return;

    if (!initialStaff || initialStaff.length === 0) {
      api.getStaff().then((res) => setStaffList(res)).catch(() => {});
    } else {
      setStaffList(initialStaff);
    }

    if (!initialAssets || initialAssets.length === 0) {
      api.getAssets().then((res) => setAssetsList(res)).catch(() => {});
    } else {
      setAssetsList(initialAssets);
    }

    if (!initialProperties || initialProperties.length === 0) {
      api.getProperties().then((res) => setPropertiesList(res)).catch(() => {});
    } else {
      setPropertiesList(initialProperties);
    }

    if (!initialAccounts || initialAccounts.length === 0) {
      api.getAccounts().then((res) => setAccounts(res)).catch(() => {});
    } else {
      setAccounts(initialAccounts);
    }

    if (!initialAccountHeads || initialAccountHeads.length === 0) {
      api.getAccountHeads().then((res) => setAccountHeads(res)).catch(() => {});
    } else {
      setAccountHeads(initialAccountHeads);
    }
  }, [isOpen]);

  // Derived expense main heads and sub heads
  const expenseMainHeads = useMemo(() => {
    return accountHeads.filter((h) => h.type === 'EXPENSE' && !h.parentId);
  }, [accountHeads]);

  const activeSubHeads = useMemo(() => {
    if (!mainHeadId) return [];
    return accountHeads.filter((h) => h.type === 'EXPENSE' && h.parentId === mainHeadId);
  }, [accountHeads, mainHeadId]);

  // Filtered accounts according to payment method
  const filteredAccounts = useMemo(() => {
    if (paymentMethod === 'CASH') {
      const cashAccs = accounts.filter((a) => a.accountType === 'CASH');
      return cashAccs.length > 0 ? cashAccs : accounts;
    }
    if (paymentMethod === 'BANK') {
      const bankAccs = accounts.filter((a) => a.accountType === 'BANK');
      return bankAccs.length > 0 ? bankAccs : accounts;
    }
    if (['BKASH', 'NAGAD', 'ROCKET'].includes(paymentMethod)) {
      const mfsAccs = accounts.filter((a) => a.accountType === 'MFS' || a.accountType === 'BANK');
      return mfsAccs.length > 0 ? mfsAccs : accounts;
    }
    return accounts;
  }, [accounts, paymentMethod]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === accountId) || filteredAccounts[0] || accounts[0];
  }, [accounts, accountId, filteredAccounts]);

  // Sync initial type and form reset on open
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      return;
    }

    setExpenseType(initialType);
    setEntryDate(new Date().toISOString().split('T')[0]);
    setErrorMessage('');

    // Pre-select cash account
    const defaultAcc = accounts.find((a) => a.accountType === 'CASH') || accounts[0];
    if (defaultAcc) {
      setAccountId(defaultAcc.id);
    }

    // Configure initial heads and contextual fields
    applyContextDefaults((initialType as ExpenseEntryType) || 'GENERAL_EXPENSE', initialStaffId, initialAssetId, initialPropertyId, initialMainHeadId);
  }, [isOpen, initialType, initialStaffId, initialAssetId, initialPropertyId, initialMainHeadId, accounts, accountHeads]);

  const applyContextDefaults = (
    type: ExpenseEntryType | string,
    staffId?: string,
    assetId?: string,
    propId?: string,
    headId?: string
  ) => {
    if (headId) {
      setMainHeadId(headId);
    }

    if (type === 'GENERAL_EXPENSE') {
      if (!headId) {
        const defaultHead = expenseMainHeads.find((h) => !h.nameBn.includes('বেতন')) || expenseMainHeads[0];
        if (defaultHead) setMainHeadId(defaultHead.id);
      }
      setPayeeName('');
      setPayeePhone('');
      setDescription('');
    } else if (type === 'STAFF_EXPENSE') {
      // Find salary head
      const salaryHead = expenseMainHeads.find(
        (h) => h.nameBn.includes('বেতন') || h.nameBn.includes('সম্মানী') || h.id === 'head-exp-01'
      ) || expenseMainHeads[0];
      if (salaryHead) setMainHeadId(salaryHead.id);

      const targetStaffId = staffId || staffList[0]?.id || '';
      setSelectedStaffId(targetStaffId);
      const st = staffList.find((s) => s.id === targetStaffId);
      if (st) {
        setPayeeName(st.name);
        setPayeePhone(st.contactNumber || (st as any).phone || '');
        if (st.baseSalary) {
          setAmount(String(st.baseSalary));
        }
        const [year, month] = salaryMonth.split('-');
        const monthBn = getBanglaMonthName(Number(month));
        setDescription(`ইমাম/স্টাফ বেতন ও সম্মানী পরিশোধ: ${st.name} (${st.designationBn}), মাস: ${monthBn} ${toBanglaNumber(year)}`);
      }
    } else if (type === 'ASSET_EXPENSE') {
      // Find asset maintenance head
      const maintHead = expenseMainHeads.find(
        (h) => h.nameBn.includes('মেরামত') || h.nameBn.includes('রক্ষণাবেক্ষণ') || h.id === 'head-exp-04'
      ) || expenseMainHeads[0];
      if (maintHead) setMainHeadId(maintHead.id);

      const targetAssetId = assetId || assetsList[0]?.id || '';
      setSelectedAssetId(targetAssetId);
      const ast = assetsList.find((a) => a.id === targetAssetId);
      if (ast) {
        setDescription(`মসজিদের সম্পদ মেরামত ও সার্ভিসিং: ${ast.nameBn} (${ast.assetCode || ast.id}), কাজের ধরন: নিয়মিত সার্ভিসিং`);
      }
    } else if (type === 'PROPERTY_EXPENSE') {
      // Find waqf property head
      const waqfHead = expenseMainHeads.find(
        (h) => h.nameBn.includes('ওয়াক্ফ') || h.nameBn.includes('মেরামত') || h.nameBn.includes('উন্নয়ন')
      ) || expenseMainHeads[0];
      if (waqfHead) setMainHeadId(waqfHead.id);

      const targetPropId = propId || propertiesList[0]?.id || '';
      setSelectedPropertyId(targetPropId);
      const prp = propertiesList.find((p) => p.id === targetPropId);
      if (prp) {
        setDescription(`ওয়াকফ সম্পত্তি সংস্কার ও পরিচালনা ব্যয়: ${prp.nameBn || (prp as any).name} (${prp.propertyCode || prp.id})`);
      }
    }
  };

  // Helper for Bangla Month Names
  const getBanglaMonthName = (monthNum: number): string => {
    const monthsBn = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    return monthsBn[monthNum - 1] || '';
  };

  // Handle staff selection change
  const handleStaffChange = (stId: string) => {
    setSelectedStaffId(stId);
    const st = staffList.find((s) => s.id === stId);
    if (st) {
      setPayeeName(st.name);
      setPayeePhone(st.contactNumber || (st as any).phone || '');
      if (st.baseSalary) {
        setAmount(String(st.baseSalary));
      }
      const [year, month] = salaryMonth.split('-');
      const monthBn = getBanglaMonthName(Number(month));
      setDescription(`ইমাম/স্টাফ বেতন ও সম্মানী পরিশোধ: ${st.name} (${st.designationBn}), মাস: ${monthBn} ${toBanglaNumber(year)}`);
    }
  };

  // Handle salary month change
  const handleSalaryMonthChange = (monthStr: string) => {
    setSalaryMonth(monthStr);
    const st = staffList.find((s) => s.id === selectedStaffId);
    if (st) {
      const [year, month] = monthStr.split('-');
      const monthBn = getBanglaMonthName(Number(month));
      setDescription(`ইমাম/স্টাফ বেতন ও সম্মানী পরিশোধ: ${st.name} (${st.designationBn}), মাস: ${monthBn} ${toBanglaNumber(year)}`);
    }
  };

  // Handle Asset selection change
  const handleAssetChange = (astId: string) => {
    setSelectedAssetId(astId);
    const ast = assetsList.find((a) => a.id === astId);
    if (ast) {
      const maintTypeBn =
        assetMaintenanceType === 'ROUTINE_SERVICING'
          ? 'নিয়মিত সার্ভিসিং'
          : assetMaintenanceType === 'REPAIR'
          ? 'মেরামত ও পার্টস প্রতিস্থাপন'
          : assetMaintenanceType === 'EMERGENCY'
          ? 'জরুরি সমস্যা সমাধান'
          : 'নতুন ইনস্টলেশন';
      setDescription(`মসজিদের সম্পদ মেরামত ও সার্ভিসিং: ${ast.nameBn} (${ast.assetCode || ast.id}), কাজের ধরন: ${maintTypeBn}`);
    }
  };

  // Handle Property selection change
  const handlePropertyChange = (prpId: string) => {
    setSelectedPropertyId(prpId);
    const prp = propertiesList.find((p) => p.id === prpId);
    if (prp) {
      const natureBn =
        propertyExpenseNature === 'MAINTENANCE'
          ? 'মেরামত ও পেইন্টিং'
          : propertyExpenseNature === 'TAX'
          ? 'পৌরকর ও হোল্ডিং ট্যাক্স'
          : propertyExpenseNature === 'KHAJNA'
          ? 'ভূমি উন্নয়ন কর ও খাজনা'
          : propertyExpenseNature === 'UTILITY'
          ? 'বিদ্যুৎ ও গ্যাস বিল'
          : 'আইনি ও দলিল খরচ';
      setDescription(`ওয়াকফ সম্পত্তি ব্যয়: ${prp.nameBn || (prp as any).name} (${prp.propertyCode || prp.id}), খাত: ${natureBn}`);
    }
  };

  // Submission handler
  const handleSave = async (shouldPrint: boolean = false) => {
    setErrorMessage('');
    const num = Number(amount);

    if (!num || num <= 0) {
      setErrorMessage(isBn ? 'ব্যয়ের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' : 'Amount must be greater than zero.');
      return;
    }

    if (!mainHeadId) {
      setErrorMessage(isBn ? 'প্রধান ব্যয়ের খাত নির্বাচন করা বাধ্যতামূলক।' : 'Main expense head is required.');
      return;
    }

    const effectiveAccId = accountId || selectedAccount?.id || accounts[0]?.id;
    if (!effectiveAccId) {
      setErrorMessage(isBn ? 'পরিশোধের অ্যাকাউন্ট নির্বাচন করুন।' : 'Please select payment account.');
      return;
    }

    if (!payeeName.trim()) {
      setErrorMessage(isBn ? 'প্রাপক বা সুবিধাভোগী ব্যক্তির নাম লিখুন।' : 'Payee name is required.');
      return;
    }

    // Account Balance check validation
    const acc = accounts.find((a) => a.id === effectiveAccId);
    if (acc && acc.currentBalance < num) {
      setErrorMessage(
        isBn
          ? `অপর্যাপ্ত ব্যালেন্স! নির্বাচিত অ্যাকাউন্ট "${acc.nameBn}"-এর বর্তমান স্থিতি ৳ ${acc.currentBalance.toLocaleString('en-IN')}, যা ব্যয়ের পরিমাণ ৳ ${num.toLocaleString('en-IN')} থেকে কম। অনুগ্রহ করে ব্যয়ের পরিমাণ সংশোধন করুন বা পর্যাপ্ত ব্যালেন্স বিশিষ্ট অ্যাকাউন্ট নির্বাচন করুন।`
          : `Insufficient balance in account "${acc.nameBn}". Current balance: ৳ ${acc.currentBalance.toLocaleString('en-IN')}, Expense amount: ৳ ${num.toLocaleString('en-IN')}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Construct clean payload strictly adhering to existing /api/v1/accounting/expense
      const payload: any = {
        mainHeadId,
        subHeadId: subHeadId || undefined,
        amount: num,
        paymentMethod,
        accountId: effectiveAccId,
        payeeName: payeeName.trim(),
        payeePhone: payeePhone.trim() || undefined,
        reference: reference.trim() || undefined,
        description: description.trim() || undefined,
        attachmentUrl: attachmentUrl.trim() || undefined,
        date: entryDate,
        // Context metadata for audit & tracking
        sourceModule: expenseType,
        sourceId:
          expenseType === 'STAFF_EXPENSE'
            ? selectedStaffId
            : expenseType === 'ASSET_EXPENSE'
            ? selectedAssetId
            : expenseType === 'PROPERTY_EXPENSE'
            ? selectedPropertyId
            : undefined,
        sourceType:
          expenseType === 'STAFF_EXPENSE'
            ? salaryDisbursementType
            : expenseType === 'ASSET_EXPENSE'
            ? assetMaintenanceType
            : expenseType === 'PROPERTY_EXPENSE'
            ? propertyExpenseNature
            : undefined,
      };

      const savedRecord = await onSaveExpense(payload, { print: shouldPrint, format: 'POS_80' });

      if (shouldPrint && onPrintVoucher && savedRecord) {
        onPrintVoucher(savedRecord, 'EXPENSE', 'POS_80', false);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || (isBn ? 'ব্যয় ভাউচার সংরক্ষণ ব্যর্থ হয়েছে।' : 'Failed to save expense.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const amountInWords = numAmount > 0 ? numberToBanglaWords(numAmount) : '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in print:hidden font-sans">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* ================= MODAL HEADER ================= */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-red-900 text-white px-5 sm:px-7 py-4.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md shrink-0 border border-white/15 shadow-inner">
              <Receipt className="w-5.5 h-5.5 text-rose-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight">
                  {isBn ? 'নতুন ব্যয় ও পরিশোধ' : 'New Expense & Payment'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-100 border border-rose-400/30">
                  {isBn ? 'ভাউচার সিস্টেম' : 'Voucher System'}
                </span>
              </div>
              <p className="text-xs text-rose-100/90 font-body mt-0.5">
                {isBn
                  ? 'ব্যয়ের ধরন নির্বাচন করে প্রয়োজনীয় তথ্য পূরণ করুন'
                  : 'Select expense type and fill in required payment details'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* ================= STEP 1: EXPENSE TYPE SELECTION ================= */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2.5 font-heading">
              ১. ব্যয়ের ধরন নির্বাচন করুন (Expense Type):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: General Expense */}
              <button
                type="button"
                onClick={() => {
                  setExpenseType('GENERAL_EXPENSE');
                  applyContextDefaults('GENERAL_EXPENSE');
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expenseType === 'GENERAL_EXPENSE'
                    ? 'border-rose-600 bg-rose-50/70 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      expenseType === 'GENERAL_EXPENSE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                  </div>
                  {expenseType === 'GENERAL_EXPENSE' && (
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading">💸 সাধারণ ব্যয়</h4>
                  <p className="text-[11px] text-slate-500 font-body mt-0.5 line-clamp-2">
                    দৈনন্দিন পরিচালন ব্যয়, বিদ্যুৎ, ইউটিলিটি, আপ্যায়ন ও অফিস খরচ
                  </p>
                </div>
              </button>

              {/* Card 2: Staff / Salary */}
              <button
                type="button"
                onClick={() => {
                  setExpenseType('STAFF_EXPENSE');
                  applyContextDefaults('STAFF_EXPENSE');
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expenseType === 'STAFF_EXPENSE'
                    ? 'border-rose-600 bg-rose-50/70 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      expenseType === 'STAFF_EXPENSE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  {expenseType === 'STAFF_EXPENSE' && (
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading">👤 ইমাম, স্টাফ ও বেতন</h4>
                  <p className="text-[11px] text-slate-500 font-body mt-0.5 line-clamp-2">
                    ইমাম, মোয়াজ্জিন ও স্টাফদের বেতন, ঈদ ভাতা বা সম্মানী পরিশোধ
                  </p>
                </div>
              </button>

              {/* Card 3: Asset Maintenance */}
              <button
                type="button"
                onClick={() => {
                  setExpenseType('ASSET_EXPENSE');
                  applyContextDefaults('ASSET_EXPENSE');
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expenseType === 'ASSET_EXPENSE'
                    ? 'border-rose-600 bg-rose-50/70 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      expenseType === 'ASSET_EXPENSE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                  </div>
                  {expenseType === 'ASSET_EXPENSE' && (
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading">🏢 সম্পদ / রক্ষণাবেক্ষণ</h4>
                  <p className="text-[11px] text-slate-500 font-body mt-0.5 line-clamp-2">
                    মসজিদের যন্ত্রপাতি, সাউন্ড সিস্টেম, ফ্যান ও ফিক্সচার মেরামত
                  </p>
                </div>
              </button>

              {/* Card 4: Waqf Property */}
              <button
                type="button"
                onClick={() => {
                  setExpenseType('PROPERTY_EXPENSE');
                  applyContextDefaults('PROPERTY_EXPENSE');
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  expenseType === 'PROPERTY_EXPENSE'
                    ? 'border-rose-600 bg-rose-50/70 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      expenseType === 'PROPERTY_EXPENSE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                  </div>
                  {expenseType === 'PROPERTY_EXPENSE' && (
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 font-heading">🏠 ওয়াক্ফ সম্পত্তি সংক্রান্ত</h4>
                  <p className="text-[11px] text-slate-500 font-body mt-0.5 line-clamp-2">
                    ওয়াক্ফ দোকান, মার্কেট মেরামত, চুনকাম, হোল্ডিং ট্যাক্স ও খাজনা
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* ================= STEP 2: SPECIALIZED CONTEXT SECTION ================= */}
          {expenseType === 'GENERAL_EXPENSE' && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 font-heading flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  <span>দ্রুত ব্যয়ের খাত নির্বাচন (Quick Category Shortcuts):</span>
                </span>
                <span className="text-[11px] text-slate-400 font-body">ক্লিক করে খাত স্বয়ংক্রিয় সেট করুন</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '💡 বিদ্যুৎ ও গ্যাস বিল', match: 'বিদ্যুৎ' },
                  { label: '🧹 পরিষ্কার-পরিচ্ছন্নতা', match: 'পরিষ্কার' },
                  { label: '☕ আপ্যায়ন ও ইফতার', match: 'আপ্যায়ন' },
                  { label: '📝 স্টেশনারি ও কাগজ', match: 'স্টেশনারি' },
                  { label: '💻 আইটি ও প্রযুক্তি', match: 'প্রযুক্তি' },
                  { label: '📦 বিবিধ খরচ', match: 'বিবিধ' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const found = expenseMainHeads.find((h) => h.nameBn.includes(chip.match));
                      if (found) setMainHeadId(found.id);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 transition-colors cursor-pointer text-slate-700"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {expenseType === 'STAFF_EXPENSE' && (
            <div className="p-4.5 bg-white rounded-2xl border border-rose-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-900 border-b border-rose-100 pb-2.5 font-heading">
                <UserCheck className="w-4 h-4 text-rose-600" />
                <span>ইমাম ও স্টাফ সম্পর্কিত তথ্য (Staff & Honorarium Context):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Staff Picker */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    কর্মকর্তা / কর্মচারী নির্বাচন করুন: *
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => handleStaffChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  >
                    <option value="">-- স্টাফ নির্বাচন করুন --</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.designationBn}) - মূল বেতন: ৳ {st.baseSalary?.toLocaleString('en-IN') || 0}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salary Disbursement Type */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    পরিশোধের ধরন:
                  </label>
                  <select
                    value={salaryDisbursementType}
                    onChange={(e) => {
                      setSalaryDisbursementType(e.target.value);
                      const st = staffList.find((s) => s.id === selectedStaffId);
                      if (st) {
                        const [year, month] = salaryMonth.split('-');
                        const monthBn = getBanglaMonthName(Number(month));
                        const typeLabel =
                          e.target.value === 'REGULAR_SALARY'
                            ? 'মাসিক বেতন'
                            : e.target.value === 'FESTIVAL_BONUS'
                            ? 'উৎসব ভাতা'
                            : e.target.value === 'ADVANCE'
                            ? 'অগ্রিম বেতন'
                            : 'বিশেষ সম্মানী';
                        setDescription(`${typeLabel} পরিশোধ: ${st.name} (${st.designationBn}), মাস: ${monthBn} ${toBanglaNumber(year)}`);
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  >
                    <option value="REGULAR_SALARY">📅 নিয়মিত মাসিক বেতন</option>
                    <option value="FESTIVAL_BONUS">🎁 ঈদ ও উৎসব ভাতা</option>
                    <option value="ADVANCE">⚡ অগ্রিম বেতন / ঋণ সমন্বয়</option>
                    <option value="HONORARIUM">🌟 বিশেষ সম্মানী ও ওভারটাইম</option>
                  </select>
                </div>

                {/* Salary Month */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    বেতনের মাস (Salary Month):
                  </label>
                  <input
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => handleSalaryMonthChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {expenseType === 'ASSET_EXPENSE' && (
            <div className="p-4.5 bg-white rounded-2xl border border-rose-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-900 border-b border-rose-100 pb-2.5 font-heading">
                <Wrench className="w-4 h-4 text-rose-600" />
                <span>মসজিদের সম্পদ ও সংস্কার তথ্য (Asset Maintenance Context):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Asset Picker */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    সম্পদ / যন্ত্রপাতি নির্বাচন করুন: *
                  </label>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => handleAssetChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  >
                    <option value="">-- সম্পদ নির্বাচন করুন --</option>
                    {assetsList.map((ast) => (
                      <option key={ast.id} value={ast.id}>
                        {ast.nameBn} ({ast.assetCode || ast.id}) - অবস্থান: {ast.location || 'মসজিদ ভবন'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Maintenance Type */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    কাজের প্রকৃতি / ধরন:
                  </label>
                  <select
                    value={assetMaintenanceType}
                    onChange={(e) => {
                      setAssetMaintenanceType(e.target.value);
                      const ast = assetsList.find((a) => a.id === selectedAssetId);
                      if (ast) {
                        const maintTypeBn =
                          e.target.value === 'ROUTINE_SERVICING'
                            ? 'নিয়মিত সার্ভিসিং'
                            : e.target.value === 'REPAIR'
                            ? 'মেরামত ও পার্টস প্রতিস্থাপন'
                            : e.target.value === 'EMERGENCY'
                            ? 'জরুরি সমস্যা সমাধান'
                            : 'নতুন ইনস্টলেশন';
                        setDescription(`মসজিদের সম্পদ মেরামত ও সার্ভিসিং: ${ast.nameBn} (${ast.assetCode || ast.id}), কাজের ধরন: ${maintTypeBn}`);
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  >
                    <option value="ROUTINE_SERVICING">🛠️ নিয়মিত সার্ভিসিং ও চেকআপ</option>
                    <option value="REPAIR">🔧 পার্টস মেরামত ও পরিবর্তন</option>
                    <option value="EMERGENCY">🚨 জরুরি সমস্যা সমাধান</option>
                    <option value="INSTALLATION">🏗️ নতুন ফিটিং ও সংযোজন</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {expenseType === 'PROPERTY_EXPENSE' && (
            <div className="p-4.5 bg-white rounded-2xl border border-rose-200/80 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-rose-900 border-b border-rose-100 pb-2.5 font-heading">
                <Landmark className="w-4 h-4 text-rose-600" />
                <span>ওয়াক্ফ সম্পত্তি তথ্য (Waqf Property Expense Context):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Property Picker */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ওয়াক্ফ সম্পত্তি নির্বাচন করুন: *
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => handlePropertyChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  >
                    <option value="">-- সম্পত্তি নির্বাচন করুন --</option>
                    {propertiesList.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.nameBn || (prop as any).name} ({prop.propertyCode || prop.id}) - {prop.address || ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Property Expense Nature */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ব্যয়ের খাত / প্রকৃতি:
                  </label>
                  <select
                    value={propertyExpenseNature}
                    onChange={(e) => {
                      setPropertyExpenseNature(e.target.value);
                      const prp = propertiesList.find((p) => p.id === selectedPropertyId);
                      if (prp) {
                        const natureBn =
                          e.target.value === 'MAINTENANCE'
                            ? 'মেরামত ও পেইন্টিং'
                            : e.target.value === 'TAX'
                            ? 'পৌরকর ও হোল্ডিং ট্যাক্স'
                            : e.target.value === 'KHAJNA'
                            ? 'ভূমি উন্নয়ন কর ও খাজনা'
                            : e.target.value === 'UTILITY'
                            ? 'বিদ্যুৎ ও গ্যাস বিল'
                            : 'আইনি ও দলিল খরচ';
                        setDescription(`ওয়াকফ সম্পত্তি ব্যয়: ${prp.nameBn || (prp as any).name} (${prp.propertyCode || prp.id}), খাত: ${natureBn}`);
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  >
                    <option value="MAINTENANCE">🎨 মেরামত, চুনকাম ও রং</option>
                    <option value="TAX">🏛️ পৌরকর ও হোল্ডিং ট্যাক্স</option>
                    <option value="KHAJNA">📜 সরকারি ভূমি উন্নয়ন কর / খাজনা</option>
                    <option value="UTILITY">⚡ বিদ্যুৎ, গ্যাস ও পানি বিল</option>
                    <option value="LEGAL">⚖️ আইনি ও সীমানা সংক্রান্ত খরচ</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: COMMON FINANCIAL FIELDS ================= */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 font-heading flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-rose-600" />
                <span>২. আর্থিক ও পরিশোধ সংক্রান্ত তথ্য (Financial & Accounting Details):</span>
              </span>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                Authoritative Financial Engine
              </span>
            </div>

            {/* Row 1: Date & Head Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ব্যয়ের তারিখ: *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none font-mono"
                  />
                </div>
              </div>

              {/* Main Expense Head */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  প্রধান ব্যয়ের খাত: *
                </label>
                <select
                  value={mainHeadId}
                  onChange={(e) => {
                    setMainHeadId(e.target.value);
                    setSubHeadId('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                >
                  <option value="">-- প্রধান খাত নির্বাচন করুন --</option>
                  {expenseMainHeads.map((head) => (
                    <option key={head.id} value={head.id}>
                      {head.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Sub-head */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ব্যয়ের উপ-খাত (যদি থাকে):
                </label>
                <select
                  value={subHeadId}
                  onChange={(e) => setSubHeadId(e.target.value)}
                  disabled={activeSubHeads.length === 0}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {activeSubHeads.length > 0 ? '-- উপ-খাত নির্বাচন করুন --' : 'কোনো উপ-খাত নেই'}
                  </option>
                  {activeSubHeads.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nameBn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Amount & Words */}
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-800 block mb-1 font-heading flex items-center space-x-1.5">
                    <span>ব্যয়ের পরিমাণ (টাকায়): *</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-700 font-bold text-base">
                      ৳
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-12 py-2.5 rounded-xl text-base font-bold font-mono text-slate-900 border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCalculatorOpen(true)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="ক্যালকুলেটর খুলুন"
                    >
                      <Calculator className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Account balance preview */}
                <div className="sm:w-64 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">নির্বাচিত অ্যাকাউন্টে স্থিতি:</div>
                  <div
                    className={`text-sm font-bold font-mono mt-0.5 ${
                      selectedAccount && selectedAccount.currentBalance < numAmount
                        ? 'text-rose-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    ৳ {selectedAccount ? selectedAccount.currentBalance.toLocaleString('en-IN') : 0}
                  </div>
                  {selectedAccount && selectedAccount.currentBalance < numAmount && (
                    <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                      ⚠️ অপর্যাপ্ত ব্যালেন্স
                    </div>
                  )}
                </div>
              </div>

              {/* Amount In Words */}
              {amountInWords && (
                <div className="text-xs font-medium text-rose-950 font-body bg-white/80 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center space-x-2">
                  <span className="font-bold text-rose-700 shrink-0">কথায়:</span>
                  <span>{amountInWords} টাকা মাত্র</span>
                </div>
              )}
            </div>

            {/* Row 3: Payment Method & Payment Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  পরিশোধের মাধ্যম: *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: '💵 নগদ টাকা (ক্যাশ)' },
                    { id: 'BANK', label: '🏦 ব্যাংক' },
                    { id: 'BKASH', label: '📱 বিকাশ' },
                    { id: 'NAGAD', label: '📱 নগদ (MFS)' },
                    { id: 'ROCKET', label: '📱 রকেট' },
                    { id: 'CARD', label: '💳 কার্ড/অন্যান্য' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        paymentMethod === method.id
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Account */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  পরিশোধের হিসাব / ফান্ড অ্যাকাউন্ট: *
                </label>
                <select
                  value={accountId || selectedAccount?.id}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                >
                  {filteredAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameBn} ({acc.accountType}) — বর্তমান ব্যালেন্স: ৳ {acc.currentBalance.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>

                {/* Live Account Balance Breakdown */}
                {selectedAccount && (
                  <div className={`mt-2 p-2.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                    selectedAccount.currentBalance < numAmount && numAmount > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <span>বর্তমান স্থিতি: <strong className="font-mono text-slate-900">৳ {selectedAccount.currentBalance.toLocaleString('en-IN')}</strong></span>
                      {numAmount > 0 && (
                        <span>ব্যয় কর্তন: <strong className="font-mono text-rose-600">-৳ {numAmount.toLocaleString('en-IN')}</strong></span>
                      )}
                    </div>
                    {numAmount > 0 && (
                      <div>
                        {selectedAccount.currentBalance >= numAmount ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            অবশিষ্ট: ৳ {(selectedAccount.currentBalance - numAmount).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center space-x-1">
                            <span>⚠️ অপর্যাপ্ত ব্যালেন্স</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Payee Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payee Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  প্রাপক / ব্যক্তি / সরবরাহকারীর নাম: *
                </label>
                <input
                  type="text"
                  placeholder="যেমন: মাওলানা আব্দুর রহিম / ডেসকো / রাজু মেকার"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Payee Phone */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  প্রাপকের মোবাইল নম্বর (ঐচ্ছিক):
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={payeePhone}
                    onChange={(e) => setPayeePhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-mono border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 5: Reference & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Reference / Bill No */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  রেফারেন্স / বিল / ক্যাশমেমো নং:
                </label>
                <input
                  type="text"
                  placeholder="যেমন: BILL-2026/09, CHEQUE-1029"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ব্যয়ের বিস্তারিত বিবরণ ও বিবরণী:
                </label>
                <input
                  type="text"
                  placeholder="ব্যয়ের উদ্দেশ্য, আইটেম ও বিস্তারিত মন্তব্য লিখুন..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Attachment URL (Optional) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                ভাউচার স্লিপ / রসিদের ছবি বা লিংক (ঐচ্ছিক):
              </label>
              <input
                type="text"
                placeholder="https://... অথবা ড্রাইভ ফাইলের লিংক"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-mono text-slate-600 border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="bg-slate-100 px-5 sm:px-7 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>আইডেমপোটেন্সি ও স্বয়ংক্রিয় লেজার পোস্টিং সক্রিয়</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              বাতিল
            </button>

            {/* Button 1: Save Only */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'শুধু সংরক্ষণ করুন'}</span>
            </button>

            {/* Button 2: Save + Print */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'সংরক্ষণ ও ভাউচার প্রিন্ট'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Universal Calculator Modal */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        language={language}
      />
    </div>
  );
};

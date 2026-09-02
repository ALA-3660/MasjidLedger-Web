import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  HeartHandshake,
  Box,
  Users,
  WalletCards,
  Receipt,
  Wrench,
  Flower2,
  CalendarCheck,
  PackagePlus,
  CheckCircle2,
  Printer,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  LogIn,
  Layers,
  Banknote,
  Send,
  Check,
  Calendar,
  Building,
  UserCheck,
  FileText,
} from 'lucide-react';
import {
  QRDestinationType,
  QrActionKey,
  DenominationBreakdown,
} from '../types/qrBarcodeTypes';
import {
  User,
  Mosque,
  AccountHead,
  FinancialAccount,
  Staff,
  DonationBox,
  MosqueProperty,
  MosqueAsset,
  CemeteryRecord,
} from '../types';
import { api } from '../lib/api';
import { DenominationCounter } from './DenominationCounter';
import { playScanSuccessSound, triggerHapticFeedback } from '../services/qrBarcodeService';

interface QuickEntryViewProps {
  initialDestination?: QRDestinationType;
  initialRecordId?: string;
  initialData?: any;
  currentUser: User | null;
  currentMosque: Mosque | null;
  accountHeads: AccountHead[];
  financialAccounts: FinancialAccount[];
  staffList: Staff[];
  donationBoxes: DonationBox[];
  properties: MosqueProperty[];
  assets: MosqueAsset[];
  cemeteryRecords: CemeteryRecord[];
  onBackToDashboard: () => void;
  onNavigateToTab: (tab: string, subTab?: string) => void;
  onRequireLogin?: () => void;
}

export const QuickEntryView: React.FC<QuickEntryViewProps> = ({
  initialDestination = 'INCOME_NEW',
  initialRecordId,
  initialData,
  currentUser,
  currentMosque,
  accountHeads,
  financialAccounts,
  staffList,
  donationBoxes,
  properties,
  assets,
  cemeteryRecords,
  onBackToDashboard,
  onNavigateToTab,
  onRequireLogin,
}) => {
  const [selectedDestination, setSelectedDestination] = useState<QRDestinationType>(initialDestination);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    type: string;
    titleBn: string;
    voucherNumber?: string;
    receiptNumber?: string;
    amount?: number;
    date?: string;
    donorName?: string;
    recipientName?: string;
    accountHeadName?: string;
    rawRecord?: any;
  } | null>(null);

  // Common Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [accountHeadId, setAccountHeadId] = useState<string>('');
  const [financialAccountId, setFinancialAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'MOBILE_BANKING'>('CASH');
  const [denominationBreakdown, setDenominationBreakdown] = useState<DenominationBreakdown | null>(null);
  const [showDenomination, setShowDenomination] = useState<boolean>(false);

  // Module Specific States
  // 1. Income & Donation
  const [donorName, setDonorName] = useState<string>('');
  const [donorPhone, setDonorPhone] = useState<string>('');
  const [donationCategory, setDonationCategory] = useState<string>('GENERAL');

  // 2. Expense
  const [paidTo, setPaidTo] = useState<string>('');
  const [voucherReference, setVoucherReference] = useState<string>('');

  // 3. Juma & Donation Box
  const [selectedBoxId, setSelectedBoxId] = useState<string>(initialRecordId || '');
  const [attendeesCount, setAttendeesCount] = useState<string>('');
  const [witnesses, setWitnesses] = useState<string>('সভাপতি ও কোষাধ্যক্ষ');

  // 4. Staff Salary
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialRecordId || '');
  const [salaryMonth, setSalaryMonth] = useState<string>(
    new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  );
  const [bonusAmount, setBonusAmount] = useState<string>('0');
  const [deductionAmount, setDeductionAmount] = useState<string>('0');

  // 5. Waqf Rent
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialRecordId || '');
  const [rentMonth, setRentMonth] = useState<string>(
    new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  );
  const [utilityBill, setUtilityBill] = useState<string>('0');

  // 6. Asset Service
  const [selectedAssetId, setSelectedAssetId] = useState<string>(initialRecordId || '');
  const [technicianName, setTechnicianName] = useState<string>('');
  const [technicianPhone, setTechnicianPhone] = useState<string>('');
  const [nextServiceDate, setNextServiceDate] = useState<string>('');

  // 7. Cemetery Burial
  const [deceasedName, setDeceasedName] = useState<string>('');
  const [relativeName, setRelativeName] = useState<string>('');
  const [relativePhone, setRelativePhone] = useState<string>('');
  const [plotNumber, setPlotNumber] = useState<string>('');
  const [graveNumber, setGraveNumber] = useState<string>('');

  // 8. Committee Meeting
  const [meetingType, setMeetingType] = useState<string>('EXECUTIVE');
  const [meetingSubject, setMeetingSubject] = useState<string>('');
  const [chairpersonName, setChairpersonName] = useState<string>('কমিটি সভাপতি');
  const [resolutionsText, setResolutionsText] = useState<string>('');

  // 9. Fund Transfer
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');

  // Initialize dropdown defaults
  useEffect(() => {
    if (accountHeads.length > 0 && !accountHeadId) {
      if (selectedDestination === 'INCOME_NEW' || selectedDestination === 'DONATION_NEW') {
        const incomeHead = accountHeads.find((h) => h.type === 'INCOME');
        if (incomeHead) setAccountHeadId(incomeHead.id);
      } else if (selectedDestination === 'EXPENSE_NEW' || selectedDestination === 'ASSET_SERVICE') {
        const expenseHead = accountHeads.find((h) => h.type === 'EXPENSE');
        if (expenseHead) setAccountHeadId(expenseHead.id);
      }
    }

    if (financialAccounts.length > 0 && !financialAccountId) {
      const cashAcc = financialAccounts.find((a) => a.accountType === 'CASH') || financialAccounts[0];
      if (cashAcc) {
        setFinancialAccountId(cashAcc.id);
        setFromAccountId(cashAcc.id);
      }
      if (financialAccounts.length > 1) {
        setToAccountId(financialAccounts[1].id);
      }
    }

    if (donationBoxes.length > 0 && !selectedBoxId) {
      setSelectedBoxId(donationBoxes[0].id);
    }
    if (staffList.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staffList[0].id);
      setAmount(staffList[0].baseSalary?.toString() || '');
    }
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
      setAmount(properties[0].monthlyRent?.toString() || '');
    }
    if (assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    }
  }, [accountHeads, financialAccounts, donationBoxes, staffList, properties, assets, selectedDestination]);

  // Handle staff select change
  const handleStaffChange = (id: string) => {
    setSelectedStaffId(id);
    const staff = staffList.find((s) => s.id === id);
    if (staff && staff.baseSalary) {
      setAmount(staff.baseSalary.toString());
    }
  };

  // Handle property select change
  const handlePropertyChange = (id: string) => {
    setSelectedPropertyId(id);
    const prop = properties.find((p) => p.id === id);
    if (prop && prop.monthlyRent) {
      setAmount(prop.monthlyRent.toString());
      if (prop.currentTenantName) {
        setDonorName(prop.currentTenantName);
      }
    }
  };

  // Reset Form for another entry
  const handleResetForm = () => {
    setSuccessResult(null);
    setAmount('');
    setDescription('');
    setDonorName('');
    setDonorPhone('');
    setPaidTo('');
    setVoucherReference('');
    setDenominationBreakdown(null);
    setDeceasedName('');
    setRelativeName('');
    setRelativePhone('');
    setResolutionsText('');
    setMeetingSubject('');
  };

  // Check Authentication & Permissions
  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">লগইন প্রয়োজন</h2>
          <p className="text-sm text-slate-600">
            অপারেশনাল QR কোড দিয়ে দ্রুত এন্ট্রি বা হিসাবের কার্যক্রম পরিচালনা করতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => (onRequireLogin ? onRequireLogin() : onBackToDashboard())}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition"
          >
            <LogIn className="w-4 h-4" />
            <span>লগইন স্ক্রিনে যান</span>
          </button>
          <button
            onClick={onBackToDashboard}
            className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
          >
            পাবলিক পোর্টালে যান
          </button>
        </div>
      </div>
    );
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const numAmount = parseFloat(amount);
    if ((selectedDestination !== 'COMMITTEE_MEETING' && !amount) || (selectedDestination !== 'COMMITTEE_MEETING' && isNaN(numAmount))) {
      alert('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    setSubmitting(true);
    try {
      const mosqueId = currentMosque?.id || 'mosque-mamun-001';

      if (selectedDestination === 'INCOME_NEW') {
        const selectedHead = accountHeads.find((h) => h.id === accountHeadId);
        const res = await api.createIncome({
          mosqueId,
          date,
          amount: numAmount,
          accountHeadId: accountHeadId || accountHeads[0]?.id || 'general-income',
          accountHeadNameBn: selectedHead?.nameBn || 'সাধারণ আয়',
          financialAccountId: financialAccountId || financialAccounts[0]?.id || 'cash-1',
          paymentMethod,
          donorName: donorName || undefined,
          donorPhone: donorPhone || undefined,
          description: description || 'কুইক QR আয় এন্ট্রি',
          denominationBreakdown: denominationBreakdown || undefined,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'INCOME',
          titleBn: 'আয় ও প্রাপ্তি এন্ট্রি সফল হয়েছে',
          voucherNumber: res.voucherNumber,
          amount: numAmount,
          date,
          donorName: donorName || 'বেনামী দাতা',
          accountHeadName: selectedHead?.nameBn || 'সাধারণ ফান্ড',
          rawRecord: res,
        });
      } else if (selectedDestination === 'EXPENSE_NEW') {
        const selectedHead = accountHeads.find((h) => h.id === accountHeadId);
        const res = await api.createExpense({
          mosqueId,
          date,
          amount: numAmount,
          accountHeadId: accountHeadId || accountHeads[0]?.id || 'general-expense',
          accountHeadNameBn: selectedHead?.nameBn || 'সাধারণ ব্যয়',
          financialAccountId: financialAccountId || financialAccounts[0]?.id || 'cash-1',
          paymentMethod,
          paidTo: paidTo || 'প্রাপক',
          description: description || 'কুইক QR ব্যয় ভাউচার',
          referenceNo: voucherReference || undefined,
          denominationBreakdown: denominationBreakdown || undefined,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'EXPENSE',
          titleBn: 'ব্যয় ভাউচার এন্ট্রি সফল হয়েছে',
          voucherNumber: res.voucherNumber,
          amount: numAmount,
          date,
          recipientName: paidTo || 'প্রাপক',
          accountHeadName: selectedHead?.nameBn || 'সাধারণ ব্যয়',
          rawRecord: res,
        });
      } else if (selectedDestination === 'DONATION_NEW') {
        const res = await api.createDonation({
          mosqueId,
          date,
          amount: numAmount,
          donorName: donorName || 'বেনামী দাতা',
          donorPhone: donorPhone || undefined,
          category: donationCategory,
          paymentMethod,
          notes: description || 'কুইক সাধারণ দান',
          denominationBreakdown: denominationBreakdown || undefined,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'DONATION',
          titleBn: 'দান ও অনুদান রশিদ তৈরি সম্পন্ন',
          receiptNumber: res.receiptNumber,
          amount: numAmount,
          date,
          donorName: donorName || 'বেনামী দাতা',
          rawRecord: res,
        });
      } else if (selectedDestination === 'JUMUAH_COLLECTION') {
        const res = await api.createIncome({
          mosqueId,
          date,
          amount: numAmount,
          accountHeadId: accountHeadId || 'juma-income',
          accountHeadNameBn: 'পবিত্র জুমার জামাত কালেকশন',
          financialAccountId: financialAccountId || financialAccounts[0]?.id || 'cash-1',
          paymentMethod: 'CASH',
          description: `জুমার কালেকশন - উপস্থিত: ${attendeesCount || 'N/A'} মুসল্লি • গণনাকারী: ${witnesses}`,
          denominationBreakdown: denominationBreakdown || undefined,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'JUMUAH',
          titleBn: 'পবিত্র জুমার জামাত কালেকশন জমা সম্পন্ন',
          voucherNumber: res.voucherNumber,
          amount: numAmount,
          date,
          accountHeadName: 'জুমার কালেকশন',
          rawRecord: res,
        });
      } else if (selectedDestination === 'DONATION_BOX_COLLECTION') {
        const box = donationBoxes.find((b) => b.id === selectedBoxId) || donationBoxes[0];
        const res = await api.createDonationBoxCollection({
          mosqueId,
          donationBoxId: box?.id || 'box-1',
          boxCode: box?.boxCode || 'BOX-01',
          collectionDate: date,
          amount: numAmount,
          openedBy: witnesses || currentUser.name,
          denominationBreakdown: denominationBreakdown || undefined,
          notes: description || 'দানবাক্স কুইক কালেকশন',
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'DONATION_BOX',
          titleBn: `দানবাক্স (${box?.nameBn || 'প্রধান বক্স'}) কালেকশন সম্পন্ন`,
          receiptNumber: `BOX-REC-${Date.now().toString().slice(-4)}`,
          amount: numAmount,
          date,
          rawRecord: res,
        });
      } else if (selectedDestination === 'STAFF_SALARY') {
        const staff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];
        const res = await api.createStaffPayment({
          mosqueId,
          staffId: staff?.id || 'staff-1',
          paymentDate: date,
          month: salaryMonth,
          baseSalary: numAmount,
          bonus: parseFloat(bonusAmount) || 0,
          deductions: parseFloat(deductionAmount) || 0,
          totalAmount: numAmount + (parseFloat(bonusAmount) || 0) - (parseFloat(deductionAmount) || 0),
          paymentMethod,
          financialAccountId: financialAccountId || financialAccounts[0]?.id || 'cash-1',
          notes: description || `মাসিক বেতন - ${salaryMonth}`,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'STAFF_SALARY',
          titleBn: `স্টাফ বেতন প্রদান সফল (${staff?.nameBn || staff?.name})`,
          receiptNumber: `PAY-${Date.now().toString().slice(-4)}`,
          amount: numAmount + (parseFloat(bonusAmount) || 0) - (parseFloat(deductionAmount) || 0),
          date,
          recipientName: staff?.nameBn || staff?.name,
          rawRecord: res,
        });
      } else if (selectedDestination === 'WAQF_RENT') {
        const prop = properties.find((p) => p.id === selectedPropertyId) || properties[0];
        const total = numAmount + (parseFloat(utilityBill) || 0);
        const res = await api.createIncome({
          mosqueId,
          date,
          amount: total,
          accountHeadId: accountHeadId || 'waqf-rent-head',
          accountHeadNameBn: `দোকান/ইউনিট ভাড়া (${prop?.nameBn || prop?.name})`,
          financialAccountId: financialAccountId || financialAccounts[0]?.id || 'cash-1',
          paymentMethod,
          donorName: donorName || prop?.currentTenantName || 'ভাড়াটিয়া',
          description: `দোকান ভাড়া - ${rentMonth} (ভাড়া: ৳${numAmount}, ইউটিলিটি: ৳${utilityBill || 0})`,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'WAQF_RENT',
          titleBn: `ওয়াকফ দোকান ভাড়া আদায় সম্পন্ন (${prop?.nameBn || prop?.name})`,
          voucherNumber: res.voucherNumber,
          amount: total,
          date,
          donorName: donorName || prop?.currentTenantName || 'ভাড়াটিয়া',
          rawRecord: res,
        });
      } else if (selectedDestination === 'ASSET_SERVICE') {
        const asset = assets.find((a) => a.id === selectedAssetId) || assets[0];
        const res = await api.createExpense({
          mosqueId,
          date,
          amount: numAmount,
          accountHeadId: accountHeadId || 'asset-repair-head',
          accountHeadNameBn: `সম্পদ মেরামত ও সার্ভিসিং (${asset?.nameBn || asset?.name})`,
          financialAccountId: financialAccountId || financialAccounts[0]?.id || 'cash-1',
          paymentMethod,
          paidTo: technicianName || 'টেকনিশিয়ান / সার্ভিস সেন্টার',
          description: `সার্ভিসিং: ${description || 'রক্ষণাবেক্ষণ ও পার্টস'} • ফোন: ${technicianPhone || 'N/A'} • পরবর্তী সার্ভিস: ${nextServiceDate || 'N/A'}`,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'ASSET_SERVICE',
          titleBn: `সম্পদ সার্ভিসিং ব্যয় রেকর্ড সম্পন্ন (${asset?.nameBn || asset?.name})`,
          voucherNumber: res.voucherNumber,
          amount: numAmount,
          date,
          recipientName: technicianName || 'সার্ভিস সেন্টার',
          rawRecord: res,
        });
      } else if (selectedDestination === 'CEMETERY_BURIAL') {
        const res = await api.createCemeteryRecord({
          mosqueId,
          deceasedName: deceasedName || 'মরহুম',
          deceasedNameBn: deceasedName || 'মরহুম',
          burialDate: date,
          plotNumber: plotNumber || `PLOT-${Date.now().toString().slice(-3)}`,
          relativeName: relativeName || 'অভিভাবক',
          relativePhone: relativePhone || 'N/A',
          notes: description || `দাফন ফি বাবদ আদায়: ৳${numAmount}`,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'CEMETERY',
          titleBn: `কবরস্থান দাফন রেকর্ড সংরক্ষণ সম্পন্ন`,
          receiptNumber: `CEM-${plotNumber || 'PLT'}`,
          amount: numAmount,
          date,
          donorName: deceasedName,
          rawRecord: res,
        });
      } else if (selectedDestination === 'COMMITTEE_MEETING') {
        const res = await api.createCommitteeMeeting({
          mosqueId,
          date,
          time: '18:00',
          meetingType: meetingType as any,
          agenda: meetingSubject || 'সাধারণ কার্যবিবরণী ও উন্নয়ন পর্যালোচনা',
          chairpersonName: chairpersonName || 'কমিটি সভাপতি',
          resolutionsSummary: resolutionsText || 'সিদ্ধান্ত গৃহীত হয়েছে',
          status: 'COMPLETED',
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'COMMITTEE',
          titleBn: `কমিটি মিটিং ও রেজুলেশন সংরক্ষিত হয়েছে`,
          voucherNumber: `MTG-${res.id.slice(-4)}`,
          date,
          donorName: chairpersonName,
          rawRecord: res,
        });
      } else if (selectedDestination === 'FUND_TRANSFER') {
        const fromAcc = financialAccounts.find((a) => a.id === fromAccountId) || financialAccounts[0];
        const toAcc = financialAccounts.find((a) => a.id === toAccountId) || financialAccounts[1];
        const res = await api.createFundTransfer({
          mosqueId,
          date,
          amount: numAmount,
          fromAccountId: fromAcc?.id || 'cash-1',
          toAccountId: toAcc?.id || 'bank-1',
          description: description || `তহবিল স্থানান্তর: ${fromAcc?.nameBn || fromAcc?.name} -> ${toAcc?.nameBn || toAcc?.name}`,
        });

        playScanSuccessSound();
        triggerHapticFeedback([100, 50, 100]);
        setSuccessResult({
          type: 'FUND_TRANSFER',
          titleBn: `তহবিল স্থানান্তর সম্পন্ন (${fromAcc?.nameBn} ➔ ${toAcc?.nameBn})`,
          voucherNumber: `TRF-${Date.now().toString().slice(-4)}`,
          amount: numAmount,
          date,
          rawRecord: res,
        });
      }
    } catch (err: any) {
      console.error('Quick Entry Submit error:', err);
      alert(`সংরক্ষণ করতে ব্যর্থ হয়েছে: ${err.message || 'Error occurred'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Direct POS / Thermal Print Handler
  const handlePrintReceipt = (format: 'POS_80' | 'A4') => {
    if (!successResult) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    if (format === 'POS_80') {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>রশিদ #${successResult.voucherNumber || successResult.receiptNumber || '001'}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { font-family: monospace, sans-serif; width: 72mm; margin: 4mm auto; font-size: 12px; color: #000; }
              .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
              .mosque-name { font-size: 15px; font-weight: bold; }
              .row { display: flex; justify-content: space-between; margin: 3px 0; }
              .total-box { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; font-size: 14px; font-weight: bold; margin: 8px 0; }
              .footer { text-align: center; font-size: 10px; margin-top: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="mosque-name">${currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</div>
              <div>${currentMosque?.address || ''}</div>
              <div style="font-size: 11px; margin-top: 4px; font-weight: bold;">কুইক অপারেশনাল রশিদ / ভাউচার</div>
            </div>
            <div class="row"><span>তারিখ:</span><span>${successResult.date || date}</span></div>
            <div class="row"><span>রশিদ/ভাউচার নং:</span><span>${successResult.voucherNumber || successResult.receiptNumber || 'N/A'}</span></div>
            ${successResult.donorName ? `<div class="row"><span>দাতা/প্রাপক:</span><span>${successResult.donorName}</span></div>` : ''}
            ${successResult.accountHeadName ? `<div class="row"><span>খাত:</span><span>${successResult.accountHeadName}</span></div>` : ''}
            <div class="total-box row">
              <span>মোট টাকা:</span>
              <span>৳ ${new Intl.NumberFormat('bn-BD').format(successResult.amount || 0)}</span>
            </div>
            <div class="footer">
              <div>আল্লাহ আপনার দান ও আমল কবুল করুন</div>
              <div style="margin-top: 4px;">MasjidLedger Smart POS System</div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
    } else {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>অফিসিয়াল রশিদ - ${successResult.voucherNumber || 'MasjidLedger'}</title>
            <style>
              @page { size: A5 landscape; margin: 10mm; }
              body { font-family: 'SolaimanLipi', sans-serif; color: #0f172a; padding: 15px; }
              .voucher-box { border: 2px solid #047857; border-radius: 12px; padding: 20px; max-width: 600px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #047857; padding-bottom: 10px; margin-bottom: 15px; }
              .title { font-size: 20px; font-weight: bold; color: #047857; }
              .row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
              .amount-box { background: #f0fdf4; border: 1px solid #86efac; padding: 10px; border-radius: 8px; font-size: 18px; font-weight: bold; color: #15803d; text-align: center; margin: 15px 0; }
              .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; border-top: 1px dotted #94a3b8; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="voucher-box">
              <div class="header">
                <div class="title">${currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</div>
                <div style="font-size: 12px; color: #64748b;">${currentMosque?.address || ''}</div>
                <div style="display:inline-block; background:#047857; color:#fff; font-size:12px; padding:2px 10px; border-radius:10px; margin-top:6px;">
                  ${successResult.titleBn}
                </div>
              </div>
              <div class="row">
                <span><strong>ভাউচার/রশিদ নং:</strong> ${successResult.voucherNumber || successResult.receiptNumber || 'N/A'}</span>
                <span><strong>তারিখ:</strong> ${successResult.date || date}</span>
              </div>
              ${successResult.donorName ? `<div class="row"><span><strong>দাতা / প্রাপকের নাম:</strong> ${successResult.donorName}</span></div>` : ''}
              ${successResult.accountHeadName ? `<div class="row"><span><strong>হিসাব খাত:</strong> ${successResult.accountHeadName}</span></div>` : ''}
              <div class="amount-box">
                টাকার পরিমাণ: ৳ ${new Intl.NumberFormat('bn-BD').format(successResult.amount || 0)} (পরিশোধিত)
              </div>
              <div class="signatures">
                <div>আদায়কারী / ক্যাশিয়ার স্বাক্ষর</div>
                <div>কোষাধ্যক্ষ / সেক্রেটারির স্বাক্ষর</div>
              </div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
    }
    printWin.document.close();
  };

  const getDestinationIcon = (dest: QRDestinationType) => {
    switch (dest) {
      case 'INCOME_NEW':
        return <ArrowDownLeft className="w-5 h-5 text-emerald-400" />;
      case 'EXPENSE_NEW':
        return <ArrowUpRight className="w-5 h-5 text-rose-400" />;
      case 'JUMUAH_COLLECTION':
        return <Users className="w-5 h-5 text-teal-400" />;
      case 'DONATION_BOX_COLLECTION':
        return <Box className="w-5 h-5 text-amber-400" />;
      case 'DONATION_NEW':
        return <HeartHandshake className="w-5 h-5 text-emerald-400" />;
      case 'STAFF_SALARY':
        return <WalletCards className="w-5 h-5 text-indigo-400" />;
      case 'WAQF_RENT':
        return <Receipt className="w-5 h-5 text-cyan-400" />;
      case 'ASSET_SERVICE':
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case 'CEMETERY_BURIAL':
        return <Flower2 className="w-5 h-5 text-slate-400" />;
      case 'COMMITTEE_MEETING':
        return <CalendarCheck className="w-5 h-5 text-purple-400" />;
      case 'FUND_TRANSFER':
        return <ArrowRightLeft className="w-5 h-5 text-blue-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  const getDestinationTitle = (dest: QRDestinationType) => {
    switch (dest) {
      case 'INCOME_NEW':
        return 'কুইক আয় এন্ট্রি';
      case 'EXPENSE_NEW':
        return 'কুইক ব্যয় ভাউচার এন্ট্রি';
      case 'JUMUAH_COLLECTION':
        return 'জুমার জামাত কালেকশন কাউন্টার';
      case 'DONATION_BOX_COLLECTION':
        return 'দানবাক্স কালেকশন ও নোট গণনা';
      case 'DONATION_NEW':
        return 'সাধারণ দান ও মানি রসিদ';
      case 'STAFF_SALARY':
        return 'স্টাফ মাসিক বেতন পরিশোধ';
      case 'WAQF_RENT':
        return 'ওয়াকফ দোকান ও ইউনিট ভাড়া আদায়';
      case 'ASSET_SERVICE':
        return 'সম্পদ সার্ভিসিং ও মেরামত ব্যয়';
      case 'CEMETERY_BURIAL':
        return 'কবরস্থান দাফন ও প্লট বরাদ্দ';
      case 'COMMITTEE_MEETING':
        return 'কমিটি মিটিং উপস্থিতি ও রেজুলেশন';
      case 'FUND_TRANSFER':
        return 'তহবিল স্থানান্তর (Fund Transfer)';
      default:
        return 'কুইক অপারেশনাল এন্ট্রি';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-5 animate-fadeIn">
      {/* Top Navigation Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <button
            onClick={onBackToDashboard}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center justify-center shrink-0 border border-slate-700"
            title="ড্যাশবোর্ডে ফিরুন"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                ⚡ কুইক অপারেশন
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString('bn-BD')}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              {getDestinationIcon(selectedDestination)}
              <span>{getDestinationTitle(selectedDestination)}</span>
            </h1>
          </div>
        </div>

        {/* Quick Module Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={selectedDestination}
            onChange={(e) => {
              setSelectedDestination(e.target.value as QRDestinationType);
              handleResetForm();
            }}
            className="bg-slate-800 text-white text-xs font-semibold rounded-xl px-3 py-2.5 border border-slate-700 focus:border-emerald-500 outline-hidden w-full sm:w-auto cursor-pointer"
          >
            <option value="INCOME_NEW">💰 কুইক আয় এন্ট্রি</option>
            <option value="EXPENSE_NEW">💸 কুইক ব্যয় ভাউচার</option>
            <option value="JUMUAH_COLLECTION">🕌 জুমার কালেকশন</option>
            <option value="DONATION_BOX_COLLECTION">📦 দানবাক্স কালেকশন</option>
            <option value="DONATION_NEW">🤝 সাধারণ দান ও রশিদ</option>
            <option value="STAFF_SALARY">💳 স্টাফ বেতন পরিশোধ</option>
            <option value="WAQF_RENT">🏬 ওয়াকফ দোকান ভাড়া</option>
            <option value="ASSET_SERVICE">🔧 সম্পদ সার্ভিসিং</option>
            <option value="CEMETERY_BURIAL">⚰️ কবরস্থান দাফন রেকর্ড</option>
            <option value="COMMITTEE_MEETING">📋 কমিটি মিটিং</option>
            <option value="FUND_TRANSFER">🔄 তহবিল স্থানান্তর</option>
          </select>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION BANNER */}
      {successResult && (
        <div
          id="quick-entry-success-card"
          className="bg-emerald-950/80 border-2 border-emerald-500/80 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 animate-scaleUp"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center font-black shadow-lg shrink-0">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <div className="text-emerald-300 font-bold text-xs uppercase tracking-wider">
                স্বয়ংক্রিয় এন্ট্রি সংরক্ষিত
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{successResult.titleBn}</h2>
              <p className="text-sm text-emerald-200">
                ডাটাবেজে তাৎক্ষণিকভাবে লেজার ও অডিট ট্রেইল আপডেট হয়েছে।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 rounded-2xl p-4 border border-emerald-500/30">
            {successResult.voucherNumber && (
              <div>
                <span className="text-[11px] text-slate-400 block">ভাউচার নম্বর</span>
                <span className="font-mono font-bold text-white text-sm">
                  {successResult.voucherNumber}
                </span>
              </div>
            )}
            {successResult.receiptNumber && (
              <div>
                <span className="text-[11px] text-slate-400 block">রশিদ নম্বর</span>
                <span className="font-mono font-bold text-white text-sm">
                  {successResult.receiptNumber}
                </span>
              </div>
            )}
            {successResult.amount !== undefined && (
              <div>
                <span className="text-[11px] text-slate-400 block">মোট টাকা</span>
                <span className="font-mono font-black text-emerald-400 text-lg">
                  ৳ {new Intl.NumberFormat('bn-BD').format(successResult.amount)}
                </span>
              </div>
            )}
            <div>
              <span className="text-[11px] text-slate-400 block">তারিখ</span>
              <span className="font-medium text-slate-200 text-sm">{successResult.date || date}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handlePrintReceipt('POS_80')}
              className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-extrabold rounded-xl text-sm flex items-center gap-2 shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>POS থার্মাল স্লিপ প্রিন্ট (80mm)</span>
            </button>
            <button
              onClick={() => handlePrintReceipt('A4')}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm flex items-center gap-2 shadow-lg transition"
            >
              <FileText className="w-4 h-4" />
              <span>A5 / A4 রশিদ প্রিন্ট</span>
            </button>
            <button
              onClick={handleResetForm}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-xl text-sm flex items-center gap-2 border border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>আরেকটি এন্ট্রি করুন</span>
            </button>
            <button
              onClick={onBackToDashboard}
              className="px-4 py-3 bg-transparent hover:bg-slate-800/80 text-slate-300 text-sm font-semibold rounded-xl transition ml-auto"
            >
              ড্যাশবোর্ডে ফিরুন
            </button>
          </div>
        </div>
      )}

      {/* MAIN ENTRY FORM */}
      {!successResult && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8 space-y-6"
        >
          {/* Mosque & Operator Sub-header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-800">{currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>অপারেটর: <strong className="text-slate-800">{currentUser.name}</strong></span>
            </div>
          </div>

          {/* Core Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Date Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>তারিখ</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
              />
            </div>

            {/* Dynamic Module Field 1 */}
            {selectedDestination === 'INCOME_NEW' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">আয়ের হিসাব খাত</label>
                <select
                  value={accountHeadId}
                  onChange={(e) => setAccountHeadId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                >
                  {accountHeads
                    .filter((h) => h.type === 'INCOME')
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn || h.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selectedDestination === 'EXPENSE_NEW' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ব্যয়ের হিসাব খাত</label>
                <select
                  value={accountHeadId}
                  onChange={(e) => setAccountHeadId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                >
                  {accountHeads
                    .filter((h) => h.type === 'EXPENSE')
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn || h.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {selectedDestination === 'DONATION_BOX_COLLECTION' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">দানবাক্স নির্বাচন</label>
                <select
                  value={selectedBoxId}
                  onChange={(e) => setSelectedBoxId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                >
                  {donationBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameBn || b.name} ({b.boxCode || 'BOX'}) - {b.location || 'মসজিদ'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDestination === 'STAFF_SALARY' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">স্টাফ সদস্য</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameBn || s.name} ({s.designation || 'স্টাফ'}) - ৳{s.baseSalary || 0}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDestination === 'WAQF_RENT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ওয়াকফ ইউনিট / দোকান</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameBn || p.name} ({p.propertyCode}) - ভাড়াটিয়া: {p.currentTenantName || 'খালি'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDestination === 'ASSET_SERVICE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">মসজিদ সম্পদ / যন্ত্রপাতি</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn || a.name} ({a.assetCode}) - {a.location || 'মসজিদ'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedDestination === 'FUND_TRANSFER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">উৎস অ্যাকাউন্ট (From)</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                >
                  {financialAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn || a.name} ({a.accountType}) - ৳{a.currentBalance || 0}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Module Specific Fields Rows */}
          {/* 1. Income & Donation Fields */}
          {(selectedDestination === 'INCOME_NEW' || selectedDestination === 'DONATION_NEW') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">দাতার নাম (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="বেনামী বা দাতার নাম..."
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">মোবাইল নম্বর (SMS রশিদ পাঠানোর জন্য)</label>
                <input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
            </div>
          )}

          {/* 2. Expense Fields */}
          {selectedDestination === 'EXPENSE_NEW' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">প্রাপকের নাম / দোকান / ভেন্ডর</label>
                <input
                  type="text"
                  placeholder="কাকে টাকা দেওয়া হলো..."
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">মেমো / বিল রেফারেন্স (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="বিল বা ক্যাশ মেমো নং..."
                  value={voucherReference}
                  onChange={(e) => setVoucherReference(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
            </div>
          )}

          {/* 3. Juma Collection Attendees & Witnesses */}
          {selectedDestination === 'JUMUAH_COLLECTION' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">উপস্থিত মুসল্লী সংখ্যা (আনুমানিক)</label>
                <input
                  type="number"
                  placeholder="যেমন: ৪৫০"
                  value={attendeesCount}
                  onChange={(e) => setAttendeesCount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">গণনাকারী ও সাক্ষীদের নাম</label>
                <input
                  type="text"
                  value={witnesses}
                  onChange={(e) => setWitnesses(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
            </div>
          )}

          {/* 4. Cemetery Fields */}
          {selectedDestination === 'CEMETERY_BURIAL' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">মরহুমের নাম</label>
                <input
                  type="text"
                  placeholder="মরহুমের নাম লিখুন..."
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">অভিভাবক / আত্মীয়ের নাম</label>
                <input
                  type="text"
                  placeholder="যোগাযোগকারীর নাম..."
                  value={relativeName}
                  onChange={(e) => setRelativeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={relativePhone}
                  onChange={(e) => setRelativePhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
                />
              </div>
            </div>
          )}

          {/* 5. Fund Transfer Destination Account */}
          {selectedDestination === 'FUND_TRANSFER' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">গন্তব্য অ্যাকাউন্ট (To)</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
              >
                {financialAccounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn || a.name} ({a.accountType}) - ৳{a.currentBalance || 0}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* AMOUNT & DENOMINATION SECTION */}
          {selectedDestination !== 'COMMITTEE_MEETING' && (
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <label className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">৳</span>
                  <span>টাকার মোট পরিমাণ *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowDenomination(!showDenomination)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 transition"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>{showDenomination ? 'নোট কাউন্টার লুকান' : 'ভাংতি টাকা ও নোট গণনা করুন'}</span>
                </button>
              </div>

              {/* Large Touch Friendly Amount Input */}
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-2xl font-black text-slate-400">৳</span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-slate-300 focus:border-emerald-600 rounded-2xl py-3 pl-11 pr-4 text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight outline-hidden transition shadow-inner"
                />
              </div>

              {/* Collapsible Denomination Counter */}
              {showDenomination && (
                <div className="pt-2 animate-fadeIn">
                  <DenominationCounter
                    onChange={(breakdown, total) => {
                      setDenominationBreakdown(breakdown);
                    }}
                    onApply={(total) => {
                      setAmount(total.toString());
                    }}
                  />
                </div>
              )}

              {/* Payment Method & Financial Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">পেমেন্ট মাধ্যম</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'BANK', 'MOBILE_BANKING'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition text-center ${
                          paymentMethod === m
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {m === 'CASH' ? '💵 ক্যাশ' : m === 'BANK' ? '🏦 ব্যাংক' : '📱 মোবাইল'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">মসজিদ হিসাব / ফান্ড</label>
                  <select
                    value={financialAccountId}
                    onChange={(e) => setFinancialAccountId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 outline-hidden transition"
                  >
                    {financialAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nameBn || a.name} ({a.accountType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Optional Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">মন্তব্য / বিবরণ (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="অতিরিক্ত কোনো তথ্য থাকলে লিখুন..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-3.5 text-sm font-medium text-slate-800 outline-hidden transition"
            />
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-emerald-700/20 flex items-center justify-center gap-2 transition active:scale-98"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>সংরক্ষণ ও নিশ্চিত করুন</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-full sm:w-auto py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition"
            >
              বাতিল
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

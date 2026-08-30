import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  Box,
  Plus,
  Search,
  Printer,
  Receipt,
  QrCode,
  CheckCircle2,
  Users,
  Eye,
  DollarSign,
  AlertCircle,
  Calculator,
  Banknote,
  MessageSquare,
  Calendar,
  Building,
  Building2,
  Store,
  Phone,
  MapPin,
  Tag,
  Edit2,
  ShieldCheck,
  Smartphone,
  RotateCcw,
  Clock,
  Filter,
  FileText,
  X,
  Sparkles,
  ChevronDown,
  Info,
  Check,
  Download,
} from 'lucide-react';
import {
  Donation,
  DonationBox,
  DonationBoxCollection,
  FinancialAccount,
  AccountHead,
  PaymentMethod,
  Mosque,
  CashDenominationData,
  User,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { DenominationDetailModal } from './DenominationDetailModal';
import { api } from '../lib/api';
import { QRViewer, Barcode128 } from './BarcodeQRService';
import { SmsPreviewModal } from './SmsPreviewModal';
import { EditDonationBoxModal } from './EditModals';
import { QuickDonationBoxReportModal } from './QuickDonationBoxReportModal';
import { getJumaDisplayDetails } from '../lib/jumaHelper';
import { QrScanResult } from '../types/qrBarcodeTypes';

interface DonationViewProps {
  donations: Donation[];
  donationBoxes: DonationBox[];
  boxCollections: DonationBoxCollection[];
  accounts: FinancialAccount[];
  accountHeads?: AccountHead[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  scannedActionIntent?: QrScanResult | null;
  onClearScannedAction?: () => void;
  onAddDonation: (data: any) => Promise<Donation>;
  onCollectBox: (data: any) => Promise<void>;
  onAddDonationBox?: (data: any) => Promise<void>;
  onAddBox?: (data: any) => Promise<void>;
  onUpdateDonationBox?: (id: string, data: any) => Promise<void>;
  onUpdateBox?: (id: string, data: any) => Promise<void>;
  onPrintReceipt: (
    donation: Donation,
    format?: 'A4' | 'POS_80' | 'POS_58',
    isReprint?: boolean
  ) => void;
  onSendSms?: (phone: string, message: string, tokenUrl?: string) => Promise<any>;
}

// Helper to calculate human readable duration elapsed since last opening or installation
export const getDurationSinceLastOpened = (lastCollectedDate?: string, createdAt?: string): { text: string; days: number; isFirstTime: boolean } => {
  const dateStr = lastCollectedDate || createdAt;
  if (!dateStr) {
    return { text: 'কখনো খোলা হয়নি (নতুন দানবাক্স)', days: 0, isFirstTime: true };
  }
  const pastDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - pastDate.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isFirst = !lastCollectedDate;

  if (diffDays === 0) {
    return {
      text: isFirst ? 'আজই স্থাপন করা হয়েছে (কখনো খোলা হয়নি)' : 'আজই খোলা হয়েছে (০ দিন)',
      days: 0,
      isFirstTime: isFirst,
    };
  }

  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = (diffDays % 365) % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} বছর`);
  if (months > 0) parts.push(`${months} মাস`);
  if (days > 0 || parts.length === 0) parts.push(`${days} দিন`);

  const durationStr = parts.join(' ');
  if (isFirst) {
    return {
      text: `কখনো খোলা হয়নি (${durationStr} পূর্বে স্থাপিত)`,
      days: diffDays,
      isFirstTime: true,
    };
  }

  return {
    text: `সর্বশেষ খোলার পর ${durationStr} অতিবাহিত (${diffDays} দিন)`,
    days: diffDays,
    isFirstTime: false,
  };
};

export const DonationView: React.FC<DonationViewProps> = ({
  donations,
  donationBoxes,
  boxCollections,
  accounts,
  accountHeads,
  currentMosque,
  currentUser,
  language = 'bn',
  scannedActionIntent,
  onClearScannedAction,
  onAddDonation,
  onCollectBox,
  onAddDonationBox,
  onAddBox,
  onUpdateDonationBox,
  onUpdateBox,
  onPrintReceipt,
  onSendSms,
}) => {
  const t = translations[language] || translations.bn;
  const [activeSubTab, setActiveSubTab] = useState<'donations' | 'boxes' | 'juma'>('donations');
  const [searchQuery, setSearchQuery] = useState('');

  // Box History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [filterBoxId, setFilterBoxId] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Modals & Helpers
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorTarget, setCalculatorTarget] = useState<'DONATION' | 'BOX' | 'JUMA'>('DONATION');
  const [smsTarget, setSmsTarget] = useState<Donation | null>(null);
  const [qrTargetBox, setQrTargetBox] = useState<DonationBox | null>(null);
  const [editingBox, setEditingBox] = useState<DonationBox | null>(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isQuickBoxReportOpen, setIsQuickBoxReportOpen] = useState(false);
  const [selectedReportBoxId, setSelectedReportBoxId] = useState('ALL');
  const [isPrintBoxListOpen, setIsPrintBoxListOpen] = useState(false);
  const [isPrintJumaReportOpen, setIsPrintJumaReportOpen] = useState(false);

  // Juma History Filters
  const [jumaSearch, setJumaSearch] = useState('');
  const [jumaFilterDateFrom, setJumaFilterDateFrom] = useState('');
  const [jumaFilterDateTo, setJumaFilterDateTo] = useState('');

  // 1. "দানবক্স এড করুন" (Add Donation Box Master Modal)
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [newBoxCode, setNewBoxCode] = useState('');
  const [newManualName, setNewManualName] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [newResponsiblePerson, setNewResponsiblePerson] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newLastOpeningOption, setNewLastOpeningOption] = useState<'NEVER' | 'PREVIOUS' | 'TODAY'>('NEVER');
  const [newLastCollectedDate, setNewLastCollectedDate] = useState('');
  const [newInstallationDate, setNewInstallationDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingBox, setIsAddingBox] = useState(false);
  const [addBoxError, setAddBoxError] = useState('');

  // 2. Donation Modal
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<Donation['category']>('GENERAL');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [reference, setReference] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donationDenominationData, setDonationDenominationData] = useState<CashDenominationData | null>(null);

  // 3. "দানবাক্স কালেকশন ও টাকা জমা" (Box Collection Modal)
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState(donationBoxes[0]?.id || '');
  const [boxAmount, setBoxAmount] = useState('');
  const [countingTeam, setCountingTeam] = useState('কোষাধ্যক্ষ, মুয়াজ্জিন, হিসাবরক্ষক');
  const [witnesses, setWitnesses] = useState('সভাপতি / সাধারণ সম্পাদক, সম্মানিত মুসল্লিগণ');
  const [boxDepositAccountId, setBoxDepositAccountId] = useState(accounts[0]?.id || '');
  const [boxCollectionDate, setBoxCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [boxNotes, setBoxNotes] = useState('');
  const [isCollectingBox, setIsCollectingBox] = useState(false);
  const [boxDenominationData, setBoxDenominationData] = useState<CashDenominationData | null>(null);

  // 4. Juma Collection Modal
  const [isJumaModalOpen, setIsJumaModalOpen] = useState(false);
  const [jumaAmount, setJumaAmount] = useState('');
  const [jumaDate, setJumaDate] = useState(new Date().toISOString().split('T')[0]);
  const [jumaTeam, setJumaTeam] = useState('');
  const [jumaWitness, setJumaWitness] = useState('');
  const [jumaAccount, setJumaAccount] = useState(accounts[0]?.id || '');
  const [jumaNotes, setJumaNotes] = useState('পবিত্র জুমার সাধারণ কালেকশন');
  const [jumaDenominationData, setJumaDenominationData] = useState<CashDenominationData | null>(null);

  // 5. Denomination Detail / Slip Modal State
  const [isDenominationDetailOpen, setIsDenominationDetailOpen] = useState(false);
  const [activeDenominationDetail, setActiveDenominationDetail] = useState<CashDenominationData | null>(null);
  const [activeDenominationRef, setActiveDenominationRef] = useState('');
  const [activeDenominationSource, setActiveDenominationSource] = useState<'INCOME' | 'DONATION' | 'DONATION_BOX' | 'RENT' | 'OTHER'>('DONATION');
  const [activeDenominationRecordId, setActiveDenominationRecordId] = useState('');

  // Handle Box Save function resolving both props
  const saveBoxHandler = onAddDonationBox || onAddBox;
  const updateBoxHandler = onUpdateDonationBox || onUpdateBox;

  // Open "দানবক্স এড করুন" modal with auto serial number
  const handleOpenAddBoxModal = () => {
    const nextNum = donationBoxes.length + 1;
    const autoCode = `BOX-${String(nextNum).padStart(3, '0')}`;
    setNewBoxCode(autoCode);
    setNewManualName(`দানবাক্স #${nextNum}`);
    setNewShopName('');
    setNewOwnerName('');
    setNewOwnerPhone('');
    setNewAddress('');
    setNewLocation('');
    setNewStatus('ACTIVE');
    setNewResponsiblePerson('');
    setNewNotes('');
    setNewLastOpeningOption('NEVER');
    setNewLastCollectedDate('');
    setNewInstallationDate(new Date().toISOString().split('T')[0]);
    setAddBoxError('');
    setIsAddBoxModalOpen(true);
  };

  // Handle Scan -> Direct Entry for Donation, Box Collection, and Juma Collection
  useEffect(() => {
    if (!scannedActionIntent) return;

    if (scannedActionIntent.actionKey === 'ACT-DON-NEW' || scannedActionIntent.actionKey === 'ACT_DON_NEW') {
      setActiveSubTab('donations');
      // Reset form fields
      setDonorName('');
      setDonorPhone('');
      setDonorAddress('');
      setIsAnonymous(false);
      setCategory('GENERAL');
      setAmount('');
      setPaymentMethod('CASH');
      setAccountId(accounts[0]?.id || '');
      setReference('');
      setDonationDate(new Date().toISOString().split('T')[0]);
      setErrorMessage('');
      setDonationDenominationData(null);
      setIsDonationModalOpen(true);
      onClearScannedAction?.();
    } else if (scannedActionIntent.actionKey === 'ACT-BOX-COLLECT' || scannedActionIntent.actionKey === 'ACT_BOX_COLLECT') {
      setActiveSubTab('boxes');
      setSelectedBoxId(donationBoxes[0]?.id || '');
      setBoxAmount('');
      setCountingTeam('কোষাধ্যক্ষ, মুয়াজ্জিন, হিসাবরক্ষক');
      setWitnesses('সভাপতি / সাধারণ সম্পাদক, সম্মানিত মুসল্লিগণ');
      setBoxDepositAccountId(accounts[0]?.id || '');
      setBoxCollectionDate(new Date().toISOString().split('T')[0]);
      setBoxNotes('');
      setBoxDenominationData(null);
      setIsBoxModalOpen(true);
      onClearScannedAction?.();
    } else if (scannedActionIntent.actionKey === 'ACT-JUM-COLLECT' || scannedActionIntent.actionKey === 'ACT_JUM_COLLECT') {
      setActiveSubTab('juma');
      setJumaAmount('');
      setJumaDate(new Date().toISOString().split('T')[0]);
      setJumaTeam('ইমাম সাহেব, কোষাধ্যক্ষ, মুয়াজ্জিন');
      setJumaWitness('সভাপতি / সাধারণ সম্পাদক ও উপস্থিত মুসল্লিগণ');
      setJumaAccount(accounts[0]?.id || '');
      setJumaNotes('পবিত্র জুমার সাধারণ কালেকশন');
      setJumaDenominationData(null);
      setIsJumaModalOpen(true);
      onClearScannedAction?.();
    }
  }, [scannedActionIntent, accounts, donationBoxes]);

  // Currently selected box in collection dialog
  const activeSelectedBox = useMemo(() => {
    return donationBoxes.find((b) => b.id === selectedBoxId) || donationBoxes[0];
  }, [donationBoxes, selectedBoxId]);

  // Duration for currently selected box
  const selectedBoxDuration = useMemo(() => {
    if (!activeSelectedBox) return null;
    return getDurationSinceLastOpened(activeSelectedBox.lastCollectedDate, activeSelectedBox.createdAt);
  }, [activeSelectedBox]);

  // Available collection years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    boxCollections.forEach((c) => {
      if (c.collectionDate) {
        years.add(c.collectionDate.substring(0, 4));
      }
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort().reverse();
  }, [boxCollections]);

  // Filtered Box Collections
  const filteredBoxCollections = useMemo(() => {
    return boxCollections.filter((col) => {
      // Box filter
      if (filterBoxId !== 'ALL' && col.boxId !== filterBoxId) return false;

      // Year filter
      if (filterYear !== 'ALL') {
        const colYear = col.collectionDate ? col.collectionDate.substring(0, 4) : '';
        if (colYear !== filterYear) return false;
      }

      // Date range filter
      if (filterDateFrom && col.collectionDate < filterDateFrom) return false;
      if (filterDateTo && col.collectionDate > filterDateTo) return false;

      // Search query
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const boxCode = (col.boxCode || '').toLowerCase();
        const team = Array.isArray(col.countingTeam) ? col.countingTeam.join(' ').toLowerCase() : '';
        const witness = Array.isArray(col.witnesses) ? col.witnesses.join(' ').toLowerCase() : '';
        const ref = (col.depositReference || col.incomeVoucherNumber || '').toLowerCase();
        const acc = (col.depositAccountName || '').toLowerCase();
        const matchedBox = donationBoxes.find((b) => b.id === col.boxId);
        const shop = (matchedBox?.shopName || '').toLowerCase();
        const loc = (matchedBox?.location || '').toLowerCase();
        const mName = (matchedBox?.manualName || '').toLowerCase();

        return (
          boxCode.includes(q) ||
          team.includes(q) ||
          witness.includes(q) ||
          ref.includes(q) ||
          acc.includes(q) ||
          shop.includes(q) ||
          loc.includes(q) ||
          mName.includes(q)
        );
      }

      return true;
    });
  }, [boxCollections, filterBoxId, filterYear, filterDateFrom, filterDateTo, historySearch, donationBoxes]);

  // Filtered box collections total amount
  const filteredCollectionsTotal = useMemo(() => {
    return filteredBoxCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [filteredBoxCollections]);

  // Handlers
  const handleDonationSubmit = async (e?: React.FormEvent, submitMode: 'SAVE_AND_PRINT' | 'SAVE_ONLY' = 'SAVE_AND_PRINT') => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');
    const num = Number(amount);
    if (!num || num <= 0) {
      setErrorMessage(t.amountMustBePositive);
      return;
    }

    if (donationDenominationData && donationDenominationData.grandTotal !== num) {
      setErrorMessage(`ভাংতি গণনা অনুযায়ী মোট টাকা (৳${donationDenominationData.grandTotal.toLocaleString('en-IN')}) এবং ইনপুটকৃত টাকার পরিমাণ (৳${num.toLocaleString('en-IN')}) সমান হতে হবে।`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        donorName: isAnonymous ? 'আল্লাহর এক বান্দা (Anonymous)' : donorName,
        donorPhone,
        donorAddress,
        isAnonymous,
        category,
        amount: num,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        reference,
        date: donationDate,
      };
      if (paymentMethod === 'CASH' && donationDenominationData && donationDenominationData.grandTotal === num) {
        payload.denominationData = donationDenominationData;
      }
      const created = await onAddDonation(payload);
      setIsDonationModalOpen(false);
      setDonationDenominationData(null);
      if (created && submitMode === 'SAVE_AND_PRINT') {
        onPrintReceipt(created, 'POS_80', false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBoxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(boxAmount);
    if (!num || num <= 0) {
      alert(t.amountMustBePositive);
      return;
    }

    if (boxDenominationData && boxDenominationData.grandTotal !== num) {
      alert(`ভাংতি গণনা অনুযায়ী মোট টাকা (৳${boxDenominationData.grandTotal.toLocaleString('en-IN')}) এবং বক্সের টাকার পরিমাণ (৳${num.toLocaleString('en-IN')}) সমান হতে হবে।`);
      return;
    }

    setIsCollectingBox(true);
    try {
      const payload: any = {
        boxId: selectedBoxId || donationBoxes[0]?.id,
        amount: num,
        countingTeam: countingTeam.split(',').map((s) => s.trim()).filter(Boolean),
        witnesses: witnesses.split(',').map((s) => s.trim()).filter(Boolean),
        depositAccountId: boxDepositAccountId || accounts[0]?.id,
        collectionDate: boxCollectionDate,
        notes: boxNotes,
      };
      if (boxDenominationData && boxDenominationData.grandTotal === num) {
        payload.denominationData = boxDenominationData;
      }
      await onCollectBox(payload);
      setIsBoxModalOpen(false);
      setBoxAmount('');
      setBoxNotes('');
      setBoxDenominationData(null);
    } catch (err: any) {
      alert(err.message || 'কালেকশন সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsCollectingBox(false);
    }
  };

  const handleJumaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(jumaAmount);
    if (!num || num <= 0) {
      alert(t.amountMustBePositive);
      return;
    }

    if (jumaDenominationData && jumaDenominationData.grandTotal !== num) {
      alert(`ভাংতি গণনা অনুযায়ী মোট টাকা (৳${jumaDenominationData.grandTotal.toLocaleString('en-IN')}) এবং জুমার টাকার পরিমাণ (৳${num.toLocaleString('en-IN')}) সমান হতে হবে।`);
      return;
    }

    try {
      const payload: any = {
        donorName: 'পবিত্র জুমার জামাত ও মুসল্লিগণ',
        donorPhone: '',
        isAnonymous: false,
        category: 'GENERAL',
        amount: num,
        paymentMethod: 'CASH',
        accountId: jumaAccount || accounts[0]?.id,
        reference: `জুমার কালেকশন - ${jumaDate}`,
        date: jumaDate,
        countingTeam: jumaTeam ? jumaTeam.split(',').map((s) => s.trim()) : undefined,
        witness: jumaWitness || undefined,
        description: `${jumaNotes || 'পবিত্র জুমার সাধারণ কালেকশন'}${jumaTeam ? `. গণনা টিম: ${jumaTeam}` : ''}${jumaWitness ? `. সাক্ষী: ${jumaWitness}` : ''}`,
      };
      if (jumaDenominationData && jumaDenominationData.grandTotal === num) {
        payload.denominationData = jumaDenominationData;
      }
      await onAddDonation(payload);
      setIsJumaModalOpen(false);
      setJumaAmount('');
      setJumaTeam('');
      setJumaWitness('');
      setJumaDenominationData(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Donation Box Master Handler
  const handleAddBoxMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBoxError('');
    if (!newBoxCode.trim()) {
      setAddBoxError('অটো বা কাস্টম সিরিয়াল নম্বর আবশ্যক।');
      return;
    }

    if (saveBoxHandler) {
      setIsAddingBox(true);
      try {
        let finalLastCollectedDate: string | undefined = undefined;
        if (newLastOpeningOption === 'PREVIOUS' && newLastCollectedDate) {
          finalLastCollectedDate = newLastCollectedDate;
        } else if (newLastOpeningOption === 'TODAY') {
          finalLastCollectedDate = new Date().toISOString().split('T')[0];
        }

        await saveBoxHandler({
          boxCode: newBoxCode.trim(),
          manualName: newManualName.trim() || newShopName.trim() || newLocation.trim(),
          location: newLocation.trim() || newShopName.trim() || 'প্রধান ফটক',
          shopName: newShopName.trim(),
          ownerName: newOwnerName.trim(),
          ownerPhone: newOwnerPhone.trim(),
          address: newAddress.trim(),
          status: newStatus,
          responsiblePerson: newResponsiblePerson.trim(),
          notes: newNotes.trim(),
          description: newNotes.trim(),
          lastCollectedDate: finalLastCollectedDate,
          installationDate: newInstallationDate || undefined,
          createdAt: newInstallationDate ? new Date(newInstallationDate).toISOString() : new Date().toISOString(),
        });
        setIsAddBoxModalOpen(false);
      } catch (err: any) {
        setAddBoxError(err.message || 'দানবাক্স যুক্ত করতে সমস্যা হয়েছে।');
      } finally {
        setIsAddingBox(false);
      }
    }
  };

  const handleApplyCalculatedTotal = (calculatedTotal: number, denominationData?: CashDenominationData) => {
    if (calculatorTarget === 'DONATION') {
      setAmount(calculatedTotal.toString());
      if (denominationData) setDonationDenominationData(denominationData);
    } else if (calculatorTarget === 'BOX') {
      setBoxAmount(calculatedTotal.toString());
      if (denominationData) setBoxDenominationData(denominationData);
    } else if (calculatorTarget === 'JUMA') {
      setJumaAmount(calculatedTotal.toString());
      if (denominationData) setJumaDenominationData(denominationData);
    }
  };

  const handleSaveUpdatedDenomination = async (updatedData: CashDenominationData, editReason: string) => {
    if (!activeDenominationRecordId) return;
    try {
      if (activeDenominationSource === 'DONATION') {
        await api.updateDonationDenomination(activeDenominationRecordId, updatedData, editReason);
      } else if (activeDenominationSource === 'DONATION_BOX') {
        await api.updateDonationBoxCollectionDenomination(activeDenominationRecordId, updatedData, editReason);
      }
      setActiveDenominationDetail(updatedData);
      alert('ভাংতি ও ক্যাশ নোট গণনা বিবরণী সফলভাবে হালনাগাদ ও অডিট লগ সংরক্ষণ করা হয়েছে।');
    } catch (err: any) {
      alert(err.message || 'ডিনোমিনেশন হালনাগাদ করতে ব্যর্থ হয়েছে।');
      throw err;
    }
  };

  const filteredDonations = donations.filter((d) => {
    return (
      d.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.donorPhone && d.donorPhone.includes(searchQuery))
    );
  });

  const rawJumaDonations = useMemo(() => {
    return donations.filter(
      (d) =>
        d.donorName.includes('জুমা') ||
        (d.reference && d.reference.includes('জুমা')) ||
        (d.description && d.description.includes('জুমা'))
    );
  }, [donations]);

  const filteredJumaDonations = useMemo(() => {
    return rawJumaDonations.filter((jd) => {
      if (jumaFilterDateFrom && jd.date < jumaFilterDateFrom) return false;
      if (jumaFilterDateTo && jd.date > jumaFilterDateTo) return false;
      if (jumaSearch.trim()) {
        const q = jumaSearch.toLowerCase();
        const rec = (jd.receiptNumber || '').toLowerCase();
        const name = (jd.donorName || '').toLowerCase();
        const desc = (jd.description || '').toLowerCase();
        const ref = (jd.reference || '').toLowerCase();
        const acc = (jd.accountName || '').toLowerCase();
        return rec.includes(q) || name.includes(q) || desc.includes(q) || ref.includes(q) || acc.includes(q);
      }
      return true;
    });
  }, [rawJumaDonations, jumaFilterDateFrom, jumaFilterDateTo, jumaSearch]);

  const jumaDonations = filteredJumaDonations;
  const filteredJumaTotal = useMemo(() => {
    return filteredJumaDonations.reduce((s, d) => s + (d.amount || 0), 0);
  }, [filteredJumaDonations]);

  const isAnyPrintModalOpen = isPrintReportOpen || isPrintBoxListOpen || isPrintJumaReportOpen;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Main Interactive Screen Content (Hidden in Print Mode when any Print Modal is open) */}
      <div className={isAnyPrintModalOpen ? 'space-y-5 print:hidden' : 'space-y-5'}>
      {/* Top Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('donations')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'donations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>সাধারণ ও প্রকল্প অনুদান</span>
            <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {donations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('boxes')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'boxes'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>দানবাক্স ব্যবস্থাপনা ও কালেকশন</span>
            <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {donationBoxes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('juma')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'juma'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>জুমার দিনের কালেকশন</span>
            <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {jumaDonations.length}
            </span>
          </button>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {activeSubTab === 'donations' && (
            <button
              onClick={() => {
                setDonorName('');
                setDonorPhone('');
                setDonorAddress('');
                setIsAnonymous(false);
                setCategory('GENERAL');
                setAmount('');
                setReference('');
                setErrorMessage('');
                setIsDonationModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন অনুদান গ্রহণ</span>
            </button>
          )}

          {activeSubTab === 'boxes' && (
            <>
              <button
                type="button"
                onClick={handleOpenAddBoxModal}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                title="নতুন দানবাক্স নিবন্ধন ও মাস্টার তথ্য তৈরি"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>দানবক্স এড করুন</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedBoxId(donationBoxes[0]?.id || '');
                  setBoxAmount('');
                  setBoxNotes('');
                  setIsBoxModalOpen(true);
                }}
                className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>দানবাক্স কালেকশন ও টাকা জমা</span>
              </button>
            </>
          )}

          {activeSubTab === 'juma' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsPrintJumaReportOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                title="জুমার কালেকশন রেজিস্টার ও অনুমোদন কপি প্রিন্ট করুন"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>রিপোর্ট প্রিন্ট</span>
              </button>

              <button
                onClick={() => setIsJumaModalOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>জুমার কালেকশন এন্ট্রি</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- 1. DONATIONS TAB ---------------- */}
      {activeSubTab === 'donations' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="রসিদ নং, দাতার নাম বা মোবাইল নম্বর..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-600 font-mono">
              মোট অনুদান সংগৃহীত:{' '}
              <strong className="text-blue-700 text-sm font-bold">
                ৳ {donations.reduce((s, d) => s + d.amount, 0).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">রসিদ নম্বর</th>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4">দানকারীর নাম ও ঠিকানা</th>
                    <th className="py-3 px-4">দানের খাত</th>
                    <th className="py-3 px-4">জমার মাধ্যম / হিসাব</th>
                    <th className="py-3 px-4 text-right">টাকা (৳)</th>
                    <th className="py-3 px-4 text-center">ডিজিটাল ও প্রিন্ট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        কোনো অনুদান রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((don) => (
                      <tr key={don.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-xs">
                          {don.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{formatDate(don.date)}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {don.isAnonymous ? 'আল্লাহর এক বান্দা (Anonymous)' : don.donorName}
                          </div>
                          {don.donorPhone && (
                            <div className="text-[11px] font-mono text-slate-500">{don.donorPhone}</div>
                          )}
                          {don.donorAddress && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {don.donorAddress}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200">
                            {don.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{don.accountName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{don.paymentMethod}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          + ৳ {don.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* POS Thermal Receipt */}
                            <button
                              id={`btn-pos-receipt-${don.id}`}
                              onClick={() => onPrintReceipt(don, 'POS_80', true)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="POS থার্মাল রসিদ প্রিন্ট করুন (80mm/58mm)"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[11px]">POS</span>
                            </button>

                            {/* Official A4 Receipt */}
                            <button
                              id={`btn-a4-receipt-${don.id}`}
                              onClick={() => onPrintReceipt(don, 'A4', true)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="অফিসিয়াল A4 রসিদ প্রিন্ট করুন"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-[11px]">A4</span>
                            </button>

                            {don.denominationData && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDenominationDetail(don.denominationData || null);
                                  setActiveDenominationRef(don.receiptNumber);
                                  setActiveDenominationSource('DONATION');
                                  setActiveDenominationRecordId(don.id);
                                  setIsDenominationDetailOpen(true);
                                }}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-emerald-200 transition-colors cursor-pointer"
                                title="নোট ও কয়েন (ভাংতি) গণনা বিবরণী স্লিপ দেখুন"
                              >
                                <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                                <span className="text-[11px]">কাউন্টিং</span>
                              </button>
                            )}

                            {onSendSms && don.donorPhone && (
                              <button
                                onClick={() => setSmsTarget(don)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                title="দাতার মোবাইলে রসিদ এসএমএস পাঠান"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[11px]">SMS</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 2. DONATION BOXES TAB ---------------- */}
      {activeSubTab === 'boxes' && (
        <div className="space-y-6">
          {/* Top Summary Info Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-teal-700 border border-teal-100">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">নিবন্ধিত মোট দানবাক্স</div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {donationBoxes.length} <span className="text-xs font-bold text-slate-500">টি</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">সক্রিয় দানবাক্স</div>
                <div className="text-xl font-black text-emerald-700 font-mono">
                  {donationBoxes.filter((b) => b.status === 'ACTIVE').length}{' '}
                  <span className="text-xs font-bold text-slate-500">টি</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700 border border-blue-100">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">মোট কালেকশন ইভেন্ট</div>
                <div className="text-xl font-black text-blue-700 font-mono">
                  {boxCollections.length} <span className="text-xs font-bold text-slate-500">বার</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 border border-amber-100">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">সর্বমোট সংগৃহীত টাকা</div>
                <div className="text-xl font-black text-amber-700 font-mono">
                  ৳ {donationBoxes.reduce((s, b) => s + (b.totalCollected || 0), 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Master Boxes Cards Grid */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Store className="w-4 h-4 text-teal-700" />
                  <span>দানবাক্সসমূহের তালিকা ও খোলার সময়কাল (Donation Boxes Status)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  প্রতিটি দানবাক্সের অবস্থান, দোকানের বিবরণ ও সর্বশেষ খোলার পর অতিক্রান্ত সময়
                </p>
              </div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <button
                  type="button"
                  id="btn-open-donation-box-quick-report"
                  onClick={() => {
                    setSelectedReportBoxId('ALL');
                    setIsQuickBoxReportOpen(true);
                  }}
                  className="text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="দানবাক্স কালেকশন রিপোর্ট ফিল্টার ও A4 প্রিন্ট করুন"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-700" />
                  <span>🖨️ কালেকশন রিপোর্ট / প্রিন্ট</span>
                </button>
                <button
                  type="button"
                  id="btn-open-donation-box-list-print"
                  onClick={() => setIsPrintBoxListOpen(true)}
                  className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="দানবাক্সসমূহের পূর্ণাঙ্গ মাস্টার তালিকা ও বিবরণী প্রিন্ট করুন"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>দান বাক্স তালিকা প্রিন্ট</span>
                </button>
                <button
                  type="button"
                  id="btn-add-new-donation-box"
                  onClick={handleOpenAddBoxModal}
                  className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>দানবক্স এড করুন</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {donationBoxes.map((box) => {
                const duration = getDurationSinceLastOpened(box.lastCollectedDate, box.createdAt);
                return (
                  <div
                    key={box.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3.5 hover:border-teal-400 hover:shadow-md transition-all relative overflow-hidden"
                  >
                    {/* Top Header Badge */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-black text-teal-900 bg-teal-100/70 px-2.5 py-0.5 rounded-lg border border-teal-200">
                            {box.boxCode}
                          </span>
                          {box.manualName && box.manualName !== box.boxCode && (
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                              {box.manualName}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            box.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {box.status === 'ACTIVE' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
                        </span>
                      </div>

                      {/* Shop Name & Location */}
                      <div className="mt-2.5 space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                          <Store className="w-4 h-4 text-teal-700 shrink-0" />
                          <span>{box.shopName || box.location || 'সাধারণ উন্মুক্ত বাক্স'}</span>
                        </h3>

                        {box.location && box.location !== box.shopName && (
                          <p className="text-xs text-slate-600 flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>স্থান: {box.location}</span>
                          </p>
                        )}

                        {box.ownerName && (
                          <p className="text-xs text-slate-600 flex items-center space-x-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              মালিক: <strong className="text-slate-800">{box.ownerName}</strong>
                            </span>
                          </p>
                        )}

                        {box.ownerPhone && (
                          <p className="text-xs text-slate-600 flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono">{box.ownerPhone}</span>
                          </p>
                        )}

                        {box.address && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            ঠিকানা: {box.address}
                          </p>
                        )}
                      </div>

                      {/* Duration / Last Collection Tracker Badge */}
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>সর্বশেষ খোলার তথ্য:</span>
                          </span>
                          <span className="font-mono text-slate-700 font-bold">
                            {box.lastCollectedDate ? formatDate(box.lastCollectedDate) : 'কখনো খোলা হয়নি'}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-teal-900 bg-teal-50/80 px-2 py-0.5 rounded-md border border-teal-100 flex items-center space-x-1">
                          <span>⏱️</span>
                          <span className="truncate">{duration.text}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Stats & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">মোট সংগৃহীত</span>
                        <span className="text-base font-black text-teal-800 font-mono">
                          ৳ {(box.totalCollected || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBoxId(box.id);
                            setBoxAmount('');
                            setBoxNotes('');
                            setIsBoxModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                          title="এই বাক্সটি খুলুন এবং টাকা গণনা করে জমা দিন"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>কালেকশন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReportBoxId(box.id);
                            setIsQuickBoxReportOpen(true);
                          }}
                          title="এই দানবাক্সের কালেকশন রিপোর্ট প্রিন্ট করুন"
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-amber-700" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrTargetBox(box)}
                          title="দানবাক্স QR কোড স্টিকার"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4 text-slate-700" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBox(box)}
                          title="দানবাক্স তথ্য সংশোধন"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 text-slate-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collection History Table & Report Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header with Title and Print Report Button */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-teal-300" />
                  <h3 className="text-base font-bold text-white">
                    দানবাক্স গণনা ও জমাকৃত কালেকশন রেজিস্টার (Donation Box Register)
                  </h3>
                </div>
                <p className="text-xs text-teal-100/80 mt-0.5">
                  তারিখভিত্তিক সকল দানবাক্স খোলার খতিয়ান, গণনা টিম, সাক্ষী ও জমাকৃত ফান্ড
                </p>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                <button
                  type="button"
                  id="btn-open-register-collection-report"
                  onClick={() => {
                    setSelectedReportBoxId(filterBoxId || 'ALL');
                    setIsQuickBoxReportOpen(true);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>🖨️ কালেকশন রিপোর্ট / প্রিন্ট (A4)</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="কোড, দোকান, টিম বা ভাউচার নং..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Filter Box */}
              <div>
                <select
                  value={filterBoxId}
                  onChange={(e) => setFilterBoxId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">📦 সকল দানবাক্স</option>
                  {donationBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.boxCode} - {b.shopName || b.manualName || b.location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Year */}
              <div>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">📅 সকল অর্থবছর</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} খ্রিঃ
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range: From */}
              <div>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  placeholder="হতে তারিখ"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                  title="হতে তারিখ"
                />
              </div>

              {/* Date Range: To & Reset */}
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  placeholder="পর্যন্ত তারিখ"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                  title="পর্যন্ত তারিখ"
                />
                {(filterBoxId !== 'ALL' || filterYear !== 'ALL' || filterDateFrom || filterDateTo || historySearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterBoxId('ALL');
                      setFilterYear('ALL');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                      setHistorySearch('');
                    }}
                    className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="ফিল্টার রিসেট করুন"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Results Counter & Totals */}
            <div className="px-4 py-2 bg-teal-50/50 border-b border-teal-100 flex flex-col sm:flex-row items-center justify-between text-xs text-teal-950 gap-2">
              <div>
                ফিল্টারকৃত রেকর্ড:{' '}
                <strong className="font-mono text-teal-900 font-bold">{filteredBoxCollections.length}</strong> টি
              </div>
              <div className="font-mono">
                ফিল্টারকৃত মোট আদায়:{' '}
                <strong className="text-sm font-bold text-teal-800">
                  ৳ {filteredCollectionsTotal.toLocaleString('en-IN')}
                </strong>{' '}
                <span className="text-[11px] text-teal-700 font-normal">
                  ({numberToBanglaWords(filteredCollectionsTotal)})
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ক্রমিক / তারিখ</th>
                    <th className="py-3 px-4">দানবাক্স ও অবস্থান</th>
                    <th className="py-3 px-4">ভাউচার / রেফারেন্স</th>
                    <th className="py-3 px-4">গণনা টিম ও সদস্যগণ</th>
                    <th className="py-3 px-4">উপস্থিত সাক্ষীগণ</th>
                    <th className="py-3 px-4">জমার ফান্ড/অ্যাকাউন্ট</th>
                    <th className="py-3 px-4 text-right">আদায়কৃত টাকা (৳)</th>
                    <th className="py-3 px-4 text-center">কাউন্টিং স্লিপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBoxCollections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        কোনো কালেকশন এন্ট্রি পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredBoxCollections.map((col, idx) => {
                      const matchedBox = donationBoxes.find((b) => b.id === col.boxId);
                      return (
                        <tr key={col.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-900">#{idx + 1}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {formatDate(col.collectionDate)}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold font-mono text-teal-800 text-xs flex items-center space-x-1">
                              <span>{col.boxCode}</span>
                              {matchedBox?.manualName && (
                                <span className="text-[11px] font-normal text-slate-600">
                                  ({matchedBox.manualName})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {matchedBox?.shopName || matchedBox?.location || '-'}
                            </div>
                            {matchedBox?.ownerName && (
                              <div className="text-[10px] text-slate-400">
                                মালিক: {matchedBox.ownerName}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                            <div>{col.incomeVoucherNumber || col.depositReference || '-'}</div>
                            {col.notes && <div className="text-[10px] text-slate-500">{col.notes}</div>}
                          </td>

                          <td className="py-3.5 px-4 text-slate-800">
                            {Array.isArray(col.countingTeam)
                              ? col.countingTeam.join(', ')
                              : (col.countingTeam as any)}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {Array.isArray(col.witnesses)
                              ? col.witnesses.join(', ')
                              : (col.witnesses as any)}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">{col.depositAccountName}</span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800 text-sm">
                            ৳ {col.amount.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {col.denominationData ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDenominationDetail(col.denominationData || null);
                                  setActiveDenominationRef(
                                    col.incomeVoucherNumber ||
                                      col.depositReference ||
                                      (matchedBox ? matchedBox.boxCode : 'দানবাক্স কালেকশন')
                                  );
                                  setActiveDenominationSource('DONATION_BOX');
                                  setActiveDenominationRecordId(col.id);
                                  setIsDenominationDetailOpen(true);
                                }}
                                className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold border border-teal-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                                title="নোট ও কয়েন (ভাংতি) গণনা বিবরণী স্লিপ দেখুন"
                              >
                                <Banknote className="w-3.5 h-3.5 text-teal-700" />
                                <span>স্লিপ</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredBoxCollections.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="py-3.5 px-4 text-right text-slate-800 text-xs">
                        সর্বমোট আদায়কৃত টাকা:
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-900 text-base">
                        ৳ {filteredCollectionsTotal.toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. JUMA COLLECTIONS TAB ---------------- */}
      {activeSubTab === 'juma' && (
        <div className="space-y-4">
          {/* Juma Top Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                পবিত্র জুমার জামাত কালেকশন রেজিস্টার
              </h3>
              <p className="text-xs text-slate-500">
                প্রতি শুক্রবার জুমার নামাজে মুসল্লিদের দানকৃত টাকার হিসাব ও জামাতের বিবরণ
              </p>
            </div>
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <div className="text-xs font-mono text-slate-700 bg-emerald-50/80 border border-emerald-200 px-3.5 py-1.5 rounded-xl flex items-center space-x-2 shadow-2xs">
                <span>
                  জুমার সর্বমোট আদায়:{' '}
                  <strong className="text-emerald-800 text-sm font-bold">
                    ৳ {filteredJumaTotal.toLocaleString('en-IN')}
                  </strong>
                </span>
                <span className="text-emerald-300 font-normal">|</span>
                <span>
                  মোট জুমা:{' '}
                  <strong className="text-emerald-800 text-sm font-bold">
                    {filteredJumaDonations.length}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintJumaReportOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                title="জুমার কালেকশন রেজিস্টার প্রতিবেদন প্রিন্ট করুন"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>রিপোর্ট প্রিন্ট</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="রসিদ নং, বিবরণ, গণনা টিম বা হিসাব..."
                value={jumaSearch}
                onChange={(e) => setJumaSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Date Range: From */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">হতে:</span>
              <input
                type="date"
                value={jumaFilterDateFrom}
                onChange={(e) => setJumaFilterDateFrom(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Date Range: To */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">পর্যন্ত:</span>
              <input
                type="date"
                value={jumaFilterDateTo}
                onChange={(e) => setJumaFilterDateTo(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Clear Filter Button */}
            {(jumaSearch || jumaFilterDateFrom || jumaFilterDateTo) && (
              <button
                type="button"
                onClick={() => {
                  setJumaSearch('');
                  setJumaFilterDateFrom('');
                  setJumaFilterDateTo('');
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                রিসেট
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-emerald-900 text-white font-bold border-b border-emerald-950">
                  <tr>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4">রসিদ / রেফারেন্স</th>
                    <th className="py-3 px-4">বিবরণ ও গণনা টিম</th>
                    <th className="py-3 px-4">জমাকৃত অ্যাকাউন্ট</th>
                    <th className="py-3 px-4 text-right">আদায়কৃত টাকা (৳)</th>
                    <th className="py-3 px-4 text-center">মানি রসিদ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jumaDonations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        কোনো জুমার কালেকশন এন্ট্রি নেই।
                      </td>
                    </tr>
                  ) : (
                    jumaDonations.map((jd) => {
                      const jumaInfo = getJumaDisplayDetails(jd, language);
                      return (
                        <tr key={jd.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {formatDate(jd.date)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-emerald-800 font-bold">
                            {jd.receiptNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 text-xs">{jumaInfo.title}</div>
                              <div className="text-[11px] text-slate-700">
                                <span className="font-semibold text-slate-800">গণনা টিম: </span>
                                <span>{jumaInfo.countingTeam}</span>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                <span className="font-semibold text-slate-800">সাক্ষী: </span>
                                <span>{jumaInfo.witness}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">{jd.accountName}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                            ৳ {jd.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => onPrintReceipt(jd, 'POS_80', true)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-colors flex items-center space-x-1 cursor-pointer"
                              title="POS থার্মাল রসিদ"
                            >
                              <Receipt className="w-3 h-3 text-emerald-600" />
                              <span>POS</span>
                            </button>
                            <button
                              onClick={() => onPrintReceipt(jd, 'A4', true)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-colors flex items-center space-x-1 cursor-pointer"
                              title="A4 অফিসিয়াল রসিদ"
                            >
                              <Printer className="w-3 h-3 text-slate-600" />
                              <span>A4</span>
                            </button>
                            {jd.denominationData && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDenominationDetail(jd.denominationData || null);
                                  setActiveDenominationRef(jd.receiptNumber || 'জুমার কালেকশন');
                                  setActiveDenominationSource('DONATION');
                                  setActiveDenominationRecordId(jd.id);
                                  setIsDenominationDetailOpen(true);
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 transition-colors flex items-center space-x-1 cursor-pointer"
                                title="জুমার ভাংতি ও ক্যাশ নোট গণনা স্লিপ দেখুন"
                              >
                                <Banknote className="w-3.5 h-3.5 text-amber-700" />
                                <span>কাউন্টিং</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
                {jumaDonations.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-right text-slate-800 text-xs">
                        জুমার মোট আদায়কৃত টাকা:
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-900 text-base">
                        ৳ {filteredJumaTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-xs text-slate-700">
                        মোট জুমা: {filteredJumaDonations.length}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ---------------- NEW DONATION MODAL ---------------- */}
      {isDonationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HeartHandshake className="w-5 h-5" />
                <h3 className="font-bold text-base">নতুন অনুদান গ্রহণ ও মানি রসিদ</h3>
              </div>
              <button
                onClick={() => setIsDonationModalOpen(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDonationSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">গোপন/বেনামী দান (Anonymous Donor)</span>
                  <p className="text-[11px] text-slate-500">নাম প্রকাশে অনিচ্ছুক হলে এটি টিক দিন</p>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">দাতার পূর্ণ নাম *</label>
                    <input
                      type="text"
                      placeholder="e.g. আলহাজ্ব মোঃ কায়েস"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required={!isAnonymous}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Amount with Calculator Trigger */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">টাকার পরিমাণ (৳) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTarget('DONATION');
                      setIsCalculatorOpen(true);
                    }}
                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="ভাংতি টাকা ও ক্যাশ নোট গণনা"
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                    <span>ভাংতি টাকা গণনা</span>
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {donationDenominationData && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center space-x-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span>ক্যাশ নোট ও ভাংতি গণনা সংযুক্ত</span>
                        <div className="text-[11px] font-mono text-emerald-700">
                          {donationDenominationData.totalNotesCount} নোট, {donationDenominationData.totalCoinsCount} কয়েন = ৳{donationDenominationData.grandTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCalculatorTarget('DONATION');
                          setIsCalculatorOpen(true);
                        }}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        পুনঃগণনা
                      </button>
                      <button
                        type="button"
                        onClick={() => setDonationDenominationData(null)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="বাতিল করুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">দানের খাত *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="GENERAL">সাধারণ দান (General)</option>
                    <option value="CONSTRUCTION">মসজিদ নির্মাণ ও সংস্কার তহবিল</option>
                    <option value="WAQF">ওয়াকফ দান (Waqf)</option>
                    <option value="CEMETERY">কবরস্থান উন্নয়ন</option>
                    <option value="WUDU_KHANA">অজু খানা ও ওয়াশ ব্লক</option>
                    <option value="MADRASA">মক্তব ও কোরআন শিক্ষা</option>
                    <option value="SPECIAL_PROJECT">বিশেষ প্রকল্প</option>
                    <option value="OTHER">অন্যান্য শুভ অনুদান</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Payment Method & Deposit Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="CASH">ক্যাশ / নগদ</option>
                    <option value="BANK">ব্যাংক ডিপোজিট / চেক</option>
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="ROCKET">রকেট (Rocket)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জমার হিসাব</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">রেফারেন্স / স্লিপ / TRX</label>
                <input
                  type="text"
                  placeholder="e.g. TRX-987654 / চেক নং"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDonationModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  id="btn-donation-save-only"
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleDonationSubmit(e, 'SAVE_ONLY')}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'শুধু সংরক্ষণ'}
                </button>
                <button
                  id="btn-donation-save-print"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'প্রক্রিয়াধীন...' : 'সংরক্ষণ ও প্রিন্ট (POS)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 1. "দানবক্স এড করুন" (ADD DONATION BOX MODAL) ---------------- */}
      {isAddBoxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">দানবক্স এড করুন / নতুন দানবাক্স নিবন্ধন</h3>
                  <p className="text-[11px] text-slate-300">দানবাক্সের সিরিয়াল, নাম, দোকানদার ও অবস্থান বিবরণী</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBoxModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBoxMaster} className="p-5 overflow-y-auto space-y-4 flex-1">
              {addBoxError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{addBoxError}</span>
                </div>
              )}

              {/* Section 1: দান বাক্স তথ্য */}
              <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-200/80 space-y-3">
                <div className="text-xs font-bold text-teal-900 flex items-center space-x-1.5 border-b border-teal-200/60 pb-1.5">
                  <Tag className="w-4 h-4 text-teal-700" />
                  <span>দান বাক্স তথ্য:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ১) অটো সিরিয়াল নাম্বার <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newBoxCode}
                      onChange={(e) => setNewBoxCode(e.target.value)}
                      placeholder="e.g. BOX-003"
                      required
                      className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs font-bold font-mono text-teal-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-teal-700 mt-0.5 block">
                      অটো নির্ধারিত (প্রয়োজনে পরিবর্তন করা যাবে)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ২) ম্যানুয়াল নাম লিখার ঘর
                    </label>
                    <input
                      type="text"
                      value={newManualName}
                      onChange={(e) => setNewManualName(e.target.value)}
                      placeholder="যেমন: উত্তর ফটক বক্স / সেন্ট্রাল বাজার বক্স"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: দানবাক্সের অবস্থান তথ্য */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5 border-b border-slate-200 pb-1.5">
                  <Store className="w-4 h-4 text-teal-700" />
                  <span>দানবাক্সের অবস্থান তথ্য:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ৩) দোকানের নাম
                    </label>
                    <input
                      type="text"
                      value={newShopName}
                      onChange={(e) => setNewShopName(e.target.value)}
                      placeholder="যেমন: বিসমিল্লাহ স্টোর / মদিনা ফার্মেসী"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ৪) মালিকের নাম
                    </label>
                    <input
                      type="text"
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="যেমন: মোঃ কামরুল হাসান"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ৫) মোবাইল নং
                    </label>
                    <input
                      type="tel"
                      value={newOwnerPhone}
                      onChange={(e) => setNewOwnerPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ৭) এক্টিভ কি না (Active Status) *
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="ACTIVE">✅ সক্রিয় (Active)</option>
                      <option value="INACTIVE">⛔ নিষ্ক্রিয় (Inactive)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ৬) পূর্ণ ঠিকানা
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="যেমন: দোকান নং ১২, নিচতলা, সেন্ট্রাল মসজিদ মার্কেট, রোড #২"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Section 3: সর্বশেষ খোলার তথ্য ও তারিখ */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="text-xs font-bold text-amber-900 flex items-center justify-between border-b border-amber-200/80 pb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <span>সর্বশেষ খোলার তথ্য ও তারিখ (Opening History):</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label
                      className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        newLastOpeningOption === 'NEVER'
                          ? 'bg-white border-amber-500 ring-2 ring-amber-400/30'
                          : 'bg-amber-50/50 border-amber-200 hover:bg-white/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="addBoxLastOpenOption"
                        checked={newLastOpeningOption === 'NEVER'}
                        onChange={() => {
                          setNewLastOpeningOption('NEVER');
                          setNewLastCollectedDate('');
                        }}
                        className="mt-0.5 text-amber-700 focus:ring-amber-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">কখনো খোলা হয়নি</span>
                        <span className="text-[11px] text-slate-600">আজই স্থাপন করা হয়েছে বা নতুন দানবাক্স</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        newLastOpeningOption === 'PREVIOUS'
                          ? 'bg-white border-amber-500 ring-2 ring-amber-400/30'
                          : 'bg-amber-50/50 border-amber-200 hover:bg-white/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="addBoxLastOpenOption"
                        checked={newLastOpeningOption === 'PREVIOUS'}
                        onChange={() => {
                          setNewLastOpeningOption('PREVIOUS');
                          if (!newLastCollectedDate) {
                            setNewLastCollectedDate(new Date().toISOString().split('T')[0]);
                          }
                        }}
                        className="mt-0.5 text-amber-700 focus:ring-amber-500"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">পূর্বে খোলা হয়েছিল</span>
                        <span className="text-[11px] text-slate-600">সফ্টওয়্যার ব্যবহারের পূর্বে খোলা হয়েছিল</span>
                      </div>
                    </label>
                  </div>

                  {newLastOpeningOption === 'PREVIOUS' && (
                    <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-2 animate-in fade-in duration-150">
                      <label className="block text-xs font-bold text-slate-900">
                        সর্বশেষ খোলার তারিখ (তারিখ পিকার থেকে সিলেক্ট করুন) *
                      </label>
                      <input
                        type="date"
                        value={newLastCollectedDate}
                        onChange={(e) => setNewLastCollectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                      {newLastCollectedDate && (
                        <div className="text-[11px] text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>
                            গণনা অনুযায়ী:{' '}
                            <strong>{getDurationSinceLastOpened(newLastCollectedDate, undefined).text}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Installation Date Picker */}
                  <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        স্থাপনের তারিখ (Installation Date)
                      </label>
                      <input
                        type="date"
                        value={newInstallationDate}
                        onChange={(e) => setNewInstallationDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Optional Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সাধারণ অবস্থান / চত্বর
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="যেমন: প্রধান ফটক / বাজার কর্নার"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    দায়িত্বপ্রাপ্ত প্রতিনিধি
                  </label>
                  <input
                    type="text"
                    value={newResponsiblePerson}
                    onChange={(e) => setNewResponsiblePerson(e.target.value)}
                    placeholder="যেমন: কালেকশন কমিটির দায়িত্বপ্রাপ্ত সদস্য"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddBoxModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isAddingBox}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isAddingBox ? 'সংরক্ষণ হচ্ছে...' : 'দানবাক্স সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 2. "দানবাক্স কালেকশন ও টাকা জমা" (BOX COLLECTION MODAL WITH AUTO-POPULATION) ---------------- */}
      {isBoxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-5 space-y-4 flex flex-col max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-teal-800">
                <Box className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">দানবাক্স কালেকশন ও টাকা জমা</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBoxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBoxSubmit} className="space-y-4">
              {/* Dropdown to select Box */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  দানবাক্স নির্বাচন করুন *
                </label>
                <select
                  value={selectedBoxId}
                  onChange={(e) => setSelectedBoxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-teal-50/70 border-2 border-teal-300 rounded-xl text-teal-950 font-bold focus:bg-white outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  {donationBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.boxCode} — {b.shopName || b.manualName || b.location}{' '}
                      {b.ownerName ? `(মালিক: ${b.ownerName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated Box Details Card */}
              {activeSelectedBox && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Store className="w-4 h-4 text-teal-700" />
                      <span>{activeSelectedBox.shopName || activeSelectedBox.location || 'সাধারণ বক্স'}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        activeSelectedBox.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {activeSelectedBox.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">মালিকের নাম:</span>
                      <strong className="text-slate-800">
                        {activeSelectedBox.ownerName || 'প্রযোজ্য নয় / মসজিদ'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">মোবাইল নম্বর:</span>
                      <strong className="text-slate-800 font-mono">
                        {activeSelectedBox.ownerPhone || 'দেওয়া নেই'}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">পূর্ণ ঠিকানা ও অবস্থান:</span>
                    <span className="text-slate-700 font-medium">
                      {activeSelectedBox.address || activeSelectedBox.location || 'মসজিদ চত্বর'}
                    </span>
                  </div>

                  {/* Duration Tracking Display */}
                  {selectedBoxDuration && (
                    <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-amber-950 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-semibold">
                        <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>কত দিন/সময় পর খোলা হচ্ছে:</span>
                      </div>
                      <div className="font-bold text-amber-900 font-mono bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
                        {selectedBoxDuration.text}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>পূর্বে সংগৃহীত মোট দান:</span>
                    <strong className="text-teal-800 font-mono text-xs">
                      ৳ {(activeSelectedBox.totalCollected || 0).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              )}

              {/* Amount with Change Calculator Trigger */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    গণনাকৃত মোট টাকা (৳) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTarget('BOX');
                      setIsCalculatorOpen(true);
                    }}
                    className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="দানবাক্সের ভাংতি টাকা ও ক্যাশ নোট গণনা"
                  >
                    <Banknote className="w-3.5 h-3.5 text-teal-700" />
                    <span>ভাংতি টাকা গণনা</span>
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 15000"
                  value={boxAmount}
                  onChange={(e) => setBoxAmount(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-black font-mono text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-teal-500 text-base"
                />
                {boxDenominationData && (
                  <div className="mt-2 p-2.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-950">
                    <div className="flex items-center space-x-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <span>দানবাক্সের কয়েন ও ক্যাশ নোট গণনা সংযুক্ত</span>
                        <div className="text-[11px] font-mono text-teal-700">
                          {boxDenominationData.totalNotesCount} নোট, {boxDenominationData.totalCoinsCount} কয়েন = ৳{boxDenominationData.grandTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCalculatorTarget('BOX');
                          setIsCalculatorOpen(true);
                        }}
                        className="px-2 py-1 bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        পুনঃগণনা
                      </button>
                      <button
                        type="button"
                        onClick={() => setBoxDenominationData(null)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="বাতিল করুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">গণনার তারিখ *</label>
                  <input
                    type="date"
                    value={boxCollectionDate}
                    onChange={(e) => setBoxCollectionDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">জমার হিসাব *</label>
                  <select
                    value={boxDepositAccountId}
                    onChange={(e) => setBoxDepositAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Counting Team */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  গণনা টিমের নামসমূহ (কমা দিয়ে লিখুন)
                </label>
                <input
                  type="text"
                  placeholder="e.g. রফিকুল ইসলাম, আব্দুল কাদির, মুয়াজ্জিন"
                  value={countingTeam}
                  onChange={(e) => setCountingTeam(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              {/* Witnesses */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  উপস্থিত সাক্ষীগণের নাম (কমা দিয়ে লিখুন)
                </label>
                <input
                  type="text"
                  placeholder="e.g. আলহাজ্ব কামাল উদ্দিন, মোঃ শামসুল হুদা"
                  value={witnesses}
                  onChange={(e) => setWitnesses(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মন্তব্য / নোট</label>
                <input
                  type="text"
                  placeholder="অতিরিক্ত কোনো তথ্য বা বিশেষ নোট..."
                  value={boxNotes}
                  onChange={(e) => setBoxNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBoxModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isCollectingBox}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{isCollectingBox ? 'জমা হচ্ছে...' : 'টাকা জমা ও ভাউচার নিশ্চিত করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 3. JUMA COLLECTION MODAL ---------------- */}
      {isJumaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150 flex flex-col max-h-[92vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-emerald-700">
              <Calendar className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">জুমার দিনের কালেকশন এন্ট্রি</h3>
            </div>

            <form onSubmit={handleJumaSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জুমার তারিখ *</label>
                <input
                  type="date"
                  value={jumaDate}
                  onChange={(e) => setJumaDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">সর্বমোট আদায়কৃত টাকা (৳) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTarget('JUMA');
                      setIsCalculatorOpen(true);
                    }}
                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="জুমার ভাংতি টাকা ও নোট গণনা"
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                    <span>ভাংতি টাকা গণনা</span>
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 25000"
                  value={jumaAmount}
                  onChange={(e) => setJumaAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white outline-hidden"
                />
                {jumaDenominationData && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center space-x-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span>জুমার ক্যাশ নোট ও ভাংতি গণনা সংযুক্ত</span>
                        <div className="text-[11px] font-mono text-emerald-700">
                          {jumaDenominationData.totalNotesCount} নোট, {jumaDenominationData.totalCoinsCount} কয়েন = ৳{jumaDenominationData.grandTotal.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCalculatorTarget('JUMA');
                          setIsCalculatorOpen(true);
                        }}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        পুনঃগণনা
                      </button>
                      <button
                        type="button"
                        onClick={() => setJumaDenominationData(null)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="বাতিল করুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গণনা টিমের সদস্যগণ</label>
                <input
                  type="text"
                  placeholder="e.g. ইমাম সাহেব, মুয়াজ্জিন, কোষাধ্যক্ষ"
                  value={jumaTeam}
                  onChange={(e) => setJumaTeam(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">উপস্থিত মুসল্লি / সাক্ষী</label>
                <input
                  type="text"
                  placeholder="e.g. আলহাজ্ব কবির হোসেন"
                  value={jumaWitness}
                  onChange={(e) => setJumaWitness(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার হিসাব</label>
                <select
                  value={jumaAccount}
                  onChange={(e) => setJumaAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJumaModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer"
                >
                  জুমার কালেকশন পোস্ট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- 4. QUICK DONATION BOX COLLECTION REPORT & A4 PRINT MODAL ---------------- */}
      <QuickDonationBoxReportModal
        isOpen={isQuickBoxReportOpen || isPrintReportOpen}
        onClose={() => {
          setIsQuickBoxReportOpen(false);
          setIsPrintReportOpen(false);
        }}
        donationBoxes={donationBoxes}
        boxCollections={boxCollections}
        accounts={accounts}
        currentMosque={currentMosque}
        currentUser={currentUser}
        language={language}
        initialBoxId={selectedReportBoxId}
      />

      {/* ---------------- 5. PRINT-READY DONATION BOXES MASTER LIST MODAL ---------------- */}
      {isPrintBoxListOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 report-modal-print-wrapper print:static print:inset-auto print:p-0 print:m-0 print:w-full print:h-auto print:bg-white print:overflow-visible print:block print:z-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] report-modal-print-card print:static print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0">
            {/* Top Toolbar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden print-controls-bar">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">
                  দানবাক্স সমূহের মাস্টার তালিকা ও অবস্থান রেজিস্টার (Print Preview)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>এখনই প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintBoxListOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Body (Printable) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-5 font-sans report-modal-print-body print:p-0 print:m-0 print:overflow-visible print:h-auto print:max-h-none print:block print:shadow-none">
              {/* Structured Official Report Header */}
              <div className="border-2 border-slate-900 bg-white p-3.5 rounded-none overflow-hidden">
                <div className="grid grid-cols-12 items-center gap-3">
                  {/* LEFT: Mosque Official Logo (2 cols) */}
                  <div className="col-span-2 flex items-center justify-start">
                    {currentMosque?.logoUrl ? (
                      <img
                        src={currentMosque.logoUrl}
                        alt="Mosque Logo"
                        className="max-h-16 max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-dashed border-teal-600 bg-teal-50/60 flex flex-col items-center justify-center text-teal-800 rounded-lg">
                        <Building className="w-7 h-7 mb-0.5 text-teal-700" />
                        <span className="text-[8px] font-bold">লোগো</span>
                      </div>
                    )}
                  </div>

                  {/* CENTER: Mosque Name, Title & Period (7 cols) */}
                  <div className="col-span-7 text-center">
                    <div className="text-xs font-serif text-slate-600 mb-0.5">بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ</div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-tight">
                      {currentMosque?.nameBn || currentMosque?.name || 'মসজিদুল মামুর কমপ্লেক্স ও ওয়াকফ এস্টেট'}
                    </h1>
                    {currentMosque?.address && (
                      <p className="text-xs text-slate-700 mt-0.5">
                        {currentMosque.address}{' '}
                        {currentMosque.district ? `• জেলা: ${currentMosque.district}` : ''}{' '}
                        {currentMosque.phone ? `• ফোন: ${currentMosque.phone}` : ''}
                      </p>
                    )}
                    {currentMosque?.waqfEstateNumber && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        ওয়াকফ এস্টেট ইসি নং: {currentMosque.waqfEstateNumber}
                      </p>
                    )}
                    <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white font-bold text-xs sm:text-sm tracking-wide">
                      দানবাক্স সমূহের মাস্টার তালিকা ও অবস্থান বিবরণী রেজিস্টার
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1">
                      মোট দানবাক্স: <span className="font-bold text-slate-950">{donationBoxes.length} টি</span> (সক্রিয়:{' '}
                      <span className="font-bold text-emerald-800">{donationBoxes.filter((b) => b.status === 'ACTIVE').length} টি</span>)
                    </p>
                  </div>

                  {/* RIGHT: Structured Meta Box (3 cols) */}
                  <div className="col-span-3 border border-slate-800 bg-slate-50 p-2 text-[11px] space-y-1">
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">প্রতিবেদন ধরন:</span>
                      <span className="font-bold text-slate-950">মাস্টার রেজিস্টার</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">মসজিদ কোড:</span>
                      <span className="font-bold text-slate-900">{currentMosque?.code || 'MOSQUE'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">মুদ্রা:</span>
                      <span className="font-bold text-slate-900">BDT (টাকা ৳)</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                      <span>প্রিন্টের তারিখ:</span>
                      <span className="font-mono">{formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Boxes Table */}
              <div className="border border-slate-900 overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                    <tr>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-8">ক্রঃ</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-24">বক্স কোড ও নাম</th>
                      <th className="py-2 px-2 border-r border-slate-300">দোকান ও অবস্থান</th>
                      <th className="py-2 px-2 border-r border-slate-300">মালিক ও ফোন</th>
                      <th className="py-2 px-2 border-r border-slate-300">পূর্ণ ঠিকানা</th>
                      <th className="py-2 px-2 border-r border-slate-300">সর্বশেষ খোলার বিবরণ / সময়কাল</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-16">স্ট্যাটাস</th>
                      <th className="py-2 px-2 text-right w-24">মোট আদায় (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {donationBoxes.map((box, idx) => {
                      const duration = getDurationSinceLastOpened(box.lastCollectedDate, box.createdAt);
                      return (
                        <tr key={box.id}>
                          <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200">
                            <div className="font-bold font-mono text-teal-950">{box.boxCode}</div>
                            {box.manualName && (
                              <div className="text-[10px] text-slate-600">{box.manualName}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200">
                            <div className="font-bold text-slate-900">{box.shopName || box.location || '-'}</div>
                            {box.location && box.shopName && (
                              <div className="text-[10px] text-slate-500">চত্বর: {box.location}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200">
                            <div className="font-medium text-slate-900">{box.ownerName || '-'}</div>
                            {box.ownerPhone && (
                              <div className="text-[10px] font-mono text-slate-600">{box.ownerPhone}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-slate-700 text-[11px]">
                            {box.address || '-'}
                          </td>
                          <td className="py-2 px-2 border-r border-slate-200 text-[11px]">
                            {box.lastCollectedDate ? (
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {formatDate(box.lastCollectedDate)}
                                </span>
                                <span className="text-[10px] text-slate-600">{duration.text}</span>
                              </div>
                            ) : (
                              <span className="text-amber-800 font-medium">
                                {duration.text}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                box.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {box.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                            ৳ {(box.totalCollected || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={7} className="py-2.5 px-3 text-right text-slate-900">
                        সকল দানবাক্স হতে মোট আদায়কৃত সর্বমোট টাকা:
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-sm font-black text-slate-950">
                        ৳{' '}
                        {donationBoxes
                          .reduce((sum, b) => sum + (b.totalCollected || 0), 0)
                          .toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount In Words */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <strong>কথায় (In Words):</strong>{' '}
                {numberToBanglaWords(
                  donationBoxes.reduce((sum, b) => sum + (b.totalCollected || 0), 0)
                )}{' '}
                মাত্র
              </div>

              {/* Official Approval Signatures Section */}
              <div className="border-t-2 border-slate-900 pt-6 mt-8 break-inside-avoid">
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  {/* Signature 1: Accountant / Cashier */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {/* Physical handwriting line */}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      কোষাধ্যক্ষ / প্রস্তুতকারী
                    </div>
                    <div className="text-[10px] text-slate-600">হিসাব ও অর্থ বিভাগ</div>
                  </div>

                  {/* Signature 2: Secretary / Mutawalli */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.secretarySignatureUrl ? (
                        <img
                          src={currentMosque.secretarySignatureUrl}
                          alt="Secretary Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সাধারণ সম্পাদক / মোতাওয়াল্লী
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>

                  {/* Signature 3: President */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.presidentSignatureUrl ? (
                        <img
                          src={currentMosque.presidentSignatureUrl}
                          alt="President Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সভাপতি / সভাপতি মহোদয়
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>
                </div>
              </div>

              {/* System Audit Note Footer */}
              <div className="border-t border-slate-300 mt-4 pt-2 flex justify-between items-center text-[10px] text-slate-600 break-inside-avoid">
                <div>
                  <span>প্রতিবেদন উৎস: </span>
                  <span className="font-bold text-slate-800">মসজিদলেজার স্বয়ংক্রিয় হিসাব ও নিরীক্ষা ব্যবস্থাপনা সিস্টেম</span>
                </div>
                <div>
                  <span>মুদ্রণ সময়: {new Date().toLocaleString('bn-BD')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 6. PRINT-READY JUMA COLLECTION REGISTER REPORT MODAL ---------------- */}
      {isPrintJumaReportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 report-modal-print-wrapper print:static print:inset-auto print:p-0 print:m-0 print:w-full print:h-auto print:bg-white print:overflow-visible print:block print:z-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] report-modal-print-card print:static print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0">
            {/* Top Toolbar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden print-controls-bar">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  পবিত্র জুমার জামাত কালেকশন রেজিস্টার প্রতিবেদন (Print Preview)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>এখনই প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintJumaReportOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Body (Printable) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-5 font-sans report-modal-print-body print:p-0 print:m-0 print:overflow-visible print:h-auto print:max-h-none print:block print:shadow-none">
              {/* Structured Official Report Header */}
              <div className="border-2 border-slate-900 bg-white p-3.5 rounded-none overflow-hidden">
                <div className="grid grid-cols-12 items-center gap-3">
                  {/* LEFT: Mosque Official Logo (2 cols) */}
                  <div className="col-span-2 flex items-center justify-start">
                    {currentMosque?.logoUrl ? (
                      <img
                        src={currentMosque.logoUrl}
                        alt="Mosque Logo"
                        className="max-h-16 max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-dashed border-emerald-600 bg-emerald-50/60 flex flex-col items-center justify-center text-emerald-800 rounded-lg">
                        <Building className="w-7 h-7 mb-0.5 text-emerald-700" />
                        <span className="text-[8px] font-bold">লোগো</span>
                      </div>
                    )}
                  </div>

                  {/* CENTER: Mosque Name, Title & Period (7 cols) */}
                  <div className="col-span-7 text-center">
                    <div className="text-xs font-serif text-slate-600 mb-0.5">بِسْمِ اللَّهِ الرَّحْمٰنِ الرَّحِيمِ</div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-tight">
                      {currentMosque?.nameBn || currentMosque?.name || 'মসজিদুল মামুর কমপ্লেক্স ও ওয়াকফ এস্টেট'}
                    </h1>
                    {currentMosque?.address && (
                      <p className="text-xs text-slate-700 mt-0.5">
                        {currentMosque.address}{' '}
                        {currentMosque.district ? `• জেলা: ${currentMosque.district}` : ''}{' '}
                        {currentMosque.phone ? `• ফোন: ${currentMosque.phone}` : ''}
                      </p>
                    )}
                    {currentMosque?.waqfEstateNumber && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        ওয়াকফ এস্টেট ইসি নং: {currentMosque.waqfEstateNumber}
                      </p>
                    )}
                    <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white font-bold text-xs sm:text-sm tracking-wide">
                      পবিত্র জুমার জামাত কালেকশন রেজিস্টার প্রতিবেদন
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1">
                      সময়কাল:{' '}
                      <span className="font-bold text-slate-950">
                        {jumaFilterDateFrom ? formatDate(jumaFilterDateFrom) : 'শুরু হতে'}
                      </span>{' '}
                      হতে{' '}
                      <span className="font-bold text-slate-950">
                        {jumaFilterDateTo ? formatDate(jumaFilterDateTo) : 'হালনাগাদ'}
                      </span>{' '}
                      পর্যন্ত
                    </p>
                  </div>

                  {/* RIGHT: Structured Meta Box (3 cols) */}
                  <div className="col-span-3 border border-slate-800 bg-slate-50 p-2 text-[11px] space-y-1">
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">প্রতিবেদন ধরন:</span>
                      <span className="font-bold text-slate-950">জুমার কালেকশন</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">মোট জামাত:</span>
                      <span className="font-bold text-slate-900">{filteredJumaDonations.length} টি</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-0.5">
                      <span className="text-slate-600">মুদ্রা:</span>
                      <span className="font-bold text-slate-900">BDT (টাকা ৳)</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                      <span>প্রিন্টের তারিখ:</span>
                      <span className="font-mono">{formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Juma Register Table */}
              <div className="border border-slate-900 overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-900">
                    <tr>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-10">ক্রঃ</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-24">জুমার তারিখ</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-28">রসিদ / ভাউচার</th>
                      <th className="py-2 px-2 border-r border-slate-300">বিবরণ, গণনা টিম ও সাক্ষী</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-44">জমার ফান্ড / ব্যাংক হিসাব</th>
                      <th className="py-2 px-2 text-right w-28">আদায়কৃত টাকা (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {filteredJumaDonations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                          উক্ত ফিল্টারে কোনো জুমার কালেকশন রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredJumaDonations.map((jd, idx) => {
                        const jumaInfo = getJumaDisplayDetails(jd, language);
                        return (
                          <tr key={jd.id}>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-900">
                              {formatDate(jd.date)}
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono font-bold text-emerald-950">
                              {jd.receiptNumber}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-950 text-xs">{jumaInfo.title}</div>
                                <div className="text-[10.5px] text-slate-700">
                                  <span className="font-semibold">গণনা টিম: </span>
                                  <span>{jumaInfo.countingTeam}</span>
                                </div>
                                <div className="text-[10px] text-slate-600">
                                  <span className="font-semibold">সাক্ষী: </span>
                                  <span>{jumaInfo.witness}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 text-slate-800 font-medium">
                              {jd.accountName}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                              ৳ {jd.amount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right text-slate-900">
                        জুমার সর্বমোট আদায়কৃত টাকা (মোট জুমা: {filteredJumaDonations.length} টি):
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-sm font-black text-slate-950">
                        ৳ {filteredJumaTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount In Words */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <strong>কথায় (In Words):</strong> {numberToBanglaWords(filteredJumaTotal)}
              </div>

              {/* Official Approval Signatures Section */}
              <div className="border-t-2 border-slate-900 pt-6 mt-8 break-inside-avoid">
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  {/* Signature 1: Accountant / Cashier */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {/* Physical handwriting line */}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      কোষাধ্যক্ষ / প্রস্তুতকারী
                    </div>
                    <div className="text-[10px] text-slate-600">হিসাব ও অর্থ বিভাগ</div>
                  </div>

                  {/* Signature 2: Secretary / Mutawalli */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.secretarySignatureUrl ? (
                        <img
                          src={currentMosque.secretarySignatureUrl}
                          alt="Secretary Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সাধারণ সম্পাদক / মোতাওয়াল্লী
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>

                  {/* Signature 3: President */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="h-12 w-full flex items-end justify-center">
                      {currentMosque?.presidentSignatureUrl ? (
                        <img
                          src={currentMosque.presidentSignatureUrl}
                          alt="President Signature"
                          className="max-h-12 max-w-full object-contain mb-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full">
                      সভাপতি / সভাপতি মহোদয়
                    </div>
                    <div className="text-[10px] text-slate-600">স্বাক্ষর ও সীল</div>
                  </div>
                </div>
              </div>

              {/* System Audit Note Footer */}
              <div className="border-t border-slate-300 mt-4 pt-2 flex justify-between items-center text-[10px] text-slate-600 break-inside-avoid">
                <div>
                  <span>প্রতিবেদন উৎস: </span>
                  <span className="font-bold text-slate-800">মসজিদলেজার স্বয়ংক্রিয় হিসাব ও নিরীক্ষা ব্যবস্থাপনা সিস্টেম</span>
                </div>
                <div>
                  <span>মুদ্রণ সময়: {new Date().toLocaleString('bn-BD')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- DENOMINATION CALCULATOR MODAL ---------------- */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyTotal={handleApplyCalculatedTotal}
        initialData={
          calculatorTarget === 'DONATION'
            ? donationDenominationData
            : calculatorTarget === 'BOX'
            ? boxDenominationData
            : jumaDenominationData
        }
        expectedAmount={
          calculatorTarget === 'DONATION'
            ? Number(amount) || undefined
            : calculatorTarget === 'BOX'
            ? Number(boxAmount) || undefined
            : Number(jumaAmount) || undefined
        }
        collectionType={
          calculatorTarget === 'DONATION'
            ? 'DONATION'
            : calculatorTarget === 'BOX'
            ? 'DONATION_BOX'
            : 'JUMA'
        }
        reference={
          calculatorTarget === 'DONATION'
            ? reference || (donorName ? `দান - ${donorName}` : 'অনুদান')
            : calculatorTarget === 'BOX'
            ? (activeSelectedBox ? `বক্স: ${activeSelectedBox.boxCode}` : 'দানবাক্স')
            : `জুমার কালেকশন - ${jumaDate}`
        }
        countedByInitial={
          calculatorTarget === 'BOX'
            ? countingTeam
            : calculatorTarget === 'JUMA'
            ? jumaTeam
            : undefined
        }
        witnessesInitial={
          calculatorTarget === 'BOX'
            ? witnesses.split(',').map((s) => s.trim()).filter(Boolean)
            : calculatorTarget === 'JUMA'
            ? jumaWitness.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined
        }
        mosque={currentMosque}
        language={language}
      />

      {/* ---------------- DENOMINATION DETAIL & AUDIT SLIP MODAL ---------------- */}
      <DenominationDetailModal
        isOpen={isDenominationDetailOpen}
        onClose={() => setIsDenominationDetailOpen(false)}
        denominationData={activeDenominationDetail}
        referenceId={activeDenominationRef}
        sourceType={activeDenominationSource}
        mosque={currentMosque || null}
        language={language}
        onSaveUpdatedDenomination={handleSaveUpdatedDenomination}
        canEdit={true}
      />

      {/* ---------------- SMS PREVIEW MODAL ---------------- */}
      {smsTarget && onSendSms && (
        <SmsPreviewModal
          isOpen={!!smsTarget}
          onClose={() => setSmsTarget(null)}
          recipientPhone={smsTarget.donorPhone || ''}
          donorOrPayeeName={smsTarget.donorName}
          amount={smsTarget.amount}
          voucherNumber={smsTarget.receiptNumber}
          documentType="DONATION_RECEIPT"
          documentId={smsTarget.id}
          mosque={currentMosque}
          language={language}
          onSendSms={onSendSms}
        />
      )}

      {/* ---------------- QR CODE STICKER MODAL ---------------- */}
      {qrTargetBox && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">দানবাক্স QR কোড স্টিকার</h3>
              <button
                onClick={() => setQrTargetBox(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <QRViewer
              value={`${window.location.origin}/donate?box=${qrTargetBox.boxCode}`}
              boxCode={qrTargetBox.boxCode}
              title={qrTargetBox.location}
              subtitle={qrTargetBox.shopName || qrTargetBox.manualName || 'স্থায়ী কালেকশন বক্স'}
              mosque={currentMosque}
            />
          </div>
        </div>
      )}

      {/* ---------------- EDIT DONATION BOX MASTER DATA MODAL ---------------- */}
      {editingBox && updateBoxHandler && (
        <EditDonationBoxModal
          isOpen={!!editingBox}
          onClose={() => setEditingBox(null)}
          box={editingBox}
          language={language}
          onSave={updateBoxHandler}
        />
      )}
    </div>
  );
};

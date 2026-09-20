import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Calculator,
  Banknote,
  HeartHandshake,
  Box,
  Printer,
  Search,
  UserCheck,
  UserX,
  Calendar,
  AlertCircle,
  ShieldCheck,
  FileText,
  Layers,
  Building2,
  Sparkles,
  Check,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  Info,
  DollarSign,
  Lock,
} from 'lucide-react';
import {
  IncomeEntry,
  Donation,
  DonationBox,
  DonationBoxCollection,
  FinancialAccount,
  AccountHead,
  PaymentMethod,
  CashDenominationData,
  PersonMaster,
  DonationPlan,
  DonationCollection,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  MosqueProperty,
  PropertyTenant,
  PropertyRentCollection,
  Mosque,
  User,
} from '../types';
import { api } from '../lib/api';
import { Language, translations, formatCurrency, formatDate, toBanglaNumber } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { MoneyReceiptModal, VoucherModal, PrintFormat } from './PrintModals';
import { getDurationSinceLastOpened } from './DonationView';

export type IncomeEntryType = 'JUMMA' | 'DONATION' | 'DONATION_BOX' | 'WAQF_RENT' | 'OTHER_INCOME';

export interface UnifiedIncomeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: IncomeEntryType;
  initialPersonId?: string;
  initialPlanId?: string;
  initialCollection?: DonationCollection | null;
  initialBoxId?: string;
  initialPropertyId?: string;
  initialTenantId?: string;
  accounts: FinancialAccount[];
  accountHeads?: AccountHead[];
  donationBoxes?: DonationBox[];
  properties?: MosqueProperty[];
  persons?: PersonMaster[];
  plans?: DonationPlan[];
  families?: FamilyMaster[];
  areas?: AreaMaster[];
  collectionWorkers?: CollectionWorker[];
  currentUser: User | null;
  currentMosque?: Mosque | null;
  language?: Language;
  onSuccess?: () => void;
  onSaveJuma?: (data: any, options?: { print?: boolean }) => Promise<any>;
  onSaveDonation?: (data: any, options?: { print?: boolean }) => Promise<Donation>;
  onSaveBoxCollection?: (data: any, options?: { print?: boolean }) => Promise<any>;
  onSaveWaqfRent?: (propertyId: string, data: any, options?: { print?: boolean }) => Promise<any>;
  onSaveOtherIncome?: (data: any, options?: { print?: boolean }) => Promise<any>;
  onPrintReceipt?: (donation: Donation, format?: PrintFormat, isReprint?: boolean) => void;
  onPrintVoucher?: (voucher: IncomeEntry, type: 'INCOME', format?: PrintFormat, isReprint?: boolean) => void;
}

// Find nearest past or today's Friday
function getNearestFridayDate(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 5 = Friday
  const diff = day >= 5 ? day - 5 : day + 2; // days since last Friday
  const lastFriday = new Date(today);
  lastFriday.setDate(today.getDate() - diff);
  return lastFriday.toISOString().split('T')[0];
}

export const UnifiedIncomeEntryModal: React.FC<UnifiedIncomeEntryModalProps> = ({
  isOpen,
  onClose,
  initialType = 'DONATION',
  initialPersonId,
  initialPlanId,
  initialCollection,
  initialBoxId,
  initialPropertyId,
  initialTenantId,
  accounts: initialAccounts,
  accountHeads = [],
  donationBoxes: initialDonationBoxes,
  properties: initialProperties,
  persons: initialPersons,
  plans: initialPlans,
  families: initialFamilies,
  areas: initialAreas,
  collectionWorkers: initialWorkers,
  currentUser,
  currentMosque,
  language = 'bn',
  onSuccess,
  onSaveJuma,
  onSaveDonation,
  onSaveBoxCollection,
  onSaveWaqfRent,
  onSaveOtherIncome,
  onPrintReceipt,
  onPrintVoucher,
}) => {
  const isBn = language === 'bn';

  // Master Data States (with fallbacks / async fetch if not passed)
  const [accounts, setAccounts] = useState<FinancialAccount[]>(initialAccounts || []);
  const [donationBoxes, setDonationBoxes] = useState<DonationBox[]>(initialDonationBoxes || []);
  const [properties, setProperties] = useState<MosqueProperty[]>(initialProperties || []);
  const [persons, setPersons] = useState<PersonMaster[]>(initialPersons || []);
  const [plans, setPlans] = useState<DonationPlan[]>(initialPlans || []);
  const [families, setFamilies] = useState<FamilyMaster[]>(initialFamilies || []);
  const [areas, setAreas] = useState<AreaMaster[]>(initialAreas || []);
  const [collectionWorkers, setCollectionWorkers] = useState<CollectionWorker[]>(initialWorkers || []);

  // 1. Entry Type Selection
  const [incomeType, setIncomeType] = useState<IncomeEntryType>(initialType);

  // 2. Common Financial Section State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [denominationData, setDenominationData] = useState<CashDenominationData | null>(null);

  // 3. Specialized State - 🕌 JUMMA
  const [jumaCategory, setJumaCategory] = useState<string>('সাধারণ জুমা কালেকশন');
  const [jumaCountingTeam, setJumaCountingTeam] = useState<string>('ইমাম, মোয়াজ্জিন ও কোষাধ্যক্ষ');
  const [jumaWitness, setJumaWitness] = useState<string>('উপস্থিত মুসল্লিবৃন্দ');

  // 4. Specialized State - 🤲 DONATION
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [donorMode, setDonorMode] = useState<'REGISTERED' | 'MANUAL'>('REGISTERED');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [personSearchQuery, setPersonSearchQuery] = useState<string>('');
  const [isSearchingPerson, setIsSearchingPerson] = useState<boolean>(false);
  const [manualDonorName, setManualDonorName] = useState<string>('');
  const [donorPhone, setDonorPhone] = useState<string>('');
  const [donorAddress, setDonorAddress] = useState<string>('');
  const [donationCategory, setDonationCategory] = useState<string>('GENERAL');
  const [collectionWorkerId, setCollectionWorkerId] = useState<string>('');

  // 5. Specialized State - 📦 DONATION BOX
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [boxCountingTeam, setBoxCountingTeam] = useState<string>('কোষাধ্যক্ষ ও মোয়াজ্জিন');
  const [boxWitnesses, setBoxWitnesses] = useState<string>('কমিটি সদস্যবৃন্দ ও মুসল্লিগণ');

  // 6. Specialized State - 🏠 WAQF PROPERTY RENT
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || '');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId || '');
  const [billingMonth, setBillingMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [previousDue, setPreviousDue] = useState<number>(0);

  // 7. Specialized State - 💰 OTHER GENERAL INCOME
  const [selectedMainHeadId, setSelectedMainHeadId] = useState<string>('');
  const [selectedSubHeadId, setSelectedSubHeadId] = useState<string>('');
  const [otherIncomeSource, setOtherIncomeSource] = useState<string>('');

  // UI / Modal Helpers
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);

  // Post-save Receipt / Voucher State
  const [savedDonationForReceipt, setSavedDonationForReceipt] = useState<Donation | null>(null);
  const [savedVoucherForPrint, setSavedVoucherForPrint] = useState<IncomeEntry | null>(null);

  // Load auxiliary data if missing
  useEffect(() => {
    if (!isOpen) return;

    if (!initialPersons || initialPersons.length === 0) {
      api.getPersons().then((res) => setPersons(res)).catch(() => {});
    } else {
      setPersons(initialPersons);
    }

    if (!initialPlans || initialPlans.length === 0) {
      api.getDonationPlans().then((res) => setPlans(res)).catch(() => {});
    } else {
      setPlans(initialPlans);
    }

    if (!initialDonationBoxes || initialDonationBoxes.length === 0) {
      api.getDonationBoxes().then((res) => setDonationBoxes(res)).catch(() => {});
    } else {
      setDonationBoxes(initialDonationBoxes);
    }

    if (!initialProperties || initialProperties.length === 0) {
      api.getProperties().then((res) => setProperties(res)).catch(() => {});
    } else {
      setProperties(initialProperties);
    }

    if (!initialAccounts || initialAccounts.length === 0) {
      api.getAccounts().then((res) => setAccounts(res)).catch(() => {});
    } else {
      setAccounts(initialAccounts);
    }

    if (!initialFamilies || initialFamilies.length === 0) {
      api.getFamilies().then((res) => setFamilies(res)).catch(() => {});
    }

    if (!initialAreas || initialAreas.length === 0) {
      api.getAreas().then((res) => setAreas(res)).catch(() => {});
    }

    if (!initialWorkers || initialWorkers.length === 0) {
      api.getCollectionWorkers().then((res) => setCollectionWorkers(res)).catch(() => {});
    }
  }, [isOpen]);

  // Sync initial setup when modal opens
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setDenominationData(null);
      setSavedDonationForReceipt(null);
      setSavedVoucherForPrint(null);
      return;
    }

    setIncomeType(initialType);
    setErrorMessage('');
    setDenominationData(null);

    // Default account
    const defaultAcc = accounts.find((a) => a.type === 'CASH') || accounts[0];
    if (defaultAcc && !accountId) {
      setAccountId(defaultAcc.id);
    }

    // Configure according to initialType
    if (initialType === 'JUMMA') {
      setDate(getNearestFridayDate());
      setPaymentMethod('CASH');
      setDescription('পবিত্র জুমার জামাত উপলক্ষে মুসল্লিদের সংগৃহীত নগদ অনুদান');
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      setReference(`JUMA-${getNearestFridayDate().replace(/-/g, '')}-${timeStr}`);
    } else if (initialType === 'DONATION') {
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');

      if (initialCollection) {
        // B6 Collection integration
        setSelectedPersonId(initialCollection.personId);
        setDonorMode('REGISTERED');
        setIsAnonymous(false);
        if (initialCollection.donationPlanId) {
          setSelectedPlanId(initialCollection.donationPlanId);
        }
        if (initialCollection.collectionWorkerId) {
          setCollectionWorkerId(initialCollection.collectionWorkerId);
        }
        const remaining = Math.max(0, (initialCollection.plannedAmount || 0) - (initialCollection.collectedAmount || 0));
        setAmount(remaining > 0 ? String(remaining) : String(initialCollection.plannedAmount || ''));
        setDescription(`B6 কালেকশন রসিদ: ${initialCollection.collectionCode || initialCollection.id} (${initialCollection.periodName || ''})`);
      } else if (initialPersonId) {
        setSelectedPersonId(initialPersonId);
        setDonorMode('REGISTERED');
        setIsAnonymous(false);
        if (initialPlanId) {
          setSelectedPlanId(initialPlanId);
          const p = plans.find((pl) => pl.id === initialPlanId);
          if (p) {
            setAmount(String(p.amount || p.plannedAmount || ''));
            if (p.collectionWorkerId) setCollectionWorkerId(p.collectionWorkerId);
          }
        }
      } else {
        setSelectedPersonId('');
        setSelectedPlanId('');
        setIsAnonymous(false);
        setDonorMode('REGISTERED');
        setAmount('');
        setManualDonorName('');
        setDonorPhone('');
        setDonorAddress('');
        setDescription('');
      }
    } else if (initialType === 'DONATION_BOX') {
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      const boxToSelect = initialBoxId || donationBoxes[0]?.id || '';
      setSelectedBoxId(boxToSelect);
      setDescription('দানবাক্স খোলা ও গণনাকৃত নগদ টাকা মসজিদ সাধারণ তহবিলে জমা');
    } else if (initialType === 'WAQF_RENT') {
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      const propToSelect = initialPropertyId || properties[0]?.id || '';
      setSelectedPropertyId(propToSelect);
      const prop = properties.find((p) => p.id === propToSelect);
      if (prop) {
        const activeTenants = (prop.tenants || []).filter((t) => t.status !== 'TERMINATED');
        const tenantToSelect = initialTenantId || activeTenants[0]?.id || '';
        setSelectedTenantId(tenantToSelect);
        const t = activeTenants.find((item) => item.id === tenantToSelect) || activeTenants[0];
        const rent = t?.monthlyRent || prop.monthlyIncome || prop.monthlyRent || 0;
        setMonthlyRent(rent);
        setAmount(rent > 0 ? String(rent) : '');
        setDescription(`ওয়াকফ সম্পত্তি ভাড়া আদায়: ${prop.name || prop.propertyCode}`);
      }
    } else if (initialType === 'OTHER_INCOME') {
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      const incomeHeads = accountHeads.filter((h) => h.type === 'INCOME');
      const nonDonationHead =
        incomeHeads.find(
          (h) =>
            !h.nameBn?.includes('দান') &&
            !h.nameBn?.includes('জুমা') &&
            !h.nameBn?.includes('বাক্স')
        ) || incomeHeads[0];
      if (nonDonationHead) {
        setSelectedMainHeadId(nonDonationHead.id);
      }
      setSelectedSubHeadId('');
      setDescription('');
      setReference('');
    }
  }, [isOpen, initialType, initialPersonId, initialPlanId, initialCollection, initialBoxId, initialPropertyId, initialTenantId, accounts, donationBoxes, properties, plans, accountHeads]);

  // Selected Property details & Active Tenants
  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return properties[0] || null;
    return properties.find((p) => p.id === selectedPropertyId) || properties[0] || null;
  }, [selectedPropertyId, properties]);

  const propertyTenants = useMemo(() => {
    if (!selectedProperty) return [];
    return (selectedProperty.tenants || []).filter((t) => t.status !== 'TERMINATED');
  }, [selectedProperty]);

  const selectedTenant = useMemo(() => {
    if (!selectedTenantId) return propertyTenants[0] || null;
    return propertyTenants.find((t) => t.id === selectedTenantId) || propertyTenants[0] || null;
  }, [selectedTenantId, propertyTenants]);

  const handlePropertyChange = (propId: string) => {
    setSelectedPropertyId(propId);
    const prop = properties.find((p) => p.id === propId);
    if (prop) {
      const activeTenants = (prop.tenants || []).filter((t) => t.status !== 'TERMINATED');
      if (activeTenants.length > 0) {
        const first = activeTenants[0];
        setSelectedTenantId(first.id);
        const rent = first.monthlyRent || 0;
        setMonthlyRent(rent);
        setAmount(rent > 0 ? String(rent) : '');
      } else {
        setSelectedTenantId('');
        const rent = prop.monthlyIncome || prop.monthlyRent || 0;
        setMonthlyRent(rent);
        setAmount(rent > 0 ? String(rent) : '');
      }
      setDescription(`ওয়াকফ সম্পত্তি ভাড়া আদায়: ${prop.name || prop.propertyCode} (মাস: ${billingMonth})`);
    }
  };

  const handleTenantChange = (tId: string) => {
    setSelectedTenantId(tId);
    const t = propertyTenants.find((item) => item.id === tId);
    if (t) {
      const rent = t.monthlyRent || 0;
      setMonthlyRent(rent);
      setAmount(rent > 0 ? String(rent) : '');
      if (selectedProperty) {
        setDescription(
          `ওয়াকফ সম্পত্তি ভাড়া আদায়: ${selectedProperty.name || selectedProperty.propertyCode} - ইউনিট/দোকান: ${
            t.unitOrShopNo || ''
          } (মাস: ${billingMonth})`
        );
      }
    }
  };

  // When selected person changes, auto-populate details & plans
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return persons.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, persons]);

  const personFamily = useMemo(() => {
    if (!selectedPerson?.familyId) return null;
    return families.find((f) => f.id === selectedPerson.familyId) || null;
  }, [selectedPerson, families]);

  const personArea = useMemo(() => {
    const aId = selectedPerson?.areaId || personFamily?.areaId;
    if (!aId) return null;
    return areas.find((a) => a.id === aId) || null;
  }, [selectedPerson, personFamily, areas]);

  const personActivePlans = useMemo(() => {
    if (!selectedPersonId) return [];
    return plans.filter((p) => p.personId === selectedPersonId && p.status === 'ACTIVE');
  }, [selectedPersonId, plans]);

  const handleSelectPerson = (person: PersonMaster) => {
    setSelectedPersonId(person.id);
    setIsSearchingPerson(false);
    setPersonSearchQuery('');

    if (person.mobile) setDonorPhone(person.mobile);

    const activePlans = plans.filter((p) => p.personId === person.id && p.status === 'ACTIVE');
    if (activePlans.length > 0) {
      const first = activePlans[0];
      setSelectedPlanId(first.id);
      const planAmt = first.amount || first.plannedAmount || 0;
      if (planAmt > 0) setAmount(String(planAmt));
      if (first.collectionWorkerId) setCollectionWorkerId(first.collectionWorkerId);
    } else {
      setSelectedPlanId('');
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    if (!planId) return;
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const amt = plan.amount || plan.plannedAmount || 0;
      if (amt > 0) setAmount(String(amt));
      if (plan.collectionWorkerId) setCollectionWorkerId(plan.collectionWorkerId);
    }
  };

  // Selected Donation Box details
  const selectedBox = useMemo(() => {
    if (!selectedBoxId) return donationBoxes[0] || null;
    return donationBoxes.find((b) => b.id === selectedBoxId) || donationBoxes[0] || null;
  }, [selectedBoxId, donationBoxes]);

  // Search filtered persons
  const filteredPersons = useMemo(() => {
    if (!personSearchQuery.trim()) return persons.slice(0, 8);
    const q = personSearchQuery.toLowerCase().trim();
    return persons
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.personCode && p.personCode.toLowerCase().includes(q)) ||
          (p.mobile && p.mobile.includes(q)) ||
          (p.occupation && p.occupation.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [persons, personSearchQuery]);

  // Account filtering based on payment method
  const filteredAccounts = useMemo(() => {
    if (paymentMethod === 'CASH') {
      const cashOnes = accounts.filter((a) => a.type === 'CASH' && a.status === 'ACTIVE');
      return cashOnes.length > 0 ? cashOnes : accounts.filter((a) => a.status === 'ACTIVE');
    }
    if (paymentMethod === 'BANK') {
      const bankOnes = accounts.filter((a) => a.type === 'BANK' && a.status === 'ACTIVE');
      return bankOnes.length > 0 ? bankOnes : accounts.filter((a) => a.status === 'ACTIVE');
    }
    // Mobile Banking
    const mbOnes = accounts.filter((a) => (a.type === 'MOBILE_BANKING' || a.type === 'BANK' || a.type === 'CASH') && a.status === 'ACTIVE');
    return mbOnes.length > 0 ? mbOnes : accounts.filter((a) => a.status === 'ACTIVE');
  }, [accounts, paymentMethod]);

  // Ensure selected account is valid when payment method changes
  useEffect(() => {
    if (filteredAccounts.length > 0 && !filteredAccounts.some((a) => a.id === accountId)) {
      setAccountId(filteredAccounts[0].id);
    }
  }, [filteredAccounts, accountId]);

  // Change type handler
  const handleTypeChange = (newType: IncomeEntryType) => {
    setIncomeType(newType);
    setErrorMessage('');
    if (newType === 'JUMMA') {
      setDate(getNearestFridayDate());
      setPaymentMethod('CASH');
      setDescription('পবিত্র জুমার জামাত উপলক্ষে মুসল্লিদের সংগৃহীত নগদ অনুদান');
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      setReference(`JUMA-${getNearestFridayDate().replace(/-/g, '')}-${timeStr}`);
    } else if (newType === 'DONATION') {
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setReference('');
    } else if (newType === 'DONATION_BOX') {
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      if (!selectedBoxId && donationBoxes.length > 0) {
        setSelectedBoxId(donationBoxes[0].id);
      }
      setDescription('দানবাক্স খোলা ও গণনাকৃত নগদ টাকা মসজিদ সাধারণ তহবিলে জমা');
    } else if (newType === 'WAQF_RENT') {
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      if (properties.length > 0) {
        const prop = properties.find((p) => p.id === selectedPropertyId) || properties[0];
        setSelectedPropertyId(prop.id);
        const activeTenants = (prop.tenants || []).filter((t) => t.status !== 'TERMINATED');
        if (activeTenants.length > 0) {
          const first = activeTenants.find((t) => t.id === selectedTenantId) || activeTenants[0];
          setSelectedTenantId(first.id);
          const rent = first.monthlyRent || 0;
          setMonthlyRent(rent);
          setAmount(rent > 0 ? String(rent) : '');
        } else {
          setSelectedTenantId('');
          const rent = prop.monthlyIncome || prop.monthlyRent || 0;
          setMonthlyRent(rent);
          setAmount(rent > 0 ? String(rent) : '');
        }
        setDescription(`ওয়াকফ সম্পত্তি ভাড়া আদায়: ${prop.name || prop.propertyCode} (মাস: ${billingMonth})`);
      }
    } else if (newType === 'OTHER_INCOME') {
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('CASH');
      const incomeHeads = accountHeads.filter((h) => h.type === 'INCOME');
      const nonDonationHead =
        incomeHeads.find(
          (h) =>
            !h.nameBn?.includes('দান') &&
            !h.nameBn?.includes('জুমা') &&
            !h.nameBn?.includes('বাক্স')
        ) || incomeHeads[0];
      if (nonDonationHead) {
        setSelectedMainHeadId(nonDonationHead.id);
      }
      setSelectedSubHeadId('');
      setDescription('');
      setReference('');
    }
  };

  // Main Submit Handler (Universal Financial Posting)
  const handleSubmit = async (e?: React.FormEvent, submitMode: 'SAVE_AND_PRINT' | 'SAVE_ONLY' = 'SAVE_AND_PRINT') => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage(isBn ? 'টাকার পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' : 'Amount must be greater than zero.');
      return;
    }

    if (paymentMethod === 'CASH' && denominationData && denominationData.grandTotal !== numAmount) {
      setErrorMessage(
        isBn
          ? `ক্যাশ ডিনোমিনেশন মোট টাকা (৳${denominationData.grandTotal.toLocaleString('en-IN')}) এবং ইনপুটকৃত টাকার পরিমাণ (৳${numAmount.toLocaleString('en-IN')}) সমান হতে হবে।`
          : 'Denomination total must match the amount.'
      );
      return;
    }

    const finalAccountId = accountId || filteredAccounts[0]?.id || accounts[0]?.id;
    if (!finalAccountId) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে জমার হিসাব নির্বাচন করুন।' : 'Please select a deposit account.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (incomeType === 'JUMMA') {
        // ==========================================
        // 1. 🕌 জুমার কালেকশন Financial Posting
        // ==========================================
        const payload: any = {
          date,
          amount: numAmount,
          paymentMethod,
          accountId: finalAccountId,
          donorName: 'পবিত্র জুমার জামাত ও মুসল্লিবৃন্দ',
          reference: reference.trim() || `JUMA-${date.replace(/-/g, '')}`,
          description: `${jumaCategory}. ${description.trim() || 'পবিত্র জুমার সাধারণ কালেকশন'}${jumaCountingTeam ? `. গণনা টিম: ${jumaCountingTeam}` : ''}${jumaWitness ? `. সাক্ষী: ${jumaWitness}` : ''}`,
          countingTeam: jumaCountingTeam.trim() || undefined,
          witness: jumaWitness.trim() || undefined,
          denominationData: paymentMethod === 'CASH' && denominationData ? denominationData : undefined,
        };

        let createdIncome: any = null;
        if (onSaveJuma) {
          createdIncome = await onSaveJuma(payload, { print: submitMode === 'SAVE_AND_PRINT' });
        } else {
          createdIncome = await api.createIncome({
            ...payload,
            mainHeadId: 'head-inc-01',
            subHeadId: 'head-inc-01-1',
            headNameBn: 'পবিত্র জুমার কালেকশন',
          });
        }

        if (submitMode === 'SAVE_AND_PRINT') {
          if (onPrintVoucher && createdIncome) {
            onPrintVoucher(createdIncome, 'INCOME', 'POS_80', false);
            onClose();
          } else if (createdIncome) {
            setSavedVoucherForPrint(createdIncome);
          } else {
            onClose();
          }
        } else {
          onClose();
        }
      } else if (incomeType === 'DONATION') {
        // ==========================================
        // 2. 🤲 দান ও অনুদান Financial Posting
        // ==========================================
        if (!isAnonymous && donorMode === 'REGISTERED' && !selectedPersonId) {
          setErrorMessage(isBn ? 'অনুগ্রহ করে একজন নিবন্ধিত মুসল্লি নির্বাচন করুন অথবা ম্যানুয়াল নাম লিখুন।' : 'Please select a registered musalli or enter name manually.');
          setIsSubmitting(false);
          return;
        }

        if (!isAnonymous && donorMode === 'MANUAL' && !manualDonorName.trim()) {
          setErrorMessage(isBn ? 'দাতার পূর্ণ নাম আবশ্যক।' : 'Donor name is required.');
          setIsSubmitting(false);
          return;
        }

        const payload: any = {
          amount: numAmount,
          date,
          category: donationCategory,
          paymentMethod,
          accountId: finalAccountId,
          reference: reference.trim() || undefined,
          description: description.trim() || undefined,
          collectionWorkerId: collectionWorkerId || undefined,
        };

        if (isAnonymous) {
          payload.isAnonymous = true;
          payload.donorName = 'আল্লাহর এক বান্দা (Anonymous)';
          payload.donorPhone = donorPhone.trim() || undefined;
          payload.donorAddress = donorAddress.trim() || undefined;
          if (initialCollection) {
            payload.personId = initialCollection.personId;
            payload.donationPlanId = initialCollection.donationPlanId || selectedPlanId || undefined;
            payload.collectionId = initialCollection.id;
            if (selectedPerson?.familyId) payload.familyId = selectedPerson.familyId;
            if (selectedPerson?.areaId) payload.areaId = selectedPerson.areaId;
            if (initialCollection.collectionWorkerId) payload.collectionWorkerId = initialCollection.collectionWorkerId;
          } else if (selectedPerson) {
            payload.personId = selectedPerson.id;
            if (selectedPlanId) payload.donationPlanId = selectedPlanId;
            if (selectedPerson.familyId) payload.familyId = selectedPerson.familyId;
            if (selectedPerson.areaId) payload.areaId = selectedPerson.areaId;
          }
        } else if (donorMode === 'REGISTERED' && selectedPerson) {
          payload.isAnonymous = false;
          payload.personId = selectedPerson.id;
          payload.donorName = selectedPerson.name;
          payload.donorPhone = donorPhone || selectedPerson.mobile || undefined;
          payload.donorAddress = selectedPerson.address || undefined;
          if (selectedPlanId) payload.donationPlanId = selectedPlanId;
          if (selectedPerson.familyId) payload.familyId = selectedPerson.familyId;
          if (selectedPerson.areaId) payload.areaId = selectedPerson.areaId;
          if (initialCollection?.id) payload.collectionId = initialCollection.id;
        } else {
          payload.isAnonymous = false;
          payload.donorName = manualDonorName.trim();
          payload.donorPhone = donorPhone.trim() || undefined;
          payload.donorAddress = donorAddress.trim() || undefined;
          payload.personId = undefined;
          payload.donationPlanId = undefined;
        }

        if (paymentMethod === 'CASH' && denominationData) {
          payload.denominationData = denominationData;
        }

        let createdDonation: Donation | null = null;
        if (onSaveDonation) {
          createdDonation = await onSaveDonation(payload, { print: submitMode === 'SAVE_AND_PRINT' });
        } else {
          const res = await api.createDonation(payload);
          createdDonation = res;
        }

        if (submitMode === 'SAVE_AND_PRINT') {
          if (onPrintReceipt && createdDonation) {
            onPrintReceipt(createdDonation, 'POS_80', false);
            onClose();
          } else if (createdDonation) {
            setSavedDonationForReceipt(createdDonation);
          } else {
            onClose();
          }
        } else {
          onClose();
        }
      } else if (incomeType === 'DONATION_BOX') {
        // ==========================================
        // 3. 📦 দানবাক্স কালেকশন Financial Posting
        // ==========================================
        const targetBoxId = selectedBoxId || donationBoxes[0]?.id;
        if (!targetBoxId) {
          setErrorMessage(isBn ? 'অনুগ্রহ করে একটি দানবাক্স নির্বাচন করুন।' : 'Please select a donation box.');
          setIsSubmitting(false);
          return;
        }

        const payload: any = {
          boxId: targetBoxId,
          amount: numAmount,
          countingTeam: boxCountingTeam.split(',').map((s) => s.trim()).filter(Boolean),
          witnesses: boxWitnesses.split(',').map((s) => s.trim()).filter(Boolean),
          depositAccountId: finalAccountId,
          collectionDate: date,
          notes: description.trim() || undefined,
        };

        if (paymentMethod === 'CASH' && denominationData) {
          payload.denominationData = denominationData;
        }

        let result: any = null;
        if (onSaveBoxCollection) {
          result = await onSaveBoxCollection(payload, { print: submitMode === 'SAVE_AND_PRINT' });
        } else {
          result = await api.createDonationBoxCollection(payload);
        }

        if (submitMode === 'SAVE_AND_PRINT') {
          if (onPrintVoucher && result?.incomeVoucher) {
            onPrintVoucher(result.incomeVoucher, 'INCOME', 'POS_80', false);
            onClose();
          } else {
            onClose();
          }
        } else {
          onClose();
        }
      } else if (incomeType === 'WAQF_RENT') {
        // ==========================================
        // 4. 🏠 ওয়াক্ফ সম্পত্তির ভাড়া Financial Posting
        // ==========================================
        const targetPropertyId = selectedPropertyId || properties[0]?.id;
        if (!targetPropertyId) {
          setErrorMessage(isBn ? 'অনুগ্রহ করে একটি ওয়াকফ সম্পত্তি নির্বাচন করুন।' : 'Please select a waqf property.');
          setIsSubmitting(false);
          return;
        }

        const targetTenantId = selectedTenantId || propertyTenants[0]?.id;
        if (!targetTenantId) {
          setErrorMessage(isBn ? 'অনুগ্রহ করে একজন সক্রিয় ভাড়াটিয়া বা ইজারাদার নির্বাচন করুন।' : 'Please select a tenant.');
          setIsSubmitting(false);
          return;
        }

        const payload: any = {
          tenantId: targetTenantId,
          billingMonth,
          monthlyRent: Number(monthlyRent) || 0,
          previousDue: Number(previousDue) || 0,
          paidAmount: numAmount,
          paymentDate: date,
          paymentMethod,
          accountId: finalAccountId,
          isAccountingLinked: true,
          notes: description.trim() || `ওয়াকফ সম্পত্তি ভাড়া আদায় (${billingMonth})`,
        };

        if (paymentMethod === 'CASH' && denominationData) {
          payload.denominationData = denominationData;
        }

        let result: any = null;
        if (onSaveWaqfRent) {
          result = await onSaveWaqfRent(targetPropertyId, payload, { print: submitMode === 'SAVE_AND_PRINT' });
        } else {
          result = await api.collectPropertyRent(targetPropertyId, payload);
        }

        if (submitMode === 'SAVE_AND_PRINT') {
          const incVoucher = result?.incomeEntry;
          if (onPrintVoucher && incVoucher) {
            onPrintVoucher(incVoucher, 'INCOME', 'POS_80', false);
            onClose();
          } else if (incVoucher) {
            setSavedVoucherForPrint(incVoucher);
          } else {
            onClose();
          }
        } else {
          onClose();
        }
      } else if (incomeType === 'OTHER_INCOME') {
        // ==========================================
        // 5. 💰 অন্যান্য আয় Financial Posting
        // ==========================================
        const incomeHeads = accountHeads.filter((h) => h.type === 'INCOME');
        const targetMainHead =
          incomeHeads.find((h) => h.id === selectedMainHeadId) ||
          incomeHeads.find(
            (h) =>
              !h.nameBn?.includes('দান') &&
              !h.nameBn?.includes('জুমা') &&
              !h.nameBn?.includes('বাক্স')
          ) ||
          incomeHeads[0];

        const targetSubHead = accountHeads.find((h) => h.id === selectedSubHeadId);

        const payload: any = {
          date,
          amount: numAmount,
          paymentMethod,
          accountId: finalAccountId,
          mainHeadId: targetMainHead?.id || 'head-inc-03',
          mainHeadNameBn: targetMainHead?.nameBn || 'অন্যান্য বিবিধ আয়',
          subHeadId: targetSubHead?.id || undefined,
          subHeadNameBn: targetSubHead?.nameBn || undefined,
          reference: reference.trim() || undefined,
          description: description.trim() || otherIncomeSource.trim() || 'অন্যান্য বিবিধ সাধারণ আয়',
        };

        if (paymentMethod === 'CASH' && denominationData) {
          payload.denominationData = denominationData;
        }

        let createdIncome: any = null;
        if (onSaveOtherIncome) {
          createdIncome = await onSaveOtherIncome(payload, { print: submitMode === 'SAVE_AND_PRINT' });
        } else if (onSaveJuma) {
          createdIncome = await onSaveJuma(payload, { print: submitMode === 'SAVE_AND_PRINT' });
        } else {
          createdIncome = await api.createIncome(payload);
        }

        if (submitMode === 'SAVE_AND_PRINT') {
          if (onPrintVoucher && createdIncome) {
            onPrintVoucher(createdIncome, 'INCOME', 'POS_80', false);
            onClose();
          } else if (createdIncome) {
            setSavedVoucherForPrint(createdIncome);
          } else {
            onClose();
          }
        } else {
          onClose();
        }
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Unified Income Entry Error:', err);
      setErrorMessage(err.message || (isBn ? 'আয় সংরক্ষণ করতে ত্রুটি হয়েছে।' : 'Failed to record income.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
          {/* Top Modal Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                {incomeType === 'JUMMA' ? (
                  <Banknote className="w-5 h-5" />
                ) : incomeType === 'DONATION' ? (
                  <HeartHandshake className="w-5 h-5" />
                ) : incomeType === 'DONATION_BOX' ? (
                  <Box className="w-5 h-5" />
                ) : incomeType === 'WAQF_RENT' ? (
                  <Building2 className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold font-siliguri">
                    {incomeType === 'JUMMA'
                      ? '🕌 নতুন জুমা কালেকশন এন্ট্রি'
                      : incomeType === 'DONATION'
                      ? '🤲 নতুন অনুদান গ্রহণ ও মানি রিসিট'
                      : incomeType === 'DONATION_BOX'
                      ? '📦 দানবাক্স কালেকশন ও টাকা জমা'
                      : incomeType === 'WAQF_RENT'
                      ? '🏠 ওয়াক্ফ সম্পত্তির ভাড়া আদায়'
                      : '💰 অন্যান্য সাধারণ আয় পোস্টিং'}
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20">
                    {incomeType === 'JUMMA'
                      ? 'জুমার সাধারণ আয়'
                      : incomeType === 'DONATION'
                      ? 'অফিসিয়াল মানি রিসিট'
                      : incomeType === 'DONATION_BOX'
                      ? 'তহবিল পোস্টিং'
                      : incomeType === 'WAQF_RENT'
                      ? 'ওয়াক্ফ সম্পত্তি ও ভাড়া'
                      : 'বিবিধ আয়'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-tiro">
                  {isBn
                    ? 'মসজিদলেজার প্রো একীভূত আয় গ্রহণ ও স্বয়ংক্রিয় আর্থিক লেজার পোস্টিং সিস্টেম'
                    : 'MasjidLedger Pro Unified Income Entry & Automated Ledger Posting'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <form
            onSubmit={(e) => handleSubmit(e, 'SAVE_AND_PRINT')}
            className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50"
          >
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2.5 text-rose-700 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span className="font-siliguri font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 1: আয়ের ধরন নির্বাচন করুন *                         */}
            {/* ============================================================ */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-siliguri flex items-center space-x-1.5">
                  <span className="text-emerald-600">১.</span>
                  <span>আয়ের ধরন নির্বাচন করুন *</span>
                </label>
                <span className="text-[11px] text-slate-500 font-tiro">
                  সঠিক ধরন নির্বাচন করলে উপযুক্ত ফর্ম স্বয়ংক্রিয়ভাবে লোড হবে
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {/* 1. Juma Collection Option */}
                <button
                  type="button"
                  onClick={() => handleTypeChange('JUMMA')}
                  className={`p-3 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    incomeType === 'JUMMA'
                      ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                      🕌
                    </div>
                    {incomeType === 'JUMMA' && (
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-slate-800 text-xs font-siliguri">জুমার কালেকশন</h4>
                    <p className="text-[11px] text-slate-500 font-tiro mt-0.5 line-clamp-2">
                      জুমার সাধারণ দান
                    </p>
                  </div>
                </button>

                {/* 2. Donation Option */}
                <button
                  type="button"
                  onClick={() => handleTypeChange('DONATION')}
                  className={`p-3 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    incomeType === 'DONATION'
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      🤲
                    </div>
                    {incomeType === 'DONATION' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-slate-800 text-xs font-siliguri">দান ও অনুদান</h4>
                    <p className="text-[11px] text-slate-500 font-tiro mt-0.5 line-clamp-2">
                      রসিদযুক্ত সাধারণ/মাসিক দান
                    </p>
                  </div>
                </button>

                {/* 3. Donation Box Option */}
                <button
                  type="button"
                  onClick={() => handleTypeChange('DONATION_BOX')}
                  className={`p-3 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    incomeType === 'DONATION_BOX'
                      ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                      📦
                    </div>
                    {incomeType === 'DONATION_BOX' && (
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-slate-800 text-xs font-siliguri">দানবাক্স কালেকশন</h4>
                    <p className="text-[11px] text-slate-500 font-tiro mt-0.5 line-clamp-2">
                      স্থায়ী বাক্স উন্মুক্তকরণ
                    </p>
                  </div>
                </button>

                {/* 4. Waqf Rent Option */}
                <button
                  type="button"
                  onClick={() => handleTypeChange('WAQF_RENT')}
                  className={`p-3 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    incomeType === 'WAQF_RENT'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      🏠
                    </div>
                    {incomeType === 'WAQF_RENT' && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-slate-800 text-xs font-siliguri">ওয়াক্ফ সম্পত্তি ভাড়া</h4>
                    <p className="text-[11px] text-slate-500 font-tiro mt-0.5 line-clamp-2">
                      দোকান/জমি মাসিক ভাড়া আদায়
                    </p>
                  </div>
                </button>

                {/* 5. Other Income Option */}
                <button
                  type="button"
                  onClick={() => handleTypeChange('OTHER_INCOME')}
                  className={`p-3 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    incomeType === 'OTHER_INCOME'
                      ? 'border-amber-600 bg-amber-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                      💰
                    </div>
                    {incomeType === 'OTHER_INCOME' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="mt-2">
                    <h4 className="font-bold text-slate-800 text-xs font-siliguri">অন্যান্য সাধারণ আয়</h4>
                    <p className="text-[11px] text-slate-500 font-tiro mt-0.5 line-clamp-2">
                      ইজারা/নিলাম/বিবিধ তহবিল
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 2: DYNAMIC SPECIALIZED SECTION                       */}
            {/* ============================================================ */}

            {/* ------------------------------------------------------------ */}
            {/* SPECIALIZED CASE 1: 🕌 জুমার কালেকশন                         */}
            {/* ------------------------------------------------------------ */}
            {incomeType === 'JUMMA' && (
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-teal-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-teal-800 pb-2 border-b border-teal-100">
                  <Banknote className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold font-siliguri">
                    ২. জুমার কালেকশন বিশেষ বিবরণী
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Juma Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      জুমার ধরন
                    </label>
                    <select
                      value={jumaCategory}
                      onChange={(e) => setJumaCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="সাধারণ জুমা কালেকশন">সাধারণ জুমা কালেকশন</option>
                      <option value="বিশেষ জুমা কালেকশন">বিশেষ জুমা কালেকশন</option>
                      <option value="রমজান জুমা কালেকশন">রমজান জুমা কালেকশন</option>
                      <option value="ঈদের জামাত কালেকশন">ঈদের জামাত কালেকশন</option>
                      <option value="শবে বরাত / কদর কালেকশন">শবে বরাত / কদর কালেকশন</option>
                    </select>
                  </div>

                  {/* Counting Team */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      গণনা টিম
                    </label>
                    <input
                      type="text"
                      value={jumaCountingTeam}
                      onChange={(e) => setJumaCountingTeam(e.target.value)}
                      placeholder="ইমাম, মোয়াজ্জিন ও কোষাধ্যক্ষ"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Witnesses */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      উপস্থিত সাক্ষীগণ
                    </label>
                    <input
                      type="text"
                      value={jumaWitness}
                      onChange={(e) => setJumaWitness(e.target.value)}
                      placeholder="উপস্থিত মুসল্লিবৃন্দ / কমিটির সদস্যবৃন্দ"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* SPECIALIZED CASE 2: 🤲 দান ও অনুদান                           */}
            {/* ------------------------------------------------------------ */}
            {incomeType === 'DONATION' && (
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center space-x-2 text-blue-900">
                    <HeartHandshake className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold font-siliguri">
                      ২. দাতা ও অনুদানের বিবরণ
                    </h3>
                  </div>

                  {/* Donation Category Head */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-siliguri">দানের খাত:</span>
                    <select
                      value={donationCategory}
                      onChange={(e) => setDonationCategory(e.target.value)}
                      className="px-2.5 py-1 bg-blue-50 border border-blue-300 rounded-lg text-xs font-bold text-blue-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GENERAL">সাধারণ দান (General)</option>
                      <option value="CONSTRUCTION">মসজিদ নির্মাণ ও সংস্কার তহবিল</option>
                      <option value="WAQF">ওয়াকফ দান (Waqf)</option>
                      <option value="GRAVEYARD">কবরস্থান উন্নয়ন</option>
                      <option value="WASH_BLOCK">অজু খানা ও ওয়াশ ব্লক</option>
                      <option value="MAKTAB">মক্তব ও কোরআন শিক্ষা</option>
                      <option value="SPECIAL_PROJECT">বিশেষ প্রকল্প</option>
                      <option value="OTHER">অন্যান্য শুভ অনুদান</option>
                    </select>
                  </div>
                </div>

                {/* B6 Collection Integration Banner (if present) */}
                {initialCollection && (
                  <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
                      <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs font-siliguri">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>B6 অনুদান সংগ্রহ কার্যক্রম থেকে আগত</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md flex items-center space-x-1">
                          <Lock className="w-3 h-3 inline mr-0.5" />
                          <span>কালেকশন রেফারেন্স লকড</span>
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                          অটো রিকনসিলিয়েশন
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-500 block font-tiro">কালেকশন কোড</span>
                        <span className="font-bold text-slate-800 font-mono text-[11px]">{initialCollection.collectionCode || initialCollection.id}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-500 block font-tiro">সময়কাল / পর্যায়</span>
                        <span className="font-bold text-emerald-800 font-siliguri text-[11px]">{initialCollection.periodName || initialCollection.collectionPeriod}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-500 block font-tiro">পরিকল্পিত অনুদান</span>
                        <span className="font-bold text-slate-900 font-mono text-[11px]">৳{toBanglaNumber(initialCollection.plannedAmount || 0)}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-500 block font-tiro">পূর্বের আদায়</span>
                        <span className="font-bold text-emerald-700 font-mono text-[11px]">৳{toBanglaNumber(initialCollection.collectedAmount || 0)}</span>
                      </div>
                    </div>

                    {/* Operational Remaining & Quick-fill Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-200/60 text-xs">
                      <div className="flex items-center space-x-2 text-emerald-950 font-siliguri">
                        <span className="text-[11px] font-semibold text-emerald-800">অবশিষ্ট সংগৃহীতব্য:</span>
                        <span className="font-bold text-emerald-900 font-mono bg-emerald-100/80 px-2 py-0.5 rounded text-xs">
                          ৳{toBanglaNumber(Math.max(0, (initialCollection.plannedAmount || 0) - (initialCollection.collectedAmount || 0)))}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const rem = Math.max(0, (initialCollection.plannedAmount || 0) - (initialCollection.collectedAmount || 0));
                            setAmount(String(rem > 0 ? rem : initialCollection.plannedAmount || ''));
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-siliguri font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          অবশিষ্ট আদায় বসান (৳{toBanglaNumber(Math.max(0, (initialCollection.plannedAmount || 0) - (initialCollection.collectedAmount || 0)))})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAmount(String(initialCollection.plannedAmount || ''))}
                          className="px-2 py-1 bg-white border border-emerald-300 text-emerald-800 rounded text-[10px] font-siliguri font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          সম্পূর্ণ নির্ধারিত (৳{toBanglaNumber(initialCollection.plannedAmount || 0)})
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Anonymous Donor Checkbox */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => {
                        setIsAnonymous(e.target.checked);
                        if (e.target.checked) {
                          setSelectedPersonId('');
                          setSelectedPlanId('');
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 font-siliguri flex items-center space-x-1.5">
                        <span>গোপন / বেনামী দান (Anonymous Donor)</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md font-normal">
                          নাম প্রকাশে অনিচ্ছুক
                        </span>
                      </span>
                      <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                        নাম প্রকাশে অনিচ্ছুক হলে এটি টিক দিন। মানি রিসিটে 'বেনামী দাতা' প্রদর্শিত হবে এবং মুসল্লি ডাটাবেজে প্রভাব পড়বে না।
                      </p>
                    </div>
                  </label>
                  {isAnonymous && <UserX className="w-5 h-5 text-amber-500 shrink-0" />}
                </div>

                {/* If Not Anonymous: Select Registered Musalli or Manual Input */}
                {!isAnonymous && (
                  <div className="space-y-4 pt-1">
                    {/* Switch Mode Tabs (Hidden/Locked if initialCollection is present) */}
                    {!initialCollection ? (
                      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                        <button
                          type="button"
                          onClick={() => setDonorMode('REGISTERED')}
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold font-siliguri transition-all cursor-pointer ${
                            donorMode === 'REGISTERED'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          নিবন্ধিত মুসল্লি/দাতা (PersonMaster)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDonorMode('MANUAL');
                            setSelectedPersonId('');
                            setSelectedPlanId('');
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold font-siliguri transition-all cursor-pointer ${
                            donorMode === 'MANUAL'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          সাধারণ / অনিবন্ধিত দাতা (ম্যানুয়াল এন্ট্রি)
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1.5">
                          <span>নিবন্ধিত মুসল্লি ও অনুদান প্ল্যান বিবরণ</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                            কালেকশন লিঙ্কড
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Mode A: Registered Musalli Selector */}
                    {donorMode === 'REGISTERED' && (
                      <div className="space-y-3">
                        {/* Person Selection Box */}
                        {!selectedPerson ? (
                          <div className="relative">
                            <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                              মুসল্লি/দাতা অনুসন্ধান ও নির্বাচন করুন *
                            </label>
                            <div className="relative">
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                value={personSearchQuery}
                                onChange={(e) => {
                                  setPersonSearchQuery(e.target.value);
                                  setIsSearchingPerson(true);
                                }}
                                onFocus={() => setIsSearchingPerson(true)}
                                placeholder="নাম, মোবাইল নম্বর বা মুসল্লি কোড দিয়ে খুঁজুন..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Autocomplete Dropdown */}
                            {isSearchingPerson && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                {filteredPersons.length > 0 ? (
                                  filteredPersons.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSelectPerson(p)}
                                      className="w-full p-2.5 text-left hover:bg-blue-50/80 flex items-center justify-between text-xs transition-colors cursor-pointer"
                                    >
                                      <div>
                                        <div className="font-bold text-slate-800 font-siliguri">{p.name}</div>
                                        <div className="text-[11px] text-slate-500 font-tiro flex items-center space-x-2">
                                          <span>কোড: {p.personCode || '-'}</span>
                                          {p.mobile && <span>• মোবা: {p.mobile}</span>}
                                        </div>
                                      </div>
                                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                                        নির্বাচন করুন
                                      </span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="p-3 text-center text-xs text-slate-400 font-tiro">
                                    কোনো মুসল্লি পাওয়া যায়নি
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Selected Musalli Card */
                          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm font-siliguri">
                                {selectedPerson.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-bold text-slate-900 text-sm font-siliguri">
                                    {selectedPerson.name}
                                  </h4>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md font-mono">
                                    {selectedPerson.personCode || selectedPerson.id}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 font-tiro flex flex-wrap items-center gap-x-2 mt-0.5">
                                  {selectedPerson.mobile && (
                                    <span className="flex items-center space-x-0.5">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>{selectedPerson.mobile}</span>
                                    </span>
                                  )}
                                  {personFamily && <span>• পরিবার: {personFamily.familyName}</span>}
                                  {personArea && (
                                    <span className="flex items-center space-x-0.5">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      <span>{personArea.nameBn || personArea.nameEn}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {!initialCollection ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPersonId('');
                                  setSelectedPlanId('');
                                }}
                                className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-md hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                              >
                                পরিবর্তন
                              </button>
                            ) : (
                              <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-bold font-siliguri">
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>লকড</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* If person has active donation plans */}
                        {selectedPerson && personActivePlans.length > 0 && (
                          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-amber-900 font-siliguri">
                              <span>সক্রিয় অনুদান প্ল্যান (Donation Plan):</span>
                              <span className="text-[11px] font-normal text-amber-700">
                                প্ল্যান নির্বাচন করলে পরিমাণ অটো পূরণ হবে
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {personActivePlans.map((pl) => (
                                <button
                                  key={pl.id}
                                  type="button"
                                  disabled={Boolean(initialCollection?.donationPlanId && initialCollection.donationPlanId !== pl.id)}
                                  onClick={() => handlePlanSelect(pl.id)}
                                  className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                                    selectedPlanId === pl.id
                                      ? 'border-amber-600 bg-amber-100/70 font-bold text-amber-950 shadow-xs'
                                      : initialCollection?.donationPlanId && initialCollection.donationPlanId !== pl.id
                                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                                      : 'border-amber-200 bg-white hover:bg-amber-50 text-slate-700 cursor-pointer'
                                  }`}
                                >
                                  <div>
                                    <div className="font-siliguri">{pl.planCode || pl.id}</div>
                                    <div className="text-[11px] text-slate-500 font-tiro">
                                      পরিকল্পিত: ৳{toBanglaNumber(pl.amount || pl.plannedAmount || 0)} ({pl.frequency || 'মাসিক'})
                                    </div>
                                  </div>
                                  {selectedPlanId === pl.id && <Check className="w-4 h-4 text-amber-600" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode B: Manual / General Donor Fields */}
                    {donorMode === 'MANUAL' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                            দাতার পূর্ণ নাম *
                          </label>
                          <input
                            type="text"
                            value={manualDonorName}
                            onChange={(e) => setManualDonorName(e.target.value)}
                            placeholder="যেমন: হাজী মোঃ আব্দুর রহিম"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                            মোবাইল নম্বর (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={donorPhone}
                            onChange={(e) => setDonorPhone(e.target.value)}
                            placeholder="০১XXXXXXXXX"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                            ঠিকানা / গ্রাম / এলাকা (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={donorAddress}
                            onChange={(e) => setDonorAddress(e.target.value)}
                            placeholder="গ্রাম/বাড়ি/মহল্লা"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* SPECIALIZED CASE 3: 📦 দানবাক্স কালেকশন                     */}
            {/* ------------------------------------------------------------ */}
            {incomeType === 'DONATION_BOX' && (
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-purple-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-purple-900 pb-2 border-b border-purple-100">
                  <Box className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold font-siliguri">
                    ২. দানবাক্স নির্বাচন ও খোলার তথ্য
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Donation Box */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      দানবাক্স নির্বাচন করুন *
                    </label>
                    <select
                      value={selectedBoxId}
                      onChange={(e) => setSelectedBoxId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 font-siliguri focus:bg-white focus:ring-2 focus:ring-purple-500"
                    >
                      {donationBoxes.map((box) => (
                        <option key={box.id} value={box.id}>
                          {box.boxCode} — {box.manualName || box.shopName || 'দানবাক্স'} ({box.location || 'মসজিদ চত্বর'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Box Info Card */}
                  {selectedBox && (
                    <div className="sm:col-span-2 p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-purple-900 text-sm font-siliguri">
                            {selectedBox.boxCode} — {selectedBox.manualName || selectedBox.shopName || 'প্রধান দানবাক্স'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-purple-200 text-purple-800 font-bold rounded-full">
                            {selectedBox.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </div>
                        <span className="text-xs text-purple-800 font-semibold font-tiro">
                          অবস্থান: {selectedBox.location || 'মসজিদ গেট'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 font-tiro pt-1 border-t border-purple-200/60">
                        <div>
                          <span className="text-slate-400 block">দায়িত্বপ্রাপ্ত:</span>
                          <span className="font-semibold text-slate-800">{selectedBox.responsiblePerson || selectedBox.ownerName || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">মোবাইল:</span>
                          <span className="font-semibold text-slate-800">{selectedBox.ownerPhone || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">সর্বশেষ খোলা:</span>
                          <span className="font-semibold text-purple-700">
                            {getDurationSinceLastOpened(selectedBox.lastCollectedDate, selectedBox.createdAt).text}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">পূর্বে সংগৃহীত মোট:</span>
                          <span className="font-bold text-emerald-700 font-mono">
                            ৳{toBanglaNumber(selectedBox.totalCollected || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Counting Team */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      গণনা টিমের নামসমূহ
                    </label>
                    <input
                      type="text"
                      value={boxCountingTeam}
                      onChange={(e) => setBoxCountingTeam(e.target.value)}
                      placeholder="কোষাধ্যক্ষ, সভাপতি ও মোয়াজ্জিন"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Witnesses */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      উপস্থিত সাক্ষীগণের নাম
                    </label>
                    <input
                      type="text"
                      value={boxWitnesses}
                      onChange={(e) => setBoxWitnesses(e.target.value)}
                      placeholder="কমিটি সদস্যবৃন্দ ও উপস্থিত মুসল্লিগণ"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* SPECIALIZED CASE 4: 🏠 ওয়াক্ফ সম্পত্তির ভাড়া                 */}
            {/* ------------------------------------------------------------ */}
            {incomeType === 'WAQF_RENT' && (
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-indigo-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-indigo-800 pb-2 border-b border-indigo-100">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold font-siliguri">
                    ২. ওয়াক্ফ সম্পত্তি ও ভাড়াটিয়া বিবরণী
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Property Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      ওয়াকফ সম্পত্তি নির্বাচন করুন *
                    </label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.propertyCode}) - {p.type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tenant Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      ভাড়াটিয়া / ইজারাদার নির্বাচন করুন *
                    </label>
                    {propertyTenants.length > 0 ? (
                      <select
                        value={selectedTenantId}
                        onChange={(e) => handleTenantChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        {propertyTenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (দোকান/ইউনিট: {t.unitOrShopNo || '-'}) - মাসিক: ৳{toBanglaNumber(t.monthlyRent || 0)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-tiro">
                        এই সম্পত্তিতে কোনো সক্রিয় ভাড়াটিয়া নেই (সাধারণ সম্পত্তি ভাড়া হিসেবে গ্রহণ করা হবে)
                      </div>
                    )}
                  </div>

                  {/* Billing Month */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      ভাড়ার মাস (Billing Month) *
                    </label>
                    <input
                      type="month"
                      value={billingMonth}
                      onChange={(e) => {
                        setBillingMonth(e.target.value);
                        if (selectedProperty) {
                          setDescription(
                            `ওয়াকফ সম্পত্তি ভাড়া আদায়: ${selectedProperty.name || selectedProperty.propertyCode} (মাস: ${e.target.value})`
                          );
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Monthly Rent & Quick Pay Button */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      ধার্যকৃত মাসিক ভাড়া
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800">
                        ৳{toBanglaNumber(monthlyRent || 0)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAmount(String(monthlyRent || 0))}
                        className="px-2.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-siliguri font-bold hover:bg-indigo-100 whitespace-nowrap cursor-pointer"
                      >
                        সম্পূর্ণ আদায়
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tenant Details Card if available */}
                {selectedTenant && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between text-xs font-tiro text-indigo-900">
                    <div>
                      <span className="font-bold font-siliguri text-slate-800">{selectedTenant.name}</span>
                      {selectedTenant.phone && (
                        <span className="text-slate-600 ml-2">({selectedTenant.phone})</span>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        চুক্তি শুরু: {selectedTenant.startDate ? formatDate(selectedTenant.startDate) : '-'} | ইউনিট: {selectedTenant.unitOrShopNo || '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {selectedTenant.status === 'ACTIVE' ? 'সক্রিয় ভাড়াটিয়া' : selectedTenant.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* SPECIALIZED CASE 5: 💰 অন্যান্য বিবিধ সাধারণ আয়            */}
            {/* ------------------------------------------------------------ */}
            {incomeType === 'OTHER_INCOME' && (
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 text-amber-800 pb-2 border-b border-amber-100">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold font-siliguri">
                    ২. অন্যান্য আয়ের খাত ও বিবরণী
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Main Income Head */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      আয়ের মূল খাত (Income Head) *
                    </label>
                    <select
                      value={selectedMainHeadId}
                      onChange={(e) => setSelectedMainHeadId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {accountHeads
                        .filter((h) => h.type === 'INCOME')
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.nameBn} ({h.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Sub Income Head */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      উপ-খাত (Sub Head - ঐচ্ছিক)
                    </label>
                    <select
                      value={selectedSubHeadId}
                      onChange={(e) => setSelectedSubHeadId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">-- কোনো উপ-খাত নেই --</option>
                      {accountHeads
                        .filter((h) => (h.parentId === selectedMainHeadId || (!h.parentId && h.type === 'INCOME')) && h.id !== selectedMainHeadId)
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.nameBn}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Income Source / Context */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                      আয়ের বিস্তারিত বিবরণ / প্রেক্ষাপট (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={otherIncomeSource}
                      onChange={(e) => {
                        setOtherIncomeSource(e.target.value);
                        if (!description) setDescription(e.target.value);
                      }}
                      placeholder="যেমন: পুকুর ইজারা বাবদ আয় / পুরনো সামগ্রী নিলাম / সরকারি বা বিশেষ অনুদান..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 3: COMMON FINANCIAL SECTION                          */}
            {/* ============================================================ */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-slate-800">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold font-siliguri">
                    ৩. আর্থিক হিসাব ও জমার বিবরণী (Common Financial Section)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-tiro">
                  সকল আয়ের সাধারণ আর্থিক পোস্টিং
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                    {incomeType === 'JUMMA' ? 'জুমার তারিখ *' : 'আদায়ের তারিখ *'}
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-tiro mt-1">
                    তারিখ: {formatDate(date, language)}
                  </p>
                </div>

                {/* Amount with Denomination Calculator Trigger */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 font-siliguri">
                      টাকার পরিমাণ (৳) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCalculatorOpen(true)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>ভাংতি ও ক্যাশ নোট গণনা</span>
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="০.০০"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Bangla Words & Denomination preview & B6 Collection Amount Hints */}
                  <div className="mt-1 space-y-1">
                    {Number(amount) > 0 && (
                      <p className="text-[11px] text-emerald-700 font-tiro font-semibold">
                        কথায়: {numberToBanglaWords(Number(amount))}
                      </p>
                    )}
                    {initialCollection && Number(amount) > 0 && (
                      <div className="text-[10px] font-siliguri pt-0.5">
                        {(() => {
                          const planned = initialCollection.plannedAmount || 0;
                          const prevCollected = initialCollection.collectedAmount || 0;
                          const currentRemaining = Math.max(0, planned - prevCollected);
                          const entered = Number(amount);
                          const newTotal = prevCollected + entered;

                          if (newTotal >= planned) {
                            return (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                                ✓ সংগৃহীত মোট: ৳{toBanglaNumber(newTotal)} / ৳{toBanglaNumber(planned)} (অবস্থা: <b>পূর্ণ সংগৃহীত / COLLECTED</b>)
                                {entered > currentRemaining && currentRemaining > 0 && (
                                  <span className="text-amber-800 ml-1.5 font-normal">
                                    [পরিকল্পিতের চেয়ে ৳{toBanglaNumber(entered - currentRemaining)} অতিরিক্ত দান]
                                  </span>
                                )}
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                                ℹ আংশিক আদায়: নতুন সংগৃহীত মোট ৳{toBanglaNumber(newTotal)} | আরও সংগৃহীতব্য: ৳{toBanglaNumber(planned - newTotal)} (অবস্থা: <b>PARTIALLY_COLLECTED</b>)
                              </span>
                            );
                          }
                        })()}
                      </div>
                    )}
                    {denominationData && (
                      <div className="flex items-center justify-between text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-emerald-800">
                        <span>নোট গণনা মোট: ৳{toBanglaNumber(denominationData.grandTotal)}</span>
                        <button
                          type="button"
                          onClick={() => setDenominationData(null)}
                          className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                    পেমেন্ট মাধ্যম *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CASH">ক্যাশ (নগদ টাকা)</option>
                    <option value="BANK">ব্যাংক ডিপোজিট / চেক</option>
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="ROCKET">রকেট (Rocket)</option>
                  </select>
                </div>

                {/* Deposit Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                    জমার হিসাব (Account) *
                  </label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {filteredAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameBn || acc.name} ({acc.type}) — ব্যালেন্স: ৳{toBanglaNumber(acc.currentBalance || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                    রেফারেন্স / রসিদ / চেক নম্বর (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="যেমন: MR-2026-001 / TrxID"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Description / Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 font-siliguri">
                    মন্তব্য / নোট / বিবরণ (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="সংক্ষিপ্ত বিবরণ বা কোনো বিশেষ তথ্য..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-siliguri focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-siliguri transition-all cursor-pointer"
              >
                বাতিল করুন
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {/* Save Only Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmit(e, 'SAVE_ONLY')}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-siliguri transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'শুধু সংরক্ষণ করুন'}
                </button>

                {/* Primary Action Button (Save & Print) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-white text-xs font-bold font-siliguri transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 ${
                    incomeType === 'DONATION_BOX'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : incomeType === 'JUMMA'
                      ? 'bg-teal-700 hover:bg-teal-800'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'প্রক্রিয়াধীন...'
                      : incomeType === 'DONATION_BOX'
                      ? 'টাকা জমা ও ভাউচার নিশ্চিত করুন'
                      : incomeType === 'DONATION'
                      ? 'সংরক্ষণ ও রসিদ প্রিন্ট'
                      : 'সংরক্ষণ ও ভাউচার প্রিন্ট'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Change Calculator Modal */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        language={language}
        targetAmount={Number(amount) || 0}
        onApplyAmount={(val) => {
          setAmount(String(val));
          setIsCalculatorOpen(false);
        }}
        onApplyDenomination={(denomData) => {
          setDenominationData(denomData);
          setAmount(String(denomData.grandTotal));
          setIsCalculatorOpen(false);
        }}
      />

      {/* Post-save Donation Money Receipt Modal */}
      {savedDonationForReceipt && (
        <MoneyReceiptModal
          isOpen={Boolean(savedDonationForReceipt)}
          onClose={() => {
            setSavedDonationForReceipt(null);
            onClose();
          }}
          donation={savedDonationForReceipt}
          mosque={currentMosque || null}
          language={language}
          initialFormat="POS_80"
          isReprint={false}
          autoPrint={true}
        />
      )}

      {/* Post-save Voucher Modal for Juma / Box Collection */}
      {savedVoucherForPrint && (
        <VoucherModal
          isOpen={Boolean(savedVoucherForPrint)}
          onClose={() => {
            setSavedVoucherForPrint(null);
            onClose();
          }}
          item={savedVoucherForPrint}
          type="INCOME"
          mosque={currentMosque || null}
          language={language}
          initialFormat="POS_80"
          isReprint={false}
          autoPrint={true}
        />
      )}
    </>
  );
};

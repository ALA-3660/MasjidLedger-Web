import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Coins,
  UserCheck,
  UserX,
  HeartHandshake,
  Calendar,
  CreditCard,
  Building,
  FileText,
  DollarSign,
  AlertCircle,
  Search,
  CheckCircle2,
  Printer,
  Calculator,
  Briefcase,
  Layers,
  MapPin,
  Home,
  Phone,
} from 'lucide-react';
import {
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  DonationPlan,
  CollectionWorker,
  FinancialAccount,
  PaymentMethod,
  CashDenominationData,
  Donation,
  User as AuthUser,
} from '../../types';
import { Language, toBanglaNumber, formatCurrency, formatDate } from '../../lib/i18n';
import { CashDenominationCalculatorModal } from '../CashDenominationCalculatorModal';

interface ActualDonationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any, submitMode: 'SAVE_AND_PRINT' | 'SAVE_ONLY') => Promise<Donation | void>;
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  plans: DonationPlan[];
  collectionWorkers?: CollectionWorker[];
  accounts: FinancialAccount[];
  currentUser?: AuthUser | null;
  language?: Language;
  initialPersonId?: string;
  initialPlanId?: string;
}

export const ActualDonationFormModal: React.FC<ActualDonationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  persons,
  families,
  areas,
  plans,
  collectionWorkers = [],
  accounts,
  currentUser,
  language = 'bn',
  initialPersonId,
  initialPlanId,
}) => {
  const isBn = language === 'bn';

  // Donor Type: 'REGISTERED' | 'ANONYMOUS'
  const [donorType, setDonorType] = useState<'REGISTERED' | 'ANONYMOUS'>('REGISTERED');

  // Selected Person State
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [personSearchQuery, setPersonSearchQuery] = useState<string>('');
  const [isSearchingPerson, setIsSearchingPerson] = useState<boolean>(false);

  // General / Anonymous fields
  const [anonymousName, setAnonymousName] = useState<string>('আল্লাহর এক বান্দা (Anonymous)');
  const [customDonorName, setCustomDonorName] = useState<string>('');
  const [donorPhone, setDonorPhone] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [donorAddress, setDonorAddress] = useState<string>('');

  // Donation Plan Linking
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Financial fields
  const [amount, setAmount] = useState<string>('');
  const [donationDate, setDonationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Donation['category']>('GENERAL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [collectionWorkerId, setCollectionWorkerId] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Denomination Data
  const [denominationData, setDenominationData] = useState<CashDenominationData | null>(null);
  const [isDenominationModalOpen, setIsDenominationModalOpen] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initialize or update from props
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSubmitting(false);
      setDenominationData(null);
      setDonationDate(new Date().toISOString().split('T')[0]);
      setAccountId(accounts[0]?.id || '');
      setPaymentMethod('CASH');
      setCategory('GENERAL');
      setReference('');
      setDescription('');

      if (initialPersonId) {
        setDonorType('REGISTERED');
        setSelectedPersonId(initialPersonId);
        if (initialPlanId) {
          setSelectedPlanId(initialPlanId);
        } else {
          // Check if person has an active plan
          const activePlan = plans.find((p) => p.personId === initialPersonId && p.status === 'ACTIVE');
          if (activePlan) {
            setSelectedPlanId(activePlan.id);
            const planAmt = activePlan.amount || activePlan.plannedAmount || 0;
            if (planAmt > 0) setAmount(String(planAmt));
          } else {
            setSelectedPlanId('');
            setAmount('');
          }
        }
      } else {
        setSelectedPersonId('');
        setSelectedPlanId('');
        setAmount('');
        setCustomDonorName('');
        setDonorPhone('');
      }
    }
  }, [isOpen, initialPersonId, initialPlanId, accounts, plans]);

  // Selected person object
  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null;
    return persons.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, persons]);

  // Associated Family & Area
  const personFamily = useMemo(() => {
    if (!selectedPerson?.familyId) return null;
    return families.find((f) => f.id === selectedPerson.familyId) || null;
  }, [selectedPerson, families]);

  const personArea = useMemo(() => {
    const areaId = selectedPerson?.areaId || personFamily?.areaId;
    if (!areaId) return null;
    return areas.find((a) => a.id === areaId) || null;
  }, [selectedPerson, personFamily, areas]);

  // Active plans for selected person
  const personActivePlans = useMemo(() => {
    if (!selectedPersonId) return [];
    return plans.filter((p) => p.personId === selectedPersonId && p.status === 'ACTIVE');
  }, [selectedPersonId, plans]);

  // When person changes, prefill details
  const handleSelectPerson = (person: PersonMaster) => {
    setSelectedPersonId(person.id);
    setIsSearchingPerson(false);
    setPersonSearchQuery('');

    // Pre-fill phone if available
    if (person.mobile) setDonorPhone(person.mobile);

    // Check active plans
    const activePlans = plans.filter((p) => p.personId === person.id && p.status === 'ACTIVE');
    if (activePlans.length > 0) {
      const firstPlan = activePlans[0];
      setSelectedPlanId(firstPlan.id);
      const planAmt = firstPlan.amount || firstPlan.plannedAmount || 0;
      if (planAmt > 0) setAmount(String(planAmt));
      if (firstPlan.collectionWorkerId) setCollectionWorkerId(firstPlan.collectionWorkerId);
    } else {
      setSelectedPlanId('');
      setAmount('');
    }
  };

  // When plan changes, prefill suggested amount
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    if (!planId) return;
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const planAmt = plan.amount || plan.plannedAmount || 0;
      if (planAmt > 0) {
        setAmount(String(planAmt));
      }
      if (plan.collectionWorkerId) {
        setCollectionWorkerId(plan.collectionWorkerId);
      }
    }
  };

  // Filtered persons for autocomplete
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

  // Form submit handler
  const handleSubmit = async (e?: React.FormEvent, submitMode: 'SAVE_AND_PRINT' | 'SAVE_ONLY' = 'SAVE_AND_PRINT') => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage(isBn ? 'অনুদানের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' : 'Amount must be greater than zero.');
      return;
    }

    if (donorType === 'REGISTERED' && !selectedPersonId) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে একজন নিবন্ধিত মুসল্লি নির্বাচন করুন।' : 'Please select a registered musalli.');
      return;
    }

    if (paymentMethod === 'CASH' && denominationData && denominationData.grandTotal !== numAmount) {
      setErrorMessage(
        isBn
          ? `ক্যাশ ডিনোমিনেশন মোট টাকা (৳${denominationData.grandTotal.toLocaleString('en-IN')}) এবং প্রদত্ত অনুদানের পরিমাণ (৳${numAmount.toLocaleString('en-IN')}) সমান হতে হবে।`
          : 'Denomination total must match the donation amount.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        amount: numAmount,
        date: donationDate,
        category,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        reference: reference.trim() || undefined,
        description: description.trim() || undefined,
        collectionWorkerId: collectionWorkerId || undefined,
      };

      if (donorType === 'REGISTERED') {
        payload.personId = selectedPersonId;
        payload.donorName = selectedPerson?.name;
        payload.donorPhone = donorPhone || selectedPerson?.mobile || undefined;
        payload.isAnonymous = false;
        if (selectedPlanId) {
          payload.donationPlanId = selectedPlanId;
        }
        if (selectedPerson?.familyId) payload.familyId = selectedPerson.familyId;
        if (selectedPerson?.areaId) payload.areaId = selectedPerson.areaId;
      } else {
        payload.isAnonymous = !customDonorName.trim();
        payload.donorName = customDonorName.trim() ? customDonorName.trim() : 'আল্লাহর এক বান্দা (Anonymous)';
        payload.donorPhone = donorPhone.trim() || undefined;
        payload.donorEmail = donorEmail.trim() || undefined;
        payload.donorAddress = donorAddress.trim() || undefined;
        payload.personId = undefined;
        payload.donationPlanId = undefined;
      }

      if (paymentMethod === 'CASH' && denominationData && denominationData.grandTotal === numAmount) {
        payload.denominationData = denominationData;
      }

      await onSave(payload, submitMode);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || (isBn ? 'অনুদান সংরক্ষণ করতে ত্রুটি হয়েছে।' : 'Failed to record donation.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-emerald-100 shadow-2xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-siliguri leading-tight">
                {isBn ? 'নতুন অনুদান গ্রহণ ও মানি রিসিট প্রস্তুত' : 'Receive Donation & Issue Receipt'}
              </h2>
              <p className="text-xs text-emerald-100 font-tiro">
                {isBn
                  ? 'প্রকৃত আর্থিক হিসাব (লেজার ও ক্যাশ/ব্যাংক ফান্ডে সরাসরি সংযোজিত হবে)'
                  : 'Posts actual income to central financial ledger & cash/bank accounts'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={(e) => handleSubmit(e, 'SAVE_AND_PRINT')} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 font-siliguri text-slate-800 text-xs">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold leading-relaxed font-siliguri">{errorMessage}</div>
            </div>
          )}

          {/* Section 1: Donor Type Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              {isBn ? 'দাতার ধরন নির্বাচন করুন *' : 'Select Donor Type *'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDonorType('REGISTERED');
                  setErrorMessage('');
                }}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 transition-all font-bold ${
                  donorType === 'REGISTERED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className={`w-4 h-4 ${donorType === 'REGISTERED' ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{isBn ? 'নিবন্ধিত মুসল্লি / দাতা' : 'Registered Musalli'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDonorType('ANONYMOUS');
                  setSelectedPersonId('');
                  setSelectedPlanId('');
                  setErrorMessage('');
                }}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 transition-all font-bold ${
                  donorType === 'ANONYMOUS'
                    ? 'bg-teal-50 border-teal-500 text-teal-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserX className={`w-4 h-4 ${donorType === 'ANONYMOUS' ? 'text-teal-700' : 'text-slate-400'}`} />
                <span>{isBn ? 'সাধারণ / বেনামী দান' : 'General / Anonymous'}</span>
              </button>
            </div>
          </div>

          {/* Section 2A: Registered Musalli Search & Plan Link */}
          {donorType === 'REGISTERED' ? (
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isBn ? 'মুসল্লি / ব্যক্তি অনুসন্ধান ও নির্বাচন *' : 'Search & Select Musalli *'}
                </label>

                {selectedPerson ? (
                  <div className="bg-white border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-baloo font-bold text-xs">
                        {selectedPerson.personCode || 'MUS'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                          <span>{selectedPerson.name}</span>
                          {selectedPerson.isFamilyHead && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                              {isBn ? 'খানা প্রধান' : 'Head'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 font-baloo">
                          {selectedPerson.mobile && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{selectedPerson.mobile}</span>
                            </span>
                          )}
                          {personFamily && (
                            <span className="flex items-center space-x-1">
                              <Home className="w-3 h-3 text-slate-400" />
                              <span>{personFamily.name}</span>
                            </span>
                          )}
                          {personArea && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{personArea.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersonId('');
                        setSelectedPlanId('');
                        setIsSearchingPerson(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                    >
                      {isBn ? 'পরিবর্তন' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={isBn ? 'নাম, কোড (P-00001) বা মোবাইল নম্বর দিয়ে খুঁজুন...' : 'Search by name, ID or mobile...'}
                        value={personSearchQuery}
                        onChange={(e) => setPersonSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchingPerson(true)}
                        className="w-full pl-9.5 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                      />
                    </div>

                    {/* Person Suggestions Dropdown */}
                    {filteredPersons.length > 0 && (
                      <div className="mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                        {filteredPersons.map((p) => {
                          const f = families.find((fam) => fam.id === p.familyId);
                          const a = areas.find((ar) => ar.id === p.areaId || ar.id === f?.areaId);
                          return (
                            <div
                              key={p.id}
                              onClick={() => handleSelectPerson(p)}
                              className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center space-x-2.5">
                                <span className="font-baloo text-[11px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  {p.personCode}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-800 text-xs">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center space-x-2 font-baloo">
                                    {p.mobile && <span>{p.mobile}</span>}
                                    {f && <span>• {f.name}</span>}
                                    {a && <span>• {a.name}</span>}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 font-siliguri">
                                {isBn ? 'নির্বাচন' : 'Select'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Donation Plan Selection */}
              {selectedPerson && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isBn ? 'দান পরিকল্পনা (Donation Plan) লিঙ্কিং' : 'Link Donation Plan'}</span>
                  </label>

                  {personActivePlans.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div
                          onClick={() => handlePlanChange('')}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            !selectedPlanId
                              ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xs font-bold">{isBn ? 'প্ল্যান ছাড়া সাধারণ দান (Ad-hoc)' : 'Ad-hoc (No Plan Link)'}</div>
                          <div className="text-[10px] text-slate-500 font-tiro mt-0.5">
                            {isBn ? 'কোনো অঙ্গীকারের বাইরে অতিরিক্ত অনুদান' : 'Ad-hoc donation without pledge'}
                          </div>
                        </div>

                        {personActivePlans.map((plan) => {
                          const isSelected = selectedPlanId === plan.id;
                          const pAmt = plan.amount || plan.plannedAmount || 0;
                          return (
                            <div
                              key={plan.id}
                              onClick={() => handlePlanChange(plan.id)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-rose-50 border-rose-500 text-rose-900 font-bold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-baloo font-bold">{plan.planCode || 'PLAN'}</span>
                                <span className="font-baloo font-bold text-emerald-700">
                                  {isBn ? `৳ ${toBanglaNumber(formatCurrency(pAmt))}` : `৳${pAmt.toLocaleString()}`}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-siliguri flex items-center justify-between">
                                <span>
                                  {plan.planType === 'MONTHLY'
                                    ? isBn ? 'মাসিক অঙ্গীকার' : 'Monthly Pledge'
                                    : plan.planType === 'YEARLY'
                                    ? isBn ? 'বাৎসরিক অঙ্গীকার' : 'Yearly Pledge'
                                    : isBn ? 'অনিয়মিত প্ল্যান' : 'Irregular Plan'}
                                </span>
                                {isSelected && (
                                  <span className="text-rose-700 font-bold text-[10px] flex items-center space-x-0.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{isBn ? 'সংযুক্ত' : 'Linked'}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 text-[11px] flex items-center space-x-2">
                      <HeartHandshake className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {isBn
                          ? 'এই ব্যক্তির কোনো সক্রিয় নিয়মিত দান পরিকল্পনা (Donation Plan) নেই। এটি অ্যাড-হক (Ad-hoc) অনুদান হিসেবে অন্তর্ভুক্ত হবে।'
                          : 'No active donation plan found for this musalli. Will record as an ad-hoc donation.'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Section 2B: Anonymous / General Fields */
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBn ? 'দাতার নাম (ঐচ্ছিক)' : 'Donor Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBn ? 'খালি রাখলে "আল্লাহর এক বান্দা" সংরক্ষিত হবে' : 'Default: Anonymous'}
                    value={customDonorName}
                    onChange={(e) => setCustomDonorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBn ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile (Optional)'}
                  </label>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-baloo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'ঠিকানা / মন্তব্য (ঐচ্ছিক)' : 'Address / Note (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isBn ? 'গ্রাম/মহল্লা বা বিশেষ বিবরণ...' : 'Address details...'}
                  value={donorAddress}
                  onChange={(e) => setDonorAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* Section 3: Financial Details */}
          <div className="space-y-4 pt-1 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isBn ? 'আর্থিক তথ্য ও হিসাব খাত' : 'Financial Details & Accounts'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'অনুদানের পরিমাণ (টাকা) *' : 'Amount (BDT) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-baloo font-bold text-slate-400 text-sm">৳</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-800 font-baloo"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'অনুদানের তারিখ *' : 'Donation Date *'}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-baloo"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method & Target Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'পরিশোধের মাধ্যম (Payment Method) *' : 'Payment Method *'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                >
                  <option value="CASH">{isBn ? 'নগদ (Cash)' : 'Cash'}</option>
                  <option value="BANK_TRANSFER">{isBn ? 'ব্যাংক ট্রান্সফার / চেক' : 'Bank Transfer / Cheque'}</option>
                  <option value="BKASH">{isBn ? 'বিকাশ (bKash)' : 'bKash'}</option>
                  <option value="NAGAD">{isBn ? 'নগদ (Nagad)' : 'Nagad'}</option>
                  <option value="ROCKET">{isBn ? 'রকেট (Rocket)' : 'Rocket'}</option>
                  <option value="OTHER">{isBn ? 'অন্যান্য মাধ্যম' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'জমার ফান্ড / ব্যাংক অ্যাকাউন্ট *' : 'Target Account / Fund *'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameBn || acc.name} ({acc.accountNumber || acc.accountType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Worker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'অনুদানের খাত (Category) *' : 'Donation Category *'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Donation['category'])}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                >
                  <option value="GENERAL">{isBn ? 'সাধারণ ফান্ড অনুদান' : 'General Donation'}</option>
                  <option value="CONSTRUCTION">{isBn ? 'মসজিদ নির্মাণ ও উন্নয়ন ফান্ড' : 'Construction / Development'}</option>
                  <option value="WAQF">{isBn ? 'ওয়াকফ ও স্থায়ী সম্পদ ফান্ড' : 'Waqf'}</option>
                  <option value="CEMETERY">{isBn ? 'কবরস্থান সংরক্ষণ ফান্ড' : 'Cemetery Maintenance'}</option>
                  <option value="WUDU_KHANA">{isBn ? 'ওজুখানা ও ওয়াশরুম ফান্ড' : 'Wudu Khana'}</option>
                  <option value="MADRASA">{isBn ? 'মাদরাসা ও হেফজখানা ফান্ড' : 'Madrasa / Maktab'}</option>
                  <option value="SPECIAL_PROJECT">{isBn ? 'বিশেষ প্রজেক্ট' : 'Special Project'}</option>
                  <option value="OTHER">{isBn ? 'অন্যান্য খাত' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'সংগ্রহকারী ভলান্টিয়ার (ঐচ্ছিক)' : 'Collection Worker (Optional)'}
                </label>
                <select
                  value={collectionWorkerId}
                  onChange={(e) => setCollectionWorkerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold"
                >
                  <option value="">{isBn ? '-- সরাসরি মসজিদে জমা --' : '-- Direct Mosque Deposit --'}</option>
                  {collectionWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.workerCode || w.phone || 'Worker'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reference & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'রেফারেন্স / ট্রানজ্যাকশন আইডি (ঐচ্ছিক)' : 'Reference / TrxID (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isBn ? 'চেক নং, TrxID বা রশিদ রেফারেন্স' : 'Trx ID / Cheque No'}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-baloo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'বিবরণ / দোয়া উদ্দেশ্য (ঐচ্ছিক)' : 'Note / Blessing Intent (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isBn ? 'মরহুম পিতা-মাতার ঈসালে সওয়াব...' : 'Purpose or note...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            {/* Cash Denomination Calculator Trigger */}
            {paymentMethod === 'CASH' && (
              <div className="pt-2 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="font-bold text-slate-800 text-xs">{isBn ? 'নগদ টাকার নোট গণনা (Denomination)' : 'Cash Denomination'}</span>
                    {denominationData ? (
                      <span className="text-emerald-700 text-[11px] block font-baloo font-bold">
                        {isBn ? `গণনাকৃত মোট: ৳ ${toBanglaNumber(formatCurrency(denominationData.grandTotal))}` : `Counted Total: ৳${denominationData.grandTotal.toLocaleString()}`}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px] block">{isBn ? 'ঐচ্ছিক নোট ভাঙতি গণনা' : 'Optional note breakdown'}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {denominationData && (
                    <button
                      type="button"
                      onClick={() => setDenominationData(null)}
                      className="text-[11px] text-rose-600 hover:underline font-bold"
                    >
                      {isBn ? 'মুছে ফেলুন' : 'Clear'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDenominationModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors"
                  >
                    {denominationData ? (isBn ? 'সম্পাদন করুন' : 'Edit Count') : (isBn ? 'নোট হিসাব খুলুন' : 'Open Calculator')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors font-siliguri"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, 'SAVE_ONLY')}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors font-siliguri"
            >
              {isBn ? 'শুধু সংরক্ষণ করুন' : 'Save Only'}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, 'SAVE_AND_PRINT')}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 font-siliguri"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'
                  : isBn ? 'সংরক্ষণ ও রসিদ প্রিন্ট' : 'Save & Print Receipt'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Denomination Calculator Modal */}
      {isDenominationModalOpen && (
        <CashDenominationCalculatorModal
          isOpen={isDenominationModalOpen}
          initialData={denominationData || undefined}
          onClose={() => setIsDenominationModalOpen(false)}
          onSave={(data) => {
            setDenominationData(data);
            setAmount(String(data.grandTotal));
            setIsDenominationModalOpen(false);
          }}
          language={language}
        />
      )}
    </div>
  );
};

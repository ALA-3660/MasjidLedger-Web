import React, { useState, useEffect } from 'react';
import {
  X,
  HeartHandshake,
  User,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Search,
  Sparkles,
  HelpCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  MapPin,
  Home,
} from 'lucide-react';
import {
  DonationPlan,
  DonationPlanType,
  DonationPlanStatus,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  User as AuthUser,
} from '../../types';
import { Language, toBanglaNumber } from '../../lib/i18n';
import { api } from '../../lib/api';

interface DonationPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DonationPlan>) => Promise<void>;
  planToEdit?: DonationPlan | null;
  preselectedPersonId?: string;
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  collectionWorkers: CollectionWorker[];
  currentUser?: AuthUser | null;
  language?: Language;
}

export const DonationPlanFormModal: React.FC<DonationPlanFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  planToEdit,
  preselectedPersonId,
  persons,
  families,
  areas,
  collectionWorkers,
  currentUser,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  // Form states
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [planType, setPlanType] = useState<DonationPlanType>('MONTHLY');
  const [amount, setAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [collectionRequired, setCollectionRequired] = useState<boolean>(false);
  const [collectionWorkerId, setCollectionWorkerId] = useState<string>('');
  const [collectionDay, setCollectionDay] = useState<string>('');
  const [collectionNote, setCollectionNote] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<DonationPlanStatus>('ACTIVE');
  const [notes, setNotes] = useState<string>('');

  // Person search / picker states
  const [personSearchQuery, setPersonSearchQuery] = useState<string>('');
  const [isPersonPickerOpen, setIsPersonPickerOpen] = useState<boolean>(false);

  // Overlap advisory state
  const [overlapWarning, setOverlapWarning] = useState<{
    hasOverlappingPlan: boolean;
    reasons: string[];
    activePlans: DonationPlan[];
  }>({ hasOverlappingPlan: false, reasons: [], activePlans: [] });

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (planToEdit) {
        setSelectedPersonId(planToEdit.personId || '');
        setPlanType(planToEdit.planType || 'MONTHLY');
        setAmount(
          planToEdit.amount !== undefined
            ? String(planToEdit.amount)
            : planToEdit.plannedAmount !== undefined
            ? String(planToEdit.plannedAmount)
            : ''
        );
        setStartDate(planToEdit.startDate || new Date().toISOString().split('T')[0]);
        setEndDate(planToEdit.endDate || '');
        setCollectionRequired(Boolean(planToEdit.collectionRequired));
        setCollectionWorkerId(planToEdit.collectionWorkerId || '');
        setCollectionDay(planToEdit.collectionDay !== undefined ? String(planToEdit.collectionDay) : '');
        setCollectionNote(planToEdit.collectionNote || '');
        setDescription(planToEdit.description || '');
        setStatus(planToEdit.status || 'ACTIVE');
        setNotes(planToEdit.notes || '');
        setIsPersonPickerOpen(false);
      } else {
        const initialPid = preselectedPersonId || '';
        setSelectedPersonId(initialPid);
        setPlanType('MONTHLY');
        setAmount('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setCollectionRequired(false);
        setCollectionWorkerId('');
        setCollectionDay('');
        setCollectionNote('');
        setDescription('');
        setStatus('ACTIVE');
        setNotes('');
        setIsPersonPickerOpen(!initialPid);
      }
    }
  }, [isOpen, planToEdit, preselectedPersonId]);

  // Check overlap when personId or planType changes
  useEffect(() => {
    if (selectedPersonId && isOpen) {
      api
        .checkOverlapDonationPlan({
          personId: selectedPersonId,
          planType,
          excludeId: planToEdit?.id,
        })
        .then((res) => {
          setOverlapWarning(res);
        })
        .catch(() => {
          setOverlapWarning({ hasOverlappingPlan: false, reasons: [], activePlans: [] });
        });
    } else {
      setOverlapWarning({ hasOverlappingPlan: false, reasons: [], activePlans: [] });
    }
  }, [selectedPersonId, planType, planToEdit?.id, isOpen]);

  if (!isOpen) return null;

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);
  const selectedFamily = selectedPerson?.familyId ? families.find((f) => f.id === selectedPerson.familyId) : null;
  const selectedArea = selectedPerson?.areaId
    ? areas.find((a) => a.id === selectedPerson.areaId)
    : selectedFamily?.areaId
    ? areas.find((a) => a.id === selectedFamily.areaId)
    : null;

  // Filtered persons for picker
  const filteredPersons = persons.filter((p) => {
    if (!personSearchQuery.trim()) return true;
    const q = personSearchQuery.trim().toLowerCase();
    const nameMatch = p.fullName.toLowerCase().includes(q);
    const codeMatch = (p.personCode || '').toLowerCase().includes(q);
    const phoneMatch = (p.mobile || '').includes(q);
    const fatherMatch = (p.fatherOrHusbandName || '').toLowerCase().includes(q);
    return nameMatch || codeMatch || phoneMatch || fatherMatch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPersonId) {
      setError(isBn ? 'অনুগ্রহ করে একজন ব্যক্তি / মুসল্লি নির্বাচন করুন।' : 'Please select a musalli / person.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (planType !== 'NO_PLAN' && (isNaN(numAmount) || numAmount <= 0)) {
      setError(
        isBn
          ? 'পরিকল্পিত অনুদানের পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।'
          : 'Planned donation amount must be greater than zero.'
      );
      return;
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      setError(
        isBn
          ? 'সমাপ্তির তারিখ শুরুর তারিখের পূর্ববর্তী হতে পারে না।'
          : 'End date cannot be earlier than start date.'
      );
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<DonationPlan> = {
        personId: selectedPersonId,
        planType,
        amount: planType === 'NO_PLAN' ? 0 : numAmount,
        plannedAmount: planType === 'NO_PLAN' ? 0 : numAmount,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || undefined,
        collectionRequired,
        collectionWorkerId: collectionRequired && collectionWorkerId ? collectionWorkerId : undefined,
        collectionDay: collectionRequired && collectionDay.trim() ? collectionDay.trim() : undefined,
        collectionNote: collectionRequired && collectionNote.trim() ? collectionNote.trim() : undefined,
        description: description.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save donation plan:', err);
      setError(err.message || (isBn ? 'সংরক্ষণ করতে ব্যর্থ হয়েছে।' : 'Failed to save donation plan.'));
    } finally {
      setSaving(false);
    }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-siliguri">
                {planToEdit
                  ? isBn
                    ? 'দান পরিকল্পনা সংশোধন'
                    : 'Edit Donation Plan'
                  : isBn
                  ? 'নতুন নিয়মিত দান পরিকল্পনা'
                  : 'New Donation Plan'}
              </h2>
              <p className="text-xs text-emerald-100/90 font-tiro">
                {isBn
                  ? 'ব্যক্তি / মুসল্লির মাসিক বা বাৎসরিক অনুদান প্রতিশ্রুতি'
                  : 'Monthly or periodic donation commitment configuration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2 font-tiro animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Overlap Advisory Banner */}
          {overlapWarning.hasOverlappingPlan && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1 font-tiro">
              <div className="flex items-center space-x-2 font-bold font-siliguri text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{isBn ? 'সতর্কবার্তা: সক্রিয় পরিকল্পনা বিদ্যমান' : 'Notice: Active Plan Exists'}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-800">
                {overlapWarning.reasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 italic pt-1">
                {isBn
                  ? 'প্রয়োজনে পূর্বের পরিকল্পনা সমাপ্ত (COMPLETED) বা স্থগিত করে নতুন পরিকল্পনা তৈরি করতে পারেন।'
                  : 'You may complete or pause previous plans if setting up a replacement.'}
              </p>
            </div>
          )}

          {/* Step 1: Musalli / Person Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isBn ? 'ব্যক্তি / মুসল্লি নির্বাচন' : 'Select Musalli / Person'}</span>
                <span className="text-red-500">*</span>
              </label>
              {!planToEdit && selectedPerson && (
                <button
                  type="button"
                  onClick={() => setIsPersonPickerOpen(!isPersonPickerOpen)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 font-siliguri hover:underline cursor-pointer"
                >
                  {isPersonPickerOpen ? (isBn ? 'সংক্ষেপ করুন' : 'Collapse') : (isBn ? 'পরিবর্তন করুন ➔' : 'Change ➔')}
                </button>
              )}
            </div>

            {/* Selected Person Card */}
            {selectedPerson ? (
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 font-baloo">
                    {selectedPerson.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900 font-siliguri truncate">
                        {selectedPerson.fullName}
                      </h4>
                      <span className="bg-white text-emerald-800 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 font-baloo font-bold">
                        {selectedPerson.personCode}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-tiro mt-0.5">
                      {selectedPerson.mobile && <span>📱 {selectedPerson.mobile}</span>}
                      {selectedFamily && <span>🏠 {selectedFamily.name}</span>}
                      {selectedArea && <span>📍 {selectedArea.name}</span>}
                    </div>
                  </div>
                </div>

                {!planToEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPersonId('');
                      setIsPersonPickerOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                    title={isBn ? 'মুসল্লি পরিবর্তন' : 'Change Person'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : null}

            {/* Person Search Picker (If not selected or changing) */}
            {(!selectedPerson || isPersonPickerOpen) && !planToEdit && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isBn ? 'নাম, কোড বা মোবাইল নম্বর দিয়ে খুঁজুন...' : 'Search by name, code or mobile...'}
                    value={personSearchQuery}
                    onChange={(e) => setPersonSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-tiro text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-lg bg-white p-1 divide-y divide-slate-100">
                  {filteredPersons.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-tiro">
                      {isBn ? 'কোনো ব্যক্তি / মুসল্লি পাওয়া যায়নি' : 'No musalli found'}
                    </div>
                  ) : (
                    filteredPersons.slice(0, 30).map((p) => {
                      const fam = p.familyId ? families.find((f) => f.id === p.familyId) : null;
                      const ar = p.areaId ? areas.find((a) => a.id === p.areaId) : fam?.areaId ? areas.find((a) => a.id === fam.areaId) : null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPersonId(p.id);
                            setIsPersonPickerOpen(false);
                          }}
                          className="w-full text-left p-2 hover:bg-emerald-50 rounded-md transition-colors flex items-center justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 font-siliguri">
                              {p.fullName} <span className="text-[11px] font-normal text-slate-500 font-baloo">({p.personCode})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-tiro">
                              {p.mobile ? `📱 ${p.mobile}` : ''} {fam ? `• 🏠 ${fam.name}` : ''} {ar ? `• 📍 ${ar.name}` : ''}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 opacity-0 group-hover:opacity-100 font-siliguri">
                            {isBn ? 'নির্বাচন ➔' : 'Select ➔'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Plan Specifications (Type & Amount) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
            {/* Plan Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'পরিকল্পনার ধরন' : 'Plan Frequency'} <span className="text-red-500">*</span>
              </label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value as DonationPlanType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="MONTHLY">{isBn ? '📅 মাসিক অনুদান (Monthly)' : 'Monthly'}</option>
                <option value="YEARLY">{isBn ? '🗓️ বাৎসরিক অনুদান (Yearly)' : 'Yearly'}</option>
                <option value="IRREGULAR">{isBn ? '✨ অনিয়মিত / যখন সুবিধাজনক (Irregular)' : 'Irregular'}</option>
                <option value="NO_PLAN">{isBn ? '❌ কোনো নির্দিষ্ট পরিকল্পনা নেই' : 'No Fixed Plan'}</option>
              </select>
            </div>

            {/* Planned Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'পরিকল্পিত অনুদানের পরিমাণ (টাকা)' : 'Planned Amount (BDT)'}{' '}
                {planType !== 'NO_PLAN' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-baloo text-sm">
                  ৳
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="any"
                  disabled={planType === 'NO_PLAN'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              {/* Quick Amount Suggestion Chips */}
              {planType !== 'NO_PLAN' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 rounded-md text-[10px] font-bold font-baloo transition-colors cursor-pointer"
                    >
                      ৳{isBn ? toBanglaNumber(amt) : amt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{isBn ? 'পরিকল্পনা শুরুর তারিখ' : 'Start Date'}</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{isBn ? 'সমাপ্তির তারিখ (ঐচ্ছিক)' : 'End Date (Optional)'}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Step 3: Collection Settings */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 font-siliguri">
                  {isBn ? '🚚 কালেকশন প্রতিনিধি ও সংগৃহীত মাধ্যম' : 'Collection Worker Assignment'}
                </h4>
                <p className="text-[11px] text-slate-500 font-tiro">
                  {isBn
                    ? 'মসজিদের ভলান্টিয়ার বা প্রতিনিধি দ্বারা চাঁদা সংগ্রহ করা হবে কি না'
                    : 'Field collection representative assignment and schedule'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectionRequired}
                  onChange={(e) => setCollectionRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {collectionRequired && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 animate-fadeIn">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 font-siliguri">
                    {isBn ? 'দায়িত্বপ্রাপ্ত সংগ্রহকারী' : 'Assigned Worker'}
                  </label>
                  <select
                    value={collectionWorkerId}
                    onChange={(e) => setCollectionWorkerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-siliguri text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">{isBn ? '-- কোনো সংগ্রহকারী নির্ধারিত নেই --' : '-- None Assigned --'}</option>
                    {collectionWorkers
                      .filter((w) => w.status === 'ACTIVE')
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.mobile ? `(${w.mobile})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 font-siliguri">
                    {isBn ? 'সংগ্রহের দিন / রুটিন' : 'Collection Day / Schedule'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBn ? 'যেমন: প্রতি মাসের ৫ তারিখ, শুক্রবার' : 'e.g. 5th of month, Fridays'}
                    value={collectionDay}
                    onChange={(e) => setCollectionDay(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-tiro text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 font-siliguri">
                    {isBn ? 'সংগ্রহের বিশেষ নির্দেশনা' : 'Collection Special Note'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBn ? 'যেমন: আসরের পর বাসায় গিয়ে রসিদসহ গ্রহণ করতে হবে' : 'e.g. Visit home after Asr'}
                    value={collectionNote}
                    onChange={(e) => setCollectionNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-tiro text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status & General Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'পরিকল্পনার স্ট্যাটাস' : 'Plan Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DonationPlanStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              >
                <option value="ACTIVE">{isBn ? '🟢 সক্রিয় (Active)' : 'Active'}</option>
                <option value="PAUSED">{isBn ? '⏸️ সাময়িক স্থগিত (Paused)' : 'Paused'}</option>
                <option value="COMPLETED">{isBn ? '✅ সম্পন্ন (Completed)' : 'Completed'}</option>
                <option value="CANCELLED">{isBn ? '❌ বাতিল (Cancelled)' : 'Cancelled'}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'বিবরণ / উদ্দেশ্য (ঐচ্ছিক)' : 'Description / Purpose'}
              </label>
              <input
                type="text"
                placeholder={isBn ? 'যেমন: মসজিদের সাধারণ তহবিল / ওয়াকফ পরিচালনা' : 'e.g. Mosque General Fund'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'অভ্যন্তরীণ মন্তব্য (Notes)' : 'Internal Notes'}
            </label>
            <textarea
              rows={2}
              placeholder={isBn ? 'প্রশাসনিক কোনো মন্তব্য থাকলে লিখুন...' : 'Internal administrative notes...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-800 focus:bg-white focus:outline-hidden focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Legal / Financial Integrity Disclaimer */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-[11px] text-slate-600 font-tiro leading-relaxed">
              <span className="font-bold text-slate-800 font-siliguri">
                {isBn ? 'আর্থিক স্বচ্ছতা ও নীতিমালার নিশ্চয়তা: ' : 'Financial Integrity Rule: '}
              </span>
              {isBn
                ? 'এটি শুধুমাত্র একটি অনুদান পরিকল্পনা। এটি সংরক্ষণ করলে মসজিদের অ্যাকাউন্টিং খতিয়ানে কোনো আয় বা স্বয়ংক্রিয় বকেয়া তৈরি হবে না। প্রকৃত অনুদান প্রাপ্তির পর সাধারণ দান মডিউলে জমা করতে হবে।'
                : 'This is purely a planned donation pledge. Saving this will not create income vouchers or financial receivables.'}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer disabled:opacity-50"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold font-siliguri shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{planToEdit ? (isBn ? 'আপডেট করুন' : 'Update Plan') : (isBn ? 'পরিকল্পনা সংরক্ষণ' : 'Save Plan')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

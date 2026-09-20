import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Inbox,
  HeartHandshake,
  User,
  Home,
  MapPin,
  Calendar,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  Coins,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  DonationCollection,
  DonationPlan,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  CollectionStatus,
} from '../../types';
import { Language, toBanglaNumber, formatDate } from '../../lib/i18n';

interface DonationCollectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DonationCollection>) => Promise<void>;
  collectionToEdit?: DonationCollection | null;
  plans: DonationPlan[];
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  collectionWorkers: CollectionWorker[];
  language?: Language;
}

export const DonationCollectionFormModal: React.FC<DonationCollectionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  collectionToEdit,
  plans,
  persons,
  families,
  areas,
  collectionWorkers,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const isEdit = !!collectionToEdit;

  // Form states
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [collectionPeriod, setCollectionPeriod] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [collectionWorkerId, setCollectionWorkerId] = useState<string>('');
  const [collectionNote, setCollectionNote] = useState<string>('');
  const [workerNote, setWorkerNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Active plans only for new selection
  const selectablePlans = useMemo(() => {
    return plans.filter((p) => p.status === 'ACTIVE' || (collectionToEdit && p.id === collectionToEdit.donationPlanId));
  }, [plans, collectionToEdit]);

  // Current selected plan entity
  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId) || null;
  }, [selectedPlanId, plans]);

  // Auto-resolved Person
  const resolvedPerson = useMemo(() => {
    if (!selectedPlan) return null;
    return persons.find((p) => p.id === selectedPlan.personId) || null;
  }, [selectedPlan, persons]);

  // Auto-resolved Family
  const resolvedFamily = useMemo(() => {
    if (resolvedPerson?.familyId) {
      return families.find((f) => f.id === resolvedPerson.familyId) || null;
    }
    return null;
  }, [resolvedPerson, families]);

  // Auto-resolved Area
  const resolvedArea = useMemo(() => {
    const areaId = resolvedPerson?.areaId || resolvedFamily?.areaId;
    if (areaId) {
      return areas.find((a) => a.id === areaId) || null;
    }
    return null;
  }, [resolvedPerson, resolvedFamily, areas]);

  // Helper for current Bangla month period
  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const monthsBn = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    return `${monthsBn[now.getMonth()]} ${toBanglaNumber(now.getFullYear())}`;
  };

  // Populate data when editing or opening
  useEffect(() => {
    if (isOpen) {
      setError('');
      if (collectionToEdit) {
        setSelectedPlanId(collectionToEdit.donationPlanId);
        setCollectionPeriod(collectionToEdit.collectionPeriod || '');
        setScheduledDate(collectionToEdit.scheduledDate || '');
        setCollectionWorkerId(collectionToEdit.collectionWorkerId || '');
        setCollectionNote(collectionToEdit.collectionNote || '');
        setWorkerNote(collectionToEdit.workerNote || '');
      } else {
        setSelectedPlanId('');
        setCollectionPeriod(getCurrentMonthPeriod());
        const today = new Date().toISOString().split('T')[0];
        setScheduledDate(today);
        setCollectionWorkerId('');
        setCollectionNote('');
        setWorkerNote('');
      }
    }
  }, [isOpen, collectionToEdit]);

  // When plan changes, auto-set default worker if plan has one
  useEffect(() => {
    if (!collectionToEdit && selectedPlan) {
      if (selectedPlan.collectionWorkerId && !collectionWorkerId) {
        setCollectionWorkerId(selectedPlan.collectionWorkerId);
      }
    }
  }, [selectedPlan, collectionToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPlanId) {
      setError(isBn ? 'অনুগ্রহ করে একটি দান পরিকল্পনা নির্বাচন করুন' : 'Please select a donation plan');
      return;
    }

    if (!collectionPeriod.trim()) {
      setError(isBn ? 'সংগ্রহের সময়কাল প্রদান করুন (যেমন: সেপ্টেম্বর ২০২৬)' : 'Please enter collection period');
      return;
    }

    try {
      setSaving(true);
      const plannedAmount = selectedPlan?.plannedAmount ?? selectedPlan?.amount ?? 0;

      const payload: Partial<DonationCollection> = {
        donationPlanId: selectedPlanId,
        personId: resolvedPerson?.id || selectedPlan?.personId,
        familyId: resolvedFamily?.id || resolvedPerson?.familyId,
        areaId: resolvedArea?.id || resolvedPerson?.areaId,
        collectionPeriod: collectionPeriod.trim(),
        scheduledDate: scheduledDate || undefined,
        collectionWorkerId: collectionWorkerId || undefined,
        collectionNote: collectionNote.trim() || undefined,
        workerNote: workerNote.trim() || undefined,
        plannedAmount: plannedAmount,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Error saving donation collection:', err);
      setError(err.message || (isBn ? 'সংগ্রহ কার্যক্রম সংরক্ষণ করতে ব্যর্থ হয়েছে' : 'Failed to save collection'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-800 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Inbox className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-siliguri leading-tight">
                {isEdit
                  ? isBn
                    ? 'সংগ্রহ কার্যক্রম সম্পাদনা'
                    : 'Edit Donation Collection'
                  : isBn
                  ? 'নতুন অনুদান সংগ্রহ কার্যক্রম'
                  : 'New Donation Collection'}
              </h2>
              <p className="text-xs text-emerald-200/80 font-tiro">
                {isBn
                  ? 'পরিকল্পনা ভিত্তিক সময়সূচি ও সংগ্রহকারী নির্ধারণ'
                  : 'Plan-first operational collection scheduling'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-800 text-xs font-tiro">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Plan-First Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? '১. অনুদান পরিকল্পনা নির্বাচন করুন *' : '1. Select Donation Plan *'}
            </label>
            <div className="relative">
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                disabled={isEdit}
                required
                className={`w-full px-3.5 py-2.5 bg-slate-50 border ${
                  selectedPlanId ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300'
                } rounded-xl text-xs font-baloo text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500`}
              >
                <option value="">{isBn ? '-- সক্রিয় দান পরিকল্পনা বাছাই করুন --' : '-- Choose Active Donation Plan --'}</option>
                {selectablePlans.map((p) => {
                  const person = persons.find((per) => per.id === p.personId);
                  const amt = p.plannedAmount ?? p.amount ?? 0;
                  const typeLabel =
                    p.planType === 'MONTHLY' ? (isBn ? 'মাসিক' : 'Monthly') :
                    p.planType === 'YEARLY' ? (isBn ? 'বাৎসরিক' : 'Yearly') :
                    p.planType === 'WEEKLY' ? (isBn ? 'সাপ্তাহিক' : 'Weekly') :
                    (isBn ? 'এককালীন' : 'One-time');

                  return (
                    <option key={p.id} value={p.id}>
                      {p.id} — {person?.fullName || p.personId} ({typeLabel}: ৳{toBanglaNumber(amt)})
                    </option>
                  );
                })}
              </select>
            </div>
            {isEdit && (
              <p className="text-[11px] text-slate-500 font-tiro">
                {isBn ? 'ℹ️ সম্পাদিত সংগ্রহের মূল পরিকল্পনা পরিবর্তনযোগ্য নয়।' : 'ℹ️ Associated plan is locked during edit.'}
              </p>
            )}
          </div>

          {/* Auto-resolved Relational Summary Card */}
          {selectedPlan && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 border-b border-emerald-200/60 pb-2">
                <span className="flex items-center space-x-1.5 font-siliguri">
                  <HeartHandshake className="w-4 h-4 text-emerald-700" />
                  <span>{isBn ? 'পরিকল্পনা থেকে স্বয়ংক্রিয় তথ্য' : 'Auto-Resolved Details'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-baloo font-bold">
                  {selectedPlan.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-tiro">
                {/* Person */}
                <div className="flex items-start space-x-2">
                  <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isBn ? 'ব্যক্তি / মুসল্লি:' : 'Musalli:'}</span>
                    <span className="font-bold text-slate-800 font-siliguri">
                      {resolvedPerson?.fullName || selectedPlan.personId}
                    </span>
                    {resolvedPerson?.mobile && (
                      <span className="text-[11px] text-slate-500 block font-baloo">
                        {toBanglaNumber(resolvedPerson.mobile)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Planned Amount */}
                <div className="flex items-start space-x-2">
                  <Coins className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isBn ? 'পরিকল্পিত পরিমাণ:' : 'Planned Amount:'}</span>
                    <span className="font-bold text-emerald-800 text-sm font-baloo">
                      ৳{toBanglaNumber(selectedPlan.plannedAmount ?? selectedPlan.amount ?? 0)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1 font-tiro">
                      ({selectedPlan.planType === 'MONTHLY' ? (isBn ? 'মাসিক' : 'Monthly') : (isBn ? 'বাৎসরিক' : 'Yearly')})
                    </span>
                  </div>
                </div>

                {/* Family */}
                <div className="flex items-start space-x-2">
                  <Home className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isBn ? 'পরিবার:' : 'Family:'}</span>
                    <span className="font-medium text-slate-800 font-siliguri">
                      {resolvedFamily?.name || (isBn ? 'নির্ধারিত নেই' : 'N/A')}
                    </span>
                  </div>
                </div>

                {/* Area */}
                <div className="flex items-start space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isBn ? 'এলাকা / মহল্লা:' : 'Area:'}</span>
                    <span className="font-medium text-slate-800 font-siliguri">
                      {resolvedArea?.name || (isBn ? 'নির্ধারিত নেই' : 'N/A')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Collection Period */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'সংগ্রহের সময়কাল *' : 'Collection Period *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={collectionPeriod}
                  onChange={(e) => setCollectionPeriod(e.target.value)}
                  placeholder={isBn ? 'যেমন: সেপ্টেম্বর ২০২৬ বা 2026-09' : 'e.g. September 2026 or 2026-09'}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-baloo text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-tiro">
                {isBn ? 'একই পরিকল্পনা ও মেয়াদে ডুপ্লিকেট রোধ করা হবে' : 'Duplicate per plan + period is prevented'}
              </p>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'নির্ধারিত সংগ্রহের তারিখ' : 'Scheduled Date'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-baloo text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Collection Worker Assignment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'সংগ্রহকারী নির্ধারণ (ঐচ্ছিক)' : 'Assign Collection Worker (Optional)'}
            </label>
            <div className="relative">
              <select
                value={collectionWorkerId}
                onChange={(e) => setCollectionWorkerId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-baloo text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{isBn ? '-- কোনো সংগ্রহকারী নির্ধারিত নেই --' : '-- No Worker Assigned --'}</option>
                {collectionWorkers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.mobile ? `(${toBanglaNumber(w.mobile)})` : ''} {w.status === 'INACTIVE' ? (isBn ? '[নিষ্ক্রিয়]' : '[Inactive]') : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'সংগ্রহের নোট (অফিস)' : 'Collection Note'}
              </label>
              <textarea
                value={collectionNote}
                onChange={(e) => setCollectionNote(e.target.value)}
                rows={2}
                placeholder={isBn ? 'বিশেষ নির্দেশনা বা মন্তব্য...' : 'Office instructions...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-tiro text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'সংগ্রহকারীর নোট (মাঠ)' : 'Worker Note'}
              </label>
              <textarea
                value={workerNote}
                onChange={(e) => setWorkerNote(e.target.value)}
                rows={2}
                placeholder={isBn ? 'মাঠ পর্যায়ের পর্যবেক্ষণ বা মন্তব্য...' : 'Field worker note...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-tiro text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Safety & Non-Financial Notice */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-start space-x-2 text-amber-900 text-xs font-tiro">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold font-siliguri">
                {isBn ? 'অপারেশনাল ট্র্যাকিং নিশ্চয়তা:' : 'Operational Tracking:'}
              </span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {isBn
                  ? 'সংগ্রহ কার্যক্রম তৈরি বা সময়সূচি নির্ধারণের মাধ্যমে ক্যাশ বা ব্যাংক ব্যালেন্সে কোনো পোস্টিং হবে না। দান গ্রহণের পর আসল অনুদান ভাউচার স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।'
                  : 'Creating a collection schedule does not impact cash or bank balances. Actual funds will be posted in B5 Actual Donations.'}
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors font-siliguri"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition-colors font-siliguri shadow-sm inline-flex items-center space-x-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {saving
                ? isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'
                : isEdit
                ? isBn ? 'হালনাগাদ সম্পন্ন করুন' : 'Update Collection'
                : isBn ? 'সংগ্রহ কার্যক্রম সংরক্ষণ' : 'Save Collection'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

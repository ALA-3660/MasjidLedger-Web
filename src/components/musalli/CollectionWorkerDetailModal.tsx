import React, { useState } from 'react';
import {
  X,
  Briefcase,
  UserCheck,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Edit2,
  UserCog,
  Building,
  Users,
  Search,
  Check,
  Send,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  CollectionWorker,
  DonationCollection,
  AreaMaster,
  PersonMaster,
  DonationPlan,
  Donation,
} from '../../types';
import { Language, toBanglaNumber } from '../../lib/i18n';

const formatCurrency = (amount: number = 0, isBn: boolean = true) => {
  const formatted = Math.round(amount).toLocaleString('en-IN');
  return isBn ? `৳${toBanglaNumber(formatted)}` : `৳${formatted}`;
};

interface CollectionWorkerDetailModalProps {
  isOpen: boolean;
  worker: CollectionWorker | null;
  collections: DonationCollection[];
  plans: DonationPlan[];
  persons: PersonMaster[];
  areas: AreaMaster[];
  donations: Donation[];
  language?: Language;
  onClose: () => void;
  onEdit: (worker: CollectionWorker) => void;
  onToggleStatus: (worker: CollectionWorker) => void;
  onCollectDonation: (collection: DonationCollection) => void;
  onViewCollectionDetail?: (collection: DonationCollection) => void;
}

export const CollectionWorkerDetailModal: React.FC<CollectionWorkerDetailModalProps> = ({
  isOpen,
  worker,
  collections,
  plans,
  persons,
  areas,
  donations,
  language = 'bn',
  onClose,
  onEdit,
  onToggleStatus,
  onCollectDonation,
  onViewCollectionDetail,
}) => {
  const isBn = language === 'bn';
  const [collectionFilter, setCollectionFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'COLLECTED' | 'NOT_COLLECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !worker) return null;

  // Filter collections assigned to this worker
  const workerCollections = collections.filter((c) => c.collectionWorkerId === worker.id);

  // Derived metrics for this worker
  const totalAssignedCount = workerCollections.length;
  const pendingCount = workerCollections.filter((c) => c.status === 'PENDING' || c.status === 'SCHEDULED').length;
  const partialCount = workerCollections.filter((c) => c.status === 'PARTIALLY_COLLECTED').length;
  const collectedCount = workerCollections.filter((c) => c.status === 'COLLECTED').length;
  const notCollectedCount = workerCollections.filter((c) => c.status === 'NOT_COLLECTED').length;

  const totalPlannedAmount = workerCollections.reduce((sum, c) => sum + (c.plannedAmount || 0), 0);
  const totalCollectedAmount = workerCollections.reduce((sum, c) => sum + (c.collectedAmount || 0), 0);
  const remainingAmount = Math.max(0, totalPlannedAmount - totalCollectedAmount);

  // Today's assigned tasks
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = workerCollections.filter((c) => {
    return c.scheduledDate === todayStr && c.status !== 'COLLECTED' && c.status !== 'CANCELLED';
  });

  // Assigned areas names
  const assignedAreas = (worker.areaIds || [])
    .map((aId) => areas.find((a) => a.id === aId))
    .filter(Boolean) as AreaMaster[];

  // Identity source resolution
  const linkedPerson = worker.personId ? persons.find((p) => p.id === worker.personId) : null;

  // Filtered collections inside modal
  const filteredCollections = workerCollections.filter((c) => {
    // Status Filter
    if (collectionFilter === 'PENDING') {
      if (c.status !== 'PENDING' && c.status !== 'SCHEDULED') return false;
    } else if (collectionFilter === 'PARTIAL') {
      if (c.status !== 'PARTIALLY_COLLECTED') return false;
    } else if (collectionFilter === 'COLLECTED') {
      if (c.status !== 'COLLECTED') return false;
    } else if (collectionFilter === 'NOT_COLLECTED') {
      if (c.status !== 'NOT_COLLECTED') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const personName = (c.personNameBn || '').toLowerCase();
      const code = (c.collectionCode || '').toLowerCase();
      const period = (c.periodName || c.collectionPeriod || '').toLowerCase();
      const area = (c.areaNameBn || '').toLowerCase();
      if (!personName.includes(q) && !code.includes(q) && !period.includes(q) && !area.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-siliguri">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {isBn ? 'সংগৃহীত' : 'Collected'}
          </span>
        );
      case 'PARTIALLY_COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-siliguri">
            <Clock className="w-3 h-3 mr-1" />
            {isBn ? 'আংশিক সংগৃহীত' : 'Partial'}
          </span>
        );
      case 'PENDING':
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-siliguri">
            <Clock className="w-3 h-3 mr-1" />
            {isBn ? 'অপেক্ষমাণ' : 'Pending'}
          </span>
        );
      case 'NOT_COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 font-siliguri">
            <AlertCircle className="w-3 h-3 mr-1" />
            {isBn ? 'সংগ্রহ হয়নি' : 'Not Collected'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-siliguri">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-emerald-800 via-teal-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20 font-baloo text-xl font-bold">
              {worker.name ? worker.name.charAt(0) : 'ক'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold font-siliguri leading-snug">{worker.name}</h2>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-siliguri font-bold ${
                    worker.status === 'ACTIVE'
                      ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                      : 'bg-rose-400/20 text-rose-200 border border-rose-400/30'
                  }`}
                >
                  {worker.status === 'ACTIVE'
                    ? isBn
                      ? 'সক্রিয় কর্মী'
                      : 'Active Worker'
                    : isBn
                    ? 'নিষ্ক্রিয়'
                    : 'Inactive'}
                </span>
                {worker.personId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/15 text-white/90 font-siliguri">
                    {isBn ? '👤 মুসল্লি' : 'Musalli'}
                  </span>
                )}
                {worker.staffId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-400/30 text-blue-100 font-siliguri">
                    {isBn ? '👔 স্টাফ' : 'Staff'}
                  </span>
                )}
                {worker.committeeMemberId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-400/30 text-teal-100 font-siliguri">
                    {isBn ? '🏛️ কমিটি' : 'Committee'}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-xs text-emerald-100/90 font-tiro mt-0.5">
                {worker.mobile && (
                  <a
                    href={`tel:${worker.mobile}`}
                    className="flex items-center space-x-1 hover:underline text-emerald-200"
                  >
                    <Phone className="w-3 h-3" />
                    <span className="font-baloo">{worker.mobile}</span>
                  </a>
                )}
                <span className="text-white/60">•</span>
                <span>
                  {isBn ? 'আইডি: ' : 'ID: '}
                  <span className="font-baloo">{worker.id}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onEdit(worker)}
              className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isBn ? 'সম্পাদনা করুন' : 'Edit Worker'}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. Operational Stats Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-medium text-slate-500 font-tiro">
                {isBn ? 'মোট নির্ধারিত' : 'Total Assigned'}
              </div>
              <div className="text-base font-bold text-slate-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(totalAssignedCount) : totalAssignedCount}
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <div className="text-[11px] font-medium text-blue-700 font-tiro">
                {isBn ? 'অপেক্ষমাণ' : 'Pending'}
              </div>
              <div className="text-base font-bold text-blue-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(pendingCount) : pendingCount}
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <div className="text-[11px] font-medium text-amber-700 font-tiro">
                {isBn ? 'আংশিক সংগৃহীত' : 'Partial'}
              </div>
              <div className="text-base font-bold text-amber-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(partialCount) : partialCount}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="text-[11px] font-medium text-emerald-700 font-tiro">
                {isBn ? 'সংগৃহীত' : 'Collected'}
              </div>
              <div className="text-base font-bold text-emerald-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(collectedCount) : collectedCount}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[11px] font-medium text-slate-500 font-tiro">
                {isBn ? 'পরিকল্পিত টাকা' : 'Planned (Tk)'}
              </div>
              <div className="text-sm font-bold text-slate-900 font-baloo mt-0.5">
                {formatCurrency(totalPlannedAmount, isBn)}
              </div>
            </div>

            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
              <div className="text-[11px] font-medium text-teal-800 font-tiro">
                {isBn ? 'আদায়কৃত টাকা' : 'Collected (Tk)'}
              </div>
              <div className="text-sm font-bold text-teal-950 font-baloo mt-0.5">
                {formatCurrency(totalCollectedAmount, isBn)}
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
              <div className="text-[11px] font-medium text-rose-700 font-tiro">
                {isBn ? 'অবশিষ্ট সংগৃহীতব্য' : 'Remaining'}
              </div>
              <div className="text-sm font-bold text-rose-900 font-baloo mt-0.5">
                {formatCurrency(remainingAmount, isBn)}
              </div>
            </div>
          </div>

          {/* 2. Responsibilities & Assigned Areas */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 font-siliguri">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>{isBn ? 'দায়িত্বপ্রাপ্ত এলাকা / মহল্লা সমূহ:' : 'Assigned Areas:'}</span>
              </div>
              <div className="text-xs text-slate-500 font-tiro">
                {isBn
                  ? `মোট এলাকা: ${toBanglaNumber(assignedAreas.length)} টি`
                  : `Total Areas: ${assignedAreas.length}`}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {assignedAreas.length === 0 ? (
                <span className="text-xs text-slate-400 font-tiro">
                  {isBn
                    ? 'কোনো নির্দিষ্ট এলাকা নির্ধারিত নেই (সার্বজনীন)'
                    : 'No specific areas assigned'}
                </span>
              ) : (
                assignedAreas.map((area) => (
                  <span
                    key={area.id}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-siliguri font-medium shadow-2xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{area.name}</span>
                    {area.areaCode && (
                      <span className="text-[10px] text-slate-400 font-baloo">({area.areaCode})</span>
                    )}
                  </span>
                ))
              )}
            </div>

            {worker.notes && (
              <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 font-tiro">
                <span className="font-semibold font-siliguri text-slate-700">
                  {isBn ? 'রুট ও বিশেষ নোট: ' : 'Route Note: '}
                </span>
                {worker.notes}
              </div>
            )}
          </div>

          {/* 3. Assigned Collections Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900 font-siliguri">
                  {isBn ? 'নির্ধারিত সংগ্রহ কার্যক্রমের তালিকা' : 'Assigned Collection Tasks'}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full font-baloo">
                  {isBn ? toBanglaNumber(filteredCollections.length) : filteredCollections.length}
                </span>
              </div>

              {/* Status Filter & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isBn ? 'দাতা/কোড দিয়ে খুঁজুন...' : 'Search musalli...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-tiro text-slate-700 focus:outline-hidden focus:border-emerald-500 w-36 sm:w-44"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-siliguri">
                  <button
                    type="button"
                    onClick={() => setCollectionFilter('ALL')}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      collectionFilter === 'ALL'
                        ? 'bg-white text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? 'সব' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionFilter('PENDING')}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      collectionFilter === 'PENDING'
                        ? 'bg-white text-blue-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionFilter('PARTIAL')}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      collectionFilter === 'PARTIAL'
                        ? 'bg-white text-amber-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? 'আংশিক' : 'Partial'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionFilter('COLLECTED')}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      collectionFilter === 'COLLECTED'
                        ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isBn ? 'সংগৃহীত' : 'Collected'}
                  </button>
                </div>
              </div>
            </div>

            {/* Collection List Container */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {filteredCollections.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-tiro">
                  {isBn
                    ? 'এই ফিল্টারে কোনো অনুদান সংগ্রহ পাওয়া যায়নি।'
                    : 'No collection records found for this filter.'}
                </div>
              ) : (
                filteredCollections.map((col) => {
                  const isFullyCollected = col.status === 'COLLECTED';
                  const remainingCol = Math.max(0, (col.plannedAmount || 0) - (col.collectedAmount || 0));

                  return (
                    <div
                      key={col.id}
                      className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 font-siliguri">
                            {col.personNameBn || 'দাতা'}
                          </span>
                          {col.personCode && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md font-baloo">
                              {col.personCode}
                            </span>
                          )}
                          {getStatusBadge(col.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-tiro">
                          <span className="text-emerald-800 font-medium">
                            {isBn ? 'পিরিয়ড: ' : 'Period: '}
                            <span className="font-baloo">{col.periodName || col.collectionPeriod}</span>
                          </span>
                          {col.areaNameBn && (
                            <span>
                              {isBn ? 'এলাকা: ' : 'Area: '}
                              <span className="font-siliguri">{col.areaNameBn}</span>
                            </span>
                          )}
                          {col.scheduledDate && (
                            <span className="flex items-center space-x-1 text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span className="font-baloo">{col.scheduledDate}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amounts & Action */}
                      <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 font-tiro">
                            {isBn ? 'পরিকল্পিত: ' : 'Planned: '}
                            <span className="font-bold text-slate-800 font-baloo">
                              {formatCurrency(col.plannedAmount, isBn)}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-emerald-700 font-baloo">
                            {isBn ? 'সংগৃহীত: ' : 'Collected: '}
                            {formatCurrency(col.collectedAmount || 0, isBn)}
                          </div>
                        </div>

                        {/* Action Trigger */}
                        {!isFullyCollected && col.status !== 'CANCELLED' ? (
                          <button
                            type="button"
                            onClick={() => onCollectDonation(col)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-siliguri font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{isBn ? 'সংগ্রহ করুন' : 'Collect'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-siliguri">
                            {isBn ? 'সম্পন্ন' : 'Completed'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => onToggleStatus(worker)}
            className={`px-3 py-1.5 rounded-lg text-xs font-siliguri font-semibold transition-colors cursor-pointer ${
              worker.status === 'ACTIVE'
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            {worker.status === 'ACTIVE'
              ? isBn
                ? 'নিষ্ক্রিয় করুন'
                : 'Deactivate'
              : isBn
              ? 'সক্রিয় করুন'
              : 'Activate'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-siliguri font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

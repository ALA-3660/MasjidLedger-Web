import React from 'react';
import {
  X,
  Inbox,
  HeartHandshake,
  User,
  Home,
  MapPin,
  Calendar,
  Briefcase,
  Coins,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  XCircle,
  Info,
  ShieldCheck,
  Edit,
  ArrowRight,
  Sparkles,
  Receipt,
} from 'lucide-react';
import {
  DonationCollection,
  DonationPlan,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  CollectionStatus,
  Donation,
} from '../../types';
import { Language, toBanglaNumber, formatDate } from '../../lib/i18n';

interface DonationCollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: DonationCollection | null;
  plans: DonationPlan[];
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  collectionWorkers: CollectionWorker[];
  donations?: Donation[];
  onOpenEdit: (collection: DonationCollection) => void;
  onOpenStatusChange: (collection: DonationCollection) => void;
  onCollectDonation?: (collection: DonationCollection) => void;
  language?: Language;
}

export const DonationCollectionDetailModal: React.FC<DonationCollectionDetailModalProps> = ({
  isOpen,
  onClose,
  collection,
  plans,
  persons,
  families,
  areas,
  collectionWorkers,
  donations = [],
  onOpenEdit,
  onOpenStatusChange,
  onCollectDonation,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  if (!isOpen || !collection) return null;

  const plan = plans.find((p) => p.id === collection.donationPlanId);
  const person = persons.find((p) => p.id === collection.personId);
  const family = families.find((f) => f.id === collection.familyId || f.id === person?.familyId);
  const area = areas.find((a) => a.id === collection.areaId || a.id === person?.areaId || a.id === family?.areaId);
  const worker = collectionWorkers.find((w) => w.id === collection.collectionWorkerId);

  // Status mapping
  const getStatusBadge = (status: CollectionStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return {
          label: isBn ? 'নির্ধারিত' : 'Scheduled',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: Calendar,
        };
      case 'PENDING':
        return {
          label: isBn ? 'অপেক্ষমাণ' : 'Pending',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: Clock,
        };
      case 'PARTIALLY_COLLECTED':
        return {
          label: isBn ? 'আংশিক সংগৃহীত' : 'Partially Collected',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: Coins,
        };
      case 'COLLECTED':
        return {
          label: isBn ? 'সংগৃহীত' : 'Collected',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'NOT_COLLECTED':
        return {
          label: isBn ? 'সংগ্রহ হয়নি' : 'Not Collected',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: AlertCircle,
        };
      case 'PAUSED':
        return {
          label: isBn ? 'স্থগিত' : 'Paused',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: PauseCircle,
        };
      case 'CANCELLED':
        return {
          label: isBn ? 'বাতিল' : 'Cancelled',
          bg: 'bg-slate-200 text-slate-600 border-slate-300',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Clock,
        };
    }
  };

  const statusInfo = getStatusBadge(collection.status);
  const StatusIcon = statusInfo.icon;

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
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold font-siliguri leading-tight">
                  {isBn ? 'অনুদান সংগ্রহ বিবরণী' : 'Collection Details'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-white text-xs font-baloo font-bold border border-emerald-500/40">
                  {collection.id}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-tiro">
                {isBn ? `সংগ্রহের সময়কাল: ${collection.collectionPeriod}` : `Period: ${collection.collectionPeriod}`}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Status & Progress Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl border ${statusInfo.bg}`}>
                <StatusIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-tiro">{isBn ? 'সংগ্রহের বর্তমান অবস্থা:' : 'Current Status:'}</span>
                <span className="text-sm font-bold font-siliguri text-slate-900">
                  {statusInfo.label}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-400 block font-tiro">{isBn ? 'পরিকল্পিত পরিমাণ' : 'Planned'}</span>
                <span className="text-base font-bold text-slate-800 font-baloo">
                  ৳{toBanglaNumber(collection.plannedAmount)}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-[11px] text-slate-400 block font-tiro">{isBn ? 'সংগৃহীত পরিমাণ' : 'Collected'}</span>
                <span className="text-base font-bold text-emerald-700 font-baloo">
                  ৳{toBanglaNumber(collection.collectedAmount || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: ব্যক্তি পরিচিতি */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 font-siliguri">
              <User className="w-4 h-4 text-emerald-700" />
              <span>{isBn ? 'ব্যক্তি ও পারিবারিক পরিচিতি' : 'Musalli & Family Identity'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-tiro">
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'নাম:' : 'Full Name:'}</span>
                <span className="font-bold text-slate-800 font-siliguri text-sm">
                  {collection.personNameBn || person?.fullName || collection.personId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'ব্যক্তি কোড / আইডি:' : 'Person ID:'}</span>
                <span className="font-mono text-slate-700 font-baloo font-bold">
                  {collection.personCode || person?.personCode || collection.personId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'মোবাইল নম্বর:' : 'Mobile:'}</span>
                <span className="font-medium text-slate-800 font-baloo">
                  {person?.mobile ? toBanglaNumber(person.mobile) : (isBn ? 'উপলব্ধ নয়' : 'N/A')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'পারিবারিক খানা:' : 'Family:'}</span>
                <span className="font-medium text-slate-800 font-siliguri">
                  {collection.familyNameBn || family?.name || (isBn ? 'নির্ধারিত নেই' : 'N/A')}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 text-[11px] block">{isBn ? 'এলাকা / মহল্লা:' : 'Area:'}</span>
                <span className="font-medium text-slate-800 font-siliguri">
                  {collection.areaNameBn || area?.name || (isBn ? 'নির্ধারিত নেই' : 'N/A')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: পরিকল্পনা তথ্য */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 font-siliguri">
                <HeartHandshake className="w-4 h-4 text-rose-600" />
                <span>{isBn ? 'মূল দান পরিকল্পনা (B4)' : 'Donation Plan Details'}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-baloo font-bold border border-rose-200">
                {collection.donationPlanId}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-tiro">
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'পরিকল্পনার ধরন:' : 'Plan Type:'}</span>
                <span className="font-semibold text-slate-800 font-siliguri">
                  {plan?.planType === 'MONTHLY' ? (isBn ? 'মাসিক ওয়াদা' : 'Monthly Pledge') :
                   plan?.planType === 'YEARLY' ? (isBn ? 'বাৎসরিক ওয়াদা' : 'Yearly Pledge') :
                   plan?.planType === 'WEEKLY' ? (isBn ? 'সাপ্তাহিক ওয়াদা' : 'Weekly Pledge') :
                   (isBn ? 'এককালীন' : 'One-time')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'পরিকল্পিত দান:' : 'Pledged Amount:'}</span>
                <span className="font-bold text-slate-800 font-baloo">
                  ৳{toBanglaNumber(plan?.plannedAmount ?? plan?.amount ?? collection.plannedAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'শুরুর তারিখ:' : 'Start Date:'}</span>
                <span className="font-medium text-slate-700 font-baloo">
                  {plan?.startDate ? formatDate(plan.startDate) : (isBn ? 'নির্ধারিত নেই' : 'N/A')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Collection অপারেশন তথ্য */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 font-siliguri">
              <Briefcase className="w-4 h-4 text-emerald-700" />
              <span>{isBn ? 'অপারেশনাল ট্র্যাকিং ও সময়সূচি' : 'Collection Schedule & Assignment'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-tiro">
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'সংগ্রহের সময়কাল:' : 'Period:'}</span>
                <span className="font-bold text-slate-800 font-baloo">
                  {collection.collectionPeriod}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">{isBn ? 'নির্ধারিত তারিখ:' : 'Scheduled Date:'}</span>
                <span className="font-medium text-slate-800 font-baloo">
                  {collection.scheduledDate ? formatDate(collection.scheduledDate) : (isBn ? 'নির্দিষ্ট নয়' : 'Not set')}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 text-[11px] block">{isBn ? 'দায়িত্বশীল সংগ্রহকারী:' : 'Assigned Worker:'}</span>
                <span className="font-bold text-slate-800 font-siliguri">
                  {collection.collectionWorkerNameBn || worker?.name || (isBn ? 'কোনো সংগ্রহকারী নির্ধারিত নেই' : 'Unassigned')}
                </span>
                {worker?.mobile && (
                  <span className="text-[11px] text-slate-500 ml-2 font-baloo">
                    ({toBanglaNumber(worker.mobile)})
                  </span>
                )}
              </div>
              {collection.collectionNote && (
                <div className="sm:col-span-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-siliguri">{isBn ? 'অফিস নির্দেশনা / নোট:' : 'Collection Note:'}</span>
                  <p className="text-xs text-slate-700 mt-0.5">{collection.collectionNote}</p>
                </div>
              )}
              {collection.workerNote && (
                <div className="sm:col-span-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block font-siliguri">{isBn ? 'মাঠ পর্যায়ের নোট:' : 'Worker Note:'}</span>
                  <p className="text-xs text-slate-700 mt-0.5">{collection.workerNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3.5: Linked Actual Donations (B5 Receipts) */}
          {(() => {
            const linkedDonations = donations.filter(
              (d) => (d.collectionId === collection.id || (d.donationPlanId === collection.donationPlanId && d.personId === collection.personId && d.date.startsWith(collection.collectionPeriod.substring(0, 7)))) && d.status !== 'CANCELLED'
            );
            if (linkedDonations.length === 0) return null;
            return (
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-950 font-siliguri flex items-center space-x-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isBn ? 'বাস্তব প্রাপ্তি ও মানি রসিদ হিস্ট্রি (B5 Actual Donations)' : 'Linked Receipts & Actual Donations'}</span>
                  </h4>
                  <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800 font-baloo">
                    {toBanglaNumber(linkedDonations.length)} {isBn ? 'টি রসিদ' : 'Receipts'}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {linkedDonations.map((d) => (
                    <div key={d.id} className="bg-white p-2.5 rounded-lg border border-emerald-200/70 flex items-center justify-between text-xs shadow-2xs">
                      <div>
                        <div className="font-mono font-bold text-slate-800 text-[11px]">{d.receiptNumber}</div>
                        <div className="text-[10px] text-slate-500 font-tiro">{formatDate(d.date)} • {d.paymentMethod}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-baloo font-bold text-emerald-700 text-sm">
                          ৳{toBanglaNumber(d.amount.toLocaleString())}
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {d.status === 'COMPLETED' ? (isBn ? 'পরিশোধিত' : 'Paid') : (isBn ? 'বাতিল' : 'Cancelled')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Section 4: Financial Boundary Notice */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-emerald-900 text-xs font-tiro">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold font-siliguri">
                {isBn ? 'আর্থিক হিসাব নিরাপত্তা বিজ্ঞপ্তি:' : 'Financial Accounting Boundary:'}
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {isBn
                  ? 'ℹ️ এটি একটি অনুদান সংগ্রহ কার্যক্রম। প্রকৃত অর্থ গ্রহণ ও আর্থিক হিসাব “বাস্তব অনুদান” মডিউলে রেকর্ড হবে।'
                  : 'ℹ️ This is an operational collection workflow. Actual receipt intake and financial ledger updates take place in the Actual Donations module.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenStatusChange(collection);
              }}
              className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors font-siliguri inline-flex items-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isBn ? 'অবস্থা পরিবর্তন' : 'Change Status'}</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenEdit(collection);
              }}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors font-siliguri inline-flex items-center space-x-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {collection.status === 'CANCELLED' ? (
              <div className="relative group">
                <button
                  disabled
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-200 border border-slate-300 rounded-xl cursor-not-allowed font-siliguri inline-flex items-center space-x-1.5 opacity-70"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{isBn ? 'সংগ্রহ করুন' : 'Collect Donation'}</span>
                </button>
                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block w-52 p-2 bg-slate-800 text-white text-[10px] font-tiro rounded-lg shadow-lg text-center z-10">
                  {isBn
                    ? 'বাতিলকৃত সংগ্রহের বিপরীতে অনুদান গ্রহণ সম্ভব নয়'
                    : 'Cannot collect donation for a cancelled collection'}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onCollectDonation) onCollectDonation(collection);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-xl shadow-xs transition-all font-siliguri inline-flex items-center space-x-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{isBn ? '💰 সংগ্রহ করুন' : '💰 Collect Donation'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors font-siliguri"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

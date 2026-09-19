import React, { useState } from 'react';
import {
  X,
  Printer,
  Ban,
  CheckCircle2,
  XCircle,
  Coins,
  UserCheck,
  UserX,
  HeartHandshake,
  Calendar,
  Building,
  CreditCard,
  FileText,
  DollarSign,
  AlertTriangle,
  Receipt,
  MapPin,
  Home,
  Phone,
  Briefcase,
  Layers,
} from 'lucide-react';
import {
  Donation,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  DonationPlan,
  CollectionWorker,
  Mosque,
  User as AuthUser,
} from '../../types';
import { Language, toBanglaNumber, formatCurrency, formatDate } from '../../lib/i18n';

interface ActualDonationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: Donation | null;
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  plans: DonationPlan[];
  collectionWorkers?: CollectionWorker[];
  currentMosque?: Mosque | null;
  currentUser?: AuthUser | null;
  onPrintReceipt: (donation: Donation, format?: 'A4' | 'POS_80' | 'POS_58') => void;
  onCancelDonation?: (id: string, reason: string) => Promise<void>;
  language?: Language;
}

export const ActualDonationDetailModal: React.FC<ActualDonationDetailModalProps> = ({
  isOpen,
  onClose,
  donation,
  persons,
  families,
  areas,
  plans,
  collectionWorkers = [],
  currentMosque,
  currentUser,
  onPrintReceipt,
  onCancelDonation,
  language = 'bn',
}) => {
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  if (!isOpen || !donation) return null;

  const isBn = language === 'bn';
  const isCancelled = donation.status === 'CANCELLED';

  const canCancel =
    !isCancelled &&
    Boolean(onCancelDonation) &&
    (currentUser?.role === 'SUPER_ADMIN' ||
      currentUser?.role === 'MOSQUE_ADMIN' ||
      currentUser?.permissions?.includes('CREATE_INCOME') ||
      currentUser?.permissions?.includes('MANAGE_TRANSACTIONS'));

  // Person, Family, Area linkage
  const person = donation.personId ? persons.find((p) => p.id === donation.personId) : null;
  const family = donation.familyId
    ? families.find((f) => f.id === donation.familyId)
    : person?.familyId
    ? families.find((f) => f.id === person.familyId)
    : null;
  const area = donation.areaId
    ? areas.find((a) => a.id === donation.areaId)
    : person?.areaId
    ? areas.find((a) => a.id === person.areaId)
    : family?.areaId
    ? areas.find((a) => a.id === family.areaId)
    : null;

  // Plan Linkage
  const plan = donation.donationPlanId ? plans.find((p) => p.id === donation.donationPlanId) : null;

  // Worker
  const worker = donation.collectionWorkerId
    ? collectionWorkers.find((w) => w.id === donation.collectionWorkerId || w.userId === donation.collectionWorkerId)
    : null;

  const handleConfirmCancel = async () => {
    if (!onCancelDonation) return;
    setCancelError('');
    setIsCancelling(true);
    try {
      await onCancelDonation(donation.id, cancelReason.trim() || 'ভুল বা অসাবধানতাবশত এন্ট্রি');
      setIsCancelConfirmOpen(false);
      onClose();
    } catch (err: any) {
      setCancelError(err.message || (isBn ? 'বাতিল করতে ত্রুটি হয়েছে।' : 'Failed to cancel receipt.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const categoryNames: Record<Donation['category'], string> = {
    GENERAL: isBn ? 'সাধারণ ফান্ড অনুদান' : 'General Donation',
    CONSTRUCTION: isBn ? 'মসজিদ নির্মাণ ও উন্নয়ন' : 'Construction / Development',
    WAQF: isBn ? 'ওয়াকফ ও স্থায়ী সম্পদ' : 'Waqf',
    CEMETERY: isBn ? 'কবরস্থান সংরক্ষণ ফান্ড' : 'Cemetery Maintenance',
    WUDU_KHANA: isBn ? 'ওজুখানা ও ওয়াশরুম' : 'Wudu Khana',
    MADRASA: isBn ? 'মাদরাসা ও হেফজখানা' : 'Madrasa / Maktab',
    SPECIAL_PROJECT: isBn ? 'বিশেষ প্রজেক্ট' : 'Special Project',
    OTHER: isBn ? 'অন্যান্য খাত' : 'Other',
  };

  const paymentMethodNames: Record<string, string> = {
    CASH: isBn ? 'নগদ (Cash)' : 'Cash',
    BANK_TRANSFER: isBn ? 'ব্যাংক ট্রান্সফার / চেক' : 'Bank Transfer',
    BKASH: isBn ? 'বিকাশ (bKash)' : 'bKash',
    NAGAD: isBn ? 'নগদ (Nagad)' : 'Nagad',
    ROCKET: isBn ? 'রকেট (Rocket)' : 'Rocket',
    OTHER: isBn ? 'অন্যান্য মাধ্যম' : 'Other',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div
          className={`px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 text-white ${
            isCancelled ? 'bg-gradient-to-r from-red-800 to-rose-900' : 'bg-gradient-to-r from-emerald-800 to-teal-800'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-emerald-100 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold font-siliguri leading-tight">
                  {isBn ? 'অনুদান রসিদ বিবরণ' : 'Donation Receipt Details'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCancelled
                      ? 'bg-red-500/20 text-red-200 border-red-300/30'
                      : 'bg-emerald-500/20 text-emerald-100 border-emerald-300/30'
                  }`}
                >
                  {isCancelled ? (isBn ? 'বাতিলকৃত' : 'Cancelled') : isBn ? 'সম্পন্ন' : 'Completed'}
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-baloo mt-0.5">{donation.receiptNumber}</p>
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

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] font-siliguri text-slate-800 text-xs">
          {/* Cancelled Banner */}
          {isCancelled && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>{isBn ? 'এই অনুদান রসিদটি বাতিল ও সমন্বয় করা হয়েছে' : 'This receipt has been cancelled and reversed'}</span>
              </div>
              {donation.cancellationReason && (
                <div className="text-[11px] text-red-700 font-tiro pl-5.5">
                  <strong>{isBn ? 'বাতিলের কারণ: ' : 'Reason: '}</strong>
                  {donation.cancellationReason}
                </div>
              )}
              {donation.cancelledAt && (
                <div className="text-[10px] text-red-500 pl-5.5 font-baloo">
                  {isBn ? 'বাতিলকাল: ' : 'Cancelled At: '}
                  {formatDate(donation.cancelledAt, language)}
                </div>
              )}
            </div>
          )}

          {/* Big Amount Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider font-siliguri">
                {isBn ? 'অনুদানের মোট পরিমাণ' : 'Total Donated Amount'}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-950 font-baloo mt-0.5">
                {isBn ? `৳ ${toBanglaNumber(formatCurrency(donation.amount))}` : `৳${donation.amount.toLocaleString()}`}
              </div>
              <div className="text-[11px] text-slate-500 font-tiro mt-0.5">
                {categoryNames[donation.category] || donation.category}
              </div>
            </div>
            <div className="text-right font-baloo text-[11px] text-slate-500 space-y-0.5">
              <div>
                {isBn ? 'তারিখ: ' : 'Date: '}
                <strong className="text-slate-800 font-semibold">{formatDate(donation.date, language)}</strong>
              </div>
              <div>
                {isBn ? 'হিসাব ফান্ড: ' : 'Account: '}
                <strong className="text-slate-800 font-semibold">{donation.accountName}</strong>
              </div>
              <div>
                {isBn ? 'মাধ্যম: ' : 'Method: '}
                <strong className="text-slate-800 font-semibold">{paymentMethodNames[donation.paymentMethod] || donation.paymentMethod}</strong>
              </div>
            </div>
          </div>

          {/* Donor Information Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              {donation.personId ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <UserX className="w-3.5 h-3.5 text-teal-600" />
              )}
              <span>{isBn ? 'দাতার বিবরণ' : 'Donor Information'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">{isBn ? 'দাতার নাম' : 'Donor Name'}</span>
                <span className="font-bold text-slate-900 text-sm">{donation.donorName}</span>
                {person?.personCode && (
                  <span className="ml-2 font-baloo text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    {person.personCode}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">{isBn ? 'মোবাইল নম্বর' : 'Phone'}</span>
                <span className="font-bold text-slate-800 font-baloo">
                  {donation.donorPhone || person?.mobile || (isBn ? 'অনুল্লিখিত' : 'N/A')}
                </span>
              </div>

              {(family || donation.familyId) && (
                <div>
                  <span className="text-slate-400 block text-[10px]">{isBn ? 'পরিবার / বাড়ি' : 'Family / House'}</span>
                  <span className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                    <Home className="w-3 h-3 text-slate-400" />
                    <span>{family?.name || (isBn ? 'পরিবার লিঙ্কড' : 'Linked')}</span>
                  </span>
                </div>
              )}

              {(area || donation.areaId) && (
                <div>
                  <span className="text-slate-400 block text-[10px]">{isBn ? 'এলাকা / মহল্লা' : 'Area / Mahalla'}</span>
                  <span className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{area?.name || (isBn ? 'এলাকা লিঙ্কড' : 'Linked')}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Plan Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
              <span>{isBn ? 'পরিকল্পনা ও প্রতিশ্রুতি লিঙ্কিং' : 'Donation Plan Linkage'}</span>
            </h3>

            {donation.donationPlanId || plan ? (
              <div className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-baloo font-bold text-rose-800 text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {donation.planCode || plan?.planCode || 'PLAN-LINKED'}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {plan?.planType === 'MONTHLY'
                        ? isBn ? 'মাসিক নিয়মিত দান' : 'Monthly Pledge'
                        : plan?.planType === 'YEARLY'
                        ? isBn ? 'বাৎসরিক নিয়মিত দান' : 'Yearly Pledge'
                        : isBn ? 'অনিয়মিত প্ল্যান' : 'Irregular Pledge'}
                    </span>
                  </div>
                  {plan && (
                    <div className="text-[11px] text-slate-500 mt-1 font-baloo">
                      {isBn ? 'পরিকল্পিত পরিমাণ: ' : 'Planned: '}
                      <strong>{isBn ? `৳ ${toBanglaNumber(formatCurrency(plan.amount || plan.plannedAmount || 0))}` : `৳${plan.amount || plan.plannedAmount}`}</strong>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {isBn ? 'পরিকল্পনার বিপরীতে জমাকৃত' : 'Plan Applied'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 text-[11px] flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{isBn ? 'প্ল্যান ছাড়া সাধারণ অনুদান (Ad-hoc Donation)' : 'Ad-hoc donation without specific plan link'}</span>
              </div>
            )}
          </div>

          {/* Worker / Reference / Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">{isBn ? 'সংগ্রহকারী প্রতিনিধি' : 'Collected By / Worker'}</span>
              <span className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                <Briefcase className="w-3 h-3 text-slate-400" />
                <span>{worker ? worker.name : donation.receivedByName || (isBn ? 'মসজিদ অফিস' : 'Office')}</span>
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">{isBn ? 'ট্রানজ্যাকশন রেফারেন্স' : 'Reference / TrxID'}</span>
              <span className="font-semibold text-slate-800 font-baloo mt-0.5 block">
                {donation.reference || (isBn ? 'নাই' : 'N/A')}
              </span>
            </div>

            {donation.description && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px]">{isBn ? 'বিবরণ / উদ্দেশ্য' : 'Description / Note'}</span>
                <span className="text-slate-700 font-tiro mt-0.5 block">{donation.description}</span>
              </div>
            )}
          </div>

          {/* Cash Denomination Breakdown */}
          {donation.denominationData && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isBn ? 'নগদ নোট গণনা বিবরণ (Denomination Breakdown)' : 'Cash Denomination Breakdown'}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {Object.entries(donation.denominationData.counts || {}).map(([note, count]) => {
                  if (!count) return null;
                  const noteVal = Number(note);
                  const totalVal = noteVal * Number(count);
                  return (
                    <div key={note} className="bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <div className="font-bold text-slate-600 font-baloo">৳{note} × {count}</div>
                      <div className="font-bold text-emerald-800 font-baloo text-[11px] mt-0.5">
                        = ৳{totalVal.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {canCancel && (
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-colors flex items-center space-x-1.5 font-siliguri"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isBn ? 'রসিদ বাতিল করুন' : 'Cancel Receipt'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors font-siliguri"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>

            <button
              type="button"
              onClick={() => onPrintReceipt(donation, 'POS_80')}
              className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 rounded-xl transition-colors flex items-center space-x-1.5 font-siliguri"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBn ? 'থার্মাল স্লিপ' : 'POS 80mm'}</span>
            </button>

            <button
              type="button"
              onClick={() => onPrintReceipt(donation, 'A4')}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 font-siliguri"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBn ? 'মানি রিসিট প্রিন্ট (A4)' : 'Print A4 Receipt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Confirm Dialog */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-700">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base font-siliguri">
                  {isBn ? 'অনুদান রসিদ বাতিলের নিশ্চয়তা' : 'Confirm Cancel Receipt'}
                </h3>
                <p className="text-xs text-red-600 font-baloo">{donation.receiptNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-tiro leading-relaxed">
              {isBn
                ? 'সতর্কতা: রসিদটি বাতিল করলে সংশ্লিষ্ট ফান্ডের ব্যালেন্স থেকে ৳' +
                  donation.amount.toLocaleString() +
                  ' হ্রাস পাবে এবং সংশ্লিষ্ট আয় ভাউচারটি স্বয়ংক্রিয়ভাবে বাতিল হিসেবে চিহ্নিত হবে।'
                : 'Warning: Cancelling will reverse the balance in the target account and mark the income entry cancelled.'}
            </p>

            {cancelError && (
              <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl font-bold">{cancelError}</div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-siliguri">
                {isBn ? 'বাতিলকরণের কারণ *' : 'Cancellation Reason *'}
              </label>
              <input
                type="text"
                placeholder={isBn ? 'ভুল পরিমাণ এন্ট্রি, ভুল ব্যক্তি নির্বাচন ইত্যাদি...' : 'Reason for cancellation...'}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-500 font-siliguri"
              />
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setIsCancelConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                {isBn ? 'না, ফেরত যান' : 'Go Back'}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
              >
                {isCancelling ? (isBn ? 'বাতিল হচ্ছে...' : 'Cancelling...') : isBn ? 'হ্যাঁ, বাতিল নিশ্চিত করুন' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

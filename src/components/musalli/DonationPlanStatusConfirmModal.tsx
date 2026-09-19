import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ShieldCheck,
  HeartHandshake,
} from 'lucide-react';
import { DonationPlan, DonationPlanStatus, PersonMaster } from '../../types';
import { Language, toBanglaNumber } from '../../lib/i18n';

interface DonationPlanStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (planId: string, newStatus: DonationPlanStatus) => Promise<void>;
  plan: DonationPlan | null;
  person?: PersonMaster | null;
  targetStatus: DonationPlanStatus;
  language?: Language;
}

export const DonationPlanStatusConfirmModal: React.FC<DonationPlanStatusConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  plan,
  person,
  targetStatus,
  language = 'bn',
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const isBn = language === 'bn';

  if (!isOpen || !plan) return null;

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      await onConfirm(plan.id, targetStatus);
      onClose();
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusMeta: Record<
    DonationPlanStatus,
    { title: string; desc: string; icon: any; colorClass: string; btnClass: string }
  > = {
    ACTIVE: {
      title: isBn ? 'পরিকল্পনা সক্রিয়করণ (Active)' : 'Activate Donation Plan',
      desc: isBn
        ? 'এই পরিকল্পনাটি পুনরায় নিয়মিত কালেকশন ও মনিটরিং তালিকায় অন্তর্ভুক্ত হবে।'
        : 'This plan will be re-activated for collection and regular tracking.',
      icon: CheckCircle2,
      colorClass: 'text-emerald-700 bg-emerald-100',
      btnClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    },
    PAUSED: {
      title: isBn ? 'পরিকল্পনা সাময়িক স্থগিত (Pause)' : 'Pause Donation Plan',
      desc: isBn
        ? 'দাতার অনুরোধে বা সাময়িক অসুবিধার কারণে পরিকল্পনাটি স্থগিত থাকবে। পরবর্তীতে পুনরায় চালু করা যাবে।'
        : 'The plan will be paused temporarily upon donor request and can be resumed anytime.',
      icon: PauseCircle,
      colorClass: 'text-amber-700 bg-amber-100',
      btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    COMPLETED: {
      title: isBn ? 'পরিকল্পনা সম্পন্ন ঘোষণা (Complete)' : 'Complete Donation Plan',
      desc: isBn
        ? 'পরিকল্পনার মেয়াদ শেষ হলে বা নির্ধারিত অনুদান সম্পন্ন হলে এটিকে সম্পন্ন চিহ্নিত করা হয়।'
        : 'Marks the plan as finished upon fulfilling the designated pledge or duration.',
      icon: CheckCircle2,
      colorClass: 'text-blue-700 bg-blue-100',
      btnClass: 'bg-blue-700 hover:bg-blue-800 text-white',
    },
    CANCELLED: {
      title: isBn ? 'পরিকল্পনা বাতিলকরণ (Cancel)' : 'Cancel Donation Plan',
      desc: isBn
        ? 'দাতার স্থানান্তর বা অন্য কোনো কারণে পরিকল্পনাটি বাতিল করা হবে। পূর্বের সংগৃহীত দানের হিসাবে কোনো পরিবর্তন আসবে না।'
        : 'Cancels this plan. Existing historical donation records will remain unaffected.',
      icon: XCircle,
      colorClass: 'text-rose-700 bg-rose-100',
      btnClass: 'bg-rose-700 hover:bg-rose-800 text-white',
    },
    INACTIVE: {
      title: isBn ? 'পরিকল্পনা নিষ্ক্রিয়করণ' : 'Deactivate Plan',
      desc: isBn ? 'পরিকল্পনাটি নিষ্ক্রিয় করা হবে।' : 'Plan will be deactivated.',
      icon: XCircle,
      colorClass: 'text-slate-700 bg-slate-100',
      btnClass: 'bg-slate-700 hover:bg-slate-800 text-white',
    },
  };

  const currentStatusConfig = statusMeta[targetStatus] || statusMeta.ACTIVE;
  const StatusIcon = currentStatusConfig.icon;

  const planAmount = plan.amount ?? plan.plannedAmount ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentStatusConfig.colorClass}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-siliguri">
                {currentStatusConfig.title}
              </h3>
              <p className="text-xs text-slate-500 font-baloo">
                {plan.planCode || `PLAN-#${plan.id.slice(0, 6)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="text-xs font-bold text-slate-800 font-siliguri">
              {person?.fullName || (isBn ? 'নাম অপ্রকাশ্য' : 'Unnamed Person')}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-tiro">
              <span>{isBn ? 'পরিকল্পনার ধরন:' : 'Plan Type:'}</span>
              <span className="font-bold text-slate-800 font-siliguri">
                {plan.planType === 'MONTHLY'
                  ? isBn
                    ? 'মাসিক'
                    : 'Monthly'
                  : plan.planType === 'YEARLY'
                  ? isBn
                    ? 'বাৎসরিক'
                    : 'Yearly'
                  : plan.planType === 'IRREGULAR'
                  ? isBn
                    ? 'অনিয়মিত'
                    : 'Irregular'
                  : isBn
                  ? 'অন্যান্য'
                  : 'Other'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-tiro">
              <span>{isBn ? 'পরিকল্পিত পরিমাণ:' : 'Planned Amount:'}</span>
              <span className="font-bold text-emerald-800 font-baloo">
                ৳{isBn ? toBanglaNumber(planAmount) : planAmount}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-tiro leading-relaxed">
            {currentStatusConfig.desc}
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-2 text-[11px] text-slate-600 font-tiro">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              {isBn
                ? 'এই স্ট্যাটাস পরিবর্তনের ফলে পূর্বের কোনো সংগৃহীত আর্থিক লেনদেন পরিবর্তিত হবে না।'
                : 'Status change will not alter any previously posted financial transactions.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer disabled:opacity-50"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-5 py-2 rounded-xl text-xs font-bold font-siliguri shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${currentStatusConfig.btnClass}`}
          >
            {submitting ? (isBn ? 'প্রক্রিয়াধীন...' : 'Processing...') : (isBn ? 'নিশ্চিত করুন' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

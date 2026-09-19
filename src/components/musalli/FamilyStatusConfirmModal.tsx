import React from 'react';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  Power,
  Loader2,
  ShieldCheck,
  Home,
} from 'lucide-react';
import { FamilyMaster } from '../../types';
import { Language } from '../../lib/i18n';

interface FamilyStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  family: FamilyMaster | null;
  targetStatus: 'ACTIVE' | 'INACTIVE';
  isSubmitting?: boolean;
  language?: Language;
}

export const FamilyStatusConfirmModal: React.FC<FamilyStatusConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  family,
  targetStatus,
  isSubmitting = false,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const isActivating = targetStatus === 'ACTIVE';

  if (!isOpen || !family) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isActivating
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-siliguri">
                {isActivating
                  ? (isBn ? 'পরিবার সক্রিয়করণ নিশ্চিতকরণ' : 'Confirm Family Activation')
                  : (isBn ? 'পরিবার নিষ্ক্রিয়করণ নিশ্চিতকরণ' : 'Confirm Family Deactivation')}
              </h3>
              <p className="text-xs text-slate-500 font-tiro">
                {isBn ? 'স্ট্যাটাস পরিবর্তন পর্যালোচনা' : 'Review status change'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 font-baloo">
              {isBn ? 'নির্বাচিত পরিবার' : 'Selected Family'}
            </div>
            <div className="text-sm font-bold text-slate-900 font-siliguri flex items-center space-x-1.5">
              <Home className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{family.name}</span>
              {family.familyCode && (
                <span className="text-xs font-baloo font-normal text-slate-500">
                  ({family.familyCode})
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-600 font-tiro leading-relaxed">
            {isActivating
              ? (isBn
                  ? `আপনি কি নিশ্চিতভাবে "${family.name}" পরিবারকে সক্রিয় (Active) করতে চান? এটি সক্রিয় হলে নতুন মুসল্লি ও দান সংগ্রহে তালিকাভুক্ত রাখা সহজ হবে।`
                  : `Are you sure you want to activate "${family.name}"? It will be marked as active in the registry.`)
              : (isBn
                  ? `আপনি কি নিশ্চিতভাবে "${family.name}" পরিবারকে নিষ্ক্রিয় (Inactive) করতে চান?`
                  : `Are you sure you want to deactivate "${family.name}"?`)}
          </p>

          {!isActivating && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-900 text-xs font-tiro">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                {isBn
                  ? 'নিষ্ক্রিয় করার ফলে পরিবারের পূর্ববর্তী কোনো তথ্য, মুসল্লি বা আর্থিক লেনদেন মুছে যাবে না। এটি নিরাপদে সংরক্ষিত থাকবে।'
                  : 'Deactivating does not delete any member, donation or historical record. All data remains safe.'}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-tiro bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              {isBn
                ? 'অডিট লগে আপনার নাম ও সময় সহ স্ট্যাটাস পরিবর্তন সংরক্ষিত হবে।'
                : 'Status change will be securely logged in audit trail.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer font-siliguri disabled:opacity-50"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer font-siliguri flex items-center space-x-1.5 disabled:opacity-50 ${
              isActivating
                ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isBn ? 'প্রক্রিয়াধীন...' : 'Processing...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isActivating
                    ? (isBn ? 'হ্যাঁ, সক্রিয় করুন' : 'Yes, Activate')
                    : (isBn ? 'হ্যাঁ, নিষ্ক্রিয় করুন' : 'Yes, Deactivate')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

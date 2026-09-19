import React, { useState } from 'react';
import { AlertTriangle, Loader2, Power, X } from 'lucide-react';
import { PersonMaster } from '../../types';
import { Language } from '../../lib/i18n';

interface PersonStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: PersonMaster | null;
  onConfirm: (personId: string, newStatus: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  language?: Language;
}

export const PersonStatusConfirmModal: React.FC<PersonStatusConfirmModalProps> = ({
  isOpen,
  onClose,
  person,
  onConfirm,
  language = 'bn',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !person) return null;

  const isBn = language === 'bn';
  const isCurrentlyActive = person.status === 'ACTIVE';
  const targetStatus: 'ACTIVE' | 'INACTIVE' = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(person.id, targetStatus);
      onClose();
    } catch (err: any) {
      setError(err.message || (isBn ? 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।' : 'Failed to update status.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isCurrentlyActive ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 font-siliguri">
              {isCurrentlyActive
                ? isBn
                  ? 'ব্যক্তি / মুসল্লি নিষ্ক্রিয় করার নিশ্চিতকরণ'
                  : 'Deactivate Musalli / Person'
                : isBn
                ? 'ব্যক্তি / মুসল্লি সক্রিয় করার নিশ্চিতকরণ'
                : 'Activate Musalli / Person'}
            </h3>
            <p className="text-xs text-slate-600 font-tiro mt-1 leading-relaxed">
              {isBn
                ? `আপনি কি নিশ্চিত যে "${person.fullName}" (${person.personCode})-কে ${
                    isCurrentlyActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'
                  } করতে চান?`
                : `Are you sure you want to ${isCurrentlyActive ? 'deactivate' : 'activate'} "${
                    person.fullName
                  }" (${person.personCode})?`}
            </p>
          </div>

          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed font-tiro flex items-start space-x-2 ${
              isCurrentlyActive
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isCurrentlyActive
                ? isBn
                  ? 'নিষ্ক্রিয় করার পরও তার পূর্ববর্তী অনুদান বা ঐতিহাসিক তথ্য অক্ষত থাকবে। এটি সম্পূর্ণ নন-ডিস্ট্রাক্টিভ।'
                  : 'Historical donation data remains fully preserved. This is a non-destructive lifecycle change.'
                : isBn
                ? 'সক্রিয় করা হলে তাকে আবার সক্রিয় মুসল্লি তালিকায় ও পরিবার সদস্য গণনায় অন্তর্ভুক্ত করা হবে।'
                : 'Reactivating will include the person in active counts and regular collection lists.'}
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-600 font-tiro bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors font-siliguri"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 font-siliguri disabled:opacity-50 ${
                isCurrentlyActive ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isBn ? 'প্রক্রিয়াধীন...' : 'Updating...'}</span>
                </>
              ) : (
                <span>
                  {isCurrentlyActive
                    ? isBn
                      ? 'হ্যাঁ, নিষ্ক্রিয় করুন'
                      : 'Yes, Deactivate'
                    : isBn
                    ? 'হ্যাঁ, সক্রিয় করুন'
                    : 'Yes, Activate'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

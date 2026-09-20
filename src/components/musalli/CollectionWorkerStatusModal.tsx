import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { CollectionWorker } from '../../types';
import { Language } from '../../lib/i18n';
import { api } from '../../lib/api';

interface CollectionWorkerStatusModalProps {
  isOpen: boolean;
  worker: CollectionWorker | null;
  language?: Language;
  onClose: () => void;
  onSuccess: () => void;
}

export const CollectionWorkerStatusModal: React.FC<CollectionWorkerStatusModalProps> = ({
  isOpen,
  worker,
  language = 'bn',
  onClose,
  onSuccess,
}) => {
  const isBn = language === 'bn';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !worker) return null;

  const isCurrentActive = worker.status === 'ACTIVE';
  const targetStatus: 'ACTIVE' | 'INACTIVE' = isCurrentActive ? 'INACTIVE' : 'ACTIVE';

  const handleToggleStatus = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await api.updateCollectionWorkerStatus(worker.id, targetStatus);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.message || (isBn ? 'স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে।' : 'Failed to update status.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 text-white ${
            isCurrentActive
              ? 'bg-linear-to-r from-amber-600 to-rose-600'
              : 'bg-linear-to-r from-emerald-600 to-teal-600'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              {isCurrentActive ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold font-siliguri leading-snug">
                {isCurrentActive
                  ? isBn
                    ? 'সংগ্রহকারী নিষ্ক্রিয়করণ'
                    : 'Deactivate Worker'
                  : isBn
                  ? 'সংগ্রহকারী সক্রিয়করণ'
                  : 'Activate Worker'}
              </h2>
              <p className="text-xs text-white/80 font-tiro">{worker.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-tiro">
              {errorMessage}
            </div>
          )}

          <p className="text-xs text-slate-600 font-tiro leading-relaxed">
            {isCurrentActive
              ? isBn
                ? `আপনি কি নিশ্চিত যে "${worker.name}"-কে নিষ্ক্রিয় করতে চান? নিষ্ক্রিয় করলে নতুন কোনো অনুদান সংগ্রহে তাকে নির্বাচন করা যাবে না, তবে পূর্বে নির্ধারিত ও সংগৃহীত তথ্যাদি অক্ষত থাকবে।`
                : `Are you sure you want to deactivate "${worker.name}"? They will not be selectable for new collections, but past records will remain intact.`
              : isBn
              ? `আপনি কি নিশ্চিত যে "${worker.name}"-কে পুনরায় সক্রিয় করতে চান? সক্রিয় করার পর তাকে নতুন অনুদান সংগ্রহ কার্যক্রমে দায়িত্ব দেওয়া যাবে।`
              : `Are you sure you want to activate "${worker.name}"?`}
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs text-slate-700 font-tiro">
              {isBn
                ? 'আর্থিক হিসাব অপরিবর্তিত থাকবে (Zero Financial Impact)।'
                : 'Financial ledger remains untouched.'}
            </span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-siliguri font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isSubmitting}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 text-white text-xs font-siliguri font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-60 ${
                isCurrentActive
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isCurrentActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {isSubmitting
                  ? isBn
                    ? 'হালনাগাদ হচ্ছে...'
                    : 'Updating...'
                  : isCurrentActive
                  ? isBn
                    ? 'নিষ্ক্রিয় করুন'
                    : 'Deactivate'
                  : isBn
                  ? 'সক্রিয় করুন'
                  : 'Activate'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

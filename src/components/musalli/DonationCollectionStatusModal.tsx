import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  XCircle,
  Coins,
  Calendar,
  Info,
} from 'lucide-react';
import {
  DonationCollection,
  CollectionStatus,
} from '../../types';
import { Language } from '../../lib/i18n';

interface DonationCollectionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: DonationCollection | null;
  onUpdateStatus: (id: string, status: CollectionStatus, note?: string) => Promise<void>;
  language?: Language;
}

export const DonationCollectionStatusModal: React.FC<DonationCollectionStatusModalProps> = ({
  isOpen,
  onClose,
  collection,
  onUpdateStatus,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const [selectedStatus, setSelectedStatus] = useState<CollectionStatus>('PENDING');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const statusOptions: { value: CollectionStatus; labelBn: string; labelEn: string; icon: any; color: string; descBn: string }[] = [
    {
      value: 'SCHEDULED',
      labelBn: 'নির্ধারিত',
      labelEn: 'Scheduled',
      icon: Calendar,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      descBn: 'সংগ্রহের দিন ও সময়সূচি নির্ধারণ করা হয়েছে',
    },
    {
      value: 'PENDING',
      labelBn: 'অপেক্ষমাণ',
      labelEn: 'Pending',
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      descBn: 'সংগ্রহ কার্যক্রম চলমান বা মাঠ পর্যায়ে প্রক্রিয়াধীন',
    },
    {
      value: 'PARTIALLY_COLLECTED',
      labelBn: 'আংশিক সংগৃহীত',
      labelEn: 'Partially Collected',
      icon: Coins,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      descBn: 'পরিকল্পিত পরিমাণের একাংশ গ্রহণ সম্পন্ন হয়েছে',
    },
    {
      value: 'COLLECTED',
      labelBn: 'সংগৃহীত',
      labelEn: 'Collected',
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      descBn: 'পরিকল্পিত পূর্ণ অনুদান সফলভাবে সংগৃহীত হয়েছে',
    },
    {
      value: 'NOT_COLLECTED',
      labelBn: 'সংগ্রহ হয়নি',
      labelEn: 'Not Collected',
      icon: AlertCircle,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      descBn: 'অনুপস্থিতি বা অপারগতাবশত এই মেয়াদে সংগ্রহ সম্ভব হয়নি',
    },
    {
      value: 'PAUSED',
      labelBn: 'স্থগিত',
      labelEn: 'Paused',
      icon: PauseCircle,
      color: 'text-slate-700 bg-slate-100 border-slate-300',
      descBn: 'সাময়িকভাবে সংগ্রহ কার্যক্রম স্থগিত রাখা হয়েছে',
    },
    {
      value: 'CANCELLED',
      labelBn: 'বাতিল',
      labelEn: 'Cancelled',
      icon: XCircle,
      color: 'text-slate-600 bg-slate-200 border-slate-300',
      descBn: 'এই মেয়াদের সংগ্রহ কার্যক্রম বাতিল ঘোষিত হয়েছে',
    },
  ];

  useEffect(() => {
    if (collection) {
      setSelectedStatus(collection.status);
      setNote('');
      setError('');
    }
  }, [collection, isOpen]);

  if (!isOpen || !collection) return null;

  const currentStatusObj = statusOptions.find((s) => s.value === collection.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await onUpdateStatus(collection.id, selectedStatus, note.trim() || undefined);
      onClose();
    } catch (err: any) {
      console.error('Error changing status:', err);
      setError(err.message || (isBn ? 'স্ট্যাটাস হালনাগাদ করতে ব্যর্থ হয়েছে' : 'Failed to update status'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-800 to-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-siliguri leading-tight">
                {isBn ? 'সংগ্রহের অবস্থা পরিবর্তন' : 'Update Collection Status'}
              </h2>
              <p className="text-xs text-slate-300 font-tiro">
                {isBn ? `আইডি: ${collection.id} (${collection.collectionPeriod})` : `ID: ${collection.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-tiro flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Status Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-500 font-tiro">
              {isBn ? 'বর্তমান অবস্থা:' : 'Current Status:'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold font-siliguri border ${currentStatusObj?.color}`}>
              {isBn ? currentStatusObj?.labelBn : currentStatusObj?.labelEn}
            </span>
          </div>

          {/* New Status Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'নতুন অবস্থা নির্বাচন করুন *' : 'Select New Status *'}
            </label>
            <div className="space-y-2">
              {statusOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = selectedStatus === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setSelectedStatus(opt.value)}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4 text-slate-600" />
                        <span className="text-xs font-bold font-siliguri text-slate-800">
                          {isBn ? opt.labelBn : opt.labelEn}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                        {opt.descBn}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status Change Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'পরিবর্তনের কারণ বা নোট (ঐচ্ছিক)' : 'Reason / Note (Optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={isBn ? 'যেমন: মুসল্লির সাথে ফোনে কথা হয়েছে, আগামী শুক্রবার দেবেন...' : 'e.g. Musalli requested delay...'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-tiro text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Operational Safety Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-900 text-xs font-tiro">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {isBn
                ? 'ℹ️ অবস্থা পরিবর্তন একটি বিশুদ্ধ অপারেশনাল প্রক্রিয়া। অপেক্ষমাণ বা সংগ্রহ হয়নি স্ট্যাটাস ফিন্যান্সিয়াল বকেয়া হিসেবে গণ্য হয় না।'
                : 'ℹ️ Status changes are purely operational tracking and do not create accounting receivables.'}
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors font-siliguri"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors font-siliguri shadow-sm inline-flex items-center space-x-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? (isBn ? 'হালনাগাদ হচ্ছে...' : 'Updating...') : (isBn ? 'অবস্থা পরিবর্তন সম্পন্ন করুন' : 'Confirm Update')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { AreaMaster } from '../../types';
import { Language } from '../../lib/i18n';

interface AreaStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  area: AreaMaster | null;
  targetStatus: 'ACTIVE' | 'INACTIVE';
  isProcessing?: boolean;
  language?: Language;
}

export const AreaStatusConfirmModal: React.FC<AreaStatusConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  area,
  targetStatus,
  isProcessing = false,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  if (!isOpen || !area) return null;

  const isDeactivating = targetStatus === 'INACTIVE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isDeactivating
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}
            >
              {isDeactivating ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-siliguri">
                {isDeactivating
                  ? (isBn ? 'এলাকাটি নিষ্ক্রিয় করতে চান?' : 'Deactivate this Area?')
                  : (isBn ? 'এলাকাটি পুনরায় সক্রিয় করতে চান?' : 'Reactivate this Area?')}
              </h3>
              <p className="text-xs text-slate-500 font-baloo">
                {area.name} {area.areaCode ? `(${area.areaCode})` : ''}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-600 leading-relaxed">
            {isBn
              ? 'এই এলাকার existing সম্পর্কিত রেকর্ড (পরিবার, মুসল্লি, ওয়াদা) থাকলে সেগুলো মুছে যাবে না। শুধু এলাকাটির স্ট্যাটাস পরিবর্তিত হবে।'
              : 'Existing linked records (families, musalli, pledges) will remain intact. Only the area status will be updated.'}
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer font-siliguri disabled:opacity-50"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`inline-flex items-center space-x-1.5 px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer font-siliguri disabled:opacity-50 ${
                isDeactivating
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>
                {isProcessing
                  ? (isBn ? 'প্রক্রিয়াধীন...' : 'Processing...')
                  : isDeactivating
                  ? (isBn ? 'নিষ্ক্রিয় করুন' : 'Deactivate')
                  : (isBn ? 'সক্রিয় করুন' : 'Activate')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

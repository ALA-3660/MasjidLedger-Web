import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { AreaMaster, CollectionWorker } from '../../types';
import { Language } from '../../lib/i18n';

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AreaMaster>) => Promise<void>;
  initialData?: AreaMaster | null;
  existingAreas: AreaMaster[];
  collectionWorkers?: CollectionWorker[];
  language?: Language;
}

export const AreaFormModal: React.FC<AreaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingAreas,
  collectionWorkers = [],
  language = 'bn',
}) => {
  const [name, setName] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [description, setDescription] = useState('');
  const [assignedWorkerId, setAssignedWorkerId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBn = language === 'bn';
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setAreaCode(initialData.areaCode || '');
        setDescription(initialData.description || initialData.boundaryDescription || '');
        setAssignedWorkerId(
          initialData.assignedCollectionWorkerId ||
          (initialData.collectionWorkerIds && initialData.collectionWorkerIds[0]) ||
          ''
        );
        setStatus(initialData.status || 'ACTIVE');
        setNotes(initialData.notes || '');
      } else {
        setName('');
        setAreaCode('');
        setDescription('');
        setAssignedWorkerId('');
        setStatus('ACTIVE');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Duplicate Check logic (Friendly Warning, non-blocking)
  const normalizedInputName = name.trim().toLowerCase();
  const potentialDuplicate = normalizedInputName.length >= 2
    ? existingAreas.find((a) => {
        if (initialData && a.id === initialData.id) return false;
        const existName = (a.name || '').trim().toLowerCase();
        return existName === normalizedInputName ||
          (existName.length >= 4 && (existName.includes(normalizedInputName) || normalizedInputName.includes(existName)));
      })
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(isBn ? 'অনুগ্রহ করে এলাকার নাম প্রদান করুন।' : 'Please enter the area name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: Partial<AreaMaster> = {
        name: trimmedName,
        areaCode: areaCode.trim() || undefined,
        description: description.trim() || undefined,
        boundaryDescription: description.trim() || undefined,
        assignedCollectionWorkerId: assignedWorkerId || undefined,
        collectionWorkerIds: assignedWorkerId ? [assignedWorkerId] : [],
        status,
        notes: notes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || (isBn ? 'সংরক্ষণে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Failed to save area.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-siliguri">
                {isEditing
                  ? (isBn ? 'এলাকার তথ্য সম্পাদনা' : 'Edit Area / Mahalla')
                  : (isBn ? '＋ নতুন এলাকা যোগ করুন' : '＋ Add New Area / Mahalla')}
              </h3>
              <p className="text-xs text-slate-500 font-tiro">
                {isBn
                  ? 'মহল্লা বা এলাকা ভিত্তিক ভৌগোলিক পরিচিতি'
                  : 'Geographical unit for households and musalli directory'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs font-tiro">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Area Name (Required) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'এলাকার নাম' : 'Area Name'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={isBn ? 'যেমন: খুরুশকুল বাজার বা উত্তর পাড়া' : 'e.g. North Mahalla or Main Bazar'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
              autoFocus
            />

            {/* Potential Duplicate Warning (Non-blocking) */}
            {potentialDuplicate && (
              <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg flex items-start space-x-2 text-amber-800 text-[11px] font-tiro mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-semibold font-siliguri">{isBn ? 'সম্ভাব্য একই এলাকা: ' : 'Potential duplicate: '}</span>
                  {isBn
                    ? `"${potentialDuplicate.name}" (${potentialDuplicate.areaCode || 'কোডবিহীন'}) নামে একটি এলাকা ইতিমধ্যে বিদ্যমান।`
                    : `An area named "${potentialDuplicate.name}" already exists.`}
                </div>
              </div>
            )}
          </div>

          {/* Area Code (Auto-generated preview / manual optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'এলাকা কোড' : 'Area Code'}
              </label>
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder={isBn ? 'স্বয়ংক্রিয় (যেমন: AREA-01)' : 'Auto (e.g. AREA-01)'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400 font-medium"
              />
              <p className="text-[10px] text-slate-400 font-tiro">
                {isBn ? 'খালি রাখলে সিস্টেম স্বয়ংক্রিয় কোড দেবে' : 'Leave empty for auto-generation'}
              </p>
            </div>

            {/* Status Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'স্ট্যাটাস' : 'Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all font-medium"
              >
                <option value="ACTIVE">{isBn ? '✅ সক্রিয় (Active)' : 'Active'}</option>
                <option value="INACTIVE">{isBn ? '⏸️ নিষ্ক্রিয় (Inactive)' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          {/* Boundary / Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'বিবরণ ও সীমানা' : 'Boundary / Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isBn ? 'মসজিদের উত্তর পাশের বাজার ও সংলগ্ন আবাসিক বসতি...' : 'North side boundary, main street and resident lane...'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Assigned Collection Worker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri flex items-center justify-between">
              <span>{isBn ? 'দায়িত্বপ্রাপ্ত সংগ্রহকারী' : 'Assigned Collection Worker'}</span>
              <span className="text-[10px] text-slate-400 font-normal font-tiro">
                {collectionWorkers.length === 0 ? (isBn ? '(পরবর্তী ধাপে সক্রিয় হবে)' : '(Available in future phase)') : ''}
              </span>
            </label>
            {collectionWorkers.length > 0 ? (
              <select
                value={assignedWorkerId}
                onChange={(e) => setAssignedWorkerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500"
              >
                <option value="">{isBn ? '-- সংগ্রহকারী নির্বাচন করুন (ঐচ্ছিক) --' : '-- Select Worker (Optional) --'}</option>
                {collectionWorkers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.workerCode ? `[${w.workerCode}] ` : ''}{w.name} {w.phone ? `(${w.phone})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3.5 py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-tiro flex items-center space-x-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{isBn ? 'বর্তমানে কোনো সংগ্রহকারী তালিকাভুক্ত নেই। পরবর্তী ধাপে নির্ধারণ করা যাবে।' : 'No collection workers registered yet. Can be assigned later.'}</span>
              </div>
            )}
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'অভ্যন্তরীণ নোট (ঐচ্ছিক)' : 'Internal Notes (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isBn ? 'অতিরিক্ত কোনো মন্তব্য বা বিশেষ তথ্য...' : 'Special notes or remarks...'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer font-siliguri disabled:opacity-50"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer font-siliguri disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? (isBn ? 'হালনাগাদ করুন' : 'Update Area') : (isBn ? 'এলাকা সংরক্ষণ করুন' : 'Save Area')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

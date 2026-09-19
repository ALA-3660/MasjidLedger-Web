import React, { useState, useEffect } from 'react';
import {
  X,
  Home,
  MapPin,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  Loader2,
  Phone,
  UserCheck,
  Building,
} from 'lucide-react';
import { FamilyMaster, AreaMaster, PersonMaster } from '../../types';
import { Language } from '../../lib/i18n';
import { api } from '../../lib/api';

interface FamilyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<FamilyMaster>) => Promise<void>;
  initialData?: FamilyMaster | null;
  existingFamilies: FamilyMaster[];
  areas: AreaMaster[];
  persons?: PersonMaster[];
  language?: Language;
}

export const FamilyFormModal: React.FC<FamilyFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingFamilies,
  areas,
  persons = [],
  language = 'bn',
}) => {
  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [familyHeadPersonId, setFamilyHeadPersonId] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [houseRoadBlock, setHouseRoadBlock] = useState('');
  const [description, setDescription] = useState('');
  const [memberCount, setMemberCount] = useState<string>('0');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matches: { family: FamilyMaster; reasons: string[] }[];
  } | null>(null);

  const isBn = language === 'bn';
  const isEditing = !!initialData;

  // Active areas or current assigned area
  const availableAreas = areas.filter(
    (a) => a.status === 'ACTIVE' || (initialData && a.id === initialData.areaId)
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setAreaId(initialData.areaId || '');
        setFamilyCode(initialData.familyCode || '');
        setFamilyHeadPersonId(initialData.familyHeadPersonId || '');
        setMobile(initialData.mobile || '');
        setAddress(initialData.address || '');
        setHouseRoadBlock(initialData.houseRoadBlock || '');
        setDescription(initialData.description || '');
        setMemberCount(initialData.memberCount !== undefined ? String(initialData.memberCount) : '0');
        setStatus(initialData.status || 'ACTIVE');
        setNotes(initialData.notes || '');
      } else {
        setName('');
        setAreaId(availableAreas.length > 0 ? availableAreas[0].id : '');
        setFamilyCode('');
        setFamilyHeadPersonId('');
        setMobile('');
        setAddress('');
        setHouseRoadBlock('');
        setDescription('');
        setMemberCount('0');
        setStatus('ACTIVE');
        setNotes('');
      }
      setError(null);
      setDuplicateWarning(null);
    }
  }, [isOpen, initialData]);

  // Live duplicate check on name, area, mobile, or code change
  useEffect(() => {
    if (!isOpen || !name.trim()) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.checkDuplicateFamily({
          name: name.trim(),
          areaId: areaId || undefined,
          familyCode: familyCode.trim() || undefined,
          mobile: mobile.trim() || undefined,
          address: address.trim() || undefined,
          houseRoadBlock: houseRoadBlock.trim() || undefined,
          excludeId: initialData?.id,
        });

        if (res.hasPotentialDuplicates && res.matches.length > 0) {
          setDuplicateWarning(res);
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        // Non-blocking duplicate check error
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [name, areaId, familyCode, mobile, address, houseRoadBlock, isOpen, initialData?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(isBn ? 'অনুগ্রহ করে পরিবার / বাড়ির নাম প্রদান করুন।' : 'Please enter the family / house name.');
      return;
    }

    if (!areaId) {
      setError(isBn ? 'অনুগ্রহ করে একটি এলাকা / মহল্লা নির্বাচন করুন।' : 'Please select an area / mahalla.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const parsedMemberCount = parseInt(memberCount, 10);

      const payload: Partial<FamilyMaster> = {
        name: trimmedName,
        areaId,
        familyCode: familyCode.trim() || undefined,
        familyHeadPersonId: familyHeadPersonId || undefined,
        mobile: mobile.trim() || undefined,
        address: address.trim() || undefined,
        houseRoadBlock: houseRoadBlock.trim() || undefined,
        description: description.trim() || undefined,
        memberCount: !isNaN(parsedMemberCount) && parsedMemberCount >= 0 ? parsedMemberCount : 0,
        status,
        notes: notes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || (isBn ? 'সংরক্ষণে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Failed to save family.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-siliguri">
                {isEditing
                  ? (isBn ? 'পরিবার / বাড়ির তথ্য সম্পাদনা' : 'Edit Family / Household')
                  : (isBn ? '＋ নতুন পরিবার / বাড়ি যোগ করুন' : '＋ Add New Family / Household')}
              </h3>
              <p className="text-xs text-slate-500 font-tiro">
                {isBn
                  ? 'এলাকাভিত্তিক পরিবার খতিয়ান ও খানা ইউনিট নিবন্ধন'
                  : 'Household register and family unit under area jurisdiction'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs font-tiro">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Area Selection (Required) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'এলাকা / মহল্লা' : 'Area / Mahalla'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={areaId}
              onChange={(e) => {
                setAreaId(e.target.value);
                if (error) setError(null);
              }}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all font-medium"
            >
              {availableAreas.length === 0 ? (
                <option value="">{isBn ? 'কোনো সক্রিয় এলাকা নেই (প্রথমে এলাকা তৈরি করুন)' : 'No active area found'}</option>
              ) : (
                availableAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    📍 {a.name} {a.areaCode ? `(${a.areaCode})` : ''}
                  </option>
                ))
              )}
            </select>
            {availableAreas.length === 0 && (
              <p className="text-[11px] text-amber-600 font-tiro">
                {isBn
                  ? '⚠️ পরিবার যুক্ত করতে প্রথমে এলাকা / মহল্লা মাস্টার থেকে এলাকা তৈরি করুন।'
                  : '⚠️ Please create an Area first before adding a Family.'}
              </p>
            )}
          </div>

          {/* Family / House Name (Required) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'পরিবার / বাড়ির নাম' : 'Family / House Name'}{' '}
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
              placeholder={isBn ? 'যেমন: হাজী মোবারক আলীর বাড়ি বা চৌধুরী পরিবার' : 'e.g. Haji Mubarak Ali Bari or Chowdhury Family'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400"
              autoFocus
            />

            {/* Non-blocking Duplicate Warning Banner */}
            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-900 text-[11px] font-tiro mt-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold font-siliguri text-amber-800">
                    {isBn ? 'সম্ভাব্য একই পরিবার / বাড়ি শনাক্ত হয়েছে:' : 'Potential Duplicate Household:'}
                  </div>
                  {duplicateWarning.matches.slice(0, 2).map((m, idx) => (
                    <div key={idx} className="text-amber-700">
                      • <span className="font-semibold">{m.family.name}</span> ({m.family.familyCode || m.family.id}): {m.reasons.join(', ')}
                    </div>
                  ))}
                  <div className="text-[10px] text-amber-600 pt-0.5">
                    {isBn
                      ? '(তথ্য সঠিক থাকলে আপনি এই সতর্কবার্তা অগ্রাহ্য করে সংরক্ষণ করতে পারেন)'
                      : '(You may still save if this is an intended distinct entry)'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Family Code & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'পারিবারিক কোড' : 'Family Code'}
              </label>
              <input
                type="text"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value)}
                placeholder={isBn ? 'স্বয়ংক্রিয় (যেমন: FAM-00001)' : 'Auto (e.g. FAM-00001)'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
              />
              <p className="text-[10px] text-slate-400 font-tiro">
                {isBn ? 'খালি রাখলে সিস্টেম স্বয়ংক্রিয় কোড দেবে' : 'Leave empty for auto-generated code'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'স্ট্যাটাস' : 'Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all font-medium"
              >
                <option value="ACTIVE">{isBn ? '✅ সক্রিয় (Active)' : 'Active'}</option>
                <option value="INACTIVE">{isBn ? '⏸️ নিষ্ক্রিয় (Inactive)' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          {/* Mobile & House/Road/Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{isBn ? 'যোগাযোগের মোবাইল' : 'Contact Mobile'}</span>
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={isBn ? 'যেমন: 017xxxxxxxx' : 'e.g. 017xxxxxxxx'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>{isBn ? 'বাড়ি / রোড / হোল্ডিং নং' : 'House / Road / Holding No'}</span>
              </label>
              <input
                type="text"
                value={houseRoadBlock}
                onChange={(e) => setHouseRoadBlock(e.target.value)}
                placeholder={isBn ? 'যেমন: রোড #৩, বাড়ি #১২/এ' : 'e.g. Road #3, House #12/A'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'পূর্ণাঙ্গ ঠিকানা' : 'Full Address'}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isBn ? 'গ্রাম / পাড়া / ডাকঘর ও পরিচিতি' : 'Village, Lane, Post office or location note'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Family Head & Member Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>{isBn ? 'পরিবার প্রধান (ঐচ্ছিক)' : 'Head of Family'}</span>
              </label>
              <select
                value={familyHeadPersonId}
                onChange={(e) => setFamilyHeadPersonId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all"
              >
                <option value="">{isBn ? '-- পরিবার প্রধান নির্বাচন করুন --' : '-- Select Family Head --'}</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.personCode ? `(${p.personCode})` : ''} {p.mobile ? `- ${p.mobile}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-tiro">
                {isBn ? 'পরবর্তী ধাপে মুসল্লি তালিকা থেকেও প্রধান নির্ধারণ করা যাবে' : 'Can also be linked in Person Master phase'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? 'আনুমানিক সদস্য সংখ্যা' : 'Estimated Member Count'}
              </label>
              <input
                type="number"
                min="0"
                value={memberCount}
                onChange={(e) => setMemberCount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Description & Boundary */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'বিস্তারিত / পরিচিতি' : 'Description / Details'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isBn ? 'বাড়ির বিশেষ পরিচিতি বা অবস্থানগত বিবরণ...' : 'Landmark, special identity note...'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? 'অভ্যন্তরীণ নোট (ঐচ্ছিক)' : 'Internal Notes (Optional)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isBn ? 'মসজিদ কমিটির জন্য বিশেষ কোনো মন্তব্য...' : 'Internal administrative remarks...'}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Architecture safety tag */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center space-x-2 text-slate-500 text-[11px] font-tiro">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {isBn
                ? 'পরিবারের সাথে এলাকা ম্যাপ করা থাকবে এবং পরিবারের সদস্য হিসেবে মুসল্লিদের তালিকাভুক্ত করা যাবে।'
                : 'Family is mapped to Area and can link individual musalli members in Person Master.'}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer font-siliguri disabled:opacity-50"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableAreas.length === 0}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-700/20 transition-all cursor-pointer font-siliguri flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? (isBn ? 'হালনাগাদ করুন' : 'Update Family') : (isBn ? 'সংরক্ষণ করুন' : 'Save Family')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

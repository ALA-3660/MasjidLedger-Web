import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  UserCheck,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Save,
  CheckCircle2,
  Users,
  Building,
  UserCog,
  ShieldCheck,
} from 'lucide-react';
import { CollectionWorker, AreaMaster, PersonMaster, CommitteeMember, Staff } from '../../types';
import { Language, toBanglaNumber } from '../../lib/i18n';
import { api } from '../../lib/api';

interface CollectionWorkerFormModalProps {
  isOpen: boolean;
  workerToEdit: CollectionWorker | null;
  areas: AreaMaster[];
  persons: PersonMaster[];
  staff?: Staff[];
  committeeMembers?: CommitteeMember[];
  existingWorkers: CollectionWorker[];
  language?: Language;
  onClose: () => void;
  onSuccess: () => void;
}

type IdentitySource = 'PERSON' | 'STAFF' | 'COMMITTEE' | 'MANUAL';

export const CollectionWorkerFormModal: React.FC<CollectionWorkerFormModalProps> = ({
  isOpen,
  workerToEdit,
  areas,
  persons,
  staff = [],
  committeeMembers = [],
  existingWorkers,
  language = 'bn',
  onClose,
  onSuccess,
}) => {
  const isBn = language === 'bn';

  const [identitySource, setIdentitySource] = useState<IdentitySource>('PERSON');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedCommitteeMemberId, setSelectedCommitteeMemberId] = useState('');

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');

  const [searchPersonQuery, setSearchPersonQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (workerToEdit) {
      setName(workerToEdit.name || '');
      setMobile(workerToEdit.mobile || '');
      setSelectedPersonId(workerToEdit.personId || '');
      setSelectedStaffId(workerToEdit.staffId || '');
      setSelectedCommitteeMemberId(workerToEdit.committeeMemberId || '');
      setSelectedAreaIds(workerToEdit.areaIds || []);
      setStatus(workerToEdit.status || 'ACTIVE');
      setNotes(workerToEdit.notes || '');

      if (workerToEdit.personId) {
        setIdentitySource('PERSON');
      } else if (workerToEdit.staffId) {
        setIdentitySource('STAFF');
      } else if (workerToEdit.committeeMemberId) {
        setIdentitySource('COMMITTEE');
      } else {
        setIdentitySource('MANUAL');
      }
    } else {
      setName('');
      setMobile('');
      setSelectedPersonId('');
      setSelectedStaffId('');
      setSelectedCommitteeMemberId('');
      setSelectedAreaIds([]);
      setStatus('ACTIVE');
      setNotes('');
      setIdentitySource('PERSON');
      setSearchPersonQuery('');
    }
    setErrorMessage('');
  }, [workerToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle identity selection
  const handleSelectPerson = (person: PersonMaster) => {
    // Check if duplicate worker exists
    const duplicate = existingWorkers.find(
      (w) => w.personId === person.id && (!workerToEdit || w.id !== workerToEdit.id)
    );
    if (duplicate) {
      setErrorMessage(
        isBn
          ? `এই ব্যক্তির জন্য ইতোমধ্যে একটি সংগ্রহকারী প্রোফাইল (${duplicate.name}) বিদ্যমান রয়েছে।`
          : `A collection worker profile already exists for this person (${duplicate.name}).`
      );
      return;
    }

    setErrorMessage('');
    setSelectedPersonId(person.id);
    setSelectedStaffId('');
    setSelectedCommitteeMemberId('');
    setName(person.fullName);
    setMobile(person.mobile || '');
    if (person.areaId && !selectedAreaIds.includes(person.areaId)) {
      setSelectedAreaIds((prev) => [...prev, person.areaId!]);
    }
  };

  const handleSelectStaff = (st: Staff) => {
    const duplicate = existingWorkers.find(
      (w) => w.staffId === st.id && (!workerToEdit || w.id !== workerToEdit.id)
    );
    if (duplicate) {
      setErrorMessage(
        isBn
          ? `এই স্টাফের জন্য ইতোমধ্যে একটি সংগ্রহকারী প্রোফাইল (${duplicate.name}) বিদ্যমান রয়েছে।`
          : `A collection worker profile already exists for this staff member (${duplicate.name}).`
      );
      return;
    }

    setErrorMessage('');
    setSelectedStaffId(st.id);
    setSelectedPersonId('');
    setSelectedCommitteeMemberId('');
    setName(st.name);
    setMobile(st.phone || '');
  };

  const handleSelectCommittee = (cm: CommitteeMember) => {
    const duplicate = existingWorkers.find(
      (w) => w.committeeMemberId === cm.id && (!workerToEdit || w.id !== workerToEdit.id)
    );
    if (duplicate) {
      setErrorMessage(
        isBn
          ? `এই কমিটি সদস্যের জন্য ইতোমধ্যে একটি সংগ্রহকারী প্রোফাইল (${duplicate.name}) বিদ্যমান রয়েছে।`
          : `A collection worker profile already exists for this committee member (${duplicate.name}).`
      );
      return;
    }

    setErrorMessage('');
    setSelectedCommitteeMemberId(cm.id);
    setSelectedPersonId('');
    setSelectedStaffId('');
    setName(cm.name);
    setMobile(cm.phone || '');
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে সংগ্রহকারীর নাম প্রদান করুন।' : 'Please provide worker name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: Partial<CollectionWorker> = {
        name: name.trim(),
        mobile: mobile.trim() || undefined,
        personId: selectedPersonId || undefined,
        staffId: selectedStaffId || undefined,
        committeeMemberId: selectedCommitteeMemberId || undefined,
        areaIds: selectedAreaIds,
        status,
        notes: notes.trim() || undefined,
      };

      if (workerToEdit) {
        await api.updateCollectionWorker(workerToEdit.id, payload);
      } else {
        await api.createCollectionWorker(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || (isBn ? 'সংরক্ষণ করতে সমস্যা হয়েছে।' : 'Failed to save collection worker.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter persons for identity linking
  const filteredPersons = persons.filter((p) => {
    if (!searchPersonQuery.trim()) return true;
    const q = searchPersonQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.mobileNumber && p.mobileNumber.includes(q)) ||
      (p.personCode && p.personCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-emerald-800 to-teal-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-siliguri leading-snug">
                {workerToEdit
                  ? isBn
                    ? 'সংগ্রহকারী তথ্য ও দায়িত্ব সম্পাদনা'
                    : 'Edit Collection Worker'
                  : isBn
                  ? 'নতুন সংগ্রহকারী নিয়োগ / দায়িত্ব অর্পণ'
                  : 'Assign New Collection Worker'}
              </h2>
              <p className="text-xs text-emerald-100 font-tiro">
                {isBn
                  ? 'বিদ্যমান মুসল্লি, স্টাফ বা কমিটি সদস্যকে সংগ্রহ কার্যক্রমের দায়িত্ব প্রদান করুন'
                  : 'Assign operational collection role to existing musalli, staff, or committee member'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-xs font-tiro">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Architecture Rule Banner */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start space-x-3">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 font-tiro leading-relaxed">
              <span className="font-bold font-siliguri">
                {isBn ? 'অপারেশনাল রোল নীতি: ' : 'Operational Role Rule: '}
              </span>
              {isBn
                ? 'সংগ্রহকারী একটি অপারেশনাল দায়িত্ব। পৃথক কোনো মানব-পরিচয় তৈরি হবে না; বিদ্যমান মুসল্লি/স্টাফ/কমিটি সদস্য তালিকা থেকে নির্বাচন করুন।'
                : 'Collection worker is an operational role linked to existing musalli, staff, or committee identity.'}
            </div>
          </div>

          {/* 1. Identity Source Selector (Only for new or when re-linking) */}
          {!workerToEdit && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? '১. পরিচয় উৎস নির্বাচন করুন' : '1. Select Identity Source'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentitySource('PERSON');
                    setSelectedPersonId('');
                    setSelectedStaffId('');
                    setSelectedCommitteeMemberId('');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-siliguri font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    identitySource === 'PERSON'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>{isBn ? 'মুসল্লি / ব্যক্তি' : 'Musalli'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentitySource('STAFF');
                    setSelectedPersonId('');
                    setSelectedStaffId('');
                    setSelectedCommitteeMemberId('');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-siliguri font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    identitySource === 'STAFF'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserCog className="w-4 h-4 text-blue-600" />
                  <span>{isBn ? 'মসজিদ স্টাফ' : 'Staff'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentitySource('COMMITTEE');
                    setSelectedPersonId('');
                    setSelectedStaffId('');
                    setSelectedCommitteeMemberId('');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-siliguri font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    identitySource === 'COMMITTEE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4 text-teal-600" />
                  <span>{isBn ? 'কমিটি সদস্য' : 'Committee'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentitySource('MANUAL');
                    setSelectedPersonId('');
                    setSelectedStaffId('');
                    setSelectedCommitteeMemberId('');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-siliguri font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    identitySource === 'MANUAL'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4 text-slate-600" />
                  <span>{isBn ? 'অন্যান্য / ভলান্টিয়ার' : 'Volunteer'}</span>
                </button>
              </div>

              {/* Source-specific picker */}
              {identitySource === 'PERSON' && (
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={isBn ? 'মুসল্লির নাম, মোবাইল বা কোড দিয়ে খুঁজুন...' : 'Search musalli...'}
                      value={searchPersonQuery}
                      onChange={(e) => setSearchPersonQuery(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-800 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {filteredPersons.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-tiro">
                        {isBn ? 'কোনো ব্যক্তি পাওয়া যায়নি' : 'No persons found'}
                      </div>
                    ) : (
                      filteredPersons.slice(0, 15).map((p) => {
                        const isSelected = selectedPersonId === p.id;
                        const isAlreadyWorker = existingWorkers.some((w) => w.personId === p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => !isAlreadyWorker && handleSelectPerson(p)}
                            className={`p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                : isAlreadyWorker
                                ? 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-siliguri font-bold">{p.fullName}</span>
                              {p.personCode && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-baloo">
                                  {p.personCode}
                                </span>
                              )}
                              {p.mobileNumber && (
                                <span className="text-slate-500 font-baloo text-[11px]">
                                  ({p.mobileNumber})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {isAlreadyWorker ? (
                                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-siliguri">
                                  {isBn ? 'ইতোমধ্যে কর্মী' : 'Already Worker'}
                                </span>
                              ) : isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <span className="text-emerald-700 font-siliguri text-[11px] font-bold">
                                  {isBn ? 'বাছাই করুন' : 'Select'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {identitySource === 'STAFF' && (
                <div className="space-y-2 pt-1">
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {staff.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-tiro">
                        {isBn ? 'কোনো স্টাফ পাওয়া যায়নি' : 'No staff found'}
                      </div>
                    ) : (
                      staff.map((st) => {
                        const isSelected = selectedStaffId === st.id;
                        const isAlreadyWorker = existingWorkers.some((w) => w.staffId === st.id);
                        return (
                          <div
                            key={st.id}
                            onClick={() => !isAlreadyWorker && handleSelectStaff(st)}
                            className={`p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                : isAlreadyWorker
                                ? 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-siliguri font-bold">{st.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md font-siliguri">
                                {st.designation}
                              </span>
                              {st.phone && (
                                <span className="text-slate-500 font-baloo text-[11px]">({st.phone})</span>
                              )}
                            </div>
                            {isAlreadyWorker ? (
                              <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-siliguri">
                                {isBn ? 'ইতোমধ্যে কর্মী' : 'Already Worker'}
                              </span>
                            ) : isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <span className="text-emerald-700 font-siliguri text-[11px] font-bold">
                                {isBn ? 'বাছাই করুন' : 'Select'}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {identitySource === 'COMMITTEE' && (
                <div className="space-y-2 pt-1">
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {committeeMembers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-tiro">
                        {isBn ? 'কোনো কমিটি সদস্য পাওয়া যায়নি' : 'No committee members found'}
                      </div>
                    ) : (
                      committeeMembers.map((cm) => {
                        const isSelected = selectedCommitteeMemberId === cm.id;
                        const isAlreadyWorker = existingWorkers.some((w) => w.committeeMemberId === cm.id);
                        return (
                          <div
                            key={cm.id}
                            onClick={() => !isAlreadyWorker && handleSelectCommittee(cm)}
                            className={`p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                : isAlreadyWorker
                                ? 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-siliguri font-bold">{cm.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded-md font-siliguri">
                                {cm.position}
                              </span>
                              {cm.phone && (
                                <span className="text-slate-500 font-baloo text-[11px]">({cm.phone})</span>
                              )}
                            </div>
                            {isAlreadyWorker ? (
                              <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-siliguri">
                                {isBn ? 'ইতোমধ্যে কর্মী' : 'Already Worker'}
                              </span>
                            ) : isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <span className="text-emerald-700 font-siliguri text-[11px] font-bold">
                                {isBn ? 'বাছাই করুন' : 'Select'}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Worker Basic Information */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 font-siliguri">
              {isBn ? '২. সংগ্রহকারীর প্রোফাইল তথ্য' : '2. Worker Profile Information'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 font-siliguri mb-1">
                  {isBn ? 'সংগ্রহকারীর পূর্ণ নাম *' : 'Worker Full Name *'}
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isBn ? 'যেমন: মোহাম্মদ রহিম' : 'e.g. Mohammad Rahim'}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 font-siliguri mb-1">
                  {isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-baloo text-slate-800 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Assigned Areas (Multi-select) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 font-siliguri">
                {isBn ? '৩. দায়িত্বপ্রাপ্ত এলাকা / মহল্লা সমূহ' : '3. Assigned Areas / Mahallas'}
              </label>
              <span className="text-[11px] text-slate-500 font-tiro">
                {isBn
                  ? `নির্বাচিত: ${toBanglaNumber(selectedAreaIds.length)} টি`
                  : `Selected: ${selectedAreaIds.length}`}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              {areas.length === 0 ? (
                <div className="col-span-2 text-center text-xs text-slate-400 font-tiro py-2">
                  {isBn ? 'কোনো এলাকা তালিকাভুক্ত নেই' : 'No areas registered'}
                </div>
              ) : (
                areas.map((area) => {
                  const isChecked = selectedAreaIds.includes(area.id);
                  return (
                    <label
                      key={area.id}
                      className={`flex items-center space-x-2 p-2 rounded-lg text-xs font-siliguri cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-emerald-100/70 text-emerald-900 font-bold border border-emerald-300'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleArea(area.id)}
                        className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{area.nameBn || area.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-600 font-siliguri mb-1">
                {isBn ? 'কার্যক্রম স্ট্যাটাস' : 'Operational Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-siliguri text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
              >
                <option value="ACTIVE">{isBn ? 'সক্রিয় (Active)' : 'Active'}</option>
                <option value="INACTIVE">{isBn ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 font-siliguri mb-1">
                {isBn ? 'মন্তব্য / রুট সংক্রান্ত নোট' : 'Notes / Route Details'}
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isBn ? 'যেমন: শুক্রবারে কালেকশন করেন' : 'e.g. Friday morning route'}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-tiro text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-siliguri font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-siliguri font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? isBn
                    ? 'সংরক্ষণ হচ্ছে...'
                    : 'Saving...'
                  : workerToEdit
                  ? isBn
                    ? 'তথ্য হালনাগাদ করুন'
                    : 'Update Worker'
                  : isBn
                  ? 'সংগ্রহকারী হিসেবে সংরক্ষণ করুন'
                  : 'Assign Worker'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

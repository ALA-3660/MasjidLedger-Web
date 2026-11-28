import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Check, Plus, User as UserIcon, X } from 'lucide-react';
import { api } from '../../lib/api';
import { BUILT_IN_PARTY_ROLES, getPartyRoleLabelBn } from '../../lib/partyCatalog';
import {
  PartyCustomRoleDef,
  PartyDuplicateReasonCode,
  PartyProfileType,
  PartyRecord,
} from '../../types/partyTypes';

export interface PartyQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (party: PartyRecord) => void;
  defaultPartyType?: PartyProfileType;
  defaultRoles?: string[];
  defaultName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  defaultNid?: string;
  defaultOccupation?: string;
  titleBn?: string;
}

export const PartyQuickCreateModal: React.FC<PartyQuickCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultPartyType = 'INDIVIDUAL',
  defaultRoles = ['SUPPLIER'],
  defaultName = '',
  defaultPhone = '',
  defaultAddress = '',
  defaultNid = '',
  defaultOccupation = '',
  titleBn = 'নতুন ব্যক্তি বা প্রতিষ্ঠান দ্রুত নিবন্ধন',
}) => {
  const [partyType, setPartyType] = useState<PartyProfileType>(defaultPartyType);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [alternatePhone, setAlternatePhone] = useState('');
  const [fatherOrGuardianName, setFatherOrGuardianName] = useState('');
  const [organizationHeadName, setOrganizationHeadName] = useState('');
  const [fullAddress, setFullAddress] = useState(defaultAddress);
  const [nidNumber, setNidNumber] = useState(defaultNid);
  const [occupationOrSkill, setOccupationOrSkill] = useState(defaultOccupation);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    defaultRoles.length > 0 ? defaultRoles : ['OTHER']
  );
  const [customRoles, setCustomRoles] = useState<PartyCustomRoleDef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateMatches, setDuplicateMatches] = useState<
    Array<{
      party: PartyRecord;
      confidence: 'HIGH' | 'MEDIUM';
      reasons: PartyDuplicateReasonCode[];
      reasonLabelsBn: string[];
    }>
  >([]);

  useEffect(() => {
    if (!isOpen) return;
    setPartyType(defaultPartyType);
    setName(defaultName || '');
    setPhone(defaultPhone || '');
    setAlternatePhone('');
    setFatherOrGuardianName('');
    setOrganizationHeadName('');
    setFullAddress(defaultAddress || '');
    setNidNumber(defaultNid || '');
    setOccupationOrSkill(defaultOccupation || '');
    setSelectedRoles(defaultRoles.length > 0 ? defaultRoles : ['OTHER']);
    setErrorMsg('');
    setDuplicateMatches([]);

    api
      .getPartyRoles()
      .then((res) => setCustomRoles(res.custom || []))
      .catch(() => {});
  }, [
    isOpen,
    defaultPartyType,
    defaultName,
    defaultPhone,
    defaultAddress,
    defaultNid,
    defaultOccupation,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedNid = nidNumber.trim();
    if (trimmedName.length < 3 && trimmedPhone.length < 6 && trimmedNid.length < 6) {
      setDuplicateMatches([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const matches = await api.checkPartyDuplicates({
          partyType,
          name: trimmedName,
          phone: trimmedPhone,
          alternatePhone: alternatePhone.trim() || undefined,
          nidNumber: trimmedNid || undefined,
        });
        if (!cancelled) setDuplicateMatches(matches || []);
      } catch {
        if (!cancelled) setDuplicateMatches([]);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, partyType, name, phone, alternatePhone, nidNumber]);

  const allRoles = useMemo(
    () => [
      ...BUILT_IN_PARTY_ROLES.map((r) => ({ code: r.code, labelBn: r.labelBn })),
      ...customRoles.map((r) => ({ code: r.code, labelBn: r.labelBn })),
    ],
    [customRoles]
  );

  const toggleRole = (code: string) => {
    setSelectedRoles((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((item) => item !== code)
          : prev
        : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('ব্যক্তি বা প্রতিষ্ঠানের নাম প্রদান করা আবশ্যক।');
      return;
    }
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 6) {
      setErrorMsg('সঠিক মোবাইল নম্বর প্রদান করা আবশ্যক।');
      return;
    }
    if (selectedRoles.length === 0) {
      setErrorMsg('কমপক্ষে একটি ভূমিকা নির্বাচন করুন।');
      return;
    }

    try {
      setSubmitting(true);
      const created = await api.createParty({
        partyType,
        name: name.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        description:
          partyType === 'INDIVIDUAL' && fatherOrGuardianName.trim()
            ? `পিতা/অভিভাবক: ${fatherOrGuardianName.trim()}`
            : undefined,
        organizationDetails:
          partyType === 'ORGANIZATION' && organizationHeadName.trim()
            ? { contactPersonName: organizationHeadName.trim() }
            : undefined,
        fullAddress: fullAddress.trim() || undefined,
        nidNumber: nidNumber.trim() || undefined,
        occupationOrSkill: occupationOrSkill.trim() || undefined,
        roles: selectedRoles,
        status: 'ACTIVE',
      });
      onCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-siliguri flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-700" />
              {titleBn}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              কেন্দ্রীয় পার্টি রেজিস্ট্রিতে সংরক্ষিত হবে এবং তাৎক্ষণিকভাবে নির্বাচিত হয়ে যাবে
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-800">
              {errorMsg}
            </div>
          )}

          {duplicateMatches.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  সম্ভাব্য ডুপ্লিকেট প্রোফাইল পাওয়া গেছে — নতুন তৈরি না করে বিদ্যমান প্রোফাইল ব্যবহার করতে পারেন:
                </span>
              </div>
              <div className="space-y-1.5">
                {duplicateMatches.slice(0, 3).map((m) => (
                  <div
                    key={m.party.id}
                    className="flex flex-wrap items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {m.party.name}{' '}
                        <span className="font-baloo text-emerald-800">({m.party.partyCode})</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        <span className="font-baloo">{m.party.phone}</span> ·{' '}
                        {m.reasonLabelsBn.join(', ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onCreated(m.party);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      বিদ্যমান প্রোফাইল ব্যবহার করুন
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPartyType('INDIVIDUAL')}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                partyType === 'INDIVIDUAL'
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              ব্যক্তি প্রোফাইল
            </button>
            <button
              type="button"
              onClick={() => setPartyType('ORGANIZATION')}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                partyType === 'ORGANIZATION'
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              প্রতিষ্ঠান / সরবরাহকারী
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {partyType === 'ORGANIZATION' ? 'প্রতিষ্ঠানের নাম' : 'পূর্ণ নাম'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  partyType === 'ORGANIZATION' ? 'যেমন: আল-মদীনা ট্রেডার্স' : 'যেমন: মোঃ রফিকুল ইসলাম'
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-baloo focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {partyType === 'ORGANIZATION' ? 'প্রতিনিধি / প্রোপ্রাইটর' : 'পিতা / অভিভাবকের নাম'}
              </label>
              <input
                type="text"
                value={partyType === 'ORGANIZATION' ? organizationHeadName : fatherOrGuardianName}
                onChange={(e) =>
                  partyType === 'ORGANIZATION'
                    ? setOrganizationHeadName(e.target.value)
                    : setFatherOrGuardianName(e.target.value)
                }
                placeholder="ঐচ্ছিক"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {partyType === 'ORGANIZATION' ? 'ট্রেড লাইসেন্স / রেজি. নং' : 'NID / জাতীয় পরিচয়পত্র নং'}
              </label>
              <input
                type="text"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                placeholder="ঐচ্ছিক"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-baloo focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পেশা / দক্ষতা / ব্যবসার ধরন</label>
              <input
                type="text"
                value={occupationOrSkill}
                onChange={(e) => setOccupationOrSkill(e.target.value)}
                placeholder="যেমন: রাজমিস্ত্রি, সিমেন্ট সরবরাহকারী, ক্রেতা"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বিকল্প মোবাইল</label>
              <input
                type="text"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                placeholder="ঐচ্ছিক"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-baloo focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণ ঠিকানা</label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="গ্রাম/বাড়ি, রাস্তা, ডাকঘর, থানা ও জেলা"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ভূমিকা নির্বাচন করুন (একাধিক নির্বাচন করা যাবে) *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allRoles.map((role) => {
                const active = selectedRoles.includes(role.code);
                return (
                  <button
                    key={role.code}
                    type="button"
                    onClick={() => toggleRole(role.code)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                      active
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {role.labelBn || getPartyRoleLabelBn(role.code, customRoles)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ ও নির্বাচন করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

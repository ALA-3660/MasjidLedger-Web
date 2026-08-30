import React, { useState, useEffect } from 'react';
import {
  X,
  Crosshair,
  User,
  MapPin,
  Calendar,
  Phone,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { CemeteryRecord, CemeteryHeir } from '../types';
import { Language } from '../lib/i18n';

export const GRAVE_TYPES = [
  { id: 'PERMANENT', labelBn: 'স্থায়ী কবর (Permanent)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'TEMPORARY', labelBn: 'অস্থায়ী কবর (Temporary)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'FAMILY', labelBn: 'পারিবারিক প্লট (Family Plot)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'GENERAL', labelBn: 'সাধারণ ওয়াকফ কবর (General)', color: 'bg-slate-100 text-slate-700 border-slate-200' },
] as const;

export const PLOT_STATUSES = [
  { id: 'OCCUPIED', labelBn: 'দাফনকৃত / পূর্ণ (Occupied)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'AVAILABLE', labelBn: 'খালি / উপলব্ধ (Available)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'RESERVED', labelBn: 'সংরক্ষিত (Reserved)', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'MAINTENANCE', labelBn: 'সংস্কারাধীন (Maintenance)', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'ARCHIVED', labelBn: 'আর্কাইভকৃত (Archived)', color: 'bg-slate-100 text-slate-700 border-slate-300' },
] as const;

export const DEFAULT_BLOCKS = ['Block-A', 'Block-B', 'Block-C', 'Block-D', 'উত্তর ব্লক', 'দক্ষিণ ব্লক', 'পূর্ব ব্লক', 'পশ্চিম ব্লক'];

interface CemeteryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editRecord?: CemeteryRecord | null;
  existingRecords?: CemeteryRecord[];
  language?: Language;
}

export const CemeteryFormModal: React.FC<CemeteryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editRecord,
  existingRecords = [],
  language = 'bn',
}) => {
  const isEditing = !!editRecord;

  // Active Form Tab
  const [formTab, setFormTab] = useState<'plot' | 'deceased' | 'burial' | 'heir' | 'notes'>('plot');

  // Form State
  const [recordNumber, setRecordNumber] = useState('');
  const [plotNumber, setPlotNumber] = useState('');
  const [block, setBlock] = useState('Block-A');
  const [row, setRow] = useState('');
  const [graveLocation, setGraveLocation] = useState('');
  const [graveType, setGraveType] = useState<CemeteryRecord['graveType']>('PERMANENT');
  const [plotStatus, setPlotStatus] = useState<CemeteryRecord['plotStatus']>('OCCUPIED');
  const [graveyardName, setGraveyardName] = useState('মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান');

  // Deceased State
  const [deceasedName, setDeceasedName] = useState('');
  const [fatherOrSpouseName, setFatherOrSpouseName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [husbandOrSpouseName, setHusbandOrSpouseName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ageAtDeath, setAgeAtDeath] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState('');
  const [causeOfDeath, setCauseOfDeath] = useState('');
  const [religion, setReligion] = useState('ইসলাম');

  // Burial State
  const [burialDate, setBurialDate] = useState(new Date().toISOString().split('T')[0]);
  const [burialTime, setBurialTime] = useState('');
  const [janazaPlace, setJanazaPlace] = useState('');

  // Heir State
  const [contactPersonName, setContactPersonName] = useState('');
  const [relationWithDeceased, setRelationWithDeceased] = useState('');
  const [contactPersonPhone, setContactPersonPhone] = useState('');
  const [contactPersonAltPhone, setContactPersonAltPhone] = useState('');
  const [heirAddress, setHeirAddress] = useState('');
  const [additionalHeirs, setAdditionalHeirs] = useState<CemeteryHeir[]>([]);

  // Fee & Notes
  const [burialFee, setBurialFee] = useState<number | ''>('');
  const [maintenanceFee, setMaintenanceFee] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editRecord) {
      setRecordNumber(editRecord.recordNumber || '');
      setPlotNumber(editRecord.plotNumber || '');
      setBlock(editRecord.block || 'Block-A');
      setRow(editRecord.row || '');
      setGraveLocation(editRecord.graveLocation || '');
      setGraveType(editRecord.graveType || 'PERMANENT');
      setPlotStatus(editRecord.plotStatus || 'OCCUPIED');
      setGraveyardName(editRecord.graveyardName || 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান');

      setDeceasedName(editRecord.deceasedName || '');
      setFatherOrSpouseName(editRecord.fatherOrSpouseName || '');
      setFatherName(editRecord.fatherName || '');
      setHusbandOrSpouseName(editRecord.husbandOrSpouseName || '');
      setGender(editRecord.gender || 'MALE');
      setDateOfBirth(editRecord.dateOfBirth || '');
      setAgeAtDeath(editRecord.ageAtDeath ? String(editRecord.ageAtDeath) : '');
      setDateOfDeath(editRecord.dateOfDeath || editRecord.burialDate || '');
      setCauseOfDeath(editRecord.causeOfDeath || '');
      setReligion(editRecord.religion || 'ইসলাম');

      setBurialDate(editRecord.burialDate || new Date().toISOString().split('T')[0]);
      setBurialTime(editRecord.burialTime || '');
      setJanazaPlace(editRecord.janazaPlace || '');

      setContactPersonName(editRecord.contactPersonName || '');
      setRelationWithDeceased(editRecord.relationWithDeceased || '');
      setContactPersonPhone(editRecord.contactPersonPhone || '');
      setContactPersonAltPhone(editRecord.contactPersonAltPhone || '');
      setHeirAddress(editRecord.heirAddress || '');
      setAdditionalHeirs(editRecord.heirs || []);

      setBurialFee(editRecord.burialFee || '');
      setMaintenanceFee(editRecord.maintenanceFee || '');
      setNotes(editRecord.notes || '');
    } else {
      const year = new Date().getFullYear();
      const nextNum = existingRecords.length + 1;
      setRecordNumber(`CBR-${year}-${String(nextNum).padStart(4, '0')}`);
      setPlotNumber('');
      setBlock('Block-A');
      setRow('');
      setGraveLocation('');
      setGraveType('PERMANENT');
      setPlotStatus('OCCUPIED');
      setGraveyardName('মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান');

      setDeceasedName('');
      setFatherOrSpouseName('');
      setFatherName('');
      setHusbandOrSpouseName('');
      setGender('MALE');
      setDateOfBirth('');
      setAgeAtDeath('');
      setDateOfDeath(new Date().toISOString().split('T')[0]);
      setCauseOfDeath('');
      setReligion('ইসলাম');

      setBurialDate(new Date().toISOString().split('T')[0]);
      setBurialTime('বাদ আসর');
      setJanazaPlace('বায়তুল আমান কেন্দ্রীয় জামে মসজিদ মাঠ');

      setContactPersonName('');
      setRelationWithDeceased('জ্যেষ্ঠ পুত্র');
      setContactPersonPhone('');
      setContactPersonAltPhone('');
      setHeirAddress('');
      setAdditionalHeirs([]);

      setBurialFee('');
      setMaintenanceFee('');
      setNotes('');
    }
    setErrorMsg('');
    setFormTab('plot');
  }, [editRecord, isOpen, existingRecords.length]);

  if (!isOpen) return null;

  // Duplicate plot number check
  const duplicatePlot = !isEditing && plotNumber.trim()
    ? existingRecords.find(
        (r) =>
          r.plotNumber.toLowerCase().trim() === plotNumber.toLowerCase().trim() &&
          r.plotStatus === 'OCCUPIED' &&
          !r.isArchived
      )
    : null;

  const handleAddHeir = () => {
    setAdditionalHeirs([
      ...additionalHeirs,
      { id: `heir-${Date.now()}`, name: '', relation: '', phone: '', address: '' },
    ]);
  };

  const handleUpdateHeir = (index: number, field: keyof CemeteryHeir, value: string) => {
    const updated = [...additionalHeirs];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalHeirs(updated);
  };

  const handleRemoveHeir = (index: number) => {
    setAdditionalHeirs(additionalHeirs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!plotNumber.trim()) {
      setErrorMsg('অনুগ্রহ করে প্লট / কবর নম্বর প্রদান করুন।');
      setFormTab('plot');
      return;
    }
    if (!deceasedName.trim()) {
      setErrorMsg('অনুগ্রহ করে মরহুমের পূর্ণ নাম প্রদান করুন।');
      setFormTab('deceased');
      return;
    }
    if (!burialDate) {
      setErrorMsg('অনুগ্রহ করে দাফনের তারিখ নির্বাচন করুন।');
      setFormTab('burial');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<CemeteryRecord> = {
        recordNumber: recordNumber.trim() || undefined,
        plotNumber: plotNumber.trim(),
        block: block.trim() || 'Block-A',
        row: row.trim() || undefined,
        graveLocation: graveLocation.trim() || `${block}, প্লট: ${plotNumber}`,
        graveType,
        plotStatus,
        graveyardName: graveyardName.trim(),

        deceasedName: deceasedName.trim(),
        deceasedNameBn: deceasedName.trim(),
        fatherOrSpouseName: fatherOrSpouseName.trim() || fatherName.trim() || husbandOrSpouseName.trim() || '',
        fatherName: fatherName.trim() || undefined,
        husbandOrSpouseName: husbandOrSpouseName.trim() || undefined,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        ageAtDeath: ageAtDeath.trim() || undefined,
        dateOfDeath: dateOfDeath || burialDate,
        causeOfDeath: causeOfDeath.trim() || undefined,
        religion: religion.trim() || 'ইসলাম',

        burialDate,
        burialTime: burialTime.trim() || undefined,
        janazaPlace: janazaPlace.trim() || undefined,

        contactPersonName: contactPersonName.trim(),
        relationWithDeceased: relationWithDeceased.trim() || undefined,
        contactPersonPhone: contactPersonPhone.trim(),
        contactPersonAltPhone: contactPersonAltPhone.trim() || undefined,
        heirAddress: heirAddress.trim() || undefined,
        heirs: additionalHeirs.filter((h) => h.name.trim()),

        burialFee: burialFee ? Number(burialFee) : undefined,
        maintenanceFee: maintenanceFee ? Number(maintenanceFee) : undefined,
        notes: notes.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'রেকর্ড সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl">
              <Crosshair className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isEditing ? 'দাফন রেকর্ড সম্পাদনা (Edit Burial Record)' : 'নতুন দাফন ও কবর রেজিস্ট্রি (New Burial Record)'}
              </h2>
              <p className="text-xs text-slate-300">ওয়াকফ কবরস্থান রেজিস্টারের পূর্ণাঙ্গ তথ্য ভুক্তি</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-1 sm:gap-2 py-2 shrink-0">
          <button
            type="button"
            onClick={() => setFormTab('plot')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              formTab === 'plot' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>১. প্লট ও কবর</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab('deceased')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              formTab === 'deceased' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>২. মরহুমের বিবরণ</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab('burial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              formTab === 'burial' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>৩. জানাজা ও দাফন</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab('heir')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              formTab === 'heir' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>৪. ওয়ারিশ ও অভিভাবক</span>
          </button>
          <button
            type="button"
            onClick={() => setFormTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              formTab === 'notes' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>৫. ফি ও মন্তব্য</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PLOT & GRAVE LOCATION */}
          {formTab === 'plot' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">কবরস্থান ও প্লটের অবস্থান নির্ধারণ</h4>
                  <p className="text-xs text-slate-500">প্লট নম্বর, ব্লক, সারি এবং কবরের ধরন সঠিকভাবে পূরণ করুন</p>
                </div>
                <span className="px-3 py-1 bg-white border border-blue-200 text-blue-800 font-mono font-bold rounded-lg text-xs">
                  {recordNumber || 'CBR-AUTO'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>রেকর্ড নম্বর (Auto/Manual)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recordNumber}
                    onChange={(e) => setRecordNumber(e.target.value)}
                    placeholder="যেমন: CBR-2026-0005"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>প্লট / কবর নম্বর</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={plotNumber}
                    onChange={(e) => setPlotNumber(e.target.value)}
                    placeholder="যেমন: PLOT-A-15 বা A-12"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-blue-700 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                  {duplicatePlot && (
                    <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>সতর্কতা: এই প্লটে ইতিমধ্যে "{duplicatePlot.deceasedName}" এর দাফন রেকর্ড রয়েছে।</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">ব্লক (Block)</label>
                  <div className="flex gap-1.5">
                    <select
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      {DEFAULT_BLOCKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">সারি নং (Row)</label>
                  <input
                    type="text"
                    value={row}
                    onChange={(e) => setRow(e.target.value)}
                    placeholder="যেমন: সারি নং ২ / Row-3"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">কবরের ধরন</label>
                  <select
                    value={graveType}
                    onChange={(e) => setGraveType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {GRAVE_TYPES.map((gt) => (
                      <option key={gt.id} value={gt.id}>
                        {gt.labelBn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">প্লট স্ট্যাটাস</label>
                  <select
                    value={plotStatus}
                    onChange={(e) => setPlotStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {PLOT_STATUSES.map((ps) => (
                      <option key={ps.id} value={ps.id}>
                        {ps.labelBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">কবরস্থানের নাম</label>
                  <input
                    type="text"
                    value={graveyardName}
                    onChange={(e) => setGraveyardName(e.target.value)}
                    placeholder="যেমন: মসজিদ সংলগ্ন ওয়াকফ কবরস্থান"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">কবরের সুনির্দিষ্ট অবস্থান ও সীমানা</label>
                  <input
                    type="text"
                    value={graveLocation}
                    onChange={(e) => setGraveLocation(e.target.value)}
                    placeholder="যেমন: উত্তর-পশ্চিম কোণ, পুরাতন রেইনট্রি গাছের পাশে"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DECEASED INFORMATION */}
          {formTab === 'deceased' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm">মরহুমের ব্যক্তিগত ও ধর্মীয় পরিচয়</h4>
                <p className="text-xs text-slate-500">সঠিক তথ্য দিয়ে অফিসিয়াল রেজিস্ট্রি সমৃদ্ধ রাখুন</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>মরহুমের পূর্ণ নাম (বাংলা)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deceasedName}
                    onChange={(e) => setDeceasedName(e.target.value)}
                    placeholder="যেমন: মরহুম হাজী মোঃ আব্দুর রাজ্জাক"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">লিঙ্গ (Gender)</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="MALE">পুরুষ (Male)</option>
                    <option value="FEMALE">মহিলা (Female)</option>
                    <option value="OTHER">অন্যান্য (Other)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">পিতার নাম</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => {
                      setFatherName(e.target.value);
                      if (!fatherOrSpouseName || fatherOrSpouseName === fatherName) {
                        setFatherOrSpouseName(e.target.value);
                      }
                    }}
                    placeholder="মরহুমের পিতার নাম"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">স্বামী / স্ত্রীর নাম (প্রযোজ্য ক্ষেত্রে)</label>
                  <input
                    type="text"
                    value={husbandOrSpouseName}
                    onChange={(e) => {
                      setHusbandOrSpouseName(e.target.value);
                      if (gender === 'FEMALE' && e.target.value) {
                        setFatherOrSpouseName(`${e.target.value} (স্বামী)`);
                      }
                    }}
                    placeholder="স্বামী বা স্ত্রীর নাম"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">মৃত্যুকালে বয়স</label>
                  <input
                    type="text"
                    value={ageAtDeath}
                    onChange={(e) => setAgeAtDeath(e.target.value)}
                    placeholder="যেমন: ৬৫ বছর"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">জন্ম তারিখ (জানা থাকলে)</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">ইন্তেকালের তারিখ</label>
                  <input
                    type="date"
                    value={dateOfDeath}
                    onChange={(e) => setDateOfDeath(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">ধর্মীয় পরিচয়</label>
                  <input
                    type="text"
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    placeholder="ইসলাম"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">মৃত্যুর কারণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={causeOfDeath}
                  onChange={(e) => setCauseOfDeath(e.target.value)}
                  placeholder="যেমন: বার্ধক্যজনিত অসুস্থতা / স্বাভাবিক ইন্তেকাল / হৃদরোগ"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: JANAZA & BURIAL DETAILS */}
          {formTab === 'burial' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <h4 className="font-bold text-slate-900 text-sm">জানাজা ও দাফনের সময়সূচি</h4>
                <p className="text-xs text-slate-500">দাফনের তারিখ ও স্থান লিপিবদ্ধ করুন</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>দাফনের তারিখ</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={burialDate}
                    onChange={(e) => setBurialDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">দাফনের সময় (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={burialTime}
                    onChange={(e) => setBurialTime(e.target.value)}
                    placeholder="যেমন: বাদ আসর / দুপুর ২:৩০ / বাদ এশা"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">জানাজার স্থান</label>
                  <input
                    type="text"
                    value={janazaPlace}
                    onChange={(e) => setJanazaPlace(e.target.value)}
                    placeholder="যেমন: বায়তুল আমান জামে মসজিদ ঈদগাহ ময়দান"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEIR & FAMILY INFORMATION */}
          {formTab === 'heir' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">ওয়ারিশ ও প্রধান যোগাযোগের ব্যক্তির তথ্য</h4>
                  <p className="text-xs text-slate-500">জরুরি যোগাযোগ এবং ভবিষ্যতে কবর সংক্রান্ত তথ্যের জন্য</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddHeir}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>অতিরিক্ত ওয়ারিশ যোগ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>ওয়ারিশ / যোগাযোগের ব্যক্তির নাম</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    placeholder="যেমন: মোঃ আসাদুজ্জামান"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">মরহুমের সাথে সম্পর্ক</label>
                  <input
                    type="text"
                    value={relationWithDeceased}
                    onChange={(e) => setRelationWithDeceased(e.target.value)}
                    placeholder="যেমন: জ্যেষ্ঠ পুত্র / কন্যা / পিতা / ভাই"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <span>প্রধান মোবাইল নম্বর</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactPersonPhone}
                    onChange={(e) => setContactPersonPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">বিকল্প মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={contactPersonAltPhone}
                    onChange={(e) => setContactPersonAltPhone(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">বর্তমান ও স্থায়ী ঠিকানা</label>
                <input
                  type="text"
                  value={heirAddress}
                  onChange={(e) => setHeirAddress(e.target.value)}
                  placeholder="বাড়ি নং, রাস্তা, গ্রাম/মহল্লা, থানা, জেলা"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Additional Heirs Section */}
              {additionalHeirs.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <h5 className="font-bold text-slate-800 text-xs">অন্যান্য ওয়ারিশগণের তালিকা:</h5>
                  {additionalHeirs.map((heir, idx) => (
                    <div key={heir.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center">
                      <input
                        type="text"
                        placeholder="ওয়ারিশের নাম"
                        value={heir.name}
                        onChange={(e) => handleUpdateHeir(idx, 'name', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="সম্পর্ক (যেমন: কন্যা)"
                        value={heir.relation}
                        onChange={(e) => handleUpdateHeir(idx, 'relation', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="tel"
                        placeholder="মোবাইল"
                        value={heir.phone}
                        onChange={(e) => handleUpdateHeir(idx, 'phone', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="ঠিকানা"
                          value={heir.address || ''}
                          onChange={(e) => handleUpdateHeir(idx, 'address', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveHeir(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: NOTES & FEES */}
          {formTab === 'notes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <h4 className="font-bold text-slate-900 text-sm">দাফন ফি ও বিশেষ প্রশাসনিক মন্তব্য</h4>
                <p className="text-xs text-slate-500">কবর রক্ষণাবেক্ষণ ও ওয়াকফ নীতিমালা সংক্রান্ত মন্তব্য</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">দাফন/খনন ফি (৳) — ঐচ্ছিক</label>
                  <input
                    type="number"
                    min="0"
                    value={burialFee}
                    onChange={(e) => setBurialFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-siliguri font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800">রক্ষণাবেক্ষণ ফি (৳) — ঐচ্ছিক</label>
                  <input
                    type="number"
                    min="0"
                    value={maintenanceFee}
                    onChange={(e) => setMaintenanceFee(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-siliguri font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">বিশেষ মন্তব্য ও ওয়াকফ বিধি</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: স্থায়ী ওয়াকফ কবরস্থান এলাকা। কবর পাকা বা বাঁধানোর অনুমতি নেই। নম্বর ফলক স্থাপন সম্পন্ন।"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {formTab !== 'plot' && (
                <button
                  type="button"
                  onClick={() => {
                    if (formTab === 'notes') setFormTab('heir');
                    else if (formTab === 'heir') setFormTab('burial');
                    else if (formTab === 'burial') setFormTab('deceased');
                    else if (formTab === 'deceased') setFormTab('plot');
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  ← পূর্ববর্তী ধাপ
                </button>
              )}
              {formTab !== 'notes' && (
                <button
                  type="button"
                  onClick={() => {
                    if (formTab === 'plot') setFormTab('deceased');
                    else if (formTab === 'deceased') setFormTab('burial');
                    else if (formTab === 'burial') setFormTab('heir');
                    else if (formTab === 'heir') setFormTab('notes');
                  }}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs"
                >
                  পরবর্তী ধাপ →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : isEditing ? 'আপডেট সংরক্ষণ' : 'রেকর্ড সংরক্ষণ'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Home,
  MapPin,
  Users,
  Phone,
  Building,
  Calendar,
  Clock,
  Copy,
  Check,
  Edit2,
  FileText,
  ShieldCheck,
  Sparkles,
  Info,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { FamilyMaster, AreaMaster, PersonMaster } from '../../types';
import { Language, formatDate, toBanglaNumber } from '../../lib/i18n';

interface FamilyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: FamilyMaster | null;
  area: AreaMaster | null;
  onEdit: (family: FamilyMaster) => void;
  linkedPersons?: PersonMaster[];
  language?: Language;
}

export const FamilyDetailModal: React.FC<FamilyDetailModalProps> = ({
  isOpen,
  onClose,
  family,
  area,
  onEdit,
  linkedPersons = [],
  language = 'bn',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const isBn = language === 'bn';

  if (!isOpen || !family) return null;

  const handleCopyCode = () => {
    const codeToCopy = family.familyCode || family.id;
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isActive = family.status === 'ACTIVE';

  // Find head person name if linked
  const headPerson = linkedPersons.find((p) => p.id === family.familyHeadPersonId);

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
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 font-siliguri">
                  {family.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full font-siliguri ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-tiro">
                {isBn ? 'পারিবারিক খতিয়ান ও পরিচিতি কার্ড' : 'Family & Household Profile Card'}
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

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Identity & Code Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-baloo">
                {isBn ? 'পারিবারিক কোড ও আইডি' : 'Family Code & ID'}
              </div>
              <div className="text-base font-bold text-slate-900 font-baloo mt-0.5 tracking-wide">
                {family.familyCode || family.id}
              </div>
              <div className="text-[11px] text-slate-500 font-baloo mt-0.5">
                ID: {family.id}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer font-siliguri shrink-0"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-baloo">{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-baloo">{isBn ? 'কোড কপি করুন' : 'Copy Code'}</span>
                </>
              )}
            </button>
          </div>

          {/* Area & Location Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100/80 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold font-siliguri">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>{isBn ? 'অন্তর্ভুক্ত এলাকা / মহল্লা' : 'Assigned Area'}</span>
              </div>
              <div className="text-sm font-bold text-slate-900 font-siliguri pt-0.5">
                {area ? area.name : (isBn ? 'অনির্ধারিত এলাকা' : 'Unassigned Area')}
              </div>
              {area?.areaCode && (
                <div className="text-[11px] text-emerald-700 font-baloo">
                  {isBn ? `এলাকা কোড: ${area.areaCode}` : `Area Code: ${area.areaCode}`}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/80 space-y-1">
              <div className="flex items-center space-x-1.5 text-blue-800 text-xs font-bold font-siliguri">
                <Users className="w-4 h-4 text-blue-700" />
                <span>{isBn ? 'সদস্য সংখ্যা' : 'Member Count'}</span>
              </div>
              <div className="text-sm font-bold text-slate-900 font-baloo pt-0.5">
                {isBn
                  ? `${toBanglaNumber(family.memberCount || linkedPersons.length || 0)} জন`
                  : `${family.memberCount || linkedPersons.length || 0} Persons`}
              </div>
              <div className="text-[11px] text-blue-700 font-tiro">
                {isBn
                  ? `নিবন্ধিত মুসল্লি: ${toBanglaNumber(linkedPersons.length)} জন`
                  : `Linked Musalli: ${linkedPersons.length}`}
              </div>
            </div>
          </div>

          {/* Contact & Address Details */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1.5">
              <Building className="w-4 h-4 text-slate-500" />
              <span>{isBn ? 'যোগাযোগ ও ঠিকানা বিবরণ' : 'Contact & Address Details'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-tiro">
              <div>
                <span className="text-slate-400 block text-[11px] font-siliguri">{isBn ? 'মোবাইল নম্বর:' : 'Mobile:'}</span>
                {family.mobile ? (
                  <a
                    href={`tel:${family.mobile}`}
                    className="font-baloo font-semibold text-blue-700 hover:underline inline-flex items-center space-x-1"
                  >
                    <Phone className="w-3 h-3 text-blue-600" />
                    <span>{family.mobile}</span>
                  </a>
                ) : (
                  <span className="text-slate-400">{isBn ? 'প্রদান করা হয়নি' : 'Not provided'}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-siliguri">{isBn ? 'বাড়ি / রোড / হোল্ডিং নং:' : 'House / Road / Block:'}</span>
                <span className="text-slate-800 font-medium">
                  {family.houseRoadBlock || (isBn ? 'অনির্দিষ্ট' : 'Not specified')}
                </span>
              </div>
            </div>

            {family.address && (
              <div className="text-xs font-tiro pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 block text-[11px] font-siliguri">{isBn ? 'পূর্ণ ঠিকানা:' : 'Full Address:'}</span>
                <span className="text-slate-800 leading-relaxed">{family.address}</span>
              </div>
            )}

            {family.description && (
              <div className="text-xs font-tiro pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 block text-[11px] font-siliguri">{isBn ? 'পরিচিতি / সীমানা বিবরণ:' : 'Description / Landmark:'}</span>
                <span className="text-slate-800 leading-relaxed">{family.description}</span>
              </div>
            )}
          </div>

          {/* Family Head & Members Linkage */}
          <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-700 font-siliguri flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>{isBn ? 'পরিবার প্রধান ও সদস্য তালিকা' : 'Family Head & Members'}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-baloo">
                {isBn ? `${toBanglaNumber(linkedPersons.length)} জন মুসল্লি সংযুক্ত` : `${linkedPersons.length} Musallis`}
              </span>
            </div>

            {headPerson && (
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200/60 flex items-center justify-between">
                <div className="text-xs font-tiro text-emerald-950">
                  <span className="text-[10px] font-bold uppercase font-siliguri text-emerald-700 block">{isBn ? 'পরিবার প্রধান' : 'Head of Family'}</span>
                  <span className="font-bold font-siliguri text-slate-900">{headPerson.fullName}</span>
                  {headPerson.mobile && <span className="text-slate-600 font-baloo ml-2">({headPerson.mobile})</span>}
                </div>
                <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 text-[10px] font-bold rounded-md font-siliguri">
                  {isBn ? 'প্রধান' : 'Head'}
                </span>
              </div>
            )}

            {linkedPersons.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {linkedPersons.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between font-tiro"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                        {p.fullName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">{p.fullName}</span>
                        {p.fatherOrHusbandName && (
                          <span className="text-slate-400 text-[11px] ml-1.5">
                            ({isBn ? 'পিতা/স্বামী: ' : 'F/H: '}{p.fatherOrHusbandName})
                          </span>
                        )}
                      </div>
                    </div>
                    {p.personCode && (
                      <span className="text-[11px] text-slate-400 font-baloo">
                        {p.personCode}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-slate-400 text-xs font-tiro bg-white rounded-lg border border-dashed border-slate-200">
                {isBn
                  ? 'এই পরিবারের অধীনে এখনো কোনো নির্দিষ্ট মুসল্লি আইডি সংযুক্ত করা হয়নি।'
                  : 'No individual musalli profiles linked to this family yet.'}
              </div>
            )}
          </div>

          {/* Internal Notes */}
          {family.notes && (
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-800 text-xs font-bold font-siliguri">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>{isBn ? 'অভ্যন্তরীণ মন্তব্য' : 'Internal Remarks'}</span>
              </div>
              <p className="text-xs text-slate-700 font-tiro leading-relaxed">
                {family.notes}
              </p>
            </div>
          )}

          {/* Timestamps & Audit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 font-tiro pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isBn ? 'তৈরি: ' : 'Created: '}{family.createdAt ? formatDate(family.createdAt, language) : '-'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{isBn ? 'হালনাগাদ: ' : 'Updated: '}{family.updatedAt ? formatDate(family.updatedAt, language) : '-'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-1 text-slate-500 text-xs font-tiro">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'মসজিদ ডেটাবেস স্কোপিং সক্রিয়' : 'Mosque Scoped'}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer font-siliguri"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(family);
              }}
              className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-700/20 transition-all cursor-pointer font-siliguri flex items-center space-x-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'সম্পাদনা করুন' : 'Edit Family'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

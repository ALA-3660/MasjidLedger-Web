import React, { useState } from 'react';
import {
  X,
  MapPin,
  Home,
  Users,
  Briefcase,
  Calendar,
  Clock,
  Copy,
  Check,
  Edit2,
  FileText,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { AreaMaster, CollectionWorker } from '../../types';
import { Language, formatDate, toBanglaNumber } from '../../lib/i18n';

interface AreaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: AreaMaster | null;
  onEdit: (area: AreaMaster) => void;
  familyCount?: number;
  personCount?: number;
  collectionWorker?: CollectionWorker | null;
  language?: Language;
}

export const AreaDetailModal: React.FC<AreaDetailModalProps> = ({
  isOpen,
  onClose,
  area,
  onEdit,
  familyCount = 0,
  personCount = 0,
  collectionWorker = null,
  language = 'bn',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const isBn = language === 'bn';

  if (!isOpen || !area) return null;

  const handleCopyCode = () => {
    if (area.areaCode) {
      navigator.clipboard.writeText(area.areaCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const isActive = area.status === 'ACTIVE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 font-siliguri">
                  {area.name}
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
                {isBn ? 'এলাকা ও মহল্লা পরিচিতি কার্ড' : 'Area & Mahalla Profile Card'}
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
        <div className="p-6 space-y-5">
          {/* Identity & Code Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-baloo">
                {isBn ? 'এলাকা কোড' : 'Area Code'}
              </div>
              <div className="text-base font-bold text-slate-900 font-baloo mt-0.5 tracking-wide">
                {area.areaCode || (isBn ? 'কোডবিহীন' : 'No Code')}
              </div>
            </div>

            {area.areaCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer font-siliguri shrink-0"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isBn ? 'কোড কপি করুন' : 'Copy Code'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Description / Boundary */}
          {(area.description || area.boundaryDescription) && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-500 font-siliguri">
                {isBn ? 'বিবরণ ও সীমানা' : 'Boundary / Description'}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs font-tiro text-slate-700 border border-slate-100 leading-relaxed">
                {area.description || area.boundaryDescription}
              </div>
            </div>
          )}

          {/* Relationship Metrics (Derived) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 font-siliguri">
              {isBn ? 'সম্পর্কিত পরিসংখ্যান ও সংযোগ' : 'Relationships & Statistics'}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="flex items-center space-x-1.5 text-blue-700 text-xs font-siliguri font-semibold">
                  <Home className="w-3.5 h-3.5" />
                  <span>{isBn ? 'পরিবার' : 'Families'}</span>
                </div>
                <div className="text-lg font-bold text-blue-950 font-baloo mt-1">
                  {familyCount > 0 ? (isBn ? toBanglaNumber(familyCount) : familyCount) : (isBn ? '০ টি' : '0')}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-siliguri font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ব্যক্তি/মুসল্লি' : 'Persons'}</span>
                </div>
                <div className="text-lg font-bold text-emerald-950 font-baloo mt-1">
                  {personCount > 0 ? (isBn ? toBanglaNumber(personCount) : personCount) : (isBn ? '০ জন' : '0')}
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <div className="flex items-center space-x-1.5 text-indigo-700 text-xs font-siliguri font-semibold">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{isBn ? 'সংগ্রহকারী' : 'Worker'}</span>
                </div>
                <div className="text-xs font-bold text-indigo-950 font-siliguri mt-1.5 truncate">
                  {collectionWorker ? collectionWorker.name : (isBn ? 'নির্ধারিত নয়' : 'Not assigned')}
                </div>
              </div>
            </div>
          </div>

          {/* Activity / Notes */}
          {area.notes && (
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-500 font-siliguri">
                {isBn ? 'অভ্যন্তরীণ মন্তব্য / নোট' : 'Internal Notes'}
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl text-xs font-tiro text-amber-900 border border-amber-100 leading-relaxed">
                {area.notes}
              </div>
            </div>
          )}

          {/* Timestamps & Audit */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-tiro text-slate-500">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isBn ? 'তৈরি: ' : 'Created: '}
                <strong className="font-baloo text-slate-700">{formatDate(area.createdAt, 'bn')}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isBn ? 'সর্বশেষ পরিবর্তন: ' : 'Updated: '}
                <strong className="font-baloo text-slate-700">{formatDate(area.updatedAt, 'bn')}</strong>
              </span>
            </div>
          </div>

          {/* Activity Summary Empty Notice */}
          <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-tiro">
            <Info className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
            <span>
              {isBn
                ? 'এখনো কোনো সম্পর্কিত লেনদেন বা বিশেষ রেকর্ড নেই।'
                : 'No linked transactions or special records yet.'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer font-siliguri"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(area);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer font-siliguri"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isBn ? 'সম্পাদনা করুন' : 'Edit Area'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
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
  Printer,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Heart,
  Users,
  Compass,
  Building
} from 'lucide-react';
import { CemeteryRecord, Mosque, MosqueProfile } from '../types';
import { Language, formatDate, formatCurrency } from '../lib/i18n';
import { GRAVE_TYPES, PLOT_STATUSES } from './CemeteryFormModal';

interface CemeteryDetailsDrawerProps {
  record: CemeteryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (record: CemeteryRecord) => void;
  onArchiveToggle: (record: CemeteryRecord) => void;
  onPrintA4: (record: CemeteryRecord) => void;
  onPrintPos: (record: CemeteryRecord) => void;
  onDelete?: (record: CemeteryRecord) => void;
  mosque?: Mosque | MosqueProfile | null;
  language: Language;
}

export const CemeteryDetailsDrawer: React.FC<CemeteryDetailsDrawerProps> = ({
  record,
  isOpen,
  onClose,
  onEdit,
  onArchiveToggle,
  onPrintA4,
  onPrintPos,
  onDelete,
  mosque,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'plot' | 'heir' | 'audit'>('details');

  if (!isOpen || !record) return null;

  const graveTypeObj = GRAVE_TYPES.find((g) => g.id === record.graveType);
  const plotStatusObj = PLOT_STATUSES.find((s) => s.id === record.plotStatus);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-xl border border-blue-400/30">
              <Crosshair className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-500/30 border border-blue-400/40 rounded-md text-blue-200">
                  {record.recordNumber || 'CBR-RECORD'}
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/30 border border-emerald-400/40 rounded-md text-emerald-200">
                  {record.plotNumber}
                </span>
                {record.isArchived && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/30 text-amber-200 rounded-md">
                    আর্কাইভকৃত
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                {record.deceasedName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPrintA4(record)}
              title="A4 অফিসিয়াল সার্টিফিকেট ও রেজিস্ট্রি প্রিন্ট"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-300" />
            </button>
            <button
              onClick={() => onPrintPos(record)}
              title="POS থার্মাল স্লিপ প্রিন্ট (80/58mm)"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-emerald-300" />
            </button>
            <button
              onClick={() => onEdit(record)}
              title="রেকর্ড সম্পাদনা"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-amber-300" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stat Bar */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">দাফনের তারিখ:</span>
            <span className="font-bold text-slate-900">{formatDate(record.burialDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">ব্লক ও সারি:</span>
            <span className="font-bold text-blue-800">{record.block || 'Block-A'} {record.row ? `(${record.row})` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">স্ট্যাটাস:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${plotStatusObj?.color || 'bg-slate-200 text-slate-800'}`}>
              {plotStatusObj?.labelBn || record.plotStatus}
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 border-b border-slate-200 flex gap-4 text-xs font-bold shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>মরহুম ও দাফন</span>
          </button>
          <button
            onClick={() => setActiveTab('plot')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'plot'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>প্লট ও অবস্থান</span>
          </button>
          <button
            onClick={() => setActiveTab('heir')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'heir'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>ওয়ারিশ ও পরিবার</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>অডিট ও ইতিহাস</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-slate-50/50">
          {/* TAB 1: DECEASED & BURIAL */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Deceased Summary Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>মরহুমের পূর্ণাঙ্গ পরিচয়</span>
                  </h4>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                    {record.gender === 'FEMALE' ? 'মহিলা' : record.gender === 'OTHER' ? 'অন্যান্য' : 'পুরুষ'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">নাম:</span>
                    <span className="font-bold text-slate-900 text-sm">{record.deceasedName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">পিতা / স্বামীর নাম:</span>
                    <span className="font-bold text-slate-800">{record.fatherOrSpouseName || record.fatherName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">মৃত্যুকালে বয়স:</span>
                    <span className="font-bold text-slate-800">{record.ageAtDeath || 'তথ্য নেই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ধর্মীয় পরিচয়:</span>
                    <span className="font-bold text-slate-800">{record.religion || 'ইসলাম'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ইন্তেকালের তারিখ:</span>
                    <span className="font-bold text-slate-800">{formatDate(record.dateOfDeath)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">জন্ম তারিখ:</span>
                    <span className="font-medium text-slate-700">{record.dateOfBirth ? formatDate(record.dateOfBirth) : '-'}</span>
                  </div>
                  {record.causeOfDeath && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block">মৃত্যুর কারণ:</span>
                      <span className="font-medium text-slate-800">{record.causeOfDeath}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Funeral & Burial Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>জানাজা ও দাফনের বিবরণ</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">দাফনের তারিখ:</span>
                    <span className="font-bold text-emerald-800 text-sm">{formatDate(record.burialDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">দাফনের সময়:</span>
                    <span className="font-bold text-slate-800">{record.burialTime || 'বাদ আসর'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">জানাজার স্থান:</span>
                    <span className="font-medium text-slate-800">{record.janazaPlace || 'বায়তুল আমান জামে মসজিদ ঈদগাহ ময়দান'}</span>
                  </div>
                </div>
              </div>

              {/* Fees & Notes */}
              {(record.burialFee || record.maintenanceFee || record.notes) && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>ফি ও বিশেষ মন্তব্য</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {record.burialFee !== undefined && (
                      <div>
                        <span className="text-slate-500 block">দাফন ফি:</span>
                        <span className="font-siliguri font-bold text-slate-900">৳ {record.burialFee.toLocaleString()}</span>
                      </div>
                    )}
                    {record.maintenanceFee !== undefined && (
                      <div>
                        <span className="text-slate-500 block">রক্ষণাবেক্ষণ ফি:</span>
                        <span className="font-siliguri font-bold text-slate-900">৳ {record.maintenanceFee.toLocaleString()}</span>
                      </div>
                    )}
                    {record.notes && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">মন্তব্য:</span>
                        <p className="p-3 bg-slate-50 rounded-xl text-slate-800 font-medium">{record.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLOT & LOCATION */}
          {activeTab === 'plot' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>কবর ও প্লটের সুনির্দিষ্ট তথ্য</span>
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <span className="text-slate-500 block">প্লট / কবর নম্বর:</span>
                    <span className="font-mono font-bold text-blue-900 text-base">{record.plotNumber}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">ব্লক ও সারি:</span>
                    <span className="font-bold text-slate-900 text-sm">{record.block || 'Block-A'} {record.row ? `| ${record.row}` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">কবরের ধরন:</span>
                    <span className="font-bold text-slate-800">{graveTypeObj?.labelBn || record.graveType || 'স্থায়ী'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">বর্তমান স্ট্যাটাস:</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold border ${plotStatusObj?.color || 'bg-slate-200'}`}>
                      {plotStatusObj?.labelBn || record.plotStatus}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">কবরস্থানের নাম:</span>
                    <span className="font-bold text-slate-800">{record.graveyardName || 'মসজিদ সংলগ্ন স্থায়ী ওয়াকফ কবরস্থান'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">কবরের ভৌগোলিক অবস্থান ও সীমানা:</span>
                    <p className="p-3 bg-slate-50 rounded-xl font-medium text-slate-800">{record.graveLocation}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HEIR & FAMILY */}
          {activeTab === 'heir' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>প্রধান ওয়ারিশ ও অভিভাবক</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">নাম:</span>
                    <span className="font-bold text-slate-900 text-sm">{record.contactPersonName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">সম্পর্ক:</span>
                    <span className="font-bold text-slate-800">{record.relationWithDeceased || 'ওয়ারিশ'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">প্রধান মোবাইল নম্বর:</span>
                    <a href={`tel:${record.contactPersonPhone}`} className="font-mono font-bold text-blue-700 hover:underline">
                      {record.contactPersonPhone || '-'}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block">বিকল্প মোবাইল:</span>
                    <span className="font-mono font-medium text-slate-800">{record.contactPersonAltPhone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">ঠিকানা:</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl font-medium text-slate-800">{record.heirAddress || 'ঠিকানা উল্লেখ নেই'}</p>
                  </div>
                </div>
              </div>

              {/* Additional Heirs if any */}
              {record.heirs && record.heirs.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>অন্যান্য ওয়ারিশগণের তালিকা ({record.heirs.length} জন)</span>
                  </h4>
                  <div className="space-y-2">
                    {record.heirs.map((h, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{h.name} ({h.relation})</div>
                          {h.address && <div className="text-slate-500 text-[11px]">{h.address}</div>}
                        </div>
                        {h.phone && (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                            {h.phone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>রেকর্ড ট্র্যাকিং ও অডিট বিবরণ</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block">এন্ট্রি তৈরির তারিখ:</span>
                      <span className="font-bold text-slate-900">{formatDate(record.createdAt)}</span>
                    </div>
                    {record.createdByName && (
                      <span className="text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 font-medium">
                        প্রস্তুতকারী: {record.createdByName}
                      </span>
                    )}
                  </div>

                  {record.updatedAt && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block">সর্বশেষ আপডেট:</span>
                        <span className="font-bold text-slate-900">{formatDate(record.updatedAt)}</span>
                      </div>
                      {record.updatedByName && (
                        <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                          আপডেটকারী: {record.updatedByName}
                        </span>
                      )}
                    </div>
                  )}

                  {record.isArchived && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">আর্কাইভ করা হয়েছে:</span>
                        <span className="font-mono text-amber-800">{record.archivedAt ? formatDate(record.archivedAt) : ''}</span>
                      </div>
                      {record.archivedByName && (
                        <div className="text-slate-700 font-medium">আর্কাইভকারী: {record.archivedByName}</div>
                      )}
                      {record.archiveReason && (
                        <div className="text-slate-600 font-normal">কারণ: {record.archiveReason}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onArchiveToggle(record)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                record.isArchived
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
              }`}
            >
              {record.isArchived ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>আন-আর্কাইভ করুন</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>আর্কাইভ করুন</span>
                </>
              )}
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(record)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="রেকর্ড স্থায়ীভাবে মুছুন (শুধু অ্যাডমিন)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>অপসারণ</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintPos(record)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>POS রসিদ</span>
            </button>
            <button
              onClick={() => onPrintA4(record)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>A4 প্রত্যয়ন প্রিন্ট</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Banknote,
  Coins,
  X,
  Printer,
  Copy,
  CheckCheck,
  Calendar,
  User,
  Users,
  Building2,
  Edit3,
  Check,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { CashDenominationData, Mosque } from '../types';
import { Language, formatDate, formatCurrency } from '../lib/i18n';
import { numberToBengaliWords, NOTE_DENOMINATIONS, COIN_DENOMINATIONS, DENOM_BADGES, ChangeCalculatorModal } from './ChangeCalculatorModal';
import { DenominationPrintSlip } from './DenominationPrintSlip';

export interface DenominationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  denominationData: CashDenominationData | null;
  referenceId?: string;
  sourceType?: 'INCOME' | 'DONATION' | 'DONATION_BOX' | 'RENT' | 'OTHER';
  mosque: Mosque | null;
  language?: Language;
  onSaveUpdatedDenomination?: (updatedData: CashDenominationData, editReason: string) => Promise<void>;
  canEdit?: boolean;
}

export const DenominationDetailModal: React.FC<DenominationDetailModalProps> = ({
  isOpen,
  onClose,
  denominationData,
  referenceId,
  sourceType = 'DONATION',
  mosque,
  language = 'bn',
  onSaveUpdatedDenomination,
  canEdit = true,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [isEditCounterOpen, setIsEditCounterOpen] = useState<boolean>(false);
  const [editReason, setEditReason] = useState<string>('');
  const [showEditReasonPrompt, setShowEditReasonPrompt] = useState<boolean>(false);
  const [pendingUpdatedData, setPendingUpdatedData] = useState<CashDenominationData | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  if (!isOpen || !denominationData) return null;

  const {
    noteBreakdown = {},
    coinBreakdown = {},
    totalNotesCount = 0,
    totalCoinsCount = 0,
    totalNotesAmount = 0,
    totalCoinsAmount = 0,
    grandTotal = 0,
    countedBy = '',
    witnesses = [],
    countingDateTime = '',
    collectionType = sourceType,
    reference = referenceId || '',
    notes = '',
  } = denominationData;

  const totalPieces = totalNotesCount + totalCoinsCount;

  // Copy breakdown text to clipboard
  const handleCopyBreakdown = () => {
    const lines: string[] = ['=== ক্যাশ নোট ও মুদ্রা (ভাংতি) গণনা বিবরণী ==='];
    if (reference) lines.push(`রেফারেন্স/ভাউচার: ${reference}`);
    if (countedBy) lines.push(`গণনাকারী: ${countedBy}`);
    lines.push(`তারিখ ও সময়: ${countingDateTime.replace('T', ' ')}`);
    lines.push('');
    lines.push('--- ব্যাংক নোট ---');
    NOTE_DENOMINATIONS.forEach((d) => {
      const qty = noteBreakdown[d] || 0;
      if (qty > 0) {
        lines.push(`৳ ${d} × ${qty} টি = ৳ ${(d * qty).toLocaleString('en-IN')}`);
      }
    });
    lines.push(`নোটের মোট: ৳ ${totalNotesAmount.toLocaleString('en-IN')} (${totalNotesCount} টি)`);
    lines.push('');
    lines.push('--- ধাতব মুদ্রা / কয়েন ---');
    COIN_DENOMINATIONS.forEach((d) => {
      const qty = coinBreakdown[d] || 0;
      if (qty > 0) {
        lines.push(`৳ ${d} × ${qty} টি = ৳ ${(d * qty).toLocaleString('en-IN')}`);
      }
    });
    lines.push(`কয়েনের মোট: ৳ ${totalCoinsAmount.toLocaleString('en-IN')} (${totalCoinsCount} টি)`);
    lines.push('----------------------------------------');
    lines.push(`সর্বমোট পিস: ${totalPieces} টি`);
    lines.push(`সর্বমোট নগদ টাকা: ৳ ${grandTotal.toLocaleString('en-IN')}`);
    lines.push(`কথায়: ${numberToBengaliWords(grandTotal)}`);
    if (witnesses && witnesses.length > 0) lines.push(`সাক্ষীবৃন্দ: ${witnesses.join(', ')}`);
    if (notes) lines.push(`মন্তব্য: ${notes}`);

    navigator.clipboard?.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyRecount = (newTotal: number, updatedDenom?: CashDenominationData) => {
    if (!updatedDenom) return;
    setPendingUpdatedData(updatedDenom);
    setShowEditReasonPrompt(true);
  };

  const handleConfirmSaveEdit = async () => {
    if (!pendingUpdatedData || !onSaveUpdatedDenomination) return;
    if (!editReason.trim()) {
      alert('অনুগ্রহ করে গণনার তথ্য পরিবর্তনের একটি স্পষ্ট কারণ লিখুন (অডিট লগ ও জবাবদিহিতার জন্য প্রযোজ্য)।');
      return;
    }

    setSaving(true);
    try {
      await onSaveUpdatedDenomination(pendingUpdatedData, editReason.trim());
      setShowEditReasonPrompt(false);
      setPendingUpdatedData(null);
      setEditReason('');
    } catch (err: any) {
      alert(`পরিবর্তন সংরক্ষণ ব্যর্থ হয়েছে: ${err?.message || 'অজানা ত্রুটি'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        id="modal-denomination-details"
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150 font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white p-4 flex items-center justify-between border-b border-emerald-800 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/10 text-emerald-300 border border-white/15 rounded-xl shadow-inner">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-siliguri tracking-tight flex items-center gap-2">
                  <span>ক্যাশ নোট ও কারেন্সি গণনা বিবরণী</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                    অডিট ভেরিফাইড
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-100/90 font-siliguri mt-0.5">
                  রেফারেন্স: {reference || 'N/A'} • মোট সংগৃহীত: ৳ {grandTotal.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 text-emerald-200 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Stats Bar */}
          <div className="bg-emerald-950 text-white p-3.5 border-b border-emerald-900 shadow-inner flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 text-xs font-siliguri">
              <div className="flex items-center space-x-1 bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-700">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>নোট:</span>
                <strong className="text-white font-mono font-bold">
                  ৳ {totalNotesAmount.toLocaleString('en-IN')} ({totalNotesCount} টি)
                </strong>
              </div>

              <div className="flex items-center space-x-1 bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-700">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>কয়েন:</span>
                <strong className="text-amber-200 font-mono font-bold">
                  ৳ {totalCoinsAmount.toLocaleString('en-IN')} ({totalCoinsCount} টি)
                </strong>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopyBreakdown}
                className="text-[11px] text-emerald-200 hover:text-white flex items-center space-x-1 bg-emerald-900/70 hover:bg-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-700 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-emerald-300 font-bold">কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>কপি</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPrintOpen(true)}
                className="text-[11px] text-amber-200 hover:text-white flex items-center space-x-1 bg-amber-900/60 hover:bg-amber-800 px-2.5 py-1 rounded-lg border border-amber-700 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>স্লিপ প্রিন্ট</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 overflow-y-auto flex-1 bg-slate-50 space-y-4">
            {/* Meta Info Grid */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs font-siliguri grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-2xs">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-500">গণনাকারী: </span>
                <strong className="text-slate-800">{countedBy || 'নির্ধারিত নয়'}</strong>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-500">গণনার সময়: </span>
                <strong className="text-slate-800 font-mono">
                  {countingDateTime ? countingDateTime.replace('T', ' ') : 'N/A'}
                </strong>
              </div>

              {witnesses && witnesses.length > 0 && (
                <div className="sm:col-span-2 flex items-start space-x-2 pt-1 border-t border-slate-100">
                  <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500">সাক্ষীবৃন্দ: </span>
                    <strong className="text-slate-800">{witnesses.join(', ')}</strong>
                  </div>
                </div>
              )}

              {notes && (
                <div className="sm:col-span-2 pt-1 border-t border-slate-100 text-slate-600">
                  <span className="text-slate-500 font-bold">মন্তব্য: </span>
                  <span>{notes}</span>
                </div>
              )}
            </div>

            {/* Notes Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold font-siliguri text-slate-800 flex items-center space-x-1.5">
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>ব্যাংক নোট গণনা বিবরণী</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  ৳ {totalNotesAmount.toLocaleString('en-IN')} ({totalNotesCount} টি নোট)
                </span>
              </div>

              <div className="p-2 divide-y divide-slate-100">
                {NOTE_DENOMINATIONS.map((denom) => {
                  const qty = noteBreakdown[denom] || 0;
                  const lineTotal = denom * qty;
                  const badge = DENOM_BADGES[denom] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' };

                  return (
                    <div
                      key={`detail-note-${denom}`}
                      className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${
                        qty > 0 ? 'bg-emerald-50/50 font-medium' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${badge.bg} ${badge.text} ${badge.border}`}>
                          ৳ {denom}
                        </span>
                        <span className="text-slate-600 font-siliguri">টাকার নোট</span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <span className="font-mono font-bold text-slate-800">
                          {qty} টি
                        </span>
                        <span className="font-mono font-bold text-slate-900 w-24 text-right">
                          ৳ {lineTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coins Breakdown */}
            {totalCoinsCount > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-2xs">
                <div className="bg-amber-50 px-3 py-2 border-b border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold font-siliguri text-amber-900 flex items-center space-x-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>ধাতব মুদ্রা / কয়েন বিবরণী</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-900">
                    ৳ {totalCoinsAmount.toLocaleString('en-IN')} ({totalCoinsCount} টি কয়েন)
                  </span>
                </div>

                <div className="p-2 divide-y divide-amber-100">
                  {COIN_DENOMINATIONS.map((denom) => {
                    const qty = coinBreakdown[denom] || 0;
                    const lineTotal = denom * qty;

                    return (
                      <div
                        key={`detail-coin-${denom}`}
                        className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs ${
                          qty > 0 ? 'bg-amber-50/60 font-medium' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-full font-mono font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300">
                            ৳ {denom}
                          </span>
                          <span className="text-slate-600 font-siliguri">মুদ্রা / কয়েন</span>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className="font-mono font-bold text-slate-800">
                            {qty} টি
                          </span>
                          <span className="font-mono font-bold text-amber-900 w-24 text-right">
                            ৳ {lineTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total Highlight */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-siliguri text-emerald-300 font-bold block">
                  সর্বমোট গণনাকৃত টাকা:
                </span>
                <span className="text-[11px] text-slate-400 font-siliguri">
                  কথায়: {numberToBengaliWords(grandTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-300">
                  ৳ {grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div>
              {canEdit && onSaveUpdatedDenomination && (
                <button
                  type="button"
                  onClick={() => setIsEditCounterOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold font-siliguri rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>পুনর্বিন্যাস / সংশোধন করুন</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsPrintOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold font-siliguri rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>স্লিপ প্রিন্ট</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold font-siliguri rounded-xl transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Denomination Modal Trigger */}
      {isEditCounterOpen && (
        <ChangeCalculatorModal
          isOpen={isEditCounterOpen}
          onClose={() => setIsEditCounterOpen(false)}
          initialData={denominationData}
          expectedAmount={grandTotal}
          titleBn="ক্যাশ ডিনোমিনেশন পুনর্বিন্যাস ও সংশোধন"
          subtitleBn="নোট ও কয়েনের সংখ্যা সংশোধন করুন — অডিট লগের সাথে সমন্বিত হবে"
          onApplyTotal={handleApplyRecount}
          mosque={mosque}
          language={language}
        />
      )}

      {/* Edit Reason Prompt Modal */}
      {showEditReasonPrompt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-60 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-2 text-amber-700 font-bold font-siliguri mb-2">
              <AlertCircle className="w-5 h-5" />
              <span>ডিনোমিনেশন সংশোধনের অডিট কারণ লিখুন</span>
            </div>
            <p className="text-xs text-slate-600 font-siliguri mb-3">
              আর্থিক অডিট ও জবাবদিহিতা নিশ্চিতকরণে ডিনোমিনেশন রেকর্ড পরিবর্তনের কারণ সিস্টেমে সংরক্ষিত হবে।
            </p>

            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="যেমন: গণনাকারীর ভুল টাইপিং সংশোধন / ২য় গণনায় টাকার নোট সমন্বিত"
              rows={3}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden mb-4"
            />

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditReasonPrompt(false);
                  setPendingUpdatedData(null);
                }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold font-siliguri rounded-lg cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveEdit}
                disabled={saving}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold font-siliguri rounded-lg flex items-center space-x-1 cursor-pointer"
              >
                {saving ? (
                  <span>সংরক্ষণ হচ্ছে...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>সংরক্ষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Slip */}
      {isPrintOpen && (
        <DenominationPrintSlip
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          denominationData={denominationData}
          mosque={mosque}
          language={language}
        />
      )}
    </>
  );
};

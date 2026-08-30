import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Printer,
  ExternalLink,
  QrCode,
  Barcode as BarcodeIcon,
  Eye,
  Wrench,
  Hammer,
  Receipt,
  Building,
  UserCheck,
  AlertCircle,
  FileText,
  User,
  Wallet,
  Gift,
  History,
  Target,
  TrendingUp,
  CheckCircle2,
  Paperclip,
  Coins,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ResolvedRecordItem, RecordSpecificAction } from '../types/qrBarcodeTypes';
import { Barcode128, RecordQrCode } from './BarcodeQRService';
import { Mosque } from '../types';
import { formatCurrency } from '../lib/i18n';

interface RecordActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordItem: ResolvedRecordItem | null;
  mosque?: Mosque | null;
  onExecuteAction: (action: RecordSpecificAction, recordItem: ResolvedRecordItem) => void;
  onOpenPrintLabel?: (recordItem: ResolvedRecordItem) => void;
}

export const RecordActionModal: React.FC<RecordActionModalProps> = ({
  isOpen,
  onClose,
  recordItem,
  mosque,
  onExecuteAction,
  onOpenPrintLabel,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !recordItem) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(recordItem.canonicalCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Eye': return <Eye className="w-5 h-5" />;
      case 'Wrench': return <Wrench className="w-5 h-5" />;
      case 'Hammer': return <Hammer className="w-5 h-5" />;
      case 'Receipt': return <Receipt className="w-5 h-5" />;
      case 'Building': return <Building className="w-5 h-5" />;
      case 'UserCheck': return <UserCheck className="w-5 h-5" />;
      case 'AlertCircle': return <AlertCircle className="w-5 h-5" />;
      case 'FileText': return <FileText className="w-5 h-5" />;
      case 'User': return <User className="w-5 h-5" />;
      case 'Wallet': return <Wallet className="w-5 h-5" />;
      case 'Gift': return <Gift className="w-5 h-5" />;
      case 'History': return <History className="w-5 h-5" />;
      case 'Target': return <Target className="w-5 h-5" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5" />;
      case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5" />;
      case 'Paperclip': return <Paperclip className="w-5 h-5" />;
      case 'Coins': return <Coins className="w-5 h-5" />;
      case 'Printer': return <Printer className="w-5 h-5" />;
      case 'QrCode': return <QrCode className="w-5 h-5" />;
      case 'Plus': return <Plus className="w-5 h-5" />;
      default: return <ArrowRight className="w-5 h-5" />;
    }
  };

  const getBadgeColor = (variant: string) => {
    switch (variant) {
      case 'emerald': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rose': return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'amber': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getActionButtonStyle = (color: string, isPrimary?: boolean) => {
    if (isPrimary) {
      return 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm border border-emerald-800';
    }
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'blue':
        return 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200';
      case 'amber':
        return 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200';
      case 'rose':
        return 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200';
      case 'purple':
        return 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200';
      case 'indigo':
        return 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200';
      default:
        return 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {recordItem.categoryBn || 'রেকর্ড পরিচিতি'}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(recordItem.statusBadge.variant)}`}>
                  {recordItem.statusBadge.labelBn}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1 line-clamp-1">
                {recordItem.titleBn}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Identification Bar: Canonical ID + Barcode + QR */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Barcode & Canonical ID */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500">ইউনিক রেকর্ড আইডি:</span>
                <span className="font-mono text-sm font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-800">
                  {recordItem.canonicalCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                  title="কোড কপি করুন"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Code 128 Barcode */}
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs inline-block">
                <Barcode128 value={recordItem.canonicalCode} height={32} width={1.4} showText={false} />
              </div>
              <p className="text-[11px] text-slate-500">{recordItem.subtitleBn}</p>
            </div>

            {/* Sharp QR Code */}
            <div className="flex flex-col items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
              <RecordQrCode value={recordItem.canonicalCode} size={90} />
              <span className="text-[10px] font-mono text-slate-500 mt-1">Scan to Action</span>
            </div>
          </div>

          {/* Key Details Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              গুরুত্বপূর্ণ তথ্যাবলী (Record Details)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recordItem.keyDetails.map((detail, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    detail.isHighlight
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-medium text-slate-500">{detail.labelBn}</span>
                  <span
                    className={`text-sm font-bold mt-1 ${
                      detail.isHighlight ? 'text-emerald-900 font-mono' : 'text-slate-800'
                    }`}
                  >
                    {detail.isCurrency && typeof detail.value === 'number'
                      ? formatCurrency(detail.value)
                      : String(detail.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Hub (Identify -> View -> Act) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                <span>সংশ্লিষ্ট অ্যাকশন ও কাজ (Instant Actions)</span>
              </h4>
              <span className="text-xs text-slate-500 font-medium">১-ক্লিক এন্ট্রি</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recordItem.actions.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    if (act.actionType === 'PRINT_LABEL' && onOpenPrintLabel) {
                      onOpenPrintLabel(recordItem);
                    } else {
                      onExecuteAction(act, recordItem);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition-all hover:scale-[1.01] active:scale-[0.99] ${getActionButtonStyle(
                    act.color,
                    act.isPrimary
                  )}`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      act.isPrimary ? 'bg-emerald-600 text-white' : 'bg-white/80 text-slate-700 shadow-xs'
                    }`}
                  >
                    {renderActionIcon(act.iconName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-snug flex items-center justify-between">
                      <span className="truncate">{act.labelBn}</span>
                      {act.isPrimary && (
                        <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white ml-2 shrink-0">
                          প্রধান
                        </span>
                      )}
                    </div>
                    {act.descriptionBn && (
                      <p className={`text-xs mt-0.5 line-clamp-1 ${act.isPrimary ? 'text-emerald-100' : 'text-slate-600'}`}>
                        {act.descriptionBn}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onOpenPrintLabel && onOpenPrintLabel(recordItem)}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>কিউআর ও বারকোড লেবেল প্রিন্ট</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

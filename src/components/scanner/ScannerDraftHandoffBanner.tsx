import React, { useState } from 'react';
import { Sparkles, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { ApprovedLiveScanDraft } from './LiveScanAiDraftTab';

interface ScannerDraftHandoffBannerProps {
  draft: ApprovedLiveScanDraft | null;
  onDismiss: () => void;
}

export const ScannerDraftHandoffBanner: React.FC<ScannerDraftHandoffBannerProps> = ({
  draft,
  onDismiss,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!draft) return null;

  const copyText = (key: string, value: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyAll = () => {
    const all = [
      draft.titleBn ? `শিরোনাম: ${draft.titleBn}` : '',
      draft.date ? `তারিখ: ${draft.date}` : '',
      draft.amount ? `টাকার পরিমাণ: ৳ ${draft.amount}` : '',
      draft.suggestedHeadNameBn ? `খাত: ${draft.suggestedHeadNameBn}` : '',
      draft.voucherOrRefNo ? `রেফারেন্স/রসিদ নং: ${draft.voucherOrRefNo}` : '',
      draft.partyName ? `ব্যক্তি/প্রতিষ্ঠান: ${draft.partyName}` : '',
      draft.descriptionBn ? `বিবরণ: ${draft.descriptionBn}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    copyText('ALL', all);
  };

  const fields = [
    { key: 'title', label: 'শিরোনাম', value: draft.titleBn },
    { key: 'amount', label: 'টাকার অঙ্ক (৳)', value: draft.amount },
    { key: 'date', label: 'তারিখ', value: draft.date },
    { key: 'head', label: 'খাত / ক্যাটাগরি', value: draft.suggestedHeadNameBn },
    { key: 'ref', label: 'রসিদ/ভাউচার/দলিল নং', value: draft.voucherOrRefNo },
    { key: 'party', label: 'ব্যক্তি/প্রতিষ্ঠান', value: draft.partyName },
    { key: 'desc', label: 'বিবরণ', value: draft.descriptionBn },
  ].filter((f) => Boolean(f.value));

  return (
    <div className="mb-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 shadow-sm font-siliguri print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-700 text-white rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              স্ক্যানার থেকে প্রাপ্ত খসড়া — {draft.targetLabelBn}
            </h4>
            <p className="text-[11px] text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>ডাটাবেসে অটো-সেভ হয়নি — নিচের ফর্মে যাচাই করে কপি/বসিয়ে নিজে সংরক্ষণ করুন</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
          >
            {copiedKey === 'ALL' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>সব কপি হয়েছে</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>পুরো খসড়া কপি</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-emerald-700 hover:text-rose-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="খসড়া বার বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row gap-3 items-start">
        {draft.previewImageDataUrl && (
          <img
            src={draft.previewImageDataUrl}
            alt="স্ক্যানকৃত ছবি"
            className="w-20 h-20 object-cover rounded-xl border border-emerald-200 bg-white shrink-0"
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 flex-1 w-full">
          {fields.map((item) => (
            <div
              key={item.key}
              className="bg-white border border-emerald-200/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-slate-500">{item.label}</span>
                <span className="block text-xs font-bold text-slate-900 truncate font-baloo">
                  {item.value}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyText(item.key, item.value)}
                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg shrink-0 transition-colors cursor-pointer"
                title="কপি করুন"
              >
                {copiedKey === item.key ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

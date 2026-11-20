import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Printer,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Award,
  FileCheck2,
  Briefcase
} from 'lucide-react';
import { Staff, Mosque } from '../../types';
import { api } from '../../lib/api';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import { OfficialReportSignatures } from '../common/OfficialReportSignatures';

type StaffDocType = 'APPOINTMENT_LETTER' | 'EXPERIENCE_CERTIFICATE' | 'CLEARANCE_LETTER';

interface AiStaffDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  currentMosque?: Mosque | null;
}

const DOC_OPTIONS: Array<{
  type: StaffDocType;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    type: 'APPOINTMENT_LETTER',
    label: 'নিয়োগপত্র',
    desc: 'আনুষ্ঠানিক নিয়োগ, বেতন-ভাতা ও শর্তাবলি',
    icon: Briefcase,
  },
  {
    type: 'EXPERIENCE_CERTIFICATE',
    label: 'অভিজ্ঞতা সনদ',
    desc: 'কর্মকাল, দক্ষতা ও চারিত্রিক প্রশংসাপত্র',
    icon: Award,
  },
  {
    type: 'CLEARANCE_LETTER',
    label: 'ছাড়পত্র',
    desc: 'অব্যাহতি, দায়িত্ব হস্তান্তর ও দায়মুক্তি সনদ',
    icon: FileCheck2,
  },
];

export const AiStaffDocumentModal: React.FC<AiStaffDocumentModalProps> = ({
  isOpen,
  onClose,
  staff,
  currentMosque,
}) => {
  const [documentType, setDocumentType] = useState<StaffDocType>('APPOINTMENT_LETTER');
  const [customNote, setCustomNote] = useState('');
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [generated, setGenerated] = useState<{
    memoNumber: string;
    issueDate: string;
    titleBn: string;
    recipientBlockBn: string;
    subjectBn: string;
    salutationBn: string;
    bodyText: string;
    termsText: string;
    closingNoteBn: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setGenerated(null);
    setError(null);
  }, [staff?.id]);

  if (!isOpen || !staff) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.generateStaffOfficialDocumentAi({
        staffId: staff.id,
        documentType,
        customNote: customNote.trim() || undefined,
      });
      setGenerated({
        memoNumber: data.memoNumber,
        issueDate: data.issueDate,
        titleBn: data.titleBn,
        recipientBlockBn: data.recipientBlockBn,
        subjectBn: data.subjectBn,
        salutationBn: data.salutationBn,
        bodyText: (data.bodyParagraphsBn || []).join('\n\n'),
        termsText: (data.termsOrPointsBn || []).join('\n'),
        closingNoteBn: data.closingNoteBn || '',
      });
    } catch (err: any) {
      setError(err?.message || 'AI ডকুমেন্ট তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const buildPlainText = () => {
    if (!generated) return '';
    const termsLines = generated.termsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l, idx) => `${idx + 1}. ${l}`)
      .join('\n');

    return [
      generated.titleBn,
      `স্মারক নং: ${generated.memoNumber} | তারিখ: ${generated.issueDate}`,
      '',
      generated.recipientBlockBn,
      '',
      `বিষয়: ${generated.subjectBn}`,
      '',
      generated.salutationBn,
      generated.bodyText,
      termsLines ? `\nশর্তাবলি / উল্লেখযোগ্য বিষয়সমূহ:\n${termsLines}` : '',
      generated.closingNoteBn ? `\n${generated.closingNoteBn}` : '',
    ]
      .filter((line) => line !== undefined)
      .join('\n');
  };

  const handleCopy = async () => {
    const txt = buildPlainText();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('ক্লিপবোর্ডে কপি করা যায়নি।');
    }
  };

  const handlePrint = () => {
    if (!generated) return;
    printElement('printable-ai-staff-document', {
      title: `${generated.titleBn}_${staff.fullNameBn || staff.name}`,
    });
  };

  const parsedParagraphs = generated
    ? generated.bodyText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const parsedTerms = generated
    ? generated.termsText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-siliguri">
                AI আনুষ্ঠানিক ডকুমেন্ট জেনারেটর
              </h3>
              <p className="text-xs text-slate-300 font-siliguri">
                {staff.fullNameBn || staff.name} • {staff.designationBn || staff.designation}
                {staff.staffCode ? ` (#${staff.staffCode})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Document Type Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DOC_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = documentType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setDocumentType(opt.type)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    active
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={`font-bold text-sm font-siliguri ${active ? 'text-emerald-900' : 'text-slate-800'}`}>
                      {opt.label}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom instruction + Generate CTA */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="block font-bold text-slate-700 mb-1">
                অতিরিক্ত নির্দেশনা বা বিশেষ শর্ত (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="যেমন: ৩ মাস শিক্ষানবিশকাল থাকবে / ১ মাসের নোটিশে অব্যাহতি / বিশেষ প্রশংসা..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{generated ? 'পুনরায় তৈরি করুন' : 'AI ডকুমেন্ট তৈরি করুন'}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated Document Editable Preview */}
          {generated && (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="font-siliguri">ডকুমেন্ট খসড়া প্রস্তুত — প্রয়োজনে সম্পাদনা করে প্রিন্ট করুন</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeLetterhead}
                      onChange={(e) => setIncludeLetterhead(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-600"
                    />
                    <span>লেটারহেডসহ প্রিন্ট</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট করুন</span>
                  </button>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">ডকুমেন্ট শিরোনাম</label>
                    <input
                      type="text"
                      value={generated.titleBn}
                      onChange={(e) => setGenerated({ ...generated, titleBn: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-siliguri"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">স্মারক নম্বর</label>
                    <input
                      type="text"
                      value={generated.memoNumber}
                      onChange={(e) => setGenerated({ ...generated, memoNumber: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">ইস্যু তারিখ</label>
                    <input
                      type="text"
                      value={generated.issueDate}
                      onChange={(e) => setGenerated({ ...generated, issueDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">প্রাপক / পরিচিতি</label>
                  <textarea
                    rows={2}
                    value={generated.recipientBlockBn}
                    onChange={(e) => setGenerated({ ...generated, recipientBlockBn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-siliguri"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">বিষয়</label>
                  <input
                    type="text"
                    value={generated.subjectBn}
                    onChange={(e) => setGenerated({ ...generated, subjectBn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-siliguri"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">মূল বক্তব্য</label>
                  <textarea
                    rows={6}
                    value={generated.bodyText}
                    onChange={(e) => setGenerated({ ...generated, bodyText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed font-tiro text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    শর্তাবলি / গুরুত্বপূর্ণ পয়েন্ট (প্রতি লাইনে একটি)
                  </label>
                  <textarea
                    rows={4}
                    value={generated.termsText}
                    onChange={(e) => setGenerated({ ...generated, termsText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed font-siliguri"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">সমাপনী দোয়া / শুভেচ্ছা</label>
                  <input
                    type="text"
                    value={generated.closingNoteBn}
                    onChange={(e) => setGenerated({ ...generated, closingNoteBn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-siliguri"
                  />
                </div>
              </div>
            </div>
          )}

          {!generated && !loading && (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 font-siliguri">
                উপর থেকে ডকুমেন্টের ধরন নির্বাচন করে &ldquo;AI ডকুমেন্ট তৈরি করুন&rdquo; বাটনে ক্লিক করুন
              </p>
              <p className="text-[11px] mt-1">
                মসজিদ ও কর্মীর প্রকৃত তথ্য (নাম, পদবী, যোগদান তারিখ, বেতন) স্বয়ংক্রিয়ভাবে বসিয়ে প্রিন্ট-রেডি বাংলা নথি প্রস্তুত হবে।
              </p>
            </div>
          )}
        </div>

        {/* Hidden Printable A4 Official Document */}
        {generated && (
          <div
            id="printable-ai-staff-document"
            className="hidden print:block p-10 bg-white text-slate-900 font-tiro"
          >
            {includeLetterhead ? (
              <MosqueOfficialLetterhead
                mosque={currentMosque}
                documentTitle={generated.titleBn}
                memoNumber={generated.memoNumber}
                dateStr={generated.issueDate}
              />
            ) : (
              <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
                <h1 className="text-2xl font-bold font-siliguri">{generated.titleBn}</h1>
                <div className="flex justify-between text-xs mt-3 font-sans">
                  <span>স্মারক নং: {generated.memoNumber}</span>
                  <span>তারিখ: {generated.issueDate}</span>
                </div>
              </div>
            )}

            <div className="space-y-4 text-sm leading-7">
              <div className="whitespace-pre-line font-siliguri font-semibold text-slate-800">
                {generated.recipientBlockBn}
              </div>

              <div className="font-bold font-siliguri text-slate-900 border-b border-slate-200 pb-2">
                বিষয়: {generated.subjectBn}
              </div>

              {generated.salutationBn && (
                <p className="font-semibold">{generated.salutationBn}</p>
              )}

              <div className="space-y-3 text-justify">
                {parsedParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {parsedTerms.length > 0 && (
                <div className="pt-2">
                  <div className="font-bold font-siliguri mb-1.5">
                    {documentType === 'APPOINTMENT_LETTER'
                      ? 'নিয়োগের শর্তাবলি ও দায়িত্বসমূহ:'
                      : 'উল্লেখযোগ্য তথ্য ও প্রত্যয়ন:'}
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    {parsedTerms.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {generated.closingNoteBn && (
                <p className="pt-2 font-medium">{generated.closingNoteBn}</p>
              )}
            </div>

            <div className="mt-14">
              <OfficialReportSignatures
                currentMosque={currentMosque}
                preparerTitle="দপ্তর / হিসাবরক্ষক"
                secretaryTitle="সাধারণ সম্পাদক / মোতাওয়াল্লী"
                presidentTitle="সভাপতি"
                showAuditFooter={true}
                auditFooterText="মসজিদ লেজার • দাপ্তরিক কর্মী নথি"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            * এটি একটি খসড়া ডকুমেন্ট — প্রিন্ট করার আগে সকল তথ্য যাচাই করে নিন।
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

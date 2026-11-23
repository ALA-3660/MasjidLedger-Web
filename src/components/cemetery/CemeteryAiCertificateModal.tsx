import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Printer,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  FileText,
  HeartHandshake,
  ShieldCheck,
  Edit3,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { CemeteryRecord, Mosque, MosqueProfile } from '../../types';
import { api, CemeteryAiCertificateDraftResult } from '../../lib/api';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';

interface CemeteryAiCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CemeteryRecord | null;
  mosque?: Mosque | MosqueProfile | null;
}

const AI_TIMEOUT_MS = 45_000;

export const CemeteryAiCertificateModal: React.FC<CemeteryAiCertificateModalProps> = ({
  isOpen,
  onClose,
  record,
  mosque,
}) => {
  const [activeTab, setActiveTab] = useState<'certificate' | 'condolence'>('certificate');
  const [tone, setTone] = useState<'FORMAL' | 'COMPASSIONATE'>('FORMAL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [draft, setDraft] = useState<CemeteryAiCertificateDraftResult | null>(null);

  // Editable Certificate Fields (user can edit before printing)
  const [isEditingCert, setIsEditingCert] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certSubtitle, setCertSubtitle] = useState('');
  const [certBodyText, setCertBodyText] = useState('');
  const [certClosing, setCertClosing] = useState('');
  const [includeLetterhead, setIncludeLetterhead] = useState(true);

  // Editable Condolence Fields (user can edit & copy; NEVER auto-sent)
  const [condolenceText, setCondolenceText] = useState('');
  const [shortSmsText, setShortSmsText] = useState('');
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  const generateDraft = async (selectedTone: 'FORMAL' | 'COMPASSIONATE' = tone) => {
    if (!record?.id) return;
    setIsLoading(true);
    setErrorMsg('');

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('AI খসড়া তৈরিতে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা সাধারণ A4 প্রত্যয়ন প্রিন্ট ব্যবহার করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const res = await Promise.race([
        api.generateCemeteryCertificateAndCondolenceAi({
          recordId: record.id,
          tone: selectedTone,
        }),
        timeoutPromise,
      ]);

      setDraft(res);
      setCertTitle(res.certificateTitleBn);
      setCertSubtitle(res.certificateSubtitleBn);
      setCertBodyText(res.certificateBodyParagraphsBn.join('\n\n'));
      setCertClosing(res.certificateClosingBn);
      setCondolenceText(
        `${res.duaArabicText}\n${res.duaBanglaMeaning}\n\n${res.condolenceMessageBn}`
      );
      setShortSmsText(res.shortSmsDraftBn);
      setIsEditingCert(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'দাফন সনদ ও শোক বার্তা খসড়া তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && record?.id) {
      setDraft(null);
      setErrorMsg('');
      setActiveTab('certificate');
      setCopiedFull(false);
      setCopiedSms(false);
      generateDraft('FORMAL');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, record?.id]);

  if (!isOpen || !record) return null;

  const handlePrintCertificate = () => {
    printElement('cemetery-ai-certificate-print-doc', {
      title: `${mosque?.name || 'মসজিদ'}_দাফন_সনদপত্র_${record.recordNumber || record.plotNumber}`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '10mm 14mm',
    });
  };

  const handleCopyText = async (text: string, type: 'full' | 'sms') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'full') {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2500);
      } else {
        setCopiedSms(true);
        setTimeout(() => setCopiedSms(false), 2500);
      }
    } catch {
      setErrorMsg('ক্লিপবোর্ডে কপি করা যায়নি। অনুগ্রহ করে লেখাটি সিলেক্ট করে ম্যানুয়ালি কপি করুন।');
    }
  };

  const vr = draft?.verifiedRecord;
  const paragraphs = certBodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[93vh]">
        {/* Header */}
        <div className="no-print px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/25 border border-emerald-400/40 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-siliguri text-white">
                AI দাফন সনদপত্র ও শোক-দোয়া বার্তা ড্রাফট
              </h3>
              <p className="text-xs text-slate-300 font-tiro">
                {record.deceasedName} • প্লট: {record.plotNumber} ({record.block || record.blockName || 'ব্লক নির্ধারিত নয়'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protection & Controls Bar */}
        <div className="no-print px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('certificate')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-siliguri flex items-center gap-1.5 transition-all ${
                activeTab === 'certificate'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>দাফন সনদপত্র (প্রিন্ট-রেডি খসড়া)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('condolence')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-siliguri flex items-center gap-1.5 transition-all ${
                activeTab === 'condolence'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>শোক ও দোয়া বার্তা (কপি ড্রাফট)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={tone}
              onChange={(e) => {
                const nextTone = e.target.value as 'FORMAL' | 'COMPASSIONATE';
                setTone(nextTone);
                generateDraft(nextTone);
              }}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 font-siliguri outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="FORMAL">ভাষা: দাপ্তরিক ও মার্জিত</option>
              <option value="COMPASSIONATE">ভাষা: বিনম্র ও সহানুভূতিশীল</option>
            </select>
            <button
              type="button"
              onClick={() => generateDraft(tone)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-siliguri flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>পুনরায় ড্রাফট</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Safety Notice */}
          <div className="no-print p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 font-tiro">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong className="font-siliguri">যাচাই ও নিয়ন্ত্রণ:</strong> এটি একটি সম্পাদনাযোগ্য খসড়া। সনদ স্বয়ংক্রিয়ভাবে ইস্যু বা সংরক্ষণ হবে না এবং কোনো SMS পাঠানো হবে না। প্রিন্ট বা কপি করার আগে মরহুমের নাম, তারিখ ও প্লট নম্বর মিলিয়ে নিন।
            </span>
          </div>

          {isLoading && (
            <div className="py-14 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800 font-siliguri">
                যাচাইকৃত রেকর্ড থেকে দাফন সনদ ও শোক-দোয়া বার্তার খসড়া প্রস্তুত হচ্ছে...
              </p>
              <p className="text-xs text-slate-500 font-tiro">
                রেকর্ডের কোনো নাম, তারিখ বা কবর নম্বর পরিবর্তন করা হবে না।
              </p>
            </div>
          )}

          {!isLoading && errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold font-siliguri">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => generateDraft(tone)}
                  className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold font-siliguri hover:bg-rose-700"
                >
                  আবার চেষ্টা করুন
                </button>
              </div>
            </div>
          )}

          {!isLoading && draft && vr && (
            <>
              {/* Verified System Facts Strip */}
              <div className="no-print p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-emerald-700 font-siliguri">মরহুম/মরহুমা (যাচাইকৃত)</span>
                  <span className="font-bold text-slate-900 font-tiro">{vr.deceasedName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-700 font-siliguri">প্লট ও ব্লক</span>
                  <span className="font-bold text-slate-900 font-baloo">
                    {vr.plotNumber} {vr.block ? `(${vr.block})` : ''}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-700 font-siliguri">দাফনের তারিখ</span>
                  <span className="font-bold text-slate-900 font-baloo">{vr.burialDateBn}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-700 font-siliguri">অতিবাহিত সময় (সিস্টেম)</span>
                  <span className="font-bold text-slate-900 font-baloo">{vr.elapsedSinceBurialBn || 'প্রযোজ্য নয়'}</span>
                </div>
              </div>

              {/* TAB 1: PRINT-READY CERTIFICATE */}
              {activeTab === 'certificate' && (
                <div className="space-y-4">
                  <div className="no-print flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingCert(!isEditingCert)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri flex items-center gap-1.5 border ${
                          isEditingCert
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {isEditingCert ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        <span>{isEditingCert ? 'প্রিন্ট প্রিভিউ দেখুন' : 'খসড়া লেখা সম্পাদনা করুন'}</span>
                      </button>

                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 font-siliguri cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeLetterhead}
                          onChange={(e) => setIncludeLetterhead(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                        />
                        <span>মসজিদের অফিসিয়াল প্যাড যুক্ত করুন</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handlePrintCertificate}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-siliguri flex items-center gap-2 shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      <span>দাফন সনদ প্রিন্ট করুন (A4)</span>
                    </button>
                  </div>

                  {isEditingCert && (
                    <div className="no-print p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 font-siliguri mb-1">
                            সনদের শিরোনাম
                          </label>
                          <input
                            type="text"
                            value={certTitle}
                            onChange={(e) => setCertTitle(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-siliguri"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 font-siliguri mb-1">
                            উপ-শিরোনাম
                          </label>
                          <input
                            type="text"
                            value={certSubtitle}
                            onChange={(e) => setCertSubtitle(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-tiro"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 font-siliguri mb-1">
                          সনদের মূল বক্তব্য (প্রয়োজনে সম্পাদনা করুন)
                        </label>
                        <textarea
                          rows={5}
                          value={certBodyText}
                          onChange={(e) => setCertBodyText(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-tiro leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 font-siliguri mb-1">
                          সমাপনী দোয়া / বক্তব্য
                        </label>
                        <input
                          type="text"
                          value={certClosing}
                          onChange={(e) => setCertClosing(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-tiro"
                        />
                      </div>
                    </div>
                  )}

                  {/* Printable A4 Document */}
                  <div
                    id="cemetery-ai-certificate-print-doc"
                    className="bg-white border-2 border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-5 text-slate-900"
                  >
                    {includeLetterhead && mosque && (
                      <MosqueOfficialLetterhead mosque={mosque} />
                    )}

                    <div className="text-center border-b-2 border-emerald-800/20 pb-4 space-y-1">
                      <p className="text-xs font-tiro text-emerald-800">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                      <h2 className="text-xl sm:text-2xl font-bold font-siliguri text-slate-900">
                        {certTitle}
                      </h2>
                      <p className="text-xs text-slate-600 font-tiro">{certSubtitle}</p>
                      <div className="flex justify-between text-[11px] text-slate-600 pt-2 font-baloo">
                        <span>রেজিস্টার নং: {vr.recordNumber || vr.plotNumber}</span>
                        <span>ইস্যুর তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
                      </div>
                    </div>

                    {/* Immutable Verified Facts Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex justify-between border-b border-slate-200/70 pb-1">
                        <span className="text-slate-600 font-siliguri">মরহুম/মরহুমার নাম:</span>
                        <span className="font-bold text-slate-900 font-tiro">{vr.deceasedName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/70 pb-1">
                        <span className="text-slate-600 font-siliguri">পিতা / স্বামীর নাম:</span>
                        <span className="font-bold text-slate-900 font-tiro">{vr.fatherOrSpouseName || 'উল্লেখ নেই'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/70 pb-1">
                        <span className="text-slate-600 font-siliguri">বয়স:</span>
                        <span className="font-bold text-slate-900 font-baloo">{vr.ageLabelBn}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/70 pb-1">
                        <span className="text-slate-600 font-siliguri">মৃত্যুর তারিখ:</span>
                        <span className="font-bold text-slate-900 font-baloo">{vr.dateOfDeathBn}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/70 pb-1">
                        <span className="text-slate-600 font-siliguri">দাফনের তারিখ:</span>
                        <span className="font-bold text-slate-900 font-baloo">{vr.burialDateBn}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/70 pb-1">
                        <span className="text-slate-600 font-siliguri">কবর / প্লট ও ব্লক:</span>
                        <span className="font-bold text-slate-900 font-baloo">
                          প্লট {vr.plotNumber}{vr.block ? `, ${vr.block}` : ''}{vr.row ? `, সারি ${vr.row}` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-siliguri">অভিভাবক / ওয়ারিশ:</span>
                        <span className="font-bold text-slate-900 font-tiro">
                          {vr.contactPersonName || 'উল্লেখ নেই'}{vr.relationWithDeceased ? ` (${vr.relationWithDeceased})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-siliguri">কবরস্থান:</span>
                        <span className="font-bold text-slate-900 font-tiro">{vr.graveyardName}</span>
                      </div>
                    </div>

                    {/* Certificate Narrative Body */}
                    <div className="space-y-3 text-sm leading-relaxed text-slate-800 font-tiro text-justify">
                      {paragraphs.map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>

                    <p className="text-sm italic text-emerald-950 font-tiro border-l-4 border-emerald-600 pl-3 py-1 bg-emerald-50/40">
                      {certClosing}
                    </p>

                    {/* Signatures */}
                    <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs font-siliguri">
                      <div>
                        <div className="border-t border-slate-400 pt-1.5 mx-6 font-bold text-slate-700">
                          কবরস্থান তত্ত্বাবধায়ক / সেক্রেটারি
                        </div>
                        <p className="text-[11px] text-slate-500 font-tiro">স্বাক্ষর ও তারিখ</p>
                      </div>
                      <div>
                        <div className="border-t border-slate-400 pt-1.5 mx-6 font-bold text-slate-700">
                          সভাপতি / মুতাওয়াল্লী
                        </div>
                        <p className="text-[11px] text-slate-500 font-tiro">সিল ও স্বাক্ষর</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONDOLENCE & DUA DRAFT */}
              {activeTab === 'condolence' && (
                <div className="space-y-4">
                  {/* Full Message Card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-teal-950 font-siliguri">
                          {draft.condolenceHeadingBn} (WhatsApp / চিঠি / নোটিশ ড্রাফট)
                        </h4>
                        <p className="text-[11px] text-teal-800 font-tiro">
                          অভিভাবক: {vr.contactPersonName || 'পরিবারের সদস্যবৃন্দ'} {vr.contactPersonPhone ? `• ${vr.contactPersonPhone}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(condolenceText, 'full')}
                        className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold font-siliguri flex items-center gap-1.5 shadow-xs"
                      >
                        {copiedFull ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedFull ? 'কপি হয়েছে!' : 'সম্পূর্ণ বার্তা কপি করুন'}</span>
                      </button>
                    </div>

                    <textarea
                      rows={7}
                      value={condolenceText}
                      onChange={(e) => setCondolenceText(e.target.value)}
                      className="w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-tiro text-slate-800 leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  {/* Short SMS Draft */}
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 font-siliguri">
                          সংক্ষিপ্ত SMS খসড়া (স্বয়ংক্রিয়ভাবে পাঠানো হবে না — কেবল কপি করুন)
                        </h4>
                        <p className="text-[11px] text-slate-500 font-baloo">
                          অক্ষর সংখ্যা: {shortSmsText.length}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(shortSmsText, 'sms')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-siliguri flex items-center gap-1.5"
                      >
                        {copiedSms ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSms ? 'কপি হয়েছে!' : 'SMS খসড়া কপি করুন'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={shortSmsText}
                      onChange={(e) => setShortSmsText(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-tiro text-slate-800 leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="no-print px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-tiro">
            কোনো সনদ বা বার্তা স্বয়ংক্রিয়ভাবে সংরক্ষণ বা প্রেরণ করা হয় না।
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold font-siliguri transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

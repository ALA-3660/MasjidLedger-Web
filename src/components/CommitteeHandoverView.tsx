import React, { useState } from 'react';
import {
  Repeat,
  ShieldCheck,
  Building2,
  Wallet,
  FileText,
  Key,
  CheckCircle2,
  Printer,
  Calendar,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Stamp,
  Award,
  Lock,
  Coins,
  ChevronRight,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { CommitteeTerm, CommitteeMember, Mosque, FinancialAccount } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';
import { toBanglaNumber } from './CommitteeView';
import { printElement } from '../lib/printUtils';

interface CommitteeHandoverViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  mosque?: Mosque | null;
  accounts?: FinancialAccount[];
  language: Language;
  currentUser?: any;
}

interface HandoverCheckItem {
  id: string;
  category: 'CASH_BANK' | 'ASSETS' | 'DOCUMENTS' | 'PROJECTS' | 'LIABILITIES';
  title: string;
  details: string;
  outgoingResponsible: string;
  incomingResponsible: string;
  verifiedStatus: 'PENDING' | 'VERIFIED' | 'DISCREPANCY';
  remarks?: string;
}

export const CommitteeHandoverView: React.FC<CommitteeHandoverViewProps> = ({
  terms,
  members,
  mosque,
  accounts = [],
  language,
  currentUser,
}) => {
  const isBn = language === 'bn';
  const activeTerm = terms.find((t) => t.status === 'ACTIVE') || terms[0];
  const previousTerms = terms.filter((t) => t.id !== activeTerm?.id);

  const [outgoingTermId, setOutgoingTermId] = useState<string>(previousTerms[0]?.id || '');
  const [incomingTermId, setIncomingTermId] = useState<string>(activeTerm?.id || '');
  const [handoverDate, setHandoverDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'checklist' | 'certificate' | 'history'>('checklist');

  // Handover items checklist
  const [checkItems, setCheckItems] = useState<HandoverCheckItem[]>([
    {
      id: 'h1',
      category: 'CASH_BANK',
      title: 'মসজিদ নগদ তহবিল ও ক্যাশ ব্যালেন্স হস্তান্তর',
      details: 'মসজিদের ক্যাশবাক্স, লকার ও ক্যাশিয়ারের হাতে রক্ষিত নগদ জের গণনা ও সমর্পণ।',
      outgoingResponsible: 'সাবেক কোষাধ্যক্ষ',
      incomingResponsible: 'নবাগত কোষাধ্যক্ষ',
      verifiedStatus: 'VERIFIED',
      remarks: 'ভাউচার ও ক্যাশবুক মিলানো হয়েছে।',
    },
    {
      id: 'h2',
      category: 'CASH_BANK',
      title: 'সকল ব্যাংক একাউন্টের চেক বই ও স্বাক্ষর পরিবর্তন',
      details: 'ব্যাংক হিসাবসমূহের সর্বশেষ লেজার ব্যালেন্স, ব্যবহার্য চেক বই এবং ব্যাংক স্টেটমেন্ট।',
      outgoingResponsible: 'সাবেক সভাপতি ও কোষাধ্যক্ষ',
      incomingResponsible: 'বর্তমান সভাপতি ও কোষাধ্যক্ষ',
      verifiedStatus: 'VERIFIED',
      remarks: 'ব্যাংকে নতুন রেজোলিউশন ও স্বাক্ষর প্রেরিত।',
    },
    {
      id: 'h3',
      category: 'DOCUMENTS',
      title: 'ওয়াকফ দলিল, খতিয়ান ও নামজারি মূল নথিপত্র',
      details: 'মসজিদ কমপ্লেক্সের মূল ভূমি দলিল, খাজনা রশিদ, ওয়াকফ সনদ ও কোর্ট মামলার ফাইল।',
      outgoingResponsible: 'সাবেক সাধারণ সম্পাদক',
      incomingResponsible: 'বর্তমান সাধারণ সম্পাদক',
      verifiedStatus: 'VERIFIED',
      remarks: 'সেন্ট্রাল লকারে অক্ষত অবস্থায় রক্ষিত।',
    },
    {
      id: 'h4',
      category: 'ASSETS',
      title: 'মসজিদ সম্পদ, সাউন্ড সিস্টেম, জেনারেটর ও সিসিটিভি পাসওয়ার্ড',
      details: 'মূল চাবি গুচ্ছ, কন্ট্রোল রুম এক্সেস, সিসিটিভি মাস্টার পাসওয়ার্ড ও রেজিস্টার।',
      outgoingResponsible: 'সাবেক সাংগঠনিক সম্পাদক',
      incomingResponsible: 'বর্তমান দপ্তর ও সাংগঠনিক সম্পাদক',
      verifiedStatus: 'VERIFIED',
      remarks: 'সম্পদ রেজিস্টার অনুযায়ী শতভাগ গণনা সম্পন্ন।',
    },
    {
      id: 'h5',
      category: 'LIABILITIES',
      title: 'বকেয়া বিল, নির্মাণ দায় ও স্টাফ বেতন নিষ্পত্তি',
      details: 'চলতি বিদ্যুৎ বিল, পানির বিল ও চলমান উন্নয়ন কাজের অপরিশোধিত বিলের তালিকা।',
      outgoingResponsible: 'সাবেক কোষাধ্যক্ষ',
      incomingResponsible: 'বর্তমান কোষাধ্যক্ষ',
      verifiedStatus: 'VERIFIED',
      remarks: 'অনুমোদিত তালিকা সংযুক্ত।',
    },
  ]);

  const outgoingTerm = terms.find((t) => t.id === outgoingTermId) || previousTerms[0];
  const incomingTerm = terms.find((t) => t.id === incomingTermId) || activeTerm;

  const handleToggleStatus = (id: string) => {
    setCheckItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus: Record<string, 'PENDING' | 'VERIFIED' | 'DISCREPANCY'> = {
          PENDING: 'VERIFIED',
          VERIFIED: 'DISCREPANCY',
          DISCREPANCY: 'PENDING',
        };
        return { ...item, verifiedStatus: nextStatus[item.verifiedStatus] };
      })
    );
  };

  const handlePrintCertificate = () => {
    printElement('printable-handover-certificate', {
      title: `দায়িত্ব_হস্তান্তর_সনদ_${incomingTerm?.title || ''}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Protocol Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-bold mb-1.5 border border-orange-200">
              <Repeat className="w-3.5 h-3.5" />
              <span>{isBn ? 'দফাওয়ারি দায়িত্ব হস্তান্তর ও ট্রানজিশন প্রটোকল' : 'Handover & Transition Protocol'}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isBn ? 'কমিটি দায়িত্ব হস্তান্তর ও প্রাতিষ্ঠানিক হিসাব সমর্পণ' : 'Committee Responsibility Handover & Audit Transition'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isBn
                ? 'মেয়াদান্তে পূর্ববর্তী ও পরবর্তী কমিটির মাঝে নগদ তহবিল, ব্যাংক হিসাব, ওয়াকফ দলিল ও সম্পদের নিয়মতান্ত্রিক হস্তান্তর।'
                : 'Systematic protocol for handing over financial funds, bank mandates, assets and official archives.'}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              <span>{isBn ? 'হস্তান্তর চেকলিস্ট' : 'Handover Checklist'}</span>
            </button>
            <button
              onClick={() => setActiveTab('certificate')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'certificate'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5 inline mr-1" />
              <span>{isBn ? 'হস্তান্তর প্রত্যয়ন সনদ' : 'Official Certificate'}</span>
            </button>
          </div>
        </div>

        {/* Term Transition Mapping Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl border">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              {isBn ? 'হস্তান্তরকারী পরিষদ (বিদায়ী কমিটি):' : 'Outgoing Committee Term:'}
            </label>
            <select
              value={outgoingTermId}
              onChange={(e) => setOutgoingTermId(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-2 text-slate-800"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status === 'ACTIVE' ? 'সক্রিয়' : 'সমাপ্ত'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              {isBn ? 'দায়িত্ব গ্রহণকারী পরিষদ (নবাগত কমিটি):' : 'Incoming Committee Term:'}
            </label>
            <select
              value={incomingTermId}
              onChange={(e) => setIncomingTermId(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-2 text-slate-800"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status === 'ACTIVE' ? 'সক্রিয়' : 'সমাপ্ত'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              {isBn ? 'আনুষ্ঠানিক হস্তান্তরের তারিখ:' : 'Official Handover Date:'}
            </label>
            <input
              type="date"
              value={handoverDate}
              onChange={(e) => setHandoverDate(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg p-2 text-slate-800"
            />
          </div>
        </div>
      </div>

      {activeTab === 'checklist' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isBn ? 'দফাওয়ারি সম্পদ ও নথি যাচাই তালিকা' : 'Sectional Assets & Document Verification Table'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isBn ? 'প্রতিটি আইটেম যাচাই করে স্ট্যাটাস পরিবর্তন করুন।' : 'Verify each handover category and toggle verification.'}
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              {isBn
                ? `যাচাইকৃত: ${toBanglaNumber(checkItems.filter((i) => i.verifiedStatus === 'VERIFIED').length)} / ${toBanglaNumber(checkItems.length)}`
                : `Verified: ${checkItems.filter((i) => i.verifiedStatus === 'VERIFIED').length} / ${checkItems.length}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="p-3">{isBn ? 'দফা ও বিবরণ' : 'Category & Item'}</th>
                  <th className="p-3">{isBn ? 'হস্তান্তরকারী' : 'Outgoing Lead'}</th>
                  <th className="p-3">{isBn ? 'গ্রহণকারী' : 'Incoming Lead'}</th>
                  <th className="p-3">{isBn ? 'যাচাই অবস্থা' : 'Verification'}</th>
                  <th className="p-3">{isBn ? 'মন্তব্য ও রেকর্ড' : 'Remarks'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checkItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{item.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.details}</div>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{item.outgoingResponsible}</td>
                    <td className="p-3 font-medium text-slate-700">{item.incomingResponsible}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors ${
                          item.verifiedStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.verifiedStatus === 'DISCREPANCY'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>
                          {item.verifiedStatus === 'VERIFIED'
                            ? 'যাচাইকৃত'
                            : item.verifiedStatus === 'DISCREPANCY'
                            ? 'আপত্তি আছে'
                            : 'অপেক্ষমাণ'}
                        </span>
                      </button>
                    </td>
                    <td className="p-3 text-slate-600 text-[11px]">{item.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'certificate' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={handlePrintCertificate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isBn ? 'সনদ প্রিন্ট করুন (A4)' : 'Print Handover Certificate'}</span>
            </button>
          </div>

          {/* Printable Handover Certificate Document */}
          <div
            id="printable-handover-certificate"
            className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-md max-w-4xl mx-auto font-serif text-slate-900 leading-relaxed"
          >
            {/* Mosque Header */}
            <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
              <h1 className="text-2xl font-bold font-sans text-slate-900">
                {mosque?.name || 'মসজিদুল মুমিনীন জামে মসজিদ কমপ্লেক্স'}
              </h1>
              <p className="text-xs font-sans text-slate-600">
                {mosque?.address || 'মিরপুর-১০, ঢাকা-১২১৬'}
              </p>
              <div className="inline-block mt-3 px-4 py-1 border border-slate-900 rounded-md font-sans text-xs font-bold uppercase tracking-widest bg-slate-100">
                দায়িত্ব হস্তান্তর ও গ্রহণ প্রত্যয়ন সনদপত্র
              </div>
            </div>

            {/* Certificate Body */}
            <div className="mt-8 space-y-5 text-sm">
              <p>
                এতদ্বারা প্রত্যয়ন করা যাইতেছে যে, অদ্য{' '}
                <span className="font-bold underline">{formatDate(handoverDate, language)}</span> রোজ{' '}
                {mosque?.name || 'মসজিদ কমপ্লেক্স'}-এর বিদায়ী পরিচালনা পরিষদ{' '}
                <span className="font-bold underline">({outgoingTerm?.title || 'পূর্ববর্তী পরিষদ'})</span> কর্তৃক
                নবনির্বাচিত পরিচালনা পরিষদ{' '}
                <span className="font-bold underline">({incomingTerm?.title || 'নবাগত পরিষদ'})</span>-এর নিকট
                মসজিদের সমুদয় নগদ তহবিল, ব্যাংক হিসাবের স্থিতি, ওয়াকফ দলিলপত্র, চাবিগুচ্ছ এবং স্থাবর-অস্থাবর সম্পত্তির
                সম্পূর্ণ দখল ও প্রশাসনিক দায়িত্ব বিধিমোতাবেক হস্তান্তর ও গ্রহণ সম্পন্ন হইল।
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-sans">
                <div className="font-bold text-slate-800 underline">হস্তান্তরিত মূল খাতসমূহের সারসংক্ষেপ:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>১. নগদ ক্যাশ ব্যালেন্স ও ক্যাশবুক ভাউচার: <span className="font-bold text-emerald-700">হস্তান্তরিত</span></div>
                  <div>২. ব্যাংক হিসাব চেক বই ও হিসাব বিবরণী: <span className="font-bold text-emerald-700">হস্তান্তরিত</span></div>
                  <div>৩. ওয়াকফ ভূমি দলিল ও নামজারি নথি: <span className="font-bold text-emerald-700">হস্তান্তরিত</span></div>
                  <div>৪. মসজিদ সম্পদ ও ইলেকট্রনিক চাবিগুচ্ছ: <span className="font-bold text-emerald-700">হস্তান্তরিত</span></div>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                উভয় পক্ষের সম্মতি ও উপস্থিতিতে অনুষ্ঠিত যৌথ সাধারণ সভার সিদ্ধান্ত মোতাবেক এই হস্তান্তর দলিল স্বাক্ষরিত হইল।
              </p>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-slate-300 text-center text-xs font-sans">
              <div className="space-y-12">
                <div className="text-slate-400 italic">[ বিদায়ী কমিটির স্বাক্ষর ]</div>
                <div className="border-t border-slate-800 pt-1 font-bold">
                  <div>সাবেক সভাপতি / সাধারণ সম্পাদক</div>
                  <div className="text-[10px] text-slate-500">{outgoingTerm?.title}</div>
                </div>
              </div>

              <div className="space-y-12">
                <div className="text-slate-400 italic">[ নবাগত কমিটির স্বাক্ষর ]</div>
                <div className="border-t border-slate-800 pt-1 font-bold">
                  <div>বর্তমান সভাপতি / সাধারণ সম্পাদক</div>
                  <div className="text-[10px] text-slate-500">{incomingTerm?.title}</div>
                </div>
              </div>
            </div>

            {/* Verification Footer */}
            <div className="text-center text-[10px] text-slate-400 font-mono mt-12 pt-4 border-t border-slate-100">
              MasjidLedger Pro Official Verification & Transition Stamp • {handoverDate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

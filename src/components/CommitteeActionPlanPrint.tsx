import React from 'react';
import {
  Printer,
  X,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  FileCheck2,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  CommitteeActionPlan,
  CommitteeTerm,
  CommitteeMember,
  Mosque
} from '../types';
import { Language, formatDate } from '../lib/i18n';

interface CommitteeActionPlanPrintProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: CommitteeActionPlan | null;
  plansList?: CommitteeActionPlan[];
  reportTitle?: string;
  term?: CommitteeTerm | null;
  members?: CommitteeMember[];
  mosque?: Mosque | null;
  language?: Language;
}

export const CommitteeActionPlanPrint: React.FC<CommitteeActionPlanPrintProps> = ({
  isOpen,
  onClose,
  plan,
  plansList,
  reportTitle = 'কমিটি কর্মপরিকল্পনা ও বাস্তবায়ন অগ্রগতি প্রতিবেদন',
  term,
  members = [],
  mosque,
  language = 'bn'
}) => {
  if (!isOpen) return null;

  const [includeLetterhead, setIncludeLetterhead] = React.useState<boolean>(true);

  const handlePrint = () => {
    document.body.classList.add('print-action-plan-active');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-action-plan-active');
    }, 500);
  };

  const toBnNum = (num: number | string | undefined): string => {
    if (num === undefined || num === null) return '০';
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, d => bnDigits[+d]);
  };

  const formatCurrency = (amt?: number) => {
    if (amt === undefined || amt === null) return '৳০';
    return `৳${amt.toLocaleString('bn-BD')}`;
  };

  const getStatusBn = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'সম্পন্ন (Completed)';
      case 'IN_PROGRESS': return 'চলমান (In Progress)';
      case 'TODO': return 'পরিকল্পিত / করণীয় (To Do)';
      case 'ON_HOLD': return 'স্থগিত (On Hold)';
      case 'CANCELLED': return 'বাতিল (Cancelled)';
      case 'OVERDUE': return 'মেয়াদোত্তীর্ণ (Overdue)';
      default: return status;
    }
  };

  const getPriorityBn = (p: string) => {
    switch (p) {
      case 'URGENT': return 'জরুরি (Urgent)';
      case 'HIGH': return 'উচ্চ (High)';
      case 'MEDIUM': return 'মাঝারি (Medium)';
      default: return 'সাধারণ (Normal)';
    }
  };

  const isSingle = Boolean(plan && !plansList);
  const itemsToPrint: CommitteeActionPlan[] = isSingle ? [plan!] : (plansList || []);

  const totalBudget = itemsToPrint.reduce((s, p) => s + (Number(p.estimatedBudget) || 0), 0);
  const totalActual = itemsToPrint.reduce((s, p) => s + (Number(p.actualCost) || 0), 0);
  const completedCount = itemsToPrint.filter(p => p.status === 'COMPLETED').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:h-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto print:border-none print:shadow-none print:p-0 print:max-w-none print:rounded-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                {isSingle ? `কর্মপরিকল্পনা প্রিন্ট প্রিভিউ (#${plan?.planNumber})` : 'কর্মপরিকল্পনা পূর্ণাঙ্গ প্রতিবেদন প্রিন্ট'}
              </h3>
              <p className="text-xs text-slate-500">A4 সাইজে মানসম্মত ও পেশাদার লেআউটে প্রস্তুতকৃত</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Software Letterhead সহ প্রিন্ট</span>
            </label>

            <button
              id="btn-trigger-print-action-plan"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF সংরক্ষণ</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (A4 Layout) */}
        <div className="print-content report-print-root space-y-5 p-4 sm:p-8 bg-white border border-slate-200 rounded-xl print:border-none print:p-0">
          {/* Mosque Official Letterhead */}
          {includeLetterhead && (
            <div className="text-center border-b-2 border-emerald-800 pb-4 space-y-1">
              <div className="text-xs font-semibold text-emerald-800 tracking-wider">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {mosque?.name || 'বায়তুল মামুর জামে মসজিদ'}
              </h1>
              <p className="text-xs text-slate-600">
                {mosque?.address || 'ঠিকানা: মসজিদ রোড, সদর'}
                {mosque?.contactPhone ? ` • মোবাইল: ${mosque.contactPhone}` : ''}
                {mosque?.email ? ` • ইমেইল: ${mosque.email}` : ''}
              </p>
              <div className="inline-block mt-1 px-3 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-full text-xs font-bold">
                {reportTitle}
              </div>
            </div>
          )}

          {/* Metadata Banner */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-slate-500 block text-[10px]">কমিটির মেয়াদ:</span>
              <span className="font-bold text-slate-900">{term?.title || plan?.termTitle || 'সক্রিয় পরিচালনা পরিষদ'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">প্রতিবেদনের তারিখ:</span>
              <span className="font-bold text-slate-900">{formatDate(new Date().toISOString().split('T')[0], language)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">মোট কাজ:</span>
              <span className="font-bold text-slate-900">{toBnNum(itemsToPrint.length)}টি (সম্পন্ন: {toBnNum(completedCount)}টি)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">মোট প্রাক্কলিত বাজেট:</span>
              <span className="font-bold text-emerald-800">{formatCurrency(totalBudget)}</span>
            </div>
          </div>

          {/* SINGLE PLAN DETAIL VIEW */}
          {isSingle && plan && (
            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      {plan.planNumber}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{plan.title}</h2>
                    <div className="text-slate-600 mt-0.5">বিভাগ: <span className="font-semibold">{plan.category}</span></div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800">
                      {getStatusBn(plan.status)}
                    </span>
                    <div className="text-slate-500 text-[10px] mt-1">অগ্রগতি: <strong className="text-emerald-700">{toBnNum(plan.progressPercentage)}%</strong></div>
                  </div>
                </div>

                {plan.description && (
                  <div className="pt-2 border-t border-emerald-100">
                    <span className="font-bold text-slate-800 block mb-0.5">কাজের বিবরণ ও উদ্দেশ্য:</span>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{plan.description}</p>
                  </div>
                )}
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">দায়িত্বপ্রাপ্ত ব্যক্তি ও সময়সীমা</div>
                  <div><span className="text-slate-500">মূল দায়িত্বে:</span> <strong className="text-slate-800">{plan.responsibleMemberName || 'নির্দিষ্ট করা হয়নি'}</strong></div>
                  {plan.responsibleMemberDesignation && <div><span className="text-slate-500">পদবি:</span> <span>{plan.responsibleMemberDesignation}</span></div>}
                  {plan.responsibleMemberPhone && <div><span className="text-slate-500">মোবাইল:</span> <span>{plan.responsibleMemberPhone}</span></div>}
                  {plan.assistantMembers && plan.assistantMembers.length > 0 && (
                    <div>
                      <span className="text-slate-500">সহকারী সদস্যবৃন্দ:</span>{' '}
                      <span>{plan.assistantMembers.map(m => m.name).join(', ')}</span>
                    </div>
                  )}
                  <div className="pt-1 text-[11px]">
                    <span className="text-slate-500">শুরুর তারিখ:</span> <strong>{formatDate(plan.startDate, language)}</strong> •{' '}
                    <span className="text-slate-500">সমাপ্তির তারিখ:</span> <strong>{formatDate(plan.dueDate, language)}</strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">আর্থিক ও রেজোলিউশন তথ্য</div>
                  <div><span className="text-slate-500">প্রাক্কলিত বাজেট:</span> <strong className="text-emerald-800">{formatCurrency(plan.estimatedBudget)}</strong></div>
                  <div><span className="text-slate-500">প্রকৃত খরচ:</span> <strong className="text-slate-900">{formatCurrency(plan.actualCost)}</strong></div>
                  {plan.fundingSource && <div><span className="text-slate-500">অর্থায়নের উৎস:</span> <span>{plan.fundingSource}</span></div>}
                  {plan.financialVoucherNumber && <div><span className="text-slate-500">ভাউচার নং:</span> <code>{plan.financialVoucherNumber}</code></div>}
                  {plan.resolutionNumber && (
                    <div className="pt-1 text-[11px] text-blue-900">
                      <span>সংযুক্ত রেজোলিউশন:</span> <strong>{plan.resolutionNumber}</strong> ({plan.resolutionSubject || 'অনুমোদিত সিদ্ধান্ত'})
                    </div>
                  )}
                </div>
              </div>

              {plan.remarks && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-0.5">মন্তব্য ও বিশেষ নির্দেশনা:</span>
                  <p className="text-amber-800">{plan.remarks}</p>
                </div>
              )}
            </div>
          )}

          {/* MULTI PLAN TABLE VIEW */}
          {!isSingle && (
            <div className="space-y-3">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-emerald-800 text-white">
                    <th className="p-2 border border-emerald-700 text-center w-8">ক্রম</th>
                    <th className="p-2 border border-emerald-700 w-24">আইডি</th>
                    <th className="p-2 border border-emerald-700">কাজের নাম ও বিবরণ</th>
                    <th className="p-2 border border-emerald-700 w-24">বিভাগ</th>
                    <th className="p-2 border border-emerald-700 w-28">দায়িত্বপ্রাপ্ত সদস্য</th>
                    <th className="p-2 border border-emerald-700 text-center w-20">সময়সীমা</th>
                    <th className="p-2 border border-emerald-700 text-right w-20">বাজেট</th>
                    <th className="p-2 border border-emerald-700 text-right w-20">প্রকৃত ব্যয়</th>
                    <th className="p-2 border border-emerald-700 text-center w-20">অগ্রগতি ও অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsToPrint.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-2 border border-slate-300 text-center font-mono">{toBnNum(idx + 1)}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold text-emerald-800">{p.planNumber}</td>
                      <td className="p-2 border border-slate-300">
                        <div className="font-bold text-slate-900">{p.title}</div>
                        {p.resolutionNumber && (
                          <div className="text-[10px] text-blue-700">রেজোলিউশন: {p.resolutionNumber}</div>
                        )}
                      </td>
                      <td className="p-2 border border-slate-300">{p.category}</td>
                      <td className="p-2 border border-slate-300">
                        <div className="font-semibold text-slate-800">{p.responsibleMemberName || 'অনির্ধারিত'}</div>
                        {p.responsibleMemberDesignation && (
                          <div className="text-[9px] text-slate-500">{p.responsibleMemberDesignation}</div>
                        )}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono text-[10px]">
                        {p.dueDate ? formatDate(p.dueDate, language) : '-'}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-semibold">
                        {formatCurrency(p.estimatedBudget)}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-semibold">
                        {formatCurrency(p.actualCost)}
                      </td>
                      <td className="p-2 border border-slate-300 text-center">
                        <div className="font-bold text-[10px] text-slate-800">{p.progressPercentage}%</div>
                        <div className="text-[9px] text-slate-600">{getStatusBn(p.status)}</div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={6} className="p-2 border border-slate-300 text-right">সর্বমোট বাজেট ও ব্যয়:</td>
                    <td className="p-2 border border-slate-300 text-right font-mono text-emerald-800">{formatCurrency(totalBudget)}</td>
                    <td className="p-2 border border-slate-300 text-right font-mono text-slate-900">{formatCurrency(totalActual)}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">
                      সাশ্রয়: {formatCurrency(totalBudget - totalActual)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures & Seal Box */}
          <div className="pt-12 grid grid-cols-3 gap-4 text-center text-xs text-slate-800 print:pt-16">
            <div className="space-y-1">
              <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold">আহ্বায়ক / সমন্বয়কারী</div>
              <div className="text-slate-500 text-[10px]">কর্মপরিকল্পনা বাস্তবায়ন সেল</div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold">সাধারণ সম্পাদক</div>
              <div className="text-slate-500 text-[10px]">{mosque?.name || 'মসজিদ কমিটি'}</div>
            </div>
            <div className="space-y-1">
              <div className="border-t border-slate-400 w-36 mx-auto pt-1 font-bold">সভাপতি</div>
              <div className="text-slate-500 text-[10px]">{mosque?.name || 'মসজিদ কমিটি'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

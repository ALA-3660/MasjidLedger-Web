import React, { useState } from 'react';
import {
  X,
  Printer,
  HeartHandshake,
  Building2,
  Calendar,
  UserCheck,
} from 'lucide-react';
import {
  DonationPlan,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  Mosque,
} from '../../types';
import { Language, toBanglaNumber, formatDate } from '../../lib/i18n';

interface DonationPlanPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: DonationPlan[];
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  workers: CollectionWorker[];
  currentMosque?: Mosque | null;
  language?: Language;
}

export const DonationPlanPrintModal: React.FC<DonationPlanPrintModalProps> = ({
  isOpen,
  onClose,
  plans,
  persons,
  families,
  areas,
  workers,
  currentMosque,
  language = 'bn',
}) => {
  const [showLetterhead, setShowLetterhead] = useState(true);

  if (!isOpen) return null;

  const isBn = language === 'bn';

  const handlePrint = () => {
    window.print();
  };

  const getPerson = (personId: string) => persons.find((p) => p.id === personId);
  const getFamily = (famId?: string) => families.find((f) => f.id === famId);
  const getArea = (areaId?: string) => areas.find((a) => a.id === areaId);
  const getWorker = (wId?: string) => workers.find((w) => w.id === wId);

  const totalMonthly = plans
    .filter((p) => p.status === 'ACTIVE' && p.planType === 'MONTHLY')
    .reduce((sum, p) => sum + (p.amount ?? p.plannedAmount ?? 0), 0);

  const totalYearly = plans
    .filter((p) => p.status === 'ACTIVE' && p.planType === 'YEARLY')
    .reduce((sum, p) => sum + (p.amount ?? p.plannedAmount ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none">
        {/* Header - Screen only */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-siliguri">
                {isBn ? 'দান পরিকল্পনা রেজিস্টার প্রিন্ট প্রিভিউ' : 'Donation Plan Register Print'}
              </h2>
              <p className="text-xs text-slate-400 font-tiro">
                {isBn
                  ? 'A4 সাইজে মুদ্রণযোগ্য নিয়মিত দান ও প্রতিশ্রুতির তালিকা'
                  : 'A4 Printable donation pledges and collector register'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none font-siliguri">
              <input
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-600 bg-slate-800"
              />
              <span>{isBn ? 'লেটারহেডসহ প্রিন্ট' : 'With Letterhead'}</span>
            </label>
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{isBn ? 'প্রিন্ট করুন (A4)' : 'Print (A4)'}</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-white text-slate-900 font-tiro print:p-0 print:overflow-visible">
          {/* Mosque Official Letterhead */}
          {showLetterhead && (
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <h1 className="text-2xl font-bold font-siliguri text-slate-900">
                {currentMosque?.name || (isBn ? 'মসজিদ বায়তুল মুকাররম' : 'Central Mosque')}
              </h1>
              <p className="text-xs text-slate-600">
                {currentMosque?.address || (isBn ? 'মহল্লা ও এলাকা কার্যালয়' : 'Mahalla & Territory Office')}
              </p>
              <div className="inline-block mt-1 px-3 py-0.5 border border-slate-900 rounded-full text-xs font-bold font-siliguri bg-slate-50">
                {isBn ? '📋 নিয়মিত দান পরিকল্পনা ও অঙ্গীকার রেজিস্টার' : 'Donation Pledges Register'}
              </div>
            </div>
          )}

          {/* Meta Info Bar */}
          <div className="flex items-center justify-between text-xs text-slate-700 font-siliguri border-b border-slate-200 pb-2">
            <div>
              <span>{isBn ? 'মোট পরিকল্পনা: ' : 'Total Plans: '}</span>
              <span className="font-bold font-baloo">{isBn ? toBanglaNumber(plans.length) : plans.length} টি</span>
            </div>
            <div>
              <span>{isBn ? 'মাসিক পরিকল্পিত: ' : 'Monthly Pledged: '}</span>
              <span className="font-bold font-baloo">৳{isBn ? toBanglaNumber(totalMonthly) : totalMonthly}</span>
              <span className="mx-2">|</span>
              <span>{isBn ? 'বাৎসরিক পরিকল্পিত: ' : 'Yearly Pledged: '}</span>
              <span className="font-bold font-baloo">৳{isBn ? toBanglaNumber(totalYearly) : totalYearly}</span>
            </div>
            <div>
              <span>{isBn ? 'প্রিন্টের তারিখ: ' : 'Print Date: '}</span>
              <span className="font-bold font-baloo">{formatDate(new Date().toISOString())}</span>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-siliguri border-b border-slate-300">
                <th className="p-2 border border-slate-300 w-10 text-center">#</th>
                <th className="p-2 border border-slate-300">{isBn ? 'কোড' : 'Code'}</th>
                <th className="p-2 border border-slate-300">{isBn ? 'মুসল্লির নাম ও মোবাইল' : 'Musalli Name & Phone'}</th>
                <th className="p-2 border border-slate-300">{isBn ? 'পরিবার ও এলাকা' : 'Family & Area'}</th>
                <th className="p-2 border border-slate-300">{isBn ? 'ধরন' : 'Type'}</th>
                <th className="p-2 border border-slate-300 text-right">{isBn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'}</th>
                <th className="p-2 border border-slate-300">{isBn ? 'সংগ্রহকারী / নোট' : 'Worker / Notes'}</th>
                <th className="p-2 border border-slate-300 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="p-2 border border-slate-300 w-24 text-center print:table-cell hidden">
                  {isBn ? 'স্বাক্ষর' : 'Signature'}
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p, idx) => {
                const person = getPerson(p.personId);
                const fam = person?.familyId ? getFamily(person.familyId) : null;
                const ar = person?.areaId ? getArea(person.areaId) : fam?.areaId ? getArea(fam.areaId) : null;
                const worker = p.collectionWorkerId ? getWorker(p.collectionWorkerId) : null;
                const pAmt = p.amount ?? p.plannedAmount ?? 0;

                return (
                  <tr key={p.id} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 text-center font-baloo">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 font-baloo font-bold">
                      {p.planCode || `PLAN-#${p.id.slice(0, 5)}`}
                    </td>
                    <td className="p-2 border border-slate-300 font-siliguri">
                      <div className="font-bold text-slate-900">{person?.fullName || '—'}</div>
                      {person?.mobile && <div className="text-[11px] text-slate-600 font-baloo">{person.mobile}</div>}
                    </td>
                    <td className="p-2 border border-slate-300 font-tiro text-[11px]">
                      <div>{fam ? fam.name : '—'}</div>
                      <div className="text-slate-500">{ar ? ar.name : ''}</div>
                    </td>
                    <td className="p-2 border border-slate-300 font-siliguri">
                      {p.planType === 'MONTHLY'
                        ? isBn
                          ? 'মাসিক'
                          : 'Monthly'
                        : p.planType === 'YEARLY'
                        ? isBn
                          ? 'বাৎসরিক'
                          : 'Yearly'
                        : p.planType === 'IRREGULAR'
                        ? isBn
                          ? 'অনিয়মিত'
                          : 'Irregular'
                        : '—'}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-baloo font-bold">
                      ৳{isBn ? toBanglaNumber(pAmt) : pAmt}
                    </td>
                    <td className="p-2 border border-slate-300 text-[11px] font-tiro">
                      {p.collectionRequired ? (
                        <div>
                          <span className="font-bold font-siliguri">{worker ? worker.name : isBn ? 'কালেকশন প্রয়োজন' : 'Needs Collection'}</span>
                          {p.collectionDay && <div className="text-slate-500">{p.collectionDay}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400">{isBn ? 'সরাসরি প্রদান' : 'Direct'}</span>
                      )}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-siliguri font-bold text-[11px]">
                      {p.status === 'ACTIVE'
                        ? isBn
                          ? 'সক্রিয়'
                          : 'Active'
                        : p.status === 'PAUSED'
                        ? isBn
                          ? 'স্থগিত'
                          : 'Paused'
                        : p.status === 'COMPLETED'
                        ? isBn
                          ? 'সম্পন্ন'
                          : 'Completed'
                        : isBn
                        ? 'বাতিল'
                        : 'Cancelled'}
                    </td>
                    <td className="p-2 border border-slate-300 print:table-cell hidden"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Signature Block - Print Only */}
          <div className="pt-12 hidden print:grid grid-cols-3 gap-6 text-center text-xs font-siliguri">
            <div className="border-t border-slate-900 pt-1">
              {isBn ? 'দায়িত্বপ্রাপ্ত সংগ্রহকারী' : 'Collection Worker'}
            </div>
            <div className="border-t border-slate-900 pt-1">
              {isBn ? 'হিসাবরক্ষক / ইমাম' : 'Accountant / Imam'}
            </div>
            <div className="border-t border-slate-900 pt-1">
              {isBn ? 'মুতাওয়াল্লী / সভাপতি' : 'President / Mutawalli'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

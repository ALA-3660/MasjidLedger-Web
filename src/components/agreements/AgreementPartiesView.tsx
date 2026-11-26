import React from 'react';
import { Users, Search, Phone, MapPin, ShieldCheck, FileText, UserCheck } from 'lucide-react';
import { AgreementPartyDirectoryItem } from '../../types/agreementTypes';
import { AGREEMENT_PARTY_TYPE_LABELS, AGREEMENT_STATUS_META } from '../../lib/agreementCatalog';

interface AgreementPartiesViewProps {
  parties: AgreementPartyDirectoryItem[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  onOpenAgreementById: (agreementId: string) => void;
}

export const AgreementPartiesView: React.FC<AgreementPartiesViewProps> = ({
  parties,
  loading,
  search,
  onSearchChange,
  onOpenAgreementById,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-siliguri flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <span>চুক্তির পক্ষসমূহ ও প্রতিনিধি ডিরেক্টরি</span>
          </h3>
          <p className="text-xs text-slate-500 font-tiro mt-0.5">
            সকল চুক্তিতে যুক্ত প্রথম, দ্বিতীয় ও অতিরিক্ত পক্ষ এবং তাঁদের স্বাক্ষরকারী প্রতিনিধি ও ক্ষমতার ভিত্তি (রেজুলেশন/অনুমোদনপত্র)
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="পক্ষ, প্রতিনিধি বা রেজুলেশন খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 text-xs font-tiro rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500 font-tiro">
          পক্ষসমূহের তথ্য লোড হচ্ছে...
        </div>
      ) : parties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-slate-700 font-siliguri">কোনো পক্ষের রেকর্ড পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500 font-tiro mt-1">
            নতুন চুক্তিপত্র তৈরি করলে সংশ্লিষ্ট সকল পক্ষ ও প্রতিনিধি স্বয়ংক্রিয়ভাবে এখানে তালিকাভুক্ত হবে।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {parties.map((party) => (
            <div key={party.partyKey} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-siliguri">{party.name}</h4>
                  <p className="text-[11px] text-slate-500 font-tiro mt-0.5">
                    {AGREEMENT_PARTY_TYPE_LABELS[party.partyType] || party.partyType}
                    {party.rolesUsed.length > 0 ? ` · ${party.rolesUsed.join(', ')}` : ''}
                  </p>
                </div>
                <span className="text-xs font-bold font-baloo text-emerald-800 tabular-nums shrink-0">
                  {party.agreements.length} চুক্তি
                </span>
              </div>

              {(party.phone || party.address || party.nidOrRegNo) && (
                <div className="text-xs text-slate-600 font-tiro space-y-1 border-t border-slate-100 pt-2.5">
                  {party.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-baloo">{party.phone}</span>
                      {party.nidOrRegNo && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>এনআইডি/রেজি: {party.nidOrRegNo}</span>
                        </>
                      )}
                    </div>
                  )}
                  {party.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>{party.address}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Representatives & Authority Basis */}
              {party.representatives.length > 0 && (
                <div className="border-t border-slate-100 pt-2.5">
                  <p className="text-[11px] font-bold text-slate-700 font-siliguri mb-1.5 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>প্রতিনিধি ও স্বাক্ষরকারী ({party.representatives.length})</span>
                  </p>
                  <div className="space-y-1.5">
                    {party.representatives.map((rep) => (
                      <div key={rep.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 font-siliguri">
                            {rep.name} <span className="font-normal text-slate-500">({rep.designation})</span>
                          </span>
                          {rep.isSignatory && (
                            <span className="text-[10px] font-semibold text-emerald-700 font-siliguri">
                              স্বাক্ষরকারী
                            </span>
                          )}
                        </div>
                        {rep.authorityBasis && (
                          <p className="text-[11px] text-slate-600 font-tiro mt-0.5 flex items-start gap-1">
                            <ShieldCheck className="w-3 h-3 text-teal-600 mt-0.5 shrink-0" />
                            <span>ক্ষমতার ভিত্তি: {rep.authorityBasis}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Agreements */}
              <div className="border-t border-slate-100 pt-2.5">
                <p className="text-[11px] font-bold text-slate-700 font-siliguri mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>সংশ্লিষ্ট চুক্তিপত্র</span>
                </p>
                <div className="space-y-1">
                  {party.agreements.map((ag) => {
                    const st = AGREEMENT_STATUS_META[ag.status] || AGREEMENT_STATUS_META.DRAFT;
                    return (
                      <button
                        key={`${ag.agreementId}-${ag.roleLabel}`}
                        type="button"
                        onClick={() => onOpenAgreementById(ag.agreementId)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors border border-transparent hover:border-slate-200"
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold font-baloo text-emerald-800 mr-1.5">
                            {ag.agreementNumber}
                          </span>
                          <span className="text-xs text-slate-800 font-siliguri truncate">{ag.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-siliguri shrink-0">
                          {ag.roleLabel} · {st.shortBn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

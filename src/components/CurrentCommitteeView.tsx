import React, { useState } from 'react';
import {
  Building,
  Users2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Search,
  Filter,
  Award,
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  FileText,
  UserCheck,
} from 'lucide-react';
import { CommitteeTerm, CommitteeMember, Mosque } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';
import { calculateTenure, toBanglaNumber } from './CommitteeView';
import { printElement } from '../lib/printUtils';

interface CurrentCommitteeViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  mosque?: Mosque | null;
  language: Language;
  onViewMemberProfile: (member: CommitteeMember) => void;
  onOpenAddMemberModal: () => void;
  onNavigateToSection: (section: any) => void;
}

const POSITION_ORDER: Record<string, number> = {
  PRESIDENT: 1,
  VICE_PRESIDENT: 2,
  SECRETARY: 3,
  JOINT_SECRETARY: 4,
  TREASURER: 5,
  ORGANIZING_SECRETARY: 6,
  ADVISOR: 7,
  IMAM: 8,
  MEMBER: 9,
  OTHER: 10,
};

const POSITION_LABELS_BN: Record<string, string> = {
  PRESIDENT: 'সভাপতি',
  VICE_PRESIDENT: 'সহ-সভাপতি',
  SECRETARY: 'সাধারণ সম্পাদক',
  JOINT_SECRETARY: 'যুগ্ম সাধারণ সম্পাদক',
  TREASURER: 'কোষাধ্যক্ষ / অর্থ সম্পাদক',
  ORGANIZING_SECRETARY: 'সাংগঠনিক সম্পাদক',
  ADVISOR: 'উপদেষ্টা',
  IMAM: 'খতিব / ইমাম',
  MEMBER: 'কার্যনির্বাহী সদস্য',
  OTHER: 'অন্যান্য পদ',
};

const PORTFOLIOS = [
  { id: 'ALL', label: 'সকল পদ ও সদস্য' },
  { id: 'LEADERSHIP', label: 'মূল কার্যনির্বাহী নেতৃত্ব (Presidency & Secretariat)' },
  { id: 'FINANCE', label: 'অর্থ ও হিসাব বিভাগ (Treasury)' },
  { id: 'OPERATIONS', label: 'সাংগঠনিক ও রক্ষণাবেক্ষণ (Operations)' },
  { id: 'GENERAL', label: 'সাধারণ সদস্যবৃন্দ (General Members)' },
];

export const CurrentCommitteeView: React.FC<CurrentCommitteeViewProps> = ({
  terms,
  members,
  mosque,
  language,
  onViewMemberProfile,
  onOpenAddMemberModal,
  onNavigateToSection,
}) => {
  const isBn = language === 'bn';
  const activeTerm = terms.find((t) => t.status === 'ACTIVE') || terms[0];
  const tenure = activeTerm
    ? calculateTenure(activeTerm.startDate, activeTerm.endDate, language)
    : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('ALL');

  // Filter members belonging to active committee term or active status
  const currentMembers = members.filter((m) => {
    const isTermMatch = activeTerm ? m.termId === activeTerm.id || !m.termId : true;
    return isTermMatch;
  });

  const activeExecutiveMembers = currentMembers
    .filter((m) => {
      if (m.status !== 'ACTIVE') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchPhone = m.phone.toLowerCase().includes(q);
        const matchPos = (m.positionCustomBn || POSITION_LABELS_BN[m.position] || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchPos;
      }
      return true;
    })
    .filter((m) => {
      if (selectedPortfolio === 'ALL') return true;
      if (selectedPortfolio === 'LEADERSHIP') {
        return ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'JOINT_SECRETARY'].includes(m.position);
      }
      if (selectedPortfolio === 'FINANCE') {
        return ['TREASURER'].includes(m.position);
      }
      if (selectedPortfolio === 'OPERATIONS') {
        return ['ORGANIZING_SECRETARY', 'IMAM', 'ADVISOR'].includes(m.position);
      }
      if (selectedPortfolio === 'GENERAL') {
        return ['MEMBER', 'OTHER'].includes(m.position);
      }
      return true;
    })
    .sort((a, b) => {
      const orderA = POSITION_ORDER[a.position] || 99;
      const orderB = POSITION_ORDER[b.position] || 99;
      return orderA - orderB;
    });

  const leadershipMembers = currentMembers.filter((m) =>
    ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'JOINT_SECRETARY', 'TREASURER'].includes(m.position) && m.status === 'ACTIVE'
  );

  const handlePrintOrganogram = () => {
    printElement('printable-current-committee', {
      title: `বর্তমান_কমিটি_${activeTerm?.title || 'রস্টার'}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Active Term Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl text-white p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
        {/* Background decorative ring */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isBn ? 'চলমান কার্যনির্বাহী মেয়াদ' : 'Active Committee Term'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {activeTerm ? activeTerm.title : isBn ? '২০২৬-২০২৮ কার্যনির্বাহী পরিচালনা পরিষদ' : 'Executive Managing Committee'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {activeTerm?.description || (isBn
                ? 'মসজিদের সার্বিক ব্যবস্থাপনা, আর্থিক হিসাবরক্ষণ, উন্নয়ন প্রকল্প বাস্তবায়ন ও ওয়াকফ সম্পত্তি সংরক্ষণের মূল প্রশাসনিক পর্ষদ।'
                : 'Central administrative council responsible for overall mosque operations, fiscal integrity and community affairs.')}
            </p>
          </div>

          {/* Quick Stats Block */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/10 text-center min-w-[110px]">
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                {isBn ? toBanglaNumber(currentMembers.filter((m) => m.status === 'ACTIVE').length) : currentMembers.filter((m) => m.status === 'ACTIVE').length}
              </div>
              <div className="text-[11px] text-blue-200">{isBn ? 'সক্রিয় সদস্য' : 'Active Members'}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/10 text-center min-w-[110px]">
              <div className="text-xl sm:text-2xl font-bold text-emerald-300 font-mono">
                {isBn ? toBanglaNumber(tenure?.progressPercent || 0) : tenure?.progressPercent || 0}%
              </div>
              <div className="text-[11px] text-blue-200">{isBn ? 'মেয়াদ অতিবাহিত' : 'Tenure Progress'}</div>
            </div>
          </div>
        </div>

        {/* Tenure Bar */}
        {tenure && (
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">{isBn ? 'মেয়াদকাল' : 'Term Duration'}</span>
              <span className="font-semibold text-white">
                {formatDate(activeTerm?.startDate || '', language)} — {formatDate(activeTerm?.endDate || '', language)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isBn ? 'অতিবাহিত সময়' : 'Time Elapsed'}</span>
              <span className="font-semibold text-blue-200">{tenure.elapsedText}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">{isBn ? 'অবশিষ্ট সময়' : 'Remaining Time'}</span>
              <span className={`font-semibold ${tenure.isNearEnd ? 'text-amber-300' : 'text-emerald-300'}`}>
                {tenure.remainingText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Leadership Organogram Preview Cards */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>{isBn ? 'মূল কার্যনির্বাহী নেতৃত্ব (Executive Bureau)' : 'Core Executive Leadership'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn ? 'সভাপতি, সাধারণ সম্পাদক ও কোষাধ্যক্ষ সহ শীর্ষ প্রশাসনিক দায়িত্বশীলগণ' : 'Key officers responsible for operational execution'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintOrganogram}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBn ? 'প্রিন্ট রস্টার' : 'Print Roster'}</span>
            </button>
          </div>
        </div>

        {/* Top Tier Key Officer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {leadershipMembers.slice(0, 6).map((mem) => {
            const posLabel = mem.positionCustomBn || POSITION_LABELS_BN[mem.position] || mem.position;
            const isTopChief = mem.position === 'PRESIDENT' || mem.position === 'SECRETARY' || mem.position === 'TREASURER';
            return (
              <div
                key={mem.id}
                onClick={() => onViewMemberProfile(mem)}
                className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${
                  isTopChief ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs overflow-hidden">
                    {mem.photoUrl ? (
                      <img src={mem.photoUrl} alt={mem.name} className="w-full h-full object-cover" />
                    ) : (
                      mem.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {posLabel}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="সক্রিয়" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1 truncate hover:text-blue-600">
                      {mem.name}
                    </h4>
                    {mem.occupation && (
                      <p className="text-[11px] text-slate-500 truncate">{mem.occupation}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{mem.phone}</span>
                  </span>
                  <span className="text-[11px] text-blue-600 font-bold flex items-center space-x-0.5">
                    <span>{isBn ? 'প্রোফাইল' : 'Profile'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Full Member Cards List */}
      <div id="printable-current-committee" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
              <Users2 className="w-5 h-5 text-emerald-600" />
              <span>{isBn ? 'কার্যনির্বাহী কমিটির পূর্ণাঙ্গ সদস্যবৃন্দ' : 'Full Executive Committee Members'}</span>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                {isBn ? toBanglaNumber(activeExecutiveMembers.length) : activeExecutiveMembers.length}
              </span>
            </h3>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? 'নাম, পদবী বা ফোন দিয়ে খুঁজুন...' : 'Search by name or position...'}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Portfolio Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          {PORTFOLIOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPortfolio(p.id)}
              className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                selectedPortfolio === p.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Member Table/Grid */}
        {activeExecutiveMembers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {isBn ? 'কোন সদস্য পাওয়া যায়নি' : 'No committee members found'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isBn ? 'অনুগ্রহ করে নতুন সদস্য যুক্ত করুন অথবা ফিল্টার রিসেট করুন।' : 'Add new committee members or reset filter.'}
            </p>
            <button
              onClick={onOpenAddMemberModal}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center space-x-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isBn ? 'সদস্য যুক্ত করুন' : 'Add Member'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeExecutiveMembers.map((mem, idx) => {
              const posLabel = mem.positionCustomBn || POSITION_LABELS_BN[mem.position] || mem.position;
              return (
                <div
                  key={mem.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200 overflow-hidden">
                      {mem.photoUrl ? (
                        <img src={mem.photoUrl} alt={mem.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-mono text-xs">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600">
                          {mem.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-blue-700 font-semibold truncate mt-0.5">
                        {posLabel}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{mem.phone}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onViewMemberProfile(mem)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title={isBn ? 'বিস্তারিত প্রোফাইল' : 'View Profile'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

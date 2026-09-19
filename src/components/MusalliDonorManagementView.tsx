import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Home,
  MapPin,
  HeartHandshake,
  Inbox,
  Coins,
  Briefcase,
  FileBarChart,
  Users2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Database,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Info,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import {
  Mosque,
  User,
  AreaMaster,
  FamilyMaster,
  PersonMaster,
  DonationPlan,
  CollectionWorker,
  Donation,
  FinancialAccount,
} from '../types';
import { Language } from '../lib/i18n';
import { api } from '../lib/api';
import {
  MusalliDonorSecondarySidebar,
  MusalliDonorSubSection,
} from './MusalliDonorSecondarySidebar';
import { toBanglaNumber } from './CommitteeView';
import { AreaManagementSection } from './musalli/AreaManagementSection';
import { FamilyManagementSection } from './musalli/FamilyManagementSection';
import { PersonManagementSection } from './musalli/PersonManagementSection';
import { DonationPlanManagementSection } from './musalli/DonationPlanManagementSection';
import { ActualDonationManagementSection } from './musalli/ActualDonationManagementSection';

export interface MusalliDonorManagementViewProps {
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  initialSection?: MusalliDonorSubSection;
  onNavigateTab?: (tab: string) => void;
}

export const MusalliDonorManagementView: React.FC<MusalliDonorManagementViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  initialSection = 'dashboard',
  onNavigateTab,
}) => {
  const [activeSection, setActiveSection] = useState<MusalliDonorSubSection>(initialSection);
  const [areas, setAreas] = useState<AreaMaster[]>([]);
  const [families, setFamilies] = useState<FamilyMaster[]>([]);
  const [persons, setPersons] = useState<PersonMaster[]>([]);
  const [plans, setPlans] = useState<DonationPlan[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [workers, setWorkers] = useState<CollectionWorker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [preselectedPersonId, setPreselectedPersonId] = useState<string | undefined>(undefined);
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | undefined>(undefined);
  const [triggerNewDonation, setTriggerNewDonation] = useState<boolean>(false);

  const isBn = language === 'bn';

  const loadData = async () => {
    try {
      setLoading(true);
      const [areasRes, familiesRes, personsRes, plansRes, donationsRes, accountsRes, workersRes] = await Promise.all([
        api.getAreas().catch(() => []),
        api.getFamilies().catch(() => []),
        api.getPersons().catch(() => []),
        api.getDonationPlans().catch(() => []),
        api.getDonations().catch(() => []),
        api.getAccounts().catch(() => []),
        api.getCollectionWorkers().catch(() => []),
      ]);
      setAreas(areasRes);
      setFamilies(familiesRes);
      setPersons(personsRes);
      setPlans(plansRes);
      setDonations(donationsRes);
      setAccounts(accountsRes);
      setWorkers(workersRes);
    } catch (err) {
      console.error('Failed to load Musalli & Donor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePerson = async (data: Partial<PersonMaster>) => {
    await api.createPerson(data);
    await loadData();
  };

  const handleUpdatePerson = async (id: string, data: Partial<PersonMaster>) => {
    await api.updatePerson(id, data);
    await loadData();
  };

  const handleTogglePersonStatus = async (id: string, newStatus: 'ACTIVE' | 'INACTIVE') => {
    await api.updatePersonStatus(id, newStatus);
    await loadData();
  };

  const handleDirectReceiveDonation = (personId?: string, planId?: string) => {
    setPreselectedPersonId(personId);
    setPreselectedPlanId(planId);
    setTriggerNewDonation(true);
    setActiveSection('donations');
  };

  useEffect(() => {
    loadData();
  }, []);

  const sectionTitles: Record<MusalliDonorSubSection, { title: string; subtitle: string; icon: any }> = {
    dashboard: {
      title: isBn ? 'ড্যাশবোর্ড ও সারসংক্ষেপ' : 'Dashboard & Overview',
      subtitle: isBn ? 'মুসল্লি, পরিবার ও মহল্লা ডেটাবেসের সার্বিক পরিস্থিতি' : 'Overall status of musalli, family & area directory',
      icon: LayoutDashboard,
    },
    persons: {
      title: isBn ? 'মুসল্লি / ব্যক্তি তালিকা' : 'Musalli / Persons Directory',
      subtitle: isBn ? 'কেন্দ্রীয় পরিচয় ব্যবস্থাপনা, মোবাইল ও পরিবারের সদস্য' : 'Central identity directory, phone & family members',
      icon: UserCheck,
    },
    families: {
      title: isBn ? 'পরিবার / বাড়ি ডেটাবেস' : 'Families & Households Database',
      subtitle: isBn ? 'খানার প্রধান, পরিবারের সদস্য ও হোল্ডিং নম্বর' : 'Household head, members count & holding numbers',
      icon: Home,
    },
    areas: {
      title: isBn ? 'এলাকা / মহল্লা মাস্টার' : 'Areas & Mahallas Master',
      subtitle: isBn ? 'মসজিদের আওতাভুক্ত এলাকা, রোড ও মহল্লা সীমানা' : 'Mosque territory, roads & mahalla jurisdiction',
      icon: MapPin,
    },
    plans: {
      title: isBn ? 'দান পরিকল্পনা' : 'Donation Plans',
      subtitle: isBn ? 'মাসিক ও বাৎসরিক নিয়মিত অনুদান প্রতিশ্রুতি' : 'Monthly and periodic regular donation pledges',
      icon: HeartHandshake,
    },
    collections: {
      title: isBn ? 'অনুদান সংগ্রহ ব্যবস্থাপনা' : 'Donation Collection Management',
      subtitle: isBn ? 'অপারেশনাল সংগ্রহ শিডিউল, স্ট্যাটাস ও ট্র্যাকিং (Phase B6-A Core)' : 'Operational collection scheduling & status tracking',
      icon: Inbox,
    },
    donations: {
      title: isBn ? 'প্রকৃত অনুদান গ্রহণ ও রসিদ রেজিস্টার' : 'Actual Donations & Receipt Register',
      subtitle: isBn ? 'সরাসরি অনুদান গ্রহণ, পরিকল্পনা সংযোগ ও ক্যাশ/ব্যাংক পোস্টিং' : 'Direct donation intake, plan linkage & cash/bank ledger posting',
      icon: Coins,
    },
    workers: {
      title: isBn ? 'সংগ্রহকারী ও ভলান্টিয়ার' : 'Collection Workers & Volunteers',
      subtitle: isBn ? 'মহল্লাভিত্তিক চাঁদা ও দান কালেকশন প্রতিনিধি' : 'Field agents & area collection representatives',
      icon: Briefcase,
    },
    reports: {
      title: isBn ? 'রিপোর্ট ও রেজিস্টার' : 'Reports & Registers',
      subtitle: isBn ? 'মুদ্রণযোগ্য মুসল্লি খতিয়ান, পরিবার রেজিস্টার ও চাঁদা তালিকা' : 'Printable musalli registers, family ledgers & pledge sheets',
      icon: FileBarChart,
    },
  };

  const currentMeta = sectionTitles[activeSection];
  const CurrentIcon = currentMeta.icon;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-siliguri tracking-tight">
                  {isBn ? '👥 মুসল্লি ও দাতা ডেটাবেস' : '👥 Musalli & Donor Database'}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-baloo font-bold">
                  v2.6 Foundation
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 font-tiro mt-1">
                {isBn
                  ? 'মহল্লাভিত্তিক মুসল্লি, পরিবার, নিয়মিত দান পরিকল্পনা ও কালেকশন নেটওয়ার্ক'
                  : 'Mahalla-based musalli, household directory, regular donation pledges & collection network'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer font-siliguri disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 font-tiro">
              {isBn ? 'মোট ব্যক্তি / মুসল্লি' : 'Total Persons'}
            </div>
            <div className="text-lg font-bold text-slate-900 font-baloo mt-0.5">
              {isBn ? toBanglaNumber(persons.length) : persons.length}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 font-tiro">
              {isBn ? 'নিবন্ধিত পরিবার' : 'Families'}
            </div>
            <div className="text-lg font-bold text-slate-900 font-baloo mt-0.5">
              {isBn ? toBanglaNumber(families.length) : families.length}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 font-tiro">
              {isBn ? 'এলাকা / মহল্লা' : 'Areas / Mahallas'}
            </div>
            <div className="text-lg font-bold text-slate-900 font-baloo mt-0.5">
              {isBn ? toBanglaNumber(areas.length) : areas.length}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 font-tiro">
              {isBn ? 'দান পরিকল্পনা' : 'Donation Plans'}
            </div>
            <div className="text-lg font-bold text-slate-900 font-baloo mt-0.5">
              {isBn ? toBanglaNumber(plans.length) : plans.length}
            </div>
          </div>

          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
            <div className="text-[11px] font-medium text-teal-800 font-tiro">
              {isBn ? 'সংগৃহীত অনুদান' : 'Actual Donations'}
            </div>
            <div className="text-lg font-bold text-teal-950 font-baloo mt-0.5">
              {isBn ? toBanglaNumber(donations.length) : donations.length}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 font-tiro">
              {isBn ? 'সংগ্রহকারী কর্মী' : 'Collection Workers'}
            </div>
            <div className="text-lg font-bold text-slate-900 font-baloo mt-0.5">
              {isBn ? toBanglaNumber(workers.length) : workers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout with Left Secondary Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left Secondary Sidebar */}
        <MusalliDonorSecondarySidebar
          activeSection={activeSection}
          onSelectSection={(sec) => setActiveSection(sec)}
          personsCount={persons.length}
          familiesCount={families.length}
          areasCount={areas.length}
          plansCount={plans.length}
          donationsCount={donations.length}
          workersCount={workers.length}
          language={language}
        />

        {/* Right Content View Shell */}
        <main className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CurrentIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-siliguri">
                    {currentMeta.title}
                  </h2>
                  <p className="text-xs text-slate-500 font-tiro">
                    {currentMeta.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isBn ? 'অনুসন্ধান করুন...' : 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-tiro text-slate-700 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Core Architecture Relational Flow Banner */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <div className="text-xs text-emerald-900 font-tiro leading-snug">
                  <span className="font-bold font-siliguri">{isBn ? 'আইডেন্টিটি ও ফিন্যান্সিয়াল ফ্লো: ' : 'Identity & Financial Flow: '}</span>
                  {isBn
                    ? 'এলাকা (Area) ➔ পরিবার (Family) ➔ ব্যক্তি/মুসল্লি (Person) ➔ দান পরিকল্পনা (Plan) ➔ অনুদান রসিদ (Donation) ➔ আর্থিক খতিয়ান'
                    : 'Area ➔ Family ➔ Person ➔ Donation Plan ➔ Actual Donation ➔ Financial Ledger'}
                </div>
              </div>

              <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-md border border-emerald-200/60 shrink-0 font-baloo">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                <span>{isBn ? 'আর্থিক হিসাব অক্ষত ও সমন্বিত' : 'Ledger Integrated'}</span>
              </div>
            </div>

            {/* Section Specific Content Shell */}
            {activeSection === 'areas' ? (
              <AreaManagementSection
                areas={areas}
                families={families}
                persons={persons}
                collectionWorkers={workers}
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onRefresh={loadData}
                loading={loading}
              />
            ) : activeSection === 'families' ? (
              <FamilyManagementSection
                families={families}
                areas={areas}
                persons={persons}
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onRefresh={loadData}
                loading={loading}
              />
            ) : activeSection === 'persons' ? (
              <PersonManagementSection
                persons={persons}
                families={families}
                areas={areas}
                plans={plans}
                donations={donations}
                currentUser={currentUser}
                onSavePerson={handleSavePerson}
                onUpdatePerson={handleUpdatePerson}
                onTogglePersonStatus={handleTogglePersonStatus}
                onReceiveDonation={handleDirectReceiveDonation}
                onRefresh={loadData}
                language={language}
              />
            ) : activeSection === 'plans' ? (
              <DonationPlanManagementSection
                plans={plans}
                persons={persons}
                families={families}
                areas={areas}
                collectionWorkers={workers}
                donations={donations}
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onRefresh={loadData}
                onReceiveDonation={handleDirectReceiveDonation}
                loading={loading}
              />
            ) : activeSection === 'donations' ? (
              <ActualDonationManagementSection
                donations={donations}
                plans={plans}
                persons={persons}
                families={families}
                areas={areas}
                accounts={accounts}
                currentMosque={currentMosque}
                currentUser={currentUser}
                language={language}
                onRefresh={loadData}
                loading={loading}
                initialOpenCreateModal={triggerNewDonation}
                initialPersonId={preselectedPersonId}
                initialPlanId={preselectedPlanId}
              />
            ) : activeSection === 'dashboard' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div
                    onClick={() => setActiveSection('areas')}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/40 hover:border-emerald-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-emerald-700 font-bold text-xs mb-2 font-siliguri">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{isBn ? 'মহল্লা ও এলাকা নেটওয়ার্ক' : 'Area Network'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs text-slate-600 font-tiro leading-relaxed">
                      {isBn
                        ? 'মসজিদের আশপাশের বিভিন্ন পাড়া ও লেনভিত্তিক সীমানা চিহ্নিত করে পরিবার তালিকাভুক্তির প্রাথমিক স্তর।'
                        : 'First organizational layer mapping mosque neighborhood streets and territory.'}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 font-baloo">
                      <span>{isBn ? `বর্তমান এলাকা: ${toBanglaNumber(areas.length)} টি` : `Total Areas: ${areas.length}`}</span>
                      <span className="text-emerald-700 font-siliguri font-bold text-xs group-hover:underline">
                        {isBn ? 'ব্যবস্থাপনা করুন ➔' : 'Manage ➔'}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveSection('families')}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-blue-700 font-bold text-xs mb-2 font-siliguri">
                      <div className="flex items-center space-x-2">
                        <Home className="w-4 h-4" />
                        <span>{isBn ? 'পারিবারিক খানা ও খতিয়ান' : 'Family Units'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs text-slate-600 font-tiro leading-relaxed">
                      {isBn
                        ? 'প্রতিটি পরিবারের খানা প্রধান এবং পরিবারের সদস্যদের একক ছাতার নিচে সুসংগঠিত রাখার কাঠামো।'
                        : 'Organizes households with dedicated family code, head of family and member linkage.'}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 font-baloo">
                      <span>{isBn ? `বর্তমান পরিবার: ${toBanglaNumber(families.length)} টি` : `Total Families: ${families.length}`}</span>
                      <span className="text-blue-700 font-siliguri font-bold text-xs group-hover:underline">
                        {isBn ? 'ব্যবস্থাপনা করুন ➔' : 'Manage ➔'}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveSection('persons')}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-teal-50/40 hover:border-teal-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-teal-700 font-bold text-xs mb-2 font-siliguri">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4" />
                        <span>{isBn ? 'ব্যক্তি / মুসল্লি ডিরেক্টরি' : 'Musalli Master'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-700 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs text-slate-600 font-tiro leading-relaxed">
                      {isBn
                        ? 'স্থায়ী মুসল্লি ও দাতাদের কেন্দ্রীয় প্রোফাইল, পরিবার প্রধান ভূমিকা ও যোগাযোগ খতিয়ান।'
                        : 'Central musalli profiles, contact registry, family role and head assignment.'}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 font-baloo">
                      <span>{isBn ? `নিবন্ধিত মুসল্লি: ${toBanglaNumber(persons.length)} জন` : `Total Musallis: ${persons.length}`}</span>
                      <span className="text-teal-700 font-siliguri font-bold text-xs group-hover:underline">
                        {isBn ? 'ব্যবস্থাপনা করুন ➔' : 'Manage ➔'}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveSection('plans')}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-rose-50/40 hover:border-rose-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-rose-700 font-bold text-xs mb-2 font-siliguri">
                      <div className="flex items-center space-x-2">
                        <HeartHandshake className="w-4 h-4" />
                        <span>{isBn ? 'দান পরিকল্পনা (Pledges)' : 'Donation Plans'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-700 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs text-slate-600 font-tiro leading-relaxed">
                      {isBn
                        ? 'স্থায়ী দাতাদের মাসিক ও বাৎসরিক প্রতিশ্রুতি। এটি আর্থিক খতিয়ানে কোনো দেনা/পাওনা তৈরি করে না।'
                        : 'Structured pledges with frequency and collection assignments without balance pollution.'}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 font-baloo">
                      <span>{isBn ? `পরিকল্পনা: ${toBanglaNumber(plans.length)} টি` : `Total Plans: ${plans.length}`}</span>
                      <span className="text-rose-700 font-siliguri font-bold text-xs group-hover:underline">
                        {isBn ? 'ব্যবস্থাপনা করুন ➔' : 'Manage ➔'}
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveSection('donations')}
                    className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 hover:bg-teal-100/50 hover:border-teal-300 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-teal-800 font-bold text-xs mb-2 font-siliguri">
                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-teal-700" />
                        <span>{isBn ? 'অনুদান গ্রহণ ও রসিদ (B5)' : 'Actual Donations (B5)'}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-500 group-hover:text-teal-800 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-xs text-teal-900/80 font-tiro leading-relaxed">
                      {isBn
                        ? 'বাস্তব অর্থ গ্রহণ, রসিদ প্রদান ও স্বয়ংক্রিয় ক্যাশ/ব্যাংক ফিন্যান্সিয়াল পোস্টিং।'
                        : 'Direct financial intake, instant dynamic receipt and cash/bank balance update.'}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-teal-700 font-baloo">
                      <span>{isBn ? `মোট রসিদ: ${toBanglaNumber(donations.length)} টি` : `Total Receipts: ${donations.length}`}</span>
                      <span className="text-teal-900 font-siliguri font-bold text-xs group-hover:underline">
                        {isBn ? 'অনুদান গ্রহণ করুন ➔' : 'Receive ➔'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Foundation Phase Notice Card */}
                <div className="p-6 border border-dashed border-emerald-300 rounded-xl bg-emerald-50/30 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 font-siliguri">
                    {isBn ? '📊 মুসল্লি ও দাতা ডেটাবেস — Phase B1 থেকে B5 সফলভাবে কার্যকর' : '📊 Musalli & Donor Database — Phase B1 to B5 Fully Active'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto font-tiro leading-relaxed">
                    {isBn
                      ? 'এলাকা ➔ পরিবার ➔ ব্যক্তি/মুসল্লি ➔ দান পরিকল্পনা ➔ প্রকৃত অনুদান গ্রহণ ➔ বিদ্যমান আর্থিক খতিয়ান — এই সম্পূর্ণ রিলেশনাল চেইন সম্পূর্ণ সুরক্ষিত ও নিখুঁতভাবে সমন্বিত।'
                      : 'Area ➔ Family ➔ Person ➔ Donation Plan ➔ Actual Donation ➔ Financial Ledger chain is fully validated and operational.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold bg-emerald-100/70 px-3 py-1 rounded-full font-siliguri">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'B1 এলাকা' : 'B1 Area'}</span>
                    </div>
                    <div className="inline-flex items-center space-x-1.5 text-xs text-blue-700 font-semibold bg-blue-100/70 px-3 py-1 rounded-full font-siliguri">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'B2 পরিবার' : 'B2 Family'}</span>
                    </div>
                    <div className="inline-flex items-center space-x-1.5 text-xs text-teal-700 font-semibold bg-teal-100/70 px-3 py-1 rounded-full font-siliguri">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'B3 ব্যক্তি' : 'B3 Person'}</span>
                    </div>
                    <div className="inline-flex items-center space-x-1.5 text-xs text-rose-700 font-semibold bg-rose-100/70 px-3 py-1 rounded-full font-siliguri">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'B4 পরিকল্পনা' : 'B4 Plan'}</span>
                    </div>
                    <div className="inline-flex items-center space-x-1.5 text-xs text-teal-800 font-semibold bg-teal-200/70 px-3 py-1 rounded-full font-siliguri">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'B5 প্রকৃত অনুদান' : 'B5 Actual Donation'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Other Subsections Shell */
              <div className="space-y-6">
                <div className="p-8 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                    <CurrentIcon className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-baloo">
                      {isBn ? 'নির্বাচিত উপ-মডিউল' : 'Selected Sub-Module'}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-siliguri">
                      {currentMeta.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto font-tiro leading-relaxed">
                    {isBn
                      ? 'এই উপ-মডিউলের ডেটা মডেল, এপিআই রুট এবং ডাটাবেস লেয়ার প্রস্তুত রয়েছে। পরবর্তী Master Management Phase-এ এর বিস্তারিত ইন্টারফেস উন্মুক্ত করা হবে।'
                      : 'The data model and API routes for this sub-module are ready. Interactive management will be linked in the next phase.'}
                  </p>
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 font-baloo">
                      {isBn ? `রেকর্ড সংখ্যা: ${toBanglaNumber(
                        activeSection === 'persons' ? persons.length :
                        activeSection === 'families' ? families.length :
                        activeSection === 'areas' ? areas.length :
                        activeSection === 'plans' ? plans.length :
                        activeSection === 'workers' ? workers.length : 0
                      )} টি` : `Total Records: ${
                        activeSection === 'persons' ? persons.length :
                        activeSection === 'families' ? families.length :
                        activeSection === 'areas' ? areas.length :
                        activeSection === 'plans' ? plans.length :
                        activeSection === 'workers' ? workers.length : 0
                      }`}
                    </span>
                  </div>
                </div>

                {/* Identity Safety Note */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start space-x-3">
                  <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-slate-600 font-tiro space-y-1">
                    <div className="font-bold text-slate-800 font-siliguri">
                      {isBn ? 'নিরাপত্তা ও ইন্টিগ্রিটি নিশ্চয়তা' : 'Security & Integrity Notice'}
                    </div>
                    <div>
                      {isBn
                        ? 'মুসল্লি ও দাতা ডেটাবেস বিদ্যমান ফিন্যান্সিয়াল ইঞ্জিন এবং আয়-ব্যয়ের লেজার থেকে সম্পূর্ণ সুরক্ষিত ও স্বাধীন। বিদ্যমান কোনো হিসাব, ভাউচার বা মসজিদে কোনো প্রভাব পড়বে না।'
                        : 'The musalli directory runs independently from existing accounting vouchers and ledger books. Existing financial transactions remain untouched.'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  User,
  Plus,
  Search,
  Filter,
  MapPin,
  Home,
  Phone,
  Power,
  Edit,
  Eye,
  Crown,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Briefcase,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { PersonMaster, FamilyMaster, AreaMaster, DonationPlan, Donation, User as AuthUser } from '../../types';
import { Language, formatDate, toBanglaNumber } from '../../lib/i18n';
import { PersonFormModal } from './PersonFormModal';
import { PersonDetailModal } from './PersonDetailModal';
import { PersonStatusConfirmModal } from './PersonStatusConfirmModal';

interface PersonManagementSectionProps {
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  plans?: DonationPlan[];
  donations?: Donation[];
  currentUser: AuthUser | null;
  onSavePerson: (data: Partial<PersonMaster>) => Promise<void>;
  onUpdatePerson: (id: string, data: Partial<PersonMaster>) => Promise<void>;
  onTogglePersonStatus: (id: string, newStatus: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  onReceiveDonation?: (personId: string, planId?: string) => void;
  onRefresh: () => void;
  language?: Language;
}

export const PersonManagementSection: React.FC<PersonManagementSectionProps> = ({
  persons,
  families,
  areas,
  plans = [],
  donations = [],
  currentUser,
  onSavePerson,
  onUpdatePerson,
  onTogglePersonStatus,
  onReceiveDonation,
  onRefresh,
  language = 'bn',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'HEAD' | 'MEMBER'>('ALL');
  const [selectedProfession, setSelectedProfession] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonMaster | null>(null);

  const [detailPerson, setDetailPerson] = useState<PersonMaster | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [statusTargetPerson, setStatusTargetPerson] = useState<PersonMaster | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const isBn = language === 'bn';
  const canCreate = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN' || currentUser?.permissions?.includes('CREATE_MUSALLI');
  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN' || currentUser?.permissions?.includes('EDIT_MUSALLI');

  // Lookup maps for fast access
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const familyMap = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);

  // Unique professions list for filter
  const professionsList = useMemo(() => {
    const set = new Set<string>();
    persons.forEach((p) => {
      const prof = p.profession || p.occupation;
      if (prof && prof.trim()) set.add(prof.trim());
    });
    return Array.from(set).sort();
  }, [persons]);

  // Filtered persons
  const filteredPersons = useMemo(() => {
    return persons.filter((person) => {
      // Area filter
      if (selectedAreaId && person.areaId !== selectedAreaId) {
        return false;
      }
      // Family filter
      if (selectedFamilyId) {
        if (selectedFamilyId === 'UNASSIGNED') {
          if (person.familyId) return false;
        } else if (person.familyId !== selectedFamilyId) {
          return false;
        }
      }
      // Status filter
      if (selectedStatus !== 'ALL' && person.status !== selectedStatus) {
        return false;
      }
      // Role filter (Head vs Member)
      if (selectedRole === 'HEAD' && !person.isFamilyHead) return false;
      if (selectedRole === 'MEMBER' && person.isFamilyHead) return false;

      // Profession filter
      if (selectedProfession) {
        const prof = (person.profession || person.occupation || '').toLowerCase();
        if (!prof.includes(selectedProfession.toLowerCase())) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const fam = person.familyId ? familyMap.get(person.familyId) : null;
        const area = person.areaId ? areaMap.get(person.areaId) : null;

        const match =
          person.fullName.toLowerCase().includes(q) ||
          person.personCode.toLowerCase().includes(q) ||
          (person.mobile && person.mobile.includes(q)) ||
          (person.alternativeMobile && person.alternativeMobile.includes(q)) ||
          (person.fatherOrHusbandName && person.fatherOrHusbandName.toLowerCase().includes(q)) ||
          (person.profession && person.profession.toLowerCase().includes(q)) ||
          (person.occupation && person.occupation.toLowerCase().includes(q)) ||
          (person.address && person.address.toLowerCase().includes(q)) ||
          (person.houseRoadBlock && person.houseRoadBlock.toLowerCase().includes(q)) ||
          (fam && (fam.name.toLowerCase().includes(q) || (fam.familyCode && fam.familyCode.toLowerCase().includes(q)))) ||
          (area && (area.name.toLowerCase().includes(q) || (area.areaCode && area.areaCode.toLowerCase().includes(q))));

        if (!match) return false;
      }

      return true;
    });
  }, [persons, selectedAreaId, selectedFamilyId, selectedStatus, selectedRole, selectedProfession, searchTerm, familyMap, areaMap]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPersons.length / pageSize));
  const paginatedPersons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersons.slice(start, start + pageSize);
  }, [filteredPersons, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const total = persons.length;
    const active = persons.filter((p) => p.status === 'ACTIVE').length;
    const inactive = total - active;
    const heads = persons.filter((p) => p.isFamilyHead && p.status === 'ACTIVE').length;
    const unassigned = persons.filter((p) => !p.familyId && p.status === 'ACTIVE').length;
    return { total, active, inactive, heads, unassigned };
  }, [persons]);

  const handleOpenCreate = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (person: PersonMaster) => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (person: PersonMaster) => {
    setDetailPerson(person);
    setIsDetailOpen(true);
  };

  const handleOpenStatusModal = (person: PersonMaster) => {
    setStatusTargetPerson(person);
    setIsStatusModalOpen(true);
  };

  const handleFormSave = async (data: Partial<PersonMaster>) => {
    if (editingPerson) {
      await onUpdatePerson(editingPerson.id, data);
    } else {
      await onSavePerson(data);
    }
    setIsFormOpen(false);
    setEditingPerson(null);
  };

  const handleExportCSV = () => {
    const headers = [
      'Person Code',
      'Full Name',
      'Father/Husband Name',
      'Gender',
      'Area',
      'Family',
      'Relation',
      'Is Head',
      'Mobile',
      'Profession',
      'Status',
    ];

    const rows = filteredPersons.map((p) => {
      const fam = p.familyId ? familyMap.get(p.familyId)?.name || '' : '';
      const area = p.areaId ? areaMap.get(p.areaId)?.name || '' : '';
      return [
        `"${p.personCode}"`,
        `"${p.fullName.replace(/"/g, '""')}"`,
        `"${(p.fatherOrHusbandName || '').replace(/"/g, '""')}"`,
        `"${p.gender || 'MALE'}"`,
        `"${area.replace(/"/g, '""')}"`,
        `"${fam.replace(/"/g, '""')}"`,
        `"${(p.familyRelation || '').replace(/"/g, '""')}"`,
        `"${p.isFamilyHead ? 'YES' : 'NO'}"`,
        `"${p.mobile || ''}"`,
        `"${(p.profession || p.occupation || '').replace(/"/g, '""')}"`,
        `"${p.status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `musalli_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 font-siliguri block">
              {isBn ? 'মোট মুসল্লি / ব্যক্তি' : 'Total Persons'}
            </span>
            <span className="text-lg font-bold text-slate-900 font-baloo leading-tight block">
              {toBanglaNumber(stats.total)} {isBn ? 'জন' : ''}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 font-siliguri block">
              {isBn ? 'সক্রিয় মুসল্লি' : 'Active Musallis'}
            </span>
            <span className="text-lg font-bold text-emerald-700 font-baloo leading-tight block">
              {toBanglaNumber(stats.active)} {isBn ? 'জন' : ''}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 font-siliguri block">
              {isBn ? 'পরিবার প্রধান' : 'Family Heads'}
            </span>
            <span className="text-lg font-bold text-amber-800 font-baloo leading-tight block">
              {toBanglaNumber(stats.heads)} {isBn ? 'জন' : ''}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 font-siliguri block">
              {isBn ? 'পরিবার ছাড়া (একক)' : 'Unassigned'}
            </span>
            <span className="text-lg font-bold text-blue-700 font-baloo leading-tight block">
              {toBanglaNumber(stats.unassigned)} {isBn ? 'জন' : ''}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 font-siliguri block">
              {isBn ? 'নিষ্ক্রিয় তালিকা' : 'Inactive'}
            </span>
            <span className="text-lg font-bold text-slate-700 font-baloo leading-tight block">
              {toBanglaNumber(stats.inactive)} {isBn ? 'জন' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-siliguri">
                {isBn ? 'ব্যক্তি / মুসল্লি তালিকা (Person Master)' : 'Musalli / Person Directory'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-tiro mt-1">
              {isBn
                ? 'মসজিদের স্থায়ী অধিবাসী, মুসল্লি ও দাতা সদস্যদের স্বতন্ত্র প্রোফাইল ব্যবস্থাপনা'
                : 'Central musalli human identity repository with relational area and family mapping'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center space-x-1.5 font-siliguri"
              title={isBn ? 'CSV হিসেবে এক্সপোর্ট' : 'Export CSV'}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'এক্সপোর্ট' : 'Export'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center space-x-1.5 font-siliguri"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="p-2 text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              title={isBn ? 'রিফ্রেশ' : 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 font-siliguri"
              >
                <Plus className="w-4 h-4" />
                <span>{isBn ? '+ নতুন মুসল্লি নিবন্ধন' : '+ Register Musalli'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={isBn ? 'নাম, কোড, মোবাইল, পিতা/স্বামী বা ঠিকানা...' : 'Search by name, code, phone, father...'}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-tiro bg-white"
              />
            </div>

            {/* Area Filter */}
            <div>
              <select
                value={selectedAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setSelectedFamilyId('');
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri bg-white"
              >
                <option value="">{isBn ? 'সকল এলাকা' : 'All Areas'}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Family Filter */}
            <div>
              <select
                value={selectedFamilyId}
                onChange={(e) => {
                  setSelectedFamilyId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri bg-white"
              >
                <option value="">{isBn ? 'সকল পরিবার' : 'All Families'}</option>
                <option value="UNASSIGNED">{isBn ? '🏠 পরিবার ছাড়া (একক)' : '🏠 Unassigned'}</option>
                {families
                  .filter((f) => !selectedAreaId || f.areaId === selectedAreaId)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri bg-white"
              >
                <option value="ALL">{isBn ? 'সকল ভূমিকা' : 'All Roles'}</option>
                <option value="HEAD">{isBn ? '👑 পরিবার প্রধান' : '👑 Family Heads'}</option>
                <option value="MEMBER">{isBn ? '👤 সাধারণ সদস্য' : '👤 Family Members'}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-siliguri bg-white"
              >
                <option value="ALL">{isBn ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
                <option value="ACTIVE">{isBn ? 'সক্রিয় (Active)' : 'Active'}</option>
                <option value="INACTIVE">{isBn ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Persons Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-siliguri">
                <th className="py-3 px-4 font-bold">{isBn ? 'ব্যক্তি / মুসল্লির নাম ও কোড' : 'Musalli / Code'}</th>
                <th className="py-3 px-4 font-bold">{isBn ? 'পিতা / স্বামী' : 'Father / Husband'}</th>
                <th className="py-3 px-4 font-bold">{isBn ? 'পরিবার ও এলাকা' : 'Family & Area'}</th>
                <th className="py-3 px-4 font-bold">{isBn ? 'যোগাযোগ ও পেশা' : 'Contact & Job'}</th>
                <th className="py-3 px-4 font-bold text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3 px-4 font-bold text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-tiro">
              {paginatedPersons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-tiro">
                    <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold">{isBn ? 'কোনো মুসল্লির তথ্য পাওয়া যায়নি' : 'No musallis found'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isBn ? 'অনুসন্ধান ফিল্টার পরিবর্তন করুন অথবা নতুন ব্যক্তি নিবন্ধন করুন।' : 'Adjust filters or add a new person.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedPersons.map((person) => {
                  const fam = person.familyId ? familyMap.get(person.familyId) : null;
                  const area = person.areaId ? areaMap.get(person.areaId) : null;

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full border border-emerald-500/30 bg-emerald-50 overflow-hidden flex items-center justify-center shrink-0">
                            {person.photoUrl ? (
                              <img
                                src={person.photoUrl}
                                alt={person.fullName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-emerald-700" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900 font-siliguri text-xs sm:text-sm">
                                {person.fullName}
                              </span>
                              {person.isFamilyHead && (
                                <span title={isBn ? 'পরিবার প্রধান' : 'Family Head'}>
                                  <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-baloo">
                              <span className="text-emerald-700 font-bold tracking-wide">{person.personCode}</span>
                              {person.bloodGroup && (
                                <span className="text-red-600 font-semibold">• {person.bloodGroup}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Father / Husband */}
                      <td className="py-3 px-4 text-slate-700">
                        {person.fatherOrHusbandName || (
                          <span className="text-slate-400 italic text-[11px]">
                            {isBn ? 'তথ্য নেই' : 'N/A'}
                          </span>
                        )}
                      </td>

                      {/* Family & Area */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {fam ? (
                            <div className="font-bold text-slate-800 font-siliguri flex items-center space-x-1">
                              <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{fam.name}</span>
                              {person.familyRelation && (
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({person.familyRelation})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-400 font-tiro text-[11px] italic">
                              {isBn ? '🏠 পরিবার ছাড়া' : 'Unassigned'}
                            </div>
                          )}

                          {area && (
                            <div className="text-[11px] text-slate-500 font-siliguri flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{area.name}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Contact & Job */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {person.mobile ? (
                            <div className="font-semibold text-emerald-700 font-baloo flex items-center space-x-1 tracking-wide">
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{person.mobile}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              {isBn ? 'ফোন নেই' : 'No phone'}
                            </span>
                          )}

                          {(person.profession || person.occupation) && (
                            <div className="text-[11px] text-slate-600 font-tiro flex items-center space-x-1">
                              <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{person.profession || person.occupation}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold font-siliguri ${
                            person.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              person.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                          {person.status === 'ACTIVE' ? (isBn ? 'সক্রিয়' : 'Active') : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(person)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={isBn ? 'বিস্তারিত দেখুন' : 'View Details'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(person)}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title={isBn ? 'তথ্য সম্পাদন' : 'Edit'}
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(person)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  person.status === 'ACTIVE'
                                    ? 'text-slate-500 hover:text-red-700 hover:bg-red-50'
                                    : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={
                                  person.status === 'ACTIVE'
                                    ? isBn
                                      ? 'নিষ্ক্রিয় করুন'
                                      : 'Deactivate'
                                    : isBn
                                    ? 'সক্রিয় করুন'
                                    : 'Activate'
                                }
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-siliguri">
            <span className="text-slate-600 font-tiro">
              {isBn ? 'মোট ' : 'Showing '}
              <strong className="text-slate-900 font-baloo">{toBanglaNumber(filteredPersons.length)}</strong>{' '}
              {isBn ? 'জন ব্যক্তির মধ্যে ' : 'items, page '}
              <strong className="text-slate-900 font-baloo">{toBanglaNumber(currentPage)}</strong> /{' '}
              <strong className="text-slate-900 font-baloo">{toBanglaNumber(totalPages)}</strong>
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1 rounded-lg border text-xs font-baloo font-bold transition-all ${
                        currentPage === p
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {toBanglaNumber(p)}
                    </button>
                  </React.Fragment>
                ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <PersonFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingPerson(null);
          }}
          onSave={handleFormSave}
          initialData={editingPerson}
          existingPersons={persons}
          families={families}
          areas={areas}
          currentUser={currentUser}
          language={language}
        />
      )}

      {/* Detail Modal */}
      {isDetailOpen && detailPerson && (
        <PersonDetailModal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setDetailPerson(null);
          }}
          person={detailPerson}
          family={detailPerson.familyId ? familyMap.get(detailPerson.familyId) : null}
          area={detailPerson.areaId ? areaMap.get(detailPerson.areaId) : null}
          plans={plans}
          donations={donations}
          currentUser={currentUser}
          onEdit={(p) => {
            setIsDetailOpen(false);
            handleOpenEdit(p);
          }}
          onToggleStatus={(p) => {
            setIsDetailOpen(false);
            handleOpenStatusModal(p);
          }}
          onReceiveDonation={onReceiveDonation}
          language={language}
        />
      )}

      {/* Status Confirm Modal */}
      {isStatusModalOpen && statusTargetPerson && (
        <PersonStatusConfirmModal
          isOpen={isStatusModalOpen}
          onClose={() => {
            setIsStatusModalOpen(false);
            setStatusTargetPerson(null);
          }}
          person={statusTargetPerson}
          onConfirm={onTogglePersonStatus}
          language={language}
        />
      )}
    </div>
  );
};

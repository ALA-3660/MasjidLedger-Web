import React, { useState, useMemo } from 'react';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Printer,
  Archive,
  ShieldCheck,
  Calendar,
  Phone,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Layers,
  Sparkles,
  X,
  TrendingUp,
  Clock,
  History,
  Activity,
  Award,
  ChevronRight,
  Sliders,
  Check,
  Building,
  Briefcase
} from 'lucide-react';
import {
  SubCommittee,
  SubCommitteeStatus,
  SubCommitteeMemberItem,
  CommitteeTerm,
  CommitteeMember,
  MeetingResolution,
  CommitteeMeeting,
  Mosque,
  User
} from '../types';
import { Language, translations, formatDate, toBanglaNumber } from '../lib/i18n';

interface SubCommitteesViewProps {
  subCommittees: SubCommittee[];
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings?: CommitteeMeeting[];
  resolutions?: MeetingResolution[];
  language: Language;
  mosque?: Mosque | null;
  currentUser?: User | null;
  onAddSubCommittee?: (data: any) => Promise<void>;
  onUpdateSubCommittee?: (id: string, data: any) => Promise<void>;
  onArchiveSubCommittee?: (id: string) => Promise<void>;
  onAdd?: (data: any) => Promise<void>;
  onUpdate?: (id: string, data: any) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
}

export const SUB_COMMITTEE_TEMPLATES = [
  {
    name: 'ব্যাংক ও আর্থিক কার্যক্রম তদারকি সাব-কমিটি',
    category: 'আর্থিক ও ব্যাংক',
    scopeOfWork: 'মসজিদের ব্যাংক অ্যাকাউন্ট পরিচালনা, এফডিআর, চেক স্বাক্ষর এবং দৈনিক নগদ লেনদেন তদারকি ও নিরীক্ষা করা।',
    duties: 'মাসিক ব্যাংক স্টেটমেন্ট যাচাই, আয়-ব্যয় সঠিক অ্যাকাউন্টে জমা হচ্ছে কি না তা নিশ্চিত করা এবং আর্থিক স্বচ্ছতা বজায় রাখা।'
  },
  {
    name: 'হিসাব ও অডিট নিরীক্ষা সাব-কমিটি',
    category: 'হিসাব ও অডিট',
    scopeOfWork: 'মসজিদের যাবতীয় হিসাব-নিকাশ, ভাউচার, ক্যাশ রেজিস্টার এবং বার্ষিক অডিট কার্যক্রম পরিচালনা করা।',
    duties: 'প্রতি মাসে হিসাব পরীক্ষা করা, অডিট আপত্তি নিষ্পত্তি করা এবং কার্যনির্বাহী পরিষদে অডিট প্রতিবেদন পেশ করা।'
  },
  {
    name: 'ওয়াকফ সম্পত্তি ও জমিজমা তদারকি সাব-কমিটি',
    category: 'ওয়াকফ ও সম্পত্তি',
    scopeOfWork: 'মসজিদের নামে অর্পিত ওয়াকফ সম্পত্তি, দোকান, মার্কেট ও জমির রেকর্ড, খাজনা এবং লিজ চুক্তি তদারকি করা।',
    duties: 'দখল ও সীমানা সুরক্ষা, নিয়মিত ভাড়াকলেকশন নিশ্চিত করা, নামজারি ও আইনি মামলা মনিটরিং করা।'
  },
  {
    name: 'কবরস্থান ব্যবস্থাপনা ও সংস্কার সাব-কমিটি',
    category: 'কবরস্থান',
    scopeOfWork: 'মসজিদ সংলগ্ন কবরস্থানের দাফন কার্যক্রম, রেজিস্টার সংরক্ষণ, পরিষ্কার-পরিচ্ছন্নতা ও নিরাপত্তা রক্ষা করা।',
    duties: 'দাফন ফি ও অনুদান আদায়, কবরস্থান সংরক্ষণ, আলোর ব্যবস্থা এবং জানাজার প্যান্ডেল তদারকি করা।'
  },
  {
    name: 'মসজিদ ভবন ও নির্মাণ তদারকি সাব-কমিটি',
    category: 'নির্মাণ ও উন্নয়ন',
    scopeOfWork: 'মসজিদের সম্প্রসারণ, সংস্কার, ছাদ ঢালাই ও সিভিল কনস্ট্রাকশন কাজের গুণগত মান তদারকি করা।',
    duties: 'ইঞ্জিনিয়ারের সাথে সমন্বয়, নির্মাণ সামগ্রীর মান যাচাই, এস্টিমেট প্রস্তুত ও প্রগতি রিপোর্ট পেশ করা।'
  },
  {
    name: 'রক্ষণাবেক্ষণ ও পরিচ্ছন্নতা সাব-কমিটি',
    category: 'রক্ষণাবেক্ষণ',
    scopeOfWork: 'মসজিদ ভবন, অজুখানা, বাথরুম, কার্পেট, এসি, ফ্যান ও সাউন্ড সিস্টেম নিয়মিত পরিষ্কার ও সচল রাখা।',
    duties: 'দৈনিক পরিচ্ছন্নতা কর্মীদের কাজের তদারকি, নষ্ট ইকুইপমেন্ট মেরামত ও স্পেয়ার পার্টস সংগ্রহ।'
  },
  {
    name: 'বিদ্যুৎ, জেনারেটর ও সোলার সাব-কমিটি',
    category: 'ইউটিলিটি ও বিদ্যুৎ',
    scopeOfWork: 'মসজিদের বিদ্যুৎ সরবরাহ, জেনারেটর ব্যাকআপ, সোলার সিস্টেম এবং লাইটিং ব্যবস্থাপনা করা।',
    duties: 'লোডশেডিংয়ে জেনারেটর চালনা নিশ্চিত করা, জ্বালানি তেল ক্রয় হিসাব এবং ইলেকট্রিক লাইন সেফটি চেক করা।'
  },
  {
    name: 'ক্রয় ও সরঞ্জাম সংগ্রহ সাব-কমিটি',
    category: 'ক্রয় ও সংগ্রহ',
    scopeOfWork: 'মসজিদের জন্য প্রয়োজনীয় আসবাবপত্র, ইলেকট্রনিক্স, ধর্মীয় সামগ্রী ও অন্যান্য জিনিসপত্র ন্যায্যমূল্যে ক্রয় করা।',
    duties: 'দরপত্র বা কোটেশন যাচাই, নমুনা পরীক্ষা, স্টক রেজিস্টার এন্ট্রি এবং মানসম্মত পণ্য ক্রয় নিশ্চিত করা।'
  },
  {
    name: 'দান বাক্স ও তহবিল সংগ্রহ সাব-কমিটি',
    category: 'তহবিল সংগ্রহ',
    scopeOfWork: 'জমা বাক্স, জাকাত, সদকা, নির্মাণ ফান্ড ও বিশেষ অনুদান সংগ্রহের ক্যাম্পেইন পরিচালনা করা।',
    duties: 'দান বাক্স খোলা ও গণনা দলে সক্রিয় থাকা, দাতাদের রসিদ প্রদান ও তহবিল বৃদ্ধির নতুন উৎস সন্ধান করা।'
  },
  {
    name: 'রমজান ও ঈদ ব্যবস্থাপনা সাব-কমিটি',
    category: 'উৎসব ও বিশেষ অনুষ্ঠান',
    scopeOfWork: 'রমজানে ইফতার মাহফিল, তারাবিহ, এতেকাফ, শবে কদর এবং দুই ঈদের জামাত সুষ্ঠুভাবে আয়োজন করা।',
    duties: 'ইফতারের মেনু ও ফান্ড সংগ্রহ, স্বেচ্ছাসেবক নিয়োগ, নিরাপত্তা ও অজুখানার বিশেষ ব্যবস্থা নিশ্চিত করা।'
  },
  {
    name: 'শিক্ষা ও মক্তব কার্যক্রম সাব-কমিটি',
    category: 'শিক্ষা ও মক্তব',
    scopeOfWork: 'মক্তব, কোরআন শিক্ষা ও হিফজখানার কার্যক্রম তদারকি করা এবং শিক্ষকবৃন্দের উপস্থিতি ও মান যাচাই করা।',
    duties: 'শিক্ষার্থীদের পরীক্ষা ও মূল্যায়ন, সিলেবাস বাস্তবায়ন এবং শিক্ষকদের বেতন-ভাতা সমন্বয় করা।'
  },
  {
    name: 'দাওয়াত ও ধর্মীয় কার্যক্রম সাব-কমিটি',
    category: 'দাওয়াত ও তাবলীগ',
    scopeOfWork: 'মাসিক ওয়াজ মাহফিল, তাফসিরুল কোরআন সভা, মিলাদ ও বিশেষ ইসলামিক দিবস উদযাপন করা।',
    duties: 'বক্তা নির্ধারণ, দাওয়াতপত্র বিতরণ, প্যান্ডেল ও মাইক সেটআপ এবং শৃঙ্খলা রক্ষা করা।'
  },
  {
    name: 'সমাজকল্যাণ ও ত্রাণ বিতরণ সাব-কমিটি',
    category: 'সমাজকল্যাণ',
    scopeOfWork: 'গরীব, দুস্থ, অসুস্থ ও এতিমদের মাঝে যাকাত, ফিতরা ও জরুরি ত্রাণ বিতরণ করা।',
    duties: 'প্রকৃত অভাবী ব্যক্তিদের তালিকা প্রস্তুত, অনুদান বিতরণে স্বচ্ছতা বজায় রাখা এবং সমাজসেবামূলক কাজ।'
  },
  {
    name: 'আইসিটি ও ডিজিটাল ব্যবস্থাপনা সাব-কমিটি',
    category: 'আইসিটি ও মিডিয়া',
    scopeOfWork: 'MasjidLedger সফটওয়্যার, ওয়েবসাইট, সোশ্যাল মিডিয়া, অনলাইন ডোনেশন ও সিসিটিভি সিস্টেম রক্ষণাবেক্ষণ করা।',
    duties: 'ডিজিটাল রেকর্ড আপডেট রাখা, ওয়াজ ও নোটিশ অনলাইনে প্রচার এবং টেকনিক্যাল সাপোর্ট প্রদান।'
  },
  {
    name: 'নিরাপত্তা ও শৃঙ্খলা তদারকি সাব-কমিটি',
    category: 'নিরাপত্তা',
    scopeOfWork: 'মসজিদ প্রাঙ্গণ, দান বাক্স ও ওয়াকফ সম্পত্তির সার্বিক নিরাপত্তা এবং সিসিটিভি ক্যামেরা মনিটরিং করা।',
    duties: 'নিরাপত্তা প্রহরীদের ডিউটি রোস্টার চেক, ক্যামেরা ফুটেজ ব্যাকআপ ও সন্দেহভাজন গতিবিধি নজরদারি করা।'
  },
  {
    name: 'বিশেষ উন্নয়ন প্রকল্প বাস্তবায়ন সাব-কমিটি',
    category: 'বিশেষ প্রকল্প',
    scopeOfWork: 'মসজিদ পরিচালনা কমিটির গৃহীত কোনো বিশেষ মেগা প্রজেক্ট বা দীর্ঘমেয়াদী পরিকল্পনা বাস্তবায়ন করা।',
    duties: 'প্রকল্পের ব্লু-প্রিন্ট তৈরি, বাজেট প্রণয়ন, বাস্তবায়ন প্রগতি মনিটরিং এবং চূড়ান্ত প্রতিবেদন দাখিল।'
  }
];

export const SubCommitteesView: React.FC<SubCommitteesViewProps> = ({
  subCommittees = [],
  terms = [],
  members = [],
  meetings = [],
  resolutions = [],
  language,
  mosque,
  currentUser,
  onAddSubCommittee,
  onUpdateSubCommittee,
  onArchiveSubCommittee,
  onAdd,
  onUpdate,
  onArchive
}) => {
  const t = translations[language];

  // Helper bindings for backwards compatibility
  const handleAdd = onAddSubCommittee || onAdd || (async () => {});
  const handleUpdate = onUpdateSubCommittee || onUpdate || (async () => {});
  const handleArchive = onArchiveSubCommittee || onArchive || (async () => {});

  // Filters and state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubCommitteeStatus>('ALL');
  const [termFilter, setTermFilter] = useState('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | ''>('');
  const [editingSubCommittee, setEditingSubCommittee] = useState<SubCommittee | null>(null);
  const [viewingSubCommittee, setViewingSubCommittee] = useState<SubCommittee | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'members' | 'logs' | 'history'>('overview');

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [termId, setTermId] = useState(terms.find(t => t.status === 'ACTIVE')?.id || terms[0]?.id || '');
  const [formationDate, setFormationDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SubCommitteeStatus>('ACTIVE');
  const [convenerId, setConvenerId] = useState('');
  const [convenerName, setConvenerName] = useState('');
  const [convenerPhone, setConvenerPhone] = useState('');
  const [secretaryId, setSecretaryId] = useState('');
  const [secretaryName, setSecretaryName] = useState('');
  const [secretaryPhone, setSecretaryPhone] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberRoleMap, setMemberRoleMap] = useState<Record<string, { role: 'CONVENER' | 'SECRETARY' | 'MEMBER'; responsibility: string }>>({});
  const [minMembers, setMinMembers] = useState<string>('');
  const [maxMembers, setMaxMembers] = useState<string>('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [duties, setDuties] = useState('');
  const [notes, setNotes] = useState('');
  const [resolutionId, setResolutionId] = useState('');
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [targetDeliverables, setTargetDeliverables] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Print Mode State
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [printReportType, setPrintReportType] = useState<'REGISTER' | 'ACTIVE_ONLY' | 'OFFICE_ORDER'>('REGISTER');
  const [singlePrintSubCommittee, setSinglePrintSubCommittee] = useState<SubCommittee | null>(null);
  const [showLetterhead, setShowLetterhead] = useState(true);

  // Categories list
  const allCategories = useMemo(() => {
    const defaultCats = SUB_COMMITTEE_TEMPLATES.map(t => t.category);
    const customCats = subCommittees.map(sc => sc.category).filter(Boolean);
    return Array.from(new Set([...defaultCats, ...customCats]));
  }, [subCommittees]);

  // Filtered List
  const filteredList = useMemo(() => {
    return subCommittees.filter(sc => {
      if (sc.isArchived) return false;
      if (statusFilter !== 'ALL' && sc.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && sc.category !== categoryFilter) return false;
      if (termFilter !== 'ALL' && sc.termId !== termFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const code = (sc.subCommitteeCode || '').toLowerCase();
        const scName = (sc.name || '').toLowerCase();
        const conv = (sc.convenerName || '').toLowerCase();
        const sec = (sc.secretaryName || '').toLowerCase();
        const memberNames = (sc.members || []).map(m => m.name.toLowerCase()).join(' ');
        return (
          scName.includes(q) ||
          code.includes(q) ||
          conv.includes(q) ||
          sec.includes(q) ||
          memberNames.includes(q)
        );
      }
      return true;
    });
  }, [subCommittees, statusFilter, categoryFilter, termFilter, searchQuery]);

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    const nonArchived = subCommittees.filter(sc => !sc.isArchived);
    const activeCount = nonArchived.filter(sc => sc.status === 'ACTIVE').length;
    const expiredCount = nonArchived.filter(sc => {
      if (sc.status === 'EXPIRED') return true;
      if (sc.status === 'ACTIVE' && sc.endDate && new Date(sc.endDate) < new Date()) return true;
      return false;
    }).length;

    // Distinct assigned members across all active subcommittees
    const assignedMemberSet = new Set<string>();
    nonArchived.forEach(sc => {
      (sc.memberIds || []).forEach(mId => assignedMemberSet.add(mId));
      if (sc.convenerId) assignedMemberSet.add(sc.convenerId);
      if (sc.secretaryId) assignedMemberSet.add(sc.secretaryId);
    });

    const avgProgress = nonArchived.length > 0
      ? Math.round(nonArchived.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / nonArchived.length)
      : 0;

    return {
      total: nonArchived.length,
      active: activeCount,
      expired: expiredCount,
      totalAssignedMembers: assignedMemberSet.size,
      avgProgress
    };
  }, [subCommittees]);

  // Handle template prefill
  const handleTemplateSelect = (idx: number | '') => {
    setSelectedTemplateIndex(idx);
    if (idx === '') {
      setName('');
      setCategory('');
      setScopeOfWork('');
      setDuties('');
    } else {
      const tmpl = SUB_COMMITTEE_TEMPLATES[idx];
      setName(tmpl.name);
      setCategory(tmpl.category);
      setScopeOfWork(tmpl.scopeOfWork);
      setDuties(tmpl.duties);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSubCommittee(null);
    setSelectedTemplateIndex('');
    setName('');
    setCategory('');
    setTermId(terms.find(t => t.status === 'ACTIVE')?.id || terms[0]?.id || '');
    setFormationDate(new Date().toISOString().split('T')[0]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setStatus('ACTIVE');
    setConvenerId('');
    setConvenerName('');
    setConvenerPhone('');
    setSecretaryId('');
    setSecretaryName('');
    setSecretaryPhone('');
    setSelectedMemberIds([]);
    setMemberRoleMap({});
    setMinMembers('');
    setMaxMembers('');
    setScopeOfWork('');
    setDuties('');
    setNotes('');
    setResolutionId('');
    setProgressPercentage(0);
    setTargetDeliverables('');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sc: SubCommittee) => {
    setEditingSubCommittee(sc);
    setSelectedTemplateIndex('');
    setName(sc.name);
    setCategory(sc.category);
    setTermId(sc.termId);
    setFormationDate(sc.formationDate || sc.startDate || '');
    setStartDate(sc.startDate);
    setEndDate(sc.endDate || '');
    setStatus(sc.status || 'ACTIVE');
    setConvenerId(sc.convenerId || '');
    setConvenerName(sc.convenerName || '');
    setConvenerPhone(sc.convenerPhone || '');
    setSecretaryId(sc.secretaryId || '');
    setSecretaryName(sc.secretaryName || '');
    setSecretaryPhone(sc.secretaryPhone || '');
    setSelectedMemberIds(sc.memberIds || []);

    const roleMap: Record<string, { role: 'CONVENER' | 'SECRETARY' | 'MEMBER'; responsibility: string }> = {};
    (sc.members || []).forEach(m => {
      roleMap[m.id] = {
        role: m.role || 'MEMBER',
        responsibility: m.responsibility || ''
      };
    });
    setMemberRoleMap(roleMap);

    setMinMembers(sc.minMembers ? String(sc.minMembers) : '');
    setMaxMembers(sc.maxMembers ? String(sc.maxMembers) : '');
    setScopeOfWork(sc.scopeOfWork || '');
    setDuties(sc.duties || '');
    setNotes(sc.notes || '');
    setResolutionId(sc.resolutionId || '');
    setProgressPercentage(sc.progressPercentage || 0);
    setTargetDeliverables(sc.targetDeliverables || '');
    setFormError('');
  };

  // Handle Convener selection from existing members
  const handleSelectConvenerFromMembers = (mId: string) => {
    setConvenerId(mId);
    if (!mId) return;
    const mem = members.find(m => m.id === mId);
    if (mem) {
      setConvenerName(mem.name);
      setConvenerPhone(mem.phone || '');
      // Ensure member is also in selectedMemberIds
      if (!selectedMemberIds.includes(mId)) {
        setSelectedMemberIds(prev => [...prev, mId]);
      }
      setMemberRoleMap(prev => ({
        ...prev,
        [mId]: { role: 'CONVENER', responsibility: prev[mId]?.responsibility || 'আহ্বায়ক ও সার্বিক সমন্বয়' }
      }));
    }
  };

  // Handle Secretary selection from existing members
  const handleSelectSecretaryFromMembers = (mId: string) => {
    setSecretaryId(mId);
    if (!mId) return;
    const mem = members.find(m => m.id === mId);
    if (mem) {
      setSecretaryName(mem.name);
      setSecretaryPhone(mem.phone || '');
      // Ensure member is also in selectedMemberIds
      if (!selectedMemberIds.includes(mId)) {
        setSelectedMemberIds(prev => [...prev, mId]);
      }
      setMemberRoleMap(prev => ({
        ...prev,
        [mId]: { role: 'SECRETARY', responsibility: prev[mId]?.responsibility || 'সচিব ও নথিপত্র প্রস্তুত' }
      }));
    }
  };

  // Handle Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !termId || !startDate || !convenerName.trim()) {
      setFormError('অনুগ্রহ করে সাব-কমিটির নাম, ক্যাটাগরি, কমিটি মেয়াদ, শুরুর তারিখ এবং আহ্বায়ক এর নাম পূরণ করুন।');
      return;
    }
    if (minMembers && selectedMemberIds.length < Number(minMembers)) {
      setFormError(`ন্যূনতম সদস্য সংখ্যা ${minMembers} জন হতে হবে (বর্তমানে নির্বাচিত: ${selectedMemberIds.length} জন)।`);
      return;
    }
    if (maxMembers && selectedMemberIds.length > Number(maxMembers)) {
      setFormError(`সর্বোচ্চ সদস্য সংখ্যা ${maxMembers} জন হতে পারে (বর্তমানে নির্বাচিত: ${selectedMemberIds.length} জন)।`);
      return;
    }

    // Match resolution details if selected
    let selectedResNumber = '';
    let selectedResSubject = '';
    if (resolutionId) {
      const resItem = resolutions.find(r => r.id === resolutionId);
      if (resItem) {
        selectedResNumber = resItem.resolutionNumber;
        selectedResSubject = resItem.title;
      }
    }

    // Build member details array
    const membersDetail: SubCommitteeMemberItem[] = selectedMemberIds.map(mId => {
      const mObj = members.find(m => m.id === mId);
      const customData = memberRoleMap[mId] || { role: 'MEMBER', responsibility: '' };
      return {
        id: mId,
        name: mObj?.name || 'সদস্য',
        designation: mObj?.positionCustomBn || mObj?.position || 'সদস্য',
        phone: mObj?.phone || '',
        role: customData.role,
        responsibility: customData.responsibility,
        joinedDate: startDate
      };
    });

    const payload = {
      name: name.trim(),
      category: category.trim(),
      termId,
      formationDate,
      startDate,
      endDate: endDate || undefined,
      status,
      convenerId: convenerId || undefined,
      convenerName: convenerName.trim(),
      convenerPhone: convenerPhone || undefined,
      secretaryId: secretaryId || undefined,
      secretaryName: secretaryName.trim() || undefined,
      secretaryPhone: secretaryPhone || undefined,
      memberIds: selectedMemberIds,
      members: membersDetail,
      minMembers: minMembers ? Number(minMembers) : undefined,
      maxMembers: maxMembers ? Number(maxMembers) : undefined,
      scopeOfWork,
      duties,
      notes,
      resolutionId: resolutionId || undefined,
      resolutionNumber: selectedResNumber || undefined,
      resolutionSubject: selectedResSubject || undefined,
      progressPercentage: Number(progressPercentage) || 0,
      targetDeliverables
    };

    setIsSubmitting(true);
    setFormError('');
    try {
      if (editingSubCommittee) {
        await handleUpdate(editingSubCommittee.id, payload);
        setEditingSubCommittee(null);
      } else {
        await handleAdd(payload);
        setIsCreateModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'সংরক্ষণ সম্পন্ন করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async (sc: SubCommittee) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে "${sc.name}" সাব-কমিটিটি সংরক্ষণ / আর্কাইভ করতে চান?`)) {
      try {
        await handleArchive(sc.id);
        if (viewingSubCommittee?.id === sc.id) {
          setViewingSubCommittee(null);
        }
      } catch (err: any) {
        alert(err.message || 'আর্কাইভ করতে ব্যর্থ হয়েছে।');
      }
    }
  };

  // Helper for Status Badge styling
  const getStatusBadge = (st: SubCommitteeStatus, scEndDate?: string) => {
    const isOverdue = st === 'ACTIVE' && scEndDate && new Date(scEndDate) < new Date();
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" />
          মেয়াদোত্তীর্ণ (Overdue)
        </span>
      );
    }

    switch (st) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            সক্রিয় (Active)
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle className="w-3 h-3" />
            স্থগিত (Suspended)
          </span>
        );
      case 'DISSOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3" />
            বিলুপ্ত / সমাপ্ত
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            মেয়াদোত্তীর্ণ
          </span>
        );
      case 'INACTIVE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            নিষ্ক্রিয়
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                সাব-কমিটি ব্যবস্থাপনা (Sub-Committee Management)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                সক্রিয় কমিটি মেয়াদের অধীনে নির্দিষ্ট কাজের পরিধি, রেজোলিউশন ও সদস্য দায়িত্বভিত্তিক সাব-কমিটি গঠন ও অগ্রগতি মনিটরিং
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-print-subcommittees-center"
            type="button"
            onClick={() => {
              setSinglePrintSubCommittee(null);
              setPrintReportType('REGISTER');
              setIsPrintPreview(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>প্রিন্ট ও রিপোর্ট সেন্টার</span>
          </button>
          <button
            id="btn-create-subcommittee-modal"
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সাব-কমিটি গঠন</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">মোট সাব-কমিটি</div>
            <div className="text-xl font-bold text-slate-900 font-mono">{toBanglaNumber(stats.total)} টি</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">সক্রিয় কার্যক্রম</div>
            <div className="text-xl font-bold text-emerald-700 font-mono">{toBanglaNumber(stats.active)} টি</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">নিযুক্ত সদস্য সংখ্যা</div>
            <div className="text-xl font-bold text-indigo-700 font-mono">{toBanglaNumber(stats.totalAssignedMembers)} জন</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">গড় অগ্রগতি সূচক</div>
            <div className="text-xl font-bold text-purple-700 font-mono">{toBanglaNumber(stats.avgProgress)}%</div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="input-search-subcommittees"
            type="text"
            placeholder="সাব-কমিটি, কোড, আহ্বায়ক বা সদস্য..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            id="select-filter-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">সকল ক্যাটাগরি ({allCategories.length})</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            id="select-filter-term"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">সকল কমিটি মেয়াদ</option>
            {terms.map(tm => (
              <option key={tm.id} value={tm.id}>
                {tm.title} {tm.status === 'ACTIVE' ? '(সক্রিয়)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            id="select-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">সকল স্ট্যাটাস</option>
            <option value="ACTIVE">সক্রিয় (Active)</option>
            <option value="SUSPENDED">স্থগিত (Suspended)</option>
            <option value="DISSOLVED">বিলুপ্ত / সমাপ্ত (Dissolved)</option>
            <option value="EXPIRED">মেয়াদোত্তীর্ণ (Expired)</option>
            <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
          </select>
        </div>
      </div>

      {/* 4. Sub-Committees Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs">
            <Users2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">কোনো সাব-কমিটি পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 mt-1">
              ফিল্টার পরিবর্তন করুন অথবা 'নতুন সাব-কমিটি গঠন' বাটনে ক্লিক করে নতুন সাব-কমিটি তৈরি করুন।
            </p>
          </div>
        ) : (
          filteredList.map((sc) => {
            const isOverdue = sc.status === 'ACTIVE' && sc.endDate && new Date(sc.endDate) < new Date();
            return (
              <div
                key={sc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-100">
                      {sc.category}
                    </span>
                    {getStatusBadge(sc.status, sc.endDate)}
                  </div>

                  {/* Title & Code */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                    {sc.name}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1 mb-3">
                    <span className="font-semibold text-slate-700">{sc.subCommitteeCode}</span>
                    <span>{sc.termTitle || 'সাধারণ মেয়াদ'}</span>
                  </div>

                  {/* Convener, Secretary & Member summary */}
                  <div className="space-y-1.5 mb-3.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <strong className="text-slate-800 font-semibold">আহ্বায়ক:</strong> {sc.convenerName}
                        {sc.convenerPhone ? ` (${sc.convenerPhone})` : ''}
                      </div>
                    </div>

                    {sc.secretaryName && (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <div className="truncate">
                          <strong className="text-slate-800 font-semibold">সচিব:</strong> {sc.secretaryName}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>সদস্য: <strong>{toBanglaNumber(sc.memberIds?.length || 0)}</strong> জন</span>
                      </span>
                      {sc.resolutionNumber && (
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 font-mono">
                          রেজোলিউশন #{sc.resolutionNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-600">বাস্তবায়ন অগ্রগতি:</span>
                      <span className="font-bold text-slate-800 font-mono">{toBanglaNumber(sc.progressPercentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, sc.progressPercentage || 0))}%` }}
                      />
                    </div>
                  </div>

                  {/* Scope of Work snippet */}
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    <strong className="text-slate-700">কাজের পরিধি:</strong> {sc.scopeOfWork || 'নির্ধারিত নেই'}
                  </p>
                </div>

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="text-[11px] text-slate-400">
                    শুরু: {formatDate(sc.startDate, language)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingSubCommittee(sc);
                        setDetailTab('overview');
                      }}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="বিস্তারিত ও সদস্য তালিকা দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSinglePrintSubCommittee(sc);
                        setPrintReportType('OFFICE_ORDER');
                        setIsPrintPreview(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                      title="অফিস আদেশ / প্রজ্ঞাপন প্রিন্ট করুন"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sc)}
                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="তথ্য সংশোধন করুন"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveConfirm(sc)}
                      className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="আর্কাইভ করুন"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. CREATE / EDIT SUB-COMMITTEE MODAL */}
      {(isCreateModalOpen || editingSubCommittee) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingSubCommittee ? 'সাব-কমিটি তথ্য ও সদস্য পুনর্বিন্যাস' : 'নতুন সাব-কমিটি গঠন'}
                  </h3>
                  {editingSubCommittee && (
                    <p className="text-[11px] text-slate-500 font-mono">কোড: {editingSubCommittee.subCommitteeCode}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingSubCommittee(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Preset Template Selector */}
              {!editingSubCommittee && (
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                  <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>প্রস্তুতকৃত সাব-কমিটি টেমপ্লেট নির্বাচন করুন (ঐচ্ছিক)</span>
                  </label>
                  <select
                    value={selectedTemplateIndex}
                    onChange={(e) => handleTemplateSelect(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- নিজে তৈরি করুন / কাস্টম সাব-কমিটি --</option>
                    {SUB_COMMITTEE_TEMPLATES.map((tmpl, i) => (
                      <option key={i} value={i}>{tmpl.name} ({tmpl.category})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সাব-কমিটির নাম *</label>
                  <input
                    id="input-sc-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: ব্যাংক ও আর্থিক তদারকি সাব-কমিটি"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাটাগরি / ধরন *</label>
                  <input
                    id="input-sc-category"
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="যেমন: আর্থিক ও ব্যাংক"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Term & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কমিটি কার্যকাল / মেয়াদ *</label>
                  <select
                    id="select-sc-term"
                    value={termId}
                    onChange={(e) => setTermId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">মেয়াদ নির্বাচন করুন</option>
                    {terms.map(tm => (
                      <option key={tm.id} value={tm.id}>
                        {tm.title} {tm.status === 'ACTIVE' ? '(সক্রিয়)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">গঠনের তারিখ *</label>
                  <input
                    id="input-sc-formationDate"
                    type="date"
                    required
                    value={formationDate}
                    onChange={(e) => setFormationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কার্যকর শুরুর তারিখ *</label>
                  <input
                    id="input-sc-startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সমাপ্তির তারিখ (ঐচ্ছিক)</label>
                  <input
                    id="input-sc-endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সাব-কমিটি স্ট্যাটাস</label>
                  <select
                    id="select-sc-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SubCommitteeStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="ACTIVE">🟢 সক্রিয় (Active)</option>
                    <option value="SUSPENDED">🟠 স্থগিত (Suspended)</option>
                    <option value="DISSOLVED">🔴 বিলুপ্ত / সমাপ্ত (Dissolved)</option>
                    <option value="EXPIRED">⚪ মেয়াদোত্তীর্ণ (Expired)</option>
                    <option value="INACTIVE">⚫ নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* Resolution Linkage */}
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                <label className="block text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>মিটিং রেজোলিউশন বা কার্যবিবরণী লিঙ্ক (ঐচ্ছিক)</span>
                </label>
                <select
                  id="select-sc-resolution"
                  value={resolutionId}
                  onChange={(e) => setResolutionId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">-- কোনো রেজোলিউশন লিঙ্ক নেই --</option>
                  {resolutions.map(res => (
                    <option key={res.id} value={res.id}>
                      রেজোলিউশন #{res.resolutionNumber}: {res.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Key Officers (Convener & Secretary) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800">আহ্বায়ক ও সমন্বয়কারী কর্মকর্তা</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">কমিটি সদস্য থেকে আহ্বায়ক নির্বাচন</label>
                    <select
                      value={convenerId}
                      onChange={(e) => handleSelectConvenerFromMembers(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs mb-1"
                    >
                      <option value="">-- সদস্য তালিকা থেকে বাছুন --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.positionCustomBn || m.position})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      value={convenerName}
                      onChange={(e) => setConvenerName(e.target.value)}
                      placeholder="আহ্বায়কের নাম *"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">আহ্বায়কের ফোন নম্বর</label>
                    <input
                      type="text"
                      value={convenerPhone}
                      onChange={(e) => setConvenerPhone(e.target.value)}
                      placeholder="০১৭xxxxxxxx"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs mt-6 sm:mt-7"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">কমিটি সদস্য থেকে সচিব / সমন্বয়কারী নির্বাচন</label>
                    <select
                      value={secretaryId}
                      onChange={(e) => handleSelectSecretaryFromMembers(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs mb-1"
                    >
                      <option value="">-- সদস্য তালিকা থেকে বাছুন (ঐচ্ছিক) --</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.positionCustomBn || m.position})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={secretaryName}
                      onChange={(e) => setSecretaryName(e.target.value)}
                      placeholder="সচিবের নাম (ঐচ্ছিক)"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">সচিবের ফোন নম্বর</label>
                    <input
                      type="text"
                      value={secretaryPhone}
                      onChange={(e) => setSecretaryPhone(e.target.value)}
                      placeholder="০১৮xxxxxxxx"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs mt-6 sm:mt-7"
                    />
                  </div>
                </div>
              </div>

              {/* Members Selection & Role/Responsibility Customization */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    কমিটি সদস্যবৃন্দ নির্বাচন ও দায়িত্ব বণ্টন ({selectedMemberIds.length} জন নির্বাচিত)
                  </label>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>ন্যূনতম:</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="৩"
                      value={minMembers}
                      onChange={(e) => setMinMembers(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-center"
                    />
                    <span>সর্বোচ্চ:</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="১০"
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-center"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">কোনো সাধারণ কমিটি সদস্য পাওয়া যায়নি।</p>
                  ) : (
                    members.map(m => {
                      const isChecked = selectedMemberIds.includes(m.id);
                      const currentRoleData = memberRoleMap[m.id] || { role: 'MEMBER', responsibility: '' };

                      return (
                        <div
                          key={m.id}
                          className={`p-2 rounded-lg border text-xs transition-all ${
                            isChecked
                              ? 'bg-white border-emerald-300 shadow-xs'
                              : 'bg-slate-50/70 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMemberIds(prev => [...prev, m.id]);
                                    setMemberRoleMap(prev => ({
                                      ...prev,
                                      [m.id]: prev[m.id] || { role: 'MEMBER', responsibility: '' }
                                    }));
                                  } else {
                                    setSelectedMemberIds(prev => prev.filter(id => id !== m.id));
                                  }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="font-semibold text-slate-900">{m.name}</span>
                              <span className="text-[11px] text-slate-400">({m.positionCustomBn || m.position})</span>
                            </label>

                            {isChecked && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={currentRoleData.role}
                                  onChange={(e) => {
                                    const val = e.target.value as any;
                                    setMemberRoleMap(prev => ({
                                      ...prev,
                                      [m.id]: { ...prev[m.id], role: val }
                                    }));
                                    if (val === 'CONVENER') {
                                      setConvenerId(m.id);
                                      setConvenerName(m.name);
                                      setConvenerPhone(m.phone || '');
                                    } else if (val === 'SECRETARY') {
                                      setSecretaryId(m.id);
                                      setSecretaryName(m.name);
                                      setSecretaryPhone(m.phone || '');
                                    }
                                  }}
                                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700"
                                >
                                  <option value="CONVENER">আহ্বায়ক</option>
                                  <option value="SECRETARY">সচিব</option>
                                  <option value="MEMBER">সদস্য</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {isChecked && (
                            <div className="mt-1.5 pl-6">
                              <input
                                type="text"
                                placeholder="নির্দিষ্ট দায়িত্ব (যেমন: ব্যাংক স্টেটমেন্ট যাচাই ও ক্যাশ বুক অডিট)..."
                                value={currentRoleData.responsibility}
                                onChange={(e) => {
                                  const resp = e.target.value;
                                  setMemberRoleMap(prev => ({
                                    ...prev,
                                    [m.id]: { ...prev[m.id], responsibility: resp }
                                  }));
                                }}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:bg-white focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Progress & Target Deliverables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বাস্তবায়ন অগ্রগতি ({progressPercentage}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressPercentage}
                    onChange={(e) => setProgressPercentage(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">লক্ষ্যমাত্রা ও মাইলস্টোন (Deliverables)</label>
                  <input
                    type="text"
                    value={targetDeliverables}
                    onChange={(e) => setTargetDeliverables(e.target.value)}
                    placeholder="যেমন: আগামী ৩ মাসের মধ্যে অডিট রিপোর্ট কার্যনির্বাহী সভায় দাখিল"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Scope & Duties */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কাজের পরিধি (Scope of Work)</label>
                <textarea
                  rows={2}
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  placeholder="সাব-কমিটির কাজের বিস্তারিত পরিধি..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">দায়িত্ব ও কর্তব্য (Duties & Responsibilities)</label>
                <textarea
                  rows={2}
                  value={duties}
                  onChange={(e) => setDuties(e.target.value)}
                  placeholder="সুনির্দিষ্ট দায়িত্ব ও কর্তব্য..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিশেষ নির্দেশনা / নোট</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="বিশেষ কোনো নির্দেশনা বা কার্যপ্রণালী..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingSubCommittee(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  id="btn-save-subcommittee-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. VIEW DETAIL DRAWER / MODAL */}
      {viewingSubCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-100">
                    {viewingSubCommittee.category}
                  </span>
                  {getStatusBadge(viewingSubCommittee.status, viewingSubCommittee.endDate)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{viewingSubCommittee.name}</h3>
                <div className="text-xs text-slate-500 font-mono">
                  কোড: {viewingSubCommittee.subCommitteeCode} | মেয়াদ: {viewingSubCommittee.termTitle || 'সাধারণ মেয়াদ'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingSubCommittee(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 mt-3 pb-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDetailTab('overview')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  detailTab === 'overview'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                সারসংক্ষেপ ও পরিধি
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('members')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  detailTab === 'members'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                সদস্য ও দায়িত্ব ({viewingSubCommittee.members?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('logs')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  detailTab === 'logs'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                অডিট ও অ্যাক্টিভিটি লগ ({viewingSubCommittee.activityLogs?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  detailTab === 'history'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                সদস্য ইতিহাস ({viewingSubCommittee.memberHistory?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1 text-xs space-y-4">
              {detailTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">গঠনের তারিখ</span>
                      <strong className="text-slate-800">{formatDate(viewingSubCommittee.formationDate, language)}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">কার্যকর শুরু</span>
                      <strong className="text-slate-800">{formatDate(viewingSubCommittee.startDate, language)}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">সমাপ্তির তারিখ</span>
                      <strong className="text-slate-800">{viewingSubCommittee.endDate ? formatDate(viewingSubCommittee.endDate, language) : 'চলমান'}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">বাস্তবায়ন প্রগতি</span>
                      <strong className="text-emerald-700 font-mono">{toBanglaNumber(viewingSubCommittee.progressPercentage || 0)}%</strong>
                    </div>
                  </div>

                  {/* Convener and Secretary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>আহ্বায়ক / সভাপতি</span>
                      </div>
                      <div className="font-semibold text-slate-900">{viewingSubCommittee.convenerName}</div>
                      {viewingSubCommittee.convenerPhone && (
                        <div className="text-slate-500 font-mono text-[11px]">ফোন: {viewingSubCommittee.convenerPhone}</div>
                      )}
                    </div>

                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>সচিব / সমন্বয়কারী</span>
                      </div>
                      <div className="font-semibold text-slate-900">{viewingSubCommittee.secretaryName || 'নির্ধারিত নেই'}</div>
                      {viewingSubCommittee.secretaryPhone && (
                        <div className="text-slate-500 font-mono text-[11px]">ফোন: {viewingSubCommittee.secretaryPhone}</div>
                      )}
                    </div>
                  </div>

                  {viewingSubCommittee.resolutionNumber && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                      <div className="font-bold text-purple-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>অনুমোদিত মিটিং রেজোলিউশন</span>
                      </div>
                      <div className="text-slate-800">
                        রেজোলিউশন নং: <strong>{viewingSubCommittee.resolutionNumber}</strong> — {viewingSubCommittee.resolutionSubject}
                      </div>
                    </div>
                  )}

                  {viewingSubCommittee.targetDeliverables && (
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="font-bold text-indigo-900 mb-1">মাইলস্টোন ও ডেলিভারেবলস:</div>
                      <p className="text-slate-700 leading-relaxed">{viewingSubCommittee.targetDeliverables}</p>
                    </div>
                  )}

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-1">কাজের পরিধি (Scope of Work):</h4>
                    <p className="text-slate-600 leading-relaxed">{viewingSubCommittee.scopeOfWork || 'বিবরণ দেওয়া হয়নি।'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-1">দায়িত্ব ও কর্তব্য (Duties & Responsibilities):</h4>
                    <p className="text-slate-600 leading-relaxed">{viewingSubCommittee.duties || 'বিবরণ দেওয়া হয়নি।'}</p>
                  </div>

                  {viewingSubCommittee.notes && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-900">
                      <strong className="block mb-0.5">বিশেষ নির্দেশনা / নোট:</strong>
                      <p className="text-slate-700">{viewingSubCommittee.notes}</p>
                    </div>
                  )}
                </>
              )}

              {detailTab === 'members' && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 mb-2">
                    সাব-কমিটির মোট সদস্য: {toBanglaNumber(viewingSubCommittee.members?.length || 0)} জন
                  </div>
                  {viewingSubCommittee.members && viewingSubCommittee.members.length > 0 ? (
                    viewingSubCommittee.members.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{idx + 1}. {m.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                              {m.role === 'CONVENER' ? 'আহ্বায়ক' : m.role === 'SECRETARY' ? 'সচিব' : 'সদস্য'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            মূল পদবী: {m.designation} {m.phone ? `| ফোন: ${m.phone}` : ''}
                          </div>
                          {m.responsibility && (
                            <div className="text-emerald-800 text-[11px] mt-1 font-medium">
                              <strong>নির্দিষ্ট দায়িত্ব:</strong> {m.responsibility}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">কোনো সদস্য তথ্য পাওয়া যায়নি।</p>
                  )}
                </div>
              )}

              {detailTab === 'logs' && (
                <div className="space-y-2">
                  {viewingSubCommittee.activityLogs && viewingSubCommittee.activityLogs.length > 0 ? (
                    viewingSubCommittee.activityLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{log.action}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-600">{log.details}</div>
                        <div className="text-[10px] text-slate-400">সম্পাদনা করেছেন: {log.changedByName}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">কোনো অ্যাক্টিভিটি লগ নেই।</p>
                  )}
                </div>
              )}

              {detailTab === 'history' && (
                <div className="space-y-2">
                  {viewingSubCommittee.memberHistory && viewingSubCommittee.memberHistory.length > 0 ? (
                    viewingSubCommittee.memberHistory.map((h) => (
                      <div key={h.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{h.memberName}</div>
                          <div className="text-[11px] text-slate-500">
                            দায়িত্ব: {h.role === 'CONVENER' ? 'আহ্বায়ক' : h.role === 'SECRETARY' ? 'সচিব' : 'সদস্য'} |
                            যোগদান: {formatDate(h.joinedDate, language)}
                          </div>
                        </div>
                        {h.leftDate && (
                          <div className="text-right text-[10px] text-rose-600 font-medium">
                            অব্যাহতি: {formatDate(h.leftDate, language)}
                            {h.reason && <div className="text-slate-400">({h.reason})</div>}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">কোনো সদস্য পরিবর্তনের ইতিহাস নেই।</p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => {
                  setSinglePrintSubCommittee(viewingSubCommittee);
                  setPrintReportType('OFFICE_ORDER');
                  setIsPrintPreview(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>অফিস আদেশ প্রিন্ট</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingSubCommittee(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PROFESSIONAL PRINT & REPORT CENTER (Letterhead ON/OFF + Media Print) */}
      {isPrintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto report-modal-print-wrapper">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 my-8 print:m-0 print:p-0 print:shadow-none print:border-none report-modal-print-card">
            {/* Top Toolbar (Hidden on actual print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintReportType('REGISTER');
                      setSinglePrintSubCommittee(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      printReportType === 'REGISTER'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    পূর্ণাঙ্গ রেজিস্টার
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintReportType('ACTIVE_ONLY');
                      setSinglePrintSubCommittee(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      printReportType === 'ACTIVE_ONLY'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    সক্রিয় তালিকা
                  </button>
                  {singlePrintSubCommittee && (
                    <button
                      type="button"
                      onClick={() => setPrintReportType('OFFICE_ORDER')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        printReportType === 'OFFICE_ORDER'
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600'
                      }`}
                    >
                      অফিস আদেশ (প্রজ্ঞাপন)
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    id="checkbox-letterhead-toggle"
                    type="checkbox"
                    checked={showLetterhead}
                    onChange={(e) => setShowLetterhead(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>সফটওয়্যার লেটারহেড (Letterhead ON/OFF)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-trigger-browser-print"
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintPreview(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Content Document */}
            <div className="bg-white text-slate-900 space-y-6">
              {/* Optional Letterhead Header */}
              {showLetterhead && (
                <div className="text-center pb-5 border-b-2 border-emerald-700">
                  <div className="text-xs font-bold text-emerald-800 tracking-widest uppercase mb-1">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>
                  <h1 className="text-2xl font-bold text-emerald-900">
                    {mosque?.nameBn || mosque?.name || 'মসজিদ পরিচালনা পরিষদ'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {mosque?.address || 'ঠিকানা উপলব্ধ নেই'} | ওয়াকফ রেজিস্ট্রি / পরিচালনা কমিটি রেকর্ড
                  </p>
                </div>
              )}

              {/* 7.1 Single Sub-Committee Office Order Print */}
              {printReportType === 'OFFICE_ORDER' && singlePrintSubCommittee ? (
                <div className="space-y-5 text-xs text-slate-800">
                  <div className="text-center pb-3 border-b border-slate-300">
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                      সাব-কমিটি গঠন সংক্রান্ত অফিস আদেশ / প্রজ্ঞাপন
                    </h2>
                    <div className="text-[11px] text-slate-600 mt-1">
                      স্মারক / কোড নং: <strong>{singlePrintSubCommittee.subCommitteeCode}</strong> | তারিখ: {formatDate(singlePrintSubCommittee.formationDate, language)}
                    </div>
                  </div>

                  <p className="leading-relaxed text-justify">
                    এতদ্বারা অত্র <strong>{mosque?.nameBn || mosque?.name || 'মসজিদ'}</strong>-এর সম্মানিত পরিচালনা পরিষদের
                    সিদ্ধান্ত মোতাবেক এবং সুষ্ঠু ও স্বচ্ছভাবে কার্যক্রম পরিচালনার লক্ষ্যে
                    নিম্নলিখিত সম্মানিত সদস্যদের সমন্বয়ে <strong>"{singlePrintSubCommittee.name}"</strong> (ক্যাটাগরি: {singlePrintSubCommittee.category})
                    গঠন করা হলো:
                  </p>

                  {/* Member Table */}
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 p-2 text-center w-12">ক্রঃ নং</th>
                        <th className="border border-slate-300 p-2 text-left">সদস্যের নাম ও পদবী</th>
                        <th className="border border-slate-300 p-2 text-center w-28">সাব-কমিটিতে পদবী</th>
                        <th className="border border-slate-300 p-2 text-left">অর্পিত দায়িত্ব ও ভূমিকা</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Convener */}
                      <tr className="bg-emerald-50/40">
                        <td className="border border-slate-300 p-2 text-center font-bold">১</td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-900">
                          {singlePrintSubCommittee.convenerName}
                          {singlePrintSubCommittee.convenerPhone && (
                            <span className="text-[10px] text-slate-500 block font-normal font-mono">
                              ফোন: {singlePrintSubCommittee.convenerPhone}
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-emerald-800">
                          আহ্বায়ক / সভাপতি
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-700">
                          সাব-কমিটির সার্বিক পরিচালনা ও মূল কমিটির সাথে সমন্বয়
                        </td>
                      </tr>

                      {/* Secretary */}
                      {singlePrintSubCommittee.secretaryName && (
                        <tr className="bg-blue-50/40">
                          <td className="border border-slate-300 p-2 text-center font-bold">২</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">
                            {singlePrintSubCommittee.secretaryName}
                            {singlePrintSubCommittee.secretaryPhone && (
                              <span className="text-[10px] text-slate-500 block font-normal font-mono">
                                ফোন: {singlePrintSubCommittee.secretaryPhone}
                              </span>
                            )}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-blue-800">
                            সচিব / সমন্বয়কারী
                          </td>
                          <td className="border border-slate-300 p-2 text-slate-700">
                            নথিপত্র সংরক্ষণ, সভা আহ্বান ও কার্যবিবরণী প্রণয়ন
                          </td>
                        </tr>
                      )}

                      {/* Other Members */}
                      {(singlePrintSubCommittee.members || [])
                        .filter(m => m.name !== singlePrintSubCommittee.convenerName && m.name !== singlePrintSubCommittee.secretaryName)
                        .map((m, idx) => (
                          <tr key={m.id || idx}>
                            <td className="border border-slate-300 p-2 text-center font-semibold">
                              {idx + (singlePrintSubCommittee.secretaryName ? 3 : 2)}
                            </td>
                            <td className="border border-slate-300 p-2">
                              <span className="font-semibold text-slate-900">{m.name}</span>
                              <span className="text-[10px] text-slate-500 block">({m.designation})</span>
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-medium">
                              সদস্য
                            </td>
                            <td className="border border-slate-300 p-2 text-slate-700">
                              {m.responsibility || 'সাব-কমিটির অর্পিত কার্যক্রমে সক্রিয় অংশগ্রহণ'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {/* Terms of Reference */}
                  <div className="space-y-2 pt-2">
                    <div className="font-bold text-slate-900 text-xs">কার্যাবলী ও কর্মপরিধি (Terms of Reference):</div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div><strong>কাজের পরিধি:</strong> {singlePrintSubCommittee.scopeOfWork || 'নির্ধারিত নেই'}</div>
                      <div><strong>দায়িত্ব ও কর্তব্য:</strong> {singlePrintSubCommittee.duties || 'নির্ধারিত নেই'}</div>
                      {singlePrintSubCommittee.notes && (
                        <div><strong>বিশেষ নির্দেশনা:</strong> {singlePrintSubCommittee.notes}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* 7.2 Master Register / Active List Table */
                <div className="space-y-4">
                  <div className="text-center pb-2 border-b border-slate-300">
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                      {printReportType === 'ACTIVE_ONLY'
                        ? 'সক্রিয় সাব-কমিটি মাস্টার তালিকা'
                        : 'সাব-কমিটি সার্বিক রেজিস্টার ও সদস্য বিবরণী'}
                    </h2>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      মুদ্রণের তারিখ: {new Date().toLocaleDateString()} | মোট সাব-কমিটি: {toBanglaNumber(filteredList.length)} টি
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 p-2 text-center w-10">ক্রঃ</th>
                        <th className="border border-slate-300 p-2 text-left">সাব-কমিটির নাম ও কোড</th>
                        <th className="border border-slate-300 p-2 text-center">ক্যাটাগরি</th>
                        <th className="border border-slate-300 p-2 text-left">আহ্বায়ক ও সচিব</th>
                        <th className="border border-slate-300 p-2 text-center">সদস্য সংখ্যা</th>
                        <th className="border border-slate-300 p-2 text-center">অগ্রগতি</th>
                        <th className="border border-slate-300 p-2 text-center">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((sc, idx) => (
                        <tr key={sc.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{sc.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">কোড: {sc.subCommitteeCode}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-center">{sc.category}</td>
                          <td className="border border-slate-300 p-2">
                            <div><strong>আহ্বায়ক:</strong> {sc.convenerName}</div>
                            {sc.secretaryName && <div><strong>সচিব:</strong> {sc.secretaryName}</div>}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-bold">
                            {toBanglaNumber(sc.memberIds?.length || 0)} জন
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-mono font-bold">
                            {toBanglaNumber(sc.progressPercentage || 0)}%
                          </td>
                          <td className="border border-slate-300 p-2 text-center">
                            {sc.status === 'ACTIVE' ? 'সক্রিয়' : sc.status === 'SUSPENDED' ? 'স্থগিত' : 'সমাপ্ত'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Official Signatures Block */}
              <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs font-semibold mt-10">
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1.5 text-slate-900">সভাপতি</div>
                  <div className="text-[11px] text-slate-500">{mosque?.nameBn || 'মসজিদ পরিচালনা পরিষদ'}</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1.5 text-slate-900">সাধারণ সম্পাদক / মোতাওয়াল্লি</div>
                  <div className="text-[11px] text-slate-500">{mosque?.nameBn || 'মসজিদ পরিচালনা পরিষদ'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

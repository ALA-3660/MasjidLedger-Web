import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Gift,
  Search,
  FileBarChart,
  Printer,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  QrCode,
  Tag,
  FolderOpen,
  MapPin,
  Bookmark,
  Shield,
  Phone,
  UserCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  BookTitle,
  BookCopy,
  LibraryCategory,
  LibraryMember,
  BookIssue,
  BookAcquisition,
  LibraryRoom,
  LibraryRack,
  LibraryShelf,
  LibraryDashboardStats,
  PersonMaster,
  FinancialAccount,
} from '../types';
import { toBanglaNumber } from './CommitteeView';

export type LibrarySubSection =
  | 'dashboard'
  | 'books'
  | 'categories'
  | 'members'
  | 'issue'
  | 'returns'
  | 'lostDamaged'
  | 'acquisitions'
  | 'search'
  | 'reports'
  | 'print';

interface LibraryManagementViewProps {
  currentMosque?: any;
  currentUser?: any;
  accounts?: FinancialAccount[];
  language?: string;
  initialSection?: LibrarySubSection;
  onNavigateTab?: (tab: string) => void;
}

export const LibraryManagementView: React.FC<LibraryManagementViewProps> = ({
  currentMosque,
  currentUser,
  accounts = [],
  language = 'bn',
  initialSection = 'dashboard',
}) => {
  const [activeSection, setActiveSection] = useState<LibrarySubSection>(initialSection);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data
  const [stats, setStats] = useState<LibraryDashboardStats | null>(null);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [bookTitles, setBookTitles] = useState<BookTitle[]>([]);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [acquisitions, setAcquisitions] = useState<BookAcquisition[]>([]);
  const [persons, setPersons] = useState<PersonMaster[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [isAddTitleOpen, setIsAddTitleOpen] = useState(false);
  const [isAddCopyOpen, setIsAddCopyOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<BookTitle | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<BookCopy | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<BookIssue | null>(null);

  // Form states
  const [titleForm, setTitleForm] = useState({
    title: '',
    author: '',
    publisher: '',
    publicationYear: new Date().getFullYear(),
    language: 'BENGALI',
    isbn: '',
    categoryId: '',
    edition: '',
    totalVolume: 1,
    volumeNo: 1,
    callNumber: '',
  });

  const [copyForm, setCopyForm] = useState({
    bookTitleId: '',
    shelfLocationLabel: '',
    condition: 'NEW' as const,
    source: 'PURCHASED' as const,
    price: 0,
    remarks: '',
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [memberForm, setMemberForm] = useState({
    personId: '',
    cardNo: '',
    membershipType: 'GENERAL' as const,
    maxAllowedBooks: 2,
    issueDurationDays: 14,
  });

  const [issueForm, setIssueForm] = useState({
    bookCopyId: '',
    memberId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    remarks: '',
  });

  const [returnForm, setReturnForm] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    condition: 'GOOD' as const,
    notes: '',
  });

  const [acquisitionForm, setAcquisitionForm] = useState({
    bookTitleId: '',
    sourceType: 'PURCHASE' as 'PURCHASE' | 'DONATION',
    donorPersonId: '',
    donorName: '',
    quantity: 1,
    unitPrice: 0,
    totalAmount: 0,
    financialAccountId: accounts[0]?.id || '',
    voucherNumber: '',
    remarks: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, catRes, titlesRes, copiesRes, membersRes, issuesRes, acqRes, personsRes] =
        await Promise.all([
          api.getLibraryDashboardStats().catch(() => null),
          api.getLibraryCategories().catch(() => []),
          api.getBookTitles().catch(() => []),
          api.getBookCopies().catch(() => []),
          api.getLibraryMembers().catch(() => []),
          api.getBookIssues().catch(() => []),
          api.getBookAcquisitions().catch(() => []),
          api.getPersons().catch(() => []),
        ]);

      setStats(statsRes);
      setCategories(catRes);
      setBookTitles(titlesRes);
      setBookCopies(copiesRes);
      setMembers(membersRes);
      setIssues(issuesRes);
      setAcquisitions(acqRes);
      setPersons(personsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    try {
      await api.createLibraryCategory(categoryForm);
      setFeedbackMessage({ type: 'success', text: 'নতুন বিষয় সফলভাবে তৈরি হয়েছে।' });
      setIsAddCategoryOpen(false);
      setCategoryForm({ name: '', code: '', description: '' });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'বিষয় তৈরিতে ব্যর্থ।' });
    }
  };

  const handleCreateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleForm.title.trim() || !titleForm.author.trim() || !titleForm.categoryId) {
      setFeedbackMessage({ type: 'error', text: 'বইয়ের নাম, লেখক ও বিষয় নির্বাচন আবশ্যক।' });
      return;
    }
    try {
      await api.createBookTitle(titleForm);
      setFeedbackMessage({ type: 'success', text: 'বইয়ের শিরোনাম ও ক্যাটালগ এন্ট্রি সফল হয়েছে।' });
      setIsAddTitleOpen(false);
      setTitleForm({
        title: '',
        author: '',
        publisher: '',
        publicationYear: new Date().getFullYear(),
        language: 'BENGALI',
        isbn: '',
        categoryId: '',
        edition: '',
        totalVolume: 1,
        volumeNo: 1,
        callNumber: '',
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'বই যুক্ত করতে ব্যর্থ।' });
    }
  };

  const handleCreateCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyForm.bookTitleId) return;
    try {
      await api.createBookCopy(copyForm);
      setFeedbackMessage({ type: 'success', text: 'নতুন বই কপি সফলভাবে যুক্ত হয়েছে।' });
      setIsAddCopyOpen(false);
      setCopyForm({
        bookTitleId: '',
        shelfLocationLabel: '',
        condition: 'NEW',
        source: 'PURCHASED',
        price: 0,
        remarks: '',
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'কপি তৈরিতে ব্যর্থ।' });
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.personId) return;
    try {
      await api.createLibraryMember(memberForm);
      setFeedbackMessage({ type: 'success', text: 'নতুন পাঠক সদস্য সফলভাবে যুক্ত হয়েছে।' });
      setIsAddMemberOpen(false);
      setMemberForm({
        personId: '',
        cardNo: '',
        membershipType: 'GENERAL',
        maxAllowedBooks: 2,
        issueDurationDays: 14,
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'সদস্য তৈরিতে ব্যর্থ।' });
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.bookCopyId || !issueForm.memberId) return;
    try {
      await api.issueBook(issueForm);
      setFeedbackMessage({ type: 'success', text: 'বই সফলভাবে ইস্যু করা হয়েছে।' });
      setIsIssueModalOpen(false);
      setIssueForm({
        bookCopyId: '',
        memberId: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        remarks: '',
      });
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'বই ইস্যু ব্যর্থ।' });
    }
  };

  const handleReturnBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    try {
      await api.returnBook(selectedIssue.id, returnForm);
      setFeedbackMessage({ type: 'success', text: 'বই সফলভাবে ফেরত গ্রহণ করা হয়েছে।' });
      setIsReturnModalOpen(false);
      setSelectedIssue(null);
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'বই ফেরত ব্যর্থ।' });
    }
  };

  const handleCreateAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acquisitionForm.bookTitleId) return;
    try {
      await api.createBookAcquisition(acquisitionForm);
      setFeedbackMessage({ type: 'success', text: 'বই সংগ্রহ ও ক্যাটালগ এন্ট্রি সম্পন্ন হয়েছে।' });
      setIsAcquisitionModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'বই সংগ্রহ ব্যর্থ।' });
    }
  };

  const libraryTabs = [
    { id: 'dashboard' as LibrarySubSection, label: 'পাঠাগার ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'books' as LibrarySubSection, label: 'বই ও ক্যাটালগ', icon: BookOpen },
    { id: 'categories' as LibrarySubSection, label: 'বিষয় ও শ্রেণিবিন্যাস', icon: Layers },
    { id: 'members' as LibrarySubSection, label: 'পাঠক ও সদস্য', icon: Users },
    { id: 'issue' as LibrarySubSection, label: 'বই ইস্যু', icon: ArrowUpRight },
    { id: 'returns' as LibrarySubSection, label: 'বই ফেরত', icon: ArrowDownLeft },
    { id: 'lostDamaged' as LibrarySubSection, label: 'হারানো ও ক্ষতিগ্রস্ত বই', icon: AlertTriangle },
    { id: 'acquisitions' as LibrarySubSection, label: 'বই দান ও সংগ্রহ', icon: Gift },
    { id: 'search' as LibrarySubSection, label: 'বই অনুসন্ধান', icon: Search },
    { id: 'reports' as LibrarySubSection, label: 'পাঠাগার রিপোর্ট', icon: FileBarChart },
    { id: 'print' as LibrarySubSection, label: 'রেজিস্টার ও প্রিন্ট', icon: Printer },
  ];

  return (
    <div className="space-y-6 font-siliguri">
      {/* Feedback message */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold px-2 py-1 bg-white rounded border cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Internal Sub-navigation for 11 Library Sections */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-2 border-b border-slate-200">
        {libraryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Dashboard */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs text-slate-500 font-bold">মোট বই শিরোনাম</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {toBanglaNumber(stats?.totalTitles || bookTitles.length)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs text-slate-500 font-bold">মোট কপি সংখ্যা</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {toBanglaNumber(stats?.totalCopies || bookCopies.length)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs text-slate-500 font-bold">উপলব্ধ কপি</p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {toBanglaNumber(stats?.availableCopies || bookCopies.filter((c) => c.status === 'AVAILABLE').length)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-xs text-slate-500 font-bold">ইস্যুকৃত কপি</p>
              <p className="text-2xl font-black text-amber-700 mt-1">
                {toBanglaNumber(stats?.issuedCopies || bookCopies.filter((c) => c.status === 'ISSUED').length)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>সাম্প্রতিক বই ইস্যু ও লেনদেন</span>
              </h3>
              {issues.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">কোনো বই ইস্যুর রেকর্ড নেই</p>
              ) : (
                <div className="space-y-2">
                  {issues.slice(0, 5).map((iss) => (
                    <div key={iss.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{iss.bookTitleName || iss.bookCopyCode}</p>
                        <p className="text-slate-500">{iss.memberName || 'সদস্য'} • ইস্যু: {iss.issueDate}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${iss.status === 'ISSUED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {iss.status === 'ISSUED' ? 'ইস্যুকৃত' : 'ফেরত'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-blue-600" />
                <span>জনপ্রিয় ও পঠিত কিতাবসমূহ</span>
              </h3>
              {bookTitles.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">কোনো বই তালিকাভুক্ত নেই</p>
              ) : (
                <div className="space-y-2">
                  {bookTitles.slice(0, 5).map((bt) => (
                    <div key={bt.id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{bt.title}</p>
                        <p className="text-slate-500">{bt.author} • {bt.categoryName || 'সাধারণ'}</p>
                      </div>
                      <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {toBanglaNumber(bookCopies.filter((c) => c.bookTitleId === bt.id).length)} কপি
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Books & Catalog */}
      {activeSection === 'books' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">পাঠাগার কিতাব ও ক্যাটালগ তালিকা</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAddTitleOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন বই শিরোনাম</span>
              </button>
              <button
                onClick={() => setIsAddCopyOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন কপি যোগ</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">বইয়ের নাম ও লেখক</th>
                    <th className="p-3">বিষয় / বিভাগ</th>
                    <th className="p-3">প্রকাশনী ও বছর</th>
                    <th className="p-3">কপি সংখ্যা</th>
                    <th className="p-3">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookTitles.map((bt) => {
                    const copies = bookCopies.filter((c) => c.bookTitleId === bt.id);
                    const avail = copies.filter((c) => c.status === 'AVAILABLE').length;
                    return (
                      <tr key={bt.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{bt.title}</p>
                          <p className="text-slate-500">{bt.author}</p>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{bt.categoryName || 'সাধারণ'}</td>
                        <td className="p-3 text-slate-600">{bt.publisher || '-'} ({toBanglaNumber(bt.publicationYear || '-')})</td>
                        <td className="p-3">
                          <span className="font-bold text-emerald-700">{toBanglaNumber(avail)}</span> / {toBanglaNumber(copies.length)} উপলব্ধ
                        </td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">সক্রিয়</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Categories */}
      {activeSection === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">বিষয় ও শ্রেণিবিন্যাস (Categories)</h3>
            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন বিষয়</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-bold">
                    {cat.code || 'CAT'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    {toBanglaNumber(bookTitles.filter((b) => b.categoryId === cat.id).length)} বই
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{cat.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{cat.description || 'ইসলামী পাঠাগার বিষয়'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Members */}
      {activeSection === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">পাঠক ও সদস্য তালিকা</h3>
            <button
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন সদস্য নিবন্ধন</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">সদস্যের নাম ও আইডি</th>
                  <th className="p-3">মোবাইল</th>
                  <th className="p-3">সদস্যপদ ধরন</th>
                  <th className="p-3">বই সীমা</th>
                  <th className="p-3">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{m.personName || 'সদস্য'}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{m.cardNo || m.memberCode || '-'}</p>
                    </td>
                    <td className="p-3 text-slate-600 font-mono">{m.phone || '-'}</td>
                    <td className="p-3 font-semibold">{m.membershipType === 'STUDENT' ? 'শিক্ষার্থী' : 'সাধারণ'}</td>
                    <td className="p-3">{toBanglaNumber(m.maxAllowedBooks || 2)}টি কিতাব</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">সক্রিয়</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Book Issue */}
      {activeSection === 'issue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">বই ইস্যু ও বিতরণ</h3>
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন বই ইস্যু</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">বইয়ের নাম ও কপি কোড</th>
                  <th className="p-3">গৃহীতা সদস্য</th>
                  <th className="p-3">ইস্যু তারিখ</th>
                  <th className="p-3">ফেরত শেষ তারিখ</th>
                  <th className="p-3">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((iss) => (
                  <tr key={iss.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{iss.bookTitleName || 'কিতাব'}</p>
                      <p className="text-blue-700 font-mono text-[11px]">{iss.bookCopyCode}</p>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{iss.memberName || 'পাঠক'}</td>
                    <td className="p-3 text-slate-600">{iss.issueDate}</td>
                    <td className="p-3 text-rose-700 font-bold">{iss.dueDate}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${iss.status === 'ISSUED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {iss.status === 'ISSUED' ? 'ইস্যুকৃত' : 'ফেরত'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Returns */}
      {activeSection === 'returns' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">বই ফেরত গ্রহণ</h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">বই ও কপি</th>
                  <th className="p-3">সদস্য</th>
                  <th className="p-3">ইস্যু ও শেষ তারিখ</th>
                  <th className="p-3">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.filter((i) => i.status === 'ISSUED').map((iss) => (
                  <tr key={iss.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{iss.bookTitleName}</p>
                      <p className="text-blue-700 font-mono text-[11px]">{iss.bookCopyCode}</p>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{iss.memberName}</td>
                    <td className="p-3 text-slate-600">ইস্যু: {iss.issueDate} • মেয়াদ: {iss.dueDate}</td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          setSelectedIssue(iss);
                          setIsReturnModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-700 text-white rounded text-xs font-bold hover:bg-emerald-800 cursor-pointer"
                      >
                        ফেরত গ্রহণ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Lost / Damaged */}
      {activeSection === 'lostDamaged' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">হারানো ও ক্ষতিগ্রস্ত বই</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookCopies.filter((c) => c.status === 'LOST' || c.status === 'DAMAGED').map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700">{c.bookId}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.status === 'LOST' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {c.status === 'LOST' ? 'হারানো' : 'ক্ষতিগ্রস্ত'}
                  </span>
                </div>
                <p className="font-bold text-slate-800 mt-2">{c.bookTitleName}</p>
                <p className="text-xs text-slate-500">অবস্থান: {c.shelfLocationLabel || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Acquisitions */}
      {activeSection === 'acquisitions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">বই সংগ্রহ ও দান রেজিস্টার</h3>
            <button
              onClick={() => setIsAcquisitionModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন সংগ্রহ এন্ট্রি</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">কিতাব</th>
                  <th className="p-3">উৎস</th>
                  <th className="p-3">দাতা / বিক্রেতা</th>
                  <th className="p-3">পরিমাণ</th>
                  <th className="p-3">মূল্য / অর্থ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {acquisitions.map((acq) => (
                  <tr key={acq.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{acq.bookTitleName || 'কিতাব'}</td>
                    <td className="p-3 font-semibold">{acq.sourceType === 'DONATION' ? 'দান' : 'ক্রয়'}</td>
                    <td className="p-3 text-slate-600">{acq.donorName || '-'}</td>
                    <td className="p-3">{toBanglaNumber(acq.quantity || 1)} কপি</td>
                    <td className="p-3 font-bold text-emerald-700">
                      {acq.sourceType === 'DONATION' ? 'অনুদান (৳ ০)' : `৳ ${toBanglaNumber(acq.totalAmount || 0)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. Search */}
      {activeSection === 'search' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="বইয়ের নাম, লেখক বা ক্যাটালগ নম্বর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm font-semibold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookTitles
              .filter(
                (b) =>
                  b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  b.author.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((b) => (
                <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <h4 className="font-bold text-slate-800">{b.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">লেখক: {b.author}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-1">বিষয়: {b.categoryName || 'সাধারণ'}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 10. Reports */}
      {activeSection === 'reports' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800">পাঠাগার সমন্বিত রিপোর্ট</h3>
          <p className="text-xs text-slate-500">
            সর্বমোট কিতাব: {toBanglaNumber(bookTitles.length)}টি | মোট কপি: {toBanglaNumber(bookCopies.length)}টি |
            ইস্যুকৃত: {toBanglaNumber(bookCopies.filter((c) => c.status === 'ISSUED').length)}টি
          </p>
        </div>
      )}

      {/* 11. Print & Registers */}
      {activeSection === 'print' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <span>পাঠাগার বারকোড ও রেজিস্টার প্রিন্ট</span>
          </h3>
          <p className="text-xs text-slate-600">বইয়ের কপির জন্য বারকোড ও রেজিস্টার প্রিন্ট প্রস্তুত রয়েছে।</p>
        </div>
      )}

      {/* Modals */}
      {isAddTitleOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">নতুন বইয়ের শিরোনাম যোগ করুন</h3>
            <form onSubmit={handleCreateTitle} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">বইয়ের নাম *</label>
                <input
                  type="text"
                  required
                  value={titleForm.title}
                  onChange={(e) => setTitleForm({ ...titleForm, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">লেখক *</label>
                <input
                  type="text"
                  required
                  value={titleForm.author}
                  onChange={(e) => setTitleForm({ ...titleForm, author: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">বিষয় / ক্যাটাগরি *</label>
                <select
                  required
                  value={titleForm.categoryId}
                  onChange={(e) => setTitleForm({ ...titleForm, categoryId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- বিষয় নির্বাচন করুন --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">প্রকাশনী</label>
                <input
                  type="text"
                  value={titleForm.publisher}
                  onChange={(e) => setTitleForm({ ...titleForm, publisher: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTitleOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Copy Modal */}
      {isAddCopyOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">নতুন বই কপি যুক্ত করুন</h3>
            <form onSubmit={handleCreateCopy} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">বই শিরোনাম নির্বাচন *</label>
                <select
                  required
                  value={copyForm.bookTitleId}
                  onChange={(e) => setCopyForm({ ...copyForm, bookTitleId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">-- বই নির্বাচন করুন --</option>
                  {bookTitles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.author})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">আলমারি / তাক অবস্থান</label>
                <input
                  type="text"
                  placeholder="যেমন: আলমারি ০১, তাক ০২"
                  value={copyForm.shelfLocationLabel}
                  onChange={(e) => setCopyForm({ ...copyForm, shelfLocationLabel: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCopyOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  কপি তৈরি
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

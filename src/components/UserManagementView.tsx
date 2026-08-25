import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Key,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { User, UserRole, UserStatus, Permission, Mosque } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';

interface UserManagementViewProps {
  users: User[];
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
  onAddUser: (data: any) => Promise<void>;
  onUpdateUser: (id: string, data: any) => Promise<void>;
  onUpdateStatus: (id: string, status: UserStatus) => Promise<void>;
  onResetPassword: (id: string, newPass: string) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

const ALL_PERMISSIONS: { id: Permission; labelBn: string; category: string }[] = [
  { id: 'VIEW_DASHBOARD', labelBn: 'ড্যাশবোর্ড দেখা', category: 'সারসংক্ষেপ' },
  { id: 'CREATE_INCOME', labelBn: 'আয় ভাউচার এন্ট্রি', category: 'হিসাব' },
  { id: 'EDIT_INCOME', labelBn: 'আয় ভাউচার সংশোধন', category: 'হিসাব' },
  { id: 'APPROVE_INCOME', labelBn: 'আয় ভাউচার অনুমোদন/বাতিল', category: 'হিসাব' },
  { id: 'CREATE_EXPENSE', labelBn: 'ব্যয় ভাউচার এন্ট্রি', category: 'হিসাব' },
  { id: 'EDIT_EXPENSE', labelBn: 'ব্যয় ভাউচার সংশোধন', category: 'হিসাব' },
  { id: 'APPROVE_EXPENSE', labelBn: 'ব্যয় ভাউচার অনুমোদন/বাতিল', category: 'হিসাব' },
  { id: 'MANAGE_ACCOUNTS', labelBn: 'ব্যাংক ও ক্যাশ ফান্ড নিয়ন্ত্রণ', category: 'হিসাব' },
  { id: 'VIEW_REPORT', labelBn: 'রিপোর্ট তৈরি ও ভিউ', category: 'রিপোর্ট' },
  { id: 'EXPORT_REPORT', labelBn: 'রিপোর্ট এক্সপোর্ট ও প্রিন্ট', category: 'রিপোর্ট' },
  { id: 'MANAGE_COMMITTEE', labelBn: 'কমিটি ও সভার কার্যবিবরণী', category: 'প্রশাসন' },
  { id: 'MANAGE_STAFF', labelBn: 'স্টাফ ও বেতন নিয়ন্ত্রণ', category: 'প্রশাসন' },
  { id: 'MANAGE_ASSETS', labelBn: 'সম্পদ রেজিস্ট্রি নিয়ন্ত্রণ', category: 'প্রশাসন' },
  { id: 'MANAGE_PROPERTY', labelBn: 'ওয়াকফ ও জমিজমা রেজিস্ট্রি', category: 'প্রশাসন' },
  { id: 'MANAGE_CEMETERY', labelBn: 'কবরস্থান রেজিস্ট্রি নিয়ন্ত্রণ', category: 'প্রশাসন' },
  { id: 'MANAGE_USERS', labelBn: 'ইউজার ও রোল ব্যবস্থাপনা', category: 'সিস্টেম' },
  { id: 'VIEW_AUDIT_LOG', labelBn: 'অডিট লগ পর্যবেক্ষণ', category: 'সিস্টেম' },
  { id: 'MANAGE_SETTINGS', labelBn: 'মসজিদ সেটিংস পরিবর্তন', category: 'সিস্টেম' },
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentMosque,
  currentUser,
  language = 'bn',
  onAddUser,
  onUpdateUser,
  onUpdateStatus,
  onResetPassword,
  onDeleteUser,
}) => {
  const t = translations[language] || translations.bn;

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Add User Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState<UserRole>('DATA_ENTRY_OPERATOR');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Auto preset permissions based on role
  const getPresetPermissionsForRole = (r: UserRole): Permission[] => {
    switch (r) {
      case 'SUPER_ADMIN':
      case 'MOSQUE_ADMIN':
        return ALL_PERMISSIONS.map((p) => p.id);
      case 'ACCOUNTANT':
      case 'TREASURER':
        return [
          'VIEW_DASHBOARD',
          'CREATE_INCOME',
          'EDIT_INCOME',
          'APPROVE_INCOME',
          'CREATE_EXPENSE',
          'EDIT_EXPENSE',
          'APPROVE_EXPENSE',
          'MANAGE_ACCOUNTS',
          'VIEW_REPORT',
          'EXPORT_REPORT',
        ];
      case 'COMMITTEE_ADMIN':
        return [
          'VIEW_DASHBOARD',
          'MANAGE_COMMITTEE',
          'MANAGE_STAFF',
          'MANAGE_ASSETS',
          'MANAGE_PROPERTY',
          'MANAGE_CEMETERY',
          'VIEW_REPORT',
          'EXPORT_REPORT',
        ];
      case 'AUDITOR':
        return ['VIEW_DASHBOARD', 'VIEW_REPORT', 'EXPORT_REPORT', 'VIEW_AUDIT_LOG'];
      case 'DATA_ENTRY_OPERATOR':
        return ['VIEW_DASHBOARD', 'CREATE_INCOME', 'CREATE_EXPENSE', 'VIEW_REPORT'];
      case 'VIEWER':
      default:
        return ['VIEW_DASHBOARD', 'VIEW_REPORT'];
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setSelectedPermissions(getPresetPermissionsForRole(newRole));
  };

  const openAddModal = () => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('admin123');
    setRole('DATA_ENTRY_OPERATOR');
    setSelectedPermissions(getPresetPermissionsForRole('DATA_ENTRY_OPERATOR'));
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setPhone(u.phone);
    setEmail(u.email || '');
    setRole(u.role);
    setSelectedPermissions(u.permissions || []);
    setFormError('');
  };

  const handleTogglePermission = (permId: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setFormError('নাম ও মোবাইল নম্বর আবশ্যক।');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      await onAddUser({
        name,
        phone,
        email,
        password,
        role,
        permissions: selectedPermissions,
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'ইউজার যুক্ত করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setFormError('');
    try {
      await onUpdateUser(editingUser.id, {
        name,
        phone,
        email,
        role,
        permissions: selectedPermissions,
      });
      setEditingUser(null);
    } catch (err: any) {
      setFormError(err.message || 'ইউজার আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (!newPassword || newPassword.length < 6) {
      setFormError('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('উভয় পাসওয়ার্ড হুবহু একই হতে হবে।');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      await onResetPassword(resettingUser.id, newPassword);
      setResettingUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFormError(err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      await onDeleteUser(deletingUser.id);
      setDeletingUser(null);
    } catch (err: any) {
      alert(err.message || 'ইউজার ডিলিট করা যায়নি।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'SUPER_ADMIN':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold px-2 py-0.5 rounded-full">সুপার অ্যাডমিন</span>;
      case 'MOSQUE_ADMIN':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold px-2 py-0.5 rounded-full">মসজিদ অ্যাডমিন</span>;
      case 'ACCOUNTANT':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">অ্যাকাউন্ট্যান্ট (হিসাবরক্ষক)</span>;
      case 'TREASURER':
        return <span className="bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold px-2 py-0.5 rounded-full">ক্যাশিয়ার / কোষাধ্যক্ষ</span>;
      case 'COMMITTEE_ADMIN':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold px-2 py-0.5 rounded-full">কমিটি অ্যাডমিন</span>;
      case 'AUDITOR':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold px-2 py-0.5 rounded-full">অডিটর (নিরীক্ষক)</span>;
      case 'DATA_ENTRY_OPERATOR':
        return <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-bold px-2 py-0.5 rounded-full">ডাটা এন্ট্রি অপারেটর</span>;
      case 'VIEWER':
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded-full">দর্শক (Viewer)</span>;
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                ইউজার ও পদবী ব্যবস্থাপনা (User & Role Management)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                মসজিদ পরিচালনা কমিটির সদস্য ও স্টাফদের সিস্টেম এক্সেস, রোল ও নিরাপত্তা নিয়ন্ত্রণ
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all transform active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>নতুন ইউজার যুক্ত করুন</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">মোট ইউজার</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{users.length} জন</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 block">সক্রিয় অ্যাকাউন্ট</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {users.filter((u) => u.status === 'ACTIVE').length} জন
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-blue-600 block">প্রশাসনিক ইউজার</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'MOSQUE_ADMIN').length} জন
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-amber-600 block">হিসাব ও কোষাধ্যক্ষ</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">
            {users.filter((u) => u.role === 'ACCOUNTANT' || u.role === 'TREASURER').length} জন
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, মোবাইল বা ইমেইল দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>ফিল্টার:</span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
          >
            <option value="ALL">সকল পদবী / রোল</option>
            <option value="SUPER_ADMIN">সুপার অ্যাডমিন</option>
            <option value="MOSQUE_ADMIN">মসজিদ অ্যাডমিন</option>
            <option value="ACCOUNTANT">অ্যাকাউন্ট্যান্ট</option>
            <option value="TREASURER">কোষাধ্যক্ষ</option>
            <option value="COMMITTEE_ADMIN">কমিটি অ্যাডমিন</option>
            <option value="AUDITOR">অডিটর</option>
            <option value="DATA_ENTRY_OPERATOR">ডাটা এন্ট্রি অপারেটর</option>
            <option value="VIEWER">দর্শক (Viewer)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
          >
            <option value="ALL">সকল স্ট্যাটাস</option>
            <option value="ACTIVE">সক্রিয় (Active)</option>
            <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
            <option value="SUSPENDED">স্থগিত (Suspended)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ইউজারের নাম ও যোগাযোগ</th>
                <th className="py-3 px-4">রোল ও পদবী</th>
                <th className="py-3 px-4">অনুমতি ও পারমিশন</th>
                <th className="py-3 px-4">অবস্থা (Status)</th>
                <th className="py-3 px-4 text-center">সর্বশেষ সক্রিয়</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    কোনো ইউজার পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-sm">
                                  আপনি (You)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5">
                              <span className="flex items-center space-x-1 font-mono">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{u.phone}</span>
                              </span>
                              {u.email && (
                                <span className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{u.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-slate-600 font-medium">
                          {u.permissions?.length || 0} টি মডিউলে অনুমতি সক্রিয়
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() =>
                            onUpdateStatus(u.id, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
                          }
                          disabled={isCurrent}
                          title={isCurrent ? 'নিজের স্ট্যাটাস পরিবর্তন করা যাবে না' : 'স্ট্যাটাস টগল করুন'}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>সক্রিয় (Active)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>নিষ্ক্রিয় (Inactive)</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500">
                        {u.lastLogin ? formatDate(u.lastLogin) : 'অদ্যবধি নয়'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditModal(u)}
                            title="ইউজার তথ্য ও অনুমতি পরিবর্তন"
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setResettingUser(u);
                              setFormError('');
                            }}
                            title="পাসওয়ার্ড রিসেট করুন"
                            className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              title="ইউজার অ্যাকাউন্ট ডিলিট করুন"
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      </div>

      {/* ---------------- ADD USER MODAL ---------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">নতুন ইউজার যোগ করুন (Create New User)</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ইউজারের পূর্ণ নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: হাফেজ কারী আব্দুল্লাহ"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর (লগইন আইডি) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রাথমিক পাসওয়ার্ড <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  রোল ও পদবী নির্বাচন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MOSQUE_ADMIN">মসজিদ অ্যাডমিন (পূর্ণ এক্সেস)</option>
                  <option value="ACCOUNTANT">অ্যাকাউন্ট্যান্ট / হিসাবরক্ষক (আয়-ব্যয় ও ব্যাংক নিয়ন্ত্রণ)</option>
                  <option value="TREASURER">ক্যাশিয়ার / কোষাধ্যক্ষ (তহবিল ও ভাউচার পোস্টিং)</option>
                  <option value="COMMITTEE_ADMIN">কমিটি অ্যাডমিন (কমিটি, সভা ও স্টাফ নিয়ন্ত্রণ)</option>
                  <option value="AUDITOR">অডিটর / নিরীক্ষক (রিপোর্ট ও অডিট লগ ভিউ)</option>
                  <option value="DATA_ENTRY_OPERATOR">ডাটা এন্ট্রি অপারেটর (কেবল রসিদ ও ভাউচার এন্ট্রি)</option>
                  <option value="VIEWER">দর্শক (কেবল রিপোর্ট ভিউ এক্সেস)</option>
                </select>
              </div>

              {/* Permissions matrix */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  মডিউলভিত্তিক বিস্তারিত এক্সেস পারমিশন ({selectedPermissions.length} টি সক্রিয়)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked ? 'bg-blue-50 border border-blue-200 font-semibold text-blue-900' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>{perm.labelBn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'তৈরি হচ্ছে...' : 'ইউজার তৈরি করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- EDIT USER MODAL ---------------- */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Edit2 className="w-5 h-5 text-blue-300" />
                <h3 className="text-base font-bold">ইউজার তথ্য ও পারমিশন সংশোধন ({editingUser.name})</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ইউজারের পূর্ণ নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">রোল ও পদবী</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SUPER_ADMIN">সুপার অ্যাডমিন</option>
                    <option value="MOSQUE_ADMIN">মসজিদ অ্যাডমিন</option>
                    <option value="ACCOUNTANT">অ্যাকাউন্ট্যান্ট / হিসাবরক্ষক</option>
                    <option value="TREASURER">ক্যাশিয়ার / কোষাধ্যক্ষ</option>
                    <option value="COMMITTEE_ADMIN">কমিটি অ্যাডমিন</option>
                    <option value="AUDITOR">অডিটর / নিরীক্ষক</option>
                    <option value="DATA_ENTRY_OPERATOR">ডাটা এন্ট্রি অপারেটর</option>
                    <option value="VIEWER">দর্শক (Viewer)</option>
                  </select>
                </div>
              </div>

              {/* Permissions matrix */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  মডিউলভিত্তিক কাস্টম এক্সেস পারমিশন ({selectedPermissions.length} টি সক্রিয়)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked ? 'bg-blue-50 border border-blue-200 font-semibold text-blue-900' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>{perm.labelBn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'আপডেট হচ্ছে...' : 'আপডেট সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- RESET PASSWORD MODAL ---------------- */}
      {resettingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Key className="w-5 h-5 text-amber-200" />
                <h3 className="text-base font-bold">পাসওয়ার্ড রিসেট ({resettingUser.name})</h3>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নতুন পাসওয়ার্ড <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নতুন পাসওয়ার্ড নিশ্চিত করুন <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRMATION MODAL ---------------- */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">ইউজার অ্যাকাউন্ট ডিলিট?</h4>
              <p className="text-xs text-slate-500 mt-1">
                আপনি কি নিশ্চিতভাবে <strong className="text-slate-800">{deletingUser.name}</strong> এর অ্যাকাউন্ট মুছে ফেলতে চান?
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {isSubmitting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

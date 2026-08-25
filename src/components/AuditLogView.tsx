import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Printer,
  Download,
  Calendar,
  User as UserIcon,
  Layers,
  Activity,
  FileText,
  Clock,
  Eye,
  X,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { AuditLog, Mosque, User } from '../types';
import { Language, translations } from '../lib/i18n';

interface AuditLogViewProps {
  logs: AuditLog[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  onRefresh?: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onRefresh,
}) => {
  const t = translations[language] || translations.bn;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Log for Read-Only Audit Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // RBAC Permission Check
  const canViewAudit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.role === 'AUDITOR' ||
    currentUser?.permissions?.includes('VIEW_AUDIT_LOG');

  // Unique Lists for Dropdown Filters
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.userName) set.add(l.userName);
    });
    return Array.from(set).sort();
  }, [logs]);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.userRole) set.add(l.userRole);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtering Logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchText =
          (log.details || '').toLowerCase().includes(q) ||
          (log.userName || '').toLowerCase().includes(q) ||
          (log.recordId || '').toLowerCase().includes(q) ||
          (log.voucherNumber || '').toLowerCase().includes(q) ||
          (log.ipAddress || '').toLowerCase().includes(q) ||
          (log.module || '').toLowerCase().includes(q);
        if (!matchText) return false;
      }

      // 2. Module Filter
      if (moduleFilter !== 'ALL' && log.module !== moduleFilter) {
        return false;
      }

      // 3. Action Filter
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // 4. User Filter
      if (userFilter !== 'ALL' && log.userName !== userFilter) {
        return false;
      }

      // 5. Role Filter
      if (roleFilter !== 'ALL' && log.userRole !== roleFilter) {
        return false;
      }

      // 6. Status Filter
      if (statusFilter !== 'ALL' && (log.status || 'SUCCESS') !== statusFilter) {
        return false;
      }

      // 7. Date Range Filter
      if (fromDate) {
        const logTime = new Date(log.timestamp).getTime();
        const fromTime = new Date(fromDate).getTime();
        if (logTime < fromTime) return false;
      }

      if (toDate) {
        const logTime = new Date(log.timestamp).getTime();
        const toTime = new Date(toDate).setHours(23, 59, 59, 999);
        if (logTime > toTime) return false;
      }

      return true;
    });
  }, [logs, searchQuery, moduleFilter, actionFilter, userFilter, roleFilter, statusFilter, fromDate, toDate]);

  // Helper Labels & Badges in Bengali
  const getModuleNameBn = (mod: string) => {
    switch (mod) {
      case 'INCOME':
        return 'আয় হিসাব (Income)';
      case 'EXPENSE':
        return 'ব্যয় হিসাব (Expense)';
      case 'DONATION':
        return 'দান ও অনুদান';
      case 'DONATION_BOX':
        return 'দানবাক্স';
      case 'ACCOUNT_TRANSFER':
        return 'তহবিল স্থানান্তর';
      case 'FINANCIAL_ACCOUNT':
        return 'ব্যাংক/ক্যাশ হিসাব';
      case 'COMMITTEE_MEMBER':
      case 'COMMITTEE':
        return 'কমিটি ব্যবস্থাপনা';
      case 'STAFF':
        return 'স্টাফ ও বেতন';
      case 'ASSET':
        return 'মসজিদ সম্পদ';
      case 'PROPERTY':
        return 'ওয়াকফ সম্পত্তি';
      case 'CEMETERY':
        return 'কবরস্থান';
      case 'NOTICE':
        return 'নোটিশ বোর্ড';
      case 'AUTH':
      case 'USER':
        return 'নিরাপত্তা ও ইউজার';
      case 'MOSQUE':
      case 'SETTINGS':
        return 'মসজিদ সেটিংস';
      default:
        return mod;
    }
  };

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            CREATE (নতুন এন্ট্রি)
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            UPDATE (সংশোধন)
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            DELETE (মুছে ফেলা)
          </span>
        );
      case 'CANCEL':
      case 'REJECT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            REVERSAL (বাতিল/রিভার্স)
          </span>
        );
      case 'APPROVE':
      case 'POST':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            APPROVE (অনুমোদন)
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            LOGIN (লগইন)
          </span>
        );
      case 'LOGOUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            LOGOUT (লগআউট)
          </span>
        );
      case 'SETTINGS_CHANGE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            SETTINGS (সেটিংস পরিবর্তন)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-500" />
          <span>ব্যর্থ (FAILED)</span>
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>সতর্কতা</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        <span>সফল (SUCCESS)</span>
      </span>
    );
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'User Name', 'Role', 'Module', 'Action', 'Voucher/Record ID', 'Details', 'IP Address', 'Status'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.userName || ''}"`,
      l.userRole || '',
      l.module,
      l.action,
      l.voucherNumber || l.recordId || '',
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.ipAddress || '',
      l.status || 'SUCCESS',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `masjid_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Permission Guard Screen
  if (!canViewAudit) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">অনুমতি সীমাবদ্ধ (Access Restricted)</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          সিস্টেম ও আর্থিক অডিট লগ দেখার অনুমতি শুধুমাত্র <strong>SUPER_ADMIN</strong>, <strong>MOSQUE_ADMIN</strong> অথবা <strong>AUDITOR</strong> পদবীর ইউজারদের রয়েছে।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {language === 'bn' ? 'সিস্টেম ও আর্থিক অডিট লগ (Audit Trail & Logging)' : 'System & Financial Audit Trail'}
              </h2>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Immutable Log
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {language === 'bn'
                ? 'প্রতিটি আয়-ব্যয়, সংশোধন, দানবাক্স খোলা ও প্রশাসনিক কার্যক্রমের অপরিবর্তনযোগ্য ক্রমানুসারে সংরক্ষিত লগ।'
                : 'Tamper-proof, immutable chronological log of all transactions, box openings, reversals, and administrative actions.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="btn-export-audit-csv"
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV ডাউনলোড</span>
          </button>
          <button
            id="btn-print-audit-log"
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>অডিট লগ প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on Print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>ফিল্টার ও অনুসন্ধান টুলবার</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            ফিল্টারকৃত রেকর্ড: <strong className="text-slate-900 font-mono text-sm">{filteredLogs.length}</strong> / {logs.length}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-audit-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ভাউচার নং, বিবরণ, রেকর্ড আইডি বা ইউজার খুঁজুন..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              id="select-audit-module"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">সকল মডিউল</option>
              <option value="INCOME">আয় হিসাব (Income)</option>
              <option value="EXPENSE">ব্যয় হিসাব (Expense)</option>
              <option value="DONATION">দান ও অনুদান</option>
              <option value="DONATION_BOX">দানবাক্স</option>
              <option value="ACCOUNT_TRANSFER">তহবিল স্থানান্তর</option>
              <option value="FINANCIAL_ACCOUNT">ব্যাংক/ক্যাশ অ্যাকাউন্ট</option>
              <option value="COMMITTEE_MEMBER">কমিটি</option>
              <option value="STAFF">স্টাফ ও বেতন</option>
              <option value="ASSET">সম্পদ</option>
              <option value="PROPERTY">ওয়াকফ সম্পত্তি</option>
              <option value="CEMETERY">কবরস্থান</option>
              <option value="NOTICE">নোটিশ বোর্ড</option>
              <option value="AUTH">নিরাপত্তা ও ইউজার</option>
              <option value="MOSQUE">মসজিদ সেটিংস</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              id="select-audit-action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">সকল কার্যক্রম (Action)</option>
              <option value="CREATE">নতুন এন্ট্রি (CREATE)</option>
              <option value="UPDATE">তথ্য সংশোধন (UPDATE)</option>
              <option value="DELETE">মুছে ফেলা (DELETE)</option>
              <option value="CANCEL">বাতিল/রিভার্স (CANCEL)</option>
              <option value="APPROVE">অনুমোদন (APPROVE)</option>
              <option value="LOGIN">লগইন (LOGIN)</option>
              <option value="LOGOUT">লগআউট (LOGOUT)</option>
              <option value="SETTINGS_CHANGE">সেটিংস পরিবর্তন (SETTINGS)</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              id="select-audit-user"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">সকল ইউজার</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="select-audit-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">সকল স্ট্যাটাস</option>
              <option value="SUCCESS">সফল (SUCCESS)</option>
              <option value="FAILED">ব্যর্থ (FAILED)</option>
              <option value="WARNING">সতর্কতা (WARNING)</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">তারিখ সীমা:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
            />
            <span className="text-slate-400">থেকে</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
            />
            {(fromDate || toDate || searchQuery || moduleFilter !== 'ALL' || actionFilter !== 'ALL' || userFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearchQuery('');
                  setModuleFilter('ALL');
                  setActionFilter('ALL');
                  setUserFilter('ALL');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="text-blue-600 hover:text-blue-700 font-bold ml-2 text-xs cursor-pointer"
              >
                ফিল্টার রিসেট
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            স্বয়ংক্রিয় সিঙ্ক সক্রিয় • অপরিবর্তনযোগ্য ডাটাবেজ লগ
          </div>
        </div>
      </div>

      {/* Print-Only Header (Appears ONLY when printing) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-slate-900">{currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স ওয়াকফ এস্টেট'}</h1>
        <p className="text-xs text-slate-600 mt-1">{currentMosque?.address || 'মিরপুর-১২, ঢাকা-১২১৬'}</p>
        <div className="my-3 py-1.5 bg-slate-100 border border-slate-300 font-bold text-sm">
          সিস্টেম ও আর্থিক অডিট লগ রিপোর্ট (Tamper-Proof Audit Trail)
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-600 font-mono mt-2 px-2">
          <span>তারিখ পরিসীমা: {fromDate ? `${fromDate} থেকে ` : 'শুরু থেকে '}{toDate || 'বর্তমান'}</span>
          <span>রিপোর্ট তৈরির সময়: {new Date().toLocaleString('bn-BD')}</span>
          <span>মোট রেকর্ড: {filteredLogs.length} টি</span>
        </div>
      </div>

      {/* Audit Log Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white font-bold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 w-36">তারিখ ও সময়</th>
                <th className="py-3.5 px-4 w-44">ব্যবহারকারী ও পদবী</th>
                <th className="py-3.5 px-4 w-32">মডিউল</th>
                <th className="py-3.5 px-4 w-36">কার্যক্রম (Action)</th>
                <th className="py-3.5 px-4 w-28">ভাউচার/আইডি</th>
                <th className="py-3.5 px-4">সম্পাদিত কাজের বিবরণ</th>
                <th className="py-3.5 px-4 w-28">আইপি ও ডিভাইস</th>
                <th className="py-3.5 px-4 w-24 text-center">ফলাফল</th>
                <th className="py-3.5 px-4 w-20 text-center print:hidden">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold">কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।</p>
                      <p className="text-xs text-slate-400">আপনার অনুসন্ধান বা ফিল্টার শর্ত পরিবর্তন করে দেখুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/90 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('bn-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* User & Role */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{log.userName || 'Unknown'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.userRole || 'SYSTEM'}</div>
                    </td>

                    {/* Module */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">{getModuleNameBn(log.module)}</span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>

                    {/* Voucher / Record ID */}
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-800">
                      {log.voucherNumber || log.recordId || '—'}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-slate-800 leading-relaxed font-medium">
                      {log.details}
                      {log.previousState && (
                        <div className="mt-1 text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded-sm border border-slate-200">
                          <span className="text-rose-600 line-through mr-1.5">{log.previousState}</span>
                          {log.newState && (
                            <>
                              <ArrowRight className="w-3 h-3 inline text-slate-400 mx-1" />
                              <span className="text-emerald-700 font-bold">{log.newState}</span>
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* IP & Device */}
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      <div>{log.ipAddress || '127.0.0.1'}</div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[100px]">{log.device || 'Web Browser'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">{getStatusBadge(log.status)}</td>

                    {/* View Details Action (Print: Hidden) */}
                    <td className="py-3 px-4 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="অডিট বিস্তারিত দেখুন"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* READ-ONLY AUDIT DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-tight">অডিট বিস্তারিত তথ্য (Audit Record Details)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-medium block">অডিট আইডি:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">তারিখ ও সময়:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {new Date(selectedLog.timestamp).toLocaleString('bn-BD')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">ব্যবহারকারী:</span>
                  <span className="font-bold text-slate-900">{selectedLog.userName} ({selectedLog.userRole})</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">ইউজার আইডি:</span>
                  <span className="font-mono text-slate-700">{selectedLog.userId}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">মডিউল:</span>
                  <span className="font-bold text-slate-900">{getModuleNameBn(selectedLog.module)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">কার্যক্রম (Action):</span>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">ভাউচার / রেকর্ড আইডি:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedLog.voucherNumber || selectedLog.recordId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">ফলাফল / স্ট্যাটাস:</span>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              {/* Action Details */}
              <div className="space-y-1.5">
                <span className="text-slate-500 font-bold block">সম্পাদিত কাজের পূর্ণ বিবরণ:</span>
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-medium leading-relaxed shadow-2xs">
                  {selectedLog.details}
                </div>
              </div>

              {/* State Transitions if available */}
              {(selectedLog.previousState || selectedLog.newState) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="text-rose-600 font-bold block mb-1">পূর্বের অবস্থা:</span>
                    <div className="p-2 bg-white rounded-lg border border-rose-200 text-slate-700 font-mono text-[11px]">
                      {selectedLog.previousState || 'None'}
                    </div>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-bold block mb-1">পরবর্তী অবস্থা:</span>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200 text-slate-700 font-mono text-[11px]">
                      {selectedLog.newState || 'Current'}
                    </div>
                  </div>
                </div>
              )}

              {/* Network / Client Metadata */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>IP: <strong className="font-mono text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">ডিভাইস: <strong className="text-slate-800">{selectedLog.device || 'Web Browser'}</strong></span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 italic">
                * অডিট রেকর্ড সম্পূর্ণ অপরিবর্তনযোগ্য (Read-Only) ও সুরক্ষিত।
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  UserCheck,
  Layers,
  Activity,
  FileText,
  Clock,
  Shield,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { AuditLog, Mosque } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';

interface AuditLogViewProps {
  logs: AuditLog[];
  currentMosque: Mosque | null;
  language?: Language;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  currentMosque,
  language = 'bn',
}) => {
  const t = translations[language] || translations.bn;

  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Extract unique users
  const uniqueUsers = Array.from(new Set(logs.map((l) => l.userName).filter(Boolean)));

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.recordId && log.recordId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesUser = userFilter === 'ALL' || log.userName === userFilter;

    let matchesDate = true;
    if (fromDate) {
      matchesDate = matchesDate && log.timestamp >= fromDate;
    }
    if (toDate) {
      matchesDate = matchesDate && log.timestamp <= toDate + 'T23:59:59.999Z';
    }

    return matchesSearch && matchesModule && matchesAction && matchesUser && matchesDate;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">নতুন তৈরি (CREATE)</span>;
      case 'UPDATE':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">সংশোধন (UPDATE)</span>;
      case 'DELETE':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">মুছে ফেলা (DELETE)</span>;
      case 'CANCEL':
      case 'REJECT':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">বাতিল/রিভার্স (REVERSAL)</span>;
      case 'APPROVE':
        return <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200">অনুমোদিত (APPROVED)</span>;
      case 'LOGIN':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">লগইন (LOGIN)</span>;
      case 'EXPORT':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">এক্সপোর্ট (EXPORT)</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">{action}</span>;
    }
  };

  const getModuleNameBn = (mod: string) => {
    const map: Record<string, string> = {
      AUTH: 'নিরাপত্তা ও অথেন্টিকেশন',
      INCOME: 'আয় হিসাব (Income)',
      EXPENSE: 'ব্যয় হিসাব (Expense)',
      DONATION: 'দান ও অনুদান (Donations)',
      DONATION_BOX: 'দানবাক্স (Donation Box)',
      DONATION_BOX_COLLECT: 'দানবাক্স কালেকশন',
      ACCOUNT_HEAD: 'হিসাব খাত (Heads)',
      FINANCIAL_ACCOUNT: 'ব্যাংক ও ক্যাশ ফান্ড',
      ACCOUNT_TRANSFER: 'তহবিল স্থানান্তর',
      COMMITTEE_TERM: 'কমিটি মেয়াদকাল',
      COMMITTEE_MEMBER: 'কমিটি সদস্য',
      COMMITTEE_MEETING: 'সভার কার্যবিবরণী',
      STAFF: 'স্টাফ তথ্য',
      STAFF_PAYMENT: 'স্টাফ বেতন',
      ASSET: 'মসজিদ সম্পদ',
      PROPERTY: 'ওয়াকফ ও জমিজমা',
      CEMETERY: 'কবরস্থান রেজিস্ট্রি',
      NOTICES: 'বিজ্ঞপ্তি',
      MOSQUE: 'মসজিদ প্রোফাইল',
      SMS: 'এসএমএস সার্ভিস',
    };
    return map[mod] || mod;
  };

  const handleExportCSV = () => {
    const headers = ['আইডি', 'তারিখ ও সময়', 'ইউজারের নাম', 'পদবী/রোল', 'মডিউল', 'অ্যাকশন', 'বিবরণ', 'রেকর্ড আইডি', 'আইপি'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.timestamp).toLocaleString('bn-BD'),
      l.userName,
      l.userRole,
      l.module,
      l.action,
      `"${l.details.replace(/"/g, '""')}"`,
      l.recordId || '',
      l.ipAddress || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                সিস্টেম ও আর্থিক অডিট লগ (Audit Trail & Logging)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                প্রতিটি আয়-ব্যয়, সংশোধন, দানবাক্স খোলা ও প্রশাসনিক কার্যক্রমের অপরিবর্তনযোগ্য ক্রমানুসারে সংরক্ষিত লগ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV ডাউনলোড</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>অডিট লগ প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden on Print) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="লগ বিবরণ, ভাউচার আইডি বা ইউজার খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:bg-white focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
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
              <option value="AUTH">নিরাপত্তা ও ইউজার</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
            >
              <option value="ALL">সকল অ্যাকশন</option>
              <option value="CREATE">নতুন এন্ট্রি (CREATE)</option>
              <option value="UPDATE">তথ্য সংশোধন (UPDATE)</option>
              <option value="DELETE">মুছে ফেলা (DELETE)</option>
              <option value="CANCEL">বাতিল/রিভার্স (REVERSAL)</option>
              <option value="APPROVE">অনুমোদন (APPROVE)</option>
              <option value="LOGIN">লগইন (LOGIN)</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
            >
              <option value="ALL">সকল ইউজার</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
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
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">থেকে</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-blue-600 hover:text-blue-700 font-bold ml-1 text-xs"
              >
                রিসেট
              </button>
            )}
          </div>

          <div className="text-slate-500 font-mono">
            মোট ফলাফল: <strong className="text-slate-900">{filteredLogs.length}</strong> টি লগ রেকর্ড
          </div>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-4">
        <h1 className="text-xl font-bold">{currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}</h1>
        <p className="text-xs text-slate-600">{currentMosque?.address || 'মিরপুর-১২, ঢাকা-১২১৬'}</p>
        <h2 className="text-sm font-bold mt-2 bg-slate-100 py-1 border border-slate-300">
          সিস্টেম ও আর্থিক অডিট লগ রিপোর্ট (Audit Trail Log)
        </h2>
        <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
          <span>রিপোর্ট তৈরির সময়: {new Date().toLocaleString('bn-BD')}</span>
          <span>মোট রেকর্ড সংখ্যা: {filteredLogs.length} টি</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5 w-36">তারিখ ও সময়</th>
                <th className="py-3 px-3.5 w-40">ইউজার ও পদবী</th>
                <th className="py-3 px-3.5 w-28">মডিউল</th>
                <th className="py-3 px-3.5 w-32">অ্যাকশন</th>
                <th className="py-3 px-3.5">সম্পাদিত কাজের বিবরণ</th>
                <th className="py-3 px-3.5 w-24 text-right">রেকর্ড আইডি</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    কোনো অডিট লগ পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('bn-BD', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.userRole}</div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="font-medium text-slate-700">{getModuleNameBn(log.module)}</span>
                    </td>

                    <td className="py-3 px-3.5">{getActionBadge(log.action)}</td>

                    <td className="py-3 px-3.5 text-slate-800 font-medium leading-relaxed">
                      {log.details}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono text-[10px] text-slate-400">
                      {log.recordId || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

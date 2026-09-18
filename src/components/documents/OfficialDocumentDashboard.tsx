import React from 'react';
import {
  FileText,
  Send,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Plus,
  ArrowUpRight,
  Printer,
  Edit,
  Award,
  BookOpen,
  Calendar,
  Layers,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { OfficialDocument, OfficialDocumentType } from '../../types/officialDocumentTypes';

interface OfficialDocumentDashboardProps {
  documents: OfficialDocument[];
  stats: {
    total: number;
    draftCount: number;
    pendingApprovalCount: number;
    approvedCount: number;
    sentCount: number;
    replyAwaitedCount: number;
    inProgressCount: number;
    resolvedCount: number;
    urgentCount: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  onOpenCreateModal: (docType?: OfficialDocumentType) => void;
  onSelectDocForPreview: (doc: OfficialDocument) => void;
  onSelectDocForEdit: (doc: OfficialDocument) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const OfficialDocumentDashboard: React.FC<OfficialDocumentDashboardProps> = ({
  documents,
  stats,
  onOpenCreateModal,
  onSelectDocForPreview,
  onSelectDocForEdit,
  onNavigateToTab,
}) => {
  const getDocTypeBadge = (type: OfficialDocumentType) => {
    switch (type) {
      case 'NOTICE':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-md">নোটিশ</span>;
      case 'APPLICATION':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">আবেদন</span>;
      case 'ANNOUNCEMENT':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">ঘোষণা</span>;
      case 'OUTGOING_LETTER':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md">প্রেরিত পত্র</span>;
      case 'INCOMING_LETTER':
        return <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold px-2 py-0.5 rounded-md">প্রাপ্ত পত্র</span>;
      case 'OFFICE_ORDER':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">অফিস আদেশ</span>;
      case 'CERTIFICATE':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md">সনদ / প্রত্যয়ন</span>;
      case 'RECOMMENDATION':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md">সুপারিশ</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">নথি</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> অনুমোদিত</span>;
      case 'SENT':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200"><Send className="w-3 h-3" /> প্রেরিত</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"><Clock className="w-3 h-3" /> চলমান</span>;
      case 'REPLY_AWAITED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"><AlertCircle className="w-3 h-3" /> উত্তর অপেক্ষমাণ</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200"><FileCheck className="w-3 h-3" /> নিষ্পত্তি</span>;
      case 'DRAFT':
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200"><Clock className="w-3 h-3" /> খসড়া</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-bold text-blue-300">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>দাপ্তরিক নথি ও যোগাযোগ কেন্দ্র (Official Correspondence Hub)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              মসজিদলেজার অফিশিয়াল ডকুমেন্ট ম্যানেজমেন্ট ও এআই ড্রাফটিং
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              নোটিশ, আবেদনপত্র, সরকারি স্মারকপত্র, প্রশংসাপত্র ও অফিস আদেশ তৈরি, স্মারক নম্বর জেনারেশন ও গ্লোবাল লেটারহেডে স্বয়ংক্রিয় প্রিন্ট।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenCreateModal('NOTICE')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন নথি তৈরি করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'মোট নথি', count: stats.total, color: 'border-slate-300 text-slate-900 bg-white' },
          { label: 'অনুমোদিত', count: stats.approvedCount, color: 'border-emerald-200 text-emerald-800 bg-emerald-50/50' },
          { label: 'খসড়া নথি', count: stats.draftCount, color: 'border-slate-200 text-slate-700 bg-slate-50/50' },
          { label: 'প্রেরিত পত্র', count: stats.sentCount, color: 'border-purple-200 text-purple-800 bg-purple-50/50' },
          { label: 'উত্তর অপেক্ষমাণ', count: stats.replyAwaitedCount, color: 'border-amber-200 text-amber-800 bg-amber-50/50' },
          { label: 'চলমান কার্যক্রম', count: stats.inProgressCount, color: 'border-blue-200 text-blue-800 bg-blue-50/50' },
          { label: 'জরুরি / বিশেষ', count: stats.urgentCount, color: 'border-rose-200 text-rose-800 bg-rose-50/50' },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-4 rounded-xl border shadow-2xs ${kpi.color}`}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-black mt-1 font-mono">{kpi.count}</div>
          </div>
        ))}
      </div>

      {/* Quick Access Action Shortcuts */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          দ্রুত নথি তৈরি করুন (Quick Create by Document Type)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {[
            { type: 'NOTICE' as OfficialDocumentType, label: '📢 নোটিশ', tab: 'notices', desc: 'সভা বা জরুরি বিজ্ঞপ্তি' },
            { type: 'APPLICATION' as OfficialDocumentType, label: '📝 দরখাস্ত', tab: 'applications', desc: 'ছুটি ও অনুদান আবেদন' },
            { type: 'ANNOUNCEMENT' as OfficialDocumentType, label: '📣 ঘোষণা', tab: 'announcements', desc: 'জুমা ও মুসল্লিদের বিজ্ঞপ্তি' },
            { type: 'OUTGOING_LETTER' as OfficialDocumentType, label: '📤 প্রেরিত পত্র', tab: 'outgoing', desc: 'স্মারক ও সরকারি পত্র' },
            { type: 'INCOMING_LETTER' as OfficialDocumentType, label: '📥 প্রাপ্ত পত্র', tab: 'incoming', desc: 'ইনকামিং পত্র রেজিস্ট্রি' },
            { type: 'OFFICE_ORDER' as OfficialDocumentType, label: '🏢 অফিস আদেশ', tab: 'orders', desc: 'স্টাফ দায়িত্ব ও আদেশ' },
            { type: 'CERTIFICATE' as OfficialDocumentType, label: '📄 প্রত্যয়নপত্র', tab: 'certificates', desc: 'প্রশংসা ও সদস্য সনদ' },
            { type: 'RECOMMENDATION' as OfficialDocumentType, label: '📜 সুপারিশপত্র', tab: 'recommendations', desc: 'বৃত্তি ও কল্যাণ সুপারিশ' },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => onOpenCreateModal(item.type)}
              className="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all group cursor-pointer"
            >
              <div className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                {item.label}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Category Distribution & Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1 Col: Category Summary Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              নথির বিভাজন (Category Breakdown)
            </h3>
            <span className="text-[11px] font-bold text-slate-500">মোট: {stats.total} টি</span>
          </div>

          <div className="space-y-3">
            {[
              { type: 'NOTICE', label: '📢 নোটিশ ও বিজ্ঞপ্তি', count: stats.byType['NOTICE'] || 0, tab: 'notices' },
              { type: 'APPLICATION', label: '📝 দরখাস্ত ও আবেদন', count: stats.byType['APPLICATION'] || 0, tab: 'applications' },
              { type: 'ANNOUNCEMENT', label: '📣 সাধারণ ঘোষণা', count: stats.byType['ANNOUNCEMENT'] || 0, tab: 'announcements' },
              { type: 'OUTGOING_LETTER', label: '📤 প্রেরিত পত্র (স্মারক)', count: stats.byType['OUTGOING_LETTER'] || 0, tab: 'outgoing' },
              { type: 'INCOMING_LETTER', label: '📥 প্রাপ্ত পত্র (ইনকামিং)', count: stats.byType['INCOMING_LETTER'] || 0, tab: 'incoming' },
              { type: 'OFFICE_ORDER', label: '🏢 অফিস আদেশ', count: stats.byType['OFFICE_ORDER'] || 0, tab: 'orders' },
              { type: 'CERTIFICATE', label: '📄 প্রত্যয়নপত্র ও সনদ', count: stats.byType['CERTIFICATE'] || 0, tab: 'certificates' },
              { type: 'RECOMMENDATION', label: '📜 সুপারিশপত্র', count: stats.byType['RECOMMENDATION'] || 0, tab: 'recommendations' },
            ].map((cat) => {
              const percentage = stats.total > 0 ? Math.round((cat.count / stats.total) * 100) : 0;
              return (
                <div
                  key={cat.type}
                  onClick={() => onNavigateToTab(cat.tab)}
                  className="cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{cat.label}</span>
                    <span className="font-bold text-slate-900 font-mono">{cat.count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Col: Recent Documents Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                সাম্প্রতিক দাপ্তরিক যোগাযোগ ও নথি (Recent Documents)
              </h3>
              <p className="text-[11px] text-slate-500 font-normal">সর্বশেষ প্রস্তুত ও হালনাগাদকৃত অফিশিয়াল রেকর্ডসমূহ</p>
            </div>
            <button
              onClick={() => onNavigateToTab('memo-register')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>সকল নথি দেখুন</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">ধরন</th>
                  <th className="py-2.5 px-3">নথি / স্মারক নম্বর</th>
                  <th className="py-2.5 px-3">বিষয় ও শিরোনাম</th>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.slice(0, 6).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getDocTypeBadge(doc.docType)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {doc.documentNumber || doc.memoNumber || '—'}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-xs truncate">
                      <div className="truncate font-semibold">{doc.title}</div>
                      {doc.recipientName && (
                        <div className="text-[10px] text-slate-500 truncate">প্রাপক: {doc.recipientName}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      {doc.documentDate}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => onSelectDocForPreview(doc)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="প্রিন্ট / প্রিভিউ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectDocForEdit(doc)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="সম্পাদনা"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      কোনো দাপ্তরিক নথি পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

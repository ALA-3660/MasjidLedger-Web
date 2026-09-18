import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Inbox,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Printer,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Folder,
  GitCommit,
  BarChart3,
  Bookmark,
  FileCheck,
} from 'lucide-react';
import {
  OfficialDocument,
  OfficialDocumentType,
  OfficialDocumentStatus,
} from '../../types/officialDocumentTypes';
import { Mosque, CommitteeTerm, CommitteeMeeting, MeetingResolution } from '../../types';
import { api } from '../../lib/api';
import { OfficialDocumentDashboard } from './OfficialDocumentDashboard';
import { OfficialDocumentListView } from './OfficialDocumentListView';
import { OfficialDocumentFormModal } from './OfficialDocumentFormModal';
import { OfficialDocumentPrintView } from './OfficialDocumentPrintView';
import { GlobalAttachmentManager } from './GlobalAttachmentManager';
import { OfficialDocumentTrackingView } from './OfficialDocumentTrackingView';
import { OfficialDocumentReportsView } from './OfficialDocumentReportsView';

interface OfficialDocumentManagementViewProps {
  mosque?: Mosque | null;
  committeeTerms?: CommitteeTerm[];
  committeeMeetings?: CommitteeMeeting[];
  resolutions?: MeetingResolution[];
  members?: any[];
  staffList?: any[];
}

export const OfficialDocumentManagementView: React.FC<OfficialDocumentManagementViewProps> = ({
  mosque,
  committeeTerms = [],
  committeeMeetings = [],
  resolutions = [],
  members = [],
  staffList = [],
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    draftCount: 0,
    pendingApprovalCount: 0,
    approvedCount: 0,
    sentCount: 0,
    replyAwaitedCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    urgentCount: 0,
    byType: {},
    byStatus: {},
  });
  const [loading, setLoading] = useState(false);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<OfficialDocument | null>(null);
  const [createDocType, setCreateDocType] = useState<OfficialDocumentType>('NOTICE');
  const [previewDoc, setPreviewDoc] = useState<OfficialDocument | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docs, statsData] = await Promise.all([
        api.getOfficialDocuments(),
        api.getOfficialDocumentStats(),
      ]);
      setDocuments(docs || []);
      setStats(statsData || {});
    } catch (err) {
      console.error('Failed to load official documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = (type: OfficialDocumentType = 'NOTICE') => {
    setDocumentToEdit(null);
    setCreateDocType(type);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (doc: OfficialDocument) => {
    setDocumentToEdit(doc);
    setCreateDocType(doc.docType);
    setShowFormModal(true);
  };

  const handleSaveDocument = async (data: Partial<OfficialDocument>) => {
    if (documentToEdit) {
      await api.updateOfficialDocument(documentToEdit.id, data);
    } else {
      await api.createOfficialDocument(data);
    }
    await loadData();
  };

  const handleDeleteDocument = async (id: string) => {
    await api.deleteOfficialDocument(id);
    await loadData();
  };

  const handleUpdateStatus = async (id: string, status: OfficialDocumentStatus, notes?: string) => {
    await api.updateOfficialDocumentStatus(id, status, notes);
    await loadData();
  };

  // Sub-Navigation Tabs
  const TABS = [
    { id: 'dashboard', label: '📊 ড্যাশবোর্ড', badge: stats.total },
    { id: 'notices', label: '📢 নোটিশ ও বিজ্ঞপ্তি', badge: stats.byType?.NOTICE },
    { id: 'applications', label: '📝 দরখাস্ত ও আবেদন', badge: stats.byType?.APPLICATION },
    { id: 'announcements', label: '📣 ঘোষণা', badge: stats.byType?.ANNOUNCEMENT },
    { id: 'outgoing', label: '📤 প্রেরিত পত্র (স্মারক)', badge: stats.byType?.OUTGOING_LETTER },
    { id: 'incoming', label: '📥 প্রাপ্ত পত্র (ইনকামিং)', badge: stats.byType?.INCOMING_LETTER },
    { id: 'orders', label: '🏢 অফিস আদেশ', badge: stats.byType?.OFFICE_ORDER },
    { id: 'certificates', label: '📄 প্রত্যয়নপত্র ও সনদ', badge: stats.byType?.CERTIFICATE },
    { id: 'recommendations', label: '📜 সুপারিশপত্র', badge: stats.byType?.RECOMMENDATION },
    { id: 'memo-register', label: '🔖 স্মারক ও নথি রেজিস্টার', badge: null },
    { id: 'attachments', label: '🗂️ নথি ও সংযুক্তি', badge: null },
    { id: 'tracking', label: '🔗 নথি অনুসরণ ও কার্যপ্রবাহ', badge: stats.inProgressCount || null },
    { id: 'reports', label: '🖨️ রিপোর্ট ও এক্সপোর্ট', badge: null },
  ];

  return (
    <div className="space-y-5">
      
      {/* Top Sub-Navigation Bar */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex items-center space-x-1 min-w-max">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== null && tab.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'dashboard' && (
        <OfficialDocumentDashboard
          documents={documents}
          stats={stats}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onNavigateToTab={setActiveTab}
        />
      )}

      {activeTab === 'notices' && (
        <OfficialDocumentListView
          title="📢 নোটিশ ও বিজ্ঞপ্তি (Notices & Circulars)"
          subtitle="পরিচালনা পরিষদ সভা, সাধারণ সভা, ঈদ ও জরুরি বিজ্ঞপ্তি জারি ও রেজিস্ট্রি"
          docTypeFilter="NOTICE"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'applications' && (
        <OfficialDocumentListView
          title="📝 দরখাস্ত ও আবেদনপত্র (Applications & Petitions)"
          subtitle="ইমাম-মুয়াজ্জিন-স্টাফদের ছুটি, অনুদান, পদত্যাগ ও অন্যান্য আবেদনপত্র"
          docTypeFilter="APPLICATION"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'announcements' && (
        <OfficialDocumentListView
          title="📣 সাধারণ ঘোষণা (Announcements)"
          subtitle="জুমার জামাতের ঘোষণা, ধর্মীয় অনুষ্ঠান, তারাবি ও মুসল্লিদের সাধারণ বিজ্ঞপ্তি"
          docTypeFilter="ANNOUNCEMENT"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'outgoing' && (
        <OfficialDocumentListView
          title="📤 প্রেরিত পত্র ও স্মারকপত্র (Outgoing Letters & Memos)"
          subtitle="উপজেলা প্রশাসন, ইসলামিক ফাউন্ডেশন, ওয়াকফ প্রশাসক ও ব্যাংকে প্রেরিত স্মারকপত্র"
          docTypeFilter="OUTGOING_LETTER"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'incoming' && (
        <OfficialDocumentListView
          title="📥 প্রাপ্ত পত্র ও ইনকামিং রেজিস্ট্রি (Incoming Letters & Records)"
          subtitle="সরকারি দপ্তর, মন্ত্রণালয়, ওয়াকফ ও বিভিন্ন সংগঠন হতে প্রাপ্ত অফিসিয়াল পত্র"
          docTypeFilter="INCOMING_LETTER"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'orders' && (
        <OfficialDocumentListView
          title="🏢 অফিস আদেশ (Office Orders)"
          subtitle="মসজিদের কর্মচারীদের দায়িত্ব বণ্টন, পরিচ্ছন্নতা শিডিউল ও প্রশাসনিক নির্দেশনা"
          docTypeFilter="OFFICE_ORDER"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'certificates' && (
        <OfficialDocumentListView
          title="📄 প্রত্যয়নপত্র ও প্রশংসাপত্র (Certificates & Testimonials)"
          subtitle="কমিটি সদস্যপদ, ইমামতি অভিজ্ঞতা সনদ, হিফজ সনদ ও প্রশংসাপত্র প্রদান"
          docTypeFilter="CERTIFICATE"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'recommendations' && (
        <OfficialDocumentListView
          title="📜 সুপারিশপত্র (Recommendation Letters)"
          subtitle="দরিদ্র-মেধাবী শিক্ষার্থীদের বৃত্তি, অনুদান ও চিকিৎসার জন্য ট্রাস্টে সুপারিশপত্র"
          docTypeFilter="RECOMMENDATION"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'memo-register' && (
        <OfficialDocumentListView
          title="🔖 স্মারক ও নথি রেজিস্টার (Master Memo & Dispatch Register)"
          subtitle="সমস্ত দাপ্তরিক নথির ক্রমিক, স্মারক নম্বর ও বিস্তারিত রেজিস্ট্রি খাতা"
          docTypeFilter="ALL"
          documents={documents}
          onOpenCreateModal={handleOpenCreateModal}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onDeleteDocument={handleDeleteDocument}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'attachments' && (
        <GlobalAttachmentManager />
      )}

      {activeTab === 'tracking' && (
        <OfficialDocumentTrackingView
          documents={documents}
          onSelectDocForPreview={setPreviewDoc}
          onSelectDocForEdit={handleOpenEditModal}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {activeTab === 'reports' && (
        <OfficialDocumentReportsView
          documents={documents}
          mosque={mosque}
          onSelectDocForPreview={setPreviewDoc}
        />
      )}

      {/* Form Modal (Create / Edit) */}
      <OfficialDocumentFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveDocument}
        documentToEdit={documentToEdit}
        initialDocType={createDocType}
        mosque={mosque}
        committeeTerms={committeeTerms}
        committeeMeetings={committeeMeetings}
        resolutions={resolutions}
        members={members}
        staffList={staffList}
      />

      {/* Print / PDF Modal */}
      {previewDoc && (
        <OfficialDocumentPrintView
          document={previewDoc}
          mosque={mosque}
          onClose={() => setPreviewDoc(null)}
        />
      )}

    </div>
  );
};

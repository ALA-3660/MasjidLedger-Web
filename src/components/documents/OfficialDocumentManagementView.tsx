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
  Menu,
  X,
  ShieldCheck,
  FolderOpen
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  // Sub-Navigation Tabs (Exact 14 Sections in Required Order)
  const TABS = [
    { id: 'dashboard', label: '📊 ড্যাশবোর্ড', subLabel: 'পরিসংখ্যান ও সামগ্রিক চিত্র', badge: stats.total },
    { id: 'all-documents', label: '📄 দাপ্তরিক নথি', subLabel: 'সকল নথির মাস্টার তালিকা', badge: stats.total },
    { id: 'notices', label: '📢 নোটিশ ও বিজ্ঞপ্তি', subLabel: 'সভা ও সাধারণ বিজ্ঞপ্তি', badge: stats.byType?.NOTICE },
    { id: 'announcements', label: '📣 ঘোষণা', subLabel: 'জুমার ঘোষণা ও গণবিজ্ঞপ্তি', badge: stats.byType?.ANNOUNCEMENT },
    { id: 'applications', label: '📝 দরখাস্ত ও আবেদন', subLabel: 'স্টাফ ও সাধারণ আবেদন', badge: stats.byType?.APPLICATION },
    { id: 'outgoing', label: '📤 প্রেরিত পত্র', subLabel: 'বহির্গামী স্মারক ও চিঠি', badge: stats.byType?.OUTGOING_LETTER },
    { id: 'incoming', label: '📥 প্রাপ্ত পত্র', subLabel: 'অভ্যন্তরীণ ও ইনকামিং চিঠি', badge: stats.byType?.INCOMING_LETTER },
    { id: 'orders', label: '🏢 অফিস আদেশ', subLabel: 'প্রশাসনিক আদেশ ও দায়িত্ব', badge: stats.byType?.OFFICE_ORDER },
    { id: 'certificates', label: '📄 প্রত্যয়নপত্র ও সনদ', subLabel: 'অভিজ্ঞতা ও প্রত্যয়নপত্র', badge: stats.byType?.CERTIFICATE },
    { id: 'recommendations', label: '📜 সুপারিশপত্র', subLabel: 'বৃত্তি ও সহায়তা সুপারিশ', badge: stats.byType?.RECOMMENDATION },
    { id: 'memo-register', label: '🔖 স্মারক ও নথি রেজিস্টার', subLabel: 'স্মারক নম্বর ডেসপ্যাচ', badge: null },
    { id: 'attachments', label: '🗂️ নথি ও সংযুক্তি', subLabel: 'কেন্দ্রীয় ফাইল আর্কাইভ', badge: null },
    { id: 'tracking', label: '🔗 নথি অনুসরণ ও কার্যপ্রবাহ', subLabel: 'অনুমোদন ও অগ্রগতি', badge: stats.inProgressCount || null },
    { id: 'reports', label: '🖨️ রিপোর্ট ও রেজিস্টার', subLabel: 'প্রিন্ট ও রেজিস্ট্রি বহি', badge: null },
  ];

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-siliguri">
      
      {/* Mobile Bar */}
      <div className="lg:hidden bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between font-siliguri">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-blue-50 text-blue-800 rounded-xl font-bold">
            📢
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">{currentTab.label}</div>
            <div className="text-[11px] text-slate-500 font-tiro">{currentTab.subLabel}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>মেনু ({TABS.length})</span>
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Two-Column Responsive Layout: Vertical Secondary Sidebar on Left, Content on Right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Vertical Secondary Sidebar */}
        <aside
          className={`
            fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-0
            w-72 lg:w-64 bg-white border-r lg:border border-slate-200 lg:rounded-3xl
            p-4 shadow-xl lg:shadow-xs flex flex-col justify-between font-siliguri shrink-0
            transition-transform duration-200 ease-in-out
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  📢
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 leading-tight">
                    নোটিশ ও যোগাযোগ
                  </h3>
                  <p className="text-[10px] text-slate-500 font-tiro">
                    দাপ্তরিক যোগাযোগ ও নথি রেজিস্টার
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Button */}
            <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-200/60">
              <button
                type="button"
                onClick={() => {
                  handleOpenCreateModal('NOTICE');
                  setIsMobileOpen(false);
                }}
                className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ নতুন দাপ্তরিক নথি</span>
              </button>
            </div>

            {/* 14 Navigation Items */}
            <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] lg:max-h-none pr-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center justify-between group transition-all cursor-pointer
                      ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-bold'
                          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-1">
                      <div className="truncate">
                        <div className="truncate font-siliguri leading-snug">{tab.label}</div>
                        {tab.subLabel && (
                          <div
                            className={`text-[10px] truncate font-tiro ${
                              isActive ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {tab.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {tab.badge !== undefined && tab.badge !== null && tab.badge > 0 && (
                      <span
                        className={`
                          text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-baloo
                          ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-100 text-blue-800'
                          }
                        `}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-tiro space-y-1">
            <div className="flex items-center space-x-1 text-slate-700 font-semibold font-siliguri">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>স্মারক নম্বর ও ডিজিটাল ড্রাফট সিঙ্ক</span>
            </div>
            <p className="leading-tight">
              অফিসিয়াল নথি, সভার নোটিশ ও প্রত্যয়নপত্র স্বয়ংক্রিয়ভাবে আর্কাইভ করা হয়।
            </p>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="flex-1 w-full min-w-0 space-y-6">
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

          {activeTab === 'all-documents' && (
            <OfficialDocumentListView
              title="📄 সকল দাপ্তরিক নথি (All Official Documents)"
              subtitle="মসজিদের সমস্ত নোটিশ, আবেদন, আদেশ, প্রত্যয়নপত্র ও পত্রাবলীর সমন্বিত তালিকা"
              docTypeFilter="ALL"
              documents={documents}
              onOpenCreateModal={handleOpenCreateModal}
              onSelectDocForPreview={setPreviewDoc}
              onSelectDocForEdit={handleOpenEditModal}
              onDeleteDocument={handleDeleteDocument}
              onUpdateStatus={handleUpdateStatus}
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
        </main>
      </div>

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

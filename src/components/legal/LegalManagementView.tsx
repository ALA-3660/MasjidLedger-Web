import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Landmark,
  Layers,
  Users2,
  ShieldCheck,
  Calendar,
  FileSpreadsheet,
  FolderOpen,
  FileText,
  Printer,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  UserCheck,
  ExternalLink,
  ChevronRight,
  X,
  FileCheck,
  Download
} from 'lucide-react';
import {
  LegalCase,
  LegalCourt,
  LegalParty,
  LegalLawyer,
  LegalHearing,
  LegalAction,
  LegalOrder,
  LegalDashboardStats,
  MosqueProperty,
  CentralDocument,
  Mosque,
  User
} from '../../types';
import { Language, formatDate } from '../../lib/i18n';
import { toBanglaNumber } from '../CommitteeView';
import { AssetWaqfSubSection } from '../AssetWaqfSecondarySidebar';

interface LegalManagementViewProps {
  activeSection: AssetWaqfSubSection;
  onSelectSection: (section: AssetWaqfSubSection) => void;
  properties: MosqueProperty[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
}

export const LegalManagementView: React.FC<LegalManagementViewProps> = ({
  activeSection,
  onSelectSection,
  properties,
  currentMosque,
  currentUser,
  language = 'bn',
}) => {
  const isBn = language === 'bn';
  const mosqueId = currentMosque?.id || 'mosque-default';

  // Data states
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [courts, setCourts] = useState<LegalCourt[]>([]);
  const [parties, setParties] = useState<LegalParty[]>([]);
  const [lawyers, setLawyers] = useState<LegalLawyer[]>([]);
  const [hearings, setHearings] = useState<LegalHearing[]>([]);
  const [actions, setActions] = useState<LegalAction[]>([]);
  const [orders, setOrders] = useState<LegalOrder[]>([]);
  const [stats, setStats] = useState<LegalDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Selected for view/details
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [isCaseFormOpen, setIsCaseFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<LegalCase | null>(null);

  // Quick modals for adding sub-records
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isLawyerModalOpen, setIsLawyerModalOpen] = useState(false);
  const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesRes, courtsRes, hearingsRes, actionsRes, ordersRes, partiesRes, lawyersRes, statsRes] = await Promise.all([
        fetch('/api/v1/legal/cases'),
        fetch('/api/v1/legal/courts'),
        fetch('/api/v1/legal/hearings'),
        fetch('/api/v1/legal/actions'),
        fetch('/api/v1/legal/orders'),
        fetch('/api/v1/legal/parties'),
        fetch('/api/v1/legal/lawyers'),
        fetch('/api/v1/legal/stats'),
      ]);

      if (casesRes.ok) {
        const d = await casesRes.json();
        setCases(d.data || []);
      }
      if (courtsRes.ok) {
        const d = await courtsRes.json();
        setCourts(d.data || []);
      }
      if (hearingsRes.ok) {
        const d = await hearingsRes.json();
        setHearings(d.data || []);
      }
      if (actionsRes.ok) {
        const d = await actionsRes.json();
        setActions(d.data || []);
      }
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.data || []);
      }
      if (partiesRes.ok) {
        const d = await partiesRes.json();
        setParties(d.data || []);
      }
      if (lawyersRes.ok) {
        const d = await lawyersRes.json();
        setLawyers(d.data || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data || null);
      }
    } catch (err) {
      console.error('Failed to load legal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mosqueId]);

  // Handle Save Case
  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const url = editingCase ? `/api/v1/legal/cases/${editingCase.id}` : '/api/v1/legal/cases';
      const method = editingCase ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsCaseFormOpen(false);
        setEditingCase(null);
        setFormData({});
        setFormError(null);
        fetchData();
      } else {
        const err = await res.json();
        setFormError(err.error?.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      setFormError(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    }
  };

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      if (activeSection === 'legal_land_disputes') {
        if (c.caseType !== 'LAND_DISPUTE' && c.caseType !== 'PROPERTY_DISPUTE' && !c.relatedPropertyId) {
          return false;
        }
      }
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && c.caseType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.caseTitle?.toLowerCase().includes(q) ||
          c.caseNumber?.toLowerCase().includes(q) ||
          c.caseId?.toLowerCase().includes(q) ||
          c.subject?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cases, activeSection, statusFilter, typeFilter, searchQuery]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">চলমান (Active)</span>;
      case 'HEARING':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">শুনানি পর্যায় (Hearing)</span>;
      case 'STAYED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">স্থগিতাদেশ (Stayed)</span>;
      case 'DISPOSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">নিষ্পত্তি (Disposed)</span>;
      case 'APPEAL':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">আপিল (Appeal)</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">সমাপ্ত (Closed)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{st}</span>;
    }
  };

  const getPriorityBadge = (pr: string) => {
    switch (pr) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">জরুরি</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">উচ্চ</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white">সাধারণ</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-400 text-white">নিম্ন</span>;
    }
  };

  return (
    <div className="space-y-6 font-siliguri">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-200 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs border border-amber-500/30">
              <Scale className="w-3.5 h-3.5" />
              <span>আইনি ও সম্পত্তি বিরোধ সাব-সিস্টেম</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              {activeSection === 'legal_land_disputes' ? '🏞️ জমি ও সম্পত্তি বিরোধ ব্যবস্থাপনা' :
               activeSection === 'legal_courts' ? '🏛️ আদালত ও বিচারিক তথ্য' :
               activeSection === 'legal_parties' ? '👥 সংশ্লিষ্ট পক্ষ ও প্রতিপক্ষ' :
               activeSection === 'legal_lawyers' ? '⚖️ আইনজীবী ও আইনি প্রতিনিধি' :
               activeSection === 'legal_hearings' ? '📅 শুনানি ও পরবর্তী তারিখ' :
               activeSection === 'legal_orders' ? '📜 আদেশ, রায় ও সিদ্ধান্ত' :
               activeSection === 'legal_documents' ? '📁 সংশ্লিষ্ট নথিপত্র ও প্রমাণাদি' :
               activeSection === 'legal_reports' ? '📊 আইনি বিষয় ও মামলা রিপোর্ট' :
               activeSection === 'legal_register' ? '🖨️ মামলা রেজিস্টার ও প্রিন্ট' :
               '⚖️ মামলা ও আইনি বিষয় ব্যবস্থাপনা'}
            </h2>
            <p className="text-xs md:text-sm text-amber-100/80 font-tiro max-w-2xl">
              ওয়াকফ জমিজমা, স্বত্ব বিরোধ, দলিল ও আদালতের মামলাসমূহের প্রামাণ্য ট্র্যাকিং।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setEditingCase(null);
                setFormData({
                  caseType: activeSection === 'legal_land_disputes' ? 'LAND_DISPUTE' : 'LAND_DISPUTE',
                  status: 'ACTIVE',
                  priority: 'HIGH',
                  filingDate: new Date().toISOString().split('T')[0],
                });
                setIsCaseFormOpen(true);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন মামলা নথিভুক্ত</span>
            </button>
            <button
              onClick={() => onSelectSection('legal_register')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 border border-white/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>রেজিস্টার প্রিন্ট</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] text-slate-500 font-medium">মোট মামলা</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{toBanglaNumber(stats.totalCases)}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">নথিভুক্ত সর্বমোট</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
            <div className="text-[11px] text-blue-700 font-medium">চলমান মামলা</div>
            <div className="text-xl font-bold text-blue-800 mt-1">{toBanglaNumber(stats.activeCases)}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">আদালতে বিচারাধীন</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <div className="text-[11px] text-amber-700 font-medium">আসন্ন শুনানি</div>
            <div className="text-xl font-bold text-amber-800 mt-1">{toBanglaNumber(stats.upcomingHearingsCount)}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">নির্ধারিত ধার্য তারিখ</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
            <div className="text-[11px] text-rose-700 font-medium">জমি বিরোধ মামলা</div>
            <div className="text-xl font-bold text-rose-800 mt-1">{toBanglaNumber(stats.landDisputeCasesCount)}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">ওয়াকফ সম্পত্তি কেন্দ্রিক</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-xs">
            <div className="text-[11px] text-purple-700 font-medium">স্থগিতাদেশ (Stay)</div>
            <div className="text-xl font-bold text-purple-800 mt-1">{toBanglaNumber(stats.stayedCases)}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">স্ট্যাটাস-কো / ইনজাংশন</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <div className="text-[11px] text-emerald-700 font-medium">নিষ্পত্তিকৃত</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">{toBanglaNumber(stats.disposedCases)}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">রায় / ডিক্রি প্রাপ্ত</div>
          </div>
        </div>
      )}

      {/* Main Content Area based on activeSection */}
      {activeSection === 'legal_register' ? (
        /* A4 Printable Register View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800">🖨️ আইনি মামলা ও জমি বিরোধ রেজিস্টার (A4 Printable)</h3>
              <p className="text-xs text-slate-500 font-tiro">ক্যানোনিকাল রেজিস্টার ফরম্যাটে সকল মামলার সামগ্রিক বিবরণ</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                  <th className="p-2.5">মামলা আইডি</th>
                  <th className="p-2.5">মামলা নম্বর ও শিরোনাম</th>
                  <th className="p-2.5">আদালত</th>
                  <th className="p-2.5">সংশ্লিষ্ট সম্পত্তি</th>
                  <th className="p-2.5">প্রতিপক্ষ</th>
                  <th className="p-2.5">আইনজীবী</th>
                  <th className="p-2.5">পরবর্তী শুনানি</th>
                  <th className="p-2.5">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">কোনো মামলা নথিভুক্ত নেই।</td>
                  </tr>
                ) : (
                  cases.map(c => {
                    const prop = c.relatedPropertyId ? properties.find(p => p.id === c.relatedPropertyId) : null;
                    const court = c.courtId ? courts.find(crt => crt.id === c.courtId) : null;
                    const caseParties = parties.filter(p => p.caseId === c.id);
                    const caseLawyers = lawyers.filter(l => l.caseId === c.id);
                    const upcomingHearing = hearings.find(h => h.caseId === c.id && h.hearingDate >= new Date().toISOString().split('T')[0]);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-[11px] font-bold text-amber-900">{c.caseId}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">{c.caseTitle}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{c.caseNumber}</div>
                        </td>
                        <td className="p-2.5 text-slate-700">{court?.courtName || c.courtName || '-'}</td>
                        <td className="p-2.5 text-slate-700">{prop ? `${prop.nameBn || prop.name} (${prop.propertyCode})` : '-'}</td>
                        <td className="p-2.5 text-slate-700">{caseParties.map(p => p.name).join(', ') || '-'}</td>
                        <td className="p-2.5 text-slate-700">{caseLawyers.map(l => l.name).join(', ') || '-'}</td>
                        <td className="p-2.5 text-amber-700 font-semibold">{upcomingHearing?.hearingDate || '-'}</td>
                        <td className="p-2.5">{getStatusBadge(c.status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeSection === 'legal_courts' ? (
        /* Courts Directory */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800">🏛️ আদালত ও বিচারিক তথ্য ডিরেক্টরি</h3>
              <p className="text-xs text-slate-500 font-tiro">মামলা দায়েরকৃত সহকারী জজ, যুগ্ম জেলা জজ ও ট্রাইব্যুনাল তথ্য</p>
            </div>
            <button
              onClick={() => {
                setFormData({});
                setIsCourtModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন আদালত যুক্ত</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400">কোনো আদালত তথ্য সংরক্ষিত নেই।</div>
            ) : (
              courts.map(crt => (
                <div key={crt.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{crt.courtName}</div>
                      <div className="text-[11px] text-amber-800 font-mono font-semibold">{crt.courtId}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">{crt.courtType}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <div>জেলা: <span className="font-medium">{crt.district || 'অনির্ধারিত'}</span></div>
                    {crt.address && <div>ঠিকানা: {crt.address}</div>}
                    {crt.notes && <div className="text-slate-500 italic text-[11px]">মন্তব্য: {crt.notes}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeSection === 'legal_hearings' ? (
        /* Hearings View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800">📅 শুনানি ও পরবর্তী ধার্য তারিখ</h3>
              <p className="text-xs text-slate-500 font-tiro">আদালতের শুনানির সময়সূচি, ফলাফল ও পরবর্তী করণীয়</p>
            </div>
            <button
              onClick={() => {
                setFormData({ hearingDate: new Date().toISOString().split('T')[0] });
                setIsHearingModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>শুনানির রেকর্ড যুক্ত</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {hearings.length === 0 ? (
              <div className="p-8 text-center text-slate-400">কোনো শুনানি রেকর্ড সংরক্ষিত নেই।</div>
            ) : (
              hearings.map(h => {
                const c = cases.find(item => item.id === h.caseId);
                const isUpcoming = h.hearingDate >= new Date().toISOString().split('T')[0];

                return (
                  <div key={h.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isUpcoming ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {h.hearingDate}
                        </span>
                        <span className="font-bold text-slate-800 text-sm">{c?.caseTitle || 'মামলা'}</span>
                        <span className="text-xs text-slate-500 font-mono">({c?.caseNumber})</span>
                      </div>
                      <div className="text-xs text-slate-600">উদ্দেশ্য: <span className="font-medium">{h.purpose}</span></div>
                      {h.outcome && <div className="text-xs text-emerald-700">ফলাফল: {h.outcome}</div>}
                      {h.nextDate && <div className="text-xs text-amber-800 font-semibold">পরবর্তী ধার্য তারিখ: {h.nextDate}</div>}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>আইডি: <span className="font-mono">{h.hearingId}</span></div>
                      {h.courtName && <div>আদালত: {h.courtName}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Default Cases & Land Disputes List */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center space-x-3 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="মামলা নম্বর, শিরোনাম বা বিষয় খুঁজুন..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">সকল স্ট্যাটাস</option>
                <option value="ACTIVE">চলমান (Active)</option>
                <option value="HEARING">শুনানি (Hearing)</option>
                <option value="STAYED">স্থগিতাদেশ (Stayed)</option>
                <option value="DISPOSED">নিষ্পত্তি (Disposed)</option>
                <option value="CLOSED">সমাপ্ত (Closed)</option>
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">সকল ধরন</option>
                <option value="LAND_DISPUTE">জমি বিরোধ</option>
                <option value="PROPERTY_DISPUTE">সম্পত্তি বিরোধ</option>
                <option value="OWNERSHIP_TITLE">মালিকানা/স্বত্ব বিরোধ</option>
                <option value="WAQF_DISPUTE">ওয়াকফ বিরোধ</option>
                <option value="CIVIL_SUIT">দেওয়ানি মামলা</option>
                <option value="CRIMINAL_CASE">ফৌজদারি মামলা</option>
              </select>
            </div>
          </div>

          {/* Cases Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                  <th className="p-3">মামলা আইডি</th>
                  <th className="p-3">মামলা নম্বর ও শিরোনাম</th>
                  <th className="p-3">ধরন</th>
                  <th className="p-3">আদালত</th>
                  <th className="p-3">সংশ্লিষ্ট সম্পত্তি</th>
                  <th className="p-3">পরবর্তী শুনানি</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      কোনো মামলা পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredCases.map(c => {
                    const prop = c.relatedPropertyId ? properties.find(p => p.id === c.relatedPropertyId) : null;
                    const court = c.courtId ? courts.find(crt => crt.id === c.courtId) : null;

                    return (
                      <tr key={c.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-900">{c.caseId}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 text-sm flex items-center space-x-1.5">
                            <span>{c.caseTitle}</span>
                            {getPriorityBadge(c.priority)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">নং: {c.caseNumber} • দায়ের: {c.filingDate}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {c.caseType === 'LAND_DISPUTE' ? 'জমি বিরোধ' :
                             c.caseType === 'PROPERTY_DISPUTE' ? 'সম্পত্তি বিরোধ' :
                             c.caseType === 'OWNERSHIP_TITLE' ? 'স্বত্ব বিরোধ' :
                             c.caseType === 'WAQF_DISPUTE' ? 'ওয়াকফ বিরোধ' :
                             c.caseType === 'CIVIL_SUIT' ? 'দেওয়ানি' : c.caseType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">{court?.courtName || c.courtName || '-'}</td>
                        <td className="p-3 text-slate-700">
                          {prop ? (
                            <div className="font-medium text-amber-950">
                              {prop.nameBn || prop.name}
                              <span className="text-[10px] text-slate-500 block font-mono">{prop.propertyCode}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-3">
                          {c.upcomingHearingDate ? (
                            <div className="text-amber-800 font-semibold">{c.upcomingHearingDate}</div>
                          ) : (
                            <span className="text-slate-400">নির্ধারিত নেই</span>
                          )}
                        </td>
                        <td className="p-3">{getStatusBadge(c.status)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setSelectedCase(c)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
                              title="বিস্তারিত দেখুন"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingCase(c);
                                setFormData({ ...c });
                                setIsCaseFormOpen(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-600 hover:text-blue-800 cursor-pointer"
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
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
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 text-amber-900">{selectedCase.caseId}</span>
                  {getStatusBadge(selectedCase.status)}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-1">{selectedCase.caseTitle}</h3>
                <p className="text-xs text-slate-500 font-mono">মামলা নং: {selectedCase.caseNumber} • দায়েরের তারিখ: {selectedCase.filingDate}</p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                <div className="font-bold text-slate-700 text-sm border-b border-slate-200 pb-1">মামলার মূল তথ্য</div>
                <div>বিষয়: <span className="font-medium text-slate-800">{selectedCase.subject}</span></div>
                <div>আদালত: <span className="font-medium text-slate-800">{selectedCase.courtName || '-'}</span></div>
                <div>অগ্রাধিকার: <span className="font-medium text-slate-800">{selectedCase.priority}</span></div>
                {selectedCase.caseDescription && (
                  <div className="pt-2 text-slate-600 font-tiro">{selectedCase.caseDescription}</div>
                )}
              </div>

              {selectedCase.landDisputeDetails && (
                <div className="bg-amber-50/40 p-4 rounded-2xl space-y-2 border border-amber-200/60">
                  <div className="font-bold text-amber-900 text-sm border-b border-amber-200/60 pb-1">🏞️ জমি বিরোধ বিবরণ</div>
                  <div>মৌজা: <span className="font-medium">{selectedCase.landDisputeDetails.mouza || '-'}</span></div>
                  <div>দাগ নম্বর: <span className="font-medium">{selectedCase.landDisputeDetails.dagNumber || '-'}</span></div>
                  <div>খতিয়ান: <span className="font-medium">{selectedCase.landDisputeDetails.khatianNumber || '-'}</span></div>
                  <div>জমির পরিমাণ: <span className="font-medium">{selectedCase.landDisputeDetails.landArea || '-'}</span></div>
                  <div>প্রতিপক্ষ: <span className="font-medium text-rose-800">{selectedCase.landDisputeDetails.opponent || '-'}</span></div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Create/Edit Modal */}
      {isCaseFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {editingCase ? 'মামলার তথ্য সম্পাদনা' : 'নতুন মামলা নথিভুক্তকরণ'}
              </h3>
              <button
                onClick={() => setIsCaseFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCase} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">মামলার শিরোনাম *</label>
                  <input
                    type="text"
                    required
                    value={formData.caseTitle || ''}
                    onChange={e => setFormData({ ...formData, caseTitle: e.target.value })}
                    placeholder="যেমন: ওয়াকফ দোকান দখল বিরোধ মামলা"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">মামলা নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={formData.caseNumber || ''}
                    onChange={e => setFormData({ ...formData, caseNumber: e.target.value })}
                    placeholder="যেমন: দেওয়ানি মোকদ্দমা নং ৪৫/২০২৪"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">মামলার ধরন *</label>
                  <select
                    value={formData.caseType || 'LAND_DISPUTE'}
                    onChange={e => setFormData({ ...formData, caseType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="LAND_DISPUTE">জমি বিরোধ (Land Dispute)</option>
                    <option value="PROPERTY_DISPUTE">সম্পত্তি বিরোধ (Property Dispute)</option>
                    <option value="OWNERSHIP_TITLE">মালিকানা/স্বত্ব বিরোধ (Title Suit)</option>
                    <option value="POSSESSION_DISPUTE">দখল সংক্রান্ত বিষয় (Possession Dispute)</option>
                    <option value="WAQF_DISPUTE">ওয়াকফ সংক্রান্ত বিষয় (Waqf Matter)</option>
                    <option value="TENANT_EVICTION">ভাড়াটিয়া উচ্ছেদ (Tenant Eviction)</option>
                    <option value="CIVIL_SUIT">সাধারণ দেওয়ানি মামলা (Civil Suit)</option>
                    <option value="CRIMINAL_CASE">ফৌজদারি মামলা (Criminal Case)</option>
                    <option value="OTHER">অন্যান্য (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">দায়েরের তারিখ</label>
                  <input
                    type="date"
                    value={formData.filingDate || ''}
                    onChange={e => setFormData({ ...formData, filingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">সংশ্লিষ্ট ওয়াকফ সম্পত্তি</label>
                  <select
                    value={formData.relatedPropertyId || ''}
                    onChange={e => setFormData({ ...formData, relatedPropertyId: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">-- সম্পত্তি বাছাই করুন (প্রযোজ্য ক্ষেত্রে) --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.nameBn || p.name} ({p.propertyCode})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">আদালত</label>
                  <select
                    value={formData.courtId || ''}
                    onChange={e => setFormData({ ...formData, courtId: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">-- আদালত বাছাই করুন --</option>
                    {courts.map(crt => (
                      <option key={crt.id} value={crt.id}>{crt.courtName} ({crt.district})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">মামলার সংক্ষিপ্ত বিবরণ</label>
                <textarea
                  rows={3}
                  value={formData.caseDescription || ''}
                  onChange={e => setFormData({ ...formData, caseDescription: e.target.value })}
                  placeholder="মামলার পটভূমি ও সংক্ষিপ্ত বিবরণ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-tiro"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCaseFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

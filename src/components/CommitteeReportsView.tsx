import React, { useState } from 'react';
import {
  FileBarChart,
  Printer,
  Download,
  Users2,
  CalendarCheck,
  Award,
  Shield,
  History,
  Repeat,
  Layers,
  Filter,
  Eye,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { CommitteeTerm, CommitteeMember, CommitteeMeeting, MeetingResolution, SubCommittee, Mosque } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';
import { toBanglaNumber } from './CommitteeView';
import { printElement } from '../lib/printUtils';

interface CommitteeReportsViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  resolutions?: MeetingResolution[];
  subCommittees?: SubCommittee[];
  mosque?: Mosque | null;
  language: Language;
}

type ReportType =
  | 'MEMBER_ROSTER'
  | 'EXECUTIVE_DIRECTORY'
  | 'MEETING_REGISTER'
  | 'RESOLUTION_BOOK'
  | 'ADVISORY_SUMMARY'
  | 'HANDOVER_AUDIT'
  | 'SUBCOMMITTEE_REPORT';

export const CommitteeReportsView: React.FC<CommitteeReportsViewProps> = ({
  terms,
  members,
  meetings,
  resolutions = [],
  subCommittees = [],
  mosque,
  language,
}) => {
  const isBn = language === 'bn';
  const activeTerm = terms.find((t) => t.status === 'ACTIVE') || terms[0];

  const [selectedReport, setSelectedReport] = useState<ReportType>('MEMBER_ROSTER');
  const [selectedTermId, setSelectedTermId] = useState<string>(activeTerm?.id || 'ALL');
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);

  const selectedTerm = terms.find((t) => t.id === selectedTermId);

  // Filter members by term
  const filteredMembers = members.filter((m) => {
    if (selectedTermId === 'ALL') return true;
    return m.termId === selectedTermId || !m.termId;
  });

  const reportsList = [
    {
      id: 'MEMBER_ROSTER' as ReportType,
      title: isBn ? 'কমিটি পূর্ণাঙ্গ পরিচিতি ও সদস্য রেজিস্টার' : 'Complete Committee Member Register',
      desc: isBn ? 'নাম, পদবী, মোবাইল নম্বর, এনআইডি ও রক্তের গ্রুপ সম্বলিত রস্টার।' : 'Comprehensive member profiles with contact details.',
      icon: Users2,
      count: filteredMembers.length,
    },
    {
      id: 'EXECUTIVE_DIRECTORY' as ReportType,
      title: isBn ? 'কার্যনির্বাহী পরিচালনা পর্ষদ ও দায়িত্ব বণ্টন' : 'Executive Leadership & Portfolio Distribution',
      desc: isBn ? 'সভাপতি, সাধারণ সম্পাদক, কোষাধ্যক্ষ ও অন্যান্য কর্মকর্তাদের দায়িত্ব তালিকা।' : 'Executive bureau portfolio responsibilities.',
      icon: Award,
      count: filteredMembers.filter((m) => m.status === 'ACTIVE').length,
    },
    {
      id: 'MEETING_REGISTER' as ReportType,
      title: isBn ? 'মিটিং কার্যবিবরণী ও রেজোলিউশন রেজিস্টার' : 'Meetings & Minutes Register',
      desc: isBn ? 'অনুষ্ঠিত সভার তারিখ, স্থান, আলোচ্যসূচি ও গৃহীত সিদ্ধান্তের তালিকা।' : 'Record of meetings and adopted decisions.',
      icon: CalendarCheck,
      count: meetings.length,
    },
    {
      id: 'RESOLUTION_BOOK' as ReportType,
      title: isBn ? 'অফিসিয়াল রেজোলিউশন বই ও বাস্তবায়ন' : 'Official Resolution Book',
      desc: isBn ? 'সকল রেজোলিউশনের রেফারেন্স নম্বর, বাস্তবায়নকারী ও অগ্রগতি রিপোর্ট।' : 'Detailed resolution register and progress.',
      icon: FileBarChart,
      count: resolutions.length,
    },
    {
      id: 'SUBCOMMITTEE_REPORT' as ReportType,
      title: isBn ? 'সাব-কমিটি ও বিশেষ উইং বিবরণী' : 'Sub-Committees & Special Wings',
      desc: isBn ? 'নির্মাণ, রমজান ও শিক্ষা উপকমিটির আহ্বায়ক ও সদস্য তালিকা।' : 'Specialized sub-committees and member assignments.',
      icon: Layers,
      count: subCommittees.length,
    },
  ];

  const handlePrint = () => {
    printElement('printable-committee-report', {
      title: `কমিটি_প্রতিবেদন_${selectedReport}`,
    });
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (selectedReport === 'MEMBER_ROSTER' || selectedReport === 'EXECUTIVE_DIRECTORY') {
      headers = ['ক্রমিক', 'নাম', 'পদবী', 'ফোন নম্বর', 'এনআইডি', 'রক্তের গ্রুপ', 'স্ট্যাটাস'];
      rows = filteredMembers.map((m, idx) => [
        (idx + 1).toString(),
        m.name,
        m.positionCustomBn || m.position,
        m.phone,
        m.nid || '-',
        m.bloodGroup || '-',
        m.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
      ]);
    } else if (selectedReport === 'MEETING_REGISTER') {
      headers = ['ক্রমিক', 'মিটিং নং', 'স্মারক নং', 'তারিখ', 'স্থান', 'উপস্থিতি'];
      rows = meetings.map((m, idx) => [
        (idx + 1).toString(),
        m.meetingNumber || (idx + 1).toString(),
        m.memoNumber || '-',
        m.date,
        m.location || 'মসজিদ কমপ্লেক্স',
        (m.attendees?.length || m.membersPresent?.length || 0).toString(),
      ]);
    } else if (selectedReport === 'RESOLUTION_BOOK') {
      headers = ['রেজোলিউশন নং', 'শিরোনাম', 'তারিখ', 'বাস্তবায়নকারী', 'স্ট্যাটাস'];
      rows = resolutions.map((r) => [
        r.resolutionNumber,
        r.title,
        r.resolutionDate,
        r.responsiblePersonName || '-',
        r.status,
      ]);
    }

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MasjidLedger_Committee_${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <FileBarChart className="w-5 h-5 text-blue-600" />
              <span>{isBn ? 'কমিটি কেন্দ্রীয় রিপোর্টিং ও এক্সপোর্ট সেন্টার' : 'Committee Reports & Export Center'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn
                ? 'সদস্য তালিকা, কার্যবিবরণী, রেজোলিউশন বই এবং দায়িত্ব হস্তান্তর সংক্রান্ত প্রাতিষ্ঠানিক প্রতিবেদন।'
                : 'Generate print-ready A4 reports and Excel/CSV spreadsheets.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-emerald-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'এক্সেল / CSV এক্সপোর্ট' : 'Export Excel/CSV'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{isBn ? 'প্রিন্ট / PDF ডাউনলোড' : 'Print / Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Term and Options Selector */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-600">{isBn ? 'কমিটির মেয়াদ:' : 'Term:'}</span>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="ALL">{isBn ? 'সকল মেয়াদ (All Terms)' : 'All Terms'}</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status === 'ACTIVE' ? 'সক্রিয়' : 'সমাপ্ত'})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeLetterhead}
              onChange={(e) => setIncludeLetterhead(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700 font-medium">{isBn ? 'মসজিদের অফিশিয়াল প্যাড/লেটারহেড যুক্ত করুন' : 'Include Mosque Letterhead'}</span>
          </label>
        </div>
      </div>

      {/* Report Types Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {reportsList.map((rep) => {
          const Icon = rep.icon;
          const isSelected = selectedReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {isBn ? toBanglaNumber(rep.count) : rep.count}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs line-clamp-2">{rep.title}</h4>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{rep.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Printable Report Document Box */}
      <div
        id="printable-committee-report"
        className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-sm max-w-5xl mx-auto font-sans"
      >
        {/* Letterhead Header */}
        {includeLetterhead && (
          <div className="text-center pb-6 border-b-2 border-slate-800 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {mosque?.name || 'মসজিদুল মুমিনীন জামে মসজিদ কমপ্লেক্স'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {mosque?.address || 'মিরপুর-১০, ঢাকা-১২১৬'} • ফোন: {mosque?.phone || '০১৭০০-০০০০০০'}
            </p>
            <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-md text-xs font-bold text-slate-800">
              {reportsList.find((r) => r.id === selectedReport)?.title}
            </div>
            {selectedTerm && (
              <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                মেয়াদকাল: {selectedTerm.title} ({formatDate(selectedTerm.startDate, language)} হতে {formatDate(selectedTerm.endDate, language)})
              </div>
            )}
          </div>
        )}

        {/* Content depending on selected report */}
        {(selectedReport === 'MEMBER_ROSTER' || selectedReport === 'EXECUTIVE_DIRECTORY') && (
          <div className="space-y-4">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="p-2 border-r border-slate-300 w-12 text-center">ক্রম</th>
                  <th className="p-2 border-r border-slate-300">নাম ও পিতার নাম</th>
                  <th className="p-2 border-r border-slate-300">পদবী</th>
                  <th className="p-2 border-r border-slate-300">মোবাইল নম্বর</th>
                  <th className="p-2 border-r border-slate-300">এনআইডি</th>
                  <th className="p-2 border-r border-slate-300">রক্তের গ্রুপ</th>
                  <th className="p-2 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMembers.map((mem, idx) => (
                  <tr key={mem.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                      {isBn ? toBanglaNumber(idx + 1) : idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{mem.name}</div>
                      {mem.fatherName && <div className="text-[10px] text-slate-500">পিতা: {mem.fatherName}</div>}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold text-blue-900">
                      {mem.positionCustomBn || mem.position}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-mono">{mem.phone}</td>
                    <td className="p-2 border-r border-slate-200 font-mono text-[11px]">{mem.nid || '-'}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-rose-700">{mem.bloodGroup || '-'}</td>
                    <td className="p-2 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${mem.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {mem.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'MEETING_REGISTER' && (
          <div className="space-y-4">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="p-2 border-r border-slate-300 w-12 text-center">ক্রম</th>
                  <th className="p-2 border-r border-slate-300">মিটিং ও স্মারক নং</th>
                  <th className="p-2 border-r border-slate-300">তারিখ ও সময়</th>
                  <th className="p-2 border-r border-slate-300">স্থান</th>
                  <th className="p-2 border-r border-slate-300">সভাপতি / সঞ্চালক</th>
                  <th className="p-2 border-r border-slate-300">আলোচ্যসূচি</th>
                  <th className="p-2 text-center">উপস্থিতি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {meetings.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                      {isBn ? toBanglaNumber(idx + 1) : idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold">
                      <div>মিটিং #{m.meetingNumber || idx + 1}</div>
                      <div className="text-[10px] font-mono text-slate-500">{m.memoNumber}</div>
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div>{formatDate(m.date, language)}</div>
                      <div className="text-[10px] text-slate-500">{m.time}</div>
                    </td>
                    <td className="p-2 border-r border-slate-200">{m.location || 'মসজিদ কমপ্লেক্স'}</td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="font-bold">{m.chairman || '-'}</div>
                      <div className="text-[10px] text-slate-500">সঞ্চালক: {m.conductor || '-'}</div>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-[11px]">
                      {(m.agenda || []).slice(0, 2).join(', ')}
                      {(m.agenda || []).length > 2 && ' ...'}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-blue-800">
                      {isBn
                        ? toBanglaNumber(m.attendees?.length || m.membersPresent?.length || 0)
                        : m.attendees?.length || m.membersPresent?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'RESOLUTION_BOOK' && (
          <div className="space-y-4">
            <table className="w-full text-left text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="p-2 border-r border-slate-300">রেজোলিউশন নং</th>
                  <th className="p-2 border-r border-slate-300">শিরোনাম ও বিবরণ</th>
                  <th className="p-2 border-r border-slate-300">গৃহীত তারিখ</th>
                  <th className="p-2 border-r border-slate-300">বাস্তবায়নকারী</th>
                  <th className="p-2 border-r border-slate-300">সময়সীমা</th>
                  <th className="p-2 text-center">অগ্রগতি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {resolutions.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-900">
                      {res.resolutionNumber}
                    </td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{res.title}</div>
                      <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{res.description}</div>
                    </td>
                    <td className="p-2 border-r border-slate-200 font-mono">{formatDate(res.resolutionDate, language)}</td>
                    <td className="p-2 border-r border-slate-200 font-medium">{res.responsiblePersonName || '-'}</td>
                    <td className="p-2 border-r border-slate-200 font-mono text-[11px]">{res.deadline ? formatDate(res.deadline, language) : '-'}</td>
                    <td className="p-2 text-center font-bold font-mono text-emerald-800">
                      {isBn ? toBanglaNumber(res.progressPercentage || 0) : res.progressPercentage || 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Signatures */}
        <div className="grid grid-cols-3 gap-6 mt-16 pt-8 border-t border-slate-300 text-center text-xs font-sans">
          <div>
            <div className="border-t border-slate-700 pt-1 font-bold">সাধারণ সম্পাদক</div>
          </div>
          <div>
            <div className="border-t border-slate-700 pt-1 font-bold">কোষাধ্যক্ষ</div>
          </div>
          <div>
            <div className="border-t border-slate-700 pt-1 font-bold">সভাপতি</div>
          </div>
        </div>
      </div>
    </div>
  );
};

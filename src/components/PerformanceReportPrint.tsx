import React, { useState } from 'react';
import {
  Printer,
  X,
  Star,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Briefcase,
  Layers,
  FileText
} from 'lucide-react';
import { Mosque, CommitteeTerm, MemberEvaluationScoreResult } from '../types';
import { formatDate } from '../lib/i18n';
import { toBanglaNumber } from './CommitteeView';

interface PerformanceReportPrintProps {
  isOpen: boolean;
  onClose: () => void;
  mosque?: Mosque | null;
  term?: CommitteeTerm | null;
  memberScores: MemberEvaluationScoreResult[];
  singleMember?: MemberEvaluationScoreResult | null;
  fromDate?: string;
  toDate?: string;
  reportType?: 'ALL_MEMBERS' | 'SINGLE_MEMBER' | 'ATTENDANCE_REPORT' | 'RESPONSIBILITY_REPORT' | 'NEEDS_IMPROVEMENT_REPORT';
}

export const PerformanceReportPrint: React.FC<PerformanceReportPrintProps> = ({
  isOpen,
  onClose,
  mosque,
  term,
  memberScores,
  singleMember,
  fromDate,
  toDate,
  reportType = 'ALL_MEMBERS',
}) => {
  const [selectedReportType, setSelectedReportType] = useState<'ALL_MEMBERS' | 'SINGLE_MEMBER' | 'ATTENDANCE_REPORT' | 'RESPONSIBILITY_REPORT' | 'NEEDS_IMPROVEMENT_REPORT'>(reportType);
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeMonthlyTrend, setIncludeMonthlyTrend] = useState(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('print-action-plan-active');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-action-plan-active');
    }, 500);
  };

  const getStarText = (stars: number) => {
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  };

  const displayedMembers = React.useMemo(() => {
    if (selectedReportType === 'NEEDS_IMPROVEMENT_REPORT') {
      return memberScores.filter(m => m.starRating < 3 || m.finalScore < 70);
    }
    return memberScores;
  }, [memberScores, selectedReportType]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Controls Bar (Hidden on print) */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[96vh]">
        <div className="print:hidden flex items-center justify-between p-4 bg-slate-800 text-white flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">
              {selectedReportType === 'SINGLE_MEMBER'
                ? `সদস্য মূল্যায়ন রিপোর্ট - ${singleMember?.memberName}`
                : selectedReportType === 'ATTENDANCE_REPORT'
                ? 'কমিটি সদস্য মিটিং উপস্থিতি ও নিয়মিতকরণ প্রতিবেদন'
                : selectedReportType === 'RESPONSIBILITY_REPORT'
                ? 'কমিটি সদস্য অর্পিত দায়িত্ব ও অ্যাকশন প্ল্যান বাস্তবায়ন প্রতিবেদন'
                : selectedReportType === 'NEEDS_IMPROVEMENT_REPORT'
                ? 'উন্নয়ন প্রয়োজন এমন সদস্যদের বিশেষ পর্যালোচনা তালিকা'
                : 'কমিটি সদস্য পারফরম্যান্স ও মূল্যায়ন অফিসিয়াল রিপোর্ট'}
            </h3>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Report Type Selector */}
            {reportType !== 'SINGLE_MEMBER' && (
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value as any)}
                className="bg-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 border border-slate-600 font-semibold focus:outline-hidden"
              >
                <option value="ALL_MEMBERS">সকল সদস্য মূল্যায়ন সামারি</option>
                <option value="ATTENDANCE_REPORT">মিটিং উপস্থিতি রিপোর্ট</option>
                <option value="RESPONSIBILITY_REPORT">অর্পিত দায়িত্ব ও একশন প্ল্যান রিপোর্ট</option>
                <option value="NEEDS_IMPROVEMENT_REPORT">উন্নয়ন প্রয়োজন তালিকা (Review)</option>
              </select>
            )}

            <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="rounded text-blue-500"
              />
              <span>Software Letterhead</span>
            </label>
            <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeComments}
                onChange={(e) => setIncludeComments(e.target.checked)}
                className="rounded text-blue-500"
              />
              <span>মন্তব্য</span>
            </label>
            <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-blue-500"
              />
              <span>স্বাক্ষর প্যানেল</span>
            </label>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন (Print A4)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          <div
            id="printable-performance-report"
            className="report-print-root bg-white w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-md border border-slate-200 text-slate-900 font-sans text-[12px] leading-relaxed relative flex flex-col justify-between print:border-none print:shadow-none print:p-0"
          >
            {/* Header */}
            <div>
              {includeLetterhead ? (
                <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
                  <div className="text-xs text-slate-500 font-medium mb-1">
                    বিসমিল্লাহির রাহমানির রাহিম
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {mosque?.nameBn || mosque?.name || 'মসজিদ পরিচালনা কমিটি'}
                  </h1>
                  {mosque?.waqfEstateName && (
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">
                      {mosque.waqfEstateName} {mosque.registrationNumber ? `| রেজি: ${mosque.registrationNumber}` : ''}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 mt-1">
                    {mosque?.address || 'মিরপুর, ঢাকা-১২১৬'}
                  </div>

                  <div className="mt-3 inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide print:border print:border-slate-800 print:text-black print:bg-white">
                    {selectedReportType === 'SINGLE_MEMBER'
                      ? 'কমিটি সদস্য ব্যক্তিগত পারফরম্যান্স ও কার্যক্রম মূল্যায়ন পত্র'
                      : selectedReportType === 'ATTENDANCE_REPORT'
                      ? 'কমিটি সদস্য মিটিং উপস্থিতি ও নিয়মিতকরণ বিস্তারিত প্রতিবেদন'
                      : selectedReportType === 'RESPONSIBILITY_REPORT'
                      ? 'কমিটি সদস্য অর্পিত দায়িত্ব ও অ্যাকশন প্ল্যান বাস্তবায়ন প্রতিবেদন'
                      : selectedReportType === 'NEEDS_IMPROVEMENT_REPORT'
                      ? 'উন্নয়ন প্রয়োজন এমন সদস্যদের বিশেষ পর্যালোচনা ও ফলোআপ তালিকা'
                      : 'কমিটি সদস্য পারফরম্যান্স, দায়িত্ব ও সার্বিক মূল্যায়ন বিবরণী'}
                  </div>
                </div>
              ) : (
                <div className="text-center pb-4 mb-4 border-b border-slate-300">
                  <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide print:border print:border-slate-800 print:text-black print:bg-white">
                    {selectedReportType === 'SINGLE_MEMBER'
                      ? 'কমিটি সদস্য ব্যক্তিগত পারফরম্যান্স ও কার্যক্রম মূল্যায়ন পত্র'
                      : selectedReportType === 'ATTENDANCE_REPORT'
                      ? 'কমিটি সদস্য মিটিং উপস্থিতি ও নিয়মিতকরণ বিস্তারিত প্রতিবেদন'
                      : selectedReportType === 'RESPONSIBILITY_REPORT'
                      ? 'কমিটি সদস্য অর্পিত দায়িত্ব ও অ্যাকশন প্ল্যান বাস্তবায়ন প্রতিবেদন'
                      : selectedReportType === 'NEEDS_IMPROVEMENT_REPORT'
                      ? 'উন্নয়ন প্রয়োজন এমন সদস্যদের বিশেষ পর্যালোচনা ও ফলোআপ তালিকা'
                      : 'কমিটি সদস্য পারফরম্যান্স, দায়িত্ব ও সার্বিক মূল্যায়ন বিবরণী'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 print:hidden">
                    (অফিসিয়াল লেটারহেড প্যাডের ওপর মুদ্রণের জন্য প্রস্তুত)
                  </div>
                </div>
              )}

              {/* Meta Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] mb-5">
                <div>
                  <span className="text-slate-500">কমিটির মেয়াদ: </span>
                  <span className="font-bold text-slate-800">{term?.title || 'বর্তমান কমিটি'}</span>
                </div>
                <div>
                  <span className="text-slate-500">মেয়াদকাল: </span>
                  <span className="font-bold text-slate-800">
                    {term?.startDate ? formatDate(term.startDate, 'bn') : ''} হতে {term?.endDate ? formatDate(term.endDate, 'bn') : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">মূল্যায়ন সময়কাল: </span>
                  <span className="font-bold text-slate-800">
                    {fromDate ? formatDate(fromDate, 'bn') : 'শুরু'} হতে {toDate ? formatDate(toDate, 'bn') : 'চলতি'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">মুদ্রণ তারিখ: </span>
                  <span className="font-bold text-slate-800">{formatDate(new Date().toISOString(), 'bn')}</span>
                </div>
              </div>

              {/* Single Member Detailed View */}
              {reportType === 'SINGLE_MEMBER' && singleMember && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-start justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center font-bold text-xl text-blue-700">
                        {singleMember.memberName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">{singleMember.memberName}</h2>
                        <div className="text-xs font-semibold text-blue-700">{singleMember.positionCustomBn || singleMember.position}</div>
                        <div className="text-[11px] text-slate-500">মোবাইল: {toBanglaNumber(singleMember.phone)} | পদবী স্ট্যাটাস: {singleMember.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</div>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:pl-4 border-slate-200">
                      <div className="text-xs text-slate-500">সার্বিক পারফরম্যান্স স্কোর</div>
                      <div className="text-2xl font-black text-blue-700">
                        {toBanglaNumber(singleMember.finalScore)}%
                      </div>
                      <div className="text-amber-500 font-bold text-sm tracking-wider">
                        {getStarText(singleMember.starRating)} ({toBanglaNumber(singleMember.starRating)} স্টার)
                      </div>
                      <div className="text-[10px] font-bold text-slate-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                        {singleMember.performanceLevelBn}
                      </div>
                    </div>
                  </div>

                  {/* Component Breakdown Table */}
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-2">মূল্যায়ন খাত (Metric Category)</th>
                        <th className="border border-slate-300 p-2 text-center">পরিমাপযোগ্য অর্জন (Actual Data)</th>
                        <th className="border border-slate-300 p-2 text-center">অর্জিত হার (%)</th>
                        <th className="border border-slate-300 p-2 text-center">ওয়েটেজ (Weight)</th>
                        <th className="border border-slate-300 p-2 text-center">যোগদান স্কোর</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-2 font-medium">
                          ১. সভায় উপস্থিতি (Meeting Attendance)
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          মোট মিটিং {toBanglaNumber(singleMember.totalMeetings)} | উপস্থিত {toBanglaNumber(singleMember.presentMeetings)} | ছুটি {toBanglaNumber(singleMember.leaveMeetings)} | অনুপস্থিত {toBanglaNumber(singleMember.absentMeetings)}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {toBanglaNumber(singleMember.attendancePercentage)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {toBanglaNumber(singleMember.attendanceWeight)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">
                          {toBanglaNumber(singleMember.attendanceWeightedContribution)}
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-slate-300 p-2 font-medium">
                          ২. অর্পিত দায়িত্ব ও রেজোলিউশন বাস্তবায়ন (Task Completion)
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          মোট দায়িত্ব {toBanglaNumber(singleMember.totalAssignedTasks)} | সম্পন্ন {toBanglaNumber(singleMember.completedTasks)} | চলমান {toBanglaNumber(singleMember.inProgressTasks)} | মেয়াদোত্তীর্ণ {toBanglaNumber(singleMember.overdueTasks)}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {toBanglaNumber(singleMember.taskCompletionPercentage)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {toBanglaNumber(singleMember.taskWeight)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">
                          {toBanglaNumber(singleMember.taskWeightedContribution)}
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-slate-300 p-2 font-medium">
                          ৩. সভায় সক্রিয় অংশগ্রহণ ও ভূমিকা (Meeting Participation)
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          আলোচনা / দায়িত্ব পালন: {toBanglaNumber(singleMember.meetingParticipationCount)} টি ইভেন্ট
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {toBanglaNumber(singleMember.meetingParticipationScore)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {toBanglaNumber(singleMember.participationWeight)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">
                          {toBanglaNumber(singleMember.participationWeightedContribution)}
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-slate-300 p-2 font-medium">
                          ৪. মসজিদ উন্নয়ন ও অন্যান্য সাংগঠনিক কাজ (Activities)
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          মোট কার্যক্রম: {toBanglaNumber(singleMember.otherActivitiesCount)} টি | সম্পন্ন {toBanglaNumber(singleMember.completedActivitiesCount)} টি
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {toBanglaNumber(singleMember.activityScore)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {toBanglaNumber(singleMember.activityWeight)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">
                          {toBanglaNumber(singleMember.activityWeightedContribution)}
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-slate-300 p-2 font-medium">
                          ৫. কাজের গুণগত মান (Work Quality & Accuracy)
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          মূল্যায়িত আইটেম: {toBanglaNumber(singleMember.qualityEvaluatedCount)} টি
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {toBanglaNumber(singleMember.qualityAverageScore)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {toBanglaNumber(singleMember.qualityWeight)}%
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">
                          {toBanglaNumber(singleMember.qualityWeightedContribution)}
                        </td>
                      </tr>

                      <tr className="bg-slate-100 font-black text-slate-900">
                        <td colSpan={3} className="border border-slate-300 p-2 text-right">
                          সর্বমোট সমন্বিত স্কোর (Overall Performance Score):
                        </td>
                        <td className="border border-slate-300 p-2 text-center">১০০%</td>
                        <td className="border border-slate-300 p-2 text-center text-sm font-black text-blue-800">
                          {toBanglaNumber(singleMember.finalScore)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Manual Evaluation Comments Section */}
                  {includeComments && singleMember.manualEvaluation && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
                      <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                        মূল্যায়নকারী কর্তৃপক্ষের পর্যালোচনা ও পর্যবেক্ষণ:
                      </div>
                      {singleMember.manualEvaluation.overallAssessment && (
                        <div>
                          <span className="font-semibold text-slate-700">সার্বিক মূল্যায়ন: </span>
                          <span className="text-slate-600">{singleMember.manualEvaluation.overallAssessment}</span>
                        </div>
                      )}
                      {singleMember.manualEvaluation.strengths && (
                        <div>
                          <span className="font-semibold text-emerald-700">সবল দিক (Strengths): </span>
                          <span className="text-slate-600">{singleMember.manualEvaluation.strengths}</span>
                        </div>
                      )}
                      {singleMember.manualEvaluation.improvementRequired && (
                        <div>
                          <span className="font-semibold text-amber-700">উন্নতির ক্ষেত্র: </span>
                          <span className="text-slate-600">{singleMember.manualEvaluation.improvementRequired}</span>
                        </div>
                      )}
                      {singleMember.isManuallyOverridden && (
                        <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900">
                          <span className="font-bold">বিশেষ স্কোর সমন্বয় (Override): </span>
                          {singleMember.overrideReason || 'কমিটি কর্তৃপক্ষের বিশেষ পর্যবেক্ষণ অনুযায়ী'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* All Members Performance Table View */}
              {selectedReportType !== 'SINGLE_MEMBER' && (
                <div className="space-y-4">
                  <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-2 text-center w-8">ক্রম</th>
                        <th className="border border-slate-300 p-2">সদস্যের নাম ও পদবী</th>
                        <th className="border border-slate-300 p-2 text-center">উপস্থিতি হার</th>
                        <th className="border border-slate-300 p-2 text-center">দায়িত্ব সম্পাদন</th>
                        <th className="border border-slate-300 p-2 text-center">কার্যক্রম স্কোর</th>
                        <th className="border border-slate-300 p-2 text-center">গুণগত মান</th>
                        <th className="border border-slate-300 p-2 text-center font-black">চূড়ান্ত স্কোর</th>
                        <th className="border border-slate-300 p-2 text-center">স্টার রেটিং</th>
                        <th className="border border-slate-300 p-2 text-center">মূল্যায়ন স্তর</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedMembers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border border-slate-300 p-4 text-center text-slate-500">
                            এই ফিল্টারে কোনো তথ্য পাওয়া যায়নি
                          </td>
                        </tr>
                      ) : (
                        displayedMembers.map((mem, index) => (
                          <tr key={mem.memberId} className={index % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-300 p-2 text-center font-semibold">
                              {toBanglaNumber(index + 1)}
                            </td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-bold text-slate-900">{mem.memberName}</div>
                              <div className="text-[10px] text-slate-500">{mem.positionCustomBn || mem.position}</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-center">
                              <span className="font-semibold">{toBanglaNumber(mem.attendancePercentage)}%</span>
                              <div className="text-[9px] text-slate-400">({toBanglaNumber(mem.presentMeetings)}/{toBanglaNumber(mem.totalMeetings)})</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-center">
                              <span className="font-semibold">{toBanglaNumber(mem.taskCompletionPercentage)}%</span>
                              <div className="text-[9px] text-slate-400">({toBanglaNumber(mem.completedTasks)}/{toBanglaNumber(mem.totalAssignedTasks)})</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-semibold">
                              {toBanglaNumber(mem.activityScore)}%
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-semibold">
                              {toBanglaNumber(mem.qualityAverageScore)}%
                            </td>
                            <td className="border border-slate-300 p-2 text-center font-black text-blue-800 text-xs">
                              {toBanglaNumber(mem.finalScore)}%
                              {mem.isManuallyOverridden && <span className="text-[9px] text-amber-600 block">(সমন্বিত)</span>}
                            </td>
                            <td className="border border-slate-300 p-2 text-center text-amber-500 font-bold tracking-widest whitespace-nowrap">
                              {getStarText(mem.starRating)}
                            </td>
                            <td className="border border-slate-300 p-2 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                mem.starRating === 5 ? 'bg-emerald-100 text-emerald-800' :
                                mem.starRating === 4 ? 'bg-blue-100 text-blue-800' :
                                mem.starRating === 3 ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {mem.performanceLevelBn}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <div className="text-center border-r border-slate-200">
                      <div className="text-slate-500">রিপোর্টভুক্ত সদস্য</div>
                      <div className="font-bold text-slate-800 text-sm">{toBanglaNumber(displayedMembers.length)} জন</div>
                    </div>
                    <div className="text-center border-r border-slate-200">
                      <div className="text-slate-500">কমিটির গড় স্কোর</div>
                      <div className="font-bold text-blue-700 text-sm">
                        {toBanglaNumber(
                          displayedMembers.length > 0
                            ? Math.round(displayedMembers.reduce((a, b) => a + b.finalScore, 0) / displayedMembers.length)
                            : 0
                        )}%
                      </div>
                    </div>
                    <div className="text-center border-r border-slate-200">
                      <div className="text-slate-500">গড় মিটিং উপস্থিতি</div>
                      <div className="font-bold text-emerald-700 text-sm">
                        {toBanglaNumber(
                          displayedMembers.length > 0
                            ? Math.round(displayedMembers.reduce((a, b) => a + b.attendancePercentage, 0) / displayedMembers.length)
                            : 0
                        )}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-500">গড় দায়িত্ব বাস্তবায়ন</div>
                      <div className="font-bold text-purple-700 text-sm">
                        {toBanglaNumber(
                          displayedMembers.length > 0
                            ? Math.round(displayedMembers.reduce((a, b) => a + b.taskCompletionPercentage, 0) / displayedMembers.length)
                            : 0
                        )}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Signature Section */}
            {includeSignatures && (
              <div className="mt-12 pt-8 border-t border-slate-300">
                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div>
                    <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                      মূল্যায়নকারী / প্রস্তুতকারক
                    </div>
                    <div className="text-[10px] text-slate-500">হিসাব ও মূল্যায়ন সাব-কমিটি</div>
                  </div>

                  <div>
                    <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                      সাধারণ সম্পাদক
                    </div>
                    <div className="text-[10px] text-slate-500">মসজিদ পরিচালনা পরিষদ</div>
                  </div>

                  <div>
                    <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                      সভাপতি / সভাপতিমণ্ডলী
                    </div>
                    <div className="text-[10px] text-slate-500">মসজিদ ও ওয়াকফ এস্টেট</div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 text-center mt-6">
                  * এই পারফরম্যান্স মূল্যায়ন রিপোর্টটি সম্পূর্ণ স্বচ্ছতা ও মসজিদ পরিচালনার সুবিধার্থে প্রণীত হয়েছে। এটি মসজিদের অভ্যন্তরীণ নথির অংশ।
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

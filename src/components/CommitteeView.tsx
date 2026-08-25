import React, { useState } from 'react';
import {
  Users2,
  CalendarCheck,
  Plus,
  ShieldCheck,
  AlertCircle,
  FileText,
  UserCheck,
  Printer,
  Clock,
  MapPin,
  Phone
} from 'lucide-react';
import { CommitteeTerm, CommitteeMember, CommitteeMeeting } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';

interface CommitteeViewProps {
  terms: CommitteeTerm[];
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
  language: Language;
  onAddTerm: (data: any) => Promise<void>;
  onAddMember: (data: any) => Promise<void>;
  onAddMeeting: (data: any) => Promise<void>;
}

export const CommitteeView: React.FC<CommitteeViewProps> = ({
  terms,
  members,
  meetings,
  language,
  onAddTerm,
  onAddMember,
  onAddMeeting,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'members' | 'terms' | 'meetings'>('members');

  // Term modal
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [termTitle, setTermTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [termDesc, setTermDesc] = useState('');
  const [termError, setTermError] = useState('');

  // Member modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState(terms[0]?.id || '');
  const [memberName, setMemberName] = useState('');
  const [memberNid, setMemberNid] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberAddress, setMemberAddress] = useState('');
  const [memberPosition, setMemberPosition] = useState<CommitteeMember['position']>('MEMBER');
  const [memberPositionCustom, setMemberPositionCustom] = useState('');
  const [memberError, setMemberError] = useState('');

  // Meeting modal
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('রাত ৮:৩০ (বাদ এশা)');
  const [meetingLocation, setMeetingLocation] = useState('মসজিদ অফিস কক্ষ');
  const [chairman, setChairman] = useState('সভাপতি মহোদয়');
  const [secretary, setSecretary] = useState('সাধারণ সম্পাদক');
  const [agendaText, setAgendaText] = useState('');
  const [decisionText, setDecisionText] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [presentMembers, setPresentMembers] = useState('');

  const activeTerm = terms.find((t) => t.status === 'ACTIVE') || terms[0];

  const handleTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermError('');
    try {
      await onAddTerm({
        title: termTitle,
        startDate,
        endDate,
        description: termDesc,
      });
      setIsTermModalOpen(false);
      setTermTitle('');
      setStartDate('');
      setEndDate('');
      setTermDesc('');
    } catch (err: any) {
      setTermError(err.message || 'Error creating term');
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    try {
      await onAddMember({
        termId: selectedTermId || activeTerm?.id,
        name: memberName,
        nid: memberNid,
        phone: memberPhone,
        address: memberAddress,
        position: memberPosition,
        positionCustomBn: memberPositionCustom || undefined,
      });
      setIsMemberModalOpen(false);
      setMemberName('');
      setMemberNid('');
      setMemberPhone('');
      setMemberAddress('');
      setMemberPositionCustom('');
    } catch (err: any) {
      setMemberError(err.message || 'Error adding member');
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddMeeting({
        date: meetingDate,
        time: meetingTime,
        location: meetingLocation,
        chairman,
        secretary,
        agenda: agendaText.split('\n').filter(Boolean),
        decisions: decisionText.split('\n').filter(Boolean),
        resolutions: resolutionText.split('\n').filter(Boolean),
        membersPresent: presentMembers.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setIsMeetingModalOpen(false);
      setAgendaText('');
      setDecisionText('');
      setResolutionText('');
      setPresentMembers('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-btn-committee-members"
            onClick={() => setActiveTab('members')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>সদস্য তালিকা</span>
            <span className="ml-1 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {members.length}
            </span>
          </button>

          <button
            id="tab-btn-committee-terms"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'terms'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>কমিটির মেয়াদকাল</span>
          </button>

          <button
            id="tab-btn-committee-meetings"
            onClick={() => setActiveTab('meetings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'meetings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>মিটিং ও রেজোলিউশন</span>
            <span className="ml-1 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {meetings.length}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'members' && (
            <button
              id="btn-open-add-member"
              onClick={() => setIsMemberModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন সদস্য অন্তর্ভুক্তি</span>
            </button>
          )}
          {activeTab === 'terms' && (
            <button
              id="btn-open-add-term"
              onClick={() => setIsTermModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কমিটি মেয়াদ নির্ধারণ</span>
            </button>
          )}
          {activeTab === 'meetings' && (
            <button
              id="btn-open-add-meeting"
              onClick={() => setIsMeetingModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন মিটিং কার্যবিবরণী</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="text-xs font-bold text-blue-950">
                কার্যকর পরিষদ: {activeTerm?.title} ({formatDate(activeTerm?.startDate || '', language)} হতে {formatDate(activeTerm?.endDate || '', language)})
              </span>
            </div>
            <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full">
              {members.length} জন সদস্য
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((mem) => (
              <div
                key={mem.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-900 font-bold text-sm flex items-center justify-center border-2 border-blue-200">
                    {mem.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{mem.name}</h3>
                    <span className="inline-block bg-blue-50 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-md mt-0.5 border border-blue-100">
                      {mem.positionCustomBn || mem.position}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{mem.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">NID: ••••••••{mem.nid.slice(-4)}</span>
                  </div>
                  {mem.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{mem.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. COMMITTEE TERMS */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>কমিটি মেয়াদের নিয়মাবলী (Rules):</strong>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>একটি মসজিদে একসাথে কেবল একটিই <strong>সক্রিয় (ACTIVE)</strong> কমিটি থাকতে পারবে।</li>
              <li>বর্তমান সক্রিয় কমিটির মেয়াদ শেষ হওয়ার শেষ ৩০ দিনের পূর্বে কোনো নতুন আসন্ন কমিটি গঠন করা যাবে না।</li>
              <li>নতুন কমিটির শুরুর তারিখ অবশ্যই বর্তমান সক্রিয় কমিটির মেয়াদ শেষ হওয়ার পরবর্তী হতে হবে।</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {terms.map((tItem) => (
              <div
                key={tItem.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    tItem.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tItem.status}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    সদস্য সংখ্যা: {tItem.membersCount || 0}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{tItem.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{tItem.description}</p>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg flex items-center justify-between border border-slate-100">
                  <div>
                    <span className="text-slate-400">শুরুর তারিখ:</span>{' '}
                    <strong className="text-slate-800">{formatDate(tItem.startDate, language)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">সমাপ্তির তারিখ:</span>{' '}
                    <strong className="text-slate-800">{formatDate(tItem.endDate, language)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. COMMITTEE MEETINGS & MINUTES */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {meetings.map((meet) => (
            <div
              key={meet.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {meet.meetingNumber}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                      {meet.resolutionNumber}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-1.5">
                    পরিচালনা কমিটির সভা — {formatDate(meet.date, language)} ({meet.time})
                  </h3>
                </div>
                <div className="text-xs text-slate-600">
                  <span>সভাপতি: <strong className="text-slate-900">{meet.chairman}</strong></span> | <span>সম্পাদক: <strong className="text-slate-900">{meet.secretary}</strong></span>
                </div>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* Agenda */}
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5">
                    আলোচ্যসূচি (Agenda):
                  </h4>
                  <ul className="space-y-1 text-slate-700 pl-2">
                    {meet.agenda.map((ag, idx) => (
                      <li key={idx}>• {ag}</li>
                    ))}
                  </ul>
                </div>

                {/* Decisions & Resolutions */}
                <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 space-y-2">
                  <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[11px]">
                    গৃহীত সিদ্ধান্ত ও রেজোলিউশন (Decisions & Resolutions):
                  </h4>
                  <ul className="space-y-1 text-blue-900 pl-2">
                    {meet.decisions.map((dec, idx) => (
                      <li key={idx}>✓ {dec}</li>
                    ))}
                  </ul>
                </div>

                {/* Present Members */}
                <div className="text-slate-500 text-[11px] pt-1">
                  উপস্থিত সদস্যবৃন্দ: {meet.membersPresent.join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TERM MODAL */}
      {isTermModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">নতুন কমিটির মেয়াদ নির্ধারণ</h3>
            {termError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{termError}</span>
              </div>
            )}
            <form onSubmit={handleTermSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কমিটির শিরোনাম *</label>
                <input
                  id="input-term-title"
                  type="text"
                  placeholder="e.g. পরিচালনা পরিষদ (২০২৬ - ২০২৮)"
                  value={termTitle}
                  onChange={(e) => setTermTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">শুরুর তারিখ *</label>
                  <input
                    id="input-term-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সমাপ্তির তারিখ *</label>
                  <input
                    id="input-term-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ ও ওয়াকফ রেফারেন্স</label>
                <textarea
                  id="input-term-desc"
                  rows={2}
                  value={termDesc}
                  onChange={(e) => setTermDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTermModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-term"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MEMBER MODAL */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">কমিটিতে নতুন সদস্য অন্তর্ভুক্তি</h3>
            {memberError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{memberError}</span>
              </div>
            )}
            <form onSubmit={handleMemberSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কমিটি মেয়াদ *</label>
                <select
                  id="select-member-term"
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {terms.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.title} ({tm.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের পুরো নাম *</label>
                <input
                  id="input-member-name"
                  type="text"
                  placeholder="e.g. আলহাজ্ব মোঃ শামসুল হুদা"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জাতীয় পরিচয়পত্র (NID) *</label>
                  <input
                    id="input-member-nid"
                    type="text"
                    placeholder="19XXXXXXXXX"
                    value={memberNid}
                    onChange={(e) => setMemberNid(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                  <input
                    id="input-member-phone"
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পদবি নির্বাচন *</label>
                <select
                  id="select-member-position"
                  value={memberPosition}
                  onChange={(e) => setMemberPosition(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="PRESIDENT">সভাপতি (President)</option>
                  <option value="VICE_PRESIDENT">সহ-সভাপতি (Vice President)</option>
                  <option value="SECRETARY">সাধারণ সম্পাদক (General Secretary)</option>
                  <option value="JOINT_SECRETARY">যুগ্ম সম্পাদক (Joint Secretary)</option>
                  <option value="TREASURER">কোষাধ্যক্ষ (Treasurer)</option>
                  <option value="ORGANIZING_SECRETARY">সাংগঠনিক সম্পাদক</option>
                  <option value="MEMBER">কার্যনির্বাহী সদস্য (Member)</option>
                  <option value="ADVISOR">উপদেষ্টা (Advisor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  id="input-member-address"
                  type="text"
                  placeholder="বাড়ি নং, রোড নং..."
                  value={memberAddress}
                  onChange={(e) => setMemberAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-member"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MEETING MODAL */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">নতুন মিটিং কার্যবিবরণী ও রেজোলিউশন</h3>
            <form onSubmit={handleMeetingSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মিটিং তারিখ</label>
                  <input
                    id="input-meeting-date"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সময়</label>
                  <input
                    id="input-meeting-time"
                    type="text"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আলোচ্যসূচি (প্রতি লাইনে একটি)</label>
                <textarea
                  id="input-meeting-agenda"
                  rows={2}
                  placeholder="১. মসজিদের ফ্যান মেরামত..."
                  value={agendaText}
                  onChange={(e) => setAgendaText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গৃহীত সিদ্ধান্তসমূহ (প্রতি লাইনে একটি)</label>
                <textarea
                  id="input-meeting-decisions"
                  rows={3}
                  placeholder="১. সর্বসম্মতভাবে ৩টি সিলিং ফ্যান ক্রয় অনুমোদন..."
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">উপস্থিত সদস্যদের নাম (কমা দিয়ে)</label>
                <input
                  id="input-meeting-members"
                  type="text"
                  placeholder="আলহাজ্ব মকবুল হোসেন, রফিকুল ইসলাম..."
                  value={presentMembers}
                  onChange={(e) => setPresentMembers(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-meeting"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  রেজোলিউশন সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

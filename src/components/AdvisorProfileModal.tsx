import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  FileText,
  Shield,
  Printer,
  Download,
  Image as ImageIcon,
  Edit2,
  Eye,
  EyeOff,
  Copy,
  Check,
  CreditCard,
  Lightbulb,
  Heart,
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  AdvisorMember,
  AdvisoryCouncilTerm,
  AdvisorConsultation,
  Mosque
} from '../types';
import { printElement } from '../lib/printUtils';
import { toBanglaNumber } from './CommitteeView';
import { DocumentSection } from './DocumentSection';

interface AdvisorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisor: AdvisorMember | null;
  terms: AdvisoryCouncilTerm[];
  allAdvisors: AdvisorMember[];
  consultations: AdvisorConsultation[];
  mosque?: Mosque | null;
  onEdit: (advisor: AdvisorMember) => void;
  onAddConsultation?: (advisorId: string) => void;
}

export const AdvisorProfileModal: React.FC<AdvisorProfileModalProps> = ({
  isOpen,
  onClose,
  advisor,
  terms,
  allAdvisors,
  consultations,
  mosque,
  onEdit,
  onAddConsultation,
}) => {
  const [isNidVisible, setIsNidVisible] = useState(false);
  const [isCopiedPhone, setIsCopiedPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONSULTATIONS' | 'HISTORY' | 'DOCUMENTS'>('OVERVIEW');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const printContentRef = useRef<HTMLDivElement>(null);

  const currentTerm = useMemo(() => {
    if (!advisor) return null;
    return terms.find((t) => t.id === advisor.termId) || null;
  }, [advisor, terms]);

  const advisorConsultations = useMemo(() => {
    if (!advisor) return [];
    return consultations.filter(
      (c) => c.advisorId === advisor.id || (c.advisorName && c.advisorName.includes(advisor.name))
    );
  }, [advisor, consultations]);

  const advisorHistory = useMemo(() => {
    if (!advisor) return [];
    const matching = allAdvisors.filter(
      (a) =>
        a.id === advisor.id ||
        (a.phone && a.phone === advisor.phone) ||
        (a.nid && advisor.nid && a.nid === advisor.nid)
    );
    return matching.map((m) => ({
      advisorRecord: m,
      term: terms.find((t) => t.id === m.termId),
      isCurrent: m.id === advisor.id,
    }));
  }, [advisor, allAdvisors, terms]);

  if (!isOpen || !advisor) return null;

  const handleCopyPhone = () => {
    if (!advisor.phone) return;
    navigator.clipboard.writeText(advisor.phone);
    setIsCopiedPhone(true);
    setTimeout(() => setIsCopiedPhone(false), 2000);
  };

  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  const age = calculateAge(advisor.dateOfBirth);

  const maskedNid = useMemo(() => {
    if (!advisor.nid) return 'প্রযোজ্য নয়';
    if (isNidVisible) return advisor.nid;
    const len = advisor.nid.length;
    if (len <= 4) return '••••';
    return '••••••••' + advisor.nid.slice(-4);
  }, [advisor.nid, isNidVisible]);

  const handlePrint = async () => {
    const target = document.getElementById('advisor-profile-printable-document') || printContentRef.current;
    if (!target) return;
    await printElement(target, {
      title: `${advisor.name} - উপদেষ্টা প্রোফাইল`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '10mm 12mm',
    });
  };

  const handleDownloadImageCard = async () => {
    setIsGeneratingImage(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1050;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Card Container
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(25, 25, width - 50, height - 50, 20);
      ctx.fill();
      ctx.stroke();

      // Top banner
      const grad = ctx.createLinearGradient(25, 25, width - 25, 170);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#312e81');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(25, 25, width - 50, 150, [20, 20, 0, 0]);
      ctx.fill();

      // Mosque & Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mosque?.name || 'মামুন জামে মসজিদ ওয়াক্ফ এস্টেট', width / 2, 75);

      ctx.fillStyle = '#c7d2fe';
      ctx.font = '16px sans-serif';
      ctx.fillText('স্বতন্ত্র উপদেষ্টা পরিষদ — সম্মানিত উপদেষ্টা প্রোফাইল', width / 2, 110);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.fillText(currentTerm?.title || '২০২৬–২০২৮ উপদেষ্টা পরিষদ', width / 2, 135);

      // Photo Frame
      const avatarY = 160;
      const avatarR = 55;
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, avatarY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (advisor.photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = advisor.photoUrl!;
          });
          ctx.drawImage(img, width / 2 - avatarR, avatarY, avatarR * 2, avatarR * 2);
        } catch {
          ctx.fillStyle = '#312e81';
          ctx.fillRect(width / 2 - avatarR, avatarY, avatarR * 2, avatarR * 2);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 40px sans-serif';
          ctx.fillText(advisor.name.slice(0, 1), width / 2, avatarY + 70);
        }
      } else {
        ctx.fillStyle = '#312e81';
        ctx.fillRect(width / 2 - avatarR, avatarY, avatarR * 2, avatarR * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText(advisor.name.slice(0, 1), width / 2, avatarY + 70);
      }
      ctx.restore();

      // Border circle
      ctx.beginPath();
      ctx.arc(width / 2, avatarY + avatarR, avatarR + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#4338ca';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Name & Role
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(advisor.name, width / 2, 310);

      // Role pill
      ctx.fillStyle = '#e0e7ff';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 130, 325, 260, 32, 16);
      ctx.fill();
      ctx.fillStyle = '#3730a3';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(advisor.advisorRole || 'উপদেষ্টা', width / 2, 346);

      // Information Table / Cards
      const startY = 385;
      const leftCol = 70;
      const rightCol = width - 70;

      const drawInfoRow = (y: number, label: string, val: string) => {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, leftCol, y);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val || '—', rightCol, y);

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftCol, y + 10);
        ctx.lineTo(rightCol, y + 10);
        ctx.stroke();
      };

      drawInfoRow(startY + 30, 'মোবাইল নম্বর', advisor.phone || '—');
      drawInfoRow(startY + 65, 'বিকল্প ফোন', advisor.altPhone || '—');
      drawInfoRow(startY + 100, 'পিতার নাম', advisor.fatherName || '—');
      drawInfoRow(startY + 135, 'মাতার নাম', advisor.motherName || '—');
      drawInfoRow(startY + 170, 'জাতীয় পরিচয়পত্র (NID)', advisor.nid ? '••••••••' + advisor.nid.slice(-4) : '—');
      drawInfoRow(startY + 205, 'রক্তের গ্রুপ', advisor.bloodGroup || '—');
      drawInfoRow(startY + 240, 'পেশা / পদবি', advisor.occupation || '—');
      drawInfoRow(startY + 275, 'শিক্ষাগত যোগ্যতা', advisor.education || '—');
      drawInfoRow(startY + 310, 'ই-মেইল', advisor.email || '—');
      drawInfoRow(startY + 345, 'যোগদানের তারিখ', advisor.joinDate ? toBanglaNumber(advisor.joinDate) : '—');
      drawInfoRow(startY + 380, 'সদস্যপদ স্ট্যাটাস', advisor.status === 'ACTIVE' ? 'সক্রিয়' : advisor.status === 'HONORARY' ? 'সম্মানসূচক' : 'নিষ্ক্রিয়');

      // Address
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ঠিকানা:', leftCol, startY + 425);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(advisor.address || '—', leftCol + 60, startY + 425);

      // Watermark & Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MasjidLedger — মসজিদ অটোমেশন ও অডিট সিস্টেম | কপিরাইট সংরক্ষিত', width / 2, height - 50);

      // Download
      const link = document.createElement('a');
      link.download = `Advisor_Card_${advisor.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Image export failed:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {advisor.photoUrl ? (
                <img
                  src={advisor.photoUrl}
                  alt={advisor.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/50 border-2 border-indigo-400 flex items-center justify-center text-white text-2xl font-bold">
                  {advisor.name.slice(0, 1)}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[9px] font-black rounded-full border border-white uppercase ${
                  advisor.status === 'ACTIVE'
                    ? 'bg-emerald-500 text-white'
                    : advisor.status === 'HONORARY'
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-500 text-white'
                }`}
              >
                {advisor.status === 'ACTIVE'
                  ? 'সক্রিয়'
                  : advisor.status === 'HONORARY'
                  ? 'সম্মানসূচক'
                  : advisor.status === 'DECEASED'
                  ? 'মরহুম'
                  : 'নিষ্ক্রিয়'}
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white">{advisor.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                  {advisor.advisorRole || 'উপদেষ্টা'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>{currentTerm?.title || 'উপদেষ্টা পরিষদ'}</span>
                {advisor.occupation && (
                  <>
                    <span>•</span>
                    <span>{advisor.occupation}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="A4 সাইজ ফরম্যাটে পূর্ণাঙ্গ প্রোফাইল প্রিন্ট বা PDF ডাউনলোড করুন"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              <span>প্রিন্ট / PDF</span>
            </button>

            <button
              onClick={handleDownloadImageCard}
              disabled={isGeneratingImage}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="প্রোফাইল কার্ড ইমেজ হিসেবে ডাউনলোড করুন"
            >
              <ImageIcon className="w-4 h-4 text-emerald-300" />
              <span>{isGeneratingImage ? 'প্রস্তুত হচ্ছে...' : 'কার্ড ইমেজ'}</span>
            </button>

            <button
              onClick={() => onEdit(advisor)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Edit2 className="w-4 h-4" />
              <span>সম্পাদনা</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            সাধারণ ও ব্যক্তিগত তথ্য
          </button>
          <button
            onClick={() => setActiveTab('CONSULTATIONS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'CONSULTATIONS'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>পরামর্শ ও দিকনির্দেশনা</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-100 text-indigo-700 font-black">
              {advisorConsultations.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'HISTORY'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>পরিষদ ইতিহাস</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 text-slate-700 font-bold">
              {advisorHistory.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'DOCUMENTS'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>সংযুক্ত নথি ও ফাইল</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Quick Contacts Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">মোবাইল নম্বর</span>
                      <span className="text-sm font-bold text-slate-800">{advisor.phone}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyPhone}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                    title="ফোন নম্বর কপি করুন"
                  >
                    {isCopiedPhone ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <span className="text-[11px] text-slate-500 font-semibold block">ই-মেইল</span>
                    <span className="text-sm font-bold text-slate-800 truncate block">
                      {advisor.email || 'তথ্য নেই'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">জাতীয় পরিচয়পত্র (NID)</span>
                      <span className="text-sm font-bold font-mono text-slate-800">{maskedNid}</span>
                    </div>
                  </div>
                  {advisor.nid && (
                    <button
                      onClick={() => setIsNidVisible(!isNidVisible)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-white transition-colors cursor-pointer"
                      title={isNidVisible ? 'NID গোপন করুন' : 'NID দেখুন'}
                    >
                      {isNidVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Two Column Attribute Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Family & Personal */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>পারিবারিক ও পরিচয় বিবরণ</span>
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">পিতার নাম</span>
                      <span className="font-semibold text-slate-800">{advisor.fatherName || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">মাতার নাম</span>
                      <span className="font-semibold text-slate-800">{advisor.motherName || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">জন্ম তারিখ ও বয়স</span>
                      <span className="font-semibold text-slate-800">
                        {advisor.dateOfBirth ? (
                          <>
                            {toBanglaNumber(advisor.dateOfBirth)}{' '}
                            {age !== null && (
                              <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                                ({toBanglaNumber(age)} বছর)
                              </span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">রক্তের গ্রুপ</span>
                      <span className="font-bold text-rose-600">
                        {advisor.bloodGroup ? (
                          <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            {advisor.bloodGroup}
                          </span>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">বিকল্প মোবাইল</span>
                      <span className="font-semibold text-slate-800">{advisor.altPhone || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Occupation, Education & Term */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>পেশা, যোগ্যতা ও পরিষদ তথ্য</span>
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">বর্তমান পেশা</span>
                      <span className="font-semibold text-slate-800">{advisor.occupation || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">শিক্ষাগত যোগ্যতা</span>
                      <span className="font-semibold text-slate-800">{advisor.education || '—'}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">যোগদানের তারিখ</span>
                      <span className="font-semibold text-slate-800">
                        {advisor.joinDate ? toBanglaNumber(advisor.joinDate) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500">মেয়াদকাল</span>
                      <span className="font-semibold text-slate-800">
                        {currentTerm?.title || '২০২৬–২০২৮ পরিষদ'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500">স্ট্যাটাস</span>
                      <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {advisor.status === 'ACTIVE'
                          ? 'সক্রিয়'
                          : advisor.status === 'HONORARY'
                          ? 'সম্মানসূচক'
                          : advisor.status === 'DECEASED'
                          ? 'মরহুম'
                          : 'নিষ্ক্রিয়'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address & Bio Section */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">বর্তমান ও স্থায়ী ঠিকানা</span>
                    <p className="text-sm text-slate-800 mt-0.5">{advisor.address || 'ঠিকানা লিপিবদ্ধ করা হয়নি'}</p>
                  </div>
                </div>

                {advisor.notes && (
                  <div className="pt-3 border-t border-slate-200/60 flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">সংক্ষিপ্ত পরিচিতি ও মন্তব্য</span>
                      <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-line">{advisor.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'CONSULTATIONS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">উপদেষ্টার পরামর্শ ও দিকনির্দেশনা সমূহ</h3>
                  <p className="text-xs text-slate-500">মসজিদ উন্নয়ন, ওয়াক্ফ সংরক্ষণ ও পরিচালনার ক্ষেত্রে প্রদত্ত মতামত</p>
                </div>
                {onAddConsultation && (
                  <button
                    onClick={() => onAddConsultation(advisor.id)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>নতুন পরামর্শ নথিভুক্ত করুন</span>
                  </button>
                )}
              </div>

              {advisorConsultations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">কোনো পরামর্শ নথিভুক্ত পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-400 mt-1">
                    এই সম্মানিত উপদেষ্টার দেওয়া মূল্যবান পরামর্শ ও দিকনির্দেশনা সহজে যুক্ত করুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {advisorConsultations.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">
                            তারিখ: {toBanglaNumber(c.date)}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">{c.topic}</h4>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            c.status === 'IMPLEMENTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status === 'IMPLEMENTED'
                            ? 'বাস্তবায়িত'
                            : c.status === 'IN_PROGRESS'
                            ? 'বাস্তবায়নাধীন'
                            : 'নথিভুক্ত'}
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                        {c.advice}
                      </p>

                      {c.impactOutcome && (
                        <div className="flex items-center space-x-2 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>অগ্রগতি: {c.impactOutcome}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">উপদেষ্টা পরিষদে দায়িত্ব পালনের ইতিহাস</h3>
                <p className="text-xs text-slate-500">বিভিন্ন মেয়াদে এই সম্মানিত উপদেষ্টার সেবা ও ভূমিকা</p>
              </div>

              <div className="space-y-3">
                {advisorHistory.map((item, idx) => (
                  <div
                    key={item.advisorRecord.id || idx}
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      item.isCurrent
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          {item.term?.title || 'উপদেষ্টা পরিষদ মেয়াদ'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          দায়িত্ব: {item.advisorRecord.advisorRole || 'উপদেষ্টা'}
                          {item.advisorRecord.joinDate && ` • যোগদান: ${toBanglaNumber(item.advisorRecord.joinDate)}`}
                        </p>
                      </div>
                    </div>

                    <div>
                      {item.isCurrent ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          বর্তমান সক্রিয় মেয়াদ
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
                          পূর্ববর্তী মেয়াদ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <DocumentSection
                entityType="ADVISOR"
                entityId={advisor.id}
                entityTitle={`${advisor.name} (${advisor.advisorRole || 'উপদেষ্টা'})`}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            আইডি: <code className="text-indigo-600 font-mono">{advisor.id}</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Hidden Isolated Print Layout (A4 Official Profile) */}
      <div className="hidden">
        <div
          id="advisor-profile-printable-document"
          ref={printContentRef}
          className="p-8 max-w-[210mm] mx-auto bg-white text-slate-900 font-sans"
          style={{ width: '210mm', minHeight: '297mm' }}
        >
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-800">
            <h1 className="text-2xl font-bold text-slate-900">{mosque?.name || 'মামুন জামে মসজিদ ওয়াক্ফ এস্টেট'}</h1>
            <p className="text-xs text-slate-600 mt-1">{mosque?.address || 'মিরপুর, ঢাকা-১২১৬, বাংলাদেশ'}</p>
            <div className="inline-block mt-3 px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-bold tracking-wider uppercase">
              স্বতন্ত্র উপদেষ্টা পরিষদ — সম্মানিত উপদেষ্টা প্রোফাইল নথি
            </div>
          </div>

          {/* Sub Header */}
          <div className="flex justify-between items-center text-xs text-slate-600 py-3 border-b border-slate-200">
            <span>পরিষদ মেয়াদ: {currentTerm?.title || '২০২৬–২০২৮'}</span>
            <span>প্রিন্ট তারিখ: {toBanglaNumber(new Date().toISOString().split('T')[0])}</span>
            <span>নথি নং: ADV-{advisor.id.slice(-6).toUpperCase()}</span>
          </div>

          {/* Top Profile Summary */}
          <div className="flex items-center gap-6 py-6 border-b border-slate-200">
            <div className="w-28 h-28 border-2 border-slate-300 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
              {advisor.photoUrl ? (
                <img src={advisor.photoUrl} alt={advisor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-slate-400">{advisor.name.slice(0, 1)}</span>
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <h2 className="text-xl font-bold text-slate-900">{advisor.name}</h2>
              <p className="text-sm font-bold text-indigo-700">{advisor.advisorRole || 'উপদেষ্টা'}</p>
              <p className="text-xs text-slate-600">পেশা: {advisor.occupation || '—'} | শিক্ষা: {advisor.education || '—'}</p>
              <p className="text-xs text-slate-600">মোবাইল: {advisor.phone} {advisor.altPhone ? `| বিকল্প: ${advisor.altPhone}` : ''}</p>
              <p className="text-xs text-slate-600">ই-মেইল: {advisor.email || '—'}</p>
            </div>
          </div>

          {/* Detailed Info Table */}
          <div className="py-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1">
              ব্যক্তিগত ও পরিচিতি সংক্রান্ত তথ্য
            </h3>

            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="w-1/4 p-2.5 font-bold bg-slate-100 border-r border-slate-300">পিতার নাম</td>
                  <td className="w-1/4 p-2.5 border-r border-slate-300">{advisor.fatherName || '—'}</td>
                  <td className="w-1/4 p-2.5 font-bold bg-slate-100 border-r border-slate-300">মাতার নাম</td>
                  <td className="w-1/4 p-2.5">{advisor.motherName || '—'}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">জন্ম তারিখ</td>
                  <td className="p-2.5 border-r border-slate-300">
                    {advisor.dateOfBirth ? toBanglaNumber(advisor.dateOfBirth) : '—'}
                  </td>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">বয়স</td>
                  <td className="p-2.5">{age !== null ? `${toBanglaNumber(age)} বছর` : '—'}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">রক্তের গ্রুপ</td>
                  <td className="p-2.5 border-r border-slate-300 font-bold">{advisor.bloodGroup || '—'}</td>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">জাতীয় পরিচয়পত্র (NID)</td>
                  <td className="p-2.5 font-mono">{advisor.nid || '—'}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">যোগদানের তারিখ</td>
                  <td className="p-2.5 border-r border-slate-300">
                    {advisor.joinDate ? toBanglaNumber(advisor.joinDate) : '—'}
                  </td>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">সদস্যপদ স্থিতি</td>
                  <td className="p-2.5 font-bold">
                    {advisor.status === 'ACTIVE'
                      ? 'সক্রিয়'
                      : advisor.status === 'HONORARY'
                      ? 'সম্মানসূচক'
                      : 'নিষ্ক্রিয়'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold bg-slate-100 border-r border-slate-300">ঠিকানা</td>
                  <td colSpan={3} className="p-2.5">{advisor.address || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Advice Summary */}
          {advisorConsultations.length > 0 && (
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1">
                উপদেষ্টার সাম্প্রতিক পরামর্শ ও দিকনির্দেশনা (সংক্ষিপ্ত)
              </h3>
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 text-left w-1/5">তারিখ</th>
                    <th className="p-2 border-r border-slate-300 text-left w-1/3">বিষয়</th>
                    <th className="p-2 border-r border-slate-300 text-left">পরামর্শের বিবরণ</th>
                    <th className="p-2 text-left w-1/6">বাস্তবায়ন</th>
                  </tr>
                </thead>
                <tbody>
                  {advisorConsultations.slice(0, 5).map((c, i) => (
                    <tr key={i} className="border-b border-slate-300">
                      <td className="p-2 border-r border-slate-300">{toBanglaNumber(c.date)}</td>
                      <td className="p-2 border-r border-slate-300 font-bold">{c.topic}</td>
                      <td className="p-2 border-r border-slate-300">{c.advice}</td>
                      <td className="p-2">{c.status === 'IMPLEMENTED' ? 'বাস্তবায়িত' : 'নথিভুক্ত'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-24 grid grid-cols-3 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-1.5 font-bold">উপদেষ্টার স্বাক্ষর</div>
              <p className="text-[10px] text-slate-500 mt-0.5">{advisor.name}</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5 font-bold">সাধারণ সম্পাদক</div>
              <p className="text-[10px] text-slate-500 mt-0.5">কার্যনির্বাহী পরিচালনা পরিষদ</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5 font-bold">সভাপতি / মোতাওয়াল্লী</div>
              <p className="text-[10px] text-slate-500 mt-0.5">{mosque?.name || 'মামুন জামে মসজিদ'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

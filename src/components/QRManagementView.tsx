import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Plus,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Archive,
  RefreshCw,
  FileText,
  ExternalLink,
  Layers,
  Sparkles,
  Check,
  Copy,
  Building,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Mosque, User, QRCodeEntity, QRType, QRStatus, QRDestinationType } from '../types';
import { Language } from '../lib/i18n';
import { api } from '../lib/api';

interface QRManagementViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
}

const DESTINATION_OPTIONS: Array<{ value: QRDestinationType; labelBn: string; type: QRType }> = [
  { value: 'PUBLIC_PORTAL', labelBn: 'পাবলিক পোর্টাল (Public Portal)', type: 'PUBLIC' },
  { value: 'DONATION', labelBn: 'অনলাইন দান ও সাদাকাহ (Donation)', type: 'PUBLIC' },
  { value: 'PRAYER_SCHEDULE', labelBn: 'নামাজের সময়সূচি (Prayer Times)', type: 'PUBLIC' },
  { value: 'RAMADAN_CALENDAR', labelBn: 'রমজান ও সেহরি-ইফতার ক্যালেন্ডার', type: 'PUBLIC' },
  { value: 'NOTICE_BOARD', labelBn: 'নোটিশ বোর্ড ও ঘোষণা', type: 'PUBLIC' },
  { value: 'INCOME_NEW', labelBn: 'নতুন আয় ও প্রাপ্তি এন্ট্রি', type: 'OPERATIONAL' },
  { value: 'EXPENSE_NEW', labelBn: 'নতুন ব্যয় ও পরিশোধ এন্ট্রি', type: 'OPERATIONAL' },
  { value: 'JUMUAH_COLLECTION', labelBn: 'জুমার দিনের কালেকশন এন্ট্রি', type: 'OPERATIONAL' },
  { value: 'DONATION_BOX_COLLECTION', labelBn: 'দানবাক্স গণনা ও কালেকশন', type: 'OPERATIONAL' },
  { value: 'STAFF_SALARY', labelBn: 'স্টাফ বেতন ও ভাতা প্রদান', type: 'OPERATIONAL' },
  { value: 'WAQF_RENT', labelBn: 'ওয়াকফ সম্পত্তি ও ভাড়া গ্রহণ', type: 'OPERATIONAL' },
  { value: 'ASSET_SERVICE', labelBn: 'সম্পদ সার্ভিস ও মেরামত', type: 'OPERATIONAL' },
  { value: 'CEMETERY_BURIAL', labelBn: 'কবরস্থান দাফন রেকর্ড এন্ট্রি', type: 'OPERATIONAL' },
  { value: 'COMMITTEE_MEETING', labelBn: 'কমিটি সভা ও উপস্থিতি', type: 'OPERATIONAL' },
];

export const QRManagementView: React.FC<QRManagementViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
}) => {
  const [qrList, setQrList] = useState<QRCodeEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PUBLIC' | 'OPERATIONAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<QRType>('OPERATIONAL');
  const [destinationType, setDestinationType] = useState<QRDestinationType>('INCOME_NEW');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Print Sheet Modal
  const [isSheetPrintOpen, setIsSheetPrintOpen] = useState<boolean>(false);
  const [letterheadOn, setLetterheadOn] = useState<boolean>(true);

  // Copy success notification
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadQrs = async () => {
    setLoading(true);
    try {
      const data = await api.getQrCodes(currentMosque?.id);
      setQrList(data || []);
    } catch (err) {
      console.error('Failed to load QRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQrs();
  }, [currentMosque?.id]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setType('OPERATIONAL');
    setDestinationType('INCOME_NEW');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await api.updateQrCode(editingId, {
          name,
          type,
          destinationType,
          description,
        });
      } else {
        await api.createQrCode({
          mosqueId: currentMosque?.id || 'default-mosque',
          name,
          type,
          destinationType,
          description,
          status: 'ACTIVE',
        });
      }
      setIsModalOpen(false);
      loadQrs();
    } catch (err) {
      console.error('Save QR error:', err);
      alert('QR কোড সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: QRStatus) => {
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      if (nextStatus === 'ACTIVE') {
        await api.activateQrCode(id);
      } else {
        await api.deactivateQrCode(id);
      }
      loadQrs();
    } catch (err) {
      console.error('Toggle QR status error:', err);
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('আপনি কি এই QR কোডটি আর্কাইভ করতে চান?')) return;
    try {
      await api.archiveQrCode(id);
      loadQrs();
    } catch (err) {
      console.error('Archive QR error:', err);
    }
  };

  const handleCopyLink = (item: QRCodeEntity) => {
    const url = `${window.location.origin}/quick/${item.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintSingle = (item: QRCodeEntity) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${item.name} - QR কোড</title>
          <style>
            @page { size: A5 portrait; margin: 15mm; }
            body { font-family: 'SolaimanLipi', 'Kalpurush', sans-serif; text-align: center; color: #0f172a; padding: 20px; }
            .card { border: 3px solid #047857; border-radius: 16px; padding: 24px; max-width: 420px; margin: 0 auto; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .badge { display: inline-block; background: ${item.type === 'PUBLIC' ? '#0284c7' : '#047857'}; color: #fff; font-size: 13px; font-weight: bold; padding: 4px 14px; border-radius: 9999px; margin-bottom: 12px; }
            .title { font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
            .desc { font-size: 13px; color: #64748b; margin-bottom: 16px; }
            .qr-box { margin: 16px auto; }
            .footer { font-size: 12px; color: #047857; margin-top: 16px; font-weight: bold; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 16px; font-weight: 700; color: #047857; margin-bottom: 4px;">${currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">${currentMosque?.address || ''}</div>
            <div class="badge">${item.type === 'PUBLIC' ? 'পাবলিক সার্ভিস QR' : 'অপারেশনাল কুইক এন্ট্রি QR'}</div>
            <div class="title">${item.name}</div>
            ${item.description ? `<div class="desc">${item.description}</div>` : ''}
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(window.location.origin + '/quick/' + item.token)}" alt="QR Code" width="220" height="220" />
            </div>
            <div class="footer">
              স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করে সরাসরি কার্যক্রম পরিচালনা করুন
            </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintA4Sheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const activeList = qrList.filter(q => q.status === 'ACTIVE');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>মসজিদ QR কোড প্রিন্ট শিট</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: 'SolaimanLipi', 'Kalpurush', sans-serif; color: #0f172a; margin: 0; padding: 10px; }
            .header { text-align: center; border-bottom: 2px solid #047857; padding-bottom: 10px; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .qr-item { border: 2px solid #cbd5e1; border-radius: 12px; padding: 14px; text-align: center; background: #fff; page-break-inside: avoid; }
            .name { font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 6px; }
            .tag { font-size: 11px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-block; margin: 4px 0; color: #475569; }
          </style>
        </head>
        <body>
          ${letterheadOn ? `
            <div class="header">
              <h2 style="margin:0; font-size:20px; color:#047857;">${currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</h2>
              <p style="margin:4px 0 0; font-size:12px; color:#64748b;">${currentMosque?.address || ''} • অফিসিয়াল QR কোড শিট</p>
            </div>
          ` : ''}
          <div class="grid">
            ${activeList.map(item => `
              <div class="qr-item">
                <div style="font-weight:700; font-size:12px; color:#047857;">${item.type === 'PUBLIC' ? '🌐 পাবলিক' : '⚡ অপারেশনাল'}</div>
                <div class="name">${item.name}</div>
                <div class="tag">${item.destinationType}</div>
                <div>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(window.location.origin + '/quick/' + item.token)}" width="130" height="130" />
                </div>
                <div style="font-size:10px; color:#64748b; margin-top:4px;">স্ক্যান করে এন্ট্রি করুন</div>
              </div>
            `).join('')}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredQrs = qrList.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>স্মার্ট QR কোড ও কুইক এন্ট্রি সিস্টেম</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">QR কোড ব্যবস্থাপনা কেন্দ্র</h1>
          <p className="text-emerald-100 text-sm max-w-2xl">
            অফিসিয়াল ডেস্ক, দানবাক্স, কাউন্টার এবং হিসাব পরিচালনার জন্য স্মার্ট QR কোড তৈরি, পরিচালনা এবং প্রিন্ট করুন।
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsSheetPrintOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-white/20 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>A4 QR প্রিন্ট শিট</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>নতুন QR তৈরি করুন</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="QR কোড বা নাম দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${typeFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              সকল
            </button>
            <button
              onClick={() => setTypeFilter('PUBLIC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${typeFilter === 'PUBLIC' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              পাবলিক
            </button>
            <button
              onClick={() => setTypeFilter('OPERATIONAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${typeFilter === 'OPERATIONAL' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              অপারেশনাল
            </button>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              সব স্ট্যাটাস
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              সক্রিয়
            </button>
          </div>

          <button
            onClick={loadQrs}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* QR Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">QR কোড লোড হচ্ছে...</div>
      ) : filteredQrs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">কোনো QR কোড পাওয়া যায়নি</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            আপনার প্রথম অপারেশনাল বা পাবলিক QR কোড তৈরি করতে উপরে "নতুন QR তৈরি করুন" বাটনে ক্লিক করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQrs.map((item) => {
            const qrTargetUrl = `${window.location.origin}/quick/${item.token}`;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-5 border shadow-sm transition flex flex-col justify-between ${
                  item.status === 'ACTIVE' ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.type === 'PUBLIC'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.type === 'PUBLIC' ? 'পাবলিক সার্ভিস' : 'অপারেশনাল এন্ট্রি'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">{item.name}</h3>
                  <div className="text-xs font-mono text-emerald-600 mb-2 font-medium">
                    গন্তব্য: {item.destinationType}
                  </div>
                  {item.description && <p className="text-xs text-slate-600 line-clamp-2 mb-4">{item.description}</p>}

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-center mb-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrTargetUrl)}`}
                      alt={item.name}
                      className="w-32 h-32 object-contain rounded-lg bg-white p-1 border border-slate-200 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(item)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      title="লিংক কপি করুন"
                    >
                      {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handlePrintSingle(item)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      title="প্রিন্ট করুন"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        item.status === 'ACTIVE'
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {item.status === 'ACTIVE' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                    </button>
                    <button
                      onClick={() => handleArchive(item.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="আর্কাইভ"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>নতুন QR কোড তৈরি করুন</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">QR কোডের নাম (যেমন: প্রধান দানবাক্স, আয় এন্ট্রি)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="নাম লিখুন..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ধরন (Type)</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as QRType)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="OPERATIONAL">অপারেশনাল (এন্ট্রি)</option>
                    <option value="PUBLIC">পাবলিক (তথ্য/পোর্টাল)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">গন্তব্য মডিউল (Destination)</label>
                  <select
                    value={destinationType}
                    onChange={(e) => setDestinationType(e.target.value as QRDestinationType)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {DESTINATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">বিবরণ বা নির্দেশনা (ঐচ্ছিক)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="যেমন: এই QR কোডটি হিসাবের কাউন্টারে রাখা আছে..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-md disabled:opacity-50"
                >
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A4 Sheet Print Modal */}
      {isSheetPrintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              <span>A4 QR প্রিন্ট শিট অপশন</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={letterheadOn}
                  onChange={(e) => setLetterheadOn(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">সফটওয়্যার লেটারহেড (Letterhead) যুক্ত করুন</div>
                  <div className="text-xs text-slate-500">মসজিদের নাম, ঠিকানা ও লোগোসহ প্রিন্ট হবে</div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsSheetPrintOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  setIsSheetPrintOpen(false);
                  handlePrintA4Sheet();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md"
              >
                প্রিন্ট শুরু করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

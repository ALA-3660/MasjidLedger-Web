import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Plus,
  Printer,
  Copy,
  Check,
  Power,
  Archive,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Download,
  Eye,
  Trash2,
  Zap,
  Tag,
  Building,
  HeartHandshake,
  Users,
  WalletCards,
  Receipt,
  Wrench,
  Flower2,
  CalendarCheck,
  ArrowRightLeft,
  X,
  Smartphone,
} from 'lucide-react';
import {
  QRCodeEntity,
  QRType,
  QRStatus,
  QRDestinationType,
  LabelPrintFormat,
} from '../types/qrBarcodeTypes';
import { Mosque, User, DonationBox, Staff, MosqueProperty, MosqueAsset } from '../types';
import { api } from '../lib/api';
import {
  STANDARD_MOSQUE_QR_PRESETS,
  generateQrDataUrl,
  buildQrPayload,
} from '../services/qrBarcodeService';

interface QRManagementViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  donationBoxes?: DonationBox[];
  staffList?: Staff[];
  properties?: MosqueProperty[];
  assets?: MosqueAsset[];
  onOpenQuickEntry?: (destination: QRDestinationType, recordId?: string) => void;
  onNavigateToTab?: (tab: string, subTab?: string) => void;
}

export const QRManagementView: React.FC<QRManagementViewProps> = ({
  currentMosque,
  currentUser,
  donationBoxes = [],
  staffList = [],
  properties = [],
  assets = [],
  onOpenQuickEntry,
  onNavigateToTab,
}) => {
  const [qrList, setQrList] = useState<QRCodeEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | QRType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QRStatus>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<QRType>('OPERATIONAL');
  const [destinationType, setDestinationType] = useState<QRDestinationType>('INCOME_NEW');
  const [description, setDescription] = useState('');
  const [targetRecordId, setTargetRecordId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Single QR Preview / Print Modal
  const [selectedQrForPreview, setSelectedQrForPreview] = useState<QRCodeEntity | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  // Bulk Print Sheet Modal
  const [isSheetPrintOpen, setIsSheetPrintOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<number>(2);
  const [letterheadOn, setLetterheadOn] = useState(true);

  // Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkSeeding, setBulkSeeding] = useState(false);

  useEffect(() => {
    loadQrs();
  }, [currentMosque?.id]);

  const loadQrs = async () => {
    try {
      setLoading(true);
      const list = await api.getQrCodes(currentMosque?.id);
      setQrList(list);
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setType('OPERATIONAL');
    setDestinationType('INCOME_NEW');
    setDescription('');
    setTargetRecordId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: QRCodeEntity) => {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type);
    setDestinationType(item.destinationType);
    setDescription(item.description || '');
    setTargetRecordId(item.targetRecordId || '');
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
          targetRecordId: targetRecordId || undefined,
        });
      } else {
        await api.createQrCode({
          mosqueId: currentMosque?.id || 'mosque-mamun-001',
          name,
          type,
          destinationType,
          description,
          targetRecordId: targetRecordId || undefined,
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি এই QR কোডটি সম্পূর্ণ মুছে ফেলতে চান? এটি পুনরায় ফিরিয়ে আনা যাবে না।')) return;
    try {
      await api.deleteQrCode(id);
      loadQrs();
    } catch (err) {
      console.error('Delete QR error:', err);
    }
  };

  const handleRegenerateToken = async (id: string) => {
    if (!window.confirm('টোকেন পরিবর্তন করলে পূর্বের প্রিন্ট করা QR কোড আর কাজ করবে না। আপনি কি নিশ্চিত?')) return;
    try {
      await api.regenerateQrToken(id);
      loadQrs();
      alert('নতুন নিরাপদ টোকেন সফলভাবে তৈরি হয়েছে।');
    } catch (err) {
      console.error('Regenerate token error:', err);
    }
  };

  const handleCreateStandardPack = async () => {
    if (!window.confirm('মসজিদের জন্য ১৪টি প্রমিত পাবলিক ও অপারেশনাল QR কোডের কমপ্লিট প্যাক তৈরি করতে চান?')) return;
    try {
      setBulkSeeding(true);
      await api.bulkCreateQrCodes(STANDARD_MOSQUE_QR_PRESETS);
      loadQrs();
      alert('প্রমিত মসজিদ QR কোড প্যাক সফলভাবে তৈরি হয়েছে!');
    } catch (err) {
      console.error('Create standard pack error:', err);
      alert('QR প্যাক তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setBulkSeeding(false);
    }
  };

  const handleCopyLink = (item: QRCodeEntity) => {
    const url = buildQrPayload(item.token);
    navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenPreview = async (item: QRCodeEntity) => {
    setSelectedQrForPreview(item);
    const url = buildQrPayload(item.token);
    const dataUrl = await generateQrDataUrl(url, { width: 400 });
    setPreviewDataUrl(dataUrl);
  };

  const handleDownloadQrPng = (item: QRCodeEntity) => {
    if (!previewDataUrl) return;
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = `masjidledger-qr-${item.destinationType.toLowerCase()}-${item.token.slice(-6)}.png`;
    a.click();
  };

  // Print Single Stand / Label
  const handlePrintSingle = async (item: QRCodeEntity, format: 'DESK_STAND' | 'STICKER_80' | 'A4_CARD') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const payload = buildQrPayload(item.token);
    const dataUrl = await generateQrDataUrl(payload, { width: 400 });

    if (format === 'STICKER_80') {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${item.name} - স্টিকার</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { font-family: monospace, sans-serif; width: 74mm; margin: 3mm auto; text-align: center; color: #000; }
              .header { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
              .sub { font-size: 10px; color: #444; margin-bottom: 6px; }
              .badge { display: inline-block; border: 1px solid #000; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 4px; margin-bottom: 4px; }
              .title { font-size: 14px; font-weight: bold; margin: 4px 0; }
              .qr-img { width: 180px; height: 180px; margin: 4px auto; }
              .footer { font-size: 9px; font-weight: bold; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
            </style>
          </head>
          <body>
            <div class="header">${currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</div>
            <div class="sub">${currentMosque?.address || ''}</div>
            <div class="badge">${item.type === 'PUBLIC' ? '🌐 পাবলিক QR' : '⚡ অপারেশনাল QR'}</div>
            <div class="title">${item.name}</div>
            <img class="qr-img" src="${dataUrl}" alt="QR" />
            <div class="footer">স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করুন • MasjidLedger</div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
    } else {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${item.name} - অফিসিয়াল QR কার্ড</title>
            <style>
              @page { size: A5 portrait; margin: 12mm; }
              body { font-family: 'SolaimanLipi', 'Kalpurush', sans-serif; text-align: center; color: #0f172a; padding: 20px; }
              .card { border: 3px solid ${item.type === 'PUBLIC' ? '#0284c7' : '#047857'}; border-radius: 20px; padding: 28px; max-width: 440px; margin: 0 auto; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
              .mosque-name { font-size: 20px; font-weight: 800; color: #047857; margin-bottom: 2px; }
              .address { font-size: 12px; color: #64748b; margin-bottom: 14px; }
              .badge { display: inline-block; background: ${item.type === 'PUBLIC' ? '#0284c7' : '#047857'}; color: #fff; font-size: 13px; font-weight: bold; padding: 4px 16px; border-radius: 9999px; margin-bottom: 12px; }
              .title { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 6px; }
              .desc { font-size: 14px; color: #475569; margin-bottom: 16px; }
              .qr-box { margin: 18px auto; padding: 12px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; display: inline-block; }
              .footer { font-size: 13px; color: #047857; margin-top: 16px; font-weight: bold; border-top: 1px dashed #cbd5e1; padding-top: 14px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="mosque-name">${currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</div>
              <div class="address">${currentMosque?.address || ''}</div>
              <div class="badge">${item.type === 'PUBLIC' ? '🌐 পাবলিক সার্ভিস QR' : '⚡ অপারেশনাল কুইক এন্ট্রি QR'}</div>
              <div class="title">${item.name}</div>
              ${item.description ? `<div class="desc">${item.description}</div>` : ''}
              <div class="qr-box">
                <img src="${dataUrl}" alt="QR Code" width="220" height="220" />
              </div>
              <div class="footer">
                মোবাইল ক্যামেরা দিয়ে স্ক্যান করে সরাসরি এন্ট্রি বা সেবা গ্রহণ করুন
              </div>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
    }
    printWindow.document.close();
  };

  // Bulk A4 Print Sheet
  const handlePrintA4Sheet = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const activeList = qrList.filter((q) => q.status === 'ACTIVE');
    const itemsWithImages = await Promise.all(
      activeList.map(async (item) => {
        const payload = buildQrPayload(item.token);
        const dataUrl = await generateQrDataUrl(payload, { width: 220 });
        return { ...item, dataUrl };
      })
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>মসজিদ QR কোড প্রিন্ট শিট</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { font-family: 'SolaimanLipi', 'Kalpurush', sans-serif; color: #0f172a; margin: 0; padding: 8px; }
            .header { text-align: center; border-bottom: 2px solid #047857; padding-bottom: 8px; margin-bottom: 14px; }
            .grid { display: grid; grid-template-columns: repeat(${gridColumns}, 1fr); gap: 12px; }
            .qr-item { border: 2px solid #cbd5e1; border-radius: 12px; padding: 12px; text-align: center; background: #fff; page-break-inside: avoid; }
            .name { font-size: 15px; font-weight: 800; color: #1e293b; margin: 4px 0; }
            .tag { font-size: 11px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-bottom: 6px; color: #475569; }
            .badge { font-size: 11px; font-weight: bold; color: #047857; }
          </style>
        </head>
        <body>
          ${
            letterheadOn
              ? `
            <div class="header">
              <h2 style="margin:0; font-size:18px; color:#047857;">${currentMosque?.nameBn || 'বাইতুল আমান জামে মসজিদ'}</h2>
              <p style="margin:2px 0 0; font-size:11px; color:#64748b;">${currentMosque?.address || ''} • অফিসিয়াল স্মার্ট QR কোড শিট</p>
            </div>
          `
              : ''
          }
          <div class="grid">
            ${itemsWithImages
              .map(
                (item) => `
              <div class="qr-item">
                <div class="badge">${item.type === 'PUBLIC' ? '🌐 পাবলিক QR' : '⚡ অপারেশনাল QR'}</div>
                <div class="name">${item.name}</div>
                <div class="tag">${item.destinationType}</div>
                <div>
                  <img src="${item.dataUrl}" width="${gridColumns === 2 ? 140 : 110}" height="${gridColumns === 2 ? 140 : 110}" />
                </div>
                <div style="font-size:10px; color:#64748b; margin-top:4px;">স্ক্যান করে সরাসরি এন্ট্রি করুন</div>
              </div>
            `
              )
              .join('')}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredQrs = qrList.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.destinationType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const getDestinationIcon = (dest: QRDestinationType) => {
    switch (dest) {
      case 'INCOME_NEW':
        return <ArrowRightLeft className="w-4 h-4 text-emerald-600" />;
      case 'EXPENSE_NEW':
        return <Receipt className="w-4 h-4 text-rose-600" />;
      case 'JUMUAH_COLLECTION':
        return <Users className="w-4 h-4 text-teal-600" />;
      case 'DONATION_BOX_COLLECTION':
        return <Tag className="w-4 h-4 text-amber-600" />;
      case 'DONATION_NEW':
        return <HeartHandshake className="w-4 h-4 text-emerald-600" />;
      case 'STAFF_SALARY':
        return <WalletCards className="w-4 h-4 text-indigo-600" />;
      case 'WAQF_RENT':
        return <Building className="w-4 h-4 text-cyan-600" />;
      case 'ASSET_SERVICE':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'CEMETERY_BURIAL':
        return <Flower2 className="w-4 h-4 text-slate-600" />;
      case 'COMMITTEE_MEETING':
        return <CalendarCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>স্মার্ট QR কোড ও কুইক অপারেশনাল হাব</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">QR কোড ব্যবস্থাপনা কেন্দ্র</h1>
          <p className="text-emerald-100 text-sm max-w-2xl">
            ডেস্ক, দানবাক্স, দোকান ও কাউন্টারে প্রিন্ট করার উপযোগী স্মার্ট QR কোড তৈরি করুন। ফোন দিয়ে স্ক্যান করে তাৎক্ষণিক এন্ট্রি পরিচালনা করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 shrink-0">
          <button
            onClick={handleCreateStandardPack}
            disabled={bulkSeeding}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 border border-emerald-400/40 shadow-md"
          >
            {bulkSeeding ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            )}
            <span>প্রমিত মসজিদ QR প্যাক তৈরি করুন</span>
          </button>
          <button
            onClick={() => setIsSheetPrintOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 border border-white/20 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>A4 প্রিন্ট শিট</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
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
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল ধরন ({qrList.length})
            </button>
            <button
              onClick={() => setTypeFilter('PUBLIC')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'PUBLIC'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌐 পাবলিক ({qrList.filter((q) => q.type === 'PUBLIC').length})
            </button>
            <button
              onClick={() => setTypeFilter('OPERATIONAL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'OPERATIONAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ অপারেশনাল ({qrList.filter((q) => q.type === 'OPERATIONAL').length})
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 border border-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">সকল স্ট্যাটাস</option>
            <option value="ACTIVE">সক্রিয় (Active)</option>
            <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
            <option value="ARCHIVED">আর্কাইভড (Archived)</option>
          </select>
        </div>
      </div>

      {/* QR Code Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <p className="text-sm font-semibold">QR কোড তালিকা লোড হচ্ছে...</p>
        </div>
      ) : filteredQrs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <QrCode className="w-16 h-16 text-slate-300 mx-auto stroke-[1.5]" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">কোনো QR কোড পাওয়া যায়নি</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {searchTerm
                ? 'আপনার সার্চ অনুযায়ী কোনো QR কোড মিলেনি।'
                : 'আপনার মসজিদে এখনও কোনো QR কোড তৈরি করা হয়নি। এক ক্লিকে ১৪টি প্রমিত QR তৈরি করুন।'}
            </p>
          </div>
          {!searchTerm && (
            <button
              onClick={handleCreateStandardPack}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-md"
            >
              প্রমিত মসজিদ QR প্যাক তৈরি করুন
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQrs.map((item) => {
            const isPublic = item.type === 'PUBLIC';
            const isActive = item.status === 'ACTIVE';

            return (
              <div
                key={item.id}
                id={`qr-card-${item.id}`}
                className={`bg-white rounded-3xl p-5 border transition-all hover:shadow-lg flex flex-col justify-between ${
                  isActive ? 'border-slate-200 shadow-xs' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                        isPublic
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isPublic ? '🌐 পাবলিক QR' : '⚡ অপারেশনাল QR'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'INACTIVE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.status === 'ACTIVE' ? 'সক্রিয়' : item.status === 'INACTIVE' ? 'বন্ধ' : 'আর্কাইভ'}
                    </span>
                  </div>

                  {/* Title & Destination */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">{item.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      {getDestinationIcon(item.destinationType)}
                      <span className="font-mono">{item.destinationType}</span>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                  )}

                  {/* Stats Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>স্ক্যান সংখ্যা: {item.useCount || 0}</span>
                    <span>{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleDateString('bn-BD') : 'ব্যবহার হয়নি'}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenPreview(item)}
                      title="QR প্রিভিউ ও ডাউনলোড"
                      className="p-2 hover:bg-slate-100 text-slate-700 rounded-xl transition text-xs flex items-center gap-1 border border-slate-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">প্রিভিউ</span>
                    </button>
                    <button
                      onClick={() => handleCopyLink(item)}
                      title="লিংক কপি করুন"
                      className="p-2 hover:bg-slate-100 text-slate-700 rounded-xl transition text-xs border border-slate-200"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isPublic && onOpenQuickEntry && (
                      <button
                        onClick={() => onOpenQuickEntry(item.destinationType, item.targetRecordId)}
                        title="সরাসরি কুইক এন্ট্রি খুলুন"
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1 border border-emerald-200 transition"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        <span>এন্ট্রি টেস্ট</span>
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintSingle(item, 'DESK_STAND')}
                      title="প্রিন্ট করুন"
                      className="p-2 hover:bg-slate-100 text-slate-700 rounded-xl transition border border-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      title={item.status === 'ACTIVE' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                      className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition border border-slate-200"
                    >
                      <Power className={`w-3.5 h-3.5 ${item.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="মুছে ফেলুন"
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition border border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-slate-900">
                {editingId ? 'QR কোড সম্পাদনা' : 'নতুন স্মার্ট QR কোড তৈরি'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">QR কোডের নাম *</label>
                <input
                  type="text"
                  placeholder="যেমন: ক্যাশিয়ার টেবিল আয় এন্ট্রি"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-sm font-medium outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ধরন *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as QRType)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs font-bold outline-hidden"
                  >
                    <option value="OPERATIONAL">⚡ অপারেশনাল (পাসওয়ার্ড সুরক্ষিত)</option>
                    <option value="PUBLIC">🌐 পাবলিক (উন্মুক্ত সেবা)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">গন্তব্য মডিউল *</label>
                  <select
                    value={destinationType}
                    onChange={(e) => setDestinationType(e.target.value as QRDestinationType)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-xs font-bold outline-hidden"
                  >
                    {type === 'PUBLIC' ? (
                      <>
                        <option value="PUBLIC_PORTAL">মসজিদ পাবলিক পোর্টাল</option>
                        <option value="DONATION">অনলাইন দান ও সাদাকাহ</option>
                        <option value="PRAYER_SCHEDULE">নামাজের সময়সূচি ও জামাত</option>
                        <option value="RAMADAN_CALENDAR">রমজান ও সেহরি-ইফতার</option>
                        <option value="NOTICE_BOARD">মসজিদ নোটিশ বোর্ড</option>
                      </>
                    ) : (
                      <>
                        <option value="INCOME_NEW">💰 কুইক আয় এন্ট্রি</option>
                        <option value="EXPENSE_NEW">💸 কুইক ব্যয় ভাউচার</option>
                        <option value="JUMUAH_COLLECTION">🕌 জুমার জামাত কালেকশন</option>
                        <option value="DONATION_BOX_COLLECTION">📦 দানবাক্স কালেকশন</option>
                        <option value="DONATION_NEW">🤝 সাধারণ দান ও রশিদ</option>
                        <option value="STAFF_SALARY">💳 স্টাফ বেতন পরিশোধ</option>
                        <option value="WAQF_RENT">🏬 ওয়াকফ দোকান ভাড়া</option>
                        <option value="ASSET_SERVICE">🔧 সম্পদ সার্ভিসিং</option>
                        <option value="CEMETERY_BURIAL">⚰️ কবরস্থান দাফন রেকর্ড</option>
                        <option value="COMMITTEE_MEETING">📋 কমিটি মিটিং</option>
                        <option value="FUND_TRANSFER">🔄 তহবিল স্থানান্তর</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Target Record Linker */}
              {destinationType === 'DONATION_BOX_COLLECTION' && donationBoxes.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">নির্দিষ্ট দানবাক্স লিংক করুন (ঐচ্ছিক)</label>
                  <select
                    value={targetRecordId}
                    onChange={(e) => setTargetRecordId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs font-semibold outline-hidden"
                  >
                    <option value="">-- সাধারণ বক্স সিলেক্টর --</option>
                    {donationBoxes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameBn || b.name} ({b.boxCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {destinationType === 'WAQF_RENT' && properties.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">নির্দিষ্ট দোকান/ইউনিট লিংক করুন (ঐচ্ছিক)</label>
                  <select
                    value={targetRecordId}
                    onChange={(e) => setTargetRecordId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs font-semibold outline-hidden"
                  >
                    <option value="">-- সাধারণ দোকান সিলেক্টর --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameBn || p.name} ({p.propertyCode}) - {p.currentTenantName || 'খালি'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {destinationType === 'ASSET_SERVICE' && assets.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">নির্দিষ্ট সম্পদ লিংক করুন (ঐচ্ছিক)</label>
                  <select
                    value={targetRecordId}
                    onChange={(e) => setTargetRecordId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs font-semibold outline-hidden"
                  >
                    <option value="">-- সাধারণ সম্পদ সিলেক্টর --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nameBn || a.name} ({a.assetCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">বিবরণ ও অবস্থান (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  placeholder="কোথায় বসানো হবে বা কার ব্যবহারের জন্য..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl py-2 px-3 text-xs font-medium outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  {submitting ? 'সংরক্ষণ হচ্ছে...' : 'QR সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE QR PREVIEW MODAL */}
      {selectedQrForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-emerald-700">QR কোড কার্ড প্রিভিউ</span>
              <button
                onClick={() => setSelectedQrForPreview(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium">{currentMosque?.nameBn}</div>
              <h3 className="font-extrabold text-slate-900 text-lg mt-0.5">{selectedQrForPreview.name}</h3>
              <span className="inline-block mt-1 text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                {selectedQrForPreview.destinationType}
              </span>
            </div>

            {previewDataUrl && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
                <img src={previewDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleDownloadQrPng(selectedQrForPreview)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG ডাউনলোড</span>
              </button>
              <button
                onClick={() => handlePrintSingle(selectedQrForPreview, 'DESK_STAND')}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট কার্ড</span>
              </button>
            </div>

            <button
              onClick={() => handleRegenerateToken(selectedQrForPreview.id)}
              className="text-[11px] text-rose-600 hover:underline pt-1 block mx-auto"
            >
              নিরাপত্তা টোকেন রিফ্রেশ করুন
            </button>
          </div>
        </div>
      )}

      {/* BULK A4 SHEET PRINT MODAL */}
      {isSheetPrintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>A4 QR কোড প্রিন্ট শিট তৈরি</span>
              </h3>
              <button
                onClick={() => setIsSheetPrintOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              সকল সক্রিয় QR কোড একটি A4 পৃষ্ঠায় সুন্দর গ্রিড ফরম্যাটে সাজিয়ে একসাথে প্রিন্ট করুন। লেমিনেটিং বা কাটিং করে ডেস্ক ও বক্সে লাগাতে পারবেন।
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">গ্রিড কলাম বিন্যাস</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGridColumns(2)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      gridColumns === 2 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    ২ কলাম (বড় সাইজ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridColumns(3)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      gridColumns === 3 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    ৩ কলাম (কমপ্যাক্ট সাইজ)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">মসজিদ লেটারহেড ও হেডার যোগ করুন</span>
                <input
                  type="checkbox"
                  checked={letterheadOn}
                  onChange={(e) => setLetterheadOn(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSheetPrintOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSheetPrintOpen(false);
                  handlePrintA4Sheet();
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট শুরু করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

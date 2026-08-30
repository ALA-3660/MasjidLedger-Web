import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Layers,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  HeartHandshake,
  Box,
  Receipt,
  UserCheck,
  Building,
  Wallet,
  Package,
  Wrench,
  Settings,
  Crosshair,
  CalendarCheck,
  FileCheck,
  Target,
  Users,
  Grid,
  Filter,
} from 'lucide-react';
import { Mosque, User } from '../types';
import { Language } from '../lib/i18n';
import {
  MODULE_ACTIONS,
  buildQrPayload,
} from '../services/qrBarcodeService';
import { QrActionDefinition, QrActionKey } from '../types/qrBarcodeTypes';

interface QrActionCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language?: Language;
  onOpenScanner?: () => void;
}

export const QrActionCardsModal: React.FC<QrActionCardsModalProps> = ({
  isOpen,
  onClose,
  currentMosque,
  currentUser,
  language = 'bn',
  onOpenScanner,
}) => {
  const [selectedAction, setSelectedAction] = useState<QrActionDefinition>(MODULE_ACTIONS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [qrDataUrlMap, setQrDataUrlMap] = useState<Record<string, string>>({});
  const [printLayout, setPrintLayout] = useState<'CARD' | 'MINI_STICKER' | 'FULL_SHEET'>('CARD');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generate QR image data URLs for all module actions
  useEffect(() => {
    if (!isOpen) return;

    MODULE_ACTIONS.forEach((action) => {
      const payload = buildQrPayload(action.id);
      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => {
          setQrDataUrlMap((prev) => ({ ...prev, [action.id]: url }));
        })
        .catch((err) => console.error('QR generation error for action:', action.id, err));
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(MODULE_ACTIONS.map((a) => a.categoryBn)))];

  const filteredActions =
    selectedCategory === 'ALL'
      ? MODULE_ACTIONS
      : MODULE_ACTIONS.filter((a) => a.categoryBn === selectedCategory);

  const handleCopyLink = (action: QrActionDefinition) => {
    const payload = buildQrPayload(action.id);
    navigator.clipboard.writeText(payload);
    setCopiedId(action.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQr = (action: QrActionDefinition) => {
    const url = qrDataUrlMap[action.id];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-Action-${action.id}.png`;
    a.click();
  };

  const handlePrintSingleCard = (action: QrActionDefinition) => {
    const url = qrDataUrlMap[action.id];
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Action QR Card - ${action.titleBn}</title>
          <style>
            @page { size: A5 portrait; margin: 10mm; }
            * { box-iozing: border-box; }
            body {
              font-family: 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif;
              text-align: center;
              padding: 15px;
              color: #0f172a;
              background: #fff;
              margin: 0;
            }
            .action-card {
              border: 3px solid #0f172a;
              border-radius: 20px;
              padding: 24px 20px;
              max-width: 420px;
              margin: 0 auto;
              background: #ffffff;
            }
            .bismillah {
              font-size: 13px;
              color: #475569;
              margin-bottom: 6px;
            }
            .mosque-name {
              font-size: 20px;
              font-weight: 800;
              color: #1e3a8a;
              margin-bottom: 4px;
            }
            .mosque-address {
              font-size: 11px;
              color: #64748b;
              margin-bottom: 16px;
            }
            .action-badge {
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              font-weight: bold;
              font-size: 14px;
              padding: 8px 18px;
              border-radius: 9999px;
              margin-bottom: 16px;
              letter-spacing: 0.5px;
            }
            .qr-image {
              width: 220px;
              height: 220px;
              margin: 0 auto 16px;
              display: block;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 6px;
            }
            .action-title {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .action-desc {
              font-size: 12px;
              color: #475569;
              line-height: 1.4;
              margin-bottom: 16px;
            }
            .scan-prompt {
              font-size: 13px;
              font-weight: bold;
              color: #047857;
              background: #ecfdf5;
              padding: 6px 12px;
              border-radius: 8px;
              display: inline-block;
              border: 1px dashed #059669;
            }
            .footer-tag {
              font-size: 10px;
              color: #94a3b8;
              margin-top: 14px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="action-card">
            <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div class="mosque-name">${currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}</div>
            <div class="mosque-address">${currentMosque?.address || 'মিরপুর-১২, ঢাকা-১২১৬'}</div>
            
            <div class="action-badge">📷 SCAN TO OPEN FORM</div>
            
            <img class="qr-image" src="${url}" alt="QR" />
            
            <div class="action-title">${action.titleBn}</div>
            <div class="action-desc">${action.descriptionBn}</div>
            
            <div class="scan-prompt">
              📱 মোবাইল ক্যামেরা দিয়ে স্ক্যান করলেই সরাসরি ফর্মটি খুলবে
            </div>
            
            <div class="footer-tag">
              MasjidLedger System Action Code: ${action.id}
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintFullSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = filteredActions
      .map((action) => {
        const url = qrDataUrlMap[action.id] || '';
        return `
          <div class="mini-card">
            <div class="m-mosque">${currentMosque?.nameBn || 'মসজিদলেজার'}</div>
            <div class="m-badge">${action.categoryBn}</div>
            <img class="m-qr" src="${url}" alt="${action.id}" />
            <div class="m-title">${action.titleBn}</div>
            <div class="m-code">${action.id}</div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MasjidLedger Action QR Catalog Sheet</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif;
              text-align: center;
              padding: 0;
              margin: 0;
              color: #0f172a;
            }
            .header-strip {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .sheet-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .mini-card {
              border: 1.5px solid #0f172a;
              border-radius: 12px;
              padding: 10px 8px;
              text-align: center;
              page-break-inside: avoid;
            }
            .m-mosque {
              font-size: 11px;
              font-weight: bold;
              color: #1e3a8a;
            }
            .m-badge {
              font-size: 9px;
              background: #f1f5f9;
              padding: 2px 6px;
              border-radius: 9999px;
              display: inline-block;
              margin: 3px 0 6px;
              font-weight: 600;
            }
            .m-qr {
              width: 120px;
              height: 120px;
              display: block;
              margin: 0 auto 6px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
            }
            .m-title {
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 2px;
            }
            .m-code {
              font-size: 9px;
              font-family: monospace;
              color: #64748b;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header-strip">
            <h2 style="margin:0; font-size:18px;">${currentMosque?.nameBn || 'মসজিদলেজার'} — মডিউল অ্যাকশন QR শিট</h2>
            <p style="margin:2px 0 0; font-size:11px; color:#64748b;">মোবাইল বা ট্যাবলেট দিয়ে স্ক্যান করে সরাসরি ফর্ম ও কাজ সম্পন্ন করুন</p>
          </div>
          <div class="sheet-grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      id="modal-qr-action-hub"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in print:hidden"
    >
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base flex items-center gap-2 font-siliguri">
                <span>{language === 'bn' ? 'মডিউল অ্যাকশন QR কোড ও প্রিন্ট সেন্টার' : 'Module Action QR Code & Print Center'}</span>
                <span className="bg-blue-600/60 text-blue-200 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {MODULE_ACTIONS.length} Actions
                </span>
              </h3>
              <p className="text-xs text-blue-200/80 font-baloo">
                {language === 'bn'
                  ? 'ডেস্ক, দানবাক্স, ওয়াকফ মার্কেট বা ক্যাশ কাউন্টারে লাগানোর জন্য প্রিন্টযোগ্য অ্যাকশন QR'
                  : 'Printable action cards for desks, donation boxes, waqf properties and cash counters'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenScanner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer font-siliguri shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'স্ক্যানার খুলুন' : 'Open Scanner'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Chips & Print Actions Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shrink-0 flex-wrap gap-2">
          {/* Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer font-siliguri ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? (language === 'bn' ? 'সকল অ্যাকশন (All)' : 'All Actions') : cat}
              </button>
            ))}
          </div>

          {/* Print All Sheet Action */}
          <button
            type="button"
            onClick={handlePrintFullSheet}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs cursor-pointer font-siliguri"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'bn' ? 'সম্পূর্ণ A4 শিট প্রিন্ট করুন' : 'Print A4 Sheet'}</span>
          </button>
        </div>

        {/* Main Content Split: Action Catalog & Live Printable Card Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 font-siliguri">
          {/* Left Column: Action Items List */}
          <div className="md:col-span-6 space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredActions.map((action) => {
              const isSelected = selectedAction.id === action.id;
              const qrUrl = qrDataUrlMap[action.id];

              return (
                <div
                  key={action.id}
                  onClick={() => setSelectedAction(action)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      {qrUrl ? (
                        <img src={qrUrl} alt="QR" className="w-full h-full object-contain" />
                      ) : (
                        <QrCode className="w-6 h-6 text-slate-400 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {action.titleBn}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold">
                          {action.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {action.descriptionBn}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {action.categoryBn}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right Column: Live Card Stand & Sticker Preview */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-between space-y-4">
            {/* Printable Card Frame */}
            <div className="w-full max-w-[320px] bg-white border-2 border-slate-900 rounded-2xl p-5 shadow-lg text-center space-y-3">
              <div className="text-[10px] text-slate-500 font-medium">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
              <h4 className="font-heading font-extrabold text-sm text-blue-900">
                {currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}
              </h4>

              <div className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                📷 SCAN TO OPEN FORM
              </div>

              {/* QR Image Box */}
              <div className="w-40 h-40 mx-auto p-2 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-center">
                {qrDataUrlMap[selectedAction.id] ? (
                  <img
                    src={qrDataUrlMap[selectedAction.id]}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div>
                <h5 className="font-bold text-slate-900 text-sm">{selectedAction.titleBn}</h5>
                <p className="text-[11px] text-slate-600 mt-0.5">{selectedAction.descriptionBn}</p>
              </div>

              <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 py-1 px-2 rounded-lg">
                📱 মোবাইল ক্যামেরা দিয়ে স্ক্যান করুন
              </div>

              <div className="font-mono text-[9px] text-slate-400">
                Action Code: {selectedAction.id}
              </div>
            </div>

            {/* Quick Actions on Selected Card */}
            <div className="w-full flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => handleCopyLink(selectedAction)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                {copiedId === selectedAction.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedId === selectedAction.id ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadQr(selectedAction)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>QR ডাউনলোড</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintSingleCard(selectedAction)}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>স্টিকার প্রিন্ট</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center shrink-0 font-siliguri">
          <p className="text-xs text-slate-500 font-baloo">
            {language === 'bn'
              ? 'নিরাপত্তা বার্তা: এই QR কোডগুলোতে কোনো সংবেদনশীল ব্যালেন্স বা ব্যক্তিগত তথ্য থাকে না।'
              : 'Security Note: QR codes contain no plain financial balances or private personal details.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            {language === 'bn' ? 'সম্পন্ন' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

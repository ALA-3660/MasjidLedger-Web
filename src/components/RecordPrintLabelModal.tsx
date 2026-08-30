import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  QrCode,
  Barcode as BarcodeIcon,
  Tag,
  Grid,
  CreditCard,
  Building2,
  ShieldCheck,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { ResolvedRecordItem, LabelPrintFormat } from '../types/qrBarcodeTypes';
import { Barcode128, RecordQrCode } from './BarcodeQRService';
import { Mosque } from '../types';

interface RecordPrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordItem: ResolvedRecordItem | null;
  mosque?: Mosque | null;
}

export const RecordPrintLabelModal: React.FC<RecordPrintLabelModalProps> = ({
  isOpen,
  onClose,
  recordItem,
  mosque,
}) => {
  const [printFormat, setPrintFormat] = useState<LabelPrintFormat>('TAG_COMPACT');
  const [copies, setCopies] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!recordItem) return;
    QRCode.toDataURL(recordItem.canonicalCode, {
      width: 250,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Label QR Gen error:', err));
  }, [recordItem]);

  if (!isOpen || !recordItem) return null;

  const mosqueNameBn = mosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স';
  const mosqueAddress = mosque?.address || 'মিরপুর-১২, ঢাকা-১২১৬';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(recordItem.canonicalCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrImgSrc = qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(recordItem.canonicalCode)}`;

    let printContent = '';

    if (printFormat === 'TAG_COMPACT') {
      // 80mm x 50mm Thermal or Compact Sticker Tag
      printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${recordItem.canonicalCode} - Label Tag</title>
            <style>
              @page { size: 80mm 50mm; margin: 3mm; }
              body {
                font-family: 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif;
                margin: 0;
                padding: 4px;
                color: #0f172a;
                background: #fff;
              }
              .label-card {
                border: 1.5px solid #0f172a;
                border-radius: 6px;
                padding: 6px 8px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 44mm;
              }
              .header {
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 3px;
                margin-bottom: 3px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .mosque-name {
                font-size: 11px;
                font-weight: 800;
                color: #047857;
              }
              .category-tag {
                font-size: 8px;
                font-weight: 700;
                background: #f1f5f9;
                padding: 1px 4px;
                border-radius: 3px;
              }
              .record-title {
                font-size: 12px;
                font-weight: 800;
                margin-bottom: 2px;
                line-height: 1.2;
              }
              .content-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                margin-top: 2px;
              }
              .qr-box {
                width: 55px;
                height: 55px;
              }
              .barcode-box {
                flex: 1;
                text-align: center;
              }
              .code-text {
                font-family: monospace;
                font-weight: 800;
                font-size: 11px;
                letter-spacing: 0.5px;
                margin-top: 2px;
              }
              .meta-text {
                font-size: 8px;
                color: #64748b;
              }
            </style>
          </head>
          <body>
            ${Array.from({ length: copies })
              .map(
                () => `
              <div class="label-card">
                <div class="header">
                  <div class="mosque-name">${mosqueNameBn}</div>
                  <div class="category-tag">${recordItem.categoryBn || 'রেকর্ড'}</div>
                </div>
                <div class="record-title">${recordItem.titleBn}</div>
                <div class="meta-text">${recordItem.subtitleBn || ''}</div>
                <div class="content-row">
                  <div class="barcode-box">
                    <div class="code-text">${recordItem.canonicalCode}</div>
                    <div style="font-size: 8px; color: #475569; margin-top: 2px;">ম্যানেজমেন্ট ট্র্যাকিং বারকোড</div>
                  </div>
                  <div class="qr-box">
                    <img src="${qrImgSrc}" style="width: 55px; height: 55px;" />
                  </div>
                </div>
              </div>
            `
              )
              .join('<div style="page-break-after: always;"></div>')}
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;
    } else if (printFormat === 'ID_CARD') {
      // 85.6mm x 53.98mm CR80 Staff ID Card
      printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${recordItem.canonicalCode} - Staff ID Card</title>
            <style>
              @page { size: 86mm 54mm portrait; margin: 0; }
              body {
                font-family: 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif;
                margin: 0;
                padding: 0;
                background: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
              }
              .id-card {
                width: 85mm;
                height: 53.5mm;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
              }
              .card-header {
                background: linear-gradient(135deg, #047857, #065f46);
                color: #fff;
                padding: 5px 8px;
                text-align: center;
              }
              .card-header .mosque {
                font-size: 11px;
                font-weight: 800;
              }
              .card-header .sub {
                font-size: 8px;
                opacity: 0.9;
              }
              .card-body {
                padding: 6px 10px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .avatar {
                width: 44px;
                height: 48px;
                border-radius: 4px;
                border: 1px solid #cbd5e1;
                background: #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
              }
              .info {
                flex: 1;
              }
              .name {
                font-size: 12px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.2;
              }
              .designation {
                font-size: 10px;
                font-weight: 700;
                color: #047857;
                margin-top: 1px;
              }
              .field {
                font-size: 8px;
                color: #475569;
                margin-top: 1px;
              }
              .card-footer {
                background: #f8fafc;
                border-top: 1px dashed #cbd5e1;
                padding: 4px 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
              }
              .card-footer .id-code {
                font-family: monospace;
                font-weight: 800;
                font-size: 10px;
                color: #0f172a;
              }
            </style>
          </head>
          <body>
            <div class="id-card">
              <div class="card-header">
                <div class="mosque">${mosqueNameBn}</div>
                <div class="sub">অফিসিয়াল পরিচিতি ও স্টাফ আইডি কার্ড</div>
              </div>
              <div class="card-body">
                <div class="avatar">👤</div>
                <div class="info">
                  <div class="name">${recordItem.titleBn}</div>
                  <div class="designation">${recordItem.subtitleBn || 'সম্মানিত কর্মকর্তা'}</div>
                  <div class="field">আইডি নং: <strong>${recordItem.canonicalCode}</strong></div>
                  <div class="field">রক্তের গ্রুপ: <strong>${recordItem.rawRecord?.bloodGroup || 'N/A'}</strong></div>
                </div>
                <div>
                  <img src="${qrImgSrc}" style="width: 44px; height: 44px;" />
                </div>
              </div>
              <div class="card-footer">
                <div class="id-code">${recordItem.canonicalCode}</div>
                <div style="font-size: 7px; color: #64748b;">কর্তৃপক্ষের স্বাক্ষর</div>
              </div>
            </div>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;
    } else {
      // A4 Sheet Multi-Sticker Grid (e.g. 6 to 12 labels per sheet)
      printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${recordItem.canonicalCode} - A4 Sheet Stickers</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body {
                font-family: 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif;
                margin: 0;
                padding: 0;
                color: #0f172a;
              }
              .page-header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 2px solid #047857;
                padding-bottom: 8px;
              }
              .page-header h2 {
                margin: 0 0 4px 0;
                color: #047857;
                font-size: 18px;
              }
              .grid-container {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10mm;
              }
              .sticker {
                border: 1.5px dashed #047857;
                border-radius: 8px;
                padding: 10px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 55mm;
                background: #ffffff;
              }
              .st-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 4px;
              }
              .st-mosque { font-size: 11px; font-weight: bold; color: #047857; }
              .st-cat { font-size: 9px; font-weight: 700; background: #ecfdf5; color: #065f46; padding: 2px 6px; border-radius: 4px; }
              .st-title { font-size: 13px; font-weight: 800; margin-top: 4px; }
              .st-sub { font-size: 9px; color: #64748b; margin-top: 1px; }
              .st-body {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 6px;
              }
              .st-code {
                font-family: monospace;
                font-weight: 800;
                font-size: 13px;
                letter-spacing: 1px;
                background: #f8fafc;
                padding: 4px 8px;
                border-radius: 4px;
                border: 1px solid #cbd5e1;
                display: inline-block;
              }
            </style>
          </head>
          <body>
            <div class="page-header">
              <h2>${mosqueNameBn}</h2>
              <div style="font-size: 12px; color: #64748b;">কিউআর ও বারকোড লেবেল শিট (Sticker Grid)</div>
            </div>
            <div class="grid-container">
              ${Array.from({ length: 8 })
                .map(
                  () => `
                <div class="sticker">
                  <div class="st-top">
                    <div class="st-mosque">${mosqueNameBn}</div>
                    <div class="st-cat">${recordItem.categoryBn || 'সম্পদ/রেকর্ড'}</div>
                  </div>
                  <div>
                    <div class="st-title">${recordItem.titleBn}</div>
                    <div class="st-sub">${recordItem.subtitleBn || ''}</div>
                  </div>
                  <div class="st-body">
                    <div>
                      <div class="st-code">${recordItem.canonicalCode}</div>
                      <div style="font-size: 8px; color: #64748b; margin-top: 4px;">স্ক্যান করে সরাসরি অ্যাকশন ও তথ্য পান</div>
                    </div>
                    <img src="${qrImgSrc}" style="width: 65px; height: 65px;" />
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-800 rounded-xl">
              <Printer className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">রেকর্ড কিউআর ও বারকোড প্রিন্ট হাব</h3>
              <p className="text-xs text-emerald-200">
                {recordItem.titleBn} ({recordItem.canonicalCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-300 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Format Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              প্রিন্ট ফরম্যাট ও লেআউট নির্বাচন করুন
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPrintFormat('TAG_COMPACT')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  printFormat === 'TAG_COMPACT'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Tag className="w-5 h-5 mx-auto mb-1 text-emerald-700" />
                <div className="text-xs">কমপ্যাক্ট ট্যাগ</div>
                <div className="text-[10px] text-slate-500 font-normal">২"x১" / থার্মাল স্টিকার</div>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('A4_SHEET_GRID')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  printFormat === 'A4_SHEET_GRID'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Grid className="w-5 h-5 mx-auto mb-1 text-blue-700" />
                <div className="text-xs">A4 স্টিকার শিট</div>
                <div className="text-[10px] text-slate-500 font-normal">৮টি স্টিকার একসাথে</div>
              </button>

              <button
                type="button"
                onClick={() => setPrintFormat('ID_CARD')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  printFormat === 'ID_CARD'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5 mx-auto mb-1 text-purple-700" />
                <div className="text-xs">আইডি কার্ড ব্যাজ</div>
                <div className="text-[10px] text-slate-500 font-normal">স্টাফ / অফিসিয়াল কার্ড</div>
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              লাইভ প্রিন্ট প্রিভিউ (Print Preview)
            </span>

            {/* Label Tag Preview */}
            <div className="w-full max-w-sm bg-white p-4 rounded-xl border-2 border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="text-xs font-bold text-emerald-800">{mosqueNameBn}</div>
                <div className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {recordItem.categoryBn || 'রেকর্ড'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{recordItem.titleBn}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-1">{recordItem.subtitleBn}</p>
              </div>

              <div className="flex items-center justify-between pt-1 gap-3">
                <div className="flex-1 text-center">
                  <Barcode128 value={recordItem.canonicalCode} height={30} width={1.3} showText={false} />
                  <div className="font-mono text-xs font-bold text-slate-800 tracking-wider mt-1">
                    {recordItem.canonicalCode}
                  </div>
                </div>
                <div className="p-1 bg-white border border-slate-200 rounded-lg shrink-0">
                  <RecordQrCode value={recordItem.canonicalCode} size={65} />
                </div>
              </div>
            </div>
          </div>

          {/* Copy Code & Print Controls */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600">ক্যানোনিকাল কোড:</span>
              <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-slate-200">
                {recordItem.canonicalCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'কোড কপি'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            বাতিল
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>এখনই প্রিন্ট করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};

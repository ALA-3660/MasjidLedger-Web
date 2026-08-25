import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer, Copy, Check, ExternalLink } from 'lucide-react';
import { Mosque } from '../types';

interface QRViewerProps {
  value: string;
  size?: number;
  title?: string;
  subtitle?: string;
  showDownload?: boolean;
  showPrint?: boolean;
  showCopy?: boolean;
  boxCode?: string;
  mosque?: Mosque | null;
}

export const QRViewer: React.FC<QRViewerProps> = ({
  value,
  size = 180,
  title,
  subtitle,
  showDownload = true,
  showPrint = true,
  showCopy = true,
  boxCode,
  mosque,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('QR Gen error:', err));
  }, [value, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR-${boxCode || 'code'}.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>দানবাক্স QR কোড - ${boxCode || ''}</title>
          <style>
            @page { size: A5 portrait; margin: 15mm; }
            body {
              font-family: 'SolaimanLipi', 'Kalpurush', system-ui, sans-serif;
              text-align: center;
              padding: 20px;
              color: #0f172a;
            }
            .sticker-card {
              border: 3px solid #047857;
              border-radius: 16px;
              padding: 24px;
              max-width: 400px;
              margin: 0 auto;
            }
            .mosque-name {
              font-size: 20px;
              font-weight: 800;
              color: #047857;
              margin-bottom: 4px;
            }
            .mosque-address {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 16px;
            }
            .box-badge {
              display: inline-block;
              background: #047857;
              color: #fff;
              font-weight: bold;
              font-size: 16px;
              padding: 6px 16px;
              border-radius: 9999px;
              margin-bottom: 16px;
            }
            .qr-img {
              width: 220px;
              height: 220px;
              margin: 0 auto 16px;
              display: block;
            }
            .instructions {
              font-size: 13px;
              color: #334155;
              line-height: 1.5;
              font-weight: 600;
            }
            .ayah {
              font-size: 11px;
              color: #047857;
              margin-top: 14px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="mosque-name">${mosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স'}</div>
            <div class="mosque-address">${mosque?.address || 'মিরপুর-১২, ঢাকা-১২১৬'}</div>
            ${boxCode ? `<div class="box-badge">দানবাক্স নং: ${boxCode}</div>` : ''}
            <img class="qr-img" src="${dataUrl}" alt="QR" />
            <div class="instructions">
              যেকোনো মোবাইল ব্যাংকিং / ক্যামেরা দিয়ে স্ক্যান করে দান করুন
            </div>
            <div class="ayah">
              "যারা নিজেদের ধনসম্পদ আল্লাহর পথে ব্যয় করে, তাদের উপমা একটি শস্যবীজের মতো..." (সূরা আল-বাক্বারা: ২৬১)
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

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center space-y-3">
      {title && <h4 className="text-sm font-bold text-slate-800">{title}</h4>}
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}

      <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs inline-block">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="QR Code"
            style={{ width: size, height: size }}
            className="rounded-lg"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400"
          >
            <QrCode className="w-8 h-8 opacity-40" />
          </div>
        )}
      </div>

      {boxCode && (
        <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
          {boxCode}
        </span>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-1.5 pt-1">
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            title="লিংক কপি করুন"
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200 transition-colors flex items-center space-x-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'কপি হয়েছে' : 'কপি'}</span>
          </button>
        )}

        {showDownload && (
          <button
            type="button"
            onClick={handleDownload}
            title="QR ইমেজ ডাউনলোড"
            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium border border-slate-200 transition-colors flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[11px]">ডাউনলোড</span>
          </button>
        )}

        {showPrint && (
          <button
            type="button"
            onClick={handlePrint}
            title="দানবাক্স স্টিকার প্রিন্ট করুন"
            className="p-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="text-[11px]">স্টিকার প্রিন্ট</span>
          </button>
        )}
      </div>
    </div>
  );
};

// Clean SVG Code 128 / Barcode Generator
interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

export const Barcode128: React.FC<BarcodeProps> = ({
  value,
  width = 1.6,
  height = 36,
  showText = true,
}) => {
  // Simple clean SVG barcode representation
  const generatePattern = (text: string) => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    const bars: boolean[] = [];
    // Start guard
    bars.push(true, false, true, true, false);
    // Data encoding simulation
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bars.push(
        (code & 1) === 1,
        (code & 2) === 2,
        false,
        (code & 4) === 4,
        (code & 8) === 8,
        false,
        (code & 16) === 16,
        (code & 32) === 32,
        false
      );
    }
    // Stop guard
    bars.push(true, true, false, true, false, true, true);
    return bars;
  };

  const bars = generatePattern(value || 'ML-000000');
  const svgWidth = bars.length * width;

  return (
    <div className="inline-flex flex-col items-center select-none">
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="shape-rendering-crispEdges"
      >
        <rect width={svgWidth} height={height} fill="#ffffff" />
        {bars.map((isBar, idx) =>
          isBar ? (
            <rect
              key={idx}
              x={idx * width}
              y={0}
              width={width}
              height={height}
              fill="#0f172a"
            />
          ) : null
        )}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] font-bold text-slate-700 tracking-wider mt-0.5">
          {value}
        </span>
      )}
    </div>
  );
};

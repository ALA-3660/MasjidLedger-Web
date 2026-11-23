import React, { useState } from 'react';
import { Printer, X, FileText, FileDown } from 'lucide-react';
import { Mosque } from '../../types';
import { SMART_NOTE_TYPES, SmartNote } from '../../types/smartNotesTypes';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import { printElement } from '../../lib/printUtils';
import { exportSmartNoteToDocx, exportSmartNoteToTxt } from '../../lib/notesExport';
import { sanitizeNoteHtmlClient } from './SmartNoteRichEditor';

interface SmartNotePrintModalProps {
  note: SmartNote;
  mosque?: Mosque | null;
  onClose: () => void;
}

export const SmartNotePrintModal: React.FC<SmartNotePrintModalProps> = ({
  note,
  mosque,
  onClose,
}) => {
  const [exportingDocx, setExportingDocx] = useState(false);

  const typeLabel = SMART_NOTE_TYPES.find((t) => t.value === note.noteType)?.labelBn || note.noteType;
  const dateStr = new Date(note.updatedAt || note.createdAt).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrintPdf = () => {
    const cleanTitle = (note.title || 'খসড়া_নোট').trim().replace(/[\/\\?%*:|"<>]/g, '_');
    printElement('smart-note-printable-canvas', {
      title: `${mosque?.nameBn || mosque?.name || 'মসজিদ'}_${cleanTitle}`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '12mm 14mm',
      customStyles: `
        #smart-note-printable-canvas {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          width: 100% !important;
        }
      `,
    });
  };

  const handleDocx = async () => {
    setExportingDocx(true);
    try {
      await exportSmartNoteToDocx(note, mosque);
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 print:hidden font-siliguri">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{note.title}</div>
              <div className="text-[11px] text-slate-400 font-baloo">
                {note.categoryNameBn} • {typeLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF</span>
            </button>
            <button
              type="button"
              disabled={exportingDocx}
              onClick={handleDocx}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>{exportingDocx ? 'তৈরি হচ্ছে...' : 'DOCX'}</span>
            </button>
            <button
              type="button"
              onClick={() => exportSmartNoteToTxt(note, mosque)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>TXT</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Canvas */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex-1">
          <div
            id="smart-note-printable-canvas"
            className="bg-white max-w-[210mm] mx-auto p-6 sm:p-10 rounded-xl shadow-md border border-slate-200 text-slate-900"
          >
            <MosqueOfficialLetterhead
              mosque={mosque}
              documentTitle={note.categoryNameBn}
              subTitle={typeLabel}
              dateStr={dateStr}
            />

            <div className="mt-5 mb-4 pb-3 border-b border-slate-200">
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 font-siliguri leading-snug">
                {note.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-baloo">
                <span>প্রস্তুতকারক: {note.ownerName}</span>
                <span>সংস্করণ: #{note.version.toLocaleString('bn-BD')}</span>
                {note.tags?.length > 0 && <span>ট্যাগ: {note.tags.join(', ')}</span>}
              </div>
            </div>

            <div
              className="font-tiro text-[15px] leading-relaxed text-slate-900 space-y-2
                [&_h2]:font-siliguri [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                [&_h3]:font-siliguri [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1.5
                [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-3
                [&_th]:border [&_th]:border-slate-400 [&_th]:bg-emerald-50 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:font-siliguri
                [&_td]:border [&_td]:border-slate-400 [&_td]:px-2.5 [&_td]:py-1.5"
              dangerouslySetInnerHTML={{ __html: sanitizeNoteHtmlClient(note.contentHtml) }}
            />

            <div className="mt-10 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-baloo">
              <span>মসজিদ লেজার প্রো — খসড়া Smart Notes</span>
              <span>মুদ্রণ তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

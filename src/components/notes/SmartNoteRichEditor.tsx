import React, { useEffect, useRef, useState } from 'react';
import { sanitizeSmartNoteHtml } from '../../lib/sanitizeHtml';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Table,
  Undo2,
  Redo2,
  Copy,
  ClipboardPaste,
  RemoveFormatting,
  Check,
} from 'lucide-react';

interface SmartNoteRichEditorProps {
  value: string;
  onChange: (html: string, plainText: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeightClass?: string;
}

export function sanitizeNoteHtmlClient(html: string): string {
  return sanitizeSmartNoteHtml(html);
}

export const SmartNoteRichEditor: React.FC<SmartNoteRichEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder = 'এখানে আপনার নোট, সভার খসড়া বা গুরুত্বপূর্ণ তথ্য বাংলা বা ইংরেজিতে লিখুন...',
  minHeightClass = 'min-h-[260px]',
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef<string>('');
  const [copied, setCopied] = useState(false);

  // Sync external updates (e.g., AI insert, OCR insert, version restore, switching notes)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const sanitized = sanitizeNoteHtmlClient(value || '');
    if (sanitized !== lastHtmlRef.current && el.innerHTML !== sanitized) {
      el.innerHTML = sanitized;
      lastHtmlRef.current = sanitized;
    }
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    // Sync checkbox checked attribute into DOM so innerHTML persists checked state
    el.querySelectorAll('input[type="checkbox"]').forEach((node) => {
      const inp = node as HTMLInputElement;
      if (inp.checked) inp.setAttribute('checked', 'checked');
      else inp.removeAttribute('checked');
    });
    const sanitized = sanitizeNoteHtmlClient(el.innerHTML);
    lastHtmlRef.current = sanitized;
    const plain = (el.innerText || el.textContent || '').trim();
    onChange(sanitized, plain);
  };

  const execCmd = (command: string, val?: string) => {
    if (readOnly) return;
    editorRef.current?.focus();
    try {
      document.execCommand(command, false, val);
    } catch {
      // ignore unsupported browser command
    }
    emitChange();
  };

  const insertChecklistItem = () => {
    if (readOnly) return;
    editorRef.current?.focus();
    const html = `<div data-checklist="true" class="flex items-start gap-2 my-1"><input type="checkbox" class="mt-1.5 w-4 h-4 accent-emerald-700 cursor-pointer" /><span>করণীয় কাজ লিখুন...</span></div><p><br></p>`;
    try {
      document.execCommand('insertHTML', false, html);
    } catch {
      if (editorRef.current) {
        editorRef.current.innerHTML += html;
      }
    }
    emitChange();
  };

  const insertTable = () => {
    if (readOnly) return;
    editorRef.current?.focus();
    const tableHtml = `
      <table class="w-full border-collapse border border-slate-300 my-2 text-sm">
        <thead>
          <tr class="bg-emerald-50">
            <th class="border border-slate-300 px-2.5 py-1.5 text-left font-bold">ক্রমিক</th>
            <th class="border border-slate-300 px-2.5 py-1.5 text-left font-bold">বিবরণ</th>
            <th class="border border-slate-300 px-2.5 py-1.5 text-left font-bold">মন্তব্য / পরিমাণ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-slate-300 px-2.5 py-1.5">১</td>
            <td class="border border-slate-300 px-2.5 py-1.5">তথ্য লিখুন</td>
            <td class="border border-slate-300 px-2.5 py-1.5">—</td>
          </tr>
          <tr>
            <td class="border border-slate-300 px-2.5 py-1.5">২</td>
            <td class="border border-slate-300 px-2.5 py-1.5">তথ্য লিখুন</td>
            <td class="border border-slate-300 px-2.5 py-1.5">—</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    try {
      document.execCommand('insertHTML', false, tableHtml);
    } catch {
      if (editorRef.current) editorRef.current.innerHTML += tableHtml;
    }
    emitChange();
  };

  const handleCopyPlain = async () => {
    const text = editorRef.current?.innerText || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handlePasteFromClipboard = async () => {
    if (readOnly) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editorRef.current?.focus();
        document.execCommand('insertText', false, text);
        emitChange();
      }
    } catch {
      // browser may restrict clipboard read; standard Ctrl+V works natively
    }
  };

  const handleNativePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    if (html) {
      const clean = sanitizeNoteHtmlClient(html);
      document.execCommand('insertHTML', false, clean);
    } else if (plain) {
      document.execCommand('insertText', false, plain);
    }
    emitChange();
  };

  const toolbarButtons: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    dividerBefore?: boolean;
  }> = [
    { label: 'বোল্ড (Bold)', icon: <Bold className="w-3.5 h-3.5" />, onClick: () => execCmd('bold') },
    { label: 'ইটালিক (Italic)', icon: <Italic className="w-3.5 h-3.5" />, onClick: () => execCmd('italic') },
    { label: 'আন্ডারলাইন (Underline)', icon: <Underline className="w-3.5 h-3.5" />, onClick: () => execCmd('underline') },
    { label: 'বড় শিরোনাম (H2)', icon: <Heading2 className="w-3.5 h-3.5" />, onClick: () => execCmd('formatBlock', '<h2>'), dividerBefore: true },
    { label: 'উপ-শিরোনাম (H3)', icon: <Heading3 className="w-3.5 h-3.5" />, onClick: () => execCmd('formatBlock', '<h3>') },
    { label: 'বুলেট তালিকা', icon: <List className="w-3.5 h-3.5" />, onClick: () => execCmd('insertUnorderedList'), dividerBefore: true },
    { label: 'ক্রমিক তালিকা', icon: <ListOrdered className="w-3.5 h-3.5" />, onClick: () => execCmd('insertOrderedList') },
    { label: 'চেকলিস্ট (To-Do)', icon: <CheckSquare className="w-3.5 h-3.5" />, onClick: insertChecklistItem },
    { label: 'টেবিল যুক্ত করুন', icon: <Table className="w-3.5 h-3.5" />, onClick: insertTable },
    { label: 'আনডু (Undo)', icon: <Undo2 className="w-3.5 h-3.5" />, onClick: () => execCmd('undo'), dividerBefore: true },
    { label: 'রিডু (Redo)', icon: <Redo2 className="w-3.5 h-3.5" />, onClick: () => execCmd('redo') },
    { label: 'ফরম্যাটিং মুছুন', icon: <RemoveFormatting className="w-3.5 h-3.5" />, onClick: () => execCmd('removeFormat') },
  ];

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {!readOnly &&
            toolbarButtons.map((btn, idx) => (
              <React.Fragment key={idx}>
                {btn.dividerBefore && <span className="w-px h-4 bg-slate-300 mx-0.5 hidden sm:inline-block" />}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    btn.onClick();
                  }}
                  title={btn.label}
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-emerald-100 hover:text-emerald-900 active:scale-95 transition-colors cursor-pointer"
                >
                  {btn.icon}
                </button>
              </React.Fragment>
            ))}
          {readOnly && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-siliguri">
              শুধুমাত্র পাঠযোগ্য (Read-Only)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyPlain}
            title="সম্পূর্ণ লেখা কপি করুন"
            className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200/70 flex items-center gap-1 cursor-pointer font-siliguri"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'কপি হয়েছে' : 'কপি'}</span>
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              title="ক্লিপবোর্ড থেকে পেস্ট করুন"
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-200/70 flex items-center gap-1 cursor-pointer font-siliguri"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">পেস্ট</span>
            </button>
          )}
        </div>
      </div>

      {/* Rich Text Editable Area (Body uses Tiro Bangla as requested) */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={emitChange}
          onChange={emitChange}
          onPaste={handleNativePaste}
          onClick={(e) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') {
              setTimeout(emitChange, 0);
            }
          }}
          data-placeholder={placeholder}
          className={`w-full ${minHeightClass} max-h-[520px] overflow-y-auto px-4 py-3.5 outline-none text-[15px] leading-relaxed text-slate-800 font-tiro
            [&_h2]:font-siliguri [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-emerald-950 [&_h2]:mt-3 [&_h2]:mb-1.5
            [&_h3]:font-siliguri [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-2.5 [&_h3]:mb-1
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1.5
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1.5
            [&_li]:my-0.5
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-2
            [&_th]:border [&_th]:border-slate-300 [&_th]:bg-emerald-50 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:font-siliguri
            [&_td]:border [&_td]:border-slate-300 [&_td]:px-2.5 [&_td]:py-1.5
            empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none`}
        />
      </div>
    </div>
  );
};

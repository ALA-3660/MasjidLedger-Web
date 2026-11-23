import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { Mosque } from '../types';
import { SMART_NOTE_TYPES, SmartNote } from '../types/smartNotesTypes';
import { formatBanglaDisplayText } from './banglaDigits';

function safeFileSlug(title: string): string {
  return (title || 'khasra_note')
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

export function extractLinesFromHtml(html: string): string[] {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = (doc.body.innerText || doc.body.textContent || '').trim();
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd());
}

export function exportSmartNoteToTxt(note: SmartNote, mosque?: Mosque | null): void {
  const mosqueName = mosque?.nameBn || mosque?.name || 'মসজিদ লেজার প্রো';
  const typeLabel = SMART_NOTE_TYPES.find((t) => t.value === note.noteType)?.labelBn || note.noteType;
  const dateStr = formatBanglaDisplayText(
    new Date(note.updatedAt || note.createdAt).toLocaleString('bn-BD')
  );
  const bodyLines = extractLinesFromHtml(note.contentHtml);
  const plainBody = bodyLines.length > 0 ? bodyLines.join('\n') : note.plainText || '';

  const content = [
    '====================================================',
    mosqueName,
    mosque?.address || '',
    '====================================================',
    `শিরোনাম: ${note.title}`,
    `ক্যাটাগরি: ${note.categoryNameBn} | ধরন: ${typeLabel}`,
    `প্রস্তুতকারক: ${note.ownerName} | হালনাগাদ: ${dateStr}`,
    note.tags?.length ? `ট্যাগসমূহ: ${note.tags.join(', ')}` : '',
    '----------------------------------------------------',
    '',
    plainBody,
    '',
    '----------------------------------------------------',
    formatBanglaDisplayText('MasjidLedger Pro v2.6 — খসড়া Smart Notes থেকে রপ্তানিকৃত'),
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileSlug(note.title)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportSmartNoteToDocx(note: SmartNote, mosque?: Mosque | null): Promise<void> {
  const mosqueName = mosque?.nameBn || mosque?.name || 'মসজিদ / ওয়াকফ এস্টেট';
  const mosqueAddress = mosque?.address || '';
  const typeLabel = SMART_NOTE_TYPES.find((t) => t.value === note.noteType)?.labelBn || note.noteType;
  const dateStr = formatBanglaDisplayText(
    new Date(note.updatedAt || note.createdAt).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  const lines = extractLinesFromHtml(note.contentHtml);
  const bodyParagraphs = (lines.length > 0 ? lines : [note.plainText || '']).map(
    (line) =>
      new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: line,
            font: 'Tiro Bangla',
            size: 24, // 12pt
          }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: mosqueName,
                bold: true,
                size: 32,
                font: 'Hind Siliguri',
                color: '064E3B',
              }),
            ],
          }),
          ...(mosqueAddress
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 160 },
                  children: [
                    new TextRun({
                      text: mosqueAddress,
                      size: 20,
                      font: 'Baloo Da 2',
                      color: '475569',
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: note.title || 'খসড়া নোট',
                bold: true,
                size: 28,
                font: 'Hind Siliguri',
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `ক্যাটাগরি: ${note.categoryNameBn}  |  ধরন: ${typeLabel}  |  তারিখ: ${dateStr}  |  লিখেছেন: ${note.ownerName}`,
                size: 20,
                font: 'Baloo Da 2',
                color: '475569',
              }),
            ],
          }),
          ...bodyParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileSlug(note.title)}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

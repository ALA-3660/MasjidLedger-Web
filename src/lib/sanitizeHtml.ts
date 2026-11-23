import DOMPurify from 'dompurify';

const SAFE_URI_REGEX = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

/**
 * Sanitizes rich-text HTML for Smart Notes on the client side using DOMPurify.
 * Blocks <script>, <iframe>, event handlers (onerror/onload), and javascript: URLs
 * while preserving headings, lists, tables, and checklists.
 */
export function sanitizeSmartNoteHtml(html: string): string {
  return DOMPurify.sanitize(html || '<p></p>', {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'blockquote',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'input', 'label', 'hr', 'a',
    ],
    ALLOWED_ATTR: ['type', 'checked', 'class', 'style', 'data-checklist', 'href', 'target', 'rel'],
    ALLOW_DATA_ATTR: true,
    ALLOWED_URI_REGEXP: SAFE_URI_REGEX,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'srcdoc'],
  });
}

/**
 * Sanitizes rich-text HTML for Official Documents & AI previews before rendering.
 */
export function sanitizeOfficialDocHtml(html: string): string {
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote', 'pre',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'div', 'span', 'hr',
    ],
    ALLOWED_ATTR: ['class', 'style', 'colspan', 'rowspan', 'align'],
    ALLOWED_URI_REGEXP: SAFE_URI_REGEX,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'srcdoc'],
  });
}

/**
 * Extracts plain text safely from HTML without injecting raw markup into the live DOM.
 */
export function extractPlainTextSafely(html: string): string {
  const clean = sanitizeOfficialDocHtml(html);
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(clean, 'text/html');
    return (doc.body.textContent || '').trim();
  }
  return clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

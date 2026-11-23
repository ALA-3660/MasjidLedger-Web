/**
 * MasjidLedger Pro v2.6 — Global Presentation-Layer Bangla Numeral Engine
 * & Bilingual (Bangla ০-৯ / English 0-9) Numeric Input Normalizer
 *
 * Design guarantees:
 * 1. ZERO database, JSON schema, ID, API contract, or calculation mutation.
 * 2. 100% React reconciler safe: ONLY updates existing Text.nodeValue in place,
 *    never adds/removes/wraps DOM elements inside React trees.
 * 3. Preserves URLs, emails, hex colors, UUIDs, hashes, <code>/<pre>, and editable inputs.
 * 4. Allows typing & pasting BOTH Bangla (০-৯) and English (0-9) digits in all numeric inputs
 *    (including HTML5 <input type="number"> which natively blocks Bangla digits).
 * 5. Automatically ensures Bangla digits in print/PDF output via beforeprint & printUtils hook.
 */

import {
  formatBanglaDisplayText,
  hasAsciiDigits,
  hasBanglaDigits,
  normalizeNumericInputString,
  toEnglishDigits,
} from './banglaDigits';

interface TrackedTextRecord {
  original: string;
  rendered: string;
}

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'TEXTAREA',
  'INPUT',
  'SELECT',
  'OPTION',
  'OPTGROUP',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'TITLE',
]);

const NUMERIC_TEXT_HINT_REGEX =
  /(amount|price|rate|salary|rent|fee|total|qty|quantity|count|balance|deposit|fine|discount|percent|phone|mobile|contact|nid|year|month|day|age|plot|code|টাকা|৳|পরিমাণ|ভাড়া|ভাড়া|বেতন|হার|সংখ্যা|মোবাইল|ফোন|নম্বর|জমা|খরচ|আয়|আয়|ব্যয়|ব্যয়|বকেয়া|বকেয়া|কিস্তি|দিন|মাস|বছর|বয়স|বয়স|শতাংশ|%)/i;

let installed = false;
let activeLanguage: 'bn' | 'en' = 'bn';
let observer: MutationObserver | null = null;
const trackedTextNodes = new WeakMap<Text, TrackedTextRecord>();

function shouldSkipElement(el: Element | null): boolean {
  let curr: Element | null = el;
  while (curr) {
    const tag = curr.tagName?.toUpperCase();
    if (SKIP_TAGS.has(tag)) return true;
    if (
      curr.hasAttribute('data-no-bn-digits') ||
      curr.classList?.contains('no-bn-digits')
    ) {
      return true;
    }
    const ce = curr.getAttribute('contenteditable');
    if (ce === '' || ce === 'true' || ce === 'plaintext-only') {
      return true;
    }
    curr = curr.parentElement;
  }
  return false;
}

function processTextNode(node: Text): void {
  if (!node.parentElement || shouldSkipElement(node.parentElement)) return;
  const current = node.nodeValue;
  if (!current) return;

  const existing = trackedTextNodes.get(node);

  if (activeLanguage === 'bn') {
    if (existing && current === existing.rendered) {
      return;
    }
    if (!hasAsciiDigits(current)) {
      if (existing && current !== existing.rendered) {
        trackedTextNodes.delete(node);
      }
      return;
    }
    const converted = formatBanglaDisplayText(current);
    if (converted !== current) {
      trackedTextNodes.set(node, { original: current, rendered: converted });
      node.nodeValue = converted;
    }
  } else {
    // Language switched to English: restore original ASCII text if untouched since conversion
    if (existing && current === existing.rendered) {
      node.nodeValue = existing.original;
      trackedTextNodes.delete(node);
    }
  }
}

/**
 * Walks an entire DOM subtree and converts all displayable text nodes to Bangla digits (০-৯)
 * (or restores ASCII digits when activeLanguage === 'en').
 * Also exported for isolated print/PDF clones in printUtils.ts.
 */
export function convertSubtreeDigitsToBangla(
  root: Node,
  forceBangla: boolean = false
): void {
  if (typeof document === 'undefined' || !root) return;
  const prevLang = activeLanguage;
  if (forceBangla) {
    activeLanguage = 'bn';
  }
  try {
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root as Text);
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE && shouldSkipElement(root as Element)) {
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      processTextNode(current as Text);
      current = walker.nextNode();
    }
  } finally {
    if (forceBangla) {
      activeLanguage = prevLang;
    }
  }
}

// ============================================================================
// BILINGUAL NUMERIC INPUT SUPPORT (Bangla ০-৯ & English 0-9 Typing + Pasting)
// ============================================================================

function isStrictNumberInput(el: EventTarget | null): boolean {
  return el instanceof HTMLInputElement && el.type === 'number';
}

function isNumericOrTelTextInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  if (el.type === 'tel') return true;
  if (el.inputMode === 'numeric' || el.inputMode === 'decimal' || el.inputMode === 'tel') {
    return true;
  }
  if (el.dataset.numericInput === 'true') return true;
  if (el.type === 'text' || el.type === 'search') {
    const hints = [
      el.name || '',
      el.id || '',
      el.placeholder || '',
      el.getAttribute('aria-label') || '',
    ].join(' ');
    if (NUMERIC_TEXT_HINT_REGEX.test(hints)) {
      return true;
    }
  }
  return false;
}

function setNativeInputValue(input: HTMLInputElement, nextValue: string): void {
  const prevValue = input.value;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, nextValue);
  } else {
    input.value = nextValue;
  }
  const tracker = (input as any)._valueTracker;
  if (tracker) {
    tracker.setValue(prevValue);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertNormalizedIntoNumberInput(
  input: HTMLInputElement,
  normalizedChunk: string,
  replaceAll: boolean = false
): void {
  if (!normalizedChunk) return;

  if (replaceAll) {
    setNativeInputValue(input, normalizedChunk);
    return;
  }

  // First try native insertText command (respects selection like Ctrl+A even on type="number")
  const before = input.value;
  let insertedViaExec = false;
  try {
    if (typeof document.execCommand === 'function') {
      insertedViaExec = document.execCommand('insertText', false, normalizedChunk);
    }
  } catch {
    insertedViaExec = false;
  }

  if (insertedViaExec && input.value !== before) {
    return;
  }

  // Fallback for browsers where execCommand is ignored on type="number"
  const candidate = `${before}${normalizedChunk}`;
  const cleaned = normalizeNumericInputString(candidate, {
    allowNegative: true,
    allowDecimal: true,
  });
  setNativeInputValue(input, cleaned);
}

function insertNormalizedIntoTextInput(
  input: HTMLInputElement,
  normalizedChunk: string
): void {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const nextValue =
    input.value.slice(0, start) + normalizedChunk + input.value.slice(end);
  setNativeInputValue(input, nextValue);
  const nextCaret = start + normalizedChunk.length;
  try {
    input.setSelectionRange(nextCaret, nextCaret);
  } catch {
    // ignore if unsupported
  }
}

let isNormalizingInput = false;

function handleDocumentKeydown(e: KeyboardEvent): void {
  const target = e.target;
  if (!(target instanceof HTMLInputElement) || !isStrictNumberInput(target)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!e.key || e.key.length > 4) return;

  // Intercept single Bangla digit keystrokes before browser's <input type="number"> drops them
  if (hasBanglaDigits(e.key)) {
    const ascii = normalizeNumericInputString(e.key, {
      allowNegative: true,
      allowDecimal: true,
    });
    if (ascii) {
      e.preventDefault();
      insertNormalizedIntoNumberInput(target, ascii, false);
    }
  }
}

function handleDocumentBeforeInput(e: InputEvent): void {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!e.data || !hasBanglaDigits(e.data)) return;

  if (isStrictNumberInput(target)) {
    e.preventDefault();
    const cleaned = normalizeNumericInputString(e.data, {
      allowNegative: true,
      allowDecimal: true,
    });
    if (cleaned) {
      insertNormalizedIntoNumberInput(
        target,
        cleaned,
        e.inputType === 'insertFromPaste'
      );
    }
    return;
  }

  if (isNumericOrTelTextInput(target)) {
    // For tel / numeric / decimal / hinted inputs, only normalize when incoming text is numeric/punctuation
    const stripped = e.data.replace(/[০-৯0-9.,+\-\s৳]/g, '');
    if (stripped.length === 0) {
      e.preventDefault();
      const ascii = toEnglishDigits(e.data);
      insertNormalizedIntoTextInput(target, ascii);
    }
  }
}

function handleDocumentPaste(e: ClipboardEvent): void {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  const rawClip =
    e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text') || '';
  if (!rawClip) return;

  if (isStrictNumberInput(target)) {
    // Support pasting Bangla digits (৫০০০, ১,২৫,০০০) or formatted Taka strings (৳ 1,25,000)
    if (hasBanglaDigits(rawClip) || /[৳,\s]/.test(rawClip)) {
      const cleaned = normalizeNumericInputString(rawClip, {
        allowNegative: true,
        allowDecimal: true,
      });
      if (cleaned) {
        e.preventDefault();
        insertNormalizedIntoNumberInput(target, cleaned, true);
      }
    }
    return;
  }

  if (isNumericOrTelTextInput(target) && hasBanglaDigits(rawClip)) {
    const stripped = rawClip.replace(/[০-৯0-9.,+\-\s৳()]/g, '');
    if (stripped.length === 0) {
      e.preventDefault();
      const ascii = toEnglishDigits(rawClip).replace(/[৳]/g, '').trim();
      insertNormalizedIntoTextInput(target, ascii);
    }
  }
}

function handleDocumentInputOrComposition(e: Event): void {
  if (isNormalizingInput) return;
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (isStrictNumberInput(target)) {
    const compData = (e as CompositionEvent).data;
    if (compData && hasBanglaDigits(compData)) {
      const cleaned = normalizeNumericInputString(compData, {
        allowNegative: true,
        allowDecimal: true,
      });
      if (cleaned) {
        isNormalizingInput = true;
        try {
          insertNormalizedIntoNumberInput(target, cleaned, false);
        } finally {
          isNormalizingInput = false;
        }
      }
    }
    return;
  }

  if (isNumericOrTelTextInput(target) && hasBanglaDigits(target.value)) {
    // Only normalize when the entire value is numeric/phone-like (never alter Bangla prose!)
    const nonNumeric = target.value.replace(/[০-৯0-9.,+\-\s৳()]/g, '');
    if (nonNumeric.length === 0) {
      isNormalizingInput = true;
      try {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const ascii = toEnglishDigits(target.value);
        if (ascii !== target.value) {
          setNativeInputValue(target, ascii);
          if (start !== null && end !== null) {
            try {
              target.setSelectionRange(start, end);
            } catch {
              // ignore
            }
          }
        }
      } finally {
        isNormalizingInput = false;
      }
    }
  }
}

// ============================================================================
// PUBLIC ENGINE LIFECYCLE
// ============================================================================

export function setBanglaDisplayLanguage(lang: 'bn' | 'en'): void {
  activeLanguage = lang === 'en' ? 'en' : 'bn';
  if (typeof document !== 'undefined') {
    document.documentElement.lang = activeLanguage;
    if (document.body) {
      convertSubtreeDigitsToBangla(document.body);
    }
  }
}

export function installBanglaDisplayEngine(): void {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  installed = true;
  activeLanguage = document.documentElement.lang === 'en' ? 'en' : 'bn';

  // 1. Bilingual numeric input listeners (capture phase so they run before React/browser filtering)
  document.addEventListener('keydown', handleDocumentKeydown, true);
  document.addEventListener('beforeinput', handleDocumentBeforeInput as EventListener, true);
  document.addEventListener('paste', handleDocumentPaste, true);
  document.addEventListener('compositionend', handleDocumentInputOrComposition, true);
  document.addEventListener('input', handleDocumentInputOrComposition, true);

  // 2. Synchronous pre-print pass for window.print() flows
  window.addEventListener('beforeprint', () => {
    if (activeLanguage === 'bn' && document.body) {
      convertSubtreeDigitsToBangla(document.body);
    }
  });

  // 3. Non-destructive MutationObserver for all React renders, modals, portals, tables, charts
  const startObserving = () => {
    if (!document.body) return;
    convertSubtreeDigitsToBangla(document.body);

    observer = new MutationObserver((mutations) => {
      if (activeLanguage !== 'bn') return;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'characterData') {
          if (m.target.nodeType === Node.TEXT_NODE) {
            processTextNode(m.target as Text);
          }
        } else if (m.type === 'childList') {
          for (let j = 0; j < m.addedNodes.length; j++) {
            convertSubtreeDigitsToBangla(m.addedNodes[j]);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true });
  }
}

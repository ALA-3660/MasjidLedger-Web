/**
 * MasjidLedger Pro v2.6 — Central Bangla Numeral & Bilingual Input Utilities
 *
 * Pure presentation & input normalization helpers.
 * NEVER mutates database records, IDs, API payloads, or financial calculation logic.
 */

const EN_TO_BN_MAP: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

const BN_TO_EN_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
  // Arabic-Indic numerals fallback just in case
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

/**
 * Converts ASCII digits (0-9) to Bangla digits (০-৯).
 */
export function toBanglaDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[0-9]/g, (d) => EN_TO_BN_MAP[d] ?? d);
}

/**
 * Converts Bangla digits (০-৯) (and Arabic-Indic ٠-٩) to standard ASCII digits (0-9).
 */
export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[০-৯٠-٩]/g, (d) => BN_TO_EN_MAP[d] ?? d);
}

/**
 * Returns true if the string contains any Bangla digit (০-৯).
 */
export function hasBanglaDigits(value: string): boolean {
  return /[০-৯]/.test(value);
}

/**
 * Returns true if the string contains any ASCII digit (0-9).
 */
export function hasAsciiDigits(value: string): boolean {
  return /[0-9]/.test(value);
}

/**
 * Safely parses a localized number string containing Bangla or English digits,
 * commas, spaces, or currency symbols (৳, BDT, টাকা) into a standard JS number.
 */
export function parseLocalizedNumber(
  value: string | number | null | undefined,
  fallback: number = 0
): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (value === null || value === undefined) return fallback;
  const normalized = toEnglishDigits(String(value))
    .replace(/[৳,\s]/g, '')
    .replace(/(?:BDT|টাকা)/gi, '')
    .trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Normalizes raw user input (typed or pasted) for HTML <input type="number"> or numeric fields.
 * Supports both Bangla (০-৯) and English (0-9) digits, optional leading minus, and decimal point.
 */
export function normalizeNumericInputString(
  raw: string,
  options?: { allowNegative?: boolean; allowDecimal?: boolean }
): string {
  const allowNegative = options?.allowNegative ?? true;
  const allowDecimal = options?.allowDecimal ?? true;

  let text = toEnglishDigits(raw)
    .replace(/[৳,\s]/g, '')
    .replace(/(?:BDT|টাকা)/gi, '');

  let result = '';
  let seenDecimal = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') {
      result += ch;
    } else if (ch === '-' && allowNegative && result.length === 0) {
      result += '-';
    } else if (ch === '.' && allowDecimal && !seenDecimal) {
      result += '.';
      seenDecimal = true;
    }
  }
  return result;
}

/**
 * Technical token matcher: URLs, API paths, emails, hex color codes, UUIDs, long hex hashes,
 * and technical AI model identifiers (e.g. gemini-4-hydrogen, gemini-3.1-flash-lite, gemini-2.5-flash).
 * Digits inside these tokens are preserved in ASCII so links, emails, hashes, and model IDs remain valid.
 */
const PROTECTED_TOKEN_REGEX =
  /(https?:\/\/[^\s<>'"]+|www\.[^\s<>'"]+|\/(?:api|public)\/[^\s<>'"]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b|\b[0-9a-fA-F]{24,}\b|\b(?:models\/)?(?:gemini|imagen|veo|lyria|gemma|text-embedding|embedding)-[a-zA-Z0-9._:-]+\b|\bGemini\s+\d+(?:\.\d+)?(?:\s+[A-Za-z0-9-]+)?\b|\b\d+(?:\.\d+)?\s+Flash\b)/g;

/**
 * Context-aware UI display converter:
 * Converts all human-readable numbers (currency, dates, times, phone numbers, counts,
 * percentages, voucher/receipt numbers, tables, charts) to Bangla digits (০-৯),
 * while keeping URLs, emails, hex colors, UUIDs, and SHA hashes intact.
 */
export function formatBanglaDisplayText(text: string): string {
  if (!text || !/[0-9]/.test(text)) return text;

  let out = '';
  let lastIndex = 0;
  PROTECTED_TOKEN_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PROTECTED_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out += toBanglaDigits(text.slice(lastIndex, match.index));
    }
    out += match[0];
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    out += toBanglaDigits(text.slice(lastIndex));
  }

  return out;
}

/**
 * Formats a numeric value using South Asian grouping (1,25,000) in Bangla digits (১,২৫,০০০).
 */
export function formatBanglaNumber(
  num: number | string | null | undefined,
  maxFractionDigits: number = 2
): string {
  const parsed = parseLocalizedNumber(num, 0);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(parsed);
  return toBanglaDigits(formatted);
}

/**
 * Formats currency in Taka with South Asian grouping and Bangla digits (৳ ১,২৫,০০০).
 */
export function formatBanglaCurrency(
  amount: number | string | null | undefined,
  showSymbol: boolean = true
): string {
  const formatted = formatBanglaNumber(amount, 2);
  return showSymbol ? `৳ ${formatted}` : formatted;
}

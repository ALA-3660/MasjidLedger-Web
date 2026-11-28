/**
 * Central AI Model Configuration (Masjid Ledger)
 * ------------------------------------------------------------------
 * Single source of truth for Gemini model selection across the entire
 * application (server & client).
 *
 * Resolution Priority:
 *  1. Super Admin dynamic setting saved in Central SaaS Admin Hub
 *  2. Environment variable (process.env.GEMINI_MODEL or VITE_GEMINI_MODEL)
 *  3. System default stable Flash model (DEFAULT_GEMINI_MODEL)
 */

export interface AiModelSettings {
  /** Custom model name saved by Super Admin. Empty string = use env/default. */
  modelName: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedByTenantId?: string;
  notes?: string;
}

export type AiModelResolutionSource =
  | 'SUPER_ADMIN_OVERRIDE'
  | 'ENV_VARIABLE'
  | 'SYSTEM_DEFAULT';

export interface ResolvedAiModelConfig {
  activeModel: string;
  source: AiModelResolutionSource;
  sourceLabelBn: string;
  overrideModel: string;
  envModel: string;
  defaultModel: string;
}

export interface RecommendedAiModelOption {
  id: string;
  labelBn: string;
  descriptionBn: string;
  badgeBn: string;
  recommended?: boolean;
}

/**
 * Default active stable Flash model.
 * Note: gemini-4-hydrogen is Google's currently active stable Flash model
 * supported in this runtime (whereas legacy gemini-2.5-flash may return 404 on some keys).
 * Super Admin or GEMINI_MODEL / VITE_GEMINI_MODEL env var can override this anytime.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export const RECOMMENDED_AI_MODELS: RecommendedAiModelOption[] = [
  {
    id: 'gemini-4-hydrogen',
    labelBn: 'Gemini 4 Hydrogen (সর্বশেষ সক্রিয় ফ্ল্যাশ)',
    descriptionBn: 'বাংলা আর্থিক বিশ্লেষণ, রসিদ/ছবি পড়া, চ্যাট ও দ্রুত কাজের জন্য বর্তমানে সবচেয়ে স্থিতিশীল ও সচল ফ্ল্যাশ মডেল।',
    badgeBn: 'সুপারিশকৃত',
    recommended: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    labelBn: 'Gemini 3.1 Flash Lite (দ্রুত ও হালকা)',
    descriptionBn: 'অতি দ্রুত উত্তর ও হালকা বাংলা কাজের জন্য সাশ্রয়ী ফ্ল্যাশ লাইট মডেল।',
    badgeBn: 'হালকা ও দ্রুত',
  },
  {
    id: 'gemini-2.5-flash',
    labelBn: 'Gemini 2.5 Flash (লিগ্যাসি/কাস্টম API)',
    descriptionBn: 'শুধুমাত্র যেসব কাস্টম API কী-তে 2.5 Flash সক্রিয় আছে সেগুলোর জন্য (অন্যথায় 404 আসতে পারে)।',
    badgeBn: 'লিগ্যাসি',
  },
];

const LOCALIZED_DIGIT_TO_ASCII: Record<string, string> = {
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
 * Cleans and normalizes a Gemini model identifier into a pure ASCII string.
 * - Strips zero-width/invisible control characters and leading/trailing spaces
 * - Converts any Bangla (০-৯) or Arabic-Indic (٠-٩) digits to standard ASCII (0-9)
 * - Strips optional "models/" prefix
 */
export function sanitizeGeminiModelName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[০-৯٠-٩]/g, (d) => LOCALIZED_DIGIT_TO_ASCII[d] ?? d)
    .trim()
    .replace(/^models\//i, '')
    .trim();
}

/** Semantic alias for model ID normalization */
export const normalizeGeminiModelId = sanitizeGeminiModelName;

/**
 * Validates that a normalized model name contains only safe ASCII identifier characters.
 */
export function isValidGeminiModelName(modelName: string): boolean {
  if (!modelName) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,120}$/.test(modelName);
}

/**
 * Reads configured Gemini model from environment variables:
 * - Server: process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL
 * - Client: import.meta.env.VITE_GEMINI_MODEL
 */
export function getEnvGeminiModel(): string {
  let envValue = '';

  // Server-side Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    envValue = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || '';
  }

  // Client-side Vite environment
  if (!envValue) {
    try {
      const viteEnv = (import.meta as any)?.env;
      if (viteEnv && typeof viteEnv.VITE_GEMINI_MODEL === 'string') {
        envValue = viteEnv.VITE_GEMINI_MODEL;
      }
    } catch {
      // ignore outside Vite context
    }
  }

  const cleaned = sanitizeGeminiModelName(envValue);
  return isValidGeminiModelName(cleaned) ? cleaned : '';
}

/**
 * Resolves the active Gemini model using central precedence:
 *  1. Super Admin Override
 *  2. Environment Variable (GEMINI_MODEL / VITE_GEMINI_MODEL)
 *  3. System Default (DEFAULT_GEMINI_MODEL)
 */
export function resolveActiveGeminiModel(overrideModel?: string | null): ResolvedAiModelConfig {
  const cleanOverride = sanitizeGeminiModelName(overrideModel);
  const envModel = getEnvGeminiModel();

  if (cleanOverride && isValidGeminiModelName(cleanOverride)) {
    return {
      activeModel: cleanOverride,
      source: 'SUPER_ADMIN_OVERRIDE',
      sourceLabelBn: 'সুপার অ্যাডমিন সেটিংস (সেন্ট্রাল হাব)',
      overrideModel: cleanOverride,
      envModel,
      defaultModel: DEFAULT_GEMINI_MODEL,
    };
  }

  if (envModel) {
    return {
      activeModel: envModel,
      source: 'ENV_VARIABLE',
      sourceLabelBn: 'এনভায়রনমেন্ট ভেরিয়েবল (GEMINI_MODEL / VITE_GEMINI_MODEL)',
      overrideModel: '',
      envModel,
      defaultModel: DEFAULT_GEMINI_MODEL,
    };
  }

  return {
    activeModel: DEFAULT_GEMINI_MODEL,
    source: 'SYSTEM_DEFAULT',
    sourceLabelBn: 'সিস্টেম ডিফল্ট (সর্বশেষ সক্রিয় ফ্ল্যাশ মডেল)',
    overrideModel: '',
    envModel: '',
    defaultModel: DEFAULT_GEMINI_MODEL,
  };
}

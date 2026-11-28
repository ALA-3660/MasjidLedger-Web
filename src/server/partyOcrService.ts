/**
 * MasjidLedger Pro v2.6 — Party Registry Zero-Storage OCR & AI Extraction Service (Part 3)
 *
 * STRICT SAFEGUARDS:
 * 1. Central AI Proxy ONLY: Uses `getActiveGeminiModel()` + `process.env.GEMINI_API_KEY` server-side.
 *    NO separate API key or model settings UI.
 * 2. Zero Financial Side-Effects: Never creates vouchers, receipts, or ledger entries.
 * 3. Zero-Storage OCR: Images/PDFs are processed strictly in-memory and NEVER written to disk or DB.
 * 4. Non-Fabrication & Human-in-the-Loop: Missing/unreadable fields remain empty (`undefined`) and are listed
 *    in `unclearFieldsBn`. Returned payload is always marked `UNVERIFIED_DRAFT` until verified & saved by user.
 * 5. Never auto-saves, auto-edits, or auto-merges profiles.
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  PartyDuplicateReasonCode,
  PartyOcrDocType,
  PartyOcrDuplicateCandidate,
  PartyOcrExtractResult,
  PartyOrganizationDetails,
  PartyProfileType,
  PartyRecord,
} from '../types/partyTypes.ts';
import { BUILT_IN_PARTY_ROLES } from '../lib/partyCatalog.ts';
import { GeminiServiceError, getActiveGeminiModel } from './geminiService.ts';

const ALLOWED_OCR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const VALID_DOC_TYPES = new Set<PartyOcrDocType>([
  'NID',
  'TRADE_LICENSE',
  'BUSINESS_CARD_OR_ID',
  'OTHER',
]);

const DOC_TYPE_LABELS_BN: Record<PartyOcrDocType, string> = {
  NID: 'জাতীয় পরিচয়পত্র (NID)',
  TRADE_LICENSE: 'ট্রেড লাইসেন্স / ব্যবসায়িক নিবন্ধন',
  BUSINESS_CARD_OR_ID: 'ভিজিটিং কার্ড / দোকান বা পরিচয়পত্র',
  OTHER: 'অন্যান্য নথি',
};

const VALID_BUILT_IN_ROLE_CODES = new Set<string>(BUILT_IN_PARTY_ROLES.map((r) => r.code));

// Per-user sliding window rate limiter (25 requests per 5 minutes)
const partyOcrRateBuckets = new Map<string, number[]>();

export function checkPartyOcrRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 25;
  const timestamps = (partyOcrRateBuckets.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    partyOcrRateBuckets.set(userId, timestamps);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  partyOcrRateBuckets.set(userId, timestamps);
  return { allowed: true, retryAfterSec: 0 };
}

function getCentralGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError(
      'GEMINI_API_KEY কনফিগার করা নেই। অনুগ্রহ করে Settings > Secrets প্যানেলে আপনার Gemini API Key যুক্ত করুন।',
      503,
      'API_KEY_MISSING'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapPartyOcrGeminiError(err: any): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;
  const rawMsg = String(err?.message || err || '');
  const status = Number(err?.status || err?.statusCode || 0);

  if (
    status === 403 ||
    rawMsg.includes('PERMISSION_DENIED') ||
    rawMsg.includes('API_KEY_INVALID') ||
    (status === 400 && rawMsg.toLowerCase().includes('api key'))
  ) {
    return new GeminiServiceError(
      'Gemini API Key সঠিক নয় বা অনুমতি পাওয়া যায়নি। অনুগ্রহ করে Settings > Secrets প্যানেলে API Key যাচাই করুন।',
      403,
      'API_KEY_INVALID'
    );
  }
  if (status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429')) {
    return new GeminiServiceError(
      'Gemini API-এর সাময়িক অনুরোধ সীমা (Quota) পূর্ণ হয়েছে। কিছুক্ষণ পর পুনরায় চেষ্টা করুন।',
      429,
      'RESOURCE_EXHAUSTED'
    );
  }
  if (status === 404 || rawMsg.includes('NOT_FOUND')) {
    const activeModel = getActiveGeminiModel();
    return new GeminiServiceError(
      `নির্বাচিত সেন্ট্রাল AI মডেল (${activeModel}) পাওয়া যায়নি। সেন্ট্রাল AI সেটিংস থেকে সক্রিয় মডেল যাচাই করুন।`,
      404,
      'MODEL_NOT_FOUND'
    );
  }
  return new GeminiServiceError(
    `AI ডকুমেন্ট OCR বিশ্লেষণে সাময়িক ত্রুটি ঘটেছে: ${rawMsg.slice(0, 180) || 'অজানা ত্রুটি'}`,
    502,
    'GEMINI_UPSTREAM_ERROR'
  );
}

async function withAiRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = Number(err?.status || err?.statusCode || 0);
      const msg = String(err?.message || '');
      const isRetryable =
        status === 503 || status === 500 || msg.includes('UNAVAILABLE') || msg.includes('ECONNRESET');
      if (!isRetryable || attempt === maxRetries) {
        throw mapPartyOcrGeminiError(err);
      }
      await new Promise((r) => setTimeout(r, 700 * Math.pow(2, attempt)));
    }
  }
  throw mapPartyOcrGeminiError(lastErr);
}

function safeParseJson<T>(rawText: string | undefined, fallbackMsg: string): T {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!cleaned) {
    throw new GeminiServiceError(fallbackMsg, 502, 'AI_EMPTY_RESPONSE');
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new GeminiServiceError(fallbackMsg, 502, 'AI_INVALID_JSON');
  }
}

function toAsciiDigits(input: string): string {
  const bnMap: Record<string, string> = {
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
  return String(input || '').replace(/[০-৯٠-٩]/g, (d) => bnMap[d] ?? d);
}

function normalizePhone(raw?: string): string {
  const digits = toAsciiDigits(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('880') && digits.length >= 13) return '0' + digits.slice(3);
  if (digits.startsWith('88') && digits.length === 13) return digits.slice(2);
  return digits;
}

function normalizeNid(raw?: string): string {
  return toAsciiDigits(raw || '').replace(/[^\d]/g, '');
}

function normalizeText(raw?: string): string {
  return toAsciiDigits(raw || '')
    .toLowerCase()
    .replace(/[.,\-_/()'"`~!@#$%^&*+=[\]{};:<>?\\|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanField(val: unknown, maxLen: number = 300): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'N/A') {
    return undefined;
  }
  return trimmed.slice(0, maxLen);
}

function parseDataUrlPayload(dataUrl: string, explicitMimeType?: string): { mimeType: string; base64Data: string } {
  const raw = String(dataUrl || '').trim();
  if (!raw) {
    throw new GeminiServiceError('স্ক্যান করার জন্য কোনো ছবি বা PDF ফাইল পাওয়া যায়নি।', 400, 'EMPTY_IMAGE');
  }

  let mimeType = (explicitMimeType || '').trim().toLowerCase();
  let base64Data = raw;

  const dataUrlMatch = /^data:([a-z0-9/+.-]+);base64,(.+)$/i.exec(raw);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1].toLowerCase();
    base64Data = dataUrlMatch[2];
  }

  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (!mimeType) mimeType = 'image/jpeg';

  if (!ALLOWED_OCR_MIME_TYPES.has(mimeType)) {
    throw new GeminiServiceError(
      'শুধুমাত্র JPG, PNG, WebP ছবি অথবা PDF ডকুমেন্ট স্ক্যান করা যাবে।',
      400,
      'UNSUPPORTED_MIME_TYPE'
    );
  }

  const sanitizedBase64 = base64Data.replace(/\s+/g, '');
  const estimatedBytes = Math.floor((sanitizedBase64.length * 3) / 4);
  if (estimatedBytes <= 0) {
    throw new GeminiServiceError('ডকুমেন্টের ডেটা খালি রয়েছে।', 400, 'EMPTY_IMAGE');
  }
  if (estimatedBytes > 6 * 1024 * 1024) {
    throw new GeminiServiceError('ডকুমেন্টের আকার সর্বোচ্চ ৬ মেগাবাইট হতে পারবে।', 413, 'PAYLOAD_TOO_LARGE');
  }

  return { mimeType, base64Data: sanitizedBase64 };
}

function findOcrDuplicateCandidates(
  extracted: {
    partyType: PartyProfileType;
    name?: string;
    phone?: string;
    alternatePhone?: string;
    nidNumber?: string;
    tradeLicenseNo?: string;
  },
  existingParties: PartyRecord[]
): PartyOcrDuplicateCandidate[] {
  const cPhone = normalizePhone(extracted.phone);
  const cAlt = normalizePhone(extracted.alternatePhone);
  const cNid = normalizeNid(extracted.nidNumber);
  const cName = normalizeText(extracted.name);
  const cLicense = normalizeText(extracted.tradeLicenseNo);

  const candidates: PartyOcrDuplicateCandidate[] = [];

  for (const party of existingParties) {
    if (party.mergedIntoPartyId) continue;

    const pPhone = party.normalizedPhone || normalizePhone(party.phone);
    const pAlt = party.normalizedAltPhone || normalizePhone(party.alternatePhone);
    const pNid = party.normalizedNid || normalizeNid(party.nidNumber);
    const pName = normalizeText(party.name);
    const pLicense = normalizeText(party.organizationDetails?.registrationOrTradeLicenseNo);

    const reasons: PartyDuplicateReasonCode[] = [];
    const reasonLabelsBn: string[] = [];

    if (cPhone && pPhone && cPhone.length >= 6 && cPhone === pPhone) {
      reasons.push('PHONE_MATCH');
      reasonLabelsBn.push('একই প্রাথমিক মোবাইল নম্বর');
    } else if (
      (cPhone && pAlt && cPhone.length >= 6 && cPhone === pAlt) ||
      (cAlt && pPhone && cAlt.length >= 6 && cAlt === pPhone) ||
      (cAlt && pAlt && cAlt.length >= 6 && cAlt === pAlt)
    ) {
      reasons.push('ALT_PHONE_MATCH');
      reasonLabelsBn.push('মোবাইল ও বিকল্প মোবাইল নম্বরের মিল');
    }

    if (cNid && pNid && cNid.length >= 8 && cNid === pNid) {
      reasons.push('NID_MATCH');
      reasonLabelsBn.push('একই জাতীয় পরিচয়পত্র (NID) নম্বর');
    }

    const licenseMatch = Boolean(cLicense && pLicense && cLicense.length >= 4 && cLicense === pLicense);
    if (licenseMatch) {
      reasons.push('ORG_NAME_EXACT_MATCH');
      reasonLabelsBn.push('একই ট্রেড লাইসেন্স / নিবন্ধন নং');
    }

    if (cName && pName && cName.length >= 3 && cName === pName) {
      if (extracted.partyType === 'ORGANIZATION' || party.partyType === 'ORGANIZATION') {
        if (reasons.includes('PHONE_MATCH') || reasons.includes('ALT_PHONE_MATCH')) {
          reasons.push('ORG_NAME_PHONE_MATCH');
          reasonLabelsBn.push('একই প্রতিষ্ঠানের নাম ও মোবাইল');
        } else if (!licenseMatch) {
          reasons.push('ORG_NAME_EXACT_MATCH');
          reasonLabelsBn.push('একই প্রতিষ্ঠানের নাম');
        }
      } else if (reasons.includes('PHONE_MATCH') || reasons.includes('ALT_PHONE_MATCH')) {
        reasons.push('NAME_PHONE_MATCH');
        reasonLabelsBn.push('একই নাম ও মোবাইল নম্বর');
      }
    }

    if (reasons.length > 0) {
      const highConfidence =
        reasons.includes('PHONE_MATCH') ||
        reasons.includes('ALT_PHONE_MATCH') ||
        reasons.includes('NID_MATCH') ||
        reasons.includes('ORG_NAME_PHONE_MATCH') ||
        reasons.includes('NAME_PHONE_MATCH') ||
        licenseMatch;

      candidates.push({
        party,
        confidence: highConfidence ? 'HIGH' : 'MEDIUM',
        reasons,
        reasonLabelsBn: Array.from(new Set(reasonLabelsBn)),
      });
    }
  }

  return candidates.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === 'HIGH' ? -1 : 1)).slice(0, 6);
}

interface RawGeminiOcrPayload {
  detectedDocType?: string;
  suggestedPartyType?: string;
  name?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  nidNumber?: string;
  fullAddress?: string;
  villageOrMahalla?: string;
  unionOrWard?: string;
  upazila?: string;
  district?: string;
  division?: string;
  postCode?: string;
  occupationOrSkill?: string;
  description?: string;
  organizationDetails?: {
    registrationOrTradeLicenseNo?: string;
    tinOrBin?: string;
    contactPersonName?: string;
    contactPersonDesignation?: string;
    contactPersonPhone?: string;
    website?: string;
    businessCategory?: string;
    establishedYear?: string;
  };
  suggestedRoles?: string[];
  unclearFieldsBn?: string[];
  confidenceNoteBn?: string;
}

export async function scanPartyDocumentWithCentralAi(params: {
  mosqueId: string;
  docType: PartyOcrDocType;
  dataUrl: string;
  mimeType?: string;
  userHint?: string;
  existingParties: PartyRecord[];
}): Promise<PartyOcrExtractResult> {
  const docType: PartyOcrDocType = VALID_DOC_TYPES.has(params.docType) ? params.docType : 'OTHER';
  const { mimeType, base64Data } = parseDataUrlPayload(params.dataUrl, params.mimeType);
  const activeModel = getActiveGeminiModel();
  const ai = getCentralGeminiClient();

  const roleListGuide = BUILT_IN_PARTY_ROLES.map((r) => `${r.code} (${r.labelBn})`).join(', ');

  const systemPrompt = [
    'You are an accurate Bangla & English OCR extraction assistant for a mosque management system (MasjidLedger Pro).',
    'Your task is to read the attached image/PDF (NID, Trade License, Visiting Card, Business ID, or general document) and extract structured contact & identity fields.',
    'STRICT NON-FABRICATION RULES:',
    '1. NEVER guess, invent, or hallucinate any phone number, NID number, license number, email, or address that is not clearly visible in the document.',
    '2. If a field is missing, obscured, blurry, or unreadable, return an empty string "" for that field and mention it in unclearFieldsBn in natural Bangla.',
    '3. Preserve Bangla names and addresses accurately in Bangla script if printed in Bangla, or English if printed in English.',
    `4. For suggestedPartyType: return "ORGANIZATION" if the document represents a shop, vendor, company, contractor firm, or trade license business entity; otherwise return "INDIVIDUAL".`,
    `5. For suggestedRoles: pick only relevant codes from [${roleListGuide}] if strongly implied by the card/license (e.g., VENDOR, SUPPLIER, ELECTRICIAN, CONTRACTOR); otherwise return [].`,
    '6. For confidenceNoteBn: write a brief 1-2 sentence Bangla summary of document clarity and what the user should verify before saving.',
  ].join('\n');

  const userPrompt = [
    `Selected Document Type: ${docType} (${DOC_TYPE_LABELS_BN[docType]})`,
    params.userHint ? `User Note / Hint: ${params.userHint.trim().slice(0, 250)}` : '',
    'Extract only the visibly present information in JSON matching the response schema.',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await withAiRetry(async () => {
    return await ai.models.generateContent({
      model: activeModel,
      contents: [
        {
          role: 'user',
          parts: [
            { text: userPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedDocType: { type: Type.STRING },
            suggestedPartyType: { type: Type.STRING },
            name: { type: Type.STRING },
            phone: { type: Type.STRING },
            alternatePhone: { type: Type.STRING },
            email: { type: Type.STRING },
            nidNumber: { type: Type.STRING },
            fullAddress: { type: Type.STRING },
            villageOrMahalla: { type: Type.STRING },
            unionOrWard: { type: Type.STRING },
            upazila: { type: Type.STRING },
            district: { type: Type.STRING },
            division: { type: Type.STRING },
            postCode: { type: Type.STRING },
            occupationOrSkill: { type: Type.STRING },
            description: { type: Type.STRING },
            organizationDetails: {
              type: Type.OBJECT,
              properties: {
                registrationOrTradeLicenseNo: { type: Type.STRING },
                tinOrBin: { type: Type.STRING },
                contactPersonName: { type: Type.STRING },
                contactPersonDesignation: { type: Type.STRING },
                contactPersonPhone: { type: Type.STRING },
                website: { type: Type.STRING },
                businessCategory: { type: Type.STRING },
                establishedYear: { type: Type.STRING },
              },
            },
            suggestedRoles: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            unclearFieldsBn: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            confidenceNoteBn: { type: Type.STRING },
          },
          required: ['suggestedPartyType', 'unclearFieldsBn', 'confidenceNoteBn'],
        },
      },
    });
  });

  const parsed = safeParseJson<RawGeminiOcrPayload>(
    response.text,
    'ডকুমেন্ট থেকে তথ্য পড়া যায়নি। ছবিটি স্পষ্ট কিনা তা যাচাই করে পুনরায় চেষ্টা করুন।'
  );

  const rawDetectedDocType = String(parsed.detectedDocType || docType).toUpperCase() as PartyOcrDocType;
  const detectedDocType: PartyOcrDocType = VALID_DOC_TYPES.has(rawDetectedDocType) ? rawDetectedDocType : docType;

  const suggestedPartyType: PartyProfileType =
    String(parsed.suggestedPartyType || '').toUpperCase() === 'ORGANIZATION' || docType === 'TRADE_LICENSE'
      ? 'ORGANIZATION'
      : 'INDIVIDUAL';

  const orgRaw = parsed.organizationDetails || {};
  const organizationDetails: PartyOrganizationDetails | undefined =
    suggestedPartyType === 'ORGANIZATION' || Object.values(orgRaw).some((v) => cleanField(v))
      ? {
          registrationOrTradeLicenseNo: cleanField(orgRaw.registrationOrTradeLicenseNo, 100),
          tinOrBin: cleanField(orgRaw.tinOrBin, 80),
          contactPersonName: cleanField(orgRaw.contactPersonName, 160),
          contactPersonDesignation: cleanField(orgRaw.contactPersonDesignation, 120),
          contactPersonPhone: cleanField(orgRaw.contactPersonPhone, 35),
          website: cleanField(orgRaw.website, 240),
          businessCategory: cleanField(orgRaw.businessCategory, 160),
          establishedYear: cleanField(orgRaw.establishedYear, 20),
        }
      : undefined;

  const name = cleanField(parsed.name, 200);
  const phone = cleanField(parsed.phone, 40) || organizationDetails?.contactPersonPhone;
  const alternatePhone = cleanField(parsed.alternatePhone, 40);
  const nidNumber = cleanField(parsed.nidNumber, 40);

  const suggestedRoles = Array.isArray(parsed.suggestedRoles)
    ? Array.from(
        new Set(
          parsed.suggestedRoles
            .map((r) => String(r || '').trim().toUpperCase())
            .filter((r) => VALID_BUILT_IN_ROLE_CODES.has(r))
        )
      )
    : [];

  const unclearFieldsBn = Array.isArray(parsed.unclearFieldsBn)
    ? parsed.unclearFieldsBn.map((f) => cleanField(f, 160)).filter((f): f is string => Boolean(f))
    : [];

  const potentialDuplicates = findOcrDuplicateCandidates(
    {
      partyType: suggestedPartyType,
      name,
      phone,
      alternatePhone,
      nidNumber,
      tradeLicenseNo: organizationDetails?.registrationOrTradeLicenseNo,
    },
    params.existingParties
  );

  return {
    draftStatus: 'UNVERIFIED_DRAFT',
    detectedDocType,
    detectedDocTypeBn: DOC_TYPE_LABELS_BN[detectedDocType],
    suggestedPartyType,
    name,
    phone,
    alternatePhone,
    email: cleanField(parsed.email, 160),
    nidNumber,
    fullAddress: cleanField(parsed.fullAddress, 400),
    villageOrMahalla: cleanField(parsed.villageOrMahalla, 160),
    unionOrWard: cleanField(parsed.unionOrWard, 160),
    upazila: cleanField(parsed.upazila, 120),
    district: cleanField(parsed.district, 120),
    division: cleanField(parsed.division, 120),
    postCode: cleanField(parsed.postCode, 20),
    occupationOrSkill: cleanField(parsed.occupationOrSkill, 200),
    description: cleanField(parsed.description, 600),
    organizationDetails,
    suggestedRoles,
    unclearFieldsBn,
    confidenceNoteBn:
      cleanField(parsed.confidenceNoteBn, 400) ||
      'AI খসড়া তথ্য প্রস্তুত হয়েছে। সংরক্ষণের আগে প্রতিটি ঘর নিজ দায়িত্বে যাচাই করুন।',
    potentialDuplicates,
    modelUsed: activeModel,
  };
}

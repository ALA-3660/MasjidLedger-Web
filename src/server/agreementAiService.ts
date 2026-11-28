/**
 * MasjidLedger Pro v2.6 — Agreement Management AI & Zero-Storage OCR Service (Part 2)
 *
 * STRICT SAFEGUARDS:
 * 1. Uses ONLY the Central AI Configuration (`getActiveGeminiModel()` + `process.env.GEMINI_API_KEY`).
 *    NO separate API key or model configuration.
 * 2. Zero Financial Integration: Never creates vouchers, receipts, ledger entries, or dues.
 * 3. Non-Fabrication Policy: AI must NEVER invent NID, phone, land dag/khatian, amounts, or dates.
 *    Missing items MUST be returned as clear placeholders (`[তথ্য প্রয়োজন: ...]`) & `missingInfoQuestions`.
 * 4. Non-Legal-Guarantee Policy: AI never auto-approves/signs and never declares ownership/legal validity.
 * 5. Zero-Storage OCR Policy: Images/PDFs are processed strictly in-memory and NEVER persisted to disk/DB.
 *    OCR output is always tagged `UNVERIFIED_DRAFT` until user verifies & corrects it.
 */

import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';
import { Mosque } from '../types/index.ts';
import {
  AgreementAiDraftResult,
  AgreementAiReviewResult,
  AgreementCategoryDef,
  AgreementClauseAssistAction,
  AgreementClauseAssistResult,
  AgreementOcrDocType,
  AgreementOcrExtractResult,
  AgreementPartyType,
  AgreementRecord,
  AgreementReviewFinding,
  AgreementRiskSeverity,
  WrittenPaymentMode,
} from '../types/agreementTypes.ts';
import {
  BUILT_IN_AGREEMENT_CATEGORIES,
  isWaqfOrLandCategoryCode,
} from '../lib/agreementCatalog.ts';
import { getActiveGeminiModel, GeminiServiceError } from './geminiService.ts';

// Per-user sliding window rate limiter (25 requests per 5 minutes)
const agreementAiRateBuckets = new Map<string, number[]>();

export function checkAgreementAiRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 25;
  const timestamps = (agreementAiRateBuckets.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    agreementAiRateBuckets.set(userId, timestamps);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  agreementAiRateBuckets.set(userId, timestamps);
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

function mapAgreementGeminiError(err: any): GeminiServiceError {
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
    `AI প্রক্রিয়াকরণে সাময়িক ত্রুটি ঘটেছে: ${rawMsg.slice(0, 180) || 'অজানা ত্রুটি'}`,
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
        throw mapAgreementGeminiError(err);
      }
      await new Promise((r) => setTimeout(r, 700 * Math.pow(2, attempt)));
    }
  }
  throw mapAgreementGeminiError(lastErr);
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

/**
 * Converts Bangla digits (০-৯) to ASCII digits and extracts numeric amount from written Bengali/English text.
 * Example: "২,৫০,০০০/- (দুই লক্ষ পঞ্চাশ হাজার টাকা)" -> 250000
 */
export function parseWrittenBanglaNumber(raw?: string | null): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const bnToEn: Record<string, string> = {
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
  };
  const normalized = raw.replace(/[০-৯]/g, (d) => bnToEn[d] || d);
  // Find first formatted number sequence like 2,50,000.50 or 50000
  const match = normalized.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const numericStr = match[0].replace(/,/g, '');
  const val = Number.parseFloat(numericStr);
  return Number.isFinite(val) ? val : null;
}

const VALID_PARTY_TYPES = new Set<AgreementPartyType>([
  'MOSQUE_COMMITTEE',
  'INDIVIDUAL',
  'CONTRACTOR_FIRM',
  'ORGANIZATION',
  'WAQF_TRUST',
  'LOCAL_COMMUNITY',
  'OTHER',
]);

const VALID_PAYMENT_MODES = new Set<WrittenPaymentMode>(['NON_FINANCIAL', 'LUMP_SUM', 'INSTALLMENT']);

// ==========================================
// 1. AI AGREEMENT ASSISTANT (Natural Bangla -> Structured Draft + Missing Info List)
// ==========================================
export async function generateAgreementDraftWithAi(
  mosque: Mosque | null,
  categories: AgreementCategoryDef[],
  input: {
    instructionBn: string;
    preferredCategoryCode?: string;
    existingContext?: string;
  }
): Promise<AgreementAiDraftResult> {
  const instructionBn = String(input.instructionBn || '').trim().slice(0, 4000);
  if (!instructionBn) {
    throw new GeminiServiceError('অনুগ্রহ করে চুক্তিপত্র তৈরির জন্য বাংলা নির্দেশনা লিখুন।', 400, 'VALIDATION_ERROR');
  }

  const ai = getCentralGeminiClient();
  const activeModel = getActiveGeminiModel();
  const mosqueNameBn = mosque?.nameBn || mosque?.name || 'মসজিদ পরিচালনা কমিটি';
  const mosqueAddr = mosque?.address || '';
  const allCats = categories.length ? categories : BUILT_IN_AGREEMENT_CATEGORIES;
  const categoryCatalogText = allCats.map((c) => `- ${c.code}: ${c.nameBn} (${c.formProfile})`).join('\n');

  const systemInstruction = `তুমি বাংলাদেশের মসজিদ ও ওয়াকফ এস্টেটের একজন দক্ষ বাংলা দাপ্তরিক চুক্তিপত্র খসড়া সহকারী।
কঠোর নিরাপত্তা ও সততা নীতিমালা (অপরিবর্তনীয়):
১. ব্যবহারকারী যেসব ব্যক্তিগত তথ্য, নাম, NID, মোবাইল, জমির মৌজা/জে.এল./খতিয়ান/দাগ, টাকার অঙ্ক, পরিমাপ বা তারিখ স্পষ্টভাবে দেননি—তা কখনো নিজে থেকে বানিয়ে লিখবে না।
২. যেসব তথ্য অনুপস্থিত, সেখানে স্পষ্ট প্লেসহোল্ডার যেমন "[তথ্য প্রয়োজন: দ্বিতীয় পক্ষের পূর্ণ নাম]" বা "[তথ্য প্রয়োজন: খতিয়ান/দাগ নম্বর]" বসাবে এবং প্রতিটি অনুপস্থিত তথ্য অবশ্যই missingInfoQuestions অ্যারেতে প্রশ্ন আকারে যুক্ত করবে।
৩. প্রথম পক্ষ হিসেবে মসজিদ পরিচালনা কমিটির নাম "${mosqueNameBn}" ব্যবহার করা যেতে পারে, তবে প্রতিনিধির নাম ও রেজুলেশন নম্বর না দেওয়া থাকলে তা প্লেসহোল্ডার ও missingInfoQuestions-এ রাখবে।
৪. এটি শুধুমাত্র লিখিত চুক্তিপত্রের খসড়া (কোনো আর্থিক লেনদেন, রসিদ বা ভাউচার নয়)। কিস্তির শর্ত কেবল লিখিত ধারা হিসেবে সাজাবে।
৫. কখনো দাবি করবে না যে চুক্তিটি অনুমোদিত, স্বাক্ষরিত বা আইনগতভাবে চূড়ান্ত যাচাইকৃত; ওয়াকফ বা জমি-সংক্রান্ত চুক্তিতে waqfLegalReviewRequired = true রাখবে।
৬. সর্বদা প্রমিত, পরিষ্কার ও আনুষ্ঠানিক বাংলায় উত্তর দেবে এবং কেবল বৈধ JSON রিটার্ন করবে।`;

  const userPrompt = `মসজিদ: ${mosqueNameBn}${mosqueAddr ? ` (ঠিকানা: ${mosqueAddr})` : ''}
উপলব্ধ চুক্তির ক্যাটাগরি তালিকা:
${categoryCatalogText}

${input.preferredCategoryCode ? `ব্যবহারকারীর পছন্দের ক্যাটাগরি ইঙ্গিত: ${input.preferredCategoryCode}` : ''}
${input.existingContext ? `অতিরিক্ত প্রাসঙ্গিক তথ্য:\n${input.existingContext.slice(0, 1500)}` : ''}

ব্যবহারকারীর বাংলা নির্দেশনা:
"""
${instructionBn}
"""

নির্দেশনা বিশ্লেষণ করে উপযুক্ত ক্যাটাগরি শনাক্ত করো এবং পূর্ণাঙ্গ কাঠামোবদ্ধ বাংলা চুক্তিপত্রের খসড়া ও অনুপস্থিত তথ্যের প্রশ্নতালিকা JSON আকারে দাও।`;

  const response = await withAiRetry(() =>
    ai.models.generateContent({
      model: activeModel,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedCategoryCode: { type: Type.STRING },
            title: { type: Type.STRING },
            purpose: { type: Type.STRING },
            durationText: { type: Type.STRING },
            parties: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  roleLabel: { type: Type.STRING },
                  partyType: { type: Type.STRING },
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  nidOrRegNo: { type: Type.STRING },
                  representatives: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        designation: { type: Type.STRING },
                        authorityBasis: { type: Type.STRING },
                        isSignatory: { type: Type.BOOLEAN },
                      },
                    },
                  },
                },
              },
            },
            constructionDetails: {
              type: Type.OBJECT,
              properties: {
                workSummary: { type: Type.STRING },
                length: { type: Type.STRING },
                width: { type: Type.STRING },
                height: { type: Type.STRING },
                dimensionUnit: { type: Type.STRING },
                quantity: { type: Type.STRING },
                quantityUnit: { type: Type.STRING },
                unitRate: { type: Type.STRING },
                totalContractValueText: { type: Type.STRING },
                materialsResponsibility: { type: Type.STRING },
                laborResponsibility: { type: Type.STRING },
                timelineDuration: { type: Type.STRING },
                qualityInspectionTerms: { type: Type.STRING },
                handoverTerms: { type: Type.STRING },
              },
            },
            landWaqfDetails: {
              type: Type.OBJECT,
              properties: {
                mouza: { type: Type.STRING },
                jlNumber: { type: Type.STRING },
                khatianNumber: { type: Type.STRING },
                dagNumber: { type: Type.STRING },
                landArea: { type: Type.STRING },
                landAreaUnit: { type: Type.STRING },
                proposedPortionDesc: { type: Type.STRING },
                roadLength: { type: Type.STRING },
                roadWidth: { type: Type.STRING },
                roadUnit: { type: Type.STRING },
                partyContributions: { type: Type.STRING },
                waqfLegalReviewRequired: { type: Type.BOOLEAN },
                waqfLegalReviewNote: { type: Type.STRING },
              },
            },
            writtenFinancialTerms: {
              type: Type.OBJECT,
              properties: {
                mode: { type: Type.STRING },
                totalWrittenAmount: { type: Type.STRING },
                paymentTermsNote: { type: Type.STRING },
                schedules: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stageTitle: { type: Type.STRING },
                      condition: { type: Type.STRING },
                      timingOrMilestone: { type: Type.STRING },
                      writtenAmount: { type: Type.STRING },
                    },
                  },
                },
              },
            },
            generalClauses: { type: Type.STRING },
            specialClauses: { type: Type.STRING },
            terminationClause: { type: Type.STRING },
            disputeResolutionClause: { type: Type.STRING },
            missingInfoQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['detectedCategoryCode', 'title', 'purpose', 'generalClauses', 'missingInfoQuestions'],
        },
      },
    })
  );

  const parsed = safeParseJson<any>(
    response.text,
    'AI চুক্তিপত্র খসড়া সঠিকভাবে তৈরি করতে পারেনি। অনুগ্রহ করে নির্দেশনা স্পষ্ট করে পুনরায় চেষ্টা করুন।'
  );

  const matchedCat =
    allCats.find((c) => c.code === parsed.detectedCategoryCode) ||
    allCats.find((c) => c.code === input.preferredCategoryCode) ||
    allCats.find((c) => c.code === 'OTHER_CUSTOM') ||
    allCats[0];

  const modeRaw = String(parsed.writtenFinancialTerms?.mode || 'NON_FINANCIAL').toUpperCase() as WrittenPaymentMode;
  const safeMode: WrittenPaymentMode = VALID_PAYMENT_MODES.has(modeRaw) ? modeRaw : 'NON_FINANCIAL';

  const normalizedParties = Array.isArray(parsed.parties) && parsed.parties.length >= 2
    ? parsed.parties.slice(0, 8).map((p: any, idx: number) => ({
        roleLabel: String(p?.roleLabel || (idx === 0 ? 'প্রথম পক্ষ' : idx === 1 ? 'দ্বিতীয় পক্ষ' : `${idx + 1}ম পক্ষ`)).slice(0, 80),
        partyType: VALID_PARTY_TYPES.has(p?.partyType) ? (p.partyType as AgreementPartyType) : idx === 0 ? 'MOSQUE_COMMITTEE' : 'INDIVIDUAL',
        name: String(p?.name || (idx === 0 ? mosqueNameBn : '[তথ্য প্রয়োজন: পক্ষের নাম]')).slice(0, 200),
        address: p?.address ? String(p.address).slice(0, 350) : undefined,
        phone: p?.phone ? String(p.phone).slice(0, 40) : undefined,
        nidOrRegNo: p?.nidOrRegNo ? String(p.nidOrRegNo).slice(0, 60) : undefined,
        representatives: Array.isArray(p?.representatives)
          ? p.representatives.slice(0, 5).map((r: any) => ({
              name: String(r?.name || '[তথ্য প্রয়োজন: প্রতিনিধির নাম]').slice(0, 150),
              designation: String(r?.designation || 'প্রতিনিধি').slice(0, 100),
              authorityBasis: String(r?.authorityBasis || '[তথ্য প্রয়োজন: রেজুলেশন নং ও তারিখ / অনুমোদনপত্র]').slice(0, 250),
              isSignatory: Boolean(r?.isSignatory ?? true),
            }))
          : [],
      }))
    : [
        {
          roleLabel: 'প্রথম পক্ষ',
          partyType: 'MOSQUE_COMMITTEE' as AgreementPartyType,
          name: mosqueNameBn,
          address: mosqueAddr || undefined,
          representatives: [
            {
              name: '[তথ্য প্রয়োজন: মসজিদ কমিটির প্রতিনিধির নাম]',
              designation: 'সভাপতি / সাধারণ সম্পাদক',
              authorityBasis: '[তথ্য প্রয়োজন: পরিচালনা কমিটির রেজুলেশন নং ও তারিখ]',
              isSignatory: true,
            },
          ],
        },
        {
          roleLabel: 'দ্বিতীয় পক্ষ',
          partyType: 'INDIVIDUAL' as AgreementPartyType,
          name: '[তথ্য প্রয়োজন: দ্বিতীয় পক্ষের পূর্ণ নাম]',
          representatives: [],
        },
      ];

  const isWaqfCat = isWaqfOrLandCategoryCode(matchedCat.code, allCats);
  const landDetails = parsed.landWaqfDetails
    ? {
        ...parsed.landWaqfDetails,
        waqfLegalReviewRequired: isWaqfCat ? true : Boolean(parsed.landWaqfDetails.waqfLegalReviewRequired),
        waqfLegalCautionAcknowledged: false,
      }
    : isWaqfCat
    ? {
        waqfLegalReviewRequired: true,
        waqfLegalCautionAcknowledged: false,
        waqfLegalReviewNote: 'চূড়ান্ত স্বাক্ষরের পূর্বে মূল ওয়াকফ দলিল, খতিয়ান ও কমিটির রেজুলেশন যাচাই আবশ্যক।',
      }
    : undefined;

  return {
    detectedCategoryCode: matchedCat.code,
    detectedCategoryNameBn: matchedCat.nameBn,
    title: String(parsed.title || `${matchedCat.nameBn} — খসড়া`).slice(0, 240),
    purpose: String(parsed.purpose || instructionBn).slice(0, 1800),
    durationText: parsed.durationText ? String(parsed.durationText).slice(0, 150) : undefined,
    parties: normalizedParties,
    constructionDetails: parsed.constructionDetails || undefined,
    landWaqfDetails: landDetails,
    writtenFinancialTerms: {
      mode: safeMode,
      totalWrittenAmount:
        safeMode === 'NON_FINANCIAL' ? undefined : String(parsed.writtenFinancialTerms?.totalWrittenAmount || '').slice(0, 160) || undefined,
      paymentTermsNote: parsed.writtenFinancialTerms?.paymentTermsNote
        ? String(parsed.writtenFinancialTerms.paymentTermsNote).slice(0, 1000)
        : undefined,
      schedules:
        safeMode === 'NON_FINANCIAL' || !Array.isArray(parsed.writtenFinancialTerms?.schedules)
          ? []
          : parsed.writtenFinancialTerms.schedules.slice(0, 20).map((s: any, idx: number) => ({
              stageTitle: String(s?.stageTitle || `${idx + 1}ম কিস্তি`).slice(0, 150),
              condition: String(s?.condition || '').slice(0, 350),
              timingOrMilestone: String(s?.timingOrMilestone || '[তথ্য প্রয়োজন: সময়সীমা]').slice(0, 180),
              writtenAmount: String(s?.writtenAmount || '[তথ্য প্রয়োজন: লিখিত অঙ্ক]').slice(0, 120),
            })),
    },
    generalClauses: String(parsed.generalClauses || '').slice(0, 20000),
    specialClauses: parsed.specialClauses ? String(parsed.specialClauses).slice(0, 8000) : undefined,
    terminationClause: parsed.terminationClause ? String(parsed.terminationClause).slice(0, 4000) : undefined,
    disputeResolutionClause: parsed.disputeResolutionClause
      ? String(parsed.disputeResolutionClause).slice(0, 4000)
      : undefined,
    missingInfoQuestions: Array.isArray(parsed.missingInfoQuestions)
      ? parsed.missingInfoQuestions.map((q: any) => String(q || '').trim()).filter(Boolean).slice(0, 15)
      : [],
    safetyNoticeBn:
      'এটি AI-সহায়তাকৃত প্রাথমিক খসড়া মাত্র। সংরক্ষণ বা স্বাক্ষরের পূর্বে সকল প্লেসহোল্ডার ("[তথ্য প্রয়োজন: ...]") যাচাই ও পূরণ করুন। AI কোনো চুক্তির আইনগত বৈধতা বা সম্পত্তির মালিকানা নিশ্চিত করে না।',
    modelUsed: activeModel,
    generatedAt: new Date().toISOString(),
  };
}

// ==========================================
// 2. AI CLAUSE ASSISTANT (Refine, Formalize, Simplify, Separate Responsibilities, Weaknesses)
// ==========================================
const CLAUSE_ACTION_INSTRUCTIONS: Record<AgreementClauseAssistAction, string> = {
  ADD_CLAUSE: 'বিদ্যমান শর্তাবলির সাথে ব্যবহারকারীর চাহিদা অনুযায়ী নতুন সুস্পষ্ট, ভারসাম্যপূর্ণ বাংলা ধারা সংযোজন করো।',
  CLARIFY_TERMS: 'বিদ্যমান শর্তাবলির অস্পষ্ট বা দ্ব্যর্থবোধক বাক্যগুলো স্পষ্ট, সুনির্দিষ্ট ও নির্ভুল বাংলায় পুনর্লিখন করো।',
  FORMAL_BANGLA: 'বিদ্যমান শর্তাবলিকে প্রমিত, মার্জিত ও আনুষ্ঠানিক বাংলা দাপ্তরিক চুক্তিপত্রের ভাষায় রূপান্তর করো।',
  SIMPLE_BANGLA: 'বিদ্যমান শর্তাবলির মূল অর্থ অক্ষুণ্ণ রেখে সাধারণ মানুষের বোধগম্য সহজ ও প্রাঞ্জল বাংলায় রূপান্তর করো।',
  SEPARATE_RESPONSIBILITIES: 'শর্তাবলিকে প্রথম পক্ষের দায়িত্ব, দ্বিতীয় পক্ষের (ও অন্যান্য পক্ষের) দায়িত্ব এবং যৌথ শর্ত—এভাবে পরিষ্কারভাবে আলাদা করে সাজাও।',
  IDENTIFY_WEAKNESSES: 'বিদ্যমান শর্তাবলির দুর্বলতা, ফাঁকফোকর বা অস্পষ্ট অংশগুলো চিহ্নিত করো এবং সেগুলো সমাধান করে একটি উন্নত খসড়া প্রস্তাব করো।',
};

export async function assistAgreementClauseWithAi(input: {
  action: AgreementClauseAssistAction;
  currentClauses: string;
  categoryNameBn?: string;
  agreementTitle?: string;
  userInstruction?: string;
}): Promise<AgreementClauseAssistResult> {
  const currentClauses = String(input.currentClauses || '').trim().slice(0, 20000);
  const userInstruction = String(input.userInstruction || '').trim().slice(0, 1500);
  if (!currentClauses && !userInstruction) {
    throw new GeminiServiceError('পর্যালোচনা বা সম্পাদনার জন্য বিদ্যমান শর্তাবলি অথবা নির্দেশনা প্রদান করুন।', 400, 'VALIDATION_ERROR');
  }

  const ai = getCentralGeminiClient();
  const activeModel = getActiveGeminiModel();
  const actionRule = CLAUSE_ACTION_INSTRUCTIONS[input.action] || CLAUSE_ACTION_INSTRUCTIONS.CLARIFY_TERMS;

  const systemInstruction = `তুমি বাংলাদেশের মসজিদ ও ওয়াকফ এস্টেটের দাপ্তরিক চুক্তিপত্রের ধারা-সম্পাদনা সহকারী।
কঠোর নিয়মাবলি:
১. কোনো ব্যক্তিগত তথ্য, NID, দাগ নম্বর, তারিখ বা টাকার অঙ্ক নিজে থেকে বানাবে না; অনুপস্থিত হলে "[তথ্য প্রয়োজন: ...]" রাখবে।
২. আর্থিক শর্ত থাকলেও তা শুধুমাত্র লিখিত ধারা হিসেবেই উপস্থাপন করবে।
৩. আইনগত বৈধতা নিশ্চিত করার দাবি করবে না; কেবল খসড়া মানোন্নয়নের পরামর্শ দেবে।
৪. বাংলায় সুস্পষ্ট JSON আউটপুট দাও।`;

  const prompt = `কার্যক্রম: ${input.action} — ${actionRule}
চুক্তির শিরোনাম: ${input.agreementTitle || 'অনির্ধারিত'}
ক্যাটাগরি: ${input.categoryNameBn || 'সাধারণ চুক্তি'}
${userInstruction ? `অতিরিক্ত নির্দেশনা: ${userInstruction}` : ''}

বিদ্যমান শর্তাবলি:
"""
${currentClauses || '(এখনো কোনো ধারা লেখা হয়নি)'}
"""

নির্দেশিত কার্যক্রম অনুযায়ী পরিমার্জিত শর্তাবলি (revisedClauses), পরিবর্তনের সারসংক্ষেপ (summaryBn), শনাক্তকৃত দুর্বল দিকসমূহ (weaknessesDetected) এবং অতিরিক্ত প্রয়োজনীয় ধারার প্রস্তাব (suggestedAdditions) JSON আকারে দাও।`;

  const response = await withAiRetry(() =>
    ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            revisedClauses: { type: Type.STRING },
            summaryBn: { type: Type.STRING },
            weaknessesDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedAdditions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['revisedClauses', 'summaryBn', 'weaknessesDetected', 'suggestedAdditions'],
        },
      },
    })
  );

  const parsed = safeParseJson<any>(
    response.text,
    'AI ধারা সহায়তা তৈরি করতে ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
  );

  return {
    action: input.action,
    revisedClauses: String(parsed.revisedClauses || currentClauses).slice(0, 22000),
    summaryBn: String(parsed.summaryBn || 'শর্তাবলি পরিমার্জন করা হয়েছে।').slice(0, 1000),
    weaknessesDetected: Array.isArray(parsed.weaknessesDetected)
      ? parsed.weaknessesDetected.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 12)
      : [],
    suggestedAdditions: Array.isArray(parsed.suggestedAdditions)
      ? parsed.suggestedAdditions.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 10)
      : [],
    safetyNoticeBn:
      'পরিমার্জিত ধারাটি ফর্মে প্রয়োগ করার আগে ভালোভাবে পড়ে যাচাই করে নিন। এটি কোনো আইনজীবীর বিকল্প নয়।',
    modelUsed: activeModel,
    generatedAt: new Date().toISOString(),
  };
}

// ==========================================
// 3. AI CONTRACT REVIEW & RISK DETECTION (Deterministic Checks + Central Gemini Semantic Review)
// ==========================================
export async function reviewAgreementRisksWithAi(
  agreement: Partial<AgreementRecord>,
  categories: AgreementCategoryDef[]
): Promise<AgreementAiReviewResult> {
  const deterministicFindings: AgreementReviewFinding[] = [];
  const missingPlaceholders: string[] = [];

  // A. Detect unresolved placeholders anywhere in text fields
  const textScanBundle = [
    agreement.title || '',
    agreement.purpose || '',
    agreement.generalClauses || '',
    agreement.specialClauses || '',
    agreement.terminationClause || '',
    agreement.disputeResolutionClause || '',
    ...(agreement.parties || []).flatMap((p) => [
      p.name || '',
      p.address || '',
      ...(p.representatives || []).flatMap((r) => [r.name || '', r.authorityBasis || '']),
    ]),
  ].join('\n');

  const placeholderMatches = textScanBundle.match(/\[(?:তথ্য প্রয়োজন|অপূর্ণ|Pending|TODO)[^\]]*\]/gi) || [];
  for (const ph of Array.from(new Set(placeholderMatches)).slice(0, 15)) {
    missingPlaceholders.push(ph);
  }
  if (missingPlaceholders.length > 0) {
    deterministicFindings.push({
      id: `det-${crypto.randomUUID().slice(0, 6)}`,
      severity: 'HIGH',
      area: 'MISSING_INFO',
      titleBn: `${missingPlaceholders.length}টি অপূর্ণ প্লেসহোল্ডার তথ্য রয়ে গেছে`,
      detailBn: `চুক্তির ভেতরে এখনো পূরণ না করা তথ্য পাওয়া গেছে: ${missingPlaceholders.slice(0, 4).join(', ')}`,
      suggestionBn: 'চূড়ান্ত বা স্বাক্ষর করার পূর্বে প্রতিটি প্লেসহোল্ডার প্রকৃত যাচাইকৃত তথ্য দিয়ে প্রতিস্থাপন করুন।',
    });
  }

  // B. Party identity & representative authority basis check
  const parties = agreement.parties || [];
  if (parties.length < 2) {
    deterministicFindings.push({
      id: `det-${crypto.randomUUID().slice(0, 6)}`,
      severity: 'HIGH',
      area: 'PARTY_IDENTITY',
      titleBn: 'কমপক্ষে দুইটি পক্ষ যুক্ত করা হয়নি',
      detailBn: 'বৈধ দ্বিপাক্ষিক বা বহুপাক্ষিক চুক্তির জন্য কমপক্ষে প্রথম ও দ্বিতীয় পক্ষের পূর্ণ পরিচয় প্রয়োজন।',
      suggestionBn: 'সকল পক্ষের নাম, ঠিকানা, মোবাইল ও এনআইডি/রেজিস্ট্রেশন নম্বর যুক্ত করুন।',
    });
  }
  for (const p of parties) {
    if (!p.address || !p.phone) {
      deterministicFindings.push({
        id: `det-${crypto.randomUUID().slice(0, 6)}`,
        severity: 'MEDIUM',
        area: 'PARTY_IDENTITY',
        titleBn: `${p.roleLabel || p.name}: ঠিকানা বা যোগাযোগের তথ্য অসম্পূর্ণ`,
        detailBn: `পক্ষ "${p.name || p.roleLabel}" এর ঠিকানা বা মোবাইল নম্বর দেওয়া নেই।`,
        suggestionBn: 'ভবিষ্যতে দাপ্তরিক যোগাযোগ ও শনাক্তকরণের জন্য পূর্ণ ঠিকানা ও মোবাইল নম্বর যুক্ত করুন।',
      });
    }
    if (
      (p.partyType === 'MOSQUE_COMMITTEE' || p.partyType === 'ORGANIZATION' || p.partyType === 'WAQF_TRUST') &&
      (!p.representatives || p.representatives.length === 0)
    ) {
      deterministicFindings.push({
        id: `det-${crypto.randomUUID().slice(0, 6)}`,
        severity: 'HIGH',
        area: 'REPRESENTATIVE_AUTHORITY',
        titleBn: `${p.roleLabel}: প্রাতিষ্ঠানিক প্রতিনিধি ও ক্ষমতার ভিত্তি অনুপস্থিত`,
        detailBn: `"${p.name}" একটি প্রতিষ্ঠান/কমিটি হলেও কোনো ক্ষমতাপ্রাপ্ত প্রতিনিধি বা রেজুলেশন নম্বর উল্লেখ নেই।`,
        suggestionBn: 'প্রতিষ্ঠানের পক্ষে স্বাক্ষরকারী প্রতিনিধির নাম, পদবি এবং কমিটির রেজুলেশন নম্বর/অনুমোদনপত্র যুক্ত করুন।',
      });
    }
    for (const r of p.representatives || []) {
      if (!r.authorityBasis || r.authorityBasis.includes('তথ্য প্রয়োজন')) {
        deterministicFindings.push({
          id: `det-${crypto.randomUUID().slice(0, 6)}`,
          severity: 'MEDIUM',
          area: 'REPRESENTATIVE_AUTHORITY',
          titleBn: `প্রতিনিধি "${r.name || p.roleLabel}" এর ক্ষমতার ভিত্তি অস্পষ্ট`,
          detailBn: 'প্রতিনিধির পক্ষে স্বাক্ষরের ক্ষমতার উৎস (কমিটির রেজুলেশন নং/তারিখ বা পাওয়ার অব অ্যাটর্নি) স্পষ্ট নয়।',
          suggestionBn: 'রেজুলেশন নম্বর ও তারিখ অথবা লিখিত অনুমোদনপত্রের বিবরণ যুক্ত করুন।',
        });
      }
    }
  }

  // C. Deterministic Arithmetic Consistency Check (Total Written Amount vs Installments Sum)
  const wf = agreement.writtenFinancialTerms;
  let mathCheck: AgreementAiReviewResult['mathConsistencyCheck'] = {
    checked: false,
    totalParsed: null,
    installmentsSumParsed: null,
    isConsistent: null,
    noteBn: 'এটি অ-আর্থিক বা এককালীন লিখিত চুক্তি হওয়ায় কিস্তি যোগফল যাচাই প্রযোজ্য নয়।',
  };

  if (wf && wf.mode === 'INSTALLMENT') {
    const totalVal =
      parseWrittenBanglaNumber(wf.totalWrittenAmount) ??
      parseWrittenBanglaNumber(agreement.constructionDetails?.totalContractValueText);
    const parsedInstallments = (wf.schedules || []).map((s) => parseWrittenBanglaNumber(s.writtenAmount));
    const validNums = parsedInstallments.filter((n): n is number => n !== null);
    const sumVal = validNums.length > 0 ? validNums.reduce((acc, n) => acc + n, 0) : null;

    if (totalVal !== null && sumVal !== null) {
      const diff = Math.abs(totalVal - sumVal);
      const isConsistent = diff < 0.01;
      mathCheck = {
        checked: true,
        totalParsed: totalVal,
        installmentsSumParsed: sumVal,
        isConsistent,
        noteBn: isConsistent
          ? `লিখিত মোট চুক্তিমূল্য (${totalVal.toLocaleString('en-US')}) এবং কিস্তিগুলোর যোগফল (${sumVal.toLocaleString('en-US')}) গাণিতিকভাবে সামঞ্জস্যপূর্ণ।`
          : `গাণিতিক অসামঞ্জস্যতা শনাক্ত হয়েছে: লিখিত মোট মূল্য ${totalVal.toLocaleString('en-US')}, কিন্তু কিস্তিগুলোর যোগফল ${sumVal.toLocaleString('en-US')} (পার্থক্য: ${diff.toLocaleString('en-US')})।`,
      };
      if (!isConsistent) {
        deterministicFindings.push({
          id: `det-${crypto.randomUUID().slice(0, 6)}`,
          severity: 'HIGH',
          area: 'ARITHMETIC_CONSISTENCY',
          titleBn: 'মোট লিখিত মূল্য ও কিস্তির যোগফলে গরমিল রয়েছে',
          detailBn: mathCheck.noteBn,
          suggestionBn: 'চূড়ান্ত করার আগে লিখিত মোট অঙ্ক এবং প্রতিটি কিস্তির অঙ্ক পুনরায় মিলিয়ে সংশোধন করুন।',
        });
      }
    } else {
      mathCheck = {
        checked: false,
        totalParsed: totalVal,
        installmentsSumParsed: sumVal,
        isConsistent: null,
        noteBn: 'লিখিত মোট মূল্য অথবা কিস্তির অঙ্ক স্পষ্ট সংখ্যায় উল্লেখ না থাকায় স্বয়ংক্রিয় যোগফল মেলানো যায়নি।',
      };
      deterministicFindings.push({
        id: `det-${crypto.randomUUID().slice(0, 6)}`,
        severity: 'MEDIUM',
        area: 'ARITHMETIC_CONSISTENCY',
        titleBn: 'কিস্তি বা মোট চুক্তিমূল্যের সংখ্যা অসম্পূর্ণ',
        detailBn: mathCheck.noteBn,
        suggestionBn: 'প্রতিটি কিস্তির ঘরে স্পষ্ট সংখ্যায় লিখিত টাকার অঙ্ক ও মোট মূল্য উল্লেখ করুন।',
      });
    }
  }

  // D. Date & Timeline Coherence Check
  if (agreement.effectiveDate && agreement.expiryDate && agreement.expiryDate < agreement.effectiveDate) {
    deterministicFindings.push({
      id: `det-${crypto.randomUUID().slice(0, 6)}`,
      severity: 'HIGH',
      area: 'DATE_TIMELINE',
      titleBn: 'মেয়াদোত্তীর্ণ তারিখ কার্যকর তারিখের পূর্বে দেওয়া হয়েছে',
      detailBn: `কার্যকর তারিখ (${agreement.effectiveDate}) অপেক্ষা মেয়াদোত্তীর্ণ তারিখ (${agreement.expiryDate}) আগে পড়েছে।`,
      suggestionBn: 'কার্যকর তারিখ ও মেয়াদোত্তীর্ণ তারিখ সঠিকভাবে সংশোধন করুন।',
    });
  }

  // E. Waqf / Land / Road High-Risk Legal Review Mandatory Flag
  const isWaqfOrLand =
    Boolean(agreement.isWaqfOrLandRelated) ||
    isWaqfOrLandCategoryCode(String(agreement.categoryCode || ''), categories) ||
    Boolean(agreement.landWaqfDetails);

  if (isWaqfOrLand) {
    const ld = agreement.landWaqfDetails;
    if (!ld?.mouza || !ld?.khatianNumber || !ld?.dagNumber) {
      deterministicFindings.push({
        id: `det-${crypto.randomUUID().slice(0, 6)}`,
        severity: 'HIGH',
        area: 'WAQF_LAND_LEGAL',
        titleBn: 'জমি / ওয়াকফ তফসিলের মৌলিক তথ্য (মৌজা/খতিয়ান/দাগ) অসম্পূর্ণ',
        detailBn: 'জমি বা ওয়াকফ সম্পত্তি সংক্রান্ত চুক্তিতে মৌজা, খতিয়ান ও দাগ নম্বর পূর্ণাঙ্গ না থাকলে ভবিষ্যতে সীমানা ও পরিচয় জটিলতা সৃষ্টি হতে পারে।',
        suggestionBn: 'মূল পর্চা/খতিয়ান দেখে মৌজা, জে.এল., খতিয়ান ও দাগ নম্বর সঠিকভাবে পূরণ করুন।',
      });
    }
    if (!ld?.waqfLegalCautionAcknowledged) {
      deterministicFindings.push({
        id: `det-${crypto.randomUUID().slice(0, 6)}`,
        severity: 'HIGH',
        area: 'WAQF_LAND_LEGAL',
        titleBn: 'ওয়াকফ ও আইনি পর্যালোচনা (Legal Review Required) এখনো নিশ্চিত করা হয়নি',
        detailBn: 'জমি, ওয়াকফ সম্পত্তি বা চলাচলের রাস্তা সংক্রান্ত চুক্তি উচ্চ-ঝুঁকিপূর্ণ। চূড়ান্ত স্বাক্ষরের আগে আইনজীবী/ওয়াকফ বিধি ও কমিটির রেজুলেশন যাচাই আবশ্যক।',
        suggestionBn: 'আইনি ও ওয়াকফ পর্যালোচনা সম্পন্ন করে ফর্মের সতর্কতা ঘরটি টিক দিয়ে মন্তব্য যুক্ত করুন।',
      });
    }
  }

  // F. Central Gemini Semantic Review (Clarity, Contradictions, Scope, Missing Safeguards)
  const ai = getCentralGeminiClient();
  const activeModel = getActiveGeminiModel();

  const systemInstruction = `তুমি বাংলাদেশের মসজিদ ও ওয়াকফ এস্টেটের একজন নিরপেক্ষ চুক্তিপত্র পর্যালোচনা ও ঝুঁকি বিশ্লেষণ সহকারী।
কঠোর নিয়মাবলি:
১. তুমি কখনো বলবে না যে চুক্তিটি "আইনগতভাবে বৈধ", "অনুমোদিত" বা "মালিকানা নিশ্চিত"।
২. কোনো তথ্য বানিয়ে লিখবে না; কেবল প্রদত্ত খসড়ার দুর্বলতা, অস্পষ্টতা, পরস্পরবিরোধী ধারা, কাজের বিবরণের ঘাটতি, সময়সীমা বা ওয়াকফ/জমি ঝুঁকি চিহ্নিত করে সহায়ক বাংলা পরামর্শ দেবে।
৩. প্রদত্ত নির্ণীত (deterministic) ত্রুটিগুলোর পুনরাবৃত্তি না করে অতিরিক্ত ভাষাগত, শর্তগত ও ব্যবহারিক ঝুঁকি খুঁজে বের করবে।
৪. কেবল বৈধ JSON রিটার্ন করবে।`;

  const snapshot = {
    title: agreement.title,
    categoryCode: agreement.categoryCode,
    categoryNameBn: agreement.categoryNameBn,
    agreementDate: agreement.agreementDate,
    effectiveDate: agreement.effectiveDate,
    expiryDate: agreement.expiryDate,
    durationText: agreement.durationText,
    purpose: agreement.purpose,
    parties: (agreement.parties || []).map((p) => ({
      roleLabel: p.roleLabel,
      partyType: p.partyType,
      name: p.name,
      repsCount: (p.representatives || []).length,
      representatives: (p.representatives || []).map((r) => ({
        name: r.name,
        designation: r.designation,
        authorityBasis: r.authorityBasis,
      })),
    })),
    constructionDetails: agreement.constructionDetails,
    landWaqfDetails: agreement.landWaqfDetails,
    writtenFinancialTerms: agreement.writtenFinancialTerms,
    generalClauses: (agreement.generalClauses || '').slice(0, 6000),
    specialClauses: (agreement.specialClauses || '').slice(0, 2000),
    terminationClause: (agreement.terminationClause || '').slice(0, 1500),
    disputeResolutionClause: (agreement.disputeResolutionClause || '').slice(0, 1500),
    witnessesCount: (agreement.witnesses || []).filter((w) => w.name && w.name.trim()).length,
  };

  const response = await withAiRetry(() =>
    ai.models.generateContent({
      model: activeModel,
      contents: `নিম্নলিখিত চুক্তিপত্রের খসড়াটি পর্যালোচনা করে সম্ভাব্য অস্পষ্টতা, পরস্পরবিরোধী ধারা, কাজের বিবরণের ঘাটতি বা ঝুঁকি চিহ্নিত করো:\n${JSON.stringify(snapshot, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryBn: { type: Type.STRING },
            additionalFindings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING },
                  area: { type: Type.STRING },
                  titleBn: { type: Type.STRING },
                  detailBn: { type: Type.STRING },
                  suggestionBn: { type: Type.STRING },
                },
                required: ['severity', 'area', 'titleBn', 'detailBn', 'suggestionBn'],
              },
            },
          },
          required: ['summaryBn', 'additionalFindings'],
        },
      },
    })
  );

  const parsed = safeParseJson<any>(
    response.text,
    'AI চুক্তি পর্যালোচনা সম্পন্ন করতে পারেনি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
  );

  const validAreas = new Set([
    'PARTY_IDENTITY',
    'REPRESENTATIVE_AUTHORITY',
    'WORK_SCOPE',
    'ARITHMETIC_CONSISTENCY',
    'DATE_TIMELINE',
    'CLAUSE_CLARITY',
    'WAQF_LAND_LEGAL',
    'MISSING_INFO',
  ]);
  const validSeverities = new Set<AgreementRiskSeverity>(['HIGH', 'MEDIUM', 'LOW']);

  const aiFindings: AgreementReviewFinding[] = Array.isArray(parsed.additionalFindings)
    ? parsed.additionalFindings.slice(0, 10).map((f: any) => ({
        id: `ai-${crypto.randomUUID().slice(0, 6)}`,
        severity: validSeverities.has(f?.severity) ? (f.severity as AgreementRiskSeverity) : 'MEDIUM',
        area: validAreas.has(f?.area) ? f.area : 'CLAUSE_CLARITY',
        titleBn: String(f?.titleBn || 'পর্যালোচনা পরামর্শ').slice(0, 180),
        detailBn: String(f?.detailBn || '').slice(0, 600),
        suggestionBn: String(f?.suggestionBn || '').slice(0, 600),
      }))
    : [];

  const allFindings = [...deterministicFindings, ...aiFindings];
  const hasHigh = allFindings.some((f) => f.severity === 'HIGH') || isWaqfOrLand;
  const hasMedium = allFindings.some((f) => f.severity === 'MEDIUM');
  const overallRiskLevel: AgreementRiskSeverity = hasHigh ? 'HIGH' : hasMedium ? 'MEDIUM' : 'LOW';

  return {
    overallRiskLevel,
    legalReviewRequired: isWaqfOrLand || hasHigh,
    summaryBn: String(
      parsed.summaryBn ||
        (hasHigh
          ? 'চুক্তিপত্রটি চূড়ান্ত বা স্বাক্ষর করার পূর্বে উচ্চ-ঝুঁকিপূর্ণ বিষয়গুলো যাচাই ও সংশোধন করা জরুরি।'
          : 'চুক্তিপত্রের প্রাথমিক পর্যালোচনা সম্পন্ন হয়েছে; অনুগ্রহ করে পরামর্শগুলো যাচাই করে নিন।')
    ).slice(0, 1000),
    mathConsistencyCheck: mathCheck,
    findings: allFindings,
    missingPlaceholders,
    disclaimerBn:
      'সতর্কতা: এই AI পর্যালোচনা শুধুমাত্র সহায়ক খসড়া যাচাইয়ের জন্য। AI কখনো চুক্তি অনুমোদন/স্বাক্ষর করে না এবং জমি বা ওয়াকফ সম্পত্তির মালিকানা কিংবা চুক্তির আইনগত বৈধতা নিশ্চিত করে না। চূড়ান্ত সিদ্ধান্তের পূর্বে পরিচালনা কমিটি ও প্রয়োজনীয় ক্ষেত্রে আইন উপদেষ্টার পরামর্শ নিন।',
    modelUsed: activeModel,
    generatedAt: new Date().toISOString(),
  };
}

// ==========================================
// 4. ZERO-STORAGE CAMERA / DOCUMENT OCR EXTRACTION
// ==========================================
const ALLOWED_OCR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const DOC_TYPE_HINTS_BN: Record<AgreementOcrDocType, string> = {
  NID: 'বাংলাদেশ জাতীয় পরিচয়পত্র (NID) — নাম, পিতার/স্বামীর নাম, NID নম্বর, ঠিকানা ও জন্মতারিখ শনাক্ত করো।',
  PASSPORT: 'পাসপোর্ট — পূর্ণ নাম, পাসপোর্ট নম্বর, পিতার নাম ও ঠিকানা শনাক্ত করো।',
  TRADE_LICENSE: 'ট্রেড লাইসেন্স — প্রতিষ্ঠানের নাম, প্রোপ্রাইটরের নাম, লাইসেন্স/রেজিস্ট্রেশন নম্বর, ঠিকানা ও মোবাইল শনাক্ত করো।',
  LAND_DEED_KHATIAN: 'জমির দলিল / খতিয়ান / পর্চা / ম্যাপ — মৌজা, জে.এল. নম্বর, খতিয়ান নম্বর, দাগ নম্বর, জমির পরিমাণ ও একক এবং অংশের বিবরণ শনাক্ত করো।',
  PREVIOUS_AGREEMENT: 'পূর্বের চুক্তিপত্র — শিরোনাম, উদ্দেশ্য, পক্ষসমূহ এবং মূল শর্তাবলি টেক্সট আকারে শনাক্ত করো।',
  COMMITTEE_RESOLUTION: 'মসজিদ পরিচালনা কমিটির রেজুলেশন / অনুমোদনপত্র — রেজুলেশন নম্বর, তারিখ, অনুমোদিত প্রতিনিধি ও ক্ষমতার ভিত্তি শনাক্ত করো।',
  OTHER: 'সাধারণ দাপ্তরিক কাগজপত্র — প্রাসঙ্গিক ব্যক্তি/প্রতিষ্ঠান, ঠিকানা, রেফারেন্স নম্বর ও মূল বিবরণ শনাক্ত করো।',
};

export async function extractAgreementDocumentOcrWithAi(input: {
  docType: AgreementOcrDocType;
  mimeType: string;
  imageBase64: string;
  userHint?: string;
}): Promise<AgreementOcrExtractResult> {
  const mimeType = String(input.mimeType || '').toLowerCase().trim();
  if (!ALLOWED_OCR_MIME_TYPES.has(mimeType)) {
    throw new GeminiServiceError(
      'সমর্থিত ফাইল ফরম্যাট নয়। অনুগ্রহ করে JPG, PNG, WebP ছবি অথবা PDF ব্যবহার করুন।',
      400,
      'INVALID_MIME_TYPE'
    );
  }

  const rawB64 = String(input.imageBase64 || '').replace(/^data:[^;]+;base64,/i, '').trim();
  if (!rawB64 || rawB64.length < 40) {
    throw new GeminiServiceError('স্ক্যান করার জন্য বৈধ ছবি বা ডকুমেন্ট পাওয়া যায়নি।', 400, 'EMPTY_IMAGE');
  }
  // Max ~7.5 MB base64 payload (~5.5 MB binary) to prevent memory/storage bloat
  if (rawB64.length > 10_000_000) {
    throw new GeminiServiceError(
      'ছবি বা ফাইলের আকার অনেক বড়। অনুগ্রহ করে ছোট বা কমপ্রেসড ছবি ব্যবহার করুন (সর্বোচ্চ ৫ মেগাবাইট)।',
      413,
      'PAYLOAD_TOO_LARGE'
    );
  }

  const ai = getCentralGeminiClient();
  const activeModel = getActiveGeminiModel();
  const docHint = DOC_TYPE_HINTS_BN[input.docType] || DOC_TYPE_HINTS_BN.OTHER;

  const systemInstruction = `তুমি বাংলাদেশের দাপ্তরিক ও ভূমি-সংক্রান্ত কাগজপত্র (NID, পাসপোর্ট, ট্রেড লাইসেন্স, খতিয়ান/পর্চা/দলিল, কমিটির রেজুলেশন, পূর্বের চুক্তি) পড়ার একজন নির্ভুল বাংলা-ইংরেজি OCR সহকারী।
কঠোর নিয়মাবলি:
১. ছবিতে যা স্পষ্টভাবে লেখা আছে কেবল সেটিই উদ্ধার করো। অস্পষ্ট বা অনুপস্থিত কোনো তথ্য কখনো নিজে থেকে অনুমান করে বানাবে না—খালি রাখবে এবং uncertainFields তালিকায় উল্লেখ করবে।
২. কখনোই দাবি করবে না যে সরকারি দলিল বা পরিচয়পত্রটি আসল বা যাচাইকৃত।
৩. কেবল বৈধ JSON রিটার্ন করবে।`;

  const textPart = {
    text: `নথির ধরন: ${input.docType} (${docHint})
${input.userHint ? `ব্যবহারকারীর নোট: ${String(input.userHint).slice(0, 300)}` : ''}

ছবিটি পড়ে প্রাসঙ্গিক তথ্যগুলো কাঠামোবদ্ধ JSON আকারে দাও। যেগুলো স্পষ্ট পড়া যাচ্ছে না তা খালি রেখে uncertainFields-এ লেখো।`,
  };

  const filePart = {
    inlineData: {
      mimeType,
      data: rawB64,
    },
  };

  const response = await withAiRetry(() =>
    ai.models.generateContent({
      model: activeModel,
      contents: { parts: [filePart, textPart] },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedTextRaw: { type: Type.STRING },
            partyCandidate: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                fatherOrOrgHead: { type: Type.STRING },
                nidOrRegNo: { type: Type.STRING },
                address: { type: Type.STRING },
                phone: { type: Type.STRING },
                designation: { type: Type.STRING },
                authorityBasis: { type: Type.STRING },
              },
            },
            landWaqfCandidate: {
              type: Type.OBJECT,
              properties: {
                mouza: { type: Type.STRING },
                jlNumber: { type: Type.STRING },
                khatianNumber: { type: Type.STRING },
                dagNumber: { type: Type.STRING },
                landArea: { type: Type.STRING },
                landAreaUnit: { type: Type.STRING },
                proposedPortionDesc: { type: Type.STRING },
              },
            },
            resolutionCandidate: {
              type: Type.OBJECT,
              properties: {
                resolutionNo: { type: Type.STRING },
                resolutionDate: { type: Type.STRING },
                authoritySummary: { type: Type.STRING },
              },
            },
            clausesCandidate: {
              type: Type.OBJECT,
              properties: {
                suggestedTitle: { type: Type.STRING },
                suggestedPurpose: { type: Type.STRING },
                extractedClauses: { type: Type.STRING },
              },
            },
            uncertainFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['extractedTextRaw', 'uncertainFields'],
        },
      },
    })
  );

  const parsed = safeParseJson<any>(
    response.text,
    'ছবি থেকে তথ্য শনাক্ত করা যায়নি। অনুগ্রহ করে আরও স্পষ্ট ছবি তুলে পুনরায় চেষ্টা করুন।'
  );

  const cleanObj = <T extends Record<string, any>>(obj: any, maxLen = 400): T | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string' && v.trim()) {
        out[k] = v.trim().slice(0, k === 'extractedClauses' ? 12000 : maxLen);
      }
    }
    return Object.keys(out).length > 0 ? (out as T) : undefined;
  };

  return {
    docType: input.docType,
    verificationStatus: 'UNVERIFIED_DRAFT',
    extractedTextRaw: String(parsed.extractedTextRaw || '').slice(0, 15000),
    partyCandidate: cleanObj(parsed.partyCandidate),
    landWaqfCandidate: cleanObj(parsed.landWaqfCandidate),
    resolutionCandidate: cleanObj(parsed.resolutionCandidate),
    clausesCandidate: cleanObj(parsed.clausesCandidate),
    uncertainFields: Array.isArray(parsed.uncertainFields)
      ? parsed.uncertainFields.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 15)
      : [],
    unverifiedWarningBn:
      'অযাচাইকৃত OCR ফলাফল: মূল কাগজ/দলিলের সাথে প্রতিটি অক্ষর ও সংখ্যা মিলিয়ে সংশোধন না করা পর্যন্ত এই তথ্য যাচাইকৃত নয়। এই স্ক্যান সরকারি দলিল বা পরিচয়পত্রের সত্যতা নিশ্চিত করে না এবং স্ক্যানকৃত ছবি সার্ভারে সংরক্ষণ করা হয়নি।',
    modelUsed: activeModel,
    generatedAt: new Date().toISOString(),
  };
}

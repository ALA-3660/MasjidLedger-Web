/**
 * Comprehensive Bangladesh Administrative Data & Geocoding Helper
 * Supports 4-level cascading: Division -> District -> Upazila/Thana -> Union
 * OpenStreetMap Reverse Geocoding with user-confirmation safeguard
 */

import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_GEO,
  LocationDivision,
  LocationDistrict,
  getDivisions,
  getDistrictsByDivision,
  findDistrict,
  getUpazilasByDistrict,
} from './bangladeshLocations';

export {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_GEO,
  getDivisions,
  getDistrictsByDivision,
  findDistrict,
  getUpazilasByDistrict,
};
export type { LocationDivision, LocationDistrict };

// Known Prominent Unions for Bangladesh Upazilas
export const KNOWN_UPAZILA_UNIONS: Record<string, string[]> = {
  // Cox's Bazar District
  'কক্সবাজার সদর': [
    'খুরুশকুল',
    'ঝিলংজা',
    'পিএমখালী',
    'ভারুয়াখালী',
    'চৌফলদণ্ডী',
    'পাটলি',
    'ইসলামপুর',
    'কক্সবাজার পৌরসভা',
  ],
  'রামু': [
    'ফতেখাঁরকুল',
    'জোয়ারিয়ানালা',
    'কাউয়ারখোপ',
    'গর্জনিয়া',
    'কচ্ছপিয়া',
    'রশিদনগর',
    'ঈদগড়',
    'খুনিয়াপালং',
    'দক্ষিণ মিঠাছড়ি',
    'চাকমারকুল',
    'রাজারকুল',
  ],
  'চকরিয়া': [
    'বরইতলী',
    'হারবাং',
    'কাকারা',
    'ফাঁসিয়াখালী',
    'চিরিঙ্গা',
    'বমুবিলছড়ি',
    'সুরাজপুর-মানিকপুর',
    'ডুলাহাজারা',
    'খুটাখালী',
    'চকরিয়া পৌরসভা',
  ],
  'মহেশখালী': [
    'হোয়ানক',
    'বড় মহেশখালী',
    'ছোট মহেশখালী',
    'শাপলাপুর',
    'কালারমারছড়া',
    'মাতারবাড়ি',
    'ধলঘাটা',
    'কুতুবজোম',
    'মহেশখালী পৌরসভা',
  ],
  'উখিয়া': [
    'রাজাপালং',
    'জালিয়াপালং',
    'হলদিয়াপালং',
    'রত্নাপালং',
    'পালংখালী',
  ],
  'টেকনাফ': [
    'টেকনাফ সদর',
    'হুইক্যাং',
    'বাহারছড়া',
    'সাবরাং',
    'সেন্টমার্টিন',
    'টেকনাফ পৌরসভা',
  ],
  // Dhaka Metros
  'মিরপুর': ['মিরপুর-১', 'মিরপুর-২', 'মিরপুর-১০', 'মিরপুর-১১', 'মিরপুর-১২', 'মিরপুর-১৪', 'কাফরুল', 'পল্লবী'],
  'ধানমন্ডি': ['ধানমন্ডি আ/এ', 'শংকর', 'রায়েরবাজার', 'ঝিগাতলা', 'সোবহানবাগ'],
  'গুলশান': ['গুলশান-১', 'গুলশান-২', 'বনানী', 'মহাখালী', 'নিকেতন', 'কড়াইল'],
  'উত্তরা': ['উত্তরা সেক্টর ১-১৮', 'তুরাগ', 'বিমানবন্দর এলাকা', 'আজমপুর', 'আব্দুল্লাহপুর'],
  'মোহাম্মদপুর': ['মোহাম্মদপুর', 'আদাবর', 'শ্যামলী', 'বসিলা', 'নবোদয়'],
  'সাভার': ['সাভার সদর', 'বিরুলিয়া', 'আমিনবাজার', 'তেঁতুলঝোড়া', 'ভাকুর্তা', 'বনগাঁও', 'ইয়ারপুর', 'আশুলিয়া', 'সাভার পৌরসভা'],
  'কেরানীগঞ্জ': ['জিনজিরা', 'রোহিতপুর', 'বাস্তা', 'কালিন্দী', 'শুভাঢ্যা', 'তারানগর', 'হজরতপুর', 'শাক্তা'],
  // Gazipur
  'গাজীপুর সদর': ['মির্জাপুর', 'ভাওয়াল গড়', 'পিরুজালী', 'কাউলতিয়া', 'বাড়িয়া', 'গাজীপুর সিটি কর্পোরেশন'],
  'কালিয়াকৈর': ['ফুলবাড়িয়া', 'চাপাইর', 'বোয়ালী', 'সূত্রাপুর', 'ঢালজোড়া', 'আটাবহ', 'কালিয়াকৈর পৌরসভা'],
};

/**
 * Returns unions for a given Upazila.
 * Falls back to structured standard ward/union designations if upazila is not in pre-mapped dictionary.
 */
export function getUnionsByUpazila(upazilaName?: string, districtName?: string): string[] {
  if (!upazilaName) return [];
  const cleanUpazila = upazilaName.trim();
  
  if (KNOWN_UPAZILA_UNIONS[cleanUpazila]) {
    return KNOWN_UPAZILA_UNIONS[cleanUpazila];
  }

  // Check if any key contains the upazila name
  for (const [key, unions] of Object.entries(KNOWN_UPAZILA_UNIONS)) {
    if (key.includes(cleanUpazila) || cleanUpazila.includes(key)) {
      return unions;
    }
  }

  // Generic sensible defaults for Bangladeshi Upazilas
  return [
    'পৌরসভা / প্রধান এলাকা',
    '১ নং ইউনিয়ন',
    '২ নং ইউনিয়ন',
    '৩ নং ইউনিয়ন',
    '৪ নং ইউনিয়ন',
    '৫ নং ইউনিয়ন',
    '৬ নং ইউনিয়ন',
    '৭ নং ইউনিয়ন',
    '৮ নং ইউনিয়ন',
    '৯ নং ইউনিয়ন',
  ];
}

/**
 * Reverse Geocoding via OpenStreetMap Nominatim with strict timeout
 * Safeguard: Never automatically overwrites authoritative data without user consent.
 */
export interface ReverseGeocodeResult {
  success: boolean;
  rawAddress?: string;
  road?: string;
  village?: string;
  union?: string;
  upazila?: string;
  district?: string;
  division?: string;
  country?: string;
  formattedSuggestion: string;
  error?: string;
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=bn,en`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MasjidLedger-Pro-v2.6/GeolocationAssistant',
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        formattedSuggestion: `অক্ষাংশ: ${lat.toFixed(6)}, দ্রাঘিমাংশ: ${lng.toFixed(6)}`,
        error: 'রিভার্স জিওকোডিং সেবা বর্তমানে অনুত্তরিত।',
      };
    }

    const data = await response.json();
    const addr = data.address || {};

    const road = addr.road || addr.street || '';
    const village =
      addr.village ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.hamlet ||
      addr.residential ||
      '';
    const upazila =
      addr.subdistrict ||
      addr.county ||
      addr.city_district ||
      addr.borough ||
      '';
    const district =
      addr.state_district ||
      addr.district ||
      addr.city ||
      '';
    const division = addr.state || '';
    const country = addr.country || 'বাংলাদেশ';

    // Build friendly Bengali address suggestion
    const parts: string[] = [];
    if (road) parts.push(road);
    if (village) parts.push(village);
    if (upazila) parts.push(upazila);
    if (district) parts.push(district);
    if (division && division !== district) parts.push(division);

    const formattedSuggestion =
      parts.join(', ') || data.display_name || `অক্ষাংশ: ${lat.toFixed(6)}, দ্রাঘিমাংশ: ${lng.toFixed(6)}`;

    return {
      success: true,
      rawAddress: data.display_name,
      road,
      village,
      upazila,
      district,
      division,
      country,
      formattedSuggestion,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      formattedSuggestion: `অক্ষাংশ: ${lat.toFixed(6)}, দ্রাঘিমাংশ: ${lng.toFixed(6)}`,
      error:
        err.name === 'AbortError'
          ? 'রিভার্স জিওকোডিংয়ের সময় অতিবাহিত হয়েছে।'
          : 'ঠিকানা সনাক্ত করতে ব্যর্থ হয়েছে।',
    };
  }
}

/**
 * Builds readable Full Address Preview
 */
export function formatFullBanglaAddress(params: {
  holding?: string;
  road?: string;
  village?: string;
  ward?: string;
  union?: string;
  upazila?: string;
  district?: string;
  division?: string;
  postalCode?: string;
}): string {
  const parts: string[] = [];

  if (params.holding) parts.push(`হোল্ডিং: ${params.holding}`);
  if (params.road) parts.push(params.road);
  if (params.village) parts.push(`গ্রাম/মহল্লা: ${params.village}`);
  if (params.ward) parts.push(`ওয়ার্ড: ${params.ward}`);
  if (params.union) parts.push(`ইউনিয়ন: ${params.union}`);
  if (params.upazila) parts.push(`উপজেলা/থানা: ${params.upazila}`);
  if (params.district) parts.push(`জেলা: ${params.district}`);
  if (params.division && params.division !== params.district) parts.push(`বিভাগ: ${params.division}`);

  return parts.join(', ');
}

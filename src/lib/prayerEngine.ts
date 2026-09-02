/**
 * MasjidLedger Islamic Prayer & Hanafi Waqt Engine (Bangladesh Standard Time - BST / UTC+06:00)
 * 
 * Features:
 * - Deterministic, timezone-aware astronomical calculations for 64 Bangladesh districts & custom GPS coordinates
 * - 24-hour internal time representation (HH:mm) with 12-hour/Bangla display formatters
 * - 5 Daily Prayers (Fajr, Dhuhr, Asr [Hanafi 2x / Standard], Maghrib, Isha) with Waqt Start, Adhan, Jamaat, Waqt End
 * - Dynamic 4-State Waqt Status Engine & Countdowns:
 *     A. Before Waqt Starts ("যোহর শুরু হতে বাকি: ১ ঘণ্টা ১০ মিনিট")
 *     B. Waqt Active Elapsed ("যোহর ওয়াক্ত শুরু হয়েছে: ৩০ মিনিট আগে")
 *     C. Waqt Active Remaining ("যোহর ওয়াক্ত শেষ হতে: ৫০ মিনিট বাকি")
 *     D. Waqt Ended ("যোহর ওয়াক্ত শেষ হয়েছে")
 * - Adhan Countdown ("আজান হতে: ৫ মিনিট বাকি") & Jamaat Countdown ("জামাত হতে: ২৫ মিনিট বাকি")
 * - Jamaat Passed Status ("জামাত শুরু হয়েছে / সময় পার হয়েছে")
 * - End of Waqt Warning ("⚠️ যোহর ওয়াক্ত শেষ হতে ১০ মিনিট বাকি")
 * - Special Prayers & Solar Marks:
 *     - Tahajjud: Midnight/last third of night until Fajr with live active status & countdown
 *     - Sunrise & Sunset (astronomical)
 *     - Local Solar Noon / Zawal (calculated dynamically from longitude & EoT, not hardcoded)
 *     - Ishraq: Starts at Sunrise + 10 mins (configurable) with 3-state dynamic status
 *     - Forbidden/Makruh Prayer Windows (Sunrise, Solar Noon, Sunset) tracked independently
 *     - Jumu'ah Friday schedule (Adhan, Khutbah, Jamaat)
 * - Midnight & Date Boundary resolution
 * - ZERO hardcoded fallbacks like "12:15"
 */

import { MosquePrayerSettings, DailyPrayerSchedule, DailyPrayerItem, MonthlyPrayerDay } from '../types';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type SpecialPrayerKey = 'tahajjud' | 'sunrise' | 'ishraq' | 'solarNoon' | 'sunset' | 'jumuah';

export interface PrayerTimeItem {
  nameBn: string;
  nameEn: string;
  key: PrayerKey;
  waqtStart: string; // 24-hr "HH:mm"
  adhan: string; // 24-hr "HH:mm"
  jamaat: string; // 24-hr "HH:mm"
  waqtEnd: string; // 24-hr "HH:mm"
  status: 'ENDED' | 'ONGOING' | 'NEXT' | 'UPCOMING';
  statusBn: 'শেষ' | 'চলছে' | 'পরবর্তী' | 'অপেক্ষমাণ';
  countdownTextBn: string;
  waqtStartMin: number;
  adhanMin: number;
  jamaatMin: number;
  waqtEndMin: number;
  isCustomJamaat?: boolean;
}

export interface SpecialPrayerItem {
  key: SpecialPrayerKey;
  nameBn: string;
  nameEn: string;
  timeStr: string; // 24-hr "HH:mm"
  endTimeStr?: string; // 24-hr "HH:mm"
  statusBn: string;
  isActive: boolean;
  timeMin: number;
  endTimeMin?: number;
}

export interface ForbiddenPeriod {
  key: 'SUNRISE' | 'SOLAR_NOON' | 'SUNSET';
  nameBn: string;
  reasonBn: string;
  startMin: number;
  endMin: number;
  startTimeStr: string;
  endTimeStr: string;
  isActive: boolean;
  remainingSeconds: number;
  statusBn: string;
}

export interface WaqtStatus {
  // Current Time Information (BST / UTC+6)
  currentTime24: string;
  currentTime12: string;
  currentTimeBn: string;
  currentSeconds: number;
  dateStr: string;
  dateBn: string;
  hijriDateBn: string;
  bengaliDateBn: string;
  isFriday: boolean;

  // Active / Current Waqt
  currentWaqtKey: PrayerKey | 'none';
  currentWaqtBn: string;
  currentWaqtEn: string;
  isWaqtActive: boolean;
  waqtElapsedSeconds: number;
  waqtRemainingSeconds: number;
  waqtElapsedStrBn: string;
  waqtRemainingStrBn: string;

  // Adhan & Jamaat Status for Current/Upcoming
  currentAdhanTimeStr: string;
  currentJamaatTimeStr: string;
  adhanRemainingSeconds: number;
  jamaatRemainingSeconds: number;
  adhanCountdownStrBn: string;
  jamaatCountdownStrBn: string;
  isJamaatPassed: boolean;
  isJamaatApproaching: boolean; // within 10 minutes
  isJamaatNow: boolean; // within 0-3 minutes
  isEndingSoon: boolean; // within warning threshold (e.g. 10 mins)
  endingSoonWarningBn?: string;

  // Next Prayer
  nextWaqtKey: PrayerKey;
  nextWaqtBn: string;
  nextWaqtEn: string;
  nextWaqtStartsInSeconds: number;
  nextWaqtStartsInStrBn: string;
  nextAdhanTimeStr: string;
  nextJamaatTimeStr: string;

  // Primary 5-State / Contextual Dynamic Banner Message
  dynamicStatusMessageBn: string;
  dynamicSubMessageBn?: string;

  // Special Times & Solar Marks
  sunriseTimeStr: string;
  sunsetTimeStr: string;
  solarNoonTimeStr: string;
  ishraqTimeStr: string;
  ishraqEndTimeStr: string;
  ishraqStatusBn: string;
  isIshraqActive: boolean;
  tahajjudStartTimeStr: string;
  tahajjudEndTimeStr: string;
  tahajjudStatusBn: string;
  isTahajjudActive: boolean;
  jumuahTimeStr: string;
  jumuahKhutbahTimeStr: string;
  jumuahJamaatTimeStr: string;
  sehriEndTimeStr: string;
  iftarTimeStr: string;

  // Forbidden Times
  isForbiddenNow: boolean;
  forbiddenReasonBn?: string;
  forbiddenPeriods: ForbiddenPeriod[];

  // Compatibility aliases
  isMakruh?: boolean;
  makruhReasonBn?: string;
  currentPrayerBn?: string;
  currentPrayerEn?: string;
  nextPrayerBn?: string;
  nextPrayerEn?: string;
  nextPrayerTime?: string;
  nextWaqtTime?: string;
  isJamaatApproachingWarning?: string;

  // 5 Daily Prayers Table List
  prayerList: PrayerTimeItem[];
  specialList: SpecialPrayerItem[];
}

/**
 * Bangla Digits Helper
 */
export const toBanglaDigits = (str: string | number): string => {
  const map: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  };
  return String(str).replace(/[0-9]/g, ch => map[ch] || ch);
};

export const toEnglishDigits = (str: string): string => {
  const map: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return String(str).replace(/[০-৯]/g, ch => map[ch] || ch);
};

/**
 * Parses time string like "13:10", "04:30", "01:10 PM", "১৩:১০", "০১:৩০" into minutes from midnight (0..1439).
 * Returns -1 if invalid or empty/Auto.
 */
export const parseTimeToMinutes = (timeStr?: string, isPMHint?: boolean): number => {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const clean = toEnglishDigits(timeStr).trim();
  if (clean === '' || clean.toLowerCase().includes('auto') || clean.includes('নির্ধারণ')) return -1;

  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
  if (!match) return -1;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3] ? match[3].toUpperCase() : null;

  if (meridian === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridian === 'AM' && hours === 12) {
    hours = 0;
  } else if (isPMHint && hours < 12 && !meridian) {
    hours += 12;
  }

  return (hours % 24) * 60 + (minutes % 60);
};

/**
 * Formats total minutes from midnight into 24-hour string "HH:mm" (e.g. 790 -> "13:10", 15 -> "00:15")
 */
export const formatMinutesTo24h = (totalMinutes: number): string => {
  if (totalMinutes < 0) return '--:--';
  const mins = ((Math.floor(totalMinutes) % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Formats total minutes from midnight into 12-hour string "h:mm A" (e.g. 790 -> "1:10 PM", 15 -> "12:15 AM")
 */
export const formatMinutesTo12h = (totalMinutes: number): string => {
  if (totalMinutes < 0) return '--:--';
  const mins = ((Math.floor(totalMinutes) % (24 * 60)) + (24 * 60)) % (24 * 60);
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
};

/**
 * Formats minutes from midnight to Bangla "১৩:১০" or "০১:১০"
 */
export const formatMinutesToBanglaTime = (totalMinutes: number, format12h: boolean = false): string => {
  if (totalMinutes < 0) return 'সময় অনির্ধারিত';
  const timeStr = format12h ? formatMinutesTo12h(totalMinutes) : formatMinutesTo24h(totalMinutes);
  return toBanglaDigits(timeStr);
};

/**
 * Centralized Duration Formatter
 * Converts seconds into humanized Bangla string: e.g.
 * - 4200 -> "১ ঘণ্টা ১০ মিনিট"
 * - 3000 -> "৫০ মিনিট"
 * - 45 -> "৪৫ সেকেন্ড"
 * If showSeconds=true -> "১ ঘণ্টা ১০ মিনিট ৩৫ সেকেন্ড"
 */
export const formatDurationToBangla = (totalSeconds: number, showSeconds: boolean = false): string => {
  if (totalSeconds <= 0) return '০ মিনিট';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${toBanglaDigits(hours)} ঘণ্টা`);
  }
  if (minutes > 0 || (hours === 0 && !showSeconds)) {
    parts.push(`${toBanglaDigits(minutes)} মিনিট`);
  }
  if (showSeconds && (seconds > 0 || (hours === 0 && minutes === 0))) {
    parts.push(`${toBanglaDigits(seconds)} সেকেন্ড`);
  }

  return parts.length > 0 ? parts.join(' ') : '০ মিনিট';
};

/**
 * Formats duration into digital clock format "HH:mm:ss" or "mm:ss"
 */
export const formatDurationDigital = (totalSeconds: number, banglaDigits: boolean = false): string => {
  if (totalSeconds <= 0) return banglaDigits ? '০০:০০' : '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const str = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return banglaDigits ? toBanglaDigits(str) : str;
};

/**
 * 64 Districts of Bangladesh with Accurate Coordinates & Longitude Offsets
 */
export interface DistrictGeo {
  id: string;
  nameBn: string;
  nameEn: string;
  lat: number;
  lng: number;
  offsetMins: number; // relative to Dhaka standard meridian 90.0° E
}

export const BANGLADESH_DISTRICTS: DistrictGeo[] = [
  // Dhaka Division
  { id: 'dhaka', nameBn: 'ঢাকা', nameEn: 'Dhaka', lat: 23.8103, lng: 90.4125, offsetMins: 0 },
  { id: 'gazipur', nameBn: 'গাজীপুর', nameEn: 'Gazipur', lat: 24.0023, lng: 90.4264, offsetMins: 0 },
  { id: 'narayanganj', nameBn: 'নারায়ণগঞ্জ', nameEn: 'Narayanganj', lat: 23.6238, lng: 90.5000, offsetMins: 0 },
  { id: 'tangail', nameBn: 'টাঙ্গাইল', nameEn: 'Tangail', lat: 24.2513, lng: 89.9167, offsetMins: 2 },
  { id: 'manikganj', nameBn: 'মানিকগঞ্জ', nameEn: 'Manikganj', lat: 23.8644, lng: 90.0047, offsetMins: 1 },
  { id: 'munshiganj', nameBn: 'মুন্সীগঞ্জ', nameEn: 'Munshiganj', lat: 23.5422, lng: 90.5305, offsetMins: 0 },
  { id: 'narsingdi', nameBn: 'নরসিংদী', nameEn: 'Narsingdi', lat: 23.9193, lng: 90.7202, offsetMins: -1 },
  { id: 'kishoreganj', nameBn: 'কিশোরগঞ্জ', nameEn: 'Kishoreganj', lat: 24.4449, lng: 90.7766, offsetMins: -1 },
  { id: 'faridpur', nameBn: 'ফরিদপুর', nameEn: 'Faridpur', lat: 23.6071, lng: 89.8429, offsetMins: 2 },
  { id: 'gopalganj', nameBn: 'গোপালগঞ্জ', nameEn: 'Gopalganj', lat: 23.0051, lng: 89.8266, offsetMins: 2 },
  { id: 'madaripur', nameBn: 'মাদারীপুর', nameEn: 'Madaripur', lat: 23.1641, lng: 90.1897, offsetMins: 1 },
  { id: 'rajbari', nameBn: 'রাজবাড়ী', nameEn: 'Rajbari', lat: 23.7574, lng: 89.6445, offsetMins: 3 },
  { id: 'shariatpur', nameBn: 'শরীয়তপুর', nameEn: 'Shariatpur', lat: 23.2423, lng: 90.4348, offsetMins: 0 },

  // Chattogram Division
  { id: 'chattogram', nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram', lat: 22.3569, lng: 91.7832, offsetMins: -5 },
  { id: 'coxsbazar', nameBn: 'কক্সবাজার', nameEn: 'Cox\'s Bazar', lat: 21.4272, lng: 92.0058, offsetMins: -6 },
  { id: 'cumilla', nameBn: 'কুমিল্লা', nameEn: 'Cumilla', lat: 23.4607, lng: 91.1809, offsetMins: -3 },
  { id: 'feni', nameBn: 'ফেনী', nameEn: 'Feni', lat: 23.0159, lng: 91.3976, offsetMins: -4 },
  { id: 'brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া', nameEn: 'Brahmanbaria', lat: 23.9571, lng: 91.1119, offsetMins: -3 },
  { id: 'rangamati', nameBn: 'রাঙ্গামাটি', nameEn: 'Rangamati', lat: 22.7324, lng: 92.2985, offsetMins: -7 },
  { id: 'noakhali', nameBn: 'নোয়াখালী', nameEn: 'Noakhali', lat: 22.8696, lng: 91.0998, offsetMins: -3 },
  { id: 'chandpur', nameBn: 'চাঁদপুর', nameEn: 'Chandpur', lat: 23.2333, lng: 90.6667, offsetMins: -1 },
  { id: 'lakshmipur', nameBn: 'লক্ষ্মীপুর', nameEn: 'Lakshmipur', lat: 22.9425, lng: 90.8412, offsetMins: -2 },
  { id: 'khagrachhari', nameBn: 'খাগড়াছড়ি', nameEn: 'Khagrachhari', lat: 23.1193, lng: 91.9847, offsetMins: -6 },
  { id: 'bandarban', nameBn: 'বান্দরবান', nameEn: 'Bandarban', lat: 22.1953, lng: 92.2184, offsetMins: -7 },

  // Sylhet Division
  { id: 'sylhet', nameBn: 'সিলেট', nameEn: 'Sylhet', lat: 24.8949, lng: 91.8687, offsetMins: -6 },
  { id: 'moulvibazar', nameBn: 'মৌলভীবাজার', nameEn: 'Moulvibazar', lat: 24.4829, lng: 91.7774, offsetMins: -5 },
  { id: 'habiganj', nameBn: 'হবিগঞ্জ', nameEn: 'Habiganj', lat: 24.3749, lng: 91.4155, offsetMins: -4 },
  { id: 'sunamganj', nameBn: 'সুনামগঞ্জ', nameEn: 'Sunamganj', lat: 25.0658, lng: 91.3950, offsetMins: -4 },

  // Rajshahi Division
  { id: 'rajshahi', nameBn: 'রাজশাহী', nameEn: 'Rajshahi', lat: 24.3636, lng: 88.6241, offsetMins: 7 },
  { id: 'bogra', nameBn: 'বগুড়া', nameEn: 'Bogura', lat: 24.8465, lng: 89.3777, offsetMins: 4 },
  { id: 'pabna', nameBn: 'পাবনা', nameEn: 'Pabna', lat: 24.0064, lng: 89.2372, offsetMins: 5 },
  { id: 'sirajganj', nameBn: 'সিরাজগঞ্জ', nameEn: 'Sirajganj', lat: 24.4534, lng: 89.7008, offsetMins: 3 },
  { id: 'naogaon', nameBn: 'নওগাঁ', nameEn: 'Naogaon', lat: 24.7937, lng: 88.9318, offsetMins: 6 },
  { id: 'natore', nameBn: 'নাটোর', nameEn: 'Natore', lat: 24.4206, lng: 88.9320, offsetMins: 6 },
  { id: 'chapainawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ', nameEn: 'Chapainawabganj', lat: 24.5965, lng: 88.2776, offsetMins: 8 },
  { id: 'joypurhat', nameBn: 'জয়পুরহাট', nameEn: 'Joypurhat', lat: 25.1015, lng: 89.0277, offsetMins: 5 },

  // Khulna Division
  { id: 'khulna', nameBn: 'খুলনা', nameEn: 'Khulna', lat: 22.8456, lng: 89.5403, offsetMins: 4 },
  { id: 'jessore', nameBn: 'যশোর', nameEn: 'Jashore', lat: 23.1664, lng: 89.2081, offsetMins: 5 },
  { id: 'satkhira', nameBn: 'সাতক্ষীরা', nameEn: 'Satkhira', lat: 22.7185, lng: 89.0705, offsetMins: 5 },
  { id: 'kushtia', nameBn: 'কুষ্টিয়া', nameEn: 'Kushtia', lat: 23.9013, lng: 89.1205, offsetMins: 5 },
  { id: 'jhenaidah', nameBn: 'ঝিনাইদহ', nameEn: 'Jhenaidah', lat: 23.5450, lng: 89.1726, offsetMins: 5 },
  { id: 'chuadanga', nameBn: 'চুয়াডাঙ্গা', nameEn: 'Chuadanga', lat: 23.6402, lng: 88.8418, offsetMins: 6 },
  { id: 'meherpur', nameBn: 'মেহেরপুর', nameEn: 'Meherpur', lat: 23.7622, lng: 88.6318, offsetMins: 7 },
  { id: 'bagerhat', nameBn: 'বাগেরহাট', nameEn: 'Bagerhat', lat: 22.6516, lng: 89.7859, offsetMins: 3 },
  { id: 'narail', nameBn: 'নড়াইল', nameEn: 'Narail', lat: 23.1725, lng: 89.5127, offsetMins: 4 },
  { id: 'magura', nameBn: 'মাগুরা', nameEn: 'Magura', lat: 23.4873, lng: 89.4198, offsetMins: 4 },

  // Barishal Division
  { id: 'barishal', nameBn: 'বরিশাল', nameEn: 'Barishal', lat: 22.7010, lng: 90.3535, offsetMins: 0 },
  { id: 'bhola', nameBn: 'ভোলা', nameEn: 'Bhola', lat: 22.6859, lng: 90.6481, offsetMins: -1 },
  { id: 'patuakhali', nameBn: 'পটুয়াখালী', nameEn: 'Patuakhali', lat: 22.3596, lng: 90.3299, offsetMins: 0 },
  { id: 'pirojpur', nameBn: 'পিরোজপুর', nameEn: 'Pirojpur', lat: 22.5841, lng: 89.9720, offsetMins: 2 },
  { id: 'barguna', nameBn: 'বরগুনা', nameEn: 'Barguna', lat: 22.0953, lng: 90.1121, offsetMins: 1 },
  { id: 'jhalokati', nameBn: 'ঝালকাঠি', nameEn: 'Jhalokati', lat: 22.6406, lng: 90.1987, offsetMins: 1 },

  // Rangpur Division
  { id: 'rangpur', nameBn: 'রংপুর', nameEn: 'Rangpur', lat: 25.7439, lng: 89.2752, offsetMins: 4 },
  { id: 'dinajpur', nameBn: 'দিনাজপুর', nameEn: 'Dinajpur', lat: 25.6217, lng: 88.6355, offsetMins: 7 },
  { id: 'gaibandha', nameBn: 'গাইবান্ধা', nameEn: 'Gaibandha', lat: 25.3288, lng: 89.5406, offsetMins: 3 },
  { id: 'kurigram', nameBn: 'কুড়িগ্রাম', nameEn: 'Kurigram', lat: 25.8054, lng: 89.6362, offsetMins: 3 },
  { id: 'lalmonirhat', nameBn: 'লালমনিরহাট', nameEn: 'Lalmonirhat', lat: 25.9923, lng: 89.2847, offsetMins: 4 },
  { id: 'nilphamari', nameBn: 'নীলফামারী', nameEn: 'Nilphamari', lat: 25.9318, lng: 88.8560, offsetMins: 6 },
  { id: 'panchagarh', nameBn: 'পঞ্চগড়', nameEn: 'Panchagarh', lat: 26.3411, lng: 88.5542, offsetMins: 7 },
  { id: 'thakurgaon', nameBn: 'ঠাকুরগাঁও', nameEn: 'Thakurgaon', lat: 26.0337, lng: 88.4617, offsetMins: 8 },

  // Mymensingh Division
  { id: 'mymensingh', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', lat: 24.7471, lng: 90.4203, offsetMins: 0 },
  { id: 'jamalpur', nameBn: 'জামালপুর', nameEn: 'Jamalpur', lat: 24.9375, lng: 89.9378, offsetMins: 2 },
  { id: 'netrokona', nameBn: 'নেত্রকোণা', nameEn: 'Netrokona', lat: 24.8709, lng: 90.7279, offsetMins: -1 },
  { id: 'sherpur', nameBn: 'শেরপুর', nameEn: 'Sherpur', lat: 25.0205, lng: 90.0153, offsetMins: 2 },
];

export const getDistrictGeo = (districtNameOrId?: string): DistrictGeo => {
  if (!districtNameOrId) return BANGLADESH_DISTRICTS[0];
  const clean = districtNameOrId.trim().toLowerCase();
  const match = BANGLADESH_DISTRICTS.find(d => 
    d.id.toLowerCase() === clean ||
    d.nameEn.toLowerCase() === clean ||
    d.nameBn === districtNameOrId.trim() ||
    clean.includes(d.nameEn.toLowerCase()) ||
    districtNameOrId.includes(d.nameBn)
  );
  return match || BANGLADESH_DISTRICTS[0];
};

/**
 * Astronomical Solar Calculations for Hanafi Timings
 */
export interface HanafiDailyTimes {
  fajrMin: number;
  sunriseMin: number;
  ishraqMin: number;
  zawalStartMin: number;
  solarNoonMin: number;
  dhuhrMin: number;
  asrMin: number;
  sunsetMin: number;
  maghribMin: number;
  ishaMin: number;
  tahajjudStartMin: number;
  tahajjudEndMin: number;
  sehriEndMin: number;
  iftarMin: number;
  jumuahMin: number;
}

export interface CalculationOptions {
  districtName?: string;
  latitude?: number;
  longitude?: number;
  madhab?: 'HANAFI' | 'SHAFI_MALIKI_HANBALI';
  fajrAngle?: number;
  ishaAngle?: number;
  ishraqOffsetMins?: number; // default 10
  forbiddenSunriseMins?: number; // default 15
  forbiddenSolarNoonMins?: number; // default 10
  forbiddenSunsetMins?: number; // default 15
}

export const calculateHanafiDailyTimes = (
  date: Date = new Date(),
  options?: string | CalculationOptions
): HanafiDailyTimes => {
  const opts: CalculationOptions = typeof options === 'string' ? { districtName: options } : (options || {});
  const geo = (opts.latitude !== undefined && opts.longitude !== undefined)
    ? { id: 'custom', nameBn: 'কাস্টম', nameEn: 'Custom', lat: opts.latitude, lng: opts.longitude, offsetMins: 0 }
    : getDistrictGeo(opts.districtName);

  const fajrAngle = opts.fajrAngle || 18.0;
  const ishaAngle = opts.ishaAngle || 18.0;
  const ishraqOffset = opts.ishraqOffsetMins !== undefined ? opts.ishraqOffsetMins : 10;
  const asrShadowMultiplier = opts.madhab === 'SHAFI_MALIKI_HANBALI' ? 1.0 : 2.0;

  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Solar Declination Angle
  const declination = 23.45 * Math.sin((Math.PI / 180) * (360 / 365) * (dayOfYear - 81));
  const decRad = (declination * Math.PI) / 180;
  const latRad = (geo.lat * Math.PI) / 180;

  // Equation of Time (EoT) in minutes
  const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Exact Astronomical Solar Noon (Local Zawal Point in GMT+6)
  // Standard meridian for Bangladesh BST is 90.0° E
  const timeCorrection = (geo.lng - 90.0) * 4 + eot;
  const rawSolarNoonMin = 12 * 60 - timeCorrection;
  const solarNoonMin = Math.round(rawSolarNoonMin);

  // Hour Angle calculation: cos(omega) = (sin(alt) - sin(lat)*sin(dec)) / (cos(lat)*cos(dec))
  const getHourAngle = (altitudeDeg: number): number => {
    const altRad = (altitudeDeg * Math.PI) / 180;
    const cosOmega = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    if (cosOmega > 1) return 0;
    if (cosOmega < -1) return 180;
    return (Math.acos(cosOmega) * 180) / Math.PI;
  };

  // Sunrise/Sunset (Sun altitude ~ -0.833° accounting for atmospheric refraction & solar disk)
  const sunriseHourAngle = getHourAngle(-0.833);
  const halfDayMins = (sunriseHourAngle / 15) * 60;

  const sunriseMin = Math.round(rawSolarNoonMin - halfDayMins);
  const sunsetMin = Math.round(rawSolarNoonMin + halfDayMins);

  // Fajr: 18° astronomical twilight
  const fajrHourAngle = getHourAngle(-fajrAngle);
  const fajrMin = Math.round(rawSolarNoonMin - (fajrHourAngle / 15) * 60);

  // Isha: 18° twilight
  const ishaHourAngle = getHourAngle(-ishaAngle);
  const ishaMin = Math.round(rawSolarNoonMin + (ishaHourAngle / 15) * 60);

  // Asr: Shadow = multiplier * object height + noon shadow
  const noonShadow = Math.tan(Math.abs(latRad - decRad));
  const asrShadow = asrShadowMultiplier + noonShadow;
  const asrAltitudeRad = Math.atan(1.0 / asrShadow);
  const asrAltitudeDeg = (asrAltitudeRad * 180) / Math.PI;
  const asrHourAngle = getHourAngle(asrAltitudeDeg);
  const asrMin = Math.round(rawSolarNoonMin + (asrHourAngle / 15) * 60);

  // Derived marks
  const ishraqMin = sunriseMin + ishraqOffset; // Default: 10 mins after sunrise
  const zawalStartMin = Math.round(solarNoonMin - 7);
  const dhuhrMin = Math.round(solarNoonMin + 2); // Dhuhr starts when sun passes zenith
  const maghribMin = sunsetMin;
  const sehriEndMin = fajrMin - 5;
  const tahajjudStartMin = 0; // 00:00 or last third
  const tahajjudEndMin = fajrMin - 10;
  const iftarMin = maghribMin;
  const jumuahMin = dhuhrMin;

  return {
    fajrMin,
    sunriseMin,
    ishraqMin,
    zawalStartMin,
    solarNoonMin,
    dhuhrMin,
    asrMin,
    sunsetMin,
    maghribMin,
    ishaMin,
    tahajjudStartMin,
    tahajjudEndMin,
    sehriEndMin,
    iftarMin,
    jumuahMin,
  };
};

/**
 * Calculates current Bengali calendar date (বঙ্গাব্দ)
 */
export const getBengaliDate = (date: Date = new Date()): { day: string; month: string; year: string; fullBn: string } => {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth();
  const gregorianDay = date.getDate();

  const banglaMonths = [
    'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
    'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
  ];

  let banglaYear = gregorianYear - 593;
  if (gregorianMonth < 3 || (gregorianMonth === 3 && gregorianDay < 14)) {
    banglaYear = gregorianYear - 594;
  }

  const startOfBoishakh = new Date(gregorianYear, 3, 14);
  let diffDays = Math.floor((date.getTime() - startOfBoishakh.getTime()) / (1000 * 60 * 60 * 24));

  let monthIndex = 0;
  let dayInMonth = 1;

  const monthLengths = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29, 30];

  if (diffDays >= 0) {
    let accum = 0;
    for (let i = 0; i < 12; i++) {
      if (diffDays < accum + monthLengths[i]) {
        monthIndex = i;
        dayInMonth = diffDays - accum + 1;
        break;
      }
      accum += monthLengths[i];
    }
  } else {
    const prevBoishakh = new Date(gregorianYear - 1, 3, 14);
    diffDays = Math.floor((date.getTime() - prevBoishakh.getTime()) / (1000 * 60 * 60 * 24));
    let accum = 0;
    for (let i = 0; i < 12; i++) {
      if (diffDays < accum + monthLengths[i]) {
        monthIndex = i;
        dayInMonth = diffDays - accum + 1;
        break;
      }
      accum += monthLengths[i];
    }
  }

  const dayBn = toBanglaDigits(dayInMonth);
  const monthBn = banglaMonths[monthIndex];
  const yearBn = toBanglaDigits(banglaYear);

  return {
    day: dayBn,
    month: monthBn,
    year: yearBn,
    fullBn: `${dayBn} ${monthBn}, ${yearBn} বঙ্গাব্দ`
  };
};

/**
 * Calculates Hijri (Islamic Lunar) Date
 */
export const getHijriDate = (date: Date = new Date(), adjustmentDays: number = 0): { day: string; month: string; year: string; fullBn: string } => {
  const hijriMonthsBn = [
    'মহররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি',
    'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান',
    'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ্জ'
  ];

  try {
    const adjDate = new Date(date.getTime() + adjustmentDays * 24 * 60 * 60 * 1000);
    const intl = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
    const parts = intl.formatToParts(adjDate);
    let day = 1;
    let month = 1;
    let year = 1447;

    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    }

    const monthIndex = Math.max(0, Math.min(11, month - 1));
    const monthNameBn = hijriMonthsBn[monthIndex];
    const dayBn = toBanglaDigits(day);
    const yearBn = toBanglaDigits(year);

    return {
      day: dayBn,
      month: monthNameBn,
      year: yearBn,
      fullBn: `${dayBn} ${monthNameBn}, ${yearBn} হিজরি`
    };
  } catch (e) {
    return {
      day: toBanglaDigits(18),
      month: 'সফর',
      year: toBanglaDigits(1447),
      fullBn: `${toBanglaDigits(18)} সফর, ${toBanglaDigits(1447)} হিজরি`
    };
  }
};

/**
 * Mosque Settings Interface for Prayer Engine
 */
export interface MosqueSettingsInput {
  district?: string;
  division?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  jamaatSettings?: {
    fajr?: { azan?: string; jamaat?: string };
    dhuhr?: { azan?: string; jamaat?: string };
    asr?: { azan?: string; jamaat?: string };
    maghrib?: { azan?: string; jamaat?: string };
    isha?: { azan?: string; jamaat?: string };
    jumuah?: { azan?: string; khutbah?: string; jamaat?: string };
    ishraqOffsetMins?: number;
  };
  prayerSettings?: {
    calculationMethod?: string;
    madhab?: 'HANAFI' | 'SHAFI_MALIKI_HANBALI';
    fajrAngle?: number;
    ishaAngle?: number;
    ishraqOffsetMins?: number;
    forbiddenSunriseMins?: number;
    forbiddenSolarNoonMins?: number;
    forbiddenSunsetMins?: number;
    endOfWaqtWarningMins?: number;
  };
}

/**
 * Live Waqt, Countdown, Status & Special Prayer Calculation Engine
 * 
 * Accurately solves:
 * - 24-hr time representation
 * - 4-state Waqt countdowns (Before waqt starts, waqt active elapsed, waqt active remaining, waqt ended)
 * - Adhan vs Jamaat separate countdowns & Jamaat passed notice
 * - Tahajjud, Sunrise, Sunset, Local Solar Noon, Ishraq (Sunrise + 10m) with 3-state dynamic status
 * - 3 Forbidden/Makruh intervals (Sunrise, Solar Noon, Sunset) tracked without disrupting daily prayer state
 * - Midnight (00:00..04:30) date boundary resolution
 * - Mosque manual configuration precedence without fallback hardcoding
 */
export const calculateLiveWaqt = (
  now: Date = new Date(),
  customPrayerTimes?: { adhan?: string; iqamah?: string; jamaat?: string }[] | null,
  mosqueData?: MosqueSettingsInput | null
): WaqtStatus => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();
  const totalCurrentSec = currentMinutes * 60 + currentSeconds;
  const isFriday = now.getDay() === 5; // Friday = 5

  const district = mosqueData?.district || 'ঢাকা';
  const latitude = mosqueData?.latitude;
  const longitude = mosqueData?.longitude;
  const ishraqOffsetMins = mosqueData?.prayerSettings?.ishraqOffsetMins ?? mosqueData?.jamaatSettings?.ishraqOffsetMins ?? 10;
  const warningMins = mosqueData?.prayerSettings?.endOfWaqtWarningMins ?? 10;

  const calc = calculateHanafiDailyTimes(now, {
    districtName: district,
    latitude,
    longitude,
    madhab: mosqueData?.prayerSettings?.madhab || 'HANAFI',
    fajrAngle: mosqueData?.prayerSettings?.fajrAngle || 18.0,
    ishaAngle: mosqueData?.prayerSettings?.ishaAngle || 18.0,
    ishraqOffsetMins,
  });

  const jamaatConfig = mosqueData?.jamaatSettings || {};

  // Resolve 5 Prayers (Start, Adhan, Jamaat, End):
  // Rule: If mosque set custom adhan (and !== 'Auto'), use it. Else use astronomical calculated start/adhan.
  // Rule: If mosque set custom jamaat, use it. Else calculate default jamaat (Adhan + standard offset).

  // 1. FAJR
  const fajrStartMin = calc.fajrMin;
  const fajrCustomAzanMin = parseTimeToMinutes(jamaatConfig.fajr?.azan || customPrayerTimes?.[0]?.adhan);
  const fajrAdhanMin = fajrCustomAzanMin > 0 ? fajrCustomAzanMin : fajrStartMin;
  const fajrCustomJamaatMin = parseTimeToMinutes(jamaatConfig.fajr?.jamaat || customPrayerTimes?.[0]?.iqamah || customPrayerTimes?.[0]?.jamaat);
  const fajrJamaatMin = fajrCustomJamaatMin > 0 ? fajrCustomJamaatMin : fajrAdhanMin + 25;
  const fajrEndMin = calc.sunriseMin;

  // 2. DHUHR / JUMUAH
  const dhuhrStartMin = calc.dhuhrMin;
  const dhuhrCustomAzanMin = parseTimeToMinutes(jamaatConfig.dhuhr?.azan || customPrayerTimes?.[1]?.adhan);
  const dhuhrAdhanMin = dhuhrCustomAzanMin > 0 ? dhuhrCustomAzanMin : dhuhrStartMin;
  const dhuhrCustomJamaatMin = parseTimeToMinutes(jamaatConfig.dhuhr?.jamaat || customPrayerTimes?.[1]?.iqamah || customPrayerTimes?.[1]?.jamaat, true);
  const dhuhrJamaatMin = dhuhrCustomJamaatMin > 0 ? dhuhrCustomJamaatMin : dhuhrAdhanMin + 30;
  const dhuhrEndMin = calc.asrMin;

  // Jumuah (Friday)
  const jumuahAzanMin = parseTimeToMinutes(jamaatConfig.jumuah?.azan) > 0 ? parseTimeToMinutes(jamaatConfig.jumuah?.azan) : dhuhrAdhanMin;
  const jumuahKhutbahMin = parseTimeToMinutes(jamaatConfig.jumuah?.khutbah, true) > 0 ? parseTimeToMinutes(jamaatConfig.jumuah?.khutbah, true) : jumuahAzanMin + 15;
  const jumuahJamaatMin = parseTimeToMinutes(jamaatConfig.jumuah?.jamaat, true) > 0 ? parseTimeToMinutes(jamaatConfig.jumuah?.jamaat, true) : jumuahKhutbahMin + 20;

  // 3. ASR
  const asrStartMin = calc.asrMin;
  const asrCustomAzanMin = parseTimeToMinutes(jamaatConfig.asr?.azan || customPrayerTimes?.[2]?.adhan, true);
  const asrAdhanMin = asrCustomAzanMin > 0 ? asrCustomAzanMin : asrStartMin;
  const asrCustomJamaatMin = parseTimeToMinutes(jamaatConfig.asr?.jamaat || customPrayerTimes?.[2]?.iqamah || customPrayerTimes?.[2]?.jamaat, true);
  const asrJamaatMin = asrCustomJamaatMin > 0 ? asrCustomJamaatMin : asrAdhanMin + 20;
  const asrEndMin = calc.sunsetMin;

  // 4. MAGHRIB
  const maghribStartMin = calc.maghribMin;
  const maghribCustomAzanMin = parseTimeToMinutes(jamaatConfig.maghrib?.azan || customPrayerTimes?.[3]?.adhan, true);
  const maghribAdhanMin = maghribCustomAzanMin > 0 ? maghribCustomAzanMin : maghribStartMin;
  const maghribCustomJamaatMin = parseTimeToMinutes(jamaatConfig.maghrib?.jamaat || customPrayerTimes?.[3]?.iqamah || customPrayerTimes?.[3]?.jamaat, true);
  const maghribJamaatMin = maghribCustomJamaatMin > 0 ? maghribCustomJamaatMin : maghribAdhanMin + 10;
  const maghribEndMin = calc.ishaMin;

  // 5. ISHA
  const ishaStartMin = calc.ishaMin;
  const ishaCustomAzanMin = parseTimeToMinutes(jamaatConfig.isha?.azan || customPrayerTimes?.[4]?.adhan, true);
  const ishaAdhanMin = ishaCustomAzanMin > 0 ? ishaCustomAzanMin : ishaStartMin;
  const ishaCustomJamaatMin = parseTimeToMinutes(jamaatConfig.isha?.jamaat || customPrayerTimes?.[4]?.iqamah || customPrayerTimes?.[4]?.jamaat, true);
  const ishaJamaatMin = ishaCustomJamaatMin > 0 ? ishaCustomJamaatMin : ishaAdhanMin + 25;
  const ishaEndMin = calc.fajrMin; // Fajr next morning

  // -------------------------------------------------------------
  // FORBIDDEN / MAKRUH PERIODS TRACKING (Independent from 5-Prayers)
  // 1. Sunrise: from sunrise to sunrise + 15 mins (or ishraq start)
  // 2. Solar Noon / Zawal: 7 mins before to 3 mins after Solar Noon
  // 3. Sunset: 15 mins before sunset until Maghrib
  // -------------------------------------------------------------
  const sunriseForbiddenEndMin = Math.max(calc.sunriseMin + 15, calc.ishraqMin);
  const solarNoonForbiddenStartMin = calc.solarNoonMin - 6;
  const solarNoonForbiddenEndMin = calc.solarNoonMin + 2;
  const sunsetForbiddenStartMin = calc.sunsetMin - 15;
  const sunsetForbiddenEndMin = calc.sunsetMin;

  const isSunriseForbidden = currentMinutes >= calc.sunriseMin && currentMinutes < sunriseForbiddenEndMin;
  const isSolarNoonForbidden = currentMinutes >= solarNoonForbiddenStartMin && currentMinutes < solarNoonForbiddenEndMin;
  const isSunsetForbidden = currentMinutes >= sunsetForbiddenStartMin && currentMinutes < sunsetForbiddenEndMin;

  const isForbiddenNow = isSunriseForbidden || isSolarNoonForbidden || isSunsetForbidden;
  let forbiddenReasonBn: string | undefined = undefined;

  if (isSunriseForbidden) {
    forbiddenReasonBn = 'সূর্যোদয়ের সময় — নামাজ পড়া থেকে বিরত থাকুন';
  } else if (isSolarNoonForbidden) {
    forbiddenReasonBn = 'এখন ঠিক দুপুরের নিষিদ্ধ সময় — নামাজ পড়া থেকে বিরত থাকুন';
  } else if (isSunsetForbidden) {
    forbiddenReasonBn = 'সূর্যাস্তের সময় — নামাজ পড়া থেকে বিরত থাকুন';
  }

  const forbiddenPeriods: ForbiddenPeriod[] = [
    {
      key: 'SUNRISE',
      nameBn: 'সূর্যোদয়ের নিষিদ্ধ সময়',
      reasonBn: 'সূর্যোদয়ের সময় — নামাজ পড়া থেকে বিরত থাকুন',
      startMin: calc.sunriseMin,
      endMin: sunriseForbiddenEndMin,
      startTimeStr: formatMinutesTo24h(calc.sunriseMin),
      endTimeStr: formatMinutesTo24h(sunriseForbiddenEndMin),
      isActive: isSunriseForbidden,
      remainingSeconds: isSunriseForbidden ? (sunriseForbiddenEndMin * 60 - totalCurrentSec) : 0,
      statusBn: isSunriseForbidden ? '⚠️ এখন চলছে' : 'আসন্ন',
    },
    {
      key: 'SOLAR_NOON',
      nameBn: 'ঠিক দুপুর / জাওয়াল নিষিদ্ধ সময়',
      reasonBn: 'এখন ঠিক দুপুরের নিষিদ্ধ সময়',
      startMin: solarNoonForbiddenStartMin,
      endMin: solarNoonForbiddenEndMin,
      startTimeStr: formatMinutesTo24h(solarNoonForbiddenStartMin),
      endTimeStr: formatMinutesTo24h(solarNoonForbiddenEndMin),
      isActive: isSolarNoonForbidden,
      remainingSeconds: isSolarNoonForbidden ? (solarNoonForbiddenEndMin * 60 - totalCurrentSec) : 0,
      statusBn: isSolarNoonForbidden ? '⚠️ এখন চলছে' : 'আসন্ন',
    },
    {
      key: 'SUNSET',
      nameBn: 'সূর্যাস্তের নিষিদ্ধ সময়',
      reasonBn: 'সূর্যাস্তের সময় — নামাজ পড়া থেকে বিরত থাকুন',
      startMin: sunsetForbiddenStartMin,
      endMin: sunsetForbiddenEndMin,
      startTimeStr: formatMinutesTo24h(sunsetForbiddenStartMin),
      endTimeStr: formatMinutesTo24h(sunsetForbiddenEndMin),
      isActive: isSunsetForbidden,
      remainingSeconds: isSunsetForbidden ? (sunsetForbiddenEndMin * 60 - totalCurrentSec) : 0,
      statusBn: isSunsetForbidden ? '⚠️ এখন চলছে' : 'আসন্ন',
    },
  ];

  // -------------------------------------------------------------
  // SPECIAL PRAYERS STATUS (Ishraq, Tahajjud)
  // -------------------------------------------------------------
  // Ishraq Dynamic Status:
  // - Before sunrise: "ইশরাকের সময় শুরু হতে: ২৫ মিনিট বাকি"
  // - After sunrise but before configured interval: "ইশরাকের নামাজ ৫ মিনিট পর পড়ুন" / "ইশরাকের সময় শুরু হতে: ৫ মিনিট বাকি"
  // - After interval until Zawal: "এখন ইশরাকের নামাজ পড়তে পারবেন"
  let ishraqStatusBn = '';
  const isIshraqActive = currentMinutes >= calc.ishraqMin && currentMinutes < solarNoonForbiddenStartMin;

  if (currentMinutes < calc.sunriseMin) {
    const diffSec = calc.ishraqMin * 60 - totalCurrentSec;
    ishraqStatusBn = `ইশরাকের সময় শুরু হতে: ${formatDurationToBangla(diffSec)} বাকি`;
  } else if (currentMinutes >= calc.sunriseMin && currentMinutes < calc.ishraqMin) {
    const diffMins = calc.ishraqMin - currentMinutes;
    ishraqStatusBn = `ইশরাকের নামাজ ${toBanglaDigits(diffMins)} মিনিট পর পড়ুন`;
  } else if (isIshraqActive) {
    ishraqStatusBn = 'এখন ইশরাকের নামাজ পড়তে পারবেন';
  } else {
    ishraqStatusBn = 'আজকের ইশরাকের সময় শেষ হয়েছে';
  }

  // Tahajjud Dynamic Status:
  // Starts after Isha / 00:00 until Fajr start - 10 mins
  const isTahajjudActive = (currentMinutes >= 0 && currentMinutes < calc.tahajjudEndMin) || (currentMinutes >= ishaJamaatMin + 30 && currentMinutes < 1440);
  let tahajjudStatusBn = '';

  if (isTahajjudActive) {
    tahajjudStatusBn = 'এখন তাহাজ্জুদের নামাজ পড়তে পারবেন';
  } else if (currentMinutes >= calc.tahajjudEndMin && currentMinutes < ishaAdhanMin) {
    tahajjudStatusBn = 'তাহাজ্জুদের সময় শেষ হয়েছে';
  } else {
    const remainingToTahajjudSec = (24 * 60 * 60 - totalCurrentSec);
    tahajjudStatusBn = `তাহাজ্জুদ শুরু হতে: ${formatDurationToBangla(remainingToTahajjudSec)} বাকি`;
  }

  // -------------------------------------------------------------
  // DETERMINE ACTIVE WAQT & NEXT WAQT (5 Daily Prayers)
  // Handles Midnight (00:00..Fajr) cleanly:
  // In the early morning hours 00:00..Fajr, current waqt is technically past Isha, upcoming is Fajr.
  // -------------------------------------------------------------
  let currentWaqtKey: PrayerKey | 'none' = 'none';
  let currentWaqtBn = '';
  let currentWaqtEn = '';
  let currentWaqtStartMin = -1;
  let currentWaqtEndMin = -1;
  let currentAdhanMin = -1;
  let currentJamaatMin = -1;

  let nextWaqtKey: PrayerKey = 'fajr';
  let nextWaqtBn = 'ফজর';
  let nextWaqtEn = 'Fajr';
  let nextWaqtStartMin = fajrStartMin;
  let nextAdhanMin = fajrAdhanMin;
  let nextJamaatMin = fajrJamaatMin;

  if (currentMinutes >= fajrStartMin && currentMinutes < fajrEndMin) {
    currentWaqtKey = 'fajr';
    currentWaqtBn = 'ফজর';
    currentWaqtEn = 'Fajr';
    currentWaqtStartMin = fajrStartMin;
    currentWaqtEndMin = fajrEndMin;
    currentAdhanMin = fajrAdhanMin;
    currentJamaatMin = fajrJamaatMin;

    nextWaqtKey = 'dhuhr';
    nextWaqtBn = isFriday ? 'জুমা' : 'যোহর';
    nextWaqtEn = isFriday ? 'Jumu\'ah' : 'Dhuhr';
    nextWaqtStartMin = dhuhrStartMin;
    nextAdhanMin = isFriday ? jumuahAzanMin : dhuhrAdhanMin;
    nextJamaatMin = isFriday ? jumuahJamaatMin : dhuhrJamaatMin;
  } else if (currentMinutes >= fajrEndMin && currentMinutes < dhuhrStartMin) {
    // Between Sunrise and Dhuhr (Ishraq / Duha period)
    currentWaqtKey = 'none';
    currentWaqtBn = 'ইশরাক / চাশত';
    currentWaqtEn = 'Duha';
    currentWaqtStartMin = calc.ishraqMin;
    currentWaqtEndMin = dhuhrStartMin;
    currentAdhanMin = -1;
    currentJamaatMin = -1;

    nextWaqtKey = 'dhuhr';
    nextWaqtBn = isFriday ? 'জুমা' : 'যোহর';
    nextWaqtEn = isFriday ? 'Jumu\'ah' : 'Dhuhr';
    nextWaqtStartMin = dhuhrStartMin;
    nextAdhanMin = isFriday ? jumuahAzanMin : dhuhrAdhanMin;
    nextJamaatMin = isFriday ? jumuahJamaatMin : dhuhrJamaatMin;
  } else if (currentMinutes >= dhuhrStartMin && currentMinutes < dhuhrEndMin) {
    currentWaqtKey = 'dhuhr';
    currentWaqtBn = isFriday ? 'জুমা' : 'যোহর';
    currentWaqtEn = isFriday ? 'Jumu\'ah' : 'Dhuhr';
    currentWaqtStartMin = dhuhrStartMin;
    currentWaqtEndMin = dhuhrEndMin;
    currentAdhanMin = isFriday ? jumuahAzanMin : dhuhrAdhanMin;
    currentJamaatMin = isFriday ? jumuahJamaatMin : dhuhrJamaatMin;

    nextWaqtKey = 'asr';
    nextWaqtBn = 'আসর';
    nextWaqtEn = 'Asr';
    nextWaqtStartMin = asrStartMin;
    nextAdhanMin = asrAdhanMin;
    nextJamaatMin = asrJamaatMin;
  } else if (currentMinutes >= asrStartMin && currentMinutes < asrEndMin) {
    currentWaqtKey = 'asr';
    currentWaqtBn = 'আসর';
    currentWaqtEn = 'Asr';
    currentWaqtStartMin = asrStartMin;
    currentWaqtEndMin = asrEndMin;
    currentAdhanMin = asrAdhanMin;
    currentJamaatMin = asrJamaatMin;

    nextWaqtKey = 'maghrib';
    nextWaqtBn = 'মাগরিব';
    nextWaqtEn = 'Maghrib';
    nextWaqtStartMin = maghribStartMin;
    nextAdhanMin = maghribAdhanMin;
    nextJamaatMin = maghribJamaatMin;
  } else if (currentMinutes >= maghribStartMin && currentMinutes < maghribEndMin) {
    currentWaqtKey = 'maghrib';
    currentWaqtBn = 'মাগরিব';
    currentWaqtEn = 'Maghrib';
    currentWaqtStartMin = maghribStartMin;
    currentWaqtEndMin = maghribEndMin;
    currentAdhanMin = maghribAdhanMin;
    currentJamaatMin = maghribJamaatMin;

    nextWaqtKey = 'isha';
    nextWaqtBn = 'এশা';
    nextWaqtEn = 'Isha';
    nextWaqtStartMin = ishaStartMin;
    nextAdhanMin = ishaAdhanMin;
    nextJamaatMin = ishaJamaatMin;
  } else if (currentMinutes >= ishaStartMin && currentMinutes < 1440) {
    // Isha active before midnight
    currentWaqtKey = 'isha';
    currentWaqtBn = 'এশা';
    currentWaqtEn = 'Isha';
    currentWaqtStartMin = ishaStartMin;
    currentWaqtEndMin = fajrStartMin;
    currentAdhanMin = ishaAdhanMin;
    currentJamaatMin = ishaJamaatMin;

    nextWaqtKey = 'fajr';
    nextWaqtBn = 'ফজর';
    nextWaqtEn = 'Fajr';
    nextWaqtStartMin = fajrStartMin;
    nextAdhanMin = fajrAdhanMin;
    nextJamaatMin = fajrJamaatMin;
  } else {
    // Post-midnight 00:00 until Fajr
    currentWaqtKey = 'isha';
    currentWaqtBn = 'এশা (রাত্রি)';
    currentWaqtEn = 'Isha (Night)';
    currentWaqtStartMin = ishaStartMin;
    currentWaqtEndMin = fajrStartMin;
    currentAdhanMin = ishaAdhanMin;
    currentJamaatMin = ishaJamaatMin;

    nextWaqtKey = 'fajr';
    nextWaqtBn = 'ফজর';
    nextWaqtEn = 'Fajr';
    nextWaqtStartMin = fajrStartMin;
    nextAdhanMin = fajrAdhanMin;
    nextJamaatMin = fajrJamaatMin;
  }

  const isWaqtActive = currentWaqtKey !== 'none';

  // -------------------------------------------------------------
  // COUNTDOWNS & ELAPSED CALCULATIONS (Accurate to second)
  // -------------------------------------------------------------
  let waqtElapsedSeconds = 0;
  let waqtRemainingSeconds = 0;

  if (isWaqtActive) {
    if (currentWaqtKey === 'isha' && currentMinutes < fajrStartMin) {
      // Past midnight during Isha window
      waqtElapsedSeconds = (1440 - ishaStartMin + currentMinutes) * 60 + currentSeconds;
      waqtRemainingSeconds = (fajrStartMin - currentMinutes) * 60 - currentSeconds;
    } else if (currentWaqtKey === 'isha') {
      // Before midnight during Isha window
      waqtElapsedSeconds = (currentMinutes - ishaStartMin) * 60 + currentSeconds;
      waqtRemainingSeconds = (1440 - currentMinutes + fajrStartMin) * 60 - currentSeconds;
    } else {
      waqtElapsedSeconds = (currentMinutes - currentWaqtStartMin) * 60 + currentSeconds;
      waqtRemainingSeconds = (currentWaqtEndMin - currentMinutes) * 60 - currentSeconds;
    }
  }

  waqtElapsedSeconds = Math.max(0, waqtElapsedSeconds);
  waqtRemainingSeconds = Math.max(0, waqtRemainingSeconds);

  // Next Waqt Countdown Seconds
  let nextWaqtStartsInSeconds = 0;
  if (currentMinutes < nextWaqtStartMin) {
    nextWaqtStartsInSeconds = (nextWaqtStartMin - currentMinutes) * 60 - currentSeconds;
  } else {
    // Crosses midnight to tomorrow's Fajr
    nextWaqtStartsInSeconds = (1440 - currentMinutes + nextWaqtStartMin) * 60 - currentSeconds;
  }
  nextWaqtStartsInSeconds = Math.max(0, nextWaqtStartsInSeconds);

  // Adhan & Jamaat Countdowns
  let adhanRemainingSeconds = 0;
  let jamaatRemainingSeconds = 0;
  let isJamaatPassed = false;

  if (isWaqtActive && currentJamaatMin > 0) {
    if (currentMinutes < currentAdhanMin) {
      adhanRemainingSeconds = (currentAdhanMin - currentMinutes) * 60 - currentSeconds;
    }
    if (currentMinutes < currentJamaatMin) {
      jamaatRemainingSeconds = (currentJamaatMin - currentMinutes) * 60 - currentSeconds;
    } else {
      isJamaatPassed = true;
    }
  } else if (!isWaqtActive) {
    adhanRemainingSeconds = (nextAdhanMin - currentMinutes) * 60 - currentSeconds;
    jamaatRemainingSeconds = (nextJamaatMin - currentMinutes) * 60 - currentSeconds;
  }

  const isJamaatApproaching = jamaatRemainingSeconds > 0 && jamaatRemainingSeconds <= 600; // <= 10 mins
  const isJamaatNow = jamaatRemainingSeconds > 0 && jamaatRemainingSeconds <= 180; // <= 3 mins
  const isEndingSoon = isWaqtActive && waqtRemainingSeconds > 0 && waqtRemainingSeconds <= (warningMins * 60);

  // -------------------------------------------------------------
  // DYNAMIC 4-STATE BANNER MESSAGE SYNTHESIS
  // Mandated scenarios:
  // 1. Before waqt starts: "যোহর ওয়াক্ত শুরু হতে: ১ ঘণ্টা ১০ মিনিট বাকি"
  // 2. Waqt started: "যোহর ওয়াক্ত শুরু হয়েছে: ৩০ মিনিট আগে"
  // 3. Waqt ending: "যোহর ওয়াক্ত শেষ হতে: ৫০ মিনিট বাকি"
  // 4. Waqt ended: "যোহর ওয়াক্ত শেষ হয়েছে"
  // Plus Forbidden alert, Jamaat countdown, Ending soon warning.
  // -------------------------------------------------------------
  let dynamicStatusMessageBn = '';
  let dynamicSubMessageBn: string | undefined = undefined;

  const waqtElapsedStrBn = formatDurationToBangla(waqtElapsedSeconds);
  const waqtRemainingStrBn = formatDurationToBangla(waqtRemainingSeconds);
  const nextWaqtStartsInStrBn = formatDurationToBangla(nextWaqtStartsInSeconds);
  const adhanCountdownStrBn = formatDurationToBangla(adhanRemainingSeconds);
  const jamaatCountdownStrBn = formatDurationToBangla(jamaatRemainingSeconds);

  if (isForbiddenNow && forbiddenReasonBn) {
    dynamicStatusMessageBn = `⚠️ ${forbiddenReasonBn}`;
    dynamicSubMessageBn = isWaqtActive
      ? `${currentWaqtBn} ওয়াক্ত চলমান থাকলেও এই সময়ে সালাত আদায় নিষেধ।`
      : 'নিষিদ্ধ সময় শেষ হওয়ার পর নামাজ আদায় করুন।';
  } else if (isJamaatNow) {
    dynamicStatusMessageBn = `🕌 ${currentWaqtBn}-এর জামাত শুরু হচ্ছে — কাতার সোজা করুন`;
    dynamicSubMessageBn = `জামাতের সময়: ${formatMinutesTo24h(currentJamaatMin)}`;
  } else if (isJamaatApproaching) {
    dynamicStatusMessageBn = `📢 ${currentWaqtBn}-এর জামাত হতে: ${jamaatCountdownStrBn} বাকি`;
    dynamicSubMessageBn = `জামাত: ${formatMinutesTo24h(currentJamaatMin)} | ওয়াক্ত শেষ হতে: ${waqtRemainingStrBn} বাকি`;
  } else if (isEndingSoon) {
    dynamicStatusMessageBn = `⚠️ ${currentWaqtBn} ওয়াক্ত শেষ হতে ${waqtRemainingStrBn} বাকি`;
    dynamicSubMessageBn = `পরবর্তী নামাজ: ${nextWaqtBn} (শুরু: ${formatMinutesTo24h(nextWaqtStartMin)})`;
  } else if (isWaqtActive) {
    dynamicStatusMessageBn = `${currentWaqtBn} ওয়াক্ত শুরু হয়েছে — ${waqtElapsedStrBn} আগে`;
    if (jamaatRemainingSeconds > 0) {
      dynamicSubMessageBn = `আজান: ${formatMinutesTo24h(currentAdhanMin)} | জামাত হতে: ${jamaatCountdownStrBn} বাকি | ওয়াক্ত শেষ হতে: ${waqtRemainingStrBn} বাকি`;
    } else {
      dynamicSubMessageBn = `আজান: ${formatMinutesTo24h(currentAdhanMin)} | জামাত: ${formatMinutesTo24h(currentJamaatMin)} (সম্পন্ন) | ওয়াক্ত শেষ হতে: ${waqtRemainingStrBn} বাকি`;
    }
  } else {
    // Between waqts (e.g. Sunrise..Dhuhr)
    dynamicStatusMessageBn = `${nextWaqtBn} ওয়াক্ত শুরু হতে: ${nextWaqtStartsInStrBn} বাকি`;
    dynamicSubMessageBn = `আজান: ${formatMinutesTo24h(nextAdhanMin)} | জামাত: ${formatMinutesTo24h(nextJamaatMin)}`;
  }

  // -------------------------------------------------------------
  // BUILD 5 DAILY PRAYERS LIST
  // -------------------------------------------------------------
  const buildPrayerItem = (
    key: PrayerKey,
    nameBn: string,
    nameEn: string,
    startMin: number,
    adhanMin: number,
    jamaatMin: number,
    endMin: number,
    isCustomJamaat: boolean = false
  ): PrayerTimeItem => {
    let status: 'ENDED' | 'ONGOING' | 'NEXT' | 'UPCOMING' = 'UPCOMING';
    let statusBn: 'শেষ' | 'চলছে' | 'পরবর্তী' | 'অপেক্ষমাণ' = 'অপেক্ষমাণ';
    let countdownTextBn = '';

    if (key === currentWaqtKey) {
      status = 'ONGOING';
      statusBn = 'চলছে';
      countdownTextBn = `শেষ হতে ${waqtRemainingStrBn} বাকি`;
    } else if (key === nextWaqtKey) {
      status = 'NEXT';
      statusBn = 'পরবর্তী';
      countdownTextBn = `শুরু হতে ${nextWaqtStartsInStrBn} বাকি`;
    } else {
      // Check if ended today
      let isEnded = false;
      if (key === 'fajr' && currentMinutes >= calc.sunriseMin) isEnded = true;
      if (key === 'dhuhr' && currentMinutes >= calc.asrMin) isEnded = true;
      if (key === 'asr' && currentMinutes >= calc.sunsetMin) isEnded = true;
      if (key === 'maghrib' && currentMinutes >= calc.ishaMin) isEnded = true;

      if (isEnded) {
        status = 'ENDED';
        statusBn = 'শেষ';
        countdownTextBn = 'ওয়াক্ত শেষ হয়েছে';
      } else {
        status = 'UPCOMING';
        statusBn = 'অপেক্ষমাণ';
        const diffSec = (startMin > currentMinutes)
          ? (startMin - currentMinutes) * 60 - currentSeconds
          : (1440 - currentMinutes + startMin) * 60 - currentSeconds;
        countdownTextBn = `শুরু হতে ${formatDurationToBangla(Math.max(0, diffSec))} বাকি`;
      }
    }

    return {
      key,
      nameBn,
      nameEn,
      waqtStart: formatMinutesTo24h(startMin),
      adhan: formatMinutesTo24h(adhanMin),
      jamaat: formatMinutesTo24h(jamaatMin),
      waqtEnd: formatMinutesTo24h(endMin),
      status,
      statusBn,
      countdownTextBn,
      waqtStartMin: startMin,
      adhanMin,
      jamaatMin,
      waqtEndMin: endMin,
      isCustomJamaat,
    };
  };

  const prayerList: PrayerTimeItem[] = [
    buildPrayerItem('fajr', 'ফজর', 'Fajr', fajrStartMin, fajrAdhanMin, fajrJamaatMin, fajrEndMin, fajrCustomJamaatMin > 0),
    buildPrayerItem(
      'dhuhr',
      isFriday ? 'যোহর / জুমা' : 'যোহর',
      isFriday ? 'Dhuhr / Jumu\'ah' : 'Dhuhr',
      dhuhrStartMin,
      isFriday ? jumuahAzanMin : dhuhrAdhanMin,
      isFriday ? jumuahJamaatMin : dhuhrJamaatMin,
      dhuhrEndMin,
      dhuhrCustomJamaatMin > 0 || (isFriday && parseTimeToMinutes(jamaatConfig.jumuah?.jamaat) > 0)
    ),
    buildPrayerItem('asr', 'আসর', 'Asr', asrStartMin, asrAdhanMin, asrJamaatMin, asrEndMin, asrCustomJamaatMin > 0),
    buildPrayerItem('maghrib', 'মাগরিব', 'Maghrib', maghribStartMin, maghribAdhanMin, maghribJamaatMin, maghribEndMin, maghribCustomJamaatMin > 0),
    buildPrayerItem('isha', 'এশা', 'Isha', ishaStartMin, ishaAdhanMin, ishaJamaatMin, ishaEndMin, ishaCustomJamaatMin > 0),
  ];

  // -------------------------------------------------------------
  // BUILD SPECIAL PRAYERS LIST (Tahajjud, Sunrise, Ishraq, Solar Noon, Sunset, Jumuah)
  // -------------------------------------------------------------
  const specialList: SpecialPrayerItem[] = [
    {
      key: 'tahajjud',
      nameBn: 'তাহাজ্জুদ',
      nameEn: 'Tahajjud',
      timeStr: '00:00',
      endTimeStr: formatMinutesTo24h(calc.tahajjudEndMin),
      statusBn: tahajjudStatusBn,
      isActive: isTahajjudActive,
      timeMin: 0,
      endTimeMin: calc.tahajjudEndMin,
    },
    {
      key: 'sunrise',
      nameBn: 'সূর্যোদয়',
      nameEn: 'Sunrise',
      timeStr: formatMinutesTo24h(calc.sunriseMin),
      statusBn: isSunriseForbidden ? '⚠️ নিষিদ্ধ সময় চলছে' : 'সূর্যোদয় সম্পন্ন',
      isActive: isSunriseForbidden,
      timeMin: calc.sunriseMin,
    },
    {
      key: 'ishraq',
      nameBn: 'ইশরাক',
      nameEn: 'Ishraq',
      timeStr: formatMinutesTo24h(calc.ishraqMin),
      endTimeStr: formatMinutesTo24h(solarNoonForbiddenStartMin),
      statusBn: ishraqStatusBn,
      isActive: isIshraqActive,
      timeMin: calc.ishraqMin,
      endTimeMin: solarNoonForbiddenStartMin,
    },
    {
      key: 'solarNoon',
      nameBn: 'ঠিক দুপুর / জাওয়াল',
      nameEn: 'Solar Noon (Zawal)',
      timeStr: formatMinutesTo24h(calc.solarNoonMin),
      statusBn: isSolarNoonForbidden ? '⚠️ নিষিদ্ধ সময় চলছে' : 'দ্বিপ্রহর',
      isActive: isSolarNoonForbidden,
      timeMin: calc.solarNoonMin,
    },
    {
      key: 'sunset',
      nameBn: 'সূর্যাস্ত',
      nameEn: 'Sunset',
      timeStr: formatMinutesTo24h(calc.sunsetMin),
      statusBn: isSunsetForbidden ? '⚠️ নিষিদ্ধ সময় চলছে' : 'সূর্যাস্ত সম্পন্ন',
      isActive: isSunsetForbidden,
      timeMin: calc.sunsetMin,
    },
    {
      key: 'jumuah',
      nameBn: 'জুমার নামাজ (শুক্রবার)',
      nameEn: 'Jumu\'ah (Friday)',
      timeStr: formatMinutesTo24h(jumuahAzanMin),
      endTimeStr: formatMinutesTo24h(jumuahJamaatMin),
      statusBn: isFriday ? (isWaqtActive && currentWaqtKey === 'dhuhr' ? 'আজ জুমার দিন' : 'আসন্ন') : 'প্রতি শুক্রবার',
      isActive: isFriday,
      timeMin: jumuahAzanMin,
      endTimeMin: jumuahJamaatMin,
    },
  ];

  const banglaDateObj = getBengaliDate(now);
  const hijriDateObj = getHijriDate(now);

  const gregorianOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  const dateBn = toBanglaDigits(now.toLocaleDateString('bn-BD', gregorianOptions));
  const dateStr = now.toISOString().split('T')[0];

  return {
    currentTime24: formatMinutesTo24h(currentMinutes),
    currentTime12: formatMinutesTo12h(currentMinutes),
    currentTimeBn: toBanglaDigits(formatMinutesTo24h(currentMinutes)),
    currentSeconds,
    dateStr,
    dateBn,
    hijriDateBn: hijriDateObj.fullBn,
    bengaliDateBn: banglaDateObj.fullBn,
    isFriday,

    currentWaqtKey,
    currentWaqtBn,
    currentWaqtEn,
    isWaqtActive,
    waqtElapsedSeconds,
    waqtRemainingSeconds,
    waqtElapsedStrBn,
    waqtRemainingStrBn,

    currentAdhanTimeStr: formatMinutesTo24h(currentAdhanMin),
    currentJamaatTimeStr: formatMinutesTo24h(currentJamaatMin),
    adhanRemainingSeconds,
    jamaatRemainingSeconds,
    adhanCountdownStrBn,
    jamaatCountdownStrBn,
    isJamaatPassed,
    isJamaatApproaching,
    isJamaatNow,
    isEndingSoon,
    endingSoonWarningBn: isEndingSoon ? `⚠️ ${currentWaqtBn} ওয়াক্ত শেষ হতে ${waqtRemainingStrBn} বাকি` : undefined,

    nextWaqtKey,
    nextWaqtBn,
    nextWaqtEn,
    nextWaqtStartsInSeconds,
    nextWaqtStartsInStrBn,
    nextAdhanTimeStr: formatMinutesTo24h(nextAdhanMin),
    nextJamaatTimeStr: formatMinutesTo24h(nextJamaatMin),

    dynamicStatusMessageBn,
    dynamicSubMessageBn,

    sunriseTimeStr: formatMinutesTo24h(calc.sunriseMin),
    sunsetTimeStr: formatMinutesTo24h(calc.sunsetMin),
    solarNoonTimeStr: formatMinutesTo24h(calc.solarNoonMin),
    ishraqTimeStr: formatMinutesTo24h(calc.ishraqMin),
    ishraqEndTimeStr: formatMinutesTo24h(solarNoonForbiddenStartMin),
    ishraqStatusBn,
    isIshraqActive,
    tahajjudStartTimeStr: '00:00',
    tahajjudEndTimeStr: formatMinutesTo24h(calc.tahajjudEndMin),
    tahajjudStatusBn,
    isTahajjudActive,
    jumuahTimeStr: formatMinutesTo24h(jumuahAzanMin),
    jumuahKhutbahTimeStr: formatMinutesTo24h(jumuahKhutbahMin),
    jumuahJamaatTimeStr: formatMinutesTo24h(jumuahJamaatMin),
    sehriEndTimeStr: formatMinutesTo24h(calc.sehriEndMin),
    iftarTimeStr: formatMinutesTo24h(calc.iftarMin),

    isForbiddenNow,
    forbiddenReasonBn,
    forbiddenPeriods,

    // Compatibility aliases
    isMakruh: isForbiddenNow,
    makruhReasonBn: forbiddenReasonBn,
    currentPrayerBn: currentWaqtBn,
    currentPrayerEn: currentWaqtEn,
    nextPrayerBn: nextWaqtBn,
    nextPrayerEn: nextWaqtEn,
    nextPrayerTime: formatMinutesTo24h(nextAdhanMin),
    nextWaqtTime: formatMinutesTo24h(nextWaqtStartMin),
    isJamaatApproachingWarning: isEndingSoon ? `⚠️ ${currentWaqtBn} ওয়াক্ত শেষ হতে ${waqtRemainingStrBn} বাকি` : undefined,

    prayerList,
    specialList,
  };
};

/**
 * Monthly Prayer Times Generator
 * Generates an array of daily prayer times for an entire month
 */
export interface MonthlyDayPrayerItem {
  day: number;
  dateStr: string;
  dayNameBn: string;
  bengaliDateBn: string;
  hijriDateBn: string;
  isToday: boolean;
  isFriday: boolean;
  fajr: string;
  sunrise: string;
  ishraq: string;
  solarNoon: string;
  dhuhr: string;
  asr: string;
  sunset: string;
  maghrib: string;
  isha: string;
  tahajjudEnd: string;
}

export const generateMonthlyPrayerTimes = (
  year: number,
  month: number, // 0-indexed (0 = Jan, 8 = Sep)
  districtName?: string,
  latitude?: number,
  longitude?: number
): MonthlyDayPrayerItem[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const result: MonthlyDayPrayerItem[] = [];

  const dayNamesBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d, 12, 0, 0);
    const times = calculateHanafiDailyTimes(date, {
      districtName,
      latitude,
      longitude,
    });

    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d;
    const isFriday = date.getDay() === 5;
    const bDate = getBengaliDate(date);
    const hDate = getHijriDate(date);

    result.push({
      day: d,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNameBn: dayNamesBn[date.getDay()],
      bengaliDateBn: `${bDate.day} ${bDate.month}`,
      hijriDateBn: `${hDate.day} ${hDate.month}`,
      isToday,
      isFriday,
      fajr: formatMinutesTo24h(times.fajrMin),
      sunrise: formatMinutesTo24h(times.sunriseMin),
      ishraq: formatMinutesTo24h(times.ishraqMin),
      solarNoon: formatMinutesTo24h(times.solarNoonMin),
      dhuhr: formatMinutesTo24h(times.dhuhrMin),
      asr: formatMinutesTo24h(times.asrMin),
      sunset: formatMinutesTo24h(times.sunsetMin),
      maghrib: formatMinutesTo24h(times.maghribMin),
      isha: formatMinutesTo24h(times.ishaMin),
      tahajjudEnd: formatMinutesTo24h(times.tahajjudEndMin),
    });
  }

  return result;
};

/**
 * Pure Web Audio Tone Synthesizer for Adhan / Jamaat chime reminder
 */
export const playPrayerNotificationSound = (type: 'IQAMAH_ALERT' | 'GENTLE_CHIME' = 'GENTLE_CHIME') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'IQAMAH_ALERT') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.25);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.25);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + idx * 0.25 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.25 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.25);
        osc.stop(ctx.currentTime + idx * 0.25 + 0.65);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.25);
    }
  } catch (e) {
    // Ignored if autoplay is restricted
  }
};

/**
 * High-level bridge to produce a structured DailyPrayerSchedule object
 */
export const buildDailyPrayerSchedule = (
  now: Date = new Date(),
  prayerSettings?: Partial<MosquePrayerSettings> | null,
  jamaatSettings?: any,
  districtOverride?: string
): DailyPrayerSchedule => {
  const district = districtOverride || prayerSettings?.district || 'ঢাকা';
  const waqtStatus = calculateLiveWaqt(now, null, {
    district,
    prayerSettings: prayerSettings as any,
    jamaatSettings,
  });

  const prayers: DailyPrayerItem[] = waqtStatus.prayerList.map((p) => {
    const isCurrent = p.status === 'ONGOING';
    const isNext = p.status === 'NEXT';
    let status: DailyPrayerItem['status'] = 'UPCOMING';
    if (isCurrent) {
      if (waqtStatus.isJamaatNow) status = 'JAMAT_NOW';
      else if (waqtStatus.isJamaatApproaching) status = 'JAMAT_UPCOMING';
      else if (waqtStatus.isEndingSoon) status = 'ENDING_SOON';
      else if (waqtStatus.isJamaatPassed) status = 'JAMAT_PASSED';
      else status = 'STARTED';
    } else if (p.status === 'ENDED') {
      status = 'ENDED';
    } else {
      status = 'UPCOMING';
    }

    const elapsedMin = Math.floor(waqtStatus.waqtElapsedSeconds / 60);
    const totalMin = Math.floor((waqtStatus.waqtElapsedSeconds + waqtStatus.waqtRemainingSeconds) / 60) || 1;
    const progressPercent = isCurrent ? Math.min(100, Math.max(0, Math.round((elapsedMin / totalMin) * 100))) : 0;

    return {
      id: p.key as any,
      nameBn: p.nameBn,
      nameEn: p.nameEn,
      waqtStart: p.waqtStart,
      adhan: p.adhan,
      jamaat: p.jamaat,
      waqtEnd: p.waqtEnd,
      status,
      statusLabelBn: p.statusBn,
      dynamicMessageBn: p.countdownTextBn,
      countdownSeconds: isCurrent ? waqtStatus.waqtRemainingSeconds : (isNext ? waqtStatus.nextWaqtStartsInSeconds : 0),
      countdownFormattedBn: isCurrent ? waqtStatus.waqtRemainingStrBn : (isNext ? waqtStatus.nextWaqtStartsInStrBn : ''),
      isCurrent,
      isNext,
      progressPercentage: progressPercent,
    };
  });

  const currentPrayer = prayers.find((p) => p.isCurrent) || null;
  const nextPrayer = prayers.find((p) => p.isNext) || null;

  const bDate = getBengaliDate(now);
  const hDate = getHijriDate(now);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const h12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const currentTime12hStr = `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;

  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    date: dateStr,
    timezone: 'Asia/Dhaka',
    district,
    gregorianFormattedBn: `${toBanglaDigits(now.getDate())} ${bDate.month} ${toBanglaDigits(now.getFullYear())}`,
    bengaliDateBn: bDate.fullBn,
    hijriDateBn: hDate.fullBn,
    isFriday: now.getDay() === 5,
    currentTimeStr,
    currentTime12hStr,
    prayers,
    currentPrayer,
    nextPrayer,
    currentWaqtMessageBn: waqtStatus.currentWaqtBn,
    nextWaqtMessageBn: waqtStatus.nextWaqtBn,
    sunriseStr: waqtStatus.sunriseTimeStr,
    sunsetStr: waqtStatus.sunsetTimeStr,
    solarNoonStr: waqtStatus.solarNoonTimeStr,
    tahajjud: {
      startTimeStr: waqtStatus.tahajjudStartTimeStr,
      endTimeStr: waqtStatus.tahajjudEndTimeStr,
      isActive: waqtStatus.isTahajjudActive,
      statusMessageBn: waqtStatus.tahajjudStatusBn,
      countdownSeconds: waqtStatus.waqtRemainingSeconds || 0,
    },
    ishraq: {
      startTimeStr: waqtStatus.ishraqTimeStr,
      endTimeStr: waqtStatus.ishraqEndTimeStr,
      isActive: waqtStatus.isIshraqActive,
      statusState: waqtStatus.isIshraqActive ? 'ACTIVE' : 'ENDED',
      statusMessageBn: waqtStatus.ishraqStatusBn,
      countdownSeconds: 0,
    },
    forbiddenTimes: {
      isForbiddenNow: waqtStatus.isForbiddenNow,
      currentForbiddenReasonBn: waqtStatus.forbiddenReasonBn || '',
      sunriseForbiddenStart: waqtStatus.forbiddenPeriods[0]?.startTimeStr || '',
      sunriseForbiddenEnd: waqtStatus.forbiddenPeriods[0]?.endTimeStr || '',
      zawalForbiddenStart: waqtStatus.forbiddenPeriods[1]?.startTimeStr || '',
      zawalForbiddenEnd: waqtStatus.forbiddenPeriods[1]?.endTimeStr || '',
      sunsetForbiddenStart: waqtStatus.forbiddenPeriods[2]?.startTimeStr || '',
      sunsetForbiddenEnd: waqtStatus.forbiddenPeriods[2]?.endTimeStr || '',
    },
    jumuah: waqtStatus.jumuahTimeStr ? {
      adhan: waqtStatus.jumuahTimeStr,
      khutbah: waqtStatus.jumuahKhutbahTimeStr || '',
      jamaat: waqtStatus.jumuahJamaatTimeStr || '',
    } : undefined,
  };
};

/**
 * High-level bridge to produce 30-day MonthlyPrayerDay items
 */
export const buildMonthlyPrayerCalendar = (
  year: number,
  month: number, // 1-12
  prayerSettings?: Partial<MosquePrayerSettings> | null,
  districtOverride?: string
): MonthlyPrayerDay[] => {
  const district = districtOverride || prayerSettings?.district || 'ঢাকা';
  const monthlyItems = generateMonthlyPrayerTimes(year, month - 1, district);

  const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return monthlyItems.map((item) => {
    const d = new Date(year, month - 1, item.day);
    const dayIndex = d.getDay();

    const fajrCustomJamaat = prayerSettings?.fajr?.jamaat || '05:15';
    const dhuhrCustomJamaat = prayerSettings?.dhuhr?.jamaat || '13:30';
    const asrCustomJamaat = prayerSettings?.asr?.jamaat || '16:45';
    const maghribCustomJamaat = prayerSettings?.maghrib?.jamaat || '18:25';
    const ishaCustomJamaat = prayerSettings?.isha?.jamaat || '20:00';
    const jumuahCustomJamaat = prayerSettings?.jumuah?.jamaat || '13:45';

    return {
      date: item.dateStr,
      dayNumber: item.day,
      dayNameBn: item.dayNameBn,
      dayNameEn: dayNamesEn[dayIndex],
      isFriday: item.isFriday,
      hijriDateBn: item.hijriDateBn,
      bengaliDateBn: item.bengaliDateBn,
      sehriEnd: item.tahajjudEnd,
      fajrStart: item.fajr,
      fajrJamaat: fajrCustomJamaat,
      sunrise: item.sunrise,
      ishraq: item.ishraq,
      solarNoon: item.solarNoon,
      dhuhrStart: item.dhuhr,
      dhuhrJamaat: dhuhrCustomJamaat,
      asrStart: item.asr,
      asrJamaat: asrCustomJamaat,
      sunset: item.sunset,
      iftar: item.sunset,
      maghribStart: item.maghrib,
      maghribJamaat: maghribCustomJamaat,
      ishaStart: item.isha,
      ishaJamaat: ishaCustomJamaat,
      jumuah: item.isFriday ? jumuahCustomJamaat : undefined,
    };
  });
};


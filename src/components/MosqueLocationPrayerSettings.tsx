import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Compass,
  Clock,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Save,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Shield,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { Mosque, MosquePrayerSettings, CurrentUser } from '../types';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS_GEO,
  getDistrictsByDivision,
  findDistrict,
  getUpazilasByDistrict,
} from '../lib/bangladeshLocations';
import {
  calculateHanafiDailyTimes,
  buildDailyPrayerSchedule,
  formatMinutesToBanglaTime,
  formatMinutesTo24h,
  toBanglaDigits,
  formatDurationToBangla,
} from '../lib/prayerEngine';
import { Language } from '../lib/i18n';

interface MosqueLocationPrayerSettingsProps {
  currentMosque?: Mosque | null;
  currentUser?: CurrentUser | null;
  language?: Language;
  onSave?: (updatedData: Partial<Mosque>) => Promise<void>;
}

export const MosqueLocationPrayerSettings: React.FC<MosqueLocationPrayerSettingsProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  onSave,
}) => {
  const canEdit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('MANAGE_SETTINGS');

  // Initial values extraction
  const initialDivision = currentMosque?.division || currentMosque?.prayerSettings?.division || 'dhaka';
  const initialDistrict = currentMosque?.district || currentMosque?.prayerSettings?.district || 'ঢাকা';
  const matchedDistrictGeo = findDistrict(initialDistrict);

  // Form State
  const [division, setDivision] = useState<string>(
    matchedDistrictGeo ? matchedDistrictGeo.divisionId : initialDivision
  );
  const [district, setDistrict] = useState<string>(matchedDistrictGeo ? matchedDistrictGeo.nameBn : 'ঢাকা');
  const [upazila, setUpazila] = useState<string>(
    currentMosque?.upazila || currentMosque?.prayerSettings?.upazila || ''
  );
  const [area, setArea] = useState<string>(
    currentMosque?.union || currentMosque?.village || currentMosque?.prayerSettings?.area || ''
  );

  const [latitude, setLatitude] = useState<string>(
    String(currentMosque?.latitude || currentMosque?.prayerSettings?.latitude || matchedDistrictGeo?.lat || 23.8103)
  );
  const [longitude, setLongitude] = useState<string>(
    String(currentMosque?.longitude || currentMosque?.prayerSettings?.longitude || matchedDistrictGeo?.lng || 90.4125)
  );

  // Madhab & Calculation Settings
  const [madhab, setMadhab] = useState<'HANAFI' | 'STANDARD'>(
    (currentMosque?.prayerSettings?.madhab as any) || 'HANAFI'
  );
  const [calculationMethod, setCalculationMethod] = useState<
    'ISLAMIC_FOUNDATION_BD' | 'HANAFI_KARACHI' | 'MWL' | 'EGYPT' | 'MEKKA'
  >(currentMosque?.prayerSettings?.calculationMethod || 'ISLAMIC_FOUNDATION_BD');
  const [fajrAngle, setFajrAngle] = useState<number>(currentMosque?.prayerSettings?.fajrAngle || 18.0);
  const [ishaAngle, setIshaAngle] = useState<number>(currentMosque?.prayerSettings?.ishaAngle || 18.0);
  const [ishraqOffsetMinutes, setIshraqOffsetMinutes] = useState<number>(
    currentMosque?.prayerSettings?.ishraqOffsetMinutes ?? 10
  );
  const [tahajjudMode, setTahajjudMode] = useState<'LAST_THIRD' | 'MIDNIGHT_TO_FAJR'>(
    currentMosque?.prayerSettings?.tahajjudMode || 'LAST_THIRD'
  );

  // Forbidden Times Duration
  const [sunriseForbiddenMins, setSunriseForbiddenMins] = useState<number>(
    currentMosque?.prayerSettings?.sunriseForbiddenDurationMinutes ?? 12
  );
  const [zawalForbiddenMins, setZawalForbiddenMins] = useState<number>(
    currentMosque?.prayerSettings?.zawalForbiddenDurationMinutes ?? 10
  );
  const [sunsetForbiddenMins, setSunsetForbiddenMins] = useState<number>(
    currentMosque?.prayerSettings?.sunsetForbiddenDurationMinutes ?? 15
  );

  // Adhan & Jamaat Times State
  const [fajrAdhan, setFajrAdhan] = useState(
    currentMosque?.prayerSettings?.fajr?.adhan || currentMosque?.jamaatSettings?.fajr?.azan || 'Auto'
  );
  const [fajrJamaat, setFajrJamaat] = useState(
    currentMosque?.prayerSettings?.fajr?.jamaat || currentMosque?.jamaatSettings?.fajr?.jamaat || '05:15'
  );
  const [fajrOffset, setFajrOffset] = useState<number>(currentMosque?.prayerSettings?.fajr?.manualOffset || 0);

  const [dhuhrAdhan, setDhuhrAdhan] = useState(
    currentMosque?.prayerSettings?.dhuhr?.adhan || currentMosque?.jamaatSettings?.dhuhr?.azan || 'Auto'
  );
  const [dhuhrJamaat, setDhuhrJamaat] = useState(
    currentMosque?.prayerSettings?.dhuhr?.jamaat || currentMosque?.jamaatSettings?.dhuhr?.jamaat || '13:30'
  );
  const [dhuhrOffset, setDhuhrOffset] = useState<number>(currentMosque?.prayerSettings?.dhuhr?.manualOffset || 0);

  const [asrAdhan, setAsrAdhan] = useState(
    currentMosque?.prayerSettings?.asr?.adhan || currentMosque?.jamaatSettings?.asr?.azan || 'Auto'
  );
  const [asrJamaat, setAsrJamaat] = useState(
    currentMosque?.prayerSettings?.asr?.jamaat || currentMosque?.jamaatSettings?.asr?.jamaat || '16:45'
  );
  const [asrOffset, setAsrOffset] = useState<number>(currentMosque?.prayerSettings?.asr?.manualOffset || 0);

  const [maghribAdhan, setMaghribAdhan] = useState(
    currentMosque?.prayerSettings?.maghrib?.adhan || currentMosque?.jamaatSettings?.maghrib?.azan || 'Auto'
  );
  const [maghribJamaat, setMaghribJamaat] = useState(
    currentMosque?.prayerSettings?.maghrib?.jamaat || currentMosque?.jamaatSettings?.maghrib?.jamaat || '18:35'
  );
  const [maghribOffset, setMaghribOffset] = useState<number>(
    currentMosque?.prayerSettings?.maghrib?.manualOffset || 0
  );

  const [ishaAdhan, setIshaAdhan] = useState(
    currentMosque?.prayerSettings?.isha?.adhan || currentMosque?.jamaatSettings?.isha?.azan || 'Auto'
  );
  const [ishaJamaat, setIshaJamaat] = useState(
    currentMosque?.prayerSettings?.isha?.jamaat || currentMosque?.jamaatSettings?.isha?.jamaat || '20:00'
  );
  const [ishaOffset, setIshaOffset] = useState<number>(currentMosque?.prayerSettings?.isha?.manualOffset || 0);

  const [jumuahAdhan, setJumuahAdhan] = useState(
    currentMosque?.prayerSettings?.jumuah?.adhan || currentMosque?.jamaatSettings?.jumuah?.azan || '12:30'
  );
  const [jumuahKhutbah, setJumuahKhutbah] = useState(
    currentMosque?.prayerSettings?.jumuah?.khutbah || currentMosque?.jamaatSettings?.jumuah?.khutbah || '13:00'
  );
  const [jumuahJamaat, setJumuahJamaat] = useState(
    currentMosque?.prayerSettings?.jumuah?.jamaat || currentMosque?.jamaatSettings?.jumuah?.jamaat || '13:30'
  );

  // UI / Action States
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationChangedWarning, setLocationChangedWarning] = useState<boolean>(false);

  // Available districts for current division
  const availableDistricts = useMemo(() => {
    return getDistrictsByDivision(division);
  }, [division]);

  // Available upazilas for current district
  const availableUpazilas = useMemo(() => {
    return getUpazilasByDistrict(district);
  }, [district]);

  // Handle Division Change
  const handleDivisionChange = (newDivisionId: string) => {
    setDivision(newDivisionId);
    const districtsInDiv = getDistrictsByDivision(newDivisionId);
    if (districtsInDiv.length > 0) {
      const firstDistrict = districtsInDiv[0];
      setDistrict(firstDistrict.nameBn);
      setLatitude(String(firstDistrict.lat));
      setLongitude(String(firstDistrict.lng));
      const upzList = firstDistrict.upazilas;
      setUpazila(upzList.length > 0 ? upzList[0] : '');
    }
    setLocationChangedWarning(true);
  };

  // Handle District Change
  const handleDistrictChange = (newDistrictNameBn: string) => {
    setDistrict(newDistrictNameBn);
    const districtGeo = findDistrict(newDistrictNameBn);
    if (districtGeo) {
      setLatitude(String(districtGeo.lat));
      setLongitude(String(districtGeo.lng));
      setDivision(districtGeo.divisionId);
      const upzList = districtGeo.upazilas;
      setUpazila(upzList.length > 0 ? upzList[0] : '');
    }
    setLocationChangedWarning(true);
  };

  // Handle Upazila Change
  const handleUpazilaChange = (newUpazila: string) => {
    setUpazila(newUpazila);
    setLocationChangedWarning(true);
  };

  // Live preview calculations based on current inputs
  const parsedLat = parseFloat(latitude) || 23.8103;
  const parsedLng = parseFloat(longitude) || 90.4125;

  const liveCalculatedTimes = useMemo(() => {
    const today = new Date();
    return calculateHanafiDailyTimes(today, {
      districtName: district,
      latitude: parsedLat,
      longitude: parsedLng,
      madhab: madhab === 'HANAFI' ? 'HANAFI' : 'SHAFI_MALIKI_HANBALI',
      fajrAngle,
      ishaAngle,
      ishraqOffsetMins: ishraqOffsetMinutes,
      forbiddenSunriseMins: sunriseForbiddenMins,
      forbiddenSolarNoonMins: zawalForbiddenMins,
      forbiddenSunsetMins: sunsetForbiddenMins,
    });
  }, [
    district,
    parsedLat,
    parsedLng,
    madhab,
    fajrAngle,
    ishaAngle,
    ishraqOffsetMinutes,
    sunriseForbiddenMins,
    zawalForbiddenMins,
    sunsetForbiddenMins,
  ]);

  // Handle Submit & Validation
  const handleSaveSettings = async () => {
    if (!canEdit) return;

    // Validate Latitude & Longitude
    const numLat = parseFloat(latitude);
    const numLng = parseFloat(longitude);

    if (isNaN(numLat) || numLat < -90 || numLat > 90) {
      setErrorMessage('অক্ষাংশ (Latitude) অবশ্যই -90 থেকে +90 এর মধ্যে হতে হবে।');
      return;
    }
    if (isNaN(numLng) || numLng < -180 || numLng > 180) {
      setErrorMessage('দ্রাঘিমাংশ (Longitude) অবশ্যই -180 থেকে +180 এর মধ্যে হতে হবে।');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    try {
      const updatedPrayerSettings: MosquePrayerSettings = {
        division,
        district,
        upazila,
        area,
        latitude: numLat,
        longitude: numLng,
        timezone: 'Asia/Dhaka',
        madhab,
        calculationMethod,
        fajrAngle: Number(fajrAngle) || 18,
        ishaAngle: Number(ishaAngle) || 18,
        ishraqOffsetMinutes: Number(ishraqOffsetMinutes) || 10,
        tahajjudMode,
        sunriseForbiddenDurationMinutes: Number(sunriseForbiddenMins) || 12,
        zawalForbiddenDurationMinutes: Number(zawalForbiddenMins) || 10,
        sunsetForbiddenDurationMinutes: Number(sunsetForbiddenMins) || 15,
        warningThresholdMinutes: 10,
        fajr: { adhan: fajrAdhan, jamaat: fajrJamaat, manualOffset: Number(fajrOffset) || 0 },
        dhuhr: { adhan: dhuhrAdhan, jamaat: dhuhrJamaat, manualOffset: Number(dhuhrOffset) || 0 },
        asr: { adhan: asrAdhan, jamaat: asrJamaat, manualOffset: Number(asrOffset) || 0 },
        maghrib: { adhan: maghribAdhan, jamaat: maghribJamaat, manualOffset: Number(maghribOffset) || 0 },
        isha: { adhan: ishaAdhan, jamaat: ishaJamaat, manualOffset: Number(ishaOffset) || 0 },
        jumuah: { adhan: jumuahAdhan, khutbah: jumuahKhutbah, jamaat: jumuahJamaat },
      };

      const updatedJamaatSettings = {
        fajr: { azan: fajrAdhan, jamaat: fajrJamaat },
        dhuhr: { azan: dhuhrAdhan, jamaat: dhuhrJamaat },
        asr: { azan: asrAdhan, jamaat: asrJamaat },
        maghrib: { azan: maghribAdhan, jamaat: maghribJamaat },
        isha: { azan: ishaAdhan, jamaat: ishaJamaat },
        jumuah: { azan: jumuahAdhan, khutbah: jumuahKhutbah, jamaat: jumuahJamaat },
      };

      const payload: Partial<Mosque> = {
        division,
        district,
        upazila,
        union: area,
        latitude: numLat,
        longitude: numLng,
        prayerSettings: updatedPrayerSettings,
        jamaatSettings: updatedJamaatSettings,
      };

      if (onSave) {
        await onSave(payload);
      }

      setSaveSuccessMsg('মসজিদের অবস্থান এবং হানাফি নামাজের সময়সূচী সফলভাবে সংরক্ষিত হয়েছে।');
      setLocationChangedWarning(false);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Audit info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {language === 'bn'
                  ? '📍 মসজিদের অবস্থান ও হানাফি নামাজের সময়সূচি কনফিগারেশন'
                  : 'Mosque Location & Hanafi Prayer Times Settings'}
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                Hanafi Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {language === 'bn'
                ? 'বাংলাদেশের ৬৪ জেলা ও জিপিএস স্থানাঙ্ক অনুযায়ী হানাফি আসর (Shadow Factor 2), জাওয়াল, ইশরাক, তাহাজ্জুদ ও ৩টি নিষিদ্ধ সময়ের সঠিক হিসাব ব্যবস্থা।'
                : 'Exact astronomical calculation engine tailored for Bangladesh with Hanafi Asr 2x, Local Solar Noon, Ishraq and Forbidden times.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {canEdit && (
          <button
            id="btn-save-location-prayer-settings"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-colors cursor-pointer shrink-0"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>পরিবর্তন সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Notifications */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {locationChangedWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            ⚠️ মসজিদের অবস্থান পরিবর্তন করা হয়েছে। নামাজের সময়সূচী নতুন স্থানাঙ্ক অনুযায়ী পুনরায় হিসাব করা হচ্ছে। পরিবর্তন চূড়ান্ত করতে সংরক্ষণ বাটনে ক্লিক করুন।
          </span>
        </div>
      )}

      {/* 1. SECTION: MOSQUE LOCATION & GPS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              ১. মসজিদের ভৌগোলিক অবস্থান ও স্থানাঙ্ক (Mosque Location & GPS Coordinates)
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            Timezone: Asia/Dhaka (UTC+06:00)
          </span>
        </div>

        {/* Cascading Dropdowns: Division -> District -> Upazila -> Area */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Division */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              বিভাগ (Division) <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-mosque-division"
              value={division}
              disabled={!canEdit}
              onChange={(e) => handleDivisionChange(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            >
              {BANGLADESH_DIVISIONS.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.nameBn} ({div.nameEn})
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              জেলা (District) <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-mosque-district"
              value={district}
              disabled={!canEdit}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            >
              {availableDistricts.map((dist) => (
                <option key={dist.id} value={dist.nameBn}>
                  {dist.nameBn} ({dist.nameEn})
                </option>
              ))}
            </select>
          </div>

          {/* Upazila / Thana */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              উপজেলা / থানা (Upazila/Thana)
            </label>
            <select
              id="select-mosque-upazila"
              value={upazila}
              disabled={!canEdit}
              onChange={(e) => handleUpazilaChange(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            >
              <option value="">-- নির্বাচন করুন / সদর --</option>
              {availableUpazilas.map((upz) => (
                <option key={upz} value={upz}>
                  {upz}
                </option>
              ))}
            </select>
          </div>

          {/* Area / Union */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ইউনিয়ন / এলাকা / গ্রাম (Area/Village)
            </label>
            <input
              id="input-mosque-area"
              type="text"
              value={area}
              disabled={!canEdit}
              onChange={(e) => {
                setArea(e.target.value);
                setLocationChangedWarning(true);
              }}
              placeholder="যেমন: পৌরসভা / ওয়ার্ড নং ০৪"
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Latitude & Longitude Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              অক্ষাংশ (Latitude) <span className="text-slate-400 font-normal">(-90 to +90)</span>
            </label>
            <input
              id="input-mosque-latitude"
              type="number"
              step="0.000001"
              value={latitude}
              disabled={!canEdit}
              onChange={(e) => {
                setLatitude(e.target.value);
                setLocationChangedWarning(true);
              }}
              className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              দ্রাঘিমাংশ (Longitude) <span className="text-slate-400 font-normal">(-180 to +180)</span>
            </label>
            <input
              id="input-mosque-longitude"
              type="number"
              step="0.000001"
              value={longitude}
              disabled={!canEdit}
              onChange={(e) => {
                setLongitude(e.target.value);
                setLocationChangedWarning(true);
              }}
              className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              টাইমজোন (সময় অঞ্চল)
            </label>
            <div className="text-xs font-mono font-bold px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 flex items-center justify-between">
              <span>Asia/Dhaka</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-sans">
                UTC +06:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECTION: MADHHAB & CALCULATION PARAMETERS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              ২. মাজহাব ও জ্যোতির্বৈজ্ঞানিক হিসাব পদ্ধতি (Madhhab & Astronomical Parameters)
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Hanafi Standard (Shadow Factor 2)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Madhhab Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              মাজহাব নির্বাচন (Madhhab)
            </label>
            <select
              id="select-mosque-madhab"
              value={madhab}
              disabled={!canEdit}
              onChange={(e) => setMadhab(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            >
              <option value="HANAFI">হানাফি — দ্বিগুণ ছায়া পদ্ধতি (Shadow Factor 2)</option>
              <option value="STANDARD">শাফেয়ী / মালেকী / হাম্বলী (Shadow Factor 1)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              বাংলাদেশে হানাফি মাজহাব অনুযায়ী আসরের ওয়াক্ত শুরু হয় বস্তুর ছায়া মূল ছায়া বাদে দ্বিগুণের বেশি হলে।
            </p>
          </div>

          {/* Calculation Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              হিসাব পদ্ধতি (Calculation Method)
            </label>
            <select
              id="select-calculation-method"
              value={calculationMethod}
              disabled={!canEdit}
              onChange={(e) => setCalculationMethod(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            >
              <option value="ISLAMIC_FOUNDATION_BD">ইসলামিক ফাউন্ডেশন বাংলাদেশ (১৮° / ১৮°)</option>
              <option value="HANAFI_KARACHI">করাচি ইসলামিক সাইন্সেস বিশ্ববিদ্যালয় (১৮° / ১৮°)</option>
              <option value="MWL">মুসলিম ওয়ার্ল্ড লীগ (MWL - ১৮° / ১৭°)</option>
              <option value="MEKKA">উম্ম আল-কুরা, মক্কা (Umm Al-Qura)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              বাংলাদেশ ইসলামিক ফাউন্ডেশন কর্তৃক অনুমোদিত ১৮ ডিগ্রি কোণ মানদণ্ড।
            </p>
          </div>

          {/* Tahajjud Calculation Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              তাহাজ্জুদ সময়সীমা পদ্ধতি (Tahajjud Mode)
            </label>
            <select
              id="select-tahajjud-mode"
              value={tahajjudMode}
              disabled={!canEdit}
              onChange={(e) => setTahajjudMode(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            >
              <option value="LAST_THIRD">রাতের শেষ এক-তৃতীয়াংশ (Last Third of Night — সুন্নাহ পদ্ধতি)</option>
              <option value="MIDNIGHT_TO_FAJR">মধ্যরাত থেকে ফজর পর্যন্ত (Midnight to Fajr)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              সূর্যাস্ত থেকে ফজর পর্যন্ত মোট রাত্রিকালের শেষ তৃতীয়াংশ হিসাব করে তাহাজ্জুদের উত্তম সময় নির্ধারিত হয়।
            </p>
          </div>
        </div>

        {/* Angles & Intervals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ফজর কোণ (Fajr Angle)
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                step="0.5"
                value={fajrAngle}
                disabled={!canEdit}
                onChange={(e) => setFajrAngle(parseFloat(e.target.value) || 18)}
                className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-500">°</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              এশা কোণ (Isha Angle)
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                step="0.5"
                value={ishaAngle}
                disabled={!canEdit}
                onChange={(e) => setIshaAngle(parseFloat(e.target.value) || 18)}
                className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-500">°</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ইশরাক অফসেট (সূর্যোদয়ের পর)
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                value={ishraqOffsetMinutes}
                disabled={!canEdit}
                onChange={(e) => setIshraqOffsetMinutes(parseInt(e.target.value, 10) || 10)}
                className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-500">মি.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              জাওয়াল নিষিদ্ধ সময়
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                value={zawalForbiddenMins}
                disabled={!canEdit}
                onChange={(e) => setZawalForbiddenMins(parseInt(e.target.value, 10) || 10)}
                className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-500">মি.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION: MOSQUE ADHAN & JAMAAT SCHEDULE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">
              ৩. মসজিদ আজান ও জামাত সময়সূচি (Mosque Adhan & Jamaat Schedule)
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            ওয়াক্ত শুরু বনাম জামাত সময় পৃথকীকরণ
          </span>
        </div>

        {/* 5 Daily Prayers Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-3.5">ওয়াক্ত (Prayer)</th>
                <th className="p-3.5">জ্যোতির্বৈজ্ঞানিক ওয়াক্ত শুরু</th>
                <th className="p-3.5">আজানের সময়</th>
                <th className="p-3.5">মসজিদ জামাতের সময় (২৪-ঘণ্টা)</th>
                <th className="p-3.5">ওয়াক্ত শেষ</th>
                <th className="p-3.5">ম্যানুয়াল সমন্বয় (মিনিট)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {/* FAJR */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3.5 font-bold flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>ফজর (Fajr)</span>
                </td>
                <td className="p-3.5 font-mono text-emerald-700 font-bold">
                  {formatMinutesTo24h(liveCalculatedTimes.fajrMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={fajrAdhan}
                    disabled={!canEdit}
                    onChange={(e) => setFajrAdhan(e.target.value)}
                    placeholder="Auto বা 05:00"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                  />
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={fajrJamaat}
                    disabled={!canEdit}
                    onChange={(e) => setFajrJamaat(e.target.value)}
                    placeholder="05:15"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-bold text-purple-700 rounded-lg border border-purple-300 bg-purple-50/50"
                  />
                </td>
                <td className="p-3.5 font-mono text-slate-500">
                  {formatMinutesTo24h(liveCalculatedTimes.sunriseMin)} (সূর্যোদয়)
                </td>
                <td className="p-3.5">
                  <input
                    type="number"
                    value={fajrOffset}
                    disabled={!canEdit}
                    onChange={(e) => setFajrOffset(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-1 text-xs text-center font-mono rounded border border-slate-200 bg-white"
                  />
                </td>
              </tr>

              {/* DHUHR */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3.5 font-bold flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>যোহর (Dhuhr)</span>
                </td>
                <td className="p-3.5 font-mono text-emerald-700 font-bold">
                  {formatMinutesTo24h(liveCalculatedTimes.dhuhrMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={dhuhrAdhan}
                    disabled={!canEdit}
                    onChange={(e) => setDhuhrAdhan(e.target.value)}
                    placeholder="Auto বা 13:15"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                  />
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={dhuhrJamaat}
                    disabled={!canEdit}
                    onChange={(e) => setDhuhrJamaat(e.target.value)}
                    placeholder="13:30"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-bold text-purple-700 rounded-lg border border-purple-300 bg-purple-50/50"
                  />
                </td>
                <td className="p-3.5 font-mono text-slate-500">
                  {formatMinutesTo24h(liveCalculatedTimes.asrMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="number"
                    value={dhuhrOffset}
                    disabled={!canEdit}
                    onChange={(e) => setDhuhrOffset(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-1 text-xs text-center font-mono rounded border border-slate-200 bg-white"
                  />
                </td>
              </tr>

              {/* ASR */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3.5 font-bold flex items-center gap-2">
                  <Sun className="w-4 h-4 text-orange-500" />
                  <span>আসর (Asr - Hanafi 2x)</span>
                </td>
                <td className="p-3.5 font-mono text-emerald-700 font-bold">
                  {formatMinutesTo24h(liveCalculatedTimes.asrMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={asrAdhan}
                    disabled={!canEdit}
                    onChange={(e) => setAsrAdhan(e.target.value)}
                    placeholder="Auto বা 16:45"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                  />
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={asrJamaat}
                    disabled={!canEdit}
                    onChange={(e) => setAsrJamaat(e.target.value)}
                    placeholder="16:50"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-bold text-purple-700 rounded-lg border border-purple-300 bg-purple-50/50"
                  />
                </td>
                <td className="p-3.5 font-mono text-slate-500">
                  {formatMinutesTo24h(liveCalculatedTimes.sunsetMin)} (সূর্যাস্ত)
                </td>
                <td className="p-3.5">
                  <input
                    type="number"
                    value={asrOffset}
                    disabled={!canEdit}
                    onChange={(e) => setAsrOffset(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-1 text-xs text-center font-mono rounded border border-slate-200 bg-white"
                  />
                </td>
              </tr>

              {/* MAGHRIB */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3.5 font-bold flex items-center gap-2">
                  <Sunset className="w-4 h-4 text-rose-500" />
                  <span>মাগরিব (Maghrib)</span>
                </td>
                <td className="p-3.5 font-mono text-emerald-700 font-bold">
                  {formatMinutesTo24h(liveCalculatedTimes.maghribMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={maghribAdhan}
                    disabled={!canEdit}
                    onChange={(e) => setMaghribAdhan(e.target.value)}
                    placeholder="Auto বা 18:30"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                  />
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={maghribJamaat}
                    disabled={!canEdit}
                    onChange={(e) => setMaghribJamaat(e.target.value)}
                    placeholder="18:35"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-bold text-purple-700 rounded-lg border border-purple-300 bg-purple-50/50"
                  />
                </td>
                <td className="p-3.5 font-mono text-slate-500">
                  {formatMinutesTo24h(liveCalculatedTimes.ishaMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="number"
                    value={maghribOffset}
                    disabled={!canEdit}
                    onChange={(e) => setMaghribOffset(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-1 text-xs text-center font-mono rounded border border-slate-200 bg-white"
                  />
                </td>
              </tr>

              {/* ISHA */}
              <tr className="hover:bg-slate-50/70">
                <td className="p-3.5 font-bold flex items-center gap-2">
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span>এশা (Isha)</span>
                </td>
                <td className="p-3.5 font-mono text-emerald-700 font-bold">
                  {formatMinutesTo24h(liveCalculatedTimes.ishaMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={ishaAdhan}
                    disabled={!canEdit}
                    onChange={(e) => setIshaAdhan(e.target.value)}
                    placeholder="Auto বা 19:45"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                  />
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={ishaJamaat}
                    disabled={!canEdit}
                    onChange={(e) => setIshaJamaat(e.target.value)}
                    placeholder="20:00"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-bold text-purple-700 rounded-lg border border-purple-300 bg-purple-50/50"
                  />
                </td>
                <td className="p-3.5 font-mono text-slate-500">
                  {formatMinutesTo24h(liveCalculatedTimes.fajrMin)} (ফজর শুরু)
                </td>
                <td className="p-3.5">
                  <input
                    type="number"
                    value={ishaOffset}
                    disabled={!canEdit}
                    onChange={(e) => setIshaOffset(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-1 text-xs text-center font-mono rounded border border-slate-200 bg-white"
                  />
                </td>
              </tr>

              {/* JUMUAH */}
              <tr className="bg-purple-50/30">
                <td className="p-3.5 font-bold flex items-center gap-2 text-purple-900">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>জুমুআ (Jumu'ah - শুক্রবার)</span>
                </td>
                <td className="p-3.5 font-mono text-purple-700 font-bold">
                  {formatMinutesTo24h(liveCalculatedTimes.dhuhrMin)}
                </td>
                <td className="p-3.5">
                  <input
                    type="text"
                    value={jumuahAdhan}
                    disabled={!canEdit}
                    onChange={(e) => setJumuahAdhan(e.target.value)}
                    placeholder="12:30"
                    className="w-24 px-2 py-1.5 font-mono text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                  />
                </td>
                <td className="p-3.5 flex items-center gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">খুতবা:</span>
                    <input
                      type="text"
                      value={jumuahKhutbah}
                      disabled={!canEdit}
                      onChange={(e) => setJumuahKhutbah(e.target.value)}
                      placeholder="13:00"
                      className="w-20 px-1.5 py-1 font-mono text-xs rounded border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-700 font-bold block">জামাত:</span>
                    <input
                      type="text"
                      value={jumuahJamaat}
                      disabled={!canEdit}
                      onChange={(e) => setJumuahJamaat(e.target.value)}
                      placeholder="13:30"
                      className="w-20 px-1.5 py-1 font-mono text-xs font-bold text-purple-700 rounded border border-purple-300 bg-purple-50"
                    />
                  </div>
                </td>
                <td className="p-3.5 font-mono text-slate-500">
                  {formatMinutesTo24h(liveCalculatedTimes.asrMin)}
                </td>
                <td className="p-3.5 text-center text-slate-400 font-mono">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. ASTRONOMICAL SOLAR MARKS & FORBIDDEN TIMES PREVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50/90 border border-slate-200 text-xs">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-slate-500 text-[11px] block">সূর্যোদয় (Sunrise)</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {formatMinutesTo24h(liveCalculatedTimes.sunriseMin)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-slate-500 text-[11px] block">ইশরাক শুরু (Ishraq)</span>
            <span className="font-mono font-bold text-emerald-700 text-sm">
              {formatMinutesTo24h(liveCalculatedTimes.ishraqMin)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-slate-500 text-[11px] block">সোলার নুন / জাওয়াল (Zawal)</span>
            <span className="font-mono font-bold text-amber-700 text-sm">
              {formatMinutesTo24h(liveCalculatedTimes.solarNoonMin)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-slate-500 text-[11px] block">সূর্যাস্ত / ইফতার (Sunset)</span>
            <span className="font-mono font-bold text-rose-700 text-sm">
              {formatMinutesTo24h(liveCalculatedTimes.sunsetMin)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
            <span className="text-slate-500 text-[11px] block">তাহাজ্জুদ শেষ (Tahajjud End)</span>
            <span className="font-mono font-bold text-indigo-700 text-sm">
              {formatMinutesTo24h(liveCalculatedTimes.tahajjudEndMin)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

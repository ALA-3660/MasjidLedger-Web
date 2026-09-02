import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Sun,
  Moon,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Tv,
  Printer,
  Compass,
} from 'lucide-react';
import { Mosque } from '../types';
import {
  calculateLiveWaqt,
  formatDurationDigital,
  WaqtStatus,
} from '../lib/prayerEngine';
import { Language } from '../lib/i18n';

interface DashboardPrayerWidgetProps {
  mosque?: Mosque | null;
  language?: Language;
  onNavigateToPrayerTimes?: () => void;
  onOpenDisplayScreen?: () => void;
  onOpenPrintSchedule?: () => void;
}

export const DashboardPrayerWidget: React.FC<DashboardPrayerWidgetProps> = ({
  mosque,
  language = 'bn',
  onNavigateToPrayerTimes,
  onOpenDisplayScreen,
  onOpenPrintSchedule,
}) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const waqtStatus: WaqtStatus = useMemo(() => {
    return calculateLiveWaqt(now, null, {
      district: mosque?.prayerSettings?.district || mosque?.district || 'ঢাকা',
      latitude: mosque?.latitude,
      longitude: mosque?.longitude,
      jamaatSettings: mosque?.jamaatSettings,
      prayerSettings: mosque?.prayerSettings,
    });
  }, [now, mosque]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 font-siliguri">
      {/* Top row: Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">
                {language === 'bn' ? 'দৈনিক নামাজের সময়সূচি ও লাইভ ওয়াক্ত' : 'Daily Prayer & Live Waqt'}
              </h3>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold px-2 py-0.5 rounded-full">
                BST UTC+6
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {mosque?.district || 'ঢাকা'} জেলা ভিত্তিক হানাফি ক্যালেন্ডার | {waqtStatus.hijriDateBn}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenDisplayScreen && (
            <button
              type="button"
              onClick={onOpenDisplayScreen}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
              title="মসজিদের ডিজিটাল ডিসপ্লে"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>ডিসপ্লে</span>
            </button>
          )}

          {onOpenPrintSchedule && (
            <button
              type="button"
              onClick={onOpenPrintSchedule}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
              title="সময়সূচি প্রিন্ট"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>
          )}

          {onNavigateToPrayerTimes && (
            <button
              type="button"
              onClick={onNavigateToPrayerTimes}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
            >
              <span>বিস্তারিত সময়সূচি</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Forbidden Alert Banner (if active) */}
      {waqtStatus.isForbiddenNow && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 text-xs font-bold animate-pulse">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>⚠️ {waqtStatus.forbiddenReasonBn}</span>
        </div>
      )}

      {/* Hero Dynamic Status Ribbon */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{waqtStatus.isWaqtActive ? `${waqtStatus.currentWaqtBn}-এর ওয়াক্ত চলছে` : 'ইশরাকের সময়'}</span>
            </span>
            <span className="text-slate-400 text-xs">|</span>
            <span className="text-xs text-slate-300 font-mono">
              ঘড়ি: <strong className="text-white font-bold">{waqtStatus.currentTime24}</strong>
            </span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white">
            {waqtStatus.dynamicStatusMessageBn}
          </h4>
          {waqtStatus.dynamicSubMessageBn && (
            <p className="text-xs text-slate-300">
              {waqtStatus.dynamicSubMessageBn}
            </p>
          )}
        </div>

        {/* Next Waqt Countdown Box */}
        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center shrink-0">
          <span className="text-[11px] text-indigo-200 block font-medium">
            পরবর্তী নামাজ: {waqtStatus.nextWaqtBn}
          </span>
          <div className="text-xl font-black text-emerald-300 font-mono tracking-wider">
            {formatDurationDigital(waqtStatus.nextWaqtStartsInSeconds, true)}
          </div>
          <span className="text-[10px] text-slate-300">
            ({waqtStatus.nextWaqtStartsInStrBn} বাকি)
          </span>
        </div>
      </div>

      {/* 5 Daily Prayers Mini Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {waqtStatus.prayerList.map((p) => {
          const isCurrent = p.key === waqtStatus.currentWaqtKey;
          const isNext = p.key === waqtStatus.nextWaqtKey;

          return (
            <div
              key={p.key}
              className={`p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-emerald-50 border-emerald-300 shadow-2xs'
                  : isNext
                  ? 'bg-blue-50/70 border-blue-200'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{p.nameBn}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                    isCurrent
                      ? 'bg-emerald-200 text-emerald-900'
                      : isNext
                      ? 'bg-blue-200 text-blue-900'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {p.statusBn}
                </span>
              </div>

              <div className="mt-2 space-y-0.5">
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>আজান:</span>
                  <span className="font-mono font-semibold text-slate-800">{p.adhan}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-900 font-bold">
                  <span>জামাত:</span>
                  <span className="font-mono text-emerald-800">{p.jamaat}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Special Times Strip (Tahajjud, Ishraq, Sunrise, Sunset) */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
        <div className="flex items-center space-x-1.5">
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
          <span>তাহাজ্জুদ শেষ: <strong className="text-slate-800 font-mono">{waqtStatus.tahajjudEndTimeStr}</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>সূর্যোদয়: <strong className="text-slate-800 font-mono">{waqtStatus.sunriseTimeStr}</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>ইশরাক: <strong className="text-slate-800 font-mono">{waqtStatus.ishraqTimeStr}</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-500" />
          <span>ঠিক দুপুর: <strong className="text-slate-800 font-mono">{waqtStatus.solarNoonTimeStr}</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Sun className="w-3.5 h-3.5 text-rose-500" />
          <span>সূর্যাস্ত/ইফতার: <strong className="text-slate-800 font-mono">{waqtStatus.sunsetTimeStr}</strong></span>
        </div>
      </div>
    </div>
  );
};

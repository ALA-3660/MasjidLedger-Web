import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, MoreVertical, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Language } from '../../lib/i18n';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sidebar';
  language?: Language;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  language = 'bn',
}) => {
  const { isInstallable, isInstalled, isIOS, isMobileDevice, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Never show install prompt when already running as an installed standalone PWA / APK
  if (isInstalled) {
    return null;
  }

  // Show button whenever native prompt is ready, on iOS Safari, or on any mobile browser
  // (and always in sidebar so users can easily install on desktop or mobile)
  const shouldRender = isInstallable || isIOS || isMobileDevice || variant === 'sidebar';
  if (!shouldRender) {
    return null;
  }

  const isBn = language === 'bn';

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
        return;
      }
      if (outcome === 'dismissed') return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'navbar' ? (
        <button
          id="btn-pwa-install-navbar"
          type="button"
          onClick={handleClick}
          className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-300/80 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold font-siliguri shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
          title={isBn ? 'হোম স্ক্রিনে মসজিদ লেজার অ্যাপ ইনস্টল করুন' : 'Install Masjid Ledger App'}
        >
          {installSuccess ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
          ) : (
            <Download className="w-3.5 h-3.5 text-slate-900" />
          )}
          <span className="font-siliguri">
            {isBn ? 'অ্যাপ ইনস্টল করুন' : 'Install App'}
          </span>
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white border border-emerald-600/60 shadow-sm font-siliguri">
          <div className="flex items-center space-x-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-white/15 text-amber-300">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">
                {isBn ? 'মোবাইল অ্যাপ ইনস্টল' : 'Install Mobile App'}
              </div>
              <div className="text-[10px] text-emerald-100/85">
                {isBn ? 'ফুল-স্ক্রিন ও অফলাইন সাপোর্ট' : 'Full-screen & Offline ready'}
              </div>
            </div>
          </div>
          <button
            id="btn-pwa-install-sidebar"
            type="button"
            onClick={handleClick}
            className="w-full mt-1.5 py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isBn ? 'অ্যাপ ইনস্টল করুন' : 'Install App'}</span>
          </button>
        </div>
      )}

      {/* Guided Installation Modal (iOS Safari or manual Chrome/Edge fallback) */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 font-siliguri"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-emerald-200 shadow-2xl w-full max-w-sm p-5 text-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <img
                  src="/pwa-192x192.png"
                  alt="মসজিদ লেজার"
                  className="w-11 h-11 rounded-xl border border-emerald-200 shadow-xs"
                />
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    {isBn ? 'মসজিদ লেজার অ্যাপ ইনস্টল করুন' : 'Install Masjid Ledger'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isIOS
                      ? isBn
                        ? 'iPhone / iPad (Safari নির্দেশিকা)'
                        : 'iPhone / iPad Safari Guide'
                      : isBn
                      ? 'Android / ব্রাউজার হোম স্ক্রিন নির্দেশিকা'
                      : 'Android / Browser Install Guide'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-slate-700 bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">১</span>
                  <span>
                    Safari ব্রাউজারের নিচের বারে থাকা{' '}
                    <strong className="inline-flex items-center gap-0.5 text-emerald-900">
                      <Share className="w-3.5 h-3.5 inline" /> Share
                    </strong>{' '}
                    বাটনে ট্যাপ করুন।
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">২</span>
                  <span>
                    নিচে স্ক্রল করে{' '}
                    <strong className="inline-flex items-center gap-0.5 text-emerald-900">
                      <PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen
                    </strong>{' '}
                    অপশনটি সিলেক্ট করুন।
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">৩</span>
                  <span>উপরে ডানপাশে <strong>Add</strong> বাটনে ট্যাপ করলেই অ্যাপটি হোম স্ক্রিনে যুক্ত হয়ে যাবে।</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-slate-700 bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">১</span>
                  <span>
                    Chrome ব্রাউজারের উপরে ডানপাশে থাকা{' '}
                    <strong className="inline-flex items-center text-emerald-900">
                      <MoreVertical className="w-3.5 h-3.5 inline" /> মেনু (৩ ডট)
                    </strong>{' '}
                    বাটনে ট্যাপ করুন।
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">২</span>
                  <span>
                    <strong>“Install app”</strong> অথবা <strong>“Add to Home screen”</strong> অপশনে ট্যাপ করুন।
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">৩</span>
                  <span>
                    <strong>Install</strong> কনফার্ম করলেই অ্যাড্রেস বার ছাড়া ফুল-স্ক্রিন অ্যাপ হিসেবে চালু হবে।
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
            >
              {isBn ? 'বুঝেছি, বন্ধ করুন' : 'Got it, Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

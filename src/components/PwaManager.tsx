import React, { useState, useEffect } from 'react';
import { Download, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Online / Offline Status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' || true) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg);
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    setHasUpdate(true);
                  }
                }
              };
            }
          };
        })
        .catch((err) => {
          console.debug('[PWA] Service Worker registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleUpdateClick = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  return (
    <>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-amber-900/95 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur flex items-center gap-3 border border-amber-700">
          <WifiOff className="w-6 h-6 text-amber-300 shrink-0 animate-pulse" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">ইন্টারনেট সংযোগ নেই</p>
            <p className="text-xs text-amber-200">নেটওয়ার্ক সংযোগ বিচ্ছিন্ন। আর্থিক লেনদেনের জন্য ইন্টারনেট সংযোগ প্রয়োজন।</p>
          </div>
        </div>
      )}

      {/* PWA Install Button Banner */}
      {isInstallable && (
        <div className="fixed bottom-4 right-4 z-40 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-700 animate-bounce-subtle">
          <div className="bg-emerald-800 p-2 rounded-xl">
            <Download className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="font-bold text-sm">মসজিদলেজার অ্যাপ ইনস্টল করুন</p>
            <p className="text-xs text-emerald-200">দ্রুত এক্সেস ও অফলাইন সাপোর্টের জন্য</p>
          </div>
          <button
            onClick={handleInstallClick}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs transition"
          >
            ইনস্টল
          </button>
        </div>
      )}

      {/* Update Available Banner */}
      {hasUpdate && (
        <div className="fixed top-4 right-4 z-50 bg-blue-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-700">
          <RefreshCw className="w-5 h-5 text-blue-300 animate-spin" />
          <div>
            <p className="font-bold text-sm">নতুন সংস্করণ পাওয়া গেছে</p>
            <p className="text-xs text-blue-200">সর্বশেষ ফিচারের জন্য আপডেট করুন</p>
          </div>
          <button
            onClick={handleUpdateClick}
            className="bg-white hover:bg-slate-100 text-blue-900 font-bold px-3 py-1.5 rounded-xl text-xs transition"
          >
            আপডেট
          </button>
        </div>
      )}
    </>
  );
}

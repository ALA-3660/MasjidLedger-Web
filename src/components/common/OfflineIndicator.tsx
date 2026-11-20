import React, { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setShowReconnected(false);
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-5 left-3 right-3 md:left-5 md:right-auto z-50 flex justify-center md:justify-start pointer-events-none print:hidden font-siliguri">
      {!isOnline ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-amber-600 text-white px-4 py-2.5 text-xs font-bold shadow-xl border border-amber-400/70 max-w-md"
        >
          <span className="p-1.5 rounded-lg bg-white/20 shrink-0">
            <WifiOff className="w-4 h-4" />
          </span>
          <div className="leading-snug">
            <div>অফলাইন মোড — ইন্টারনেট সংযোগ বিচ্ছিন্ন</div>
            <div className="text-[11px] font-normal text-amber-100">
              ক্যাশ করা তথ্য দেখা যাচ্ছে। ইন্টারনেট ফিরে এলে পুনরায় সিঙ্ক হবে।
            </div>
          </div>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-center gap-2 rounded-xl bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-xl border border-emerald-400/60"
        >
          <Wifi className="w-4 h-4 text-emerald-200" />
          <span>ইন্টারনেট সংযোগ পুনরায় যুক্ত হয়েছে (অনলাইন)</span>
        </div>
      )}
    </div>
  );
};

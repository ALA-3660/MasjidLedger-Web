import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  RefreshCw,
  BookOpen,
  Phone,
} from 'lucide-react';
import { api, LibraryOverdueRemindersAiResult } from '../../lib/api';

interface LibraryOverdueReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AI_TIMEOUT_MS = 45_000;

export const LibraryOverdueReminderModal: React.FC<LibraryOverdueReminderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tone, setTone] = useState<'POLITE' | 'FORMAL'>('POLITE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<LibraryOverdueRemindersAiResult | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadReminders = async (selectedTone: 'POLITE' | 'FORMAL' = tone) => {
    setIsLoading(true);
    setErrorMsg('');

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('বকেয়া বইয়ের রিমাইন্ডার ড্রাফট লোড হতে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const res = await Promise.race([
        api.getLibraryOverdueRemindersAi({ tone: selectedTone }),
        timeoutPromise,
      ]);

      setData(res);
      const initialEdits: Record<string, string> = {};
      for (const r of res.reminders) {
        initialEdits[r.issueId] = r.messageBn;
      }
      setEditedMessages(initialEdits);
    } catch (err: any) {
      setErrorMsg(err?.message || 'বই ফেরতের রিমাইন্ডার ড্রাফট তৈরি করা যায়নি।');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReminders(tone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      setErrorMsg('ক্লিপবোর্ডে কপি করা যায়নি। অনুগ্রহ করে ম্যানুয়ালি কপি করুন।');
    }
  };

  return (
    <div className="fixed inset-0 z-[65] overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/25 border border-amber-400/40 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base font-bold font-siliguri">
                AI বই ফেরতের রিমাইন্ডার ড্রাফট (মেয়াদোত্তীর্ণ বই)
              </h3>
              <p className="text-xs text-slate-300 font-tiro">
                সিস্টেম তারিখ অনুযায়ী গণনাকৃত — কেবল কপি করার জন্য খসড়া, স্বয়ংক্রিয় SMS যাবে না
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-amber-900 font-tiro">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>পাঠকের নাম, বইয়ের নাম, ফেরতের তারিখ ও দিনসংখ্যা সম্পূর্ণ সিস্টেম ডাটা থেকে নির্ধারিত।</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tone}
              onChange={(e) => {
                const next = e.target.value as 'POLITE' | 'FORMAL';
                setTone(next);
                loadReminders(next);
              }}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold font-siliguri"
            >
              <option value="POLITE">ভাষা: বিনম্র ও আন্তরিক</option>
              <option value="FORMAL">ভাষা: দাপ্তরিক ও মার্জিত</option>
            </select>
            <button
              type="button"
              onClick={() => loadReminders(tone)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold font-siliguri flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>হালনাগাদ</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading && (
            <div className="py-12 text-center space-y-2.5">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800 font-siliguri">
                মেয়াদোত্তীর্ণ বই যাচাই ও বিনম্র বাংলা রিমাইন্ডার ড্রাফট প্রস্তুত হচ্ছে...
              </p>
            </div>
          )}

          {!isLoading && errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold font-siliguri">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => loadReminders(tone)}
                  className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold font-siliguri"
                >
                  আবার চেষ্টা করুন
                </button>
              </div>
            </div>
          )}

          {!isLoading && data && (
            <>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-emerald-950 font-tiro">{data.summaryBn}</p>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs font-bold text-emerald-800 font-baloo">
                  মেয়াদোত্তীর্ণ: {data.overdueCount}টি
                </span>
              </div>

              {data.reminders.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                  <BookOpen className="w-9 h-9 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800 font-siliguri">
                    বর্তমানে কোনো মেয়াদোত্তীর্ণ বই নেই
                  </p>
                  <p className="text-xs text-slate-500 font-tiro">
                    নির্ধারিত ফেরতের তারিখ পার হয়ে গেলে সেই বইগুলোর জন্য এখানে বিনম্র রিমাইন্ডার খসড়া তৈরি হবে।
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.reminders.map((item) => {
                    const currentDraft = editedMessages[item.issueId] ?? item.messageBn;
                    return (
                      <div
                        key={item.issueId}
                        className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 font-siliguri">
                                {item.readerName}
                              </h4>
                              {item.readerPhone && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-baloo text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  <Phone className="w-3 h-3" /> {item.readerPhone}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold font-baloo bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                                <Clock className="w-3 h-3" /> {item.daysOverdue} দিন বিলম্বিত
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-tiro mt-0.5">
                              বই: <strong className="text-slate-900">{item.bookTitle}</strong>
                              {item.bookCopyCode ? ` (${item.bookCopyCode})` : ''} • নির্ধারিত ফেরত:{' '}
                              <span className="font-baloo font-bold text-rose-700">{item.dueDateBn}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopy(`full-${item.issueId}`, currentDraft)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-siliguri flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === `full-${item.issueId}` ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedId === `full-${item.issueId}` ? 'কপি হয়েছে' : 'বার্তা কপি'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(`sms-${item.issueId}`, item.shortSmsBn)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold font-siliguri flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === `sms-${item.issueId}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>SMS কপি</span>
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={3}
                          value={currentDraft}
                          onChange={(e) =>
                            setEditedMessages((prev) => ({ ...prev, [item.issueId]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-tiro text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-tiro">
            কোনো মেসেজ বা SMS স্বয়ংক্রিয়ভাবে পাঠানো হয় না — যাচাই করে কপি করে পাঠান।
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold font-siliguri"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

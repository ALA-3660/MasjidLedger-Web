import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../lib/api';

interface PublicPortalAiAssistantWidgetProps {
  mosqueIdOrCode?: string;
  mosqueNameBn: string;
}

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  refused?: boolean;
  followUps?: string[];
}

const QUICK_QUESTIONS = [
  'আজকের নামাজ ও জুমার সময়সূচি কী?',
  'মসজিদে দান বা সাদাকাহ পাঠানোর মাধ্যম কী?',
  'চলমান উন্নয়ন প্রকল্প ও পাবলিক নোটিশ কী কী?',
  'মসজিদের ঠিকানা ও যোগাযোগের নম্বর কী?',
];

const AI_TIMEOUT_MS = 40_000;

export const PublicPortalAiAssistantWidget: React.FC<PublicPortalAiAssistantWidgetProps> = ({
  mosqueIdOrCode,
  mosqueNameBn,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `আসসালামু আলাইকুম! আমি "${mosqueNameBn}"-এর সীমাবদ্ধ পাবলিক তথ্য সহকারী। আপনি এই মসজিদের অনুমোদিত পাবলিক তথ্য (নামাজের সময়, সাধারণ পরিচিতি, উন্নয়ন কার্যক্রম, দান মাধ্যম বা পাবলিক নোটিশ) সম্পর্কে প্রশ্ন করতে পারেন।`,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendQuestion = async (questionText: string) => {
    const cleanQ = questionText.trim();
    if (!cleanQ || isSending) return;

    setErrorMsg('');
    const userMsg: ChatItem = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: cleanQ,
    };
    const nextHistory = [...messages.slice(-4), userMsg].map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('উত্তর পেতে বেশি সময় লাগছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।'));
        }, AI_TIMEOUT_MS);
      });

      const res = await Promise.race([
        api.askPublicPortalAssistantAi({
          mosqueIdOrCode,
          question: cleanQ,
          history: nextHistory.slice(0, -1),
        }),
        timeoutPromise,
      ]);

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.answerBn,
          refused: res.refusedPrivateOrUnavailable,
          followUps: res.suggestedFollowUpsBn,
        },
      ]);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'এই মুহূর্তে AI তথ্য সহকারী উত্তর দিতে পারেনি। অনুগ্রহ করে উপরের পাবলিক পোর্টাল সেকশনগুলো দেখুন।'
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsSending(false);
    }
  };

  return (
    <div className="no-print fixed bottom-5 right-5 z-50 font-siliguri">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white shadow-xl border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span className="text-xs sm:text-sm font-bold">✨ AI তথ্য সহকারী</span>
        </button>
      ) : (
        <div className="w-[340px] sm:w-[390px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-white/15 shrink-0">
                <MessageSquare className="w-4 h-4 text-emerald-200" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold truncate">✨ পাবলিক AI তথ্য সহকারী</h4>
                <p className="text-[10px] text-emerald-200 truncate font-tiro">{mosqueNameBn}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scope Notice */}
          <div className="px-3.5 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-1.5 text-[11px] text-emerald-900 font-tiro shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>শুধুমাত্র এই মসজিদের অনুমোদিত পাবলিক তথ্য — ব্যক্তিগত বা গোপন তথ্য প্রকাশ করা হয় না।</span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed font-tiro ${
                    msg.role === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-sm'
                      : msg.refused
                      ? 'bg-amber-50 border border-amber-200 text-amber-950 rounded-bl-sm'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.followUps && msg.followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[92%]">
                    {msg.followUps.map((fq, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendQuestion(fq)}
                        disabled={isSending}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-siliguri font-bold cursor-pointer"
                      >
                        {fq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Quick Starter Chips on fresh chat */}
            {messages.length === 1 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-slate-500 font-siliguri">সাধারণ প্রশ্নসমূহ:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendQuestion(q)}
                      disabled={isSending}
                      className="text-[11px] px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 text-left font-tiro transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-tiro px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>অনুমোদিত পাবলিক তথ্য যাচাই করা হচ্ছে...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-tiro flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="মসজিদ সম্পর্কে সাধারণ প্রশ্ন লিখুন..."
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-tiro outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white transition-colors cursor-pointer"
              title="প্রশ্ন পাঠান"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Trash2,
  Bot,
  User as UserIcon,
  MessageSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { Mosque } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface FloatingAiChatWidgetProps {
  currentMosque: Mosque | null;
  language?: 'bn' | 'en';
}

const STARTER_QUESTIONS = [
  'চলতি মাসে ওয়াকফ সম্পত্তি থেকে কত ভাড়া আদায় হয়েছে?',
  'সর্বশেষ ৫টি বড় খরচের তালিকা দাও',
  'চলতি মাসে জুমার কালেকশন মোট কত টাকা হয়েছে?',
  'বর্তমান ক্যাশ ও ব্যাংক স্থিতি কত টাকা?',
];

export const FloatingAiChatWidget: React.FC<FloatingAiChatWidgetProps> = ({
  currentMosque,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (textOverride?: string) => {
    const query = (textOverride ?? inputText).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const historyForApi = messages.slice(-8).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInputText('');
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.chatWithMasjidAi(query, historyForApi);
      const botMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString('bn-BD', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setError(err?.message || 'AI চ্যাটবট থেকে উত্তর পেতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('আপনার ব্রাউজারে বাংলা ভয়েস ইনপুট সমর্থিত নয়। অনুগ্রহ করে টাইপ করে প্রশ্ন করুন।');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    setError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputText(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-40 print:hidden font-siliguri">
      {/* Expandable Chat Window */}
      {isOpen && (
        <div className="mb-3 w-[355px] sm:w-[400px] max-w-[calc(100vw-1.5rem)] h-[520px] max-h-[78vh] bg-white rounded-2xl shadow-2xl border border-emerald-900/15 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#0f766e] px-4 py-3.5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm leading-tight truncate">
                  মসজিদ AI হিসাব সহকারী
                </h3>
                <p className="text-[11px] text-emerald-100/90 truncate">
                  {currentMosque?.nameBn || 'প্রকৃত ডাটাবেস থেকে তাৎক্ষণিক উত্তর'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setError(null);
                  }}
                  title="চ্যাট পরিষ্কার করুন"
                  className="p-1.5 rounded-lg hover:bg-white/15 text-emerald-100 hover:text-white transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="চ্যাট বন্ধ করুন"
                className="p-1.5 rounded-lg hover:bg-white/15 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70"
          >
            {messages.length === 0 ? (
              <div className="space-y-3 py-2">
                <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>আসসালামু আলাইকুম!</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    আমি আপনার মসজিদের হিসাব, ওয়াকফ ভাড়া, জুমার কালেকশন, আয়-ব্যয় ও ভাউচার সম্পর্কিত যেকোনো প্রশ্নের নির্ভুল উত্তর সরাসরি ডাটাবেস থেকে দিতে পারি।
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 px-1">
                    দ্রুত প্রশ্ন করে দেখুন:
                  </div>
                  {STARTER_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="w-full text-left px-3 py-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-900 transition shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'model' && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                      msg.role === 'user'
                        ? 'bg-emerald-800 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    <div
                      className={`text-[10px] mt-1 ${
                        msg.role === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  <span>হিসাব যাচাই করে উত্তর তৈরি হচ্ছে...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5 shrink-0"
          >
            <button
              type="button"
              onClick={toggleVoice}
              title={isListening ? 'ভয়েস বন্ধ করুন' : 'বাংলায় বলুন'}
              className={`p-2 rounded-xl transition shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="বাংলায় প্রশ্ন লিখুন..."
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white transition disabled:opacity-40 shrink-0"
              aria-label="পাঠান"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="ml-auto flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#064e3b] to-[#0f766e] hover:from-[#065f46] hover:to-[#0d9488] text-white shadow-xl hover:shadow-2xl border border-emerald-400/30 transition-all duration-200 active:scale-95"
      >
        {isOpen ? (
          <>
            <X className="w-5 h-5" />
            <span className="text-sm font-bold">বন্ধ করুন</span>
          </>
        ) : (
          <>
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-amber-300" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <span className="text-sm font-bold">মসজিদ AI সহকারী</span>
          </>
        )}
      </button>
    </div>
  );
};

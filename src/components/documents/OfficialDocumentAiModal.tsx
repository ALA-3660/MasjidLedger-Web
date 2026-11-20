import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  FileText,
  Check,
  Copy,
  RefreshCw,
  X,
  AlignLeft,
  ArrowRight,
  ShieldAlert,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { OfficialDocumentType } from '../../types/officialDocumentTypes';
import { Mosque } from '../../types';

const QUICK_AI_PRESETS = [
  {
    label: 'জরুরি কমিটি সভা',
    subject: 'মসজিদ পরিচালনা কমিটির জরুরি সভা আহ্বান সংক্রান্ত নোটিশ',
    keyPoints: 'আগামী শুক্রবার বাদ মাগরিব কমিটির জরুরি সভা অনুষ্ঠিত হবে। মসজিদের উন্নয়ন, মাসিক হিসাব পর্যালোচনা ও গুরুত্বপূর্ণ সিদ্ধান্ত গ্রহণের জন্য সকল সম্মানিত সদস্যকে যথাসময়ে উপস্থিত থাকতে বিনীত অনুরোধ করা যাচ্ছে।',
    recipient: 'মসজিদ পরিচালনা কমিটির সকল সম্মানিত সদস্যবৃন্দ',
    tone: 'জরুরি ও নির্দেশনামূলক',
  },
  {
    label: 'দাতাদের কৃতজ্ঞতাপত্র',
    subject: 'মসজিদের উন্নয়ন তহবিলে উদার অনুদানের জন্য আন্তরিক কৃতজ্ঞতাপত্র',
    keyPoints: 'মসজিদের উন্নয়ন ও রক্ষণাবেক্ষণ কাজে আন্তরিকভাবে আর্থিক অনুদান প্রদানের জন্য সম্মানিত দাতাকে মসজিদ পরিচালনা পরিষদের পক্ষ থেকে গভীর কৃতজ্ঞতা ও জাজাকাল্লাহু খাইরান জানানো হচ্ছে এবং মহান আল্লাহর দরবারে তাঁর দীর্ঘায়ু ও কল্যাণ কামনা করা হচ্ছে।',
    recipient: 'সম্মানিত দানশীল ও শুভানুধ্যায়ী মহোদয়',
    tone: 'বিনীত ও আবেদনমূলক',
  },
  {
    label: 'রমজান ও তারাবীহ বিজ্ঞপ্তি',
    subject: 'পবিত্র মাহে রমজান, তারাবীহ ও ইফতার ব্যবস্থাপনা সংক্রান্ত বিজ্ঞপ্তি',
    keyPoints: 'পবিত্র মাহে রমজান উপলক্ষে মসজিদে খতমে তারাবীহ, নিয়মিত ইফতার ও শবে কদরের বিশেষ ব্যবস্থাপনা গ্রহণ করা হয়েছে। সকল মুসল্লিয়ানে কেরামকে শৃঙ্খলা বজায় রেখে অংশগ্রহণের অনুরোধ করা যাচ্ছে।',
    recipient: 'সকল সম্মানিত মুসল্লিয়ানে কেরাম',
    tone: 'অফিসিয়াল ও মার্জিত',
  },
  {
    label: 'ওয়াকফ ভাড়া পরিশোধ নোটিশ',
    subject: 'মসজিদ ওয়াকফ এস্টেটের মাসিক দোকান/বাসা ভাড়া পরিশোধ সংক্রান্ত বিজ্ঞপ্তি',
    keyPoints: 'সকল সম্মানিত ভাড়াটিয়াগণকে প্রতি মাসের ১০ তারিখের মধ্যে মসজিদ অফিসে নির্ধারিত মাসিক ভাড়া পরিশোধ করে ডিজিটাল রসিদ সংগ্রহ করার জন্য বিনীত অনুরোধ করা হলো।',
    recipient: 'মসজিদ ওয়াকফ এস্টেটের সকল সম্মানিত ভাড়াটিয়াগণ',
    tone: 'প্রশাসনিক ও প্রাতিষ্ঠানিক',
  },
];

interface OfficialDocumentAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: OfficialDocumentType;
  mosque?: Mosque | null;
  currentSubject?: string;
  currentContent?: string;
  onInsertContent: (newContent: string, subject?: string) => void;
}

export const OfficialDocumentAiModal: React.FC<OfficialDocumentAiModalProps> = ({
  isOpen,
  onClose,
  docType,
  mosque,
  currentSubject = '',
  currentContent = '',
  onInsertContent,
}) => {
  const [action, setAction] = useState<'GENERATE' | 'OFFICIAL' | 'SUMMARIZE' | 'ELABORATE' | 'SPELLCHECK'>('GENERATE');
  const [subject, setSubject] = useState(currentSubject);
  const [keyPoints, setKeyPoints] = useState('');
  const [inputText, setInputText] = useState(currentContent);
  const [tone, setTone] = useState('অফিসিয়াল ও মার্জিত');
  const [sender, setSender] = useState(mosque?.nameBn ? `${mosque.nameBn} পরিচালনা পরিষদ` : 'মসজিদ পরিচালনা পরিষদ');
  const [recipient, setRecipient] = useState('সম্মানিত মুসল্লিয়ানে কেরাম / সংশ্লিষ্ট কর্তৃপক্ষ');
  const [generatedResult, setGeneratedResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync with props when opened
  React.useEffect(() => {
    if (isOpen) {
      if (currentContent && currentContent.trim().length > 10) {
        setInputText(currentContent);
        setAction('OFFICIAL');
      } else {
        setAction('GENERATE');
      }
      setSubject(currentSubject || '');
      setGeneratedResult('');
      setError(null);
    }
  }, [isOpen, currentSubject, currentContent]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.aiAssistOfficialDocument({
        action,
        docType,
        subject,
        keyPoints: action === 'GENERATE' ? keyPoints : inputText,
        currentText: inputText,
        tone,
        sender,
        recipient,
      });

      if (res && res.resultText) {
        setGeneratedResult(res.resultText);
      } else {
        throw new Error('কোনো ফলাফল পাওয়া যায়নি');
      }
    } catch (err: any) {
      console.error('AI Assist error:', err);
      setError(err.message || 'AI ড্রাফট তৈরিতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    // Strip HTML for clipboard copy if needed or copy raw
    const tempEl = document.createElement('div');
    tempEl.innerHTML = generatedResult;
    const text = tempEl.innerText || tempEl.textContent || generatedResult;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!generatedResult) return;
    onInsertContent(generatedResult, subject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#0f766e] p-5 text-white flex items-center justify-between font-siliguri">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex flex-wrap items-center gap-2">
                <span>AI নোটিশ ও দাপ্তরিক চিঠি জেনারেটর</span>
              </h2>
              <p className="text-xs text-emerald-100 font-normal">
                {mosque?.nameBn
                  ? `${mosque.nameBn}${mosque.address ? ` (${mosque.address})` : ''} — প্রিন্ট-রেডি বাংলা নোটিশ, বিজ্ঞপ্তি ও কৃতজ্ঞতাপত্র`
                  : 'প্রশাসনিক ও অফিসিয়াল বাংলা চিঠিপত্র, নোটিশ ও কৃতজ্ঞতাপত্রের স্বয়ংক্রিয় খসড়া'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Action Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              আপনি কী করতে চান? (Select Action)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'GENERATE', label: '✨ খসড়া তৈরি', desc: 'Generate Draft' },
                { id: 'OFFICIAL', label: '🏛️ অফিসিয়াল রূপ', desc: 'Make Official' },
                { id: 'SUMMARIZE', label: '📝 সংক্ষিপ্ত করুন', desc: 'Summarize' },
                { id: 'ELABORATE', label: '📄 বিস্তারিত করুন', desc: 'Elaborate' },
                { id: 'SPELLCHECK', label: '🔤 বানান শুদ্ধকরণ', desc: 'Proofread' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAction(tab.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    action === tab.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 text-xs'
                  }`}
                >
                  <div className="text-xs font-bold">{tab.label}</div>
                  <div className={`text-[10px] ${action === tab.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    {tab.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ভাষার ধরণ ও সুর (Tone)
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="অফিসিয়াল ও মার্জিত">অফিসিয়াল ও মার্জিত (Official & Courteous)</option>
                <option value="বিনীত ও আবেদনমূলক">বিনীত ও আবেদনমূলক (Humble & Requesting)</option>
                <option value="সংক্ষিপ্ত ও সুনির্দিষ্ট">সংক্ষিপ্ত ও সুনির্দিষ্ট (Concise & Direct)</option>
                <option value="জরুরি ও নির্দেশনামূলক">জরুরি ও নির্দেশনামূলক (Urgent & Directive)</option>
                <option value="প্রশাসনিক ও প্রাতিষ্ঠানিক">প্রশাসনিক ও প্রাতিষ্ঠানিক (Administrative)</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বিষয় / শিরোনাম (Subject)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="যেমন: পরিচালনা পরিষদের মাসিক সাধারণ সভা সংক্রান্ত"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {action === 'GENERATE' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">প্রেরক (Sender)</label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">প্রাপক (Recipient)</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  এক ক্লিকে জনপ্রিয় বিষয় নির্বাচন করুন:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {QUICK_AI_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSubject(preset.subject);
                        setKeyPoints(preset.keyPoints);
                        setRecipient(preset.recipient);
                        setTone(preset.tone);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-900 transition cursor-pointer"
                    >
                      ✨ {preset.label}
                    </button>
                  ))}
                </div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মূল বিষয় বা কী কী তথ্য অন্তর্ভুক্ত থাকবে? (শুধু মূল কথা লিখলেই পূর্ণাঙ্গ চিঠি তৈরি হবে)
                </label>
                <textarea
                  rows={3}
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  placeholder="যেমন: আগামী শুক্রবার বাদ মাগরিব কমিটির জরুরি সভা, রমজানের প্রস্তুতি ও অজুখানা সংস্কার নিয়ে আলোচনা হবে..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বিদ্যমান লেখা যা পরিমার্জন করতে চান (Source Text)
              </label>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="এখানে আপনার টেক্সট দিন যা আরও প্রফেশনাল, সংক্ষিপ্ত বা সংশোধন করতে চান..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>এআই প্রক্রিয়াকরণ চলছে...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-amber-300" />
                  <span>খসড়া ও পরিমার্জন প্রস্তুত করুন (Generate)</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Result Box */}
          {generatedResult && (
            <div className="border border-emerald-300 bg-white rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    এআই প্রস্তুতকৃত খসড়া (AI Generated Preview)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                  </button>
                </div>
              </div>

              {/* Editable Output */}
              <div>
                <textarea
                  rows={8}
                  value={generatedResult}
                  onChange={(e) => setGeneratedResult(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans leading-relaxed"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-slate-800">
                <div className="text-[11px] font-bold text-blue-900 mb-2 uppercase tracking-wide">
                  লাইভ ভিউ ফরম্যাটিং:
                </div>
                <div
                  className="prose prose-sm max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: generatedResult }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {generatedResult ? 'খসড়াটি যাচাই করে ডকুমেন্টে প্রতিস্থাপন করুন।' : 'প্যারামিটার পূরণ করে প্রস্তুত বাটনে চাপ দিন।'}
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              disabled={!generatedResult}
              onClick={handleInsert}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
              <span>ডকুমেন্টে যুক্ত করুন (Accept & Insert)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

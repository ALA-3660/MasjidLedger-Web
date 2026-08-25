import React, { useState } from 'react';
import {
  Heart,
  Clock,
  Landmark,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Send,
  Sparkles
} from 'lucide-react';
import { Mosque, FinancialAccount, MosqueNotice, Donation } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';

interface PublicPortalViewProps {
  mosque: Mosque | null;
  accounts: FinancialAccount[];
  notices: MosqueNotice[];
  language: Language;
  onDonate: (data: any) => Promise<Donation>;
  onPrintReceipt: (donation: Donation) => void;
}

export const PublicPortalView: React.FC<PublicPortalViewProps> = ({
  mosque,
  accounts,
  notices,
  language,
  onDonate,
  onPrintReceipt,
}) => {
  const t = translations[language];
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [amount, setAmount] = useState('1000');
  const [category, setCategory] = useState<Donation['category']>('GENERAL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const publicNotices = notices.filter((n) => n.isPublic);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOnlineDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;

    setIsSubmitting(true);
    try {
      const created = await onDonate({
        donorName: donorName || 'আল্লাহর এক বান্দা (Anonymous)',
        donorPhone,
        amount: num,
        category,
        paymentMethod: 'BKASH',
        accountId: accounts[0]?.id,
        reference: `MFS-ONLINE-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toISOString().split('T')[0],
      });
      if (created) onPrintReceipt(created);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const prayerTimes = [
    { nameBn: 'ফজর (Fajr)', adhan: '০৪:৫০', iqamah: '০৫:১৫' },
    { nameBn: 'যোহর (Dhuhr)', adhan: '১২:১৫', iqamah: '০১:১৫' },
    { nameBn: 'আসর (Asr)', adhan: '০৪:৩০', iqamah: '০৪:৪৫' },
    { nameBn: 'মাগরিব (Maghrib)', adhan: '০৬:২৫', iqamah: '০৬:৩০' },
    { nameBn: 'এশা (Isha)', adhan: '০৭:৪৫', iqamah: '০৮:১৫' },
    { nameBn: 'জুমুআ (Jumu\'ah)', adhan: '১২:৩০', iqamah: '০১:৩০' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Banner with Islamic Aesthetic */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-blue-900/60 px-3 py-1 rounded-full text-xs font-semibold border border-blue-700/50">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>ডিজিটাল মসজিদ পাবলিক পোর্টাল ও স্বচ্ছতা ড্যাশবোর্ড</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-sans leading-tight text-white">
            {mosque?.nameBn || 'বায়তুল মামুর জামে মসজিদ'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {mosque?.address}, {mosque?.district} • ওয়াকফ আইডি: {mosque?.waqfId || 'WAQF-BD-2024-889'}
          </p>
          <div className="pt-2 text-xs text-slate-300 italic font-sans">
            "যারা আল্লাহর ঘরে সালাত কায়েম করে এবং যাকাত দেয়—তারাই তো আল্লাহর মসজিদসমূহ আবাদ করে।" — (সূরা আত-তাওবাহ: ১৮)
          </div>
        </div>
      </div>

      {/* Prayer Times Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">আজকের নামাজের সময়সূচি (Prayer Schedule)</h2>
          </div>
          <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            আজকের জামাত সময়
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {prayerTimes.map((p, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center space-y-1">
              <span className="text-xs font-bold text-slate-700 block">{p.nameBn}</span>
              <div className="text-[11px] text-slate-500">আজান: {p.adhan}</div>
              <div className="text-sm font-bold text-blue-900 bg-blue-100/70 py-1 rounded-md">
                জামাত: {p.iqamah}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Donation & Bank Accounts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Donate Online */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <Heart className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-900">অনলাইন অনুদান প্রদান ও তাৎক্ষণিক রসিদ</h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            আপনার সদকায়ে জারিয়া ও মসজিদের উন্নয়ন তহবিলে সরাসরি অনুদান পাঠান এবং ডিজিটাল মানি রসিদ সংগ্রহ করুন।
          </p>

          <form onSubmit={handleOnlineDonation} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">দানের খাত নির্বাচন করুন</label>
              <select
                id="select-public-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="GENERAL">সাধারণ মসজিদ ফান্ড (General Fund)</option>
                <option value="CONSTRUCTION">মসজিদ পুনঃনির্মাণ ও উন্নয়ন</option>
                <option value="WUDU_KHANA">অজু খানা ও ওয়াশ ব্লক</option>
                <option value="MADRASA">মক্তব ও নূরানী মাদ্রাসা</option>
                <option value="CEMETERY">কবরস্থান উন্নয়ন ফান্ড</option>
                <option value="OTHER">অন্যান্য শুভ কাজ</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আপনার নাম (ঐচ্ছিক)</label>
                <input
                  id="input-public-donor-name"
                  type="text"
                  placeholder="নাম না দিলে বেনামী হিসেবে থাকবে"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
                <input
                  id="input-public-donor-phone"
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">অনুদানের পরিমাণ (টাকা)</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {['500', '1000', '2000', '5000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      amount === amt
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ৳ {amt}
                  </button>
                ))}
              </div>
              <input
                id="input-public-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              id="btn-public-submit-donation"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'প্রক্রিয়াধীন...' : 'অনুদান পাঠান ও ডিজিটাল রসিদ প্রিন্ট করুন'}</span>
            </button>
          </form>
        </div>

        {/* Right: Bank Accounts & MFS Details */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <Landmark className="w-5 h-5" />
            <h2 className="text-base font-bold text-slate-900">অফিসিয়াল ব্যাংক হিসাব ও বিকাশ নম্বর</h2>
          </div>
          <p className="text-xs text-slate-500">
            সরাসরি ব্যাংক ট্রান্সফার বা মোবাইল ব্যাংকিং এর মাধ্যমে দান প্রেরণের তথ্য:
          </p>

          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{acc.nameBn}</span>
                  {acc.bankName && (
                    <span className="text-[11px] text-slate-500 block">
                      {acc.bankName} ({acc.branchName})
                    </span>
                  )}
                  {acc.accountNumber && (
                    <span className="font-mono text-xs font-semibold text-blue-700 block mt-0.5">
                      {acc.accountNumber}
                    </span>
                  )}
                </div>

                {acc.accountNumber && (
                  <button
                    onClick={() => handleCopy(acc.accountNumber || '', acc.id)}
                    className="p-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 transition-colors"
                    title="কপি করুন"
                  >
                    {copiedId === acc.id ? <Check className="w-4 h-4 text-blue-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Public Notices */}
      {publicNotices.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 border-b border-slate-100 pb-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold">মসজিদের সাম্প্রতিক নোটিশ ও ঘোষণা</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicNotices.map((n) => (
              <div key={n.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">{n.title}</span>
                  <span className="text-slate-500">{formatDate(n.publishDate, language)}</span>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {n.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

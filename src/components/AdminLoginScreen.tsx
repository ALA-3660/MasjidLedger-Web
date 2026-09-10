import React, { useState } from 'react';
import {
  Lock,
  Phone,
  Building,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { Mosque, UserRole } from '../types';
import { Language, translations } from '../lib/i18n';

interface AdminLoginScreenProps {
  mosques: Mosque[];
  currentMosque: Mosque | null;
  onLogin: (phoneOrEmail: string, pass: string, mosqueId?: string) => Promise<void>;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  mosques,
  currentMosque,
  onLogin,
  language = 'bn',
  onLanguageChange,
}) => {
  const t = translations[language] || translations.bn;

  const [identifier, setIdentifier] = useState('01711000001');
  const [password, setPassword] = useState('admin123');
  const [selectedMosqueId, setSelectedMosqueId] = useState(currentMosque?.id || mosques[0]?.id || 'mosque-1');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMessage('মোবাইল নম্বর ও পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onLogin(identifier, password, selectedMosqueId);
    } catch (err: any) {
      setErrorMessage(err.message || 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMosque = mosques.find((m) => m.id === selectedMosqueId) || currentMosque || mosques[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-100">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-900/40 border border-emerald-400/30 mb-2">
          <Building className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {selectedMosque?.nameBn || selectedMosque?.name || 'মসজিদলেজার পোর্টাল'}
        </h1>
        <p className="text-xs text-emerald-200/80 font-medium tracking-wide">
          স্মার্ট মসজিদ ও ওয়াকফ ফাইন্যান্সিয়াল ম্যানেজমেন্ট সিস্টেম
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>অ্যাডমিন ও ইউজার লগইন</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              আপনার অনুমোদিত মোবাইল নম্বর বা ইউজারনেম দিয়ে প্রবেশ করুন
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mosque Selector if multiple */}
            {mosques.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  মসজিদ শাখা নির্বাচন
                </label>
                <div className="relative">
                  <select
                    value={selectedMosqueId}
                    onChange={(e) => setSelectedMosqueId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  >
                    {mosques.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                        {m.nameBn} ({m.city || 'ঢাকা'})
                      </option>
                    ))}
                  </select>
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            )}

            {/* Mobile / Username */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                মোবাইল নম্বর / ইউজার আইডি <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="017XXXXXXXX"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                গোপন পাসওয়ার্ড <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>এই ডিভাইসে স্মরণ রাখুন</span>
              </label>

              <span className="text-[11px] text-emerald-400 font-medium cursor-help">
                নিরাপদ এনক্রিপশন সক্রিয়
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 transition-all transform active:scale-98"
            >
              <span>{isSubmitting ? 'প্রবেশ করা হচ্ছে...' : 'লগইন করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* System Access Information */}
          <div className="pt-3 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[11px] text-slate-400">
              অনুমোদিত মসজিদ অ্যাডমিন বা দায়িত্বপ্রাপ্ত কর্মকর্তার অ্যাকাউন্ট দিয়ে প্রবেশ করুন।
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          © {new Date().getFullYear()} MasjidLedger Management & Financial Reporting System
        </p>
      </div>
    </div>
  );
};

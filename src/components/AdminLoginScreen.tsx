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
  UserPlus,
  Sparkles,
  MapPin,
  User as UserIcon,
  Mail,
  X,
} from 'lucide-react';
import { Mosque } from '../types';
import { Language, translations } from '../lib/i18n';
import { api } from '../lib/api';

interface AdminLoginScreenProps {
  mosques: Mosque[];
  currentMosque: Mosque | null;
  onLogin: (phoneOrEmail: string, pass: string, mosqueId?: string) => Promise<void>;
  onRegister: (data: {
    adminName: string;
    phone: string;
    email: string;
    mosqueName: string;
    address: string;
    password?: string;
  }) => Promise<void>;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  mosques,
  currentMosque,
  onLogin,
  onRegister,
  language = 'bn',
  onLanguageChange,
}) => {
  const t = translations[language] || translations.bn;

  // View mode state ('login' | 'register')
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [selectedMosqueId, setSelectedMosqueId] = useState(currentMosque?.id || mosques[0]?.id || 'mosque-1');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

  // Sign up form state
  const [adminName, setAdminName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mosqueName, setMosqueName] = useState('');
  const [address, setAddress] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [isRegSubmitting, setIsRegSubmitting] = useState(false);
  const [regErrorMessage, setRegErrorMessage] = useState('');

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !loginPassword) {
      setLoginErrorMessage('মোবাইল নম্বর ও পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    setIsLoginSubmitting(true);
    setLoginErrorMessage('');
    try {
      await onLogin(identifier, loginPassword, selectedMosqueId);
    } catch (err: any) {
      setLoginErrorMessage(err.message || 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।');
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !phone.trim() || !email.trim() || !mosqueName.trim() || !address.trim()) {
      setRegErrorMessage('সুপার অ্যাডমিনের নাম, মোবাইল নম্বর, ইমেইল, মসজিদের নাম এবং ঠিকানা দেওয়া আবশ্যক।');
      return;
    }

    if (!registerPassword || registerPassword.length < 4) {
      setRegErrorMessage('গোপন পাসওয়ার্ড প্রদান করুন (ন্যূনতম ৪ অক্ষর)।');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegErrorMessage('পাসওয়ার্ড দুটি হুবহু মিলছে না। অনুগ্রহ করে পাসওয়ার্ড নিশ্চিতকরণ ঘরে একই পাসওয়ার্ড পুনরায় লিখুন।');
      return;
    }

    setIsRegSubmitting(true);
    setRegErrorMessage('');
    try {
      await onRegister({
        adminName: adminName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        mosqueName: mosqueName.trim(),
        address: address.trim(),
        password: registerPassword.trim(),
      });
    } catch (err: any) {
      setRegErrorMessage(err.message || 'মসজিদ রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsRegSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotMessage({ type: 'error', text: 'আপনার নিবন্ধিত ইমেইল বা মোবাইল নম্বর দিন।' });
      return;
    }
    setIsForgotSubmitting(true);
    setForgotMessage(null);
    try {
      const res = await api.forgotPassword(forgotIdentifier.trim());
      setForgotMessage({
        type: 'success',
        text: `ওটিপি কোড পাঠানো হয়েছে (যাচাইকরণ কোড: ${res.resetToken})`,
      });
      setResetToken(res.resetToken || '');
      setForgotStep('reset');
    } catch (err: any) {
      setForgotMessage({ type: 'error', text: err.message || 'কোনো অ্যাকাউন্ট পাওয়া যায়নি।' });
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword.trim() || newPassword.trim().length < 4) {
      setForgotMessage({ type: 'error', text: 'সঠিক ওটিপি এবং ন্যূনতম ৪ অক্ষরের নতুন পাসওয়ার্ড দিন।' });
      return;
    }
    setIsForgotSubmitting(true);
    setForgotMessage(null);
    try {
      await api.resetPassword(forgotIdentifier.trim(), resetToken.trim(), newPassword.trim());
      setForgotMessage({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।' });
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotStep('request');
        setForgotIdentifier('');
        setResetToken('');
        setNewPassword('');
        setForgotMessage(null);
      }, 2000);
    } catch (err: any) {
      setForgotMessage({ type: 'error', text: err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।' });
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const selectedMosque = mosques.find((m) => m.id === selectedMosqueId) || currentMosque || mosques[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-100">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl text-center z-10 space-y-2 mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-900 shadow-2xl shadow-emerald-950/90 border-2 border-emerald-400/50 mb-2 p-1 overflow-hidden ring-4 ring-emerald-500/30">
          <img
            src="/mosque_dome_logo.jpg"
            alt="মসজিদে নববীর সবুজ গম্বুজ - মসজিদ লেজার লোগো"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center font-siliguri">
          <span>মসজিদ লেজার</span>
        </h1>
        <p className="text-xs sm:text-sm text-emerald-200/80 font-medium max-w-xl mx-auto font-baloo">
          শত শত মসজিদ ও ওয়াকফ এস্টেটের জন্য আধুনিক, নিরাপদ ও সেন্ট্রাল ফাইন্যান্সিয়াল প্ল্যাটফর্ম
        </p>
      </div>

      {/* Main Single Card with View Toggle */}
      <div className="max-w-lg mx-auto w-full z-10">
        <div className="bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-slate-800 overflow-hidden">
          
          {viewMode === 'login' ? (
            /* ==================== LOGIN VIEW ==================== */
            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-800/50 mb-2">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>বিদ্যমান ব্যবহারকারী</span>
                  </div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>অ্যাডমিন ও ইউজার লগইন</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    আপনার অনুমোদিত মোবাইল নম্বর বা ইউজার আইডি দিয়ে প্রবেশ করুন
                  </p>
                </div>

                {loginErrorMessage && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{loginErrorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Mosque Selector if multiple exist */}
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
                              {m.nameBn || m.name} ({m.city || 'ঢাকা'})
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
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>মনে রাখুন</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotModalOpen(true);
                        setForgotStep('request');
                        setForgotMessage(null);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  </div>

                  {/* Submit Login */}
                  <button
                    type="submit"
                    disabled={isLoginSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 transition-all transform active:scale-98 cursor-pointer"
                  >
                    <span>{isLoginSubmitting ? 'প্রবেশ করা হচ্ছে...' : 'লগইন করুন'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <div className="text-center text-xs text-slate-300">
                  <span>আপনি নতুন ব্যবহারকারী? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('register');
                      setRegErrorMessage('');
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer ml-1"
                  >
                    নতুন মসজিদ রেজিস্ট্রেশন করুন
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ==================== REGISTER VIEW ==================== */
            <div className="p-6 sm:p-8 bg-slate-950/40 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-800/50 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>নতুন মসজিদ রেজিস্ট্রেশন</span>
                  </div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>নতুন মসজিদ সাইন আপ</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    সুপার অ্যাডমিনের তথ্য দিয়ে আপনার নতুন মসজিদের জন্য ডিজিটাল স্পেস তৈরি করুন
                  </p>
                </div>

                {regErrorMessage && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{regErrorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* 1. Super Admin Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ১. সুপার অ্যাডমিনের নাম <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="যেমন: মাওলানা আব্দুল করিম"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* 2. Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ২. মোবাইল নম্বর <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* 3. Email ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ৩. ইমেইল আইডি (পাসওয়ার্ড রিকভারির জন্য) <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@mosque.org"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* 4. Mosque Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ৪. মসজিদের নাম <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={mosqueName}
                        onChange={(e) => setMosqueName(e.target.value)}
                        placeholder="যেমন: বায়তুল মোকাররম কেন্দ্রীয় জামে মসজিদ"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* 5. Full Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ৫. পূর্ণাঙ্গ ঠিকানা <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="যেমন: পল্টন, ঢাকা-১০০০"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                      />
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  {/* Password & Confirm Password for Registration */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        গোপন পাসওয়ার্ড নির্ধারণ করুন <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="আপনার নিজস্ব পাসওয়ার্ড লিখুন (ন্যূনতম ৪ অক্ষর)"
                          required
                          minLength={4}
                          className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        গোপন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password) <span className="text-emerald-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          placeholder="একই পাসওয়ার্ড পুনরায় লিখুন"
                          required
                          minLength={4}
                          className={`w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:ring-2 outline-hidden ${
                            registerConfirmPassword && registerPassword === registerConfirmPassword
                              ? 'border-emerald-500/80 focus:ring-emerald-500 focus:border-emerald-500'
                              : registerConfirmPassword && registerPassword !== registerConfirmPassword
                              ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
                              : 'border-slate-700 focus:ring-emerald-500 focus:border-emerald-500'
                          }`}
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password Matching Feedback */}
                      {registerConfirmPassword.length > 0 && (
                        <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] font-semibold">
                          {registerPassword === registerConfirmPassword ? (
                            <span className="text-emerald-400 flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>✓ পাসওয়ার্ড দুটি হুবহু মিলেছে</span>
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center space-x-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>✕ পাসওয়ার্ড দুটি মিলছে না! পুনরায় যাচাই করুন</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Register */}
                  <button
                    type="submit"
                    disabled={isRegSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-950/50 flex items-center justify-center space-x-2 transition-all transform active:scale-98 cursor-pointer mt-2"
                  >
                    <span>{isRegSubmitting ? 'মসজিদ স্পেস তৈরি হচ্ছে...' : 'নতুন মসজিদ তৈরি করুন ও প্রবেশ করুন'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>স্বয়ংক্রিয় ক্যাশ ও ব্যাংক অ্যাকাউন্ট</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>সম্পূর্ণ নিয়ন্ত্রণ ও অডিট ট্রেইল</span>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-slate-800/50 text-xs text-slate-300">
                  <span>ইতিমধ্যে অ্যাকাউন্ট আছে? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setLoginErrorMessage('');
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer ml-1"
                  >
                    লগইন করুন
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-slate-500 mt-6 z-10">
        © {new Date().getFullYear()} MasjidLedger Pro — Enterprise Multi-Mosque Financial Management System
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <span>পাসওয়ার্ড পুনরুদ্ধার (Forgot Password)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                  forgotMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                {forgotMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{forgotMessage.text}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    আপনার নিবন্ধিত ইমেইল বা মোবাইল নম্বর দিন
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="admin@mosque.org বা 017XXXXXXXX"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    {isForgotSubmitting ? 'প্রক্রিয়াধীন...' : 'ওটিপি / টোকেন পাঠান'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    রিসেট কোড / ওটিপি (Reset Code)
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="৬ ডিজিট কোড"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    নতুন পাসওয়ার্ড (ন্যূনতম ৪ অক্ষর)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="নতুন গোপন পাসওয়ার্ড"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    পেছনে যান
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    {isForgotSubmitting ? 'সেভ হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

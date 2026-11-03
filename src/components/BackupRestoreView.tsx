import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileJson,
  History,
  Clock,
  HardDrive,
  X,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { Language, translations } from '../lib/i18n';

interface BackupRestoreViewProps {
  currentMosque: any;
  currentUser: any;
  language?: Language;
  onRefreshData?: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  currentMosque,
  currentUser,
  language = 'bn',
  onRefreshData,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupPolicy, setBackupPolicy] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setNotification(null);
    try {
      await api.downloadMosqueBackup();
      setNotification({
        type: 'success',
        text: 'মসজিদের ডাটাবেজের সম্পূর্ণ ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে।',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'ব্যাকআপ ডাউনলোডে ব্যর্থ হয়েছে।',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setNotification({
        type: 'error',
        text: 'অনুগ্রহ করে শুধুমাত্র .json ব্যাকআপ ফাইল আপলোড করুন।',
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || !json.data) {
          throw new Error('অকার্যকর ব্যাকআপ ফাইল বিন্যাস।');
        }
        setParsedBackupData(json);
        setIsConfirmModalOpen(true);
      } catch (err) {
        setNotification({
          type: 'error',
          text: 'আপলোড করা ফাইলটি সঠিক ব্যাকআপ JSON ফরম্যাট নয়।',
        });
        setSelectedFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!parsedBackupData) return;

    setIsRestoring(true);
    setNotification(null);
    try {
      const result = await api.restoreMosqueBackup(parsedBackupData);
      setNotification({
        type: 'success',
        text: `ডাটা সফলভাবে রিস্টোর করা হয়েছে। (অ্যাকাউন্টস: ${result?.restoredCounts?.accounts || 0}, ইনকাম: ${result?.restoredCounts?.incomeEntries || 0}, এক্সপেন্স: ${result?.restoredCounts?.expenseEntries || 0})`,
      });
      setIsConfirmModalOpen(false);
      setSelectedFile(null);
      setParsedBackupData(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'ডাটা রিস্টোর করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>Disaster Recovery & Data Protection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>অটোমেটেড ডাটা ব্যাকআপ ও ১-ক্লিক রিস্টোর হাব</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
              আপনার মসজিদের আর্থিক লেনদেন, হিসাব খাত, পরিষদ মিটিং, স্টাফ বেতন ও রসিদের সম্পূর্ণ নিরাপদ ব্যাকআপ
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'ডাউনলোড হচ্ছে...' : '১-ক্লিক ব্যাকআপ ডাউনলোড'}</span>
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">সম্পূর্ণ মসজিদের ডাটা এক্সপোর্ট</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                আপনার মসজিদের সকল আয়-ব্যয় ভাউচার, ক্যাশ ও ব্যাংক ব্যালেন্স, কমিটি তালিকা ও স্টাফ তথ্য এনক্রিপ্টেড JSON ফাইল হিসেবে ডাউনলোড করুন।
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>ফাইলে যা যা সংরক্ষিত থাকবে:</span>
              </div>
              <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 font-medium pl-1">
                <li>✓ সকল ক্যাশ ও ব্যাংক ব্যালেন্স</li>
                <li>✓ আয় ও ব্যয়ের সকল ভাউচার</li>
                <li>✓ মক্তব ও হিফজখানার রেকর্ড</li>
                <li>✓ স্টাফ বেতন ও পে-রোল</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={isExporting}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{isExporting ? 'ব্যাকআপ তৈরি ও ডাউনলোড হচ্ছে...' : 'এখনই ব্যাকআপ ফাইল ডাউনলোড করুন (.json)'}</span>
          </button>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">ব্যাকআপ ফাইল থেকে ১-ক্লিক রিস্টোর</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                পূর্বে সেভ করা `.json` ব্যাকআপ ফাইল আপলোড করে এক ক্লিকে সম্পূর্ণ মসজিদের হিসেব পুনরুদ্ধার করুন।
              </p>
            </div>
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileJson className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'কম্পিউটার বা মোবাইল থেকে .json ব্যাকআপ ফাইল সিলেক্ট করুন'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">শুধুমাত্র বৈধ MasjidLedger Backup JSON গ্রহণ করা হবে</p>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>সতর্কতা: রিস্টোর করার পূর্বে বর্তমান ডাটার একটি ব্যাকআপ কপি ডাউনলোড করে রাখা নিরাপদ।</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-emerald-600" />
          <span>অটোমেটেড ডাটা সেফটি ও শিডিউল পলিসি</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <label
            onClick={() => setBackupPolicy('DAILY')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
              backupPolicy === 'DAILY'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-900">দৈনিক অটো সেভ (Daily Safe)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">প্রতিদিন রাতে সিস্টেম স্বয়ংক্রিয় ব্যাকআপ তৈরি রাখবে</div>
            </div>
          </label>
          <label
            onClick={() => setBackupPolicy('WEEKLY')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
              backupPolicy === 'WEEKLY'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Clock className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-900">সাপ্তাহিক ব্যাকআপ (Weekly)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">প্রতি শুক্রবারের জুমা শেষে ব্যাকআপ স্ন্যাপশট প্রস্তুত হবে</div>
            </div>
          </label>
          <label
            onClick={() => setBackupPolicy('MONTHLY')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
              backupPolicy === 'MONTHLY'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <History className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-900">মাসিক ফাইনান্সিয়াল স্টেটমেন্ট</div>
              <div className="text-[11px] text-slate-500 mt-0.5">প্রতিটি মাসান্তে অডিট ফাইল ব্যাকআপ নেওয়া হবে</div>
            </div>
          </label>
        </div>
      </div>

      {isConfirmModalOpen && parsedBackupData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <span>ডাটা রিস্টোর নিশ্চিতকরণ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="font-bold text-indigo-900">ব্যাকআপ ফাইলের সংক্ষিপ্ত বিবরণ:</div>
              <div className="text-indigo-800 space-y-1 text-[11px]">
                <p>● মসজিদের নাম: <strong>{parsedBackupData?.mosque?.nameBn || parsedBackupData?.mosque?.name || 'অজানা'}</strong></p>
                <p>● ব্যাকআপ গ্রহণের তারিখ: <strong>{parsedBackupData?.exportedAt || 'অজানা'}</strong></p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিত যে এই ব্যাকআপ ফাইল থেকে আপনার মসজিদের ডাটা রিস্টোর করতে চান? এটি সিস্টেমে তথ্য আপডেট বা পুনরুদ্ধার করবে।
            </p>
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleExecuteRestore}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'রিস্টোর হচ্ছে...' : 'হ্যাঁ, ডাটা রিস্টোর করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

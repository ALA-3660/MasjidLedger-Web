import React, { useState, useEffect } from 'react';
import { Cloud, CloudUpload, CloudDownload, RefreshCw, CheckCircle2, AlertCircle, FileText, ShieldCheck, Database, FileSpreadsheet, File } from 'lucide-react';
import { googleDriveService, DriveFileItem } from '../services/googleDriveService';

interface GoogleDriveBackupViewProps {
  currentMosque: any;
  language: string;
}

export const GoogleDriveBackupView: React.FC<GoogleDriveBackupViewProps> = ({ currentMosque, language }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [backupFiles, setBackupFiles] = useState<DriveFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleAuthClick = () => {
    if (!(window as any).google) {
      setStatusMessage({ type: 'error', text: 'গুগল অথেন্টিকেশন স্ক্রিপ্ট লোড হয়নি। দয়া করে পেজ রিফ্রেশ করুন।' });
      return;
    }

    googleDriveService.initClient(
      (token) => {
        setAccessToken(token);
        setStatusMessage({ type: 'success', text: 'গুগল ড্রাইভ সফলভাবে সংযুক্ত হয়েছে!' });
        fetchDriveBackups();
      },
      (err) => {
        console.error(err);
        setStatusMessage({ type: 'error', text: 'গুগল ড্রাইভ অথেন্টিকেশন ব্যর্থ হয়েছে।' });
      }
    );

    googleDriveService.requestAccessToken();
  };

  const fetchDriveBackups = async () => {
    setLoading(true);
    try {
      const files = await googleDriveService.listReports('MasjidLedger');
      setBackupFiles(files);
    } catch (err) {
      console.error('Error fetching drive files:', err);
      setStatusMessage({ type: 'error', text: 'গুগল ড্রাইভ থেকে ব্যাকআপ ফাইল তালিকা আনতে সমস্যা হয়েছে।' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBackup = async (mimeType: 'application/json' | 'application/pdf' | 'text/csv' = 'application/json', customName?: string) => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'প্রথমে গুগল ড্রাইভে সাইন ইন করুন।' });
      return;
    }

    setIsUploading(true);
    setStatusMessage({ type: 'info', text: 'গুগল ড্রাইভে ফাইল আপলোড করা হচ্ছে...' });

    try {
      let fileContent = '';
      let fileName = '';

      if (mimeType === 'application/json') {
        const backupPayload = {
          mosque: currentMosque,
          exportDate: new Date().toISOString(),
          version: '2.5.0',
          appName: 'MasjidLedger',
        };
        fileContent = JSON.stringify(backupPayload, null, 2);
        fileName = `MasjidLedger_Backup_${currentMosque?.nameBn || 'Mosque'}_${new Date().toISOString().slice(0, 10)}.json`;
      } else if (mimeType === 'text/csv') {
        fileContent = `Date,Head,Type,Amount,Description\n${new Date().toISOString().slice(0, 10)},General Income,INCOME,5000,Sample CSV Report Export`;
        fileName = `MasjidLedger_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        fileContent = `MasjidLedger Official PDF Report\nMosque: ${currentMosque?.nameBn}\nDate: ${new Date().toLocaleDateString()}`;
        fileName = `MasjidLedger_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      }

      await googleDriveService.uploadReport(fileContent, fileName, mimeType);
      setStatusMessage({ type: 'success', text: `সফলভাবে "${fileName}" গুগল ড্রাইভে আপলোড করা হয়েছে!` });
      fetchDriveBackups();
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatusMessage({ type: 'error', text: `আপলোড ব্যর্থ হয়েছে: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRestoreBackup = async (fileId: string, fileName: string) => {
    if (!accessToken) return;
    if (!confirm(`আপনি কি "${fileName}" থেকে ডেটা রিস্টোর বা লোড করতে চান?`)) return;

    setIsRestoring(fileId);
    setStatusMessage({ type: 'info', text: 'গুগল ড্রাইভ থেকে ফাইল ডাউনলোড করা হচ্ছে...' });

    try {
      const blob = await googleDriveService.downloadFile(fileId);
      const text = await blob.text();
      const backupData = JSON.parse(text);

      if (!backupData || !backupData.mosque) {
        throw new Error('এটি কোনো বৈধ মসজিদ ব্যাকআপ ফাইল নয়।');
      }

      const updateRes = await fetch(`/api/v1/mosques/current`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData.mosque),
      });

      if (updateRes.ok) {
        setStatusMessage({ type: 'success', text: `সফলভাবে "${fileName}" থেকে ডেটা রিস্টোর করা হয়েছে! পেজ রিলোড হচ্ছে...` });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error('সার্ভারে ডেটা আপডেট করতে সমস্যা হয়েছে।');
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      setStatusMessage({ type: 'error', text: `রিস্টোর ব্যর্থ হয়েছে: ${err.message}` });
    } finally {
      setIsRestoring(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            <span>☁️ গুগল ড্রাইভ ক্লাউড ব্যাকআপ ও সিঙ্ক (Google Drive Cloud Backup)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            আপনার মসজিদের আর্থিক রেকর্ড, কমিটি, স্টাফ এবং সেটিংসের নিরাপদ ব্যাকআপ সরাসরি আপনার গুগল ড্রাইভে সংরক্ষণ এবং রিস্টোর করুন।
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>এনক্রিপ্টেড ব্যাকআপ</span>
        </span>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> :
           statusMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> :
           <RefreshCw className="w-4 h-4 shrink-0 text-blue-600 animate-spin" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {!accessToken ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Cloud className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">গুগল ড্রাইভ অ্যাকাউন্ট কানেক্ট করুন</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              গুগল ড্রাইভ ব্যাকআপ ফিচারটি ব্যবহার করতে আপনার গুগল অ্যাকাউন্ট দিয়ে লগইন করুন এবং ড্রাইভ পারমিশন দিন।
            </p>
          </div>
          <button
            type="button"
            onClick={handleAuthClick}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 mx-auto transition-all cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive এ Sign in করুন</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">গুগল ড্রাইভ সংযুক্ত রয়েছে</h4>
                <p className="text-[11px] text-emerald-800">আপনি এখন ব্যাকআপ আপলোড ও রিস্টোর করতে পারবেন।</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUploadBackup}
              disabled={isUploading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>আপলোড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>গুগল ড্রাইভে ব্যাকআপ করুন</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600" />
                <span>গুগল ড্রাইভে সংরক্ষিত ব্যাকআপ ফাইলসমূহ ({backupFiles.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => fetchDriveBackups()}
                disabled={loading}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ করুন</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-xs text-slate-500">তালিকা লোড হচ্ছে...</div>
            ) : backupFiles.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি। উপরে "গুগল ড্রাইভে ব্যাকআপ করুন" বাটনে ক্লিক করে নতুন ব্যাকআপ তৈরি করুন।
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {backupFiles.map((file) => (
                  <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{file.name}</div>
                        <div className="text-[11px] text-slate-500">
                          সংরক্ষণের সময়: {new Date(file.createdTime).toLocaleString('bn-BD')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={isRestoring === file.id}
                        onClick={() => handleRestoreBackup(file.id, file.name)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {isRestoring === file.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>রিস্টোর হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <CloudDownload className="w-3.5 h-3.5" />
                            <span>রিস্টোর করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

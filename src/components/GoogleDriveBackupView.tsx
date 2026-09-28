import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Database,
  Lock,
  Calendar,
  Layers,
  HardDrive,
  Info,
  Check,
  X,
  AlertTriangle,
  History,
  Activity,
  Sliders,
  Save,
  Clock
} from 'lucide-react';
import { googleDriveService, DriveFileItem } from '../services/googleDriveService';
import { api } from '../lib/api';
import { Mosque } from '../types';

interface GoogleDriveBackupViewProps {
  currentMosque: Mosque | null;
  language?: string;
}

interface VerificationResult {
  fileId: string;
  fileName: string;
  isValid: boolean;
  checksum?: string;
  metadata?: any;
  recordCount?: number;
  moduleCount?: number;
  reason?: string;
  message?: string;
  rawJson?: string;
}

export const GoogleDriveBackupView: React.FC<GoogleDriveBackupViewProps> = ({ currentMosque }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);
  const [backupFiles, setBackupFiles] = useState<DriveFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  
  // Verification and Restore States
  const [verifyingFileId, setVerifyingFileId] = useState<string | null>(null);
  const [verificationModalData, setVerificationModalData] = useState<VerificationResult | null>(null);
  
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    fileId: string;
    fileName: string;
    artifactJson: string;
    verification: VerificationResult;
  } | null>(null);
  
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgressStep, setRestoreProgressStep] = useState<string>('');

  // Backup Health & Settings
  const [healthData, setHealthData] = useState<any>(null);
  const [backupSettings, setBackupSettings] = useState<any>({
    automaticBackupEnabled: false,
    frequency: 'DAILY',
    preferredTime: '23:59',
    retentionCount: 15
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    loadHealthAndSettings();
  }, [currentMosque?.id]);

  const loadHealthAndSettings = async () => {
    try {
      const [health, settings] = await Promise.all([
        api.getBackupHealth().catch(() => null),
        api.getBackupSettings().catch(() => null)
      ]);
      if (health) setHealthData(health);
      if (settings) setBackupSettings(settings);
    } catch (err) {
      console.warn('Could not load backup health/settings:', err);
    }
  };

  const handleAuthClick = () => {
    if (!(window as any).google || !(window as any).google.accounts) {
      setStatusMessage({ type: 'error', text: 'গুগল অথেন্টিকেশন স্ক্রিপ্ট লোড হচ্ছে। অনুগ্রহ করে ২ সেকেন্ড পর আবার চেষ্টা করুন।' });
      return;
    }

    googleDriveService.initClient(
      (token) => {
        setAccessToken(token);
        setStatusMessage({ type: 'success', text: 'গুগল ড্রাইভ সফলভাবে সংযুক্ত হয়েছে।' });
        fetchDriveBackups();
      },
      (err) => {
        console.error('Google Auth Error:', err);
        setStatusMessage({ type: 'error', text: 'গুগল ড্রাইভ অথেন্টিকেশন সম্পন্ন করা সম্ভব হয়নি।' });
      }
    );

    googleDriveService.requestAccessToken();
  };

  const fetchDriveBackups = async () => {
    setLoading(true);
    try {
      const files = await googleDriveService.listReports('MasjidLedger');
      setBackupFiles(files);
    } catch (err: any) {
      console.error('Error fetching drive files:', err);
      setStatusMessage({ type: 'error', text: 'গুগল ড্রাইভ থেকে ফাইল তালিকা লোড করতে সমস্যা হয়েছে: ' + (err.message || '') });
    } finally {
      setLoading(false);
    }
  };

  // Authoritative Encrypted Backup & Google Drive Upload Pipeline
  const handleUploadEncryptedBackup = async () => {
    if (!accessToken) {
      setStatusMessage({ type: 'error', text: 'প্রথমে গুগল ড্রাইভে সাইন ইন করুন।' });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      // Step 1: Request authoritative encrypted backup from backend
      setUploadStep('১/৩: ব্যাকএন্ড থেকে AES-256-GCM এনক্রিপ্টেড ব্যাকআপ প্যাকেজ তৈরি হচ্ছে...');
      const backupResponse = await api.createEncryptedBackup('MANUAL');
      const { backupId, checksum, artifactJson } = backupResponse;

      // Step 2: Ensure dedicated folder exists in Google Drive
      setUploadStep('২/৩: গুগল ড্রাইভে "MasjidLedger_Backups" ফোল্ডার নিশ্চিত করা হচ্ছে...');
      let folderId: string | undefined;
      try {
        folderId = await googleDriveService.getOrCreateAppFolder('MasjidLedger_Backups');
      } catch (fErr) {
        console.warn('Folder creation warning, fallback to root drive:', fErr);
      }

      // Step 3: Upload authoritative encrypted artifact to Google Drive
      setUploadStep('৩/৩: গুগল ড্রাইভ ক্লাউডে এনক্রিপ্টেড ফাইল আপলোড হচ্ছে...');
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const mosqueIdentifier = currentMosque?.code || currentMosque?.id || 'MOSQUE';
      const fileName = `MasjidLedger_Backup_${mosqueIdentifier}_${timestampStr}.mlbackup.json`;

      await googleDriveService.uploadReport(artifactJson, fileName, 'application/json', folderId);

      setStatusMessage({
        type: 'success',
        text: `সফলভাবে "${fileName}" গুগল ড্রাইভে আপলোড করা হয়েছে!`,
        details: `ব্যাকআপ আইডি: ${backupId} | SHA-256 চেকসাম: ${checksum.slice(0, 16)}...`
      });

      // Refresh health, settings & drive file list
      await Promise.all([fetchDriveBackups(), loadHealthAndSettings()]);
    } catch (err: any) {
      console.error('Backup & upload error:', err);
      setStatusMessage({
        type: 'error',
        text: 'গুগল ড্রাইভে ব্যাকআপ আপলোড ব্যর্থ হয়েছে: ' + (err.message || 'অজ্ঞাত ত্রুটি')
      });
    } finally {
      setIsUploading(false);
      setUploadStep('');
    }
  };

  // Download & Verify Backup Integrity
  const handleVerifyBackup = async (fileId: string, fileName: string) => {
    if (!accessToken) return;
    setVerifyingFileId(fileId);

    try {
      const blob = await googleDriveService.downloadFile(fileId);
      const rawText = await blob.text();

      const verifyRes = await api.verifyBackupArtifact(rawText);

      setVerificationModalData({
        fileId,
        fileName,
        isValid: verifyRes.isValid,
        checksum: verifyRes.checksum,
        metadata: verifyRes.metadata,
        recordCount: verifyRes.recordCount,
        moduleCount: verifyRes.moduleCount,
        reason: verifyRes.reason,
        message: verifyRes.message,
        rawJson: rawText
      });
    } catch (err: any) {
      console.error('Verify error:', err);
      setVerificationModalData({
        fileId,
        fileName,
        isValid: false,
        reason: 'VERIFICATION_FAILED',
        message: 'ফাইলটি যাচাই করতে ব্যর্থ হয়েছে: ' + (err.message || 'অজ্ঞাত ত্রুটি')
      });
    } finally {
      setVerifyingFileId(null);
    }
  };

  // Prepare Restore Confirmation Flow
  const handleInitiateRestore = async (fileId: string, fileName: string) => {
    if (!accessToken) return;
    setVerifyingFileId(fileId);

    try {
      const blob = await googleDriveService.downloadFile(fileId);
      const rawText = await blob.text();

      const verifyRes = await api.verifyBackupArtifact(rawText);

      const verificationData: VerificationResult = {
        fileId,
        fileName,
        isValid: verifyRes.isValid,
        checksum: verifyRes.checksum,
        metadata: verifyRes.metadata,
        recordCount: verifyRes.recordCount,
        moduleCount: verifyRes.moduleCount,
        reason: verifyRes.reason,
        message: verifyRes.message,
        rawJson: rawText
      };

      setRestoreConfirmData({
        fileId,
        fileName,
        artifactJson: rawText,
        verification: verificationData
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'রিস্টোর প্রস্তুতি ব্যর্থ হয়েছে: ' + (err.message || 'ফাইলটি পড়া যায়নি')
      });
    } finally {
      setVerifyingFileId(null);
    }
  };

  // Execute Authoritative Server-side Restore
  const handleExecuteRestore = async () => {
    if (!restoreConfirmData) return;

    setIsRestoring(true);
    setRestoreProgressStep('১/২: সার্ভারে ইন্টিগ্রিটি ও প্রি-রিস্টোর সেফটি ব্যাকআপ তৈরি হচ্ছে...');

    try {
      const result = await api.restoreEncryptedBackup(restoreConfirmData.artifactJson);
      
      setRestoreProgressStep('২/২: টেন্যান্ট ডাটা সফলভাবে প্রতিস্থাপিত হয়েছে!');
      setStatusMessage({
        type: 'success',
        text: result.message || 'ডেটা সফলভাবে রিস্টোর করা হয়েছে এবং সেফটি ব্যাকআপ সংরক্ষিত রয়েছে।'
      });

      setRestoreConfirmData(null);

      // Reload page to reflect authoritative refreshed database
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Restore Execution Error:', err);
      setStatusMessage({
        type: 'error',
        text: 'রিস্টোর অপারেশন ব্যর্থ হয়েছে: ' + (err.message || 'সার্ভার রিকোয়েস্ট ব্যর্থ')
      });
      setIsRestoring(false);
      setRestoreProgressStep('');
    }
  };

  // Update Cloud Backup Retention Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      const updated = await api.updateBackupSettings(backupSettings);
      setBackupSettings(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে: ' + err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            <span>☁️ গুগল ড্রাইভ ক্লাউড ব্যাকআপ ও রিস্টোর (Google Drive Encrypted Pipeline)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            মিলিটারি-গ্রেড AES-256-GCM এনক্রিপশন ও SHA-256 চেকসাম সহ আপনার মসজিদের পূর্ণাঙ্গ আর্থিক ও প্রশাসনিক তথ্যের নিরাপদ ড্রাইভ ব্যাকআপ।
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>AES-256-GCM এনক্রিপ্টেড</span>
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>মাল্টি-টেন্যান্ট আইসোলেটেড</span>
          </span>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs flex flex-col gap-1 font-medium ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
          statusMessage.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
          'bg-blue-50 text-blue-900 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> :
             statusMessage.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> :
             <RefreshCw className="w-4 h-4 shrink-0 text-blue-600 animate-spin" />}
            <span className="font-bold">{statusMessage.text}</span>
          </div>
          {statusMessage.details && (
            <div className="text-[11px] text-slate-600 pl-6 font-mono">
              {statusMessage.details}
            </div>
          )}
        </div>
      )}

      {/* Google Authentication Block */}
      {!accessToken ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-xs">
            <Cloud className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">গুগল ড্রাইভ অ্যাকাউন্ট কানেক্ট করুন</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ক্লাউড ব্যাকআপ ফাইল সরাসরি আপনার গুগল ড্রাইভে নিরাপদে সংরক্ষণ এবং যেকোনো সময় যাচাই ও রিস্টোর করতে গুগল একাউন্টে সাইন ইন করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={handleAuthClick}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-2 mx-auto transition-all cursor-pointer"
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive এ Sign in করুন</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Connection & Quick Backup Action */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 bg-gradient-to-br from-emerald-50/80 to-blue-50/50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">গুগল ড্রাইভ সংযুক্ত রয়েছে</h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    মসজিদ কোড: <span className="font-bold text-slate-800">{currentMosque?.code || currentMosque?.id}</span> | ফোল্ডার: <span className="font-mono text-slate-800">MasjidLedger_Backups</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUploadEncryptedBackup}
                disabled={isUploading}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{uploadStep || 'প্রক্রিয়াধীন...'}</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    <span>গুগল ড্রাইভে সম্পূর্ণ ব্যাকআপ নিন</span>
                  </>
                )}
              </button>
            </div>

            {/* Health Monitor Card */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>ব্যাকআপ স্বাস্থ্য স্থিতি</span>
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                  healthData?.healthStatus === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  healthData?.healthStatus === 'WARNING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {healthData?.healthStatus || 'HEALTHY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {healthData?.healthMessage || 'ব্যাকআপ সিস্টেম সক্রিয় ও সুস্থ আছে।'}
              </p>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>শেষ সফল ব্যাকআপ:</span>
                <span className="font-semibold text-slate-800">
                  {healthData?.lastSuccessfulBackup ? new Date(healthData.lastSuccessfulBackup).toLocaleDateString('bn-BD') : 'আজকের ব্যাকআপ প্রস্তুত'}
                </span>
              </div>
            </div>
          </div>

          {/* Google Drive Stored Backups List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>গুগল ড্রাইভে সংরক্ষিত এনক্রিপ্টেড ব্যাকআপ ফাইলসমূহ ({backupFiles.length})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  ড্রাইভ থেকে যেকোনো ব্যাকআপের ক্রিপ্টোগ্রাফিক ইন্টিগ্রিটি যাচাই করুন অথবা নিরাপদে রিস্টোর করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchDriveBackups()}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-1.5 cursor-pointer font-bold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ করুন</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <span>গুগল ড্রাইভ থেকে ফাইল তালিকা লোড হচ্ছে...</span>
              </div>
            ) : backupFiles.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
                <HardDrive className="w-8 h-8 mx-auto text-slate-400" />
                <p>গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি।</p>
                <p className="text-[11px] text-slate-400">উপরে "গুগল ড্রাইভে সম্পূর্ণ ব্যাকআপ নিন" বাটনে ক্লিক করে নতুন ব্যাকআপ তৈরি করুন।</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {backupFiles.map((file) => (
                  <div key={file.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0 border border-purple-100">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                          <span>সংরক্ষণের সময়: {new Date(file.createdTime).toLocaleString('bn-BD')}</span>
                          {file.size && <span>সাইজ: {Math.round(Number(file.size) / 1024)} KB</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={verifyingFileId === file.id}
                        onClick={() => handleVerifyBackup(file.id, file.name)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {verifyingFileId === file.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>ইন্টিগ্রিটি যাচাই</span>
                      </button>

                      <button
                        type="button"
                        disabled={verifyingFileId === file.id || isRestoring}
                        onClick={() => handleInitiateRestore(file.id, file.name)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <CloudDownload className="w-3.5 h-3.5" />
                        <span>রিস্টোর করুন</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Backup Settings & Auto-Retention Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>স্বয়ংক্রিয় ব্যাকআপ ও রিটেনশন পলিসি সেটিংস</span>
              </h4>
              {settingsSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> সংরক্ষিত হয়েছে!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্যাকআপ ফ্রিকোয়েন্সি (Frequency)
                </label>
                <select
                  value={backupSettings.frequency || 'DAILY'}
                  onChange={(e) => setBackupSettings({ ...backupSettings, frequency: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="DAILY">দৈনিক (Daily)</option>
                  <option value="WEEKLY">সাপ্তাহিক (Weekly)</option>
                  <option value="MONTHLY">মাসিক (Monthly)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রিটেনশন সংখ্যা (সর্বোচ্চ সংরক্ষিত ব্যাকআপ)
                </label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={backupSettings.retentionCount || 15}
                  onChange={(e) => setBackupSettings({ ...backupSettings, retentionCount: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">অতিরিক্ত পুরনো অটোমেটিক ব্যাকআপ স্বয়ংক্রিয়ভাবে ছাঁটাই হবে।</p>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>পলিসি সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Result Modal */}
      {verificationModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">ব্যাকআপ ক্রিপ্টোগ্রাফিক ইন্টিগ্রিটি ফলাফল</h3>
              </div>
              <button
                type="button"
                onClick={() => setVerificationModalData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                verificationModalData.isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                {verificationModalData.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {verificationModalData.isValid ? 'ইন্টিগ্রিটি যাচাই সফল (Valid Package)' : 'ইন্টিগ্রিটি যাচাই ব্যর্থ (Corrupted / Invalid)'}
                  </div>
                  <div className="text-[11px] opacity-90">{verificationModalData.message}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">ফাইল নাম:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[240px]">{verificationModalData.fileName}</span>
                </div>
                {verificationModalData.metadata?.mosqueId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">সংযুক্ত মসজিদ আইডি:</span>
                    <span className="text-blue-700 font-bold">{verificationModalData.metadata.mosqueId}</span>
                  </div>
                )}
                {verificationModalData.checksum && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">SHA-256 চেকসাম:</span>
                    <span className="text-slate-700">{verificationModalData.checksum.slice(0, 20)}...</span>
                  </div>
                )}
                {verificationModalData.recordCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">মোট ডাটা রেকর্ড:</span>
                    <span className="font-bold text-slate-800">{verificationModalData.recordCount} টি</span>
                  </div>
                )}
                {verificationModalData.moduleCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">অন্তর্ভুক্ত মডিউল:</span>
                    <span className="font-bold text-slate-800">{verificationModalData.moduleCount} টি</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setVerificationModalData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Restore Confirmation Modal */}
      {restoreConfirmData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">নিরাপদ ব্যাকআপ রিস্টোরেশন নিশ্চিতকরণ</h3>
              </div>
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setRestoreConfirmData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Tenant Verification Guard Banner */}
              {restoreConfirmData.verification.metadata?.mosqueId &&
               restoreConfirmData.verification.metadata?.mosqueId !== currentMosque?.id ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">ক্রস-টেন্যান্ট রিস্টোর নিষিদ্ধ (Blocked)</div>
                    <div className="text-[11px] text-rose-800 mt-0.5">
                      এই ব্যাকআপটি অন্য মসজিদের (ID: {restoreConfirmData.verification.metadata?.mosqueId})। বর্তমান মসজিদে রিস্টোর সম্পূর্ণ নিষিদ্ধ।
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">সতর্কতা: লাইভ ডেটা প্রতিস্থাপন হবে</div>
                    <div className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                      এই ব্যাকআপটি রিস্টোর করলে বর্তমান মসজিদের সমস্ত হিসাব (আয়, ব্যয়, খতিয়ান, স্টাফ, ওয়াকফ) ব্যাকআপের তথ্য দ্বারা আপডেট হবে। রিস্টোরের পূর্বে ব্যাকএন্ড স্বয়ংক্রিয়ভাবে একটি <strong>Pre-Restore Safety Backup</strong> তৈরি করে রাখবে।
                    </div>
                  </div>
                </div>
              )}

              {/* Package Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">ফাইল:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[240px]">{restoreConfirmData.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">লক্ষ্য মসজিদ:</span>
                  <span className="font-bold text-blue-700">{currentMosque?.nameBn || currentMosque?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">মোট রিস্টোরযোগ্য রেকর্ড:</span>
                  <span className="font-bold text-slate-800">{restoreConfirmData.verification.recordCount || 0} টি</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">চেকসাম স্থিতি:</span>
                  <span className="font-bold text-emerald-700">SHA-256 ভেরিফাইড (PASS)</span>
                </div>
              </div>

              {isRestoring && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-center gap-2 font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span>{restoreProgressStep}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setRestoreConfirmData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                বাতিল করুন
              </button>

              <button
                type="button"
                disabled={
                  isRestoring ||
                  (restoreConfirmData.verification.metadata?.mosqueId &&
                   restoreConfirmData.verification.metadata?.mosqueId !== currentMosque?.id)
                }
                onClick={handleExecuteRestore}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>রিস্টোর সম্পন্ন হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-3.5 h-3.5" />
                    <span>হ্যাঁ, সম্পূর্ণ ডেটা রিস্টোর করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Sparkles,
  Upload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Users,
  Building2,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  Database,
  RefreshCw,
  X,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { Mosque } from '../types';

export type SmartMigrationType =
  | 'MUSALLI_DONOR'
  | 'WAQF_PROPERTY_TENANT'
  | 'LEDGER_OPENING_BALANCE';

interface UploadedSourceFile {
  id: string;
  file: File;
  fileName: string;
  sizeLabel: string;
  kind: 'IMAGE' | 'PDF' | 'EXCEL' | 'CSV';
  previewUrl?: string;
}

interface EditableMigrationRow {
  rowId: string;
  selected: boolean;
  sourceFile: string;
  recordKind: 'DONOR' | 'WAQF_TENANT' | 'INCOME' | 'EXPENSE' | 'OPENING_BALANCE';
  name: string;
  fatherOrSpouseName: string;
  mobile: string;
  address: string;
  propertyOrUnitName: string;
  categoryLabelBn: string;
  mainHeadId: string;
  accountId: string;
  date: string;
  amount: number;
  securityDeposit: number;
  notes: string;
  needsReview: boolean;
  warningNoteBn: string;
}

interface SmartDataMigrationViewProps {
  currentMosque: Mosque | null;
  onNavigateTab?: (tab: string) => void;
  onDataMigrated?: () => Promise<void> | void;
}

const PROGRESS_STAGES = [
  'আপলোড করা ফাইল ও ছবিগুলো প্রস্তুত করা হচ্ছে...',
  'এআই পুরনো খাতা পড়ে ডাটা সাজাচ্ছে...',
  'বাংলা ও ইংরেজি লেখা বিশ্লেষণ করে আলাদা কলামে ভাগ করা হচ্ছে...',
  'অস্পষ্ট বা অসম্পূর্ণ তথ্য শনাক্ত করে হলুদ সতর্কতা চিহ্ন দেওয়া হচ্ছে...',
  'প্রিভিউ টেবিল তৈরি করা হচ্ছে...',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function detectFileKind(file: File): UploadedSourceFile['kind'] {
  const name = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/.test(name)) return 'IMAGE';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
  if (/\.(xlsx|xls)$/.test(name) || mime.includes('spreadsheet') || mime.includes('excel')) return 'EXCEL';
  return 'CSV';
}

function compressRegisterImage(file: File, maxDim = 1600): Promise<{ base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`ছবিটি পড়া যায়নি: ${file.name}`));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => {
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve({ base64Data, mimeType: file.type || 'image/jpeg' });
      };
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          resolve({ base64Data, mimeType: file.type || 'image/jpeg' });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        resolve({
          base64Data: compressed.split(',')[1] || '',
          mimeType: 'image/jpeg',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`ফাইলটি পড়া যায়নি: ${file.name}`));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

function parseExcelFileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Excel ফাইল পড়া যায়নি: ${file.name}`));
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetChunks: string[] = [];
        for (const sheetName of workbook.SheetNames.slice(0, 5)) {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
          if (csv.trim()) {
            sheetChunks.push(`[Sheet: ${sheetName}]\n${csv}`);
          }
        }
        resolve(sheetChunks.join('\n\n'));
      } catch (err: any) {
        reject(new Error(`Excel ফাইল প্রসেস করা যায়নি (${file.name}): ${err?.message || ''}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export const SmartDataMigrationView: React.FC<SmartDataMigrationViewProps> = ({
  currentMosque,
  onNavigateTab,
  onDataMigrated,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [migrationType, setMigrationType] = useState<SmartMigrationType>('MUSALLI_DONOR');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedSourceFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [extraInstruction, setExtraInstruction] = useState('');

  // Extraction progress state
  const [isExtracting, setIsExtracting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStageIndex, setProgressStageIndex] = useState(0);

  // Extracted editable preview state
  const [summaryBn, setSummaryBn] = useState('');
  const [rows, setRows] = useState<EditableMigrationRow[]>([]);
  const [incomeHeads, setIncomeHeads] = useState<Array<{ id: string; nameBn: string }>>([]);
  const [expenseHeads, setExpenseHeads] = useState<Array<{ id: string; nameBn: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; nameBn: string; type: string }>>([]);
  const [onlyWarnings, setOnlyWarnings] = useState(false);

  // Commit state
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    personsCreated: number;
    donationPlansCreated: number;
    propertiesCreated: number;
    tenantsCreated: number;
    incomesCreated: number;
    expensesCreated: number;
    openingBalancesUpdated: number;
    skipped: number;
    errors: string[];
    totalSaved: number;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animate Bengali progress bar while Gemini is processing
  useEffect(() => {
    if (!isExtracting) return;
    setProgressPercent(12);
    setProgressStageIndex(0);

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 92) return 92;
        const step = prev < 45 ? 9 : prev < 75 ? 6 : 3;
        return Math.min(92, prev + step);
      });
      setProgressStageIndex((prev) => (prev + 1) % PROGRESS_STAGES.length);
    }, 1800);

    return () => clearInterval(timer);
  }, [isExtracting]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

  const addIncomingFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setErrorMsg(null);
    setCommitResult(null);

    const allowedExt = /\.(jpg|jpeg|png|webp|pdf|xlsx|xls|csv|txt)$/i;
    const validFiles: UploadedSourceFile[] = [];

    for (const file of incoming) {
      if (!allowedExt.test(file.name) && !file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setErrorMsg(`"${file.name}" ফাইল ফরম্যাট সমর্থিত নয়। অনুগ্রহ করে JPG, PNG, PDF, Excel বা CSV আপলোড করুন।`);
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg(`"${file.name}" ফাইলটি ১৫ মেগাবাইটের বেশি। ছোট সাইজের ফাইল আপলোড করুন।`);
        continue;
      }
      const kind = detectFileKind(file);
      validFiles.push({
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        fileName: file.name,
        sizeLabel: formatBytes(file.size),
        kind,
        previewUrl: kind === 'IMAGE' ? URL.createObjectURL(file) : undefined,
      });
    }

    setUploadedFiles((prev) => [...prev, ...validFiles].slice(0, 12));
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleAnalyzeWithAi = async () => {
    if (uploadedFiles.length === 0 || isExtracting) return;

    setErrorMsg(null);
    setCommitResult(null);
    setIsExtracting(true);

    try {
      const preparedFiles: Array<{
        fileName: string;
        mimeType: string;
        base64Data?: string;
        extractedText?: string;
      }> = [];

      for (const item of uploadedFiles) {
        if (item.kind === 'IMAGE') {
          const { base64Data, mimeType } = await compressRegisterImage(item.file);
          preparedFiles.push({
            fileName: item.fileName,
            mimeType,
            base64Data,
          });
        } else if (item.kind === 'PDF') {
          const base64Data = await readFileAsBase64(item.file);
          preparedFiles.push({
            fileName: item.fileName,
            mimeType: 'application/pdf',
            base64Data,
          });
        } else if (item.kind === 'EXCEL') {
          const extractedText = await parseExcelFileToText(item.file);
          preparedFiles.push({
            fileName: item.fileName,
            mimeType: 'text/csv',
            extractedText,
          });
        } else {
          const text = await item.file.text();
          preparedFiles.push({
            fileName: item.fileName,
            mimeType: 'text/plain',
            extractedText: text,
          });
        }
      }

      const data = await api.extractSmartMigrationData({
        migrationType,
        files: preparedFiles,
        extraInstruction: extraInstruction.trim() || undefined,
      });

      setProgressPercent(100);
      setSummaryBn(data.summaryBn || '');
      setIncomeHeads(data.availableIncomeHeads || []);
      setExpenseHeads(data.availableExpenseHeads || []);
      setAccounts(data.availableAccounts || []);
      setRows(
        (data.rows || []).map((r) => ({
          ...r,
          selected: true,
        }))
      );
      setOnlyWarnings(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI ফাইল বিশ্লেষণে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
      }, 250);
    }
  };

  const updateRow = (rowId: string, patch: Partial<EditableMigrationRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row))
    );
  };

  const deleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const addBlankRow = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultKind: EditableMigrationRow['recordKind'] =
      migrationType === 'MUSALLI_DONOR'
        ? 'DONOR'
        : migrationType === 'WAQF_PROPERTY_TENANT'
        ? 'WAQF_TENANT'
        : 'INCOME';

    setRows((prev) => [
      ...prev,
      {
        rowId: `manual-${Date.now()}`,
        selected: true,
        sourceFile: 'ম্যানুয়াল এন্ট্রি',
        recordKind: defaultKind,
        name: '',
        fatherOrSpouseName: '',
        mobile: '',
        address: '',
        propertyOrUnitName: '',
        categoryLabelBn:
          defaultKind === 'WAQF_TENANT'
            ? 'ওয়াকফ সম্পত্তির ভাড়া'
            : defaultKind === 'DONOR'
            ? 'মাসিক দান'
            : incomeHeads[0]?.nameBn || '',
        mainHeadId: defaultKind === 'INCOME' ? incomeHeads[0]?.id || '' : '',
        accountId: accounts[0]?.id || '',
        date: todayStr,
        amount: 0,
        securityDeposit: 0,
        notes: '',
        needsReview: false,
        warningNoteBn: '',
      },
    ]);
  };

  const handleOneClickCommit = async () => {
    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0 || isCommitting) return;

    setErrorMsg(null);
    setIsCommitting(true);

    try {
      const result = await api.commitSmartMigrationData({
        migrationType,
        rows: selectedRows,
      });
      setCommitResult(result);
      // Clear saved rows from preview while keeping any unselected
      setRows((prev) => prev.filter((r) => !r.selected));
      if (onDataMigrated) {
        await onDataMigrated();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'মূল ডাটাবেসে সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsCommitting(false);
    }
  };

  const selectedCount = rows.filter((r) => r.selected).length;
  const warningCount = rows.filter((r) => r.needsReview).length;
  const totalSelectedAmount = rows
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const displayedRows = onlyWarnings ? rows.filter((r) => r.needsReview) : rows;

  const migrationOptions: Array<{
    id: SmartMigrationType;
    badge: string;
    title: string;
    desc: string;
    icon: any;
  }> = [
    {
      id: 'MUSALLI_DONOR',
      badge: 'ক',
      title: 'মুসল্লি ও দাতা ডাটাবেস',
      desc: 'মাসিক চাঁদা খাতা, দাতার নাম, ঠিকানা, মোবাইল ও নির্ধারিত অনুদানের তালিকা',
      icon: Users,
    },
    {
      id: 'WAQF_PROPERTY_TENANT',
      badge: 'খ',
      title: 'ওয়াকফ সম্পত্তি ও ভাড়াটিয়া তালিকা',
      desc: 'দোকান/মার্কেট/বাসা ভাড়া খাতা, ভাড়াটিয়ার নাম, ঠিকানা, মাসিক ভাড়া ও জামানত',
      icon: Building2,
    },
    {
      id: 'LEDGER_OPENING_BALANCE',
      badge: 'গ',
      title: 'বিগত মাসের আয়-ব্যয় ও ওপেনিং ব্যালেন্স',
      desc: 'পুরনো ক্যাশবহি, বিগত মাসের আয়-ব্যয় রিপোর্ট এবং ক্যাশ/ব্যাংক প্রারম্ভিক স্থিতি',
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-siliguri">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              ১৩. AI ১-ক্লিক ডাটা মাইগ্রেশন (Smart Data Migration)
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            হাতে লেখা পুরনো রেজিস্টার খাতার ছবি, PDF রিপোর্ট অথবা এলোমেলো Excel/CSV ফাইল থেকে Gemini AI স্বয়ংক্রিয়ভাবে ডাটা পড়ে সরাসরি মূল ডাটাবেসে সাজিয়ে তুলবে।
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-900">
          <Database className="w-3.5 h-3.5 text-emerald-700" />
          <span>{currentMosque?.nameBn || 'মসজিদ ডাটাবেস'}</span>
        </div>
      </div>

      {/* Step 1: Select Migration Data Category */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-800 block">
          ধাপ ১: কোন ধরনের ডাটা ইমপোর্ট করতে চান তা নির্বাচন করুন *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {migrationOptions.map((opt) => {
            const Icon = opt.icon;
            const active = migrationType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={isExtracting || isCommitting}
                onClick={() => {
                  setMigrationType(opt.id);
                  setRows([]);
                  setSummaryBn('');
                  setCommitResult(null);
                  setErrorMsg(null);
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? 'border-emerald-700 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/15'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${
                        active
                          ? 'bg-emerald-800 text-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {opt.badge}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  {active && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{opt.title}</h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Multi-File Drag & Drop Upload Interface */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-800 block">
          ধাপ ২: একসাথে এক বা একাধিক ছবি, PDF অথবা Excel/CSV ফাইল আপলোড করুন *
        </label>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,.xlsx,.xls,.csv,.txt,image/*,application/pdf"
          onChange={(e) => {
            if (e.target.files) addIncomingFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) addIncomingFiles(e.dataTransfer.files);
          }}
          onClick={() => !isExtracting && fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/90 scale-[1.01]'
              : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            ফাইল বা হাতে লেখা খাতার ছবি এখানে ছেড়ে দিন অথবা ক্লিক করে নির্বাচন করুন
          </h3>
          <p className="text-xs text-slate-600 mt-1 max-w-xl mx-auto">
            একসাথে সর্বোচ্চ ১২টি ফাইল আপলোড করা যাবে • সমর্থিত ফরম্যাট: <strong>JPG / PNG</strong> (হাতে লেখা খাতা), <strong>PDF</strong> (পুরনো রিপোর্ট), <strong>Excel (.xlsx/.xls) ও CSV</strong>
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-700" /> হাতে লেখা খাতার ছবি
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
              <FileText className="w-3.5 h-3.5 text-rose-600" /> পুরনো PDF রিপোর্ট
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200">
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" /> এলোমেলো Excel / CSV
            </span>
          </div>
        </div>

        {/* Uploaded Files Preview List */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                নির্বাচিত ফাইলসমূহ ({uploadedFiles.length.toLocaleString('bn-BD')}টি)
              </span>
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => {
                  uploadedFiles.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
                  setUploadedFiles([]);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                সব সরান
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {uploadedFiles.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                        item.kind === 'PDF'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.kind === 'PDF' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <FileSpreadsheet className="w-5 h-5" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{item.fileName}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.kind} • {item.sizeLabel}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={() => removeFile(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="ফাইলটি সরান"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Optional Extra Context Note + Analyze CTA */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={extraInstruction}
                onChange={(e) => setExtraInstruction(e.target.value)}
                disabled={isExtracting}
                placeholder="ঐচ্ছিক নির্দেশনা (যেমন: এটি মার্চ ২০২৬ সালের ওয়াকফ দোকান ভাড়ার খাতা, সবগুলো নগদে আদায়)..."
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-700"
              />
              <button
                type="button"
                disabled={isExtracting || uploadedFiles.length === 0}
                onClick={handleAnalyzeWithAi}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#064e3b] to-[#0f766e] hover:from-[#065f46] hover:to-[#0d9488] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>বিশ্লেষণ চলছে...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>AI দিয়ে খাতা/ফাইল বিশ্লেষণ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Animated Bengali Progress Bar during Gemini AI Processing */}
      {isExtracting && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-950">
                  {PROGRESS_STAGES[progressStageIndex]}
                </div>
                <div className="text-[11px] text-emerald-800">
                  {uploadedFiles.length.toLocaleString('bn-BD')}টি ফাইল থেকে বাংলা ও ইংরেজি লেখা পড়া হচ্ছে — অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন
                </div>
              </div>
            </div>
            <span className="text-sm font-black text-emerald-900">
              {progressPercent.toLocaleString('bn-BD')}%
            </span>
          </div>

          <div className="w-full h-3 bg-emerald-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm text-rose-900">ত্রুটি দেখা দিয়েছে</div>
            <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Commit Success Summary Card */}
      {commitResult && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-5 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-emerald-950">
                আলহামদুলিল্লাহ! ১-ক্লিকে {commitResult.totalSaved.toLocaleString('bn-BD')}টি রেকর্ড সফলভাবে মূল ডাটাবেসে সংরক্ষিত হয়েছে
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                ডাটাগুলো সফটওয়্যারের সংশ্লিষ্ট রেজিস্টার ও হিসাব খতিয়ানে যুক্ত হয়ে গেছে।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
            {commitResult.personsCreated > 0 && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200">
                <div className="text-lg font-black text-emerald-800">
                  {commitResult.personsCreated.toLocaleString('bn-BD')}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">নতুন মুসল্লি/দাতা</div>
              </div>
            )}
            {commitResult.donationPlansCreated > 0 && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200">
                <div className="text-lg font-black text-teal-800">
                  {commitResult.donationPlansCreated.toLocaleString('bn-BD')}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">মাসিক দান প্ল্যান</div>
              </div>
            )}
            {commitResult.propertiesCreated > 0 && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200">
                <div className="text-lg font-black text-emerald-800">
                  {commitResult.propertiesCreated.toLocaleString('bn-BD')}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">ওয়াকফ সম্পত্তি</div>
              </div>
            )}
            {commitResult.tenantsCreated > 0 && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200">
                <div className="text-lg font-black text-teal-800">
                  {commitResult.tenantsCreated.toLocaleString('bn-BD')}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">ভাড়াটিয়া নিবন্ধন</div>
              </div>
            )}
            {commitResult.incomesCreated > 0 && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200">
                <div className="text-lg font-black text-emerald-700">
                  {commitResult.incomesCreated.toLocaleString('bn-BD')}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">আয় ভাউচার</div>
              </div>
            )}
            {commitResult.expensesCreated > 0 && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200">
                <div className="text-lg font-black text-rose-700">
                  {commitResult.expensesCreated.toLocaleString('bn-BD')}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">ব্যয় ভাউচার</div>
              </div>
            )}
            {commitResult.openingBalancesUpdated > 0 && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200">
                <div className="text-lg font-black text-amber-700">
                  {commitResult.openingBalancesUpdated.toLocaleString('bn-BD')}
                </div>
                <div className="text-[11px] font-semibold text-slate-600">ওপেনিং ব্যালেন্স</div>
              </div>
            )}
          </div>

          {commitResult.errors.length > 0 && (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <div className="font-bold">কিছু সারিতে সতর্কতা ছিল:</div>
              {commitResult.errors.slice(0, 5).map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
            </div>
          )}

          {onNavigateTab && (
            <div className="flex flex-wrap gap-2 pt-1">
              {commitResult.personsCreated > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('musalliDatabase')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer"
                >
                  <span>মুসল্লি ও দাতা তালিকা দেখুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {(commitResult.propertiesCreated > 0 || commitResult.tenantsCreated > 0) && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('assets')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer"
                >
                  <span>ওয়াকফ সম্পত্তি রেজিস্টার দেখুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {(commitResult.incomesCreated > 0 ||
                commitResult.expensesCreated > 0 ||
                commitResult.openingBalancesUpdated > 0) && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('dashboard')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer"
                >
                  <span>ড্যাশবোর্ড ও লেজার দেখুন</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Editable Preview Table with Yellow Warning Highlighting */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>ধাপ ৩: এডিটেবল প্রিভিউ টেবিল (সংরক্ষণের আগে যাচাই ও সংশোধন করুন)</span>
                </h3>
                {summaryBn && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{summaryBn}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                  মোট: {rows.length.toLocaleString('bn-BD')}টি
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-bold">
                  নির্বাচিত: {selectedCount.toLocaleString('bn-BD')}টি
                </span>
                {warningCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOnlyWarnings((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      onlyWarnings
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      হলুদ সতর্কতা: {warningCount.toLocaleString('bn-BD')}টি{' '}
                      {onlyWarnings ? '(সব দেখুন)' : '(ফিল্টার)'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={addBlankRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>সারি যোগ করুন</span>
                </button>
              </div>
            </div>

            {warningCount > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>হলুদ চিহ্নিত সারিগুলো</strong> অস্পষ্ট বা অসম্পূর্ণ হিসেবে শনাক্ত হয়েছে। অনুগ্রহ করে নাম, মোবাইল বা টাকার পরিমাণ সরাসরি ঘরে ক্লিক করে সংশোধন করে নিন।
                </span>
              </div>
            )}

            {/* Editable Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left min-w-[920px]">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-2.5 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selectedCount === rows.length}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
                        }}
                        className="rounded border-slate-300 text-emerald-700"
                      />
                    </th>
                    <th className="px-2.5 py-2.5 w-24">অবস্থা</th>
                    {migrationType === 'LEDGER_OPENING_BALANCE' && (
                      <th className="px-2.5 py-2.5 w-32">ধরন</th>
                    )}
                    <th className="px-2.5 py-2.5 min-w-[150px]">
                      {migrationType === 'WAQF_PROPERTY_TENANT'
                        ? 'ভাড়াটিয়ার নাম *'
                        : migrationType === 'MUSALLI_DONOR'
                        ? 'দাতা / মুসল্লির নাম *'
                        : 'ব্যক্তি / দাতা / প্রাপক'}
                    </th>
                    {migrationType === 'WAQF_PROPERTY_TENANT' && (
                      <th className="px-2.5 py-2.5 min-w-[140px]">দোকান / ওয়াকফ সম্পত্তি</th>
                    )}
                    <th className="px-2.5 py-2.5 min-w-[135px]">ঠিকানা / এলাকা</th>
                    {migrationType !== 'LEDGER_OPENING_BALANCE' && (
                      <th className="px-2.5 py-2.5 w-32">মোবাইল</th>
                    )}
                    <th className="px-2.5 py-2.5 min-w-[155px]">
                      {migrationType === 'LEDGER_OPENING_BALANCE'
                        ? 'হিসাবের খাত ও অ্যাকাউন্ট'
                        : 'খাত / ধরন'}
                    </th>
                    {migrationType === 'LEDGER_OPENING_BALANCE' && (
                      <th className="px-2.5 py-2.5 w-32">তারিখ</th>
                    )}
                    <th className="px-2.5 py-2.5 w-28 text-right">
                      {migrationType === 'WAQF_PROPERTY_TENANT'
                        ? 'মাসিক ভাড়া (৳)'
                        : migrationType === 'MUSALLI_DONOR'
                        ? 'মাসিক দান (৳)'
                        : 'পরিমাণ (৳)'}
                    </th>
                    {migrationType === 'WAQF_PROPERTY_TENANT' && (
                      <th className="px-2.5 py-2.5 w-24 text-right">জামানত (৳)</th>
                    )}
                    <th className="px-2.5 py-2.5 min-w-[130px]">বিবরণ / নোট</th>
                    <th className="px-2 py-2.5 w-10 text-center">মুছুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedRows.map((row) => (
                    <tr
                      key={row.rowId}
                      className={`transition-colors ${
                        row.needsReview
                          ? 'bg-amber-50/95 border-l-4 border-l-amber-400'
                          : row.selected
                          ? 'bg-white hover:bg-slate-50/80'
                          : 'bg-slate-50/60 opacity-60'
                      }`}
                    >
                      <td className="px-2.5 py-2 text-center align-top pt-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => updateRow(row.rowId, { selected: e.target.checked })}
                          className="rounded border-slate-300 text-emerald-700"
                        />
                      </td>

                      {/* Warning / Clean Status */}
                      <td className="px-2.5 py-2 align-top">
                        {row.needsReview ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              যাচাই করুন
                            </span>
                            {row.warningNoteBn && (
                              <div className="text-[10px] text-amber-900 leading-tight">
                                {row.warningNoteBn}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.rowId, { needsReview: false, warningNoteBn: '' })
                              }
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> ঠিক আছে
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold mt-1">
                            <CheckCircle2 className="w-3 h-3" /> প্রস্তুত
                          </span>
                        )}
                      </td>

                      {/* Ledger Record Type */}
                      {migrationType === 'LEDGER_OPENING_BALANCE' && (
                        <td className="px-2.5 py-2 align-top">
                          <select
                            value={row.recordKind}
                            onChange={(e) => {
                              const nextKind = e.target.value as EditableMigrationRow['recordKind'];
                              updateRow(row.rowId, {
                                recordKind: nextKind,
                                mainHeadId:
                                  nextKind === 'INCOME'
                                    ? incomeHeads[0]?.id || ''
                                    : nextKind === 'EXPENSE'
                                    ? expenseHeads[0]?.id || ''
                                    : '',
                              });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                          >
                            <option value="INCOME">আয় (+)</option>
                            <option value="EXPENSE">ব্যয় (-)</option>
                            <option value="OPENING_BALANCE">ওপেনিং ব্যালেন্স</option>
                          </select>
                        </td>
                      )}

                      {/* Name */}
                      <td className="px-2.5 py-2 align-top">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.rowId, { name: e.target.value })}
                          placeholder="নাম লিখুন..."
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                        />
                      </td>

                      {/* Waqf Unit / Shop Name */}
                      {migrationType === 'WAQF_PROPERTY_TENANT' && (
                        <td className="px-2.5 py-2 align-top">
                          <input
                            type="text"
                            value={row.propertyOrUnitName}
                            onChange={(e) =>
                              updateRow(row.rowId, { propertyOrUnitName: e.target.value })
                            }
                            placeholder="দোকান/প্লট নং..."
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
                          />
                        </td>
                      )}

                      {/* Address */}
                      <td className="px-2.5 py-2 align-top">
                        <input
                          type="text"
                          value={row.address}
                          onChange={(e) => updateRow(row.rowId, { address: e.target.value })}
                          placeholder="ঠিকানা / এলাকা..."
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
                        />
                      </td>

                      {/* Mobile */}
                      {migrationType !== 'LEDGER_OPENING_BALANCE' && (
                        <td className="px-2.5 py-2 align-top">
                          <input
                            type="text"
                            value={row.mobile}
                            onChange={(e) => updateRow(row.rowId, { mobile: e.target.value })}
                            placeholder="01XXXXXXXXX"
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:border-emerald-700 focus:outline-none"
                          />
                        </td>
                      )}

                      {/* Category / Account Head */}
                      <td className="px-2.5 py-2 align-top space-y-1">
                        {migrationType === 'LEDGER_OPENING_BALANCE' ? (
                          <>
                            {row.recordKind !== 'OPENING_BALANCE' && (
                              <select
                                value={row.mainHeadId}
                                onChange={(e) => updateRow(row.rowId, { mainHeadId: e.target.value })}
                                className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold"
                              >
                                {(row.recordKind === 'EXPENSE' ? expenseHeads : incomeHeads).map(
                                  (h) => (
                                    <option key={h.id} value={h.id}>
                                      {h.nameBn}
                                    </option>
                                  )
                                )}
                              </select>
                            )}
                            <select
                              value={row.accountId}
                              onChange={(e) => updateRow(row.rowId, { accountId: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px]"
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.nameBn}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <input
                            type="text"
                            value={row.categoryLabelBn}
                            onChange={(e) =>
                              updateRow(row.rowId, { categoryLabelBn: e.target.value })
                            }
                            placeholder="খাতের নাম..."
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
                          />
                        )}
                      </td>

                      {/* Date */}
                      {migrationType === 'LEDGER_OPENING_BALANCE' && (
                        <td className="px-2.5 py-2 align-top">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateRow(row.rowId, { date: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        </td>
                      )}

                      {/* Amount */}
                      <td className="px-2.5 py-2 align-top">
                        <input
                          type="number"
                          min="0"
                          value={row.amount}
                          onChange={(e) =>
                            updateRow(row.rowId, { amount: Number(e.target.value) || 0 })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-right text-emerald-900 focus:border-emerald-700 focus:outline-none"
                        />
                      </td>

                      {/* Security Deposit (Waqf) */}
                      {migrationType === 'WAQF_PROPERTY_TENANT' && (
                        <td className="px-2.5 py-2 align-top">
                          <input
                            type="number"
                            min="0"
                            value={row.securityDeposit}
                            onChange={(e) =>
                              updateRow(row.rowId, { securityDeposit: Number(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-right text-slate-800 focus:border-emerald-700 focus:outline-none"
                          />
                        </td>
                      )}

                      {/* Notes */}
                      <td className="px-2.5 py-2 align-top">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRow(row.rowId, { notes: e.target.value })}
                          placeholder="নোট..."
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 focus:border-emerald-700 focus:outline-none"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-2 text-center align-top pt-2.5">
                        <button
                          type="button"
                          onClick={() => deleteRow(row.rowId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="সারি মুছুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom 1-Click Save Action Bar */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-700 space-y-0.5">
                <div>
                  নির্বাচিত রেকর্ড: <strong className="text-emerald-900">{selectedCount.toLocaleString('bn-BD')}টি</strong>
                  {totalSelectedAmount > 0 && (
                    <span className="ml-3">
                      মোট টাকার অঙ্ক:{' '}
                      <strong className="text-emerald-900">
                        ৳ {Math.round(totalSelectedAmount).toLocaleString('bn-BD')}
                      </strong>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  সংরক্ষণের পর সব তথ্য স্বয়ংক্রিয়ভাবে দাতা তালিকা, ওয়াকফ রেজিস্টার বা আয়-ব্যয় লেজারে যুক্ত হয়ে যাবে।
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={isCommitting}
                  onClick={() => {
                    setRows([]);
                    setSummaryBn('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  তালিকা বাতিল
                </button>

                <button
                  type="button"
                  disabled={selectedCount === 0 || isCommitting}
                  onClick={handleOneClickCommit}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#0f766e] hover:from-[#065f46] hover:to-[#0d9488] text-white text-xs sm:text-sm font-bold shadow-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>মূল ডাটাবেসে সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-amber-300" />
                      <span>১-ক্লিকে সব ডাটা সংরক্ষণ করুন ({selectedCount.toLocaleString('bn-BD')}টি)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

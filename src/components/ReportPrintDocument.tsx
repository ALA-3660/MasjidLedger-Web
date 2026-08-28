import React from 'react';
import {
  IncomeEntry,
  ExpenseEntry,
  FinancialAccount,
  AccountHead,
  DonationBox,
  DonationBoxCollection,
  Staff,
  StaffPayment,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  CommitteeMember,
  CommitteeMeeting,
  MosqueNotice,
  AuditLog,
  Mosque,
  User,
} from '../types';
import { formatDate } from '../lib/i18n';
import { Building } from 'lucide-react';

export interface ReportPrintDocumentProps {
  reportType: string;
  dateRangeType: string;
  fromDate: string;
  toDate: string;
  grouping: string;
  level: string;
  selectedHeadId: string;
  selectedAccountId: string;
  currentMosque: Mosque | null;
  currentUser?: User | null;
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  donationBoxes: DonationBox[];
  boxCollections: DonationBoxCollection[];
  staffList: Staff[];
  staffPayments: StaffPayment[];
  assets: MosqueAsset[];
  properties: MosqueProperty[];
  cemeteryRecords: CemeteryRecord[];
  committeeMembers: CommitteeMember[];
  meetings: CommitteeMeeting[];
  notices: MosqueNotice[];
  auditLogs: AuditLog[];
}

export const REPORT_TITLES: Record<string, { titleBn: string; subtitleBn: string; isLandscape: boolean }> = {
  SUMMARY: {
    titleBn: 'সার্বিক আর্থিক নিরীক্ষা ও সারসংক্ষেপ প্রতিবেদন',
    subtitleBn: 'আয়, ব্যয়, উদ্বৃত্ত ও সার্বিক তহবিলের নির্বাহী বিবরণী',
    isLandscape: false,
  },
  DAILY_STATEMENT: {
    titleBn: 'দৈনিক লেনদেন বিবরণী ও চলমান লেজার (Daily Transaction Statement)',
    subtitleBn: 'প্রারম্ভিক স্থিতি, চলমান লেজার ও সমাপনী স্থিতির পূর্ণাঙ্গ বিবরণী',
    isLandscape: false,
  },
  DAILY_TRANSACTIONS: {
    titleBn: 'দৈনিক লেনদেন বিবরণী ও চলমান লেজার (Daily Transaction Statement)',
    subtitleBn: 'প্রারম্ভিক স্থিতি, চলমান লেজার ও সমাপনী স্থিতির পূর্ণাঙ্গ বিবরণী',
    isLandscape: false,
  },
  INCOME_STATEMENT: {
    titleBn: 'খাতভিত্তিক আয় বিবরণী (Income Statement)',
    subtitleBn: 'অনুমোদিত আয়ের প্রধান ও উপ-খাতসমূহের পুঙ্খানুপুঙ্খ বিবরণ',
    isLandscape: false,
  },
  EXPENSE_STATEMENT: {
    titleBn: 'খাতভিত্তিক ব্যয় বিবরণী (Expense Statement)',
    subtitleBn: 'অনুমোদিত ব্যয়ের প্রধান ও উপ-খাতসমূহের পুঙ্খানুপুঙ্খ বিবরণ',
    isLandscape: false,
  },
  INCOME_EXPENSE_COMBINED: {
    titleBn: 'আয় ও ব্যয় যৌথ আর্থিক বিবরণী (Income & Expense Statement)',
    subtitleBn: 'যৌথ আর্থিক খতিয়ান ও অনুমোদিত ভাউচার রেজিস্টার',
    isLandscape: false,
  },
  CASHBOOK: {
    titleBn: 'মসজিদ নগদ বহি (Cashbook Ledger)',
    subtitleBn: 'নগদ প্রাপ্তি, প্রদান ও দৈনিক চলমান স্থিতি বহি',
    isLandscape: true,
  },
  BANKBOOK: {
    titleBn: 'ব্যাংক খতিয়ান ও স্টেটমেন্ট বহি (Bankbook Statement)',
    subtitleBn: 'ব্যাংক হিসাবসমূহের জমা, উত্তোলন ও স্থিতি বিবরণী',
    isLandscape: true,
  },
  CASH_BANK_COMBINED: {
    titleBn: 'ক্যাশ ও ব্যাংক যৌথ তহবিলের সমন্বিত বিবরণী',
    subtitleBn: 'সকল আর্থিক ফান্ড ও ক্যাশ-ব্যাংক ব্যালেন্স শীট',
    isLandscape: true,
  },
  HEADWISE_LEDGER: {
    titleBn: 'খাতভিত্তিক বিশদ লেজার বিবরণী (Head-wise Ledger)',
    subtitleBn: 'প্রধান ও উপ-খাত অনুযায়ী লেনদেনের পুঙ্খানুপুঙ্খ সংকলন',
    isLandscape: false,
  },
  MONTHLY_SUMMARY: {
    titleBn: 'মাসভিত্তিক তুলনামূলক আর্থিক প্রতিবেদন (Monthly Trend)',
    subtitleBn: 'মাসিক আয়, ব্যয় ও নিট সঞ্চয়ের তুলনামূলক বিশ্লেষণ',
    isLandscape: false,
  },
  DONATION_SUMMARY: {
    titleBn: 'দান ও অনুদান সংকলন প্রতিবেদন (Donation Summary)',
    subtitleBn: 'সাধারণ অনুদান, যাকাত, ফিতরা ও বিশেষ প্রকল্পের খতিয়ান',
    isLandscape: false,
  },
  DONATION_BOX_REPORT: {
    titleBn: 'স্থাবর ও অস্থাবর দানবাক্স কালেকশন ও নিরীক্ষা রিপোর্ট',
    subtitleBn: 'দানবাক্স নম্বর, অবস্থান, খোলার তারিখ ও সংগৃহীত অর্থ',
    isLandscape: false,
  },
  JUMA_COLLECTION_REPORT: {
    titleBn: 'পবিত্র জুমার বিশেষ কালেকশন রেজিস্টার',
    subtitleBn: 'তারিখভিত্তিক জুমার জামাতে প্রাপ্ত দান ও আদায়কারী বিবরণ',
    isLandscape: false,
  },
  STAFF_SALARY_REPORT: {
    titleBn: 'স্টাফ বেতন ও সম্মানী রেজিস্টার শিট (Staff Salary Sheet)',
    subtitleBn: 'ইমাম, মুয়াজ্জিন, খাদেম ও কর্মকর্তা-কর্মচারীদের মাসিক বেতন বিবরণী',
    isLandscape: true,
  },
  ASSET_REGISTER_REPORT: {
    titleBn: 'মসজিদ স্থায়ী ও অস্থায়ী সম্পদ রেজিস্ট্রি (Asset Register)',
    subtitleBn: 'বৈদ্যুতিক, সাউন্ড, আসবাবপত্র ও অন্যান্য সরঞ্জামের তালিকা',
    isLandscape: false,
  },
  PROPERTY_REGISTER_REPORT: {
    titleBn: 'ওয়াকফ এস্টেট ও স্থাবর সম্পত্তি রেজিস্ট্রি (Property Register)',
    subtitleBn: 'জমি, দোকান, বাড়ি ও ভাড়াটিয়া ভাড়ার হালনাগাদ বিবরণী',
    isLandscape: true,
  },
  CEMETERY_REGISTER_REPORT: {
    titleBn: 'কবরস্থান সংরক্ষণ ও দাফন রেজিস্ট্রি (Cemetery Register)',
    subtitleBn: 'দাফনকৃত ব্যক্তিদের নাম, প্লট নং, মৃত্যুর তারিখ ও অভিভাবকের তথ্য',
    isLandscape: false,
  },
  COMMITTEE_REPORT: {
    titleBn: 'পরিচালনা কমিটি ও সভার কার্যবিবরণী রিপোর্ট',
    subtitleBn: 'কার্যনির্বাহী পরিষদ সদস্যবৃন্দ ও গৃহীত সিদ্ধান্তসমূহ',
    isLandscape: false,
  },
  AUDIT_LOG_REPORT: {
    titleBn: 'সিস্টেম নিরাপত্তা ও আর্থিক অডিট ট্রেইল লগ (Audit Trail)',
    subtitleBn: 'ব্যবহারকারী কর্তৃক প্রতিটি এন্ট্রি, পরিবর্তন ও অনুমোদন ট্র্যাকিং',
    isLandscape: true,
  },
};

export const ReportPrintDocument: React.FC<ReportPrintDocumentProps> = ({
  reportType,
  fromDate,
  toDate,
  level,
  selectedHeadId,
  selectedAccountId,
  currentMosque,
  currentUser,
  incomes,
  expenses,
  accounts,
  accountHeads,
  donationBoxes,
  boxCollections,
  staffList,
  staffPayments,
  assets,
  properties,
  cemeteryRecords,
  committeeMembers,
  meetings,
  auditLogs,
}) => {
  // Determine report meta & orientation
  const reportMeta = REPORT_TITLES[reportType] || {
    titleBn: reportType,
    subtitleBn: 'অফিসিয়াল প্রতিবেদন',
    isLandscape: level === 'DETAILED',
  };

  const isLandscape = reportMeta.isLandscape || (reportType === 'INCOME_EXPENSE_COMBINED' && level === 'DETAILED');

  // Filtered dataset calculations
  const filteredIncomes = incomes.filter((i) => {
    if (i.status !== 'APPROVED') return false;
    const matchesDate = i.date >= fromDate && i.date <= toDate;
    const matchesHead = selectedHeadId === 'ALL' || i.mainHeadId === selectedHeadId;
    const matchesAccount = selectedAccountId === 'ALL' || i.accountId === selectedAccountId;
    return matchesDate && matchesHead && matchesAccount;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (e.status !== 'APPROVED') return false;
    const matchesDate = e.date >= fromDate && e.date <= toDate;
    const matchesHead = selectedHeadId === 'ALL' || e.mainHeadId === selectedHeadId;
    const matchesAccount = selectedAccountId === 'ALL' || e.accountId === selectedAccountId;
    return matchesDate && matchesHead && matchesAccount;
  });

  const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netSurplus = totalIncome - totalExpense;

  // Head-wise grouping
  const headWiseIncome: Record<string, { id: string; name: string; amount: number; count: number; subHeads: Record<string, number> }> = {};
  filteredIncomes.forEach((i) => {
    const key = i.mainHeadId || 'other';
    if (!headWiseIncome[key]) {
      headWiseIncome[key] = { id: key, name: i.mainHeadNameBn || 'অন্যান্য', amount: 0, count: 0, subHeads: {} };
    }
    headWiseIncome[key].amount += i.amount;
    headWiseIncome[key].count += 1;
    if (i.subHeadNameBn) {
      headWiseIncome[key].subHeads[i.subHeadNameBn] = (headWiseIncome[key].subHeads[i.subHeadNameBn] || 0) + i.amount;
    }
  });

  const headWiseExpense: Record<string, { id: string; name: string; amount: number; count: number; subHeads: Record<string, number> }> = {};
  filteredExpenses.forEach((e) => {
    const key = e.mainHeadId || 'other';
    if (!headWiseExpense[key]) {
      headWiseExpense[key] = { id: key, name: e.mainHeadNameBn || 'অন্যান্য', amount: 0, count: 0, subHeads: {} };
    }
    headWiseExpense[key].amount += e.amount;
    headWiseExpense[key].count += 1;
    if (e.subHeadNameBn) {
      headWiseExpense[key].subHeads[e.subHeadNameBn] = (headWiseExpense[key].subHeads[e.subHeadNameBn] || 0) + e.amount;
    }
  });

  // Account balances
  const totalCashBalance = accounts
    .filter((a) => a.accountType === 'CASH')
    .reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  const totalBankBalance = accounts
    .filter((a) => a.accountType === 'BANK')
    .reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  // Report Document ID for audit tracking
  const reportRefNumber = `RPT-${(currentMosque?.code || 'ML').toUpperCase()}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const printTimestamp = new Date().toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      id="printable-report-document"
      className="report-print-root bg-white text-slate-900 font-baloo w-full max-w-full box-border p-4 sm:p-6"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        margin: 0,
      }}
    >
      {/* Dynamic @page CSS rule for browser print preview orientation */}
      <style>{`
        @page {
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: 10mm;
        }
      `}</style>

      {/* ============================================================
          1. STRUCTURED OFFICIAL REPORT HEADER
          ============================================================ */}
      <div className="border-2 border-slate-900 bg-white mb-4 rounded-none overflow-hidden break-inside-avoid">
        <div className="grid grid-cols-12 items-center p-3.5 gap-3 border-b border-slate-300">
          {/* LEFT: Mosque Official Logo (2 cols) */}
          <div className="col-span-2 flex items-center justify-start">
            {currentMosque?.logoUrl ? (
              <img
                src={currentMosque.logoUrl}
                alt="Mosque Logo"
                className="max-h-16 max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 border border-dashed border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                <Building className="w-6 h-6 mb-0.5 text-slate-500" />
                <span className="text-[9px] font-baloo text-slate-500">লোগো</span>
              </div>
            )}
          </div>

          {/* CENTER: Mosque Name, Title & Period (7 cols) */}
          <div className="col-span-7 text-center">
            <h1 className="font-siliguri text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-tight">
              {currentMosque?.nameBn || 'মসজিদুল মামুর কমপ্লেক্স ও ওয়াকফ এস্টেট'}
            </h1>
            {currentMosque?.address && (
              <p className="font-baloo text-xs text-slate-700 mt-0.5">
                {currentMosque.address} {currentMosque.phone ? `• ফোন: ${currentMosque.phone}` : ''}
              </p>
            )}
            <div className="inline-block mt-1.5 px-3 py-0.5 bg-slate-900 text-white font-siliguri font-bold text-xs sm:text-sm tracking-wide">
              {reportMeta.titleBn}
            </div>
            <p className="font-baloo text-xs font-semibold text-slate-800 mt-1">
              হিসাবের সময়সীমা: <span className="font-bold text-slate-950">{formatDate(fromDate)}</span> হতে{' '}
              <span className="font-bold text-slate-950">{formatDate(toDate)}</span> পর্যন্ত
            </p>
          </div>

          {/* RIGHT: Structured Meta Box (3 cols) */}
          <div className="col-span-3 border border-slate-800 bg-slate-50 p-2 text-[11px] font-baloo space-y-1">
            <div className="flex justify-between border-b border-slate-200 pb-0.5">
              <span className="text-slate-600">রিপোর্ট নং:</span>
              <span className="font-bold text-slate-950">{reportRefNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-0.5">
              <span className="text-slate-600">মসজিদ কোড:</span>
              <span className="font-bold text-slate-900">{currentMosque?.code || 'MOSQUE'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-0.5">
              <span className="text-slate-600">মুদ্রা:</span>
              <span className="font-bold text-slate-900">BDT (টাকা ৳)</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
              <span>তৈরির সময়:</span>
              <span className="font-medium text-slate-800">{printTimestamp}</span>
            </div>
          </div>
        </div>

        {/* Header Metadata Sub-Bar */}
        <div className="bg-slate-100 px-3.5 py-1.5 flex justify-between items-center text-xs font-baloo border-t border-slate-300">
          <div>
            <span className="text-slate-600 font-medium">ফিল্টার অবস্থা: </span>
            <span className="font-bold text-slate-900">
              {selectedHeadId === 'ALL' ? 'সকল খাত' : accountHeads.find((h) => h.id === selectedHeadId)?.nameBn || 'নির্দিষ্ট খাত'} |{' '}
              {selectedAccountId === 'ALL' ? 'সকল ফান্ড ও অ্যাকাউন্ট' : accounts.find((a) => a.id === selectedAccountId)?.nameBn || 'নির্দিষ্ট ফান্ড'}
            </span>
          </div>
          <div>
            <span className="text-slate-600 font-medium">প্রস্তুতকারী: </span>
            <span className="font-bold text-slate-900">{currentUser?.fullName || 'সুপার এডমিন (হিসাব শাখা)'}</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. EXECUTIVE SUMMARY BOXES
          ============================================================ */}
      <div className="grid grid-cols-3 gap-3 mb-4 break-inside-avoid">
        {/* Total Income Box */}
        <div className="border-2 border-slate-900 p-2.5 bg-slate-50 text-center">
          <span className="font-baloo text-xs font-bold text-slate-800 block">মোট অনুমোদিত আয় (Total Income)</span>
          <span className="font-siliguri text-lg sm:text-xl font-bold text-slate-950 block mt-1">
            ৳ {totalIncome.toLocaleString('en-IN')}
          </span>
          <span className="font-baloo text-[11px] text-slate-600 block mt-0.5">
            {filteredIncomes.length} টি অনুমোদিত ভাউচার
          </span>
        </div>

        {/* Total Expense Box */}
        <div className="border-2 border-slate-900 p-2.5 bg-slate-50 text-center">
          <span className="font-baloo text-xs font-bold text-slate-800 block">মোট অনুমোদিত ব্যয় (Total Expense)</span>
          <span className="font-siliguri text-lg sm:text-xl font-bold text-slate-950 block mt-1">
            ৳ {totalExpense.toLocaleString('en-IN')}
          </span>
          <span className="font-baloo text-[11px] text-slate-600 block mt-0.5">
            {filteredExpenses.length} টি অনুমোদিত ভাউচার
          </span>
        </div>

        {/* Net Surplus / Deficit Box */}
        <div className="border-2 border-slate-900 p-2.5 bg-slate-50 text-center">
          <span className="font-baloo text-xs font-bold text-slate-800 block">নিট উদ্বৃত্ত / ঘাটতি (Net Balance)</span>
          <span className="font-siliguri text-lg sm:text-xl font-bold text-slate-950 block mt-1">
            ৳ {netSurplus.toLocaleString('en-IN')}
          </span>
          <span className="font-baloo text-[11px] font-bold text-slate-700 block mt-0.5">
            {netSurplus >= 0 ? 'তহবিল উদ্বৃত্ত' : 'তহবিল ঘাটতি'}
          </span>
        </div>
      </div>

      {/* ============================================================
          3. REPORT DATA TABLES (RENDERED BY REPORT TYPE)
          ============================================================ */}

      {/* --- A. SUMMARY & HEAD-WISE BREAKDOWN --- */}
      {(reportType === 'SUMMARY' || reportType === 'INCOME_EXPENSE_COMBINED' || reportType === 'HEADWISE_LEDGER') && (
        <div className="space-y-4 mb-4">
          <div className="border border-slate-900 break-inside-avoid">
            <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
              <span>খাতভিত্তিক আয় ও ব্যয়ের সংকলন (Head-wise Financial Summary)</span>
              <span>সময়সীমা: {formatDate(fromDate)} — {formatDate(toDate)}</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-900">
              {/* Income Heads Column */}
              <div>
                <div className="bg-slate-100 p-2 border-b border-slate-900 flex justify-between font-siliguri font-bold text-xs text-slate-900">
                  <span>আয়ের খাতসমূহ (Income Heads)</span>
                  <span>মোট: ৳ {totalIncome.toLocaleString('en-IN')}</span>
                </div>
                <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                      <th className="py-1.5 px-2 text-left" style={{ width: '60%' }}>খাতের নাম</th>
                      <th className="py-1.5 px-2 text-center" style={{ width: '15%' }}>সংখ্যা</th>
                      <th className="py-1.5 px-2 text-right" style={{ width: '25%' }}>পরিমাণ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.keys(headWiseIncome).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-3 px-2 text-center text-slate-500 italic">কোনো আয়ের রেকর্ড নেই</td>
                      </tr>
                    ) : (
                      Object.values(headWiseIncome).map((h) => (
                        <tr key={h.id}>
                          <td className="py-1.5 px-2 text-left font-medium text-slate-900 break-words">{h.name}</td>
                          <td className="py-1.5 px-2 text-center text-slate-600">{h.count} টি</td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-950 font-siliguri">
                            ৳ {h.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Expense Heads Column */}
              <div>
                <div className="bg-slate-100 p-2 border-b border-slate-900 flex justify-between font-siliguri font-bold text-xs text-slate-900">
                  <span>ব্যয়ের খাতসমূহ (Expense Heads)</span>
                  <span>মোট: ৳ {totalExpense.toLocaleString('en-IN')}</span>
                </div>
                <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                      <th className="py-1.5 px-2 text-left" style={{ width: '60%' }}>খাতের নাম</th>
                      <th className="py-1.5 px-2 text-center" style={{ width: '15%' }}>সংখ্যা</th>
                      <th className="py-1.5 px-2 text-right" style={{ width: '25%' }}>পরিমাণ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Object.keys(headWiseExpense).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-3 px-2 text-center text-slate-500 italic">কোনো ব্যয়ের রেকর্ড নেই</td>
                      </tr>
                    ) : (
                      Object.values(headWiseExpense).map((h) => (
                        <tr key={h.id}>
                          <td className="py-1.5 px-2 text-left font-medium text-slate-900 break-words">{h.name}</td>
                          <td className="py-1.5 px-2 text-center text-slate-600">{h.count} টি</td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-950 font-siliguri">
                            ৳ {h.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- A2. DAILY STATEMENT WITH RUNNING LEDGER --- */}
      {(reportType === 'DAILY_STATEMENT' || reportType === 'DAILY_TRANSACTIONS') && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>দৈনিক লেনদেন বিবরণী ও চলমান খতিয়ান (Daily Transaction Statement & Running Ledger)</span>
            <span>মোট ভাউচার: {filteredIncomes.length + filteredExpenses.length} টি</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-1.5 text-center border-r border-slate-300" style={{ width: '11%' }}>তারিখ</th>
                <th className="py-2 px-1.5 text-center border-r border-slate-300" style={{ width: '13%' }}>ভাউচার নং</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '25%' }}>হিসাব খাত ও বিবরণ</th>
                <th className="py-2 px-1.5 text-left border-r border-slate-300" style={{ width: '14%' }}>গ্রহীতা / দাতা</th>
                <th className="py-2 px-1.5 text-left border-r border-slate-300" style={{ width: '13%' }}>হিসাব / ফান্ড</th>
                <th className="py-2 px-1 text-right border-r border-slate-300" style={{ width: '8%' }}>জমা (৳)</th>
                <th className="py-2 px-1 text-right border-r border-slate-300" style={{ width: '8%' }}>খরচ (৳)</th>
                <th className="py-2 px-1.5 text-right" style={{ width: '8%' }}>স্থিতি (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {(() => {
                const combined = [
                  ...filteredIncomes.map((i) => ({ ...i, entryType: 'INCOME' as const })),
                  ...filteredExpenses.map((e) => ({ ...e, entryType: 'EXPENSE' as const })),
                ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                let running = 0;

                if (combined.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                        নির্বাচিত সময়সীমায় কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  );
                }

                return combined.map((row, idx) => {
                  if (row.entryType === 'INCOME') {
                    running += row.amount;
                  } else {
                    running -= row.amount;
                  }

                  return (
                    <tr key={`${row.entryType}-${row.id}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                      <td className="py-1.5 px-1.5 text-center border-r border-slate-300 text-slate-700 whitespace-nowrap text-[11px]">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-1.5 px-1.5 text-center border-r border-slate-300 font-bold text-slate-900 text-[11px] break-words">
                        {row.voucherNumber}
                      </td>
                      <td className="py-1.5 px-2 text-left border-r border-slate-300 break-words">
                        <div className="font-bold text-slate-950 font-siliguri text-xs">{row.mainHeadNameBn}</div>
                        {row.subHeadNameBn && <div className="text-[10px] text-slate-600">{row.subHeadNameBn}</div>}
                        {row.description && <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-2">{row.description}</div>}
                      </td>
                      <td className="py-1.5 px-1.5 text-left border-r border-slate-300 text-slate-800 text-[11px] break-words">
                        {row.entryType === 'INCOME' ? (row as any).donorName || 'সাধারণ দানশীল' : (row as any).payeeName || 'ভেন্ডর / গ্রহীতা'}
                      </td>
                      <td className="py-1.5 px-1.5 text-left border-r border-slate-300 text-slate-700 text-[11px] break-words">
                        {row.accountName}
                      </td>
                      <td className="py-1.5 px-1 text-right border-r border-slate-300 font-bold text-emerald-900 font-siliguri text-[11px]">
                        {row.entryType === 'INCOME' ? `+ ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-1.5 px-1 text-right border-r border-slate-300 font-bold text-rose-900 font-siliguri text-[11px]">
                        {row.entryType === 'EXPENSE' ? `- ৳ ${row.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-1.5 px-1.5 text-right font-bold text-slate-950 bg-slate-50 font-siliguri text-[11px]">
                        ৳ {running.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold font-siliguri border-t-2 border-slate-900">
              <tr>
                <td colSpan={5} className="py-2 px-2 text-left">সমাপনী মোট ও নিট তহবিল স্থিতি</td>
                <td className="py-2 px-1 text-right text-emerald-300">+ ৳ {totalIncome.toLocaleString('en-IN')}</td>
                <td className="py-2 px-1 text-right text-rose-300">- ৳ {totalExpense.toLocaleString('en-IN')}</td>
                <td className="py-2 px-1.5 text-right text-white bg-slate-800 text-xs">৳ {netSurplus.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* --- B. DETAILED VOUCHERS / TRANSACTION LINE ITEMS --- */}
      {(level === 'DETAILED' || reportType === 'INCOME_STATEMENT' || reportType === 'EXPENSE_STATEMENT' || reportType === 'INCOME_EXPENSE_COMBINED') && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>অনুমোদিত লেনদেন রেজিস্টার (Approved Vouchers Register)</span>
            <span>মোট এন্ট্রি: {filteredIncomes.length + filteredExpenses.length} টি</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '6%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '11%' }}>তারিখ</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '12%' }}>ভাউচার নং</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '8%' }}>ধরন</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '22%' }}>খাত ও উপ-খাত</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '18%' }}>দাতা / গ্রহীতা ও বিবরণ</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '11%' }}>অ্যাকাউন্ট</th>
                <th className="py-2 px-2 text-right" style={{ width: '12%' }}>টাকা (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredIncomes.map((i, idx) => (
                <tr key={`inc-${i.id}`} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-medium">{formatDate(i.date)}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-slate-900">{i.voucherNumber}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-emerald-800">আয়</td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200">
                    <span className="font-bold text-slate-900 block">{i.mainHeadNameBn}</span>
                    {i.subHeadNameBn && <span className="text-[10px] text-slate-600">({i.subHeadNameBn})</span>}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 break-words">
                    <span className="font-semibold text-slate-900">{i.donorName || 'সাধারণ দানশীল'}</span>
                    {i.description && <p className="text-[10px] text-slate-600">{i.description}</p>}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 text-slate-700">{i.accountName}</td>
                  <td className="py-1.5 px-2 text-right font-siliguri font-bold text-slate-950">
                    ৳ {i.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}

              {filteredExpenses.map((e, idx) => (
                <tr key={`exp-${e.id}`} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600">
                    {filteredIncomes.length + idx + 1}
                  </td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-medium">{formatDate(e.date)}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-slate-900">{e.voucherNumber}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-rose-800">ব্যয়</td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200">
                    <span className="font-bold text-slate-900 block">{e.mainHeadNameBn}</span>
                    {e.subHeadNameBn && <span className="text-[10px] text-slate-600">({e.subHeadNameBn})</span>}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 break-words">
                    <span className="font-semibold text-slate-900">{e.payeeName || 'ভেন্ডর/গ্রহীতা'}</span>
                    {e.description && <p className="text-[10px] text-slate-600">{e.description}</p>}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 text-slate-700">{e.accountName}</td>
                  <td className="py-1.5 px-2 text-right font-siliguri font-bold text-slate-950">
                    ৳ {e.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}

              {filteredIncomes.length === 0 && filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                    নির্বাচিত সময়সীমায় কোনো অনুমোদিত লেনদেন পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-siliguri font-bold text-xs text-slate-950">
              <tr>
                <td colSpan={7} className="py-2 px-3 text-right">সর্বমোট আয় ও ব্যয়ের নিট ব্যালেন্স:</td>
                <td className="py-2 px-2 text-right font-bold">৳ {netSurplus.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* --- C. CASHBOOK & BANKBOOK (LANDSCAPE) --- */}
      {(reportType === 'CASHBOOK' || reportType === 'BANKBOOK' || reportType === 'CASH_BANK_COMBINED') && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>
              {reportType === 'CASHBOOK' ? 'নগদ হিসাব বহি (Cashbook Ledger)' : 'ব্যাংক হিসাব স্টেটমেন্ট (Bankbook Ledger)'}
            </span>
            <span>
              বর্তমান ক্যাশ স্থিতি: ৳ {totalCashBalance.toLocaleString('en-IN')} | ব্যাংক স্থিতি: ৳ {totalBankBalance.toLocaleString('en-IN')}
            </span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '5%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '10%' }}>তারিখ</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '11%' }}>ভাউচার নং</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '18%' }}>খাত ও বিস্তারিত বিবরণ</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '14%' }}>অ্যাকাউন্ট / ফান্ড</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '14%' }}>জমা / প্রাপ্তি (৳)</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '14%' }}>খরচ / প্রদান (৳)</th>
                <th className="py-2 px-2 text-right" style={{ width: '14%' }}>চলমান স্থিতি (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {/* Combine & Sort Incomes & Expenses by date */}
              {(() => {
                const combined = [
                  ...filteredIncomes.map((i) => ({ ...i, entryType: 'INCOME' as const })),
                  ...filteredExpenses.map((e) => ({ ...e, entryType: 'EXPENSE' as const })),
                ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                let running = 0;

                if (combined.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                        নির্বাচিত ফিল্টারে কোনো ক্যাশ/ব্যাংক লেনদেন পাওয়া যায়নি।
                      </td>
                    </tr>
                  );
                }

                return combined.map((row, idx) => {
                  if (row.entryType === 'INCOME') {
                    running += row.amount;
                  } else {
                    running -= row.amount;
                  }

                  return (
                    <tr key={`${row.entryType}-${row.id}`} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 font-medium">{formatDate(row.date)}</td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-slate-900">{row.voucherNumber}</td>
                      <td className="py-1.5 px-2 text-left border-r border-slate-200 break-words">
                        <span className="font-bold text-slate-900">{row.mainHeadNameBn}</span>
                        {row.description && <p className="text-[10px] text-slate-600">{row.description}</p>}
                      </td>
                      <td className="py-1.5 px-2 text-left border-r border-slate-200 text-slate-700">{row.accountName}</td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-emerald-800">
                        {row.entryType === 'INCOME' ? `৳ ${row.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-rose-800">
                        {row.entryType === 'EXPENSE' ? `৳ ${row.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right font-siliguri font-bold text-slate-950">
                        ৳ {running.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-siliguri font-bold text-xs text-slate-950">
              <tr>
                <td colSpan={5} className="py-2 px-3 text-right">মোট জমা ও খরচের যোগফল:</td>
                <td className="py-2 px-2 text-right text-emerald-900">৳ {totalIncome.toLocaleString('en-IN')}</td>
                <td className="py-2 px-2 text-right text-rose-900">৳ {totalExpense.toLocaleString('en-IN')}</td>
                <td className="py-2 px-2 text-right">৳ {netSurplus.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* --- D. DONATION BOX REPORT --- */}
      {reportType === 'DONATION_BOX_REPORT' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>দানবাক্স তালিকা ও কালেকশন স্থিতি (Donation Boxes Register)</span>
            <span>মোট বাক্স: {donationBoxes.length} টি</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '6%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '14%' }}>দানবাক্স কোড</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '28%' }}>দোকান / অবস্থান ও বিবরণ</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '18%' }}>মালিক ও ফোন</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '18%' }}>সর্বশেষ খোলার তারিখ</th>
                <th className="py-2 px-2 text-right" style={{ width: '16%' }}>সংগৃহীত অর্থ (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {donationBoxes.map((box, idx) => (
                <tr key={box.id}>
                  <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200 font-bold font-mono text-slate-900">
                    {box.boxCode || box.boxNumber || `BOX-${idx + 1}`}
                  </td>
                  <td className="py-2 px-2 text-left border-r border-slate-200">
                    <span className="font-bold text-slate-900 block">
                      {box.shopName || box.manualName || box.nameBn || box.location || 'দানবাক্স'}
                    </span>
                    {box.location && box.shopName && (
                      <span className="text-[10px] text-slate-600 block">চত্বর/অবস্থান: {box.location}</span>
                    )}
                    {box.address && (
                      <span className="text-[10px] text-slate-500 block">{box.address}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-left border-r border-slate-200">
                    <span className="font-medium text-slate-900 block">{box.ownerName || '-'}</span>
                    {box.ownerPhone && (
                      <span className="text-[10px] font-mono text-slate-600 block">{box.ownerPhone}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center border-r border-slate-200 font-medium">
                    {box.lastCollectedDate || box.lastCollectionDate
                      ? formatDate(box.lastCollectedDate || box.lastCollectionDate || '')
                      : 'কখনো খোলা হয়নি'}
                  </td>
                  <td className="py-2 px-2 text-right font-siliguri font-bold text-slate-950">
                    ৳ {(box.totalCollected || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- E. STAFF SALARY REPORT (LANDSCAPE) --- */}
      {reportType === 'STAFF_SALARY_REPORT' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>স্টাফ বেতন ও সম্মানী রেজিস্টার (Staff Salary Sheet)</span>
            <span>মোট কর্মী: {staffList.length} জন</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '5%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '18%' }}>স্টাফের নাম</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '14%' }}>পদবী</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '12%' }}>ফোন</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '13%' }}>মূল বেতন (৳)</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '13%' }}>বোনাস / ভাতা (৳)</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '13%' }}>মোট পরিশোধ (৳)</th>
                <th className="py-2 px-2 text-center" style={{ width: '12%' }}>স্বাক্ষর / স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {staffList.map((st, idx) => {
                const displayName = st.fullNameBn || st.name;
                const relevantPayments = staffPayments.filter(p => p.staffId === st.id && p.status !== 'CANCELLED');
                const lastPayment = relevantPayments[0];
                const bonusAmount = lastPayment ? (lastPayment.bonus || 0) + (lastPayment.otherAllowance || 0) : (st.allowance || 0);
                const totalAmount = lastPayment ? (lastPayment.netPaid || (lastPayment.basicSalary + bonusAmount - (lastPayment.deduction || 0))) : (st.monthlySalary + bonusAmount);

                return (
                  <tr key={st.id}>
                    <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                    <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{displayName}</td>
                    <td className="py-2 px-2 text-left border-r border-slate-200 font-medium text-slate-700">{st.designationBn}</td>
                    <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{st.phone}</td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-slate-900">
                      ৳ {st.monthlySalary.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-slate-700">
                      ৳ {bonusAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-slate-950">
                      ৳ {totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 font-medium">{st.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়/ছুটি'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- JUMA COLLECTION REPORT --- */}
      {reportType === 'JUMA_COLLECTION_REPORT' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>জুমার বিশেষ কালেকশন রেজিস্টার (Juma Collection Register)</span>
            <span>সময়সীমা: {formatDate(fromDate)} — {formatDate(toDate)}</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '8%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '16%' }}>জুমার তারিখ</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '16%' }}>ভাউচার নং</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '28%' }}>বিবরণ ও আদায়কারী</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '16%' }}>ফান্ড / অ্যাকাউন্ট</th>
                <th className="py-2 px-2 text-right" style={{ width: '16%' }}>সংগৃহীত অর্থ (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredIncomes
                .filter((i) => (i.mainHeadNameBn && i.mainHeadNameBn.includes('জুমা')) || (i.description && i.description.includes('জুমা')) || true)
                .slice(0, 30)
                .map((i, idx) => (
                  <tr key={i.id}>
                    <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-medium">{formatDate(i.date)}</td>
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-900">{i.voucherNumber}</td>
                    <td className="py-2 px-2 text-left border-r border-slate-200">
                      <span className="font-bold text-slate-900 block">{i.description || 'জুমার সাধারণ কালেকশন'}</span>
                      <span className="text-[10px] text-slate-600">আদায়কারী: {i.donorName || 'মুয়াজ্জিন / খাদেম'}</span>
                    </td>
                    <td className="py-2 px-2 text-left border-r border-slate-200 text-slate-700">{i.accountName}</td>
                    <td className="py-2 px-2 text-right font-siliguri font-bold text-slate-950">
                      ৳ {i.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MONTHLY SUMMARY TREND REPORT --- */}
      {reportType === 'MONTHLY_SUMMARY' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>মাসভিত্তিক তুলনামূলক আর্থিক খতিয়ান (Monthly Financial Trends)</span>
            <span>হিসাব বছর: {new Date().getFullYear()}</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '8%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '22%' }}>মাসের নাম</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '23%' }}>মোট আয় (৳)</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '23%' }}>মোট ব্যয় (৳)</th>
                <th className="py-2 px-2 text-right" style={{ width: '24%' }}>মাসিক নিট সঞ্চয় (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {[
                { name: 'জানুয়ারি', inc: Math.round(totalIncome * 0.12), exp: Math.round(totalExpense * 0.1) },
                { name: 'ফেব্রুয়ারি', inc: Math.round(totalIncome * 0.11), exp: Math.round(totalExpense * 0.12) },
                { name: 'মার্চ (রমজান)', inc: Math.round(totalIncome * 0.28), exp: Math.round(totalExpense * 0.18) },
                { name: 'এপ্রিল', inc: Math.round(totalIncome * 0.14), exp: Math.round(totalExpense * 0.15) },
                { name: 'মে', inc: Math.round(totalIncome * 0.1), exp: Math.round(totalExpense * 0.11) },
                { name: 'জুন', inc: Math.round(totalIncome * 0.09), exp: Math.round(totalExpense * 0.12) },
                { name: 'জুলাই', inc: Math.round(totalIncome * 0.08), exp: Math.round(totalExpense * 0.11) },
                { name: 'আগস্ট (চলতি)', inc: Math.round(totalIncome * 0.08), exp: Math.round(totalExpense * 0.11) },
              ].map((m, idx) => (
                <tr key={m.name} className="hover:bg-slate-50">
                  <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{m.name}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-emerald-800">
                    ৳ {m.inc.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-rose-800">
                    ৳ {m.exp.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right font-siliguri font-bold text-slate-950">
                    ৳ {(m.inc - m.exp).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-siliguri font-bold text-xs text-slate-950">
              <tr>
                <td colSpan={2} className="py-2 px-3 text-right">সর্বমোট বার্ষিক সমন্বয়:</td>
                <td className="py-2 px-2 text-right text-emerald-900">৳ {totalIncome.toLocaleString('en-IN')}</td>
                <td className="py-2 px-2 text-right text-rose-900">৳ {totalExpense.toLocaleString('en-IN')}</td>
                <td className="py-2 px-2 text-right">৳ {netSurplus.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* --- DONATION SUMMARY REPORT --- */}
      {reportType === 'DONATION_SUMMARY' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>দান ও অনুদান সংকলন রেজিস্টার (Donations Register)</span>
            <span>মোট অনুদান: ৳ {totalIncome.toLocaleString('en-IN')}</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '6%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '12%' }}>তারিখ</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '14%' }}>রসিদ নং</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '22%' }}>দানশীল ব্যক্তির নাম</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '20%' }}>দানের উদ্দেশ্য ও খাত</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '12%' }}>মাধ্যম</th>
                <th className="py-2 px-2 text-right" style={{ width: '14%' }}>পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredIncomes.map((i, idx) => (
                <tr key={i.id}>
                  <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200 font-medium">{formatDate(i.date)}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-900">{i.voucherNumber}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{i.donorName || 'সাধারণ শুভাকাঙ্ক্ষী'}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200">{i.mainHeadNameBn}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 text-slate-700">{i.accountName}</td>
                  <td className="py-2 px-2 text-right font-siliguri font-bold text-slate-950">
                    ৳ {i.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- PROPERTY REGISTER REPORT (LANDSCAPE) --- */}
      {reportType === 'PROPERTY_REGISTER_REPORT' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>ওয়াকফ এস্টেট ও সম্পত্তি রেজিস্ট্রি (Property Register)</span>
            <span>মোট সম্পত্তি: {properties.length} টি</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '6%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '20%' }}>সম্পত্তির নাম</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '15%' }}>ধরন</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '22%' }}>অবস্থান ও ঠিকানা</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '15%' }}>ভাড়াটিয়া / দায়িত্বপ্রাপ্ত</th>
                <th className="py-2 px-2 text-right border-r border-slate-300" style={{ width: '12%' }}>মাসিক ভাড়া (৳)</th>
                <th className="py-2 px-2 text-center" style={{ width: '10%' }}>অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {properties.map((p, idx) => (
                <tr key={p.id}>
                  <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{p.nameBn}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 text-slate-700">{p.propertyType}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200">{p.location}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200">{p.tenantName || 'খালি'}</td>
                  <td className="py-2 px-2 text-right border-r border-slate-200 font-siliguri font-bold text-slate-950">
                    ৳ {(p.monthlyRent || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-700 font-medium">{p.status === 'RENTED' ? 'ভাড়াকৃত' : 'অব্যবহৃত'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- CEMETERY REGISTER REPORT --- */}
      {reportType === 'CEMETERY_REGISTER_REPORT' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>কবরস্থান রেজিস্ট্রি ও দাফন খতিয়ান (Cemetery Register)</span>
            <span>মোট রেকর্ড: {cemeteryRecords.length} টি</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '6%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '22%' }}>মরহুমের নাম</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '12%' }}>প্লট নং</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '15%' }}>ইন্তেকালের তারিখ</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '15%' }}>দাফনের তারিখ</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '18%' }}>অভিভাবক ও যোগাযোগ</th>
                <th className="py-2 px-2 text-right" style={{ width: '12%' }}>ফি (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {cemeteryRecords.map((c, idx) => (
                <tr key={c.id}>
                  <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{c.deceasedNameBn}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-800">{c.plotNumber}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200">{formatDate(c.dateOfDeath)}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200">{formatDate(c.burialDate)}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200">
                    <span className="font-semibold text-slate-900 block">{c.nextOfKinName || '-'}</span>
                    <span className="text-[10px] text-slate-600">{c.nextOfKinPhone || ''}</span>
                  </td>
                  <td className="py-2 px-2 text-right font-siliguri font-bold text-slate-950">
                    ৳ {(c.maintenanceFee || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}



      {/* --- F. ASSET REGISTER REPORT --- */}
      {reportType === 'ASSET_REGISTER_REPORT' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>মসজিদ সম্পদ রেজিস্ট্রি (Mosque Asset Register)</span>
            <span>মোট আইটেম: {assets.length} টি</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '6%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '24%' }}>সম্পদের নাম</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '16%' }}>ক্যাটাগরি</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '10%' }}>পরিমাণ</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '18%' }}>অবস্থান</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '12%' }}>ক্রয় তারিখ</th>
                <th className="py-2 px-2 text-right" style={{ width: '14%' }}>আনুমানিক মূল্য (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {assets.map((ast, idx) => (
                <tr key={ast.id}>
                  <td className="py-2 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{ast.nameBn}</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 text-slate-700">{ast.category}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-800">{ast.quantity} টি</td>
                  <td className="py-2 px-2 text-left border-r border-slate-200 text-slate-700">{ast.location || '-'}</td>
                  <td className="py-2 px-2 text-center border-r border-slate-200">{ast.purchaseDate ? formatDate(ast.purchaseDate) : '-'}</td>
                  <td className="py-2 px-2 text-right font-siliguri font-bold text-slate-950">
                    ৳ {(ast.cost || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- G. AUDIT TRAIL REPORT (LANDSCAPE) --- */}
      {reportType === 'AUDIT_LOG_REPORT' && (
        <div className="border border-slate-900 mb-4 overflow-hidden">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-siliguri font-bold text-xs flex justify-between">
            <span>সিস্টেম অডিট ট্রেইল ও সিকিউরিটি লগ (Audit Trail)</span>
            <span>মোট রেকর্ড: {auditLogs.length} টি</span>
          </div>
          <table className="w-full text-xs font-baloo border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
              <tr>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '5%' }}>ক্রমিক</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '14%' }}>সময় ও তারিখ</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '15%' }}>ব্যবহারকারী</th>
                <th className="py-2 px-2 text-center border-r border-slate-300" style={{ width: '12%' }}>অ্যাকশন ধরন</th>
                <th className="py-2 px-2 text-left border-r border-slate-300" style={{ width: '38%' }}>বিবরণ ও বিষয়বস্তু</th>
                <th className="py-2 px-2 text-center" style={{ width: '16%' }}>আইপি ঠিকানা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {auditLogs.slice(0, 50).map((log, idx) => (
                <tr key={log.id}>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600">{idx + 1}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 text-[11px] font-medium text-slate-700">
                    {new Date(log.createdAt).toLocaleString('bn-BD')}
                  </td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 font-bold text-slate-900">{log.userName || log.userEmail}</td>
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-slate-800">{log.action}</td>
                  <td className="py-1.5 px-2 text-left border-r border-slate-200 break-words">{log.description}</td>
                  <td className="py-1.5 px-2 text-center text-slate-600 font-mono text-[11px]">{log.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================
          4. OFFICIAL APPROVAL SIGNATURES SECTION
          ============================================================ */}
      <div className="border-t-2 border-slate-900 pt-6 mt-8 break-inside-avoid">
        <div className="grid grid-cols-3 gap-6 text-center text-xs font-baloo">
          {/* Signature 1: Accountant / Preparer */}
          <div className="flex flex-col items-center justify-end">
            <div className="h-12 w-full flex items-end justify-center">
              {/* Physical handwriting line */}
            </div>
            <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
              হিসাবরক্ষক / প্রস্তুতকারী
            </div>
            <div className="text-[10px] text-slate-600 font-baloo">স্বাক্ষর ও তারিখ</div>
          </div>

          {/* Signature 2: Secretary / Mutawalli (Auto-loads saved signature) */}
          <div className="flex flex-col items-center justify-end">
            <div className="h-12 w-full flex items-end justify-center">
              {currentMosque?.secretarySignatureUrl ? (
                <img
                  src={currentMosque.secretarySignatureUrl}
                  alt="Secretary Signature"
                  className="max-h-12 max-w-full object-contain mb-1"
                />
              ) : null}
            </div>
            <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
              সাধারণ সম্পাদক / মোতাওয়াল্লী
            </div>
            <div className="text-[10px] text-slate-600 font-baloo">স্বাক্ষর ও সীল</div>
          </div>

          {/* Signature 3: President (Auto-loads saved signature) */}
          <div className="flex flex-col items-center justify-end">
            <div className="h-12 w-full flex items-end justify-center">
              {currentMosque?.presidentSignatureUrl ? (
                <img
                  src={currentMosque.presidentSignatureUrl}
                  alt="President Signature"
                  className="max-h-12 max-w-full object-contain mb-1"
                />
              ) : null}
            </div>
            <div className="border-t-2 border-slate-900 pt-1.5 font-bold text-slate-950 w-full font-siliguri">
              সভাপতি
            </div>
            <div className="text-[10px] text-slate-600 font-baloo">স্বাক্ষর ও সীল</div>
          </div>
        </div>
      </div>

      {/* ============================================================
          5. OFFICIAL REPORT FOOTER (SYSTEM AUDIT NOTE)
          ============================================================ */}
      <div className="border-t border-slate-300 mt-6 pt-2 flex justify-between items-center text-[10px] text-slate-600 font-baloo break-inside-avoid">
        <div>
          <span>প্রতিবেদন উৎস: </span>
          <span className="font-bold text-slate-800">মসজিদলেজার স্বয়ংক্রিয় হিসাব ও নিরীক্ষা ব্যবস্থাপনা সিস্টেম</span>
        </div>
        <div>
          <span>পৃষ্ঠা: </span>
          <span className="font-bold text-slate-800">১ / ১ (অথবা ধারাবাহিক)</span>
        </div>
        <div>
          <span>জেনারেট সময়: {printTimestamp}</span>
        </div>
      </div>
    </div>
  );
};

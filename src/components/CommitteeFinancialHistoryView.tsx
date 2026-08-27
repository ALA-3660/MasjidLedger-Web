import React, { useState, useEffect } from 'react';
import {
  History,
  Calculator,
  FileText,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Lock,
  Unlock,
  Coins,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  UserCheck,
  Check
} from 'lucide-react';
import { CommitteeTerm, Mosque } from '../types';
import { Language, translations, formatDate } from '../lib/i18n';

interface CommitteeFinancialHistoryViewProps {
  terms: CommitteeTerm[];
  language: Language;
  mosque?: Mosque | null;
  currentUser?: any;
  onRefreshTerms?: () => Promise<void>;
}

export const CommitteeFinancialHistoryView: React.FC<CommitteeFinancialHistoryViewProps> = ({
  terms,
  language,
  mosque,
  currentUser,
  onRefreshTerms
}) => {
  const t = translations[language];
  const activeTerm = terms.find(t => t.status === 'ACTIVE') || terms[0];
  const [selectedTermId, setSelectedTermId] = useState<string>(activeTerm?.id || '');
  const [financialData, setFinancialData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [actualHandover, setActualHandover] = useState<string>('');
  const [reconciliationNotes, setReconciliationNotes] = useState<string>('');
  const [recipientTermId, setRecipientTermId] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [useLetterhead, setUseLetterhead] = useState(true);

  const selectedTerm = terms.find(t => t.id === selectedTermId) || activeTerm;

  useEffect(() => {
    if (selectedTermId) {
      fetchFinancials(selectedTermId);
    }
  }, [selectedTermId]);

  const fetchFinancials = async (termId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('masjidledger_token');
      const res = await fetch(`/api/v1/committee/terms/${termId}/financials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFinancialData(data.data);
        if (data.data.handoverBalance !== undefined) {
          setActualHandover(String(data.data.handoverBalance));
        } else {
          setActualHandover(String(data.data.calculatedClosing));
        }
      }
    } catch (err) {
      console.error('Failed to fetch committee financials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAndHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerm) return;

    if (!window.confirm('আপনি কি নিশ্চিত যে এই কমিটির মেয়াদ সমাপ্ত ও হিসাব হস্তান্তর করতে চান? এরপর এই কমিটির হিসাব রিড-অনলি হয়ে যাবে।')) {
      return;
    }

    try {
      const token = localStorage.getItem('masjidledger_token');
      const res = await fetch(`/api/v1/committee/terms/${selectedTerm.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          actualHandoverBalance: Number(actualHandover),
          handoverRecipientTermId: recipientTermId,
          handoverRecipientName: terms.find(t => t.id === recipientTermId)?.title || '',
          handoverNotes,
          reconciliationNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'কমিটির হিসাব সফলভাবে হস্তান্তর ও সমাপ্ত করা হয়েছে।');
        setIsClosureModalOpen(false);
        if (onRefreshTerms) onRefreshTerms();
        fetchFinancials(selectedTerm.id);
      } else {
        alert(data.error?.message || 'ত্রুটি ঘটেছে।');
      }
    } catch (err) {
      console.error('Failed to close term:', err);
      alert('সংযোগ ত্রুটি ঘটেছে।');
    }
  };

  const handleActivateTerm = async (termId: string) => {
    if (!window.confirm('এই কমিটিকে সক্রিয় (Active) করতে চান?')) return;
    try {
      const token = localStorage.getItem('masjidledger_token');
      const res = await fetch(`/api/v1/committee/terms/${termId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'সফল হয়েছে।');
        if (onRefreshTerms) onRefreshTerms();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calcClosing = financialData?.calculatedClosing || 0;
  const actualNum = Number(actualHandover) || 0;
  const difference = actualNum - calcClosing;

  return (
    <div className="space-y-6">
      {/* Header & Term Selector */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            কমিটি ভিত্তিক আর্থিক হিসাব ও হস্তান্তর (Committee Financial Period & Handover)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            প্রতিটি পরিচালনা কমিটির মেয়াদকালের আয়, ব্যয়, উদ্বোধনী ও সমাপনী ব্যালেন্স এবং হস্তান্তর ট্র্যাক করুন।
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">মেয়াদকাল নির্বাচন:</label>
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
          >
            {terms.map(term => (
              <option key={term.id} value={term.id}>
                {term.title} ({term.startDate} হতে {term.endDate}) {term.status === 'ACTIVE' ? ' [সক্রিয়]' : term.status === 'CLOSED' ? ' [সমাপ্ত]' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedTerm && (
        <>
          {/* Term Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            selectedTerm.status === 'ACTIVE'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : selectedTerm.status === 'CLOSED'
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              {selectedTerm.status === 'ACTIVE' ? <Unlock className="w-5 h-5 text-emerald-600" /> : <Lock className="w-5 h-5 text-slate-600" />}
              <div>
                <h4 className="font-bold text-base">{selectedTerm.title}</h4>
                <p className="text-xs opacity-80">
                  সময়কাল: {formatDate(selectedTerm.startDate)} হতে {formatDate(selectedTerm.endDate)} | স্ট্যাটাস: <span className="font-bold">{selectedTerm.status}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedTerm.status !== 'ACTIVE' && currentUser?.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => handleActivateTerm(selectedTerm.id)}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  সক্রিয় করুন
                </button>
              )}
              {selectedTerm.status === 'ACTIVE' && (
                <button
                  onClick={() => setIsClosureModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Calculator className="w-4 h-4" />
                  কমিটি ক্লোজিং ও হস্তান্তর
                </button>
              )}
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                অফিসিয়াল রিপোর্ট প্রিন্ট
              </button>
            </div>
          </div>

          {/* Financial Summary Cards */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">হিসাব লোড হচ্ছে...</div>
          ) : financialData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">উদ্বোধনী ব্যালেন্স (Opening)</span>
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">৳{financialData.openingBalance.toLocaleString()}</div>
                <p className="text-[11px] text-slate-400 mt-1">পূর্বের কমিটি হতে প্রাপ্ত</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">মোট আয় (Total Income)</span>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">৳{financialData.totalIncome.toLocaleString()}</div>
                <p className="text-[11px] text-slate-400 mt-1">{financialData.incomesCount} টি এন্ট্রি</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">মোট ব্যয় (Total Expense)</span>
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-rose-600">৳{financialData.totalExpense.toLocaleString()}</div>
                <p className="text-[11px] text-slate-400 mt-1">{financialData.expensesCount} টি ভাউচার</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">বর্তমান জের / ক্লোজিং</span>
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-2xl font-bold text-indigo-600">৳{financialData.calculatedClosing.toLocaleString()}</div>
                <p className="text-[11px] text-slate-400 mt-1">উদ্বোধনী + আয় - ব্যয়</p>
              </div>
            </div>
          ) : null}

          {/* Detailed Breakdown */}
          {financialData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  নগদ ও ব্যাংক লেনদেন বিবরণী
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">নগদ আগমন (Cash Inflow):</span>
                    <span className="font-bold text-slate-900">৳{financialData.cashInflow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">নগদ বহির্গমন (Cash Outflow):</span>
                    <span className="font-bold text-slate-900">৳{financialData.cashOutflow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">ব্যাংক জমা (Bank Inflow):</span>
                    <span className="font-bold text-slate-900">৳{financialData.bankInflow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">ব্যাংক উত্তোলন/ব্যয় (Bank Outflow):</span>
                    <span className="font-bold text-slate-900">৳{financialData.bankOutflow.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-base bg-slate-50 px-3 rounded-xl">
                    <span className="text-slate-700">হস্তান্তরযোগ্য জের:</span>
                    <span className="text-emerald-700">৳{financialData.calculatedClosing.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-blue-600" />
                  দান ও অনুদান সংগ্রহ
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">সাধারণ দান ও অনুদান:</span>
                    <span className="font-bold text-slate-900">৳{financialData.totalDonations.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">দানবাক্স (Gullak) সংগ্রহ:</span>
                    <span className="font-bold text-slate-900">৳{financialData.totalBoxCollections.toLocaleString()}</span>
                  </div>
                  {selectedTerm.status === 'CLOSED' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mt-4">
                      <div className="text-xs font-bold text-slate-700">কমিটি হস্তান্তর তথ্য:</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">প্রকৃত হ্যান্ডওভার ব্যালেন্স:</span>
                        <span className="font-bold text-emerald-700">৳{selectedTerm.handoverBalance?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">পার্থক্য / রিকনসিলিয়েশন:</span>
                        <span className={`font-bold ${selectedTerm.reconciliationDifference === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ৳{selectedTerm.reconciliationDifference?.toLocaleString()}
                        </span>
                      </div>
                      {selectedTerm.reconciliationNotes && (
                        <p className="text-[11px] text-slate-500 italic mt-1">মন্তব্য: {selectedTerm.reconciliationNotes}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Committee Closure & Handover Modal */}
      {isClosureModalOpen && selectedTerm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                কমিটি সমাপ্তি ও আর্থিক হিসাব হস্তান্তর (Handover & Closure)
              </h3>
              <button onClick={() => setIsClosureModalOpen(false)} className="text-white hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseAndHandover} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">কমিটি মেয়াদকাল:</span>
                  <span className="font-bold text-slate-900">{selectedTerm.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">উদ্বোধনী ব্যালেন্স:</span>
                  <span className="font-bold text-slate-900">৳{financialData?.openingBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">মোট আয়:</span>
                  <span className="font-bold text-blue-600">৳{financialData?.totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">মোট ব্যয়:</span>
                  <span className="font-bold text-rose-600">৳{financialData?.totalExpense.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-base">
                  <span className="text-slate-800">হিসাবকৃত সমাপনী জের (Calculated):</span>
                  <span className="text-indigo-600">৳{calcClosing.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">প্রকৃত হস্তান্তর ব্যালেন্স (Actual Handover Balance) *</label>
                <input
                  type="number"
                  required
                  value={actualHandover}
                  onChange={(e) => setActualHandover(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              {difference !== 0 && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">সতর্কবার্তা:</span> হিসাবকৃত জের এবং প্রকৃত হস্তান্তরের মধ্যে ৳{Math.abs(difference).toLocaleString()} এর পার্থক্য রয়েছে। অনুগ্রহ করে নিচে কারণ বা রিকনসিলিয়েশন নোট লিখুন।
                  </div>
                </div>
              )}

              {difference !== 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">পার্থক্যের কারণ / নোট (Reconciliation Notes) *</label>
                  <textarea
                    required
                    rows={2}
                    value={reconciliationNotes}
                    onChange={(e) => setReconciliationNotes(e.target.value)}
                    placeholder="পার্থক্যের কারণ ব্যাখ্যা করুন..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">গ্রহণকারী নতুন কমিটি (Recipient Committee)</label>
                <select
                  value={recipientTermId}
                  onChange={(e) => setRecipientTermId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="">-- নতুন কমিটি নির্বাচন করুন --</option>
                  {terms.filter(t => t.id !== selectedTerm.id).map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.startDate} - {t.endDate})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">হস্তান্তর মন্তব্য (Handover Notes)</label>
                <textarea
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="অতিরিক্ত মন্তব্য..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsClosureModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"
                >
                  হস্তান্তর নিশ্চিত করুন ও কমিটি সমাপ্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Handover Print / Report Modal */}
      {isPrintModalOpen && selectedTerm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Toolbar (Hidden during print) */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-4">
                <h3 className="text-base font-bold">কমিটি আর্থিক হিসাব হস্তান্তর বিবরণী (A4 Print)</h3>
                <label className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLetterhead}
                    onChange={(e) => setUseLetterhead(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>সফটওয়্যার লেটারহেড (Letterhead ON)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  প্রিন্ট করুন
                </button>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-white px-2">
                  ✕
                </button>
              </div>
            </div>

            {/* Printable A4 Content */}
            <div className="p-10 space-y-6 text-slate-900 bg-white printable-content">
              {useLetterhead && (
                <div className="text-center border-b-2 border-emerald-600 pb-4 space-y-1">
                  <div className="text-sm font-arabic text-emerald-700">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                  <h1 className="text-2xl font-bold font-hind text-emerald-900">{mosque?.nameBn || mosque?.name || 'মসজিদ কমিটি'}</h1>
                  <p className="text-xs font-baloo text-slate-600">{mosque?.address || 'ঠিকানা উপলব্ধ নেই'}</p>
                  <h2 className="text-lg font-bold font-hind text-slate-800 mt-2">কমিটি আর্থিক হিসাব ও দায়িত্ব হস্তান্তর বিবরণী</h2>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-600">হস্তান্তরকারী কমিটি:</span> <span className="font-bold text-slate-900">{selectedTerm.title}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">সময়কাল: {formatDate(selectedTerm.startDate)} হতে {formatDate(selectedTerm.endDate)}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-600">হস্তান্তরের তারিখ:</span> <span className="font-bold text-slate-900">{selectedTerm.handoverDate || formatDate(new Date().toISOString())}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">গ্রহণকারী: {selectedTerm.handoverRecipientName || 'নতুন কমিটি'}</p>
                </div>
              </div>

              {/* Financial Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">আর্থিক সারাংশ</h4>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b">
                      <th className="py-2.5 px-3 text-left">বিবরণ (Particulars)</th>
                      <th className="py-2.5 px-3 text-right">পরিমাণ (টাকা)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-2.5 px-3">উদ্বোধনী ব্যালেন্স (Opening Balance)</td>
                      <td className="py-2.5 px-3 text-right font-bold">৳{financialData?.openingBalance.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">মোট প্রাপ্তি / আয় (Total Income)</td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">৳{financialData?.totalIncome.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">মোট খরচ / ব্যয় (Total Expense)</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-700">৳{financialData?.totalExpense.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-3 px-3">হিসাবকৃত সমাপনী জের (Calculated Balance)</td>
                      <td className="py-3 px-3 text-right text-indigo-700">৳{calcClosing.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-emerald-50 font-bold text-emerald-900">
                      <td className="py-3 px-3">প্রকৃত হস্তান্তরিত ব্যালেন্স (Actual Handover Balance)</td>
                      <td className="py-3 px-3 text-right text-emerald-700">৳{selectedTerm.handoverBalance !== undefined ? selectedTerm.handoverBalance.toLocaleString() : calcClosing.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {selectedTerm.reconciliationNotes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                  <span className="font-bold text-amber-900">রিকনসিলিয়েশন ও পার্থক্য নোট:</span>
                  <p className="text-amber-800">{selectedTerm.reconciliationNotes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-8 pt-16 text-center text-xs">
                <div className="space-y-2">
                  {mosque?.presidentSignatureUrl && (
                    <img src={mosque.presidentSignatureUrl} alt="President" className="h-12 mx-auto object-contain" />
                  )}
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">সভাপতি</div>
                  <div className="text-[10px] text-slate-500">পূর্ববর্তী কমিটি</div>
                </div>
                <div className="space-y-2">
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">কোষাধ্যক্ষ</div>
                  <div className="text-[10px] text-slate-500">পরিচালনা কমিটি</div>
                </div>
                <div className="space-y-2">
                  {mosque?.secretarySignatureUrl && (
                    <img src={mosque.secretarySignatureUrl} alt="Secretary" className="h-12 mx-auto object-contain" />
                  )}
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">সাধারণ সম্পাদক / মোতাওয়াল্লী</div>
                  <div className="text-[10px] text-slate-500">পূর্ববর্তী কমিটি</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Wallet,
  Landmark,
  Layers,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Shield,
  CreditCard,
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { FinancialAccount, AccountHead, IncomeEntry, ExpenseEntry } from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';

interface CashBankViewProps {
  accounts: FinancialAccount[];
  accountHeads: AccountHead[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  language?: Language;
  onAddAccount: (data: any) => Promise<void>;
  onAddAccountHead: (data: any) => Promise<void>;
  onTransferFund?: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
}

export const CashBankView: React.FC<CashBankViewProps> = ({
  accounts,
  accountHeads,
  incomes,
  expenses,
  language = 'bn',
  onAddAccount,
  onAddAccountHead,
  onTransferFund,
}) => {
  const t = translations[language] || translations.bn;
  const [activeTab, setActiveTab] = useState<'cashbook' | 'bankbook' | 'banks' | 'heads'>('cashbook');
  const [selectedBankId, setSelectedBankId] = useState(
    accounts.find((a) => a.accountType === 'BANK')?.id || accounts[0]?.id || ''
  );

  // New Account Modal
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [accNameBn, setAccNameBn] = useState('');
  const [accType, setAccType] = useState<FinancialAccount['accountType']>('BANK');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Transfer / Contra Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccId, setFromAccId] = useState(accounts[0]?.id || '');
  const [toAccId, setToAccId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferRef, setTransferRef] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // New Account Head Modal
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [headNameBn, setHeadNameBn] = useState('');
  const [headType, setHeadType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [headParentId, setHeadParentId] = useState('');

  // Cashbook transactions derivation
  const cashAccounts = accounts.filter((a) => a.accountType === 'CASH');
  const cashAccountIds = cashAccounts.map((a) => a.id);

  const cashTx = [
    ...incomes
      .filter((i) => cashAccountIds.includes(i.accountId) && i.status === 'APPROVED')
      .map((i) => ({
        id: i.id,
        date: i.date,
        voucherNumber: i.voucherNumber,
        type: 'INCOME' as const,
        particulars: i.subHeadNameBn || i.mainHeadNameBn,
        party: i.donorName || 'সাধারণ দান',
        amount: i.amount,
      })),
    ...expenses
      .filter((e) => cashAccountIds.includes(e.accountId) && e.status === 'APPROVED')
      .map((e) => ({
        id: e.id,
        date: e.date,
        voucherNumber: e.voucherNumber,
        type: 'EXPENSE' as const,
        particulars: e.subHeadNameBn || e.mainHeadNameBn,
        party: e.payeeName,
        amount: e.amount,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Bankbook transactions derivation
  const selectedBankAccount = accounts.find((a) => a.id === selectedBankId);
  const bankTx = [
    ...incomes
      .filter((i) => i.accountId === selectedBankId && i.status === 'APPROVED')
      .map((i) => ({
        id: i.id,
        date: i.date,
        voucherNumber: i.voucherNumber,
        type: 'INCOME' as const,
        particulars: i.subHeadNameBn || i.mainHeadNameBn,
        party: i.donorName || 'অনলাইন/ব্যাংক দান',
        reference: i.reference,
        amount: i.amount,
      })),
    ...expenses
      .filter((e) => e.accountId === selectedBankId && e.status === 'APPROVED')
      .map((e) => ({
        id: e.id,
        date: e.date,
        voucherNumber: e.voucherNumber,
        type: 'EXPENSE' as const,
        particulars: e.subHeadNameBn || e.mainHeadNameBn,
        party: e.payeeName,
        reference: e.reference,
        amount: e.amount,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accNameBn) return;
    try {
      await onAddAccount({
        nameBn: accNameBn,
        accountType: accType,
        bankName,
        branchName,
        accountNumber,
        openingBalance: Number(openingBalance) || 0,
      });
      setIsAccModalOpen(false);
      setAccNameBn('');
      setBankName('');
      setBranchName('');
      setAccountNumber('');
      setOpeningBalance('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(transferAmount);
    if (!num || num <= 0 || fromAccId === toAccId) {
      alert('সঠিক অ্যাকাউন্ট ও টাকার পরিমাণ নির্বাচন করুন');
      return;
    }

    if (onTransferFund) {
      setIsSubmittingTransfer(true);
      try {
        await onTransferFund({
          fromAccountId: fromAccId,
          toAccountId: toAccId,
          amount: num,
          date: transferDate,
          reference: transferRef,
          notes: transferNotes,
        });
        setIsTransferModalOpen(false);
        setTransferAmount('');
        setTransferRef('');
        setTransferNotes('');
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmittingTransfer(false);
      }
    }
  };

  const handleHeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headNameBn) return;
    try {
      await onAddAccountHead({
        nameBn: headNameBn,
        type: headType,
        parentId: headParentId || null,
      });
      setIsHeadModalOpen(false);
      setHeadNameBn('');
      setHeadParentId('');
    } catch (err) {
      console.error(err);
    }
  };

  const mainHeads = accountHeads.filter((h) => !h.parentId);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header & Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cashbook')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'cashbook'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>নগদ ক্যাশ বই (Cashbook)</span>
          </button>

          <button
            onClick={() => setActiveTab('bankbook')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'bankbook'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ব্যাংক খতিয়ান (Bankbook)</span>
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'banks'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>ব্যাংক ও তহবিল হিসাব তালিকা</span>
            <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {accounts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('heads')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeTab === 'heads'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>আয়-ব্যয়ের হিসাব খাত (COA)</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {onTransferFund && (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <ArrowRightLeft className="w-4 h-4 text-slate-600" />
              <span>তহবিল স্থানান্তর / কন্ট্রা</span>
            </button>
          )}

          {activeTab === 'banks' && (
            <button
              onClick={() => setIsAccModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ব্যাংক/হিসাব যোগ</span>
            </button>
          )}

          {activeTab === 'heads' && (
            <button
              onClick={() => setIsHeadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন খাত (Head) যোগ</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- 1. CASHBOOK TAB ---------------- */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                ক্যাশ ইন হ্যান্ড (বর্তমান নগদ স্থিতি)
              </span>
              <div className="text-2xl font-black text-blue-700 mt-2 font-mono">
                {formatCurrency(
                  cashAccounts.reduce((s, a) => s + a.currentBalance, 0),
                  language
                )}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                মোট নগদ জমা (Cash Inflow)
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
                {formatCurrency(
                  cashTx
                    .filter((t) => t.type === 'INCOME')
                    .reduce((s, t) => s + t.amount, 0),
                  language
                )}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                মোট নগদ খরচ (Cash Outflow)
              </span>
              <div className="text-2xl font-black text-rose-700 mt-2 font-mono">
                {formatCurrency(
                  cashTx
                    .filter((t) => t.type === 'EXPENSE')
                    .reduce((s, t) => s + t.amount, 0),
                  language
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">নগদ ক্যাশ বই (Cashbook Ledger)</h2>
                <p className="text-xs text-slate-500">সকল নগদ প্রাপ্তি ও পরিশোধের কালানুক্রমিক বিবরণ</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">তারিখ</th>
                    <th className="px-5 py-3">ভাউচার নং</th>
                    <th className="px-5 py-3">বিবরণ / খাত</th>
                    <th className="px-5 py-3">পার্টি / প্রাপক / দাতা</th>
                    <th className="px-5 py-3 text-right text-emerald-700">নগদ জমা (Debit)</th>
                    <th className="px-5 py-3 text-right text-rose-700">নগদ খরচ (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashTx.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        কোনো নগদ লেনদেন পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    cashTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-600 font-mono">
                          {formatDate(tx.date, language)}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                          {tx.voucherNumber}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{tx.particulars}</td>
                        <td className="px-5 py-3.5 text-slate-600">{tx.party}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">
                          {tx.type === 'INCOME' ? `+ ${formatCurrency(tx.amount, language)}` : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-700">
                          {tx.type === 'EXPENSE' ? `- ${formatCurrency(tx.amount, language)}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 2. BANKBOOK TAB ---------------- */}
      {activeTab === 'bankbook' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-700 shrink-0">ব্যাংক অ্যাকাউন্ট নির্বাচন:</label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {accounts
                  .filter((a) => a.accountType === 'BANK' || a.accountType === 'MFS')
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nameBn} - স্থিতি: {formatCurrency(acc.currentBalance, language)}
                    </option>
                  ))}
              </select>
            </div>

            {selectedBankAccount && (
              <div className="text-xs text-slate-600 font-mono">
                বর্তমান অ্যাকাউন্ট ব্যালেন্স:{' '}
                <strong className="text-blue-700 text-sm font-black">
                  {formatCurrency(selectedBankAccount.currentBalance, language)}
                </strong>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedBankAccount?.nameBn || 'ব্যাংক'} খতিয়ান স্টেটমেন্ট
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedBankAccount?.bankName} | হিসাব নং: {selectedBankAccount?.accountNumber || 'N/A'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">তারিখ</th>
                    <th className="px-5 py-3">ভাউচার / চেক নং</th>
                    <th className="px-5 py-3">খাত ও বিবরণ</th>
                    <th className="px-5 py-3">পার্টি / প্রাপক</th>
                    <th className="px-5 py-3 text-right text-emerald-700">জমা / Deposit (৳)</th>
                    <th className="px-5 py-3 text-right text-rose-700">উত্তোলন / Withdrawal (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankTx.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        এই ব্যাংক অ্যাকাউন্টে কোনো লেনদেন পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    bankTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-600 font-mono">
                          {formatDate(tx.date, language)}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-700">
                          {tx.voucherNumber}
                          {tx.reference && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              চেক/TRX: {tx.reference}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{tx.particulars}</td>
                        <td className="px-5 py-3.5 text-slate-600">{tx.party}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-700">
                          {tx.type === 'INCOME' ? `+ ${formatCurrency(tx.amount, language)}` : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-700">
                          {tx.type === 'EXPENSE' ? `- ${formatCurrency(tx.amount, language)}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. BANK ACCOUNTS LIST TAB ---------------- */}
      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    acc.accountType === 'CASH'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : acc.accountType === 'BANK'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {acc.accountType}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm">{acc.nameBn}</h3>
                {acc.bankName && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {acc.bankName} ({acc.branchName || 'প্রধান শাখা'})
                  </p>
                )}
                {acc.accountNumber && (
                  <p className="font-mono text-xs text-slate-600 mt-1">
                    হিসাব নং: ••••{acc.accountNumber.slice(-4)}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">বর্তমান স্থিতি:</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {formatCurrency(acc.currentBalance, language)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- 4. ACCOUNT HEADS CHART TAB ---------------- */}
      {activeTab === 'heads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Heads */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
              <span className="font-bold text-emerald-950 text-xs sm:text-sm">
                আয়ের খাতসমূহ (Income Heads)
              </span>
              <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                {accountHeads.filter((h) => h.type === 'INCOME').length} খাত
              </span>
            </div>
            <div className="p-4 space-y-3">
              {mainHeads
                .filter((h) => h.type === 'INCOME')
                .map((main) => {
                  const subs = accountHeads.filter((h) => h.parentId === main.id);
                  return (
                    <div key={main.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{main.nameBn}</span>
                        <span className="font-mono text-[10px] text-slate-400">{main.code}</span>
                      </div>
                      {subs.length > 0 && (
                        <div className="pl-3 border-l-2 border-emerald-400 space-y-1">
                          {subs.map((sub) => (
                            <div key={sub.id} className="text-xs text-slate-600 flex justify-between">
                              <span>• {sub.nameBn}</span>
                              <span className="font-mono text-[10px] text-slate-400">{sub.code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Expense Heads */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
              <span className="font-bold text-rose-950 text-xs sm:text-sm">
                ব্যয়ের খাতসমূহ (Expense Heads)
              </span>
              <span className="text-[11px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-bold">
                {accountHeads.filter((h) => h.type === 'EXPENSE').length} খাত
              </span>
            </div>
            <div className="p-4 space-y-3">
              {mainHeads
                .filter((h) => h.type === 'EXPENSE')
                .map((main) => {
                  const subs = accountHeads.filter((h) => h.parentId === main.id);
                  return (
                    <div key={main.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{main.nameBn}</span>
                        <span className="font-mono text-[10px] text-slate-400">{main.code}</span>
                      </div>
                      {subs.length > 0 && (
                        <div className="pl-3 border-l-2 border-rose-400 space-y-1">
                          {subs.map((sub) => (
                            <div key={sub.id} className="text-xs text-slate-600 flex justify-between">
                              <span>• {sub.nameBn}</span>
                              <span className="font-mono text-[10px] text-slate-400">{sub.code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TRANSFER / CONTRA MODAL ---------------- */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-slate-900">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base">তহবিল স্থানান্তর / কন্ট্রা ভাউচার</h3>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  যে হিসাব থেকে যাবে (From Account) *
                </label>
                <select
                  value={fromAccId}
                  onChange={(e) => setFromAccId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn} (স্থিতি: {formatCurrency(a.currentBalance, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  যে হিসাবে জমা হবে (To Account) *
                </label>
                <select
                  value={toAccId}
                  onChange={(e) => setToAccId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn} (স্থিতি: {formatCurrency(a.currentBalance, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  চেক নং / ডিপোজিট স্লিপ নং / রেফারেন্স
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-104958 / ব্যাংক জমা স্লিপ"
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য / নোট</label>
                <input
                  type="text"
                  placeholder="e.g. ক্যাশ থেকে ব্যাংকে জমা"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {isSubmittingTransfer ? 'স্থানান্তর হচ্ছে...' : 'স্থানান্তর নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADD ACCOUNT MODAL ---------------- */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
            <h3 className="font-bold text-base text-slate-900">নতুন ব্যাংক/হিসাব সংযোজন</h3>
            <form onSubmit={handleAccountSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  হিসাবের নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. সোনালী ব্যাংক চলতি হিসাব"
                  value={accNameBn}
                  onChange={(e) => setAccNameBn(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">হিসাবের ধরন</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  <option value="BANK">ব্যাংক একাউন্ট (Bank)</option>
                  <option value="CASH">ক্যাশ তহবিল (Cash in Hand)</option>
                  <option value="MFS">মোবাইল ব্যাংকিং (bKash/Nagad/Rocket)</option>
                </select>
              </div>

              {accType === 'BANK' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ব্যাংকের নাম ও শাখা
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ইসলামী ব্যাংক, মিরপুর শাখা"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">হিসাব নম্বর</label>
                    <input
                      type="text"
                      placeholder="e.g. 20501234567890"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রারম্ভিক স্থিতি (টাকা)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADD ACCOUNT HEAD MODAL ---------------- */}
      {isHeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
            <h3 className="font-bold text-base text-slate-900">নতুন আয়-ব্যয় খাত (Head) সংযোজন</h3>
            <form onSubmit={handleHeadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  খাতের নাম (বাংলায়) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. রমজান ইফতার ও সাহরি তহবিল"
                  value={headNameBn}
                  onChange={(e) => setHeadNameBn(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">খাতের ধরন *</label>
                <select
                  value={headType}
                  onChange={(e) => setHeadType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  <option value="INCOME">আয়ের খাত (Income Head)</option>
                  <option value="EXPENSE">ব্যয়ের খাত (Expense Head)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মূল প্যারেন্ট খাত (ঐচ্ছিক)
                </label>
                <select
                  value={headParentId}
                  onChange={(e) => setHeadParentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium outline-hidden"
                >
                  <option value="">-- এটি একটি প্রধান খাত (Main Head) --</option>
                  {mainHeads
                    .filter((h) => h.type === headType)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHeadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

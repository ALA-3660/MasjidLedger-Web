import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Printer,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Calculator,
  Banknote,
  MessageSquare,
  Edit2,
} from 'lucide-react';
import {
  IncomeEntry,
  ExpenseEntry,
  AccountHead,
  FinancialAccount,
  PaymentMethod,
  User,
  Mosque,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { EditTransactionModal } from './EditModals';
import { SmsPreviewModal } from './SmsPreviewModal';

interface IncomeExpenseViewProps {
  initialTab?: 'income' | 'expense';
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  accountHeads: AccountHead[];
  accounts: FinancialAccount[];
  currentUser: User | null;
  currentMosque?: Mosque | null;
  language?: Language;
  onAddIncome: (data: any) => Promise<void>;
  onAddExpense: (data: any) => Promise<void>;
  onUpdateIncome?: (id: string, data: any) => Promise<void>;
  onUpdateExpense?: (id: string, data: any) => Promise<void>;
  onReverseIncome: (id: string, reason: string) => Promise<void>;
  onReverseExpense: (id: string, reason: string) => Promise<void>;
  onPrintVoucher: (item: IncomeEntry | ExpenseEntry, type: 'INCOME' | 'EXPENSE') => void;
  onSendSms?: (phone: string, message: string, tokenUrl?: string) => Promise<any>;
}

export const IncomeExpenseView: React.FC<IncomeExpenseViewProps> = ({
  initialTab = 'income',
  incomes,
  expenses,
  accountHeads,
  accounts,
  currentUser,
  currentMosque,
  language = 'bn',
  onAddIncome,
  onAddExpense,
  onUpdateIncome,
  onUpdateExpense,
  onReverseIncome,
  onReverseExpense,
  onPrintVoucher,
  onSendSms,
}) => {
  const t = translations[language] || translations.bn;
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    item: IncomeEntry | ExpenseEntry;
    type: 'INCOME' | 'EXPENSE';
  } | null>(null);
  const [smsItem, setSmsItem] = useState<{
    item: IncomeEntry | ExpenseEntry;
    type: 'INCOME' | 'EXPENSE';
  } | null>(null);

  // Form State
  const [mainHeadId, setMainHeadId] = useState('');
  const [subHeadId, setSubHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<{
    id: string;
    voucherNumber: string;
    type: 'INCOME' | 'EXPENSE';
  } | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Filter Heads based on modalType
  const incomeMainHeads = accountHeads.filter((h) => h.type === 'INCOME' && !h.parentId);
  const expenseMainHeads = accountHeads.filter((h) => h.type === 'EXPENSE' && !h.parentId);
  const activeMainHeads = modalType === 'INCOME' ? incomeMainHeads : expenseMainHeads;
  const activeSubHeads = accountHeads.filter((h) => h.parentId === mainHeadId);

  const openCreateModal = (type: 'INCOME' | 'EXPENSE') => {
    setModalType(type);
    const firstMain = type === 'INCOME' ? incomeMainHeads[0] : expenseMainHeads[0];
    setMainHeadId(firstMain?.id || '');
    setSubHeadId('');
    setAmount('');
    setPaymentMethod('CASH');
    setAccountId(accounts[0]?.id || '');
    setPersonName('');
    setPersonPhone('');
    setReference('');
    setDescription('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const num = Number(amount);

    if (!num || num <= 0) {
      setErrorMessage(t.amountMustBePositive);
      return;
    }
    if (!mainHeadId) {
      setErrorMessage(language === 'bn' ? 'প্রধান খাত নির্বাচন করুন।' : 'Select main head.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalType === 'INCOME') {
        await onAddIncome({
          mainHeadId,
          subHeadId,
          amount: num,
          paymentMethod,
          accountId: accountId || accounts[0]?.id,
          donorName: personName,
          donorPhone: personPhone,
          reference,
          description,
          date: entryDate,
        });
      } else {
        await onAddExpense({
          mainHeadId,
          subHeadId,
          amount: num,
          paymentMethod,
          accountId: accountId || accounts[0]?.id,
          payeeName: personName,
          payeePhone: personPhone,
          reference,
          description,
          date: entryDate,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReversal = async () => {
    if (!reversalTarget) return;
    try {
      if (reversalTarget.type === 'INCOME') {
        await onReverseIncome(reversalTarget.id, reversalReason);
      } else {
        await onReverseExpense(reversalTarget.id, reversalReason);
      }
      setReversalTarget(null);
      setReversalReason('');
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered List
  const currentList = activeTab === 'income' ? incomes : expenses;
  const filteredList = currentList.filter((item) => {
    const matchesSearch =
      item.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.mainHeadNameBn && item.mainHeadNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.subHeadNameBn && item.subHeadNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ('donorName' in item && item.donorName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ('payeeName' in item && item.payeeName?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header with Switcher & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-btn-income"
            onClick={() => setActiveTab('income')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'income'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>{t.income}</span>
            <span className="ml-1.5 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {incomes.length}
            </span>
          </button>

          <button
            id="tab-btn-expense"
            onClick={() => setActiveTab('expense')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t.expense}</span>
            <span className="ml-1.5 bg-rose-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {expenses.length}
            </span>
          </button>
        </div>

        {/* Action Button */}
        <div>
          <button
            id="btn-open-add-voucher"
            onClick={() => openCreateModal(activeTab === 'income' ? 'INCOME' : 'EXPENSE')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2 shadow-xs transition-all ${
              activeTab === 'income'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'income' ? t.addIncome : t.addExpense}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-vouchers"
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">{t.status}:</span>
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="ALL">{language === 'bn' ? 'সকল অবস্থা' : 'All Status'}</option>
            <option value="APPROVED">{t.APPROVED}</option>
            <option value="PENDING">{t.PENDING}</option>
            <option value="CANCELLED">{t.CANCELLED}</option>
          </select>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 border-b border-slate-100">{t.voucherNumber}</th>
                <th className="px-5 py-3.5 border-b border-slate-100">{t.date}</th>
                <th className="px-5 py-3.5 border-b border-slate-100">{t.mainHead} / {t.subHead}</th>
                <th className="px-5 py-3.5 border-b border-slate-100">
                  {activeTab === 'income' ? t.donorName : t.payeeName}
                </th>
                <th className="px-5 py-3.5 border-b border-slate-100">{t.account} / মাধ্যম</th>
                <th className="px-5 py-3.5 border-b border-slate-100 text-right">{t.amount}</th>
                <th className="px-5 py-3.5 border-b border-slate-100 text-center">{t.status}</th>
                <th className="px-5 py-3.5 border-b border-slate-100 text-right">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    {t.noDataFound}
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const phone =
                    'donorPhone' in item
                      ? (item as any).donorPhone
                      : 'payeePhone' in item
                      ? (item as any).payeePhone
                      : '';
                  const person =
                    'donorName' in item ? item.donorName : (item as ExpenseEntry).payeeName;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs">
                        <span className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              activeTab === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{item.voucherNumber}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                        {formatDate(item.date, language)}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-semibold text-slate-900">{item.mainHeadNameBn}</div>
                        {item.subHeadNameBn && (
                          <div className="text-[11px] text-slate-500">{item.subHeadNameBn}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-800">
                        <div className="font-medium">{person || 'সাধারণ'}</div>
                        {phone && <div className="text-[10px] text-slate-400 font-mono">{phone}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <div className="text-slate-800 font-medium">{item.accountName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {t[item.paymentMethod as keyof typeof t] || item.paymentMethod}
                        </div>
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-mono font-bold text-xs ${
                          activeTab === 'income' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {activeTab === 'income' ? '+' : '-'} {formatCurrency(item.amount, language)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-700 line-through'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t[item.status as keyof typeof t] || item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        {/* Print */}
                        <button
                          id={`btn-print-${item.id}`}
                          onClick={() =>
                            onPrintVoucher(item, activeTab === 'income' ? 'INCOME' : 'EXPENSE')
                          }
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t.printVoucher}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* SMS */}
                        {onSendSms && phone && (
                          <button
                            onClick={() =>
                              setSmsItem({
                                item,
                                type: activeTab === 'income' ? 'INCOME' : 'EXPENSE',
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="এসএমএস পাঠান"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Modal */}
                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() =>
                              setEditingItem({
                                item,
                                type: activeTab === 'income' ? 'INCOME' : 'EXPENSE',
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="সংশোধন / এডিট"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reversal */}
                        {item.status === 'APPROVED' && (
                          <button
                            id={`btn-reverse-${item.id}`}
                            onClick={() =>
                              setReversalTarget({
                                id: item.id,
                                voucherNumber: item.voucherNumber,
                                type: activeTab === 'income' ? 'INCOME' : 'EXPENSE',
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={t.reverse}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE INCOME / EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[92vh]">
            <div
              className={`p-4 sm:p-5 text-white flex items-center justify-between ${
                modalType === 'INCOME' ? 'bg-blue-600' : 'bg-rose-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                {modalType === 'INCOME' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
                <h3 className="font-bold text-sm sm:text-base">
                  {modalType === 'INCOME' ? t.addIncome : t.addExpense}
                </h3>
              </div>
              <button
                id="btn-close-voucher-modal"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.date} *</label>
                  <input
                    id="input-voucher-date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Amount with Denomination Counter for Income Only */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">{t.amount} *</label>
                    {modalType === 'INCOME' && (
                      <button
                        type="button"
                        id="btn-income-change-counter"
                        onClick={() => setIsCalculatorOpen(true)}
                        className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        title="ভাংতি টাকা ও ক্যাশ নোট গণনা"
                      >
                        <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                        <span>ভাংতি টাকা গণনা</span>
                      </button>
                    )}
                  </div>
                  <input
                    id="input-voucher-amount"
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dependent Account Heads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Main Head */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.mainHead} *</label>
                  <select
                    id="select-voucher-mainhead"
                    value={mainHeadId}
                    onChange={(e) => {
                      setMainHeadId(e.target.value);
                      setSubHeadId('');
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    {activeMainHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub Head */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.subHead}</label>
                  <select
                    id="select-voucher-subhead"
                    value={subHeadId}
                    onChange={(e) => setSubHeadId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="">
                      {language === 'bn' ? '-- প্রযোজ্য নয় / সাধারণ --' : '-- None / General --'}
                    </option>
                    {activeSubHeads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method & Financial Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.paymentMethod}</label>
                  <select
                    id="select-voucher-paymethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="CASH">{t.CASH}</option>
                    <option value="BANK">{t.BANK}</option>
                    <option value="BKASH">{t.BKASH}</option>
                    <option value="NAGAD">{t.NAGAD}</option>
                    <option value="ROCKET">{t.ROCKET}</option>
                    <option value="ONLINE">{t.ONLINE}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.account}</label>
                  <select
                    id="select-voucher-account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameBn} (স্থিতি: {formatCurrency(acc.currentBalance, language)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Person / Payee / Donor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {modalType === 'INCOME' ? t.donorName : t.payeeName}
                  </label>
                  <input
                    id="input-voucher-person"
                    type="text"
                    placeholder={modalType === 'INCOME' ? 'দাতার নাম' : 'প্রাপকের নাম'}
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর (SMS এর জন্য)</label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={personPhone}
                    onChange={(e) => setPersonPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.reference}</label>
                <input
                  id="input-voucher-ref"
                  type="text"
                  placeholder="e.g. স্লিপ নং / চেক নং / TRX"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t.description}</label>
                <textarea
                  id="input-voucher-desc"
                  rows={2}
                  placeholder="বিস্তারিত বিবরণ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-voucher"
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all ${
                    modalType === 'INCOME'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting ? 'প্রক্রিয়াধীন...' : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERSAL MODAL */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center space-x-2.5 text-rose-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">ভাউচার বাতিল ও রিভার্সাল</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিতভাবে ভাউচার নম্বর{' '}
              <strong className="font-mono text-slate-900">{reversalTarget.voucherNumber}</strong> বাতিল ও
              রিভার্স করতে চান? এর ফলে সংশ্লিষ্ট অ্যাকাউন্টের ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হবে।
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                বাতিলের কারণ / মন্তব্য *
              </label>
              <input
                id="input-reversal-reason"
                type="text"
                placeholder="e.g. ভুল এন্ট্রি / চেক বাউন্স"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                id="btn-confirm-reversal"
                onClick={handleConfirmReversal}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE CALCULATOR MODAL */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyTotal={(tot) => setAmount(tot.toString())}
        language={language}
      />

      {/* EDIT TRANSACTION MODAL */}
      {editingItem && (
        <EditTransactionModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          transaction={editingItem.item}
          type={editingItem.type}
          accounts={accounts}
          accountHeads={accountHeads}
          language={language}
          onSave={async (id, data) => {
            if (editingItem.type === 'INCOME' && onUpdateIncome) {
              await onUpdateIncome(id, data);
            } else if (editingItem.type === 'EXPENSE' && onUpdateExpense) {
              await onUpdateExpense(id, data);
            }
          }}
        />
      )}

      {/* SMS PREVIEW MODAL */}
      {smsItem && onSendSms && (
        <SmsPreviewModal
          isOpen={!!smsItem}
          onClose={() => setSmsItem(null)}
          recipientPhone={
            ('donorPhone' in smsItem.item
              ? (smsItem.item as any).donorPhone
              : (smsItem.item as any).payeePhone) || ''
          }
          donorOrPayeeName={
            'donorName' in smsItem.item
              ? smsItem.item.donorName
              : (smsItem.item as ExpenseEntry).payeeName
          }
          amount={smsItem.item.amount}
          voucherNumber={smsItem.item.voucherNumber}
          documentType={smsItem.type === 'INCOME' ? 'INCOME_VOUCHER' : 'EXPENSE_VOUCHER'}
          documentId={smsItem.item.id}
          mosque={currentMosque}
          language={language}
          onSendSms={onSendSms}
        />
      )}
    </div>
  );
};

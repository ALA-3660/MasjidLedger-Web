import React, { useState } from 'react';
import {
  X,
  Wrench,
  DollarSign,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon
} from 'lucide-react';
import { MosqueAsset, AssetCondition, FinancialAccount, AccountHead } from '../types';
import { Language, translations } from '../lib/i18n';
import { ASSET_CONDITIONS } from './AssetFormModal';

interface AssetServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: MosqueAsset;
  onSaveService: (assetId: string, serviceData: any) => Promise<void>;
  accounts?: FinancialAccount[];
  accountHeads?: AccountHead[];
  language: Language;
}

const SERVICE_TYPES = [
  { key: 'REGULAR_MAINTENANCE', labelBn: 'নিয়মিত সার্ভিসিং / মবিল ও ফিল্টার চেঞ্জ' },
  { key: 'REPAIR', labelBn: 'মেরামত ও পার্টস প্রতিস্থাপন' },
  { key: 'INSPECTION', labelBn: 'কারিগরি পরিদর্শন ও টেস্ট রান' },
  { key: 'CLEANING', labelBn: 'গভীর পরিষ্কার ও স্যানিটাইজেশন' },
  { key: 'OTHER', labelBn: 'অন্যান্য কারিগরি সেবা' }
];

export const AssetServiceModal: React.FC<AssetServiceModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSaveService,
  accounts = [],
  accountHeads = [],
  language
}) => {
  const t = translations[language];

  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState('REGULAR_MAINTENANCE');
  const [servicedBy, setServicedBy] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [updateConditionTo, setUpdateConditionTo] = useState<AssetCondition>(asset.condition || 'GOOD');

  // Auto create expense voucher for maintenance
  const [createMaintenanceExpense, setCreateMaintenanceExpense] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const maintenanceHead = accountHeads.find(
    (h) => h.headType === 'EXPENSE' && (h.nameBn?.includes('মেরামত') || h.nameBn?.includes('রক্ষণাবেক্ষণ'))
  );
  const [selectedExpenseHeadId, setSelectedExpenseHeadId] = useState(
    maintenanceHead ? maintenanceHead.id : accountHeads.find((h) => h.headType === 'EXPENSE')?.id || ''
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('সার্ভিসিং / মেরামতের কাজের বিবরণ আবশ্যক।');
      return;
    }

    const selectedTypeObj = SERVICE_TYPES.find((st) => st.key === serviceType);

    setLoading(true);
    setErrorMessage('');

    try {
      await onSaveService(asset.id, {
        serviceDate,
        serviceType,
        serviceTypeBn: selectedTypeObj?.labelBn || serviceType,
        servicedBy: servicedBy.trim(),
        cost: Number(cost) || 0,
        description: description.trim(),
        nextServiceDate,
        updateConditionTo,
        createMaintenanceExpense,
        accountId: selectedAccountId,
        expenseHeadId: selectedExpenseHeadId
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'সার্ভিসিং রেকর্ড সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-siliguri">সার্ভিসিং ও মেরামত রেকর্ড যোগ করুন</h2>
              <p className="text-xs text-slate-300">
                {asset.name} ({asset.assetCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Date */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">
                সার্ভিসিংয়ের তারিখ <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
              />
            </div>

            {/* Service Type */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">
                কাজের ধরন <span className="text-rose-600">*</span>
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
              >
                {SERVICE_TYPES.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.labelBn}
                  </option>
                ))}
              </select>
            </div>

            {/* Serviced By */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">সার্ভিসিং টেকনিশিয়ান / প্রতিষ্ঠান</label>
              <input
                type="text"
                placeholder="যেমন: বাংলা পাওয়ার টেকনিশিয়ান বা লোকাল মেকানিক"
                value={servicedBy}
                onChange={(e) => setServicedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
              />
            </div>

            {/* Cost */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">মোট খরচ (টাকা)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 font-siliguri"
                />
              </div>
            </div>

            {/* Next Service Date */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">পরবর্তী সম্ভাব্য সার্ভিসিং তারিখ</label>
              <input
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
              />
            </div>

            {/* Condition Update */}
            <div className="space-y-1">
              <label className="font-bold text-slate-800">সার্ভিসিংয়ের পর বর্তমান অবস্থা</label>
              <select
                value={updateConditionTo}
                onChange={(e) => setUpdateConditionTo(e.target.value as AssetCondition)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
              >
                {ASSET_CONDITIONS.map((cond) => (
                  <option key={cond.key} value={cond.key}>
                    {cond.labelBn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800">
              সার্ভিসিং / মেরামতের বিস্তারিত বিবরণ <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="কি কি কাজ করা হয়েছে, কোন পার্টস পরিবর্তন করা হয়েছে ইত্যাদি..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900"
            />
          </div>

          {/* Auto Create Expense Voucher Checkbox */}
          {Number(cost) > 0 && accounts.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <label className="flex items-center space-x-2 font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createMaintenanceExpense}
                  onChange={(e) => setCreateMaintenanceExpense(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>এই সার্ভিসিং খরচের জন্য অ্যাকাউন্টিংয়ে স্বয়ংক্রিয় ব্যয় ভাউচার তৈরি করুন</span>
              </label>

              {createMaintenanceExpense && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">পরিশোধের একাউন্ট</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountNameBn} (ব্যালেন্স: ৳{acc.currentBalance.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">ব্যয় খাত (Expense Head)</label>
                    <select
                      value={selectedExpenseHeadId}
                      onChange={(e) => setSelectedExpenseHeadId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900"
                    >
                      {accountHeads
                        .filter((h) => h.headType === 'EXPENSE')
                        .map((head) => (
                          <option key={head.id} value={head.id}>
                            {head.nameBn} ({head.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>সংরক্ষণ হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সার্ভিসিং রেকর্ড যুক্ত করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  X,
  HeartHandshake,
  User,
  Calendar,
  DollarSign,
  Briefcase,
  MapPin,
  Home,
  Phone,
  Edit,
  Power,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  Copy,
  Check,
  Coins,
  Plus,
  Receipt,
  XCircle,
} from 'lucide-react';
import {
  DonationPlan,
  DonationPlanStatus,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  User as AuthUser,
  Donation,
} from '../../types';
import { Language, toBanglaNumber, formatDate, formatCurrency } from '../../lib/i18n';

interface DonationPlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: DonationPlan | null;
  person?: PersonMaster | null;
  family?: FamilyMaster | null;
  area?: AreaMaster | null;
  worker?: CollectionWorker | null;
  donations?: Donation[];
  currentUser?: AuthUser | null;
  onEdit: (plan: DonationPlan) => void;
  onOpenStatusModal: (plan: DonationPlan, targetStatus: DonationPlanStatus) => void;
  onRecordDonation?: (person: PersonMaster, plan: DonationPlan) => void;
  onReceiveDonation?: (personId: string, planId: string) => void;
  onPrintDonationReceipt?: (donation: Donation) => void;
  language?: Language;
}

export const DonationPlanDetailModal: React.FC<DonationPlanDetailModalProps> = ({
  isOpen,
  onClose,
  plan,
  person,
  family,
  area,
  worker,
  donations = [],
  currentUser,
  onEdit,
  onOpenStatusModal,
  onRecordDonation,
  onReceiveDonation,
  onPrintDonationReceipt,
  language = 'bn',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const isBn = language === 'bn';

  if (!isOpen || !plan) return null;

  const canEdit =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('EDIT_DONATION_PLAN');

  const canReceiveDonation =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'MOSQUE_ADMIN' ||
    currentUser?.permissions?.includes('CREATE_INCOME');

  // Filter donations linked to this plan
  const planDonations = donations.filter((d) => d.donationPlanId === plan.id);
  const completedPlanDonations = planDonations.filter((d) => d.status === 'COMPLETED');
  const totalCollectedForPlan = completedPlanDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const planAmount = plan.amount ?? plan.plannedAmount ?? 0;

  const getStatusBadge = (status: DonationPlanStatus) => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: isBn ? '🟢 সক্রিয়' : 'Active',
          class: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'PAUSED':
        return {
          label: isBn ? '⏸️ স্থগিত' : 'Paused',
          class: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'COMPLETED':
        return {
          label: isBn ? '✅ সম্পন্ন' : 'Completed',
          class: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'CANCELLED':
        return {
          label: isBn ? '❌ বাতিল' : 'Cancelled',
          class: 'bg-rose-100 text-rose-800 border-rose-200',
        };
      default:
        return {
          label: isBn ? 'নিষ্ক্রিয়' : 'Inactive',
          class: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const statusBadge = getStatusBadge(plan.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold font-siliguri">
                  {isBn ? 'দান পরিকল্পনা বিবরণী' : 'Donation Plan Details'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-siliguri bg-white/90 ${statusBadge.class}`}>
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-baloo">
                {plan.planCode || `PLAN-#${plan.id.slice(0, 6)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              type="button"
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isBn ? 'প্রিন্ট করুন' : 'Print'}
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Financial Spec Banner */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-emerald-800 font-siliguri">
                {plan.planType === 'MONTHLY'
                  ? isBn
                    ? '📅 মাসিক দান পরিকল্পনা'
                    : 'Monthly Plan'
                  : plan.planType === 'YEARLY'
                  ? isBn
                    ? '🗓️ বাৎসরিক দান পরিকল্পনা'
                    : 'Yearly Plan'
                  : plan.planType === 'IRREGULAR'
                  ? isBn
                    ? '✨ অনিয়মিত দান পরিকল্পনা'
                    : 'Irregular Plan'
                  : isBn
                  ? 'অন্যান্য পরিকল্পনা'
                  : 'Other Plan'}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-baloo mt-1">
                ৳{isBn ? toBanglaNumber(planAmount) : planAmount}
                <span className="text-xs font-normal text-slate-500 font-tiro ml-1.5">
                  {plan.planType === 'MONTHLY'
                    ? isBn
                      ? '/ প্রতি মাসে'
                      : '/ per month'
                    : plan.planType === 'YEARLY'
                    ? isBn
                      ? '/ প্রতি বছরে'
                      : '/ per year'
                    : ''}
                </span>
              </div>
              {plan.description && (
                <div className="text-xs text-slate-600 font-tiro mt-1">
                  {plan.description}
                </div>
              )}
            </div>

            <div className="flex flex-col items-start sm:items-end space-y-1 text-xs text-slate-600 font-tiro">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {isBn ? 'শুরু: ' : 'Start: '}
                  <span className="font-bold text-slate-800 font-baloo">
                    {plan.startDate ? formatDate(plan.startDate) : '—'}
                  </span>
                </span>
              </div>
              {plan.endDate && (
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {isBn ? 'সমাপ্তি: ' : 'End: '}
                    <span className="font-bold text-slate-800 font-baloo">
                      {formatDate(plan.endDate)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Person Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 font-siliguri">
              <span className="flex items-center space-x-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                <span>{isBn ? 'পরিকল্পনাভুক্ত দাতা / মুসল্লি' : 'Pledged Donor Profile'}</span>
              </span>
              {person?.personCode && (
                <button
                  type="button"
                  onClick={() => copyCode(person.personCode!)}
                  className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-baloo cursor-pointer"
                >
                  <span>{person.personCode}</span>
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              )}
            </div>

            {person ? (
              <div className="flex items-center space-x-3.5 pt-1">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0 font-baloo">
                  {person.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 font-siliguri truncate">
                    {person.fullName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-tiro mt-0.5">
                    {person.mobile && (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{person.mobile}</span>
                      </span>
                    )}
                    {family && (
                      <span className="flex items-center space-x-1">
                        <Home className="w-3 h-3 text-slate-400" />
                        <span>{family.name}</span>
                      </span>
                    )}
                    {area && (
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{area.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-tiro italic">
                {isBn ? 'ব্যক্তির তথ্য লোড করা যায়নি' : 'Person details not found'}
              </div>
            )}
          </div>

          {/* Collection Arrangement */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'সংগ্রহ ও প্রতিনিধি সংক্রান্ত তথ্য' : 'Collection Arrangement'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500 font-tiro">{isBn ? 'কালেকশন প্রয়োজন:' : 'Collection Required:'} </span>
                <span className="font-bold text-slate-800 font-siliguri">
                  {plan.collectionRequired
                    ? isBn
                      ? 'হ্যাঁ (প্রতিনিধি নিয়োজিত)'
                      : 'Yes'
                    : isBn
                    ? 'না (সরাসরি দান করবেন)'
                    : 'No (Direct)'}
                </span>
              </div>

              {plan.collectionRequired && (
                <div>
                  <span className="text-slate-500 font-tiro">{isBn ? 'দায়িত্বপ্রাপ্ত সংগ্রহকারী:' : 'Worker:'} </span>
                  <span className="font-bold text-slate-800 font-siliguri">
                    {worker ? `${worker.name} (${worker.mobile || 'মোবাইল নেই'})` : isBn ? 'নির্ধারিত নেই' : 'Unassigned'}
                  </span>
                </div>
              )}

              {plan.collectionDay && (
                <div>
                  <span className="text-slate-500 font-tiro">{isBn ? 'সংগ্রহের দিন:' : 'Collection Day:'} </span>
                  <span className="font-bold text-slate-800 font-tiro">{plan.collectionDay}</span>
                </div>
              )}

              {plan.collectionNote && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-tiro">{isBn ? 'সংগ্রহের নোট:' : 'Collection Note:'} </span>
                  <span className="text-slate-700 font-tiro">{plan.collectionNote}</span>
                </div>
              )}
            </div>
          </div>

          {/* Collections Against This Plan Card (Phase B5) */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-slate-900 font-siliguri">
                  {isBn ? 'এই পরিকল্পনার বিপরীতে সংগৃহীত অনুদান' : 'Collections Against This Plan'}
                </h4>
                <span className="font-baloo text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                  {isBn ? `মোট জমা: ৳ ${toBanglaNumber(formatCurrency(totalCollectedForPlan))}` : `Total: ৳${totalCollectedForPlan.toLocaleString()}`}
                </span>
              </div>

              {canReceiveDonation && onReceiveDonation && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReceiveDonation(plan.personId, plan.id);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors flex items-center space-x-1 font-siliguri"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isBn ? '+ অনুদান গ্রহণ' : '+ Record Donation'}</span>
                </button>
              )}
            </div>

            {planDonations.length === 0 ? (
              <div className="p-3 bg-white rounded-xl border border-dashed border-emerald-200 text-center text-xs text-slate-500 font-tiro">
                {isBn
                  ? 'এই পরিকল্পনার বিপরীতে এখনো কোনো অনুদান রসিদ কাটা হয়নি।'
                  : 'No donation receipts logged for this plan yet.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {planDonations.map((d) => {
                  const isCanc = d.status === 'CANCELLED';
                  return (
                    <div
                      key={d.id}
                      className={`p-2.5 bg-white rounded-xl border flex items-center justify-between gap-2 shadow-2xs text-xs font-siliguri ${
                        isCanc ? 'border-red-200 bg-red-50/20' : 'border-emerald-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-baloo font-bold text-slate-900">{d.receiptNumber}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                              isCanc ? 'bg-red-100 text-red-800 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isCanc ? (isBn ? 'বাতিল' : 'Cancelled') : isBn ? 'সম্পন্ন' : 'Completed'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-baloo mt-0.5 flex items-center space-x-2">
                          <span>{formatDate(d.date, language)}</span>
                          <span>• {d.accountName}</span>
                          <span>• {d.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <div className="text-right font-baloo font-bold">
                          <span className={`text-xs ${isCanc ? 'line-through text-slate-400' : 'text-emerald-900'}`}>
                            {isBn ? `৳ ${toBanglaNumber(formatCurrency(d.amount))}` : `৳${d.amount.toLocaleString()}`}
                          </span>
                        </div>

                        {onPrintDonationReceipt && (
                          <button
                            type="button"
                            onClick={() => onPrintDonationReceipt(d)}
                            title={isBn ? 'রসিদ প্রিন্ট' : 'Print Receipt'}
                            className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Internal Notes */}
          {plan.notes && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-700 font-siliguri flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{isBn ? 'প্রশাসনিক নোট' : 'Administrative Notes'}</span>
              </div>
              <p className="text-xs text-slate-600 font-tiro leading-relaxed">{plan.notes}</p>
            </div>
          )}

          {/* Safety Notice */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-start space-x-2 text-[11px] text-emerald-900 font-tiro">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              {isBn
                ? 'এই দান পরিকল্পনাটি আর্থিক খতিয়ানে কোনো অপরিশোধিত দেনা বা বকেয়া তৈরি করে না। ব্যক্তি যখন দান করবেন, তখন নিয়মিত দান রসিদের মাধ্যমে হিসাবভুক্ত হবে।'
                : 'This plan does not create automatic receivables or debts in accounting ledger. Financial accounting happens purely upon actual donation intake.'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            {plan.status === 'ACTIVE' ? (
              <button
                type="button"
                onClick={() => onOpenStatusModal(plan, 'PAUSED')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer"
              >
                {isBn ? '⏸️ স্থগিত করুন' : 'Pause'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenStatusModal(plan, 'ACTIVE')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer"
              >
                {isBn ? '🟢 সক্রিয় করুন' : 'Activate'}
              </button>
            )}

            {plan.status !== 'COMPLETED' && (
              <button
                type="button"
                onClick={() => onOpenStatusModal(plan, 'COMPLETED')}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer"
              >
                {isBn ? '✅ সম্পন্ন' : 'Complete'}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(plan);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{isBn ? 'সংশোধন করুন' : 'Edit Plan'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold font-siliguri transition-colors cursor-pointer"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

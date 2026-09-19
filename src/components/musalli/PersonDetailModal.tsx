import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  MapPin,
  Home,
  Phone,
  Mail,
  Briefcase,
  Shield,
  Calendar,
  Crown,
  Heart,
  Edit,
  Power,
  Copy,
  Check,
  Printer,
  Sparkles,
  Layers,
  HeartHandshake,
  FileText,
  Coins,
  Plus,
  Receipt,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PersonMaster, FamilyMaster, AreaMaster, DonationPlan, Donation, User as AuthUser } from '../../types';
import { Language, formatDate, toBanglaNumber, formatCurrency } from '../../lib/i18n';

interface PersonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: PersonMaster | null;
  family?: FamilyMaster | null;
  area?: AreaMaster | null;
  plans?: DonationPlan[];
  donations?: Donation[];
  currentUser?: AuthUser | null;
  onEdit: (person: PersonMaster) => void;
  onToggleStatus: (person: PersonMaster) => void;
  onReceiveDonation?: (personId: string, planId?: string) => void;
  onPrintDonationReceipt?: (donation: Donation) => void;
  language?: Language;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  isOpen,
  onClose,
  person,
  family,
  area,
  plans = [],
  donations = [],
  currentUser,
  onEdit,
  onToggleStatus,
  onReceiveDonation,
  onPrintDonationReceipt,
  language = 'bn',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen || !person) return null;

  const isBn = language === 'bn';
  const canEdit = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN' || currentUser?.permissions?.includes('EDIT_MUSALLI');
  const canReceiveDonation = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN' || currentUser?.permissions?.includes('CREATE_INCOME');
  const canViewPersonalDocs = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MOSQUE_ADMIN' || currentUser?.permissions?.includes('VIEW_PERSONAL_DOCUMENTS');

  const personDonations = donations.filter((d) => d.personId === person.id);
  const completedDonations = personDonations.filter((d) => d.status === 'COMPLETED');
  const totalDonatedAmount = completedDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  const copyToClipboard = (text: string, type: 'code' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold font-siliguri">
                  {person.fullName}
                </h2>
                {person.isFamilyHead && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/90 text-amber-950 font-siliguri">
                    <Crown className="w-3 h-3 text-amber-900" />
                    <span>{isBn ? 'পরিবার প্রধান' : 'Family Head'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 font-baloo">
                {isBn ? 'ব্যক্তি কোড: ' : 'Person Code: '}
                <span className="font-bold tracking-wider">{person.personCode}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              type="button"
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={isBn ? 'প্রিন্ট করুন' : 'Print Profile'}
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Identity & Status Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-emerald-600 bg-white overflow-hidden flex items-center justify-center shadow-xs shrink-0">
              {person.photoUrl ? (
                <img
                  src={person.photoUrl}
                  alt={person.fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-slate-300" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-siliguri">
                    {person.fullName}
                  </h3>
                  {person.fatherOrHusbandName && (
                    <p className="text-xs text-slate-600 font-tiro">
                      {isBn ? 'পিতা / স্বামী: ' : 'Father / Husband: '}
                      <span className="font-medium text-slate-800">{person.fatherOrHusbandName}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-siliguri ${
                      person.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        person.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-red-600'
                      }`}
                    />
                    {person.status === 'ACTIVE' ? (isBn ? 'সক্রিয়' : 'Active') : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Badges / Quick stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => copyToClipboard(person.personCode, 'code')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-baloo"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{person.personCode}</span>
                </button>

                {person.gender && (
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-siliguri">
                    {person.gender === 'MALE' ? (isBn ? 'পুরুষ' : 'Male') : person.gender === 'FEMALE' ? (isBn ? 'মহিলা' : 'Female') : isBn ? 'অন্যান্য' : 'Other'}
                  </span>
                )}

                {person.bloodGroup && (
                  <span className="px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold font-baloo">
                    🩸 {person.bloodGroup}
                  </span>
                )}

                {person.maritalStatus && (
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-siliguri">
                    {person.maritalStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Area & Family Linkage */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 font-siliguri">
              <Home className="w-4 h-4 text-emerald-700" />
              <span>{isBn ? 'পারিবারিক ও এলাকা খতিয়ান' : 'Family & Area Record'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-emerald-200/70">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'পরিবার / বাড়ি:' : 'Family / House:'}
                </span>
                {family ? (
                  <div className="font-bold text-slate-900 font-siliguri mt-0.5">
                    {family.name}{' '}
                    {family.familyCode && (
                      <span className="text-emerald-700 font-baloo text-xs">({family.familyCode})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 font-tiro italic">
                    {isBn ? '🏠 পরিবার নির্ধারণ অপেক্ষমাণ' : 'Pending Family Assignment'}
                  </span>
                )}
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-emerald-200/70">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'এলাকা / মহল্লা:' : 'Area / Mohalla:'}
                </span>
                {area ? (
                  <div className="font-bold text-slate-900 font-siliguri mt-0.5">
                    {area.name}{' '}
                    {area.areaCode && (
                      <span className="text-emerald-700 font-baloo text-xs">({area.areaCode})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 font-tiro italic">
                    {isBn ? 'এলাকা নির্ধারণ করা হয়নি' : 'No Area Assigned'}
                  </span>
                )}
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-emerald-200/70">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'পরিবারে ভূমিকা / সম্পর্ক:' : 'Role in Family:'}
                </span>
                <span className="font-bold text-slate-800 font-siliguri mt-0.5 block">
                  {person.familyRelation || (person.isFamilyHead ? (isBn ? 'পরিবারের প্রধান' : 'Family Head') : (isBn ? 'সাধারণ সদস্য' : 'Member'))}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-emerald-200/70">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'জন্ম তারিখ / বয়স:' : 'Date of Birth:'}
                </span>
                <span className="font-semibold text-slate-800 font-baloo mt-0.5 block">
                  {person.dateOfBirth ? formatDate(person.dateOfBirth, language) : (isBn ? 'তথ্য নেই' : 'N/A')}
                </span>
              </div>
            </div>
          </div>

          {/* Contact & Address Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 font-siliguri">
              <Phone className="w-4 h-4 text-emerald-700" />
              <span>{isBn ? 'যোগাযোগ ও ঠিকানা' : 'Contact & Address'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'প্রধান মোবাইল:' : 'Primary Mobile:'}
                </span>
                {person.mobile ? (
                  <div className="flex items-center justify-between mt-0.5">
                    <a
                      href={`tel:${person.mobile}`}
                      className="font-bold text-emerald-700 hover:underline font-baloo tracking-wide"
                    >
                      {person.mobile}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(person.mobile!, 'phone')}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title={isBn ? 'কপি করুন' : 'Copy'}
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 font-tiro italic">{isBn ? 'প্রদান করা হয়নি' : 'Not provided'}</span>
                )}
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'বিকল্প মোবাইল:' : 'Alternative Mobile:'}
                </span>
                {person.alternativeMobile ? (
                  <a
                    href={`tel:${person.alternativeMobile}`}
                    className="font-semibold text-slate-800 hover:underline font-baloo tracking-wide mt-0.5 block"
                  >
                    {person.alternativeMobile}
                  </a>
                ) : (
                  <span className="text-slate-400 font-tiro italic">{isBn ? 'প্রদান করা হয়নি' : 'Not provided'}</span>
                )}
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'ইমেইল:' : 'Email:'}
                </span>
                {person.email ? (
                  <a
                    href={`mailto:${person.email}`}
                    className="font-semibold text-blue-700 hover:underline font-tiro mt-0.5 block"
                  >
                    {person.email}
                  </a>
                ) : (
                  <span className="text-slate-400 font-tiro italic">{isBn ? 'প্রদান করা হয়নি' : 'Not provided'}</span>
                )}
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'বাড়ি / রোড / ব্লক:' : 'House / Road / Block:'}
                </span>
                <span className="font-semibold text-slate-800 font-tiro mt-0.5 block">
                  {person.houseRoadBlock || (isBn ? 'তথ্য নেই' : 'N/A')}
                </span>
              </div>
            </div>

            {person.address && (
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                <span className="text-[11px] text-slate-500 font-siliguri block">
                  {isBn ? 'বিস্তারিত ঠিকানা:' : 'Detailed Address:'}
                </span>
                <p className="text-slate-800 font-tiro leading-relaxed mt-0.5">
                  {person.address}
                </p>
              </div>
            )}
          </div>

          {/* Profession & Organization */}
          {(person.profession || person.occupation || person.organization) && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center space-x-2 font-bold text-slate-800 font-siliguri">
                <Briefcase className="w-4 h-4 text-emerald-700" />
                <span>{isBn ? 'পেশা ও কর্মসংস্থান' : 'Profession & Work'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-siliguri block">
                    {isBn ? 'পেশা:' : 'Profession:'}
                  </span>
                  <span className="font-bold text-slate-900 font-tiro mt-0.5 block">
                    {person.profession || person.occupation}
                  </span>
                </div>
                {person.organization && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-siliguri block">
                      {isBn ? 'প্রতিষ্ঠান / কর্মস্থল:' : 'Organization:'}
                    </span>
                    <span className="font-bold text-slate-900 font-tiro mt-0.5 block">
                      {person.organization}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Protected NID Section */}
          {canViewPersonalDocs && person.nidNumber && (
            <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-blue-900 font-siliguri">
                <Shield className="w-3.5 h-3.5 text-blue-700" />
                <span>{isBn ? 'জাতীয় পরিচয়পত্র (NID) [সুরক্ষিত]' : 'National ID (Protected)'}</span>
              </div>
              <p className="font-bold text-slate-900 font-baloo text-sm tracking-wider">
                {person.nidNumber}
              </p>
            </div>
          )}

          {person.notes && (
            <div className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-xl text-xs">
              <span className="text-[11px] text-amber-900 font-bold font-siliguri block">
                {isBn ? 'নোট / মন্তব্য:' : 'Notes / Remarks:'}
              </span>
              <p className="text-slate-700 font-tiro leading-relaxed mt-0.5">
                {person.notes}
              </p>
            </div>
          )}

          {/* Donation Plans Section (Phase B4) */}
          {(() => {
            const personPlans = plans.filter((p) => p.personId === person.id);
            const activePlans = personPlans.filter((p) => p.status === 'ACTIVE');
            const otherPlans = personPlans.filter((p) => p.status !== 'ACTIVE');
            const totalActiveMonthly = activePlans
              .filter((p) => p.planType === 'MONTHLY')
              .reduce((sum, p) => sum + (p.amount ?? p.plannedAmount ?? 0), 0);

            return (
              <div className="p-4 bg-gradient-to-br from-rose-50/40 via-pink-50/20 to-slate-50 border border-rose-200/70 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-slate-800 font-siliguri">
                    <HeartHandshake className="w-4 h-4 text-rose-600" />
                    <span>{isBn ? 'অনুদান পরিকল্পনা (Donation Plans)' : 'Donation Plans'}</span>
                  </div>
                  {activePlans.length > 0 && totalActiveMonthly > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 font-baloo">
                      {isBn ? `সক্রিয় মাসিক প্রতিশ্রুতি: ${toBanglaNumber(formatCurrency(totalActiveMonthly))}` : `Active Monthly: ৳${totalActiveMonthly}`}
                    </span>
                  )}
                </div>

                {personPlans.length === 0 ? (
                  <p className="text-slate-500 font-tiro italic py-1">
                    {isBn ? 'এই ব্যক্তির জন্য কোনো অনুদান পরিকল্পনা অন্তর্ভুক্ত নেই।' : 'No donation plans registered for this person.'}
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {personPlans.map((pl) => {
                      const pAmt = pl.amount ?? pl.plannedAmount ?? 0;
                      const typeLabel =
                        pl.planType === 'MONTHLY'
                          ? isBn ? 'মাসিক অনুদান' : 'Monthly Plan'
                          : pl.planType === 'YEARLY'
                          ? isBn ? 'বার্ষিক অনুদান' : 'Yearly Plan'
                          : pl.planType === 'IRREGULAR'
                          ? isBn ? 'অনিয়মিত অনুদান' : 'Irregular Plan'
                          : isBn ? 'নির্দিষ্ট পরিকল্পনা নেই' : 'No Fixed Plan';

                      const statusBadgeClass =
                        pl.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : pl.status === 'PAUSED'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : pl.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                      const statusLabel =
                        pl.status === 'ACTIVE'
                          ? isBn ? 'সক্রিয়' : 'Active'
                          : pl.status === 'PAUSED'
                          ? isBn ? 'স্থগিত' : 'Paused'
                          : pl.status === 'COMPLETED'
                          ? isBn ? 'সম্পন্ন' : 'Completed'
                          : isBn ? 'বাতিল' : 'Cancelled';

                      return (
                        <div
                          key={pl.id}
                          className="p-3 bg-white rounded-xl border border-rose-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 font-baloo tracking-wide">
                                {pl.planCode || pl.id}
                              </span>
                              <span className="font-semibold text-rose-700 font-siliguri">
                                {typeLabel}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-siliguri ${statusBadgeClass}`}>
                                {statusLabel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-baloo flex flex-wrap items-center gap-x-3 gap-y-1">
                              {pl.startDate && (
                                <span>
                                  {isBn ? 'শুরু: ' : 'Start: '}
                                  <strong className="text-slate-700">{formatDate(pl.startDate, language)}</strong>
                                </span>
                              )}
                              {pl.endDate && (
                                <span>
                                  {isBn ? 'সমাপ্তি: ' : 'End: '}
                                  <strong className="text-slate-700">{formatDate(pl.endDate, language)}</strong>
                                </span>
                              )}
                              {pl.collectionRequired && (
                                <span className="text-amber-700 font-semibold font-siliguri">
                                  {isBn ? '• সংগ্রহ প্রয়োজন' : '• Collection Required'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right sm:shrink-0">
                            <div className="text-sm font-bold text-slate-900 font-baloo">
                              {isBn ? `${toBanglaNumber(formatCurrency(pAmt))}` : `৳${pAmt.toLocaleString()}`}
                            </div>
                            <div className="text-[10px] text-slate-400 font-siliguri">
                              {isBn ? 'পরিকল্পিত পরিমাণ' : 'Planned Amount'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Actual Donation / Receipts History Card (Phase B5) */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-slate-900 font-siliguri">
                  {isBn ? 'প্রকৃত সংগৃহীত অনুদানের ইতিহাস' : 'Actual Received Donations History'}
                </h4>
                <span className="font-baloo text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                  {isBn ? `মোট: ৳ ${toBanglaNumber(formatCurrency(totalDonatedAmount))}` : `Total: ৳${totalDonatedAmount.toLocaleString()}`}
                </span>
              </div>

              {canReceiveDonation && onReceiveDonation && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReceiveDonation(person.id);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors flex items-center space-x-1 font-siliguri"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isBn ? '+ অনুদান গ্রহণ' : '+ Receive Donation'}</span>
                </button>
              )}
            </div>

            {personDonations.length === 0 ? (
              <div className="p-3 bg-white rounded-xl border border-dashed border-emerald-200 text-center text-xs text-slate-500 font-tiro">
                {isBn
                  ? 'এই ব্যক্তির নামে এখনো কোনো সরাসরি অনুদান রসিদ তৈরি করা হয়নি।'
                  : 'No donation receipts recorded for this musalli yet.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {personDonations.map((d) => {
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
                          {d.donationPlanId && (
                            <span className="font-baloo text-[10px] bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                              {d.planCode || 'PLAN'}
                            </span>
                          )}
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

          {/* Audit Metadata */}
          <div className="p-3 bg-slate-100/70 rounded-xl text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 font-baloo">
            <span>
              {isBn ? 'নিবন্ধনের তারিখ: ' : 'Registered: '}
              <strong className="text-slate-700">{formatDate(person.createdAt, language)}</strong>
            </span>
            <span>
              {isBn ? 'সর্বশেষ হালনাগাদ: ' : 'Updated: '}
              <strong className="text-slate-700">{formatDate(person.updatedAt, language)}</strong>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div>
            {canEdit && (
              <button
                type="button"
                onClick={() => onToggleStatus(person)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center space-x-1.5 font-siliguri ${
                  person.status === 'ACTIVE'
                    ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {person.status === 'ACTIVE'
                    ? isBn
                      ? 'নিষ্ক্রিয় করুন'
                      : 'Deactivate'
                    : isBn
                    ? 'সক্রিয় করুন'
                    : 'Activate'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors font-siliguri"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(person);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 font-siliguri"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{isBn ? 'সম্পাদন করুন' : 'Edit Person'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  GitMerge,
  History,
  Mail,
  MapPin,
  Phone,
  Printer,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Mosque } from '../../types';
import { api } from '../../lib/api';
import {
  PARTY_PROFILE_TYPE_LABELS,
  formatPartyAddressLine,
  getPartyRoleLabelBn,
} from '../../lib/partyCatalog';
import { formatDate } from '../../lib/i18n';
import { printElement } from '../../lib/printUtils';
import { exportToXlsx } from '../../lib/reportingEngine';
import {
  PartyAuditLogEntry,
  PartyCategorizedVoucher,
  PartyCustomRoleDef,
  PartyHistoryBundle,
  PartyMergeHistoryRecord,
  PartyRecord,
  PartyStatus,
  PartyTimelineItem,
  PartyVoucherReference,
  PartyAgreementReference,
  PartyStaffLinkRef,
} from '../../types/partyTypes';
import { toBanglaNumber } from '../CommitteeView';

export interface PartyProfileViewProps {
  currentMosque?: Mosque | null;
  partyIdOrRecordId: string;
  customRoles: PartyCustomRoleDef[];
  canEdit: boolean;
  canDelete: boolean;
  canViewAudit: boolean;
  onBack: () => void;
  onEdit: (party: PartyRecord) => void;
  onDeleted: () => void;
  onOpenParty: (id: string) => void;
  onStatusChanged: (updated: PartyRecord) => void;
}

const AUDIT_ACTION_LABELS: Record<PartyAuditLogEntry['action'], string> = {
  CREATED: 'তৈরি হয়েছে',
  UPDATED: 'হালনাগাদ',
  STATUS_CHANGED: 'অবস্থা পরিবর্তন',
  MERGED: 'একীভূতকরণ (Merge)',
  ROLE_ADDED: 'ভূমিকা যুক্ত',
  STAFF_LINKED: 'স্টাফ সংযুক্ত',
  DELETED: 'মুছে ফেলা',
};

type PartyHistoryTab =
  | 'TIMELINE'
  | 'PURCHASE_SUPPLY'
  | 'WORK_WAGE'
  | 'VOUCHERS'
  | 'AGREEMENTS'
  | 'AUDIT_STAFF';

export const PartyProfileView: React.FC<PartyProfileViewProps> = ({
  currentMosque,
  partyIdOrRecordId,
  customRoles,
  canEdit,
  canDelete,
  canViewAudit,
  onBack,
  onEdit,
  onDeleted,
  onOpenParty,
  onStatusChanged,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [party, setParty] = useState<PartyRecord | null>(null);
  const [resolvedPrimary, setResolvedPrimary] = useState<PartyRecord | undefined>(
    undefined
  );
  const [auditLogs, setAuditLogs] = useState<PartyAuditLogEntry[]>([]);
  const [mergeHistory, setMergeHistory] = useState<PartyMergeHistoryRecord[]>(
    []
  );
  const [voucherReferences, setVoucherReferences] = useState<PartyVoucherReference[]>([]);
  const [agreementReferences, setAgreementReferences] = useState<PartyAgreementReference[]>([]);
  const [linkedStaff, setLinkedStaff] = useState<PartyStaffLinkRef[]>([]);
  const [imageError, setImageError] = useState(false);

  // Part 3 Activity History state
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyTab, setHistoryTab] = useState<PartyHistoryTab>('TIMELINE');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyBundle, setHistoryBundle] = useState<PartyHistoryBundle | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadHistory = async (start = historyStartDate, end = historyEndDate) => {
    try {
      setHistoryLoading(true);
      const hb = await api.getPartyHistory(partyIdOrRecordId, {
        startDate: start || undefined,
        endDate: end || undefined,
      });
      setHistoryBundle(hb);
    } catch {
      // Keep profile usable even if history refresh has a transient issue
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setImageError(false);
      const [data, hb] = await Promise.all([
        api.getPartyById(partyIdOrRecordId),
        api.getPartyHistory(partyIdOrRecordId, {
          startDate: historyStartDate || undefined,
          endDate: historyEndDate || undefined,
        }),
      ]);
      setParty(data.party);
      setResolvedPrimary(data.resolvedPrimaryParty);
      setAuditLogs(data.auditLogs || []);
      setMergeHistory(data.mergeHistory || []);
      setVoucherReferences(data.voucherReferences || []);
      setAgreementReferences(data.agreementReferences || []);
      setLinkedStaff(data.linkedStaff || []);
      setHistoryBundle(hb);
    } catch (err: any) {
      setErrorMsg(err?.message || 'প্রোফাইলের তথ্য লোড করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [partyIdOrRecordId]);

  useEffect(() => {
    if (!loading && party) {
      loadHistory(historyStartDate, historyEndDate);
    }
  }, [historyStartDate, historyEndDate]);

  const handlePrintProfile = async () => {
    if (!party) return;
    await printElement('party-profile-printable', {
      title: `${party.name} (${party.partyCode}) — প্রোফাইল ও কার্যক্রমের ইতিহাস`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '10mm 12mm',
    });
  };

  const handleExportProfileExcel = () => {
    if (!party || !historyBundle) return;
    const mosqueName = currentMosque?.name || 'মসজিদ হিসাব';
    const periodLabel =
      historyStartDate || historyEndDate
        ? `${historyStartDate ? formatDate(historyStartDate, 'bn') : 'শুরু'} হতে ${
            historyEndDate ? formatDate(historyEndDate, 'bn') : 'অদ্যাবধি'
          }`
        : 'সকল সময়';

    exportToXlsx<PartyTimelineItem>({
      filename: `party-history-${party.partyCode}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'কার্যক্রমের ইতিহাস',
      mosqueName,
      reportTitle: `${party.name} (${party.partyCode}) — প্রোফাইল ও কার্যক্রমের ইতিহাস`,
      periodLabel,
      summaryRows: [
        { label: 'ব্যক্তি / প্রতিষ্ঠান', value: `${party.name} (${party.partyCode})` },
        { label: 'মোবাইল', value: party.phone },
        { label: 'মোট আয় (আয় ভাউচার)', value: historyBundle.summary.totalIncomeAmount },
        { label: 'ক্রয় ও সরবরাহ (ব্যয় ভাউচার)', value: historyBundle.summary.totalPurchaseSupplyAmount },
        { label: 'কাজ ও পারিশ্রমিক (ব্যয় ভাউচার)', value: historyBundle.summary.totalWorkWageAmount },
        { label: 'অন্যান্য ব্যয়', value: historyBundle.summary.totalOtherExpenseAmount },
        { label: 'সংযুক্ত চুক্তিপত্র', value: historyBundle.summary.agreementCount },
        { label: 'সংযুক্ত স্টাফ', value: historyBundle.summary.staffLinkCount },
      ],
      columns: [
        { header: 'তারিখ', accessor: (t) => t.date || '—' },
        { header: 'উৎস মডিউল', accessor: (t) => t.sourceModuleLabelBn },
        { header: 'রেফারেন্স নং', accessor: (t) => t.referenceNumber || '—' },
        { header: 'শিরোনাম / খাত', accessor: (t) => t.titleBn },
        { header: 'বিবরণ', accessor: (t) => t.descriptionBn || '—' },
        { header: 'পরিমাণ (৳)', accessor: (t) => (typeof t.amount === 'number' ? t.amount : '') },
        { header: 'অবস্থা / সম্পাদনাকারী', accessor: (t) => t.statusLabelBn || t.actorName || '—' },
      ],
      data: historyBundle.timeline,
    });
  };

  const handleToggleStatus = async () => {
    if (!party || !canEdit || party.mergedIntoPartyId) return;
    const nextStatus: PartyStatus =
      party.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setIsUpdatingStatus(true);
      setActionError('');
      const updated = await api.updatePartyStatus(party.id, nextStatus);
      setParty(updated);
      onStatusChanged(updated);
      await loadProfile();
    } catch (err: any) {
      setActionError(err?.message || 'অবস্থা পরিবর্তন করা যায়নি।');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!party || !canDelete) return;
    try {
      setIsDeleting(true);
      setActionError('');
      await api.deleteParty(party.id);
      setConfirmDeleteOpen(false);
      onDeleted();
    } catch (err: any) {
      setActionError(err?.message || 'প্রোফাইল মুছে ফেলা যায়নি।');
      setConfirmDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4 font-siliguri">
        <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-24 w-full bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-40 w-full bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (errorMsg || !party) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 font-siliguri">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          তালিকায় ফিরে যান
        </button>
        <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-800">
          {errorMsg || 'প্রোফাইল খুঁজে পাওয়া যায়নি।'}
        </div>
      </div>
    );
  }

  const fullAddressText = formatPartyAddressLine(party);
  const hasMergeProtection =
    Boolean(party.mergedIntoPartyId) ||
    Boolean(party.mergedFromPartyIds && party.mergedFromPartyIds.length > 0);

  return (
    <div className="space-y-5 font-siliguri">
      {/* Top Navigation & Action Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          তালিকায় ফিরে যান
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportProfileExcel}
            disabled={!historyBundle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel ইতিহাস
          </button>
          <button
            type="button"
            onClick={handlePrintProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            প্রোফাইল প্রিন্ট / PDF
          </button>

          {canEdit && !party.mergedIntoPartyId && (
            <>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                {party.status === 'ACTIVE' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    নিষ্ক্রিয় করুন
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    সক্রিয় করুন
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => onEdit(party)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                তথ্য সম্পাদনা করুন
              </button>
            </>
          )}

          {canDelete && !hasMergeProtection && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              মুছে ফেলুন
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800 no-print">
          {actionError}
        </div>
      )}

      <div id="party-profile-printable" className="space-y-5">
        {/* Print Header (visible on print/PDF) */}
        <div className="hidden print:block border-b border-slate-300 pb-3 mb-2">
          <div className="text-lg font-bold text-slate-950 font-mosque-name">
            {currentMosque?.name || 'মসজিদ হিসাব ও ব্যবস্থাপনা'}
          </div>
          {currentMosque?.address && (
            <div className="text-xs text-slate-600 font-tiro">{currentMosque.address}</div>
          )}
          <div className="text-xs font-bold text-emerald-900 mt-1">
            ব্যক্তি / প্রতিষ্ঠানের প্রোফাইল ও কার্যক্রমের ইতিহাস (Read-Only) · প্রস্তুত:{' '}
            {new Date().toLocaleString('bn-BD')}
          </div>
        </div>

      {/* Merged Lineage Notice (if viewing an archived merged old partyId) */}
      {party.mergedIntoPartyId && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <GitMerge className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-amber-950">
                এই রেকর্ডটি মূল প্রোফাইলের সাথে একীভূত (Merged) হয়েছে
              </div>
              <p className="text-xs text-amber-900 mt-0.5">
                পুরোনো পার্টি আইডি ({party.partyId}) ইতিহাস সংরক্ষণের জন্য অপরিবর্তনীয় রাখা হয়েছে। বর্তমান সক্রিয় প্রোফাইল:{' '}
                <span className="font-bold">
                  {resolvedPrimary
                    ? `${resolvedPrimary.name} (${resolvedPrimary.partyCode})`
                    : party.mergedIntoPartyId}
                </span>
              </p>
            </div>
          </div>
          {resolvedPrimary && (
            <button
              type="button"
              onClick={() => onOpenParty(resolvedPrimary.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold"
            >
              মূল প্রোফাইলে যান
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Profile Hero Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {party.photoOrLogoUrl && !imageError ? (
              <img
                src={party.photoOrLogoUrl}
                alt={party.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : party.partyType === 'ORGANIZATION' ? (
              <Building2 className="w-9 h-9 text-slate-400" />
            ) : (
              <UserIcon className="w-9 h-9 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-slate-950">
                {party.name}
              </h2>
              <span
                className={`text-xs font-bold ${
                  party.status === 'ACTIVE'
                    ? 'text-emerald-700'
                    : 'text-slate-500'
                }`}
              >
                {party.status === 'ACTIVE'
                  ? '● সক্রিয় প্রোফাইল'
                  : '○ নিষ্ক্রিয় প্রোফাইল'}
              </span>
            </div>

            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-slate-800 font-baloo tabular-nums">
                {party.partyCode}
              </span>
              <span>·</span>
              <span className="font-mono text-[11px] text-slate-500">
                স্থায়ী ID: {party.partyId}
              </span>
              <span>·</span>
              <span>{PARTY_PROFILE_TYPE_LABELS[party.partyType]}</span>
            </div>

            <div className="text-sm text-slate-800">
              <span className="text-xs font-semibold text-slate-500 mr-1.5">
                ভূমিকাসমূহ:
              </span>
              <span className="font-semibold text-emerald-800">
                {(party.roles || [])
                  .map((r) => getPartyRoleLabelBn(r, customRoles))
                  .join(' · ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact, Identity & Address Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            যোগাযোগ ও পরিচয় তথ্য
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                প্রাথমিক মোবাইল
              </dt>
              <dd className="font-semibold text-slate-900 font-baloo tabular-nums mt-0.5">
                {party.phone}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">বিকল্প মোবাইল</dt>
              <dd className="font-medium text-slate-800 font-baloo tabular-nums mt-0.5">
                {party.alternatePhone || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                ইমেইল
              </dt>
              <dd className="font-medium text-slate-800 mt-0.5 break-all">
                {party.email || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">NID নম্বর</dt>
              <dd className="font-medium text-slate-800 font-baloo tabular-nums mt-0.5">
                {party.nidNumber || '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">পেশা / মূল দক্ষতা</dt>
              <dd className="font-medium text-slate-800 mt-0.5">
                {party.occupationOrSkill || '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-500" />
            ঠিকানা ও অবস্থান
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">পূর্ণ ঠিকানা</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {fullAddressText || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">গ্রাম / মহল্লা</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.villageOrMahalla || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ইউনিয়ন / ওয়ার্ড</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.unionOrWard || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">উপজেলা</dt>
              <dd className="text-slate-800 mt-0.5">{party.upazila || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">জেলা ও বিভাগ</dt>
              <dd className="text-slate-800 mt-0.5">
                {[party.district, party.division].filter(Boolean).join(', ') ||
                  '—'}
                {party.postCode ? ` (${party.postCode})` : ''}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Organization Extra Details */}
      {party.partyType === 'ORGANIZATION' && party.organizationDetails && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-500" />
            প্রতিষ্ঠান ও ব্যবসায়িক তথ্য
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">ট্রেড লাইসেন্স / রেজিঃ</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {party.organizationDetails.registrationOrTradeLicenseNo || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">TIN / BIN</dt>
              <dd className="font-medium text-slate-900 font-baloo mt-0.5">
                {party.organizationDetails.tinOrBin || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">দায়িত্বপ্রাপ্ত প্রতিনিধি</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {party.organizationDetails.contactPersonName || '—'}
                {party.organizationDetails.contactPersonDesignation
                  ? ` (${party.organizationDetails.contactPersonDesignation})`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">প্রতিনিধির মোবাইল</dt>
              <dd className="font-medium text-slate-900 font-baloo mt-0.5">
                {party.organizationDetails.contactPersonPhone || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ব্যবসার ধরন</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.organizationDetails.businessCategory || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">প্রতিষ্ঠাকাল</dt>
              <dd className="text-slate-800 font-baloo mt-0.5">
                {party.organizationDetails.establishedYear || '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">ওয়েবসাইট</dt>
              <dd className="text-slate-800 mt-0.5 break-all">
                {party.organizationDetails.website || '—'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Artisan Descriptive Details */}
      {party.artisanDetails && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-slate-500" />
              কারিগর ও শ্রমিকের কারিগরি তথ্য (বর্ণনামূলক)
            </h3>
            <span className="text-[11px] text-slate-500">
              শুধুমাত্র তথ্য সংরক্ষণ · কোনো আর্থিক লেনদেন নয়
            </span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">মূল কাজের ক্ষেত্র</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {party.artisanDetails.primaryTrade || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">অভিজ্ঞতা</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.artisanDetails.experienceYears || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">সহকারী / টিম</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.artisanDetails.teamSizeOrHelpers || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">মজুরির প্রচলিত একক</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.artisanDetails.wageUnitLabel || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">বর্ণনামূলক মজুরি/রেট</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.artisanDetails.descriptiveWageRateText || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">প্রাপ্যতার নোট</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.artisanDetails.availabilityNote || '—'}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-slate-500">নিজস্ব সরঞ্জাম / যন্ত্রপাতি</dt>
              <dd className="text-slate-800 mt-0.5">
                {party.artisanDetails.toolsAvailable || '—'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Description & Notes */}
      {(party.description || party.notes) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-1.5">
              সংক্ষিপ্ত বিবরণ
            </h4>
            <p className="text-sm text-slate-800 font-tiro whitespace-pre-wrap">
              {party.description || '—'}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-500 mb-1.5">
              অভ্যন্তরীণ মন্তব্য / নোট
            </h4>
            <p className="text-sm text-slate-800 font-tiro whitespace-pre-wrap">
              {party.notes || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Part 3: Unified Read-Only Activity History (Purchase/Supply, Work/Wages, Agreements & Timeline) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-700" />
              সমন্বিত কার্যক্রমের ইতিহাস (ক্রয়, সরবরাহ, কাজ ও চুক্তিপত্র)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              সংরক্ষিত আয় ভাউচার, ব্যয় ভাউচার ও চুক্তিপত্র থেকে শুধুমাত্র পাঠযোগ্য সারসংক্ষেপ — কোনো নতুন আর্থিক এন্ট্রি তৈরি হয় না
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <input
              type="date"
              value={historyStartDate}
              onChange={(e) => setHistoryStartDate(e.target.value)}
              aria-label="শুরু তারিখ"
              className="px-2.5 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
            />
            <span className="text-xs text-slate-400">—</span>
            <input
              type="date"
              value={historyEndDate}
              onChange={(e) => setHistoryEndDate(e.target.value)}
              aria-label="শেষ তারিখ"
              className="px-2.5 py-1.5 text-xs font-baloo border border-slate-300 rounded-lg"
            />
            {(historyStartDate || historyEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setHistoryStartDate('');
                  setHistoryEndDate('');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="w-3 h-3" />
                রিসেট
              </button>
            )}
          </div>
        </div>

        {/* Read-Only Summary KPI Strip */}
        {historyBundle && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50">
              <div className="text-[11px] text-slate-500">মোট আয় (আয় ভাউচার)</div>
              <div className="text-lg font-bold text-emerald-800 font-baloo tabular-nums mt-0.5">
                ৳ {toBanglaNumber(historyBundle.summary.totalIncomeAmount.toLocaleString('en-IN'))}
              </div>
              <div className="text-[10px] text-slate-500">
                {toBanglaNumber(historyBundle.summary.incomeCount)}টি আয় ভাউচার
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50">
              <div className="text-[11px] text-slate-500">ক্রয় ও সরবরাহ (ব্যয় ভাউচার)</div>
              <div className="text-lg font-bold text-slate-900 font-baloo tabular-nums mt-0.5">
                ৳ {toBanglaNumber(historyBundle.summary.totalPurchaseSupplyAmount.toLocaleString('en-IN'))}
              </div>
              <div className="text-[10px] text-slate-500">
                {toBanglaNumber(historyBundle.summary.purchaseSupplyCount)}টি ক্রয়/সরবরাহ ভাউচার
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50">
              <div className="text-[11px] text-slate-500">কাজ ও পারিশ্রমিক (ব্যয় ভাউচার)</div>
              <div className="text-lg font-bold text-slate-900 font-baloo tabular-nums mt-0.5">
                ৳ {toBanglaNumber(historyBundle.summary.totalWorkWageAmount.toLocaleString('en-IN'))}
              </div>
              <div className="text-[10px] text-slate-500">
                {toBanglaNumber(historyBundle.summary.workWageCount)}টি কাজ/পারিশ্রমিক ভাউচার
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50">
              <div className="text-[11px] text-slate-500">চুক্তিপত্র ও মোট কার্যক্রম</div>
              <div className="text-lg font-bold text-slate-900 font-baloo tabular-nums mt-0.5">
                {toBanglaNumber(historyBundle.summary.agreementCount)} /{' '}
                {toBanglaNumber(historyBundle.summary.timelineCount)}
              </div>
              <div className="text-[10px] text-slate-500">
                চুক্তিপত্র ও টাইমলাইন ইভেন্ট
              </div>
            </div>
          </div>
        )}

        {/* History Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2.5 no-print">
          {(
            [
              {
                id: 'TIMELINE',
                label: `সম্মিলিত টাইমলাইন (${toBanglaNumber(historyBundle?.timeline.length || 0)})`,
              },
              {
                id: 'PURCHASE_SUPPLY',
                label: `ক্রয় ও সরবরাহ (${toBanglaNumber(historyBundle?.purchaseSupplyItems.length || 0)})`,
              },
              {
                id: 'WORK_WAGE',
                label: `কাজ ও পারিশ্রমিক (${toBanglaNumber(historyBundle?.workWageItems.length || 0)})`,
              },
              {
                id: 'VOUCHERS',
                label: `সকল ভাউচার (${toBanglaNumber(
                  historyBundle ? historyBundle.allVouchers.length : voucherReferences.length
                )})`,
              },
              {
                id: 'AGREEMENTS',
                label: `চুক্তিপত্র (${toBanglaNumber(
                  historyBundle ? historyBundle.agreements.length : agreementReferences.length
                )})`,
              },
              {
                id: 'AUDIT_STAFF',
                label: `স্টাফ ও অডিট (${toBanglaNumber(linkedStaff.length + auditLogs.length)})`,
              },
            ] as Array<{ id: PartyHistoryTab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setHistoryTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                historyTab === t.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {historyLoading ? (
          <div className="py-6 space-y-2">
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : historyTab === 'TIMELINE' ? (
          !historyBundle || historyBundle.timeline.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              নির্বাচিত সময়সীমায় এই প্রোফাইলের কোনো কার্যক্রম পাওয়া যায়নি।
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyBundle.timeline.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                      <span className="text-emerald-800">{item.sourceModuleLabelBn}</span>
                      {item.referenceNumber && (
                        <>
                          <span>·</span>
                          <span className="font-baloo text-slate-700">{item.referenceNumber}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{item.titleBn}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <span>{item.date ? formatDate(item.date, 'bn') : '—'}</span>
                      {item.descriptionBn && <> · {item.descriptionBn}</>}
                      {item.actorName && <> · সম্পাদনাকারী: {item.actorName}</>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {typeof item.amount === 'number' && (
                      <div className="font-baloo font-bold text-sm text-slate-900 tabular-nums">
                        ৳ {toBanglaNumber(item.amount.toLocaleString('en-IN'))}
                      </div>
                    )}
                    {item.statusLabelBn && (
                      <div className="text-[11px] text-slate-500">{item.statusLabelBn}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : historyTab === 'PURCHASE_SUPPLY' || historyTab === 'WORK_WAGE' || historyTab === 'VOUCHERS' ? (
          (() => {
            const rows: PartyCategorizedVoucher[] =
              historyTab === 'PURCHASE_SUPPLY'
                ? historyBundle?.purchaseSupplyItems || []
                : historyTab === 'WORK_WAGE'
                ? historyBundle?.workWageItems || []
                : historyBundle?.allVouchers || [];
            if (rows.length === 0) {
              return (
                <p className="text-xs text-slate-500 py-4">
                  এই বিভাগে এখনও কোনো ভাউচার সংযুক্ত হয়নি।
                </p>
              );
            }
            return (
              <div className="divide-y divide-slate-100">
                {rows.map((vr) => (
                  <div
                    key={`${vr.voucherType}-${vr.voucherId}`}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span className="font-baloo text-emerald-800">{vr.voucherNumber}</span>
                        <span>·</span>
                        <span>{vr.sourceLabelBn}</span>
                        <span>·</span>
                        <span>
                          {vr.headNameBn}
                          {vr.subHeadNameBn ? ` (${vr.subHeadNameBn})` : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        সংরক্ষিত নাম: <span className="font-medium text-slate-800">{vr.snapshotName}</span>
                        {vr.snapshotPhone && (
                          <>
                            {' · '}
                            <span className="font-baloo">{vr.snapshotPhone}</span>
                          </>
                        )}
                        {' · '}
                        <span>{formatDate(vr.date, 'bn')}</span>
                        {vr.description && <> · {vr.description}</>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-baloo font-bold text-sm text-slate-900 tabular-nums">
                        ৳ {toBanglaNumber(vr.amount.toLocaleString('en-IN'))}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {vr.status === 'CANCELLED' ? 'বাতিলকৃত' : vr.status === 'REJECTED' ? 'প্রত্যাখ্যাত' : 'অনুমোদিত'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : historyTab === 'AGREEMENTS' ? (
          (historyBundle?.agreements || agreementReferences).length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              কোনো চুক্তিপত্রে এই প্রোফাইল পক্ষ বা প্রতিনিধি হিসেবে যুক্ত নেই।
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(historyBundle?.agreements || agreementReferences).map((ar, idx) => (
                <div key={`${ar.agreementId}-${idx}`} className="py-2.5 text-xs space-y-0.5">
                  <div className="font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="font-baloo text-emerald-800">{ar.agreementNumber}</span>
                    <span>·</span>
                    <span>{ar.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {ar.roleLabel} · দলিলের নাম: {ar.snapshotName} · {ar.categoryNameBn} ·{' '}
                    {formatDate(ar.agreementDate, 'bn')} · অবস্থা: {ar.status}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                সংযুক্ত নিয়মিত স্টাফ প্রোফাইল ({toBanglaNumber(linkedStaff.length)}জন)
              </h4>
              {linkedStaff.length === 0 ? (
                <p className="text-xs text-slate-500">
                  এই পার্টি প্রোফাইল কোনো নিয়মিত মসজিদ স্টাফ রেকর্ডের সাথে সংযুক্ত নয়।
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {linkedStaff.map((st) => (
                    <div key={st.staffId} className="py-2 text-xs space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {st.name} {st.staffCode ? `(${st.staffCode})` : ''} · {st.designationBn}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        <span className="font-baloo">{st.phone}</span> · অবস্থা: {st.status} · বেতন ও পেরোল নিয়মিত স্টাফ মডিউল থেকে পরিচালিত
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canViewAudit && (
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    প্রোফাইল অডিট লগ ({toBanglaNumber(auditLogs.length)}টি কার্যক্রম)
                  </h4>
                  <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    তৈরি: {party.createdByName} · {formatDate(party.createdAt, 'bn')}
                  </span>
                </div>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    এখনও কোনো পরিবর্তন লগ সংরক্ষিত হয়নি।
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="py-2.5 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="font-semibold text-slate-900">
                            <span className="text-emerald-800 mr-1.5">
                              [{AUDIT_ACTION_LABELS[log.action] || log.action}]
                            </span>
                            {log.summaryBn}
                          </div>
                          <div className="text-slate-500 flex items-center gap-1.5 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(log.timestamp, 'bn')}</span>
                            <span>·</span>
                            <span>{log.actorName}</span>
                          </div>
                        </div>
                        {log.changedFields && log.changedFields.length > 0 && (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                            {log.changedFields.map((cf, idx) => (
                              <div key={`${cf.field}-${idx}`} className="text-slate-700">
                                <span className="font-semibold">{cf.labelBn}:</span>{' '}
                                <span className="line-through text-slate-400">
                                  {cf.oldValue || '—'}
                                </span>{' '}
                                →{' '}
                                <span className="font-medium text-slate-900">
                                  {cf.newValue || '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Merge Lineage & History */}
      {((party.mergedFromPartyIds && party.mergedFromPartyIds.length > 0) ||
        mergeHistory.length > 0) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <GitMerge className="w-4 h-4 text-slate-500" />
            একীভূতকরণ (Merge) ইতিহাস ও সংরক্ষিত পার্টি আইডি
          </h3>
          {party.mergedFromPartyIds && party.mergedFromPartyIds.length > 0 && (
            <div className="text-xs text-slate-700">
              একীভূত পুরোনো partyId সমূহ:{' '}
              <span className="font-mono text-slate-900 font-semibold">
                {party.mergedFromPartyIds.join(', ')}
              </span>
            </div>
          )}
          <div className="space-y-2">
            {mergeHistory.map((m) => (
              <div
                key={m.id}
                className="border border-slate-200 rounded-lg px-3.5 py-2.5 bg-slate-50/60 text-xs space-y-1"
              >
                <div className="font-semibold text-slate-900">
                  {m.resolutionSummaryBn}
                </div>
                <div className="text-slate-600 flex flex-wrap items-center gap-x-2">
                  <span>সম্পাদনাকারী: {m.mergedByName}</span>
                  <span>·</span>
                  <span>{formatDate(m.mergedAt, 'bn')}</span>
                  {m.note && (
                    <>
                      <span>·</span>
                      <span>নোট: {m.note}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal (No window.confirm) */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              প্রোফাইল মুছে ফেলার নিশ্চিতকরণ
            </h3>
            <p className="text-sm text-slate-600">
              আপনি কি নিশ্চিতভাবে{' '}
              <span className="font-bold text-slate-900">{party.name}</span> (
              {party.partyCode}) প্রোফাইলটি তালিকা থেকে মুছে ফেলতে চান? পরবর্তীতে প্রয়োজন হলে মুছে না ফেলে নিষ্ক্রিয় (Inactive) রাখা নিরাপদ।
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-60"
              >
                {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

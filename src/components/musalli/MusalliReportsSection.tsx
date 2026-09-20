import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  Search,
  Users,
  Coins,
  DollarSign,
  HeartHandshake,
  Briefcase,
  FolderOpen,
  CalendarCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin,
  Home,
  RefreshCw,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  FileCheck2,
  Percent,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  DonationCollection,
  DonationPlan,
  PersonMaster,
  FamilyMaster,
  AreaMaster,
  CollectionWorker,
  Donation,
  Mosque,
  User,
  CollectionStatus,
} from '../../types';
import { Language, formatCurrency, formatDate } from '../../lib/i18n';
import { printElement } from '../../lib/printUtils';
import { MosqueOfficialLetterhead } from '../common/MosqueOfficialLetterhead';
import { toBanglaNumber } from '../CommitteeView';

export type MusalliReportType =
  | 'COLLECTION_REGISTER'
  | 'AREA_WISE'
  | 'FAMILY_WISE'
  | 'PERSON_WISE'
  | 'WORKER_WISE'
  | 'PLAN_VS_COLLECTION'
  | 'RECONCILIATION';

export type DatePreset =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'LAST_YEAR'
  | 'CUSTOM';

interface MusalliReportsSectionProps {
  collections: DonationCollection[];
  plans: DonationPlan[];
  persons: PersonMaster[];
  families: FamilyMaster[];
  areas: AreaMaster[];
  workers: CollectionWorker[];
  donations: Donation[];
  currentMosque?: Mosque | null;
  currentUser?: User | null;
  language: Language;
  onRefresh?: () => void;
  loading?: boolean;
}

export const MusalliReportsSection: React.FC<MusalliReportsSectionProps> = ({
  collections = [],
  plans = [],
  persons = [],
  families = [],
  areas = [],
  workers = [],
  donations = [],
  currentMosque,
  currentUser,
  language = 'bn',
  onRefresh,
  loading = false,
}) => {
  const isBn = language === 'bn';
  const langKey = isBn ? 'bn' : 'en';

  // Active Report Tab
  const [activeReport, setActiveReport] = useState<MusalliReportType>('COLLECTION_REGISTER');

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('ALL');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('ALL');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('ALL');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedReconcileStatus, setSelectedReconcileStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Print & Export Settings
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

  // Lookup maps for fast access
  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const familyMap = useMemo(() => new Map(families.map((f) => [f.id, f])), [families]);
  const personMap = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);
  const workerMap = useMemo(() => new Map(workers.map((w) => [w.id, w])), [workers]);
  const planMap = useMemo(() => new Map(plans.map((pl) => [pl.id, pl])), [plans]);

  // Unique collection periods for filter
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    collections.forEach((c) => {
      if (c.collectionPeriod) set.add(c.collectionPeriod);
    });
    return Array.from(set).sort().reverse();
  }, [collections]);

  // Handle Date Preset Switch
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (preset === 'LAST_WEEK') {
      const prevMonday = new Date();
      prevMonday.setDate(now.getDate() - 7 - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      const prevSunday = new Date(prevMonday);
      prevSunday.setDate(prevMonday.getDate() + 6);
      setStartDate(prevMonday.toISOString().split('T')[0]);
      setEndDate(prevSunday.toISOString().split('T')[0]);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'LAST_YEAR') {
      setStartDate(new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]);
      setEndDate(new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]);
    } else if (preset === 'ALL') {
      setStartDate('2020-01-01');
      setEndDate('2035-12-31');
    }
  };

  // -------------------------------------------------------------
  // Filter Collections based on all criteria
  // -------------------------------------------------------------
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      // Area Filter
      if (selectedAreaId !== 'ALL' && c.areaId !== selectedAreaId) return false;
      // Family Filter
      if (selectedFamilyId !== 'ALL' && c.familyId !== selectedFamilyId) return false;
      // Person Filter
      if (selectedPersonId !== 'ALL' && c.personId !== selectedPersonId) return false;
      // Worker Filter
      if (selectedWorkerId !== 'ALL' && c.collectionWorkerId !== selectedWorkerId) return false;
      // Plan Filter
      if (selectedPlanId !== 'ALL' && c.donationPlanId !== selectedPlanId) return false;
      // Status Filter
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
      // Period Filter
      if (selectedPeriod !== 'ALL' && c.collectionPeriod !== selectedPeriod) return false;

      // Date Range Filter (scheduledDate or createdAt or lastCollectionDate)
      if (datePreset !== 'ALL') {
        const itemDate = c.scheduledDate || c.lastCollectionDate || (c.createdAt ? c.createdAt.split('T')[0] : '');
        if (itemDate) {
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
        }
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const p = personMap.get(c.personId);
        const f = c.familyId ? familyMap.get(c.familyId) : null;
        const a = c.areaId ? areaMap.get(c.areaId) : null;
        const w = c.collectionWorkerId ? workerMap.get(c.collectionWorkerId) : null;

        const matchCode = (c.collectionCode || '').toLowerCase().includes(q);
        const matchId = c.id.toLowerCase().includes(q);
        const matchPerson = (p?.fullName || c.personNameBn || '').toLowerCase().includes(q);
        const matchPersonCode = (p?.personCode || c.personCode || '').toLowerCase().includes(q);
        const matchFamily = (f?.name || c.familyNameBn || '').toLowerCase().includes(q);
        const matchArea = (a?.name || c.areaNameBn || '').toLowerCase().includes(q);
        const matchWorker = (w?.name || c.collectionWorkerNameBn || '').toLowerCase().includes(q);
        const matchPlan = (c.planCode || '').toLowerCase().includes(q);
        const matchMobile = (p?.mobile || '').includes(q);

        if (
          !matchCode &&
          !matchId &&
          !matchPerson &&
          !matchPersonCode &&
          !matchFamily &&
          !matchArea &&
          !matchWorker &&
          !matchPlan &&
          !matchMobile
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    collections,
    selectedAreaId,
    selectedFamilyId,
    selectedPersonId,
    selectedWorkerId,
    selectedPlanId,
    selectedStatus,
    selectedPeriod,
    datePreset,
    startDate,
    endDate,
    searchQuery,
    personMap,
    familyMap,
    areaMap,
    workerMap,
  ]);

  // -------------------------------------------------------------
  // Data for 1. COLLECTION REGISTER
  // -------------------------------------------------------------
  const collectionRegisterData = useMemo(() => {
    return filteredCollections.map((c) => {
      const p = personMap.get(c.personId);
      const f = c.familyId ? familyMap.get(c.familyId) : null;
      const a = c.areaId ? areaMap.get(c.areaId) : null;
      const w = c.collectionWorkerId ? workerMap.get(c.collectionWorkerId) : null;
      const planned = Number(c.plannedAmount) || 0;
      const collected = Number(c.collectedAmount) || 0;
      const remaining = Math.max(0, planned - collected);

      return {
        id: c.id,
        collectionCode: c.collectionCode || c.id.slice(0, 8),
        scheduledDate: c.scheduledDate || '-',
        lastCollectionDate: c.lastCollectionDate || '-',
        personName: p?.fullName || c.personNameBn || '-',
        personCode: p?.personCode || c.personCode || '-',
        familyName: f?.name || c.familyNameBn || '-',
        areaName: a?.name || c.areaNameBn || '-',
        planCode: c.planCode || '-',
        period: c.collectionPeriod || '-',
        workerName: w?.name || c.collectionWorkerNameBn || '-',
        plannedAmount: planned,
        collectedAmount: collected,
        remainingAmount: remaining,
        status: c.status,
      };
    });
  }, [filteredCollections, personMap, familyMap, areaMap, workerMap]);

  // -------------------------------------------------------------
  // Data for 2. AREA-WISE REPORT
  // -------------------------------------------------------------
  const areaWiseData = useMemo(() => {
    const grouped: Record<
      string,
      {
        areaId: string;
        areaName: string;
        areaCode: string;
        totalCollections: number;
        plannedAmount: number;
        collectedAmount: number;
        remainingAmount: number;
        collectedCount: number;
        partialCount: number;
        pendingCount: number;
        notCollectedCount: number;
      }
    > = {};

    areas.forEach((area) => {
      grouped[area.id] = {
        areaId: area.id,
        areaName: area.name,
        areaCode: area.areaCode || '-',
        totalCollections: 0,
        plannedAmount: 0,
        collectedAmount: 0,
        remainingAmount: 0,
        collectedCount: 0,
        partialCount: 0,
        pendingCount: 0,
        notCollectedCount: 0,
      };
    });

    filteredCollections.forEach((c) => {
      const areaId = c.areaId || 'UNKNOWN';
      if (!grouped[areaId]) {
        const areaObj = areaMap.get(areaId);
        grouped[areaId] = {
          areaId,
          areaName: areaObj?.name || c.areaNameBn || (isBn ? 'অনির্ধারিত এলাকা' : 'Unassigned Area'),
          areaCode: areaObj?.areaCode || '-',
          totalCollections: 0,
          plannedAmount: 0,
          collectedAmount: 0,
          remainingAmount: 0,
          collectedCount: 0,
          partialCount: 0,
          pendingCount: 0,
          notCollectedCount: 0,
        };
      }

      const p = Number(c.plannedAmount) || 0;
      const col = Number(c.collectedAmount) || 0;
      grouped[areaId].totalCollections += 1;
      grouped[areaId].plannedAmount += p;
      grouped[areaId].collectedAmount += col;
      grouped[areaId].remainingAmount += Math.max(0, p - col);

      if (c.status === 'COLLECTED') grouped[areaId].collectedCount += 1;
      else if (c.status === 'PARTIALLY_COLLECTED') grouped[areaId].partialCount += 1;
      else if (c.status === 'PENDING') grouped[areaId].pendingCount += 1;
      else if (c.status === 'NOT_COLLECTED') grouped[areaId].notCollectedCount += 1;
    });

    return Object.values(grouped).filter((item) => item.totalCollections > 0 || selectedAreaId === 'ALL');
  }, [areas, filteredCollections, areaMap, isBn, selectedAreaId]);

  // -------------------------------------------------------------
  // Data for 3. FAMILY-WISE REPORT
  // -------------------------------------------------------------
  const familyWiseData = useMemo(() => {
    const grouped: Record<
      string,
      {
        familyId: string;
        familyName: string;
        familyCode: string;
        areaName: string;
        personCount: number;
        collectionCount: number;
        plannedAmount: number;
        collectedAmount: number;
        remainingAmount: number;
        collectedCount: number;
        partialCount: number;
        pendingCount: number;
      }
    > = {};

    families.forEach((fam) => {
      const famArea = areaMap.get(fam.areaId);
      const famPersons = persons.filter((p) => p.familyId === fam.id);
      grouped[fam.id] = {
        familyId: fam.id,
        familyName: fam.name,
        familyCode: fam.familyCode || '-',
        areaName: famArea?.name || '-',
        personCount: famPersons.length,
        collectionCount: 0,
        plannedAmount: 0,
        collectedAmount: 0,
        remainingAmount: 0,
        collectedCount: 0,
        partialCount: 0,
        pendingCount: 0,
      };
    });

    filteredCollections.forEach((c) => {
      if (!c.familyId) return;
      const famId = c.familyId;
      if (!grouped[famId]) {
        const famObj = familyMap.get(famId);
        const famArea = famObj?.areaId ? areaMap.get(famObj.areaId) : null;
        grouped[famId] = {
          familyId: famId,
          familyName: famObj?.name || c.familyNameBn || '-',
          familyCode: famObj?.familyCode || '-',
          areaName: famArea?.name || c.areaNameBn || '-',
          personCount: 0,
          collectionCount: 0,
          plannedAmount: 0,
          collectedAmount: 0,
          remainingAmount: 0,
          collectedCount: 0,
          partialCount: 0,
          pendingCount: 0,
        };
      }

      const p = Number(c.plannedAmount) || 0;
      const col = Number(c.collectedAmount) || 0;
      grouped[famId].collectionCount += 1;
      grouped[famId].plannedAmount += p;
      grouped[famId].collectedAmount += col;
      grouped[famId].remainingAmount += Math.max(0, p - col);

      if (c.status === 'COLLECTED') grouped[famId].collectedCount += 1;
      else if (c.status === 'PARTIALLY_COLLECTED') grouped[famId].partialCount += 1;
      else if (c.status === 'PENDING') grouped[famId].pendingCount += 1;
    });

    return Object.values(grouped).filter((f) => f.collectionCount > 0 || selectedFamilyId !== 'ALL');
  }, [families, filteredCollections, familyMap, areaMap, persons, selectedFamilyId]);

  // -------------------------------------------------------------
  // Data for 4. PERSON-WISE REPORT
  // -------------------------------------------------------------
  const personWiseData = useMemo(() => {
    return filteredCollections.map((c) => {
      const p = personMap.get(c.personId);
      const f = c.familyId ? familyMap.get(c.familyId) : null;
      const a = c.areaId ? areaMap.get(c.areaId) : null;
      const pl = planMap.get(c.donationPlanId);
      const planned = Number(c.plannedAmount) || 0;
      const collected = Number(c.collectedAmount) || 0;
      const remaining = Math.max(0, planned - collected);

      return {
        id: c.id,
        personId: c.personId,
        personCode: p?.personCode || c.personCode || '-',
        personName: p?.fullName || c.personNameBn || '-',
        mobile: p?.mobile || '-',
        familyName: f?.name || c.familyNameBn || '-',
        areaName: a?.name || c.areaNameBn || '-',
        planCode: c.planCode || pl?.planCode || '-',
        planType: pl?.planType || '-',
        period: c.collectionPeriod || '-',
        plannedAmount: planned,
        collectedAmount: collected,
        remainingAmount: remaining,
        status: c.status,
      };
    });
  }, [filteredCollections, personMap, familyMap, areaMap, planMap]);

  // -------------------------------------------------------------
  // Data for 5. WORKER-WISE REPORT
  // -------------------------------------------------------------
  const workerWiseData = useMemo(() => {
    const grouped: Record<
      string,
      {
        workerId: string;
        workerName: string;
        workerMobile: string;
        assignedCount: number;
        plannedAmount: number;
        collectedAmount: number;
        remainingAmount: number;
        collectedCount: number;
        partialCount: number;
        pendingCount: number;
        notCollectedCount: number;
      }
    > = {};

    workers.forEach((w) => {
      grouped[w.id] = {
        workerId: w.id,
        workerName: w.name,
        workerMobile: w.mobile || '-',
        assignedCount: 0,
        plannedAmount: 0,
        collectedAmount: 0,
        remainingAmount: 0,
        collectedCount: 0,
        partialCount: 0,
        pendingCount: 0,
        notCollectedCount: 0,
      };
    });

    filteredCollections.forEach((c) => {
      const wId = c.collectionWorkerId || 'UNASSIGNED';
      if (!grouped[wId]) {
        const wObj = workerMap.get(wId);
        grouped[wId] = {
          workerId: wId,
          workerName: wObj?.name || c.collectionWorkerNameBn || (isBn ? 'অনির্ধারিত সংগ্রহকারী' : 'Unassigned Worker'),
          workerMobile: wObj?.mobile || '-',
          assignedCount: 0,
          plannedAmount: 0,
          collectedAmount: 0,
          remainingAmount: 0,
          collectedCount: 0,
          partialCount: 0,
          pendingCount: 0,
          notCollectedCount: 0,
        };
      }

      const p = Number(c.plannedAmount) || 0;
      const col = Number(c.collectedAmount) || 0;
      grouped[wId].assignedCount += 1;
      grouped[wId].plannedAmount += p;
      grouped[wId].collectedAmount += col;
      grouped[wId].remainingAmount += Math.max(0, p - col);

      if (c.status === 'COLLECTED') grouped[wId].collectedCount += 1;
      else if (c.status === 'PARTIALLY_COLLECTED') grouped[wId].partialCount += 1;
      else if (c.status === 'PENDING') grouped[wId].pendingCount += 1;
      else if (c.status === 'NOT_COLLECTED') grouped[wId].notCollectedCount += 1;
    });

    return Object.values(grouped).filter((w) => w.assignedCount > 0 || selectedWorkerId === 'ALL');
  }, [workers, filteredCollections, workerMap, isBn, selectedWorkerId]);

  // -------------------------------------------------------------
  // Data for 6. PLAN VS COLLECTION
  // -------------------------------------------------------------
  const planVsCollectionData = useMemo(() => {
    return plans.map((pl) => {
      const p = personMap.get(pl.personId);
      const f = p?.familyId ? familyMap.get(p.familyId) : null;
      const a = p?.areaId ? areaMap.get(p.areaId) : null;

      // Linked collections for this plan
      const planCollections = collections.filter((c) => c.donationPlanId === pl.id);
      const totalCollectionsPlanned = planCollections.reduce((sum, c) => sum + (Number(c.plannedAmount) || 0), 0);
      const totalCollectionsCollected = planCollections.reduce((sum, c) => sum + (Number(c.collectedAmount) || 0), 0);

      // Linked valid B5 actual donations for this plan
      const planDonations = donations.filter((d) => d.donationPlanId === pl.id && d.status === 'COMPLETED');
      const totalActualDonations = planDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

      const basePlannedAmount = Number(pl.plannedAmount) || Number(pl.amount) || 0;
      const displayPlanned = totalCollectionsPlanned > 0 ? totalCollectionsPlanned : basePlannedAmount;
      const remaining = Math.max(0, displayPlanned - totalActualDonations);

      return {
        id: pl.id,
        planCode: pl.planCode || pl.id.slice(0, 8),
        personName: p?.fullName || '-',
        personCode: p?.personCode || '-',
        familyName: f?.name || '-',
        areaName: a?.name || '-',
        planType: pl.planType,
        plannedAmount: displayPlanned,
        totalCollectionsCount: planCollections.length,
        collectionsAmount: totalCollectionsCollected,
        actualDonationsCount: planDonations.length,
        actualDonationsTotal: totalActualDonations,
        remainingAmount: remaining,
        status: pl.status,
      };
    });
  }, [plans, collections, donations, personMap, familyMap, areaMap]);

  // -------------------------------------------------------------
  // Data for 7. B6 COLLECTION VS B5 ACTUAL DONATION RECONCILIATION
  // -------------------------------------------------------------
  const reconciliationData = useMemo(() => {
    return filteredCollections
      .map((c) => {
        const p = personMap.get(c.personId);
        const f = c.familyId ? familyMap.get(c.familyId) : null;
        const a = c.areaId ? areaMap.get(c.areaId) : null;
        const w = c.collectionWorkerId ? workerMap.get(c.collectionWorkerId) : null;

        // Linked B5 actual donations for this collection
        const linkedDonations = donations.filter(
          (d) => d.collectionId === c.id || (d.donationPlanId === c.donationPlanId && d.personId === c.personId)
        );

        const validDonations = linkedDonations.filter((d) => d.status === 'COMPLETED');
        const cancelledDonations = linkedDonations.filter((d) => d.status === 'CANCELLED');

        const b5ValidTotal = validDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
        const b6Collected = Number(c.collectedAmount) || 0;
        const b6Planned = Number(c.plannedAmount) || 0;

        const difference = b6Collected - b5ValidTotal;

        let reconcileStatus: 'MATCHED' | 'MISMATCH' | 'NO_DONATION' = 'NO_DONATION';
        if (difference !== 0) {
          reconcileStatus = 'MISMATCH';
        } else if (b5ValidTotal > 0 || b6Collected > 0) {
          reconcileStatus = 'MATCHED';
        } else {
          reconcileStatus = 'NO_DONATION';
        }

        return {
          collectionId: c.id,
          collectionCode: c.collectionCode || c.id.slice(0, 8),
          planId: c.donationPlanId,
          planCode: c.planCode || '-',
          personName: p?.fullName || c.personNameBn || '-',
          personCode: p?.personCode || c.personCode || '-',
          familyName: f?.name || c.familyNameBn || '-',
          areaName: a?.name || c.areaNameBn || '-',
          workerName: w?.name || c.collectionWorkerNameBn || '-',
          period: c.collectionPeriod || '-',
          scheduledDate: c.scheduledDate || '-',
          b6PlannedAmount: b6Planned,
          b6CollectedAmount: b6Collected,
          b5ValidCount: validDonations.length,
          b5ValidTotal: b5ValidTotal,
          cancelledCount: cancelledDonations.length,
          difference: difference,
          reconcileStatus: reconcileStatus,
          collectionStatus: c.status,
        };
      })
      .filter((item) => {
        if (selectedReconcileStatus === 'ALL') return true;
        return item.reconcileStatus === selectedReconcileStatus;
      });
  }, [
    filteredCollections,
    donations,
    personMap,
    familyMap,
    areaMap,
    workerMap,
    selectedReconcileStatus,
  ]);

  // -------------------------------------------------------------
  // Summary Calculations for Active Report
  // -------------------------------------------------------------
  const summary = useMemo(() => {
    if (activeReport === 'RECONCILIATION') {
      const totalCollections = reconciliationData.length;
      const totalPlanned = reconciliationData.reduce((s, r) => s + r.b6PlannedAmount, 0);
      const totalB6Collected = reconciliationData.reduce((s, r) => s + r.b6CollectedAmount, 0);
      const totalB5Valid = reconciliationData.reduce((s, r) => s + r.b5ValidTotal, 0);
      const totalCancelled = reconciliationData.reduce((s, r) => s + r.cancelledCount, 0);
      const matchedCount = reconciliationData.filter((r) => r.reconcileStatus === 'MATCHED').length;
      const mismatchCount = reconciliationData.filter((r) => r.reconcileStatus === 'MISMATCH').length;
      const noDonationCount = reconciliationData.filter((r) => r.reconcileStatus === 'NO_DONATION').length;
      const totalDifference = reconciliationData.reduce((s, r) => s + Math.abs(r.difference), 0);

      return {
        totalCollections,
        totalPlanned,
        totalB6Collected,
        totalB5Valid,
        totalCancelled,
        matchedCount,
        mismatchCount,
        noDonationCount,
        totalDifference,
      };
    } else {
      const totalCollections = filteredCollections.length;
      const totalPlanned = filteredCollections.reduce((s, c) => s + (Number(c.plannedAmount) || 0), 0);
      const totalCollected = filteredCollections.reduce((s, c) => s + (Number(c.collectedAmount) || 0), 0);
      const totalRemaining = Math.max(0, totalPlanned - totalCollected);
      const collectedCount = filteredCollections.filter((c) => c.status === 'COLLECTED').length;
      const partialCount = filteredCollections.filter((c) => c.status === 'PARTIALLY_COLLECTED').length;
      const pendingCount = filteredCollections.filter((c) => c.status === 'PENDING').length;
      const notCollectedCount = filteredCollections.filter((c) => c.status === 'NOT_COLLECTED').length;

      return {
        totalCollections,
        totalPlanned,
        totalCollected,
        totalRemaining,
        collectedCount,
        partialCount,
        pendingCount,
        notCollectedCount,
      };
    }
  }, [activeReport, filteredCollections, reconciliationData]);

  // -------------------------------------------------------------
  // Report Meta Titles
  // -------------------------------------------------------------
  const reportTitles: Record<MusalliReportType, { titleBn: string; titleEn: string; subtitleBn: string }> = {
    COLLECTION_REGISTER: {
      titleBn: '📋 অনুদান সংগ্রহ রেজিস্টার',
      titleEn: 'Donation Collection Register',
      subtitleBn: 'নির্ধারিত ও আদায়কৃত সকল অনুদান সংগ্রহের পূর্ণাঙ্গ তালিকা ও স্থিতি',
    },
    AREA_WISE: {
      titleBn: '📍 এলাকা / মহল্লাভিত্তিক সংগ্রহ রিপোর্ট',
      titleEn: 'Area-wise Collection Report',
      subtitleBn: 'মসজিদ সীমানা ও মহল্লা অনুসারে অনুদান আদায়ের অগ্রগতি ও বিবরণ',
    },
    FAMILY_WISE: {
      titleBn: '🏠 পরিবার / বাড়িভিত্তিক সংগ্রহ রেজিস্টার',
      titleEn: 'Family-wise Collection Register',
      subtitleBn: 'খানা ও পারিবারিক প্রধান ভিত্তিক অনুদান সংগ্রহ ও সদস্য বিবরণ',
    },
    PERSON_WISE: {
      titleBn: '👤 ব্যক্তি / দাতাভিত্তিক সংগ্রহ খতিয়ান',
      titleEn: 'Person-wise Collection Ledger',
      subtitleBn: 'ব্যক্তিগত মুসল্লি ও দাতাদের নিয়মিত দান প্রতিশ্রুতি ও আদায় ইতিহাস',
    },
    WORKER_WISE: {
      titleBn: '👷 সংগ্রহকারীভিত্তিক কার্যক্রম রিপোর্ট',
      titleEn: 'Collection Worker Operations Report',
      subtitleBn: 'মাঠ পর্যায়ের সংগ্রহকারীদের অর্পিত দায়িত্ব ও আদায়ের অগ্রগতি বিবরণ',
    },
    PLAN_VS_COLLECTION: {
      titleBn: '📊 পরিকল্পনা বনাম সংগ্রহ বিবরণী',
      titleEn: 'Plan vs Collection Analysis',
      subtitleBn: 'দান পরিকল্পনা ওয়াদা, অপারেশনাল সংগ্রহ ও বাস্তব অনুদানের তুলনামূলক বিশ্লেষণ',
    },
    RECONCILIATION: {
      titleBn: '🔄 সংগ্রহ বনাম বাস্তব অনুদান মিল (B6 vs B5 Reconciliation)',
      titleEn: 'Collection vs Actual Donation Reconciliation',
      subtitleBn: 'B6 অপারেশনাল সংগ্রহ ও B5 বাস্তব অনুদান রসিদের মধ্যকার অথরিটেটিভ মিল-পরীক্ষা',
    },
  };

  const currentReportMeta = reportTitles[activeReport];

  // -------------------------------------------------------------
  // Print Handler
  // -------------------------------------------------------------
  const handlePrint = () => {
    printElement('printable-musalli-report-container', {
      title: `${currentReportMeta.titleBn}_${new Date().toISOString().split('T')[0]}`,
      pageSize: 'A4',
      pageOrientation: printOrientation,
      margin: '8mm 10mm',
    });
  };

  // -------------------------------------------------------------
  // Real Excel (.xlsx) Export Handler
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    let rows: Record<string, any>[] = [];
    const fileName = `MasjidLedger_${activeReport}_${new Date().toISOString().split('T')[0]}`;

    if (activeReport === 'COLLECTION_REGISTER') {
      rows = collectionRegisterData.map((r, idx) => ({
        'ক্রমিক': idx + 1,
        'কালেকশন কোড': r.collectionCode,
        'গ্রহীতা/দাতা': r.personName,
        'দাতা আইডি': r.personCode,
        'পরিবার': r.familyName,
        'এলাকা': r.areaName,
        'পরিকল্পনা কোড': r.planCode,
        'পিরিয়ড': r.period,
        'সংগ্রহকারী': r.workerName,
        'নির্ধারিত তারিখ': r.scheduledDate,
        'পরিকল্পিত টাকা': r.plannedAmount,
        'সংগৃহীত টাকা': r.collectedAmount,
        'অবশিষ্ট সংগৃহীতব্য': r.remainingAmount,
        'অবস্থা': r.status,
      }));
    } else if (activeReport === 'AREA_WISE') {
      rows = areaWiseData.map((r, idx) => ({
        'ক্রমিক': idx + 1,
        'এলাকার নাম': r.areaName,
        'এলাকা কোড': r.areaCode,
        'মোট কালেকশন সংখ্যা': r.totalCollections,
        'পরিকল্পিত টাকা': r.plannedAmount,
        'সংগৃহীত টাকা': r.collectedAmount,
        'অবশিষ্ট সংগৃহীতব্য': r.remainingAmount,
        'সংগৃহীত সংখ্যা': r.collectedCount,
        'আংশিক সংখ্যা': r.partialCount,
        'অপেক্ষমাণ সংখ্যা': r.pendingCount,
        'সংগ্রহ হয়নি': r.notCollectedCount,
      }));
    } else if (activeReport === 'FAMILY_WISE') {
      rows = familyWiseData.map((r, idx) => ({
        'ক্রমিক': idx + 1,
        'পরিবারের নাম': r.familyName,
        'পরিবার কোড': r.familyCode,
        'এলাকা': r.areaName,
        'সদস্য সংখ্যা': r.personCount,
        'কালেকশন সংখ্যা': r.collectionCount,
        'পরিকল্পিত টাকা': r.plannedAmount,
        'সংগৃহীত টাকা': r.collectedAmount,
        'অবশিষ্ট সংগৃহীতব্য': r.remainingAmount,
        'সম্পূর্ণ সংখ্যা': r.collectedCount,
        'অপেক্ষমাণ সংখ্যা': r.pendingCount,
      }));
    } else if (activeReport === 'PERSON_WISE') {
      rows = personWiseData.map((r, idx) => ({
        'ক্রমিক': idx + 1,
        'দাতা/ব্যক্তির নাম': r.personName,
        'ব্যক্তি আইডি': r.personCode,
        'মোবাইল': r.mobile,
        'পরিবার': r.familyName,
        'এলাকা': r.areaName,
        'পরিকল্পনা': r.planCode,
        'পিরিয়ড': r.period,
        'পরিকল্পিত টাকা': r.plannedAmount,
        'সংগৃহীত টাকা': r.collectedAmount,
        'অবশিষ্ট সংগৃহীতব্য': r.remainingAmount,
        'অবস্থা': r.status,
      }));
    } else if (activeReport === 'WORKER_WISE') {
      rows = workerWiseData.map((r, idx) => ({
        'ক্রমিক': idx + 1,
        'সংগ্রহকারীর নাম': r.workerName,
        'মোবাইল': r.workerMobile,
        'অর্পিত কালেকশন': r.assignedCount,
        'পরিকল্পিত টাকা': r.plannedAmount,
        'সংগৃহীত টাকা': r.collectedAmount,
        'অবশিষ্ট সংগৃহীতব্য': r.remainingAmount,
        'সম্পূর্ণ সংগৃহীত': r.collectedCount,
        'আংশিক সংগৃহীত': r.partialCount,
        'অপেক্ষমাণ': r.pendingCount,
        'সংগ্রহ হয়নি': r.notCollectedCount,
      }));
    } else if (activeReport === 'PLAN_VS_COLLECTION') {
      rows = planVsCollectionData.map((r, idx) => ({
        'ক্রমিক': idx + 1,
        'পরিকল্পনা কোড': r.planCode,
        'দাতা': r.personName,
        'দাতা আইডি': r.personCode,
        'পরিবার': r.familyName,
        'এলাকা': r.areaName,
        'পরিকল্পনার ধরণ': r.planType,
        'পরিকল্পিত টাকা (B4)': r.plannedAmount,
        'অপারেশনাল সংগ্রহ (B6)': r.collectionsAmount,
        'বাস্তব অনুদান রসিদ (B5)': r.actualDonationsTotal,
        'বাস্তব রসিদ সংখ্যা': r.actualDonationsCount,
        'অবশিষ্ট সংগৃহীতব্য': r.remainingAmount,
        'অবস্থা': r.status,
      }));
    } else if (activeReport === 'RECONCILIATION') {
      rows = reconciliationData.map((r, idx) => ({
        'ক্রমিক': idx + 1,
        'কালেকশন কোড': r.collectionCode,
        'পরিকল্পনা কোড': r.planCode,
        'দাতা': r.personName,
        'দাতা আইডি': r.personCode,
        'পরিবার': r.familyName,
        'এলাকা': r.areaName,
        'সংগ্রহকারী': r.workerName,
        'পিরিয়ড': r.period,
        'B6 পরিকল্পিত টাকা': r.b6PlannedAmount,
        'B6 সংগৃহীত টাকা': r.b6CollectedAmount,
        'B5 বৈধ রসিদ সংখ্যা': r.b5ValidCount,
        'B5 বাস্তব অনুদান টাকা': r.b5ValidTotal,
        'বাতিলকৃত রসিদ সংখ্যা': r.cancelledCount,
        'পার্থক্য/অমিল': r.difference,
        'রিকনসিলিয়েশন অবস্থা':
          r.reconcileStatus === 'MATCHED'
            ? 'মিল আছে'
            : r.reconcileStatus === 'MISMATCH'
            ? 'অমিল আছে'
            : 'বাস্তব অনুদান নেই',
        'কালেকশন অবস্থা': r.collectionStatus,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // Helper function for status badges
  const renderStatusBadge = (status: CollectionStatus | string) => {
    switch (status) {
      case 'COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {isBn ? 'সংগৃহীত' : 'Collected'}
          </span>
        );
      case 'PARTIALLY_COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            {isBn ? 'আংশিক সংগৃহীত' : 'Partially'}
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {isBn ? 'অপেক্ষমাণ' : 'Pending'}
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            {isBn ? 'নির্ধারিত' : 'Scheduled'}
          </span>
        );
      case 'NOT_COLLECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            {isBn ? 'সংগ্রহ হয়নি' : 'Not Collected'}
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {isBn ? 'স্থগিত' : 'Paused'}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-200 text-gray-700 border border-gray-300">
            {isBn ? 'বাতিল' : 'Cancelled'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Report Type Selector Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 font-baloo">
          {isBn ? 'রিপোর্ট ও রেজিস্টার নির্বাচন' : 'Select Report or Register'}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {(
            [
              { id: 'COLLECTION_REGISTER', labelBn: '📋 অনুদান রেজিস্টার', labelEn: 'Collection Register' },
              { id: 'AREA_WISE', labelBn: '📍 এলাকাভিত্তিক', labelEn: 'Area-wise' },
              { id: 'FAMILY_WISE', labelBn: '🏠 পরিবারভিত্তিক', labelEn: 'Family-wise' },
              { id: 'PERSON_WISE', labelBn: '👤 ব্যক্তিভিত্তিক', labelEn: 'Person-wise' },
              { id: 'WORKER_WISE', labelBn: '👷 সংগ্রহকারীভিত্তিক', labelEn: 'Worker-wise' },
              { id: 'PLAN_VS_COLLECTION', labelBn: '📊 পরিকল্পনা বনাম সংগ্রহ', labelEn: 'Plan vs Collection' },
              { id: 'RECONCILIATION', labelBn: '🔄 B6 বনাম B5 মিল', labelEn: 'B6 vs B5 Reconcile' },
            ] as const
          ).map((tab) => {
            const isActive = activeReport === tab.id;
            const isReconcile = tab.id === 'RECONCILIATION';

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveReport(tab.id)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center space-y-1 cursor-pointer font-siliguri ${
                  isActive
                    ? isReconcile
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : isReconcile
                    ? 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100/70'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="truncate">{isBn ? tab.labelBn : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Comprehensive Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 font-siliguri">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'সময়কাল নির্বাচন:' : 'Time Period:'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'TODAY', labelBn: 'আজ', labelEn: 'Today' },
                { id: 'YESTERDAY', labelBn: 'গতকাল', labelEn: 'Yesterday' },
                { id: 'THIS_WEEK', labelBn: 'চলতি সপ্তাহ', labelEn: 'This Week' },
                { id: 'LAST_WEEK', labelBn: 'গত সপ্তাহ', labelEn: 'Last Week' },
                { id: 'THIS_MONTH', labelBn: 'চলতি মাস', labelEn: 'This Month' },
                { id: 'LAST_MONTH', labelBn: 'গত মাস', labelEn: 'Last Month' },
                { id: 'THIS_YEAR', labelBn: 'চলতি বছর', labelEn: 'This Year' },
                { id: 'LAST_YEAR', labelBn: 'গত বছর', labelEn: 'Last Year' },
                { id: 'ALL', labelBn: 'সব সময়', labelEn: 'All Time' },
                { id: 'CUSTOM', labelBn: 'কাস্টম', labelEn: 'Custom' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleDatePresetChange(preset.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer font-siliguri ${
                  datePreset === preset.id
                    ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {isBn ? preset.labelBn : preset.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Date Inputs & Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Custom Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 font-siliguri">
              {isBn ? 'হতে (From Date)' : 'From Date'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-baloo text-slate-800 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 font-siliguri">
              {isBn ? 'পর্যন্ত (To Date)' : 'To Date'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-baloo text-slate-800 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Period Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 font-siliguri">
              {isBn ? 'সংগ্রহের মাস / পিরিয়ড' : 'Collection Period'}
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-baloo text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">{isBn ? 'সকল পিরিয়ড' : 'All Periods'}</option>
              {availablePeriods.map((per) => (
                <option key={per} value={per}>
                  {per}
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 font-siliguri">
              {isBn ? 'এলাকা / মহল্লা' : 'Area / Mahalla'}
            </label>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">{isBn ? 'সকল এলাকা' : 'All Areas'}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Worker Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 font-siliguri">
              {isBn ? 'সংগ্রহকারী' : 'Collection Worker'}
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">{isBn ? 'সকল কর্মী' : 'All Workers'}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter / Reconciliation Status */}
          {activeReport === 'RECONCILIATION' ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 font-siliguri">
                {isBn ? 'মিলকরণ অবস্থা' : 'Reconcile Status'}
              </label>
              <select
                value={selectedReconcileStatus}
                onChange={(e) => setSelectedReconcileStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">{isBn ? 'সকল অবস্থা' : 'All Reconcile Status'}</option>
                <option value="MATCHED">{isBn ? '✅ মিল আছে' : 'Matched'}</option>
                <option value="MISMATCH">{isBn ? '⚠️ অমিল আছে' : 'Mismatch'}</option>
                <option value="NO_DONATION">{isBn ? 'ℹ️ কোনো বাস্তব অনুদান নেই' : 'No Donation'}</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1 font-siliguri">
                {isBn ? 'কালেকশন অবস্থা' : 'Status'}
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-siliguri text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">{isBn ? 'সকল অবস্থা' : 'All Status'}</option>
                <option value="SCHEDULED">{isBn ? 'নির্ধারিত' : 'Scheduled'}</option>
                <option value="PENDING">{isBn ? 'অপেক্ষমাণ' : 'Pending'}</option>
                <option value="PARTIALLY_COLLECTED">{isBn ? 'আংশিক সংগৃহীত' : 'Partially Collected'}</option>
                <option value="COLLECTED">{isBn ? 'সংগৃহীত' : 'Collected'}</option>
                <option value="NOT_COLLECTED">{isBn ? 'সংগ্রহ হয়নি' : 'Not Collected'}</option>
                <option value="PAUSED">{isBn ? 'স্থগিত' : 'Paused'}</option>
                <option value="CANCELLED">{isBn ? 'বাতিল' : 'Cancelled'}</option>
              </select>
            </div>
          )}
        </div>

        {/* Search Bar & Action Controls Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isBn ? 'কোড, দাতা, পরিবার, কর্মী খুঁজুন...' : 'Search by code, donor, worker...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-tiro text-slate-800 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center space-x-2 w-full sm:w-auto justify-end">
            {/* Letterhead Toggle */}
            <label className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none font-siliguri mr-2">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
              />
              <span>{isBn ? 'লেটারহেডসহ' : 'Letterhead'}</span>
            </label>

            {/* Orientation Toggle */}
            <button
              type="button"
              onClick={() => setPrintOrientation(printOrientation === 'portrait' ? 'landscape' : 'portrait')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer font-siliguri"
            >
              {printOrientation === 'portrait' ? (isBn ? '📄 পোর্ট্রেট' : 'Portrait') : (isBn ? '📑 ল্যান্ডস্কেপ' : 'Landscape')}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer font-siliguri shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBn ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
            </button>

            {/* Excel Export Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer font-siliguri shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isBn ? 'এক্সেল (.xlsx)' : 'Excel (.xlsx)'}</span>
            </button>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Summary Metrics Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-baloo flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'রিপোর্ট সারসংক্ষেপ ও আর্থিক মিলকরণ' : 'Summary & Financial Snapshot'}</span>
          </div>

          <div className="text-[11px] font-medium text-slate-500 font-tiro">
            {isBn ? `ফিল্টারকৃত রেকর্ড: ${toBanglaNumber(
              activeReport === 'AREA_WISE' ? areaWiseData.length :
              activeReport === 'FAMILY_WISE' ? familyWiseData.length :
              activeReport === 'PERSON_WISE' ? personWiseData.length :
              activeReport === 'WORKER_WISE' ? workerWiseData.length :
              activeReport === 'PLAN_VS_COLLECTION' ? planVsCollectionData.length :
              activeReport === 'RECONCILIATION' ? reconciliationData.length :
              filteredCollections.length
            )} টি` : `Total Records: ${
              activeReport === 'AREA_WISE' ? areaWiseData.length :
              activeReport === 'FAMILY_WISE' ? familyWiseData.length :
              activeReport === 'PERSON_WISE' ? personWiseData.length :
              activeReport === 'WORKER_WISE' ? workerWiseData.length :
              activeReport === 'PLAN_VS_COLLECTION' ? planVsCollectionData.length :
              activeReport === 'RECONCILIATION' ? reconciliationData.length :
              filteredCollections.length
            }`}
          </div>
        </div>

        {activeReport === 'RECONCILIATION' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500 font-tiro">{isBn ? 'মোট কালেকশন' : 'Total Items'}</div>
              <div className="text-base font-bold text-slate-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.totalCollections) : summary.totalCollections}
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
              <div className="text-[11px] font-medium text-blue-700 font-tiro">{isBn ? 'B6 পরিকল্পিত (৳)' : 'B6 Planned'}</div>
              <div className="text-base font-bold text-blue-950 font-baloo mt-0.5">
                {formatCurrency(summary.totalPlanned || 0, langKey)}
              </div>
            </div>

            <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-100">
              <div className="text-[11px] font-medium text-teal-700 font-tiro">{isBn ? 'B6 সংগৃহীত (৳)' : 'B6 Collected'}</div>
              <div className="text-base font-bold text-teal-950 font-baloo mt-0.5">
                {formatCurrency(summary.totalB6Collected || 0, langKey)}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-medium text-emerald-800 font-tiro">{isBn ? 'B5 বাস্তব অনুদান (৳)' : 'B5 Actual Total'}</div>
              <div className="text-base font-bold text-emerald-950 font-baloo mt-0.5">
                {formatCurrency(summary.totalB5Valid || 0, langKey)}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <div className="text-[11px] font-medium text-emerald-700 font-tiro">{isBn ? '✅ মিল আছে' : 'Matched'}</div>
              <div className="text-base font-bold text-emerald-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.matchedCount || 0) : summary.matchedCount}
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
              <div className="text-[11px] font-medium text-rose-700 font-tiro">{isBn ? '⚠️ অমিল আছে' : 'Mismatch'}</div>
              <div className="text-base font-bold text-rose-950 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.mismatchCount || 0) : summary.mismatchCount}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500 font-tiro">{isBn ? 'ℹ️ অনুদান নেই' : 'No Donation'}</div>
              <div className="text-base font-bold text-slate-700 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.noDonationCount || 0) : summary.noDonationCount}
              </div>
            </div>

            <div className={`p-3 rounded-xl border ${summary.totalDifference > 0 ? 'bg-rose-100/70 border-rose-300 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
              <div className="text-[11px] font-medium font-tiro">{isBn ? 'পার্থক্য / অমিল (৳)' : 'Difference'}</div>
              <div className="text-base font-bold font-baloo mt-0.5">
                {formatCurrency(summary.totalDifference || 0, langKey)}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-medium text-slate-500 font-tiro">{isBn ? 'মোট কালেকশন' : 'Total Items'}</div>
              <div className="text-base font-bold text-slate-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.totalCollections) : summary.totalCollections}
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
              <div className="text-[11px] font-medium text-blue-700 font-tiro">{isBn ? 'মোট পরিকল্পিত (৳)' : 'Total Planned'}</div>
              <div className="text-base font-bold text-blue-950 font-baloo mt-0.5">
                {formatCurrency(summary.totalPlanned || 0, langKey)}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
              <div className="text-[11px] font-medium text-emerald-800 font-tiro">{isBn ? 'মোট সংগৃহীত (৳)' : 'Total Collected'}</div>
              <div className="text-base font-bold text-emerald-950 font-baloo mt-0.5">
                {formatCurrency(summary.totalCollected || 0, langKey)}
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200">
              <div className="text-[11px] font-medium text-amber-800 font-tiro">{isBn ? 'অবশিষ্ট সংগৃহীতব্য (৳)' : 'Remaining'}</div>
              <div className="text-base font-bold text-amber-950 font-baloo mt-0.5">
                {formatCurrency(summary.totalRemaining || 0, langKey)}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <div className="text-[11px] font-medium text-emerald-700 font-tiro">{isBn ? 'সম্পূর্ণ সংগৃহীত' : 'Collected'}</div>
              <div className="text-base font-bold text-emerald-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.collectedCount || 0) : summary.collectedCount}
              </div>
            </div>

            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
              <div className="text-[11px] font-medium text-teal-700 font-tiro">{isBn ? 'আংশিক সংগৃহীত' : 'Partially'}</div>
              <div className="text-base font-bold text-teal-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.partialCount || 0) : summary.partialCount}
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
              <div className="text-[11px] font-medium text-amber-700 font-tiro">{isBn ? 'অপেক্ষমাণ' : 'Pending'}</div>
              <div className="text-base font-bold text-amber-900 font-baloo mt-0.5">
                {isBn ? toBanglaNumber(summary.pendingCount || 0) : summary.pendingCount}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Document Body (Screen View & Printable Container) */}
      <div
        id="printable-musalli-report-container"
        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 print:p-0 print:border-none print:shadow-none"
      >
        {/* Dynamic Letterhead (Visible in Print or if Toggle is on) */}
        {includeLetterhead ? (
          <div className="break-inside-avoid">
            <MosqueOfficialLetterhead
              mosque={currentMosque}
              documentTitle={currentReportMeta.titleBn}
              subTitle={currentReportMeta.subtitleBn}
              periodLabel={
                datePreset === 'ALL'
                  ? isBn ? 'সর্বকাল' : 'All Time'
                  : `${formatDate(startDate, langKey)} হতে ${formatDate(endDate, langKey)}`
              }
              dateStr={formatDate(new Date().toISOString(), langKey)}
            />
          </div>
        ) : (
          <div className="border-b border-slate-200 pb-3 mb-3 break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 font-siliguri">{currentReportMeta.titleBn}</h2>
            <p className="text-xs text-slate-500 font-tiro mt-0.5">{currentReportMeta.subtitleBn}</p>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* REPORT TABLE RENDER (Based on activeReport) */}
        {/* ------------------------------------------------------------- */}
        <div className="overflow-x-auto">
          {/* TAB 1: COLLECTION REGISTER */}
          {activeReport === 'COLLECTION_REGISTER' && (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-y border-slate-200 font-siliguri">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">কালেকশন কোড</th>
                  <th className="py-2.5 px-3">দাতা / মুসল্লির নাম</th>
                  <th className="py-2.5 px-3">পরিবার ও এলাকা</th>
                  <th className="py-2.5 px-3">সংগ্রহকারী</th>
                  <th className="py-2.5 px-3">পিরিয়ড / তারিখ</th>
                  <th className="py-2.5 px-3 text-right">পরিকল্পিত (৳)</th>
                  <th className="py-2.5 px-3 text-right">সংগৃহীত (৳)</th>
                  <th className="py-2.5 px-3 text-right">অবশিষ্ট সংগৃহীতব্য (৳)</th>
                  <th className="py-2.5 px-3 text-center">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-tiro">
                {collectionRegisterData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400 font-siliguri">
                      {isBn ? 'কোনো কালেকশন রেকর্ড পাওয়া যায়নি।' : 'No collection records found.'}
                    </td>
                  </tr>
                ) : (
                  collectionRegisterData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-baloo">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</td>
                      <td className="py-2.5 px-3 font-baloo font-bold text-slate-900">{row.collectionCode}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{row.personName}</div>
                        <div className="text-[10px] text-slate-400 font-baloo">ID: {row.personCode}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div>{row.familyName}</div>
                        <div className="text-[10px] text-emerald-700">{row.areaName}</div>
                      </td>
                      <td className="py-2.5 px-3">{row.workerName}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-baloo">{row.period}</div>
                        <div className="text-[10px] text-slate-400 font-baloo">{row.scheduledDate}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold">
                        {formatCurrency(row.plannedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold text-emerald-700">
                        {formatCurrency(row.collectedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold text-amber-700">
                        {formatCurrency(row.remainingAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-center">{renderStatusBadge(row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {collectionRegisterData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 font-siliguri">
                    <td colSpan={6} className="py-2.5 px-3 text-right">
                      {isBn ? 'সর্বমোট যোগফল:' : 'Total Sum:'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-baloo">
                      {formatCurrency(summary.totalPlanned || 0, langKey)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-baloo text-emerald-800">
                      {formatCurrency(summary.totalCollected || 0, langKey)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-baloo text-amber-800">
                      {formatCurrency(summary.totalRemaining || 0, langKey)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* TAB 2: AREA-WISE REPORT */}
          {activeReport === 'AREA_WISE' && (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-y border-slate-200 font-siliguri">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">এলাকা / মহল্লার নাম</th>
                  <th className="py-2.5 px-3">এলাকা কোড</th>
                  <th className="py-2.5 px-3 text-center">কালেকশন সংখ্যা</th>
                  <th className="py-2.5 px-3 text-right">পরিকল্পিত টাকা (৳)</th>
                  <th className="py-2.5 px-3 text-right">সংগৃহীত টাকা (৳)</th>
                  <th className="py-2.5 px-3 text-right">অবশিষ্ট সংগৃহীতব্য (৳)</th>
                  <th className="py-2.5 px-3 text-center">আদায় স্থিতি (সংগৃহীত / আংশিক / অপেক্ষমাণ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-tiro">
                {areaWiseData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-siliguri">
                      {isBn ? 'কোনো এলাকার তথ্য পাওয়া যায়নি।' : 'No area data found.'}
                    </td>
                  </tr>
                ) : (
                  areaWiseData.map((row, idx) => (
                    <tr key={row.areaId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-baloo">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-siliguri">{row.areaName}</td>
                      <td className="py-2.5 px-3 font-baloo text-slate-500">{row.areaCode}</td>
                      <td className="py-2.5 px-3 text-center font-baloo">
                        {isBn ? toBanglaNumber(row.totalCollections) : row.totalCollections}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold">
                        {formatCurrency(row.plannedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold text-emerald-700">
                        {formatCurrency(row.collectedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold text-amber-700">
                        {formatCurrency(row.remainingAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-baloo">
                        <span className="text-emerald-700 font-bold">{isBn ? toBanglaNumber(row.collectedCount) : row.collectedCount}</span> /{' '}
                        <span className="text-teal-700 font-bold">{isBn ? toBanglaNumber(row.partialCount) : row.partialCount}</span> /{' '}
                        <span className="text-amber-700 font-bold">{isBn ? toBanglaNumber(row.pendingCount) : row.pendingCount}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {areaWiseData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 font-siliguri">
                    <td colSpan={4} className="py-2.5 px-3 text-right">{isBn ? 'সর্বমোট যোগফল:' : 'Total Sum:'}</td>
                    <td className="py-2.5 px-3 text-right font-baloo">{formatCurrency(summary.totalPlanned || 0, langKey)}</td>
                    <td className="py-2.5 px-3 text-right font-baloo text-emerald-800">{formatCurrency(summary.totalCollected || 0, langKey)}</td>
                    <td className="py-2.5 px-3 text-right font-baloo text-amber-800">{formatCurrency(summary.totalRemaining || 0, langKey)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* TAB 3: FAMILY-WISE REPORT */}
          {activeReport === 'FAMILY_WISE' && (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-y border-slate-200 font-siliguri">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">পরিবার / খানার নাম</th>
                  <th className="py-2.5 px-3">পরিবার কোড</th>
                  <th className="py-2.5 px-3">এলাকা</th>
                  <th className="py-2.5 px-3 text-center">সদস্য সংখ্যা</th>
                  <th className="py-2.5 px-3 text-center">কালেকশন সংখ্যা</th>
                  <th className="py-2.5 px-3 text-right">পরিকল্পিত (৳)</th>
                  <th className="py-2.5 px-3 text-right">সংগৃহীত (৳)</th>
                  <th className="py-2.5 px-3 text-right">অবশিষ্ট সংগৃহীতব্য (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-tiro">
                {familyWiseData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400 font-siliguri">
                      {isBn ? 'কোনো পরিবারের তথ্য পাওয়া যায়নি।' : 'No family data found.'}
                    </td>
                  </tr>
                ) : (
                  familyWiseData.map((row, idx) => (
                    <tr key={row.familyId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-baloo">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-siliguri">{row.familyName}</td>
                      <td className="py-2.5 px-3 font-baloo text-slate-500">{row.familyCode}</td>
                      <td className="py-2.5 px-3 text-emerald-700">{row.areaName}</td>
                      <td className="py-2.5 px-3 text-center font-baloo">
                        {isBn ? toBanglaNumber(row.personCount) : row.personCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-baloo">
                        {isBn ? toBanglaNumber(row.collectionCount) : row.collectionCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold">
                        {formatCurrency(row.plannedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold text-emerald-700">
                        {formatCurrency(row.collectedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold text-amber-700">
                        {formatCurrency(row.remainingAmount, langKey)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 4: PERSON-WISE REPORT */}
          {activeReport === 'PERSON_WISE' && (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-y border-slate-200 font-siliguri">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">ব্যক্তি / দাতার নাম</th>
                  <th className="py-2.5 px-3">মোবাইল</th>
                  <th className="py-2.5 px-3">পরিবার ও এলাকা</th>
                  <th className="py-2.5 px-3">পরিকল্পনা ও পিরিয়ড</th>
                  <th className="py-2.5 px-3 text-right">পরিকল্পিত (৳)</th>
                  <th className="py-2.5 px-3 text-right">সংগৃহীত (৳)</th>
                  <th className="py-2.5 px-3 text-right">অবশিষ্ট সংগৃহীতব্য (৳)</th>
                  <th className="py-2.5 px-3 text-center">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-tiro">
                {personWiseData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400 font-siliguri">
                      {isBn ? 'কোনো মুসল্লি/দাতার তথ্য পাওয়া যায়নি।' : 'No person records found.'}
                    </td>
                  </tr>
                ) : (
                  personWiseData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-baloo">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{row.personName}</div>
                        <div className="text-[10px] text-slate-400 font-baloo">ID: {row.personCode}</div>
                      </td>
                      <td className="py-2.5 px-3 font-baloo">{row.mobile}</td>
                      <td className="py-2.5 px-3">
                        <div>{row.familyName}</div>
                        <div className="text-[10px] text-emerald-700">{row.areaName}</div>
                      </td>
                      <td className="py-2.5 px-3 font-baloo">
                        <div>{row.planCode}</div>
                        <div className="text-[10px] text-slate-400">{row.period}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold">
                        {formatCurrency(row.plannedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold text-emerald-700">
                        {formatCurrency(row.collectedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold text-amber-700">
                        {formatCurrency(row.remainingAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-center">{renderStatusBadge(row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 5: WORKER-WISE REPORT */}
          {activeReport === 'WORKER_WISE' && (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-y border-slate-200 font-siliguri">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">সংগ্রহকারীর নাম</th>
                  <th className="py-2.5 px-3">মোবাইল</th>
                  <th className="py-2.5 px-3 text-center">অর্পিত কালেকশন</th>
                  <th className="py-2.5 px-3 text-right">পরিকল্পিত (৳)</th>
                  <th className="py-2.5 px-3 text-right">সংগৃহীত (৳)</th>
                  <th className="py-2.5 px-3 text-right">অবশিষ্ট সংগৃহীতব্য (৳)</th>
                  <th className="py-2.5 px-3 text-center">স্থিতি (সংগৃহীত / আংশিক / অপেক্ষমাণ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-tiro">
                {workerWiseData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-siliguri">
                      {isBn ? 'কোনো সংগ্রহকারীর তথ্য পাওয়া যায়নি।' : 'No worker records found.'}
                    </td>
                  </tr>
                ) : (
                  workerWiseData.map((row, idx) => (
                    <tr key={row.workerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-baloo">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-siliguri">{row.workerName}</td>
                      <td className="py-2.5 px-3 font-baloo">{row.workerMobile}</td>
                      <td className="py-2.5 px-3 text-center font-baloo">
                        {isBn ? toBanglaNumber(row.assignedCount) : row.assignedCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold">
                        {formatCurrency(row.plannedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold text-emerald-700">
                        {formatCurrency(row.collectedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold text-amber-700">
                        {formatCurrency(row.remainingAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-baloo">
                        <span className="text-emerald-700 font-bold">{isBn ? toBanglaNumber(row.collectedCount) : row.collectedCount}</span> /{' '}
                        <span className="text-teal-700 font-bold">{isBn ? toBanglaNumber(row.partialCount) : row.partialCount}</span> /{' '}
                        <span className="text-amber-700 font-bold">{isBn ? toBanglaNumber(row.pendingCount) : row.pendingCount}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 6: PLAN VS COLLECTION */}
          {activeReport === 'PLAN_VS_COLLECTION' && (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-900 font-bold border-y border-slate-200 font-siliguri">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">পরিকল্পনা কোড</th>
                  <th className="py-2.5 px-3">দাতা ও পরিবার</th>
                  <th className="py-2.5 px-3">ধরণ</th>
                  <th className="py-2.5 px-3 text-right">পরিকল্পিত (B4)</th>
                  <th className="py-2.5 px-3 text-right">অপারেশনাল সংগ্রহ (B6)</th>
                  <th className="py-2.5 px-3 text-right">বাস্তব অনুদান রসিদ (B5)</th>
                  <th className="py-2.5 px-3 text-right">অবশিষ্ট সংগৃহীতব্য (৳)</th>
                  <th className="py-2.5 px-3 text-center">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-tiro">
                {planVsCollectionData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400 font-siliguri">
                      {isBn ? 'কোনো পরিকল্পনা রেকর্ড পাওয়া যায়নি।' : 'No plans found.'}
                    </td>
                  </tr>
                ) : (
                  planVsCollectionData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-baloo">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</td>
                      <td className="py-2.5 px-3 font-baloo font-bold text-slate-900">{row.planCode}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{row.personName}</div>
                        <div className="text-[10px] text-slate-500">{row.familyName} ({row.areaName})</div>
                      </td>
                      <td className="py-2.5 px-3 font-baloo">{row.planType}</td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold">
                        {formatCurrency(row.plannedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo text-blue-700 font-medium">
                        {formatCurrency(row.collectionsAmount, langKey)}
                        <span className="text-[10px] text-slate-400 block font-baloo">({isBn ? toBanglaNumber(row.totalCollectionsCount) : row.totalCollectionsCount} টি)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo text-emerald-800 font-bold">
                        {formatCurrency(row.actualDonationsTotal, langKey)}
                        <span className="text-[10px] text-slate-400 block font-baloo">({isBn ? toBanglaNumber(row.actualDonationsCount) : row.actualDonationsCount} টি রসিদ)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold text-amber-700">
                        {formatCurrency(row.remainingAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 7: B6 VS B5 RECONCILIATION */}
          {activeReport === 'RECONCILIATION' && (
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-amber-100/70 text-slate-900 font-bold border-y border-amber-200 font-siliguri">
                  <th className="py-2.5 px-3">ক্রমিক</th>
                  <th className="py-2.5 px-3">কালেকশন কোড</th>
                  <th className="py-2.5 px-3">দাতা ও এলাকা</th>
                  <th className="py-2.5 px-3">সংগ্রহকারী ও পিরিয়ড</th>
                  <th className="py-2.5 px-3 text-right">B6 পরিকল্পিত (৳)</th>
                  <th className="py-2.5 px-3 text-right">B6 সংগৃহীত (৳)</th>
                  <th className="py-2.5 px-3 text-center">B5 বৈধ রসিদ সংখ্যা</th>
                  <th className="py-2.5 px-3 text-right">B5 বাস্তব অনুদান (৳)</th>
                  <th className="py-2.5 px-3 text-right">পার্থক্য / অমিল (৳)</th>
                  <th className="py-2.5 px-3 text-center">রিকনসিলিয়েশন অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-tiro">
                {reconciliationData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400 font-siliguri">
                      {isBn ? 'কোনো রিকনসিলিয়েশন রেকর্ড পাওয়া যায়নি।' : 'No reconciliation records found.'}
                    </td>
                  </tr>
                ) : (
                  reconciliationData.map((row, idx) => (
                    <tr
                      key={row.collectionId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        row.reconcileStatus === 'MISMATCH' ? 'bg-rose-50/60' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-baloo">{isBn ? toBanglaNumber(idx + 1) : idx + 1}</td>
                      <td className="py-2.5 px-3 font-baloo font-bold text-slate-900">
                        {row.collectionCode}
                        <span className="text-[10px] text-slate-400 block font-baloo">Plan: {row.planCode}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{row.personName}</div>
                        <div className="text-[10px] text-slate-500 font-tiro">{row.areaName} ({row.familyName})</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{row.workerName}</div>
                        <div className="text-[10px] text-slate-400 font-baloo">{row.period}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-semibold">
                        {formatCurrency(row.b6PlannedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold text-teal-800">
                        {formatCurrency(row.b6CollectedAmount, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-baloo">
                        <span className="font-bold text-emerald-800">
                          {isBn ? toBanglaNumber(row.b5ValidCount) : row.b5ValidCount}
                        </span>
                        {row.cancelledCount > 0 && (
                          <span className="text-[10px] text-rose-600 block font-tiro">
                            ({isBn ? `${toBanglaNumber(row.cancelledCount)}টি বাতিল` : `${row.cancelledCount} cancelled`})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold text-emerald-800">
                        {formatCurrency(row.b5ValidTotal, langKey)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-baloo font-bold">
                        {row.difference === 0 ? (
                          <span className="text-emerald-700">৳০</span>
                        ) : (
                          <span className="text-rose-700 font-black">{formatCurrency(row.difference, langKey)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-siliguri">
                        {row.reconcileStatus === 'MATCHED' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span>{isBn ? 'মিল আছে' : 'Matched'}</span>
                          </span>
                        ) : row.reconcileStatus === 'MISMATCH' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>{isBn ? 'অমিল আছে' : 'Mismatch'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span>{isBn ? 'বাস্তব অনুদান নেই' : 'No Donation'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {reconciliationData.length > 0 && (
                <tfoot>
                  <tr className="bg-amber-50/80 font-bold border-t-2 border-amber-300 text-slate-900 font-siliguri">
                    <td colSpan={4} className="py-2.5 px-3 text-right">{isBn ? 'সর্বমোট রিকনসিলড যোগফল:' : 'Total Reconciliation:'}</td>
                    <td className="py-2.5 px-3 text-right font-baloo">{formatCurrency(summary.totalPlanned || 0, langKey)}</td>
                    <td className="py-2.5 px-3 text-right font-baloo text-teal-900">{formatCurrency(summary.totalB6Collected || 0, langKey)}</td>
                    <td className="py-2.5 px-3 text-center font-baloo">{isBn ? toBanglaNumber(reconciliationData.reduce((s, r) => s + r.b5ValidCount, 0)) : reconciliationData.reduce((s, r) => s + r.b5ValidCount, 0)}</td>
                    <td className="py-2.5 px-3 text-right font-baloo text-emerald-900">{formatCurrency(summary.totalB5Valid || 0, langKey)}</td>
                    <td className="py-2.5 px-3 text-right font-baloo text-rose-900">{formatCurrency(summary.totalDifference || 0, langKey)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Print Signatures Bar */}
        <div className="pt-8 mt-8 border-t border-slate-200 grid grid-cols-4 gap-4 text-center text-xs font-siliguri text-slate-700 break-inside-avoid">
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-bold">
              {isBn ? 'সংগ্রহকারী' : 'Collector'}
            </div>
            <div className="text-[10px] text-slate-400">{isBn ? 'স্বাক্ষর ও তারিখ' : 'Signature & Date'}</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-bold">
              {isBn ? 'হিসাবরক্ষক / কোষাধ্যক্ষ' : 'Treasurer'}
            </div>
            <div className="text-[10px] text-slate-400">{isBn ? 'স্বাক্ষর ও তারিখ' : 'Signature & Date'}</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-bold">
              {isBn ? 'সাধারণ সম্পাদক' : 'Secretary'}
            </div>
            <div className="text-[10px] text-slate-400">{isBn ? 'স্বাক্ষর ও তারিখ' : 'Signature & Date'}</div>
          </div>
          <div>
            <div className="border-t border-slate-400 w-32 mx-auto pt-1 font-bold">
              {isBn ? 'সভাপতি / মোতোয়াল্লী' : 'President'}
            </div>
            <div className="text-[10px] text-slate-400">{isBn ? 'স্বাক্ষর ও তারিখ' : 'Signature & Date'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

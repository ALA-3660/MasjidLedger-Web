import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, setLogLevel } from 'firebase/firestore';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface CloudSyncOptions {
  force?: boolean;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function computePartitionHash(data: Record<string, any>): string {
  const copy: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'updatedAt' && k !== 'partitionName') {
      copy[k] = v;
    }
  }
  return crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex');
}

class CloudPersistenceService {
  private db: any = null;
  private isConfigured: boolean = false;
  private syncTimeout: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private pendingState: any = null;
  private lastPartitionHashes: Record<string, string> = {};
  private quotaExhaustedUntil: number = 0;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) {
        console.warn('[CloudPersistence] firebase-applet-config.json not found. Operating in local mode only.');
        return;
      }

      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      if (!config.projectId || !config.firestoreDatabaseId) {
        console.warn('[CloudPersistence] Invalid Firestore config. Operating in local mode only.');
        return;
      }

      try {
        setLogLevel('silent');
      } catch (_) {}

      const app = getApps().length > 0 ? getApp() : initializeApp(config);
      this.db = getFirestore(app, config.firestoreDatabaseId);
      this.isConfigured = true;
      console.log(`[CloudPersistence] Firestore initialized successfully for database: ${config.firestoreDatabaseId}`);

      // Graceful shutdown flush on container scale-down or termination (SIGTERM/SIGINT)
      const gracefulFlush = async () => {
        if (this.pendingState && this.isConfigured && Date.now() >= this.quotaExhaustedUntil) {
          try {
            await this.flush(this.pendingState);
          } catch (_) {}
        }
      };
      process.once('SIGTERM', gracefulFlush);
      process.once('SIGINT', gracefulFlush);
    } catch (err) {
      console.error('[CloudPersistence] Failed to initialize Firebase:', err);
    }
  }

  get isAvailable(): boolean {
    return this.isConfigured && this.db !== null;
  }

  /**
   * Loads the latest database snapshot from Firestore.
   */
  async loadFromCloud(): Promise<any | null> {
    if (!this.isAvailable) return null;

    try {
      console.log('[CloudPersistence] Pulling persistent state from Firestore...');
      const partitions = ['core', 'finances', 'committee_and_staff', 'education_and_hifz', 'records_and_documents', 'files'];
      const results = await Promise.all(
        partitions.map(async (part) => {
          try {
            const snap = await withTimeout(
              getDoc(doc(this.db, 'system_partitions', part)),
              5000,
              `getDoc(${part})`
            );
            if (snap.exists()) {
              const partData = snap.data();
              this.lastPartitionHashes[part] = computePartitionHash(partData);
              return { part, data: partData };
            }
          } catch (e) {
            console.warn(`[CloudPersistence] Warning loading partition ${part}:`, (e as Error)?.message || e);
          }
          return { part, data: null };
        })
      );

      const mergedState: Record<string, any> = {};
      let foundAny = false;

      for (const res of results) {
        if (res.data) {
          foundAny = true;
          for (const [key, val] of Object.entries(res.data)) {
            if (key !== 'updatedAt' && key !== 'partitionName') {
              mergedState[key] = val;
            }
          }
        }
      }

      if (!foundAny) {
        console.log('[CloudPersistence] No prior state in Firestore found. Local seed will be used.');
        return null;
      }

      console.log(`[CloudPersistence] Cloud state successfully loaded from Firestore (${Object.keys(mergedState).length} collections).`);
      return mergedState;
    } catch (err) {
      console.error('[CloudPersistence] Failed to load from cloud:', err);
      return null;
    }
  }

  /**
   * Saves only modified database partitions to Firestore with timeout & quota protection.
   */
  async saveToCloud(state: any): Promise<boolean> {
    if (!this.isAvailable || !state) return false;
    if (Date.now() < this.quotaExhaustedUntil) {
      return false;
    }

    try {
      const now = new Date().toISOString();

      const partitionCore = {
        mosques: state.mosques || [],
        users: state.users || [],
        accounts: state.accounts || [],
        accountHeads: state.accountHeads || [],
        updatedAt: now,
      };

      const partitionFinances = {
        incomeEntries: state.incomeEntries || [],
        expenseEntries: state.expenseEntries || [],
        donations: state.donations || [],
        donationBoxes: state.donationBoxes || [],
        donationBoxCollections: state.donationBoxCollections || [],
        transfers: state.transfers || [],
        budgets: state.budgets || [],
        budgetLines: state.budgetLines || [],
        updatedAt: now,
      };

      const partitionCommitteeAndStaff = {
        committeeTerms: state.committeeTerms || [],
        committeeMembers: state.committeeMembers || [],
        committeeMeetings: state.committeeMeetings || [],
        committeeNotices: state.committeeNotices || [],
        committeeResolutions: state.committeeResolutions || [],
        committeeActionPlans: state.committeeActionPlans || [],
        committeeActivities: state.committeeActivities || [],
        committeeTasks: state.committeeTasks || [],
        committeeManualEvaluations: state.committeeManualEvaluations || [],
        subCommittees: state.subCommittees || [],
        advisoryTerms: state.advisoryTerms || [],
        advisors: state.advisors || [],
        advisorConsultations: state.advisorConsultations || [],
        staffList: state.staffList || [],
        staffPayments: state.staffPayments || [],
        staffBankTransferLetters: state.staffBankTransferLetters || [],
        paymentBatches: state.paymentBatches || [],
        updatedAt: now,
      };

      const partitionEducation = {
        educationStudentProfiles: state.educationStudentProfiles || [],
        educationPrograms: state.educationPrograms || [],
        educationLevels: state.educationLevels || [],
        educationEnrollments: state.educationEnrollments || [],
        educationGuardianRelationships: state.educationGuardianRelationships || [],
        maktabClasses: state.maktabClasses || [],
        maktabAttendances: state.maktabAttendances || [],
        maktabTeacherAssignments: state.maktabTeacherAssignments || [],
        maktabFeeSchedules: state.maktabFeeSchedules || [],
        maktabFeeRecords: state.maktabFeeRecords || [],
        maktabProgressRecords: state.maktabProgressRecords || [],
        hifzEnrollments: state.hifzEnrollments || [],
        hifzLevels: state.hifzLevels || [],
        hifzCurricula: state.hifzCurricula || [],
        hifzSabaks: state.hifzSabaks || [],
        hifzSabakis: state.hifzSabakis || [],
        hifzDaurCycles: state.hifzDaurCycles || [],
        hifzDaurs: state.hifzDaurs || [],
        hifzRevisions: state.hifzRevisions || [],
        hifzAttendances: state.hifzAttendances || [],
        hifzTeacherAssignments: state.hifzTeacherAssignments || [],
        hifzResidences: state.hifzResidences || [],
        hifzResidenceBuildings: state.hifzResidenceBuildings || [],
        hifzResidenceRooms: state.hifzResidenceRooms || [],
        hifzResidenceBeds: state.hifzResidenceBeds || [],
        hifzResidentialAllocations: state.hifzResidentialAllocations || [],
        hifzResidentialTransfers: state.hifzResidentialTransfers || [],
        updatedAt: now,
      };

      const safeCentralDocuments = (state.centralDocuments || []).map((docItem: any) => {
        if (docItem.fileUrl && docItem.fileUrl.startsWith('data:') && docItem.fileUrl.length > 250000) {
          return { ...docItem, fileUrl: `/api/v1/files/${docItem.id}` };
        }
        return docItem;
      });

      const safeUploadedFiles = (state.uploadedFiles || []).slice(-100).map((f: any) => {
        const isLogoAsset = typeof f?.id === 'string' && f.id.startsWith('logo-');
        const maxInlineLen = isLogoAsset ? 750000 : 350000;
        if (f.url && f.url.startsWith('data:') && f.url.length > maxInlineLen) {
          return { ...f, url: `/api/v1/files/${f.id}` };
        }
        return f;
      });

      const partitionRecords = {
        centralDocuments: safeCentralDocuments,
        officialDocuments: state.officialDocuments || [],
        officialDocumentTemplates: state.officialDocumentTemplates || [],
        officialDocumentNumbering: state.officialDocumentNumbering || {},
        assets: state.assets || [],
        properties: state.properties || [],
        cemeteryRecords: state.cemeteryRecords || [],
        notices: state.notices || [],
        notifications: state.notifications || [],
        legalCases: state.legalCases || [],
        legalCourts: state.legalCourts || [],
        legalParties: state.legalParties || [],
        legalLawyers: state.legalLawyers || [],
        legalHearings: state.legalHearings || [],
        legalActions: state.legalActions || [],
        legalOrders: state.legalOrders || [],
        libraryCategories: state.libraryCategories || [],
        bookTitles: state.bookTitles || [],
        bookCopies: state.bookCopies || [],
        libraryMembers: state.libraryMembers || [],
        bookIssues: state.bookIssues || [],
        bookAcquisitions: state.bookAcquisitions || [],
        libraryRooms: state.libraryRooms || [],
        libraryRacks: state.libraryRacks || [],
        libraryShelves: state.libraryShelves || [],
        areas: state.areas || [],
        families: state.families || [],
        persons: state.persons || [],
        donationPlans: state.donationPlans || [],
        collectionWorkers: state.collectionWorkers || [],
        donationCollections: state.donationCollections || [],
        backupRecords: state.backupRecords || [],
        restoreRecords: state.restoreRecords || [],
        backupSettings: state.backupSettings || {},
        qrCodes: state.qrCodes || [],
        smsLogs: state.smsLogs || [],
        documentTokens: state.documentTokens || [],
        updatedAt: now,
      };

      const partitionFiles = {
        uploadedFiles: safeUploadedFiles,
        updatedAt: now,
      };

      const deepCleanForFirestore = (val: any): any => {
        if (val === undefined) return null;
        if (val === null) return null;
        if (typeof val !== 'object') return val;
        if (val instanceof Date) return val.toISOString();
        if (Array.isArray(val)) {
          return val.map((item) => deepCleanForFirestore(item)).filter((item) => item !== undefined);
        }
        const cleanObj: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          if (v !== undefined) {
            cleanObj[k] = deepCleanForFirestore(v);
          }
        }
        return cleanObj;
      };

      const candidatePartitions = [
        { name: 'core', data: deepCleanForFirestore(partitionCore) },
        { name: 'finances', data: deepCleanForFirestore(partitionFinances) },
        { name: 'committee_and_staff', data: deepCleanForFirestore(partitionCommitteeAndStaff) },
        { name: 'education_and_hifz', data: deepCleanForFirestore(partitionEducation) },
        { name: 'records_and_documents', data: deepCleanForFirestore(partitionRecords) },
        { name: 'files', data: deepCleanForFirestore(partitionFiles) },
      ];

      // Only write partitions whose content has actually changed
      const partitionsToSave = candidatePartitions.filter((p) => {
        const hash = computePartitionHash(p.data);
        if (this.lastPartitionHashes[p.name] === hash) {
          return false;
        }
        (p as any)._hash = hash;
        return true;
      });

      if (partitionsToSave.length === 0) {
        return true;
      }

      const saveResults = await Promise.allSettled(
        partitionsToSave.map((p) =>
          withTimeout(
            setDoc(doc(this.db, 'system_partitions', p.name), p.data),
            3500,
            `setDoc(${p.name})`
          )
        )
      );

      let allSucceeded = true;
      for (let i = 0; i < saveResults.length; i++) {
        const res = saveResults[i];
        const part = partitionsToSave[i] as any;
        if (res.status === 'fulfilled') {
          this.lastPartitionHashes[part.name] = part._hash;
        } else {
          allSucceeded = false;
          const errMsg = String(res.reason?.message || res.reason || '');
          if (errMsg.includes('TIMEOUT') || errMsg.includes('resource-exhausted') || errMsg.includes('Quota')) {
            // Activate 15-minute cooldown circuit breaker so local disk continues operating at full speed without hanging
            this.quotaExhaustedUntil = Date.now() + 15 * 60 * 1000;
            console.warn('[CloudPersistence] Firestore write quota/timeout reached; pausing cloud writes for 15m (local JSON persistence remains active).');
            break;
          }
        }
      }

      return allSucceeded;
    } catch (err) {
      console.warn('[CloudPersistence] Warning during cloud state sync:', (err as Error)?.message || err);
      return false;
    }
  }

  /**
   * Debounced sync to avoid thrashing Firestore during rapid operations.
   */
  queueSync(state: any) {
    if (!this.isAvailable) return;
    if (Date.now() < this.quotaExhaustedUntil) return;
    this.pendingState = state;

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(async () => {
      if (this.isSyncing) return;
      this.isSyncing = true;
      try {
        if (this.pendingState) {
          const toSync = this.pendingState;
          this.pendingState = null;
          await this.saveToCloud(toSync);
        }
      } finally {
        this.isSyncing = false;
        if (this.pendingState && Date.now() >= this.quotaExhaustedUntil) {
          this.queueSync(this.pendingState);
        }
      }
    }, 5000);
  }

  /**
   * Immediate synchronous/flush sync.
   */
  async flush(state: any): Promise<boolean> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    this.pendingState = null;
    return await this.saveToCloud(state);
  }

  /**
   * Dedicated, immediate Firestore persistence for a single mosque's branding, logo, letterhead, and signatures.
   * Stored in `mosque_branding/{mosqueId}` so it never competes with bulk partition limits and survives container restarts.
   */
  async saveMosqueBranding(mosque: any, logoDataUrl?: string): Promise<boolean> {
    if (!mosque || !mosque.id) return false;

    const cleanObj = (val: any): any => {
      if (val === undefined || val === null) return null;
      if (typeof val !== 'object') return val;
      if (val instanceof Date) return val.toISOString();
      if (Array.isArray(val)) return val.map(cleanObj).filter((v) => v !== undefined);
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) out[k] = cleanObj(v);
      }
      return out;
    };

    const resolvedLogoDataUrl =
      logoDataUrl !== undefined
        ? logoDataUrl
        : (mosque as any).logoDataUrl !== undefined
        ? (mosque as any).logoDataUrl
        : mosque.logoUrl && String(mosque.logoUrl).startsWith('data:')
        ? mosque.logoUrl
        : '';

    const brandingPayload = cleanObj({
      mosqueId: mosque.id,
      code: mosque.code || '',
      nameBn: mosque.nameBn || mosque.name || '',
      logoUrl: mosque.logoUrl || '',
      logoAssetId: mosque.logoAssetId || '',
      logoMetadata: mosque.logoMetadata || null,
      logoDataUrl: resolvedLogoDataUrl || '',
      photoUrl: mosque.photoUrl || '',
      coverPhotoUrl: mosque.coverPhotoUrl || '',
      presidentSignatureUrl: mosque.presidentSignatureUrl || '',
      secretarySignatureUrl: mosque.secretarySignatureUrl || '',
      letterheadSettings: mosque.letterheadSettings || {},
      qrSettings: mosque.qrSettings || {},
      receiptVoucherSettings: mosque.receiptVoucherSettings || {},
      updatedAt: mosque.updatedAt || new Date().toISOString(),
    });

    // 1. Always persist to a dedicated local JSON file as well
    try {
      const localBrandingPath = path.join(process.cwd(), 'data', 'mosque_branding_store.json');
      let store: Record<string, any> = {};
      if (fs.existsSync(localBrandingPath)) {
        try {
          store = JSON.parse(fs.readFileSync(localBrandingPath, 'utf8')) || {};
        } catch (_) {}
      }
      store[mosque.id] = brandingPayload;
      fs.writeFileSync(localBrandingPath, JSON.stringify(store, null, 2), 'utf8');
    } catch (_) {}

    if (!this.isAvailable) return false;

    try {
      await withTimeout(
        setDoc(doc(this.db, 'mosque_branding', String(mosque.id)), brandingPayload),
        4500,
        `setDoc(mosque_branding/${mosque.id})`
      );
      console.log(`[CloudPersistence] Dedicated branding & signatures committed to Firestore for mosque: ${mosque.id}`);
      return true;
    } catch (err) {
      console.warn(`[CloudPersistence] Warning saving mosque_branding/${mosque.id}:`, (err as Error)?.message || err);
      return false;
    }
  }

  /**
   * Loads dedicated branding & signature documents for all given mosque IDs from Firestore (and local store).
   */
  async loadAllMosqueBranding(mosqueIds: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    // 1. Load local branding store first
    try {
      const localBrandingPath = path.join(process.cwd(), 'data', 'mosque_branding_store.json');
      if (fs.existsSync(localBrandingPath)) {
        const localStore = JSON.parse(fs.readFileSync(localBrandingPath, 'utf8')) || {};
        for (const [mId, data] of Object.entries(localStore)) {
          if (data && typeof data === 'object') {
            result[mId] = data;
          }
        }
      }
    } catch (_) {}

    if (!this.isAvailable || !Array.isArray(mosqueIds) || mosqueIds.length === 0) {
      return result;
    }

    try {
      const uniqueIds = Array.from(new Set(mosqueIds.filter(Boolean)));
      await Promise.all(
        uniqueIds.map(async (mId) => {
          try {
            const snap = await withTimeout(
              getDoc(doc(this.db, 'mosque_branding', mId)),
              4500,
              `getDoc(mosque_branding/${mId})`
            );
            if (snap.exists()) {
              const cloudData = snap.data();
              const existing = result[mId];
              if (!existing) {
                result[mId] = cloudData;
              } else {
                const localTime = new Date(existing.updatedAt || 0).getTime();
                const cloudTime = new Date(cloudData.updatedAt || 0).getTime();
                result[mId] = cloudTime >= localTime ? { ...existing, ...cloudData } : { ...cloudData, ...existing };
              }
            }
          } catch (_) {}
        })
      );
    } catch (_) {}

    return result;
  }
}

export const cloudPersistence = new CloudPersistenceService();

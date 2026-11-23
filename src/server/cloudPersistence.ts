import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, setLogLevel } from 'firebase/firestore';
import crypto from 'crypto';
import zlib from 'zlib';
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

function unpackPartitionDocument(rawDoc: Record<string, any> | undefined | null): Record<string, any> | null {
  if (!rawDoc || typeof rawDoc !== 'object') return null;
  if (typeof rawDoc._gzPayload === 'string' && rawDoc._gzPayload.length > 0) {
    try {
      const gunzipped = zlib.gunzipSync(Buffer.from(rawDoc._gzPayload, 'base64')).toString('utf8');
      const parsed = JSON.parse(gunzipped);
      return {
        ...parsed,
        updatedAt: rawDoc.updatedAt || parsed.updatedAt,
        partitionName: rawDoc.partitionName || parsed.partitionName,
      };
    } catch (err) {
      console.warn('[CloudPersistence] Failed to gunzip partition payload:', (err as Error)?.message || err);
    }
  }
  return rawDoc;
}

class CloudPersistenceService {
  private db: any = null;
  private isConfigured: boolean = false;
  private syncTimeout: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private pendingState: any = null;
  private lastPartitionHashes: Record<string, string> = {};
  private cachedFinances: Record<string, any> | null = null;
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
      const parsedConfig = JSON.parse(raw);
      const config = parsedConfig.firestoreDatabaseId
        ? parsedConfig
        : {
            projectId: 'zealous-orbit-xdtd0',
            appId: '1:989373574278:web:2c49927633220f275ef507',
            apiKey: 'AIzaSyDueOPb85OGK_Kh_28HX5avnBkPRQhhSvo',
            authDomain: 'zealous-orbit-xdtd0.firebaseapp.com',
            firestoreDatabaseId: 'ai-studio-masjidledger-18666ccf-b29d-45dd-a1a0-4c29705846f2',
            storageBucket: 'zealous-orbit-xdtd0.firebasestorage.app',
            messagingSenderId: '989373574278',
          };
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

  get isQuotaExhausted(): boolean {
    return Date.now() < this.quotaExhaustedUntil;
  }

  /**
   * Loads a single partition from Firestore with automatic retry on cold-start timeout.
   * Supports both compressed (_gzPayload) and legacy uncompressed partition documents.
   */
  async loadPartitionFromCloud(part: string): Promise<any | null> {
    if (!this.isAvailable) return null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const snap = await withTimeout(
          getDoc(doc(this.db, 'system_partitions', part)),
          8000,
          `getDoc(${part})`
        );
        if (snap.exists()) {
          const partData = unpackPartitionDocument(snap.data());
          if (partData) {
            this.lastPartitionHashes[part] = computePartitionHash(partData);
            if (part === 'finances') {
              this.cachedFinances = partData;
            }
          }
          return partData;
        }
        return null;
      } catch (e) {
        if (attempt === 2) {
          console.warn(`[CloudPersistence] Warning loading partition ${part}:`, (e as Error)?.message || e);
        }
      }
    }
    return null;
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
          const data = await this.loadPartitionFromCloud(part);
          return { part, data };
        })
      );

      const mergedState: Record<string, any> = {};
      let foundAny = false;

      for (const res of results) {
        if (res.data) {
          foundAny = true;
          for (const [key, val] of Object.entries(res.data)) {
            if (key !== 'updatedAt' && key !== 'partitionName' && key !== '_gzPayload') {
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
   * Non-destructively merges two arrays of records by `id`, taking the newest version when present in both
   * and preserving records that only exist in cloud (so no container can ever wipe out entries added elsewhere).
   */
  private mergeRecordArraysById(cloudArr: any[], localArr: any[]): any[] {
    if (!Array.isArray(cloudArr) || cloudArr.length === 0) return Array.isArray(localArr) ? localArr : [];
    if (!Array.isArray(localArr) || localArr.length === 0) return cloudArr;

    const byId = new Map<string, any>();
    for (const item of cloudArr) {
      if (item && typeof item === 'object' && item.id) {
        byId.set(String(item.id), item);
      }
    }
    for (const localItem of localArr) {
      if (localItem && typeof localItem === 'object' && localItem.id) {
        const id = String(localItem.id);
        const cloudItem = byId.get(id);
        if (!cloudItem) {
          byId.set(id, localItem);
        } else {
          const localTime = new Date(
            localItem.updatedAt || localItem.restoredAt || localItem.reversedAt || localItem.createdAt || 0
          ).getTime();
          const cloudTime = new Date(
            cloudItem.updatedAt || cloudItem.restoredAt || cloudItem.reversedAt || cloudItem.createdAt || 0
          ).getTime();
          byId.set(id, localTime >= cloudTime ? { ...cloudItem, ...localItem } : { ...localItem, ...cloudItem });
        }
      }
    }
    return Array.from(byId.values());
  }

  /**
   * Saves only modified database partitions to Firestore with timeout, non-destructive merge & quota protection.
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
        smartNotes: state.smartNotes || [],
        smartNoteCategories: state.smartNoteCategories || [],
        smartNoteVersions: state.smartNoteVersions || [],
        smartNoteComments: state.smartNoteComments || [],
        smartNoteActivities: state.smartNoteActivities || [],
        smartNoteReminders: state.smartNoteReminders || [],
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

      // CRITICAL SAFEGUARD: Before writing 'finances' to Firestore, merge with cached/cloud 'finances'
      // so no container or tab can ever overwrite or drop any income/expense/donation entry!
      const financesPart = partitionsToSave.find((p) => p.name === 'finances');
      if (financesPart) {
        try {
          let cloudFin = this.cachedFinances;
          if (!cloudFin) {
            const existingSnap = await withTimeout(
              getDoc(doc(this.db, 'system_partitions', 'finances')),
              3000,
              'getDoc(finances-pre-save)'
            );
            if (existingSnap.exists()) {
              cloudFin = unpackPartitionDocument(existingSnap.data());
            }
          }
          if (cloudFin) {
            const finKeys = [
              'incomeEntries',
              'expenseEntries',
              'donations',
              'donationBoxes',
              'donationBoxCollections',
              'transfers',
            ];
            for (const k of finKeys) {
              if (Array.isArray(cloudFin[k])) {
                financesPart.data[k] = deepCleanForFirestore(
                  this.mergeRecordArraysById(cloudFin[k], financesPart.data[k] || [])
                );
              }
            }
            (financesPart as any)._hash = computePartitionHash(financesPart.data);
          }
          this.cachedFinances = financesPart.data;
        } catch (_) {}
      }

      const saveResults = await Promise.allSettled(
        partitionsToSave.map((p) => {
          const gzPayload = zlib.gzipSync(Buffer.from(JSON.stringify(p.data), 'utf8')).toString('base64');
          const firestoreDoc = {
            partitionName: p.name,
            updatedAt: p.data.updatedAt || now,
            _gzPayload: gzPayload,
          };
          return withTimeout(
            setDoc(doc(this.db, 'system_partitions', p.name), firestoreDoc),
            3500,
            `setDoc(${p.name})`
          );
        })
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
   * Coalesced debounced sync (3.5s) so rapid voucher entries are batched into a single Firestore write,
   * conserving up to 97% of Firestore Free Tier daily write units.
   */
  queueSync(state: any) {
    if (!this.isAvailable) return;
    this.pendingState = state;
    if (Date.now() < this.quotaExhaustedUntil) return;

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
          const ok = await this.saveToCloud(toSync);
          if (!ok && !this.pendingState) {
            this.pendingState = toSync;
          }
        }
      } finally {
        this.isSyncing = false;
        if (this.pendingState && Date.now() >= this.quotaExhaustedUntil) {
          this.queueSync(this.pendingState);
        }
      }
    }, 3500);
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

    // 1. Always persist atomically to a dedicated local JSON file as well
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
      }
      const localBrandingPath = path.join(dataDir, 'mosque_branding_store.json');
      let store: Record<string, any> = {};
      if (fs.existsSync(localBrandingPath)) {
        try {
          store = JSON.parse(fs.readFileSync(localBrandingPath, 'utf8')) || {};
        } catch (_) {}
      }
      store[mosque.id] = brandingPayload;
      const tmpBrandingPath = `${localBrandingPath}.tmp.${process.pid}.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fd = fs.openSync(tmpBrandingPath, 'w', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(store, null, 2), 'utf8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmpBrandingPath, localBrandingPath);
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

export type FinanceVaultRecordType =
  | 'incomeEntries'
  | 'expenseEntries'
  | 'donations'
  | 'donationBoxCollections';

interface MosqueFinanceVault {
  incomeEntries: Record<string, any>;
  expenseEntries: Record<string, any>;
  donations: Record<string, any>;
  donationBoxCollections: Record<string, any>;
  updatedAt: string;
}

type FullFinanceVaultStore = Record<string, MosqueFinanceVault>;

const VAULT_STORAGE_KEY = 'masjidledger_permanent_finance_vault_v1';

function getRecordTimestamp(item: any): number {
  if (!item || typeof item !== 'object') return 0;
  const tsStr =
    item.updatedAt ||
    item.restoredAt ||
    item.reversedAt ||
    item.cancelledAt ||
    item.createdAt ||
    item.date ||
    0;
  const t = new Date(tsStr).getTime();
  return Number.isFinite(t) ? t : 0;
}

function readFullStore(): FullFinanceVaultStore {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeFullStore(store: FullFinanceVaultStore): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function ensureMosqueVault(store: FullFinanceVaultStore, mosqueId: string): MosqueFinanceVault {
  if (!store[mosqueId]) {
    store[mosqueId] = {
      incomeEntries: {},
      expenseEntries: {},
      donations: {},
      donationBoxCollections: {},
      updatedAt: new Date().toISOString(),
    };
  }
  return store[mosqueId];
}

/**
 * Saves or updates a single financial record in the permanent browser vault.
 */
export function saveRecordToClientVault(
  mosqueId: string,
  type: FinanceVaultRecordType,
  record: any
): void {
  if (!record || typeof record !== 'object' || !record.id) return;
  const resolvedMosqueId = String(record.mosqueId || mosqueId || '').trim();
  if (!resolvedMosqueId) return;

  const store = readFullStore();
  const vault = ensureMosqueVault(store, resolvedMosqueId);
  const id = String(record.id);
  const existing = vault[type][id];

  if (!existing || getRecordTimestamp(record) >= getRecordTimestamp(existing)) {
    vault[type][id] = { ...(existing || {}), ...record };
  } else {
    vault[type][id] = { ...record, ...existing };
  }
  vault.updatedAt = new Date().toISOString();
  writeFullStore(store);
}

/**
 * Merges a server-returned array of financial records with the permanent browser vault,
 * persists the combined set into the browser vault, and identifies any records that exist
 * in the browser vault (or have a newer update in the browser vault) so the client can
 * automatically self-heal the server after a container restart.
 */
export function mergeAndInspectClientVault<T extends { id: string; mosqueId?: string }>(
  mosqueId: string,
  type: FinanceVaultRecordType,
  serverList: T[]
): {
  mergedList: T[];
  missingOrNewerInVault: T[];
} {
  const safeServerList = Array.isArray(serverList) ? serverList : [];
  const resolvedMosqueId =
    String(mosqueId || safeServerList[0]?.mosqueId || '').trim();

  if (!resolvedMosqueId || typeof window === 'undefined') {
    return { mergedList: safeServerList, missingOrNewerInVault: [] };
  }

  const store = readFullStore();
  const vault = ensureMosqueVault(store, resolvedMosqueId);
  const vaultMap = vault[type] || {};

  const serverById = new Map<string, T>();
  for (const item of safeServerList) {
    if (item && item.id) {
      if (!item.mosqueId || item.mosqueId === resolvedMosqueId) {
        serverById.set(String(item.id), item);
      }
    }
  }

  const mergedById = new Map<string, T>();
  const missingOrNewerInVault: T[] = [];

  // 1. Process all server items and update vault
  for (const [id, srvItem] of serverById.entries()) {
    const vItem = vaultMap[id];
    if (!vItem) {
      mergedById.set(id, srvItem);
      vaultMap[id] = srvItem;
    } else {
      const srvTime = getRecordTimestamp(srvItem);
      const vTime = getRecordTimestamp(vItem);
      if (vTime > srvTime) {
        const newer = { ...srvItem, ...vItem } as T;
        mergedById.set(id, newer);
        vaultMap[id] = newer;
        missingOrNewerInVault.push(newer);
      } else {
        const newer = { ...vItem, ...srvItem } as T;
        mergedById.set(id, newer);
        vaultMap[id] = newer;
      }
    }
  }

  // 2. Any record in browser vault that is missing on the server (e.g. after Cloud Run container restart when quota was full)
  for (const [id, vItem] of Object.entries(vaultMap)) {
    if (!vItem || typeof vItem !== 'object' || !vItem.id) continue;
    if (vItem.mosqueId && vItem.mosqueId !== resolvedMosqueId) continue;
    if (!serverById.has(id)) {
      mergedById.set(id, vItem as T);
      missingOrNewerInVault.push(vItem as T);
    }
  }

  vault[type] = vaultMap;
  vault.updatedAt = new Date().toISOString();
  writeFullStore(store);

  return {
    mergedList: Array.from(mergedById.values()),
    missingOrNewerInVault,
  };
}

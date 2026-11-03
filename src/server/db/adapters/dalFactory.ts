/**
 * MASJIDLEDGER PRO v2.6 — DATA ACCESS LAYER FACTORY
 * Task ID: ML-V26-DAL-PHASE1B-POSTGRES-ADAPTER
 *
 * Controlled adapter factory supporting runtime selection between JSON and PostgreSQL.
 * By default, JSON remains the authoritative active storage for live application routes.
 * The PostgreSQL adapter can be explicitly instantiated by isolated test suites or opt-in configs.
 */

import pg from 'pg';
import {
  IDataAccessLayer,
  IReadOnlyDataAccessLayer,
  IScopedMutationDataAccessLayer,
  DALOptions,
} from '../interfaces/IDataAccessLayer';
import { JsonStorageAdapter, JsonDataSourceContract } from './JsonStorageAdapter';
import { PostgresStorageAdapter } from './PostgresStorageAdapter';

export type StorageAdapterType = 'JSON' | 'POSTGRES';

export interface CreateDalOptions {
  /** Desired storage adapter type. Defaults to 'JSON' to preserve active application storage. */
  adapterType?: StorageAdapterType;
  /** Scoped tenant options */
  dalOptions?: DALOptions;
  /** Optional custom JSON data source for isolated test harnesses */
  jsonDataSource?: JsonDataSourceContract;
  /** Optional custom PostgreSQL pool for isolated test harnesses */
  postgresPool?: pg.Pool;
  /** Optional active PostgreSQL client for transaction-bound scopes */
  postgresClient?: pg.PoolClient;
}

/**
 * Factory function creating appropriate DAL implementation.
 * Guarantees zero automatic/accidental PostgreSQL activation in live routes.
 */
export function createDataAccessLayer(
  config: CreateDalOptions = {}
): IDataAccessLayer | IScopedMutationDataAccessLayer {
  const type = config.adapterType || 'JSON';

  if (type === 'POSTGRES') {
    return new PostgresStorageAdapter(config.dalOptions, config.postgresPool, config.postgresClient);
  }

  // Active production and development default: JsonStorageAdapter
  return new JsonStorageAdapter(config.dalOptions, config.jsonDataSource);
}

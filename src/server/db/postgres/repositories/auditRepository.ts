import pg from 'pg';
import { AuditLog } from '../../../../types';

export class PostgresAuditRepository {
  /**
   * Append an audit log entry atomically into PostgreSQL.
   * Hard DELETE and UPDATE are permanently prohibited.
   */
  async appendAuditLog(client: pg.PoolClient, log: AuditLog): Promise<void> {
    await client.query(
      `INSERT INTO audit_logs (
        id, mosque_id, user_id, user_name, user_role, action, module, category,
        record_id, voucher_number, details, previous_state, new_state, timestamp,
        ip_address, device, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        log.id,
        log.mosqueId,
        log.userId,
        log.userName,
        log.userRole,
        log.action,
        log.module,
        log.category || null,
        log.recordId || null,
        log.voucherNumber || null,
        log.details,
        log.previousState || null,
        log.newState || null,
        log.timestamp || new Date().toISOString(),
        log.ipAddress || '127.0.0.1',
        log.device || null,
        log.status || 'SUCCESS',
      ]
    );
  }
}

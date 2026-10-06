import pg from 'pg';
import { getPostgresPool } from '../client';
import { withTransaction } from '../transaction';

export interface PostgresCommitteeTermRow {
  id: string;
  mosque_id: string;
  term_name: string;
  term_name_bn: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  approval_document_url: string | null;
  is_current: boolean;
  created_at: Date;
}

export interface PostgresCommitteeMemberRow {
  id: string;
  mosque_id: string;
  term_id: string;
  person_id: string;
  name: string;
  designation: string;
  designation_bn: string;
  role: string | null;
  phone: string;
  nid: string | null;
  photo_url: string | null;
  status: 'ACTIVE' | 'RESIGNED' | 'REMOVED';
  join_date: string;
  exit_date: string | null;
  created_at: Date;
}

export interface PostgresCommitteeMeetingRow {
  id: string;
  mosque_id: string;
  term_id: string;
  meeting_number: string;
  title: string;
  meeting_date: string;
  meeting_time: string | null;
  venue: string | null;
  agenda: string;
  minutes: string | null;
  presided_by: string | null;
  attendee_ids: any;
  status: string;
  resolutions_count: number;
  created_at: Date;
}

export interface PostgresMeetingResolutionRow {
  id: string;
  mosque_id: string;
  meeting_id: string;
  resolution_number: string;
  agenda_item: string;
  decision: string;
  responsibility_person_id: string | null;
  deadline: string | null;
  budget_allocated: string;
  status: string;
  notes: string | null;
  created_at: Date;
}

export interface PostgresCommitteeActionPlanRow {
  id: string;
  mosque_id: string;
  plan_number: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  start_date: string;
  target_date: string | null;
  budget: string;
  expense_allocated: string;
  assigned_to_ids: any;
  created_at: Date;
}

export interface CreateCommitteeTermDTO {
  id: string;
  mosqueId: string;
  termName: string;
  termNameBn: string;
  startDate: string;
  endDate: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  approvalDocumentUrl?: string | null;
  isCurrent?: boolean;
  userId?: string;
  userName?: string;
}

export interface CreateCommitteeMemberDTO {
  id: string;
  mosqueId: string;
  termId: string;
  personId: string;
  name: string;
  designation: string;
  designationBn: string;
  role?: string | null;
  phone: string;
  nid?: string | null;
  photoUrl?: string | null;
  status?: 'ACTIVE' | 'RESIGNED' | 'REMOVED';
  joinDate: string;
  exitDate?: string | null;
}

export interface CreateCommitteeMeetingDTO {
  id: string;
  mosqueId: string;
  termId: string;
  meetingNumber: string;
  title: string;
  meetingDate: string;
  meetingTime?: string | null;
  venue?: string | null;
  agenda: string;
  minutes?: string | null;
  presidedBy?: string | null;
  attendeeIds?: string[];
  status?: string;
}

export interface CreateMeetingResolutionDTO {
  id: string;
  mosqueId: string;
  meetingId: string;
  resolutionNumber: string;
  agendaItem: string;
  decision: string;
  responsibilityPersonId?: string | null;
  deadline?: string | null;
  budgetAllocated?: number | string;
  status?: string;
  notes?: string | null;
}

export interface CreateActionPlanDTO {
  id: string;
  mosqueId: string;
  planNumber: string;
  title: string;
  description?: string | null;
  priority?: string;
  status?: string;
  startDate: string;
  targetDate?: string | null;
  budget?: number | string;
  expenseAllocated?: number | string;
  assignedToIds?: string[];
}

export class PostgresCommitteeRepository {
  constructor(private pool: pg.Pool = getPostgresPool()) {}

  /**
   * Get the single active/current committee term for a mosque.
   */
  async getActiveTerm(
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeTermRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresCommitteeTermRow>(
      `SELECT * FROM committee_terms
       WHERE mosque_id = $1 AND (status = 'ACTIVE' OR is_current = true)
       LIMIT 1`,
      [mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * Get a committee term by ID and mosqueId.
   */
  async getTermById(
    termId: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeTermRow | null> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresCommitteeTermRow>(
      `SELECT * FROM committee_terms WHERE id = $1 AND mosque_id = $2`,
      [termId, mosqueId]
    );
    return res.rows[0] || null;
  }

  /**
   * List all committee terms for a mosque.
   */
  async listTermsByMosque(
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeTermRow[]> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresCommitteeTermRow>(
      `SELECT * FROM committee_terms WHERE mosque_id = $1 ORDER BY start_date DESC`,
      [mosqueId]
    );
    return res.rows;
  }

  /**
   * Create a committee term.
   * STRICT RULE: Enforces only ONE active term per mosque.
   */
  async createTerm(
    dto: CreateCommitteeTermDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresCommitteeTermRow> {
    const executeLogic = async (client: pg.PoolClient) => {
      const termStatus = dto.status || 'ACTIVE';
      const isCurrent = dto.isCurrent ?? (termStatus === 'ACTIVE');

      // Database-level concurrency serialization: Lock mosque row FOR UPDATE
      if (termStatus === 'ACTIVE' || isCurrent) {
        await client.query(`SELECT id FROM mosques WHERE id = $1 FOR UPDATE`, [dto.mosqueId]);

        const existingActive = await this.getActiveTerm(dto.mosqueId, client);
        if (existingActive) {
          throw new Error(
            `[CommitteeRepository] Active committee term already exists for mosque ${dto.mosqueId} (Term ID: ${existingActive.id}). Only one ACTIVE term permitted at a time.`
          );
        }
      }

      const query = `
        INSERT INTO committee_terms (
          id, mosque_id, term_name, term_name_bn, start_date, end_date,
          status, approval_document_url, is_current, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
        )
        RETURNING *
      `;

      const params = [
        dto.id,
        dto.mosqueId,
        dto.termName,
        dto.termNameBn,
        dto.startDate,
        dto.endDate,
        termStatus,
        dto.approvalDocumentUrl || null,
        isCurrent,
      ];

      const res = await client.query<PostgresCommitteeTermRow>(query, params);
      const createdTerm = res.rows[0];

      if (dto.userId) {
        await client.query(`
          INSERT INTO audit_logs (
            id, mosque_id, user_id, user_name, user_role, action,
            entity_type, entity_id, entity_voucher_or_name, details,
            ip_address, timestamp
          ) VALUES (
            $1, $2, $3, $4, 'ADMIN', 'CREATE', 'COMMITTEE_TERM', $5, $6, $7, '127.0.0.1', NOW()
          )
        `, [
          `aud-com-term-${Date.now()}`,
          dto.mosqueId,
          dto.userId,
          dto.userName || 'Admin',
          createdTerm.id,
          createdTerm.term_name,
          `Created committee term '${createdTerm.term_name}'`,
        ]);
      }

      return createdTerm;
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Add a member to a committee term.
   */
  async addMember(
    dto: CreateCommitteeMemberDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresCommitteeMemberRow> {
    const executeLogic = async (client: pg.PoolClient) => {
      // Validate term belongs to mosque
      const term = await this.getTermById(dto.termId, dto.mosqueId, client);
      if (!term) {
        throw new Error(`[CommitteeRepository] Committee term ${dto.termId} not found for mosque ${dto.mosqueId}`);
      }

      const query = `
        INSERT INTO committee_members (
          id, mosque_id, term_id, person_id, name, designation,
          designation_bn, role, phone, nid, photo_url, status,
          join_date, exit_date, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
        )
        RETURNING *
      `;

      const params = [
        dto.id,
        dto.mosqueId,
        dto.termId,
        dto.personId,
        dto.name,
        dto.designation,
        dto.designationBn,
        dto.role || null,
        dto.phone,
        dto.nid || null,
        dto.photoUrl || null,
        dto.status || 'ACTIVE',
        dto.joinDate,
        dto.exitDate || null,
      ];

      const res = await client.query<PostgresCommitteeMemberRow>(query, params);
      return res.rows[0];
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * List members for a specific committee term.
   */
  async listMembersByTerm(
    termId: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeMemberRow[]> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresCommitteeMemberRow>(
      `SELECT * FROM committee_members WHERE term_id = $1 AND mosque_id = $2 ORDER BY created_at ASC`,
      [termId, mosqueId]
    );
    return res.rows;
  }

  /**
   * Create a committee meeting.
   */
  async createMeeting(
    dto: CreateCommitteeMeetingDTO,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeMeetingRow> {
    const executor = client || this.pool;
    const query = `
      INSERT INTO committee_meetings (
        id, mosque_id, term_id, meeting_number, title, meeting_date,
        meeting_time, venue, agenda, minutes, presided_by, attendee_ids,
        status, resolutions_count, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, 0, NOW()
      )
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.mosqueId,
      dto.termId,
      dto.meetingNumber,
      dto.title,
      dto.meetingDate,
      dto.meetingTime || null,
      dto.venue || null,
      dto.agenda,
      dto.minutes || null,
      dto.presidedBy || null,
      JSON.stringify(dto.attendeeIds || []),
      dto.status || 'SCHEDULED',
    ];

    const res = await executor.query<PostgresCommitteeMeetingRow>(query, params);
    return res.rows[0];
  }

  /**
   * List meetings for a committee term.
   */
  async listMeetingsByTerm(
    termId: string,
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeMeetingRow[]> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresCommitteeMeetingRow>(
      `SELECT * FROM committee_meetings WHERE term_id = $1 AND mosque_id = $2 ORDER BY meeting_date DESC`,
      [termId, mosqueId]
    );
    return res.rows;
  }

  /**
   * Create a meeting resolution.
   */
  async createResolution(
    dto: CreateMeetingResolutionDTO,
    clientOverride?: pg.PoolClient
  ): Promise<PostgresMeetingResolutionRow> {
    const executeLogic = async (client: pg.PoolClient) => {
      const budget = dto.budgetAllocated !== undefined ? String(dto.budgetAllocated) : '0.00';

      const query = `
        INSERT INTO meeting_resolutions (
          id, mosque_id, meeting_id, resolution_number, agenda_item,
          decision, responsibility_person_id, deadline, budget_allocated,
          status, notes, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
        )
        RETURNING *
      `;

      const params = [
        dto.id,
        dto.mosqueId,
        dto.meetingId,
        dto.resolutionNumber,
        dto.agendaItem,
        dto.decision,
        dto.responsibilityPersonId || null,
        dto.deadline || null,
        budget,
        dto.status || 'PENDING',
        dto.notes || null,
      ];

      const res = await client.query<PostgresMeetingResolutionRow>(query, params);

      // Increment resolution counter on meeting
      await client.query(
        `UPDATE committee_meetings SET resolutions_count = resolutions_count + 1 WHERE id = $1 AND mosque_id = $2`,
        [dto.meetingId, dto.mosqueId]
      );

      return res.rows[0];
    };

    if (clientOverride) {
      return executeLogic(clientOverride);
    } else {
      return withTransaction(executeLogic, this.pool);
    }
  }

  /**
   * Create an action plan.
   */
  async createActionPlan(
    dto: CreateActionPlanDTO,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeActionPlanRow> {
    const executor = client || this.pool;
    const budget = dto.budget !== undefined ? String(dto.budget) : '0.00';
    const expense = dto.expenseAllocated !== undefined ? String(dto.expenseAllocated) : '0.00';

    const query = `
      INSERT INTO committee_action_plans (
        id, mosque_id, plan_number, title, description, priority,
        status, start_date, target_date, budget, expense_allocated,
        assigned_to_ids, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW()
      )
      RETURNING *
    `;

    const params = [
      dto.id,
      dto.mosqueId,
      dto.planNumber,
      dto.title,
      dto.description || null,
      dto.priority || 'NORMAL',
      dto.status || 'IN_PROGRESS',
      dto.startDate,
      dto.targetDate || null,
      budget,
      expense,
      JSON.stringify(dto.assignedToIds || []),
    ];

    const res = await executor.query<PostgresCommitteeActionPlanRow>(query, params);
    return res.rows[0];
  }

  /**
   * List action plans for a mosque.
   */
  async listActionPlansByMosque(
    mosqueId: string,
    client?: pg.PoolClient
  ): Promise<PostgresCommitteeActionPlanRow[]> {
    const executor = client || this.pool;
    const res = await executor.query<PostgresCommitteeActionPlanRow>(
      `SELECT * FROM committee_action_plans WHERE mosque_id = $1 ORDER BY created_at DESC`,
      [mosqueId]
    );
    return res.rows;
  }

  /**
   * Authoritative Central Document & Archive integration.
   * Links an existing canonical Central Document to a Committee Term (related_entity_type = 'COMMITTEE_TERM').
   */
  async linkCentralDocument(
    mosqueId: string,
    termId: string,
    centralDocId: string,
    client?: pg.PoolClient
  ): Promise<void> {
    const executor = client || this.pool;
    await executor.query(
      `UPDATE central_documents
       SET related_entity_type = 'COMMITTEE_TERM',
           related_entity_id = $1,
           updated_at = NOW()
       WHERE id = $2 AND mosque_id = $3`,
      [termId, centralDocId, mosqueId]
    );
  }

  /**
   * Get all authoritative Central Documents linked to a committee term.
   */
  async getLinkedCentralDocuments(
    mosqueId: string,
    termId: string,
    client?: pg.PoolClient
  ): Promise<any[]> {
    const executor = client || this.pool;
    const res = await executor.query(
      `SELECT id, mosque_id, tracking_code, title, title_bn, category, file_url,
              related_entity_type, related_entity_id, created_at
       FROM central_documents
       WHERE mosque_id = $1 AND related_entity_type = 'COMMITTEE_TERM' AND related_entity_id = $2
       ORDER BY created_at DESC`,
      [mosqueId, termId]
    );
    return res.rows;
  }
}

/**
 * MASJIDLEDGER PRO v2.6 — AUTHORITATIVE POSTGRESQL 99-TABLE DDL SCHEMA
 * Generated strictly from Phase 1A Closed Specification.
 *
 * Accounting Architecture: SINGLE DATASET LEDGER / ACCOUNT-BALANCE ARCHITECTURE
 * Money Columns Precision: NUMERIC(14,2)
 * Total Tables: Exactly 99 Tables in Strict Topological Order (Layers 1 to 11)
 */

export const POSTGRES_99_TABLES_DDL_SQL = `
-- ============================================================================
-- LAYER 1: Core Roots & System Engine (4 tables)
-- ============================================================================

-- 1. mosques (Root Tenant)
CREATE TABLE IF NOT EXISTS mosques (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  contact_number VARCHAR(32) NOT NULL,
  email VARCHAR(255) UNIQUE,
  logo_url TEXT,
  established_year VARCHAR(16),
  registration_number VARCHAR(64),
  division VARCHAR(64),
  district VARCHAR(64),
  upazila VARCHAR(64),
  postal_code VARCHAR(32),
  letterhead_settings JSONB,
  prayer_settings JSONB,
  public_portal_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. schema_migrations (System Migration Ledger)
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum VARCHAR(64)
);

-- 3. audit_logs (Immutable Forensic Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(32) NOT NULL,
  action VARCHAR(32) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64),
  entity_voucher_or_name VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(64),
  meta_json JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_mosque_time ON audit_logs(mosque_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(mosque_id, entity_type, entity_id);

-- 4. idempotency_records (48-hour API Replay Protection)
CREATE TABLE IF NOT EXISTS idempotency_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) REFERENCES mosques(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(128) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_idempotency_key UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_records(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_records(expires_at);

-- ============================================================================
-- LAYER 2: Base System Settings & Master Catalogs (10 tables)
-- ============================================================================

-- 5. users (System Users & Authentication)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  username VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255),
  password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_mosque_phone UNIQUE (mosque_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_users_mosque_role ON users(mosque_id, role);

-- 6. central_documents (Authoritative Document Repository Metadata)
CREATE TABLE IF NOT EXISTS central_documents (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  tracking_code VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255),
  category VARCHAR(64) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(32),
  file_size_bytes BIGINT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by VARCHAR(64),
  verification_date TIMESTAMPTZ,
  confidentiality_level VARCHAR(32) NOT NULL DEFAULT 'INTERNAL',
  tags JSONB DEFAULT '[]'::jsonb,
  related_entity_type VARCHAR(64),
  related_entity_id VARCHAR(64),
  description TEXT,
  uploaded_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_central_docs_tracking UNIQUE (mosque_id, tracking_code)
);
CREATE INDEX IF NOT EXISTS idx_central_docs_entity ON central_documents(mosque_id, related_entity_type, related_entity_id);

-- 7. uploaded_files (General Uploaded File Attachments)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  uploaded_by VARCHAR(64),
  module VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. qr_codes (QR Quick Entry Tokens)
CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  destination_type VARCHAR(64) NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  description TEXT,
  target_record_id VARCHAR(64),
  target_record_code VARCHAR(64),
  target_custom_title VARCHAR(255),
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. area_masters (Geographic Mahallu Divisions)
CREATE TABLE IF NOT EXISTS area_masters (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  area_code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_areas_mosque_code UNIQUE (mosque_id, area_code)
);

-- 10. legal_courts (Court Directory & Tribunals)
CREATE TABLE IF NOT EXISTS legal_courts (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  court_code VARCHAR(32) NOT NULL,
  court_name VARCHAR(255) NOT NULL,
  court_name_bn VARCHAR(255) NOT NULL,
  court_type VARCHAR(64) NOT NULL,
  district VARCHAR(64) NOT NULL,
  division VARCHAR(64),
  bench_name VARCHAR(255),
  room_number VARCHAR(32),
  address TEXT,
  contact_number VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_legal_courts_code UNIQUE (mosque_id, court_code)
);

-- 11. legal_lawyers (Retained & Case-Based Advocates)
CREATE TABLE IF NOT EXISTS legal_lawyers (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  lawyer_code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  bar_association VARCHAR(255) NOT NULL,
  registration_number VARCHAR(64),
  chamber_address TEXT,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255),
  specialization VARCHAR(128),
  retainership_type VARCHAR(32) NOT NULL DEFAULT 'CASE_BASED',
  retainer_fee NUMERIC(14,2) DEFAULT 0.00,
  fee_per_hearing NUMERIC(14,2) DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_legal_lawyers_code UNIQUE (mosque_id, lawyer_code)
);

-- 12. advisory_council_terms (Advisory Council Tenures)
CREATE TABLE IF NOT EXISTS advisory_council_terms (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. library_categories (Book Classification Categories)
CREATE TABLE IF NOT EXISTS library_categories (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  category_code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lib_cats_code UNIQUE (mosque_id, category_code)
);

-- 14. library_rooms (Library Halls & Spatial Rooms)
CREATE TABLE IF NOT EXISTS library_rooms (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  room_code VARCHAR(32) NOT NULL,
  room_name_bn VARCHAR(255) NOT NULL,
  room_name_en VARCHAR(255),
  floor_number INTEGER DEFAULT 1,
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lib_rooms_code UNIQUE (mosque_id, room_code)
);

-- ============================================================================
-- LAYER 3: Hierarchies, Accounts & Secondary Masters (9 tables)
-- ============================================================================

-- 15. family_masters (Household Units)
CREATE TABLE IF NOT EXISTS family_masters (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  area_id VARCHAR(64) NOT NULL REFERENCES area_masters(id) ON DELETE RESTRICT,
  family_code VARCHAR(32) NOT NULL,
  head_of_family_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  contact_phone VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_family_code UNIQUE (mosque_id, family_code)
);

-- 16. advisor_members (Council Dignitaries & Scholars)
CREATE TABLE IF NOT EXISTS advisor_members (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_id VARCHAR(64) NOT NULL REFERENCES advisory_council_terms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(128) NOT NULL,
  phone VARCHAR(32),
  address TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. account_heads (Chart of Accounts - Single Table Hierarchy)
CREATE TABLE IF NOT EXISTS account_heads (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  parent_id VARCHAR(64),
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_account_heads_code UNIQUE (mosque_id, code),
  CONSTRAINT chk_no_self_parent CHECK (id <> parent_id)
);
ALTER TABLE account_heads DROP CONSTRAINT IF EXISTS fk_account_heads_parent;
ALTER TABLE account_heads ADD CONSTRAINT fk_account_heads_parent FOREIGN KEY (parent_id) REFERENCES account_heads(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_account_heads_lookup ON account_heads(mosque_id, type, is_active);

-- 18. financial_accounts (Liquid Asset & Bank Accounts)
CREATE TABLE IF NOT EXISTS financial_accounts (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  name VARCHAR(255),
  name_bn VARCHAR(255) NOT NULL,
  account_type VARCHAR(16) NOT NULL CHECK (account_type IN ('CASH', 'BANK', 'MFS')),
  bank_name VARCHAR(128),
  branch_name VARCHAR(128),
  account_number VARCHAR(64),
  mfs_provider VARCHAR(64),
  mobile_number VARCHAR(32),
  routing_number VARCHAR(32),
  contact_person VARCHAR(128),
  notes TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  opening_balance_date DATE,
  opening_balance_type VARCHAR(16) DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
  opening_balance_source VARCHAR(64),
  opening_balance_note TEXT,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_accounts_lookup ON financial_accounts(mosque_id, account_type, status);

-- 19. backup_settings (Auto-Backup Preferences per Mosque)
CREATE TABLE IF NOT EXISTS backup_settings (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL UNIQUE REFERENCES mosques(id) ON DELETE CASCADE,
  auto_backup_enabled BOOLEAN NOT NULL DEFAULT true,
  frequency VARCHAR(32) NOT NULL DEFAULT 'DAILY',
  time_of_day VARCHAR(16) DEFAULT '02:00',
  retention_count INTEGER NOT NULL DEFAULT 7,
  encryption_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. official_doc_templates (Letterhead Document Templates)
CREATE TABLE IF NOT EXISTS official_doc_templates (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) REFERENCES mosques(id) ON DELETE CASCADE,
  template_code VARCHAR(32),
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  content_html TEXT NOT NULL,
  placeholders JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. library_racks (Book Rack Units)
CREATE TABLE IF NOT EXISTS library_racks (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  room_id VARCHAR(64) NOT NULL REFERENCES library_rooms(id) ON DELETE CASCADE,
  rack_code VARCHAR(32) NOT NULL,
  rack_name_bn VARCHAR(255) NOT NULL,
  rack_name_en VARCHAR(255),
  total_shelves INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lib_racks_code UNIQUE (mosque_id, rack_code)
);

-- 22. education_programs (Maktab, Hifz & Primary Education Programs)
CREATE TABLE IF NOT EXISTS education_programs (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  type VARCHAR(32) NOT NULL,
  code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_edu_programs_code UNIQUE (mosque_id, code)
);

-- 23. hifz_residences (Residential Madrasah Facilities)
CREATE TABLE IF NOT EXISTS hifz_residences (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  facility_code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  total_capacity INTEGER NOT NULL DEFAULT 0,
  warden_staff_id VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_residences_code UNIQUE (mosque_id, facility_code)
);

-- ============================================================================
-- LAYER 4: Demographic Individuals & Physical Assets (8 tables)
-- ============================================================================

-- 24. person_masters (Musalli & Resident Demographic Master)
CREATE TABLE IF NOT EXISTS person_masters (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  person_code VARCHAR(32) NOT NULL,
  family_id VARCHAR(64) REFERENCES family_masters(id) ON DELETE SET NULL,
  area_id VARCHAR(64) REFERENCES area_masters(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255),
  phone VARCHAR(32),
  nid VARCHAR(32),
  gender VARCHAR(16) DEFAULT 'MALE',
  date_of_birth DATE,
  occupation VARCHAR(128),
  blood_group VARCHAR(8),
  relationship_with_head VARCHAR(64),
  is_donor BOOLEAN NOT NULL DEFAULT false,
  is_musalli BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_person_masters_code UNIQUE (mosque_id, person_code)
);
CREATE INDEX IF NOT EXISTS idx_person_phone ON person_masters(mosque_id, phone);

-- 25. committee_terms (Shura Committee Terms)
CREATE TABLE IF NOT EXISTS committee_terms (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_name VARCHAR(255) NOT NULL,
  term_name_bn VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'UPCOMING')),
  approval_document_url TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 26. mosque_properties (Waqf Lands, Buildings & Markets Master)
CREATE TABLE IF NOT EXISTS mosque_properties (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  property_code VARCHAR(32) NOT NULL,
  name VARCHAR(255),
  name_bn VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  category VARCHAR(32),
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  full_address TEXT,
  area VARCHAR(128) NOT NULL,
  area_amount NUMERIC(12,4),
  area_unit VARCHAR(32),
  ownership_type VARCHAR(32) NOT NULL CHECK (ownership_type IN ('WAQF', 'PURCHASED', 'DONATED', 'LEASED')),
  cs_plot_no VARCHAR(64),
  sa_plot_no VARCHAR(64),
  rs_plot_no VARCHAR(64),
  bs_plot_no VARCHAR(64),
  plot_no VARCHAR(64),
  cs_khatian_no VARCHAR(64),
  sa_khatian_no VARCHAR(64),
  rs_khatian_no VARCHAR(64),
  bs_khatian_no VARCHAR(64),
  mutation_khatian_no VARCHAR(64),
  khatian_no VARCHAR(64),
  mouza VARCHAR(128),
  jl_number VARCHAR(32),
  sub_registry_office VARCHAR(128),
  boundary_north TEXT,
  boundary_south TEXT,
  boundary_east TEXT,
  boundary_west TEXT,
  waqf_enrollment_no VARCHAR(64),
  waqf_deed_no VARCHAR(64),
  waqf_year VARCHAR(16),
  waqf_deed_date DATE,
  waqf_ec_number VARCHAR(64),
  waqif_name VARCHAR(255),
  waqif_father_name VARCHAR(255),
  waqif_address TEXT,
  waqf_purpose TEXT,
  waqf_estate_name VARCHAR(255),
  current_use VARCHAR(255) NOT NULL,
  possession_status VARCHAR(64) DEFAULT 'MOSQUE_CONTROL',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  estimated_value NUMERIC(14,2) DEFAULT 0.00,
  monthly_income NUMERIC(14,2) DEFAULT 0.00,
  monthly_rent NUMERIC(14,2) DEFAULT 0.00,
  annual_income NUMERIC(14,2) DEFAULT 0.00,
  photo_url TEXT,
  documents_count INTEGER DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_properties_code UNIQUE (mosque_id, property_code)
);
CREATE INDEX IF NOT EXISTS idx_properties_lookup ON mosque_properties(mosque_id, ownership_type, status);

-- 27. mosque_assets (Fixed Equipment & Inventory)
CREATE TABLE IF NOT EXISTS mosque_assets (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  asset_code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  current_value NUMERIC(14,2) DEFAULT 0.00,
  warranty_expiry DATE,
  condition VARCHAR(32) NOT NULL DEFAULT 'GOOD',
  location VARCHAR(128) NOT NULL,
  serial_number VARCHAR(128),
  vendor_name VARCHAR(255),
  vendor_phone VARCHAR(32),
  maintenance_history JSONB DEFAULT '[]'::jsonb,
  expense_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_assets_code UNIQUE (mosque_id, asset_code)
);

-- 28. staff (Imams, Muazzins, Khadims & Teachers Master)
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  staff_code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(128) NOT NULL,
  designation_bn VARCHAR(128) NOT NULL,
  department VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  nid VARCHAR(32),
  joined_date DATE NOT NULL,
  basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_allowance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  allowances JSONB DEFAULT '[]'::jsonb,
  deductions JSONB DEFAULT '[]'::jsonb,
  net_salary NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  bank_account_number VARCHAR(64),
  bank_name VARCHAR(128),
  routing_number VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESIGNED', 'TERMINATED', 'ON_LEAVE')),
  blood_group VARCHAR(8),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_code UNIQUE (mosque_id, staff_code)
);

-- 29. library_shelves (Individual Rack Shelves)
CREATE TABLE IF NOT EXISTS library_shelves (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  rack_id VARCHAR(64) NOT NULL REFERENCES library_racks(id) ON DELETE CASCADE,
  shelf_code VARCHAR(32) NOT NULL,
  shelf_number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lib_shelves_code UNIQUE (mosque_id, shelf_code)
);

-- 30. education_levels (Academic Grades & Stages)
CREATE TABLE IF NOT EXISTS education_levels (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  program_id VARCHAR(64) NOT NULL REFERENCES education_programs(id) ON DELETE RESTRICT,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  level_order INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 31. hifz_residence_buildings (Hostel Multi-floor Buildings)
CREATE TABLE IF NOT EXISTS hifz_residence_buildings (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  residence_id VARCHAR(64) NOT NULL REFERENCES hifz_residences(id) ON DELETE CASCADE,
  building_code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  floor_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_buildings_code UNIQUE (mosque_id, building_code)
);

-- ============================================================================
-- LAYER 5: Governance Memberships & Facility Units (10 tables)
-- ============================================================================

-- 32. committee_members (Appointed Committee Members)
CREATE TABLE IF NOT EXISTS committee_members (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_id VARCHAR(64) NOT NULL REFERENCES committee_terms(id) ON DELETE CASCADE,
  person_id VARCHAR(64) NOT NULL REFERENCES person_masters(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(128) NOT NULL,
  designation_bn VARCHAR(128) NOT NULL,
  role VARCHAR(64),
  phone VARCHAR(32) NOT NULL,
  nid VARCHAR(32),
  photo_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESIGNED', 'REMOVED')),
  join_date DATE NOT NULL,
  exit_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 33. sub_committees (Specialized Sub-Committees)
CREATE TABLE IF NOT EXISTS sub_committees (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  purpose TEXT,
  formed_date DATE NOT NULL,
  convener_person_id VARCHAR(64) REFERENCES person_masters(id) ON DELETE SET NULL,
  member_ids JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 34. property_tenants (Normalized Property Tenants)
CREATE TABLE IF NOT EXISTS property_tenants (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  property_id VARCHAR(64) NOT NULL REFERENCES mosque_properties(id) ON DELETE CASCADE,
  tenant_code VARCHAR(32) NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  shop_or_unit_no VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  nid VARCHAR(32),
  father_name VARCHAR(255),
  permanent_address TEXT,
  business_type VARCHAR(128),
  monthly_rent NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  security_deposit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  lease_start_date DATE NOT NULL,
  lease_end_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenants_code UNIQUE (mosque_id, property_id, tenant_code)
);

-- 35. book_titles (Library Cataloged Titles)
CREATE TABLE IF NOT EXISTS book_titles (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  category_id VARCHAR(64) NOT NULL REFERENCES library_categories(id) ON DELETE RESTRICT,
  title_code VARCHAR(32) NOT NULL,
  title_bn VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  author VARCHAR(255) NOT NULL,
  publisher VARCHAR(255),
  isbn VARCHAR(32),
  language VARCHAR(32) DEFAULT 'BANGLA',
  edition VARCHAR(64),
  publication_year VARCHAR(16),
  total_copies INTEGER NOT NULL DEFAULT 0,
  available_copies INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_book_titles_code UNIQUE (mosque_id, title_code)
);

-- 36. education_student_profiles (Student Enrollment Profiles)
CREATE TABLE IF NOT EXISTS education_student_profiles (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_code VARCHAR(32) NOT NULL,
  person_id VARCHAR(64) REFERENCES person_masters(id) ON DELETE SET NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(16) DEFAULT 'MALE',
  father_name VARCHAR(255) NOT NULL,
  mother_name VARCHAR(255),
  primary_contact_phone VARCHAR(32) NOT NULL,
  address TEXT NOT NULL,
  blood_group VARCHAR(8),
  previous_education VARCHAR(255),
  photo_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_students_code UNIQUE (mosque_id, student_code)
);

-- 37. hifz_levels (Nazera to Daur Stage Master)
CREATE TABLE IF NOT EXISTS hifz_levels (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  level_code VARCHAR(32) NOT NULL,
  level_name_bn VARCHAR(255) NOT NULL,
  stage VARCHAR(32) NOT NULL,
  required_paras INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_levels_code UNIQUE (mosque_id, level_code)
);

-- 38. hifz_residence_rooms (Hostel Dormitory Rooms)
CREATE TABLE IF NOT EXISTS hifz_residence_rooms (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  building_id VARCHAR(64) NOT NULL REFERENCES hifz_residence_buildings(id) ON DELETE CASCADE,
  room_number VARCHAR(32) NOT NULL,
  floor_number INTEGER NOT NULL DEFAULT 1,
  room_type VARCHAR(32) DEFAULT 'STANDARD',
  bed_capacity INTEGER NOT NULL DEFAULT 4,
  occupied_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_rooms_number UNIQUE (mosque_id, building_id, room_number)
);

-- 39. donation_boxes (Physical Donation Boxes)
CREATE TABLE IF NOT EXISTS donation_boxes (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  box_number VARCHAR(32) NOT NULL,
  box_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'PERMANENT',
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  last_collection_date DATE,
  total_collected NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_donation_boxes_num UNIQUE (mosque_id, box_number)
);

-- 40. collection_workers (Crowd Collection Agents)
CREATE TABLE IF NOT EXISTS collection_workers (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  worker_code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  assigned_area_id VARCHAR(64) REFERENCES area_masters(id) ON DELETE SET NULL,
  commission_rate NUMERIC(5,2) DEFAULT 0.00,
  collected_total NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_workers_code UNIQUE (mosque_id, worker_code)
);

-- 41. donation_plans (Fundraising Campaigns)
CREATE TABLE IF NOT EXISTS donation_plans (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  plan_number VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  collected_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE,
  account_head_id VARCHAR(64) REFERENCES account_heads(id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_donation_plans_num UNIQUE (mosque_id, plan_number)
);

-- ============================================================================
-- LAYER 6: Operational Meetings, Cases & Educational Plans (11 tables)
-- ============================================================================

-- 42. committee_meetings (Formal Committee Executive Meetings)
CREATE TABLE IF NOT EXISTS committee_meetings (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_id VARCHAR(64) NOT NULL REFERENCES committee_terms(id) ON DELETE CASCADE,
  meeting_number VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time VARCHAR(16),
  venue VARCHAR(255),
  agenda TEXT NOT NULL,
  minutes TEXT,
  presided_by VARCHAR(255),
  attendee_ids JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED',
  resolutions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_meetings_num UNIQUE (mosque_id, meeting_number)
);

-- 43. legal_cases (Court Cases & Waqf Land Disputes)
CREATE TABLE IF NOT EXISTS legal_cases (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  case_number VARCHAR(64) NOT NULL,
  case_tracking_code VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255) NOT NULL,
  case_type VARCHAR(32) NOT NULL,
  court_id VARCHAR(64) NOT NULL REFERENCES legal_courts(id) ON DELETE RESTRICT,
  court_name VARCHAR(255) NOT NULL,
  filing_date DATE NOT NULL,
  case_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  property_id VARCHAR(64) REFERENCES mosque_properties(id) ON DELETE RESTRICT,
  property_name VARCHAR(255),
  disputed_area VARCHAR(128),
  disputed_dag_no VARCHAR(64),
  disputed_khatian VARCHAR(64),
  prayer_or_claim TEXT NOT NULL,
  relief_sought TEXT,
  summary TEXT,
  next_hearing_date DATE,
  lead_lawyer_id VARCHAR(64) REFERENCES legal_lawyers(id) ON DELETE SET NULL,
  lead_lawyer_name VARCHAR(255),
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_legal_cases_num UNIQUE (mosque_id, case_number)
);
CREATE INDEX IF NOT EXISTS idx_legal_cases_lookup ON legal_cases(mosque_id, case_status, property_id);

-- 44. book_copies (Individual Physical Copies & Accessions)
CREATE TABLE IF NOT EXISTS book_copies (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  title_id VARCHAR(64) NOT NULL REFERENCES book_titles(id) ON DELETE CASCADE,
  shelf_id VARCHAR(64) REFERENCES library_shelves(id) ON DELETE SET NULL,
  accession_number VARCHAR(64) NOT NULL,
  barcode VARCHAR(64) NOT NULL,
  condition VARCHAR(32) NOT NULL DEFAULT 'GOOD',
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_book_copies_accession UNIQUE (mosque_id, accession_number)
);

-- 45. library_members (Registered Library Borrowers)
CREATE TABLE IF NOT EXISTS library_members (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  person_id VARCHAR(64) REFERENCES person_masters(id) ON DELETE SET NULL,
  member_code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  member_type VARCHAR(32) NOT NULL DEFAULT 'MUSALLI',
  max_allowed_books INTEGER NOT NULL DEFAULT 2,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  join_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lib_members_code UNIQUE (mosque_id, member_code)
);

-- 46. education_guardians (Student-Guardian Relationship Links)
CREATE TABLE IF NOT EXISTS education_guardians (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  guardian_person_id VARCHAR(64) REFERENCES person_masters(id) ON DELETE RESTRICT,
  guardian_name VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(32) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  nid VARCHAR(32),
  is_primary_guardian BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 47. education_enrollments (Academic Enrollments)
CREATE TABLE IF NOT EXISTS education_enrollments (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE RESTRICT,
  program_id VARCHAR(64) NOT NULL REFERENCES education_programs(id) ON DELETE RESTRICT,
  level_id VARCHAR(64) NOT NULL REFERENCES education_levels(id) ON DELETE RESTRICT,
  academic_year VARCHAR(16) NOT NULL,
  enrollment_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 48. hifz_curricula (Daily Pacing Targets)
CREATE TABLE IF NOT EXISTS hifz_curricula (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  level_id VARCHAR(64) NOT NULL REFERENCES hifz_levels(id) ON DELETE RESTRICT,
  name_bn VARCHAR(255) NOT NULL,
  target_daily_sabak_lines INTEGER NOT NULL DEFAULT 5,
  target_daily_sabaki_paras NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  target_daily_daur_paras NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 49. hifz_residence_beds (Individual Student Beds)
CREATE TABLE IF NOT EXISTS hifz_residence_beds (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  room_id VARCHAR(64) NOT NULL REFERENCES hifz_residence_rooms(id) ON DELETE CASCADE,
  bed_number VARCHAR(32) NOT NULL,
  bed_type VARCHAR(32) DEFAULT 'SINGLE',
  monthly_charge NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'VACANT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_beds_num UNIQUE (mosque_id, room_id, bed_number)
);

-- 50. maktab_classes (Classroom Sections & Shifts)
CREATE TABLE IF NOT EXISTS maktab_classes (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  level_id VARCHAR(64) NOT NULL REFERENCES education_levels(id) ON DELETE RESTRICT,
  class_code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  shift VARCHAR(16) NOT NULL DEFAULT 'MORNING',
  start_time VARCHAR(16),
  end_time VARCHAR(16),
  capacity INTEGER DEFAULT 30,
  academic_year VARCHAR(16) NOT NULL,
  room_no VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_maktab_classes_code UNIQUE (mosque_id, class_code)
);

-- 51. hifz_enrollments (Hifzkhana Student Enrollments)
CREATE TABLE IF NOT EXISTS hifz_enrollments (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE RESTRICT,
  level_id VARCHAR(64) NOT NULL REFERENCES hifz_levels(id) ON DELETE RESTRICT,
  enrollment_code VARCHAR(32) NOT NULL,
  enrollment_date DATE NOT NULL,
  residential_status VARCHAR(32) NOT NULL DEFAULT 'NON_RESIDENTIAL',
  guardian_phone VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  current_para INTEGER DEFAULT 1,
  completion_percentage NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_enrollments_code UNIQUE (mosque_id, enrollment_code)
);

-- 52. budgets (Annual Fiscal Year Budgets)
CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  budget_code VARCHAR(32) NOT NULL,
  fiscal_year VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  total_income_estimate NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_expense_estimate NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_budgets_fiscal UNIQUE (mosque_id, fiscal_year)
);

-- ============================================================================
-- LAYER 7: Financial Ledger & Legal Actions (14 tables)
-- ============================================================================

-- 53. income_entries (Financial Income Ledger)
CREATE TABLE IF NOT EXISTS income_entries (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  voucher_number VARCHAR(64) NOT NULL,
  date DATE NOT NULL,
  main_head_id VARCHAR(64) NOT NULL REFERENCES account_heads(id) ON DELETE RESTRICT,
  main_head_name_bn VARCHAR(255) NOT NULL,
  sub_head_id VARCHAR(64) REFERENCES account_heads(id) ON DELETE SET NULL,
  sub_head_name_bn VARCHAR(255),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0.00),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
  account_id VARCHAR(64) NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  account_name VARCHAR(255) NOT NULL,
  donor_name VARCHAR(255),
  donor_phone VARCHAR(32),
  reference VARCHAR(255),
  description TEXT,
  attachment_url TEXT,
  denomination_data JSONB,
  status VARCHAR(16) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255),
  approved_by VARCHAR(64),
  approved_by_name VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_income_voucher UNIQUE (mosque_id, voucher_number)
);
CREATE INDEX IF NOT EXISTS idx_income_search ON income_entries(mosque_id, date, status, account_id, main_head_id);

-- 54. expense_entries (Financial Expense Ledger)
CREATE TABLE IF NOT EXISTS expense_entries (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  voucher_number VARCHAR(64) NOT NULL,
  date DATE NOT NULL,
  main_head_id VARCHAR(64) NOT NULL REFERENCES account_heads(id) ON DELETE RESTRICT,
  main_head_name_bn VARCHAR(255) NOT NULL,
  sub_head_id VARCHAR(64) REFERENCES account_heads(id) ON DELETE SET NULL,
  sub_head_name_bn VARCHAR(255),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0.00),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
  account_id VARCHAR(64) NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  account_name VARCHAR(255) NOT NULL,
  payee_name VARCHAR(255) NOT NULL,
  payee_phone VARCHAR(32),
  reference VARCHAR(255),
  description TEXT,
  attachment_url TEXT,
  source_module VARCHAR(64),
  source_id VARCHAR(64),
  source_type VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255),
  approved_by VARCHAR(64),
  approved_by_name VARCHAR(255),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_expense_voucher UNIQUE (mosque_id, voucher_number)
);
CREATE INDEX IF NOT EXISTS idx_expense_search ON expense_entries(mosque_id, date, status, account_id, main_head_id);

-- 55. account_transfers (Inter-Account Fund Transfers)
CREATE TABLE IF NOT EXISTS account_transfers (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  transfer_number VARCHAR(64) NOT NULL,
  from_account_id VARCHAR(64) NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  from_account_name VARCHAR(255) NOT NULL,
  to_account_id VARCHAR(64) NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  to_account_name VARCHAR(255) NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0.00),
  date DATE NOT NULL,
  purpose VARCHAR(64) DEFAULT 'GENERAL_TRANSFER',
  description TEXT,
  reference VARCHAR(255),
  attachment_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_transfers_num UNIQUE (mosque_id, transfer_number),
  CONSTRAINT chk_distinct_accounts CHECK (from_account_id <> to_account_id)
);

-- 56. donations (General & Earmarked Donations)
CREATE TABLE IF NOT EXISTS donations (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  receipt_number VARCHAR(64) NOT NULL,
  donor_name VARCHAR(255) NOT NULL,
  donor_phone VARCHAR(32),
  donor_address TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0.00),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
  account_id VARCHAR(64) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  account_head_id VARCHAR(64) REFERENCES account_heads(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  purpose VARCHAR(255),
  notes TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_donations_receipt UNIQUE (mosque_id, receipt_number)
);

-- 57. meeting_resolutions (Formal Committee Decisions)
CREATE TABLE IF NOT EXISTS meeting_resolutions (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  meeting_id VARCHAR(64) NOT NULL REFERENCES committee_meetings(id) ON DELETE CASCADE,
  resolution_number VARCHAR(32) NOT NULL,
  agenda_item VARCHAR(255) NOT NULL,
  decision TEXT NOT NULL,
  responsibility_person_id VARCHAR(64) REFERENCES person_masters(id) ON DELETE SET NULL,
  deadline DATE,
  budget_allocated NUMERIC(14,2) DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_resolutions_num UNIQUE (mosque_id, resolution_number)
);

-- 58. committee_notices (Meeting Notice Circulars)
CREATE TABLE IF NOT EXISTS committee_notices (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  meeting_id VARCHAR(64) NOT NULL REFERENCES committee_meetings(id) ON DELETE CASCADE,
  notice_number VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  issued_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'SENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 59. committee_action_plans (Strategic Development Projects)
CREATE TABLE IF NOT EXISTS committee_action_plans (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  plan_number VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(16) DEFAULT 'NORMAL',
  status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS',
  start_date DATE NOT NULL,
  target_date DATE,
  budget NUMERIC(14,2) DEFAULT 0.00,
  expense_allocated NUMERIC(14,2) DEFAULT 0.00,
  assigned_to_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_action_plans_num UNIQUE (mosque_id, plan_number)
);

-- 60. legal_parties (Litigants: Plaintiffs & Defendants)
CREATE TABLE IF NOT EXISTS legal_parties (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  case_id VARCHAR(64) NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  party_code VARCHAR(32) NOT NULL,
  party_type VARCHAR(32) NOT NULL,
  is_mosque_party BOOLEAN NOT NULL DEFAULT false,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  nid VARCHAR(32),
  address TEXT,
  advocate_name VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_legal_parties_code UNIQUE (mosque_id, case_id, party_code)
);

-- 61. legal_hearings (Cause-List Hearings & Proceedings)
CREATE TABLE IF NOT EXISTS legal_hearings (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  case_id VARCHAR(64) NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  hearing_code VARCHAR(32) NOT NULL,
  hearing_date DATE NOT NULL,
  hearing_time VARCHAR(16),
  purpose VARCHAR(255) NOT NULL,
  judge_name VARCHAR(255),
  lawyer_attended_id VARCHAR(64) REFERENCES legal_lawyers(id) ON DELETE SET NULL,
  lawyer_attended_name VARCHAR(255),
  proceedings_summary TEXT,
  order_passed TEXT,
  next_action_required TEXT,
  next_hearing_date DATE,
  hearing_expense NUMERIC(14,2) DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_legal_hearings_code UNIQUE (mosque_id, case_id, hearing_code)
);

-- 62. legal_actions (Procedural Motions & Submissions)
CREATE TABLE IF NOT EXISTS legal_actions (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  case_id VARCHAR(64) NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  action_code VARCHAR(32) NOT NULL,
  action_title VARCHAR(255) NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  assigned_to_lawyer_id VARCHAR(64) REFERENCES legal_lawyers(id) ON DELETE SET NULL,
  due_date DATE,
  completion_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_legal_actions_code UNIQUE (mosque_id, case_id, action_code)
);

-- 63. legal_orders (Injunctions, Stay Writs & Judgments)
CREATE TABLE IF NOT EXISTS legal_orders (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  case_id VARCHAR(64) NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  order_code VARCHAR(32) NOT NULL,
  order_date DATE NOT NULL,
  order_type VARCHAR(32) NOT NULL,
  order_summary TEXT NOT NULL,
  order_summary_bn TEXT,
  operative_part TEXT,
  compliance_deadline DATE,
  is_favorable_to_mosque BOOLEAN NOT NULL DEFAULT true,
  certified_copy_obtained BOOLEAN NOT NULL DEFAULT false,
  central_document_id VARCHAR(64) REFERENCES central_documents(id) ON DELETE SET NULL,
  document_url TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_legal_orders_code UNIQUE (mosque_id, case_id, order_code)
);

-- 64. cemetery_records (Graveyard Burial Plot Registry)
CREATE TABLE IF NOT EXISTS cemetery_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  grave_number VARCHAR(32) NOT NULL,
  deceased_name VARCHAR(255) NOT NULL,
  deceased_name_bn VARCHAR(255) NOT NULL,
  father_or_husband_name VARCHAR(255) NOT NULL,
  mother_name VARCHAR(255),
  date_of_birth DATE,
  date_of_death DATE NOT NULL,
  burial_date DATE NOT NULL,
  burial_time VARCHAR(16),
  age INTEGER,
  permanent_address TEXT NOT NULL,
  grave_location VARCHAR(128) NOT NULL,
  death_certificate_number VARCHAR(64),
  legal_heir_contact VARCHAR(32),
  fee_charged NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_voucher_id VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'REGISTERED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cemetery_grave_num UNIQUE (mosque_id, grave_number)
);

-- 65. budget_lines (Itemized Budget Line Allocations)
CREATE TABLE IF NOT EXISTS budget_lines (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  budget_id VARCHAR(64) NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_head_id VARCHAR(64) NOT NULL REFERENCES account_heads(id) ON DELETE RESTRICT,
  account_head_name_bn VARCHAR(255) NOT NULL,
  line_type VARCHAR(16) NOT NULL,
  estimated_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  actual_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 66. maktab_fee_schedules (Fee Tariffs per Class)
CREATE TABLE IF NOT EXISTS maktab_fee_schedules (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  class_id VARCHAR(64) NOT NULL REFERENCES maktab_classes(id) ON DELETE CASCADE,
  fee_type VARCHAR(32) NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  frequency VARCHAR(16) DEFAULT 'MONTHLY',
  due_day INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LAYER 8: Financial Realizations & Normalized Sub-Entities (13 tables)
-- ============================================================================

-- 67. donation_box_collections (Box Unlocked Count Receipts)
CREATE TABLE IF NOT EXISTS donation_box_collections (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  collection_number VARCHAR(32) NOT NULL,
  box_id VARCHAR(64) NOT NULL REFERENCES donation_boxes(id) ON DELETE RESTRICT,
  collection_date DATE NOT NULL,
  opened_by VARCHAR(255) NOT NULL,
  witnessed_by JSONB DEFAULT '[]'::jsonb,
  denomination_breakdown JSONB,
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount > 0.00),
  account_id VARCHAR(64) NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  account_head_id VARCHAR(64) NOT NULL REFERENCES account_heads(id) ON DELETE RESTRICT,
  voucher_id VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'DEPOSITED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_box_collections_num UNIQUE (mosque_id, collection_number)
);

-- 68. donation_collections (Field Agent Batch Collections)
CREATE TABLE IF NOT EXISTS donation_collections (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  collection_number VARCHAR(32) NOT NULL,
  plan_id VARCHAR(64) NOT NULL REFERENCES donation_plans(id) ON DELETE RESTRICT,
  worker_id VARCHAR(64) NOT NULL REFERENCES collection_workers(id) ON DELETE RESTRICT,
  donor_person_id VARCHAR(64) REFERENCES person_masters(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0.00),
  date DATE NOT NULL,
  account_id VARCHAR(64) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  voucher_id VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'VERIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_agent_collections_num UNIQUE (mosque_id, collection_number)
);

-- 69. staff_payments (Monthly Payroll Vouchers)
CREATE TABLE IF NOT EXISTS staff_payments (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  payment_voucher_number VARCHAR(64) NOT NULL,
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  payment_month VARCHAR(16) NOT NULL,
  payment_year INTEGER NOT NULL,
  payment_date DATE NOT NULL,
  basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  allowance_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  deduction_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_payable NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
  account_id VARCHAR(64) NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL DEFAULT 'DISBURSED',
  transaction_ref VARCHAR(128),
  expense_entry_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_monthly_pay UNIQUE (mosque_id, staff_id, payment_month, payment_year)
);

-- 70. staff_bank_letters (Salary Bank Transfer Authorization Letters)
CREATE TABLE IF NOT EXISTS staff_bank_letters (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  letter_number VARCHAR(64) NOT NULL,
  payment_month VARCHAR(16) NOT NULL,
  payment_year INTEGER NOT NULL,
  bank_name VARCHAR(128) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  staff_count INTEGER NOT NULL DEFAULT 0,
  document_url TEXT,
  generated_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_bank_letters_num UNIQUE (mosque_id, letter_number)
);

-- 71. property_rent_collections (Normalized Tenant Rent Receipts)
CREATE TABLE IF NOT EXISTS property_rent_collections (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  tenant_id VARCHAR(64) NOT NULL REFERENCES property_tenants(id) ON DELETE RESTRICT,
  receipt_number VARCHAR(64) NOT NULL,
  collection_date DATE NOT NULL,
  rent_month VARCHAR(16) NOT NULL,
  rent_year INTEGER NOT NULL,
  rent_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  fine_amount NUMERIC(14,2) DEFAULT 0.00,
  total_paid NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
  account_id VARCHAR(64) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  voucher_id VARCHAR(64),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_rent_collections_receipt UNIQUE (mosque_id, receipt_number)
);

-- 72. property_khajna_records (Normalized Land Revenue Tax Records)
CREATE TABLE IF NOT EXISTS property_khajna_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  property_id VARCHAR(64) NOT NULL REFERENCES mosque_properties(id) ON DELETE CASCADE,
  dakhila_number VARCHAR(64) NOT NULL,
  tax_year VARCHAR(32) NOT NULL,
  payment_date DATE NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  dakhila_fee NUMERIC(14,2) DEFAULT 0.00,
  total_paid NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  paid_to_office VARCHAR(255) NOT NULL,
  receipt_document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_khajna_dakhila UNIQUE (mosque_id, property_id, dakhila_number)
);

-- 73. property_documents (Normalized Property Deed & Khatian Archive)
CREATE TABLE IF NOT EXISTS property_documents (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  property_id VARCHAR(64) NOT NULL REFERENCES mosque_properties(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL,
  document_title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  central_document_id VARCHAR(64) REFERENCES central_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 74. property_inspections (Normalized Property Physical Audits)
CREATE TABLE IF NOT EXISTS property_inspections (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  property_id VARCHAR(64) NOT NULL REFERENCES mosque_properties(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  inspected_by VARCHAR(255) NOT NULL,
  findings TEXT NOT NULL,
  condition VARCHAR(32) NOT NULL DEFAULT 'GOOD',
  encroachment_detected BOOLEAN NOT NULL DEFAULT false,
  action_required TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 75. book_issues (Borrow & Return Circulation Logs)
CREATE TABLE IF NOT EXISTS book_issues (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  copy_id VARCHAR(64) NOT NULL REFERENCES book_copies(id) ON DELETE RESTRICT,
  member_id VARCHAR(64) NOT NULL REFERENCES library_members(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  fine_amount NUMERIC(14,2) DEFAULT 0.00,
  fine_paid BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(16) NOT NULL DEFAULT 'ISSUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 76. book_acquisitions (Book Purchases & Waqf Donations)
CREATE TABLE IF NOT EXISTS book_acquisitions (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  title_id VARCHAR(64) NOT NULL REFERENCES book_titles(id) ON DELETE RESTRICT,
  acquisition_code VARCHAR(32) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'PURCHASE',
  donor_name VARCHAR(255),
  cost NUMERIC(14,2) DEFAULT 0.00,
  acquisition_date DATE NOT NULL,
  copy_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 77. maktab_teacher_assignments (Teacher Classroom Assignments)
CREATE TABLE IF NOT EXISTS maktab_teacher_assignments (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  class_id VARCHAR(64) NOT NULL REFERENCES maktab_classes(id) ON DELETE CASCADE,
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  role VARCHAR(32) NOT NULL DEFAULT 'LEAD_TEACHER',
  assignment_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 78. hifz_teacher_assignments (Halqa Ustad Student Assignments)
CREATE TABLE IF NOT EXISTS hifz_teacher_assignments (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  halqa_name VARCHAR(128) NOT NULL,
  shift VARCHAR(32) NOT NULL DEFAULT 'MORNING',
  student_ids JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 79. hifz_residential_allocations (Bed Occupancy & Leases)
CREATE TABLE IF NOT EXISTS hifz_residential_allocations (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  allocation_code VARCHAR(32) NOT NULL,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE RESTRICT,
  room_id VARCHAR(64) NOT NULL REFERENCES hifz_residence_rooms(id) ON DELETE RESTRICT,
  bed_id VARCHAR(64) NOT NULL REFERENCES hifz_residence_beds(id) ON DELETE RESTRICT,
  allocation_date DATE NOT NULL,
  vacate_date DATE,
  monthly_rent_charge NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  dining_fee_charge NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_allocations_code UNIQUE (mosque_id, allocation_code)
);

-- ============================================================================
-- LAYER 9: Daily Educational Sessions & Recitations (7 tables)
-- ============================================================================

-- 80. maktab_attendances (Daily Class Attendance Logs)
CREATE TABLE IF NOT EXISTS maktab_attendances (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  class_id VARCHAR(64) NOT NULL REFERENCES maktab_classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  attendance_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_maktab_daily_att UNIQUE (mosque_id, class_id, date)
);

-- 81. maktab_fee_records (Student Tuition & Admission Receipts)
CREATE TABLE IF NOT EXISTS maktab_fee_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  receipt_number VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE RESTRICT,
  fee_schedule_id VARCHAR(64) NOT NULL REFERENCES maktab_fee_schedules(id) ON DELETE RESTRICT,
  month VARCHAR(16) NOT NULL,
  year INTEGER NOT NULL,
  amount_due NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  waiver_amount NUMERIC(14,2) DEFAULT 0.00,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
  account_id VARCHAR(64) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  voucher_id VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'PAID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_maktab_fee_receipt UNIQUE (mosque_id, receipt_number)
);

-- 82. hifz_sabaks (Daily New Quranic Lessons)
CREATE TABLE IF NOT EXISTS hifz_sabaks (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  surah_number INTEGER NOT NULL,
  start_ayah INTEGER NOT NULL,
  end_ayah INTEGER NOT NULL,
  lines_count INTEGER NOT NULL,
  memorization_quality VARCHAR(32) NOT NULL,
  mistakes_count INTEGER DEFAULT 0,
  ustad_id VARCHAR(64) REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_sabaks_daily UNIQUE (mosque_id, student_id, date)
);

-- 83. hifz_sabakis (Daily Recent Lesson Revisions)
CREATE TABLE IF NOT EXISTS hifz_sabakis (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  para_number INTEGER NOT NULL,
  quarter_or_ruku VARCHAR(64),
  quality VARCHAR(32) NOT NULL,
  ustad_id VARCHAR(64) REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_sabakis_daily UNIQUE (mosque_id, student_id, date)
);

-- 84. hifz_daur_cycles (30-Para Full Quran Revision Cycles)
CREATE TABLE IF NOT EXISTS hifz_daur_cycles (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  cycle_code VARCHAR(32) NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  target_completion_date DATE,
  completed_date DATE,
  total_paras_covered INTEGER DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_cycles_code UNIQUE (mosque_id, cycle_code)
);

-- 85. hifz_attendances (Daily 5-Waqt Prayer & Halqa Attendance)
CREATE TABLE IF NOT EXISTS hifz_attendances (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  prayer_attendances JSONB DEFAULT '{}'::jsonb,
  study_sessions_attendance JSONB DEFAULT '{}'::jsonb,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_att_daily UNIQUE (mosque_id, student_id, date)
);

-- 86. hifz_residential_transfers (Inter-Bed Transfer Log)
CREATE TABLE IF NOT EXISTS hifz_residential_transfers (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  transfer_code VARCHAR(32) NOT NULL,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE RESTRICT,
  from_bed_id VARCHAR(64) NOT NULL REFERENCES hifz_residence_beds(id) ON DELETE RESTRICT,
  to_bed_id VARCHAR(64) NOT NULL REFERENCES hifz_residence_beds(id) ON DELETE RESTRICT,
  transfer_date DATE NOT NULL,
  reason TEXT,
  approved_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_transfers_code UNIQUE (mosque_id, transfer_code)
);

-- ============================================================================
-- LAYER 10: Cycles, Evaluations & Official Letters (7 tables)
-- ============================================================================

-- 87. maktab_progress_records (Exams & Qaida Evaluations)
CREATE TABLE IF NOT EXISTS maktab_progress_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES maktab_classes(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL,
  qaida_separa_progress VARCHAR(128),
  surah_memorized_count INTEGER DEFAULT 0,
  kalima_dua_status VARCHAR(64),
  namaz_practical_score INTEGER DEFAULT 0,
  akhlaq_grade VARCHAR(8),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 88. hifz_daurs (Daily Cycle Recitation Log)
CREATE TABLE IF NOT EXISTS hifz_daurs (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  cycle_id VARCHAR(64) NOT NULL REFERENCES hifz_daur_cycles(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  para_number INTEGER NOT NULL,
  quality VARCHAR(32) NOT NULL,
  mistakes_count INTEGER DEFAULT 0,
  ustad_id VARCHAR(64) REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 89. hifz_revisions (Periodic Checkpoint Evaluations)
CREATE TABLE IF NOT EXISTS hifz_revisions (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_id VARCHAR(64) NOT NULL REFERENCES education_student_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  revision_type VARCHAR(64) NOT NULL,
  revision_score INTEGER DEFAULT 0,
  ustad_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 90. official_documents (Issued Certificates, NOCs & Letters)
CREATE TABLE IF NOT EXISTS official_documents (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  document_code VARCHAR(64) NOT NULL,
  template_id VARCHAR(64) REFERENCES official_doc_templates(id) ON DELETE SET NULL,
  document_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_address TEXT,
  content_html TEXT NOT NULL,
  placeholders_used JSONB DEFAULT '{}'::jsonb,
  issue_date DATE NOT NULL,
  signed_by VARCHAR(255),
  verification_token VARCHAR(128) UNIQUE,
  qr_code_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ISSUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_official_docs_code UNIQUE (mosque_id, document_code)
);

-- 91. official_doc_numbering (Custom Serial Prefix Rules)
CREATE TABLE IF NOT EXISTS official_doc_numbering (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  document_type VARCHAR(64) NOT NULL,
  prefix VARCHAR(32) NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  padding_length INTEGER NOT NULL DEFAULT 4,
  include_year BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_doc_numbering_type UNIQUE (mosque_id, document_type)
);

-- 92. committee_activities (Operational Committee Work Log)
CREATE TABLE IF NOT EXISTS committee_activities (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  member_id VARCHAR(64) NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  activity_type VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 93. committee_tasks (Delegated Member Operational Tasks)
CREATE TABLE IF NOT EXISTS committee_tasks (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  member_id VARCHAR(64) NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  task_title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LAYER 11: Member Evaluations & Communication Logs (6 tables)
-- ============================================================================

-- 94. committee_evaluations (Annual Member Evaluations)
CREATE TABLE IF NOT EXISTS committee_evaluations (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  member_id VARCHAR(64) NOT NULL REFERENCES committee_members(id) ON DELETE CASCADE,
  term_id VARCHAR(64) NOT NULL REFERENCES committee_terms(id) ON DELETE CASCADE,
  evaluation_period VARCHAR(32) NOT NULL,
  attendance_score INTEGER NOT NULL DEFAULT 0,
  activity_score INTEGER NOT NULL DEFAULT 0,
  contribution_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  evaluated_by VARCHAR(64) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 95. advisor_consultations (Counseling & Guidance Sessions)
CREATE TABLE IF NOT EXISTS advisor_consultations (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_id VARCHAR(64) NOT NULL REFERENCES advisory_council_terms(id) ON DELETE CASCADE,
  advisor_id VARCHAR(64) NOT NULL REFERENCES advisor_members(id) ON DELETE RESTRICT,
  consultation_number VARCHAR(32) NOT NULL,
  issue_title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_advisor_consult_num UNIQUE (mosque_id, consultation_number)
);

-- 96. mosque_notices (General Mosque Notice Announcements)
CREATE TABLE IF NOT EXISTS mosque_notices (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  notice_number VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  published_date DATE NOT NULL,
  expiry_date DATE,
  priority VARCHAR(16) DEFAULT 'NORMAL',
  category VARCHAR(32) DEFAULT 'GENERAL',
  target_audience VARCHAR(64) DEFAULT 'ALL',
  is_public_on_portal BOOLEAN NOT NULL DEFAULT true,
  attachment_url TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_mosque_notices_num UNIQUE (mosque_id, notice_number)
);

-- 97. mosque_notifications (In-App User Notification Center)
CREATE TABLE IF NOT EXISTS mosque_notifications (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(16) DEFAULT 'INFO',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 98. backup_records (Encrypted Disaster Recovery Archive Records)
CREATE TABLE IF NOT EXISTS backup_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  backup_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  checksum_sha256 VARCHAR(64) NOT NULL,
  initiated_by VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 99. restore_records (System Restore Audit Records)
CREATE TABLE IF NOT EXISTS restore_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  backup_record_id VARCHAR(64) REFERENCES backup_records(id) ON DELETE SET NULL,
  restored_by VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED',
  restored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export const POSTGRES_SCHEMA_SQL = POSTGRES_99_TABLES_DDL_SQL;
export const POSTGRES_AUXILIARY_SCHEMA_SQL = POSTGRES_99_TABLES_DDL_SQL;

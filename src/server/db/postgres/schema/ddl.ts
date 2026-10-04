/**
 * MASJIDLEDGER PRO v2.6 — AUTHORITATIVE POSTGRESQL PRODUCTION DDL
 * Single Source of Truth for Relational Schema Foundation
 */

import { POSTGRES_AUXILIARY_SCHEMA_SQL } from './auxiliaryDdl';

export const POSTGRES_CORE_SCHEMA_SQL = `
-- ============================================================================
-- 1. EXTENSIONS & CUSTOM TYPES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. CORE IDENTITY & RBAC
-- ============================================================================

CREATE TABLE IF NOT EXISTS mosques (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  waqf_estate_name VARCHAR(255),
  registration_number VARCHAR(100),
  description_bn TEXT,
  address TEXT NOT NULL,
  village VARCHAR(100),
  union_name VARCHAR(100),
  ward VARCHAR(50),
  upazila VARCHAR(100),
  district VARCHAR(100),
  division VARCHAR(100),
  country VARCHAR(100) NOT NULL DEFAULT 'Bangladesh',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  phone VARCHAR(32) NOT NULL,
  alt_phone VARCHAR(32),
  email VARCHAR(128),
  website VARCHAR(255),
  logo_url TEXT,
  logo_asset_id VARCHAR(64),
  photo_url TEXT,
  cover_photo_url TEXT,
  president_signature_url TEXT,
  secretary_signature_url TEXT,
  established_date VARCHAR(32),
  letterhead_settings JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  qr_settings JSONB,
  committee_evaluation_settings JSONB,
  jamaat_settings JSONB,
  prayer_daily_overrides JSONB,
  prayer_settings JSONB,
  public_portal_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  nid VARCHAR(50),
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(128),
  password_hash VARCHAR(255) NOT NULL,
  photo_url TEXT,
  address TEXT,
  role VARCHAR(32) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'MOSQUE_ADMIN', 'ACCOUNTANT', 'COMMITTEE_ADMIN', 'TREASURER', 'DATA_ENTRY_OPERATOR', 'AUDITOR', 'VIEWER')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_mosque_phone UNIQUE (mosque_id, phone),
  CONSTRAINT uq_users_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS person_masters (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  person_code VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  father_or_husband_name VARCHAR(255),
  gender VARCHAR(16) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  date_of_birth DATE,
  marital_status VARCHAR(32),
  family_id VARCHAR(64),
  area_id VARCHAR(64),
  family_relation VARCHAR(64),
  is_family_head BOOLEAN NOT NULL DEFAULT FALSE,
  mobile VARCHAR(32),
  alternative_mobile VARCHAR(32),
  email VARCHAR(128),
  address TEXT,
  house_road_block VARCHAR(255),
  occupation VARCHAR(128),
  profession VARCHAR(128),
  organization VARCHAR(255),
  photo_url TEXT,
  photo_document_id VARCHAR(64),
  nid_number VARCHAR(64),
  nid_document_id VARCHAR(64),
  blood_group VARCHAR(16),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT,
  linked_committee_member_id VARCHAR(64),
  linked_staff_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  CONSTRAINT uq_person_masters_mosque_code UNIQUE (mosque_id, person_code),
  CONSTRAINT uq_person_masters_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS area_masters (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  area_code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  boundary_description TEXT,
  description TEXT,
  assigned_collection_worker_id VARCHAR(64),
  collection_worker_ids TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  CONSTRAINT uq_area_masters_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS family_masters (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  family_code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  area_id VARCHAR(64) NOT NULL,
  family_head_person_id VARCHAR(64),
  mobile VARCHAR(32),
  address TEXT,
  house_road_block VARCHAR(255),
  description TEXT,
  member_count INT DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  CONSTRAINT uq_family_masters_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_family_area FOREIGN KEY (mosque_id, area_id) REFERENCES area_masters(mosque_id, id) ON DELETE RESTRICT
);

-- ============================================================================
-- 3. FINANCIAL FOUNDATION (SINGLE ACCOUNT HEAD & ACCOUNTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_heads (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  code VARCHAR(32) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  type VARCHAR(16) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  parent_id VARCHAR(64),
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  CONSTRAINT uq_account_heads_mosque_code UNIQUE (mosque_id, code),
  CONSTRAINT uq_account_heads_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_account_head_parent FOREIGN KEY (mosque_id, parent_id) REFERENCES account_heads(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT chk_no_self_parent CHECK (id <> parent_id)
);

CREATE TABLE IF NOT EXISTS financial_accounts (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  account_type VARCHAR(16) NOT NULL CHECK (account_type IN ('CASH', 'BANK', 'MFS', 'OTHER')),
  bank_name VARCHAR(255),
  branch_name VARCHAR(255),
  account_number VARCHAR(64),
  mfs_provider VARCHAR(32),
  mobile_number VARCHAR(32),
  mfs_account_category VARCHAR(32),
  bank_account_category VARCHAR(32),
  routing_number VARCHAR(32),
  contact_person VARCHAR(255),
  notes TEXT,
  opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  opening_balance_date DATE,
  opening_balance_type VARCHAR(16) DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
  opening_balance_source TEXT,
  opening_balance_note TEXT,
  current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0.00),
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_financial_accounts_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS account_opening_balance_history (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  account_id VARCHAR(64) NOT NULL,
  opening_balance NUMERIC(14, 2) NOT NULL,
  opening_balance_date DATE NOT NULL,
  opening_balance_type VARCHAR(16) NOT NULL DEFAULT 'DEBIT' CHECK (opening_balance_type IN ('DEBIT', 'CREDIT')),
  opening_balance_source TEXT,
  opening_balance_note TEXT,
  changed_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_opening_history_account FOREIGN KEY (mosque_id, account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT
);

-- ============================================================================
-- 4. FINANCIAL TRANSACTIONS (INCOME, EXPENSE, TRANSFERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS income_entries (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_id VARCHAR(64),
  voucher_number VARCHAR(64) NOT NULL,
  date DATE NOT NULL,
  main_head_id VARCHAR(64) NOT NULL,
  main_head_name_bn VARCHAR(255) NOT NULL,
  sub_head_id VARCHAR(64),
  sub_head_name_bn VARCHAR(255),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
  payment_method VARCHAR(32) NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  donor_name VARCHAR(255),
  donor_phone VARCHAR(32),
  reference VARCHAR(255),
  description TEXT,
  attachment_url TEXT,
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  approved_by VARCHAR(64),
  approved_by_name VARCHAR(255),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
  reversal_of_id VARCHAR(64),
  denomination_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_income_entries_mosque_voucher UNIQUE (mosque_id, voucher_number),
  CONSTRAINT uq_income_entries_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_income_account FOREIGN KEY (mosque_id, account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_income_main_head FOREIGN KEY (mosque_id, main_head_id) REFERENCES account_heads(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expense_entries (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_id VARCHAR(64),
  voucher_number VARCHAR(64) NOT NULL,
  date DATE NOT NULL,
  main_head_id VARCHAR(64) NOT NULL,
  main_head_name_bn VARCHAR(255) NOT NULL,
  sub_head_id VARCHAR(64),
  sub_head_name_bn VARCHAR(255),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
  payment_method VARCHAR(32) NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  payee_name VARCHAR(255) NOT NULL,
  payee_phone VARCHAR(32),
  reference VARCHAR(255),
  description TEXT,
  attachment_url TEXT,
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  approved_by VARCHAR(64),
  approved_by_name VARCHAR(255),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
  reversal_of_id VARCHAR(64),
  source_module VARCHAR(64),
  source_id VARCHAR(64),
  source_type VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_expense_entries_mosque_voucher UNIQUE (mosque_id, voucher_number),
  CONSTRAINT uq_expense_entries_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_expense_account FOREIGN KEY (mosque_id, account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_expense_main_head FOREIGN KEY (mosque_id, main_head_id) REFERENCES account_heads(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS account_transfers (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  transfer_number VARCHAR(64) NOT NULL,
  from_account_id VARCHAR(64) NOT NULL,
  from_account_name VARCHAR(255) NOT NULL,
  to_account_id VARCHAR(64) NOT NULL,
  to_account_name VARCHAR(255) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
  date DATE NOT NULL,
  reference VARCHAR(255),
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_account_transfers_mosque_num UNIQUE (mosque_id, transfer_number),
  CONSTRAINT uq_account_transfers_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_transfer_from_account FOREIGN KEY (mosque_id, from_account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfer_to_account FOREIGN KEY (mosque_id, to_account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT chk_distinct_transfer_accounts CHECK (from_account_id <> to_account_id)
);

CREATE TABLE IF NOT EXISTS donations (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  receipt_number VARCHAR(64) NOT NULL,
  donor_name VARCHAR(255) NOT NULL,
  donor_phone VARCHAR(32),
  donor_email VARCHAR(128),
  donor_address TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  category VARCHAR(32) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
  payment_method VARCHAR(32) NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  reference VARCHAR(255),
  description TEXT,
  counting_team TEXT[],
  witness VARCHAR(255),
  date DATE NOT NULL,
  received_by VARCHAR(64) NOT NULL,
  received_by_name VARCHAR(255) NOT NULL,
  income_entry_id VARCHAR(64),
  denomination_data JSONB,
  person_id VARCHAR(64),
  family_id VARCHAR(64),
  area_id VARCHAR(64),
  donation_plan_id VARCHAR(64),
  collection_id VARCHAR(64),
  collection_worker_id VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_donations_mosque_receipt UNIQUE (mosque_id, receipt_number),
  CONSTRAINT uq_donations_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_donations_account FOREIGN KEY (mosque_id, account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS donation_boxes (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  box_code VARCHAR(32) NOT NULL,
  manual_name VARCHAR(255),
  location VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255),
  owner_name VARCHAR(255),
  owner_phone VARCHAR(32),
  address TEXT,
  area VARCHAR(100),
  ward VARCHAR(50),
  responsible_person VARCHAR(255),
  installation_date DATE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'REPLACED', 'LOST', 'DAMAGED', 'MAINTENANCE')),
  last_collected_date DATE,
  total_collected NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_donation_boxes_mosque_code UNIQUE (mosque_id, box_code),
  CONSTRAINT uq_donation_boxes_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS donation_box_collections (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  box_id VARCHAR(64) NOT NULL,
  box_code VARCHAR(32) NOT NULL,
  collection_date DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0.00),
  counting_team TEXT[],
  witnesses TEXT[],
  deposit_account_id VARCHAR(64) NOT NULL,
  deposit_account_name VARCHAR(255) NOT NULL,
  deposit_reference VARCHAR(255),
  income_voucher_number VARCHAR(64),
  denomination_data JSONB,
  notes TEXT,
  created_by VARCHAR(64) NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_donation_box_collections_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_box_collection_box FOREIGN KEY (mosque_id, box_id) REFERENCES donation_boxes(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_box_collection_account FOREIGN KEY (mosque_id, deposit_account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT
);

-- ============================================================================
-- 5. AUDIT & IDEMPOTENCY (APPEND-ONLY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL,
  module VARCHAR(64) NOT NULL,
  category VARCHAR(64),
  record_id VARCHAR(64),
  voucher_number VARCHAR(64),
  details TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
  device VARCHAR(255),
  status VARCHAR(16) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'WARNING'))
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(128) NOT NULL,
  endpoint VARCHAR(255),
  request_hash VARCHAR(64),
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_idempotency_mosque_key UNIQUE (mosque_id, idempotency_key)
);

-- ============================================================================
-- 6. COMMITTEE & ADVISORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS committee_terms (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('UPCOMING', 'ACTIVE', 'EXPIRED', 'COMPLETED', 'CLOSED', 'CANCELLED')),
  description TEXT,
  members_count INT DEFAULT 0,
  opening_balance NUMERIC(14, 2) DEFAULT 0.00,
  opening_balance_date DATE,
  opening_balance_source VARCHAR(64),
  closing_balance NUMERIC(14, 2),
  closing_balance_date DATE,
  handover_balance NUMERIC(14, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_committee_terms_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS committee_members (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  term_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  father_name VARCHAR(255),
  mother_name VARCHAR(255),
  nid VARCHAR(50),
  phone VARCHAR(32) NOT NULL,
  alt_phone VARCHAR(32),
  date_of_birth DATE,
  blood_group VARCHAR(16),
  address TEXT,
  photo_url TEXT,
  position VARCHAR(32) NOT NULL,
  position_custom_bn VARCHAR(100),
  occupation VARCHAR(100),
  education VARCHAR(100),
  email VARCHAR(128),
  join_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'RESIGNED', 'DECEASED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_committee_members_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_committee_member_term FOREIGN KEY (mosque_id, term_id) REFERENCES committee_terms(mosque_id, id) ON DELETE RESTRICT
);

-- ============================================================================
-- 7. STAFF & PAYROLL
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  full_name_bn VARCHAR(255),
  staff_code VARCHAR(50) NOT NULL,
  nid VARCHAR(50) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  alt_phone VARCHAR(32),
  designation VARCHAR(64) NOT NULL,
  designation_bn VARCHAR(100) NOT NULL,
  employment_type VARCHAR(32) DEFAULT 'PERMANENT',
  employment_type_bn VARCHAR(64) DEFAULT 'স্থায়ী',
  present_address TEXT,
  permanent_address TEXT,
  joining_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'ON_LEAVE', 'RETIRED')),
  monthly_salary NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  basic_salary NUMERIC(14, 2) DEFAULT 0.00,
  housing_allowance NUMERIC(14, 2) DEFAULT 0.00,
  medical_allowance NUMERIC(14, 2) DEFAULT 0.00,
  transport_allowance NUMERIC(14, 2) DEFAULT 0.00,
  other_allowance NUMERIC(14, 2) DEFAULT 0.00,
  allowance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  gross_salary NUMERIC(14, 2) DEFAULT 0.00,
  advance_balance NUMERIC(14, 2) DEFAULT 0.00,
  salary_effective_date DATE,
  salary_history JSONB,
  leave_records JSONB,
  advance_records JSONB,
  attendance_records JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_mosque_code UNIQUE (mosque_id, staff_code),
  CONSTRAINT uq_staff_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS staff_payments (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  staff_id VARCHAR(64) NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  designation_bn VARCHAR(100) NOT NULL,
  month VARCHAR(16) NOT NULL, -- YYYY-MM
  payment_date DATE NOT NULL,
  payment_type VARCHAR(32) DEFAULT 'REGULAR_SALARY',
  basic_salary NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  bonus NUMERIC(14, 2) DEFAULT 0.00,
  other_allowance NUMERIC(14, 2) DEFAULT 0.00,
  allowance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  deduction NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  advance_deduction NUMERIC(14, 2) DEFAULT 0.00,
  total_payable NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  net_paid NUMERIC(14, 2) NOT NULL CHECK (net_paid > 0.00),
  payment_method VARCHAR(32) NOT NULL,
  account_id VARCHAR(64) NOT NULL,
  account_name_bn VARCHAR(255),
  expense_voucher_number VARCHAR(64),
  expense_entry_id VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'CANCELLED', 'PARTIALLY_PAID')),
  created_by VARCHAR(64),
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_payments_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_staff_payment_staff FOREIGN KEY (mosque_id, staff_id) REFERENCES staff(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_staff_payment_account FOREIGN KEY (mosque_id, account_id) REFERENCES financial_accounts(mosque_id, id) ON DELETE RESTRICT
);

-- ============================================================================
-- 8. EDUCATION & MAKTAB
-- ============================================================================

CREATE TABLE IF NOT EXISTS education_student_profiles (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  person_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  admission_date DATE NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(16) CHECK (gender IN ('MALE', 'FEMALE')),
  blood_group VARCHAR(16),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(32),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'COMPLETED', 'ARCHIVED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  CONSTRAINT uq_edu_student_mosque_stu_id UNIQUE (mosque_id, student_id),
  CONSTRAINT uq_edu_student_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_edu_student_person FOREIGN KEY (mosque_id, person_id) REFERENCES person_masters(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS education_programs (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  type VARCHAR(32) NOT NULL CHECK (type IN ('MAKTAB', 'HIFZKHANA')),
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  CONSTRAINT uq_education_programs_mosque_code UNIQUE (mosque_id, code),
  CONSTRAINT uq_education_programs_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS education_levels (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  program_id VARCHAR(64) NOT NULL,
  program_type VARCHAR(32) NOT NULL CHECK (program_type IN ('MAKTAB', 'HIFZKHANA')),
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64),
  CONSTRAINT uq_education_levels_mosque_code UNIQUE (mosque_id, code),
  CONSTRAINT uq_education_levels_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_edu_level_program FOREIGN KEY (mosque_id, program_id) REFERENCES education_programs(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS education_enrollments (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  enrollment_number VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  program_id VARCHAR(64) NOT NULL,
  program_type VARCHAR(32) NOT NULL CHECK (program_type IN ('MAKTAB', 'HIFZKHANA')),
  level_id VARCHAR(64) NOT NULL,
  admission_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  teacher_staff_id VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'PROMOTED', 'TRANSFERRED', 'DROPPED', 'SUSPENDED')),
  shift VARCHAR(32) CHECK (shift IN ('MORNING', 'AFTERNOON', 'EVENING', 'RESIDENTIAL')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  CONSTRAINT uq_education_enrollments_mosque_num UNIQUE (mosque_id, enrollment_number),
  CONSTRAINT uq_education_enrollments_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_edu_enrollment_student FOREIGN KEY (mosque_id, student_profile_id) REFERENCES education_student_profiles(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_edu_enrollment_level FOREIGN KEY (mosque_id, level_id) REFERENCES education_levels(mosque_id, id) ON DELETE RESTRICT
);

-- ============================================================================
-- 9. HIFZKHANA & RESIDENTIAL (H1-H6)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hifz_levels (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  stage VARCHAR(32) NOT NULL CHECK (stage IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPLETION')),
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_levels_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS hifz_curricula (
  id VARCHAR(64) PRIMARY KEY,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  type VARCHAR(32) NOT NULL CHECK (type IN ('FULL_QURAN_HIFZ', 'SELECTED_SURAHS', 'JUZ_BASED_HIFZ')),
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description TEXT,
  target_months INT DEFAULT 36,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_curricula_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS hifz_enrollments (
  id VARCHAR(64) PRIMARY KEY,
  enrollment_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  student_profile_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(255),
  program_type VARCHAR(32) NOT NULL DEFAULT 'HIFZKHANA',
  admission_date DATE NOT NULL,
  start_level_id VARCHAR(64),
  current_level_id VARCHAR(64) NOT NULL,
  curriculum_id VARCHAR(64) NOT NULL,
  primary_ustad_id VARCHAR(64),
  study_type VARCHAR(32) NOT NULL CHECK (study_type IN ('RESIDENTIAL', 'NON_RESIDENTIAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'DROPPED', 'SUSPENDED', 'ARCHIVED')),
  start_juz INT CHECK (start_juz BETWEEN 1 AND 30),
  target TEXT,
  completion_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_enrollments_mosque_num UNIQUE (mosque_id, enrollment_id),
  CONSTRAINT uq_hifz_enrollments_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_hifz_enrollment_student FOREIGN KEY (mosque_id, student_profile_id) REFERENCES education_student_profiles(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_hifz_enrollment_level FOREIGN KEY (mosque_id, current_level_id) REFERENCES hifz_levels(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_hifz_enrollment_curriculum FOREIGN KEY (mosque_id, curriculum_id) REFERENCES hifz_curricula(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS hifz_attendances (
  id VARCHAR(64) PRIMARY KEY,
  attendance_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  enrollment_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  student_name VARCHAR(255),
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'LEAVE', 'EXCUSED')),
  reason VARCHAR(32) CHECK (reason IN ('ILLNESS', 'FAMILY_REASON', 'TRAVEL', 'APPROVED_LEAVE', 'EMERGENCY', 'OTHER')),
  other_reason TEXT,
  remarks TEXT,
  recorded_by VARCHAR(64),
  recorded_by_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_attendances_mosque_att_id UNIQUE (mosque_id, attendance_id),
  CONSTRAINT uq_hifz_attendances_daily UNIQUE (mosque_id, enrollment_id, date),
  CONSTRAINT fk_hifz_attendance_enrollment FOREIGN KEY (mosque_id, enrollment_id) REFERENCES hifz_enrollments(mosque_id, id) ON DELETE RESTRICT
);

-- Residential Physical Hierarchy (H6-A)
CREATE TABLE IF NOT EXISTS hifz_residences (
  id VARCHAR(64) PRIMARY KEY,
  residence_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  type VARCHAR(64),
  address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_residences_mosque_res_id UNIQUE (mosque_id, residence_id),
  CONSTRAINT uq_hifz_residences_mosque_id UNIQUE (mosque_id, id)
);

CREATE TABLE IF NOT EXISTS hifz_residence_buildings (
  id VARCHAR(64) PRIMARY KEY,
  building_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  residence_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  floor_count INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_residence_buildings_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_residence_building FOREIGN KEY (mosque_id, residence_id) REFERENCES hifz_residences(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS hifz_residence_rooms (
  id VARCHAR(64) PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  residence_id VARCHAR(64) NOT NULL,
  building_id VARCHAR(64) NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  floor_number INT NOT NULL DEFAULT 1,
  capacity INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_residence_rooms_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_residence_room_building FOREIGN KEY (mosque_id, building_id) REFERENCES hifz_residence_buildings(mosque_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS hifz_residence_beds (
  id VARCHAR(64) PRIMARY KEY,
  bed_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  residence_id VARCHAR(64) NOT NULL,
  building_id VARCHAR(64) NOT NULL,
  room_id VARCHAR(64) NOT NULL,
  bed_number VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_residence_beds_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_residence_bed_room FOREIGN KEY (mosque_id, room_id) REFERENCES hifz_residence_rooms(mosque_id, id) ON DELETE RESTRICT
);

-- Residential Allocation & Transfer (H6-B, H6-C)
CREATE TABLE IF NOT EXISTS hifz_residential_allocations (
  id VARCHAR(64) PRIMARY KEY,
  allocation_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  enrollment_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64),
  student_id VARCHAR(50),
  student_name VARCHAR(255),
  residence_id VARCHAR(64) NOT NULL,
  building_id VARCHAR(64) NOT NULL,
  room_id VARCHAR(64) NOT NULL,
  bed_id VARCHAR(64) NOT NULL,
  allocation_date DATE NOT NULL,
  planned_check_in_date DATE,
  actual_check_in_at TIMESTAMPTZ,
  actual_check_out_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ALLOCATED' CHECK (status IN ('ALLOCATED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
  remarks TEXT,
  created_by VARCHAR(64),
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_allocations_mosque_num UNIQUE (mosque_id, allocation_id),
  CONSTRAINT uq_hifz_allocations_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_hifz_alloc_enrollment FOREIGN KEY (mosque_id, enrollment_id) REFERENCES hifz_enrollments(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_hifz_alloc_bed FOREIGN KEY (mosque_id, bed_id) REFERENCES hifz_residence_beds(mosque_id, id) ON DELETE RESTRICT
);

-- Partial Unique Constraints for Active Residential Occupancy
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_bed_allocation 
  ON hifz_residential_allocations (mosque_id, bed_id) 
  WHERE status IN ('ALLOCATED', 'CHECKED_IN');

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_student_allocation 
  ON hifz_residential_allocations (mosque_id, student_profile_id) 
  WHERE status IN ('ALLOCATED', 'CHECKED_IN') AND student_profile_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS hifz_residential_transfers (
  id VARCHAR(64) PRIMARY KEY,
  transfer_id VARCHAR(64) NOT NULL,
  mosque_id VARCHAR(64) NOT NULL REFERENCES mosques(id) ON DELETE RESTRICT,
  enrollment_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64),
  student_id VARCHAR(50),
  student_name VARCHAR(255),
  source_allocation_id VARCHAR(64) NOT NULL,
  new_allocation_id VARCHAR(64) NOT NULL,
  from_residence_id VARCHAR(64) NOT NULL,
  from_building_id VARCHAR(64) NOT NULL,
  from_room_id VARCHAR(64) NOT NULL,
  from_bed_id VARCHAR(64) NOT NULL,
  destination_residence_id VARCHAR(64) NOT NULL,
  destination_building_id VARCHAR(64) NOT NULL,
  destination_room_id VARCHAR(64) NOT NULL,
  destination_bed_id VARCHAR(64) NOT NULL,
  transfer_date DATE NOT NULL,
  reason VARCHAR(32) NOT NULL CHECK (reason IN ('ROOM_CHANGE', 'BED_CHANGE', 'BUILDING_CHANGE', 'RESIDENCE_CHANGE', 'ADMINISTRATIVE', 'STUDENT_REQUEST', 'OTHER')),
  remarks TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  transferred_by VARCHAR(64),
  transferred_by_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_hifz_transfers_mosque_num UNIQUE (mosque_id, transfer_id),
  CONSTRAINT uq_hifz_transfers_mosque_id UNIQUE (mosque_id, id),
  CONSTRAINT fk_hifz_trf_source_alloc FOREIGN KEY (mosque_id, source_allocation_id) REFERENCES hifz_residential_allocations(mosque_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_hifz_trf_new_alloc FOREIGN KEY (mosque_id, new_allocation_id) REFERENCES hifz_residential_allocations(mosque_id, id) ON DELETE RESTRICT
);

-- ============================================================================
-- 10. INDEXES FOR PERFORMANCE & TEMPORAL REPORTING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_income_mosque_date ON income_entries (mosque_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_income_account ON income_entries (mosque_id, account_id);
CREATE INDEX IF NOT EXISTS idx_income_main_head ON income_entries (mosque_id, main_head_id);

CREATE INDEX IF NOT EXISTS idx_expense_mosque_date ON expense_entries (mosque_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_account ON expense_entries (mosque_id, account_id);
CREATE INDEX IF NOT EXISTS idx_expense_main_head ON expense_entries (mosque_id, main_head_id);

CREATE INDEX IF NOT EXISTS idx_transfers_mosque_date ON account_transfers (mosque_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_from_acc ON account_transfers (mosque_id, from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_acc ON account_transfers (mosque_id, to_account_id);

CREATE INDEX IF NOT EXISTS idx_audit_mosque_time ON audit_logs (mosque_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_records (created_at);
`;

export const POSTGRES_SCHEMA_SQL = `${POSTGRES_CORE_SCHEMA_SQL}\n${POSTGRES_AUXILIARY_SCHEMA_SQL}`;
export { POSTGRES_AUXILIARY_SCHEMA_SQL };

-- ============================================================
-- Sprint 1 Migration: Monetisation & Admin Infrastructure
-- Run this on the production DB after deployment
-- ============================================================

-- -----------------------------------------------
-- 1. Plan Definitions (Super Admin controlled)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS plan_definitions (
  plan_type          VARCHAR(50) PRIMARY KEY,
  display_name       VARCHAR(100) NOT NULL,
  price_usd          DECIMAL(10,2) DEFAULT 0,
  price_ngn          DECIMAL(10,2) DEFAULT 0,
  trial_days         INTEGER DEFAULT 0,
  max_tutors         INTEGER,        -- NULL = unlimited
  max_internal_students INTEGER,     -- NULL = unlimited
  max_external_per_tutor INTEGER DEFAULT 0,
  max_active_exams   INTEGER,        -- NULL = unlimited
  ai_queries_per_month INTEGER DEFAULT 0,
  allow_student_portal        BOOLEAN DEFAULT false,
  allow_external_students     BOOLEAN DEFAULT false,
  allow_bulk_import           BOOLEAN DEFAULT false,
  allow_email_notifications   BOOLEAN DEFAULT false,
  allow_sms_notifications     BOOLEAN DEFAULT false,
  allow_advanced_analytics    BOOLEAN DEFAULT false,
  allow_custom_branding       BOOLEAN DEFAULT false,
  allow_api_access            BOOLEAN DEFAULT false,
  allow_result_pdf            BOOLEAN DEFAULT false,
  allow_result_export         BOOLEAN DEFAULT false,
  extra_internal_student_price_usd DECIMAL(10,4) DEFAULT 0,
  extra_external_student_price_usd DECIMAL(10,4) DEFAULT 0,
  is_active          BOOLEAN DEFAULT true,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plan definitions
INSERT INTO plan_definitions (
  plan_type, display_name, price_usd, price_ngn, trial_days,
  max_tutors, max_internal_students, max_external_per_tutor, max_active_exams, ai_queries_per_month,
  allow_student_portal, allow_external_students, allow_bulk_import, allow_email_notifications,
  allow_sms_notifications, allow_advanced_analytics, allow_custom_branding, allow_api_access,
  allow_result_pdf, allow_result_export, extra_internal_student_price_usd, extra_external_student_price_usd
) VALUES
-- Freemium
('freemium', 'Free', 0, 0, 0,
  2, 20, 0, 5, 0,
  false, false, false, false,
  false, false, false, false,
  false, false, 0, 0),
-- Basic Premium
('basic', 'Basic Premium', 4.99, 8000, 14,
  10, 300, 30, NULL, 30,
  true, true, true, true,
  false, false, false, false,
  true, false, 1.50, 0.75),
-- Advanced Premium
('advanced', 'Advanced Premium', 14.99, 24000, 14,
  50, 2000, 200, NULL, 200,
  true, true, true, true,
  true, true, true, true,
  true, true, 1.00, 0.50),
-- Enterprise
('enterprise', 'Enterprise', 0, 0, 14,
  NULL, NULL, NULL, NULL, NULL,
  true, true, true, true,
  true, true, true, true,
  true, true, 0, 0)
ON CONFLICT (plan_type) DO NOTHING;

-- -----------------------------------------------
-- 2. Feature Flags (Super Admin controlled)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key  VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  description  TEXT,
  min_plan     VARCHAR(50) NOT NULL DEFAULT 'freemium' REFERENCES plan_definitions(plan_type),
  is_enabled   BOOLEAN DEFAULT true,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (feature_key, feature_name, description, min_plan) VALUES
  ('student_portal',      'Student Portal',           'Full student login portal with results & history', 'basic'),
  ('ai_question_gen',     'AI Question Generation',   'Generate questions using OpenAI', 'advanced'),
  ('bulk_import',         'Bulk CSV Import',           'Upload students/tutors/questions via CSV', 'basic'),
  ('email_notifications', 'Email Notifications',       'Send automated emails to students and tutors', 'basic'),
  ('sms_notifications',   'SMS Notifications',         'Send SMS alerts via Termii/Twilio', 'advanced'),
  ('advanced_analytics',  'Advanced Analytics',        'Cohort analysis, tutor performance, trends', 'advanced'),
  ('custom_branding',     'Custom Branding',           'School logo, colours, custom header', 'advanced'),
  ('api_access',          'API Access',                'REST API for third-party integrations', 'advanced'),
  ('result_pdf',          'Result PDF',                'Download exam results as PDF', 'basic'),
  ('result_export',       'Result Export (Excel/CSV)', 'Export all results as spreadsheet', 'advanced'),
  ('external_students',   'External Students',         'Tutors can add their own external students', 'basic')
ON CONFLICT (feature_key) DO NOTHING;

-- -----------------------------------------------
-- 3. School Subscriptions
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS school_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            UUID UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  plan_type            VARCHAR(50) NOT NULL DEFAULT 'freemium' REFERENCES plan_definitions(plan_type),
  status               VARCHAR(50) DEFAULT 'active' CHECK (status IN ('trialing','active','past_due','cancelled','expired','gifted','suspended')),
  billing_cycle        VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual','payg','free')),
  currency             VARCHAR(10) DEFAULT 'NGN',
  amount               DECIMAL(10,2) DEFAULT 0,
  trial_start          TIMESTAMPTZ,
  trial_end            TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  stripe_subscription_id      VARCHAR(255),
  paystack_subscription_code  VARCHAR(255),
  extra_internal_students     INTEGER DEFAULT 0,
  extra_external_students     INTEGER DEFAULT 0,
  -- Manual override fields (set by super admin)
  override_plan        VARCHAR(50) REFERENCES plan_definitions(plan_type),
  override_expires_at  TIMESTAMPTZ,
  override_reason      TEXT,
  override_by_staff_id UUID,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create freemium subscription for existing schools
INSERT INTO school_subscriptions (school_id, plan_type, status, billing_cycle)
SELECT id, 'freemium', 'active', 'free'
FROM schools
WHERE id NOT IN (SELECT school_id FROM school_subscriptions WHERE school_id IS NOT NULL)
ON CONFLICT (school_id) DO NOTHING;

-- -----------------------------------------------
-- 4. PAYG Wallet & Ledger
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS payg_wallets (
  school_id            UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  balance_credits      INTEGER DEFAULT 0,
  currency             VARCHAR(10) DEFAULT 'NGN',
  auto_topup_enabled   BOOLEAN DEFAULT false,
  auto_topup_threshold INTEGER DEFAULT 20,
  auto_topup_amount    INTEGER DEFAULT 100,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payg_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type                VARCHAR(20) NOT NULL CHECK (type IN ('topup','deduction','gift','adjustment')),
  credits             INTEGER NOT NULL,
  balance_after       INTEGER NOT NULL,
  description         TEXT,
  feature_key         VARCHAR(100),
  stripe_payment_id   VARCHAR(255),
  paystack_reference  VARCHAR(255),
  created_by_staff_id UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create wallet for existing schools
INSERT INTO payg_wallets (school_id, balance_credits)
SELECT id, 0 FROM schools
ON CONFLICT (school_id) DO NOTHING;

-- -----------------------------------------------
-- 5. Coupons & Redemptions
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  type            VARCHAR(30) NOT NULL CHECK (type IN ('percent_off','amount_off','free_months','bonus_credits')),
  value           DECIMAL(10,2) NOT NULL,  -- percent, amount, months count, or credit count
  applicable_plans TEXT[] DEFAULT ARRAY['basic','advanced','enterprise'],
  billing_cycles  TEXT[] DEFAULT ARRAY['monthly','annual'],
  max_uses        INTEGER,                  -- NULL = unlimited
  uses_per_school INTEGER DEFAULT 1,
  current_uses    INTEGER DEFAULT 0,
  valid_from      TIMESTAMPTZ DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,             -- NULL = no expiry
  requires_annual BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_by_staff_id UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  plan_type   VARCHAR(50),
  discount_applied DECIMAL(10,2),
  UNIQUE(coupon_id, school_id)
);

-- -----------------------------------------------
-- 6. School Settings
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS school_settings (
  school_id                     UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  -- External students
  allow_external_students       BOOLEAN DEFAULT true,
  max_external_per_tutor        INTEGER DEFAULT 30,
  -- Student controls
  allow_tutor_create_students   BOOLEAN DEFAULT true,
  student_portal_enabled        BOOLEAN DEFAULT true,
  result_release_mode           VARCHAR(20) DEFAULT 'immediate' CHECK (result_release_mode IN ('immediate','manual')),
  allow_student_pdf_download    BOOLEAN DEFAULT false,
  default_exam_attempts         INTEGER DEFAULT 1,
  -- Notification preferences
  email_on_exam_complete        BOOLEAN DEFAULT true,
  email_on_new_student          BOOLEAN DEFAULT true,
  email_on_results_release      BOOLEAN DEFAULT true,
  -- Appearance
  primary_color                 VARCHAR(20) DEFAULT '#6366f1',
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create settings for existing schools
INSERT INTO school_settings (school_id)
SELECT id FROM schools
ON CONFLICT (school_id) DO NOTHING;

-- -----------------------------------------------
-- 7. External Students
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS external_students (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id     UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  full_name    VARCHAR(255) NOT NULL,
  email        VARCHAR(255),
  phone        VARCHAR(20),
  username     VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 8. Staff Accounts (Company Employees)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS staff_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL CHECK (role IN (
    'customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer'
  )),
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID,  -- references another staff or null if super admin created
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 9. Staff Audit Log
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS staff_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type   VARCHAR(20) NOT NULL CHECK (actor_type IN ('super_admin','staff')),
  actor_id     UUID,
  actor_name   VARCHAR(255),
  action       VARCHAR(100) NOT NULL,
  target_type  VARCHAR(50),   -- 'school', 'coupon', 'plan_definition', etc.
  target_id    UUID,
  target_name  VARCHAR(255),
  details      JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 10. Indexes for performance
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_school ON school_subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_status ON school_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payg_ledger_school ON payg_ledger(school_id);
CREATE INDEX IF NOT EXISTS idx_external_students_tutor ON external_students(tutor_id);
CREATE INDEX IF NOT EXISTS idx_external_students_school ON external_students(school_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_school ON coupon_redemptions(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_log_actor ON staff_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_log_created ON staff_audit_log(created_at DESC);

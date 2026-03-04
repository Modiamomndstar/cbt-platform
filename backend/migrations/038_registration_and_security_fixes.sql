-- Migration 038: Registration Flow, Security & Referral Fixes

-- 1. Ensure school_settings exists (Insurance against production missing relation)
CREATE TABLE IF NOT EXISTS school_settings (
  school_id                     UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  allow_external_students       BOOLEAN DEFAULT true,
  max_external_per_tutor        INTEGER DEFAULT 30,
  allow_tutor_create_students   BOOLEAN DEFAULT true,
  student_portal_enabled        BOOLEAN DEFAULT true,
  result_release_mode           VARCHAR(20) DEFAULT 'immediate' CHECK (result_release_mode IN ('immediate','manual')),
  allow_student_pdf_download    BOOLEAN DEFAULT false,
  default_exam_attempts         INTEGER DEFAULT 1,
  email_on_exam_complete        BOOLEAN DEFAULT true,
  email_on_new_student          BOOLEAN DEFAULT true,
  email_on_results_release      BOOLEAN DEFAULT true,
  primary_color                 VARCHAR(20) DEFAULT '#6366f1',
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure school_subscriptions exists and has correct structure
CREATE TABLE IF NOT EXISTS school_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            UUID UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  plan_type            VARCHAR(50) NOT NULL DEFAULT 'freemium',
  status               VARCHAR(50) DEFAULT 'active',
  billing_cycle        VARCHAR(20) DEFAULT 'monthly',
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
  override_plan        VARCHAR(50),
  override_expires_at  TIMESTAMPTZ,
  override_reason      TEXT,
  override_by_staff_id UUID,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add Email Verification and Referral columns to schools
DO $$
BEGIN
    -- Email verification
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'is_email_verified') THEN
        ALTER TABLE schools ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'email_verification_token') THEN
        ALTER TABLE schools ADD COLUMN email_verification_token VARCHAR(255);
    END IF;

    -- Referrals
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'referral_code') THEN
        ALTER TABLE schools ADD COLUMN referral_code VARCHAR(20) UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'referred_by_id') THEN
        ALTER TABLE schools ADD COLUMN referred_by_id UUID REFERENCES schools(id);
    END IF;
END $$;

-- 4. Update existing verified schools (if any)
-- Assuming schools created before this migration are verified for legacy support,
-- or leave as FALSE to force verification for all.
-- For safety on production, let's mark existing schools as verified.
UPDATE schools SET is_email_verified = TRUE WHERE is_email_verified IS FALSE AND created_at < NOW() - INTERVAL '1 hour';

-- 5. Set default is_active to false in the schema for future inserts (handled by Node logic anyway)
ALTER TABLE schools ALTER COLUMN is_active SET DEFAULT FALSE;

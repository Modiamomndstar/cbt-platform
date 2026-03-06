-- Migration 040: Fix missing columns that weren't added due to IF NOT EXISTS guards
-- in early migrations that created tables with a partial schema

-- 1. school_subscriptions: add override columns that were in migration 038 schema
--    but the table was already created by migration 008 guard without them
ALTER TABLE school_subscriptions
  ADD COLUMN IF NOT EXISTS override_plan        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS override_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS override_features    JSONB,
  ADD COLUMN IF NOT EXISTS override_reason      TEXT,
  ADD COLUMN IF NOT EXISTS override_by_staff_id UUID,
  ADD COLUMN IF NOT EXISTS trial_warning_sent   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS extra_internal_students INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_external_students INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS paystack_subscription_code VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cancelled_at         TIMESTAMPTZ;

-- 2. school_settings: ensure allow_tutor_edit_categories exists
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS allow_tutor_edit_categories BOOLEAN DEFAULT true;

-- 3. activity_logs: add resource_type as alias for target_type for backwards compat
--    (staff.ts audit log query references resource_type via COALESCE)
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100);

-- Backfill resource_type from target_type where missing
UPDATE activity_logs SET resource_type = target_type WHERE resource_type IS NULL AND target_type IS NOT NULL;

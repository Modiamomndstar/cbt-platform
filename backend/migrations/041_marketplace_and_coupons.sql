-- Migration 041: Create marketplace_items and discount_coupons tables
-- These tables are required by the /super-admin/marketplace and /super-admin/coupons endpoints.

-- ── Cleanup Old PAYG Table ─────────────────────────────────────
-- Drop the old table name to standardize on marketplace_items
DROP TABLE IF EXISTS payg_feature_pricing CASCADE;

-- ── Marketplace Items ──────────────────────────────────────────
-- Drop existing implementation if it's missing the feature_key or is in an invalid state
DROP TABLE IF EXISTS marketplace_items CASCADE;

CREATE TABLE marketplace_items (
  feature_key    VARCHAR(100) PRIMARY KEY,
  display_name   VARCHAR(255) NOT NULL,
  description    TEXT,
  item_type      VARCHAR(50) NOT NULL DEFAULT 'feature',  -- feature | slot | credit_pack
  category       VARCHAR(100),
  credit_cost    INTEGER NOT NULL DEFAULT 1,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default marketplace items
INSERT INTO marketplace_items (feature_key, display_name, description, item_type, category, credit_cost) VALUES
  ('ai_credits_10',       'AI Credits Pack (10)',      'Buy 10 AI question generation credits',         'credit_pack', 'ai',       10),
  ('ai_credits_50',       'AI Credits Pack (50)',      'Buy 50 AI question generation credits',         'credit_pack', 'ai',       45),
  ('extra_tutor_slot',    'Extra Tutor Slot',          'Add one additional tutor to your school',       'slot',        'staffing',  5),
  ('extra_student_pack',  'Student Pack (+100)',       'Expand your internal student limit by 100',     'slot',        'students',  8),
  ('result_pdf',          'Result PDF Export',         'Download student results as PDF',               'feature',     'reports',   2),
  ('advanced_analytics',  'Advanced Analytics Access', 'Unlock cohort analysis and trend reports',      'feature',     'analytics', 15),
  ('custom_branding',     'Custom Branding',           'Add school logo and custom colours',            'feature',     'branding',  10)
ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  credit_cost  = EXCLUDED.credit_cost;

-- ── Marketplace Purchases Log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id),
  feature_key         VARCHAR(100) NOT NULL,
  credits_spent       INTEGER NOT NULL DEFAULT 0,
  quantity            INTEGER NOT NULL DEFAULT 1,
  is_gift             BOOLEAN DEFAULT false,
  gifted_by_staff_id  UUID REFERENCES schools(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Discount Coupons ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(50) UNIQUE NOT NULL,
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  discount_type       VARCHAR(50) NOT NULL DEFAULT 'percent_off',  -- percent_off | amount_off | free_months | bonus_credits
  discount_value      DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses            INTEGER,          -- NULL = unlimited
  uses_count          INTEGER NOT NULL DEFAULT 0,
  expires_at          TIMESTAMPTZ,      -- NULL = no expiry
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_by_staff_id UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

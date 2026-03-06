-- Migration 036: Yearly Billing & Discount Settings

-- Ensure settings table exists (created in migration 033, but guard here for safety)
CREATE TABLE IF NOT EXISTS settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  value       TEXT,
  description TEXT,
  category    VARCHAR(50),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Insert or Update Yearly Discount Settings
INSERT INTO settings (key, value, description, category)
VALUES
    ('yearly_discount_percentage', '20', 'Discount percentage for annual subscriptions (0-100)', 'billing'),
    ('yearly_discount_active', 'true', 'Whether the yearly discount is currently active', 'billing')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description = EXCLUDED.description, category = EXCLUDED.category;

-- Ensure the Referral Reward setting has a category
UPDATE settings SET category = 'referral' WHERE key = 'referral_reward_credits';


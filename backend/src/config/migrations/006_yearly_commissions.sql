-- Migration to add billing_cycle to commission_settings
ALTER TABLE commission_settings ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'annual', 'free'));

-- Update existing data to be 'monthly' (already default, but explicit for clarity)
UPDATE commission_settings SET billing_cycle = 'monthly' WHERE billing_cycle IS NULL;

-- Drop the old unique constraint
ALTER TABLE commission_settings DROP CONSTRAINT IF EXISTS commission_settings_plan_type_currency_key;

-- Add new unique constraint including billing_cycle
ALTER TABLE commission_settings ADD CONSTRAINT commission_settings_plan_cycle_currency_key UNIQUE (plan_type, billing_cycle, currency);

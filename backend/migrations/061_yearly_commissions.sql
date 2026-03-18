-- Migration to add billing_cycle to commission_settings
-- Using DO block to make it idempotent in case it was partially applied or run manually
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commission_settings' AND column_name = 'billing_cycle') THEN
        ALTER TABLE commission_settings ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'annual', 'free'));
    END IF;

    -- Update existing data to be 'monthly'
    UPDATE commission_settings SET billing_cycle = 'monthly' WHERE billing_cycle IS NULL;

    -- Drop the old unique constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'commission_settings_plan_type_currency_key') THEN
        ALTER TABLE commission_settings DROP CONSTRAINT commission_settings_plan_type_currency_key;
    END IF;

    -- Add new unique constraint including billing_cycle
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'commission_settings_plan_cycle_currency_key') THEN
        ALTER TABLE commission_settings ADD CONSTRAINT commission_settings_plan_cycle_currency_key UNIQUE (plan_type, billing_cycle, currency);
    END IF;
END $$;

-- Migration 026: Financial Audit Ledger
-- This migration enhances the ability to track earned vs unearned revenue and platform utilization.

-- 1. Create Subscription Ledger to track recurring revenue
CREATE TABLE IF NOT EXISTS subscription_ledger (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    amount              DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(10) DEFAULT 'NGN',
    plan_type           VARCHAR(50) NOT NULL,
    billing_cycle       VARCHAR(20) NOT NULL,
    status              VARCHAR(50) NOT NULL,
    stripe_payment_id   VARCHAR(255),
    paystack_reference  VARCHAR(255),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhance payg_ledger with categorical tracking if not present
-- (payg_ledger already exists but we ensure it can handle currency/gateways)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payg_ledger' AND column_name = 'currency') THEN
        ALTER TABLE payg_ledger ADD COLUMN currency VARCHAR(10) DEFAULT 'NGN';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payg_ledger' AND column_name = 'amount_paid') THEN
        -- The cash value paid for the credits (if a topup)
        ALTER TABLE payg_ledger ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payg_ledger' AND column_name = 'metadata') THEN
        -- For storing granular utilization details
        ALTER TABLE payg_ledger ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- 3. Views for Financial Analytics

-- Earned Revenue (Subscriptions + Marketplace Utilization)
CREATE OR REPLACE VIEW earned_revenue_summary AS
SELECT
    'subscription' as source,
    currency,
    SUM(amount) as total_earned,
    date_trunc('day', created_at) as log_date
FROM subscription_ledger
GROUP BY currency, date_trunc('day', created_at)
UNION ALL
SELECT
    'payg_utilization' as source,
    currency,
    -- Utilization is when credits are deducted. We estimate value if needed,
    -- but usually we track the fixed price of the item at purchase.
    -- For now, we'll assume credits spent translate to revenue.
    SUM(amount_paid) as total_earned,
    date_trunc('day', created_at) as log_date
FROM payg_ledger
WHERE type = 'deduction'
GROUP BY currency, date_trunc('day', created_at);

-- Unearned Revenue (Balance in wallets)
CREATE OR REPLACE VIEW unearned_revenue_report AS
SELECT
    currency,
    SUM(balance_credits) as total_credits_held,
    -- This is a liability, not yet income
    COUNT(*) as school_count
FROM payg_wallets
GROUP BY currency;

-- 4. Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_subscription_ledger_date ON subscription_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payg_ledger_date ON payg_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payg_ledger_type ON payg_ledger(type);
